const express = require('express');
const mustacheExpress = require('mustache-express');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Register .mustache extension with Mustache Express Engine
app.engine('mustache', mustacheExpress());
app.set('view engine', 'mustache');
app.set('views', path.join(__dirname, 'views'));

// Serve Static Assets (CSS, JS, Images)
app.use(express.static(path.join(__dirname, '/')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Body Parser Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Shared Global View Context Data
const getGlobalContext = () => ({
  companyName: "KANHA Construction & Interior",
  tagline: "Realising Your Dreams",
  establishedYear: "2021",
  location: "Nikol, Ahmedabad, Gujarat, India",
  phone: "+91 9898749575",
  email: "kanha.consinterio@gmail.com",
  address: "Nikol, Ahmedabad, Gujarat, India",
  year: new Date().getFullYear(),
  companyIntro: "Delivering quality-driven architectural, structural, and interior projects with a commitment to excellence, innovation, and reliability across residential, industrial, commercial, and healthcare spaces.",
  stats: {
    projectsDelivered: "50+",
    largestSqFt: "15K+",
    onTimeExecution: "100%",
    specializations: "5"
  },
  services: [
    { title: "Architectural Design", icon: "fa-solid fa-city", description: "Conceptualizing modern, functional, and aesthetically striking elevations and floor layouts." },
    { title: "Structural Design", icon: "fa-solid fa-cubes-stacked", description: "Rigorous structural engineering ensuring long-term load safety, seismic resilience, and material efficiency." },
    { title: "Interior Design", icon: "fa-solid fa-couch", description: "Bespoke residential, office, and hospital interior transformations with customized lighting." },
    { title: "Turnkey Projects", icon: "fa-solid fa-key", description: "End-to-end hassle-free execution from initial blueprint design to final key handover." }
  ],
  servicesList: [
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
});

// Routes

// Home Route
app.get(['/', '/index', '/index.html'], (req, res) => {
  const context = {
    ...getGlobalContext(),
    pageTitle: "Home",
    metaDescription: "Kanha Construction & Interior - Premium architectural design, structural engineering, interior design, construction work and turnkey projects in Ahmedabad, India.",
    isHome: true
  };
  res.render('index', context);
});

// About Route
app.get(['/about', '/about.html'], (req, res) => {
  const context = {
    ...getGlobalContext(),
    pageTitle: "About Us",
    metaDescription: "Learn about Kanha Construction & Interior - trusted name in construction, architectural design, and turnkey solutions in Ahmedabad since 2021.",
    isAbout: true
  };
  res.render('about', context);
});

// Services Route
app.get(['/services', '/services.html'], (req, res) => {
  const context = {
    ...getGlobalContext(),
    pageTitle: "Services",
    metaDescription: "Explore turnkey architectural design, structural engineering, interior design, construction work, and turnkey projects offered by Kanha Construction & Interior.",
    isServices: true
  };
  res.render('services', context);
});

// Projects Route
app.get(['/projects', '/projects.html'], (req, res) => {
  const context = {
    ...getGlobalContext(),
    pageTitle: "Our Projects",
    metaDescription: "Browse completed industrial, residential, hospital, and interior projects by Kanha Construction & Interior across Vatva, Kuha, Bopal, Chiloda, Naroda, and Ahmedabad.",
    isProjects: true
  };
  res.render('projects', context);
});

// Project Detail Route
app.get(['/project-detail', '/project-detail.html'], (req, res) => {
  const context = {
    ...getGlobalContext(),
    pageTitle: "Project Details & Gallery",
    isProjects: true
  };
  res.render('project-detail', context);
});

// Contact Route
app.get(['/contact', '/contact.html'], (req, res) => {
  const context = {
    ...getGlobalContext(),
    pageTitle: "Contact Us",
    metaDescription: "Get in touch with Kanha Construction & Interior in Nikol, Ahmedabad, Gujarat. Call +91 9898749575 or email kanha.consinterio@gmail.com.",
    isContact: true
  };
  res.render('contact', context);
});

// Admin Route
app.get(['/admin', '/admin.html'], (req, res) => {
  const context = {
    ...getGlobalContext(),
    pageTitle: "Admin Dashboard",
    isAdmin: true
  };
  res.render('admin', context);
});

// API Endpoint for Contact Form Submission (Sends FREE Email to kanha.consinterio@gmail.com)
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

// Start Express Server
app.listen(PORT, () => {
  console.log(`Mustache-powered Server running at http://localhost:${PORT}`);
});
