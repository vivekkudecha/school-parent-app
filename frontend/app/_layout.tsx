import React, { Suspense } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function RootLayout() {
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
            <Stack.Screen name="dashboard" />
            <Stack.Screen name="child-profile" />
            <Stack.Screen name="bus-tracking" />
          </Stack>
        </Suspense>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
