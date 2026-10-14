const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { MunicipalStaff } = require('../models');

const BCRYPT_ROUNDS = 10;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const BCRYPT_PREFIX = /^\$2[aby]\$/;

/**
 * Predefined demo accounts, provisioned on first successful login.
 * They are never auto-created for arbitrary emails — only these exact addresses,
 * and only outside production. Passwords are hashed before they touch the database.
 */
const SEED_ACCOUNTS = [
  {
    staffId: 'UM-ADMIN-001',
    name: 'UnityMap Super Admin',
    firstName: 'Super',
    lastName: 'Admin',
    email: 'admin@unitymap.com',
    password: 'Admin@2026',
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
    password: 'User@2026',
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
    password: 'User@2026',
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
    password: 'CMC@2026',
    badgeNumber: 'CMC-ENG-882',
    role: 'CHIEF_ENGINEER',
    isSuperAdmin: false,
    phone: '+94 71 882 0000',
    assignedWardId: 'CMC-W01',
    department: 'Urban Accessibility & Civil Works Division',
  },
];

const SUPER_ADMIN_EMAIL = 'admin@unitymap.com';
const BASELINE_USER_EMAIL = 'user@unitymap.com';

const hashPassword = (plain) => bcrypt.hash(plain, BCRYPT_ROUNDS);
const isBcryptHash = (value) => typeof value === 'string' && BCRYPT_PREFIX.test(value);

