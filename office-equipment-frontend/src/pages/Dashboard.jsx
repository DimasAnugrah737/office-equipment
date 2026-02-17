import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { borrowingsAPI } from '../api/borrowings';
import { itemsAPI } from '../api/items';
import {
  FiPackage,
  FiUsers,
  FiCalendar,
  FiClock,
  FiTrendingUp,
  FiCheckCircle,
  FiAlertCircle,
} from 'react-icons/fi';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const Dashboard = () => {
  const { user, isAdmin, isOfficer, loading: authLoading } = useAuth();
  const socket = useSocket();
  const [stats, setStats] = useState(null);
  const [recentBorrowings, setRecentBorrowings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      fetchDashboardData();
    }
  }, [authLoading, isAdmin, isOfficer]);

  // Socket listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleDataUpdate = () => {
      fetchDashboardData();
    };

    // Listen for all data change events
    socket.on('item:created', handleDataUpdate);
    socket.on('item:updated', handleDataUpdate);
    socket.on('item:deleted', handleDataUpdate);
    socket.on('user:created', handleDataUpdate);
    socket.on('user:updated', handleDataUpdate);
    socket.on('user:deleted', handleDataUpdate);
    socket.on('borrowing:created', handleDataUpdate);
    socket.on('borrowing:approved', handleDataUpdate);
    socket.on('borrowing:rejected', handleDataUpdate);
    socket.on('borrowing:borrowed', handleDataUpdate);
    socket.on('borrowing:returned', handleDataUpdate);
    socket.on('borrowing:return_approved', handleDataUpdate);

    return () => {
      socket.off('item:created', handleDataUpdate);
      socket.off('item:updated', handleDataUpdate);
      socket.off('item:deleted', handleDataUpdate);
      socket.off('user:updated', handleDataUpdate);
      socket.off('user:deleted', handleDataUpdate);
      socket.off('user:created', handleDataUpdate);
      socket.off('borrowing:created', handleDataUpdate);
      socket.off('borrowing:approved', handleDataUpdate);
      socket.off('borrowing:rejected', handleDataUpdate);
      socket.off('borrowing:borrowed', handleDataUpdate);
      socket.off('borrowing:returned', handleDataUpdate);
      socket.off('borrowing:return_approved', handleDataUpdate);
    };
  }, [socket]);

  const fetchDashboardData = async () => {
    try {
      if (isAdmin || isOfficer) {
        const statsData = await borrowingsAPI.getDashboardStats().catch(e => ({
          totalItems: 0,
          totalUsers: 0,
          pendingBorrowings: 0,
          overdueBorrowings: 0,
          approvedBorrowings: 0,
          borrowedBorrowings: 0,
          returnedBorrowings: 0
        }));
        const borrowingsData = await borrowingsAPI.getAllBorrowings({ limit: 5 }).catch(e => []);
        setStats(statsData);
        setRecentBorrowings(Array.isArray(borrowingsData) ? borrowingsData : []);
      } else {
        // User dashboard
        const itemsData = await itemsAPI.getAllItems({ limit: 5 }).catch(e => []);
        const borrowingsData = await borrowingsAPI.getUserBorrowingHistory().catch(e => []);
        setStats({
          availableItems: Array.isArray(itemsData) ? itemsData.length : 0,
          myBorrowings: Array.isArray(borrowingsData) ? borrowingsData.length : 0,
          pendingBorrowings: Array.isArray(borrowingsData) ? borrowingsData.filter(b => b.status === 'pending').length : 0,
          activeBorrowings: Array.isArray(borrowingsData) ? borrowingsData.filter(b => b.status === 'borrowed').length : 0,
        });
        setRecentBorrowings(Array.isArray(borrowingsData) ? borrowingsData.slice(0, 5) : []);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setStats({
        totalItems: 0,
        totalUsers: 0,
        pendingBorrowings: 0,
        overdueBorrowings: 0,
        availableItems: 0,
        myBorrowings: 0,
        activeBorrowings: 0
      });
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Welcome back, {user?.fullName}!
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {(isAdmin || isOfficer) ? (
          <>
            <div className="card !p-4 flex items-center space-x-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <FiPackage className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest dark:text-slate-500">
                  Total Items
                </p>
                <p className="text-2xl font-black text-gray-900 dark:text-white leading-tight">
                  {stats?.totalItems || 0}
                </p>
              </div>
            </div>

            <div className="card !p-4 flex items-center space-x-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <FiUsers className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest dark:text-slate-500">
                  Total Users
                </p>
                <p className="text-2xl font-black text-gray-900 dark:text-white leading-tight">
                  {stats?.totalUsers || 0}
                </p>
              </div>
            </div>

            <div className="card !p-4 flex items-center space-x-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                <FiCalendar className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest dark:text-slate-500">
                  Pending Requests
                </p>
                <p className="text-2xl font-black text-gray-900 dark:text-white leading-tight">
                  {stats?.pendingBorrowings || 0}
                </p>
              </div>
            </div>

            <div className="card !p-4 flex items-center space-x-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                <FiClock className="h-6 w-6 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest dark:text-slate-500">
                  Overdue Items
                </p>
                <p className="text-2xl font-black text-gray-900 dark:text-white leading-tight">
                  {stats?.overdueBorrowings || 0}
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="card !p-4 flex items-center space-x-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <FiPackage className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest dark:text-slate-500">
                  Available Items
                </p>
                <p className="text-2xl font-black text-gray-900 dark:text-white leading-tight">
                  {stats?.availableItems || 0}
                </p>
              </div>
            </div>

            <div className="card !p-4 flex items-center space-x-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <FiCheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest dark:text-slate-500">
                  My Borrowings
                </p>
                <p className="text-2xl font-black text-gray-900 dark:text-white leading-tight">
                  {stats?.myBorrowings || 0}
                </p>
              </div>
            </div>

            <div className="card !p-4 flex items-center space-x-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                <FiClock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest dark:text-slate-500">
                  Pending Requests
                </p>
                <p className="text-2xl font-black text-gray-900 dark:text-white leading-tight">
                  {stats?.pendingBorrowings || 0}
                </p>
              </div>
            </div>

            <div className="card !p-4 flex items-center space-x-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <FiTrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest dark:text-slate-500">
                  Active Borrowings
                </p>
                <p className="text-2xl font-black text-gray-900 dark:text-white leading-tight">
                  {stats?.activeBorrowings || 0}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Charts for Admin/Officer */}
      {(isAdmin || isOfficer) && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-6 uppercase tracking-wider">
              Borrowings Trend
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.monthlyTrends || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis
                    dataKey="_id.month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    tickFormatter={(value) => {
                      const date = new Date();
                      date.setMonth(value - 1);
                      return date.toLocaleString('default', { month: 'short' });
                    }}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      backgroundColor: '#fff'
                    }}
                    cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Borrowings" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-6 uppercase tracking-wider">
              Status Distribution
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={(stats?.statusStats || []).map(stat => ({
                      ...stat,
                      name: stat._id.charAt(0).toUpperCase() + stat._id.slice(1)
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                  >
                    {(stats?.statusStats || []).map((entry, index) => (
                      <Cell key={entry._id ?? `cell-${index}`} fill={getPieColor(entry._id)} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="card overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 gap-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-base font-bold text-gray-900 dark:text-white uppercase tracking-wider">
            Recent {isAdmin || isOfficer ? 'Borrowings' : 'My Borrowings'}
          </h3>
          <button className="text-sm font-bold text-primary-600 hover:text-primary-700 dark:text-primary-400 flex items-center">
            View all <FiTrendingUp className="ml-1" />
          </button>
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="table-header">Item</th>
                <th className="table-header">Quantity</th>
                <th className="table-header">Borrow Date</th>
                <th className="table-header">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {recentBorrowings.map((borrowing) => (
                <tr key={borrowing.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="table-cell font-medium text-gray-900 dark:text-white">
                    {typeof borrowing.item === 'object' ? borrowing.item.name : 'Loading...'}
                  </td>
                  <td className="table-cell font-bold text-primary-600 dark:text-primary-400">{borrowing.quantity}</td>
                  <td className="table-cell text-xs text-gray-500">
                    {new Date(borrowing.borrowDate).toLocaleDateString()}
                  </td>
                  <td className="table-cell">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusColor(borrowing.status)}`}>
                      {borrowing.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
          {recentBorrowings.map((borrowing) => (
            <div key={borrowing.id} className="p-4 flex justify-between items-center">
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                  {typeof borrowing.item === 'object' ? borrowing.item.name : 'Loading...'}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {new Date(borrowing.borrowDate).toLocaleDateString()}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs font-bold text-primary-600">Qty: {borrowing.quantity}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusColor(borrowing.status)}`}>
                  {borrowing.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const getPieColor = (status) => {
  const colors = {
    pending: '#f59e0b',
    approved: '#3b82f6',
    borrowed: '#10b981',
    returned: '#6b7280',
    returning: '#6366f1',
    rejected: '#ef4444',
    overdue: '#dc2626',
  };
  return colors[status] || '#6b7280';
};

export default Dashboard;