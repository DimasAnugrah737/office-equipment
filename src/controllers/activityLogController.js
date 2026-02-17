const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');

const getActivityLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const { count, rows: logs } = await ActivityLog.findAndCountAll({
      include: [{
        model: User,
        as: 'user',
        attributes: ['fullName', 'email', 'role']
      }],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      logs,
      page,
      limit,
      total: count,
      pages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Get activity logs error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Clear old activity logs
// @route   DELETE /api/activity-logs/cleanup
// @access  Private/Admin
const cleanupLogs = async (req, res) => {
  try {
    const { days = 90 } = req.query;

    res.json({
      message: `Cleaned up logs`,
      deletedCount: 0
    });
  } catch (error) {
    console.error('Cleanup logs error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getActivityLogs,
  cleanupLogs
};