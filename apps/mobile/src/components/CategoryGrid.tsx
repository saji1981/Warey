import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { fetchCategories, Category } from '../services/CategoryService';
import { resolveImgUrl } from '../utils/StorageUtils';

// ─── Local image map ─────────────────────────────────────────────────────────
const IMAGE_MAP: { key: string; image: any }[] = [
  { key: 'automotive',  image: { uri: resolveImgUrl('Automotive.png')! } },
  { key: 'baby',        image: { uri: resolveImgUrl('Baby Care.png')! } },
  { key: 'beauty',      image: { uri: resolveImgUrl('Beauty, Health, Grocery.png')! } },
  { key: 'health',      image: { uri: resolveImgUrl('Beauty, Health, Grocery.png')! } },
  { key: 'grocery',     image: { uri: resolveImgUrl('Beauty, Health, Grocery.png')! } },
  { key: 'clothing',    image: { uri: resolveImgUrl('Clothing.png')! } },
  { key: 'electronics', image: { uri: resolveImgUrl('Electronics.png')! } },
  { key: 'fmcg',        image: { uri: resolveImgUrl('FMCG.png')! } },
  { key: 'footwear',    image: { uri: resolveImgUrl('Footwear.png')! } },
  { key: 'home',        image: { uri: resolveImgUrl('Home and Furniture.png')! } },
  { key: 'furniture',   image: { uri: resolveImgUrl('Home and Furniture.png')! } },
  { key: 'kitchen',     image: { uri: resolveImgUrl('Kitchen.png')! } },
  { key: 'luggage',     image: { uri: resolveImgUrl('Luggage.png')! } },
  { key: 'medical',     image: { uri: resolveImgUrl('Medical.png')! } },
  { key: 'men',         image: { uri: resolveImgUrl('Mens Fashion.png')! } },
  { key: 'mobile',      image: { uri: resolveImgUrl('Mobile, Computer, Accessories.png')! } },
  { key: 'computer',    image: { uri: resolveImgUrl('Mobile, Computer, Accessories.png')! } },
  { key: 'accessories', image: { uri: resolveImgUrl('Mobile, Computer, Accessories.png')! } },
  { key: 'movie',       image: { uri: resolveImgUrl('Movies, Music, Games.png')! } },
  { key: 'music',       image: { uri: resolveImgUrl('Movies, Music, Games.png')! } },
  { key: 'games',       image: { uri: resolveImgUrl('Movies, Music, Games.png')! } },
  { key: 'instrument',  image: { uri: resolveImgUrl('Musical Instruments.png')! } },
  { key: 'sports',      image: { uri: resolveImgUrl('Sports.png')! } },
  { key: 'stationary',  image: { uri: resolveImgUrl('Stationary.png')! } },
  { key: 'tv',          image: { uri: resolveImgUrl('TV, Appliances, Electronics.png')! } },
  { key: 'appliance',   image: { uri: resolveImgUrl('TV, Appliances, Electronics.png')! } },
  { key: 'tools',       image: { uri: resolveImgUrl('Tools and Hardware.png')! } },
  { key: 'hardware',    image: { uri: resolveImgUrl('Tools and Hardware.png')! } },
  { key: 'toys',        image: { uri: resolveImgUrl('Toys.png')! } },
  { key: 'watch',       image: { uri: resolveImgUrl('Watch.png')! } },
  { key: 'women',       image: { uri: resolveImgUrl('Womens Fashion.png')! } },
];
const FALLBACK_IMAGE = { uri: resolveImgUrl('FMCG.png')! };
// Normalize icon_name: add .png if no file extension (handles legacy DB data saved without extension).
const normIcon = (n: string) => n.includes('.') ? n : `${n}.png`;
// If the category has an explicit icon_name, resolve it from the img bucket; otherwise keyword-match.
const resolveImage = (category: Category): any => {
  if (category.icon_name) {
    const url = resolveImgUrl(normIcon(category.icon_name));
    if (url) return { uri: url };
  }
  const lower = category.name.toLowerCase();
  return IMAGE_MAP.find(({ key }) => lower.includes(key))?.image ?? FALLBACK_IMAGE;
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface CategoryGridProps {
  availableWidth: number;
  availableHeight: number;
  onCategoryTap?: (categoryId: string, categoryLabel: string) => void;
}

// ─── Single category tile ─────────────────────────────────────────────────────
const CategoryTile: React.FC<{
  category: Category;
  tileSize: number;
  imageSize: number;
  onPress: () => void;
}> = ({ category, tileSize, imageSize, onPress }) => (
  <TouchableOpacity
    style={[styles.tile, { width: tileSize, height: tileSize }]}
    onPress={onPress}
    activeOpacity={0.75}
  >
    <View style={[styles.imageWrapper, { width: imageSize, height: imageSize }]}>
      <Image source={resolveImage(category)} style={styles.tileImage} resizeMode="contain" />
    </View>
    <Text style={styles.tileLabel} numberOfLines={2}>{category.name}</Text>
    {/* Stock indicator dot */}
    {!category.has_stock && <View style={styles.noStockDot} />}
  </TouchableOpacity>
);

// ─── Component ────────────────────────────────────────────────────────────────
export const CategoryGrid: React.FC<CategoryGridProps> = ({
  availableWidth,
  availableHeight,
  onCategoryTap,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);

  useEffect(() => {
    fetchCategories().then(({ data, error: err }) => {
      if (err) setError(err);
      setCategories(data);
      setIsLoading(false);
    });
  }, []);

  // ── Layout calculation ─────────────────────────────────────────────────────
  const numCols = availableWidth >= 600 ? 4 : availableWidth >= 400 ? 3 : 3;
  const GAP = 8;
  // Tile is square — fill columns evenly
  const tileSize = Math.floor((availableWidth - GAP * (numCols + 1)) / numCols);
  const imageSize = Math.max(36, Math.floor(tileSize * 0.45));
  // How many full rows fit in the available height?
  const numRows = Math.max(1, Math.floor((availableHeight - GAP) / (tileSize + GAP)));
  const maxCells = numRows * numCols;

  // Determine visible vs overflow
  const { visibleCats, overflowCats, needsDots } = useMemo(() => {
    if (categories.length <= maxCells) {
      return { visibleCats: categories, overflowCats: [], needsDots: false };
    }
    // Reserve last cell for ···
    const visible = categories.slice(0, maxCells - 1);
    const overflow = categories.slice(maxCells - 1);
    return { visibleCats: visible, overflowCats: overflow, needsDots: true };
  }, [categories, maxCells]);

  // ── Render states ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[styles.centered, { height: availableHeight }]}>
        <ActivityIndicator size="large" color="#0F172A" />
        <Text style={styles.loadingText}>Loading categories...</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={[styles.centered, { height: availableHeight }]}>
        <Text style={styles.errorText}>⚠ Could not load categories</Text>
      </View>
    );
  }

  // Build grid rows from visible categories + optional ··· tile
  const allCells: (Category | 'dots')[] = needsDots
    ? [...visibleCats, 'dots']
    : visibleCats;

  const rows: (Category | 'dots')[][] = [];
  for (let i = 0; i < allCells.length; i += numCols) {
    rows.push(allCells.slice(i, i + numCols));
  }

  return (
    <>
      {/* ── Fixed-height grid — no scroll ── */}
      <View style={[styles.grid, { height: availableHeight }]}>
        {rows.map((row, rowIdx) => (
          <View key={rowIdx} style={[styles.row, { gap: GAP, marginBottom: rowIdx < rows.length - 1 ? GAP : 0 }]}>
            {row.map((cell, cellIdx) =>
              cell === 'dots' ? (
                // ··· overflow tile
                <TouchableOpacity
                  key="dots"
                  style={[styles.tile, styles.dotsTile, { width: tileSize, height: tileSize }]}
                  onPress={() => setOverlayOpen(true)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.dotsText}>···</Text>
                  <Text style={styles.dotsCount}>{overflowCats.length} more</Text>
                </TouchableOpacity>
              ) : (
                <CategoryTile
                  key={cell.id}
                  category={cell}
                  tileSize={tileSize}
                  imageSize={imageSize}
                  onPress={() => onCategoryTap?.(cell.id, cell.name)}
                />
              )
            )}
          </View>
        ))}
      </View>

      {/* ── All-categories overlay ── */}
      <Modal
        visible={overlayOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setOverlayOpen(false)}
      >
        <View style={styles.overlayBackdrop}>
          <View style={styles.overlaySheet}>
            {/* Handle */}
            <View style={styles.overlayHandle} />

            {/* Header */}
            <View style={styles.overlayHeader}>
              <Text style={styles.overlayTitle}>All Categories</Text>
              <TouchableOpacity onPress={() => setOverlayOpen(false)} style={styles.overlayClose} activeOpacity={0.7}>
                <Text style={styles.overlayCloseTxt}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Legend */}
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#16A34A' }]} />
                <Text style={styles.legendTxt}>In Stock</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#CBD5E1' }]} />
                <Text style={styles.legendTxt}>No Stock</Text>
              </View>
            </View>

            {/* Full category grid — scrollable inside overlay */}
            <ScrollView contentContainerStyle={styles.overlayGrid} showsVerticalScrollIndicator={false}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.overlayTile, !cat.has_stock && styles.overlayTileNoStock]}
                  onPress={() => { setOverlayOpen(false); onCategoryTap?.(cat.id, cat.name); }}
                  activeOpacity={0.75}
                >
                  <View style={styles.overlayImgWrap}>
                    <Image source={resolveImage(cat)} style={styles.overlayTileImg} resizeMode="contain" />
                    {cat.has_stock && <View style={styles.stockBadge} />}
                  </View>
                  <Text style={[styles.overlayTileLabel, !cat.has_stock && { color: '#94A3B8' }]} numberOfLines={2}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  loadingText: { fontSize: 14, color: '#64748B' },
  errorText: { fontSize: 14, color: '#DC2626', fontWeight: '600' },

  // Fixed grid
  grid: {
    paddingHorizontal: 8,
    paddingTop: 6,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },

  // Category tile
  tile: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
    position: 'relative',
    ...Platform.select({
      ios: { shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6 },
      android: { elevation: 2 },
      default: {},
    }),
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  imageWrapper: { alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  tileImage: { width: '100%', height: '100%' },
  tileLabel: { fontSize: 10, fontWeight: '600', color: '#1E293B', textAlign: 'center', lineHeight: 13, letterSpacing: 0.1 },
  noStockDot: {
    position: 'absolute', top: 6, right: 6,
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#CBD5E1',
  },

  // ··· overflow tile
  dotsTile: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  dotsText: { fontSize: 20, fontWeight: '800', color: '#64748B', letterSpacing: 2, marginBottom: 4 },
  dotsCount: { fontSize: 10, fontWeight: '600', color: '#94A3B8' },

  // Overlay (all categories)
  overlayBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  overlaySheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  overlayHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  overlayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  overlayTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  overlayClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  overlayCloseTxt: { fontSize: 14, color: '#64748B', fontWeight: '700' },

  legendRow: { flexDirection: 'row', gap: 20, paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendTxt: { fontSize: 12, color: '#64748B', fontWeight: '500' },

  overlayGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10 },
  overlayTile: {
    width: 88, alignItems: 'center', padding: 8,
    backgroundColor: '#FAFAFA', borderRadius: 12,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  overlayTileNoStock: { opacity: 0.55 },
  overlayImgWrap: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 6, position: 'relative' },
  overlayTileImg: { width: '100%', height: '100%' },
  stockBadge: { position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#16A34A', borderWidth: 1.5, borderColor: '#FFF' },
  overlayTileLabel: { fontSize: 10, fontWeight: '600', color: '#1E293B', textAlign: 'center', lineHeight: 13 },
});
