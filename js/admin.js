// Admin Panel Logic for Kanha Construction & Interior - Modern Studio CMS

const DEFAULT_PIN = "1234";
let adminAuthenticated = false;

let projectsList = [];
let servicesList = [];
let companyData = {};
let heroData = {};
let aboutData = {};

let editingProjectId = null;
let editingServiceId = null;
let currentImageData = "";
let editingProjectGallery = [];

let activeModalProjectId = null;
let modalNewImageData = "";

let heroImageData = "";
let aboutImageData = "";

// 6 Core Categorized Sections for Portfolio Media Gallery
const GALLERY_SECTIONS = {
  construction: {
    key: 'construction',
    label: 'Construction & Civil Works',
    shortLabel: 'Construction',
    icon: 'fa-solid fa-trowel-bricks',
    color: '#f59e0b',
    bgBadge: 'badge-sec-construction',
    desc: 'Civil foundation, structural framing, RCC concrete execution, and turnkey site development.'
  },
  interior: {
    key: 'interior',
    label: 'Interior Architecture & Decor',
    shortLabel: 'Interior',
    icon: 'fa-solid fa-couch',
    color: '#10b981',
    bgBadge: 'badge-sec-interior',
    desc: 'Luxury living lounges, modular kitchens, master suites, gypsum false ceilings, and bespoke woodwork.'
  },
  elevation: {
    key: 'elevation',
    label: 'Elevation & Modern Facades',
    shortLabel: 'Elevation',
    icon: 'fa-solid fa-building',
    color: '#38bdf8',
    bgBadge: 'badge-sec-elevation',
    desc: 'Front exterior facades, louvers, cantilevered balconies, and architectural elevation lighting.'
  },
  industrial: {
    key: 'industrial',
    label: 'Industrial & PEB Sheds',
    shortLabel: 'Industrial',
    icon: 'fa-solid fa-industry',
    color: '#818cf8',
    bgBadge: 'badge-sec-industrial',
    desc: 'Pre-engineered steel buildings (PEB), factory floor casting, crane gantry beams, and warehouses.'
  },
  hospital: {
    key: 'hospital',
    label: 'Hospital & Healthcare Facilities',
    shortLabel: 'Hospital',
    icon: 'fa-solid fa-hospital',
    color: '#f43f5e',
    bgBadge: 'badge-sec-hospital',
    desc: 'Medical reception bays, anti-bacterial cleanrooms, patient recovery lounges, and clinical setups.'
  },
  planning: {
    key: 'planning',
    label: '3D Planning & Architecture',
    shortLabel: 'Planning',
    icon: 'fa-solid fa-compass-drafting',
    color: '#0284c7',
    bgBadge: 'badge-sec-planning',
    desc: 'Architectural 2D/3D elevations, structural blueprints, site master plans, and floor zoning.'
  }
};

let currentGallerySection = 'all';
let currentGalleryProjectFilter = 'all';
let currentGallerySearchQuery = '';
let galleryNewUploadData = '';
let currentModalGallerySection = 'all';

document.addEventListener('DOMContentLoaded', () => {
  initAdminDashboard();
  if (typeof syncDataWithServer === 'function') {
    syncDataWithServer();
  }
  updateAdminDbStatus();
});

// Real-time Database Status Indicator in Topbar
async function updateAdminDbStatus() {
  const badge = document.getElementById('dbStatusBadge');
  const text = document.getElementById('dbStatusText');
  if (!badge || !text) return;

  if (typeof checkDatabaseStatus === 'function') {
    try {
      const status = await checkDatabaseStatus();
      if (status && status.database) {
        const isMongo = Boolean(status.database.isMongoConnected);
        badge.style.color = '#10b981';
        badge.style.background = 'rgba(16, 185, 129, 0.12)';
        badge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        text.textContent = isMongo ? 'MongoDB Atlas (Connected)' : 'Persistent Database (Synced)';
        badge.title = `${status.database.databaseType} • Storage: ${status.storage ? status.storage.storageType : 'Local Disk'}`;
      }
    } catch (e) {
      badge.style.color = '#f59e0b';
      text.textContent = 'Local Cache (Offline)';
    }
  }
}

// Background sync updates
document.addEventListener('kanha-data-synced', (e) => {
  const { projects, content } = e.detail || {};
  if (Array.isArray(projects)) {
    projectsList = projects;
    renderAdminProjects();
    updateProjectsSummary();
  }
  if (content) {
    if (content.company) { companyData = content.company; loadCompanyForm(); }
    if (content.hero) { heroData = content.hero; loadHeroForm(); }
    if (content.about) { aboutData = content.about; loadAboutForm(); }
    if (content.services) { servicesList = content.services; loadServicesTable(); }
    if (content.stats) { loadStatsForm(); }
  }
  updateAdminDbStatus();
});

// Master Dashboard Initialization
function initAdminDashboard() {
  try {
    projectsList = typeof getStoredProjects === 'function' ? getStoredProjects() : [];
    servicesList = typeof getStoredServices === 'function' ? getStoredServices() : [];
    companyData = typeof getStoredCompany === 'function' ? getStoredCompany() : {};
    heroData = typeof getStoredHero === 'function' ? getStoredHero() : {};
    aboutData = typeof getStoredAbout === 'function' ? getStoredAbout() : {};
  } catch (err) {
    console.error("Error loading stores:", err);
  }

  setupTabNavigation();
  setupAdminHandlers();
  
  loadAdminProjects();
  loadCompanyForm();
  loadHeroForm();
  loadAboutForm();
  loadServicesTable();
  loadStatsForm();
  setupGalleryModal();
  setupProjectEditModal();
  setupGlobalGalleryStudio();
}

// Tab Switching Controls with Dynamic Topbar Titles
const TAB_TITLES = {
  'tab-projects': { title: "Projects & Showcase Studio", desc: "Add, edit, and organize portfolio projects and cover images." },
  'tab-gallery': { title: "Media Gallery Studio", desc: "Filter, organize, upload, and delete photos across Construction, Interior, Elevation, Industrial, and Healthcare sections." },
  'tab-company': { title: "Company Profile", desc: "Manage registered company branding, contact details, and locations." },
  'tab-hero': { title: "Hero Banner", desc: "Customize the homepage hero banner, headlines, and cover image." },
  'tab-about': { title: "About Us Story", desc: "Configure company narrative, safety standards, and team principles." },
  'tab-services': { title: "Specialized Services", desc: "Manage architectural design, structural engineering, and interior services." },
  'tab-stats': { title: "Stats Ribbon", desc: "Configure the live metric numbers shown across the website." }
};

function setupTabNavigation() {
  const tabBtns = document.querySelectorAll('.admin-tab-btn');
  const mobilePills = document.querySelectorAll('.admin-mobile-pill');
  const tabPanels = document.querySelectorAll('.admin-tab-panel');
  const topTitle = document.getElementById('topbarSectionTitle');
  const topDesc = document.getElementById('topbarSectionDesc');
  const sidebar = document.querySelector('.admin-sidebar');
  const sidebarToggle = document.getElementById('adminSidebarToggle');
  const backdrop = document.getElementById('adminSidebarBackdrop');

  function activateTab(panelId) {
    tabBtns.forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-tab') === panelId);
    });
    mobilePills.forEach(p => {
      p.classList.toggle('active', p.getAttribute('data-tab') === panelId);
    });
    tabPanels.forEach(p => {
      p.classList.toggle('active', p.id === panelId);
    });

    if (TAB_TITLES[panelId]) {
      if (topTitle) topTitle.textContent = TAB_TITLES[panelId].title;
      if (topDesc) topDesc.textContent = TAB_TITLES[panelId].desc;
    }

    // Auto-close mobile sidebar drawer upon selecting a tab
    if (sidebar && sidebar.classList.contains('mobile-open')) {
      sidebar.classList.remove('mobile-open');
      if (backdrop) backdrop.classList.remove('active');
    }
  }

  // Sidebar Desktop & Drawer Tabs
  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const panelId = e.currentTarget.getAttribute('data-tab');
      activateTab(panelId);
    });
  });

  // Mobile App Swipeable Tabs
  mobilePills.forEach(pill => {
    pill.addEventListener('click', (e) => {
      const panelId = e.currentTarget.getAttribute('data-tab');
      activateTab(panelId);
    });
  });

  // Mobile Drawer Toggle
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = sidebar.classList.toggle('mobile-open');
      if (backdrop) backdrop.classList.toggle('active', isOpen);
    });
  }

  // Close Drawer on Close Button or Backdrop Tap
  const sidebarCloseBtn = document.getElementById('adminSidebarCloseBtn');
  if (sidebarCloseBtn && sidebar) {
    sidebarCloseBtn.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      if (backdrop) backdrop.classList.remove('active');
    });
  }

  if (backdrop && sidebar) {
    backdrop.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      backdrop.classList.remove('active');
    });
  }
}

// TAB 1: Projects & Gallery Studio
function loadAdminProjects() {
  renderAdminProjects();
  updateProjectsSummary();
}

