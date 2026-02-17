import React, { useState, useEffect } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { FiBell, FiCheck, FiTrash2, FiClock } from 'react-icons/fi';
import { format } from 'date-fns';

const Notifications = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.isRead;
    if (filter === 'read') return notification.isRead;
    return true;
  });

  const getNotificationIcon = (type) => {
    const icons = {
      borrow_request: <FiBell className="h-5 w-5 text-blue-500" />,
      return_request: <FiClock className="h-5 w-5 text-green-500" />,
      approval: <FiCheck className="h-5 w-5 text-green-500" />,
      rejection: <FiTrash2 className="h-5 w-5 text-red-500" />,
      overdue: <FiClock className="h-5 w-5 text-red-500" />,
      system: <FiBell className="h-5 w-5 text-gray-500" />,
    };
    return icons[type] || icons.system;
  };

  const getNotificationColor = (type) => {
    const colors = {
      borrow_request: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
      return_request: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
      approval: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
      rejection: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
      overdue: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
      system: 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700',
    };
    return colors[type] || colors.system;
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Stay updated with system alerts and messages
          </p>
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={markAllAsRead}
            className="btn-secondary flex-1 sm:flex-none text-xs flex items-center justify-center py-2"
          >
            <FiCheck className="mr-2" />
            Mark All as Read
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-4 border-b dark:border-gray-700">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${filter === 'all'
            ? 'border-primary-500 text-primary-600 dark:text-primary-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${filter === 'unread'
            ? 'border-primary-500 text-primary-600 dark:text-primary-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
        >
          Unread
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-300">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setFilter('read')}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${filter === 'read'
            ? 'border-primary-500 text-primary-600 dark:text-primary-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
        >
          Read
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-24 w-24 text-gray-400">
              <FiBell className="h-full w-full" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              No notifications
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {filter === 'all'
                ? "You don't have any notifications yet."
                : filter === 'unread'
                  ? "You don't have any unread notifications."
                  : "You don't have any read notifications."}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification._id}
              className={`border rounded-lg p-4 ${getNotificationColor(
                notification.type
              )} ${!notification.isRead ? 'ring-2 ring-primary-500' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {notification.title}
                      </h4>
                      <div className="flex items-center space-x-2">
                        {!notification.isRead && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-300">
                            New
                          </span>
                        )}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {format(new Date(notification.createdAt), 'MMM d, HH:mm')}
                        </span>
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {notification.message}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end space-x-2">
                {!notification.isRead && (
                  <button
                    onClick={() => markAsRead(notification._id)}
                    className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 flex items-center"
                  >
                    <FiCheck className="mr-1" />
                    Mark as Read
                  </button>
                )}
                <button
                  onClick={() => deleteNotification(notification._id)}
                  className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 flex items-center"
                >
                  <FiTrash2 className="mr-1" />
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;