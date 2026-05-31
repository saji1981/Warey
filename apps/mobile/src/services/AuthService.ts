import { supabase } from './SupabaseConfig';

export interface AuthResponse {
  success: boolean;
  error?: string;
  data?: any;
}

export const sendOTP = async (phone: string): Promise<AuthResponse> => {
  try {
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
