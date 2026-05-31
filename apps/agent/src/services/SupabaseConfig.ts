import { createClient } from '@supabase/supabase-js';

// Localized Supabase client for the isolated Agent backend.
// This ensures the agent maintains an independent connection pool and doesn't tangle with Expo environment variables.
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
