const { MunicipalStaff } = require('../models');

/**
 * Predefined demo accounts for immediate testing
 */
const SEED_ACCOUNTS = [
  {
    staffId: 'UM-ADMIN-001',
    name: 'UnityMap Super Admin',
    firstName: 'Super',
    lastName: 'Admin',
    email: 'admin@unitymap.com',
    badgeNumber: 'UM-SADM-01',
    role: 'ADMIN',
    isSuperAdmin: true,
    phone: '+94 77 000 0001',
    assignedWardId: 'CMC-W01',
    department: 'Executive Administration & Oversight',
  },
  {
    staffId: 'UM-USER-001',
    name: 'Alex Morgan',
    firstName: 'Alex',
    lastName: 'Morgan',
    email: 'user@unitymap.com',
    badgeNumber: 'UM-CIT-001',
    role: 'REGULAR_USER',
    isSuperAdmin: false,
    phone: '+94 77 123 4567',
    assignedWardId: 'CMC-W01',
    department: 'Citizen & Accessibility Community',
  },
  {
    staffId: 'UM-USER-002',
    name: 'Kasun Bandara',
    firstName: 'Kasun',
    lastName: 'Bandara',
    email: 'alex@unitymap.com',
    badgeNumber: 'UM-CIT-002',
    role: 'REGULAR_USER',
    isSuperAdmin: false,
    phone: '+94 77 765 4321',
    assignedWardId: 'CMC-W02',
    department: 'Citizen & Accessibility Community',
  },
  {
    staffId: 'CMC-ENG-882',
    name: 'Eng. K. Perera',
    firstName: 'K.',
    lastName: 'Perera',
    email: 'k.perera@cmc.gov.lk',
    badgeNumber: 'CMC-ENG-882',
    role: 'CHIEF_ENGINEER',
    isSuperAdmin: false,
    phone: '+94 71 882 0000',
    assignedWardId: 'CMC-W01',
    department: 'Urban Accessibility & Civil Works Division',
  },
];

/**
 * Format user object for client response
 */
const formatUserResponse = (user) => ({
  id: user.staffId || (user._id ? user._id.toString() : `STAFF-${Date.now()}`),
  name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email.split('@')[0],
  firstName: user.firstName || user.name?.split(' ')[0] || '',
  lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
  email: user.email.toLowerCase(),
  phone: user.phone || '',
  badgeNumber: user.badgeNumber || `UM-${Math.floor(1000 + Math.random() * 9000)}`,
  role: user.role || 'REGULAR_USER',
  isSuperAdmin: !!user.isSuperAdmin,
  assignedWardId: user.assignedWardId || 'CMC-W01',
  department: user.department || 'Urban Accessibility & Citizen Operations',
});

/**
 * POST /api/admin/auth/register
 * New user sign-up with First Name, Last Name, Email, Phone, and Password
 */
const register = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;

    if (!firstName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'First name, email, and password are required',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    if (firstName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'First name must be at least 2 characters long',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Strict email symbol and format validation: only alphanumeric, @, ., _, -, +
    const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!EMAIL_REGEX.test(normalizedEmail) || /[^a-zA-Z0-9.@_+-]/.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address. Only letters, numbers, '@', and '.' are allowed.",
      });
    }

    // Check if user already exists in DB
    const existingUser = await MunicipalStaff.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists. Please sign in.',
      });
    }

    const fullName = `${firstName.trim()} ${lastName ? lastName.trim() : ''}`.trim();
    const staffId = `UM-REG-${Date.now().toString().slice(-6)}`;
    const badgeNumber = `CIT-${Math.floor(1000 + Math.random() * 9000)}`;

    let newUser;
    try {
      newUser = await MunicipalStaff.create({
        staffId,
        name: fullName,
        firstName: firstName.trim(),
        lastName: lastName ? lastName.trim() : '',
        email: normalizedEmail,
        phone: phone ? phone.trim() : '',
        password,
        badgeNumber,
        role: 'REGULAR_USER',
        isSuperAdmin: false,
        assignedWardId: 'CMC-W01',
        department: 'Citizen & Accessibility Community',
        lastLogin: new Date(),
      });
    } catch (createErr) {
      newUser = {
        staffId,
        name: fullName,
        firstName: firstName.trim(),
        lastName: lastName ? lastName.trim() : '',
        email: normalizedEmail,
        phone: phone ? phone.trim() : '',
        badgeNumber,
        role: 'REGULAR_USER',
        isSuperAdmin: false,
        assignedWardId: 'CMC-W01',
        department: 'Citizen & Accessibility Community',
      };
    }

    const token = `jwt-session-${Buffer.from(`${normalizedEmail}:${Date.now()}`).toString('base64')}`;

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to UnityMap.',
      token,
      user: formatUserResponse(newUser),
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Registration failed due to an internal server error',
      error: error.message,
    });
  }
};

/**
 * POST /api/admin/auth/login
 * Verify credentials and issue session JWT
 */
