const mongoose = require('mongoose');

const triageDecisionSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['PENDING_TRIAGE', 'APPROVED_AND_BUDGETED', 'REJECTED', 'INFO_REQUESTED'],
      default: 'PENDING_TRIAGE',
      index: true,
    },
    dispatchedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MunicipalStaff',
      default: null,
    },
    dispatchedAt: {
      type: Date,
      default: null,
    },
    allocatedBudgetLKR: {
      type: Number,
      default: 0,
      min: [0, 'Allocated repair budget must be >= 0'],
    },
    repairTargetDate: {
      type: Date,
      default: null,
    },
    rejectionReasonCode: {
      type: String,
      enum: [
        null,
        'DUPLICATE_REPORT',
        'OUTSIDE_MUNICIPAL_BOUNDARY',
        'TEMPORARY_EVENT_PERMIT',
        'INSUFFICIENT_EVIDENCE',
        'PRIVATE_PROPERTY_ACCESS',
      ],
      default: null,
    },
    decisionNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  { _id: false }
);

const triageUrgencyScoreSchema = new mongoose.Schema(
  {
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BarrierReport',
      required: [true, 'Associated BarrierReport ID is required'],
      unique: true,
      index: true,
    },
    wardId: {
      type: String,
      required: [true, 'Ward ID is required for triage queue sorting'],
      trim: true,
      index: true,
    },
    urgencyIndex: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      index: true,
      description: 'Calculated 0-100 triage score: (Severity*0.4) + (Corroboration*0.35) + (Decay*0.25)',
    },
    priorityBadge: {
      type: String,
      enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
      required: true,
      index: true,
    },
    formulaFactors: {
      barrierSeverityWeight: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
      },
      corroborationCount: {
        type: Number,
        default: 0,
        min: 0,
      },
      reportAgeDays: {
        type: Number,
        default: 0,
        min: 0,
      },
      vitalCorridorMultiplier: {
        type: Number,
        default: 1.0,
        min: 1.0,
        max: 2.0,
        description: 'Multiplier for hospital, school, and railway transit corridors',
      },
    },
    crossReferencedAsset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MunicipalAsset',
      default: null,
      description: 'Existing municipal asset matched for side-by-side verification',
    },
    distanceToAssetMeters: {
      type: Number,
      default: null,
    },
    decision: {
      type: triageDecisionSchema,
      default: () => ({}),
    },
    lastCalculatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Sorting index for Triage Queue: urgencyIndex descending, ward filtering
triageUrgencyScoreSchema.index({ wardId: 1, urgencyIndex: -1 });
triageUrgencyScoreSchema.index({ 'decision.status': 1, urgencyIndex: -1 });

const TriageUrgencyScore =
  mongoose.models.TriageUrgencyScore || mongoose.model('TriageUrgencyScore', triageUrgencyScoreSchema);

module.exports = TriageUrgencyScore;
