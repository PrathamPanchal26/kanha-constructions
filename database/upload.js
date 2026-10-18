const fs = require('fs');
const path = require('path');
const os = require('os');
const multer = require('multer');

// Detect serverless environment
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

// Setup uploads directory (resilient for both local server and serverless read-only runtime)
const BUNDLED_UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

function getWritableUploadsDir() {
  if (isServerless) {
    const tmpUploads = path.join(os.tmpdir(), 'kanha-uploads');
    try {
      if (!fs.existsSync(tmpUploads)) fs.mkdirSync(tmpUploads, { recursive: true });
    } catch (e) {}
    return tmpUploads;
  }

  try {
    if (!fs.existsSync(BUNDLED_UPLOADS_DIR)) {
      fs.mkdirSync(BUNDLED_UPLOADS_DIR, { recursive: true });
    }
    const testFile = path.join(BUNDLED_UPLOADS_DIR, `.write_test_${Date.now()}`);
    fs.writeFileSync(testFile, 'ok', 'utf8');
    fs.unlinkSync(testFile);
    return BUNDLED_UPLOADS_DIR;
  } catch (err) {
    const tmpUploads = path.join(os.tmpdir(), 'kanha-uploads');
    try {
      if (!fs.existsSync(tmpUploads)) fs.mkdirSync(tmpUploads, { recursive: true });
    } catch (e) {}
    return tmpUploads;
  }
}

const UPLOADS_DIR = getWritableUploadsDir();

// Optional Cloudinary Configuration
let cloudinary = null;
let isCloudinaryActive = false;

function initCloudinary() {
  const hasCloudinaryUrl = Boolean(process.env.CLOUDINARY_URL);
  const hasCloudinaryKeys = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );

  if (hasCloudinaryUrl || hasCloudinaryKeys) {
    try {
      cloudinary = require('cloudinary').v2;
      if (hasCloudinaryKeys) {
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
          secure: true
        });
      }
      isCloudinaryActive = true;
      console.log('☁️ [Upload] Cloudinary Cloud Storage configured & active!');
    } catch (err) {
      console.warn('⚠️ [Upload] Cloudinary initialization warning, using disk uploads:', err.message);
      isCloudinaryActive = false;
    }
  } else {
    isCloudinaryActive = false;
    console.log(`📁 [Upload] Using Local Server Disk Storage (${UPLOADS_DIR})`);
  }
}

// Multer Disk Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const targetDir = getWritableUploadsDir();
    try {
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
    } catch (e) {}
    cb(null, targetDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const cleanBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E6);
    cb(null, `kanha_${cleanBase}_${uniqueSuffix}${ext}`);
  }
});

// Multer Image Filter
const fileFilter = (req, file, cb) => {
  const allowedMime = /^image\/(jpeg|png|webp|gif|svg\+xml|avif)$/i;
  const allowedExt = /\.(jpg|jpeg|png|webp|gif|svg|avif)$/i;

  if (allowedMime.test(file.mimetype) || allowedExt.test(file.originalname)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPG, PNG, WEBP, GIF, SVG, AVIF) are permitted.'), false);
  }
};

const uploadMiddleware = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB max per image
  }
});

// Process uploaded file (transfers to Cloudinary if active, or returns local URL)
async function processUploadedFile(file) {
  if (!file) return null;

  if (isCloudinaryActive && cloudinary) {
    try {
      const uploadResult = await cloudinary.uploader.upload(file.path, {
        folder: 'kanha_portfolio',
        use_filename: true,
        unique_filename: true,
        resource_type: 'image'
      });

      // Cleanup local temp file after successful cloud upload
      try {
        fs.unlinkSync(file.path);
      } catch (e) {}

      return uploadResult.secure_url;
    } catch (err) {
      console.error('[Upload] Cloudinary upload failed, falling back to local file:', err.message);
    }
  }

  // Return standard relative URL served by Express
  return `/uploads/${file.filename}`;
}

// Process Base64 image payload (e.g., from canvas compression or clipboard)
async function processBase64Image(dataUri, filenamePrefix = 'image') {
  if (!dataUri || typeof dataUri !== 'string') return null;

  // Extract mime & data
  const matches = dataUri.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!matches) {
    if (dataUri.startsWith('http://') || dataUri.startsWith('https://') || dataUri.startsWith('/uploads/') || dataUri.startsWith('assets/')) {
      return dataUri;
    }
    return null;
  }

  const mimeType = matches[1];
  const base64Data = matches[2];
  let ext = '.jpg';
  if (mimeType.includes('png')) ext = '.png';
  else if (mimeType.includes('webp')) ext = '.webp';
  else if (mimeType.includes('svg')) ext = '.svg';

  if (isCloudinaryActive && cloudinary) {
    try {
      const uploadResult = await cloudinary.uploader.upload(dataUri, {
        folder: 'kanha_portfolio',
        resource_type: 'image'
      });
      return uploadResult.secure_url;
    } catch (err) {
      console.error('[Upload] Cloudinary Base64 upload failed, writing to disk:', err.message);
    }
  }

  // Save to local disk (or fallback to data URI if disk write is not permitted)
  try {
    const filename = `kanha_${filenamePrefix}_${Date.now()}_${Math.round(Math.random() * 1E6)}${ext}`;
    const filePath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    return `/uploads/${filename}`;
  } catch (err) {
    console.warn('[Upload] Disk write failed, retaining Base64 Data URI:', err.message);
    return dataUri;
  }
}

function getUploadStatus() {
  return {
    storageType: isCloudinaryActive ? 'Cloudinary (Cloud CDN)' : 'Server Local Disk Storage',
    isCloudActive: isCloudinaryActive,
    uploadsDirectory: UPLOADS_DIR
  };
}

module.exports = {
  UPLOADS_DIR,
  initCloudinary,
  uploadMiddleware,
  processUploadedFile,
  processBase64Image,
  getUploadStatus
};
