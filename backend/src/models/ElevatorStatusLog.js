const mongoose = require('mongoose');

const elevatorStatusLogSchema = new mongoose.Schema(
  {
    elevatorId: {
      type: String,
      required: [true, 'Elevator ID is required'],
      trim: true,
      index: true,
    },
    associatedNode: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Node',
      required: [true, 'Associated node is required'],
      index: true,
    },
    status: {
      type: String,
      required: [true, 'Elevator status is required'],
      enum: {
        values: ['operational', 'maintenance', 'out_of_service'],
        message: '{VALUE} is not a valid elevator status',
      },
      default: 'operational',
      index: true,
    },
    loggedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index for querying the latest status of a specific elevator
elevatorStatusLogSchema.index({ elevatorId: 1, loggedAt: -1 });

const ElevatorStatusLog =
  mongoose.models.ElevatorStatusLog || mongoose.model('ElevatorStatusLog', elevatorStatusLogSchema);

module.exports = ElevatorStatusLog;
