import React, { useState, useEffect } from 'react';
import { itemsAPI } from '../api/items';
import { categoriesAPI } from '../api/categories';
import { borrowingsAPI } from '../api/borrowings';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../contexts/AuthContext';
import { FiSearch, FiFilter, FiPackage, FiCalendar, FiInfo } from 'react-icons/fi';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const BrowseItems = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('available');
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [borrowForm, setBorrowForm] = useState({
    quantity: 1,
    expectedReturnDate: '',
    purpose: '',
  });

  const { execute: fetchItems, loading } = useApi(itemsAPI.getAllItems);
  const { execute: fetchCategories } = useApi(categoriesAPI.getAllCategories);
  const { execute: createBorrowing } = useApi(borrowingsAPI.createBorrowing);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterItems();
  }, [items, searchTerm, selectedCategory, conditionFilter, availabilityFilter]);

  const loadData = async () => {
    try {
      const [itemsData, categoriesData] = await Promise.all([
        fetchItems({ available: true }),
        fetchCategories(),
      ]);
      setItems(itemsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const filterItems = () => {
    let filtered = [...items];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(term) ||
          item.description?.toLowerCase().includes(term)
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((item) => {
        const itemCategoryId = typeof item.category === 'object' ? item.category.id : item.categoryId;
        return String(itemCategoryId) === String(selectedCategory);
      });
    }

    // Condition filter
    if (conditionFilter !== 'all') {
      filtered = filtered.filter((item) => item.condition === conditionFilter);
    }

    // Availability filter
    if (availabilityFilter !== 'all') {
      if (availabilityFilter === 'available') {
        filtered = filtered.filter((item) => item.availableQuantity > 0 && item.isAvailable);
      } else if (availabilityFilter === 'borrowed') {
        filtered = filtered.filter((item) => item.availableQuantity < item.quantity);
      } else if (availabilityFilter === 'maintenance') {
        filtered = filtered.filter((item) => item.condition === 'broken' || !item.isAvailable);
      }
    }

    setFilteredItems(filtered);
  };

  const handleBorrowClick = (item) => {
    if (!item.isAvailable || item.availableQuantity === 0) {
      toast.error('This item is not available for borrowing');
      return;
    }

    // Set minimum return date (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = format(tomorrow, 'yyyy-MM-dd');

    setSelectedItem(item);
    setBorrowForm({
      quantity: 1,
      expectedReturnDate: minDate,
      purpose: '',
    });
    setIsBorrowModalOpen(true);
  };

  const handleBorrowSubmit = async (e) => {
    e.preventDefault();

    if (!selectedItem) return;

    // Validate form
    if (borrowForm.quantity < 1) {
      toast.error('Quantity must be at least 1');
      return;
    }

    if (borrowForm.quantity > selectedItem.availableQuantity) {
      toast.error(`Only ${selectedItem.availableQuantity} items available`);
      return;
    }

    if (!borrowForm.expectedReturnDate) {
      toast.error('Please select a return date');
      return;
    }

    const returnDate = new Date(borrowForm.expectedReturnDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (returnDate <= today) {
      toast.error('Return date must be in the future');
      return;
    }

    if (!borrowForm.purpose.trim()) {
      toast.error('Please provide a purpose for borrowing');
      return;
    }

    try {
      await createBorrowing({
        itemId: selectedItem.id,
        quantity: borrowForm.quantity,
        expectedReturnDate: returnDate.toISOString(),
        purpose: borrowForm.purpose,
      });

      toast.success('Borrowing request submitted successfully');
      setIsBorrowModalOpen(false);
      setSelectedItem(null);
      setBorrowForm({
        quantity: 1,
        expectedReturnDate: '',
        purpose: '',
      });
      loadData(); // Refresh items to update availability
    } catch (error) {
      console.error('Failed to submit borrowing request:', error);
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

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Browse Equipment</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Browse available equipment and submit requests
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="filter-bar">
        <div className="filter-grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <div className="filter-group">
            <label className="filter-label">
              Search Equipment
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
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
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
                <FiFilter className="h-5 w-5 text-gray-400" />
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
                <FiPackage className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value)}
                className="input-field pl-10"
              >
                <option value="all">All Items</option>
                <option value="available">Available Now</option>
                <option value="borrowed">Currently Borrowed</option>
                <option value="maintenance">Maintenance/Broken</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Items Grid */}
      <div className="card">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="bg-gray-100 dark:bg-gray-700 rounded-lg p-6 animate-pulse">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-4"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-24 w-24 text-gray-400">
              <FiPackage className="h-full w-full" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              No items found
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {items.length === 0
                ? "No equipment available at the moment."
                : "No items match your search criteria."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="relative pb-48 overflow-hidden rounded-t-lg mb-4 -mx-6 -mt-6">
                  {item.image ? (
                    <img
                      className="absolute inset-0 h-full w-full object-cover"
                      src={`http://localhost:5000${item.image}`}
                      alt={item.name}
                      onError={(e) => {
                        e.target.style.display = 'none'; // Hide if broken
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                      <FiPackage className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {item.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {item.description || 'No description available'}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleBorrowClick(item)}
                      className="btn-primary text-sm py-1 px-3"
                      disabled={!item.isAvailable || item.availableQuantity === 0}
                    >
                      Borrow
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Category</span>
                    <span className="text-sm font-medium">
                      {typeof item.category === 'object' ? item.category.name : 'Loading...'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Available</span>
                    <span className="text-sm font-medium">
                      {item.availableQuantity} / {item.quantity}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Condition</span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getConditionColor(
                        item.condition
                      )}`}
                    >
                      {item.condition.charAt(0).toUpperCase() + item.condition.slice(1)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Status</span>
                    {item.isAvailable && item.availableQuantity > 0 ? (
                      <span className="inline-flex items-center text-green-600 dark:text-green-400 text-sm">
                        <FaCheckCircle className="mr-1" /> Available
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-red-600 dark:text-red-400 text-sm">
                        <FaTimesCircle className="mr-1" /> Unavailable
                      </span>
                    )}
                  </div>

                  {item.location && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Location</span>
                      <span className="text-sm font-medium">{item.location}</span>
                    </div>
                  )}
                </div>

                {item.serialNumber && (
                  <div className="mt-4 pt-4 border-t dark:border-gray-600">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Serial: {item.serialNumber}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="card border-l-4 border-l-primary-500">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-primary-100 dark:bg-primary-900/30 mr-4">
              <FiPackage className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Items</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white">
                {items.length}
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
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Available</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white">
                {items.filter(item => item.isAvailable && item.availableQuantity > 0).length}
              </p>
            </div>
          </div>
        </div>

        <div className="card border-l-4 border-l-blue-500">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 mr-4">
              <FiCalendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Categories</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white">
                {categories.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Borrow Modal */}
      {isBorrowModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => setIsBorrowModalOpen(false)}
            />

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full sm:p-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Borrow Request
                </h3>

                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    {selectedItem.name}
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Available:</span>
                      <span className="ml-2 font-medium">{selectedItem.availableQuantity}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Condition:</span>
                      <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${getConditionColor(selectedItem.condition)}`}>
                        {selectedItem.condition}
                      </span>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleBorrowSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={selectedItem.availableQuantity}
                      value={borrowForm.quantity}
                      onChange={(e) => setBorrowForm({
                        ...borrowForm,
                        quantity: parseInt(e.target.value) || 1
                      })}
                      className="input-field"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Maximum {selectedItem.availableQuantity} items available
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Expected Return Date *
                    </label>
                    <input
                      type="date"
                      value={borrowForm.expectedReturnDate}
                      onChange={(e) => setBorrowForm({
                        ...borrowForm,
                        expectedReturnDate: e.target.value
                      })}
                      className="input-field"
                      min={format(new Date(new Date().setDate(new Date().getDate() + 1)), 'yyyy-MM-dd')}
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Please select a future date
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Purpose *
                    </label>
                    <textarea
                      value={borrowForm.purpose}
                      onChange={(e) => setBorrowForm({
                        ...borrowForm,
                        purpose: e.target.value
                      })}
                      rows="3"
                      className="input-field"
                      placeholder="Please describe why you need this equipment..."
                      required
                    />
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setIsBorrowModalOpen(false)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                    >
                      Submit Request
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h4 className="text-lg font-medium text-blue-800 dark:text-blue-300 mb-2">
          How to Borrow Equipment
        </h4>
        <ul className="text-blue-700 dark:text-blue-400 space-y-1 text-sm">
          <li>• Browse available equipment using the search and filters</li>
          <li>• Click "Borrow" on an available item</li>
          <li>• Specify quantity and expected return date</li>
          <li>• Provide a clear purpose for borrowing</li>
          <li>• Submit request for officer approval</li>
          <li>• You'll be notified when your request is approved or rejected</li>
        </ul>
      </div>
    </div>
  );
};

export default BrowseItems;