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
  const [busSpeed, setBusSpeed] = useState<number>(0); // in km/h
  const [busHeading, setBusHeading] = useState<number>(0); // in degrees (0-360)
  const [waitingForFirstLocation, setWaitingForFirstLocation] = useState(false);
  const mapRef = useRef<MapView>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const initialDataProcessedRef = useRef<boolean>(false);

  // Calculate distance between two coordinates using Haversine formula (in km)
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Calculate estimated time based on speed and distance
  const calculateEstimatedTime = (
    busLat: number,
    busLon: number,
    speed: number,
    routeData: any
  ): number | null => {
    if (!routeData?.point_data) {
      return null;
    }

    // Get destination based on route_type
    let destination: { latitude: number; longitude: number } | null = null;
    
    if (routeData.route_type === 'pickup') {
      // Pickup: destination is full route end point
      if (routeData.full_route_data && routeData.full_route_data.length > 0) {
        const lastStop = routeData.full_route_data[routeData.full_route_data.length - 1];
        destination = {
          latitude: lastStop.latitude,
          longitude: lastStop.longitude,
        };
      }
    } else if (routeData.route_type === 'drop') {
      // Drop: destination is student point (point_data)
      destination = {
        latitude: routeData.point_data.latitude,
        longitude: routeData.point_data.longitude,
      };
    }

    if (!destination) {
      return null;
    }

    // Calculate distance in km
    const distance = calculateDistance(
      busLat,
      busLon,
      destination.latitude,
      destination.longitude
    );

    // If speed is 0 or very low (< 5 km/h), consider it as stopped
    // Use average city speed (30 km/h) for calculation
    const effectiveSpeed = speed > 5 ? speed : 30;

    // Calculate time in hours, then convert to minutes
    const timeInHours = distance / effectiveSpeed;
    const timeInMinutes = Math.round(timeInHours * 60);

    // If speed is 0 or very low, return null to show "Stopped" or similar
    if (speed <= 5) {
      return null; // Will be handled in UI to show "Stopped" or "Not moving"
    }

    return timeInMinutes;
  };

  // Calculate bearing (direction) from point A to point B in degrees (0-360)
  // Returns bearing where 0° is North, 90° is East, 180° is South, 270° is West
  const calculateBearing = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const lat1Rad = lat1 * (Math.PI / 180);
    const lat2Rad = lat2 * (Math.PI / 180);

    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x =
      Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

    let bearing = Math.atan2(y, x) * (180 / Math.PI);
    bearing = (bearing + 360) % 360; // Normalize to 0-360

    return bearing;
  };

  // Project a point onto the nearest point on a line segment
  // Returns the closest point on the route line to the bus location
  const projectPointOntoRoute = (
    busLat: number,
    busLon: number,
    route: Array<{ latitude: number; longitude: number }>
  ): { latitude: number; longitude: number } | null => {
    if (route.length < 2) {
      return null;
    }

    let minDistance = Infinity;
    let closestPoint: { latitude: number; longitude: number } | null = null;

    // Check each segment of the route
    for (let i = 0; i < route.length - 1; i++) {
      const p1 = route[i];
      const p2 = route[i + 1];

      // Vector from p1 to p2
      const dx = p2.longitude - p1.longitude;
      const dy = p2.latitude - p1.latitude;
      const segmentLengthSq = dx * dx + dy * dy;

      if (segmentLengthSq === 0) {
        // Points are the same, just use p1
        const dist = calculateDistance(busLat, busLon, p1.latitude, p1.longitude);
        if (dist < minDistance) {
          minDistance = dist;
          closestPoint = p1;
        }
        continue;
      }

      // Vector from p1 to bus point
      const busDx = busLon - p1.longitude;
      const busDy = busLat - p1.latitude;

      // Project bus point onto the line segment
      const t = Math.max(0, Math.min(1, (busDx * dx + busDy * dy) / segmentLengthSq));

      // Calculate the projected point
      const projectedLat = p1.latitude + t * dy;
      const projectedLon = p1.longitude + t * dx;

      // Calculate distance from bus to projected point
      const dist = calculateDistance(busLat, busLon, projectedLat, projectedLon);

      if (dist < minDistance) {
        minDistance = dist;
        closestPoint = { latitude: projectedLat, longitude: projectedLon };
      }
    }

    return closestPoint;
  };

  // Calculate bus rotation angle based on route direction or GPS heading
  // The bus icon faces left (west) by default, so we need to adjust the rotation
  const calculateBusRotation = (): number => {
    let rotation = 0;

    if (!busLocation) {
      rotation = busHeading;
    } else if (routePath.length > 1) {
      // Try to use route direction if available
      // Find the closest point on the route to the bus
      let closestIndex = 0;
      let minDistance = Infinity;

      routePath.forEach((point, index) => {
        const dist = calculateDistance(
          busLocation.latitude,
          busLocation.longitude,
          point.latitude,
          point.longitude
        );
        if (dist < minDistance) {
          minDistance = dist;
          closestIndex = index;
        }
      });

      // Get the next point on the route (or destination if at end)
      const nextIndex = Math.min(closestIndex + 1, routePath.length - 1);
      const nextPoint = routePath[nextIndex];

      // Calculate bearing from bus to next point
      const routeBearing = calculateBearing(
        busLocation.latitude,
        busLocation.longitude,
        nextPoint.latitude,
        nextPoint.longitude
      );

      // Use route bearing if GPS heading is 0 or seems unreliable
      if (busHeading === 0 || busSpeed < 5) {
        rotation = routeBearing;
      } else {
        // Use GPS heading if available and bus is moving
        rotation = busHeading;
      }
    } else {
      // Fall back to GPS heading
      rotation = busHeading;
    }

    // Adjust rotation: bus icon faces left (west) by default in the image
    // In react-native-maps, rotation is clockwise from north
    // If icon faces west (left) by default, to make it point north we rotate +90°
    // So for a given heading, we add 90° to align the icon
    return (rotation + 90) % 360;
  };

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
        
        // Extract duration from the route (initial estimate, will be overridden by speed-based calculation when bus location is available)
        if (route.legs && route.legs.length > 0) {
          const durationInSeconds = route.legs[0].duration?.value || 0;
          const durationInMinutes = Math.round(durationInSeconds / 60);
          setEstimatedTime(durationInMinutes);
        }
        
        if (polyline) {
          const decodedPath = decodePolyline(polyline);
          // Set actual route path from Google Directions API
          setRoutePath(decodedPath);
          console.log('Directions route fetched and decoded:', decodedPath.length, 'points');
          return decodedPath;
        }
      } else {
        // Clear route path on error - no fallback
        setRoutePath([]);
        setEstimatedTime(null);
      }
    } catch (error) {
      console.error('Error fetching directions:', error);
      // Clear route path on error - no fallback
      setRoutePath([]);
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
        console.log('Route data:', JSON.stringify(response, null, 2));
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
      setBusSpeed(0);
      setBusHeading(0);
      setRoutePath([]);
      setEstimatedTime(null);
      initialDataProcessedRef.current = false;
      setWaitingForFirstLocation(false);
      return;
    }

    // Reset initial data flag when route changes and set waiting state
    initialDataProcessedRef.current = false;
    setWaitingForFirstLocation(true);
    setBusLocation(null);
    setRoutePath([]);

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
            const isFirstLocation = !busLocation;
            setBusLocation(newLocation);
            
            // Clear route path on first location to show loader until new route is fetched
            if (isFirstLocation) {
              setRoutePath([]);
            }
            
            // Extract and update speed (convert to number, default to 0)
            const speed = parseFloat(data.speed || '0');
            setBusSpeed(speed);
            
            // Extract and update heading (convert to number, default to 0)
            const heading = parseFloat(data.heading || '0');
            console.log('Bus heading from location_update:', heading);
            setBusHeading(heading);
            
            // Calculate estimated time based on speed and distance
            if (routeData) {
              const estimatedTimeFromSpeed = calculateEstimatedTime(
                newLocation.latitude,
                newLocation.longitude,
                speed,
                routeData
              );
              setEstimatedTime(estimatedTimeFromSpeed);
            }
            
            // Fetch directions route when bus location updates
            if (routeData?.point_data) {
              await fetchDirectionsRoute(newLocation, {
                latitude: routeData.point_data.latitude,
                longitude: routeData.point_data.longitude,
              });
              // After route is fetched, clear waiting state if this was first location
              if (isFirstLocation) {
                setWaitingForFirstLocation(false);
              }
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
            // Clear route path on first location to show loader until new route is fetched
            setRoutePath([]);
            initialDataProcessedRef.current = true; // Mark as processed
            
            // Extract and update speed (convert to number, default to 0)
            const speed = parseFloat(vehicleData.speed || '0');
            setBusSpeed(speed);
            
            // Extract and update heading (convert to number, default to 0)
            const heading = parseFloat(vehicleData.heading || '0');
            console.log('Bus heading from initial_data:', heading);
            setBusHeading(heading);
            
            // Calculate estimated time based on speed and distance
            if (routeData) {
              const estimatedTimeFromSpeed = calculateEstimatedTime(
                newLocation.latitude,
                newLocation.longitude,
                speed,
                routeData
              );
              setEstimatedTime(estimatedTimeFromSpeed);
            }
            
            // Fetch directions route when initial location is set
            if (routeData?.point_data) {
              await fetchDirectionsRoute(newLocation, {
                latitude: routeData.point_data.latitude,
                longitude: routeData.point_data.longitude,
              });
              // After route is fetched, clear waiting state
              setWaitingForFirstLocation(false);
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
      setBusSpeed(0);
      setBusHeading(0);
      setRoutePath([]);
      setEstimatedTime(null);
      initialDataProcessedRef.current = false;
      setWaitingForFirstLocation(false);
    };
  }, [routeData?.vehicle?.register_number, routeData?.point_data]);

  // Fetch route once when selected kid changes (no polling)
  useEffect(() => {
    if (selectedKidProfile?.admission) {
      fetchRoute(selectedKidProfile.admission);
    } else {
      setHasRoute(false);
      setRouteData(null);
      setBusLocation(null);
      setBusSpeed(0);
      setBusHeading(0);
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
            
            </View>
            <ChevronDown size={20} color={COLORS.background} style={styles.dropdownIcon} />
         
          </View>
            
              {/* Route Details - Only show when route is loaded */}
              {hasRoute && routeData && (
                <View style={styles.routeDetailsContainer}>
                  {/* Estimated Time */}
                  {busLocation && (                    
                    <View style={styles.timePill}>
                      <Text style={styles.timePillText}>
                        {busSpeed <= 5 ? 'Stopped' : estimatedTime !== null ? `${estimatedTime} Min` : 'Calculating...'}
                      </Text>
                    </View>
                  )}
                  
                  {/* Bus Icon */}
                  <Bus size={16} color={COLORS.background} style={styles.busIcon} />
                  
                  {/* Bus Tag */}
                  {routeData.vehicle?.vehicle_tag && (
                    <Text style={styles.busDetailText}>
                      Bus #{routeData.vehicle.vehicle_tag}
                    </Text>
                  )}
                  
                  {/* Bus Number */}
                  {routeData.vehicle?.register_number && (
                    <Text style={styles.busDetailText}>
                      Bus No : {routeData.vehicle.register_number}
                    </Text>
                  )}
                  
                  {/* Seat Number */}
                  {routeData.sheet_no && (
                    <Text style={styles.seatText}>Seat : {routeData.sheet_no}</Text>
                  )}
                </View>
              )}
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
                  strokeWidth={4}
                  lineCap="round"
                  lineJoin="round"
                  geodesic={true}
                />
              )}
              
              {/* Start Point Marker (Bus) - from WebSocket location, updates in real-time */}
              {(busLocation || routeData.point_data) && (() => {
                // Snap bus location to nearest point on route if route is available
                let markerCoordinate = busLocation || {
                  latitude: routeData.point_data.latitude,
                  longitude: routeData.point_data.longitude,
                };

                if (busLocation && routePath.length > 1) {
                  const projectedPoint = projectPointOntoRoute(
                    busLocation.latitude,
                    busLocation.longitude,
                    routePath
                  );
                  // Use projected point if it's close to the route (within reasonable distance)
                  if (projectedPoint) {
                    const distanceToRoute = calculateDistance(
                      busLocation.latitude,
                      busLocation.longitude,
                      projectedPoint.latitude,
                      projectedPoint.longitude
                    );
                    // Only snap if within 100 meters of the route
                    if (distanceToRoute < 0.1) {
                      markerCoordinate = projectedPoint;
                    }
                  }
                }

                return (
                  <Marker
                    key={`bus-${markerCoordinate.latitude}-${markerCoordinate.longitude}-${busHeading}`}
                    coordinate={markerCoordinate}
                    title="Bus Location"
                    description={`Current bus position - Heading: ${busHeading}°`}
                    anchor={{ x: 0.5, y: 0.5 }}
                    flat={true}
                    rotation={calculateBusRotation()}
                  >
                    <Image
                      source={require('@/assets/images/map-bus.png')}
                      style={styles.busMarker}
                      resizeMode="contain"
                    />
                  </Marker>
                );
              })()}
              
              {/* End Point Marker - from point_data */}
              {(() => {
                // Snap drop point to nearest point on route if route is available
                let markerCoordinate = {
                  latitude: routeData.point_data.latitude,
                  longitude: routeData.point_data.longitude,
                };

                if (routePath.length > 1) {
                  const projectedPoint = projectPointOntoRoute(
                    routeData.point_data.latitude,
                    routeData.point_data.longitude,
                    routePath
                  );
                  // Use projected point if it's close to the route (within reasonable distance)
                  if (projectedPoint) {
                    const distanceToRoute = calculateDistance(
                      routeData.point_data.latitude,
                      routeData.point_data.longitude,
                      projectedPoint.latitude,
                      projectedPoint.longitude
                    );
                    // Only snap if within 200 meters of the route
                    if (distanceToRoute < 0.2) {
                      markerCoordinate = projectedPoint;
                    }
                  }
                }

                return (
                  <Marker
                    coordinate={markerCoordinate}
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
                );
              })()}
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

        {/* Route Loading Overlay - show when waiting for first location or loading route */}
        {hasRoute && (waitingForFirstLocation || isLoadingRoute || (busLocation && routePath.length === 0)) && (
          <View style={styles.routeLoadingOverlay}>
            <View style={styles.routeLoadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.routeLoadingText}>
                {waitingForFirstLocation ? 'Waiting for bus location...' : 'Loading route...'}
              </Text>
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
                        setBusSpeed(0);
                        setBusHeading(0);
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
    paddingHorizontal: 8,
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
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  timePill: {
    backgroundColor: '#FF9500',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
  },
  timePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
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