function updateProjectsSummary() {
  const totalProjectsElem = document.getElementById('statTotalProjects');
  const totalProjectsBadge = document.getElementById('statTotalProjectsBadge');
  const totalPhotosElem = document.getElementById('statTotalGalleryPhotos');
  const servicesBadge = document.getElementById('statServicesCountBadge');

  if (totalProjectsElem) totalProjectsElem.textContent = projectsList.length;
  if (totalProjectsBadge) totalProjectsBadge.textContent = projectsList.length;
  if (servicesBadge) servicesBadge.textContent = servicesList.length;

  const totalPhotos = projectsList.reduce((acc, p) => acc + (p.gallery ? p.gallery.length : 1), 0);
  if (totalPhotosElem) totalPhotosElem.textContent = totalPhotos;

  const statGalleryTotalBadge = document.getElementById('statGalleryTotalBadge');
  if (statGalleryTotalBadge) statGalleryTotalBadge.textContent = totalPhotos;
  const statGalleryTotalPhotos = document.getElementById('statGalleryTotalPhotos');
  if (statGalleryTotalPhotos) statGalleryTotalPhotos.textContent = totalPhotos;
  const statGalleryProjectCount = document.getElementById('statGalleryProjectCount');
  if (statGalleryProjectCount) statGalleryProjectCount.textContent = projectsList.length;

  if (typeof renderGlobalGalleryStudio === 'function') {
    renderGlobalGalleryStudio();
  }
}

function renderAdminProjects() {
  const grid = document.getElementById('adminProjectsGrid');
  const filterStatus = document.getElementById('projectFilterStatusText');
  if (!grid) return;

  const searchInput = document.getElementById('adminSearchInput');
  const filterCat = document.getElementById('adminFilterCategory');

  const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const selectedCat = filterCat ? filterCat.value : 'all';

  const filtered = projectsList.filter(p => {
    const matchCat = selectedCat === 'all' || (p.category && p.category.toLowerCase() === selectedCat.toLowerCase());
    const matchQuery = !query || 
      (p.title && p.title.toLowerCase().includes(query)) ||
      (p.location && p.location.toLowerCase().includes(query)) ||
      (p.category && p.category.toLowerCase().includes(query));
    return matchCat && matchQuery;
  });

  if (filterStatus) {
    filterStatus.textContent = `Showing ${filtered.length} of ${projectsList.length} projects`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: #071c26; border-radius: 16px; border: 1px dashed var(--border-glow);">
        <i class="fa-solid fa-folder-open" style="font-size: 2.8rem; color: var(--text-dim); margin-bottom: 14px;"></i>
        <h3 style="font-size: 1.2rem; color: #fff; margin-bottom: 6px;">No Projects Match Your Search</h3>
        <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 18px;">Try clearing filters or click "+ Add New Project" to create one.</p>
        <button type="button" class="btn-primary" onclick="openAddProjectModal()" style="padding: 10px 22px;">
          <i class="fa-solid fa-plus"></i> Add New Project
        </button>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map((p) => {
    const imgSrc = p.image || p.fallbackImage || 'assets/images/kanha_hero_facade_1791296928268.jpg';
    const galleryCount = p.gallery ? p.gallery.length : 1;

    return `
      <div class="admin-proj-card">
        <div class="admin-proj-img-wrap">
          <img src="${imgSrc}" alt="${p.title}" onerror="this.src='https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'">
          <span class="admin-proj-badge-cat">${(p.category || 'RESIDENTIAL').toUpperCase()}</span>
          <span class="admin-proj-badge-photos"><i class="fa-solid fa-images"></i> ${galleryCount} Photos</span>
        </div>

        <div class="admin-proj-content">
          <h3 class="admin-proj-title" title="${p.title}">${p.title}</h3>
          <div class="admin-proj-meta">
            <span><i class="fa-solid fa-location-dot" style="color: var(--accent-cyan);"></i> ${p.location || 'Ahmedabad'}</span>
            <span>•</span>
            <span>${p.area || 'N/A'}</span>
          </div>

          <div class="admin-proj-actions">
            <button type="button" class="btn-card-gallery" onclick="openGalleryModal('${p.id}')" title="Manage & Delete Gallery Photos">
              <i class="fa-solid fa-images"></i> Photos (${galleryCount})
            </button>
            <button type="button" class="btn-card-edit" onclick="editProject('${p.id}')" title="Edit project details">
              <i class="fa-solid fa-pen"></i> Edit
            </button>
            <button type="button" class="btn-card-del" onclick="deleteProject('${p.id}')" title="Delete this project">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Project Add / Edit Modal Controls
function setupProjectEditModal() {
  const modal = document.getElementById('projectEditModal');
  const closeBtn = document.getElementById('modalProjectFormClose');
  const btnOpen = document.getElementById('btnOpenAddProjectModal');

  if (btnOpen) {
    btnOpen.addEventListener('click', () => openAddProjectModal());
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('active');
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  }
}

function openAddProjectModal() {
  resetAdminForm();
  const modal = document.getElementById('projectEditModal');
  const title = document.getElementById('formCardTitle');
  const btnSubmit = document.getElementById('btnSubmitForm');

  if (title) title.innerHTML = `<i class="fa-solid fa-plus-circle" style="color: var(--accent-cyan);"></i> Add New Project`;
  if (btnSubmit) btnSubmit.innerHTML = `<i class="fa-solid fa-plus"></i> Save Project to Portfolio`;
  if (modal) modal.classList.add('active');
}

function editProject(id) {
  const project = projectsList.find(p => p.id === id);
  if (!project) return;

  editingProjectId = project.id;
  const modal = document.getElementById('projectEditModal');
  const title = document.getElementById('formCardTitle');
  const btnSubmit = document.getElementById('btnSubmitForm');

  if (title) title.innerHTML = `<i class="fa-solid fa-pen-to-square" style="color: var(--accent-cyan);"></i> Edit Project: ${project.title}`;
  if (btnSubmit) btnSubmit.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Save Changes to Project`;

  if (document.getElementById('projectTitle')) document.getElementById('projectTitle').value = project.title || '';
  if (document.getElementById('projectCategory')) document.getElementById('projectCategory').value = project.category || 'residential';
  if (document.getElementById('projectLocation')) document.getElementById('projectLocation').value = project.location || '';
  if (document.getElementById('projectArea')) document.getElementById('projectArea').value = project.area || '';
  if (document.getElementById('projectType')) document.getElementById('projectType').value = project.projectType || '';
  if (document.getElementById('projectDesc')) document.getElementById('projectDesc').value = project.description || '';

  // Cover image preview
  currentImageData = project.image || '';
  const previewHolder = document.getElementById('previewHolder');
  const previewImg = document.getElementById('previewImg');
  const imageUrlInput = document.getElementById('imageUrlInput');
  const photoStatusBadge = document.getElementById('photoStatusBadge');

  if (currentImageData) {
    if (previewImg) previewImg.src = currentImageData;
    if (previewHolder) previewHolder.style.display = 'block';
    if (imageUrlInput && !currentImageData.startsWith('data:')) imageUrlInput.value = currentImageData;
    if (photoStatusBadge) photoStatusBadge.textContent = 'Active Cover Photo';
  } else {
    if (previewHolder) previewHolder.style.display = 'none';
    if (photoStatusBadge) photoStatusBadge.textContent = 'No photo attached';
  }

  // Gallery editor setup
  editingProjectGallery = project.gallery ? JSON.parse(JSON.stringify(project.gallery)) : [];
  renderFormGallery();

  const formGallerySection = document.getElementById('formGallerySection');
  if (formGallerySection) formGallerySection.style.display = 'block';

  if (modal) modal.classList.add('active');
}

function cancelEdit() {
  const modal = document.getElementById('projectEditModal');
  if (modal) modal.classList.remove('active');
  resetAdminForm();
}

function resetAdminForm() {
  editingProjectId = null;
  currentImageData = "";
  editingProjectGallery = [];

  const addForm = document.getElementById('addProjectForm');
  if (addForm) addForm.reset();

  const previewHolder = document.getElementById('previewHolder');
  if (previewHolder) previewHolder.style.display = 'none';

  const photoStatusBadge = document.getElementById('photoStatusBadge');
  if (photoStatusBadge) photoStatusBadge.textContent = 'No photo uploaded';

  const formGallerySection = document.getElementById('formGallerySection');
  if (formGallerySection) formGallerySection.style.display = 'none';
}

function saveProject() {
  const title = document.getElementById('projectTitle') ? document.getElementById('projectTitle').value.trim() : '';
  const category = document.getElementById('projectCategory') ? document.getElementById('projectCategory').value : 'residential';
  const location = document.getElementById('projectLocation') ? document.getElementById('projectLocation').value.trim() : '';
  const area = document.getElementById('projectArea') ? document.getElementById('projectArea').value.trim() : '';
  const projectType = document.getElementById('projectType') ? document.getElementById('projectType').value.trim() : '';
  const description = document.getElementById('projectDesc') ? document.getElementById('projectDesc').value.trim() : '';

  if (!title) {
    alert('Project title is required.');
    return;
  }

  const urlInput = document.getElementById('imageUrlInput');
  const finalImage = currentImageData || (urlInput ? urlInput.value.trim() : '') || 'assets/images/kanha_hero_facade_1791296928268.jpg';

  let finalGallery = editingProjectGallery.length > 0 ? [...editingProjectGallery] : [
    { section: "construction", title: title + " - Structural Elevation", image: finalImage },
    { section: "interior", title: title + " - Interior Space", image: finalImage }
  ];

  if (finalGallery.length > 0 && finalImage) {
    const hasCover = finalGallery.some(g => g.image === finalImage);
    if (!hasCover) {
      finalGallery.unshift({ section: "elevation", title: title + " - Cover Photo", image: finalImage });
    }
  }

  if (editingProjectId) {
    const index = projectsList.findIndex(p => p.id === editingProjectId);
    if (index !== -1) {
      projectsList[index] = {
        ...projectsList[index],
        title,
        category,
        location,
        area,
        projectType: projectType || 'Turnkey Project',
        description,
        image: finalImage,
        gallery: finalGallery
      };
      showToast(`Updated "${title}" successfully!`);
    }
  } else {
    const newProject = {
      id: 'proj_' + Date.now(),
      title,
      category,
      location,
      area,
      projectType: projectType || 'Turnkey Project',
      description,
      image: finalImage,
      featured: true,
      createdAt: new Date().toISOString().split('T')[0],
      gallery: finalGallery
    };
    projectsList.unshift(newProject);
    showToast(`Added new project "${title}" to portfolio!`);
  }

  saveProjectsToStorage(projectsList);
  renderAdminProjects();
  updateProjectsSummary();

  const modal = document.getElementById('projectEditModal');
  if (modal) modal.classList.remove('active');
  resetAdminForm();
}

function deleteProject(id) {
  const project = projectsList.find(p => p.id === id);
  if (!project) return;

  if (confirm(`Are you sure you want to delete "${project.title}" from the portfolio?`)) {
    projectsList = projectsList.filter(p => p.id !== id);
    saveProjectsToStorage(projectsList);
    renderAdminProjects();
    updateProjectsSummary();
    showToast(`Deleted "${project.title}".`);
  }
}

// In-Form Gallery Rendering & Photo Deletion
function renderFormGallery() {
  const container = document.getElementById('formGalleryGrid');
  const countBadge = document.getElementById('formGalleryCount');

  if (countBadge) countBadge.textContent = editingProjectGallery.length;
  if (!container) return;

  if (editingProjectGallery.length === 0) {
    container.innerHTML = `<div style="grid-column: 1 / -1; color: var(--text-muted); font-size: 0.78rem;">No gallery photos yet.</div>`;
    return;
  }

  container.innerHTML = editingProjectGallery.map((item, idx) => `
    <div class="photo-studio-card">
      <div class="photo-studio-thumb">
        <img src="${item.image}" alt="photo" onerror="this.src='https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'">
      </div>
      <div class="photo-studio-body">
        <div class="photo-studio-title">${item.title || 'Photo'}</div>
        <button type="button" class="btn-studio-del" onclick="deleteFormGalleryPhoto(${idx})" title="Delete photo">
          <i class="fa-solid fa-trash"></i> Delete
        </button>
      </div>
    </div>
  `).join('');
}

function deleteFormGalleryPhoto(index) {
  if (index >= 0 && index < editingProjectGallery.length) {
    const deleted = editingProjectGallery.splice(index, 1);
    renderFormGallery();
    showToast(`Deleted photo: "${deleted[0].title || 'Photo'}"`);
  }
}

// TAB 2: Company Info Form Handler
function loadCompanyForm() {
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  };

  setVal('cmpName', companyData.name);
  setVal('cmpSubtitle', companyData.subtitle);
  setVal('cmpFullName', companyData.fullName);
  setVal('cmpTagline', companyData.tagline);
  setVal('cmpPhone', companyData.phone);
  setVal('cmpEmail', companyData.email);
  setVal('cmpAddress', companyData.address);
  setVal('cmpHours', companyData.workingHours);
  setVal('cmpInstagram', companyData.instagramUrl);
}

function saveCompanyForm() {
  const getVal = id => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  };

  companyData = {
    name: getVal('cmpName'),
    subtitle: getVal('cmpSubtitle'),
    fullName: getVal('cmpFullName'),
    tagline: getVal('cmpTagline'),
    phone: getVal('cmpPhone'),
    email: getVal('cmpEmail'),
    address: getVal('cmpAddress'),
    workingHours: getVal('cmpHours'),
    estBadge: companyData.estBadge || "Established Since 2021 • Ahmedabad",
    instagramUrl: getVal('cmpInstagram')
  };

  saveCompanyToStorage(companyData);
  showToast("Updated Company Profile!");
}

// TAB 3: Hero Banner Form Handler
function loadHeroForm() {
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  };

  setVal('heroTitle', heroData.title);
  setVal('heroTitleHighlight', heroData.titleHighlight);
  setVal('heroEstBadge', heroData.estBadge);
  setVal('heroTagline', heroData.tagline);
  setVal('heroDesc', heroData.description);
  setVal('heroImg', heroData.image);

  if (heroData.image) {
    heroImageData = heroData.image;
    const previewHolder = document.getElementById('heroPreviewHolder');
    const previewImg = document.getElementById('heroPreviewImg');
    if (previewImg) previewImg.src = heroData.image;
    if (previewHolder) previewHolder.style.display = 'block';
  }
}

