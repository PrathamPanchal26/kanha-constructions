const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const defaults = require('./defaults');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'portfolio-db.json');

let isMongoActive = false;
let ProjectModel = null;
let ContentModel = null;

// MongoDB Mongoose Schemas (Used when MONGODB_URI is provided in .env)
const projectSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  category: { type: String, default: 'residential' },
  location: { type: String, default: '' },
  area: { type: String, default: '' },
  projectType: { type: String, default: 'Turnkey Project' },
  image: { type: String, default: '' },
  fallbackImage: { type: String, default: '' },
  description: { type: String, default: '' },
  featured: { type: Boolean, default: false },
  createdAt: { type: String, default: () => new Date().toISOString().split('T')[0] },
  gallery: [{
    section: { type: String, default: 'construction' },
    title: { type: String, default: '' },
    image: { type: String, required: true }
  }]
}, { timestamps: true });

const contentSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  company: { type: Object, default: defaults.DEFAULT_COMPANY },
  hero: { type: Object, default: defaults.DEFAULT_HERO },
  about: { type: Object, default: defaults.DEFAULT_ABOUT },
  services: { type: Array, default: defaults.DEFAULT_SERVICES },
  stats: { type: Object, default: defaults.DEFAULT_STATS }
}, { timestamps: true });

// Ensure local storage directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Read local JSON database
function readLocalDB() {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      company: defaults.DEFAULT_COMPANY,
      hero: defaults.DEFAULT_HERO,
      about: defaults.DEFAULT_ABOUT,
      services: defaults.DEFAULT_SERVICES,
      projects: defaults.DEFAULT_PROJECTS,
      stats: defaults.DEFAULT_STATS,
      lastUpdated: new Date().toISOString()
    };
    writeLocalDB(initialData);
    return initialData;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      company: parsed.company || defaults.DEFAULT_COMPANY,
      hero: parsed.hero || defaults.DEFAULT_HERO,
      about: parsed.about || defaults.DEFAULT_ABOUT,
      services: parsed.services || defaults.DEFAULT_SERVICES,
      projects: Array.isArray(parsed.projects) ? parsed.projects : defaults.DEFAULT_PROJECTS,
      stats: parsed.stats || defaults.DEFAULT_STATS,
      lastUpdated: parsed.lastUpdated || new Date().toISOString()
    };
  } catch (err) {
    console.error('[DB] Failed reading local JSON database, restoring default:', err);
    return {
      company: defaults.DEFAULT_COMPANY,
      hero: defaults.DEFAULT_HERO,
      about: defaults.DEFAULT_ABOUT,
      services: defaults.DEFAULT_SERVICES,
      projects: defaults.DEFAULT_PROJECTS,
      stats: defaults.DEFAULT_STATS,
      lastUpdated: new Date().toISOString()
    };
  }
}

// Atomic local JSON write to prevent any data loss
function writeLocalDB(data) {
  ensureDataDir();
  const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tempFile, DB_FILE);
  return data;
}

// Initialize Database connection (MongoDB Atlas if configured, or local persistent JSON)
async function initDB() {
  const mongoUri = process.env.MONGODB_URI;

  if (mongoUri) {
    try {
      console.log('[DB] Connecting to MongoDB Atlas...');
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000
      });
      isMongoActive = true;
      ProjectModel = mongoose.models.Project || mongoose.model('Project', projectSchema);
      ContentModel = mongoose.models.WebsiteContent || mongoose.model('WebsiteContent', contentSchema);
      console.log('✅ [DB] Successfully connected to MongoDB Atlas!');

      // Seed if MongoDB collection is empty
      const projectCount = await ProjectModel.countDocuments();
      if (projectCount === 0) {
        console.log('[DB] Seeding initial projects into MongoDB...');
        await ProjectModel.insertMany(defaults.DEFAULT_PROJECTS);
      }

      const contentDoc = await ContentModel.findOne({ key: 'global_site_content' });
      if (!contentDoc) {
        console.log('[DB] Seeding initial website content into MongoDB...');
        await ContentModel.create({
          key: 'global_site_content',
          company: defaults.DEFAULT_COMPANY,
          hero: defaults.DEFAULT_HERO,
          about: defaults.DEFAULT_ABOUT,
          services: defaults.DEFAULT_SERVICES,
          stats: defaults.DEFAULT_STATS
        });
      }

      return;
    } catch (err) {
      console.warn('⚠️ [DB] MongoDB Atlas connection failed. Falling back to persistent local JSON DB:', err.message);
      isMongoActive = false;
    }
  }

  // Local JSON Database initialization
  const local = readLocalDB();
  console.log(`✅ [DB] Using Local Persistent Database (${local.projects.length} projects loaded from ${DB_FILE})`);
}

// --- Projects CRUD Operations ---

async function getProjects() {
  if (isMongoActive && ProjectModel) {
    try {
      const docs = await ProjectModel.find({}).sort({ createdAt: -1, _id: -1 }).lean();
      return docs.map(d => ({ ...d, _id: undefined, __v: undefined }));
    } catch (err) {
      console.error('[DB] MongoDB error on getProjects, falling back to local DB:', err);
    }
  }

  const db = readLocalDB();
  return db.projects || [];
}

async function getProjectById(id) {
  if (!id) return null;
  if (isMongoActive && ProjectModel) {
    try {
      const doc = await ProjectModel.findOne({ id }).lean();
      return doc ? { ...doc, _id: undefined, __v: undefined } : null;
    } catch (err) {
      console.error('[DB] MongoDB error on getProjectById:', err);
    }
  }

  const db = readLocalDB();
  return (db.projects || []).find(p => p.id === id) || null;
}

