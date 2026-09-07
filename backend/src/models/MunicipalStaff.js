const mongoose = require('mongoose');

const municipalStaffSchema = new mongoose.Schema(
  {
    staffId: {
      type: String,
      required: [true, 'Staff ID / Badge number is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Staff full name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Official municipal email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Security PIN or password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password hash by default in queries
    },
    badgeNumber: {
      type: String,
      required: [true, 'Official municipal badge number is required'],
      trim: true,
    },
    role: {
      type: String,
      required: [true, 'Municipal role clearance tier is required'],
      enum: {
        values: ['CHIEF_ENGINEER', 'WARD_INSPECTOR', 'BUDGET_OFFICER'],
        message: '{VALUE} is not an authorized municipal staff role',
      },
      default: 'WARD_INSPECTOR',
      index: true,
    },
    assignedWardId: {
      type: String,
      required: [true, 'Assigned ward jurisdiction ID is required'],
      trim: true,
      index: true,
    },
    department: {
      type: String,
      default: 'Urban Accessibility & Civil Works Division',
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

municipalStaffSchema.index({ assignedWardId: 1, role: 1 });

const MunicipalStaff = mongoose.models.MunicipalStaff || mongoose.model('MunicipalStaff', municipalStaffSchema);

module.exports = MunicipalStaff;
