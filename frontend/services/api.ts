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
    console.log('Login response:', response.data);
    return response.data;
  },
  
  requestOTPForPasswordReset: async (email: string) => {
    try {
      const response = await apiClient.post('/request-otp-for-password-forget', {
        email,
      });
      return response.data;
    } catch (error) {
      console.error('Request OTP error:', error);
      throw error;
    }
  },
  
  verifyOTPAndResetPassword: async (
    email: string,
    newPassword: string,
    confirmPassword: string,
    otp: string
  ) => {
    try {
      const response = await apiClient.post('/verify-otp-and-forget-password', {
        email,
        new_password: newPassword,
        confirm_password: confirmPassword,
        otp,
      });
      return response.data;
    } catch (error) {
      console.error('Verify OTP and reset password error:', error);
      throw error;
    }
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
  
  getFeesData: async (studentId: number, admissionId: number, academicPackageId: number) => {
    try {
      const response = await apiClient.get(`/student-fees-data-quarter-wise`, {
        params: {
          student: studentId,
          admission: admissionId,
          academic_package: academicPackageId,
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('Fees API error:', error);
      
      // Log detailed error information
      if (error.response) {
        // Server responded with error status
        console.error('Fees API - Response status:', error.response.status);
        console.error('Fees API - Response data:', error.response.data);
        console.error('Fees API - Request URL:', error.config?.url);
        console.error('Fees API - Request params:', {
          student: studentId,
          admission: admissionId,
          academic_package: academicPackageId,
        });
        
        // Extract error message from response
        let errorMessage = 'Failed to fetch fees data';
        if (error.response.data) {
          if (typeof error.response.data === 'string') {
            errorMessage = error.response.data;
          } else if (error.response.data.detail) {
            errorMessage = Array.isArray(error.response.data.detail)
              ? error.response.data.detail.map((item: any) => 
                  typeof item === 'object' && item.msg ? item.msg : String(item)
                ).join(', ')
              : String(error.response.data.detail);
          } else if (error.response.data.message) {
            errorMessage = error.response.data.message;
          } else if (error.response.data.error) {
            errorMessage = error.response.data.error;
          }
        }
        console.error('Fees API - Error message:', errorMessage);
      } else if (error.request) {
        // Request was made but no response received
        console.error('Fees API - No response received:', error.request);
        console.error('Fees API - Request URL:', error.config?.url);
        console.error('Fees API - Request params:', {
          student: studentId,
          admission: admissionId,
          academic_package: academicPackageId,
        });
      } else {
        // Error setting up the request
        console.error('Fees API - Request setup error:', error.message);
      }
      
      throw error;
    }
  },
};

export default apiClient;

