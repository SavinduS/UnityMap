const mongoose = require('mongoose');

const pointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true,
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: [true, 'Coordinates [longitude, latitude] are required'],
      validate: {
        validator: function (coords) {
          return (
            Array.isArray(coords) &&
            coords.length === 2 &&
            coords[0] >= -180 &&
            coords[0] <= 180 && // Longitude
            coords[1] >= -90 &&
            coords[1] <= 90 // Latitude
          );
        },
        message: 'Coordinates must be valid [longitude, latitude] within valid ranges',
      },
    },
  },
  { _id: false }
);

const municipalAssetSchema = new mongoose.Schema(
  {
    assetCode: {
      type: String,
      required: [true, 'Asset code is required (e.g., CMC-AST-1049)'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Asset name is required'],
      trim: true,
      maxlength: [160, 'Asset name cannot exceed 160 characters'],
    },
    category: {
      type: String,
      required: [true, 'Asset category is required'],
      enum: {
        values: ['Ramp', 'Lift', 'Tactile Paving', 'Restroom', 'Curb Ramp', 'Other'],
        message: '{VALUE} is not a recognized municipal asset category',
      },
      index: true,
    },
    wardId: {
      type: String,
      required: [true, 'Assigned Ward ID is required'],
      trim: true,
      index: true,
    },
    location: {
      type: pointSchema,
      required: [true, 'Asset GeoJSON location is required'],
    },
    address: {
      type: String,
      required: [true, 'Physical street address / landmark is required'],
      trim: true,
      maxlength: 250,
    },
    specifications: {
      gradientDegrees: {
        type: Number,
        min: [0, 'Gradient must be non-negative'],
        max: [45, 'Gradient cannot exceed 45 degrees'],
      },
      clearWidthMeters: {
        type: Number,
        min: [0, 'Clear width must be positive'],
      },
      hasHandrails: {
        type: Boolean,
        default: false,
      },
      hasTactileIndicators: {
        type: Boolean,
        default: false,
      },
      maxLoadCapacityKg: {
        type: Number,
      },
    },
    operationalStatus: {
      type: String,
      enum: ['OPERATIONAL', 'DEGRADED', 'OUT_OF_SERVICE', 'UNDER_MAINTENANCE'],
      default: 'OPERATIONAL',
      index: true,
    },
    registeredPhotoUrl: {
      type: String,
      trim: true,
      default: null,
      description: 'Official municipal photo evidence used for side-by-side comparison',
    },
    lastInspectionDate: {
      type: Date,
      default: Date.now,
    },
    nextScheduledInspection: {
      type: Date,
    },
    installationYear: {
      type: Number,
      min: [1970, 'Installation year must be 1970 or later'],
      max: [new Date().getFullYear() + 1, 'Installation year cannot be in the future'],
    },
    estimatedReplacementCostLKR: {
      type: Number,
      min: [0, 'Replacement cost must be non-negative'],
      default: 0,
    },
    activeBarrierReportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BarrierReport',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// 2dsphere index for radius/proximity queries when cross-checking barrier reports
municipalAssetSchema.index({ location: '2dsphere' });
municipalAssetSchema.index({ wardId: 1, category: 1 });

const MunicipalAsset = mongoose.models.MunicipalAsset || mongoose.model('MunicipalAsset', municipalAssetSchema);

module.exports = MunicipalAsset;
