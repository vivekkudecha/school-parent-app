import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { useChildrenStore, Child } from '../store/childrenStore';
import { Users, LogOut, Bus } from 'lucide-react-native';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { children, setChildren, setSelectedChild } = useChildrenStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }
    fetchChildren();
  }, [user]);

  const fetchChildren = async () => {
    if (!user) return;

    try {
      const response = await fetch(
        `${EXPO_PUBLIC_BACKEND_URL}/api/children/${user.parentId}`
      );
      const data = await response.json();

      if (response.ok) {
        setChildren(data);
      } else {
        Alert.alert('Error', 'Unable to fetch children data');
      }
    } catch (error) {
      console.error('Fetch children error:', error);
      Alert.alert('Error', 'Unable to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  const handleChildPress = (child: Child) => {
    setSelectedChild(child);
    router.push('/child-profile');
  };

  const renderChildCard = ({ item }: { item: Child }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleChildPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <Image
          source={{ uri: item.profile_image }}
          style={styles.avatar}
        />
        <View style={styles.cardInfo}>
          <Text style={styles.childName}>{item.name}</Text>
          <Text style={styles.classInfo}>
            {item.class_name} - Section {item.section}
          </Text>
          <View style={styles.busStatus}>
            <Bus size={16} color="#007AFF" />
            <Text style={styles.busStatusText}>{item.bus_info.status}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading children...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name}</Text>
        </View>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <LogOut size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Children List */}
      <View style={styles.listContainer}>
        <View style={styles.sectionHeader}>
          <Users size={24} color="#222222" />
          <Text style={styles.sectionTitle}>Your Children</Text>
        </View>
        
        {children.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No children found</Text>
          </View>
        ) : (
          <FlatList
            data={children}
            renderItem={renderChildCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  greeting: {
    fontSize: 14,
    color: '#666',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222222',
    marginTop: 4,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F6F8FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222222',
    marginLeft: 8,
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#F6F8FA',
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E1E4E8',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 16,
  },
  childName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 4,
  },
  classInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  busStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  busStatusText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
