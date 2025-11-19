import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://stage.tsis.edu.in/api';

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh if needed
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      
      if (refreshToken) {
        try {
          // You can implement token refresh logic here if needed
          // For now, we'll just clear storage and redirect to login
          await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_data']);
        } catch (refreshError) {
          console.error('Token refresh error:', refreshError);
        }
      }
    }

    return Promise.reject(error);
  }
);

// API Functions
export const authAPI = {
  login: async (username: string, password: string) => {
    const response = await apiClient.post('/parent-authentication', {
      username,
      password,
    });
    return response.data;
  },
  
  // Note: Kids profiles are included in the login response, so no separate API call is needed
  // The kids_profile array from login response is stored in AsyncStorage and used throughout the app
};

export default apiClient;

