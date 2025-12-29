import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { studentAPI } from '@/services/api';
import { Users, LogOut } from 'lucide-react-native';
import { COLORS } from '@/constants/config';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import StudentInfo from '@/components/StudentInfo';
import { StudentProfile, KidProfile } from '@/types';
import { useChildrenStore } from '@/store/childrenStore';
import { useAuthStore } from '@/store/authStore';

export default function ChildProfileScreen() {
  const router = useRouter();
  const { kidsProfiles, clearChildren } = useChildrenStore();
  const logout = useAuthStore((state) => state.logout);
  const [allProfiles, setAllProfiles] = useState<Array<StudentProfile & { studentId: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    // Clear children data (selected profile, kids profiles, etc.)
    await clearChildren();
    // Clear auth data
    await logout();
    router.replace('/');
  };

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        setLoading(true);
        setError(null);

        // Always fetch profiles for all kids
        if (!kidsProfiles || kidsProfiles.length === 0) {
          setError('No children profiles found');
          setLoading(false);
          return;
        }

        // Fetch profile for each kid
        const profilePromises = kidsProfiles.map(async (kid: KidProfile) => {
          try {
            const profileData = await studentAPI.getProfile(kid.student);
            return { ...profileData, studentId: kid.student };
          } catch (err) {
            console.error(`Error fetching profile for student ${kid.student}:`, err);
            return null;
          }
        });

        const profiles = await Promise.all(profilePromises);
        const validProfiles = profiles.filter((p): p is StudentProfile & { studentId: number } => p !== null);
        setAllProfiles(validProfiles);
        
        if (validProfiles.length === 0) {
          setError('Failed to load profiles');
        }
      } catch (err: any) {
        console.error('Error fetching profiles:', err);
        
        let errorMessage = 'Failed to load profiles';
        
        try {
          if (err && typeof err === 'object') {
            if (err.response && err.response.data) {
              if (typeof err.response.data === 'string') {
                errorMessage = err.response.data;
              } else if (err.response.data.detail) {
                errorMessage = typeof err.response.data.detail === 'string' 
                  ? err.response.data.detail 
                  : JSON.stringify(err.response.data.detail);
              } else if (err.response.data.message) {
                errorMessage = err.response.data.message;
              }
            } else if (err.message) {
              errorMessage = err.message;
            }
          } else if (typeof err === 'string') {
            errorMessage = err;
          }
        } catch (parseError) {
          console.error('Error parsing error message:', parseError);
          errorMessage = 'An unexpected error occurred';
        }
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [kidsProfiles]);

  const getFullName = (prof: StudentProfile) => {
    if (!prof) return '';
    const parts = [prof.first_name, prof.middle_name, prof.last_name].filter(Boolean);
    return parts.join(' ');
  };

  const getPrimaryPhone = (prof: StudentProfile) => {
    if (!prof) return '';
    // Get primary phone from student or first parent
    if (prof.phone) {
      return prof.country_code ? `+${prof.country_code} ${prof.phone}` : prof.phone;
    }
    // Try to get from parents
    if (prof.perents_guardians && prof.perents_guardians.length > 0) {
      const parent = prof.perents_guardians[0];
      if (parent.contact_numbers && parent.contact_numbers.length > 0) {
        const contact = parent.contact_numbers[0];
        return `+${contact.country_code} ${contact.contact_number}`;
      }
    }
    return '';
  };

  const getAllPhones = (prof: StudentProfile) => {
    if (!prof) return [];
    const phones: string[] = [];
    
    // Add student phone if available
    if (prof.phone) {
      phones.push(prof.country_code ? `+${prof.country_code} ${prof.phone}` : prof.phone);
    }
    
    // Add all parent phones
    if (prof.perents_guardians) {
      prof.perents_guardians.forEach(parent => {
        if (parent.contact_numbers) {
          parent.contact_numbers.forEach(contact => {
            const phone = `+${contact.country_code} ${contact.contact_number}`;
            if (!phones.includes(phone)) {
              phones.push(phone);
            }
          });
        }
      });
    }
    
    return phones;
  };

  const getAllEmails = (prof: StudentProfile) => {
    if (!prof) return [];
    const emails: string[] = [];
    
    // Add all parent emails
    if (prof.perents_guardians) {
      prof.perents_guardians.forEach(parent => {
        if (parent.emails) {
          parent.emails.forEach(emailObj => {
            if (!emails.includes(emailObj.email)) {
              emails.push(emailObj.email);
            }
          });
        }
      });
    }
    
    return emails;
  };

  const renderProfileCard = ({ item }: { item: StudentProfile & { studentId: number } }) => {
    const primaryPhone = getPrimaryPhone(item);
    const allPhones = getAllPhones(item);
    const allEmails = getAllEmails(item);
    
    return (
      <StudentInfo
        profile={item}
        studentId={String(item.studentId)}
        primaryPhone={primaryPhone}
        getFullName={() => getFullName(item)}
        allEmails={allEmails}
        allPhones={allPhones}
      />
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.placeholder} />
        </View>
        <LoadingSpinner message="Loading profiles..." />
      </SafeAreaView>
    );
  }

  if (error && allProfiles.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Failed to load profiles'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
       
        {allProfiles.map((item, index) => (
          <View key={`profile-${item.studentId}-${index}`} style={styles.profileItem}>
            {renderProfileCard({ item })}
          </View>
        ))}
        
        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <LogOut size={20} color={COLORS.black} />
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'left',
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
  profileItem: {
    marginBottom: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: 24,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
  },
  logoutButtonText: {
    color: COLORS.black,
    fontSize: 16,
    fontWeight: '600',
    flex:1,
    marginLeft: 24,
  },
});

