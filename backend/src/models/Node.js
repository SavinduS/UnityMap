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
        message: 'Coordinates must be valid [longitude, latitude] within valid geographic ranges',
      },
    },
  },
  { _id: false }
);

const nodeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Node name is required'],
      trim: true,
      maxlength: [120, 'Node name cannot exceed 120 characters'],
    },
    floorLevel: {
      type: Number,
      required: [true, 'Floor level is required'],
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not a valid floor integer',
      },
    },
    location: {
      type: pointSchema,
      required: [true, 'Location is required'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// 2dsphere index on location for geospatial queries
nodeSchema.index({ location: '2dsphere' });
nodeSchema.index({ floorLevel: 1 });

const Node = mongoose.models.Node || mongoose.model('Node', nodeSchema);

module.exports = Node;
