import React, { useEffect, useState, lazy, Suspense } from 'react';
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
import { useAuthStore } from '@/store/authStore';
import { useChildrenStore } from '@/store/childrenStore';
import { Child } from '@/types';
import { Users, LogOut, Bus } from 'lucide-react-native';
import { EXPO_PUBLIC_BACKEND_URL, COLORS } from '@/constants/config';
import { LoadingSpinner } from '@/components/LoadingSpinner';

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
            <Bus size={16} color={COLORS.primary} />
            <Text style={styles.busStatusText}>{item.bus_info.status}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <LoadingSpinner message="Loading children..." />;
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
          <LogOut size={24} color={COLORS.textLight} />
        </TouchableOpacity>
      </View>

      {/* Children List */}
      <View style={styles.listContainer}>
        <View style={styles.sectionHeader}>
          <Users size={24} color={COLORS.text} />
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
    backgroundColor: COLORS.background,
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
    color: COLORS.textLight,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 4,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.secondary,
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
    color: COLORS.text,
    marginLeft: 8,
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: COLORS.secondary,
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
    backgroundColor: COLORS.border,
  },
  cardInfo: {
    flex: 1,
    marginLeft: 16,
  },
  childName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  classInfo: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  busStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  busStatusText: {
    fontSize: 14,
    color: COLORS.primary,
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
    color: COLORS.textLighter,
  },
});
