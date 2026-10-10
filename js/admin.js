// Admin Panel Logic for Kanha Construction & Interior - Full Dynamic Site CMS

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

document.addEventListener('DOMContentLoaded', () => {
  initAdminPIN();
});

// Admin PIN Authentication
function initAdminPIN() {
  const pinForm = document.getElementById('pinForm');
  const pinInput = document.getElementById('pinInput');
  const pinError = document.getElementById('pinError');
  const pinScreen = document.getElementById('adminPinScreen');
  const dashboard = document.getElementById('adminDashboard');

  if (sessionStorage.getItem('kanha_admin_auth') === 'true') {
    adminAuthenticated = true;
    pinScreen.style.display = 'none';
    dashboard.style.display = 'block';
    initAdminDashboard();
    return;
  }

  if (pinForm) {
    pinForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (pinInput.value === DEFAULT_PIN) {
        adminAuthenticated = true;
        sessionStorage.setItem('kanha_admin_auth', 'true');
        pinScreen.style.display = 'none';
        dashboard.style.display = 'block';
        initAdminDashboard();
        showToast("Authenticated successfully as Admin!");
      } else {
        pinError.style.display = 'block';
        pinInput.value = '';
        pinInput.focus();
      }
    });
  }
}

// Master Dashboard Initialization
function initAdminDashboard() {
  projectsList = getStoredProjects();
  servicesList = getStoredServices();
  companyData = getStoredCompany();
  heroData = getStoredHero();
  aboutData = getStoredAbout();

  setupTabNavigation();
  setupAdminHandlers();
  
  loadAdminProjects();
  loadCompanyForm();
  loadHeroForm();
  loadAboutForm();
  loadServicesTable();
  loadStatsForm();
}

// Tab Switching Controls
function setupTabNavigation() {
  const tabBtns = document.querySelectorAll('.admin-tab-btn');
  const tabPanels = document.querySelectorAll('.admin-tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      const targetTab = e.currentTarget;
      targetTab.classList.add('active');
      
      const panelId = targetTab.getAttribute('data-tab');
      const targetPanel = document.getElementById(panelId);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });
}

// TAB 1: Projects & Gallery Management
function loadAdminProjects() {
  renderAdminTable();
  updateProjectsSummary();
}

function updateProjectsSummary() {
  const totalProjectsElem = document.getElementById('statTotalProjects');
  const totalPhotosElem = document.getElementById('statTotalGalleryPhotos');

  if (totalProjectsElem) totalProjectsElem.textContent = projectsList.length;

  const totalPhotos = projectsList.reduce((acc, p) => acc + (p.gallery ? p.gallery.length : 1), 0);
  if (totalPhotosElem) totalPhotosElem.textContent = totalPhotos;
}

