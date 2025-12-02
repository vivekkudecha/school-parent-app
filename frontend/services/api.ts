import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';

const API_BASE_URL = 'https://stage.tsis.edu.in/api';

// Global logout handler - will be set by the app
let globalLogoutHandler: (() => void) | null = null;

export const setLogoutHandler = (handler: () => void) => {
  globalLogoutHandler = handler;
};

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Track if we're already showing the logout alert to prevent multiple alerts
let isLoggingOut = false;

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

// Response interceptor to handle 401 errors and auto-logout
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Prevent multiple logout attempts
      if (isLoggingOut) {
        return Promise.reject(error);
      }
      
      isLoggingOut = true;
      
      try {
        // Clear all auth data
        await AsyncStorage.multiRemove([
          'access_token',
          'refresh_token',
          'user_data',
          'kids_profiles',
          'selected_kid_profile',
        ]);
        
        // Show session expired alert
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please login again.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Call the global logout handler if set
                if (globalLogoutHandler) {
                  globalLogoutHandler();
                }
                isLoggingOut = false;
              },
            },
          ],
          { cancelable: false }
        );
      } catch (logoutError) {
        console.error('Error during logout:', logoutError);
        isLoggingOut = false;
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

export const studentAPI = {
  getProfile: async (userId: number) => {
    try {
      const response = await apiClient.get(`/student-profile`, {
        params: {
          user_id: userId,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Student API error:', error);
      throw error;
    }
  },
  
  getCurrentRoute: async (admissionId: number) => {
    try {
      const response = await apiClient.get(`/student-current-route/${admissionId}/`);
      return response.data;
    } catch (error) {
      console.error('Route API error:', error);
      throw error;
    }
  },
};

export default apiClient;

