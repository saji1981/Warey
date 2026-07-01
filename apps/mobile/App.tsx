import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
  enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: __DEV__ ? 'development' : 'production',
  tracesSampleRate: 0.2,
});
import {
  View,
  StyleSheet,
  SafeAreaView,
  Image,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { LoginScreen } from './src/screens/Auth/LoginScreen';
import { CategoryGrid } from './src/components/CategoryGrid';
import { BottomNav } from './src/components/BottomNav';
import { LotBrowserScreen } from './src/screens/consumer/LotBrowserScreen';
import { LotDetailScreen } from './src/screens/consumer/LotDetailScreen';
import { ProfileScreen } from './src/screens/profile/ProfileScreen';
import { ProfileSetupScreen } from './src/screens/profile/ProfileSetupScreen';
import { UpdatesScreen } from './src/screens/UpdatesScreen';
import { InventoryLot } from './src/types/InventoryLot';
import { quickSearch } from './src/services/InventoryService';
import MasterDashboard from './src/screens/Master/MasterDashboard';
import { supabase, isMockMode } from './src/services/SupabaseConfig';
import { resolveImgUrl } from './src/utils/StorageUtils';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TOP_NAV_H } from './src/components/BottomNav';

// ─── Layout constants ─────────────────────────────────────────────────────────
const BOTTOM_NAV_H   = 64;  // mobile bottom bar base height (safe-area pad added dynamically)
const TOP_NAV_RESERVE = TOP_NAV_H; // web top bar
const SEARCH_BAR_H   = 52;
const SECTION_HDR_H  = 46;
const DIVIDER_H      = 1;
const GRID_PADDING_V = 10;

