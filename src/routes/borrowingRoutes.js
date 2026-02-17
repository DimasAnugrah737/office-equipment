const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/borrowingController');
const { protect, authorize } = require('../middleware/auth');

// Protect all routes
router.use(protect);

// Specific routes first (before /:id)
router.get('/stats/dashboard', getDashboardStats);
router.get('/user/history', getUserBorrowingHistory);

// User routes
router.post('/', createBorrowing);

// Admin/Officer routes
router.get('/', getBorrowings);
router.get('/:id', getBorrowingById);

// Approval routes (Officer only)
router.put('/:id/approve', authorize('officer'), approveBorrowing);
router.put('/:id/reject', authorize('officer'), rejectBorrowing);
router.put('/:id/borrow', authorize('officer'), markAsBorrowed);

// Return routes
router.put('/:id/return-request', requestReturn);
router.put('/:id/approve-return', authorize('officer'), approveReturn);

module.exports = router;