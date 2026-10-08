import { apiRequest } from './client';

export const authApi = {
  login: (usernameOrEmail, password) =>
    apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username_or_email: usernameOrEmail, password }),
    }),

  registerStudent: (formData) =>
    apiRequest('/api/auth/register-student', {
      method: 'POST',
      body: formData,
    }),

  getMe: () => apiRequest('/api/auth/me'),

  changePassword: (currentPassword, newPassword) =>
    apiRequest('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    }),
};
