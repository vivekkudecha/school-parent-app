import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useChildrenStore } from '@/store/childrenStore';
import { KidProfile } from '@/types';
import { COLORS } from '@/constants/config';
import { Users } from 'lucide-react-native';

export default function SelectKidScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { kidsProfiles, setSelectedKidProfile } = useChildrenStore();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!user) {
      router.replace('/');
      return;
    }
    // If only one kid or no kids, redirect to dashboard
    if (kidsProfiles.length <= 1) {
      if (kidsProfiles.length === 1) {
        setSelectedKidProfile(kidsProfiles[0]);
      }
      router.replace('/dashboard');
    }
  }, [user, kidsProfiles]);

  const handleSelectKid = async (kid: KidProfile) => {
    await setSelectedKidProfile(kid);
    router.push('/dashboard');
  };

  const getFullName = (kid: KidProfile) => {
    const parts = [kid.first_name, kid.middle_name, kid.last_name].filter(Boolean);
    return parts.join(' ');
  };

  const renderKidCard = ({ item }: { item: KidProfile }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleSelectKid(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        {item.photo ? (
          <Image source={{ uri: item.photo }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {item.first_name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.kidName}>{getFullName(item)}</Text>
          <Text style={styles.gradeInfo}>
            Grade {item.grade_name}
            {item.division && ` - ${item.division}`}
          </Text>
          <Text style={styles.academicYear}>
            Academic Year: {item.academic_year}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Users size={24} color={COLORS.text} />
        <Text style={styles.headerTitle}>Select Your Child</Text>
      </View>

      <View style={styles.listContainer}>
        {kidsProfiles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No children profiles found</Text>
          </View>
        ) : (
          <FlatList
            data={kidsProfiles}
            renderItem={renderKidCard}
            keyExtractor={(item, index) => `kid-${item.student}-${index}`}
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
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginLeft: 12,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: COLORS.secondary,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: COLORS.shadow,
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
  avatarPlaceholder: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.background,
  },
  cardInfo: {
    flex: 1,
    marginLeft: 16,
  },
  kidName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  gradeInfo: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  academicYear: {
    fontSize: 12,
    color: COLORS.textLighter,
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