function saveHeroForm() {
  const getVal = id => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  };

  const heroImgUrl = heroImageData || getVal('heroImg');

  heroData = {
    title: getVal('heroTitle'),
    titleHighlight: getVal('heroTitleHighlight'),
    titleSuffix: heroData.titleSuffix || "& INTERIOR",
    estBadge: getVal('heroEstBadge'),
    tagline: getVal('heroTagline'),
    description: getVal('heroDesc'),
    image: heroImgUrl,
    badgeTitle: heroData.badgeTitle || "Turnkey Excellence",
    badgeSub: heroData.badgeSub || "End-to-End Handover Guarantee"
  };

  saveHeroToStorage(heroData);
  showToast("Updated Hero Banner section!");
}

// TAB 4: About Us Form Handler
function loadAboutForm() {
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  };

  setVal('aboutTitle', aboutData.title);
  setVal('aboutSubtitle', aboutData.subtitle);
  setVal('aboutStory1', aboutData.story1);
  setVal('aboutStory2', aboutData.story2);
  setVal('aboutImg', aboutData.image);

  if (aboutData.image) {
    aboutImageData = aboutData.image;
    const previewHolder = document.getElementById('aboutPreviewHolder');
    const previewImg = document.getElementById('aboutPreviewImg');
    if (previewImg) previewImg.src = aboutData.image;
    if (previewHolder) previewHolder.style.display = 'block';
  }
}

function saveAboutForm() {
  const getVal = id => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  };

  const aboutImgUrl = aboutImageData || getVal('aboutImg');

  aboutData = {
    title: getVal('aboutTitle'),
    subtitle: getVal('aboutSubtitle'),
    story1: getVal('aboutStory1'),
    story2: getVal('aboutStory2'),
    image: aboutImgUrl,
    safetyTitle: aboutData.safetyTitle || "Safety Standards",
    safetyDesc: aboutData.safetyDesc || "Strict structural safety compliance and load calculations.",
    timeTitle: aboutData.timeTitle || "On-Time Handover",
    timeDesc: aboutData.timeDesc || "Structured project timelines with milestone updates."
  };

  saveAboutToStorage(aboutData);
  showToast("Updated About Us Content!");
}

