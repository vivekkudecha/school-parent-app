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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { Eye, EyeOff } from 'lucide-react-native';
import { useAuthStore } from '@/store/authStore';
import { useChildrenStore } from '@/store/childrenStore';
import { COLORS } from '@/constants/config';
import { authAPI } from '@/services/api';
import { LoginResponse } from '@/types';

// Validation schema
const loginSchema = Yup.object().shape({
  username: Yup.string()
    .required('Username/Phone/Email is required')
    .max(50, 'Username cannot exceed 50 characters')
    .matches(
      /^[a-zA-Z0-9._@-]+$/,
      'Username can only contain letters, numbers, and . _ - @'
    ),
  password: Yup.string()
    .required('Password is required')
    .min(1, 'Password is required'),
});

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const setKidsProfiles = useChildrenStore((state) => state.setKidsProfiles);
  const setSelectedKidProfile = useChildrenStore((state) => state.setSelectedKidProfile);

  const handleLogin = async (values: { username: string; password: string }, setSubmitting: (isSubmitting: boolean) => void, setFieldError: (field: string, message: string) => void, setStatus: (status: string | null) => void) => {
    try {
      setStatus(null);
      const data = await authAPI.login(values.username, values.password) as LoginResponse;

      // Store auth data
      await setAuth(data);

      // Store kids profiles (this saves to AsyncStorage)
      await setKidsProfiles(data.kids_profile);

      // Always select first kid (if available) and go to dashboard
      if (data.kids_profile.length > 0) {
        // Auto-select first kid
        await setSelectedKidProfile(data.kids_profile[0]);
      } else {
        // No kids - clear selected profile
        await setSelectedKidProfile(null);
      }
      router.replace('/(tabs)/dashboard');

    } catch (error: any) {
      console.error('Login error:', error);
      console.error('Error response data:', error.response?.data);
      
      let errorMessage = 'Login failed. Please check your credentials and try again.';
      
      // Handle Axios errors
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        // Log full response for debugging
        console.log('Full error response:', JSON.stringify(data, null, 2));
        
        // Handle different error response formats - check multiple possible fields
        if (typeof data === 'string') {
          errorMessage = data;
        } else if (data?.detail) {
          // Handle detail field (common in FastAPI/DRF)
          if (Array.isArray(data.detail)) {
            errorMessage = data.detail.map((item: any) => {
              if (typeof item === 'object' && item.msg) return item.msg;
              if (typeof item === 'object' && item.message) return item.message;
              return String(item);
            }).join(', ');
          } else if (typeof data.detail === 'object' && data.detail.msg) {
            errorMessage = data.detail.msg;
          } else {
            errorMessage = String(data.detail);
          }
        } else if (data?.message) {
          // Handle message field
          errorMessage = Array.isArray(data.message) 
            ? data.message.join(', ') 
            : String(data.message);
        } else if (data?.msg) {
          // Handle msg field
          errorMessage = Array.isArray(data.msg) 
            ? data.msg.join(', ') 
            : String(data.msg);
        } else if (data?.error) {
          // Handle error field
          if (typeof data.error === 'object' && data.error.message) {
            errorMessage = data.error.message;
          } else if (typeof data.error === 'object' && data.error.msg) {
            errorMessage = data.error.msg;
          } else {
            errorMessage = Array.isArray(data.error) 
              ? data.error.join(', ') 
              : String(data.error);
          }
        } else if (data?.errors) {
          // Handle errors array/object
          if (Array.isArray(data.errors)) {
            errorMessage = data.errors.join(', ');
          } else if (typeof data.errors === 'object') {
            const errorList = Object.entries(data.errors)
              .map(([key, value]) => {
                if (Array.isArray(value)) {
                  return value.join(', ');
                }
                return String(value);
              })
              .join('; ');
            errorMessage = errorList || 'Validation error occurred.';
          }
        } else if (typeof data === 'object' && data !== null) {
          // Handle field-specific validation errors (e.g., {"password": ["error message"]})
          // Check if data has field names as keys (common in DRF validation errors)
          const fieldErrors = Object.entries(data)
            .filter(([key]) => !['detail', 'message', 'msg', 'error', 'errors'].includes(key))
            .map(([key, value]) => {
              if (Array.isArray(value)) {
                return value.join(', ');
              }
              return String(value);
            });
          
          if (fieldErrors.length > 0) {
            errorMessage = fieldErrors.join('; ');
          }
        }
        
        // If no error message extracted yet, use status-based defaults
        if (errorMessage === 'Login failed. Please check your credentials and try again.') {
          if (status === 400) {
            errorMessage = 'Invalid username or password. Please check your credentials and try again.';
          } else if (status === 401) {
            errorMessage = 'Authentication failed. Please check your credentials.';
          } else if (status === 403) {
            errorMessage = 'Access denied. Please contact your administrator.';
          } else if (status === 404) {
            errorMessage = 'Service not found. Please try again later.';
          } else if (status >= 500) {
            errorMessage = 'Server error. Please try again later.';
          } else {
            errorMessage = `Login failed (Error ${status}). Please try again.`;
          }
        }
      } else if (error.request) {
        // Network error - no response received
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setStatus(errorMessage);
      setFieldError('password', '');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Decorative Shapes */}
          <View style={styles.decorativeShapes}>
            <Image
              source={require('@/assets/images/bg-logo.jpeg')}
              style={styles.bgLogo}
              resizeMode="cover"
            />
          </View>

          {/* Logo Section */}
          <View style={styles.logoSection}>
            <Image
              source={require('@/assets/images/logo.jpeg')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Login Title */}
          <Text style={styles.loginTitle}>Login</Text>

          {/* Login Form */}
          <Formik
            initialValues={{ username: '', password: '' }}
            validationSchema={loginSchema}
            onSubmit={(values, { setSubmitting, setFieldError, setStatus }) => {
              handleLogin(values, setSubmitting, setFieldError, setStatus);
            }}
          >
            {({
              handleChange,
              handleBlur,
              handleSubmit,
              values,
              errors,
              touched,
              isSubmitting,
              status,
            }) => (
              <View style={styles.form}>
                {/* Username/Phone/Email Field */}
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[
                      styles.input,
                      touched.username && errors.username && styles.inputError,
                    ]}
                    value={values.username}
                    onChangeText={handleChange('username')}
                    onBlur={handleBlur('username')}
                    placeholder="Mobile Number / Email"
                    placeholderTextColor={COLORS.black}
                    autoCapitalize="none"
                    keyboardType="default"
                    maxLength={50}
                  />
                  {touched.username && errors.username && (
                    <Text style={styles.errorText}>{errors.username}</Text>
                  )}
                </View>

                {/* Password Field */}
                <View style={styles.inputContainer}>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={[
                        styles.input,
                        styles.passwordInput,
                        touched.password && errors.password && styles.inputError,
                      ]}
                      value={values.password}
                      onChangeText={handleChange('password')}
                      onBlur={handleBlur('password')}
                      placeholder="Password/OTP"
                      placeholderTextColor={COLORS.black}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff size={20} color={COLORS.textLight} />
                      ) : (
                        <Eye size={20} color={COLORS.textLight} />
                      )}
                    </TouchableOpacity>
                  </View>
                  {touched.password && errors.password && (
                    <Text style={styles.errorText}>{errors.password}</Text>
                  )}
                </View>

                {/* Forgot Password Link */}
                <TouchableOpacity 
                  style={styles.forgotPasswordContainer}
                  onPress={() => router.push('/forgot-password')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>

                {/* Error Message */}
                {status && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorMessage}>{status}</Text>
                  </View>
                )}

                {/* Login Button */}
                <TouchableOpacity
                  style={[styles.button, isSubmitting && styles.buttonDisabled]}
                  onPress={() => handleSubmit()}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={COLORS.background} size="small" />
                  ) : (
                    <Text style={styles.buttonText}>Login</Text>
                  )}
                </TouchableOpacity>

                {/* Help Link */}
                <TouchableOpacity style={styles.helpContainer}>
                  <Text style={styles.helpText}>Need Help? Contact School Admin</Text>
                </TouchableOpacity>
              </View>
            )}
          </Formik>
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  decorativeShapes: {
    position: 'absolute',
    top: 0,
    right: 0,
    height: 120,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  bgLogo: {
    width: 250,
    height: 130,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 100,
  },
  logo: {
    width: 180,
    height: 120,
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 14,
    padding: 4,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  forgotPasswordText: {
    color: COLORS.black,
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: COLORS.errorLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
  },
  errorMessage: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '500',
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
  helpContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  helpText: {
    color: COLORS.black,
    fontSize: 14,
  },
});
