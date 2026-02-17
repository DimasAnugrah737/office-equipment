import React, { useState, useEffect } from 'react';
import { reportsAPI } from '../api/reports';
import { usersAPI } from '../api/users';
import { useApi } from '../hooks/useApi';
import {
  FiSearch,
  FiFilter,
  FiClock,
  FiUser,
  FiActivity,
  FiDownload,
} from 'react-icons/fi';
import { format } from 'date-fns';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';

const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const { execute: fetchLogs } = useApi(reportsAPI.getActivityLogs);
  const { execute: fetchUsers } = useApi(usersAPI.getAllUsers);

  useEffect(() => {
    loadLogs();
  }, [currentPage]);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm, userFilter, actionFilter, dateRange]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const logsData = await fetchLogs({ page: currentPage, limit: 20 });
      setLogs(logsData.logs || []);
      setTotalPages(logsData.totalPages || 1);
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const usersData = await fetchUsers();
      setUsers(usersData || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const getUserId = (user) => {
    if (!user) return null;
    if (typeof user === 'object') return user.id || user._id;
    return user;
  };

  const filterLogs = () => {
    let filtered = [...logs];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((log) =>
        log.action.toLowerCase().includes(term) ||
        (log.details &&
          JSON.stringify(log.details).toLowerCase().includes(term))
      );
    }

    if (userFilter !== 'all') {
      filtered = filtered.filter(
        (log) => String(getUserId(log.user)) === String(userFilter)
      );
    }

    if (actionFilter) {
      filtered = filtered.filter((log) =>
        log.action.toLowerCase().includes(actionFilter.toLowerCase())
      );
    }

    if (dateRange.from || dateRange.to) {
      filtered = filtered.filter((log) => {
        const logDate = new Date(log.createdAt);

        if (dateRange.from && logDate < new Date(dateRange.from)) return false;

        if (dateRange.to) {
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          if (logDate > toDate) return false;
        }

        return true;
      });
    }

    setFilteredLogs(filtered);
  };



  const uniqueUsersCount = [
    ...new Set(logs.map((log) => getUserId(log.user))),
  ].length;

  const todayCount = logs.filter((log) => {
    const logDate = new Date(log.createdAt);
    const today = new Date();
    return logDate.toDateString() === today.toDateString();
  }).length;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Activity Logs</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Track all system activities and changes
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="filter-grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <div className="filter-group">
            <label className="filter-label">
              Search Details
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search details..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">
              User Filter
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiUser className="h-4 w-4 text-gray-400" />
              </div>
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="input-field pl-10"
              >
                <option value="all">All Users</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">
              Action Type
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiFilter className="h-4 w-4 text-gray-400" />
              </div>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="input-field pl-10"
              >
                <option value="all">All Actions</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
                <option value="borrow">Borrow</option>
                <option value="return">Return</option>
                <option value="approve">Approve</option>
                <option value="reject">Reject</option>
                <option value="login">Login</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        {loading ? (
          <div className="p-6 text-center">Loading...</div>
        ) : (
          <table className="min-w-full">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Entity</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id || log._id}>
                  <td>
                    {format(
                      new Date(log.createdAt),
                      'dd/MM/yyyy HH:mm'
                    )}
                  </td>
                  <td>
                    {typeof log.user === 'object'
                      ? log.user.fullName
                      : 'System'}
                  </td>
                  <td>{log.action}</td>
                  <td>{log.entityType}</td>
                  <td>{log.ipAddress || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="card border-l-4 border-l-primary-500">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-primary-100 dark:bg-primary-900/30 mr-4">
              <FiActivity className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Logs</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white">
                {logs.length}
              </p>
            </div>
          </div>
        </div>

        <div className="card border-l-4 border-l-blue-500">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 mr-4">
              <FiUser className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Unique Users</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white">
                {uniqueUsersCount}
              </p>
            </div>
          </div>
        </div>

        <div className="card border-l-4 border-l-green-500">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 mr-4">
              <FiClock className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Today</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white">
                {todayCount}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogs;
