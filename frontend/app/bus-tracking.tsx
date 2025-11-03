import React, { useEffect, useState, Suspense } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useChildrenStore } from '@/store/childrenStore';
import { BusLocation } from '@/types';
import { ArrowLeft, Bus, Home, School, Clock, MapPin, Navigation } from 'lucide-react-native';
import { EXPO_PUBLIC_BACKEND_URL, COLORS, SCHOOL_LOCATION, UPDATE_INTERVAL } from '@/constants/config';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const { width, height } = Dimensions.get('window');

export default function BusTrackingScreen() {
  const router = useRouter();
  const selectedChild = useChildrenStore((state) => state.selectedChild);
  const [busLocation, setBusLocation] = useState<BusLocation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedChild) {
      router.back();
      return;
    }

    fetchBusLocation();
    const interval = setInterval(fetchBusLocation, UPDATE_INTERVAL);

    return () => clearInterval(interval);
  }, [selectedChild]);

  const fetchBusLocation = async () => {
    if (!selectedChild) return;

    try {
      const response = await fetch(
        `${EXPO_PUBLIC_BACKEND_URL}/api/bus/${selectedChild.bus_info.bus_id}/location`
      );
      const data = await response.json();

      if (response.ok) {
        setBusLocation(data);
      }
    } catch (error) {
      console.error('Fetch bus location error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedChild) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Live Tracking</Text>
          <Text style={styles.headerSubtitle}>
            {selectedChild.bus_info.bus_number}
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Map Placeholder */}
        <View style={styles.mapPlaceholder}>
          <View style={styles.mapIconContainer}>
            <Navigation size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.mapPlaceholderTitle}>Live Map Tracking</Text>
          <Text style={styles.mapPlaceholderSubtitle}>
            Real-time GPS tracking with interactive map is available on mobile devices
          </Text>
          <View style={styles.coordinatesContainer}>
            <View style={styles.coordinateItem}>
              <Bus size={20} color={COLORS.primary} />
              <Text style={styles.coordinateLabel}>Bus Location</Text>
              <Text style={styles.coordinateValue}>
                {busLocation ? `${busLocation.latitude.toFixed(4)}, ${busLocation.longitude.toFixed(4)}` : 'Loading...'}
              </Text>
            </View>
          </View>
        </View>

        {/* Location Cards */}
        <View style={styles.locationsContainer}>
          <View style={styles.locationCard}>
            <View style={[styles.locationIcon, { backgroundColor: COLORS.warning }]}>
              <School size={24} color={COLORS.background} />
            </View>
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>School</Text>
              <Text style={styles.locationName}>{SCHOOL_LOCATION.name}</Text>
              <Text style={styles.locationCoords}>
                {SCHOOL_LOCATION.latitude.toFixed(4)}, {SCHOOL_LOCATION.longitude.toFixed(4)}
              </Text>
            </View>
          </View>

          <View style={styles.locationCard}>
            <View style={[styles.locationIcon, { backgroundColor: COLORS.success }]}>
              <Home size={24} color={COLORS.background} />
            </View>
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>Home</Text>
              <Text style={styles.locationName}>{selectedChild.name}'s Home</Text>
              <Text style={styles.locationCoords}>
                {selectedChild.home_location.latitude.toFixed(4)}, {selectedChild.home_location.longitude.toFixed(4)}
              </Text>
            </View>
          </View>
        </View>

        {/* Bus Info Card */}
        <View style={styles.infoCard}>
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} />
          ) : busLocation ? (
            <>
              <View style={styles.infoHeader}>
                <Text style={styles.infoTitle}>Bus Status</Text>
                <View style={styles.liveIndicator}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>Live</Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Clock size={24} color={COLORS.primary} />
                  <Text style={styles.statLabel}>ETA</Text>
                  <Text style={styles.statValue}>{busLocation.eta_minutes} min</Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statItem}>
                  <Bus size={24} color={COLORS.primary} />
                  <Text style={styles.statLabel}>Status</Text>
                  <Text style={styles.statValue}>{busLocation.status}</Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statItem}>
                  <MapPin size={24} color={COLORS.primary} />
                  <Text style={styles.statLabel}>Route</Text>
                  <Text style={styles.statValueSmall}>Tracking</Text>
                </View>
              </View>

              <View style={styles.detailsSection}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Driver</Text>
                  <Text style={styles.detailValue}>
                    {selectedChild.bus_info.driver_name}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Route</Text>
                  <Text style={styles.detailValue}>
                    {selectedChild.bus_info.route}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Last Updated</Text>
                  <Text style={styles.detailValue}>
                    {new Date(busLocation.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <Text style={styles.errorText}>Unable to load bus location</Text>
          )}
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>📱 Mobile App Feature</Text>
          <Text style={styles.noteText}>
            Open this app in Expo Go on your mobile device to see the interactive Google Maps view with live bus tracking, school location, and home markers.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.secondary,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  mapPlaceholder: {
    backgroundColor: COLORS.secondary,
    margin: 16,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
  },
  mapIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  mapPlaceholderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  mapPlaceholderSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  coordinatesContainer: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
  },
  coordinateItem: {
    alignItems: 'center',
  },
  coordinateLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 8,
    marginBottom: 4,
  },
  coordinateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  locationsContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  locationCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  locationIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  locationCoords: {
    fontSize: 12,
    color: COLORS.textLighter,
  },
  infoCard: {
    backgroundColor: COLORS.background,
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
    marginRight: 6,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.success,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 8,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  statValueSmall: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 12,
  },
  detailsSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.secondary,
    paddingTop: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    textAlign: 'center',
  },
  noteCard: {
    backgroundColor: '#E3F2FD',
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 16,
    padding: 20,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 20,
  },
});
