const mongoose = require('mongoose');

const pathwaySchema = new mongoose.Schema(
  {
    startNode: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Node',
      required: [true, 'Start node reference is required'],
      index: true,
    },
    endNode: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Node',
      required: [true, 'End node reference is required'],
      index: true,
    },
    distanceMeters: {
      type: Number,
      required: [true, 'Distance in meters is required'],
      min: [0, 'Distance cannot be negative'],
    },
    inclineDegrees: {
      type: Number,
      default: 0,
      min: [-90, 'Incline angle cannot be less than -90 degrees'],
      max: [90, 'Incline angle cannot exceed 90 degrees'],
    },
    isWheelchairAccessible: {
      type: Boolean,
      default: true,
      index: true,
    },
    pathType: {
      type: String,
      required: [true, 'Path type is required'],
      enum: {
        values: ['walkway', 'ramp', 'stairs', 'elevator'],
        message: '{VALUE} is not a supported path type',
      },
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Prevent duplicate edge definitions in the same direction
pathwaySchema.index({ startNode: 1, endNode: 1 }, { unique: true });

const Pathway = mongoose.models.Pathway || mongoose.model('Pathway', pathwaySchema);

module.exports = Pathway;
