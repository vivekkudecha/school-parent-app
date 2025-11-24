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
import { ArrowLeft, Mail, Phone } from 'lucide-react-native';
import { COLORS } from '@/constants/config';

// Validation schema
const forgotPasswordSchema = Yup.object().shape({
  username: Yup.string()
    .required('Mobile Number / Email is required')
    .max(50, 'Cannot exceed 50 characters')
    .matches(
      /^[a-zA-Z0-9._@-]+$/,
      'Can only contain letters, numbers, and . _ - @'
    ),
});

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = async (values: { username: string }) => {
    try {
      setIsSubmitting(true);
      setStatus(null);
      
      // TODO: Implement API call for forgot password
      // const response = await authAPI.forgotPassword(values.username);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setStatus('Password reset instructions have been sent to your registered email/mobile number.');
    } catch (error: any) {
      console.error('Forgot password error:', error);
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to send reset instructions. Please try again.';
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
              <Text style={styles.title}>Forgot Password?</Text>
              <Text style={styles.subtitle}>
                Enter your mobile number or email address and we'll send you instructions to reset your password.
              </Text>
            </View>

            {/* Form */}
            <Formik
              initialValues={{ username: '' }}
              validationSchema={forgotPasswordSchema}
              onSubmit={handleSubmit}
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
                  {/* Username/Phone/Email Field */}
                  <View style={styles.inputContainer}>
                    <View style={styles.inputWrapper}>
                      <View style={styles.inputIcon}>
                        <Mail size={20} color={COLORS.textLight} />
                      </View>
                      <TextInput
                        style={[
                          styles.input,
                          touched.username && errors.username && styles.inputError,
                        ]}
                        value={values.username}
                        onChangeText={handleChange('username')}
                        onBlur={handleBlur('username')}
                        placeholder="Mobile Number / Email"
                        placeholderTextColor={COLORS.textLight}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        maxLength={50}
                      />
                    </View>
                    {touched.username && errors.username && (
                      <Text style={styles.errorText}>{errors.username}</Text>
                    )}
                  </View>

                  {/* Success/Error Message */}
                  {status && (
                    <View style={[
                      styles.messageContainer,
                      status.includes('sent') ? styles.successContainer : styles.errorContainer
                    ]}>
                      <Text style={[
                        styles.messageText,
                        status.includes('sent') ? styles.successText : styles.errorMessage
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
                      <Text style={styles.buttonText}>Send Reset Instructions</Text>
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

