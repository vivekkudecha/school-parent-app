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

      // Store kids profiles
      await setKidsProfiles(data.kids_profile);

      // Handle navigation based on kids profile count
      if (data.kids_profile.length === 0) {
        // No kids profile - go to dashboard
        router.replace('/dashboard');
      } else if (data.kids_profile.length === 1) {
        // Single kid - auto-select and go to dashboard
        await setSelectedKidProfile(data.kids_profile[0]);
        router.replace('/dashboard');

      } else {
        // Multiple kids - go to selection screen
        router.replace('/select-kid');
      }

    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message || 
                          error.message || 
                          'Login failed. Please check your credentials and try again.';
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
                <TouchableOpacity style={styles.forgotPasswordContainer}>
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
