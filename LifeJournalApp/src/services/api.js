import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use localhost for development, Vercel URL for production
const BASE_URL = __DEV__
  ? 'http://10.0.2.2:3001'  // Android emulator localhost
  : 'https://backend-eta-flax-34.vercel.app';

// Alternative URLs for different environments
export const API_URLS = {
  local: 'http://10.0.2.2:3001',      // Android emulator
  localDevice: 'http://192.168.1.100:3001', // Replace with your local IP
  production: 'https://backend-eta-flax-34.vercel.app',
};

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  getGoogleAuthUrl: async () => {
    const response = await api.get('/auth/google');
    return response.data;
  },

  loginWithGoogle: async (code, redirectUri) => {
    const response = await api.post('/auth/callback/google', { code, redirect_uri: redirectUri });
    return response.data;
  },

  loginMock: async (email = 'demo@lifejournal.app') => {
    const response = await api.post('/auth/mock', { email });
    return response.data;
  },
};

// Timeline API
export const timelineAPI = {
  getTimeline: async (start, end) => {
    const params = start && end ? `?start=${start}&end=${end}` : '';
    const response = await api.get(`/api/timeline${params}`);
    return response.data;
  },

  getTimelineForDate: async (date) => {
    const response = await api.get(`/api/timeline/${date}`);
    return response.data;
  },

  sync: async (start, end) => {
    const response = await api.post('/api/sync', { start, end });
    return response.data;
  },

  testSync: async () => {
    const response = await api.post('/api/sync/test');
    return response.data;
  },
};

// Insights API
export const insightsAPI = {
  getWeeklyInsights: async () => {
    const response = await api.get('/api/insights/weekly');
    return response.data;
  },

  getTestInsights: async () => {
    const response = await api.get('/api/insights/test');
    return response.data;
  },
};

// Health API
export const healthAPI = {
  check: async () => {
    const response = await api.get('/api/health');
    return response.data;
  },

  test: async () => {
    const response = await api.get('/api/test');
    return response.data;
  },
};

// User API
export const userAPI = {
  getUser: async () => {
    const response = await api.get('/api/user');
    return response.data;
  },
};

export default api;
