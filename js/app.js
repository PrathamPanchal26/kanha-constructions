// Main Portfolio App JavaScript - 100% Dynamic Site Renderer

document.addEventListener('DOMContentLoaded', () => {
  initPortfolio();
  initContactForm();
  if (typeof syncDataWithServer === 'function') {
    syncDataWithServer();
  }
});

// Listen for background server database sync updates
document.addEventListener('kanha-data-synced', (e) => {
  const { projects, content } = e.detail || {};
  if (Array.isArray(projects)) allProjects = projects;
  if (content) {
    if (content.company) companyData = content.company;
    if (content.hero) heroData = content.hero;
    if (content.about) aboutData = content.about;
    if (content.services) allServices = content.services;
    if (content.stats) statsConfig = content.stats;
  }

  hydrateGlobalElements();
  hydrateHeroSection();
  hydrateAboutSection();
  renderDynamicServices();
  populateProjectNameDropdown();
  renderProjects();
  renderDynamicStats();
  initProjectDetailPage();
});

let currentCategory = 'all';
let currentProjectNameFilter = 'all';
let currentSearchQuery = '';

let allProjects = [];
let allServices = [];
let companyData = {};
let heroData = {};
let aboutData = {};
let statsConfig = {};

let activeProjectForModal = null;
let currentGallerySectionFilter = 'all';
let activeGalleryItems = [];
let currentLightboxIndex = 0;

function initPortfolio() {
  // Load dynamic stores from LocalStorage / data.js
  companyData = getStoredCompany();
  heroData = getStoredHero();
  aboutData = getStoredAbout();
  allServices = getStoredServices();
  allProjects = getStoredProjects();
  statsConfig = getStoredStats();

  // Hydrate all dynamic elements across the website
  hydrateGlobalElements();
  hydrateHeroSection();
  hydrateAboutSection();
  renderDynamicServices();
  
  setupMobileMenu();
  populateProjectNameDropdown();
  setupProjectSearchAndSelect();
  renderProjects();
  renderDynamicStats();
  setupFilterTabs();
  setupModalEvents();
  initProjectDetailPage();
  initCostEstimator();
  initFaqAccordion();
  initWhatsAppWidget();
}

// 1. Hydrate Header, Footer, Contact Info, and Branding across ALL pages
function hydrateGlobalElements() {
  // Logo Brand Name
  const logoNames = document.querySelectorAll('.logo-name');
  logoNames.forEach(el => el.textContent = companyData.name || "KANHA");

  const logoSubs = document.querySelectorAll('.logo-sub');
  logoSubs.forEach(el => el.textContent = companyData.subtitle || "CONSTRUCTION & INTERIOR");

  // Footer Copyright & Contact Details
  const footerCopies = document.querySelectorAll('.footer-copy');
  footerCopies.forEach(el => {
    el.innerHTML = `&copy; ${new Date().getFullYear()} ${companyData.fullName || 'KANHA Construction & Interior'}. All rights reserved. • ${companyData.address || 'Nikol, Ahmedabad'}`;
  });

  // Phone Numbers
  const phoneLinks = document.querySelectorAll('a[href^="tel:"]');
  phoneLinks.forEach(el => {
    el.href = `tel:${companyData.phone.replace(/\s+/g, '')}`;
    if (el.textContent.includes('+91') || el.textContent.includes('9898')) {
      el.textContent = companyData.phone;
    }
  });

  // Emails
  const mailLinks = document.querySelectorAll('a[href^="mailto:"]');
  mailLinks.forEach(el => {
    el.href = `mailto:${companyData.email}`;
    if (el.textContent.includes('@')) {
      el.textContent = companyData.email;
    }
  });

  // Instagram Button URLs
  const instaBtns = document.querySelectorAll('a[href*="instagram.com"]');
  instaBtns.forEach(el => {
    if (companyData.instagramUrl) el.href = companyData.instagramUrl;
  });

  // Highlight Mobile App Bottom Dock active page
  highlightMobileDockActiveItem();
}

