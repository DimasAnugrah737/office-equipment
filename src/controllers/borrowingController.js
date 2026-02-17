const Borrowing = require('../models/Borrowing');
const Item = require('../models/Item');
const User = require('../models/User');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const { Op, Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');
const { emitToUser, emitToAll } = require('../utils/socket');

// @desc    Create new borrowing request
// @route   POST /api/borrowings
// @access  Private
const createBorrowing = async (req, res) => {
  try {
    const { itemId, quantity, expectedReturnDate, purpose } = req.body;

    // 1. Validate if item exists and is available
    const item = await Item.findByPk(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    if (!item.isAvailable || item.availableQuantity < quantity) {
      return res.status(400).json({
        message: `Only ${item.availableQuantity} items available for borrowing`
      });
    }

    // 2. Create the borrowing record
    const borrowing = await Borrowing.create({
      userId: req.user.id,
      itemId,
      quantity,
      expectedReturnDate,
      purpose,
      status: 'pending'
    });

    // 3. Notify Officers (Admin can CRUD loan but Officer handles approval)
    const officers = await User.findAll({
      where: { role: 'officer' }
    });

    const notifications = officers.map(officer => ({
      userId: officer.id,
      title: 'New Borrowing Request',
      message: `${req.user.fullName} requested to borrow ${quantity}x ${item.name}`,
      type: 'borrow_request',
      path: '/borrowings',
      relatedBorrowingId: borrowing.id
    }));

    await Notification.bulkCreate(notifications);

    // 4. Log Activity
    await ActivityLog.create({
      userId: req.user.id,
      action: `Requested to borrow ${item.name}`,
      entityType: 'borrowing',
      entityId: borrowing.id,
      details: { quantity, expectedReturnDate }
    });

    // Broadcast to all users
    emitToAll('borrowing:created', { borrowingId: borrowing.id });

    res.status(201).json(borrowing);
  } catch (error) {
    console.error('Create borrowing error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all borrowings (Admin/Officer gets all, User gets only their own)
// @route   GET /api/borrowings
// @access  Private
const getBorrowings = async (req, res) => {
  try {
    let whereClause = {};

    // If user is not admin or officer, only show their own borrowings
    if (req.user.role === 'user') {
      whereClause = { userId: req.user.id };
    }

    const borrowings = await Borrowing.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'user', attributes: ['id', 'fullName', 'email', 'department'] },
        { model: Item, as: 'item', attributes: ['id', 'name', 'image', 'location'] },
        { model: User, as: 'approver', attributes: ['id', 'fullName'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(borrowings);
  } catch (error) {
    console.error('Get borrowings error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get borrowing by ID
// @route   GET /api/borrowings/:id
// @access  Private
const getBorrowingById = async (req, res) => {
  try {
    const borrowing = await Borrowing.findByPk(req.params.id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'fullName', 'email', 'department', 'position', 'phone'] },
        { model: Item, as: 'item', attributes: ['id', 'name', 'image', 'location', 'availableQuantity', 'quantity'] },
        { model: User, as: 'approver', attributes: ['id', 'fullName'] }
      ]
    });

    if (!borrowing) {
      return res.status(404).json({ message: 'Borrowing request not found' });
    }

    // Check permissions
    if (req.user.role === 'user' && borrowing.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(borrowing);
  } catch (error) {
    console.error('Get borrowing error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Approve borrowing request
// @route   PUT /api/borrowings/:id/approve
// @access  Private/Admin/Officer
const approveBorrowing = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { notes } = req.body;

    // Strict Role Check: Only Officer can approve
    if (req.user.role !== 'officer') {
      await t.rollback();
      return res.status(403).json({ message: 'Only officers are allowed to approve borrowing requests' });
    }

    const borrowing = await Borrowing.findByPk(req.params.id, {
      include: [{ model: Item, as: 'item' }],
      transaction: t
    });

    if (!borrowing) {
      await t.rollback();
      return res.status(404).json({ message: 'Borrowing request not found' });
    }

    if (borrowing.status !== 'pending') {
      await t.rollback();
      return res.status(400).json({ message: `Cannot approve request with status: ${borrowing.status}` });
    }

    // Check item availability again
    if (borrowing.item.availableQuantity < borrowing.quantity) {
      await t.rollback();
      return res.status(400).json({ message: 'Item is no longer available in the requested quantity' });
    }

    // Update borrowing status
    await borrowing.update({
      status: 'approved',
      approvedBy: req.user.id,
      approvedAt: new Date(),
      notes: notes || borrowing.notes
    }, { transaction: t });

    // Update item available quantity
    await borrowing.item.update({
      availableQuantity: borrowing.item.availableQuantity - borrowing.quantity
    }, { transaction: t });

    // Notify user
    await Notification.create({
      userId: borrowing.userId,
      title: 'Borrowing Approved',
      message: `Your request to borrow ${borrowing.item.name} has been approved.`,
      type: 'borrow_approved',
      path: '/my-borrowings',
      relatedBorrowingId: borrowing.id
    }, { transaction: t });

    // Log Activity
    await ActivityLog.create({
      userId: req.user.id,
      action: `Approved borrowing request for ${borrowing.item.name}`,
      entityType: 'borrowing',
      entityId: borrowing.id,
      details: { requesterId: borrowing.userId }
    }, { transaction: t });

    // REAL-TIME: Auto-reject other pending requests if quantity insufficient
    const remainingQty = borrowing.item.availableQuantity;
    const competingRequests = await Borrowing.findAll({
      where: {
        itemId: borrowing.itemId,
        status: 'pending',
        id: { [Op.ne]: borrowing.id },
        quantity: { [Op.gt]: remainingQty }
      },
      transaction: t
    });

    for (const req_to_reject of competingRequests) {
      await req_to_reject.update({
        status: 'rejected',
        approvedBy: req.user.id,
        approvedAt: new Date(),
        notes: 'Automatically rejected due to insufficient stock.'
      }, { transaction: t });

      // Notify competing user
      await Notification.create({
        userId: req_to_reject.userId,
        title: 'Borrowing Auto-Rejected',
        message: `Your request for ${borrowing.item.name} was automatically rejected due to insufficient stock.`,
        type: 'borrow_rejected',
        path: '/my-borrowings',
        relatedBorrowingId: req_to_reject.id
      }, { transaction: t });

      // Emit real-time event to competing user
      emitToUser(req_to_reject.userId, 'notification', {
        title: 'Borrowing Auto-Rejected',
        message: `Your request for ${borrowing.item.name} was automatically rejected.`,
        type: 'borrow_rejected'
      });
    }

    // Emit real-time event to approved user
    emitToUser(borrowing.userId, 'notification', {
      title: 'Borrowing Approved',
      message: `Your request for ${borrowing.item.name} has been approved.`,
      type: 'borrow_approved'
    });

    // Broadcast to all users
    emitToAll('borrowing:approved', { borrowingId: borrowing.id });

    await t.commit();
    res.json({ message: 'Borrowing request approved', borrowing });
  } catch (error) {
    if (t) await t.rollback();
    console.error('Approve borrowing error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Reject borrowing request
// @route   PUT /api/borrowings/:id/reject
// @access  Private/Admin/Officer
const rejectBorrowing = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { reason, notes } = req.body; // frontend sends 'reason' in some places, 'notes' in others

    // Strict Role Check: Only Officer can reject
    if (req.user.role !== 'officer') {
      await t.rollback();
      return res.status(403).json({ message: 'Only officers are allowed to reject borrowing requests' });
    }

    const borrowing = await Borrowing.findByPk(req.params.id, {
      include: [{ model: Item, as: 'item' }],
      transaction: t
    });

    if (!borrowing) {
      await t.rollback();
      return res.status(404).json({ message: 'Borrowing request not found' });
    }

    if (borrowing.status !== 'pending') {
      await t.rollback();
      return res.status(400).json({ message: 'Can only reject pending requests' });
    }

    const rejectionReason = reason || notes || 'No reason provided';

    await borrowing.update({
      status: 'rejected',
      approvedBy: req.user.id,
      approvedAt: new Date(),
      notes: rejectionReason
    }, { transaction: t });

    // Notify user
    await Notification.create({
      userId: borrowing.userId,
      title: 'Borrowing Rejected',
      message: `Your request to borrow ${borrowing.item.name} was rejected. Reason: ${rejectionReason}`,
      type: 'borrow_rejected',
      path: '/my-borrowings',
      relatedBorrowingId: borrowing.id
    }, { transaction: t });

    // Log Activity
    await ActivityLog.create({
      userId: req.user.id,
      action: `Rejected borrowing request for ${borrowing.item.name}`,
      entityType: 'borrowing',
      entityId: borrowing.id,
      details: { reason: rejectionReason }
    }, { transaction: t });

    // Emit real-time event to rejected user
    emitToUser(borrowing.userId, 'notification', {
      title: 'Borrowing Rejected',
      message: `Your request for ${borrowing.item.name} was rejected.`,
      type: 'borrow_rejected'
    });

    // Broadcast to all users
    emitToAll('borrowing:rejected', { borrowingId: borrowing.id });

    await t.commit();
    res.json({ message: 'Borrowing request rejected', borrowing });
  } catch (error) {
    if (t) await t.rollback();
    console.error('Reject borrowing error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const Category = require('../models/Category');

// @desc    Mark items as picked up/borrowed
// @route   PUT /api/borrowings/:id/borrow
// @access  Private/Admin/Officer
const markAsBorrowed = async (req, res) => {
  try {
    const { conditionBefore, notes } = req.body;
    if (req.user.role !== 'officer') {
      return res.status(403).json({ message: 'Only officers are allowed to mark items as borrowed' });
    }

    const borrowing = await Borrowing.findByPk(req.params.id);

    if (!borrowing) {
      return res.status(404).json({ message: 'Borrowing request not found' });
    }

    if (borrowing.status !== 'approved') {
      return res.status(400).json({ message: 'Request must be approved before marking as borrowed' });
    }

    await borrowing.update({
      status: 'borrowed',
      borrowDate: new Date(),
      conditionBefore: conditionBefore || 'good',
      notes: notes || borrowing.notes
    });

    // Broadcast to all users
    emitToAll('borrowing:borrowed', { borrowingId: borrowing.id });

    res.json({ message: 'Item marked as borrowed', borrowing });
  } catch (error) {
    console.error('Mark as borrowed error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Request to return items
// @route   PUT /api/borrowings/:id/return-request
// @access  Private
const requestReturn = async (req, res) => {
  try {
    const { conditionAfter, notes } = req.body;
    const borrowing = await Borrowing.findByPk(req.params.id);

    if (!borrowing) {
      return res.status(404).json({ message: 'Borrowing record not found' });
    }

    if (borrowing.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (borrowing.status !== 'borrowed') {
      return res.status(400).json({ message: 'Can only request return for borrowed items' });
    }

    await borrowing.update({
      status: 'returning',
      conditionAfter: conditionAfter || 'good',
      notes: notes || borrowing.notes
    });

    // Notify Admins and Officers
    const officials = await User.findAll({ where: { role: { [Op.in]: ['admin', 'officer'] } } });
    const notifications = officials.map(o => ({
      userId: o.id,
      title: 'Return Request',
      message: `${req.user.fullName} is returning ${borrowing.quantity}x items.`,
      type: 'return_request',
      path: '/borrowings',
      relatedBorrowingId: borrowing.id
    }));
    await Notification.bulkCreate(notifications);

    // Broadcast to all users
    emitToAll('borrowing:returned', { borrowingId: borrowing.id });

    res.json({ message: 'Return request submitted', borrowing });
  } catch (error) {
    console.error('Request return error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Approve return and update stock
// @route   PUT /api/borrowings/:id/approve-return
// @access  Private/Admin/Officer
const approveReturn = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    if (req.user.role !== 'officer') {
      await t.rollback();
      return res.status(403).json({ message: 'Only officers are allowed to approve returns' });
    }
    const borrowing = await Borrowing.findByPk(req.params.id, {
      include: [{ model: Item, as: 'item' }],
      transaction: t
    });

    if (!borrowing) {
      await t.rollback();
      return res.status(404).json({ message: 'Borrowing record not found' });
    }

    if (borrowing.status !== 'returning') {
      await t.rollback();
      return res.status(400).json({ message: 'Item must be in returning state to approve return' });
    }

    if (borrowing.returnApprovedAt) {
      await t.rollback();
      return res.status(400).json({ message: 'Return has already been approved' });
    }

    // Update borrowing
    await borrowing.update({
      status: 'returned',
      actualReturnDate: new Date(),
      returnApprovedBy: req.user.id,
      returnApprovedAt: new Date()
    }, { transaction: t });

    // Restore item stock
    await borrowing.item.update({
      availableQuantity: borrowing.item.availableQuantity + borrowing.quantity
    }, { transaction: t });

    // Notify user
    await Notification.create({
      userId: borrowing.userId,
      title: 'Return Approved',
      message: `Your return of ${borrowing.item.name} has been approved.`,
      type: 'return_approved',
      path: '/my-borrowings',
      relatedBorrowingId: borrowing.id
    }, { transaction: t });

    // Log Activity
    await ActivityLog.create({
      userId: req.user.id,
      action: `Approved return for ${borrowing.item.name}`,
      entityType: 'borrowing',
      entityId: borrowing.id
    }, { transaction: t });

    // Emit real-time event to user
    emitToUser(borrowing.userId, 'notification', {
      title: 'Return Approved',
      message: `Your return of ${borrowing.item.name} has been approved.`,
      type: 'return_approved'
    });

    // Broadcast to all users
    emitToAll('borrowing:return_approved', { borrowingId: borrowing.id });

    await t.commit();
    res.json({ message: 'Return approved and stock updated', borrowing });
  } catch (error) {
    if (t) await t.rollback();
    console.error('Approve return error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Check and alert for overdue borrowings
const checkOverdueBorrowings = async () => {
  try {
    const overdueList = await Borrowing.findAll({
      where: {
        status: 'borrowed',
        expectedReturnDate: { [Op.lt]: new Date() }
      },
      include: [{ model: Item, as: 'item' }]
    });

    for (const borrowing of overdueList) {
      // 1. Notify User
      await Notification.findOrCreate({
        where: {
          userId: borrowing.userId,
          relatedBorrowingId: borrowing.id,
          type: 'system', // or overdue_warning if we add to ENUM
          title: 'Overdue Warning'
        },
        defaults: {
          message: `Your borrowing for ${borrowing.item.name} is overdue! Please return it immediately.`,
          path: '/my-borrowings'
        }
      });

      // 2. Notify Officers (one report per overdue item is fine for now)
      const officers = await User.findAll({ where: { role: 'officer' } });
      for (const officer of officers) {
        await Notification.findOrCreate({
          where: {
            userId: officer.id,
            relatedBorrowingId: borrowing.id,
            type: 'system',
            title: 'Overdue Report'
          },
          defaults: {
            message: `User ${borrowing.userId} has an overdue item: ${borrowing.item.name}`,
            path: '/borrowings'
          }
        });
      }
    }
  } catch (error) {
    console.error('Overdue check error:', error.message);
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/borrowings/stats/dashboard
// @access  Private/Admin/Officer
const getDashboardStats = async (req, res) => {
  try {
    // 1. Run overdue check (silent failure)
    try {
      await checkOverdueBorrowings();
    } catch (overdueError) {
      console.error('Overdue check error in dashboard:', overdueError.message);
    }

    // 2. Simple Counts
    const totalBorrowings = await Borrowing.count();
    const pendingBorrowings = await Borrowing.count({ where: { status: 'pending' } });
    const borrowedBorrowings = await Borrowing.count({ where: { status: 'borrowed' } });
    const returnedBorrowings = await Borrowing.count({ where: { status: 'returned' } });
    const overdueBorrowings = await Borrowing.count({
      where: {
        status: 'borrowed',
        expectedReturnDate: { [Op.lt]: new Date() }
      }
    });

    const totalItems = await Item.count();
    const totalUsers = await User.count();

    console.log('Dashboard Counts:', { totalItems, totalUsers, totalBorrowings });

    // 3. Distribution Stats
    let formattedStatusStats = [];
    try {
      const statusCounts = await Borrowing.findAll({
        attributes: [
          ['status', 'status_label'],
          [Sequelize.fn('COUNT', Sequelize.col('status')), 'count']
        ],
        group: ['status'],
        raw: true
      });
      formattedStatusStats = statusCounts.map(s => ({
        _id: s.status_label,
        count: parseInt(s.count) || 0
      }));
    } catch (distError) {
      console.error('Distribution stats error:', distError.message);
    }

    // 4. Monthly Trends
    let formattedTrends = [];
    try {
      const monthlyTrends = await Borrowing.findAll({
        attributes: [
          [Sequelize.literal('MONTH(createdAt)'), 'month_val'],
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'month_count']
        ],
        group: [Sequelize.literal('MONTH(createdAt)')],
        order: [[Sequelize.literal('MONTH(createdAt)'), 'ASC']],
        raw: true
      });

      formattedTrends = monthlyTrends.map(t => ({
        _id: { month: t.month_val },
        count: parseInt(t.month_count) || 0
      }));
    } catch (trendError) {
      console.error('Monthly trends error:', trendError.message);
    }

    res.json({
      totalBorrowings,
      pendingBorrowings,
      borrowedBorrowings,
      returnedBorrowings,
      overdueBorrowings,
      totalItems,
      totalUsers,
      statusStats: formattedStatusStats,
      monthlyTrends: formattedTrends
    });
  } catch (error) {
    console.error('Critical Dashboard Stats Fail:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get current user borrowing history
// @route   GET /api/borrowings/user/history
// @access  Private
const getUserBorrowingHistory = async (req, res) => {
  try {
    const history = await Borrowing.findAll({
      where: { userId: req.user.id },
      include: [
        { model: Item, as: 'item', attributes: ['name', 'image'] },
        { model: User, as: 'approver', attributes: ['fullName'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(history);
  } catch (error) {
    console.error('Get borrowing history error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createBorrowing,
  getBorrowings,
  getBorrowingById,
  approveBorrowing,
  rejectBorrowing,
  markAsBorrowed,
  requestReturn,
  approveReturn,
  getDashboardStats,
  getUserBorrowingHistory
};
