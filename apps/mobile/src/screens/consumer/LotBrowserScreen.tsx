import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  useWindowDimensions,
  Platform,
  SafeAreaView,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { fetchInventoryLots } from '../../services/InventoryService';
import { fetchCategories, Category } from '../../services/CategoryService';
import { InventoryLot } from '../../types/InventoryLot';

// ─── Props ────────────────────────────────────────────────────────────────────
interface LotBrowserScreenProps {
  categoryId?: string;
  categoryLabel?: string;
  onLotPress: (lot: InventoryLot) => void;
  onBack: () => void;
}

// ─── Status badge colours ─────────────────────────────────────────────────────
const STATUS: Record<string, { bg: string; text: string; dot: string }> = {
  Available:      { bg: '#DCFCE7', text: '#15803D', dot: '#22C55E' },
  available:      { bg: '#DCFCE7', text: '#15803D', dot: '#22C55E' },
  'In Stock':     { bg: '#DCFCE7', text: '#15803D', dot: '#22C55E' },
  'Low Stock':    { bg: '#FEF9C3', text: '#A16207', dot: '#EAB308' },
  'Out of Stock': { bg: '#FEE2E2', text: '#B91C1C', dot: '#EF4444' },
};
const getStatus = (s: string) => STATUS[s] ?? { bg: '#F1F5F9', text: '#64748B', dot: '#94A3B8' };

