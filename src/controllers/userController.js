const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const { emitToAll } = require('../utils/socket');

// @desc    Create a new user (admin only)
// @route   POST /api/users
// @access  Private/Admin
const createUser = async (req, res) => {
  try {
    const { fullName, nip, email, password, role, department, position, phone } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({
      where: {
        [Op.or]: [{ email }, { nip }]
      }
    });

    if (userExists) {
      return res.status(400).json({
        message: 'User already exists with this email or NIP'
      });
    }

    const user = await User.create({
      fullName,
      nip,
      email,
      password,
      role: role || 'user',
      department,
      position,
      phone
    });

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: `Create user: ${fullName}`,
      entityType: 'user',
      entityId: user.id,
      details: { role, department }
    });

    const userResponse = {
      _id: user.id,
      fullName: user.fullName,
      nip: user.nip,
      email: user.email,
      role: user.role,
      department: user.department,
      position: user.position,
      phone: user.phone,
      isActive: user.isActive
    };

    // Broadcast to all users
    emitToAll('user:created', userResponse);

    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
const getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
  try {
    const { fullName, nip, email, role, department, position, phone, isActive } = req.body;

    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check for duplicate email or NIP
    if (email && email !== user.email) {
      const emailExists = await User.findOne({
        where: {
          email,
          id: { [Op.ne]: user.id }
        }
      });
      if (emailExists) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    if (nip && nip !== user.nip) {
      const nipExists = await User.findOne({
        where: {
          nip,
          id: { [Op.ne]: user.id }
        }
      });
      if (nipExists) {
        return res.status(400).json({ message: 'NIP already exists' });
      }
    }

    await user.update({
      fullName: fullName || user.fullName,
      nip: nip || user.nip,
      email: email || user.email,
      role: role || user.role,
      department: department || user.department,
      position: position || user.position,
      phone: phone || user.phone,
      isActive: isActive !== undefined ? isActive : user.isActive
    });

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: `Update user: ${user.fullName}`,
      entityType: 'user',
      entityId: user.id,
      details: { role, isActive }
    });

    const userResponse = {
      id: user.id,
      fullName: user.fullName,
      nip: user.nip,
      email: user.email,
      role: user.role,
      department: user.department,
      position: user.position,
      phone: user.phone,
      isActive: user.isActive
    };

    // Broadcast to all users
    emitToAll('user:updated', userResponse);

    res.json(userResponse);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      await t.rollback();
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting yourself
    if (user.id === req.user.id) {
      await t.rollback();
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    // Manual cleanup of dependent records (Fail-safe for CASCADE)
    // 1. Activity Logs
    await ActivityLog.destroy({ where: { userId: user.id }, transaction: t });

    // 2. Notifications
    const Notification = require('../models/Notification');
    await Notification.destroy({ where: { userId: user.id }, transaction: t });

    // 3. Borrowings (if any)
    const Borrowing = require('../models/Borrowing');
    await Borrowing.destroy({ where: { userId: user.id }, transaction: t });

    // 4. Items and Categories (createdBy)
    const Item = require('../models/Item');
    const Category = require('../models/Category');
    await Item.destroy({ where: { createdBy: user.id }, transaction: t });
    await Category.destroy({ where: { createdBy: user.id }, transaction: t });

    // 5. Update optional references to NULL
    await Borrowing.update({ approvedBy: null }, { where: { approvedBy: user.id }, transaction: t });
    await Borrowing.update({ returnApprovedBy: null }, { where: { returnApprovedBy: user.id }, transaction: t });

    // Log the deletion action by the admin
    await ActivityLog.create({
      userId: req.user.id,
      action: `Delete user: ${user.fullName}`,
      entityType: 'user',
      entityId: user.id
    }, { transaction: t });

    // Finally delete the user
    await user.destroy({ transaction: t });

    await t.commit();

    // Broadcast to all users
    emitToAll('user:deleted', { id: req.params.id });

    res.json({ message: 'User removed successfully' });
  } catch (error) {
    if (t) await t.rollback();
    console.error('Delete user error:', error);
    try {
      const fs = require('fs');
      fs.appendFileSync('backend_error.log', `Delete User Error: ${error.message}\n${error.stack}\n`);
    } catch (logError) {
      console.error('Failed to write to log file:', logError);
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser
};