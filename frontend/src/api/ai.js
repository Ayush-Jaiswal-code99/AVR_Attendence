import { apiRequest } from './client';

export const aiApi = {
  getStatus: () => apiRequest('/api/ai/status'),
  reloadCache: () =>
    apiRequest('/api/ai/reload-cache', {
      method: 'POST',
    }),
  markAttendance: (data) =>
    apiRequest('/api/ai/attendance/mark', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  recognizeFrame: (file, tolerance) => {
    const formData = new FormData();
    formData.append('file', file);
    if (tolerance) formData.append('tolerance', tolerance);
    return apiRequest('/api/ai/recognize', {
      method: 'POST',
      body: formData,
    });
  },
  recognizeAndPunch: (file, sessionId, cameraId) => {
    const formData = new FormData();
    formData.append('file', file);
    if (sessionId) formData.append('session_id', sessionId);
    if (cameraId) formData.append('camera_id', cameraId);
    return apiRequest('/api/ai/recognize-and-punch', {
      method: 'POST',
      body: formData,
    });
  },
};
