import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { ArrowLeft, Mail, Lock, Key } from 'lucide-react-native';
import { COLORS } from '@/constants/config';
import { authAPI } from '@/services/api';

// Validation schema for step 1 (Request OTP)
const requestOTPSchema = Yup.object().shape({
  email: Yup.string()
    .required('Email is required')
    .email('Please enter a valid email address')
    .max(100, 'Cannot exceed 100 characters'),
});

// Validation schema for step 2 (Reset Password)
const resetPasswordSchema = Yup.object().shape({
  otp: Yup.string()
    .required('OTP is required')
    .min(4, 'OTP must be at least 4 characters')
    .max(10, 'OTP cannot exceed 10 characters'),
  newPassword: Yup.string()
    .required('New password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
  confirmPassword: Yup.string()
    .required('Please confirm your password')
    .oneOf([Yup.ref('newPassword')], 'Passwords must match'),
});

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1); // 1: Request OTP, 2: Reset Password
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');

  // Step 1: Request OTP
  const handleRequestOTP = async (values: { email: string }) => {
    try {
      setIsSubmitting(true);
      setStatus(null);
      
      const response = await authAPI.requestOTPForPasswordReset(values.email);
      
      if (response.message) {
        setUserEmail(values.email);
        setStep(2);
        setStatus(null); // Clear any previous status
      }
    } catch (error: any) {
      console.error('Request OTP error:', error);
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to send OTP. Please try again.';
      setStatus(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Verify OTP and Reset Password
  const handleResetPassword = async (values: { otp: string; newPassword: string; confirmPassword: string }) => {
    try {
      setIsSubmitting(true);
      setStatus(null);
      
      const response = await authAPI.verifyOTPAndResetPassword(
        userEmail,
        values.newPassword,
        values.confirmPassword,
        values.otp
      );
      
      if (response.message) {
        setStatus('Password reset successfully. You can now login with your new password.');
        // Navigate to login after 2 seconds
        setTimeout(() => {
          router.replace('/');
        }, 2000);
      }
    } catch (error: any) {
      console.error('Reset password error:', error);
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to reset password. Please check your OTP and try again.';
      setStatus(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <ArrowLeft size={24} color={COLORS.text} />
            </TouchableOpacity>

            {/* Title Section */}
            <View style={styles.titleSection}>
              <Text style={styles.title}>
                {step === 1 ? 'Forgot Password?' : 'Reset Password'}
              </Text>
              <Text style={styles.subtitle}>
                {step === 1
                  ? "Enter your email address and we'll send you an OTP to reset your password."
                  : `Enter the OTP sent to ${userEmail} and your new password.`}
              </Text>
            </View>

            {/* Step 1: Request OTP */}
            {step === 1 && (
              <Formik
                initialValues={{ email: '' }}
                validationSchema={requestOTPSchema}
                onSubmit={handleRequestOTP}
              >
                {({
                  handleChange,
                  handleBlur,
                  handleSubmit,
                  values,
                  errors,
                  touched,
                }) => (
                  <View style={styles.form}>
                    {/* Email Field */}
                    <View style={styles.inputContainer}>
                      <View style={styles.inputWrapper}>
                        <View style={styles.inputIcon}>
                          <Mail size={20} color={COLORS.textLight} />
                        </View>
                        <TextInput
                          style={[
                            styles.input,
                            touched.email && errors.email && styles.inputError,
                          ]}
                          value={values.email}
                          onChangeText={handleChange('email')}
                          onBlur={handleBlur('email')}
                          placeholder="Email Address"
                          placeholderTextColor={COLORS.textLight}
                          autoCapitalize="none"
                          keyboardType="email-address"
                          maxLength={100}
                        />
                      </View>
                      {touched.email && errors.email && (
                        <Text style={styles.errorText}>{errors.email}</Text>
                      )}
                    </View>

                    {/* Success/Error Message */}
                    {status && (
                      <View style={[
                        styles.messageContainer,
                        status.includes('successfully') ? styles.successContainer : styles.errorContainer
                      ]}>
                        <Text style={[
                          styles.messageText,
                          status.includes('successfully') ? styles.successText : styles.errorMessage
                        ]}>
                          {status}
                        </Text>
                      </View>
                    )}

                    {/* Submit Button */}
                    <TouchableOpacity
                      style={[styles.button, isSubmitting && styles.buttonDisabled]}
                      onPress={() => handleSubmit()}
                      disabled={isSubmitting}
                      activeOpacity={0.8}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator color={COLORS.background} size="small" />
                      ) : (
                        <Text style={styles.buttonText}>Send OTP</Text>
                      )}
                    </TouchableOpacity>

                    {/* Back to Login Link */}
                    <TouchableOpacity
                      style={styles.backToLoginContainer}
                      onPress={() => router.back()}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.backToLoginText}>
                        Remember your password? <Text style={styles.backToLoginLink}>Login</Text>
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Formik>
            )}

            {/* Step 2: Reset Password */}
            {step === 2 && (
              <Formik
                initialValues={{ otp: '', newPassword: '', confirmPassword: '' }}
                validationSchema={resetPasswordSchema}
                onSubmit={handleResetPassword}
              >
                {({
                  handleChange,
                  handleBlur,
                  handleSubmit,
                  values,
                  errors,
                  touched,
                }) => (
                  <View style={styles.form}>
                    {/* OTP Field */}
                    <View style={styles.inputContainer}>
                      <View style={styles.inputWrapper}>
                        <View style={styles.inputIcon}>
                          <Key size={20} color={COLORS.textLight} />
                        </View>
                        <TextInput
                          style={[
                            styles.input,
                            touched.otp && errors.otp && styles.inputError,
                          ]}
                          value={values.otp}
                          onChangeText={handleChange('otp')}
                          onBlur={handleBlur('otp')}
                          placeholder="Enter OTP"
                          placeholderTextColor={COLORS.textLight}
                          autoCapitalize="none"
                          keyboardType="default"
                          maxLength={10}
                        />
                      </View>
                      {touched.otp && errors.otp && (
                        <Text style={styles.errorText}>{errors.otp}</Text>
                      )}
                    </View>

                    {/* New Password Field */}
                    <View style={styles.inputContainer}>
                      <View style={styles.inputWrapper}>
                        <View style={styles.inputIcon}>
                          <Lock size={20} color={COLORS.textLight} />
                        </View>
                        <TextInput
                          style={[
                            styles.input,
                            touched.newPassword && errors.newPassword && styles.inputError,
                          ]}
                          value={values.newPassword}
                          onChangeText={handleChange('newPassword')}
                          onBlur={handleBlur('newPassword')}
                          placeholder="New Password"
                          placeholderTextColor={COLORS.textLight}
                          autoCapitalize="none"
                          secureTextEntry
                          maxLength={100}
                        />
                      </View>
                      {touched.newPassword && errors.newPassword && (
                        <Text style={styles.errorText}>{errors.newPassword}</Text>
                      )}
                    </View>

                    {/* Confirm Password Field */}
                    <View style={styles.inputContainer}>
                      <View style={styles.inputWrapper}>
                        <View style={styles.inputIcon}>
                          <Lock size={20} color={COLORS.textLight} />
                        </View>
                        <TextInput
                          style={[
                            styles.input,
                            touched.confirmPassword && errors.confirmPassword && styles.inputError,
                          ]}
                          value={values.confirmPassword}
                          onChangeText={handleChange('confirmPassword')}
                          onBlur={handleBlur('confirmPassword')}
                          placeholder="Confirm Password"
                          placeholderTextColor={COLORS.textLight}
                          autoCapitalize="none"
                          secureTextEntry
                          maxLength={100}
                        />
                      </View>
                      {touched.confirmPassword && errors.confirmPassword && (
                        <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                      )}
                    </View>

                    {/* Success/Error Message */}
                    {status && (
                      <View style={[
                        styles.messageContainer,
                        status.includes('successfully') ? styles.successContainer : styles.errorContainer
                      ]}>
                        <Text style={[
                          styles.messageText,
                          status.includes('successfully') ? styles.successText : styles.errorMessage
                        ]}>
                          {status}
                        </Text>
                      </View>
                    )}

                    {/* Submit Button */}
                    <TouchableOpacity
                      style={[styles.button, isSubmitting && styles.buttonDisabled]}
                      onPress={() => handleSubmit()}
                      disabled={isSubmitting}
                      activeOpacity={0.8}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator color={COLORS.background} size="small" />
                      ) : (
                        <Text style={styles.buttonText}>Reset Password</Text>
                      )}
                    </TouchableOpacity>

                    {/* Back to Step 1 */}
                    <TouchableOpacity
                      style={styles.backToLoginContainer}
                      onPress={() => {
                        setStep(1);
                        setStatus(null);
                        setUserEmail('');
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.backToLoginText}>
                        Didn't receive OTP? <Text style={styles.backToLoginLink}>Resend</Text>
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Formik>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  titleSection: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputIcon: {
    paddingLeft: 16,
    paddingRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingRight: 16,
    fontSize: 16,
    color: COLORS.text,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  messageContainer: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  successContainer: {
    backgroundColor: '#E8F5E9',
    borderLeftColor: COLORS.success,
  },
  errorContainer: {
    backgroundColor: COLORS.errorLight,
    borderLeftColor: COLORS.error,
  },
  messageText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  successText: {
    color: COLORS.success,
  },
  errorMessage: {
    color: COLORS.error,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 52,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
  backToLoginContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  backToLoginText: {
    color: COLORS.textLight,
    fontSize: 14,
  },
  backToLoginLink: {
    color: COLORS.primary,
    fontWeight: '600',
  },

});

