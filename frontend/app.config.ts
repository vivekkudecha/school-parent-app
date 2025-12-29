import type { ExpoConfig } from '@expo/config';

const googleMapsApiKey = 'AIzaSyCR3B5eUaUqllvoHgBkLKdDxrCoMzTic08';

const config: ExpoConfig = {
  name: 'frontend',
  slug: 'tsis-parent-app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'frontend',
  userInterfaceStyle: 'automatic',
  newArchEnabled: false,

  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.icebit.tsis.parentapp',
    config: {
      googleMapsApiKey, // ← Correct placement
    },
  },

  android: {
    package: 'com.icebit.tsis.parentapp',
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#000',
    },
    permissions: [
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
    ],
    config: {
      googleMaps: {
        apiKey: googleMapsApiKey,
      },
    },
  },

  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },

  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-image.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#000',
      },
    ],
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Allow EduTrack to use your location to track school bus.',
      },
    ],
  ],

  experiments: {
    typedRoutes: true,
  },

  extra: {
    EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: googleMapsApiKey,
  },

  owner: 'icebit-technologies-pvt-ltd',
};

export default config;
