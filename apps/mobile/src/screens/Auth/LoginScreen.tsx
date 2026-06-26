import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { sendOTP, verifyOTP } from '../../services/AuthService';
import { resolveImgUrl } from '../../utils/StorageUtils';

interface LoginScreenProps {
  authData?: any;
  onLogin?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = (props) => {
  const { width, height } = useWindowDimensions();
  const isSmallScreen = height < 680;
  const isWideScreen = width >= 600;

  const [phoneNumber, setPhoneNumber] = useState('');
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handlePhoneChange = (text: string) => {
    setPhoneNumber(text.replace(/[^0-9]/g, ''));
  };

  const handleOtpChange = (text: string) => {
    setOtpCode(text.replace(/[^0-9]/g, ''));
  };

  const handleSendOTP = async () => {
    if (!isTermsAccepted || phoneNumber.length === 0 || cooldown > 0 || isLoading) return;
    setIsLoading(true);
    const response = await sendOTP(phoneNumber);
    setIsLoading(false);
    if (response.success) {
      setOtpSent(true);
      setCooldown(60);
    } else {
      Alert.alert('Authentication Error', response.error || 'Failed to send OTP. Please try again.');
    }
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length === 0 || isLoading) return;
    setIsLoading(true);
    const response = await verifyOTP(phoneNumber, otpCode);
    setIsLoading(false);
    if (response.success) {
      props.onLogin?.();
    } else {
      Alert.alert('Verification Error', response.error || 'Invalid OTP code entered.');
    }
  };

  const isSendDisabled = !isTermsAccepted || phoneNumber.length === 0 || cooldown > 0 || isLoading;
  const isVerifyDisabled = otpCode.length === 0 || isLoading;

  // Responsive values
  const bannerHeight = isSmallScreen ? 120 : Math.min(height * 0.22, 200);
  const formMaxWidth = isWideScreen ? 440 : undefined;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Branding banner */}
        <View style={styles.bannerContainer}>
          <Image
            source={{ uri: resolveImgUrl('Logo.png')! }}
            style={[styles.banner, { height: bannerHeight, width: isWideScreen ? '55%' : '85%' }]}
            resizeMode="contain"
          />
        </View>

        {/* Form card */}
        <View style={[styles.formWrapper, formMaxWidth ? { maxWidth: formMaxWidth, alignSelf: 'center', width: '100%' } : {}]}>
          <Text style={styles.title}>Let's Get You In</Text>
          <Text style={styles.subtitle}>Enter your mobile number to continue</Text>

          {/* Phone input */}
          <View style={styles.inputContainer}>
            <View style={styles.prefixBox}>
              <Text style={styles.prefix}>🇮🇳 +91</Text>
            </View>
            <TextInput
              style={styles.input}
              value={phoneNumber}
              onChangeText={handlePhoneChange}
              keyboardType="numeric"
              placeholder="10-digit mobile number"
              placeholderTextColor="#CBD5E1"
              maxLength={10}
              editable={!otpSent && !isLoading}
            />
          </View>

          {/* OTP input */}
          {otpSent && (
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, styles.otpInput]}
                value={otpCode}
                onChangeText={handleOtpChange}
                keyboardType="numeric"
                placeholder="Enter 6-digit OTP"
                placeholderTextColor="#CBD5E1"
                maxLength={6}
                editable={!isLoading}
                textAlign="center"
                letterSpacing={6}
              />
            </View>
          )}

          {/* Terms checkbox — only before OTP */}
          {!otpSent && (
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setIsTermsAccepted(!isTermsAccepted)}
              activeOpacity={0.7}
              disabled={isLoading}
            >
              <View style={[styles.checkbox, isTermsAccepted && styles.checkboxChecked]}>
                {isTermsAccepted && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>
                I accept the{' '}
                <Text style={styles.termsLink}>Terms of Service</Text>
              </Text>
            </TouchableOpacity>
          )}

          {/* Primary action button */}
          <TouchableOpacity
            style={[styles.button, (otpSent ? isVerifyDisabled : isSendDisabled) && styles.buttonDisabled]}
            onPress={otpSent ? handleVerifyOTP : handleSendOTP}
            disabled={otpSent ? isVerifyDisabled : isSendDisabled}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>
              {isLoading
                ? 'Please wait...'
                : otpSent
                ? '✓  Verify & Login'
                : cooldown > 0
                ? `Resend in ${cooldown}s`
                : 'Send OTP'}
            </Text>
          </TouchableOpacity>

          {/* Resend row */}
          {otpSent && (
            <TouchableOpacity
              style={styles.resendContainer}
              onPress={handleSendOTP}
              disabled={cooldown > 0 || isLoading}
            >
              <Text style={[styles.resendText, (cooldown > 0 || isLoading) && styles.resendDisabled]}>
                {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#F8FAFC',
  },
  bannerContainer: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 8,
    backgroundColor: '#F8FAFC',
  },
  banner: {},
  formWrapper: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 24,
    fontWeight: '400',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    height: 54,
    marginBottom: 14,
    overflow: 'hidden',
  },
  prefixBox: {
    paddingHorizontal: 14,
    height: '100%',
    justifyContent: 'center',
    borderRightWidth: 1.5,
    borderRightColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  prefix: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    paddingHorizontal: 14,
    height: '100%',
  },
  otpInput: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    marginBottom: 20,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
  },
  termsLink: {
    color: '#1D4ED8',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#1D4ED8',
    height: 54,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  resendContainer: {
    marginTop: 16,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: {
    color: '#1D4ED8',
    fontSize: 14,
    fontWeight: '600',
  },
  resendDisabled: {
    color: '#94A3B8',
  },
});
