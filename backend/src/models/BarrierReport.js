const mongoose = require('mongoose');

const verificationLogEntrySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: ['created', 'verified', 'approved', 'rejected', 'info_requested', 'triaged', 'updated'],
    },
    status: {
      type: String,
      trim: true,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const barrierReportSchema = new mongoose.Schema(
  {
    coordinates: {
      latitude: {
        type: Number,
        required: [true, 'Latitude is required'],
        min: [-90, 'Latitude must be >= -90'],
        max: [90, 'Latitude must be <= 90'],
      },
      longitude: {
        type: Number,
        required: [true, 'Longitude is required'],
        min: [-180, 'Longitude must be >= -180'],
        max: [180, 'Longitude must be <= 180'],
      },
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: undefined,
      },
    },
    photoUrl: {
      type: String,
      required: [true, 'Photo URL is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: ['Ramp', 'Lift', 'Tactile Paving', 'Restroom', 'Other'],
        message: '{VALUE} is not a valid category',
      },
      index: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating must be at most 5'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value',
      },
    },
    triageStatus: {
      type: String,
      enum: {
        values: ['pending', 'under_review', 'verified', 'approved', 'rejected', 'info_requested'],
        message: '{VALUE} is not a valid triage status',
      },
      default: 'pending',
      index: true,
    },
    verificationLog: {
      type: [verificationLogEntrySchema],
      default: [],
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    exifMetadata: {
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 },
      timestamp: { type: Date },
      altitude: { type: Number },
    },
    capturedAt: {
      type: Date,
    },
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    upvotedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    corroborationCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true, // createdAt / updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

barrierReportSchema.index({ location: '2dsphere' });
barrierReportSchema.index({ createdAt: -1 });
barrierReportSchema.index({ category: 1, triageStatus: 1 });

// Keep GeoJSON location in sync with coordinates [lng, lat]
barrierReportSchema.pre('save', function preSave(next) {
  if (this.isModified('coordinates') && this.coordinates && this.coordinates.latitude != null && this.coordinates.longitude != null) {
    this.location = {
      type: 'Point',
      coordinates: [this.coordinates.longitude, this.coordinates.latitude],
    };
  }
  next();
});

barrierReportSchema.pre('findOneAndUpdate', function preFindOneAndUpdate(next) {
  const update = this.getUpdate();
  if (!update) return next();

  const coords = update.coordinates || (update.$set && update.$set.coordinates);
  if (coords && coords.latitude != null && coords.longitude != null) {
    const loc = { type: 'Point', coordinates: [coords.longitude, coords.latitude] };
    if (update.$set) {
      update.$set.location = loc;
    } else {
      update.location = loc;
    }
    this.setUpdate(update);
  }
  next();
});

const BarrierReport = mongoose.model('BarrierReport', barrierReportSchema);

module.exports = BarrierReport;