// TAB 5: Services & Specializations Manager
function loadServicesTable() {
  const tbody = document.getElementById('servicesAdminTable');
  if (!tbody) return;

  if (servicesList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px; color: var(--text-muted);">No services configured.</td></tr>`;
    return;
  }

  tbody.innerHTML = servicesList.map((srv) => `
    <tr>
      <td><i class="${srv.icon || 'fa-solid fa-check'}" style="color: var(--accent-cyan); font-size: 18px;"></i></td>
      <td><strong style="color: #fff;">${srv.title}</strong></td>
      <td style="color: var(--text-muted); font-size: 0.85rem;">${srv.shortDesc || srv.fullDesc || ''}</td>
      <td>
        <button class="btn-sm-edit" onclick="editService('${srv.id}')"><i class="fa-solid fa-pen"></i></button>
        <button class="btn-sm-danger" onclick="deleteService('${srv.id}')"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

function saveService() {
  const title = document.getElementById('srvTitle') ? document.getElementById('srvTitle').value.trim() : '';
  const icon = document.getElementById('srvIcon') ? document.getElementById('srvIcon').value.trim() : '';
  const shortDesc = document.getElementById('srvShortDesc') ? document.getElementById('srvShortDesc').value.trim() : '';
  const fullDesc = document.getElementById('srvFullDesc') ? document.getElementById('srvFullDesc').value.trim() : '';
  const highlightsStr = document.getElementById('srvHighlights') ? document.getElementById('srvHighlights').value.trim() : '';
  const image = document.getElementById('srvImage') ? document.getElementById('srvImage').value.trim() : '';

  if (!title || !icon) {
    alert("Service Title and Icon Class are required.");
    return;
  }

  const highlights = highlightsStr ? highlightsStr.split(',').map(s => s.trim()) : [];

  if (editingServiceId) {
    const idx = servicesList.findIndex(s => s.id === editingServiceId);
    if (idx !== -1) {
      servicesList[idx] = {
        ...servicesList[idx],
        title, icon, shortDesc, fullDesc, highlights, image
      };
      showToast(`Updated service "${title}"!`);
    }
  } else {
    const newSrv = {
      id: 'srv_' + Date.now(),
      title, icon, shortDesc, fullDesc, highlights, image
    };
    servicesList.push(newSrv);
    showToast(`Added new service "${title}"!`);
  }

  saveServicesToStorage(servicesList);
  loadServicesTable();
  resetServiceForm();
  updateProjectsSummary();
}

function editService(id) {
  const srv = servicesList.find(s => s.id === id);
  if (!srv) return;

  editingServiceId = srv.id;
  const titleElem = document.getElementById('srvFormCardTitle');
  if (titleElem) titleElem.innerHTML = `<i class="fa-solid fa-pen-to-square" style="color: var(--accent-cyan);"></i> Edit Service`;

  if (document.getElementById('srvTitle')) document.getElementById('srvTitle').value = srv.title;
  if (document.getElementById('srvIcon')) document.getElementById('srvIcon').value = srv.icon || '';
  if (document.getElementById('srvShortDesc')) document.getElementById('srvShortDesc').value = srv.shortDesc || '';
  if (document.getElementById('srvFullDesc')) document.getElementById('srvFullDesc').value = srv.fullDesc || '';
  if (document.getElementById('srvHighlights')) document.getElementById('srvHighlights').value = (srv.highlights || []).join(', ');
  if (document.getElementById('srvImage')) document.getElementById('srvImage').value = srv.image || '';

  if (srv.image) {
    const holder = document.getElementById('srvPreviewHolder');
    const img = document.getElementById('srvPreviewImg');
    if (img) img.src = srv.image;
    if (holder) holder.style.display = 'block';
  }

  const btnSave = document.getElementById('btnSaveService');
  if (btnSave) btnSave.innerHTML = `<i class="fa-solid fa-save"></i> Save Changes`;

  const btnCancel = document.getElementById('btnCancelSrv');
  if (btnCancel) btnCancel.style.display = 'inline-block';
}

function cancelServiceEdit() {
  resetServiceForm();
}

function resetServiceForm() {
  editingServiceId = null;
  const srvForm = document.getElementById('serviceForm');
  if (srvForm) srvForm.reset();

  const holder = document.getElementById('srvPreviewHolder');
  if (holder) holder.style.display = 'none';

  const titleElem = document.getElementById('srvFormCardTitle');
  if (titleElem) titleElem.innerHTML = `<i class="fa-solid fa-plus-circle" style="color: var(--accent-cyan);"></i> Add / Edit Service`;

  const btnSave = document.getElementById('btnSaveService');
  if (btnSave) btnSave.innerHTML = `<i class="fa-solid fa-plus"></i> Save Service`;

  const btnCancel = document.getElementById('btnCancelSrv');
  if (btnCancel) btnCancel.style.display = 'none';
}

function deleteService(id) {
  const srv = servicesList.find(s => s.id === id);
  if (!srv) return;

  if (confirm(`Are you sure you want to delete service "${srv.title}"?`)) {
    servicesList = servicesList.filter(s => s.id !== id);
    saveServicesToStorage(servicesList);
    loadServicesTable();
    updateProjectsSummary();
    showToast(`Deleted service "${srv.title}".`);
  }
}

// TAB 6: Dynamic Counter Stats Manager
function loadStatsForm() {
  const statsConfig = typeof getStoredStats === 'function' ? getStoredStats() : {};
  const autoProjects = (statsConfig.baseProjectsOffset || 40) + projectsList.length;
  
  const cfgProjInput = document.getElementById('cfgProjects');
  const cfgSqFtInput = document.getElementById('cfgSqFt');
  const cfgOnTimeInput = document.getElementById('cfgOnTime');
  const cfgSpecsInput = document.getElementById('cfgSpecs');

  if (cfgProjInput) {
    cfgProjInput.placeholder = `Auto (${autoProjects}+)`;
    cfgProjInput.value = statsConfig.customProjectsText || `${autoProjects}+`;
  }
  if (cfgSqFtInput) {
    cfgSqFtInput.value = statsConfig.customLargestSqFt || '15K+';
  }
  if (cfgOnTimeInput) {
    cfgOnTimeInput.value = statsConfig.customOnTimeRate || '100%';
  }
  if (cfgSpecsInput) {
    cfgSpecsInput.value = statsConfig.customSpecializations || servicesList.length;
  }
}

function saveStatsForm() {
  const statsObj = {
    customProjectsText: document.getElementById('cfgProjects') ? document.getElementById('cfgProjects').value.trim() : '',
    customLargestSqFt: document.getElementById('cfgSqFt') ? document.getElementById('cfgSqFt').value.trim() : '',
    customOnTimeRate: (document.getElementById('cfgOnTime') ? document.getElementById('cfgOnTime').value.trim() : '') || '100%',
    customSpecializations: document.getElementById('cfgSpecs') ? document.getElementById('cfgSpecs').value.trim() : ''
  };

  saveStatsToStorage(statsObj);
  showToast("Updated Stat Counter Ribbon metrics!");
}

// Setup Event Listeners
function setupAdminHandlers() {
  // Main Project Cover Image Dropzone
  const dropzone = document.getElementById('imageDropzone');
  const fileInput = document.getElementById('fileInput');
  const imageUrlInput = document.getElementById('imageUrlInput');
  const previewHolder = document.getElementById('previewHolder');
  const previewImg = document.getElementById('previewImg');
  const btnDeletePhoto = document.getElementById('btnDeletePhoto');
  const photoStatusBadge = document.getElementById('photoStatusBadge');

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        handleFileSelect(e.dataTransfer.files[0], (data) => {
          currentImageData = data;
          if (previewImg) previewImg.src = data;
          if (previewHolder) previewHolder.style.display = 'block';
          if (photoStatusBadge) photoStatusBadge.textContent = 'Uploaded photo ready';
        });
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0], (data) => {
          currentImageData = data;
          if (previewImg) previewImg.src = data;
          if (previewHolder) previewHolder.style.display = 'block';
          if (photoStatusBadge) photoStatusBadge.textContent = 'Uploaded photo ready';
        });
      }
    });
  }

  // Cover Image URL Input
  if (imageUrlInput) {
    imageUrlInput.addEventListener('input', (e) => {
      const url = e.target.value.trim();
      if (url) {
        currentImageData = url;
        if (previewImg) previewImg.src = url;
        if (previewHolder) previewHolder.style.display = 'block';
        if (photoStatusBadge) photoStatusBadge.textContent = 'URL Photo linked';
      }
    });
  }

  // DELETE UPDATED PHOTO BUTTON
  if (btnDeletePhoto) {
    btnDeletePhoto.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      currentImageData = "";
      if (imageUrlInput) imageUrlInput.value = "";
      if (fileInput) fileInput.value = "";
      if (previewHolder) previewHolder.style.display = "none";
      if (previewImg) previewImg.src = "";
      if (photoStatusBadge) photoStatusBadge.textContent = "Photo deleted / Cleared";

      showToast("Updated photo deleted successfully!");
    });
  }

  // In-Form Gallery Add Photo Toggle
  const btnToggleAddPhoto = document.getElementById('btnToggleAddPhoto');
  const formAddPhotoPanel = document.getElementById('formAddPhotoPanel');
  if (btnToggleAddPhoto && formAddPhotoPanel) {
    btnToggleAddPhoto.addEventListener('click', () => {
      const isOpen = formAddPhotoPanel.style.display === 'block';
      formAddPhotoPanel.style.display = isOpen ? 'none' : 'block';
      btnToggleAddPhoto.innerHTML = isOpen ? `<i class="fa-solid fa-plus"></i> Add Photo` : `<i class="fa-solid fa-minus"></i> Hide Panel`;
    });
  }

  // In-Form Add Photo Confirm
  const btnConfirmAddPhoto = document.getElementById('btnConfirmAddPhoto');
  const newGalleryTitle = document.getElementById('newGalleryTitle');
  const newGallerySection = document.getElementById('newGallerySection');
  const newGalleryUrl = document.getElementById('newGalleryUrl');
  const newGalleryFileInput = document.getElementById('newGalleryFileInput');

  if (newGalleryFileInput) {
    newGalleryFileInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;

      if (files.length === 1) {
        handleFileSelect(files[0], (data) => {
          if (newGalleryUrl) newGalleryUrl.value = data;
          showToast("Photo processed for gallery!");
        });
      } else {
        showToast(`Uploading ${files.length} photos in batch...`);
        const section = newGallerySection ? newGallerySection.value : 'interior';
        const baseTitle = (newGalleryTitle ? newGalleryTitle.value.trim() : '') || 'Gallery Photo';
        try {
          if (typeof apiUploadImages === 'function') {
            const res = await apiUploadImages(files);
            if (res && res.urls && res.urls.length > 0) {
              res.urls.forEach((url, idx) => {
                editingProjectGallery.push({ section, title: `${baseTitle} #${editingProjectGallery.length + 1}`, image: url });
              });
              renderFormGallery();
              newGalleryFileInput.value = '';
              showToast(`Added ${res.urls.length} photos to project gallery!`);
              return;
            }
          }
        } catch (err) {
          console.warn('Batch upload failed, falling back:', err);
        }
        handleFileSelect(files[0], (data) => {
          if (newGalleryUrl) newGalleryUrl.value = data;
        });
      }
    });
  }

  if (btnConfirmAddPhoto) {
    btnConfirmAddPhoto.addEventListener('click', () => {
      const img = newGalleryUrl ? newGalleryUrl.value.trim() : '';
      if (!img) {
        alert("Please provide an image URL or choose a photo file.");
        return;
      }

      const title = (newGalleryTitle ? newGalleryTitle.value.trim() : '') || 'Gallery Photo';
      const section = newGallerySection ? newGallerySection.value : 'interior';

      editingProjectGallery.push({ section, title, image: img });
      renderFormGallery();

      if (newGalleryTitle) newGalleryTitle.value = '';
      if (newGalleryUrl) newGalleryUrl.value = '';
      if (newGalleryFileInput) newGalleryFileInput.value = '';
      showToast("Added photo to project gallery!");
    });
  }

  // Admin Search & Category Filter
  const adminSearchInput = document.getElementById('adminSearchInput');
  const adminFilterCategory = document.getElementById('adminFilterCategory');

  if (adminSearchInput) {
    adminSearchInput.addEventListener('input', () => renderAdminProjects());
  }
  if (adminFilterCategory) {
    adminFilterCategory.addEventListener('change', () => renderAdminProjects());
  }

  // Hero Image Dropzone & Delete Photo
  const heroDropzone = document.getElementById('heroDropzone');
  const heroFileInput = document.getElementById('heroFileInput');
  const heroImgInput = document.getElementById('heroImg');
  const heroPreviewHolder = document.getElementById('heroPreviewHolder');
  const heroPreviewImg = document.getElementById('heroPreviewImg');
  const btnDeleteHeroPhoto = document.getElementById('btnDeleteHeroPhoto');

  if (heroDropzone && heroFileInput) {
    heroDropzone.addEventListener('click', () => heroFileInput.click());
    heroFileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0], (data) => {
          heroImageData = data;
          if (heroPreviewImg) heroPreviewImg.src = data;
          if (heroPreviewHolder) heroPreviewHolder.style.display = 'block';
          if (heroImgInput) heroImgInput.value = data;
        });
      }
    });
  }

  if (heroImgInput) {
    heroImgInput.addEventListener('input', (e) => {
      const url = e.target.value.trim();
      if (url) {
        heroImageData = url;
        if (heroPreviewImg) heroPreviewImg.src = url;
        if (heroPreviewHolder) heroPreviewHolder.style.display = 'block';
      }
    });
  }

  if (btnDeleteHeroPhoto) {
    btnDeleteHeroPhoto.addEventListener('click', (e) => {
      e.preventDefault();
      heroImageData = "";
      if (heroImgInput) heroImgInput.value = "";
      if (heroFileInput) heroFileInput.value = "";
      if (heroPreviewHolder) heroPreviewHolder.style.display = "none";
      showToast("Deleted Hero photo!");
    });
  }

  // About Image Dropzone & Delete Photo
  const aboutDropzone = document.getElementById('aboutDropzone');
  const aboutFileInput = document.getElementById('aboutFileInput');
  const aboutImgInput = document.getElementById('aboutImg');
  const aboutPreviewHolder = document.getElementById('aboutPreviewHolder');
  const aboutPreviewImg = document.getElementById('aboutPreviewImg');
  const btnDeleteAboutPhoto = document.getElementById('btnDeleteAboutPhoto');

  if (aboutDropzone && aboutFileInput) {
    aboutDropzone.addEventListener('click', () => aboutFileInput.click());
    aboutFileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0], (data) => {
          aboutImageData = data;
          if (aboutPreviewImg) aboutPreviewImg.src = data;
          if (aboutPreviewHolder) aboutPreviewHolder.style.display = 'block';
          if (aboutImgInput) aboutImgInput.value = data;
        });
      }
    });
  }

  if (aboutImgInput) {
    aboutImgInput.addEventListener('input', (e) => {
      const url = e.target.value.trim();
      if (url) {
        aboutImageData = url;
        if (aboutPreviewImg) aboutPreviewImg.src = url;
        if (aboutPreviewHolder) aboutPreviewHolder.style.display = 'block';
      }
    });
  }

  if (btnDeleteAboutPhoto) {
    btnDeleteAboutPhoto.addEventListener('click', (e) => {
      e.preventDefault();
      aboutImageData = "";
      if (aboutImgInput) aboutImgInput.value = "";
      if (aboutFileInput) aboutFileInput.value = "";
      if (aboutPreviewHolder) aboutPreviewHolder.style.display = "none";
      showToast("Deleted About photo!");
    });
  }

  // Service Image Preview & Delete
  const srvImgInput = document.getElementById('srvImage');
  const srvPreviewHolder = document.getElementById('srvPreviewHolder');
  const srvPreviewImg = document.getElementById('srvPreviewImg');
  const btnDeleteSrvPhoto = document.getElementById('btnDeleteSrvPhoto');

  if (srvImgInput) {
    srvImgInput.addEventListener('input', (e) => {
      const url = e.target.value.trim();
      if (url) {
        if (srvPreviewImg) srvPreviewImg.src = url;
        if (srvPreviewHolder) srvPreviewHolder.style.display = 'block';
      }
    });
  }

  if (btnDeleteSrvPhoto) {
    btnDeleteSrvPhoto.addEventListener('click', (e) => {
      e.preventDefault();
      if (srvImgInput) srvImgInput.value = "";
      if (srvPreviewHolder) srvPreviewHolder.style.display = "none";
      showToast("Deleted service photo!");
    });
  }

  // Form Submissions
  const projectForm = document.getElementById('addProjectForm');
  if (projectForm) {
    projectForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveProject();
    });
  }

  const companyForm = document.getElementById('companyForm');
  if (companyForm) {
    companyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveCompanyForm();
    });
  }

  const heroForm = document.getElementById('heroForm');
  if (heroForm) {
    heroForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveHeroForm();
    });
  }

  const aboutForm = document.getElementById('aboutForm');
  if (aboutForm) {
    aboutForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveAboutForm();
    });
  }

  const serviceForm = document.getElementById('serviceForm');
  if (serviceForm) {
    serviceForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveService();
    });
  }

  const statsForm = document.getElementById('statsConfigForm');
  if (statsForm) {
    statsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveStatsForm();
    });
  }

  // Master Reset Button
  const resetBtn = document.getElementById('btnMasterReset');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      if (confirm("Are you sure you want to reset ALL website data back to original defaults?")) {
        showToast("Resetting website database to defaults...");
        if (typeof resetEntireWebsiteToDefaults === 'function') {
          resetEntireWebsiteToDefaults();
        }
        if (typeof apiResetDatabase === 'function') {
          try {
            await apiResetDatabase();
          } catch (e) {}
        }
        if (typeof syncDataWithServer === 'function') {
          await syncDataWithServer();
        }
        initAdminDashboard();
        showToast("Reset entire website data back to defaults!");
      }
    });
  }

  // Logout Button
  const logoutBtn = document.getElementById('adminLogoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetch('/api/admin/logout', { method: 'POST' });
      } catch (e) {}
      window.location.href = '/admin';
    });
  }
}