function highlightMobileDockActiveItem() {
  const dockItems = document.querySelectorAll('.dock-item');
  if (!dockItems.length) return;

  const currentPath = (window.location.pathname || '').toLowerCase();
  
  dockItems.forEach(item => {
    const page = item.getAttribute('data-page');
    let isActive = false;

    if (page === 'home' && (currentPath === '/' || currentPath.endsWith('index.html') || currentPath.endsWith('index.mustache') || currentPath.endsWith('/'))) {
      isActive = true;
    } else if (page && page !== 'home' && currentPath.includes(page)) {
      isActive = true;
    }

    if (isActive) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

// Setup Mobile Navigation Menu Drawer & Hamburger
function setupMobileMenu() {
  const menuBtn = document.getElementById('mobileMenuBtn');
  const navLinks = document.getElementById('navLinks');
  if (!menuBtn || !navLinks) return;

  function closeMenu() {
    navLinks.classList.remove('mobile-open');
    menuBtn.classList.remove('active');
    menuBtn.setAttribute('aria-expanded', 'false');
    const icon = menuBtn.querySelector('i');
    if (icon) {
      icon.className = 'fa-solid fa-bars';
    }
  }

  function openMenu() {
    navLinks.classList.add('mobile-open');
    menuBtn.classList.add('active');
    menuBtn.setAttribute('aria-expanded', 'true');
    const icon = menuBtn.querySelector('i');
    if (icon) {
      icon.className = 'fa-solid fa-xmark';
    }
  }

  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    const isOpen = navLinks.classList.contains('mobile-open');
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  document.addEventListener('click', (e) => {
    if (navLinks.classList.contains('mobile-open')) {
      if (!navLinks.contains(e.target) && !menuBtn.contains(e.target)) {
        closeMenu();
      }
    }
  });

  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      closeMenu();
    });
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      closeMenu();
    }
  });
}

// 2. Hydrate Hero Section (Homepage)
function hydrateHeroSection() {
  const heroTitleElem = document.querySelector('.hero-title');
  const heroBadgeElem = document.querySelector('.badge-est');
  const heroTaglineElem = document.querySelector('.hero-tagline');
  const heroDescElem = document.querySelector('.hero-desc');
  const heroImgElem = document.querySelector('.hero-img-frame img');
  const heroCardTitleElem = document.querySelector('.card-info h4');
  const heroCardSubElem = document.querySelector('.card-info p');

  if (heroTitleElem && heroData.title) {
    heroTitleElem.innerHTML = `${heroData.title} <span>${heroData.titleHighlight || 'CONSTRUCTION'}</span> ${heroData.titleSuffix || '& INTERIOR'}`;
  }

  if (heroBadgeElem && heroData.estBadge) {
    heroBadgeElem.innerHTML = `<i class="fa-solid fa-award"></i> ${heroData.estBadge}`;
  }

  if (heroTaglineElem && heroData.tagline) {
    heroTaglineElem.innerHTML = `<i class="fa-solid fa-sparkles"></i> ${heroData.tagline}`;
  }

  if (heroDescElem && heroData.description) {
    heroDescElem.textContent = heroData.description;
  }

  if (heroImgElem && heroData.image) {
    heroImgElem.src = heroData.image;
  }

  if (heroCardTitleElem && heroData.badgeTitle) {
    heroCardTitleElem.textContent = heroData.badgeTitle;
  }

  if (heroCardSubElem && heroData.badgeSub) {
    heroCardSubElem.textContent = heroData.badgeSub;
  }
}

// 3. Hydrate About Section (Home & About Page)
function hydrateAboutSection() {
  const aboutTitleElems = document.querySelectorAll('.dyn-about-title');
  const aboutSubtitleElems = document.querySelectorAll('.dyn-about-subtitle');
  const aboutStory1Elems = document.querySelectorAll('.dyn-about-story1');
  const aboutStory2Elems = document.querySelectorAll('.dyn-about-story2');
  const aboutImgElems = document.querySelectorAll('.dyn-about-img');

  aboutTitleElems.forEach(el => el.textContent = aboutData.title || "About Our Company");
  aboutSubtitleElems.forEach(el => el.textContent = aboutData.subtitle || "Combining Functionality, Aesthetics, and Durability");
  aboutStory1Elems.forEach(el => el.textContent = aboutData.story1 || "");
  aboutStory2Elems.forEach(el => el.textContent = aboutData.story2 || "");
  aboutImgElems.forEach(el => {
    if (aboutData.image) el.src = aboutData.image;
  });
}