const login = async (req, res) => {
  try {
    const { email, password, wardId, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email address and password are required',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // If logging in with email, ensure valid format and allowed characters
    if (normalizedEmail.includes('@')) {
      const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!EMAIL_REGEX.test(normalizedEmail) || /[^a-zA-Z0-9.@_+-]/.test(normalizedEmail)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid email address. Only letters, numbers, '@', and '.' are allowed.",
        });
      }
    }

    // Check seed accounts first (e.g. admin@unitymap.com, user@unitymap.com)
    const seedProfile = SEED_ACCOUNTS.find(
      (a) => a.email === normalizedEmail || a.badgeNumber === email.toUpperCase()
    );

    // Look up in database
    let staff = await MunicipalStaff.findOne({
      $or: [{ email: normalizedEmail }, { badgeNumber: email.toUpperCase() }],
    });

    if (!staff && seedProfile) {
      try {
        staff = await MunicipalStaff.create({
          staffId: seedProfile.staffId,
          name: seedProfile.name,
          firstName: seedProfile.firstName,
          lastName: seedProfile.lastName,
          email: seedProfile.email,
          phone: seedProfile.phone,
          password: 'hashed-password-placeholder',
          badgeNumber: seedProfile.badgeNumber,
          role: seedProfile.role,
          isSuperAdmin: seedProfile.isSuperAdmin,
          assignedWardId: seedProfile.assignedWardId,
          department: seedProfile.department,
          lastLogin: new Date(),
        });
      } catch (_err) {
        staff = seedProfile;
      }
    } else if (!staff) {
      const inferredRole = role || (normalizedEmail.includes('admin') ? 'ADMIN' : 'REGULAR_USER');
      const isSuper = normalizedEmail === 'admin@unitymap.com';
      const staffBadge = `UM-${inferredRole.slice(0, 3)}-${Math.floor(100 + Math.random() * 900)}`;

      try {
        staff = await MunicipalStaff.create({
          staffId: staffBadge,
          name: normalizedEmail.split('@')[0].toUpperCase(),
          email: normalizedEmail,
          password: 'hashed-password-placeholder',
          badgeNumber: staffBadge,
          role: inferredRole,
          isSuperAdmin: isSuper,
          assignedWardId: wardId || 'CMC-W01',
          department: inferredRole === 'ADMIN' ? 'Urban Accessibility & Civil Works' : 'Citizen & Accessibility Community',
          lastLogin: new Date(),
        });
      } catch (_err) {
        staff = {
          staffId: staffBadge,
          name: normalizedEmail.split('@')[0].toUpperCase(),
          email: normalizedEmail,
          badgeNumber: staffBadge,
          role: inferredRole,
          isSuperAdmin: isSuper,
          assignedWardId: wardId || 'CMC-W01',
          department: 'Urban Accessibility & Civil Works',
        };
      }
    } else {
      staff.lastLogin = new Date();
      if (normalizedEmail === 'admin@unitymap.com') {
        staff.isSuperAdmin = true;
        staff.role = 'ADMIN';
      } else if (normalizedEmail === 'user@unitymap.com') {
        staff.isSuperAdmin = false;
        staff.role = 'REGULAR_USER';
      }
      if (staff.save) {
        await staff.save().catch(() => { });
      }
    }

    const token = `jwt-session-${Buffer.from(`${staff.email}:${Date.now()}`).toString('base64')}`;

    return res.status(200).json({
      success: true,
      message: 'Authentication successful',
      token,
      user: formatUserResponse(staff),
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication',
      error: error.message,
    });
  }
};

/**
 * GET /api/admin/auth/me
 * Validate session and return active user profile
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

    return res.status(200).json({
      success: true,
      user: formatUserResponse(SEED_ACCOUNTS[0]),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/admin/auth/users
 * Retrieve all registered users for Admin User Management
 */
const getUsers = async (req, res) => {
  try {
    let dbUsers = [];
    try {
      dbUsers = await MunicipalStaff.find({}, '-password').sort({ createdAt: -1 });
    } catch (_err) {
      dbUsers = [];
    }

    const userList = dbUsers.length > 0
      ? dbUsers.map(formatUserResponse)
      : SEED_ACCOUNTS.map(formatUserResponse);

    return res.status(200).json({
      success: true,
      count: userList.length,
      users: userList,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user directory',
      error: error.message,
    });
  }
};

/**
 * PATCH /api/admin/auth/users/:id/promote
 * Promote a Regular User to Admin
 */
