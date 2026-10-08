import { apiRequest } from './client';

export const studentApi = {
  getDashboard: () => apiRequest('/api/students/me/dashboard'),
  getProfile: () => apiRequest('/api/students/me'),
  updateProfile: (data) =>
    apiRequest('/api/students/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  uploadPhoto: (file) => {
    const formData = new FormData();
    formData.append('photo', file);
    return apiRequest('/api/students/me/photo', {
      method: 'POST',
      body: formData,
    });
  },
  getAttendanceHistory: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/api/students/me/attendance${query ? `?${query}` : ''}`);
  },
};