// DEDICATED VISUAL PHOTO STUDIO MODAL
function setupGalleryModal() {
  const modal = document.getElementById('adminGalleryModal');
  const closeBtn = document.getElementById('modalCloseBtn');
  const modalBtnAddPhoto = document.getElementById('modalBtnAddPhoto');
  const modalAddPhotoFileInput = document.getElementById('modalAddPhotoFileInput');
  const modalAddPhotoUrl = document.getElementById('modalAddPhotoUrl');
  const modalAddPhotoPreviewHolder = document.getElementById('modalAddPhotoPreviewHolder');
  const modalAddPhotoPreviewImg = document.getElementById('modalAddPhotoPreviewImg');

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('active');
      activeModalProjectId = null;
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
        activeModalProjectId = null;
      }
    });
  }

  // Setup Modal Section Filter Pills
  const modalFilterPills = document.querySelectorAll('#modalSectionFilterNav .gallery-sec-pill');
  modalFilterPills.forEach(pill => {
    pill.addEventListener('click', (e) => {
      modalFilterPills.forEach(p => p.classList.remove('active'));
      const targetPill = e.currentTarget;
      targetPill.classList.add('active');
      currentModalGallerySection = targetPill.getAttribute('data-modalsection') || 'all';

      if (activeModalProjectId) {
        const project = projectsList.find(p => p.id === activeModalProjectId);
        if (project) renderModalGalleryGrid(project);
      }
    });
  });

  if (modalAddPhotoFileInput) {
    modalAddPhotoFileInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;

      if (files.length === 1) {
        handleFileSelect(files[0], (data) => {
          modalNewImageData = data;
          if (modalAddPhotoPreviewImg) modalAddPhotoPreviewImg.src = data;
          if (modalAddPhotoPreviewHolder) modalAddPhotoPreviewHolder.style.display = 'block';
        });
      } else {
        if (!activeModalProjectId) return;
        const project = projectsList.find(p => p.id === activeModalProjectId);
        if (!project) return;
        if (!project.gallery) project.gallery = [];

        showToast(`Uploading ${files.length} photos in batch...`);
        const sectionInput = document.getElementById('modalAddPhotoSection');
        const section = sectionInput ? sectionInput.value : 'construction';
        const titleInput = document.getElementById('modalAddPhotoTitle');
        const baseTitle = (titleInput ? titleInput.value.trim() : '') || project.title;

        try {
          if (typeof apiUploadImages === 'function') {
            const res = await apiUploadImages(files);
            if (res && res.urls && res.urls.length > 0) {
              res.urls.forEach((url, idx) => {
                project.gallery.push({
                  title: `${baseTitle} Photo ${project.gallery.length + 1}`,
                  section,
                  image: url
                });
              });
              saveProjectsToStorage(projectsList);
              renderModalGalleryGrid(project);
              renderAdminProjects();
              updateProjectsSummary();
              showToast(`Added ${res.urls.length} photos to "${project.title}"!`);
              modalAddPhotoFileInput.value = '';
              return;
            }
          }
        } catch (err) {
          console.warn('Batch modal upload failed, falling back:', err);
        }

        handleFileSelect(files[0], (data) => {
          modalNewImageData = data;
          if (modalAddPhotoPreviewImg) modalAddPhotoPreviewImg.src = data;
          if (modalAddPhotoPreviewHolder) modalAddPhotoPreviewHolder.style.display = 'block';
        });
      }
    });
  }

  if (modalAddPhotoUrl) {
    modalAddPhotoUrl.addEventListener('input', (e) => {
      const url = e.target.value.trim();
      if (url) {
        modalNewImageData = url;
        if (modalAddPhotoPreviewImg) modalAddPhotoPreviewImg.src = url;
        if (modalAddPhotoPreviewHolder) modalAddPhotoPreviewHolder.style.display = 'block';
      }
    });
  }

  if (modalBtnAddPhoto) {
    modalBtnAddPhoto.addEventListener('click', () => {
      if (!activeModalProjectId) return;

      const project = projectsList.find(p => p.id === activeModalProjectId);
      if (!project) return;

      const urlInput = document.getElementById('modalAddPhotoUrl');
      const finalImg = modalNewImageData || (urlInput ? urlInput.value.trim() : '');
      const titleInput = document.getElementById('modalAddPhotoTitle');
      const sectionInput = document.getElementById('modalAddPhotoSection');

      if (!finalImg) {
        alert("Please browse an image file or provide a valid image URL.");
        return;
      }

      if (!project.gallery) project.gallery = [];

      const newPhoto = {
        title: (titleInput ? titleInput.value.trim() : '') || (project.title + ' Photo'),
        section: sectionInput ? sectionInput.value : 'construction',
        image: finalImg
      };

      project.gallery.push(newPhoto);
      saveProjectsToStorage(projectsList);

      // Reset modal inputs
      modalNewImageData = "";
      if (urlInput) urlInput.value = "";
      if (titleInput) titleInput.value = "";
      if (modalAddPhotoFileInput) modalAddPhotoFileInput.value = "";
      if (modalAddPhotoPreviewHolder) modalAddPhotoPreviewHolder.style.display = "none";

      renderModalGalleryGrid(project);
      renderAdminProjects();
      updateProjectsSummary();
      showToast(`Added new photo to "${project.title}" under ${GALLERY_SECTIONS[newPhoto.section] ? GALLERY_SECTIONS[newPhoto.section].label : newPhoto.section}!`);
    });
  }
}