// ─── App ──────────────────────────────────────────────────────────────────────
const App: React.FC = () => {
  const { width, height } = useWindowDimensions();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isRoleLoading, setIsRoleLoading] = useState(false);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserPhone, setCurrentUserPhone] = useState<string | null>(null);

  useEffect(() => {
    if (isLoggedIn) {
      const fetchRole = async () => {
        if (isMockMode) {
          setUserRole(null);
          setNeedsProfileSetup(false);
          setIsRoleLoading(false);
          return;
        }
        setIsRoleLoading(true);
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data } = await supabase
              .from('profiles')
              .select('role, full_name, phone, phone_number')
              .eq('id', session.user.id)
              .maybeSingle();
            setUserRole(data?.role ?? null);
            setCurrentUserId(session.user.id);
            setCurrentUserPhone(
              data?.phone ?? data?.phone_number ?? session.user.phone ?? null
            );
            // Show setup screen when name hasn't been filled in yet
            setNeedsProfileSetup(!data?.full_name?.trim());
          }
        } catch (err) {
          console.error('Failed to fetch user role', err);
        } finally {
          setIsRoleLoading(false);
        }
      };
      fetchRole();
    } else {
      setUserRole(null);
      setNeedsProfileSetup(false);
      setCurrentUserId(null);
      setCurrentUserPhone(null);
    }
  }, [isLoggedIn]);

  // Overlay states
  const [browserVisible, setBrowserVisible] = useState(false);
  const [browserCategory, setBrowserCategory] = useState<{ id?: string; label?: string }>({});
  const [selectedLot, setSelectedLot] = useState<InventoryLot | null>(null);
  const [profileVisible, setProfileVisible] = useState(false);
  const [updatesVisible, setUpdatesVisible] = useState(false);
  const [masterVisible, setMasterVisible] = useState(false);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<InventoryLot[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // ── Layout: banner height (responsive) ────────────────────────────────────
  const BANNER_H = Math.min(height * 0.13, 110);
  // Safe area: web has no OS chrome insets
  const SAFE_TOP = Platform.OS === 'ios' ? 44 : Platform.OS === 'web' ? 0 : 24;
  const SAFE_BOT = Platform.OS === 'ios' ? 34 : 0;
  // Reserve space for nav bar regardless of which platform/position
  const NAV_RESERVE = Platform.OS === 'web' ? TOP_NAV_RESERVE : BOTTOM_NAV_H;

  // Available height for the category grid
  const gridAvailableH = height
    - SAFE_TOP
    - SAFE_BOT
    - BANNER_H
    - SEARCH_BAR_H
    - SECTION_HDR_H
    - DIVIDER_H
    - NAV_RESERVE
    - GRID_PADDING_V
    - 16;  // misc margins

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openBrowser = useCallback((categoryId?: string, categoryLabel?: string) => {
    setBrowserCategory({ id: categoryId, label: categoryLabel });
    setBrowserVisible(true);
  }, []);

  const closeBrowser = useCallback(() => {
    setBrowserVisible(false);
    setSelectedLot(null);
    setBrowserCategory({});
  }, []);

  const openDetail = useCallback((lot: InventoryLot) => {
    setSelectedLot(lot);
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedLot(null);
  }, []);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim().length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const results = await quickSearch(text);
      setSearchResults(results);
      setSearchLoading(false);
    }, 320);
  };

  const openSearchModal = () => {
    setSearchOpen(true);
    setSearchQuery('');
    setSearchResults([]);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleResultPress = (lot: InventoryLot) => {
    closeSearch();
    setSelectedLot(lot);
  };

  // ── Formatted price ────────────────────────────────────────────────────────
  const formatPrice = (p: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(p);

  // ── Auth gate ─────────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return <LoginScreen onLogin={() => setIsLoggedIn(true)} />;
  }

  if (isRoleLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (needsProfileSetup && currentUserId) {
    return (
      <ProfileSetupScreen
        userId={currentUserId}
        phone={currentUserPhone}
        onComplete={() => setNeedsProfileSetup(false)}
      />
    );
  }

  // Master check removed from top-level to allow normal UI rendering

  return (
    <SafeAreaProvider>
    <SafeAreaView style={styles.root}>
      {/* ────────────────── Home (always visible underneath) ─────────────────── */}
      <View style={styles.home}>

        {/* Web: nav bar sits at the top ──────────────────────────────────────── */}
        {Platform.OS === 'web' && (
          <BottomNav
            onBrowseAll={() => openBrowser()}
            onProfile={() => setProfileVisible(true)}
            onUpdates={() => setUpdatesVisible(true)}
            onMaster={() => setMasterVisible(true)}
            isMaster={userRole === 'master'}
            activeTabOverride={!browserVisible && !profileVisible && !updatesVisible && !masterVisible && !selectedLot ? 'home' : undefined}
          />
        )}

        {/* Branding banner */}
        <View style={[styles.bannerWrap, { height: BANNER_H }]}>
          <Image
            source={{ uri: resolveImgUrl('Logo.png')! }}
            style={{ width: width < 500 ? '75%' : '42%', height: BANNER_H } as any}
            resizeMode="contain"
          />
        </View>

        {/* Search bar — tapping opens full search modal */}
        <TouchableOpacity
          style={[styles.searchBar, { height: SEARCH_BAR_H - 8, marginHorizontal: 12, marginBottom: 8 }]}
          onPress={openSearchModal}
          activeOpacity={0.85}
        >
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchPlaceholder}>Search inventory...</Text>
        </TouchableOpacity>

        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Browse Categories</Text>
          <TouchableOpacity onPress={() => openBrowser()} activeOpacity={0.7}>
            <Text style={styles.viewAllLink}>View All ›</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.divider} />

        {/* Category grid — no scroll, calculated fit */}
        <View style={{ flex: 1 }}>
          <CategoryGrid
            availableWidth={width}
            availableHeight={Math.max(100, gridAvailableH)}
            onCategoryTap={openBrowser}
          />
        </View>

        {/* Mobile: nav bar sits at the bottom ─────────────────────────────── */}
        {Platform.OS !== 'web' && (
          <BottomNav
            onBrowseAll={() => openBrowser()}
            onProfile={() => setProfileVisible(true)}
            onUpdates={() => setUpdatesVisible(true)}
            onMaster={() => setMasterVisible(true)}
            isMaster={userRole === 'master'}
            activeTabOverride={!browserVisible && !profileVisible && !updatesVisible && !masterVisible && !selectedLot ? 'home' : undefined}
          />
        )}
      </View>

      {/* ────────────────── Search Modal ──────────────────────────────────────── */}
      <Modal
        visible={searchOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={closeSearch}
      >
        <SafeAreaView style={styles.searchModal}>
          {/* Search input */}
          <View style={styles.searchModalHeader}>
            <TouchableOpacity onPress={closeSearch} style={styles.searchModalBack} activeOpacity={0.7}>
              <Text style={styles.searchModalBackTxt}>‹</Text>
            </TouchableOpacity>
            <View style={styles.searchModalInputWrap}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchModalInput}
                placeholder="Search lots, products..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={handleSearch}
                autoFocus
                returnKeyType="search"
                clearButtonMode="while-editing"
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => handleSearch('')} style={{ padding: 4 }}>
                  <Text style={{ fontSize: 13, color: '#94A3B8', fontWeight: '700' }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Results */}
          {searchLoading ? (
            <View style={styles.searchCenter}>
              <ActivityIndicator color="#0F172A" />
              <Text style={styles.searchHint}>Searching...</Text>
            </View>
          ) : searchQuery.length < 2 ? (
            <View style={styles.searchCenter}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>🔍</Text>
              <Text style={styles.searchHint}>Type at least 2 characters to search inventory</Text>
            </View>
          ) : searchResults.length === 0 ? (
            <View style={styles.searchCenter}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>📦</Text>
              <Text style={styles.searchHint}>No results for "{searchQuery}"</Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.searchResults}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.resultRow}
                  onPress={() => handleResultPress(item)}
                  activeOpacity={0.8}
                >
                  {/* Thumbnail */}
                  <View style={styles.resultThumb}>
                    {item.thumbnail_url ? (
                      <Image source={{ uri: item.thumbnail_url }} style={styles.resultThumbImg} resizeMode="contain" />
                    ) : (
                      <Text style={{ fontSize: 22 }}>📦</Text>
                    )}
                  </View>
                  {/* Info */}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.resultPrice}>{formatPrice(item.bulk_price)}</Text>
                  </View>
                  {/* Status */}
                  <View style={[
                    styles.resultStatus,
                    { backgroundColor: item.stock_status?.toLowerCase().includes('avail') ? '#DCFCE7' : '#F1F5F9' },
                  ]}>
                    <Text style={[
                      styles.resultStatusTxt,
                      { color: item.stock_status?.toLowerCase().includes('avail') ? '#15803D' : '#64748B' },
                    ]}>
                      {item.stock_status}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.resultSep} />}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* ────────────────── Overlay 1: LotBrowser ─────────────────────────────── */}
      <Modal visible={browserVisible} animationType="slide" transparent={false} onRequestClose={closeBrowser}>
        <LotBrowserScreen
          categoryId={browserCategory.id}
          categoryLabel={browserCategory.label}
          onLotPress={openDetail}
          onBack={closeBrowser}
        />
      </Modal>

      {/* Overlay 2: LotDetail */}
      <Modal visible={!!selectedLot} animationType="slide" transparent={false} onRequestClose={closeDetail}>
        {selectedLot && <LotDetailScreen lot={selectedLot} onBack={closeDetail} />}
      </Modal>

      {/* Overlay 3: Profile */}
      <Modal visible={profileVisible} animationType="slide" transparent={false} onRequestClose={() => setProfileVisible(false)}>
        <ProfileScreen onBack={() => setProfileVisible(false)} onLogout={() => setIsLoggedIn(false)} />
      </Modal>

      {/* ────────────────── Updates / Blogs Overlay ──────────────────────────────── */}
      <Modal visible={updatesVisible} animationType="slide" transparent={false} onRequestClose={() => setUpdatesVisible(false)}>
        <UpdatesScreen onBack={() => setUpdatesVisible(false)} />
      </Modal>

      {/* ────────────────── Master Overlay ──────────────────────────────────────── */}
      <Modal visible={masterVisible} animationType="slide" transparent={false} onRequestClose={() => setMasterVisible(false)}>
        <MasterDashboard onBack={() => setMasterVisible(false)} onLogout={() => {
          supabase.auth.signOut();
          setIsLoggedIn(false);
        }} />
      </Modal>
    </SafeAreaView>
    </SafeAreaProvider>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  home: { flex: 1, backgroundColor: '#F8FAFC' },

  // Banner
  bannerWrap: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' },

  // Search bar (tap target on home)
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: 12,
    paddingHorizontal: 14, gap: 10,
    borderWidth: 1, borderColor: '#E2E8F0',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  searchIcon: { fontSize: 16 },
  searchPlaceholder: { fontSize: 14, color: '#94A3B8', fontWeight: '500', flex: 1 },

  // Section header
  sectionHeader: {
    paddingHorizontal: 16, paddingTop: 6, paddingBottom: 6,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', letterSpacing: -0.2 },
  viewAllLink: { fontSize: 13, color: '#1D4ED8', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginHorizontal: 16, marginBottom: 4 },

  // Search modal
  searchModal: { flex: 1, backgroundColor: '#F8FAFC' },
  searchModalHeader: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 12, paddingVertical: 10, gap: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6 },
      android: { elevation: 6 },
      default: {},
    }),
  },
  searchModalBack: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  searchModalBackTxt: { fontSize: 26, color: '#FFF', fontWeight: '700', lineHeight: 30, marginTop: -2 },
  searchModalInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: 10,
    paddingHorizontal: 12, height: 42, gap: 8,
  },
  searchModalInput: { flex: 1, fontSize: 14, color: '#0F172A', fontWeight: '500', paddingVertical: 0 },

  searchCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  searchHint: { fontSize: 14, color: '#94A3B8', textAlign: 'center', fontWeight: '500' },

  // Search results
  searchResults: { padding: 12 },
  resultRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: 14,
    padding: 12, gap: 12,
    ...Platform.select({
      ios: { shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  resultSep: { height: 10 },
  resultThumb: {
    width: 62, height: 62,
    borderRadius: 10, backgroundColor: '#F8FAFC',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  resultThumbImg: { width: '90%', height: '90%' },
  resultTitle: { fontSize: 13, fontWeight: '600', color: '#0F172A', lineHeight: 18, marginBottom: 4, flex: 1 },
  resultPrice: { fontSize: 15, fontWeight: '800', color: '#B45309' },
  resultStatus: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 12, alignSelf: 'flex-start',
  },
  resultStatusTxt: { fontSize: 10, fontWeight: '700' },
});

export default Sentry.wrap(App);
