import { supabase, isMockMode } from './SupabaseConfig';

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
  category_preferences: string[];
}

// ─── Fetch current user's profile ─────────────────────────────────────────────
export const fetchProfile = async (): Promise<{ profile: UserProfile | null; error: string | null }> => {
  if (isMockMode) {
    console.log('Mocking fetchProfile');
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      profile: {
        id: 'mock-user-123',
        full_name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+919650220127',
        language: 'en',
        profile_verified: true,
        updated_at: new Date().toISOString(),
        category_preferences: [],
      },
      error: null
    };
  }

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
        language:             (data?.language        ?? 'en') as AppLanguage,
        profile_verified:     data?.profile_verified ?? false,
        updated_at:           data?.updated_at       ?? null,
        category_preferences: data?.category_preferences ?? [],
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
  if (isMockMode) {
    console.log('Mocking updateProfile', fields);
    await new Promise(resolve => setTimeout(resolve, 300));
    return { error: null };
  }

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
  if (isMockMode) {
    console.log('Mocking signOut');
    await new Promise(resolve => setTimeout(resolve, 300));
    return { error: null };
  }

  const { error } = await supabase.auth.signOut();
  return { error: error?.message ?? null };
};
