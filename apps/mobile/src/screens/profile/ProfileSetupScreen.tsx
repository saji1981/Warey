import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { fetchCategories, Category } from '../../services/CategoryService';
import { supabase } from '../../services/SupabaseConfig';

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  userId: string;
  phone: string | null;
  onComplete: () => void;
}

// ─── ProfileSetupScreen ───────────────────────────────────────────────────────
export const ProfileSetupScreen: React.FC<Props> = ({ userId, phone, onComplete }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories().then(result => setCategories(result.data));
  }, []);

  const toggleCat = useCallback((id: string) => {
    setSelectedCats(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }, []);

  const handleSave = async () => {
    if (!name.trim()) { setError('Please enter your name.'); return; }
    if (email.trim() && !email.includes('@')) { setError('Please enter a valid email address.'); return; }
    setSaving(true);
    setError(null);

    try {
      const full: Record<string, any> = {
        id: userId,
        full_name: name.trim(),
        email: email.trim().toLowerCase() || null,
        updated_at: new Date().toISOString(),
      };
      if (selectedCats.size > 0) full.category_preferences = Array.from(selectedCats);

      // Try saving all fields; on column-not-found errors, strip the offending
      // field and retry so missing optional columns never block the user.
      let payload = { ...full };
      let { data: saved, error: e } = await supabase
        .from('profiles')
        .upsert(payload)
        .select('full_name');

      if (e && e.message.includes("'email'")) {
        const { email: _e, ...rest } = payload;
        payload = rest;
        const res = await supabase.from('profiles').upsert(payload).select('full_name');
        saved = res.data;
        e = res.error;
      }

      if (e && e.message.includes('category_preferences')) {
        const { category_preferences: _c, ...rest } = payload;
        payload = rest;
        const res = await supabase.from('profiles').upsert(payload).select('full_name');
        saved = res.data;
        e = res.error;
      }

      if (e) throw e;

      // Detect silent RLS block — upsert returned no rows means the update
      // was blocked by a row-level security policy.
      if (!saved || saved.length === 0) {
        throw new Error(
          'Profile could not be saved (RLS policy). Ask your admin to run:\n' +
          'CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);'
        );
      }
    } catch (e: any) {
      setError(e.message ?? 'Failed to save profile. Please try again.');
      setSaving(false);
      return;
    }

    setSaving(false);
    onComplete();
  };

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo / welcome */}
          <View style={s.logoRow}>
            <Text style={s.logoEmoji}>🛒</Text>
          </View>
          <Text style={s.heading}>Welcome to Trulots!</Text>
          <Text style={s.sub}>
            Tell us a bit about yourself so we can personalise your browsing experience.
          </Text>

          {/* Name */}
          <Text style={s.label}>
            Full Name <Text style={s.req}>*</Text>
          </Text>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="Your full name"
            placeholderTextColor="#94A3B8"
            autoCapitalize="words"
            returnKeyType="next"
          />

          {/* Email */}
          <Text style={s.label}>Email Address</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com  (optional)"
            placeholderTextColor="#94A3B8"
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="done"
          />

          {/* Signed-in phone note */}
          {phone ? (
            <Text style={s.phoneNote}>📱 Signed in with {phone}</Text>
          ) : null}

          {/* Category preferences */}
          {categories.length > 0 && (
            <>
              <Text style={[s.label, { marginTop: 24 }]}>
                What are you interested in?{' '}
                <Text style={s.opt}>(optional)</Text>
              </Text>
              <Text style={s.hint}>
                Select the categories you'd like to browse. You can change this anytime from your profile.
              </Text>
              <View style={s.chips}>
                {categories.map(cat => {
                  const active = selectedCats.has(cat.id);
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[s.chip, active && s.chipActive]}
                      onPress={() => toggleCat(cat.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.chipTxt, active && s.chipTxtActive]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* SQL reminder (dev note) */}
          {selectedCats.size > 0 && (
            <Text style={s.dbNote}>
              💡 To persist category preferences, run in Supabase SQL Editor:{'\n'}
              ALTER TABLE profiles ADD COLUMN IF NOT EXISTS category_preferences text[] DEFAULT '{}';
            </Text>
          )}

          {/* Error */}
          {error ? <Text style={s.err}>{error}</Text> : null}

          {/* Save button */}
          <TouchableOpacity
            style={[s.btn, saving && s.btnDim]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator color="#FFF" />
              : <Text style={s.btnTxt}>Save & Continue →</Text>}
          </TouchableOpacity>

          {/* Skip */}
          <TouchableOpacity
            onPress={onComplete}
            style={{ alignSelf: 'center', marginTop: 16, padding: 8 }}
            activeOpacity={0.7}
          >
            <Text style={s.skip}>Skip for now</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: '#F8FAFC' },
  scroll:        { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 56 },
  logoRow:       { alignItems: 'center', marginBottom: 16 },
  logoEmoji:     { fontSize: 52 },
  heading:       { fontSize: 26, fontWeight: '800', color: '#0F172A', textAlign: 'center' },
  sub:           { fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 8, marginBottom: 28, lineHeight: 21 },
  label:         { fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  req:           { color: '#DC2626' },
  opt:           { fontWeight: '400', color: '#94A3B8' },
  input: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    height: 50,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#FFF',
    marginBottom: 16,
  },
  phoneNote:     { fontSize: 12, color: '#94A3B8', marginBottom: 16, marginTop: -8 },
  hint:          { fontSize: 12, color: '#94A3B8', marginBottom: 12, marginTop: -4, lineHeight: 18 },
  chips:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip:          { borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 20, paddingVertical: 7, paddingHorizontal: 14, backgroundColor: '#FFF' },
  chipActive:    { borderColor: '#0F172A', backgroundColor: '#0F172A' },
  chipTxt:       { fontSize: 13, color: '#64748B', fontWeight: '600' },
  chipTxtActive: { color: '#FFF' },
  dbNote: {
    fontSize: 11,
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 17,
  },
  err:    { backgroundColor: '#FEE2E2', borderRadius: 8, padding: 10, marginBottom: 14, fontSize: 13, color: '#B91C1C' },
  btn:    { height: 52, backgroundColor: '#0F172A', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  btnDim: { opacity: 0.6 },
  btnTxt: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  skip:   { fontSize: 13, color: '#94A3B8' },
});
