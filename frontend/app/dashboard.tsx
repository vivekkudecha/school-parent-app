import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useChildrenStore } from '@/store/childrenStore';
import { KidProfile } from '@/types';
import { Users, LogOut, RefreshCw, User } from 'lucide-react-native';
import { COLORS } from '@/constants/config';

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { 
    kidsProfiles, 
    selectedKidProfile, 
    setSelectedKidProfile,
    clearChildren 
  } = useChildrenStore();

  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }
    // Kids profiles are already stored from login response
    // If only one kid and none selected, auto-select it
    if (kidsProfiles.length === 1 && !selectedKidProfile) {
      setSelectedKidProfile(kidsProfiles[0]);
    }
  }, [user, kidsProfiles, selectedKidProfile]);

  const handleLogout = async () => {
    // Clear children data (selected profile, kids profiles, etc.)
    await clearChildren();
    // Clear auth data
    await logout();
    router.replace('/');
  };

  const handleSwitchKid = () => {
    router.push('/select-kid');
  };

  const handleViewProfile = () => {
    if (selectedKidProfile) {
      // Store the student ID for the profile screen to fetch data
      // The profile screen will fetch data using this student ID
      router.push(`/child-profile?student_id=${selectedKidProfile.student}`);
    }
  };

  const getFullName = (kid: KidProfile) => {
    const parts = [kid.first_name, kid.middle_name, kid.last_name].filter(Boolean);
    return parts.join(' ');
  };

  const showSwitchKidIcon = kidsProfiles.length > 1;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name}</Text>
        </View>
        <View style={styles.headerRight}>
          {showSwitchKidIcon && (
            <TouchableOpacity
              style={styles.switchKidButton}
              onPress={handleSwitchKid}
            >
              <RefreshCw size={20} color={COLORS.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <LogOut size={24} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Selected Kid Profile */}
      <View style={styles.listContainer}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <Users size={24} color={COLORS.text} />
            <Text style={styles.sectionTitle}>
              {selectedKidProfile ? 'Selected Child' : 'Your Children'}
            </Text>
          </View>
          {selectedKidProfile && (
            <TouchableOpacity
              style={styles.viewKidsProfileButton}
              onPress={() => router.push('/child-profile')}
              activeOpacity={0.7}
            >
              <User size={18} color={COLORS.background} />
              <Text style={styles.viewKidsProfileButtonText}>View Profiles</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {selectedKidProfile ? (
          <View style={styles.selectedKidCard}>
            <View style={styles.cardContent}>
              {selectedKidProfile.photo ? (
                <Image
                  source={{ uri: selectedKidProfile.photo }}
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>
                    {selectedKidProfile.first_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.cardInfo}>
                <Text style={styles.childName}>
                  {getFullName(selectedKidProfile)}
                </Text>
                <Text style={styles.classInfo}>
                  Grade {selectedKidProfile.grade_name}
                  {selectedKidProfile.division && ` - ${selectedKidProfile.division}`}
                </Text>
                <Text style={styles.academicYear}>
                  Academic Year: {selectedKidProfile.academic_year}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.viewProfileButton}
              onPress={handleViewProfile}
              activeOpacity={0.7}
            >
              <User size={18} color={COLORS.primary} />
              <Text style={styles.viewProfileButtonText}>View Profile</Text>
            </TouchableOpacity>
          </View>
        ) : kidsProfiles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No children profiles found</Text>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Please select a child profile</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={handleSwitchKid}
            >
              <Text style={styles.selectButtonText}>Select Child</Text>
            </TouchableOpacity>
          </View>
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
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  switchKidButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
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
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 8,
  },
  viewKidsProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  viewKidsProfileButtonText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '600',
  },
  selectedKidCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
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
  childName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  classInfo: {
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
    marginBottom: 16,
  },
  selectButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  selectButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
  viewProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
    gap: 8,
  },
  viewProfileButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
