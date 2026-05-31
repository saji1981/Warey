import { supabase } from './SupabaseConfig';

// ─── Types ────────────────────────────────────────────────────────────────────
export type AppLanguage = 'en' | 'hi';

export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  language: AppLanguage;
  profile_verified: boolean;
  updated_at: string | null;
}

// ─── Fetch current user's profile ─────────────────────────────────────────────
export const fetchProfile = async (): Promise<{ profile: UserProfile | null; error: string | null }> => {
  try {
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { profile: null, error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) return { profile: null, error: error.message };

    return {
      profile: {
        id:               user.id,
        full_name:        data?.full_name        ?? null,
        email:            data?.email            ?? user.email ?? null,
        phone:            data?.phone            ?? user.phone ?? null,
        language:         (data?.language        ?? 'en') as AppLanguage,
        profile_verified: data?.profile_verified ?? false,
        updated_at:       data?.updated_at       ?? null,
      },
      error: null,
    };
  } catch (err) {
    return { profile: null, error: String(err) };
  }
};

// ─── Update profile fields ─────────────────────────────────────────────────────
export const updateProfile = async (
  userId: string,
  fields: Partial<Pick<UserProfile, 'full_name' | 'email' | 'language'>>
): Promise<{ error: string | null }> => {
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      ...fields,
      updated_at: new Date().toISOString(),
    });
  return { error: error?.message ?? null };
};

// ─── Sign out ─────────────────────────────────────────────────────────────────
export const signOut = async (): Promise<{ error: string | null }> => {
  const { error } = await supabase.auth.signOut();
  return { error: error?.message ?? null };
};
