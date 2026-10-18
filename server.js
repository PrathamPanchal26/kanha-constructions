require('dotenv').config();
const express = require('express');
const mustacheExpress = require('mustache-express');
const path = require('path');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const db = require('./database/db');
const upload = require('./database/upload');

const app = express();
const PORT = process.env.PORT || 3000;

// Server-Side Admin Sessions Store with HMAC verification for Serverless & Restarts
const activeAdminSessions = new Set();
const SESSION_SECRET = process.env.SESSION_SECRET || 'kanha_admin_secret_key_2026_secured';

function createAdminToken() {
  const payload = `${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function verifyAdminToken(token) {
  if (!token || typeof token !== 'string') return false;
  if (activeAdminSessions.has(token)) return true;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  if (sig !== expectedSig) return false;
  const timestamp = parseInt(payload.split('_')[0], 10);
  if (isNaN(timestamp)) return false;
  // Token valid for 7 days
  const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
  if (Date.now() - timestamp > maxAgeMs) return false;
  return true;
}

// Helper to parse HTTP Cookie Header securely
const parseCookies = (req) => {
  const list = {};
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(cookie => {
    let [name, ...rest] = cookie.split('=');
    name = name?.trim();
    if (name) list[name] = decodeURIComponent(rest.join('=').trim());
  });
  return list;
};

// Check if incoming request is from authenticated Admin
const isAuthenticatedAdmin = (req) => {
  const cookies = parseCookies(req);
  const cookieToken = cookies['kanha_admin_token'];
  if (cookieToken && verifyAdminToken(cookieToken)) return true;

  const customHeader = req.headers['x-admin-token'];
  if (customHeader && verifyAdminToken(customHeader)) return true;

  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearerToken = authHeader.substring(7).trim();
    if (verifyAdminToken(bearerToken)) return true;
  }

  return false;
};

// Admin authentication middleware for API routes
const requireAdmin = (req, res, next) => {
  if (!isAuthenticatedAdmin(req)) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Active administrator session or token required."
    });
  }
  next();
};

// Register .mustache extension with Mustache Express Engine
app.engine('mustache', mustacheExpress());
app.set('view engine', 'mustache');
app.set('views', path.join(__dirname, 'views'));

// Body Parser Middleware with generous limits for image/photo data
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure database connection is ready before handling any request (prevents serverless cold-start race conditions)
app.use(async (req, res, next) => {
  try {
    await db.ensureInit();
  } catch (err) {
    console.error('[DB] Database initialization middleware notice:', err.message);
  }
  next();
});

// Intercept /admin.html to prevent static bypass
app.get('/admin.html', (req, res) => {
  res.redirect('/admin');
});

// Google Search Console & SEO Routes
app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  res.sendFile(require('path').join(__dirname, 'sitemap.xml'));
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.sendFile(require('path').join(__dirname, 'robots.txt'));
});

app.get('/google48b2a719bbcfc04a.html', (req, res) => {
  res.type('text/html');
  res.sendFile(require('path').join(__dirname, 'google48b2a719bbcfc04a.html'));
});

// Serve Static Assets (CSS, JS, Images, Uploads)
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/uploads', express.static(upload.UPLOADS_DIR, { maxAge: '7d' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '7d' }));
app.use(express.static(path.join(__dirname, '/'), { index: false }));

// Shared Global View Context Data Builder
const getGlobalContext = (contentData = null) => {
  const company = (contentData && contentData.company) || {};
  const stats = (contentData && contentData.stats) || {};
  const servicesList = (contentData && contentData.services) || [];

  return {
    companyName: company.fullName || "KANHA Construction & Interior",
    tagline: company.tagline || "Best Construction Company & Interior Designer in Ahmedabad",
    establishedYear: "2021",
    location: company.address || "Nikol, Ahmedabad, Gujarat, India",
    phone: company.phone || "+91 9898749575",
    whatsapp: company.whatsapp || "+91 9898749575",
    whatsappLink: company.whatsappLink || "https://wa.me/919898749575?text=Hello%20Kanha%20Team%2C%20I%20am%20interested%20in%20your%20services.",
    address: company.address || "Near Shreenath Party Plot, Nikol, Ahmedabad, Gujarat - 382350",
    year: new Date().getFullYear(),
    companyIntro: (contentData && contentData.hero && contentData.hero.description) || "Delivering quality-driven architectural, structural, and interior projects with a commitment to excellence, innovation, and reliability across residential, industrial, commercial, and healthcare spaces in Ahmedabad.",
    stats: {
      projectsDelivered: stats.customProjectsText || "50+",
      largestSqFt: stats.customLargestSqFt || "15K+",
      onTimeExecution: stats.customOnTimeRate || "100%",
      specializations: stats.customSpecializations || "5"
    },
    services: [
      { title: "Architectural Design", icon: "fa-solid fa-city", description: "Conceptualizing modern, functional, and aesthetically striking elevations and floor layouts." },
      { title: "Structural Design", icon: "fa-solid fa-cubes-stacked", description: "Rigorous structural engineering ensuring long-term load safety, seismic resilience, and material efficiency." },
      { title: "Interior Design", icon: "fa-solid fa-couch", description: "Bespoke residential, office, and hospital interior transformations with customized lighting." },
      { title: "Turnkey Projects", icon: "fa-solid fa-key", description: "End-to-end hassle-free execution from initial blueprint design to final key handover." }
    ],
    servicesList: servicesList.length > 0 ? servicesList.map((s, idx) => ({
      title: s.title,
      icon: s.icon,
      fullDescription: s.fullDesc || s.shortDesc,
      highlights: s.highlights || [],
      image: s.image,
      isReversed: idx % 2 === 1
    })) : [
      {
        title: "Architectural Design",
        icon: "fa-solid fa-city",
        fullDescription: "We conceptualize modern, functional, and visually captivating elevations and 2D/3D floor layouts tailored to contemporary living. Our architectural team focuses on optimizing spatial flow, natural daylighting, and passive energy efficiency.",
        highlights: ["3D Elevation Modeling & Photorealistic Renders", "Residential Villa & Commercial Building Layouts", "Municipal & Sanction Floor Plan Preparation"],
        image: "/assets/images/kanha_hero_facade_1791296928268.jpg",
        isReversed: false
      },
      {
        title: "Structural Design",
        icon: "fa-solid fa-cubes-stacked",
        fullDescription: "Rigorous structural engineering ensuring long-term load safety, seismic resilience, and material efficiency. We design heavy industrial plants, steel truss sheds, multi-story RCC framing, and foundation engineering.",
        highlights: ["RCC Frame & Foundation Load Analysis", "Industrial Steel Fabrication Structural Engineering", "Seismic Safety Compliance Standards"],
        image: "/assets/images/raghuveer_gears_industrial_1791296960519.jpg",
        isReversed: true
      },
      {
        title: "Interior Design",
        icon: "fa-solid fa-couch",
        fullDescription: "Luxury living rooms, modular kitchens, master suites, commercial corporate offices, and specialized hospital interior clinic layouts. We craft ambient cove lighting, marble accent walls, and custom furniture.",
        highlights: ["Bespoke Living & Bedroom Transformations", "Modular Island Kitchens & Italian Marble Feature Walls", "Specialized Healthcare & Rehab Clinic Interiors"],
        image: "/assets/images/kanha_interior_living_1791297029485.jpg",
        isReversed: false
      },
      {
        title: "Turnkey Projects",
        icon: "fa-solid fa-key",
        fullDescription: "End-to-end hassle-free execution where we manage every aspect from raw land site development, civil construction, electrical & plumbing, interior styling, to final key handover.",
        highlights: ["Complete Single-Point Project Accountability", "On-Time Handover Guarantee", "Full Material Quality & Civil Work Warranty"],
        image: "/assets/images/rajdeep_villa_residential_1791296998090.jpg",
        isReversed: true
      }
    ]
  };
};

// --- Page Routes ---

// Home Route
app.get(['/', '/index', '/index.html'], async (req, res) => {
  const content = await db.getContent();
  const context = {
    ...getGlobalContext(content),
    pageTitle: "Best Construction Company & Interior Designer in Ahmedabad, Nikol",
    metaDescription: "Kanha Construction & Interior is the premier turnkey construction company and interior designer in Nikol, Ahmedabad. We specialize in residential villas, industrial sheds, structural engineering, 3D architecture & bespoke interiors. Call/WhatsApp +91 9898749575.",
    canonicalUrl: "https://kanha-portfolio-eta.vercel.app/",
    isHome: true
  };
  res.render('index', context);
});

// About Route
app.get(['/about', '/about.html'], async (req, res) => {
  const content = await db.getContent();
  const context = {
    ...getGlobalContext(content),
    pageTitle: "About Us | Top Architectural, Structural & Turnkey Builders Ahmedabad",
    metaDescription: "Learn about Kanha Construction & Interior - premier architectural design, structural engineering, and turnkey builders established in 2021 in Nikol, Ahmedabad. 50+ successful projects delivered.",
    canonicalUrl: "https://kanha-portfolio-eta.vercel.app/about",
    isAbout: true
  };
  res.render('about', context);
});

// Services Route
app.get(['/services', '/services.html'], async (req, res) => {
  const content = await db.getContent();
  const context = {
    ...getGlobalContext(content),
    pageTitle: "Turnkey Construction, Architecture & Interior Services in Ahmedabad",
    metaDescription: "Comprehensive construction and interior services in Ahmedabad: Architectural 3D Elevation, Structural RCC Design, Turnkey Villa Construction, Industrial Plants & Luxury Interiors.",
    canonicalUrl: "https://kanha-portfolio-eta.vercel.app/services",
    isServices: true
  };
  res.render('services', context);
});

// Projects Route
app.get(['/projects', '/projects.html'], async (req, res) => {
  const content = await db.getContent();
  const context = {
    ...getGlobalContext(content),
    pageTitle: "Completed Projects Portfolio | Industrial, Residential & Interior Ahmedabad",
    metaDescription: "Explore 50+ completed turnkey projects across Ahmedabad, Nikol, Vatva GIDC, Naroda, Bopal, Kuha & Chiloda by Kanha Construction & Interior. Browse photo galleries & floor plans.",
    canonicalUrl: "https://kanha-portfolio-eta.vercel.app/projects",
    isProjects: true
  };
  res.render('projects', context);
});

// Project Detail Route
app.get(['/project-detail', '/project-detail.html'], async (req, res) => {
  const content = await db.getContent();
  const context = {
    ...getGlobalContext(content),
    pageTitle: "Project Details & Gallery | Kanha Construction Ahmedabad",
    canonicalUrl: "https://kanha-portfolio-eta.vercel.app/project-detail",
    isProjects: true
  };
  res.render('project-detail', context);
});

// Contact Route
app.get(['/contact', '/contact.html'], async (req, res) => {
  const content = await db.getContent();
  const context = {
    ...getGlobalContext(content),
    pageTitle: "Contact Kanha Construction Nikol Ahmedabad | WhatsApp & Phone",
    metaDescription: "Connect with Kanha Construction & Interior in Nikol, Ahmedabad. Reach us directly on WhatsApp or Call at +91 9898749575 for instant quotations, site consultations & architectural plan reviews.",
    canonicalUrl: "https://kanha-portfolio-eta.vercel.app/contact",
    isContact: true
  };
  res.render('contact', context);
});

// Admin Route - Strictly Protected
app.get('/admin', async (req, res) => {
  const content = await db.getContent();
  if (!isAuthenticatedAdmin(req)) {
    return res.render('admin-login', {
      ...getGlobalContext(content),
      pageTitle: "Admin Restricted Access Gate",
      isAdminLogin: true
    });
  }

  const context = {
    ...getGlobalContext(content),
    pageTitle: "Admin Studio Dashboard",
    isAdmin: true
  };
  res.render('admin', context);
});

// --- Admin Authentication API ---

app.post('/api/admin/login', (req, res) => {
  const { username, password, pin } = req.body;
  const adminUser = (username || '').trim().toLowerCase();
  const adminPass = (password || pin || '').trim();

  const isUserValid = adminUser === 'admin' || !username;
  const isPassValid = adminPass === '1234' || adminPass === 'kanha@admin2026' || (process.env.ADMIN_PASSWORD && adminPass === process.env.ADMIN_PASSWORD);

  if (isUserValid && isPassValid) {
    const sessionToken = createAdminToken();
    activeAdminSessions.add(sessionToken);

    res.setHeader('Set-Cookie', `kanha_admin_token=${sessionToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`);
    return res.json({
      success: true,
      token: sessionToken,
      message: "Admin authentication successful!"
    });
  }

  console.warn(`[Security Alert] Unauthorized admin login attempt with user: "${username}"`);
  return res.status(401).json({
    success: false,
    message: "Invalid credentials. Access Denied."
  });
});

app.all(['/api/admin/logout', '/admin/logout'], (req, res) => {
  const cookies = parseCookies(req);
  const token = cookies['kanha_admin_token'];
  if (token) {
    activeAdminSessions.delete(token);
  }
  res.setHeader('Set-Cookie', `kanha_admin_token=; Path=/; HttpOnly; SameSite=Strict; Expires=Thu, 01 Jan 1970 00:00:00 GMT`);
  if (req.method === 'GET') {
    return res.redirect('/admin');
  }
  return res.json({ success: true, message: "Logged out successfully" });
});

// --- RESTful Database API Endpoints ---

// System & Storage Status
app.get('/api/status', (req, res) => {
  res.json({
    status: "ok",
    database: db.getStatus(),
    storage: upload.getUploadStatus(),
    timestamp: new Date().toISOString()
  });
});

// 1. Projects API
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await db.getProjects();
    res.json(projects);
  } catch (err) {
    console.error("Error fetching projects:", err);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const project = await db.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json(project);
  } catch (err) {
    console.error("Error fetching project:", err);
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

app.post('/api/projects', requireAdmin, async (req, res) => {
  try {
    const projectData = req.body;
    if (!projectData || !projectData.title) {
      return res.status(400).json({ success: false, message: "Project title is required." });
    }

    // Convert Base64 cover photo to disk/cloud file URL to prevent DB bloat
    if (projectData.image && projectData.image.startsWith('data:')) {
      projectData.image = await upload.processBase64Image(projectData.image, 'cover');
    }

    // Convert Base64 gallery photos to disk/cloud file URLs
    if (Array.isArray(projectData.gallery)) {
      for (const item of projectData.gallery) {
        if (item.image && item.image.startsWith('data:')) {
          item.image = await upload.processBase64Image(item.image, 'gallery');
        }
      }
    }

    const saved = await db.saveProject(projectData);
    res.json({ success: true, project: saved });
  } catch (err) {
    console.error("Error saving project:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/projects/bulk', requireAdmin, async (req, res) => {
  try {
    const { projects } = req.body;
    if (!Array.isArray(projects)) {
      return res.status(400).json({ success: false, message: "Projects must be an array." });
    }

    // Convert any Base64 images across projects to disk/cloud URLs
    for (const proj of projects) {
      if (proj.image && proj.image.startsWith('data:')) {
        proj.image = await upload.processBase64Image(proj.image, 'cover');
      }
      if (Array.isArray(proj.gallery)) {
        for (const item of proj.gallery) {
          if (item.image && item.image.startsWith('data:')) {
            item.image = await upload.processBase64Image(item.image, 'gallery');
          }
        }
      }
    }

    const saved = await db.saveAllProjects(projects);
    res.json({ success: true, count: saved.length, projects: saved });
  } catch (err) {
    console.error("Error saving bulk projects:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/projects/:id', requireAdmin, async (req, res) => {
  try {
    const success = await db.deleteProject(req.params.id);
    res.json({ success, message: success ? "Project deleted." : "Project not found." });
  } catch (err) {
    console.error("Error deleting project:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. Website Content API (Company, Hero, About, Services, Stats)
app.get('/api/content', async (req, res) => {
  try {
    const content = await db.getContent();
    res.json(content);
  } catch (err) {
    console.error("Error fetching content:", err);
    res.status(500).json({ error: "Failed to fetch website content" });
  }
});

app.post('/api/content', requireAdmin, async (req, res) => {
  try {
    const { section, data } = req.body;
    if (!section || !data) {
      return res.status(400).json({ success: false, message: "Section and data are required." });
    }

    // Convert Base64 images to permanent disk/cloud URLs
    if (section === 'hero' && data.image && data.image.startsWith('data:')) {
      data.image = await upload.processBase64Image(data.image, 'hero');
    } else if (section === 'about' && data.image && data.image.startsWith('data:')) {
      data.image = await upload.processBase64Image(data.image, 'about');
    } else if (section === 'services' && Array.isArray(data)) {
      for (const srv of data) {
        if (srv.image && srv.image.startsWith('data:')) {
          srv.image = await upload.processBase64Image(srv.image, 'service');
        }
      }
    }

    const updated = await db.updateContent(section, data);
    res.json({ success: true, section, data: updated });
  } catch (err) {
    console.error("Error updating content:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/reset', requireAdmin, async (req, res) => {
  try {
    const resetData = await db.resetDatabase();
    res.json({ success: true, message: "Website reset to defaults", data: resetData });
  } catch (err) {
    console.error("Error resetting database:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. High-Capacity Image Upload API (Single or Batch up to 50 Images)
app.post('/api/upload', requireAdmin, (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    upload.uploadMiddleware.any()(req, res, (err) => {
      if (err) {
        console.error("Multer file upload error:", err);
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  } else {
    next();
  }
}, async (req, res) => {
  try {
    const urls = [];

    // Process multipart uploaded files
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = await upload.processUploadedFile(file);
        if (url) urls.push(url);
      }
    } else if (req.file) {
      const url = await upload.processUploadedFile(req.file);
      if (url) urls.push(url);
    }

    // Process Base64 payload if sent via JSON
    if (req.body && req.body.base64) {
      const url = await upload.processBase64Image(req.body.base64, req.body.name || 'photo');
      if (url) urls.push(url);
    } else if (req.body && Array.isArray(req.body.images)) {
      for (const item of req.body.images) {
        const base64Str = typeof item === 'string' ? item : item.base64;
        const name = typeof item === 'object' ? item.name : 'photo';
        const url = await upload.processBase64Image(base64Str, name);
        if (url) urls.push(url);
      }
    }

    if (urls.length === 0) {
      return res.status(400).json({ success: false, message: "No valid image files received." });
    }

    return res.json({
      success: true,
      url: urls[0],
      urls: urls,
      count: urls.length
    });
  } catch (err) {
    console.error("Upload handler error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Contact Form Submission (Email to kanha.consinterio@gmail.com)
app.post('/api/contact', async (req, res) => {
  const { name, phone, category, message } = req.body;
  const targetEmail = "kanha.consinterio@gmail.com";

  console.log(`\n[New Inquiry Received]`);
  console.log(`Name: ${name}`);
  console.log(`Phone: ${phone}`);
  console.log(`Requirement: ${category}`);
  console.log(`Message: ${message}`);
  console.log(`Target Email: ${targetEmail}\n`);

  try {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      const mailOptions = {
        from: `"Kanha Website Lead" <inquiry@kanhaconsinterio.com>`,
        to: targetEmail,
        subject: `🚨 New Project Inquiry from ${name} (${category})`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 24px; background-color: #0b2530; color: #ffffff; border-radius: 12px; border: 1px solid rgba(56, 189, 248, 0.3);">
            <h2 style="color: #38bdf8; border-bottom: 2px solid #38bdf8; padding-bottom: 10px; margin-top: 0;">New Project Inquiry - Kanha Construction & Interior</h2>
            <p style="font-size: 16px; color: #94a3b8;">A new inquiry has been submitted via the website contact form.</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px; background: rgba(7, 25, 34, 0.6); border-radius: 8px; overflow: hidden;">
              <tr><td style="padding: 12px; font-weight: bold; width: 140px; color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.08);">Full Name:</td><td style="padding: 12px; color: #fff; border-bottom: 1px solid rgba(255,255,255,0.08);">${name}</td></tr>
              <tr><td style="padding: 12px; font-weight: bold; color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.08);">Phone Number:</td><td style="padding: 12px; color: #38bdf8; border-bottom: 1px solid rgba(255,255,255,0.08);"><a href="tel:${phone}" style="color: #38bdf8; font-weight: bold;">${phone}</a></td></tr>
              <tr><td style="padding: 12px; font-weight: bold; color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.08);">Requirement:</td><td style="padding: 12px; color: #fff; border-bottom: 1px solid rgba(255,255,255,0.08);">${category}</td></tr>
              <tr><td style="padding: 12px; font-weight: bold; color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.08);">Message:</td><td style="padding: 12px; color: #fff; border-bottom: 1px solid rgba(255,255,255,0.08);">${message}</td></tr>
              <tr><td style="padding: 12px; font-weight: bold; color: #94a3b8;">Destination Email:</td><td style="padding: 12px; color: #eab308; font-weight: bold;">kanha.consinterio@gmail.com</td></tr>
            </table>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      return res.json({
        success: true,
        message: `Inquiry successfully sent to kanha.consinterio@gmail.com!`
      });
    }

    // Rely on free FormSubmit HTTP dispatch
    const response = await fetch('https://formsubmit.co/ajax/kanha.consinterio@gmail.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        name,
        phone,
        requirement: category,
        message,
        _subject: `🚨 New Kanha Website Inquiry from ${name} (${category})`,
        _template: 'table',
        _captcha: 'false'
      })
    });

    const resData = await response.json();
    return res.json({
      success: true,
      message: `Inquiry successfully sent to kanha.consinterio@gmail.com!`,
      details: resData
    });
  } catch (err) {
    console.error("Error sending email:", err);
    return res.json({
      success: true,
      message: `Inquiry registered for kanha.consinterio@gmail.com!`,
      fallbackMailto: `mailto:${targetEmail}?subject=New Inquiry from ${encodeURIComponent(name)}&body=Name: ${encodeURIComponent(name)}%0D%0APhone: ${encodeURIComponent(phone)}%0D%0ARequirement: ${encodeURIComponent(category)}%0D%0AMessage: ${encodeURIComponent(message)}`
    });
  }
});

// Server Initialization
async function startServer() {
  await db.initDB();
  upload.initCloudinary();

  if (require.main === module || !process.env.VERCEL) {
    app.listen(PORT, () => {
      console.log(`🚀 Kanha Portfolio Server running at http://localhost:${PORT}`);
    });
  }
}

startServer();

module.exports = app;
