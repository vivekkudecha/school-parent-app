import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { studentAPI } from '@/services/api';
import { ArrowLeft, Users } from 'lucide-react-native';
import { COLORS } from '@/constants/config';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import StudentInfo from '@/components/StudentInfo';
import { StudentProfile, KidProfile } from '@/types';
import { useChildrenStore } from '@/store/childrenStore';

export default function ChildProfileScreen() {
  const router = useRouter();
  const { student_id } = useLocalSearchParams<{ student_id: string }>();
  const { kidsProfiles } = useChildrenStore();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [allProfiles, setAllProfiles] = useState<Array<StudentProfile & { studentId: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfiles = async () => {
      const studentId = Array.isArray(student_id) ? student_id[0] : student_id;
      
      try {
        setLoading(true);
        setError(null);

        // If student_id is provided, fetch single profile
        if (studentId) {
          const userId = parseInt(String(studentId), 10);
          if (isNaN(userId)) {
            throw new Error('Invalid student ID');
          }
          
          const data = await studentAPI.getProfile(userId);
          console.log('Profile data received:', JSON.stringify(data, null, 2));
          const profileWithId = { ...data, studentId: userId };
          setProfile(profileWithId);
        } else {
          // If no student_id, fetch profiles for all kids
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
        }
      } catch (err: any) {
        console.error('Error fetching profiles:', err);
        
        let errorMessage = 'Failed to load profile';
        
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
  }, [student_id, kidsProfiles]);

  const getFullName = (prof?: StudentProfile) => {
    const profileToUse = prof || profile;
    if (!profileToUse) return '';
    const parts = [profileToUse.first_name, profileToUse.middle_name, profileToUse.last_name].filter(Boolean);
    return parts.join(' ');
  };

  const getPrimaryPhone = (prof?: StudentProfile) => {
    const profileToUse = prof || profile;
    if (!profileToUse) return '';
    // Get primary phone from student or first parent
    if (profileToUse.phone) {
      return profileToUse.country_code ? `+${profileToUse.country_code} ${profileToUse.phone}` : profileToUse.phone;
    }
    // Try to get from parents
    if (profileToUse.perents_guardians && profileToUse.perents_guardians.length > 0) {
      const parent = profileToUse.perents_guardians[0];
      if (parent.contact_numbers && parent.contact_numbers.length > 0) {
        const contact = parent.contact_numbers[0];
        return `+${contact.country_code} ${contact.contact_number}`;
      }
    }
    return '';
  };

  const getAllPhones = (prof?: StudentProfile) => {
    const profileToUse = prof || profile;
    if (!profileToUse) return [];
    const phones: string[] = [];
    
    // Add student phone if available
    if (profileToUse.phone) {
      phones.push(profileToUse.country_code ? `+${profileToUse.country_code} ${profileToUse.phone}` : profileToUse.phone);
    }
    
    // Add all parent phones
    if (profileToUse.perents_guardians) {
      profileToUse.perents_guardians.forEach(parent => {
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

  const getAllEmails = (prof?: StudentProfile) => {
    const profileToUse = prof || profile;
    if (!profileToUse) return [];
    const emails: string[] = [];
    
    // Add all parent emails
    if (profileToUse.perents_guardians) {
      profileToUse.perents_guardians.forEach(parent => {
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.placeholder} />
        </View>
        <LoadingSpinner message="Loading profile..." />
      </SafeAreaView>
    );
  }

  if (error && (!profile && allProfiles.length === 0)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Profile not found'}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // If no student_id and we have profiles, show list view with all StudentInfo cards
  const showListView = !student_id && allProfiles.length > 0;

  if (showListView) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.listHeader}>
            <Users size={24} color={COLORS.text} />
            <Text style={styles.listHeaderTitle}>Your Children</Text>
          </View>
          {allProfiles.map((item, index) => (
            <View key={`profile-${item.first_name}-${index}`} style={styles.profileItem}>
              {renderProfileCard({ item })}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Show single profile when student_id is provided
  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.placeholder} />
        </View>
        <LoadingSpinner message="Loading profile..." />
      </SafeAreaView>
    );
  }

  const primaryPhone = getPrimaryPhone(profile);
  const allPhones = getAllPhones(profile);
  const allEmails = getAllEmails(profile);

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
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <StudentInfo
          profile={profile}
          studentId={student_id || (profile && 'studentId' in profile ? String(profile.studentId) : undefined)}
          primaryPhone={primaryPhone}
          getFullName={() => getFullName(profile)}
          allEmails={allEmails}
          allPhones={allPhones}
        />
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
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
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
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  listHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginLeft: 12,
  },
  profileItem: {
    marginBottom: 16,
  },
});
