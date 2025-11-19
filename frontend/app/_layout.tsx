import React, { Suspense, useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useAuthStore } from '@/store/authStore';
import { useChildrenStore } from '@/store/childrenStore';


export default function RootLayout() {
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();
  const segments = useSegments();
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const initializeKids = useChildrenStore((state) => state.initializeKids);
  const kidsProfiles = useChildrenStore((state) => state.kidsProfiles);
  const selectedKidProfile = useChildrenStore((state) => state.selectedKidProfile);
  const setKidsProfiles = useChildrenStore((state) => state.setKidsProfiles);
  const setSelectedKidProfile = useChildrenStore((state) => state.setSelectedKidProfile);

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
      // If only one kid and none selected, auto-select it
      const currentKidsProfiles = useChildrenStore.getState().kidsProfiles;
      const currentSelected = useChildrenStore.getState().selectedKidProfile;
      
      if (currentKidsProfiles.length === 1 && !currentSelected) {
        setSelectedKidProfile(currentKidsProfiles[0]);
      }
    }
  }, [isInitialized, isAuthenticated]);

  useEffect(() => {
    if (!isInitialized) return;

    if (isAuthenticated) {
      // Navigate based on kids profiles
      const currentKidsProfiles = useChildrenStore.getState().kidsProfiles;
      const currentSelectedKid = useChildrenStore.getState().selectedKidProfile;
      
      if (currentKidsProfiles.length === 0) {
        // No kids - go to dashboard
        if (segments[0] !== 'dashboard') {
          router.replace('/dashboard');
        }
      } else if (currentKidsProfiles.length === 1) {
        // Single kid - auto-select if not selected
        if (!currentSelectedKid) {
          setSelectedKidProfile(currentKidsProfiles[0]);
        }
        if (segments[0] !== 'dashboard') {
          router.replace('/dashboard');
        }
      } else {
        // Multiple kids
        if (!currentSelectedKid) {
          // No kid selected - go to selection screen
          if (segments[0] !== 'select-kid') {
            router.replace('/select-kid');
          }
        } else {
          // Kid selected - go to dashboard
          if (segments[0] !== 'dashboard') {
            router.replace('/dashboard');
          }
        }
      }
    } else {
      // User is not authenticated - redirect to login if on protected routes
      const currentSegment = segments[0];
      const protectedRoutes = ['dashboard', 'select-kid', 'child-profile', 'bus-tracking'];
      if (currentSegment && protectedRoutes.includes(currentSegment)) {
        router.replace('/');
      }
    }
  }, [isInitialized, isAuthenticated, segments]);

  if (!isInitialized) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <LoadingSpinner message="Loading app..." />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Suspense fallback={<LoadingSpinner message="Loading app..." />}>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="select-kid" />
            <Stack.Screen name="dashboard" />
            <Stack.Screen name="child-profile" />
            <Stack.Screen name="bus-tracking" />
          </Stack>
        </Suspense>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
