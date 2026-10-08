import { apiRequest } from './client';

export const adminApi = {
  getDashboard: () => apiRequest('/api/admin/dashboard'),
  getStudents: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/api/admin/students${query ? `?${query}` : ''}`);
  },
  getStudentDetails: (id) => apiRequest(`/api/admin/students/${id}`),
  createStudent: (data) =>
    apiRequest('/api/admin/students', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateStudent: (id, data) =>
    apiRequest(`/api/admin/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteStudent: (id) =>
    apiRequest(`/api/admin/students/${id}`, {
      method: 'DELETE',
    }),
  approveEnrollment: (id) =>
    apiRequest(`/api/admin/students/${id}/approve`, {
      method: 'POST',
    }),
  rejectEnrollment: (id) =>
    apiRequest(`/api/admin/students/${id}/reject`, {
      method: 'POST',
    }),
  replacePhoto: (id, file) => {
    const formData = new FormData();
    formData.append('photo', file);
    return apiRequest(`/api/admin/students/${id}/replace-photo`, {
      method: 'POST',
      body: formData,
    });
  },
  getAuditLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/api/admin/audit-logs${query ? `?${query}` : ''}`);
  },
};