// 4. Render Dynamic Services (Homepage Preview & Services Page Detailed Grid)
function renderDynamicServices() {
  // A. Home Page Services Grid Preview
  const homeServicesGrid = document.querySelector('.services-grid');
  if (homeServicesGrid) {
    homeServicesGrid.innerHTML = allServices.map(srv => `
      <div class="service-card">
        <div class="service-icon"><i class="${srv.icon || 'fa-solid fa-building'}"></i></div>
        <h3 class="service-title">${srv.title}</h3>
        <p class="service-desc">${srv.shortDesc || srv.fullDesc || ''}</p>
      </div>
    `).join('');
  }

  // B. Services Page Detailed View Grid
  const detailedServicesContainer = document.getElementById('detailedServicesGrid');
  if (detailedServicesContainer) {
    const isMustacheRoute = !window.location.pathname.includes('.html') && window.location.pathname !== '/';
    const contactHref = isMustacheRoute ? '/contact' : 'contact.html';

    detailedServicesContainer.innerHTML = allServices.map((srv, idx) => {
      const isReversed = idx % 2 !== 0;
      const highlightsHtml = (srv.highlights || []).map(h => `
        <li><i class="fa-solid fa-check"></i> <span>${h}</span></li>
      `).join('');

      return `
        <div class="service-detail-card ${isReversed ? 'is-reversed' : ''}">
          <div class="service-detail-content">
            <div class="service-detail-icon-wrap">
              <i class="${srv.icon || 'fa-solid fa-city'}"></i>
            </div>
            <h2 class="service-detail-title">${srv.title}</h2>
            <p class="service-detail-desc">${srv.fullDesc || srv.shortDesc || ''}</p>

            <ul class="service-detail-highlights">
              ${highlightsHtml}
            </ul>

            <div class="service-detail-actions">
              <a href="${contactHref}" class="btn-primary">Inquire for ${srv.title} <i class="fa-solid fa-arrow-right"></i></a>
            </div>
          </div>

          <div class="service-detail-img-wrap">
            <img src="${srv.image || 'assets/images/kanha_hero_facade_1791296928268.jpg'}" alt="${srv.title}" class="service-detail-img" onerror="this.src='https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'">
          </div>
        </div>
      `;
    }).join('');
  }
}

// Populate Project Name Dropdown
function populateProjectNameDropdown() {
  const selectElem = document.getElementById('projectNameSelect');
  if (!selectElem) return;

  const projectTitles = Array.from(new Set(allProjects.map(p => p.title))).sort();
  selectElem.innerHTML = `<option value="all">-- All Project Names (${allProjects.length}) --</option>` +
    projectTitles.map(title => `<option value="${escapeAttr(title)}">${title}</option>`).join('');
}

function escapeAttr(str) {
  return str.replace(/"/g, '&quot;');
}

// Search and Select Handlers
function setupProjectSearchAndSelect() {
  const selectElem = document.getElementById('projectNameSelect');
  const searchInput = document.getElementById('projectSearchInput');

  if (selectElem) {
    selectElem.addEventListener('change', (e) => {
      currentProjectNameFilter = e.target.value;
      renderProjects();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearchQuery = e.target.value.toLowerCase().trim();
      renderProjects();
    });
  }
}

// Dynamically Calculate and Animate Counter Stats
function renderDynamicStats() {
  const elemProjects = document.getElementById('statProjectsDelivered');
  const elemSqFt = document.getElementById('statLargestSqFt');
  const elemOnTime = document.getElementById('statOnTimeExecution');
  const elemSpecs = document.getElementById('statSpecializations');

  // 1. Calculate Projects Delivered
  let projectsValueStr = "";
  let projectsNumeric = 50;
  if (statsConfig.customProjectsText && statsConfig.customProjectsText.trim() !== "") {
    projectsValueStr = statsConfig.customProjectsText.trim();
    projectsNumeric = parseInt(projectsValueStr.replace(/\D/g, '')) || 50;
  } else {
    projectsNumeric = (statsConfig.baseProjectsOffset || 40) + allProjects.length;
    projectsValueStr = projectsNumeric + "+";
  }

  // 2. Calculate Largest Sq. Ft. Facility
  let sqFtValueStr = "";
  let sqFtNumeric = 15;
  if (statsConfig.customLargestSqFt && statsConfig.customLargestSqFt.trim() !== "") {
    sqFtValueStr = statsConfig.customLargestSqFt.trim();
    sqFtNumeric = parseInt(sqFtValueStr.replace(/\D/g, '')) || 15;
  } else {
    let maxArea = 0;
    allProjects.forEach(p => {
      if (p.area) {
        const num = parseInt(p.area.replace(/,/g, '').replace(/\D/g, ''));
        if (num && num > maxArea) maxArea = num;
      }
    });
    if (maxArea >= 1000) {
      sqFtNumeric = Math.round(maxArea / 1000);
      sqFtValueStr = sqFtNumeric + "K+";
    } else if (maxArea > 0) {
      sqFtNumeric = maxArea;
      sqFtValueStr = maxArea + "+";
    } else {
      sqFtNumeric = 15;
      sqFtValueStr = "15K+";
    }
  }

  // 3. On-Time Execution
  const onTimeStr = statsConfig.customOnTimeRate || "100%";
  const onTimeNumeric = parseInt(onTimeStr.replace(/\D/g, '')) || 100;

  // 4. Core Specializations Count
  let specsNumeric = 5;
  if (statsConfig.customSpecializations && statsConfig.customSpecializations.trim() !== "") {
    specsNumeric = parseInt(statsConfig.customSpecializations.replace(/\D/g, '')) || 5;
  } else {
    specsNumeric = Math.max(allServices.length, 5);
  }

  // Animate Count-up
  if (elemProjects) animateCounter(elemProjects, 0, projectsNumeric, 1200, projectsValueStr.endsWith('+') ? '+' : '');
  if (elemSqFt) animateCounter(elemSqFt, 0, sqFtNumeric, 1400, sqFtValueStr.includes('K') ? 'K+' : '+');
  if (elemOnTime) animateCounter(elemOnTime, 0, onTimeNumeric, 1000, '%');
  if (elemSpecs) animateCounter(elemSpecs, 0, specsNumeric, 800, '');
}

// Counter Roll-up Animation Helper
function animateCounter(elem, start, end, duration, suffix = '') {
  let startTime = null;

  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    const easeOutQuad = 1 - (1 - progress) * (1 - progress);
    const current = Math.floor(easeOutQuad * (end - start) + start);
    elem.textContent = current + suffix;
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      elem.textContent = end + suffix;
    }
  }

  window.requestAnimationFrame(step);
}

