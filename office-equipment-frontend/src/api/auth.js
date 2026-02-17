import api from './axiosConfig';

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  
  getCurrentUser: () => api.get('/auth/me'),
  
  updateTheme: (theme) => api.put('/auth/theme', { themePreference: theme }),
  
  logout: () => api.post('/auth/logout'),
};