function openGalleryModal(projectId) {
  const project = projectsList.find(p => p.id === projectId);
  if (!project) return;

  activeModalProjectId = project.id;
  modalNewImageData = "";
  currentModalGallerySection = 'all';

  const modal = document.getElementById('adminGalleryModal');
  const title = document.getElementById('modalProjectTitle');
  const sub = document.getElementById('modalProjectSubtitle');

  if (title) title.textContent = `Photo Studio: ${project.title}`;
  if (sub) sub.textContent = `Category: ${(project.category || 'RESIDENTIAL').toUpperCase()} • Location: ${project.location || 'Ahmedabad'}`;

  // Reset modal filter pills to "All Sections"
  const modalFilterPills = document.querySelectorAll('#modalSectionFilterNav .gallery-sec-pill');
  modalFilterPills.forEach(p => {
    p.classList.toggle('active', p.getAttribute('data-modalsection') === 'all');
  });

  renderModalGalleryGrid(project);

  if (modal) modal.classList.add('active');
}

function renderModalGalleryGrid(project) {
  const grid = document.getElementById('modalGalleryGrid');
  const badge = document.getElementById('modalPhotoCountBadge');
  if (!grid) return;

  const gallery = project.gallery || [];
  if (badge) badge.textContent = gallery.length;

  const filtered = gallery.map((item, index) => ({ item, origIndex: index })).filter(({ item }) => {
    if (currentModalGallerySection === 'all') return true;
    return (item.section || 'construction').toLowerCase() === currentModalGallerySection.toLowerCase();
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted); background: #06161f; border-radius: 12px;">
        <i class="fa-solid fa-images" style="font-size: 2rem; color: var(--text-dim); margin-bottom: 8px; display: block;"></i>
        No photos found in this project under the <strong>${currentModalGallerySection.toUpperCase()}</strong> section.
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(({ item, origIndex }) => {
    const isCover = project.image === item.image;
    const secKey = (item.section || 'construction').toLowerCase();
    const secMeta = GALLERY_SECTIONS[secKey] || GALLERY_SECTIONS.construction;

    return `
      <div class="photo-studio-card" style="border: ${isCover ? '2px solid var(--accent-cyan)' : '1px solid rgba(255,255,255,0.08)'};">
        <div class="photo-studio-thumb">
          <img src="${item.image}" alt="photo" onerror="this.src='https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'">
          <span class="gallery-card-sec-badge ${secMeta.bgBadge}" style="top: 6px; left: 6px;">${secMeta.shortLabel}</span>
          ${isCover ? '<span style="position: absolute; top: 6px; right: 6px; background: var(--accent-cyan); color: #05131a; font-size: 0.65rem; font-weight: 800; padding: 2px 7px; border-radius: 4px;">COVER</span>' : ''}
        </div>
        <div class="photo-studio-body">
          <div class="photo-studio-title" title="${item.title || ''}">${item.title || 'Photo #' + (origIndex + 1)}</div>
          
          <!-- Quick Section Changer Dropdown -->
          <div style="display: flex; align-items: center; gap: 4px; margin-top: 2px;">
            <label style="font-size: 0.65rem; color: var(--text-dim); white-space: nowrap;">Section:</label>
            <select class="gallery-sec-select-small" onchange="changeProjectPhotoSection('${project.id}', ${origIndex}, this.value)">
              <option value="construction" ${secKey === 'construction' ? 'selected' : ''}>Construction</option>
              <option value="interior" ${secKey === 'interior' ? 'selected' : ''}>Interior</option>
              <option value="elevation" ${secKey === 'elevation' ? 'selected' : ''}>Elevation</option>
              <option value="industrial" ${secKey === 'industrial' ? 'selected' : ''}>Industrial</option>
              <option value="hospital" ${secKey === 'hospital' ? 'selected' : ''}>Hospital</option>
              <option value="planning" ${secKey === 'planning' ? 'selected' : ''}>3D Planning</option>
            </select>
          </div>

          <div style="display: flex; gap: 6px; margin-top: 4px;">
            ${!isCover ? `<button type="button" class="btn-sm-edit" style="flex: 1; font-size: 0.68rem; padding: 5px;" onclick="setProjectCoverPhoto('${project.id}', ${origIndex})" title="Set as Cover"><i class="fa-solid fa-star"></i> Cover</button>` : ''}
            <button type="button" class="btn-studio-del" style="flex: 1;" onclick="deleteModalGalleryPhoto('${project.id}', ${origIndex})" title="Delete this photo">
              <i class="fa-solid fa-trash-can"></i> Delete
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function changeProjectPhotoSection(projectId, index, newSection) {
  const project = projectsList.find(p => p.id === projectId);
  if (!project || !project.gallery || !project.gallery[index]) return;

  project.gallery[index].section = newSection;
  saveProjectsToStorage(projectsList);
  renderModalGalleryGrid(project);
  updateProjectsSummary();
  showToast(`Updated section to "${GALLERY_SECTIONS[newSection] ? GALLERY_SECTIONS[newSection].label : newSection}"!`);
}

function deleteModalGalleryPhoto(projectId, index) {
  const project = projectsList.find(p => p.id === projectId);
  if (!project || !project.gallery) return;

  if (index >= 0 && index < project.gallery.length) {
    const deleted = project.gallery.splice(index, 1);
    
    if (deleted[0] && project.image === deleted[0].image) {
      project.image = project.gallery.length > 0 ? project.gallery[0].image : 'assets/images/kanha_hero_facade_1791296928268.jpg';
    }

    saveProjectsToStorage(projectsList);
    renderModalGalleryGrid(project);
    renderAdminProjects();
    updateProjectsSummary();
    showToast(`Deleted photo: "${deleted[0].title || 'Photo'}"`);
  }
}

function setProjectCoverPhoto(projectId, index) {
  const project = projectsList.find(p => p.id === projectId);
  if (!project || !project.gallery || !project.gallery[index]) return;

  project.image = project.gallery[index].image;
  saveProjectsToStorage(projectsList);
  renderModalGalleryGrid(project);
  renderAdminProjects();
  showToast(`Updated cover photo for "${project.title}"!`);
}

// ==========================================
// CATEGORIZED GLOBAL MEDIA GALLERY STUDIO
// ==========================================
function setupGlobalGalleryStudio() {
  // 1. Section Filter Navigation Pills
  const secPills = document.querySelectorAll('#gallerySectionsNav .gallery-sec-pill');
  secPills.forEach(pill => {
    pill.addEventListener('click', (e) => {
      secPills.forEach(p => p.classList.remove('active'));
      const targetPill = e.currentTarget;
      targetPill.classList.add('active');
      currentGallerySection = targetPill.getAttribute('data-section') || 'all';
      renderGlobalGalleryStudio();
    });
  });

  // 2. Search Photos by keyword
  const searchInput = document.getElementById('gallerySearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentGallerySearchQuery = e.target.value.trim().toLowerCase();
      renderGlobalGalleryStudio();
    });
  }

  // 3. Filter Photos by Project Dropdown
  const projectSelect = document.getElementById('galleryFilterProjectSelect');
  if (projectSelect) {
    projectSelect.addEventListener('change', (e) => {
      currentGalleryProjectFilter = e.target.value;
      renderGlobalGalleryStudio();
    });
  }

  // 4. Toggle Upload Panel
  const toggleBtn = document.getElementById('btnToggleGalleryUploadPanel');
  const closePanelBtn = document.getElementById('btnCloseGalleryUploadPanel');
  const uploadPanel = document.getElementById('galleryUploadPanel');

  if (toggleBtn && uploadPanel) {
    toggleBtn.addEventListener('click', () => {
      const isVisible = uploadPanel.style.display === 'block';
      uploadPanel.style.display = isVisible ? 'none' : 'block';
      if (!isVisible) {
        uploadPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  if (closePanelBtn && uploadPanel) {
    closePanelBtn.addEventListener('click', () => {
      uploadPanel.style.display = 'none';
    });
  }

  // 5. File & URL Upload in Gallery Studio
  const fileInput = document.getElementById('galUploadFileInput');
  const urlInput = document.getElementById('galUploadUrlInput');
  const previewHolder = document.getElementById('galUploadPreviewHolder');
  const previewImg = document.getElementById('galUploadPreviewImg');
  const submitBtn = document.getElementById('btnSubmitGalleryPhoto');

  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;

      if (files.length === 1) {
        handleFileSelect(files[0], (data) => {
          galleryNewUploadData = data;
          if (previewImg) previewImg.src = data;
          if (previewHolder) previewHolder.style.display = 'block';
        });
      } else {
        const projSelect = document.getElementById('galUploadProjectSelect');
        const targetProjId = projSelect ? projSelect.value : '';
        if (!targetProjId) {
          alert("Please select a target project first before choosing batch photos.");
          return;
        }

        const project = projectsList.find(p => p.id === targetProjId);
        if (!project) return;
        if (!project.gallery) project.gallery = [];

        showToast(`Uploading ${files.length} photos in batch...`);
        const secSelect = document.getElementById('galUploadSectionSelect');
        const section = secSelect ? secSelect.value : 'construction';
        const titleInput = document.getElementById('galUploadTitleInput');
        const baseTitle = (titleInput ? titleInput.value.trim() : '') || project.title;

        try {
          if (typeof apiUploadImages === 'function') {
            const res = await apiUploadImages(files);
            if (res && res.urls && res.urls.length > 0) {
              res.urls.forEach((url, idx) => {
                project.gallery.push({
                  title: `${baseTitle} #${project.gallery.length + 1}`,
                  section,
                  image: url
                });
              });
              saveProjectsToStorage(projectsList);
              fileInput.value = '';
              if (previewHolder) previewHolder.style.display = 'none';
              if (uploadPanel) uploadPanel.style.display = 'none';

              renderGlobalGalleryStudio();
              renderAdminProjects();
              updateProjectsSummary();
              showToast(`Uploaded and added ${res.urls.length} photos to "${project.title}"!`);
              return;
            }
          }
        } catch (err) {
          console.warn('Batch gallery upload failed, falling back:', err);
        }

        handleFileSelect(files[0], (data) => {
          galleryNewUploadData = data;
          if (previewImg) previewImg.src = data;
          if (previewHolder) previewHolder.style.display = 'block';
        });
      }
    });
  }

  if (urlInput) {
    urlInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (val) {
        galleryNewUploadData = val;
        if (previewImg) previewImg.src = val;
        if (previewHolder) previewHolder.style.display = 'block';
      }
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      const projSelect = document.getElementById('galUploadProjectSelect');
      const secSelect = document.getElementById('galUploadSectionSelect');
      const titleInput = document.getElementById('galUploadTitleInput');
      
      const targetProjId = projSelect ? projSelect.value : '';
      const section = secSelect ? secSelect.value : 'construction';
      const title = (titleInput ? titleInput.value.trim() : '') || 'Portfolio Execution Photo';
      const img = galleryNewUploadData || (urlInput ? urlInput.value.trim() : '');

      if (!targetProjId) {
        alert("Please select a target project to associate this photo with.");
        return;
      }

      if (!img) {
        alert("Please browse an image file or paste an image URL.");
        return;
      }

      const project = projectsList.find(p => p.id === targetProjId);
      if (!project) return;

      if (!project.gallery) project.gallery = [];
      project.gallery.push({
        title: title,
        section: section,
        image: img
      });

      saveProjectsToStorage(projectsList);

      // Reset form
      galleryNewUploadData = "";
      if (titleInput) titleInput.value = "";
      if (urlInput) urlInput.value = "";
      if (fileInput) fileInput.value = "";
      if (previewHolder) previewHolder.style.display = "none";
      if (uploadPanel) uploadPanel.style.display = "none";

      renderGlobalGalleryStudio();
      renderAdminProjects();
      updateProjectsSummary();
      showToast(`Saved photo to "${project.title}" under ${GALLERY_SECTIONS[section] ? GALLERY_SECTIONS[section].label : section}!`);
    });
  }

  renderGlobalGalleryStudio();
}

