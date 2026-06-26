import { supabase, isMockMode } from './SupabaseConfig';

export interface AuthResponse {
  success: boolean;
  error?: string;
  data?: any;
}

export const sendOTP = async (phone: string): Promise<AuthResponse> => {
  try {
    if (isMockMode) {
      console.log('Mocking sendOTP for:', phone);
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));
      return { success: true };
    }

    // Strictly inject country code here at the service layer boundary
    const formattedPhone = `+91${phone}`;
    
    const { data, error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error?.message || 'An unexpected error occurred during sendOTP.' };
  }
};

export const verifyOTP = async (phone: string, token: string): Promise<AuthResponse> => {
  try {
    if (isMockMode) {
      console.log('Mocking verifyOTP for:', phone, 'with token:', token);
      await new Promise(resolve => setTimeout(resolve, 800));
      if (token === '123456') {
        return { success: true };
      } else {
        return { success: false, error: 'Invalid mock OTP. Please use 123456.' };
      }
    }

    // Re-apply prefix for verification
    const formattedPhone = `+91${phone}`;
    
    const { data, error } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token,
      type: 'sms',
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error?.message || 'An unexpected error occurred during verifyOTP.' };
  }
};