function renderAdminTable() {
  const tbody = document.getElementById('adminTableBody');
  if (!tbody) return;

  if (projectsList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">
          No projects found. Use the form on the left to add a new project.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = projectsList.map((p, index) => {
    const imgSrc = p.image || p.fallbackImage || 'assets/images/kanha_hero_facade_1791296928268.jpg';
    const galleryCount = p.gallery ? p.gallery.length : 1;

    return `
      <tr>
        <td>#${index + 1}</td>
        <td>
          <img src="${imgSrc}" class="table-img-thumb" alt="thumb" onerror="this.src='https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'">
        </td>
        <td>
          <strong style="color: #fff;">${p.title}</strong>
          <div style="font-size: 0.75rem; color: var(--text-dim);">${p.location || 'N/A'} • ${p.area || ''}</div>
        </td>
        <td>
          <span style="background: rgba(56, 189, 248, 0.15); color: var(--accent-cyan); padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 700;">
            ${p.category.toUpperCase()}
          </span>
        </td>
        <td>
          <span style="background: rgba(20, 184, 166, 0.15); color: var(--accent-teal); padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 700;">
            <i class="fa-solid fa-images"></i> ${galleryCount} Photos
          </span>
        </td>
        <td>
          <button class="btn-sm-edit" onclick="editProject('${p.id}')"><i class="fa-solid fa-pen"></i> Edit</button>
          <button class="btn-sm-danger" onclick="deleteProject('${p.id}')"><i class="fa-solid fa-trash"></i> Delete</button>
        </td>
      </tr>
    `;
  }).join('');
}

function saveProject() {
  const title = document.getElementById('projectTitle').value.trim();
  const category = document.getElementById('projectCategory').value;
  const location = document.getElementById('projectLocation').value.trim();
  const area = document.getElementById('projectArea').value.trim();
  const projectType = document.getElementById('projectType').value.trim();
  const description = document.getElementById('projectDesc').value.trim();

  if (!title) {
    alert('Project title is required.');
    return;
  }

  const finalImage = currentImageData || document.getElementById('imageUrlInput').value.trim() || 'assets/images/kanha_hero_facade_1791296928268.jpg';

  if (editingProjectId) {
    const index = projectsList.findIndex(p => p.id === editingProjectId);
    if (index !== -1) {
      const existingGallery = projectsList[index].gallery || [];
      if (existingGallery.length > 0 && existingGallery[0]) {
        existingGallery[0].image = finalImage;
        existingGallery[0].title = title + " - Cover";
      }

      projectsList[index] = {
        ...projectsList[index],
        title,
        category,
        location,
        area,
        projectType: projectType || 'Turnkey Project',
        description,
        image: finalImage,
        gallery: existingGallery.length > 0 ? existingGallery : [
          { section: "construction", title: title + " - Structural Elevation", image: finalImage },
          { section: "interior", title: title + " - Interior Space", image: finalImage }
        ]
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
      gallery: [
        { section: "construction", title: title + " - Structural Elevation", image: finalImage },
        { section: "interior", title: title + " - Interior Space", image: finalImage }
      ]
    };
    projectsList.unshift(newProject);
    showToast(`Added new project "${title}" to portfolio!`);
  }

  saveProjectsToStorage(projectsList);
  renderAdminTable();
  updateProjectsSummary();
  resetAdminForm();
}

function editProject(id) {
  const project = projectsList.find(p => p.id === id);
  if (!project) return;

  editingProjectId = project.id;
  document.getElementById('formCardTitle').innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Edit Project`;
  document.getElementById('projectTitle').value = project.title;
  document.getElementById('projectCategory').value = project.category;
  document.getElementById('projectLocation').value = project.location || '';
  document.getElementById('projectArea').value = project.area || '';
  document.getElementById('projectType').value = project.projectType || '';
  document.getElementById('projectDesc').value = project.description || '';

  if (project.image) {
    currentImageData = project.image;
    document.getElementById('previewImg').src = project.image;
    document.getElementById('previewHolder').style.display = 'block';
  }

  document.getElementById('btnSubmitForm').innerHTML = `<i class="fa-solid fa-save"></i> Save Changes`;
  document.getElementById('btnCancelEdit').style.display = 'inline-block';
  window.scrollTo({ top: 100, behavior: 'smooth' });
}

function cancelEdit() {
  resetAdminForm();
}

function resetAdminForm() {
  editingProjectId = null;
  currentImageData = "";
  document.getElementById('addProjectForm').reset();
  document.getElementById('previewHolder').style.display = 'none';
  document.getElementById('formCardTitle').innerHTML = `<i class="fa-solid fa-plus-circle" style="color: var(--accent-cyan);"></i> Add / Edit Project`;
  document.getElementById('btnSubmitForm').innerHTML = `<i class="fa-solid fa-plus"></i> Save Project to Portfolio`;
  document.getElementById('btnCancelEdit').style.display = 'none';
}

function deleteProject(id) {
  const project = projectsList.find(p => p.id === id);
  if (!project) return;

  if (confirm(`Are you sure you want to delete "${project.title}" from the portfolio?`)) {
    projectsList = projectsList.filter(p => p.id !== id);
    saveProjectsToStorage(projectsList);
    renderAdminTable();
    updateProjectsSummary();
    showToast(`Deleted "${project.title}".`);
  }
}

// TAB 2: Company Info Form Handler
function loadCompanyForm() {
  document.getElementById('cmpName').value = companyData.name || '';
  document.getElementById('cmpSubtitle').value = companyData.subtitle || '';
  document.getElementById('cmpFullName').value = companyData.fullName || '';
  document.getElementById('cmpTagline').value = companyData.tagline || '';
  document.getElementById('cmpPhone').value = companyData.phone || '';
  document.getElementById('cmpEmail').value = companyData.email || '';
  document.getElementById('cmpAddress').value = companyData.address || '';
  document.getElementById('cmpHours').value = companyData.workingHours || '';
  document.getElementById('cmpInstagram').value = companyData.instagramUrl || '';
}

function saveCompanyForm() {
  companyData = {
    name: document.getElementById('cmpName').value.trim(),
    subtitle: document.getElementById('cmpSubtitle').value.trim(),
    fullName: document.getElementById('cmpFullName').value.trim(),
    tagline: document.getElementById('cmpTagline').value.trim(),
    phone: document.getElementById('cmpPhone').value.trim(),
    email: document.getElementById('cmpEmail').value.trim(),
    address: document.getElementById('cmpAddress').value.trim(),
    workingHours: document.getElementById('cmpHours').value.trim(),
    estBadge: companyData.estBadge || "Established Since 2021 • Ahmedabad",
    instagramUrl: document.getElementById('cmpInstagram').value.trim()
  };

  saveCompanyToStorage(companyData);
  showToast("Updated Company Branding & Contact details!");
}

// TAB 3: Hero Banner Form Handler
function loadHeroForm() {
  document.getElementById('heroTitle').value = heroData.title || '';
  document.getElementById('heroTitleHighlight').value = heroData.titleHighlight || '';
  document.getElementById('heroEstBadge').value = heroData.estBadge || '';
  document.getElementById('heroTagline').value = heroData.tagline || '';
  document.getElementById('heroDesc').value = heroData.description || '';
  document.getElementById('heroImg').value = heroData.image || '';
}

function saveHeroForm() {
  heroData = {
    title: document.getElementById('heroTitle').value.trim(),
    titleHighlight: document.getElementById('heroTitleHighlight').value.trim(),
    titleSuffix: heroData.titleSuffix || "& INTERIOR",
    estBadge: document.getElementById('heroEstBadge').value.trim(),
    tagline: document.getElementById('heroTagline').value.trim(),
    description: document.getElementById('heroDesc').value.trim(),
    image: document.getElementById('heroImg').value.trim(),
    badgeTitle: heroData.badgeTitle || "Turnkey Excellence",
    badgeSub: heroData.badgeSub || "End-to-End Handover Guarantee"
  };

  saveHeroToStorage(heroData);
  showToast("Updated Hero Banner section!");
}

// TAB 4: About Us Form Handler
function loadAboutForm() {
  document.getElementById('aboutTitle').value = aboutData.title || '';
  document.getElementById('aboutSubtitle').value = aboutData.subtitle || '';
  document.getElementById('aboutStory1').value = aboutData.story1 || '';
  document.getElementById('aboutStory2').value = aboutData.story2 || '';
  document.getElementById('aboutImg').value = aboutData.image || '';
}

function saveAboutForm() {
  aboutData = {
    title: document.getElementById('aboutTitle').value.trim(),
    subtitle: document.getElementById('aboutSubtitle').value.trim(),
    story1: document.getElementById('aboutStory1').value.trim(),
    story2: document.getElementById('aboutStory2').value.trim(),
    image: document.getElementById('aboutImg').value.trim(),
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

  tbody.innerHTML = servicesList.map((srv, idx) => `
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
  const title = document.getElementById('srvTitle').value.trim();
  const icon = document.getElementById('srvIcon').value.trim();
  const shortDesc = document.getElementById('srvShortDesc').value.trim();
  const fullDesc = document.getElementById('srvFullDesc').value.trim();
  const highlightsStr = document.getElementById('srvHighlights').value.trim();
  const image = document.getElementById('srvImage').value.trim();

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
}

function editService(id) {
  const srv = servicesList.find(s => s.id === id);
  if (!srv) return;

  editingServiceId = srv.id;
  document.getElementById('srvFormCardTitle').innerHTML = `<i class="fa-solid fa-pen-to-square" style="color: var(--accent-cyan);"></i> Edit Service`;
  document.getElementById('srvTitle').value = srv.title;
  document.getElementById('srvIcon').value = srv.icon || '';
  document.getElementById('srvShortDesc').value = srv.shortDesc || '';
  document.getElementById('srvFullDesc').value = srv.fullDesc || '';
  document.getElementById('srvHighlights').value = (srv.highlights || []).join(', ');
  document.getElementById('srvImage').value = srv.image || '';

  document.getElementById('btnSaveService').innerHTML = `<i class="fa-solid fa-save"></i> Save Changes`;
  document.getElementById('btnCancelSrv').style.display = 'inline-block';
}

function cancelServiceEdit() {
  resetServiceForm();
}

function resetServiceForm() {
  editingServiceId = null;
  document.getElementById('serviceForm').reset();
  document.getElementById('srvFormCardTitle').innerHTML = `<i class="fa-solid fa-cubes" style="color: var(--accent-cyan);"></i> Manage Specialized Services`;
  document.getElementById('btnSaveService').innerHTML = `<i class="fa-solid fa-plus"></i> Save Service`;
  document.getElementById('btnCancelSrv').style.display = 'none';
}

function deleteService(id) {
  const srv = servicesList.find(s => s.id === id);
  if (!srv) return;

  if (confirm(`Are you sure you want to delete service "${srv.title}"?`)) {
    servicesList = servicesList.filter(s => s.id !== id);
    saveServicesToStorage(servicesList);
    loadServicesTable();
    showToast(`Deleted service "${srv.title}".`);
  }
}

// TAB 6: Dynamic Counter Stats Manager
function loadStatsForm() {
  const statsConfig = getStoredStats();
  const autoProjects = (statsConfig.baseProjectsOffset || 40) + projectsList.length;
  
  const cfgProjInput = document.getElementById('cfgProjects');
  const cfgSqFtInput = document.getElementById('cfgSqFt');
  const cfgOnTimeInput = document.getElementById('cfgOnTime');
  const cfgSpecsInput = document.getElementById('cfgSpecs');

  if (cfgProjInput) {
    cfgProjInput.placeholder = `Auto (Currently: ${autoProjects}+)`;
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
    customProjectsText: document.getElementById('cfgProjects').value.trim(),
    customLargestSqFt: document.getElementById('cfgSqFt').value.trim(),
    customOnTimeRate: document.getElementById('cfgOnTime').value.trim() || '100%',
    customSpecializations: document.getElementById('cfgSpecs').value.trim()
  };

  saveStatsToStorage(statsObj);
  showToast("Updated Stat Counter Ribbon metrics!");
}

// Setup Event Listeners
function setupAdminHandlers() {
  // Image Upload Dropzone & FileReader
  const dropzone = document.getElementById('imageDropzone');
  const fileInput = document.getElementById('fileInput');
  const imageUrlInput = document.getElementById('imageUrlInput');
  const previewHolder = document.getElementById('previewHolder');
  const previewImg = document.getElementById('previewImg');

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
        handleFileSelect(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
      }
    });
  }

  if (imageUrlInput) {
    imageUrlInput.addEventListener('input', (e) => {
      const url = e.target.value.trim();
      if (url) {
        currentImageData = url;
        previewImg.src = url;
        previewHolder.style.display = 'block';
      }
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
    resetBtn.addEventListener('click', () => {
      if (confirm("Are you sure you want to reset ALL website data (Company Info, Hero, About Us, Services, Projects & Stats) back to original PDF defaults?")) {
        resetEntireWebsiteToDefaults();
        initAdminDashboard();
        showToast("Reset entire website data back to original PDF defaults!");
      }
    });
  }

  // Logout Button
  const logoutBtn = document.getElementById('adminLogoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('kanha_admin_auth');
      window.location.reload();
    });
  }
}

// Convert Uploaded File to Base64 with automatic 16:9 aspect-ratio normalization
function handleFileSelect(file) {
  if (!file.type.startsWith('image/')) {
    alert('Please select a valid image file (JPG, PNG, WEBP).');
    return;
  }

  showToast('Processing & auto-fitting image aspect ratio...');
  resizeAndNormalizeImage(file, (normalizedBase64) => {
    currentImageData = normalizedBase64;
    document.getElementById('previewImg').src = currentImageData;
    document.getElementById('previewHolder').style.display = 'block';
    showToast('Image automatically resized & formatted to 16:9!');
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

      ctx.fillStyle = "#0b2530";
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
  toast.innerHTML = `<i class="fa-solid fa-circle-info" style="color: var(--accent-cyan);"></i> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}
