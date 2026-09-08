const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');
const path = require('path');

// Load env if not already loaded
if (!process.env.CLOUDINARY_CLOUD_NAME) {
  dotenv.config({ path: path.join(__dirname, '../../.env') });
}

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
  console.log('☁️  Cloudinary configured:', CLOUDINARY_CLOUD_NAME);
} else {
  console.warn('⚠️  Cloudinary env vars missing (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) — photo uploads will fail until configured');
}

/**
 * Upload a buffer to Cloudinary.
 * @param {Buffer} buffer - file buffer
 * @param {string} mimetype - e.g. 'image/jpeg'
 * @param {object} options - cloudinary upload options
 * @returns {Promise<{secure_url:string, public_id:string}>}
 */
function uploadBufferToCloudinary(buffer, mimetype, options = {}) {
  return new Promise((resolve, reject) => {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      return reject(new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env'));
    }
    const folder = process.env.CLOUDINARY_FOLDER || 'unitymap/barrier-reports';
    const uploadOptions = {
      folder,
      resource_type: 'image',
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      ...options,
    };

    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });

    stream.end(buffer);
  });
}

/**
 * Upload a data URI (fallback if stream unavailable)
 */
function uploadDataUriToCloudinary(dataUri, options = {}) {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    return Promise.reject(new Error('Cloudinary is not configured.'));
  }
  const folder = process.env.CLOUDINARY_FOLDER || 'unitymap/barrier-reports';
  return cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: 'image',
    ...options,
  });
}

module.exports = { cloudinary, uploadBufferToCloudinary, uploadDataUriToCloudinary };
