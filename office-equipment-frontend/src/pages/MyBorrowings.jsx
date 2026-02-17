import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { borrowingsAPI } from '../api/borrowings';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { FiEye, FiCalendar, FiPackage, FiClock, FiSearch, FiFilter, FiPlus } from 'react-icons/fi';
import { FaCheckCircle, FaTimesCircle, FaClock } from 'react-icons/fa';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const MyBorrowings = () => {
  const { user } = useAuth();
  const socket = useSocket();
  const [borrowings, setBorrowings] = useState([]);
  const [filteredBorrowings, setFilteredBorrowings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingBorrowing, setViewingBorrowing] = useState(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnNotes, setReturnNotes] = useState('');
  const [selectedBorrowingForReturn, setSelectedBorrowingForReturn] = useState(null);

  const { execute: fetchMyBorrowings, loading } = useApi(borrowingsAPI.getUserBorrowingHistory);
  const { execute: requestReturn } = useApi(borrowingsAPI.requestReturn);

  useEffect(() => {
    loadBorrowings();
  }, []);

  // Socket listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleBorrowingUpdate = () => {
      loadBorrowings();
    };

    socket.on('borrowing:created', handleBorrowingUpdate);
    socket.on('borrowing:approved', handleBorrowingUpdate);
    socket.on('borrowing:rejected', handleBorrowingUpdate);
    socket.on('borrowing:borrowed', handleBorrowingUpdate);
    socket.on('borrowing:returned', handleBorrowingUpdate);
    socket.on('borrowing:return_approved', handleBorrowingUpdate);

    return () => {
      socket.off('borrowing:created', handleBorrowingUpdate);
      socket.off('borrowing:approved', handleBorrowingUpdate);
      socket.off('borrowing:rejected', handleBorrowingUpdate);
      socket.off('borrowing:borrowed', handleBorrowingUpdate);
      socket.off('borrowing:returned', handleBorrowingUpdate);
      socket.off('borrowing:return_approved', handleBorrowingUpdate);
    };
  }, [socket]);

  useEffect(() => {
    filterBorrowings();
  }, [borrowings, searchTerm, statusFilter]);

  const loadBorrowings = async () => {
    try {
      const data = await fetchMyBorrowings();
      setBorrowings(data);
    } catch (error) {
      console.error('Failed to load borrowings:', error);
    }
  };

  const filterBorrowings = () => {
    let filtered = [...borrowings];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((borrowing) => {
        const itemName = typeof borrowing.item === 'object' ? borrowing.item.name.toLowerCase() : '';
        return itemName.includes(term);
      });
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((borrowing) => borrowing.status === statusFilter);
    }

    setFilteredBorrowings(filtered);
  };

  const handleView = (borrowing) => {
    setViewingBorrowing(borrowing);
    setIsViewModalOpen(true);
  };

  const handleReturnClick = (borrowing) => {
    if (borrowing.status !== 'borrowed') {
      toast.error('Only borrowed items can be returned');
      return;
    }

    setSelectedBorrowingForReturn(borrowing);
    setReturnNotes('');
    setIsReturnModalOpen(true);
  };

  const handleReturnSubmit = async () => {
    if (!selectedBorrowingForReturn) return;

    try {
      await requestReturn(selectedBorrowingForReturn.id, 'good', returnNotes);
      toast.success('Return request submitted successfully');
      setIsReturnModalOpen(false);
      setSelectedBorrowingForReturn(null);
      setReturnNotes('');
      loadBorrowings();
    } catch (error) {
      console.error('Failed to submit return request:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      borrowed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      returned: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      returning: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    };
    return colors[status] || colors.pending;
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: <FaClock className="mr-1" />,
      approved: <FaCheckCircle className="mr-1" />,
      borrowed: <FaCheckCircle className="mr-1" />,
      returned: <FaCheckCircle className="mr-1" />,
      returning: <FaClock className="mr-1" />,
      rejected: <FaTimesCircle className="mr-1" />,
    };
    return icons[status] || <FaClock className="mr-1" />;
  };

  const isOverdue = (expectedReturnDate) => {
    return new Date(expectedReturnDate) < new Date();
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Borrowings</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Track your equipment requests and history
          </p>
        </div>
        <Link
          to="/browse-items"
          className="btn-primary w-full sm:w-auto flex items-center justify-center"
        >
          <FiPlus className="mr-2" />
          Request New Item
        </Link>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="filter-grid grid-cols-1 sm:grid-cols-2">
          <div className="filter-group">
            <label className="filter-label">
              Search Items
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
                placeholder="Search by item name..."
              />
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">
              Status
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiFilter className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field pl-10"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="borrowed">Borrowed</option>
                <option value="returned">Returned</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Borrowings List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredBorrowings.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-24 w-24 text-gray-400">
              <FiPackage className="h-full w-full" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              No borrowings found
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {borrowings.length === 0
                ? "You haven't borrowed any items yet."
                : "No borrowings match your search criteria."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="table-header">Item</th>
                    <th className="table-header">Quantity</th>
                    <th className="table-header">Borrow Date</th>
                    <th className="table-header">Return Date</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredBorrowings.map((borrowing) => (
                    <tr key={borrowing.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="table-cell">
                        <div className="flex items-center">
                          <FiPackage className="mr-2 text-gray-400" />
                          <span className="font-medium text-gray-900 dark:text-white">
                            {typeof borrowing.item === 'object' ? borrowing.item.name : 'Loading...'}
                          </span>
                        </div>
                      </td>
                      <td className="table-cell font-bold text-primary-600 dark:text-primary-400">{borrowing.quantity}</td>
                      <td className="table-cell">
                        <div className="flex items-center text-xs">
                          <FiCalendar className="mr-1.5 text-gray-400" />
                          {format(new Date(borrowing.borrowDate), 'dd MMM yyyy')}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center text-xs">
                          <FiCalendar className="mr-1.5 text-gray-400" />
                          <span className={isOverdue(borrowing.expectedReturnDate) ? 'text-red-600 dark:text-red-400 font-semibold' : ''}>
                            {format(new Date(borrowing.expectedReturnDate), 'dd MMM yyyy')}
                          </span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={`inline - flex items - center px - 2 py - 0.5 rounded - full text - [10px] font - bold uppercase ${getStatusColor(borrowing.status)} `}>
                          {getStatusIcon(borrowing.status)}
                          {borrowing.status}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleView(borrowing)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <FiEye size={18} />
                          </button>

                          {borrowing.status === 'borrowed' && !borrowing.returnApprovedAt && (
                            <button
                              onClick={() => handleReturnClick(borrowing)}
                              className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                              title="Request Return"
                            >
                              <FiClock size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4 p-4">
              {filteredBorrowings.map((borrowing) => (
                <div key={borrowing.id} className="card-mobile">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
                        <FiPackage className="text-gray-500" size={20} />
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                          {typeof borrowing.item === 'object' ? borrowing.item.name : 'Unknown Item'}
                        </h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Borrowed: {format(new Date(borrowing.borrowDate), 'dd/MM/yyyy')}
                        </p>
                      </div>
                    </div>
                    <span className={`px - 2 py - 0.5 rounded - full text - [10px] font - bold uppercase ${getStatusColor(borrowing.status)} `}>
                      {borrowing.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-semibold">Quantity</p>
                      <p className="text-sm font-bold text-primary-600 dark:text-primary-400">{borrowing.quantity}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-semibold">Return By</p>
                      <p className={`text - sm dark: text - gray - 300 ${isOverdue(borrowing.expectedReturnDate) ? 'text-red-600 font-bold' : ''} `}>
                        {format(new Date(borrowing.expectedReturnDate), 'dd/MM/yyyy')}
                      </p>
                    </div>
                    <div className="col-span-2 flex justify-end space-x-2 mt-2">
                      <button
                        onClick={() => handleView(borrowing)}
                        className="flex-1 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg flex items-center justify-center text-xs font-semibold"
                      >
                        <FiEye className="mr-1.5" size={14} /> View
                      </button>
                      {borrowing.status === 'borrowed' && !borrowing.returnApprovedAt && (
                        <button
                          onClick={() => handleReturnClick(borrowing)}
                          className="flex-1 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg flex items-center justify-center text-xs font-semibold"
                        >
                          <FiClock className="mr-1.5" size={14} /> Return
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="card border-l-4 border-l-blue-500">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 mr-4">
              <FiPackage className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white">
                {borrowings.length}
              </p>
            </div>
          </div>
        </div>

        <div className="card border-l-4 border-l-green-500">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 mr-4">
              <FaCheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white">
                {borrowings.filter(b => b.status === 'borrowed').length}
              </p>
            </div>
          </div>
        </div>

        <div className="card border-l-4 border-l-yellow-500">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 mr-4">
              <FaClock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pending</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white">
                {borrowings.filter(b => b.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* View Borrowing Modal */}
      {isViewModalOpen && viewingBorrowing && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => setIsViewModalOpen(false)}
            />

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Borrowing Details
                </h3>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Item</p>
                      <p className="font-medium">
                        {typeof viewingBorrowing.item === 'object' ? viewingBorrowing.item.name : 'Loading...'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Quantity</p>
                      <p className="font-medium">{viewingBorrowing.quantity}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Borrow Date</p>
                      <p className="font-medium">
                        {format(new Date(viewingBorrowing.borrowDate), 'PP')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Expected Return</p>
                      <p className="font-medium">
                        {format(new Date(viewingBorrowing.expectedReturnDate), 'PP')}
                      </p>
                    </div>
                  </div>

                  {viewingBorrowing.purpose && (
                    <div className="pt-4 border-t dark:border-gray-700">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Purpose</p>
                      <p className="font-medium">{viewingBorrowing.purpose}</p>
                    </div>
                  )}

                  {viewingBorrowing.notes && (
                    <div className="pt-4 border-t dark:border-gray-700">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Notes</p>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <p className="text-gray-800 dark:text-gray-300">{viewingBorrowing.notes}</p>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t dark:border-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Status</p>
                    <span
                      className={`inline - flex items - center px - 2.5 py - 0.5 rounded - full text - xs font - medium ${getStatusColor(
                        viewingBorrowing.status
                      )
                        } `}
                    >
                      {getStatusIcon(viewingBorrowing.status)}
                      {viewingBorrowing.status}
                    </span>
                  </div>

                  {viewingBorrowing.approver && (
                    <div className="pt-4 border-t dark:border-gray-700">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Approved By</p>
                      <p className="font-medium">
                        {typeof viewingBorrowing.approver === 'object'
                          ? viewingBorrowing.approver.fullName
                          : 'Loading...'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsViewModalOpen(false)}
                    className="btn-secondary"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Return Request Modal */}
      {isReturnModalOpen && selectedBorrowingForReturn && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => setIsReturnModalOpen(false)}
            />

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full sm:p-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Request Item Return
                </h3>

                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Are you sure you want to return this item?
                  </p>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="font-medium">
                      {typeof selectedBorrowingForReturn.item === 'object'
                        ? selectedBorrowingForReturn.item.name
                        : 'Loading...'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Borrowed on {format(new Date(selectedBorrowingForReturn.borrowDate), 'PP')}
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Return Notes (Optional)
                  </label>
                  <textarea
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    rows="3"
                    className="input-field"
                    placeholder="Add any notes about the return condition..."
                  />
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsReturnModalOpen(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleReturnSubmit}
                    className="btn-primary"
                  >
                    Submit Return Request
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBorrowings;