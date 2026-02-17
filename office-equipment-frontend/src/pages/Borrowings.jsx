import React, { useState, useEffect } from 'react';
import { borrowingsAPI } from '../api/borrowings';
import { usersAPI } from '../api/users';
import { itemsAPI } from '../api/items';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { FiEye, FiCheck, FiX, FiCalendar, FiPackage, FiFilter, FiDownload } from 'react-icons/fi';
import { FaClock, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';

const Borrowings = () => {
  const { user } = useAuth();
  const socket = useSocket();
  const [borrowings, setBorrowings] = useState([]);
  const [filteredBorrowings, setFilteredBorrowings] = useState([]);
  const [users, setUsers] = useState([]);
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [itemFilter, setItemFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingBorrowing, setViewingBorrowing] = useState(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState('');
  const [selectedBorrowing, setSelectedBorrowing] = useState(null);
  const [actionNotes, setActionNotes] = useState('');

  const { execute: fetchBorrowings, loading } = useApi(borrowingsAPI.getAllBorrowings);
  const { execute: fetchUsers } = useApi(usersAPI.getAllUsers);
  const { execute: fetchItems } = useApi(itemsAPI.getAllItems);
  const { execute: approveBorrowing } = useApi(borrowingsAPI.approveBorrowing);
  const { execute: rejectBorrowing } = useApi(borrowingsAPI.rejectBorrowing);
  const { execute: markAsBorrowed } = useApi(borrowingsAPI.markAsBorrowed);
  const { execute: requestReturn } = useApi(borrowingsAPI.requestReturn);
  const { execute: approveReturn } = useApi(borrowingsAPI.approveReturn);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterBorrowings();
  }, [borrowings, searchTerm, statusFilter, userFilter, itemFilter, dateFilter, dateRange]);

  const loadData = async () => {
    try {
      const [borrowingsData, usersData, itemsData] = await Promise.all([
        fetchBorrowings(),
        fetchUsers(),
        fetchItems(),
      ]);
      setBorrowings(borrowingsData);
      setUsers(usersData);
      setItems(itemsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  // Socket listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleBorrowingUpdate = () => {
      loadData(); // Reload all borrowing data
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

  const filterBorrowings = () => {
    let filtered = [...borrowings];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((borrowing) => {
        const userName = typeof borrowing.user === 'object' ? borrowing.user.fullName.toLowerCase() : '';
        const itemName = typeof borrowing.item === 'object' ? borrowing.item.name.toLowerCase() : '';
        return userName.includes(term) || itemName.includes(term);
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((borrowing) => borrowing.status === statusFilter);
    }

    // User filter
    if (userFilter !== 'all') {
      filtered = filtered.filter((borrowing) =>
        typeof borrowing.user === 'object' ? borrowing.user.id === Number(userFilter) : borrowing.user === Number(userFilter)
      );
    }

    // Item filter
    if (itemFilter !== 'all') {
      filtered = filtered.filter((borrowing) =>
        typeof borrowing.item === 'object' ? borrowing.item.id === Number(itemFilter) : borrowing.item === Number(itemFilter)
      );
    }

    // Date filter
    if (dateFilter === 'today') {
      const today = format(new Date(), 'yyyy-MM-dd');
      filtered = filtered.filter((borrowing) =>
        format(new Date(borrowing.borrowDate), 'yyyy-MM-dd') === today
      );
    } else if (dateFilter === 'this_week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      filtered = filtered.filter((borrowing) =>
        new Date(borrowing.borrowDate) >= oneWeekAgo
      );
    } else if (dateFilter === 'custom' && dateRange.from && dateRange.to) {
      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);

      filtered = filtered.filter((borrowing) => {
        const borrowDate = new Date(borrowing.borrowDate);
        return borrowDate >= fromDate && borrowDate <= toDate;
      });
    }

    setFilteredBorrowings(filtered);
  };

  const handleView = (borrowing) => {
    setViewingBorrowing(borrowing);
    setIsViewModalOpen(true);
  };

  const handleAction = (borrowing, type) => {
    setSelectedBorrowing(borrowing);
    setActionType(type);
    setActionNotes('');
    setIsActionModalOpen(true);
  };

  const performAction = async () => {
    try {
      switch (actionType) {
        case 'approve':
          await approveBorrowing(selectedBorrowing.id, actionNotes);
          toast.success('Borrowing request approved');
          break;
        case 'reject':
          await rejectBorrowing(selectedBorrowing.id, actionNotes);
          toast.success('Borrowing request rejected');
          break;
        case 'borrow':
          await markAsBorrowed(selectedBorrowing.id, 'good', actionNotes);
          toast.success('Item marked as borrowed');
          break;
        case 'return':
          await requestReturn(selectedBorrowing.id, 'good', actionNotes);
          toast.success('Return requested');
          break;
        case 'approve_return':
          await approveReturn(selectedBorrowing.id, actionNotes);
          toast.success('Return approved');
          break;
      }

      setIsActionModalOpen(false);
      setSelectedBorrowing(null);
      setActionType('');
      setActionNotes('');
      loadData();
    } catch (error) {
      console.error('Failed to perform action:', error);
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
      overdue: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
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
      overdue: <FaClock className="mr-1" />,
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Borrowings</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Manage equipment borrowing requests and returns
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="filter-grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <div className="filter-group">
            <label className="filter-label">
              Search
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiFilter className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
                placeholder="Search by user or item..."
              />
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="borrowed">Borrowed</option>
              <option value="returned">Returned</option>
              <option value="rejected">Rejected</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">
              User
            </label>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">All Users</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">
              Date Range
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
        </div>

        {dateFilter === 'custom' && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                From Date
              </label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                className="input-field"
              />
            </div>
          </div>
        )}
      </div>

      {/* Borrowings List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="table-header">Item</th>
                    <th className="table-header">User</th>
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
                      <td className="table-cell">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {typeof borrowing.user === 'object' ? borrowing.user.fullName : 'Loading...'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {typeof borrowing.user === 'object' ? borrowing.user.nip : ''}
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
                          {isOverdue(borrowing.expectedReturnDate) && (
                            <span className="ml-1.5 text-[10px] bg-red-100 text-red-600 px-1 rounded font-bold uppercase">
                              Overdue
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusColor(borrowing.status)}`}>
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

                          {user?.role === 'officer' && (
                            <>
                              {borrowing.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleAction(borrowing, 'approve')}
                                    className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                    title="Approve"
                                  >
                                    <FiCheck size={18} />
                                  </button>
                                  <button
                                    onClick={() => handleAction(borrowing, 'reject')}
                                    className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    title="Reject"
                                  >
                                    <FiX size={18} />
                                  </button>
                                </>
                              )}

                              {borrowing.status === 'approved' && (
                                <button
                                  onClick={() => handleAction(borrowing, 'borrow')}
                                  className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                  title="Mark as Borrowed"
                                >
                                  <FiCheck size={18} />
                                </button>
                              )}

                              {borrowing.status === 'returning' && (
                                <button
                                  onClick={() => handleAction(borrowing, 'approve_return')}
                                  className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                  title="Approve Return"
                                >
                                  <FiCheck size={18} />
                                </button>
                              )}
                            </>
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
                          {typeof borrowing.user === 'object' ? borrowing.user.fullName : 'Unknown User'}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusColor(borrowing.status)}`}>
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
                      <p className={`text-sm dark:text-gray-300 ${isOverdue(borrowing.expectedReturnDate) ? 'text-red-600 font-bold' : ''}`}>
                        {format(new Date(borrowing.expectedReturnDate), 'dd/MM/yyyy')}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-semibold">Borrow Date</p>
                      <p className="text-sm dark:text-gray-300">
                        {format(new Date(borrowing.borrowDate), 'dd/MM/yyyy')}
                      </p>
                    </div>
                    <div className="flex justify-end items-end">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleView(borrowing)}
                          className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg"
                        >
                          <FiEye size={16} />
                        </button>
                        {user?.role === 'officer' && (
                          <>
                            {borrowing.status === 'pending' && (
                              <button
                                onClick={() => handleAction(borrowing, 'approve')}
                                className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg"
                              >
                                <FiCheck size={16} />
                              </button>
                            )}
                            {(borrowing.status === 'approved' || borrowing.status === 'returned') && (
                              <button
                                onClick={() => handleAction(borrowing, borrowing.status === 'approved' ? 'borrow' : 'approve_return')}
                                className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg"
                              >
                                <FiCheck size={16} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* View Borrowing Modal */}
      {
        isViewModalOpen && viewingBorrowing && (
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
                    {/* Basic Info */}
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
                        <p className="text-sm text-gray-500 dark:text-gray-400">User</p>
                        <p className="font-medium">
                          {typeof viewingBorrowing.user === 'object' ? viewingBorrowing.user.fullName : 'Loading...'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">User NIP</p>
                        <p className="font-medium">
                          {typeof viewingBorrowing.user === 'object' ? viewingBorrowing.user.nip : 'Loading...'}
                        </p>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t dark:border-gray-700">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Borrow Date</p>
                        <p className="font-medium">
                          {format(new Date(viewingBorrowing.borrowDate), 'PPpp')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Expected Return</p>
                        <p className="font-medium">
                          {format(new Date(viewingBorrowing.expectedReturnDate), 'PP')}
                        </p>
                      </div>
                      {viewingBorrowing.actualReturnDate && (
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Actual Return</p>
                          <p className="font-medium">
                            {format(new Date(viewingBorrowing.actualReturnDate), 'PP')}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Status and Approval */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t dark:border-gray-700">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            viewingBorrowing.status
                          )}`}
                        >
                          {viewingBorrowing.status}
                        </span>
                      </div>
                      {viewingBorrowing.approver && (
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Approved By</p>
                          <p className="font-medium">
                            {typeof viewingBorrowing.approver === 'object'
                              ? viewingBorrowing.approver.fullName
                              : 'Loading...'}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Purpose and Notes */}
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

                    {/* Penalty */}
                    {viewingBorrowing.penalty > 0 && (
                      <div className="pt-4 border-t dark:border-gray-700">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Penalty</p>
                        <p className="font-medium text-red-600 dark:text-red-400">
                          Rp {viewingBorrowing.penalty.toLocaleString()}
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
        )
      }

      {/* Action Modal */}
      {
        isActionModalOpen && selectedBorrowing && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div
                className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
                onClick={() => setIsActionModalOpen(false)}
              />

              <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full sm:p-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    {actionType === 'approve' && 'Approve Borrowing Request'}
                    {actionType === 'reject' && 'Reject Borrowing Request'}
                    {actionType === 'borrow' && 'Mark as Borrowed'}
                    {actionType === 'return' && 'Request Return'}
                    {actionType === 'approve_return' && 'Approve Return'}
                  </h3>

                  <div className="mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {actionType === 'approve' && 'Are you sure you want to approve this borrowing request?'}
                      {actionType === 'reject' && 'Are you sure you want to reject this borrowing request?'}
                      {actionType === 'borrow' && 'Mark this item as handed over to the borrower?'}
                      {actionType === 'return' && 'Request to return this borrowed item?'}
                      {actionType === 'approve_return' && 'Approve this return request?'}
                    </p>
                    <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="font-medium">
                        Item: {typeof selectedBorrowing.item === 'object' ? selectedBorrowing.item.name : 'Loading...'}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        User: {typeof selectedBorrowing.user === 'object' ? selectedBorrowing.user.fullName : 'Loading...'}
                      </p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      rows="3"
                      className="input-field"
                      placeholder="Add any notes or comments..."
                    />
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setIsActionModalOpen(false)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={performAction}
                      className={`${actionType === 'reject' ? 'btn-danger' : 'btn-primary'
                        }`}
                    >
                      {actionType === 'approve' && 'Approve'}
                      {actionType === 'reject' && 'Reject'}
                      {actionType === 'borrow' && 'Mark as Borrowed'}
                      {actionType === 'return' && 'Request Return'}
                      {actionType === 'approve_return' && 'Approve Return'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default Borrowings;