const multer = require('multer');

// Use memory storage so we can stream buffer directly to Cloudinary (no local disk)
const storage = multer.memoryStorage();

const ALLOWED_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

function fileFilter(req, file, cb) {
  // Accept only images
  if (ALLOWED_MIMES.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, png, webp, heic)'), false);
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 1,
  },
});

module.exports = upload;
