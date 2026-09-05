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
            coords[0] <= 180 &&
            coords[1] >= -90 &&
            coords[1] <= 90
          );
        },
        message: 'Coordinates must be valid [longitude, latitude] within valid geographic ranges',
      },
    },
  },
  { _id: false }
);

const obstacleMarkerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Obstacle title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
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
    location: {
      type: pointSchema,
      required: [true, 'Location is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// 2dsphere index for geospatial proximity searches ($near, $geoWithin)
obstacleMarkerSchema.index({ location: '2dsphere' });
// Compound index for active obstacle filtering
obstacleMarkerSchema.index({ isActive: 1, obstacleType: 1 });

const ObstacleMarker =
  mongoose.models.ObstacleMarker || mongoose.model('ObstacleMarker', obstacleMarkerSchema);

module.exports = ObstacleMarker;
