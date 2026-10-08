import { apiRequest } from './client';

export const attendanceApi = {
  getAttendance: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/api/attendance${query ? `?${query}` : ''}`);
  },
  manualMark: (data) =>
    apiRequest('/api/attendance/manual', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateRecord: (id, data) =>
    apiRequest(`/api/attendance/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteRecord: (id) =>
    apiRequest(`/api/attendance/${id}`, {
      method: 'DELETE',
    }),
  exportCsv: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const blob = await apiRequest(`/api/attendance/export${query ? `?${query}` : ''}`);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Attendance_Export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
  getSessions: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/api/attendance/sessions${query ? `?${query}` : ''}`);
  },
  createSession: (data) =>
    apiRequest('/api/attendance/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateSession: (id, data) =>
    apiRequest(`/api/attendance/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};