// ─── Amazon-style Product Card ────────────────────────────────────────────────
const ProductCard: React.FC<{
  lot: InventoryLot;
  cardWidth: number;
  onPress: () => void;
}> = ({ lot, cardWidth, onPress }) => {
  const st = getStatus(lot.stock_status);
  const price = new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(lot.bulk_price || 0);

  const imageH = cardWidth * 0.72;

  return (
    <TouchableOpacity style={[styles.card, { width: cardWidth }]} onPress={onPress} activeOpacity={0.88}>
      {/* Product image area */}
      <View style={[styles.imageBox, { height: imageH }]}>
        {lot.thumbnail_url ? (
          <Image
            source={{ uri: lot.thumbnail_url }}
            style={styles.productImage}
            resizeMode="contain"
          />
        ) : (
          <Text style={{ fontSize: 40, opacity: 0.25 }}>📦</Text>
        )}
        {/* Stock badge top-left */}
        <View style={[styles.stockBadge, { backgroundColor: st.bg }]}>
          <View style={[styles.stockDot, { backgroundColor: st.dot }]} />
          <Text style={[styles.stockText, { color: st.text }]}>{lot.stock_status}</Text>
        </View>
      </View>

      {/* Product info */}
      <View style={styles.cardBody}>
        <Text style={styles.productTitle} numberOfLines={2}>{lot.title || 'Unnamed Lot'}</Text>

        {/* Prime-style divider */}
        <View style={styles.priceDivider} />

        <Text style={styles.bulkLabel}>BULK PRICE</Text>
        <Text style={styles.priceText}>{price}</Text>

        <TouchableOpacity style={styles.viewBtn} onPress={onPress} activeOpacity={0.8}>
          <Text style={styles.viewBtnText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
export const LotBrowserScreen: React.FC<LotBrowserScreenProps> = ({
  categoryId: initialCategoryId,
  categoryLabel: initialLabel,
  onLotPress,
  onBack,
}) => {
  const { width } = useWindowDimensions();

  // Responsive columns: 2 on mobile, 3 on tablet+
  const numCols = width >= 768 ? 3 : width >= 540 ? 2 : 2;
  const GAP = 12;
  const SIDE = 12;
  const cardWidth = (width - SIDE * 2 - GAP * (numCols - 1)) / numCols;

  // ── State ──────────────────────────────────────────────────────────────────
  const [lots, setLots] = useState<InventoryLot[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCatId, setActiveCatId] = useState<string | undefined>(initialCategoryId);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // ── Load categories for filter chips ──────────────────────────────────────
  useEffect(() => {
    fetchCategories().then(({ data }) => setCategories(data));
  }, []);

  // ── Load lots ──────────────────────────────────────────────────────────────
  const loadLots = useCallback(async (catId?: string, q?: string, pull = false) => {
    if (pull) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const { data, error: err } = await fetchInventoryLots({
      categoryId: catId,
      searchQuery: q,
      limit: 60,
    });
    setLots(data);
    if (err) setError(err);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadLots(activeCatId, search);
  }, [activeCatId]);

  // Debounced search
  const handleSearch = (text: string) => {
    setSearch(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadLots(activeCatId, text), 350);
  };

  const handleCatFilter = (id?: string) => {
    setActiveCatId(id);
    // useEffect on activeCatId will trigger the load
  };

  const handleRefresh = () => loadLots(activeCatId, search, true);

  // ── Active category label ──────────────────────────────────────────────────
  const activeCatLabel = activeCatId
    ? categories.find(c => c.id === activeCatId)?.name ?? initialLabel ?? 'Category'
    : 'All Inventory';

  // ── Render ─────────────────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: InventoryLot }) => (
    <ProductCard
      lot={item}
      cardWidth={cardWidth}
      onPress={() => onLotPress(item)}
    />
  );

  const ListHeader = () => (
    <>
      {/* Result count */}
      <View style={styles.resultRow}>
        <Text style={styles.resultText}>
          {loading ? 'Searching...' : `${lots.length} result${lots.length !== 1 ? 's' : ''} in `}
          {!loading && <Text style={styles.resultCat}>{activeCatLabel}</Text>}
        </Text>
      </View>
    </>
  );

  const ListEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyIcon}>📦</Text>
        <Text style={styles.emptyTitle}>No lots found</Text>
        <Text style={styles.emptySub}>Try a different search or category</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* ── Sticky Header ── */}
      <View style={styles.header}>
        {/* Top bar: back + title */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{activeCatLabel}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Search bar */}
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search lots, products..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={handleSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); loadLots(activeCatId, ''); }} style={styles.clearBtn}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Category filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          <TouchableOpacity
            style={[styles.chip, !activeCatId && styles.chipActive]}
            onPress={() => handleCatFilter(undefined)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, !activeCatId && styles.chipTextActive]}>All</Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.chip, activeCatId === cat.id && styles.chipActive]}
              onPress={() => handleCatFilter(cat.id)}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, activeCatId === cat.id && styles.chipTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Error banner ── */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>⚠ {error}</Text>
        </View>
      )}

      {/* ── Loading shimmer ── */}
      {loading && !refreshing ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#1D4ED8" size="large" />
          <Text style={styles.loadingText}>Loading inventory...</Text>
        </View>
      ) : (
        /* ── Product grid ── */
        <FlatList
          key={numCols}
          data={lots}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={numCols}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={ListEmpty}
          contentContainerStyle={[
            styles.gridContent,
            lots.length === 0 && { flex: 1 },
          ]}
          columnWrapperStyle={numCols > 1 ? styles.columnWrapper : undefined}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#1D4ED8"
              colors={['#1D4ED8']}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },

  // Header
  header: {
    backgroundColor: '#0F172A',   // dark slate — sober, premium
    paddingTop: Platform.OS === 'android' ? 8 : 0,
    paddingBottom: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10 },
      android: { elevation: 8 },
      default: {},
    }),
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  backIcon: { fontSize: 24, color: '#FFF', fontWeight: '700', lineHeight: 28, marginTop: -2 },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 16, fontWeight: '700', color: '#FFF',
    paddingHorizontal: 8,
  },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchIcon: { fontSize: 16 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
    fontWeight: '500',
  },
  clearBtn: { padding: 4 },
  clearText: { fontSize: 13, color: '#94A3B8', fontWeight: '700' },

  // Filter chips
  chipsRow: {
    paddingHorizontal: 12,
    paddingBottom: 4,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  chipActive: {
    backgroundColor: '#F1F5F9',
    borderColor: '#F1F5F9',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
  },
  chipTextActive: {
    color: '#0F172A',
  },

  // States
  errorBanner: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  errorBannerText: { color: '#B91C1C', fontSize: 13, fontWeight: '600' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 40 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  emptySub: { fontSize: 14, color: '#94A3B8', textAlign: 'center' },

  // Grid
  gridContent: {
    padding: 12,
    paddingTop: 8,
    gap: 12,
  },
  columnWrapper: {
    gap: 12,
    marginBottom: 12,
  },
  resultRow: { paddingHorizontal: 2, paddingBottom: 10, paddingTop: 4 },
  resultText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  resultCat: { color: '#1D4ED8', fontWeight: '700' },

  // ── Amazon-style product card ──────────────────────────────────────────────
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8 },
      android: { elevation: 3 },
      default: {},
    }),
  },
  imageBox: {
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  productImage: {
    width: '90%',
    height: '90%',
  },
  stockBadge: {
    position: 'absolute',
    top: 8, left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 20,
    gap: 4,
  },
  stockDot: { width: 6, height: 6, borderRadius: 3 },
  stockText: { fontSize: 10, fontWeight: '700' },

  cardBody: {
    padding: 10,
  },
  productTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    lineHeight: 18,
    minHeight: 36,
  },
  priceDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
  bulkLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#B45309',   // Amazon amber-brown price colour
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  viewBtn: {
    backgroundColor: '#FCD34D',   // Amazon yellow CTA
    borderRadius: 8,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C1917',
  },
});