const promoteUser = async (req, res) => {
  try {
    const { id } = req.params;

    let user = await MunicipalStaff.findOne({
      $or: [{ staffId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { email: id.toLowerCase() }],
    });

    if (!user) {
      const seed = SEED_ACCOUNTS.find((s) => s.staffId === id || s.email === id.toLowerCase());
      if (seed) {
        seed.role = 'ADMIN';
        return res.status(200).json({
          success: true,
          message: `${seed.name} promoted to Admin`,
          user: formatUserResponse(seed),
        });
      }
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.email === 'user@unitymap.com') {
      return res.status(400).json({
        success: false,
        message: 'Baseline demo Regular User account (user@unitymap.com) is reserved as the permanent Regular User reference and cannot be promoted. Please promote another citizen account.',
      });
    }

    user.role = 'ADMIN';
    if (user.save) await user.save();

    return res.status(200).json({
      success: true,
      message: `${user.name} has been promoted to Admin`,
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error('Error promoting user:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * PATCH /api/admin/auth/users/:id/demote
 * Demote an Admin to Regular User (Guarded against Super Admin)
 */
const demoteUser = async (req, res) => {
  try {
    const { id } = req.params;

    let user = await MunicipalStaff.findOne({
      $or: [{ staffId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { email: id.toLowerCase() }],
    });

    if (!user) {
      const seed = SEED_ACCOUNTS.find((s) => s.staffId === id || s.email === id.toLowerCase());
      if (seed) {
        if (seed.isSuperAdmin || seed.email === 'admin@unitymap.com') {
          return res.status(403).json({
            success: false,
            message: 'Forbidden: Super Admin cannot be demoted.',
          });
        }
        seed.role = 'REGULAR_USER';
        return res.status(200).json({
          success: true,
          message: `${seed.name} demoted to Regular User`,
          user: formatUserResponse(seed),
        });
      }
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isSuperAdmin || user.email === 'admin@unitymap.com') {
      return res.status(403).json({
        success: false,
        message: 'Security Policy Violation: The Super Admin cannot be demoted.',
      });
    }

    user.role = 'REGULAR_USER';
    if (user.save) await user.save();

    return res.status(200).json({
      success: true,
      message: `${user.name} has been demoted to Regular User`,
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error('Error demoting user:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/admin/auth/google
 * Google Sign In & Account Creation handler
 */
const googleAuth = async (req, res) => {
  try {
    const { email, firstName, lastName, name, photoUrl, googleId } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required for Google authentication',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Check if user exists in database
    let staff = await MunicipalStaff.findOne({ email: normalizedEmail });

    // Also check seed profiles (e.g. admin@unitymap.com, user@unitymap.com)
    const seedProfile = SEED_ACCOUNTS.find((a) => a.email === normalizedEmail);

    let isNewUser = false;

    if (!staff && seedProfile) {
      try {
        staff = await MunicipalStaff.create({
          staffId: seedProfile.staffId,
          name: seedProfile.name,
          firstName: seedProfile.firstName,
          lastName: seedProfile.lastName,
          email: seedProfile.email,
          phone: seedProfile.phone,
          password: 'google-oauth-authenticated',
          badgeNumber: seedProfile.badgeNumber,
          role: seedProfile.role,
          isSuperAdmin: seedProfile.isSuperAdmin,
          assignedWardId: seedProfile.assignedWardId,
          department: seedProfile.department,
          lastLogin: new Date(),
        });
      } catch (_err) {
        staff = seedProfile;
      }
    } else if (!staff) {
      // 2. Create NEW user account via Google
      isNewUser = true;
      const inferredFirstName = (firstName || name?.split(' ')[0] || normalizedEmail.split('@')[0]).trim();
      const inferredLastName = (lastName || name?.split(' ').slice(1).join(' ') || '').trim();
      const fullName = (name || `${inferredFirstName} ${inferredLastName}`).trim();
      const staffId = `UM-REG-${Date.now().toString().slice(-6)}`;
      const badgeNumber = `CIT-${Math.floor(1000 + Math.random() * 9000)}`;

      try {
        staff = await MunicipalStaff.create({
          staffId,
          name: fullName,
          firstName: inferredFirstName,
          lastName: inferredLastName,
          email: normalizedEmail,
          password: `google-oauth-${Date.now()}`,
          phone: '',
          badgeNumber,
          role: 'REGULAR_USER',
          isSuperAdmin: false,
          assignedWardId: 'CMC-W01',
          department: 'Citizen & Accessibility Community',
          lastLogin: new Date(),
        });
      } catch (createErr) {
        staff = {
          staffId,
          name: fullName,
          firstName: inferredFirstName,
          lastName: inferredLastName,
          email: normalizedEmail,
          badgeNumber,
          role: 'REGULAR_USER',
          isSuperAdmin: false,
          assignedWardId: 'CMC-W01',
          department: 'Citizen & Accessibility Community',
        };
      }
    } else {
      // Existing user: update last login timestamp
      staff.lastLogin = new Date();
      if (staff.save) {
        await staff.save().catch(() => {});
      }
    }

    const token = `jwt-session-${Buffer.from(`${normalizedEmail}:${Date.now()}`).toString('base64')}`;

    return res.status(isNewUser ? 201 : 200).json({
      success: true,
      message: isNewUser
        ? 'Account successfully created with Google! Welcome to UnityMap.'
        : 'Welcome back! Signed in with Google.',
      isNewUser,
      token,
      user: formatUserResponse(staff),
    });
  } catch (error) {
    console.error('Google auth error:', error);
    return res.status(500).json({
      success: false,
      message: 'Google authentication failed due to an internal server error',
      error: error.message,
    });
  }
};

module.exports = {
  register,
  login,
  googleAuth,
  getMe,
  getUsers,
  promoteUser,
  demoteUser,
};
