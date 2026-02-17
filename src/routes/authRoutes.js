const express = require('express');
const router = express.Router();
const { login, getMe, updateTheme, logout } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/theme', protect, updateTheme);
router.post('/logout', protect, logout);

module.exports = router;