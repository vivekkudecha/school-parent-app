import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  Modal,
  TouchableOpacity,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { ChevronDown, Bus } from 'lucide-react-native';
import { useAuthStore } from '@/store/authStore';
import { useChildrenStore } from '@/store/childrenStore';
import { KidProfile } from '@/types';
import { COLORS, SCHOOL_LOCATION, UPDATE_INTERVAL, GOOGLE_MAPS_API_KEY } from '@/constants/config';
import { studentAPI } from '@/services/api';

const { width, height } = Dimensions.get('window');

// Decode Google polyline string to coordinates
const decodePolyline = (encoded: string): Array<{ latitude: number; longitude: number }> => {
  const poly: Array<{ latitude: number; longitude: number }> = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    poly.push({ latitude: lat * 1e-5, longitude: lng * 1e-5 });
  }

  return poly;
};

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { 
    kidsProfiles, 
    selectedKidProfile, 
    setSelectedKidProfile,
  } = useChildrenStore();
  const [hasRoute, setHasRoute] = useState(false);
  const [routeData, setRouteData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showKidSelector, setShowKidSelector] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [busLocation, setBusLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [routePath, setRoutePath] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null); // in minutes
  const mapRef = useRef<MapView>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const initialDataProcessedRef = useRef<boolean>(false);

  // Fetch route from Google Directions API
  const fetchDirectionsRoute = async (
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number }
  ) => {
    try {
      setIsLoadingRoute(true);
      const originStr = `${origin.latitude},${origin.longitude}`;
      const destinationStr = `${destination.latitude},${destination.longitude}`;
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destinationStr}&key=${GOOGLE_MAPS_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const polyline = route.overview_polyline?.points;
        
        // Extract duration from the route
        if (route.legs && route.legs.length > 0) {
          const durationInSeconds = route.legs[0].duration?.value || 0;
          const durationInMinutes = Math.round(durationInSeconds / 60);
          setEstimatedTime(durationInMinutes);
        }
        
        if (polyline) {
          const decodedPath = decodePolyline(polyline);
          setRoutePath(decodedPath);
          console.log('Directions route fetched and decoded:', decodedPath.length, 'points');
          return decodedPath;
        }
      } else {
        console.warn('Directions API error:', data.status, data.error_message);
        // Fallback to straight line
        setRoutePath([origin, destination]);
        setEstimatedTime(null);
      }
    } catch (error) {
      console.error('Error fetching directions:', error);
      // Fallback to straight line
      setRoutePath([origin, destination]);
      setEstimatedTime(null);
    } finally {
      setIsLoadingRoute(false);
    }
  };

  // Fetch route data
  const fetchRoute = async (admissionId: number) => {
    try {
      setLoading(true);
      const response = await studentAPI.getCurrentRoute(admissionId);
      if (response.status && response.route_data) {
        setRouteData(response);
        setHasRoute(true);
        console.log('response', JSON.stringify(response, null, 2));
        
        // Calculate estimated time between start and end points
        if (response.route_data.start_point && response.point_data) {
          await fetchDirectionsRoute(
            {
              latitude: response.route_data.start_point.latitude,
              longitude: response.route_data.start_point.longitude,
            },
            {
              latitude: response.point_data.latitude,
              longitude: response.point_data.longitude,
            }
          );
        }
        
        // Fit map to show all route points
        if (mapRef.current && response.full_route_data && response.full_route_data.length > 0) {
          const coordinates = response.full_route_data.map((stop: any) => ({
            latitude: stop.latitude,
            longitude: stop.longitude,
          }));
          
          mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
            animated: true,
          });
        } else if (mapRef.current && response.route_data.start_point && response.point_data) {
          const coordinates = [
            {
              latitude: response.route_data.start_point.latitude,
              longitude: response.route_data.start_point.longitude,
            },
            {
              latitude: response.point_data.latitude,
              longitude: response.point_data.longitude,
            },
          ];
          
          mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
            animated: true,
          });
        }
      } else {
        setHasRoute(false);
        setRouteData(null);
        setEstimatedTime(null);
      }
    } catch (error: any) {
      console.error('Error fetching route:', error);
      setHasRoute(false);
      setRouteData(null);
      setEstimatedTime(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }
    // Kids profiles are already stored from login response
    // Auto-select first kid if available and none selected
    if (kidsProfiles.length > 0 && !selectedKidProfile) {
      setSelectedKidProfile(kidsProfiles[0]);
    }
  }, [user, kidsProfiles, selectedKidProfile]);

  // WebSocket connection for real-time bus tracking
  useEffect(() => {
    if (!routeData?.vehicle?.register_number) {
      // Close existing connection if no vehicle
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setBusLocation(null);
      setRoutePath([]);
      setEstimatedTime(null);
      initialDataProcessedRef.current = false;
      return;
    }

    // Reset initial data flag when route changes
    initialDataProcessedRef.current = false;

    // Extract registration number and remove dashes
    const registrationNumber = routeData.vehicle.register_number.replace(/-/g, '');
    const wsUrl = `wss://geo-tracking.sunshinecollege.ac.in/ws/vehicles/?vehicle_nos=${registrationNumber}`;

    console.log('Connecting to WebSocket:', wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected for vehicle:', registrationNumber);
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);

        if (data?.type === 'location_update' && data.vehicle_no === registrationNumber) {
          // Update bus location smoothly from WebSocket location_update
          if (data.latitude && data.longitude) {
            const newLocation = {
              latitude: parseFloat(data.latitude),
              longitude: parseFloat(data.longitude),
            };
            console.log('Updating bus location from location_update:', newLocation);
            setBusLocation(newLocation);
            
            // Fetch directions route when bus location updates
            if (routeData?.point_data) {
              await fetchDirectionsRoute(newLocation, {
                latitude: routeData.point_data.latitude,
                longitude: routeData.point_data.longitude,
              });
            }
          }
        } else if (data?.type === 'initial_data' && Array.isArray(data.data) && !initialDataProcessedRef.current) {
          // Process initial_data only once (first time)
          const vehicleData = data.data.find(
            (v: any) => v.vehicle_no === registrationNumber
          );
          if (vehicleData?.latitude && vehicleData?.longitude) {
            const newLocation = {
              latitude: parseFloat(vehicleData.latitude),
              longitude: parseFloat(vehicleData.longitude),
            };
            console.log('Setting initial bus location from initial_data (first time):', newLocation);
            setBusLocation(newLocation);
            initialDataProcessedRef.current = true; // Mark as processed
            
            // Fetch directions route when initial location is set
            if (routeData?.point_data) {
              await fetchDirectionsRoute(newLocation, {
                latitude: routeData.point_data.latitude,
                longitude: routeData.point_data.longitude,
              });
            }
          }
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    ws.onclose = () => {
      console.warn('WebSocket disconnected');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setBusLocation(null);
      setRoutePath([]);
      setEstimatedTime(null);
      initialDataProcessedRef.current = false;
    };
  }, [routeData?.vehicle?.register_number, routeData?.point_data]);

  // Fetch route once when selected kid changes (no polling)
  useEffect(() => {
    console.log('selectedKidProfile', selectedKidProfile);
    if (selectedKidProfile?.admission) {
      fetchRoute(selectedKidProfile.admission);
    } else {
      setHasRoute(false);
      setRouteData(null);
      setBusLocation(null);
      setRoutePath([]);
      setEstimatedTime(null);
      initialDataProcessedRef.current = false;
    }
  }, [selectedKidProfile?.admission]);

  // Auto-zoom to route when bus location updates
  useEffect(() => {
    if (mapRef.current && busLocation && routeData?.point_data) {
      const coordinates = [
        busLocation,
        {
          latitude: routeData.point_data.latitude,
          longitude: routeData.point_data.longitude,
        },
      ];
      
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
        animated: true,
      });
    }
  }, [busLocation, routeData?.point_data]);

  const getFullName = (kid: KidProfile) => {
    const parts = [kid.first_name, kid.middle_name, kid.last_name].filter(Boolean);
    return parts.join(' ');
  };

  if (!selectedKidProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.logoContainer}>
          <Image
            source={require('@/assets/images/logo.jpeg')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No children profiles found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container} >
      {/* Logo Header - Normal flow, before map */}
      <View style={styles.logoContainer}>
        <Image
          source={require('@/assets/images/logo.jpeg')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Map Container */}
      <View style={styles.mapContainer}>
        {/* Student Card - Absolute positioned on top of map */}
        <TouchableOpacity
          style={styles.studentCard}
          onPress={() => setShowKidSelector(true)}
          activeOpacity={0.8}
        >
          <View style={styles.studentCardContent}>
            {selectedKidProfile.photo ? (
              <Image
                source={{ uri: selectedKidProfile.photo }}
                style={styles.studentPhoto}
              />
            ) : (
              <View style={[styles.studentPhoto, styles.studentPhotoPlaceholder]}>
                <Text style={styles.studentPhotoText}>
                  {selectedKidProfile.first_name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.studentInfo}>
              <Text style={styles.studentName}>
                {getFullName(selectedKidProfile)}
              </Text>
              <Text style={styles.studentGrade}>
                Grade {selectedKidProfile.grade_name}
              </Text>
              
              {/* Route Details - Only show when route is loaded */}
              {hasRoute && routeData && (
                <View style={styles.routeDetailsContainer}>
                  {/* Estimated Time */}
                  {estimatedTime !== null && (
                    <View style={styles.timePill}>
                      <Text style={styles.timePillText}>{estimatedTime} Min</Text>
                    </View>
                  )}
                  
                  {/* Bus Details */}
                  <View style={styles.busDetailsRow}>
                    <Bus size={16} color={COLORS.background} style={styles.busIcon} />
                    {routeData.vehicle?.vehicle_tag && (
                      <Text style={styles.busDetailText}>
                        Bus #{routeData.vehicle.vehicle_tag}
                      </Text>
                    )}
                    {routeData.vehicle?.register_number && (
                      <Text style={styles.busDetailText}>
                        Bus No : {routeData.vehicle.register_number}
                      </Text>
                    )}
                  </View>
                  
                  {/* Seat Number */}
                  {routeData.sheet_no && (
                    <Text style={styles.seatText}>Seat : {routeData.sheet_no}</Text>
                  )}
                </View>
              )}
            </View>
            <ChevronDown size={20} color={COLORS.background} style={styles.dropdownIcon} />
          </View>
        </TouchableOpacity>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            latitude: SCHOOL_LOCATION.latitude,
            longitude: SCHOOL_LOCATION.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          toolbarEnabled={false}
          loadingEnabled={true}
          mapType="standard"
        >
          {routeData && routeData.route_data && routeData.point_data && (
            <>
              {/* Route Polyline - follows proper route path from Google Directions API */}
              {routePath.length > 0 && (
                <Polyline
                  key={`route-${busLocation ? `${busLocation.latitude}-${busLocation.longitude}` : 'default'}-${routePath.length}`}
                  coordinates={routePath}
                  strokeColor="#007AFF"
                  strokeWidth={5}
                  lineCap="round"
                  lineJoin="round"
                  geodesic={true}
                />
              )}
              
              {/* Start Point Marker (Bus) - from WebSocket location, updates in real-time */}
              {(busLocation || routeData.point_data) && (
                <Marker
                  key={`bus-${busLocation ? `${busLocation.latitude}-${busLocation.longitude}` : 'default'}`}
                  coordinate={
                    busLocation || {
                      latitude: routeData.point_data.latitude,
                      longitude: routeData.point_data.longitude,
                    }
                  }
                  title="Bus Location"
                  description="Current bus position"
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <Image
                    source={require('@/assets/images/map-bus.png')}
                    style={styles.busMarker}
                    resizeMode="contain"
                  />
                </Marker>
              )}
              
              {/* End Point Marker - from point_data */}
              <Marker
                coordinate={{
                  latitude: routeData.point_data.latitude,
                  longitude: routeData.point_data.longitude,
                }}
                title={routeData.point_data.stop_title}
                description={routeData.point_data.area}
                anchor={{ x: 0.5, y: 1 }}
              >
                <Image
                  source={require('@/assets/images/map-drop-point.png')}
                  style={styles.dropPointMarker}
                  resizeMode="contain"
                />
              </Marker>
            </>
          )}
          
        </MapView>

        {/* Zoom Controls */}
        <View style={styles.zoomControls}>
          <TouchableOpacity
            style={styles.zoomButton}
            onPress={async () => {
              if (mapRef.current) {
                try {
                  const camera = await mapRef.current.getCamera();
                  if (camera) {
                    mapRef.current.animateCamera({
                      center: camera.center,
                      zoom: Math.min((camera.zoom || 15) + 1, 20),
                      heading: camera.heading,
                      pitch: camera.pitch,
                      altitude: camera.altitude,
                    });
                  }
                } catch (error) {
                  console.error('Error zooming in:', error);
                }
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.zoomButtonText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.zoomButton}
            onPress={async () => {
              if (mapRef.current) {
                try {
                  const camera = await mapRef.current.getCamera();
                  if (camera) {
                    mapRef.current.animateCamera({
                      center: camera.center,
                      zoom: Math.max((camera.zoom || 15) - 1, 3),
                      heading: camera.heading,
                      pitch: camera.pitch,
                      altitude: camera.altitude,
                    });
                  }
                } catch (error) {
                  console.error('Error zooming out:', error);
                }
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.zoomButtonText}>−</Text>
          </TouchableOpacity>
        </View>

        {/* No Route Banner */}
        {!hasRoute && (
          <View style={styles.noRouteBanner}>
            <Text style={styles.noRouteText}>No Route To Display</Text>
          </View>
        )}

        {/* Route Loading Overlay - show when hasRoute is true and isLoadingRoute is false */}
        {hasRoute && !isLoadingRoute && routePath.length === 0 && (
          <View style={styles.routeLoadingOverlay}>
            <View style={styles.routeLoadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.routeLoadingText}>Loading route...</Text>
            </View>
          </View>
        )}
      </View>

      {/* Kid Selector Modal */}
      <Modal
        visible={showKidSelector}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowKidSelector(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowKidSelector(false)}
        >
          <View style={styles.modalContent}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Account</Text>
                <TouchableOpacity
                  onPress={() => setShowKidSelector(false)}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.kidList} showsVerticalScrollIndicator={false}>
                {kidsProfiles.map((kid) => {
                  const isSelected = selectedKidProfile?.admission === kid.admission;
                  return (
                    <TouchableOpacity
                      key={kid.admission}
                      style={[
                        styles.kidItem,
                        isSelected && styles.kidItemSelected,
                      ]}
                      onPress={async () => {
                        // Reset all state when switching kids
                        setHasRoute(false);
                        setRouteData(null);
                        setBusLocation(null);
                        setRoutePath([]);
                        setEstimatedTime(null);
                        setLoading(false);
                        initialDataProcessedRef.current = false;
                        
                        // Close existing WebSocket connection
                        if (wsRef.current) {
                          wsRef.current.close();
                          wsRef.current = null;
                        }
                        
                        // Set new selected kid
                        await setSelectedKidProfile(kid);
                        setShowKidSelector(false);
                        
                        // Fetch route for the new kid (this will trigger WebSocket connection)
                        if (kid.admission) {
                          fetchRoute(kid.admission);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      {kid.photo ? (
                        <Image
                          source={{ uri: kid.photo }}
                          style={styles.kidItemPhoto}
                        />
                      ) : (
                        <View style={[styles.kidItemPhoto, styles.kidItemPhotoPlaceholder]}>
                          <Text style={styles.kidItemPhotoText}>
                            {kid.first_name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={styles.kidItemInfo}>
                        <Text style={styles.kidItemName}>{getFullName(kid)}</Text>
                        <Text style={styles.kidItemGrade}>Grade {kid.grade_name}</Text>
                      </View>
                      {isSelected && (
                        <View style={styles.selectedIndicator}>
                          <Text style={styles.selectedIndicatorText}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  logoContainer: {
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: COLORS.background,
  },
  logo: {
    width: 131,
    height: 39,
  },
  studentCard: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: COLORS.studentCardBackground,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
  studentCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdownIcon: {
    marginLeft: 8,
  },
  studentPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.background,
    marginRight: 16,
  },
  studentPhotoPlaceholder: {
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentPhotoText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.background,
    marginBottom: 4,
  },
  studentGrade: {
    fontSize: 14,
    color: COLORS.background,
    opacity: 0.9,
  },
  routeDetailsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  timePill: {
    backgroundColor: '#FF9500',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  timePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  busDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  busIcon: {
    marginRight: 6,
  },
  busDetailText: {
    fontSize: 12,
    color: COLORS.background,
    opacity: 0.9,
    marginRight: 8,
  },
  seatText: {
    fontSize: 12,
    color: COLORS.background,
    opacity: 0.9,
  },
  mapContainer: {
    flex: 1,
    marginHorizontal: 0,
    marginBottom: 0,
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#E0E0E0',
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  zoomControls: {
    position: 'absolute',
    right: 16,
    bottom: 60,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 5,
  },
  zoomButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  zoomButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
  },
  noRouteBanner: {
    position: 'absolute',
    bottom: 8,
    left: 16,
    right: 16,
    backgroundColor: '#FFE5E5',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFB3B3',
    zIndex: 4,
  },
  noRouteText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D32F2F',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textLighter,
    marginBottom: 16,
  },
  busMarker: {
    width: 50,
    height: 50,
  },
  dropPointMarker: {
    width: 40,
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: COLORS.text,
    fontWeight: '600',
  },
  kidList: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  kidItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  kidItemSelected: {
    backgroundColor: COLORS.infoLight,
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  kidItemPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  kidItemPhotoPlaceholder: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kidItemPhotoText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.background,
  },
  kidItemInfo: {
    flex: 1,
  },
  kidItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  kidItemGrade: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  selectedIndicatorText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '700',
  },
  stopLabelContainer: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stopLabelText: {
    color: COLORS.background,
    fontSize: 12,
    fontWeight: '700',
  },
  routeLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 6,
  },
  routeLoadingContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  routeLoadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
});
