const mongoose = require('mongoose');

const polygonSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Polygon'],
      default: 'Polygon',
      required: true,
    },
    coordinates: {
      type: [[[Number]]], // Array of linear rings with [longitude, latitude]
      required: true,
    },
  },
  { _id: false }
);

const wardJurisdictionSchema = new mongoose.Schema(
  {
    wardCode: {
      type: String,
      required: [true, 'Ward code is required (e.g., CMC-W01)'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Ward name is required'],
      trim: true,
      maxlength: 120,
    },
    wardNumber: {
      type: Number,
      required: [true, 'Ward number is required'],
      min: 1,
      max: 100,
      index: true,
    },
    boundary: {
      type: polygonSchema,
      description: 'GeoJSON Polygon defining official administrative ward perimeter',
    },
    centerCoordinate: {
      latitude: {
        type: Number,
        required: true,
        min: -90,
        max: 90,
      },
      longitude: {
        type: Number,
        required: true,
        min: -180,
        max: 180,
      },
    },
    priorityTier: {
      type: String,
      enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
      default: 'MEDIUM',
      index: true,
    },
    allocatedBudgetLKR: {
      type: Number,
      default: 0,
      min: [0, 'Allocated budget cannot be negative'],
    },
    spentBudgetLKR: {
      type: Number,
      default: 0,
      min: [0, 'Spent budget cannot be negative'],
    },
    complianceScorePercent: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    activeBarrierCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    assignedInspector: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MunicipalStaff',
      default: null,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

wardJurisdictionSchema.index({ 'centerCoordinate.latitude': 1, 'centerCoordinate.longitude': 1 });

const WardJurisdiction =
  mongoose.models.WardJurisdiction || mongoose.model('WardJurisdiction', wardJurisdictionSchema);

module.exports = WardJurisdiction;
