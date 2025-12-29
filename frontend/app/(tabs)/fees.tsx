import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { studentAPI } from '@/services/api';
import { ArrowLeft, ChevronUp, ChevronDown, Building2, RefreshCw, FileText, AlertTriangle } from 'lucide-react-native';
import { COLORS } from '@/constants/config';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useChildrenStore } from '@/store/childrenStore';
import { FeesData, FeesDetail, KidProfile } from '@/types';
import { useIsFocused } from '@react-navigation/native';

export default function FeesScreen() {
  const router = useRouter();
  const { selectedKidProfile, kidsProfiles, setSelectedKidProfile } = useChildrenStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feesData, setFeesData] = useState<FeesData | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [showKidSelector, setShowKidSelector] = useState(false);
  const focused=useIsFocused()

  useEffect(() => {
    console.log('Fees screen - useEffect triggered, selectedKidProfile:', selectedKidProfile);
    
    const fetchFees = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('Fees screen - fetchFees called, selectedKidProfile:', selectedKidProfile);
        
        if (!selectedKidProfile) {
          console.error('Fees screen - No selectedKidProfile');
          setError('No student selected');
          setLoading(false);
          return;
        }

        // Get academic_package_id from selectedKidProfile (from kids_profile in login response)
        // Check for the actual field name from API: "acedamic_pacge_id" (with typo)
        const academicPackageId = 
          selectedKidProfile.acedamic_pacge_id || // Actual field name from API (with typo)
          selectedKidProfile.academic_package_id || 
          selectedKidProfile.academic_package || 
          selectedKidProfile.acedmic_package; // Other typo variants

        console.log('Fees screen - academicPackageId:', academicPackageId);
        console.log('Fees screen - selectedKidProfile keys:', Object.keys(selectedKidProfile));
        console.log('Fees screen - acedamic_pacge_id:', selectedKidProfile.acedamic_pacge_id);

        if (!academicPackageId) {
          console.error('Fees screen - No academicPackageId found');
          console.error('Fees screen - selectedKidProfile:', selectedKidProfile);
          setError('Academic package information is not available for this student. Please contact support.');
          setLoading(false);
          return;
        }

        console.log('Fees screen - Calling API with:', {
          student: selectedKidProfile.student,
          admission: selectedKidProfile.admission,
          academicPackageId: academicPackageId
        });

        const fees = await studentAPI.getFeesData(
          selectedKidProfile.student,
          selectedKidProfile.admission,
          academicPackageId
        );
        
        console.log('Fees screen - API response:', fees);
        setFeesData(fees);
      } catch (err: any) {
        console.error('Fees screen - Error fetching fees:', err);
          setFeesData(null);
        // Log detailed error information
        if (err.response) {
          // Server responded with error status
          console.error('Fees screen - Response status:', err.response.status);
          console.error('Fees screen - Response data:', err.response.data);
          console.error('Fees screen - Request URL:', err.config?.url);
          console.error('Fees screen - Request params:', {
            student: selectedKidProfile?.student,
            admission: selectedKidProfile?.admission,
            academic_package: selectedKidProfile?.acedamic_pacge_id || selectedKidProfile?.academic_package_id,
          });
          
          // Extract error message from response
          let errorMessage = 'Failed to load fees';
          if (err.response.data) {
            if (typeof err.response.data === 'string') {
              errorMessage = err.response.data;
            } else if (err.response.data.detail) {
              errorMessage = Array.isArray(err.response.data.detail)
                ? err.response.data.detail.map((item: any) => 
                    typeof item === 'object' && item.msg ? item.msg : String(item)
                  ).join(', ')
                : String(err.response.data.detail);
            } else if (err.response.data.message) {
              errorMessage = err.response.data.message;
            } else if (err.response.data.error) {
              errorMessage = err.response.data.error;
            }
          }
          console.error('Fees screen - Error message:', errorMessage);
          setError(errorMessage);
        } else if (err.request) {
          // Request was made but no response received
          console.error('Fees screen - No response received:', err.request);
          console.error('Fees screen - Request URL:', err.config?.url);
          console.error('Fees screen - Request params:', {
            student: selectedKidProfile?.student,
            admission: selectedKidProfile?.admission,
            academic_package: selectedKidProfile?.acedamic_pacge_id || selectedKidProfile?.academic_package_id,
          });
          setError('Network error. Please check your connection and try again.');
        } else {
          // Error setting up the request
          console.error('Fees screen - Request setup error:', err.message);
          setError(err.message || 'An unexpected error occurred');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchFees();
  }, [selectedKidProfile, focused]);

  const toggleSection = (feeGroup: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(feeGroup)) {
      newExpanded.delete(feeGroup);
    } else {
      newExpanded.add(feeGroup);
    }
    setExpandedSections(newExpanded);
  };

  const getFullName = (kid?: KidProfile) => {
    const profile = kid || selectedKidProfile;
    if (!profile) return '';
    const parts = [
      profile.first_name,
      profile.middle_name,
      profile.last_name,
    ].filter(Boolean);
    return parts.join(' ');
  };

  const getInitials = () => {
    if (!selectedKidProfile) return '';
    const first = selectedKidProfile.first_name?.[0] || '';
    const last = selectedKidProfile.last_name?.[0] || '';
    return `${first}${last}`.toUpperCase();
  };

  const formatCurrency = (amount: string) => {
    // If already formatted with ₹, return as is
    if (amount.includes('₹')) return amount;
    // Otherwise, format the number
    const num = parseFloat(amount.replace(/[₹,]/g, ''));
    if (isNaN(num)) return amount;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getFeeGroupIcon = (feeGroup: string) => {
    if (feeGroup.toLowerCase().includes('yearly') || feeGroup.toLowerCase().includes('tuition')) {
      return <Building2 size={20} color={COLORS.text} />;
    } else if (feeGroup.toLowerCase().includes('imprest')) {
      return <RefreshCw size={20} color={COLORS.text} />;
    } else if (feeGroup.toLowerCase().includes('admission')) {
      return <FileText size={20} color={COLORS.text} />;
    }
    return <FileText size={20} color={COLORS.text} />;
  };

  // Common student info card component
  const renderStudentInfo = () => {
    if (!selectedKidProfile) return null;
    return (
      <TouchableOpacity
        style={styles.studentInfo}
        onPress={() => setShowKidSelector(true)}
        activeOpacity={0.8}
      >
        <View style={styles.avatarContainer}>
          {selectedKidProfile.photo ? (
            <Image source={{ uri: selectedKidProfile.photo }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{getInitials()}</Text>
            </View>
          )}
        </View>
        <View style={styles.studentInfoText}>
          <Text style={styles.studentName}>{getFullName()}</Text>
          <Text style={styles.studentDate}>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
        </View>
        <ChevronDown size={20} color={COLORS.text} />
      </TouchableOpacity>
    );
  };

  // Common kid selector modal component
  const renderKidSelectorModal = () => (
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
                      // Reset fees data when switching kids
                      setFeesData(null);
                      setError(null);
                      setLoading(true);
                      
                      // Set new selected kid
                      await setSelectedKidProfile(kid);
                      setShowKidSelector(false);
                      
                      // The useEffect will automatically fetch fees for the new kid
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
  );

  const renderQuarterlyBreakdown = (quarterData: any[]) => {
    if (!quarterData || quarterData.length === 0) return null;

    return (
      <View style={styles.quarterlyTable}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, { flex: 1 }]}>Title</Text>
          <Text style={[styles.tableHeaderText, { flex: 1 }]}>Total</Text>
          <Text style={[styles.tableHeaderText, { flex:1}]}>Paid</Text>
          <Text style={[styles.tableHeaderText, { flex: 1}]}>Pending</Text>
        </View>
        {quarterData.map((quarter, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={[styles.tableCellText, { flex: 1 }]}>{quarter.title}</Text>
            <Text style={[styles.tableCellText, { flex:1 }]}>{formatCurrency(quarter.total_fees)}</Text>
            <Text style={[styles.tableCellText, { flex: 1 }]}>{formatCurrency(quarter.total_paid)}</Text>
            <Text style={[styles.tableCellText, { flex: 1 }]}>
              {formatCurrency(quarter.total_reaming)}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderFeeSection = (feeDetail: FeesDetail) => {
    const isExpanded = expandedSections.has(feeDetail.fee_group);
    const hasQuarterlyData = feeDetail.fees_records.some(record => 
      record.quarter_data && record.quarter_data.length > 0
    );

    return (
      <View key={feeDetail.fee_group} style={styles.feeSection}>
        <TouchableOpacity
          style={styles.feeSectionHeader}
          onPress={() => toggleSection(feeDetail.fee_group)}
          activeOpacity={0.7}
        >
          <View style={styles.feeSectionHeaderLeft}>
            {getFeeGroupIcon(feeDetail.fee_group)}
            <Text style={styles.feeSectionTitle}>{feeDetail.fee_group}</Text>
          </View>
          <View style={styles.feeSectionHeaderRight}>
            <Text style={styles.feeSectionPending}>
              Pending: {formatCurrency(feeDetail.total_pending)}
            </Text>
            {isExpanded ? (
              <ChevronUp size={20} color={COLORS.textLight} />
            ) : (
              <ChevronDown size={20} color={COLORS.textLight} />
            )}
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <>
            <View style={styles.feeSectionSummary}>
              <View style={styles.feeSectionSummaryLeft}>
                <Text style={styles.feeSectionSummaryText}>
                  Total
                </Text>
                <Text style={[styles.feeSectionSummaryText, { color: COLORS.grey }]}>{formatCurrency(feeDetail.total_amount)}</Text>
              </View>
              <View style={styles.feeSectionSummaryLeft}>
                <Text style={styles.feeSectionSummaryText}>
                  Paid
                </Text>
                <Text style={[styles.feeSectionSummaryText, { color: COLORS.grey }]}>{formatCurrency(feeDetail.total_paid)}</Text>
              </View>
              <View style={styles.feeSectionSummaryLeft}>
                <Text style={[styles.feeSectionSummaryText]}>
                  Pending
                </Text>
                <Text style={[styles.feeSectionSummaryText, { color: COLORS.grey }]}>{formatCurrency(feeDetail.total_pending)}</Text>
              </View>
            </View>

            {hasQuarterlyData && (
              <View style={styles.quarterlyContainer}>
                <Text style={styles.quarterlyTitle}>Quarterly Breakdown</Text>
                {feeDetail.fees_records.map((record, recordIndex) => (
                  record.quarter_data && record.quarter_data.length > 0 && (
                    <View key={recordIndex}>
                      {renderQuarterlyBreakdown(record.quarter_data)}
                    </View>
                  )
                ))}
              </View>
            )}
          </>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Fees Summary</Text>
          <View style={styles.placeholder} />
        </View>
        <LoadingSpinner message="Loading fees..." />
      </SafeAreaView>
    );
  }

  if (error && !feesData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Fees Summary</Text>
          <View style={styles.placeholder} />
        </View>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderStudentInfo()}
          <View style={styles.emptyContainer}>
            <AlertTriangle size={64} color={COLORS.error} />
            <Text style={styles.emptyTitle}>No Fees Allocated</Text>
            <Text style={styles.emptyText}>There Are No Fees Allocated</Text>
          </View>
        </ScrollView>
        {renderKidSelectorModal()}
      </SafeAreaView>
    );
  }

  if (!feesData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Fees Summary</Text>
          <View style={styles.placeholder} />
        </View>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderStudentInfo()}
          <View style={styles.emptyContainer}>
            <AlertTriangle size={64} color={COLORS.error} />
            <Text style={styles.emptyTitle}>No Fees Allocated</Text>
            <Text style={styles.emptyText}>There Are No Fees Allocated</Text>
          </View>
        </ScrollView>
        {renderKidSelectorModal()}
      </SafeAreaView>
    );
  }

  const academicYear = feesData.student_fees_structure_year?.year || selectedKidProfile?.academic_year || new Date().getFullYear();
  const academicYearText = `${academicYear}-${(academicYear + 1).toString().slice(-2)}`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Fees Summary</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderStudentInfo()}

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.academicYear}>Academic Year {academicYearText}</Text>
          <View style={styles.summaryButtons}>
            <View style={[styles.summaryButton, styles.summaryButtonBlue]}>
              <Text style={styles.summaryButtonText}>Total</Text>
              <Text style={styles.summaryButtonText}>{formatCurrency(feesData.total_fee_amount)}</Text>
            </View>
            <View style={[styles.summaryButton, styles.summaryButtonGreen]}>
              <Text style={styles.summaryButtonText}>Paid</Text>
              <Text style={styles.summaryButtonText}>{formatCurrency(feesData.total_fee_paid)}</Text>
            </View> 
            <View style={[styles.summaryButton, styles.summaryButtonRed]}>
              <Text style={styles.summaryButtonText}>Pending</Text>
              <Text style={styles.summaryButtonText}>{formatCurrency(feesData.total_fee_pending)}</Text>
            </View>
          </View>
        </View>

        {/* Fees Details */}
        {feesData.fees_detail && feesData.fees_detail.length > 0 ? (
          feesData.fees_detail.map((feeDetail) => renderFeeSection(feeDetail))
        ) : (
          <View style={styles.emptyContainer}>
            <AlertTriangle size={64} color={COLORS.error} />
            <Text style={styles.emptyTitle}>No Fees Allocated</Text>
            <Text style={styles.emptyText}>There Are No Fees Allocated</Text>
          </View>
        )}
        <View style={{height:100}}></View>
      </ScrollView>

      {renderKidSelectorModal()}
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
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    marginLeft: 8,
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.secondary,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLORS.background,
    fontSize: 18,
    fontWeight: '600',
  },
  studentInfoText: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  studentDate: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  summaryCard: {
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 16,
  },
  academicYear: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 12,
  },
  summaryButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  summaryButtonBlue: {
    backgroundColor: COLORS.primary,
  },
  summaryButtonGreen: {
    backgroundColor: COLORS.success,
  },
  summaryButtonRed: {
    backgroundColor: COLORS.error,
  },
  summaryButtonText: {
    color: COLORS.background,
    fontSize: 12,
    fontWeight: '600',
  },
  feeSection: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  feeSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  feeSectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  feeSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 12,
    flex: 1,
  },
  feeSectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feeSectionPending: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.grey,
  },
  feeSectionSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 8,
    paddingTop: 12,
  },
  feeSectionSummaryText: {
    fontSize: 14,
    color: COLORS.black,
    fontWeight: '600',
  },
  quarterlyContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.secondary,
  },
  quarterlyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  quarterlyTable: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.secondary,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  tableCellText: {
    fontSize: 12,
    color: COLORS.text,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
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
    fontWeight: '600',
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
    backgroundColor: COLORS.secondary,
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
  feeSectionSummaryLeft: {
    flex: 1,
    alignItems: 'center',
  },

});