// Render Project Cards (Filtered by Category, Project Name, and Search Query)
function renderProjects() {
  const container = document.getElementById('projectsGrid');
  if (!container) return;

  const filtered = allProjects.filter(p => {
    const matchCategory = currentCategory === 'all' || p.category.toLowerCase() === currentCategory.toLowerCase();
    const matchName = currentProjectNameFilter === 'all' || p.title === currentProjectNameFilter;
    
    const query = currentSearchQuery;
    const matchQuery = !query || 
      p.title.toLowerCase().includes(query) || 
      (p.location && p.location.toLowerCase().includes(query)) ||
      (p.description && p.description.toLowerCase().includes(query)) ||
      (p.category && p.category.toLowerCase().includes(query));

    return matchCategory && matchName && matchQuery;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-light);">
        <i class="fa-solid fa-folder-open" style="font-size: 3rem; color: var(--text-dim); margin-bottom: 16px;"></i>
        <h3 style="font-size: 1.2rem; color: #fff; margin-bottom: 8px;">No Projects Match Your Search</h3>
        <p style="color: var(--text-muted);">Try selecting a different project name or clear your search criteria.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(project => {
    const catUpper = project.category.toUpperCase();
    const imgSrc = project.image || project.fallbackImage || 'assets/images/kanha_hero_facade_1791296928268.jpg';
    const photoCount = project.gallery ? project.gallery.length : 1;

    return `
      <div class="project-card" data-id="${project.id}">
        <div class="project-img-wrapper" onclick="handleProjectClick('${project.id}')" style="cursor: pointer;">
          <img src="${imgSrc}" alt="${project.title}" onerror="this.src='https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'">
          <span class="project-badge-cat">${catUpper}</span>
        </div>
        
        <div class="project-content">
          <div class="project-meta">
            <span class="project-meta-item"><i class="fa-solid fa-location-dot" style="color:var(--accent-cyan)"></i> ${project.location || 'Ahmedabad'}</span>
            <span>•</span>
            <span class="project-meta-item"><i class="fa-solid fa-ruler-combined" style="color:var(--accent-cyan)"></i> ${project.area || 'N/A'}</span>
          </div>

          <h3 class="project-title" onclick="handleProjectClick('${project.id}')" style="cursor: pointer;">${project.title}</h3>
          <p class="project-desc">${project.description || ''}</p>

          <div class="project-footer">
            <span class="project-type-tag"><i class="fa-solid fa-images"></i> ${photoCount} Gallery Photos</span>
            
            <button class="btn-project-link" onclick="handleProjectClick('${project.id}')">
              View Gallery <i class="fa-solid fa-images"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Setup Filter Buttons
function setupFilterTabs() {
  const buttons = document.querySelectorAll('.filter-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      buttons.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentCategory = e.target.getAttribute('data-filter');
      renderProjects();
    });
  });
}

// Handle Project Click (Navigates to Dedicated Project Detail & Gallery Page)
function handleProjectClick(id) {
  const isMustacheRoute = !window.location.pathname.includes('.html') && window.location.pathname !== '/';
  const targetPage = isMustacheRoute ? '/project-detail' : 'project-detail.html';
  window.location.href = `${targetPage}?id=${encodeURIComponent(id)}`;
}

// Initialize Dedicated Project Detail Page
function initProjectDetailPage() {
  const detailContainer = document.getElementById('projectDetailContainer');
  if (!detailContainer) return;

  const urlParams = new URLSearchParams(window.location.search);
  const projId = urlParams.get('id');

  let project = allProjects.find(p => p.id === projId);
  if (!project && allProjects.length > 0) {
    project = allProjects[0];
  }
  if (!project) return;

  activeProjectForModal = project;
  currentGallerySectionFilter = 'all';

  const elemTitle = document.getElementById('detailTitle');
  const elemBreadcrumb = document.getElementById('detailBreadcrumbTitle');
  const elemBadge = document.getElementById('detailCategoryBadge');
  const elemDesc = document.getElementById('detailDesc');
  const elemLoc = document.getElementById('detailLocation');
  const elemArea = document.getElementById('detailArea');
  const elemType = document.getElementById('detailType');
  const elemCover = document.getElementById('detailCoverImg');
  const elemInquire = document.getElementById('btnInquireProject');

  if (elemTitle) elemTitle.textContent = project.title;
  if (elemBreadcrumb) elemBreadcrumb.textContent = project.title;
  if (elemBadge) elemBadge.textContent = project.category.toUpperCase();
  if (elemDesc) elemDesc.textContent = project.description || 'Full architectural design, structural execution, and interior solutions.';
  if (elemLoc) elemLoc.textContent = project.location || 'N/A';
  if (elemArea) elemArea.textContent = project.area || 'N/A';
  if (elemType) elemType.textContent = project.projectType || 'Turnkey Project';
  if (elemCover) {
    elemCover.src = project.image || project.fallbackImage || 'assets/images/kanha_hero_facade_1791296928268.jpg';
  }

  if (elemInquire) {
    const isMustacheRoute = !window.location.pathname.includes('.html');
    elemInquire.href = (isMustacheRoute ? '/contact' : 'contact.html') + `?project=${encodeURIComponent(project.title)}`;
  }

  // Setup Page Detail Section Tabs
  const tabBtns = document.querySelectorAll('.detail-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      tabBtns.forEach(b => b.classList.remove('active'));
      const targetBtn = e.currentTarget;
      targetBtn.classList.add('active');
      currentGallerySectionFilter = targetBtn.getAttribute('data-detail-tab');
      renderDetailPageGalleryGrid();
    });
  });

  renderDetailPageGalleryGrid();
}

// Render Gallery Images on the Project Detail Page
function renderDetailPageGalleryGrid() {
  const gridContainer = document.getElementById('detailGalleryGrid');
  if (!gridContainer || !activeProjectForModal) return;

  const galleryList = activeProjectForModal.gallery || [
    { section: "construction", title: activeProjectForModal.title, image: activeProjectForModal.image }
  ];

  activeGalleryItems = galleryList.filter(item => {
    if (currentGallerySectionFilter === 'all') return true;
    return item.section.toLowerCase() === currentGallerySectionFilter.toLowerCase();
  });

  if (activeGalleryItems.length === 0) {
    gridContainer.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
        <i class="fa-solid fa-images" style="font-size: 2.5rem; color: var(--text-dim); margin-bottom: 12px; display: block;"></i>
        <p style="font-size: 1.1rem; color: #fff;">No photos found under the <strong>${currentGallerySectionFilter.toUpperCase()}</strong> section for this project.</p>
        <p style="font-size: 0.85rem; margin-top: 6px;">Click "All Project Photos" tab to view available execution photos.</p>
      </div>
    `;
    return;
  }

  gridContainer.innerHTML = activeGalleryItems.map((item, index) => {
    const secTag = (item.section || 'PHOTO').toUpperCase();
    const imgSrc = item.image || activeProjectForModal.image || 'assets/images/kanha_hero_facade_1791296928268.jpg';

    return `
      <div class="gallery-card" onclick="openLightboxViewer(${index})">
        <div class="gallery-img-wrapper">
          <img src="${imgSrc}" alt="${item.title || activeProjectForModal.title}" onerror="this.src='https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'">
          <span class="gallery-sec-badge">${secTag}</span>
          <div class="gallery-overlay-icon">
            <i class="fa-solid fa-magnifying-glass-plus"></i>
          </div>
        </div>
        <div class="gallery-card-info">
          <div class="gallery-card-title">${item.title || activeProjectForModal.title}</div>
        </div>
      </div>
    `;
  }).join('');
}

// Open Lightbox Categorized Gallery Modal (Legacy Popup Fallback)
function openProjectModal(project) {
  const modal = document.getElementById('projectModal');
  if (!modal) return;

  activeProjectForModal = project;
  currentGallerySectionFilter = 'all';

  document.getElementById('modalTitle').textContent = project.title;
  document.getElementById('modalCategoryBadge').textContent = project.category.toUpperCase();
  document.getElementById('modalLocation').textContent = project.location || 'N/A';
  document.getElementById('modalArea').textContent = project.area || 'N/A';
  document.getElementById('modalType').textContent = project.projectType || 'Turnkey Project';
  document.getElementById('modalDesc').textContent = project.description || 'Full architectural design, structural execution, and interior solutions.';

  const tabBtns = document.querySelectorAll('.modal-tab-btn');
  tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-gallery-tab') === 'all');
  });

  renderModalGalleryGrid();
  modal.classList.add('active');
}

