const mongoose = require('mongoose');

const speechPromptSchema = new mongoose.Schema(
  {
    promptCode: {
      type: String,
      required: [true, 'Prompt code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^SPROMPT-[A-Z0-9_-]+$/, 'Prompt code must match SPROMPT-* pattern'],
      index: true,
    },
    triggerType: {
      type: String,
      required: [true, 'Trigger type is required'],
      enum: {
        values: [
          'approaching_turn',
          'recalculating',
          'destination_arrived',
          'off_route',
          'elevator_out_of_service',
          'incline_warning',
          'barrier_ahead',
          'route_start',
          'launcher_prompt',
          'route_summary',
        ],
        message: '{VALUE} is not a valid trigger type',
      },
      index: true,
    },
    template: {
      type: String,
      required: [true, 'Template text is required'],
      trim: true,
      maxlength: [500, 'Template cannot exceed 500 characters'],
    },
    locale: {
      type: String,
      required: [true, 'Locale is required'],
      enum: {
        values: ['en', 'si', 'ta'],
        message: '{VALUE} is not a supported locale',
      },
      default: 'en',
      index: true,
    },
    ssml: {
      type: String,
      trim: true,
      maxlength: [800, 'SSML cannot exceed 800 characters'],
    },
    priority: {
      type: Number,
      required: [true, 'Priority is required'],
      min: [1, 'Priority must be at least 1'],
      max: [3, 'Priority cannot exceed 3'],
      index: true,
    },
    ariaPoliteness: {
      type: String,
      enum: {
        values: ['polite', 'assertive'],
        message: '{VALUE} is not a valid aria politeness',
      },
      default: 'polite',
    },
    verbosity: {
      type: String,
      enum: {
        values: ['minimal', 'standard', 'detailed'],
        message: '{VALUE} is not a valid verbosity',
      },
      default: 'standard',
      index: true,
    },
    audioUrl: {
      type: String,
      trim: true,
    },
    associatedNodeIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Node',
        index: true,
      },
    ],
    associatedPathwayId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pathway',
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    version: {
      type: Number,
      default: 1,
      min: [1, 'Version must be at least 1'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MunicipalStaff',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for prompt lookup
speechPromptSchema.index({ triggerType: 1, locale: 1, verbosity: 1 });
speechPromptSchema.index({ triggerType: 1, locale: 1, isActive: 1 });
speechPromptSchema.index({ isActive: 1, priority: 1 });

const SpeechPrompt =
  mongoose.models.SpeechPrompt || mongoose.model('SpeechPrompt', speechPromptSchema);

module.exports = SpeechPrompt;