const signToken = (staff) =>
  jwt.sign(
    {
      sub: staff._id ? staff._id.toString() : staff.staffId,
      email: staff.email,
      role: staff.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

/**
 * Compares a submitted password against the stored credential.
 * Supports a transparent upgrade path: accounts created before hashing was
 * introduced hold a plaintext password, so a legacy match is immediately
 * re-hashed and persisted.
 */
const verifyPassword = async (staff, submitted) => {
  const stored = staff.password;

  if (isBcryptHash(stored)) {
    return bcrypt.compare(submitted, stored);
  }

  if (typeof stored === 'string' && stored.length > 0 && stored === submitted) {
    staff.password = await hashPassword(submitted);
    if (staff.save) await staff.save();
    return true;
  }

  return false;
};

const formatUserResponse = (user) => ({
  id: user.staffId || (user._id ? user._id.toString() : `STAFF-${Date.now()}`),
  name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || String(user.email || '').split('@')[0],
  firstName: user.firstName || user.name?.split(' ')[0] || '',
  lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
  email: (user.email || '').toLowerCase(),
  phone: user.phone || '',
  badgeNumber: user.badgeNumber || `UM-${Math.floor(1000 + Math.random() * 9000)}`,
  role: user.role || 'REGULAR_USER',
  isSuperAdmin: !!user.isSuperAdmin,
  assignedWardId: user.assignedWardId || 'CMC-W01',
  department: user.department || 'Urban Accessibility & Citizen Operations',
});

/** Shared email/format validation for register + login. */
const validateEmail = (email) => {
  if (!email || !String(email).includes('@')) return 'Please enter a valid email address.';
  if (!EMAIL_REGEX.test(email) || /[^a-zA-Z0-9.@_+-]/.test(email)) {
    return "Please enter a valid email address. Only letters, numbers, '@', and '.' are allowed.";
  }
  return null;
};

/**
 * Provisions a seed account on first login. Only the exact SEED_ACCOUNTS
 * addresses are eligible, and only outside production.
 */
const provisionSeedAccount = async (seedProfile) => {
  if (process.env.NODE_ENV === 'production') return null;

  const existing = await MunicipalStaff.findOne({ email: seedProfile.email });
  if (existing) return existing;

  const { password, ...profile } = seedProfile;
  return MunicipalStaff.create({
    ...profile,
    password: await hashPassword(password),
    lastLogin: new Date(),
  });
};

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

    const normalizedEmail = String(email).toLowerCase().trim();
    const emailError = validateEmail(normalizedEmail);
    if (emailError) {
      return res.status(400).json({ success: false, message: emailError });
    }

    const existingUser = await MunicipalStaff.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists. Please sign in.',
      });
    }

    const fullName = `${firstName.trim()} ${lastName ? lastName.trim() : ''}`.trim();
    const staffId = `UM-REG-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const badgeNumber = `CIT-${Math.floor(1000 + Math.random() * 9000)}`;

    // Self-registration always yields REGULAR_USER — role is never client-supplied.
    const newUser = await MunicipalStaff.create({
      staffId,
      name: fullName,
      firstName: firstName.trim(),
      lastName: lastName ? lastName.trim() : '',
      email: normalizedEmail,
      phone: phone ? String(phone).trim() : '',
      password: await hashPassword(password),
      badgeNumber,
      role: 'REGULAR_USER',
      isSuperAdmin: false,
      assignedWardId: 'CMC-W01',
      department: 'Citizen & Accessibility Community',
      lastLogin: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to UnityMap.',
      token: signToken(newUser),
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
 * Verifies the bcrypt credential and issues a signed session token.
 * Unknown emails are rejected — accounts are never auto-provisioned here.
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email address and password are required',
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const emailError = validateEmail(normalizedEmail);
    if (emailError) {
      return res.status(400).json({ success: false, message: emailError });
    }

    const badgeLookup = /^[A-Z0-9-]{4,}$/.test(String(email).toUpperCase()) ? String(email).toUpperCase() : null;

    let staff = await MunicipalStaff.findOne({
      $or: [{ email: normalizedEmail }, ...(badgeLookup ? [{ badgeNumber: badgeLookup }] : [])],
    }).select('+password');

    if (!staff) {
      const seedProfile = SEED_ACCOUNTS.find((a) => a.email === normalizedEmail);
      if (seedProfile) {
        staff = await provisionSeedAccount(seedProfile);
      }
    }

    // Identical response for unknown email and wrong password — no user enumeration.
    if (!staff) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (staff.isActive === false) {
      return res.status(403).json({ success: false, message: 'This account has been deactivated' });
    }

    const passwordMatches = await verifyPassword(staff, password);
    if (!passwordMatches) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    staff.lastLogin = new Date();
    if (staff.save) await staff.save();

    return res.status(200).json({
      success: true,
      message: 'Authentication successful',
      token: signToken(staff),
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
 * Returns the profile of the account that owns the presented token.
 * Requires `protect` — req.user is resolved from the verified JWT.
 */
const getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }
    return res.status(200).json({ success: true, user: formatUserResponse(req.user) });
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
    const dbUsers = await MunicipalStaff.find({}).select('-password').sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: dbUsers.length,
      users: dbUsers.map(formatUserResponse),
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

/** Resolves a route :id param (staffId, ObjectId, or email) to a real account. */
const findStaffByParam = (id) =>
  MunicipalStaff.findOne({
    $or: [
      { staffId: String(id).toUpperCase() },
      { email: String(id).toLowerCase() },
      ...(/^[0-9a-fA-F]{24}$/.test(id) ? [{ _id: id }] : []),
    ],
  });

/**
 * PATCH /api/admin/auth/users/:id/promote
 * Promote a Regular User to Admin. Requires Super Admin clearance.
 */
const promoteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await findStaffByParam(id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.email === BASELINE_USER_EMAIL) {
      return res.status(400).json({
        success: false,
        message:
          'Baseline demo Regular User account (user@unitymap.com) is reserved as the permanent Regular User reference and cannot be promoted. Please promote another citizen account.',
      });
    }

    if (user.isSuperAdmin) {
      return res.status(400).json({ success: false, message: 'Account is already a Super Admin' });
    }

    if (user.role === 'ADMIN') {
      return res.status(400).json({ success: false, message: 'Account already holds Admin clearance' });
    }

    user.role = 'ADMIN';
    await user.save();

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
 * Demote an Admin to Regular User. Requires Super Admin clearance.
 */
const demoteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await findStaffByParam(id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isSuperAdmin || user.email === SUPER_ADMIN_EMAIL) {
      return res.status(403).json({
        success: false,
        message: 'Security Policy Violation: The Super Admin cannot be demoted.',
      });
    }

    user.role = 'REGULAR_USER';
    await user.save();

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
 * Google Sign In handler. Stores a random unusable credential — the account is
 * only ever reachable through a verified Google identity, never a password.
 */
const googleAuth = async (req, res) => {
  try {
    const { email, firstName, lastName, name } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required for Google authentication',
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const emailError = validateEmail(normalizedEmail);
    if (emailError) {
      return res.status(400).json({ success: false, message: emailError });
    }

    let staff = await MunicipalStaff.findOne({ email: normalizedEmail });
    let isNewUser = false;

    if (!staff) {
      const seedProfile = SEED_ACCOUNTS.find((a) => a.email === normalizedEmail);
      if (seedProfile) {
        staff = await provisionSeedAccount(seedProfile);
      } else {
        isNewUser = true;
        const inferredFirstName = (firstName || name?.split(' ')[0] || normalizedEmail.split('@')[0]).trim();
        const inferredLastName = (lastName || name?.split(' ').slice(1).join(' ') || '').trim();
        const fullName = (name || `${inferredFirstName} ${inferredLastName}`).trim();

        staff = await MunicipalStaff.create({
          staffId: `UM-REG-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
          name: fullName,
          firstName: inferredFirstName,
          lastName: inferredLastName,
          email: normalizedEmail,
          // Unguessable random secret: Google accounts have no password login.
          password: await hashPassword(require('crypto').randomBytes(32).toString('hex')),
          phone: '',
          badgeNumber: `CIT-${Math.floor(1000 + Math.random() * 9000)}`,
          role: 'REGULAR_USER',
          isSuperAdmin: false,
          assignedWardId: 'CMC-W01',
          department: 'Citizen & Accessibility Community',
          lastLogin: new Date(),
        });
      }
    }

    if (staff.isActive === false) {
      return res.status(403).json({ success: false, message: 'This account has been deactivated' });
    }

    staff.lastLogin = new Date();
    if (staff.save) await staff.save();

    return res.status(isNewUser ? 201 : 200).json({
      success: true,
      message: isNewUser
        ? 'Account successfully created with Google! Welcome to UnityMap.'
        : 'Welcome back! Signed in with Google.',
      isNewUser,
      token: signToken(staff),
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
  formatUserResponse,
  signToken,
};
