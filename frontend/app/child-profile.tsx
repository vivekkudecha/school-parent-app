import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useChildrenStore } from '../store/childrenStore';
import { ArrowLeft, MapPin, Bus, User } from 'lucide-react-native';

export default function ChildProfileScreen() {
  const router = useRouter();
  const selectedChild = useChildrenStore((state) => state.selectedChild);

  if (!selectedChild) {
    router.back();
    return null;
  }

  const handleTrackBus = () => {
    router.push('/bus-tracking');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#222222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Child Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <Image
            source={{ uri: selectedChild.profile_image }}
            style={styles.profileImage}
          />
          <Text style={styles.childName}>{selectedChild.name}</Text>
          <Text style={styles.rollNumber}>Roll No: {selectedChild.roll_number}</Text>
        </View>

        {/* Details Section */}
        <View style={styles.detailsContainer}>
          <View style={styles.detailCard}>
            <View style={styles.detailIcon}>
              <User size={20} color="#007AFF" />
            </View>
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>Class & Section</Text>
              <Text style={styles.detailValue}>
                {selectedChild.class_name} - Section {selectedChild.section}
              </Text>
            </View>
          </View>

          <View style={styles.detailCard}>
            <View style={styles.detailIcon}>
              <Bus size={20} color="#007AFF" />
            </View>
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>Bus Information</Text>
              <Text style={styles.detailValue}>
                {selectedChild.bus_info.bus_number}
              </Text>
              <Text style={styles.detailSubValue}>
                {selectedChild.bus_info.driver_name}
              </Text>
            </View>
          </View>

          <View style={styles.detailCard}>
            <View style={styles.detailIcon}>
              <MapPin size={20} color="#007AFF" />
            </View>
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>Route</Text>
              <Text style={styles.detailValue}>
                {selectedChild.bus_info.route}
              </Text>
            </View>
          </View>

          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>Current Status</Text>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>
                {selectedChild.bus_info.status}
              </Text>
            </View>
          </View>
        </View>

        {/* Track Bus Button */}
        <TouchableOpacity
          style={styles.trackButton}
          onPress={handleTrackBus}
          activeOpacity={0.8}
        >
          <MapPin size={20} color="#FFFFFF" />
          <Text style={styles.trackButtonText}>Track Bus Live</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#F6F8FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222222',
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E1E4E8',
    marginBottom: 16,
  },
  childName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 4,
  },
  rollNumber: {
    fontSize: 14,
    color: '#666',
  },
  detailsContainer: {
    paddingHorizontal: 24,
    marginTop: 8,
  },
  detailCard: {
    flexDirection: 'row',
    backgroundColor: '#F6F8FA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailInfo: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
  },
  detailSubValue: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusCard: {
    backgroundColor: '#F6F8FA',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
  },
  trackButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 32,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  trackButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
