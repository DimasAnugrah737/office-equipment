import React, { useState, useEffect } from 'react';
import { reportsAPI } from '../api/reports';
import { useApi } from '../hooks/useApi';
import { FiDownload, FiFileText, FiBarChart2, FiCalendar, FiPrinter } from 'react-icons/fi';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import toast from 'react-hot-toast';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';

const Reports = () => {
  const [reportType, setReportType] = useState('borrowings');
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });
  const [formatType, setFormatType] = useState('pdf');
  const [isGenerating, setIsGenerating] = useState(false);
  const [inventoryReport, setInventoryReport] = useState(null);

  const { execute: generateReport } = useApi(reportsAPI.generateBorrowingReport);
  const { execute: fetchInventoryReport } = useApi(reportsAPI.getInventoryReport);

  useEffect(() => {
    loadInventoryReport();
  }, []);

  const loadInventoryReport = async () => {
    try {
      const data = await fetchInventoryReport();
      // Validate response structure
      if (data && typeof data === 'object' && data.summary) {
        setInventoryReport(data);
      } else {
        console.warn('Invalid inventory report structure:', data);
        // Set default structure if response is invalid
        setInventoryReport({
          summary: { totalItems: 0, totalQuantity: 0, availableItems: 0, borrowedItems: 0, categories: 0 },
          categoryStats: [],
          conditionStats: [],
          items: []
        });
      }
    } catch (error) {
      console.error('Failed to load inventory report:', error);
      // Set default structure on error
      setInventoryReport({
        summary: { totalItems: 0, totalQuantity: 0, availableItems: 0, borrowedItems: 0, categories: 0 },
        categoryStats: [],
        conditionStats: [],
        items: []
      });
    }
  };

  const handleDateRangeChange = (range) => {
    const today = new Date();
    let startDate, endDate;

    switch (range) {
      case 'today':
        startDate = format(today, 'yyyy-MM-dd');
        endDate = format(today, 'yyyy-MM-dd');
        break;
      case 'yesterday':
        const yesterday = subDays(today, 1);
        startDate = format(yesterday, 'yyyy-MM-dd');
        endDate = format(yesterday, 'yyyy-MM-dd');
        break;
      case 'week':
        startDate = format(subDays(today, 7), 'yyyy-MM-dd');
        endDate = format(today, 'yyyy-MM-dd');
        break;
      case 'month':
        startDate = format(startOfMonth(today), 'yyyy-MM-dd');
        endDate = format(endOfMonth(today), 'yyyy-MM-dd');
        break;
      case 'quarter':
        startDate = format(subDays(today, 90), 'yyyy-MM-dd');
        endDate = format(today, 'yyyy-MM-dd');
        break;
      default:
        return;
    }

    setDateRange({ startDate, endDate });
  };

  const generateBorrowingReport = async () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      toast.error('Please select a date range');
      return;
    }

    if (new Date(dateRange.startDate) > new Date(dateRange.endDate)) {
      toast.error('Start date cannot be after end date');
      return;
    }

    setIsGenerating(true);
    try {
      const data = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        format: formatType,
      };

      const result = await generateReport(data);

      // For JSON format, show data in modal
      if (formatType === 'json') {
        // You can implement a modal to show JSON data
        console.log('Report data:', result);
        toast.success('Report generated. Check console for data.');
      } else {
        // Handle file download for PDF and Excel
        const blob = new Blob([result], {
          type: formatType === 'excel'
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'application/pdf'
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `borrowing_report_${format(new Date(), 'yyyy-MM-dd_HHmm')}.${formatType === 'excel' ? 'xlsx' : 'pdf'}`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success('Report downloaded successfully');
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportInventoryExcel = () => {
    if (!inventoryReport?.categoryStats?.length) {
      toast.error('No data to export');
      return;
    }

    const data = (inventoryReport?.categoryStats || []).map(stat => ({
      Category: stat.categoryName,
      'Total Items': stat.itemCount,
      'Total Quantity': stat.totalQuantity,
      'Available Quantity': stat.availableQuantity
    }));

    exportToExcel(data, 'inventory_report', 'Inventory');
  };

  const handleExportInventoryPDF = () => {
    if (!inventoryReport?.categoryStats?.length) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Category', 'Total Items', 'Total Qty', 'Available Qty'];
    const data = (inventoryReport?.categoryStats || []).map(stat => [
      stat.categoryName,
      stat.itemCount,
      stat.totalQuantity,
      stat.availableQuantity
    ]);

    exportToPDF(headers, data, 'inventory_report', 'Equipment Inventory Report');
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            System overview and statistics
          </p>
        </div>
      </div>

      {/* Report Type Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Borrowings Report */}
        <div className="card">
          <div className="flex items-center mb-6">
            <div className="p-3 rounded-lg bg-primary-100 dark:bg-primary-900 mr-4">
              <FiBarChart2 className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Borrowings Report
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Generate borrowing reports by date range
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Date Range Presets */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest dark:text-slate-400">
                Quick Select
              </label>
              <div className="flex flex-wrap gap-2">
                {['today', 'yesterday', 'week', 'month', 'quarter'].map((range) => (
                  <button
                    key={range}
                    onClick={() => handleDateRangeChange(range)}
                    className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md transition-colors"
                  >
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest dark:text-slate-400">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  className="input-field"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest dark:text-slate-400">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>

            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Output Format
              </label>
              <div className="flex space-x-4">
                {['pdf', 'excel'].map((format) => (
                  <label key={format} className="flex items-center">
                    <input
                      type="radio"
                      name="format"
                      value={format}
                      checked={formatType === format}
                      onChange={(e) => setFormatType(e.target.value)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      {format.toUpperCase()}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <div className="pt-4">
              <button
                onClick={generateBorrowingReport}
                disabled={isGenerating}
                className="btn-primary w-full flex items-center justify-center"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <FiDownload className="mr-2" />
                    Generate Borrowing Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Inventory Report */}
        <div className="card">
          <div className="flex items-center mb-6">
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900 mr-4">
              <FiFileText className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Inventory Report
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Current inventory status and statistics
              </p>
            </div>
          </div>

          {inventoryReport ? (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border-l-4 border-primary-500">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Items</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white">
                    {inventoryReport.summary.totalItems}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border-l-4 border-green-500">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Available</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white">
                    {inventoryReport.summary.availableItems}
                  </p>
                </div>
              </div>

              {/* Category Stats */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Items by Category
                </h4>
                <div className="space-y-3">
                  {(inventoryReport?.categoryStats || []).map((stat, idx) => (
                    <div key={stat._id ?? stat.categoryName ?? idx} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {stat.categoryName}
                      </span>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm font-medium">
                          {stat.itemCount} items
                        </span>
                        <div className="w-24 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                          <div
                            className="bg-primary-600 h-2 rounded-full"
                            style={{
                              width: `${inventoryReport?.summary?.totalItems > 0 ? (stat.itemCount / inventoryReport.summary.totalItems) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Download Button */}
              <div className="pt-4 flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleExportInventoryExcel}
                  className="btn-secondary flex-1 flex items-center justify-center bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                >
                  <FiDownload className="mr-2" />
                  Excel
                </button>
                <button
                  onClick={handleExportInventoryPDF}
                  className="btn-secondary flex-1 flex items-center justify-center bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                >
                  <FiDownload className="mr-2" />
                  PDF
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          )}
        </div>
      </div>

      {/* Report Preview Section */}
      <div className="card">
        <div className="flex items-center mb-6">
          <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900 mr-4">
            <FiPrinter className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Report Preview
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Quick overview of recent activity
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Last 7 Days</p>
                <p className="text-xl font-black text-gray-900 dark:text-white">
                  {inventoryReport?.summary?.totalItems || '0'}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <FiBarChart2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Available Rate</p>
                <p className="text-xl font-black text-gray-900 dark:text-white">
                  {inventoryReport ?
                    `${Math.round((inventoryReport.summary.availableItems / inventoryReport.summary.totalItems) * 100)}%`
                    : '0%'}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <FiCalendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Categories</p>
                <p className="text-xl font-black text-gray-900 dark:text-white">
                  {inventoryReport?.summary?.categories || '0'}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <FiFileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h4 className="text-lg font-medium text-blue-800 dark:text-blue-300 mb-2">
          Report Generation Tips
        </h4>
        <ul className="text-blue-700 dark:text-blue-400 space-y-1 text-sm">
          <li>• PDF reports are best for printing and sharing</li>
          <li>• Excel reports allow for further data analysis</li>
          <li>• JSON format is useful for API integrations</li>
          <li>• Inventory reports are updated in real-time</li>
          <li>• Reports are generated based on your permissions</li>
        </ul>
      </div>
    </div>
  );
};

export default Reports;