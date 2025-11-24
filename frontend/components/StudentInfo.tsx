import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
} from 'react-native';
import { Phone, Book, Users, Shield, User, Mail, MapPin } from 'lucide-react-native';
import { COLORS } from '@/constants/config';
import { StudentProfile } from '@/types';

interface StudentInfoProps {
  profile: StudentProfile;
  studentId?: string | string[];
  primaryPhone?: string;
  getFullName: () => string;
  allEmails?: string[];
  allPhones?: string[];
}

export default function StudentInfo({
  profile,
  studentId,
  primaryPhone,
  getFullName,
  allEmails = [],
  allPhones = [],
}: StudentInfoProps) {
  return (
    <View style={styles.studentInfoContainer}>
      {/* Student Info Section */}
      <View style={styles.studentInfoCard}>
        <View style={styles.studentInfoHeader}>
          <View style={styles.studentInfoLeft}>
            {profile.photo ? (
              <Image
                source={{ uri: profile.photo }}
                style={styles.studentPhoto}
              />
            ) : (
              <View style={[styles.studentPhoto, styles.studentPhotoPlaceholder]}>
                <Text style={styles.studentPhotoText}>
                  {profile.first_name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.studentInfoText}>
              <Text style={styles.studentName}>{getFullName()}</Text>
              {studentId && (
                <Text style={styles.grNumber}>
                  GR NO. {Array.isArray(studentId) ? studentId[0] : studentId}
                </Text>
              )}
              {primaryPhone ? (
                <View style={styles.phoneRow}>
                  <Phone size={14} color={COLORS.textLight} />
                  <Text style={styles.phoneText}>{primaryPhone}</Text>
                </View>
              ) : null}
            </View>
          </View>
          {profile.house_color && (
            <View style={[styles.shieldIcon, { backgroundColor: profile.house_color }]}>
              <Shield size={20} color={COLORS.background} />
            </View>
          )}
        </View>

        <View style={styles.academicDetailsRow}>
          <View style={styles.academicItem}>
            <Book size={16} color={COLORS.error} />
            <Text style={styles.academicText}>Standard - {profile.grade_name}</Text>
          </View>
          <View style={styles.academicItemSeparator} />
          <View style={styles.academicItem}>
            <Users size={16} color={COLORS.primary} />
            <Text style={styles.academicText}>Division - {profile.division || 'N/A'}</Text>
          </View>
        </View>
      </View>

      {/* Parents Info Section */}
      {profile.perents_guardians && profile.perents_guardians.length > 0 && (
        <View style={styles.parentsInfoSection}>
          <Text style={styles.sectionTitle}>Parents Info</Text>
          {profile.perents_guardians.map((parent) => (
            <View key={parent.id} style={styles.parentItem}>
              <User size={18} color={COLORS.textLight} />
              <View style={styles.parentInfo}>
                <Text style={styles.parentName}>{parent.full_name}</Text>
                {parent.contact_numbers && parent.contact_numbers.length > 0 && (
                  <Text style={styles.parentContact}>
                    +{parent.contact_numbers[0].country_code} {parent.contact_numbers[0].contact_number}
                  </Text>
                )}
                {parent.emails && parent.emails.length > 0 && (
                  <Text style={styles.parentEmail}>{parent.emails[0].email}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Contact Info Section */}
      <View style={styles.contactInfoSection}>
        <Text style={styles.sectionTitle}>Contact Info</Text>
        
        {allEmails.length > 0 && (
          <View style={styles.contactItem}>
            <Mail size={18} color={COLORS.textLight} />
            <Text style={styles.contactValue}>{allEmails.join(', ')}</Text>
          </View>
        )}
        
        {allPhones.length > 0 && (
          <View style={styles.contactItem}>
            <Phone size={18} color={COLORS.textLight} />
            <Text style={styles.contactValue}>{allPhones.join(', ')}</Text>
          </View>
        )}
        
        {profile.address && (
          <View style={styles.contactItem}>
            <MapPin size={18} color={COLORS.textLight} />
            <Text style={styles.contactValue}>{profile.address}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  studentInfoContainer: {
    flex: 1,
    padding: 16,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
  },
  studentInfoCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
  },
  studentInfoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  studentInfoLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  studentPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.border,
    marginRight: 12,
  },
  studentPhotoPlaceholder: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentPhotoText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.background,
  },
  studentInfoText: {
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  grNumber: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  phoneText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  shieldIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  academicDetailsRow: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  academicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex:1
  },
  academicText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
    marginLeft:6
  },
  parentsInfoSection: {
    marginTop: 12,
   
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  parentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  parentInfo: {
    flex: 1,
  },
  parentName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  parentContact: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  parentEmail: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  contactInfoSection: {
    marginTop: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  contactValue: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  academicItemSeparator: {
    width: 1,
    height: 16,
    backgroundColor: COLORS.border,
    marginHorizontal: 12,
  },
});

