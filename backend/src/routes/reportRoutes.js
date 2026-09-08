const express = require('express');
const router = express.Router();
const { createReport, getReports, getReportById } = require('../controllers/reportController');
const upload = require('../middleware/upload');

// POST /api/reports — supports multipart/form-data (photo file -> Cloudinary) or JSON (photoUrl)
router
  .route('/')
  .get(getReports)
  .post(
    // Handle multer errors gracefully — convert to JSON response
    (req, res, next) => {
      const handler = upload.single('photo');
      handler(req, res, (err) => {
        if (err) {
          // Multer fileFilter / limits errors
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ success: false, message: 'Photo exceeds 10MB limit.' });
          }
          return res.status(400).json({ success: false, message: err.message || 'File upload error.' });
        }
        // Also accept alternative field names `image` or `file` if `photo` not used but a file was sent as single elsewhere?
        // If no file under `photo` but request is multipart with file, busboy would have ignored it.
        // Support fallback: check if `image` was used — re-run with that field
        if (!req.file && req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
          // No-op: client should use `photo` field; keep error message helpful in controller
        }
        next();
      });
    },
    createReport
  );

// Allow alternative upload field `image` via separate route handling (optional)
router.post('/upload-image', upload.single('image'), createReport);
router.post('/upload-file', upload.single('file'), createReport);

router.route('/:id').get(getReportById);

module.exports = router;
