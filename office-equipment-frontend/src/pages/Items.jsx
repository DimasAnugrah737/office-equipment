import React, { useState, useEffect } from 'react';
import { itemsAPI } from '../api/items';
import { categoriesAPI } from '../api/categories';
import { useApi } from '../hooks/useApi';
import { useForm } from '../hooks/useForm';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { FiEdit2, FiTrash2, FiPlus, FiSearch, FiFilter, FiUpload, FiEye, FiPackage } from 'react-icons/fi';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import toast from 'react-hot-toast';

const Items = () => {
  const { user } = useAuth();
  const socket = useSocket();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  const { execute: fetchItems, loading } = useApi(itemsAPI.getAllItems);
  const { execute: fetchCategories } = useApi(categoriesAPI.getAllCategories);
  const { execute: createItem } = useApi(itemsAPI.createItem);
  const { execute: updateItem } = useApi(itemsAPI.updateItem);
  const { execute: deleteItem } = useApi(itemsAPI.deleteItem);

  const { values, setValues, handleChange, handleBlur, resetForm } = useForm({
    name: '',
    description: '',
    categoryId: '',
    serialNumber: '',
    quantity: 1,
    condition: 'good',
    location: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterItems();
  }, [items, searchTerm, selectedCategory, conditionFilter, availabilityFilter]);

  const loadData = async () => {
    try {
      const [itemsData, categoriesData] = await Promise.all([
        fetchItems(),
        fetchCategories(),
      ]);
      setItems(itemsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  // Socket listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleItemCreated = (newItem) => {
      setItems(prev => [newItem, ...prev]);
    };

    const handleItemUpdated = (updatedItem) => {
      setItems(prev => prev.map(item =>
        item.id === updatedItem.id ? updatedItem : item
      ));
    };

    const handleItemDeleted = (data) => {
      setItems(prev => prev.filter(item => item.id !== parseInt(data.id)));
    };

    socket.on('item:created', handleItemCreated);
    socket.on('item:updated', handleItemUpdated);
    socket.on('item:deleted', handleItemDeleted);

    return () => {
      socket.off('item:created', handleItemCreated);
      socket.off('item:updated', handleItemUpdated);
      socket.off('item:deleted', handleItemDeleted);
    };
  }, [socket]);

  const filterItems = () => {
    let filtered = [...items];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(term) ||
          item.description?.toLowerCase().includes(term) ||
          item.serialNumber?.toLowerCase().includes(term)
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((item) => {
        const itemCategory = typeof item.category === 'object' ? item.category.name : item.category;
        return itemCategory === selectedCategory;
      });
    }

    // Condition filter
    if (conditionFilter !== 'all') {
      filtered = filtered.filter((item) => item.condition === conditionFilter);
    }

    // Availability filter
    if (availabilityFilter !== 'all') {
      if (availabilityFilter === 'available') {
        filtered = filtered.filter((item) => item.availableQuantity > 0);
      } else if (availabilityFilter === 'unavailable') {
        filtered = filtered.filter((item) => item.availableQuantity === 0);
      }
    }

    setFilteredItems(filtered);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData();
      formData.append('name', values.name);
      formData.append('description', values.description);
      formData.append('categoryId', values.categoryId);
      formData.append('serialNumber', values.serialNumber);
      formData.append('quantity', parseInt(values.quantity));
      formData.append('condition', values.condition);
      formData.append('location', values.location);

      if (imageFile) {
        formData.append('image', imageFile);
      }

      if (editingItem) {
        await updateItem(editingItem.id, formData);
        toast.success('Item updated successfully');
      } else {
        await createItem(formData);
        toast.success('Item created successfully');
      }

      setIsModalOpen(false);
      setEditingItem(null);
      resetForm();
      setImagePreview(null);
      setImageFile(null);
      loadData();
    } catch (error) {
      console.error('Failed to save item:', error);
      toast.error('Failed to save item');
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setValues({
      name: item.name,
      description: item.description || '',
      categoryId: typeof item.category === 'object'
        ? item.category.id
        : item.category,
      serialNumber: item.serialNumber || '',
      quantity: item.quantity,
      condition: item.condition,
      location: item.location || '',
    });
    setImagePreview(item.image ? `http://localhost:5000${item.image}` : null);
    setImageFile(null);
    setIsModalOpen(true);
  };

  const handleView = (item) => {
    setViewingItem(item);
    setIsViewModalOpen(true);
  };

  const handleDeleteClick = (item) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteItem(itemToDelete.id);
      toast.success('Item deleted successfully');
      loadData();
    } catch (error) {
      console.error('Failed to delete item:', error);
    } finally {
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const getConditionColor = (condition) => {
    const colors = {
      excellent: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      good: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      fair: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      poor: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      broken: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    };
    return colors[condition] || colors.good;
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setImageFile(file);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Item Management</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Manage office equipment and their availability
          </p>
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={() => {
              setEditingItem(null);
              resetForm();
              setImagePreview(null);
              setImageFile(null);
              setIsModalOpen(true);
            }}
            className="btn-primary w-full sm:w-auto flex items-center justify-center"
            disabled={loading}
          >
            <FiPlus className="mr-2" />
            Add Item
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="filter-grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
                placeholder="Search by name, description..."
              />
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">
              Category
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiFilter className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input-field pl-10"
              >
                <option value="all">All Categories</option>
                {categories.map((category, idx) => (
                  <option key={category._id || idx} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">
              Condition
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiPackage className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={conditionFilter}
                onChange={(e) => setConditionFilter(e.target.value)}
                className="input-field pl-10"
              >
                <option value="all">All Conditions</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
                <option value="broken">Broken</option>
              </select>
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">
              Availability
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaCheckCircle className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value)}
                className="input-field pl-10"
              >
                <option value="all">All Availability</option>
                <option value="available">Available</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Items List */}
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
                    <th className="table-header">Category</th>
                    <th className="table-header">Quantity</th>
                    <th className="table-header">Condition</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredItems.map((item, idx) => (
                    <tr key={item.id ?? item.serialNumber ?? idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="table-cell">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {item.image ? (
                              <img
                                className="h-10 w-10 rounded-lg object-cover"
                                src={`http://localhost:5000${item.image}`}
                                alt={item.name}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = 'https://via.placeholder.com/40';
                                }}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                <FiPackage className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {item.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                              {item.serialNumber || 'No serial'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        {typeof item.category === 'object' ? item.category.name : 'Uncategorized'}
                      </td>
                      <td className="table-cell">
                        <span className="font-semibold text-primary-600 dark:text-primary-400">{item.availableQuantity}</span>
                        <span className="text-gray-400 mx-1">/</span>
                        <span className="text-gray-500">{item.quantity}</span>
                      </td>
                      <td className="table-cell">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getConditionColor(item.condition)}`}>
                          {item.condition.charAt(0).toUpperCase() + item.condition.slice(1)}
                        </span>
                      </td>
                      <td className="table-cell text-xs">
                        {item.availableQuantity > 0 ? (
                          <span className="flex items-center text-green-600 dark:text-green-400">
                            <FaCheckCircle className="mr-1" /> Available
                          </span>
                        ) : (
                          <span className="flex items-center text-red-600 dark:text-red-400">
                            <FaTimesCircle className="mr-1" /> Unavailable
                          </span>
                        )}
                      </td>
                      <td className="table-cell">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleView(item)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <FiEye size={18} />
                          </button>
                          {user?.role === 'admin' && (
                            <>
                              <button
                                onClick={() => handleEdit(item)}
                                className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <FiEdit2 size={18} />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(item)}
                                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <FiTrash2 size={18} />
                              </button>
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
              {filteredItems.map((item, idx) => (
                <div key={item.id ?? item.serialNumber ?? idx} className="card-mobile">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-12 w-12">
                        {item.image ? (
                          <img
                            className="h-12 w-12 rounded-lg object-cover"
                            src={`http://localhost:5000${item.image}`}
                            alt={item.name}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://via.placeholder.com/40';
                            }}
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            <FiPackage className="text-gray-400" size={20} />
                          </div>
                        )}
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                          {item.name}
                        </h4>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">{item.serialNumber || 'No serial'}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getConditionColor(item.condition)}`}>
                      {item.condition}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-semibold">Stock</p>
                      <p className="text-sm dark:text-gray-300">
                        <span className="font-bold text-primary-600">{item.availableQuantity}</span>
                        <span className="text-gray-400 mx-1">/</span>
                        <span>{item.quantity}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-semibold">Category</p>
                      <p className="text-sm dark:text-gray-300 truncate">
                        {typeof item.category === 'object' ? item.category.name : 'Uncategorized'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-semibold">Status</p>
                      {item.availableQuantity > 0 ? (
                        <span className="text-green-600 text-xs font-semibold">● Available</span>
                      ) : (
                        <span className="text-red-600 text-xs font-semibold">● Unavailable</span>
                      )}
                    </div>
                    <div className="flex justify-end items-end">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleView(item)}
                          className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg"
                        >
                          <FiEye size={16} />
                        </button>
                        {user?.role === 'admin' && (
                          <>
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg"
                            >
                              <FiEdit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(item)}
                              className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg"
                            >
                              <FiTrash2 size={16} />
                            </button>
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

      {/* Add/Edit Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => setIsModalOpen(false)}
            />

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  {editingItem ? 'Edit Item' : 'Add New Item'}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={values.name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className="input-field"
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={values.description}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        rows="2"
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Category *
                      </label>
                      <select
                        name="categoryId"
                        value={values.categoryId}
                        onChange={handleChange}
                        className="input-field"
                        required
                      >
                        <option value="">Select Category</option>
                        {categories.map((category, idx) => (
                          <option key={category.id || idx} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Serial Number
                      </label>
                      <input
                        type="text"
                        name="serialNumber"
                        value={values.serialNumber}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        name="quantity"
                        value={values.quantity}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        min="1"
                        className="input-field"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Condition
                      </label>
                      <select
                        name="condition"
                        value={values.condition}
                        onChange={handleChange}
                        className="input-field"
                      >
                        <option value="excellent">Excellent</option>
                        <option value="good">Good</option>
                        <option value="fair">Fair</option>
                        <option value="poor">Poor</option>
                        <option value="broken">Broken</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Location
                      </label>
                      <input
                        type="text"
                        name="location"
                        value={values.location}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className="input-field"
                        placeholder="e.g., Storage Room A"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Image
                      </label>
                      <div className="mt-1 flex items-center">
                        <label className="cursor-pointer">
                          <div className="flex items-center space-x-2">
                            <div className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                              <FiUpload className="inline mr-2" />
                              Upload Image
                            </div>
                            <input
                              type="file"
                              className="sr-only"
                              accept="image/*"
                              onChange={handleImageUpload}
                            />
                          </div>
                        </label>
                        {imagePreview && (
                          <div className="ml-4">
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="h-20 w-20 object-cover rounded-lg"
                            />
                          </div>
                        )}
                      </div>
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
                      {editingItem ? 'Update Item' : 'Create Item'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Item Modal */}
      {isViewModalOpen && viewingItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => setIsViewModalOpen(false)}
            />

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Item Details
                </h3>

                <div className="space-y-4">
                  <div className="flex items-start space-x-4">
                    {viewingItem.image ? (
                      <img
                        src={viewingItem.image}
                        alt={viewingItem.name}
                        className="h-32 w-32 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="h-32 w-32 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <FiPackage className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                        {viewingItem.name}
                      </h4>
                      <p className="text-gray-600 dark:text-gray-400 mt-2">
                        {viewingItem.description}
                      </p>
                      <div className="mt-2 flex items-center space-x-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getConditionColor(viewingItem.condition)}`}>
                          {viewingItem.condition}
                        </span>
                        {viewingItem.isAvailable ? (
                          <span className="text-green-600 dark:text-green-400 font-medium">
                            Available ({viewingItem.availableQuantity}/{viewingItem.quantity})
                          </span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400 font-medium">
                            Unavailable
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t dark:border-gray-700">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Serial Number</p>
                      <p className="font-medium">{viewingItem.serialNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Category</p>
                      <p className="font-medium">
                        {typeof viewingItem.category === 'object' ? viewingItem.category.name : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Location</p>
                      <p className="font-medium">{viewingItem.location || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Created By</p>
                      <p className="font-medium">
                        {typeof viewingItem.createdBy === 'object' ? viewingItem.createdBy.fullName : 'N/A'}
                      </p>
                    </div>
                  </div>
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

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && itemToDelete && (
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
                    Delete Item
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Are you sure you want to delete item{' '}
                      <span className="font-semibold">{itemToDelete.name}</span>?
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

export default Items;