function renderGlobalGalleryStudio() {
  const container = document.getElementById('adminGlobalGalleryContainer');
  if (!container) return;

  // Populate Dropdowns with Current Projects
  const filterProjSelect = document.getElementById('galleryFilterProjectSelect');
  const uploadProjSelect = document.getElementById('galUploadProjectSelect');

  if (filterProjSelect && filterProjSelect.options.length <= 1) {
    projectsList.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.title;
      filterProjSelect.appendChild(opt);
    });
  }

  if (uploadProjSelect && uploadProjSelect.options.length === 0) {
    projectsList.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.title} (${(p.category || 'PROJECT').toUpperCase()})`;
      uploadProjSelect.appendChild(opt);
    });
  }

  // Flatten all photos across projects with metadata
  const allPhotos = [];
  projectsList.forEach(proj => {
    if (Array.isArray(proj.gallery)) {
      proj.gallery.forEach((photo, idx) => {
        allPhotos.push({
          projectId: proj.id,
          projectTitle: proj.title,
          projectCat: proj.category || 'project',
          photoIndex: idx,
          title: photo.title || (proj.title + ' Photo'),
          section: (photo.section || 'construction').toLowerCase(),
          image: photo.image,
          isCover: proj.image === photo.image
        });
      });
    }
  });

  // Calculate Section Counts for Badges
  const counts = { all: allPhotos.length };
  Object.keys(GALLERY_SECTIONS).forEach(k => counts[k] = 0);
  allPhotos.forEach(p => {
    if (counts[p.section] !== undefined) counts[p.section]++;
    else counts.construction++;
  });

  // Update Section Navigation Pill Badges
  const badgeAll = document.getElementById('pillBadgeAll');
  if (badgeAll) badgeAll.textContent = counts.all;
  const badgeConst = document.getElementById('pillBadgeConstruction');
  if (badgeConst) badgeConst.textContent = counts.construction || 0;
  const badgeInter = document.getElementById('pillBadgeInterior');
  if (badgeInter) badgeInter.textContent = counts.interior || 0;
  const badgeElev = document.getElementById('pillBadgeElevation');
  if (badgeElev) badgeElev.textContent = counts.elevation || 0;
  const badgeIndus = document.getElementById('pillBadgeIndustrial');
  if (badgeIndus) badgeIndus.textContent = counts.industrial || 0;
  const badgeHosp = document.getElementById('pillBadgeHospital');
  if (badgeHosp) badgeHosp.textContent = counts.hospital || 0;
  const badgePlan = document.getElementById('pillBadgePlanning');
  if (badgePlan) badgePlan.textContent = counts.planning || 0;

  // Filter Photos by Project and Search Query
  let filteredPhotos = allPhotos.filter(p => {
    const matchProj = currentGalleryProjectFilter === 'all' || p.projectId === currentGalleryProjectFilter;
    const matchSearch = !currentGallerySearchQuery || 
      p.title.toLowerCase().includes(currentGallerySearchQuery) ||
      p.projectTitle.toLowerCase().includes(currentGallerySearchQuery) ||
      p.section.toLowerCase().includes(currentGallerySearchQuery);
    return matchProj && matchSearch;
  });

  if (allPhotos.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; background: #09202b; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08);">
        <i class="fa-solid fa-photo-film" style="font-size: 3rem; color: var(--accent-cyan); margin-bottom: 14px; display: block;"></i>
        <h3 style="color: #fff; font-size: 1.25rem;">No Photos in Gallery</h3>
        <p style="color: var(--text-dim); font-size: 0.9rem; margin-top: 6px;">Click the "Upload Photo" button above to add your first photo to any section.</p>
      </div>
    `;
    return;
  }

  // RENDER MODE 1: "ALL SECTIONS" (Showcase grouped by specialized section blocks)
  if (currentGallerySection === 'all' && !currentGallerySearchQuery) {
    const sectionKeys = Object.keys(GALLERY_SECTIONS);
    
    container.innerHTML = sectionKeys.map(key => {
      const meta = GALLERY_SECTIONS[key];
      const sectionPhotos = filteredPhotos.filter(p => p.section === key);

      return `
        <div class="gallery-section-block">
          <div class="gallery-section-header">
            <div class="gallery-sec-title-group">
              <div class="gallery-sec-icon-circle" style="background: ${meta.color}22; color: ${meta.color}; border: 1px solid ${meta.color}44;">
                <i class="${meta.icon}"></i>
              </div>
              <div class="gallery-sec-info">
                <h3>${meta.label} <span style="font-size: 0.8rem; color: ${meta.color}; margin-left: 6px;">(${sectionPhotos.length})</span></h3>
                <p>${meta.desc}</p>
              </div>
            </div>
            <button type="button" class="btn-sm-edit" style="font-size: 0.78rem; padding: 6px 14px;" onclick="quickOpenUploadForSection('${key}')">
              <i class="fa-solid fa-plus"></i> Add to ${meta.shortLabel}
            </button>
          </div>

          ${sectionPhotos.length === 0 ? `
            <div style="text-align: center; padding: 30px; color: var(--text-dim); background: #06161f; border-radius: 10px; font-size: 0.85rem;">
              No photos added to ${meta.label} yet. Use "Add to ${meta.shortLabel}" above to upload.
            </div>
          ` : `
            <div class="photo-studio-grid">
              ${sectionPhotos.map(photo => renderSingleGalleryCardHtml(photo)).join('')}
            </div>
          `}
        </div>
      `;
    }).join('');
  } 
  // RENDER MODE 2: Filtered by specific section or search
  else {
    const activePhotos = currentGallerySection === 'all' 
      ? filteredPhotos 
      : filteredPhotos.filter(p => p.section === currentGallerySection);

    const activeMeta = GALLERY_SECTIONS[currentGallerySection] || {
      label: currentGallerySearchQuery ? `Search Results for "${currentGallerySearchQuery}"` : 'All Filtered Photos',
      icon: 'fa-solid fa-layer-group',
      color: '#38bdf8',
      desc: `Displaying ${activePhotos.length} matching photos across portfolio.`
    };

    container.innerHTML = `
      <div class="gallery-section-block">
        <div class="gallery-section-header">
          <div class="gallery-sec-title-group">
            <div class="gallery-sec-icon-circle" style="background: ${activeMeta.color}22; color: ${activeMeta.color}; border: 1px solid ${activeMeta.color}44;">
              <i class="${activeMeta.icon}"></i>
            </div>
            <div class="gallery-sec-info">
              <h3>${activeMeta.label} <span style="font-size: 0.8rem; color: ${activeMeta.color}; margin-left: 6px;">(${activePhotos.length})</span></h3>
              <p>${activeMeta.desc}</p>
            </div>
          </div>
          ${currentGallerySection !== 'all' ? `
            <button type="button" class="btn-sm-edit" style="font-size: 0.78rem; padding: 6px 14px;" onclick="quickOpenUploadForSection('${currentGallerySection}')">
              <i class="fa-solid fa-plus"></i> Add Photo Here
            </button>
          ` : ''}
        </div>

        ${activePhotos.length === 0 ? `
          <div style="text-align: center; padding: 50px 20px; color: var(--text-dim); background: #06161f; border-radius: 12px;">
            <i class="fa-solid fa-magnifying-glass" style="font-size: 2.2rem; color: var(--text-dim); margin-bottom: 10px; display: block;"></i>
            <h4 style="color: #fff; font-size: 1.1rem;">No matching photos found</h4>
            <p style="font-size: 0.85rem; margin-top: 4px;">Try selecting another section or clearing your search filter.</p>
          </div>
        ` : `
          <div class="photo-studio-grid">
            ${activePhotos.map(photo => renderSingleGalleryCardHtml(photo)).join('')}
          </div>
        `}
      </div>
    `;
  }
}

