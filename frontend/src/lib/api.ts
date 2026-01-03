import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/auth/login') window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (email: string, password: string, name: string) => api.post('/auth/register', { email, password, name }),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data: any) => api.put('/auth/profile', data),
  changePassword: (currentPassword: string, newPassword: string) => api.post('/auth/change-password', { currentPassword, newPassword }),
  logout: () => api.post('/auth/logout'),
};

export const usersApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string; role?: string; status?: string }) => api.get('/users', { params }),
  getById: (id: string) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

export const meetingsApi = {
  getAll: (params?: { page?: number; limit?: number; status?: string; search?: string }) => api.get('/meetings', { params }),
  getById: (id: string) => api.get(`/meetings/${id}`),
  create: (data: any) => api.post('/meetings', data),
  update: (id: string, data: any) => api.put(`/meetings/${id}`, data),
  delete: (id: string) => api.delete(`/meetings/${id}`),
  updateBrief: (id: string, data: any) => api.put(`/meetings/${id}/brief`, data),
  addParticipant: (id: string, data: any) => api.post(`/meetings/${id}/participants`, data),
  updateParticipant: (id: string, participantId: string, data: any) => api.put(`/meetings/${id}/participants/${participantId}`, data),
  deleteParticipant: (id: string, participantId: string) => api.delete(`/meetings/${id}/participants/${participantId}`),
  extractParticipants: (id: string, content: string) => api.post(`/meetings/${id}/extract-participants`, { content }),
  addTask: (id: string, data: any) => api.post(`/meetings/${id}/tasks`, data),
  updateTask: (id: string, taskId: string, data: any) => api.put(`/meetings/${id}/tasks/${taskId}`, data),
  deleteTask: (id: string, taskId: string) => api.delete(`/meetings/${id}/tasks/${taskId}`),
  complete: (id: string) => api.post(`/meetings/${id}/complete`),
};

export const analyticsApi = {
  getDashboardStats: () => api.get('/analytics/dashboard'),
  getMeetingsByDate: (days?: number) => api.get('/analytics/meetings-by-date', { params: { days } }),
  getTaskStats: () => api.get('/analytics/tasks'),
  getUserActivity: (limit?: number) => api.get('/analytics/user-activity', { params: { limit } }),
  trackEvent: (data: { event_type: string; event_data?: any; page?: string }) => api.post('/analytics/track', data),
  getActivityLog: (limit?: number) => api.get('/analytics/activity', { params: { limit } }),
};

export default api;