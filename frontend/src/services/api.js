import axios from 'axios';
import { API_ENDPOINTS, HTTP_STATUS, ERROR_MESSAGES } from '../constants';

// Get API base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Create axios instance with dynamic configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const { response } = error;
    
    if (!response) {
      // Network error
      return Promise.reject(new Error(ERROR_MESSAGES.NETWORK_ERROR));
    }

    const { status, data } = response;
    
    // Handle specific HTTP status codes
    switch (status) {
      case HTTP_STATUS.UNAUTHORIZED:
        // Clear token and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(new Error(ERROR_MESSAGES.UNAUTHORIZED));
        
      case HTTP_STATUS.FORBIDDEN:
        return Promise.reject(new Error(ERROR_MESSAGES.FORBIDDEN));
        
      case HTTP_STATUS.NOT_FOUND:
        return Promise.reject(new Error(ERROR_MESSAGES.NOT_FOUND));
        
      case HTTP_STATUS.BAD_REQUEST:
        return Promise.reject(new Error(data.message || ERROR_MESSAGES.VALIDATION));
        
      case HTTP_STATUS.INTERNAL_SERVER_ERROR:
        return Promise.reject(new Error(ERROR_MESSAGES.SERVER_ERROR));
        
      default:
        return Promise.reject(new Error(data.message || ERROR_MESSAGES.SERVER_ERROR));
    }
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post(API_ENDPOINTS.AUTH.REGISTER, data),
  login: (data) => api.post(API_ENDPOINTS.AUTH.LOGIN, data),
  getMe: () => api.get(API_ENDPOINTS.AUTH.PROFILE),
  updateProfile: (data) => api.put(API_ENDPOINTS.AUTH.PROFILE, data),
  changePassword: (data) => api.put(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, data)
};

// Videos API
export const videoAPI = {
  getVideos: (params) => api.get(API_ENDPOINTS.VIDEOS.LIST, { params }),
  getVideo: (id) => api.get(API_ENDPOINTS.VIDEOS.GET.replace(':id', id)),
  getStatus: (id) => api.get(`/videos/${id}/status`), // Keep this for compatibility
  getStats: () => api.get(API_ENDPOINTS.VIDEOS.STATS),
  updateVideo: (id, data) => api.put(API_ENDPOINTS.VIDEOS.UPDATE.replace(':id', id), data),
  deleteVideo: (id) => api.delete(API_ENDPOINTS.VIDEOS.DELETE.replace(':id', id)),

  uploadVideo: (formData, onUploadProgress) =>
    api.post(API_ENDPOINTS.VIDEOS.UPLOAD, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
      timeout: 0, // No timeout for large uploads
    }),

  getStreamUrl: (id) => `${API_BASE_URL}${API_ENDPOINTS.VIDEOS.STREAM.replace(':id', id)}`,
};

// Users API (admin only)
export const userAPI = {
  getUsers: (params) => api.get(API_ENDPOINTS.USERS.LIST, { params }),
  getUser: (id) => api.get(API_ENDPOINTS.USERS.GET.replace(':id', id)),
  createUser: (data) => api.post(API_ENDPOINTS.USERS.CREATE, data),
  updateUser: (id, data) => api.put(API_ENDPOINTS.USERS.UPDATE.replace(':id', id), data),
  deleteUser: (id) => api.delete(API_ENDPOINTS.USERS.DELETE.replace(':id', id))
};

// Utility functions
export const apiUtils = {
  // Build query string from filters
  buildQueryString: (filters) => {
    const params = new URLSearchParams();
    
    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    
    return params.toString();
  },

  // Cancel request
  cancelRequest: () => {
    const CancelToken = axios.CancelToken;
    return CancelToken.source();
  }
};

export default api;