// Render Gallery Images within Modal according to Section Filter
function renderModalGalleryGrid() {
  const gridContainer = document.getElementById('modalGalleryGrid');
  if (!gridContainer || !activeProjectForModal) return;

  const galleryList = activeProjectForModal.gallery || [
    { section: "construction", title: activeProjectForModal.title, image: activeProjectForModal.image }
  ];

  activeGalleryItems = galleryList.filter(item => {
    if (currentGallerySectionFilter === 'all') return true;
    return item.section.toLowerCase() === currentGallerySectionFilter.toLowerCase();
  });

  if (activeGalleryItems.length === 0) {
    gridContainer.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: var(--text-muted);">
        <i class="fa-solid fa-images" style="font-size: 2.5rem; color: var(--text-dim); margin-bottom: 12px; display: block;"></i>
        <p style="font-size: 1rem; color: #fff;">No photos found under the <strong>${currentGallerySectionFilter.toUpperCase()}</strong> section for this project.</p>
        <p style="font-size: 0.85rem; margin-top: 6px;">Switch to "All Gallery Photos" tab to view available project photos.</p>
      </div>
    `;
    return;
  }

  gridContainer.innerHTML = activeGalleryItems.map((item, index) => {
    const secTag = (item.section || 'PHOTO').toUpperCase();
    const imgSrc = item.image || activeProjectForModal.image || 'assets/images/kanha_hero_facade_1791296928268.jpg';

    return `
      <div class="gallery-card" onclick="openLightboxViewer(${index})">
        <div class="gallery-img-wrapper">
          <img src="${imgSrc}" alt="${item.title || activeProjectForModal.title}" onerror="this.src='https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'">
          <span class="gallery-sec-badge">${secTag}</span>
          <div class="gallery-overlay-icon">
            <i class="fa-solid fa-magnifying-glass-plus"></i>
          </div>
        </div>
        <div class="gallery-card-info">
          <div class="gallery-card-title">${item.title || activeProjectForModal.title}</div>
        </div>
      </div>
    `;
  }).join('');
}

// Lightbox Fullscreen Image Slider Handlers
function openLightboxViewer(index) {
  if (!activeGalleryItems || activeGalleryItems.length === 0) return;
  currentLightboxIndex = index;

  updateLightboxContent();
  const lightbox = document.getElementById('lightboxOverlay');
  if (lightbox) lightbox.classList.add('active');
}

function updateLightboxContent() {
  const item = activeGalleryItems[currentLightboxIndex];
  if (!item) return;

  const imgSrc = item.image || activeProjectForModal.image || 'assets/images/kanha_hero_facade_1791296928268.jpg';
  document.getElementById('lightboxImg').src = imgSrc;
  document.getElementById('lightboxTag').textContent = (item.section || 'PHOTO').toUpperCase();
  document.getElementById('lightboxTitle').textContent = item.title || activeProjectForModal.title;
}

function nextLightboxImage() {
  if (activeGalleryItems.length === 0) return;
  currentLightboxIndex = (currentLightboxIndex + 1) % activeGalleryItems.length;
  updateLightboxContent();
}

function prevLightboxImage() {
  if (activeGalleryItems.length === 0) return;
  currentLightboxIndex = (currentLightboxIndex - 1 + activeGalleryItems.length) % activeGalleryItems.length;
  updateLightboxContent();
}

// Setup Modal Events & Lightbox Controls
function setupModalEvents() {
  const modal = document.getElementById('projectModal');
  const closeBtn = document.getElementById('modalCloseBtn');
  const lightbox = document.getElementById('lightboxOverlay');
  const lightboxCloseBtn = document.getElementById('lightboxCloseBtn');
  const prevBtn = document.getElementById('lightboxPrevBtn');
  const nextBtn = document.getElementById('lightboxNextBtn');

  const tabBtns = document.querySelectorAll('.modal-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      tabBtns.forEach(b => b.classList.remove('active'));
      const targetBtn = e.currentTarget;
      targetBtn.classList.add('active');
      currentGallerySectionFilter = targetBtn.getAttribute('data-gallery-tab');
      renderModalGalleryGrid();
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('active');
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  }

  if (lightboxCloseBtn) {
    lightboxCloseBtn.addEventListener('click', () => {
      lightbox.classList.remove('active');
    });
  }

  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) {
        lightbox.classList.remove('active');
      }
    });
  }

  if (prevBtn) prevBtn.addEventListener('click', prevLightboxImage);
  if (nextBtn) nextBtn.addEventListener('click', nextLightboxImage);

  document.addEventListener('keydown', (e) => {
    if (lightbox && lightbox.classList.contains('active')) {
      if (e.key === 'Escape') lightbox.classList.remove('active');
      if (e.key === 'ArrowLeft') prevLightboxImage();
      if (e.key === 'ArrowRight') nextLightboxImage();
    } else if (modal && modal.classList.contains('active')) {
      if (e.key === 'Escape') modal.classList.remove('active');
    }
  });
}

// Contact Form Submission (Submits directly to WhatsApp + silent backend sync)
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    
    const nameInput = document.getElementById('contactName');
    const phoneInput = document.getElementById('contactPhone');
    const categorySelect = document.getElementById('contactCategory');
    const messageInput = document.getElementById('contactMessage');

    const name = nameInput ? nameInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const category = categorySelect ? categorySelect.value : 'Turnkey Project';
    const message = messageInput ? messageInput.value.trim() : '';

    if (!name || !phone || !message) {
      showToast('Please fill in your name, phone number, and project details.');
      return;
    }

    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Connecting to WhatsApp...`;
    btn.disabled = true;

    // Compile neat, professional WhatsApp message
    const waText = `Hello Kanha Construction & Interior,\n\n*New Website Project Inquiry:*\n• *Name:* ${name}\n• *Phone:* ${phone}\n• *Requirement:* ${category}\n• *Details:* ${message}\n• *Location:* Ahmedabad, Gujarat\n\nPlease provide consultation and estimation.`;
    const waUrl = `https://wa.me/919898749575?text=${encodeURIComponent(waText)}`;

    // Asynchronously log inquiry to backend in background if server is running
    try {
      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, category, message })
      }).catch(() => {});
    } catch (_) {}

    // Open WhatsApp
    window.open(waUrl, '_blank');

    btn.innerHTML = `<i class="fa-brands fa-whatsapp"></i> Inquiry Prepared!`;
    btn.style.background = '#10b981';
    showToast('Opening WhatsApp with your project inquiry details...');

    setTimeout(() => {
      form.reset();
      btn.innerHTML = originalText;
      btn.disabled = false;
      btn.style.background = '';
    }, 4000);
  });
}