async function saveProject(projectData) {
  if (!projectData.id) {
    projectData.id = 'proj_' + Date.now();
  }

  if (!projectData.gallery || !Array.isArray(projectData.gallery) || projectData.gallery.length === 0) {
    projectData.gallery = [
      { section: "construction", title: projectData.title + " - Construction", image: projectData.image || '' },
      { section: "interior", title: projectData.title + " - Interior", image: projectData.image || '' }
    ];
  }

  if (isMongoActive && ProjectModel) {
    try {
      const updated = await ProjectModel.findOneAndUpdate(
        { id: projectData.id },
        { $set: projectData },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      ).lean();
      return { ...updated, _id: undefined, __v: undefined };
    } catch (err) {
      console.error('[DB] MongoDB save error, falling back to local write:', err);
    }
  }

  const db = readLocalDB();
  const existingIdx = (db.projects || []).findIndex(p => p.id === projectData.id);

  if (existingIdx !== -1) {
    db.projects[existingIdx] = { ...db.projects[existingIdx], ...projectData };
  } else {
    db.projects = [projectData, ...(db.projects || [])];
  }

  writeLocalDB(db);
  return projectData;
}

async function deleteProject(id) {
  if (!id) return false;

  if (isMongoActive && ProjectModel) {
    try {
      const result = await ProjectModel.deleteOne({ id });
      return result.deletedCount > 0;
    } catch (err) {
      console.error('[DB] MongoDB delete error:', err);
    }
  }

  const db = readLocalDB();
  const initialLen = db.projects.length;
  db.projects = (db.projects || []).filter(p => p.id !== id);
  writeLocalDB(db);
  return db.projects.length < initialLen;
}

async function saveAllProjects(projectsArray) {
  if (!Array.isArray(projectsArray)) {
    throw new Error('Projects must be an array.');
  }

  if (isMongoActive && ProjectModel) {
    try {
      await ProjectModel.deleteMany({});
      if (projectsArray.length > 0) {
        await ProjectModel.insertMany(projectsArray);
      }
    } catch (err) {
      console.error('[DB] MongoDB bulk save error:', err);
    }
  }

  const db = readLocalDB();
  db.projects = projectsArray;
  writeLocalDB(db);
  return db.projects;
}

// --- Website Content Operations (Company, Hero, About, Services, Stats) ---

async function getContent() {
  if (isMongoActive && ContentModel) {
    try {
      const doc = await ContentModel.findOne({ key: 'global_site_content' }).lean();
      if (doc) {
        return {
          company: doc.company || defaults.DEFAULT_COMPANY,
          hero: doc.hero || defaults.DEFAULT_HERO,
          about: doc.about || defaults.DEFAULT_ABOUT,
          services: doc.services || defaults.DEFAULT_SERVICES,
          stats: doc.stats || defaults.DEFAULT_STATS
        };
      }
    } catch (err) {
      console.error('[DB] MongoDB getContent error:', err);
    }
  }

  const db = readLocalDB();
  return {
    company: db.company || defaults.DEFAULT_COMPANY,
    hero: db.hero || defaults.DEFAULT_HERO,
    about: db.about || defaults.DEFAULT_ABOUT,
    services: db.services || defaults.DEFAULT_SERVICES,
    stats: db.stats || defaults.DEFAULT_STATS
  };
}

async function updateContent(section, data) {
  const validSections = ['company', 'hero', 'about', 'services', 'stats'];
  if (!validSections.includes(section)) {
    throw new Error(`Invalid content section: ${section}`);
  }

  if (isMongoActive && ContentModel) {
    try {
      const updateObj = {};
      updateObj[section] = data;
      await ContentModel.findOneAndUpdate(
        { key: 'global_site_content' },
        { $set: updateObj },
        { upsert: true, new: true }
      );
      return data;
    } catch (err) {
      console.error(`[DB] MongoDB updateContent error for ${section}:`, err);
    }
  }

  const db = readLocalDB();
  db[section] = data;
  writeLocalDB(db);
  return data;
}

// Master Reset Database back to defaults
async function resetDatabase() {
  if (isMongoActive && ProjectModel && ContentModel) {
    try {
      await ProjectModel.deleteMany({});
      await ProjectModel.insertMany(defaults.DEFAULT_PROJECTS);

      await ContentModel.findOneAndUpdate(
        { key: 'global_site_content' },
        {
          key: 'global_site_content',
          company: defaults.DEFAULT_COMPANY,
          hero: defaults.DEFAULT_HERO,
          about: defaults.DEFAULT_ABOUT,
          services: defaults.DEFAULT_SERVICES,
          stats: defaults.DEFAULT_STATS
        },
        { upsert: true }
      );
    } catch (err) {
      console.error('[DB] MongoDB reset error:', err);
    }
  }

  const resetData = {
    company: defaults.DEFAULT_COMPANY,
    hero: defaults.DEFAULT_HERO,
    about: defaults.DEFAULT_ABOUT,
    services: defaults.DEFAULT_SERVICES,
    projects: defaults.DEFAULT_PROJECTS,
    stats: defaults.DEFAULT_STATS,
    lastUpdated: new Date().toISOString()
  };
  writeLocalDB(resetData);
  return resetData;
}

function getStatus() {
  return {
    databaseType: isMongoActive ? 'MongoDB Atlas (Cloud)' : 'Local Persistent Database (JSON / Disk)',
    isMongoConnected: isMongoActive,
    storageFile: isMongoActive ? 'Remote MongoDB Collection' : DB_FILE
  };
}

module.exports = {
  initDB,
  getProjects,
  getProjectById,
  saveProject,
  deleteProject,
  saveAllProjects,
  getContent,
  updateContent,
  resetDatabase,
  getStatus
};
