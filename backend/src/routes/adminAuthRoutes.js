const express = require('express');
const router = express.Router();
const {
  register,
  login,
  googleAuth,
  getMe,
  getUsers,
  promoteUser,
  demoteUser,
} = require('../controllers/adminAuthController');

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.get('/me', getMe);
router.get('/users', getUsers);
router.patch('/users/:id/promote', promoteUser);
router.patch('/users/:id/demote', demoteUser);

module.exports = router;
