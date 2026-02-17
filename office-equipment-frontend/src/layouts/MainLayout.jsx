import React, { useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import {
  FiHome,
  FiUsers,
  FiPackage,
  FiGrid,
  FiCalendar,
  FiBell,
  FiLogOut,
  FiMenu,
  FiX,
  FiMoon,
  FiSun,
  FiBarChart2,
  FiFileText,
  FiUser,
} from 'react-icons/fi';

const MainLayout = () => {
  const { user, logout, toggleTheme, theme, isAdmin, isOfficer } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
  };

  const adminNavItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <FiHome /> },
    { path: '/users', label: 'Users', icon: <FiUsers /> },
    { path: '/items', label: 'Items', icon: <FiPackage /> },
    { path: '/categories', label: 'Categories', icon: <FiGrid /> },
    { path: '/borrowings', label: 'Borrowings', icon: <FiCalendar /> },
    { path: '/activity-logs', label: 'Activity Logs', icon: <FiFileText /> },
  ];

  const officerNavItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <FiHome /> },
    { path: '/items', label: 'Items', icon: <FiPackage /> },
    { path: '/borrowings', label: 'Borrowings', icon: <FiCalendar /> },
    { path: '/reports', label: 'Reports', icon: <FiBarChart2 /> },
  ];

  const userNavItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <FiHome /> },
    { path: '/browse-items', label: 'Browse Items', icon: <FiPackage /> },
    { path: '/my-borrowings', label: 'My Borrowings', icon: <FiCalendar /> },
  ];

  const navItems = isAdmin ? adminNavItems : isOfficer ? officerNavItems : userNavItems;

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 z-50 w-56 transform bg-white dark:bg-gray-800 shadow-lg transition duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } h-screen`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b dark:border-gray-700">
          <Link to="/dashboard" className="text-xl font-bold text-primary-600 dark:text-primary-400">
            Office Equipment
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="px-4 py-6">
          {/* User info */}
          <div className="flex items-center px-3 py-3 mb-5 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <div className="flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                <FiUser className="text-primary-600 dark:text-primary-400" size={18} />
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {user?.fullName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {user?.role} • {user?.department || 'No Department'}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${isActive(item.path)
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="mr-3">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 lg:ml-56 min-h-screen flex flex-col overflow-x-hidden">
        {/* Top navbar */}
        <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 shadow-sm">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <button
                onClick={() => setSidebarOpen(true)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 lg:hidden"
              >
                <FiMenu size={24} />
              </button>

              <div className="flex-1" />

              <div className="flex items-center space-x-4">
                {/* Theme toggle */}
                <button
                  onClick={() => toggleTheme()}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="Toggle theme"
                >
                  {theme === 'light' ? <FiMoon size={20} /> : <FiSun size={20} />}
                </button>

                {/* Notifications */}
                <div className="relative">
                  <button
                    onClick={() => setNotificationOpen(!notificationOpen)}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 relative"
                    aria-label="Notifications"
                  >
                    <FiBell size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </button>

                  {notificationOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-30"
                        onClick={() => setNotificationOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-40">
                        <div className="p-4 border-b dark:border-gray-700">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              Notifications
                            </h3>
                            {notifications.length > 0 && (
                              <button
                                onClick={markAllAsRead}
                                className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
                              >
                                Mark all as read
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                              No notifications
                            </div>
                          ) : (
                            notifications.map((notification) => (
                              <div
                                key={notification._id}
                                className={`p-4 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${!notification.isRead ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                                  }`}
                                onClick={() => {
                                  markAsRead(notification.id);
                                  if (notification.path) {
                                    navigate(notification.path);
                                  } else if (notification.relatedBorrowingId) {
                                    navigate(`/borrowings/${notification.relatedBorrowingId}`);
                                  }
                                  setNotificationOpen(false);
                                }}
                              >
                                <div className="flex items-start">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                      {notification.title}
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                      {notification.message}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                      {new Date(notification.createdAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                  {!notification.isRead && (
                                    <div className="w-2 h-2 bg-primary-500 rounded-full ml-2 mt-1" />
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="p-4 border-t dark:border-gray-700">
                          <Link
                            to="/notifications"
                            className="block text-center text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
                            onClick={() => setNotificationOpen(false)}
                          >
                            View all notifications
                          </Link>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="Logout"
                >
                  <FiLogOut size={20} />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="w-full py-6 px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;  