// Construction & Interior Cost Estimator Logic
function initCostEstimator() {
  const typeSelect = document.getElementById('calcProjectType');
  const areaSlider = document.getElementById('calcAreaSlider');
  const areaValBadge = document.getElementById('calcAreaVal');
  const packageChips = document.querySelectorAll('.package-chip');
  const totalEstimateEl = document.getElementById('calcTotalEstimate');
  const rateSubEl = document.getElementById('calcRateSub');
  const civilSplitEl = document.getElementById('calcCivilSplit');
  const finishSplitEl = document.getElementById('calcFinishSplit');
  const archSplitEl = document.getElementById('calcArchSplit');
  const timelineEl = document.getElementById('calcTimeline');
  const shareBtn = document.getElementById('btnShareEstimateWA');

  if (!typeSelect || !areaSlider || !totalEstimateEl) return;

  let activeMultiplier = 1.2; // Default Premium package
  let activePackageName = "Premium";

  packageChips.forEach(chip => {
    chip.addEventListener('click', () => {
      packageChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeMultiplier = parseFloat(chip.getAttribute('data-multiplier')) || 1.0;
      activePackageName = chip.querySelector('h5') ? chip.querySelector('h5').textContent.trim() : 'Standard';
      calculateEstimate();
    });
  });

  areaSlider.addEventListener('input', () => {
    if (areaValBadge) {
      areaValBadge.textContent = `${Number(areaSlider.value).toLocaleString('en-IN')} Sq. Ft.`;
    }
    calculateEstimate();
  });

  typeSelect.addEventListener('change', calculateEstimate);

  function calculateEstimate() {
    const selectedOption = typeSelect.options[typeSelect.selectedIndex];
    const baseRate = parseFloat(selectedOption?.getAttribute('data-base')) || 1850;
    const projectTypeName = selectedOption?.text || 'Residential Villa';
    const sqft = parseInt(areaSlider.value, 10) || 1500;

    const effectiveRate = Math.round(baseRate * activeMultiplier);
    const totalCost = effectiveRate * sqft;

    // Format total in Lakhs or Crores
    let totalFormatted = '';
    if (totalCost >= 10000000) {
      totalFormatted = `₹ ${(totalCost / 10000000).toFixed(2)} Crores`;
    } else {
      totalFormatted = `₹ ${(totalCost / 100000).toFixed(2)} Lakhs`;
    }

    const civilCost = Math.round(totalCost * 0.55);
    const finishCost = Math.round(totalCost * 0.30);
    const archCost = totalCost - civilCost - finishCost;

    const civilFormatted = civilCost >= 10000000 ? `₹ ${(civilCost / 10000000).toFixed(2)} Cr` : `₹ ${(civilCost / 100000).toFixed(2)} L`;
    const finishFormatted = finishCost >= 10000000 ? `₹ ${(finishCost / 10000000).toFixed(2)} Cr` : `₹ ${(finishCost / 100000).toFixed(2)} L`;
    const archFormatted = archCost >= 10000000 ? `₹ ${(archCost / 10000000).toFixed(2)} Cr` : `₹ ${(archCost / 100000).toFixed(2)} L`;

    totalEstimateEl.textContent = totalFormatted;
    if (rateSubEl) {
      rateSubEl.textContent = `Estimated Rate: ₹ ${effectiveRate.toLocaleString('en-IN')} / Sq. Ft.`;
    }
    if (civilSplitEl) civilSplitEl.textContent = `~${civilFormatted}`;
    if (finishSplitEl) finishSplitEl.textContent = `~${finishFormatted}`;
    if (archSplitEl) archSplitEl.textContent = `~${archFormatted}`;

    if (timelineEl) {
      if (sqft <= 1500) timelineEl.textContent = "5 - 7 Months";
      else if (sqft <= 3500) timelineEl.textContent = "7 - 10 Months";
      else if (sqft <= 8000) timelineEl.textContent = "10 - 14 Months";
      else timelineEl.textContent = "14 - 18 Months";
    }

    if (shareBtn) {
      shareBtn.onclick = () => {
        const msg = `Hello Kanha Construction & Interior,\n\n*Estimated Project from your Website Calculator:*\n• *Type:* ${projectTypeName}\n• *Area:* ${sqft.toLocaleString('en-IN')} Sq. Ft.\n• *Package:* ${activePackageName}\n• *Estimated Budget:* ${totalFormatted} (₹ ${effectiveRate}/sq.ft)\n• *City:* Ahmedabad, Gujarat\n\nPlease share detailed material specifications and book a site visit.`;
        window.open(`https://wa.me/919898749575?text=${encodeURIComponent(msg)}`, '_blank');
      };
    }
  }

  // Initial run
  calculateEstimate();
}

