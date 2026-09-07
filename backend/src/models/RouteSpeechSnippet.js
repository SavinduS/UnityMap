const mongoose = require('mongoose');

const routeSpeechSnippetSchema = new mongoose.Schema(
  {
    routeHash: {
      type: String,
      required: [true, 'Route hash is required'],
      trim: true,
      index: true,
    },
    stepIndex: {
      type: Number,
      required: [true, 'Step index is required'],
      min: [0, 'Step index cannot be negative'],
    },
    nodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Node',
    },
    pathwayId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pathway',
    },
    maneuver: {
      type: String,
      required: [true, 'Maneuver is required'],
      enum: {
        values: ['left', 'right', 'straight', 'ramp', 'elevator', 'stairs'],
        message: '{VALUE} is not a valid maneuver',
      },
      index: true,
    },
    spokenText: {
      type: String,
      required: [true, 'Spoken text is required'],
      trim: true,
      maxlength: [400, 'Spoken text cannot exceed 400 characters'],
    },
    spokenTextSi: {
      type: String,
      trim: true,
      maxlength: [400, 'Spoken text cannot exceed 400 characters'],
    },
    spokenTextTa: {
      type: String,
      trim: true,
      maxlength: [400, 'Spoken text cannot exceed 400 characters'],
    },
    distanceToNextMeters: {
      type: Number,
      min: [0, 'Distance cannot be negative'],
    },
    estimatedDurationSec: {
      type: Number,
      min: [0, 'Duration cannot be negative'],
    },
    inclineDegrees: {
      type: Number,
      min: [-90, 'Incline cannot be less than -90'],
      max: [90, 'Incline cannot exceed 90'],
    },
    hazardCueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HazardCue',
      index: true,
    },
    speechPromptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SpeechPrompt',
      index: true,
    },
    locale: {
      type: String,
      enum: {
        values: ['en', 'si', 'ta'],
        message: '{VALUE} is not a supported locale',
      },
      default: 'en',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Unique compound index for route + step
routeSpeechSnippetSchema.index({ routeHash: 1, stepIndex: 1 }, { unique: true });
routeSpeechSnippetSchema.index({ pathwayId: 1 });
routeSpeechSnippetSchema.index({ nodeId: 1 });
routeSpeechSnippetSchema.index({ routeHash: 1, locale: 1 });

const RouteSpeechSnippet =
  mongoose.models.RouteSpeechSnippet ||
  mongoose.model('RouteSpeechSnippet', routeSpeechSnippetSchema);

module.exports = RouteSpeechSnippet;
