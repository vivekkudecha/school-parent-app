import React, { Suspense, useEffect, useState, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useAuthStore } from '@/store/authStore';
import { useChildrenStore } from '@/store/childrenStore';
import { setLogoutHandler } from '@/services/api';


export default function RootLayout() {
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();
  const segments = useSegments();
  const prevAuthenticatedRef = useRef<boolean | null>(null);
  const hasHandledInitialNavigationRef = useRef(false);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const clearChildren = useChildrenStore((state) => state.clearChildren);
  const initializeKids = useChildrenStore((state) => state.initializeKids);
  const kidsProfiles = useChildrenStore((state) => state.kidsProfiles);
  const selectedKidProfile = useChildrenStore((state) => state.selectedKidProfile);
  const setKidsProfiles = useChildrenStore((state) => state.setKidsProfiles);
  const setSelectedKidProfile = useChildrenStore((state) => state.setSelectedKidProfile);

  // Set up global logout handler for API interceptor
  useEffect(() => {
    const handleLogout = async () => {
      try {
        await logout();
        await clearChildren();
        router.replace('/');
      } catch (error) {
        console.error('Error during logout:', error);
        router.replace('/');
      }
    };

    setLogoutHandler(handleLogout);
  }, [logout, clearChildren, router]);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize auth from storage
        await initializeAuth();
        
        // Initialize kids from storage
        await initializeKids();
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing app:', error);
        setIsInitialized(true);
      }
    };

    initializeApp();
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    if (isAuthenticated) {
      // Kids profiles are already stored from login response in AsyncStorage
      // They are initialized via initializeKids() which is called in the first useEffect
      // Auto-select first kid if available and none selected
      const currentKidsProfiles = useChildrenStore.getState().kidsProfiles;
      const currentSelected = useChildrenStore.getState().selectedKidProfile;
      
      if (currentKidsProfiles.length > 0 && !currentSelected) {
        setSelectedKidProfile(currentKidsProfiles[0]);
      }
    }
  }, [isInitialized, isAuthenticated]);

  useEffect(() => {
    if (!isInitialized) return;

    const currentSegment = segments[0];
    const justBecameAuthenticated = prevAuthenticatedRef.current === false && isAuthenticated === true;
    
    // Update previous auth state
    prevAuthenticatedRef.current = isAuthenticated;

    if (isAuthenticated) {
      // Only navigate on app initialization (when app opens and user is already logged in)
      // Don't navigate after fresh login - let login screen handle its own navigation
      // Don't navigate if already on a valid authenticated screen (allows back navigation)
      const isOnLoginScreen = !currentSegment;
      if (!hasHandledInitialNavigationRef.current && 
          isOnLoginScreen && 
          !justBecameAuthenticated) {
        // App opened with user already logged in - always go to dashboard
        hasHandledInitialNavigationRef.current = true;
        
        // Auto-select first kid if available and none selected
        if (kidsProfiles.length > 0 && !selectedKidProfile) {
          setSelectedKidProfile(kidsProfiles[0]);
        }
        
        router.replace('/(tabs)/dashboard');
      } else if (currentSegment === 'forgot-password') {
        // Allow forgot-password screen to stay
        return;
      } else if (currentSegment === 'select-kid') {
        // Redirect from select-kid to dashboard (select-kid screen removed)
        if (kidsProfiles.length > 0 && !selectedKidProfile) {
          setSelectedKidProfile(kidsProfiles[0]);
        }
        router.replace('/(tabs)/dashboard');
      }
      // Allow other screens (dashboard, child-profile, bus-tracking) to stay
      // Don't force navigation away from these screens - let user navigate freely
    } else {
      // User is not authenticated - reset navigation flag and redirect to login if on protected routes
      hasHandledInitialNavigationRef.current = false;
      const protectedRoutes = ['(tabs)', 'select-kid', 'bus-tracking'];
      if (currentSegment && protectedRoutes.includes(currentSegment)) {
        router.replace('/');
      }
    }
  }, [isInitialized, isAuthenticated, kidsProfiles.length, selectedKidProfile, segments]);

  if (!isInitialized) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="dark" backgroundColor="#FFFFFF" />
        <SafeAreaProvider>
          <LoadingSpinner message="Loading app..." />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />
      <SafeAreaProvider>
        <Suspense fallback={<LoadingSpinner message="Loading app..." />}>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="bus-tracking" />
          </Stack>
        </Suspense>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
