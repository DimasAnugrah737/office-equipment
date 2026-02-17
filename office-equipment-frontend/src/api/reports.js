import api from './axiosConfig';

export const reportsAPI = {
  generateBorrowingReport: (data) => {
    const isFile = data.format === 'excel' || data.format === 'pdf';
    return api.post('/reports/borrowings', data, isFile ? { responseType: 'blob' } : {});
  },

  getInventoryReport: () => api.get('/reports/inventory'),

  getActivityLogs: (params) => api.get('/reports/activity-logs', { params }),
};