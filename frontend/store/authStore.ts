import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, LoginResponse } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (response: LoginResponse) => Promise<void>;
  setUser: (user: User) => void;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  
  setAuth: async (response: LoginResponse) => {
    try {
      await AsyncStorage.multiSet([
        ['access_token', response.access],
        ['refresh_token', response.refresh],
        ['user_data', JSON.stringify(response.account)],
      ]);
      set({
        user: response.account,
        accessToken: response.access,
        refreshToken: response.refresh,
        isAuthenticated: true,
      });
    } catch (error) {
      console.error('Error saving auth data:', error);
      throw error;
    }
  },
  
  setUser: (user) => set({ user, isAuthenticated: true }),
  
  logout: async () => {
    try {
      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_data']);
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  },
  
  initializeAuth: async () => {
    try {
      const [accessToken, refreshToken, userData] = await AsyncStorage.multiGet([
        'access_token',
        'refresh_token',
        'user_data',
      ]);
      
      if (accessToken[1] && refreshToken[1] && userData[1]) {
        set({
          accessToken: accessToken[1],
          refreshToken: refreshToken[1],
          user: JSON.parse(userData[1]),
          isAuthenticated: true,
        });
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_data']);
    }
  },
}));
