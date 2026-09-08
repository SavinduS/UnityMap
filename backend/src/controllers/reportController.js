const { BarrierReport } = require('../models');
const { uploadBufferToCloudinary, uploadDataUriToCloudinary } = require('../config/cloudinary');

const CATEGORY_ENUM = ['Ramp', 'Lift', 'Tactile Paving', 'Restroom', 'Other'];
const TRIAGE_STATUS_ENUM = ['pending', 'under_review', 'verified', 'approved', 'rejected', 'info_requested'];

/**
 * Helper: parse JSON field that may arrive as string when using multipart/form-data
 */
function parseJsonField(value) {
  if (value === undefined || value === null) return value;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    // try JSON parse if looks like JSON
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        return JSON.parse(trimmed);
      } catch (_) {
        return value;
      }
    }
    return value;
  }
  return value;
}

/**
 * @desc    Create a new barrier report (volunteer 3-tap audit)
 * @route   POST /api/reports
 * Supports both:
 *  - multipart/form-data with file field `photo` (or `image`/`file`) -> uploaded to Cloudinary
 *  - JSON body with `photoUrl` string (backward compatibility)
 */
exports.createReport = async (req, res) => {
  try {
    // Support multipart fields that arrive as JSON strings
    let {
      coordinates,
      photoUrl,
      category,
      rating,
      notes,
      exifMetadata,
      capturedAt,
      reporterId,
      // new fields requested: name, location, timestamp alias, issue(bad)/good, note already covered (rating kept, reporterName removed)
      name,
      locationName,
      location: locationAlias, // alias for locationName from some clients (avoid shadowing GeoJSON `location`)
      condition,
      timestamp, // alias for capturedAt
      photoTakenAt, // alias for capturedAt
    } = req.body;

     coordinates = parseJsonField(coordinates);
     exifMetadata = parseJsonField(exifMetadata);
     // capturedAt may be string date — keep as-is for later validation

     // Normalize aliases: timestamp / photoTakenAt -> capturedAt
     if (!capturedAt) capturedAt = timestamp || photoTakenAt;
     // Normalize location alias
     if (!locationName && locationAlias && typeof locationAlias === 'string') locationName = locationAlias;
     // Normalize condition (issue vs good): allow 'issue' as synonym for 'bad'
     if (condition && typeof condition === 'string') {
       const c = condition.trim().toLowerCase();
       if (c === 'issue' || c === 'bad' || c === 'poor' || c === 'blocked') condition = 'bad';
       else if (c === 'good' || c === 'ok' || c === 'accessible') condition = 'good';
       else condition = c;
     }

     // Robust coordinate handling: support flat latitude/longitude (device fallback) + stringified forms
     // Frontend ThreeTapReportScreen sends coordinates object, but also ensure flat fields work when EXIF GPS missing
     const flatLatRaw = req.body.latitude ?? req.body.lat ?? req.body['coordinates[latitude]'];
     const flatLngRaw = req.body.longitude ?? req.body.lng ?? req.body.lon ?? req.body['coordinates[longitude]'];
     if ((!coordinates || typeof coordinates.latitude !== 'number' || typeof coordinates.longitude !== 'number') && flatLatRaw !== undefined && flatLngRaw !== undefined) {
       const lat = parseFloat(flatLatRaw);
       const lng = parseFloat(flatLngRaw);
       if (Number.isFinite(lat) && Number.isFinite(lng)) {
         coordinates = { latitude: lat, longitude: lng };
       }
     }
     // Fallback to exifMetadata if still missing (device location passed as exif when photo has no GPS)
     if ((!coordinates || typeof coordinates.latitude !== 'number') && exifMetadata && typeof exifMetadata.latitude === 'number' && typeof exifMetadata.longitude === 'number') {
       coordinates = { latitude: exifMetadata.latitude, longitude: exifMetadata.longitude };
     }
     // If coordinates arrived as separate fields due to FormData flattening, reconstruct (legacy)
     if (!coordinates && (req.body.latitude || req.body.longitude || req.body['coordinates[latitude]'] || req.body['coordinates[longitude]'])) {
       const lat = parseFloat(req.body.latitude ?? req.body['coordinates[latitude]']);
       const lng = parseFloat(req.body.longitude ?? req.body['coordinates[longitude]']);
       if (Number.isFinite(lat) && Number.isFinite(lng)) {
         coordinates = { latitude: lat, longitude: lng };
       }
     }

    // --- Validate coordinates ---
    if (
      !coordinates ||
      typeof coordinates.latitude !== 'number' ||
      typeof coordinates.longitude !== 'number' ||
      !Number.isFinite(coordinates.latitude) ||
      !Number.isFinite(coordinates.longitude)
    ) {
      return res.status(400).json({
        success: false,
        message: 'coordinates with valid latitude and longitude are required.',
      });
    }
    if (coordinates.latitude < -90 || coordinates.latitude > 90) {
      return res.status(400).json({
        success: false,
        message: 'Latitude must be between -90 and 90.',
      });
    }
    if (coordinates.longitude < -180 || coordinates.longitude > 180) {
      return res.status(400).json({
        success: false,
        message: 'Longitude must be between -180 and 180.',
      });
    }

    // --- Handle photo file upload to Cloudinary ---
    // Supports: multipart/form-data file field `photo` (preferred), also `image`/`file`/`photoUrl` as file
    // If a file is uploaded, it is streamed to Cloudinary and photoUrl is set to secure_url
    const uploadedFile = req.file || (req.files && req.files.photo && req.files.photo[0]) || null;
    if (uploadedFile) {
      try {
        const result = await uploadBufferToCloudinary(uploadedFile.buffer, uploadedFile.mimetype, {
          public_id: undefined,
        });
        photoUrl = result.secure_url;
      } catch (uploadErr) {
        console.error('Cloudinary upload failed:', uploadErr);
        const isConfigErr = uploadErr.message && uploadErr.message.includes('not configured');
        return res.status(isConfigErr ? 500 : 502).json({
          success: false,
          message: isConfigErr
            ? 'Photo upload service not configured. Contact administrator.'
            : 'Failed to upload photo to Cloudinary.',
          error: uploadErr.message,
        });
      }
    }

    // Handle base64 data URI photoUrl (fallback when file not sent as multipart)
    if (photoUrl && typeof photoUrl === 'string' && photoUrl.trim().startsWith('data:image')) {
      try {
        const result = await uploadDataUriToCloudinary(photoUrl.trim());
        photoUrl = result.secure_url;
      } catch (uploadErr) {
        // If Cloudinary not configured, keep data URI as-is (will be large but still valid)
        const isConfigErr = uploadErr.message && uploadErr.message.includes('not configured');
        if (!isConfigErr) {
          console.warn('Cloudinary data URI upload failed, storing data URI directly:', uploadErr.message);
        } else {
          console.warn('Cloudinary not configured, storing data URI directly');
        }
        // keep original photoUrl
      }
    }

    // --- Validate photoUrl (either uploaded or provided directly) ---
    if (!photoUrl || typeof photoUrl !== 'string' || !photoUrl.trim()) {
      return res.status(400).json({
        success: false,
        message: 'photo is required — upload an image file (field: photo) or provide photoUrl.',
      });
    }

    // --- Validate category ---
    if (!category || !CATEGORY_ENUM.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `${category} is not a valid category. Allowed: ${CATEGORY_ENUM.join(', ')}`,
      });
    }

    // --- Validate rating ---
    if (rating === undefined || rating === null) {
      return res.status(400).json({
        success: false,
        message: 'rating is required (1-5).',
      });
    }
    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({
        success: false,
        message: 'rating must be an integer between 1 and 5.',
      });
    }

    // --- Validate name / locationName (reporterName removed, rating kept) ---
    if (name !== undefined && name !== null && name !== '') {
      if (typeof name !== 'string') {
        return res.status(400).json({ success: false, message: 'name must be a string.' });
      }
      if (name.trim().length > 100) {
        return res.status(400).json({ success: false, message: 'name must be at most 100 characters.' });
      }
      name = name.trim();
    } else {
      name = undefined;
    }
    if (locationName !== undefined && locationName !== null && locationName !== '') {
      if (typeof locationName !== 'string') {
        return res.status(400).json({ success: false, message: 'locationName must be a string.' });
      }
      if (locationName.trim().length > 300) {
        return res.status(400).json({ success: false, message: 'locationName must be at most 300 characters.' });
      }
      locationName = locationName.trim();
    } else {
      locationName = undefined;
    }

    // --- Validate condition (issue/bad vs good) ---
    if (condition !== undefined && condition !== null && condition !== '') {
      if (typeof condition !== 'string') {
        return res.status(400).json({ success: false, message: 'condition must be a string (good or bad).' });
      }
      const c = condition.trim().toLowerCase();
      if (!['good', 'bad'].includes(c)) {
        return res.status(400).json({ success: false, message: 'condition must be good or bad (issue = bad).' });
      }
      condition = c;
    } else {
      condition = undefined;
    }

    // --- Validate notes (alias: note) ---
    if (req.body.note !== undefined && (notes === undefined || notes === null)) {
      notes = req.body.note;
    }
    if (notes !== undefined && notes !== null) {
      if (typeof notes !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'notes must be a string.',
        });
      }
      if (notes.length > 1000) {
        return res.status(400).json({
          success: false,
          message: 'notes must be at most 1000 characters.',
        });
      }
    }

    // --- Validate exifMetadata ---
    let sanitizedExif = undefined;
    if (exifMetadata !== undefined && exifMetadata !== null) {
      if (typeof exifMetadata !== 'object' || Array.isArray(exifMetadata)) {
        return res.status(400).json({
          success: false,
          message: 'exifMetadata must be an object.',
        });
      }
      sanitizedExif = {};
      if (exifMetadata.latitude !== undefined && exifMetadata.latitude !== null) {
        if (typeof exifMetadata.latitude !== 'number' || exifMetadata.latitude < -90 || exifMetadata.latitude > 90) {
          return res.status(400).json({
            success: false,
            message: 'exifMetadata.latitude must be between -90 and 90.',
          });
        }
        sanitizedExif.latitude = exifMetadata.latitude;
      }
      if (exifMetadata.longitude !== undefined && exifMetadata.longitude !== null) {
        if (typeof exifMetadata.longitude !== 'number' || exifMetadata.longitude < -180 || exifMetadata.longitude > 180) {
          return res.status(400).json({
            success: false,
            message: 'exifMetadata.longitude must be between -180 and 180.',
          });
        }
        sanitizedExif.longitude = exifMetadata.longitude;
      }
      if (exifMetadata.altitude !== undefined && exifMetadata.altitude !== null) {
        if (typeof exifMetadata.altitude !== 'number' || !Number.isFinite(exifMetadata.altitude)) {
          return res.status(400).json({
            success: false,
            message: 'exifMetadata.altitude must be a valid number.',
          });
        }
        sanitizedExif.altitude = exifMetadata.altitude;
      }
      if (exifMetadata.timestamp !== undefined && exifMetadata.timestamp !== null) {
        const ts = new Date(exifMetadata.timestamp);
        if (Number.isNaN(ts.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'exifMetadata.timestamp must be a valid date.',
          });
        }
        sanitizedExif.timestamp = ts;
      }
    }

    // --- Validate capturedAt / timestamp (time+date when click photo) ---
    // Accept capturedAt, timestamp, photoTakenAt; default to now if not provided so photo time is always saved
    let sanitizedCapturedAt = undefined;
    const rawCapturedAt = capturedAt;
    if (rawCapturedAt !== undefined && rawCapturedAt !== null && rawCapturedAt !== '') {
      const d = new Date(rawCapturedAt);
      if (Number.isNaN(d.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'capturedAt/timestamp must be a valid date.',
        });
      }
      sanitizedCapturedAt = d;
    } else {
      // Auto-set to photo click time (now) if client didn't send EXIF timestamp
      // This ensures "time and date when click the photo" is always persisted
      sanitizedCapturedAt = new Date();
    }
    // Ensure exifMetadata.timestamp falls back to capturedAt if not separately provided
    // (handled below in exif sanitization — will be enriched if missing)

    // Auto-calculate location 2dsphere point
    const location = {
      type: 'Point',
      coordinates: [coordinates.longitude, coordinates.latitude],
    };

    // Enrich exifMetadata.timestamp with capturedAt if missing (so EXIF fallback is consistent)
    if (sanitizedExif && !sanitizedExif.timestamp && sanitizedCapturedAt) {
      sanitizedExif.timestamp = sanitizedCapturedAt;
    }

    const report = await BarrierReport.create({
      coordinates: {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      },
      location,
      photoUrl: photoUrl.trim(),
      category,
      rating: ratingNum,
      notes: notes ? notes.trim() : undefined,
      exifMetadata: sanitizedExif,
      capturedAt: sanitizedCapturedAt,
      name: name || undefined,
      locationName: locationName || undefined,
      condition: condition || undefined,
      reporterId: reporterId || undefined,
      triageStatus: 'pending',
      verificationLog: [{ action: 'created', status: 'pending', timestamp: new Date() }],
    });

    console.log('✅ New Report Created in DB:', report);
    console.log(`   → Category: ${report.category} | Rating: ${report.rating} | Location: ${report.locationName || 'N/A'} | Coords: ${report.coordinates.latitude}, ${report.coordinates.longitude}`);

    return res.status(201).json({
      success: true,
      data: report,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to create barrier report',
      error: error.message,
    });
  }
};

