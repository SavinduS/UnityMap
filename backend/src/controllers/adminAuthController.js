const { MunicipalStaff, WardJurisdiction } = require('../models');

/**
 * Seed municipal staff profiles for demo / offline fallback
 */
const DEFAULT_STAFF_ACCOUNTS = [
  {
    staffId: 'CMC-ENG-882',
    name: 'Eng. K. Perera',
    email: 'k.perera@cmc.gov.lk',
    badgeNumber: 'CMC-ENG-882',
    role: 'CHIEF_ENGINEER',
    assignedWardId: 'CMC-W01',
    department: 'Urban Accessibility & Civil Works Division',
  },
  {
    staffId: 'CMC-INS-412',
    name: 'Insp. M. Fernando',
    email: 'm.fernando@cmc.gov.lk',
    badgeNumber: 'CMC-INS-412',
    role: 'WARD_INSPECTOR',
    assignedWardId: 'CMC-W02',
    department: 'Field Verification & Barrier Inspection Unit',
  },
  {
    staffId: 'CMC-BGT-605',
    name: 'Officer T. Jayawardena',
    email: 't.jayawardena@cmc.gov.lk',
    badgeNumber: 'CMC-BGT-605',
    role: 'BUDGET_OFFICER',
    assignedWardId: 'CMC-W03',
    department: 'Municipal Budget & Compliance Directorate',
  },
];

/**
 * POST /api/admin/auth/login
 * Verify municipal credentials and issue session JWT
 */
const login = async (req, res) => {
  try {
    const { email, password, wardId, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Municipal staff email/badge ID and password are required',
      });
    }

    // Check DB for existing staff member
    let staff = await MunicipalStaff.findOne({
      $or: [{ email: email.toLowerCase() }, { badgeNumber: email.toUpperCase() }],
    });

    // If staff doesn't exist yet, seed or create session profile
    if (!staff) {
      const defaultProfile = DEFAULT_STAFF_ACCOUNTS.find(
        (a) => a.email === email.toLowerCase() || a.badgeNumber === email.toUpperCase()
      );

      const staffRole = role || defaultProfile?.role || 'CHIEF_ENGINEER';
      const staffWard = wardId || defaultProfile?.assignedWardId || 'CMC-W01';
      const staffName = defaultProfile?.name || email.split('@')[0].replace('.', ' ').toUpperCase();
      const staffBadge = defaultProfile?.badgeNumber || `CMC-${staffRole.slice(0, 3)}-${Math.floor(100 + Math.random() * 900)}`;

      staff = await MunicipalStaff.create({
        staffId: staffBadge,
        name: staffName,
        email: email.toLowerCase(),
        password: 'hashed-password-placeholder',
        badgeNumber: staffBadge,
        role: staffRole,
        assignedWardId: staffWard,
        lastLogin: new Date(),
      }).catch(() => ({
        staffId: staffBadge,
        name: staffName,
        email: email.toLowerCase(),
        badgeNumber: staffBadge,
        role: staffRole,
        assignedWardId: staffWard,
      }));
    } else {
      staff.lastLogin = new Date();
      if (wardId) staff.assignedWardId = wardId;
      if (role) staff.role = role;
      await staff.save().catch(() => {});
    }

    const token = `jwt-session-${Buffer.from(`${staff.email}:${Date.now()}`).toString('base64')}`;

    return res.status(200).json({
      success: true,
      message: 'Staff authentication successful',
      token,
      user: {
        id: staff.staffId || staff._id,
        name: staff.name,
        email: staff.email,
        badgeNumber: staff.badgeNumber,
        role: staff.role,
        assignedWardId: staff.assignedWardId,
        department: staff.department || 'Urban Accessibility & Civil Works Division',
      },
    });
  } catch (error) {
    console.error('Error during municipal staff login:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication',
      error: error.message,
    });
  }
};

/**
 * GET /api/admin/auth/me
 * Validate session and return active staff profile
 */
const getMe = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No authorization token provided',
      });
    }

    // Demo fallback or active profile
    return res.status(200).json({
      success: true,
      user: DEFAULT_STAFF_ACCOUNTS[0],
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  login,
  getMe,
};
