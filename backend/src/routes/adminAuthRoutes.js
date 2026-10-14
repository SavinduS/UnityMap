const express = require('express');
const router = express.Router();
const { protect, adminOnly, superAdminOnly } = require('../middleware/auth');
const {
  register,
  login,
  googleAuth,
  getMe,
  getUsers,
  promoteUser,
  demoteUser,
} = require('../controllers/adminAuthController');

// Public — credential exchange endpoints.
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);

// Authenticated — returns the token owner's own profile.
router.get('/me', protect, getMe);

// Privileged — user directory and role management.
router.get('/users', protect, adminOnly, getUsers);
router.patch('/users/:id/promote', protect, superAdminOnly, promoteUser);
router.patch('/users/:id/demote', protect, superAdminOnly, demoteUser);

module.exports = router;
