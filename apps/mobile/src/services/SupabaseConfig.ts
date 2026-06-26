import { createClient } from '@supabase/supabase-js';

// Initialize the client using standard @supabase/supabase-js logic
// Expo securely exposes environment variables prefixed with EXPO_PUBLIC_
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://xyz.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'public-anon-key';

export const isMockMode = supabaseUrl === 'https://xyz.supabase.co';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
