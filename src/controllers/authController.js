// authController.js - PERBAIKAN
const User = require('../models/User'); // ✅ Dari controllers ke models
const jwt = require('jsonwebtoken');
const ActivityLog = require('../models/ActivityLog'); // ✅ Path yang sama
const { Op } = require('sequelize');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Check if identifier is email or NIP
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: identifier },
          { nip: identifier }
        ]
      }
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is disabled' });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Log activity
    await ActivityLog.create({
      userId: user.id,
      action: 'User login',
      entityType: 'user',
      details: { loginMethod: 'email/password' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      _id: user.id,
      fullName: user.fullName,
      nip: user.nip,
      email: user.email,
      role: user.role,
      department: user.department,
      position: user.position,
      themePreference: user.themePreference,
      token: generateToken(user.id)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update theme preference
// @route   PUT /api/auth/theme
// @access  Private
const updateTheme = async (req, res) => {
  try {
    const { themePreference } = req.body;

    if (!['light', 'dark'].includes(themePreference)) {
      return res.status(400).json({ message: 'Invalid theme preference' });
    }

    await User.update(
      { themePreference },
      { where: { id: req.user.id } }
    );

    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    res.json(user);
  } catch (error) {
    console.error('Update theme error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'User logout',
      entityType: 'user',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  login,
  getMe,
  updateTheme,
  logout
};