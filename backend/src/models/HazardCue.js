const mongoose = require('mongoose');

const hazardCueSchema = new mongoose.Schema(
  {
    cueCode: {
      type: String,
      required: [true, 'Cue code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^HAZ_[A-Z0-9_]+$/, 'Cue code must match HAZ_* pattern'],
      index: true,
    },
    obstacleType: {
      type: String,
      required: [true, 'Obstacle type is required'],
      enum: {
        values: ['construction', 'blockade', 'stairs_only', 'temporary_hazard'],
        message: '{VALUE} is not a recognized obstacle type',
      },
      index: true,
    },
    severity: {
      type: Number,
      required: [true, 'Severity is required'],
      min: [1, 'Severity must be at least 1'],
      max: [5, 'Severity cannot exceed 5'],
      index: true,
    },
    cueText: {
      en: {
        type: String,
        required: [true, 'English cue text is required'],
        trim: true,
        maxlength: [300, 'Cue text cannot exceed 300 characters'],
      },
      si: {
        type: String,
        trim: true,
        maxlength: [300, 'Cue text cannot exceed 300 characters'],
      },
      ta: {
        type: String,
        trim: true,
        maxlength: [300, 'Cue text cannot exceed 300 characters'],
      },
    },
    earconUrl: {
      type: String,
      trim: true,
    },
    ttsOverrides: {
      rate: {
        type: Number,
        min: [0.5, 'Rate must be at least 0.5'],
        max: [2.0, 'Rate cannot exceed 2.0'],
      },
      pitch: {
        type: Number,
        min: [0.5, 'Pitch must be at least 0.5'],
        max: [2.0, 'Pitch cannot exceed 2.0'],
      },
      volume: {
        type: Number,
        min: [0, 'Volume must be at least 0'],
        max: [1, 'Volume cannot exceed 1'],
      },
    },
    categoryMapping: [
      {
        type: String,
        enum: {
          values: ['Ramp', 'Lift', 'Tactile Paving', 'Restroom', 'Other'],
          message: '{VALUE} is not a valid barrier category',
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for cue lookup
hazardCueSchema.index({ obstacleType: 1, severity: 1 });
hazardCueSchema.index({ obstacleType: 1, isActive: 1 });
hazardCueSchema.index({ isActive: 1, severity: 1 });

const HazardCue =
  mongoose.models.HazardCue || mongoose.model('HazardCue', hazardCueSchema);

module.exports = HazardCue;