/**
 * @desc    Get barrier reports with filtering and pagination
 * @route   GET /api/reports
 */
exports.getReports = async (req, res) => {
  try {
    const { category, status, triageStatus, page = '1', limit = '20' } = req.query;

    const filter = {};

    // Category filter
    if (category) {
      if (!CATEGORY_ENUM.includes(category)) {
        return res.status(400).json({
          success: false,
          message: `${category} is not a valid category. Allowed: ${CATEGORY_ENUM.join(', ')}`,
        });
      }
      filter.category = category;
    }

    // Status filter (supports both `status` and `triageStatus` query keys)
    const statusValue = triageStatus || status;
    if (statusValue) {
      if (!TRIAGE_STATUS_ENUM.includes(statusValue)) {
        return res.status(400).json({
          success: false,
          message: `${statusValue} is not a valid status. Allowed: ${TRIAGE_STATUS_ENUM.join(', ')}`,
        });
      }
      filter.triageStatus = statusValue;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [reports, total] = await Promise.all([
      BarrierReport.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      BarrierReport.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: reports.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: reports,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch barrier reports',
      error: error.message,
    });
  }
};

/**
 * @desc    Get single barrier report by ID
 * @route   GET /api/reports/:id
 */
exports.getReportById = async (req, res) => {
  try {
    const report = await BarrierReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Barrier report not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch barrier report',
      error: error.message,
    });
  }
};
