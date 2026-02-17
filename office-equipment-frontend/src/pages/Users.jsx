import React, { useState, useEffect } from 'react';
import { usersAPI } from '../api/users';
import { useApi } from '../hooks/useApi';
import { useForm } from '../hooks/useForm';
import { useSocket } from '../contexts/SocketContext';
import { FiEdit2, FiTrash2, FiUserPlus, FiSearch, FiFilter } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Users = () => {
  const socket = useSocket();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const { execute: fetchUsers, loading } = useApi(usersAPI.getAllUsers);
  const { execute: createUser } = useApi(usersAPI.createUser);
  const { execute: updateUser } = useApi(usersAPI.updateUser);
  const { execute: deleteUser } = useApi(usersAPI.deleteUser);

  const { values, setValues, handleChange, handleBlur, errors, resetForm } = useForm({
    fullName: '',
    nip: '',
    email: '',
    password: '',
    role: 'user',
    department: '',
    position: '',
    phone: '',
    isActive: true,
  });

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, filterRole]);

  const loadUsers = async () => {
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  // Socket listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleUserCreated = (newUser) => {
      setUsers(prev => [newUser, ...prev]);
    };

    const handleUserUpdated = (updatedUser) => {
      setUsers(prev => prev.map(user =>
        user.id === updatedUser.id ? updatedUser : user
      ));
    };

    const handleUserDeleted = (data) => {
      setUsers(prev => prev.filter(user => user.id !== parseInt(data.id)));
    };

    socket.on('user:created', handleUserCreated);
    socket.on('user:updated', handleUserUpdated);
    socket.on('user:deleted', handleUserDeleted);

    return () => {
      socket.off('user:created', handleUserCreated);
      socket.off('user:updated', handleUserUpdated);
      socket.off('user:deleted', handleUserDeleted);
    };
  }, [socket]);

  const filterUsers = () => {
    let filtered = [...users];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.fullName.toLowerCase().includes(term) ||
          user.nip.toLowerCase().includes(term) ||
          user.email.toLowerCase().includes(term) ||
          user.department?.toLowerCase().includes(term)
      );
    }

    if (filterRole !== 'all') {
      filtered = filtered.filter((user) => user.role === filterRole);
    }

    setFilteredUsers(filtered);
  };

  const validateForm = () => {
    const errors = {};
    if (!values.fullName) errors.fullName = 'Full name is required';
    if (!values.nip) errors.nip = 'NIP is required';
    if (!values.email) errors.email = 'Email is required';
    if (!editingUser && !values.password) errors.password = 'Password is required';
    if (values.email && !/\S+@\S+\.\S+/.test(values.email)) {
      errors.email = 'Email is invalid';
    }
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      Object.values(validationErrors).forEach((error) => toast.error(error));
      return;
    }

    try {
      if (editingUser) {
        if (!editingUser.id) {
          toast.error('Cannot update user: User ID is missing.');
          return;
        }
        const { password, ...updateData } = values;
        if (!password) delete updateData.password;
        await updateUser(editingUser.id, updateData);
        toast.success('User updated successfully');
      } else {
        await createUser(values);
        toast.success('User created successfully');
      }

      setIsModalOpen(false);
      setEditingUser(null);
      resetForm();
      loadUsers();
    } catch (error) {
      console.error('Failed to save user:', error);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setValues({
      fullName: user.fullName,
      nip: user.nip,
      email: user.email,
      password: '',
      role: user.role,
      department: user.department || '',
      position: user.position || '',
      phone: user.phone || '',
      isActive: user.isActive,
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      if (!userToDelete?.id) {
        toast.error('Cannot delete user: User ID is missing.');
        setIsDeleteModalOpen(false);
        return;
      }
      await deleteUser(userToDelete.id);
      toast.success('User deleted successfully');
      loadUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
    } finally {
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      officer: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      user: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    };
    return colors[role] || colors.user;
  };

  const getStatusColor = (isActive) => {
    return isActive
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
      : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400';
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Manage system users and their permissions
          </p>
        </div>
        <button
          onClick={() => {
            setEditingUser(null);
            resetForm();
            setIsModalOpen(true);
          }}
          className="btn-primary w-full sm:w-auto flex items-center justify-center"
        >
          <FiUserPlus className="mr-2" />
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="filter-grid !grid-cols-1 sm:!grid-cols-2">
          <div className="filter-group">
            <label className="filter-label">
              Search Users
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10 h-10 text-sm"
                placeholder="Search by name, NIP, or email..."
              />
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">
              Filter by Role
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiFilter className="h-4 w-4 text-gray-400" />
              </div>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="input-field pl-10 h-10 text-sm appearance-none"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="officer">Officer</option>
                <option value="user">User</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Users List */}
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
                    <th className="table-header">Name</th>
                    <th className="table-header">NIP</th>
                    <th className="table-header">Email</th>
                    <th className="table-header">Role</th>
                    <th className="table-header">Department</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredUsers.map((user, idx) => (
                    <tr key={user.id ?? user.email ?? idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="table-cell">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                {user.fullName.charAt(0)}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-bold text-gray-900 dark:text-white">
                              {user.fullName}
                            </div>
                            <div className="text-[11px] font-medium text-gray-400 dark:text-slate-500">
                              {user.position || 'No position'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell font-mono text-[11px] font-semibold text-gray-500 dark:text-slate-400">{user.nip}</td>
                      <td className="table-cell text-xs text-gray-500 dark:text-slate-400">{user.email}</td>
                      <td className="table-cell">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${getRoleColor(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="table-cell text-xs font-semibold text-gray-500 dark:text-slate-500 uppercase tracking-wider">{user.department || '-'}</td>
                      <td className="table-cell text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${getStatusColor(user.isActive)}`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(user)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <FiEdit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(user)}
                            className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <FiTrash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4 p-4">
              {filteredUsers.map((user, idx) => (
                <div key={user.id ?? user.email ?? idx} className="card-mobile">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-12 w-12">
                        <div className="h-12 w-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center border border-primary-200 dark:border-primary-800">
                          <span className="text-base font-bold text-primary-700 dark:text-primary-300">
                            {user.fullName.charAt(0)}
                          </span>
                        </div>
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                          {user.fullName}
                        </h4>
                        <p className="text-xs text-gray-500 mt-0.5">{user.position || 'No position'}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getRoleColor(user.role)}`}>
                        {user.role}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusColor(user.isActive)}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-semibold">NIP</p>
                      <p className="text-sm font-mono dark:text-gray-300">{user.nip}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-semibold">Department</p>
                      <p className="text-sm dark:text-gray-300 truncate">{user.department || '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] text-gray-500 uppercase font-semibold">Email</p>
                      <p className="text-sm dark:text-gray-300">{user.email}</p>
                    </div>
                    <div className="col-span-2 flex justify-end space-x-2 mt-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="flex-1 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg flex items-center justify-center text-xs font-semibold"
                      >
                        <FiEdit2 className="mr-1.5" size={14} /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClick(user)}
                        className="flex-1 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg flex items-center justify-center text-xs font-semibold"
                      >
                        <FiTrash2 className="mr-1.5" size={14} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add/Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => setIsModalOpen(false)}
            />

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  {editingUser ? 'Edit User' : 'Add New User'}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        value={values.fullName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className="input-field"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        NIP *
                      </label>
                      <input
                        type="text"
                        name="nip"
                        value={values.nip}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className="input-field"
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={values.email}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className="input-field"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Password {!editingUser && '*'}
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={values.password}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className="input-field"
                        placeholder={editingUser ? 'Leave blank to keep current' : ''}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Role *
                      </label>
                      <select
                        name="role"
                        value={values.role}
                        onChange={handleChange}
                        className="input-field"
                      >
                        <option value="user">User</option>
                        <option value="officer">Officer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Department
                      </label>
                      <input
                        type="text"
                        name="department"
                        value={values.department}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Position
                      </label>
                      <input
                        type="text"
                        name="position"
                        value={values.position}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={values.phone}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className="input-field"
                      />
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={values.isActive}
                        onChange={handleChange}
                        id="isActive"
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="isActive"
                        className="ml-2 block text-sm text-gray-900 dark:text-gray-300"
                      >
                        Active Account
                      </label>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary">
                      {editingUser ? 'Update User' : 'Create User'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && userToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => setIsDeleteModalOpen(false)}
            />

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900">
                  <FiTrash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Delete User
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Are you sure you want to delete user{' '}
                      <span className="font-semibold">{userToDelete.fullName}</span>?
                      This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="btn-secondary sm:col-start-1"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="btn-danger sm:col-start-2"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;