// FAQ Accordion Handler
function initFaqAccordion() {
  const faqButtons = document.querySelectorAll('.faq-question-btn');
  faqButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const parentCard = btn.closest('.faq-card');
      if (!parentCard) return;

      const wasActive = parentCard.classList.contains('active');
      // Collapse others in same list
      const container = parentCard.closest('.faq-list');
      if (container) {
        container.querySelectorAll('.faq-card').forEach(c => {
          c.classList.remove('active');
          const pane = c.querySelector('.faq-answer-pane');
          if (pane) pane.style.display = 'none';
        });
      }

      if (!wasActive) {
        parentCard.classList.add('active');
        const pane = parentCard.querySelector('.faq-answer-pane');
        if (pane) pane.style.display = 'block';
      }
    });
  });
}

// Floating WhatsApp Interactive Widget Drawer
function initWhatsAppWidget() {
  const launcher = document.getElementById('waLauncherBtn');
  const chatBox = document.getElementById('waChatBox');
  const closeBtn = document.getElementById('waCloseBtn');

  if (!launcher || !chatBox) return;

  launcher.addEventListener('click', (e) => {
    e.stopPropagation();
    chatBox.classList.toggle('active');
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      chatBox.classList.remove('active');
    });
  }

  document.addEventListener('click', (e) => {
    if (!chatBox.contains(e.target) && !launcher.contains(e.target)) {
      chatBox.classList.remove('active');
    }
  });
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
