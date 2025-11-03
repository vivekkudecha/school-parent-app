import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useChildrenStore } from '../store/childrenStore';
import { ArrowLeft, Bus, Home, School, Clock } from 'lucide-react-native';

// Conditionally import MapView only on native platforms
let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;

if (Platform.OS !== 'web') {
  const mapModule = require('react-native-maps');
  MapView = mapModule.default;
  Marker = mapModule.Marker;
  PROVIDER_GOOGLE = mapModule.PROVIDER_GOOGLE;
}

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width, height } = Dimensions.get('window');

interface BusLocation {
  bus_id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  eta_minutes: number;
  status: string;
}

export default function BusTrackingScreen() {
  const router = useRouter();
  const selectedChild = useChildrenStore((state) => state.selectedChild);
  const mapRef = useRef<MapView>(null);
  const [busLocation, setBusLocation] = useState<BusLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [schoolLocation] = useState({ latitude: 37.7749, longitude: -122.4194 });

  useEffect(() => {
    if (!selectedChild) {
      router.back();
      return;
    }

    fetchBusLocation();
    const interval = setInterval(fetchBusLocation, 10000); // Update every 10 seconds

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
        // Animate to show all markers
        if (mapRef.current && data) {
          mapRef.current.fitToCoordinates(
            [
              { latitude: data.latitude, longitude: data.longitude },
              schoolLocation,
              selectedChild.home_location,
            ],
            {
              edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
              animated: true,
            }
          );
        }
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
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: schoolLocation.latitude,
          longitude: schoolLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {/* Bus Marker */}
        {busLocation && (
          <Marker
            coordinate={{
              latitude: busLocation.latitude,
              longitude: busLocation.longitude,
            }}
            title="School Bus"
            description={selectedChild.bus_info.bus_number}
          >
            <View style={styles.busMarker}>
              <Bus size={24} color="#FFFFFF" />
            </View>
          </Marker>
        )}

        {/* School Marker */}
        <Marker
          coordinate={schoolLocation}
          title="School"
          description="Springfield Elementary"
        >
          <View style={styles.schoolMarker}>
            <School size={24} color="#FFFFFF" />
          </View>
        </Marker>

        {/* Home Marker */}
        <Marker
          coordinate={selectedChild.home_location}
          title="Home"
          description={selectedChild.name}
        >
          <View style={styles.homeMarker}>
            <Home size={24} color="#FFFFFF" />
          </View>
        </Marker>
      </MapView>

      {/* Header Overlay */}
      <SafeAreaView style={styles.headerOverlay}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#222222" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Live Tracking</Text>
            <Text style={styles.headerSubtitle}>
              {selectedChild.bus_info.bus_number}
            </Text>
          </View>
          <View style={styles.placeholder} />
        </View>
      </SafeAreaView>

      {/* Bottom Info Card */}
      <View style={styles.bottomCard}>
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : busLocation ? (
          <>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Clock size={20} color="#007AFF" />
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>ETA</Text>
                  <Text style={styles.infoValue}>{busLocation.eta_minutes} min</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoItem}>
                <Bus size={20} color="#007AFF" />
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Status</Text>
                  <Text style={styles.infoValue}>{busLocation.status}</Text>
                </View>
              </View>
            </View>

            <View style={styles.driverInfo}>
              <Text style={styles.driverLabel}>Driver</Text>
              <Text style={styles.driverName}>
                {selectedChild.bus_info.driver_name}
              </Text>
            </View>

            <View style={styles.routeInfo}>
              <Text style={styles.routeLabel}>Route</Text>
              <Text style={styles.routeName}>
                {selectedChild.bus_info.route}
              </Text>
            </View>

            <Text style={styles.updateText}>
              Last updated: {new Date(busLocation.timestamp).toLocaleTimeString()}
            </Text>
          </>
        ) : (
          <Text style={styles.errorText}>Unable to load bus location</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  map: {
    width: width,
    height: height,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  placeholder: {
    width: 44,
  },
  busMarker: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  schoolMarker: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FF9500',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  homeMarker: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  infoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222222',
  },
  divider: {
    width: 1,
    height: '100%',
    backgroundColor: '#E1E4E8',
    marginHorizontal: 16,
  },
  driverInfo: {
    marginBottom: 12,
  },
  driverLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
  },
  routeInfo: {
    marginBottom: 12,
  },
  routeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  routeName: {
    fontSize: 14,
    color: '#222222',
  },
  updateText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
});
