import React, { useState, useEffect } from 'react';
import { categoriesAPI } from '../api/categories';
import { itemsAPI } from '../api/items';
import { useApi } from '../hooks/useApi';
import { useForm } from '../hooks/useForm';
import { useSocket } from '../contexts/SocketContext';
import { FiEdit2, FiTrash2, FiPlus, FiSearch, FiPackage } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Categories = () => {
  const socket = useSocket();
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [categoryItemsCount, setCategoryItemsCount] = useState({});

  const { execute: fetchCategories, loading } = useApi(categoriesAPI.getAllCategories);
  const { execute: fetchItems } = useApi(itemsAPI.getAllItems);
  const { execute: createCategory } = useApi(categoriesAPI.createCategory);
  const { execute: updateCategory } = useApi(categoriesAPI.updateCategory);
  const { execute: deleteCategory } = useApi(categoriesAPI.deleteCategory);

  const { values, setValues, handleChange, handleBlur, resetForm } = useForm({
    name: '',
    description: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterCategories();
  }, [categories, searchTerm]);

  const loadData = async () => {
    try {
      const [categoriesData, itemsData] = await Promise.all([
        fetchCategories(),
        fetchItems(),
      ]);
      setCategories(categoriesData);

      // Count items per category
      const counts = {};
      itemsData.forEach(item => {
        const categoryId = typeof item.category === 'object' ? item.category._id : item.category;
        counts[categoryId] = (counts[categoryId] || 0) + 1;
      });
      setCategoryItemsCount(counts);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  // Socket listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleCategoryUpdate = () => {
      loadData(); // Reload categories and item counts
    };

    socket.on('category:created', handleCategoryUpdate);
    socket.on('category:updated', handleCategoryUpdate);
    socket.on('category:deleted', handleCategoryUpdate);

    return () => {
      socket.off('category:created', handleCategoryUpdate);
      socket.off('category:updated', handleCategoryUpdate);
      socket.off('category:deleted', handleCategoryUpdate);
    };
  }, [socket]);

  const filterCategories = () => {
    let filtered = [...categories];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (category) =>
          category.name.toLowerCase().includes(term) ||
          category.description?.toLowerCase().includes(term)
      );
    }

    setFilteredCategories(filtered);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!values.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory(editingCategory._id, values);
        toast.success('Category updated successfully');
      } else {
        await createCategory(values);
        toast.success('Category created successfully');
      }

      setIsModalOpen(false);
      setEditingCategory(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Failed to save category:', error);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setValues({
      name: category.name,
      description: category.description || '',
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (category) => {
    setCategoryToDelete(category);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteCategory(categoryToDelete._id);
      toast.success('Category deleted successfully');
      loadData();
    } catch (error) {
      console.error('Failed to delete category:', error);
    } finally {
      setIsDeleteModalOpen(false);
      setCategoryToDelete(null);
    }
  };

  const getItemsCount = (categoryId) => {
    return categoryItemsCount[categoryId] || 0;
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Categories</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Manage equipment categories and their details
          </p>
        </div>
        <button
          onClick={() => {
            setEditingCategory(null);
            resetForm();
            setIsModalOpen(true);
          }}
          className="btn-primary w-full sm:w-auto flex items-center justify-center"
        >
          <FiPlus className="mr-2" />
          Add Category
        </button>
      </div>

      {/* Search */}
      <div className="filter-bar">
        <div className="max-w-md filter-group">
          <label className="filter-label">
            Search Categories
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
              placeholder="Search by name or description..."
            />
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredCategories.map((category, idx) => (
              <div
                key={category._id ?? category.name ?? idx}
                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {category.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {category.description || 'No description'}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(category)}
                      className="p-1 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      title="Edit"
                    >
                      <FiEdit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(category)}
                      className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      title="Delete"
                    >
                      <FiTrash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t dark:border-gray-600">
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <FiPackage className="mr-2" />
                    <span className="text-sm">
                      {getItemsCount(category._id)} items
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Created by {typeof category.createdBy === 'object' ? category.createdBy.fullName : 'Admin'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => setIsModalOpen(false)}
            />

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full sm:p-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  {editingCategory ? 'Edit Category' : 'Add New Category'}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Category Name *
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={values.description}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      rows="3"
                      className="input-field"
                    />
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
                      {editingCategory ? 'Update Category' : 'Create Category'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && categoryToDelete && (
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
                    Delete Category
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Are you sure you want to delete category{' '}
                      <span className="font-semibold">{categoryToDelete.name}</span>?
                    </p>
                    {getItemsCount(categoryToDelete._id) > 0 && (
                      <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                        <p className="text-sm text-yellow-700 dark:text-yellow-400">
                          ⚠️ This category contains {getItemsCount(categoryToDelete._id)} items.
                          Deleting it will remove the category from those items.
                        </p>
                      </div>
                    )}
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

export default Categories;