function renderSingleGalleryCardHtml(photo) {
  const meta = GALLERY_SECTIONS[photo.section] || GALLERY_SECTIONS.construction;
  return `
    <div class="gallery-card-item">
      <div class="gallery-card-thumb">
        <img src="${photo.image}" alt="${photo.title}" onerror="this.src='https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'">
        <span class="gallery-card-sec-badge ${meta.bgBadge}">${meta.shortLabel}</span>
        <span class="gallery-card-project-badge" title="${photo.projectTitle}">${photo.projectTitle}</span>
        ${photo.isCover ? '<span style="position: absolute; top: 8px; right: 8px; background: var(--accent-cyan); color: #04141c; font-size: 0.65rem; font-weight: 800; padding: 2px 7px; border-radius: 4px;">COVER</span>' : ''}
      </div>
      <div class="gallery-card-body">
        <div class="gallery-card-title" title="${photo.title}">${photo.title}</div>
        
        <!-- Re-assign Section with 1 Click -->
        <div style="display: flex; align-items: center; gap: 4px;">
          <label style="font-size: 0.65rem; color: var(--text-dim); white-space: nowrap;">Section:</label>
          <select class="gallery-sec-select-small" onchange="changePhotoSection('${photo.projectId}', ${photo.photoIndex}, this.value)">
            <option value="construction" ${photo.section === 'construction' ? 'selected' : ''}>Construction</option>
            <option value="interior" ${photo.section === 'interior' ? 'selected' : ''}>Interior</option>
            <option value="elevation" ${photo.section === 'elevation' ? 'selected' : ''}>Elevation</option>
            <option value="industrial" ${photo.section === 'industrial' ? 'selected' : ''}>Industrial</option>
            <option value="hospital" ${photo.section === 'hospital' ? 'selected' : ''}>Hospital</option>
            <option value="planning" ${photo.section === 'planning' ? 'selected' : ''}>3D Planning</option>
          </select>
        </div>

        <div class="gallery-card-controls" style="margin-top: 2px;">
          ${!photo.isCover ? `
            <button type="button" class="btn-sm-edit" style="flex: 1; font-size: 0.68rem; padding: 6px;" onclick="setGlobalPhotoAsCover('${photo.projectId}', ${photo.photoIndex})" title="Set as Project Cover Photo">
              <i class="fa-solid fa-star"></i> Cover
            </button>
          ` : ''}
          <button type="button" class="btn-studio-del" style="flex: 1;" onclick="deleteGlobalGalleryPhoto('${photo.projectId}', ${photo.photoIndex})" title="Delete this photo from portfolio">
            <i class="fa-solid fa-trash-can"></i> Delete
          </button>
        </div>
      </div>
    </div>
  `;
}

function quickOpenUploadForSection(sectionKey) {
  const panel = document.getElementById('galleryUploadPanel');
  const secSelect = document.getElementById('galUploadSectionSelect');
  if (secSelect) secSelect.value = sectionKey;
  if (panel) {
    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function changePhotoSection(projectId, photoIndex, newSection) {
  const project = projectsList.find(p => p.id === projectId);
  if (!project || !project.gallery || !project.gallery[photoIndex]) return;

  project.gallery[photoIndex].section = newSection;
  saveProjectsToStorage(projectsList);
  renderGlobalGalleryStudio();
  updateProjectsSummary();
  showToast(`Moved photo to "${GALLERY_SECTIONS[newSection] ? GALLERY_SECTIONS[newSection].label : newSection}"!`);
}

function setGlobalPhotoAsCover(projectId, photoIndex) {
  const project = projectsList.find(p => p.id === projectId);
  if (!project || !project.gallery || !project.gallery[photoIndex]) return;

  project.image = project.gallery[photoIndex].image;
  saveProjectsToStorage(projectsList);
  renderGlobalGalleryStudio();
  renderAdminProjects();
  showToast(`Updated cover photo for "${project.title}"!`);
}

function deleteGlobalGalleryPhoto(projectId, photoIndex) {
  const project = projectsList.find(p => p.id === projectId);
  if (!project || !project.gallery) return;

  if (photoIndex >= 0 && photoIndex < project.gallery.length) {
    const deleted = project.gallery.splice(photoIndex, 1);
    
    if (deleted[0] && project.image === deleted[0].image) {
      project.image = project.gallery.length > 0 ? project.gallery[0].image : 'assets/images/kanha_hero_facade_1791296928268.jpg';
    }

    saveProjectsToStorage(projectsList);
    renderGlobalGalleryStudio();
    renderAdminProjects();
    updateProjectsSummary();
    showToast(`Deleted photo: "${deleted[0] ? deleted[0].title : 'Photo'}"`);
  }
}

// Image File Upload Helper (Uploads directly to Server Disk / Cloudinary, fallback to Canvas base64)
async function handleFileSelect(file, callback) {
  if (!file.type.startsWith('image/')) {
    alert('Please select a valid image file (JPG, PNG, WEBP, AVIF, SVG).');
    return;
  }

  showToast('Uploading & optimizing image...');

  if (typeof apiUploadImage === 'function') {
    try {
      const uploadRes = await apiUploadImage(file);
      if (uploadRes && uploadRes.success && uploadRes.url) {
        if (typeof callback === 'function') callback(uploadRes.url);
        showToast('Photo uploaded & stored permanently!');
        return;
      }
    } catch (err) {
      console.warn('[Upload] Server upload fallback to client normalization:', err.message);
    }
  }

  // Fallback to client-side canvas normalization
  resizeAndNormalizeImage(file, (normalizedBase64) => {
    if (typeof callback === 'function') callback(normalizedBase64);
    showToast('Photo ready!');
  });
}

function resizeAndNormalizeImage(file, callback) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const targetWidth = 1200;
      const targetHeight = 675;
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      const imgAspect = img.width / img.height;
      const targetAspect = targetWidth / targetHeight;
      let renderableWidth, renderableHeight, xStart, yStart;

      if (imgAspect < targetAspect) {
        renderableWidth = targetWidth;
        renderableHeight = img.height * (targetWidth / img.width);
        xStart = 0;
        yStart = (targetHeight - renderableHeight) / 2;
      } else {
        renderableHeight = targetHeight;
        renderableWidth = img.width * (targetHeight / img.height);
        xStart = (targetWidth - renderableWidth) / 2;
        yStart = 0;
      }

      ctx.fillStyle = "#06161f";
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      ctx.drawImage(img, xStart, yStart, renderableWidth, renderableHeight);

      const normalizedBase64 = canvas.toDataURL('image/jpeg', 0.88);
      callback(normalizedBase64);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// Toast Utility
function showToast(message) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--accent-cyan);"></i> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3500);
}
