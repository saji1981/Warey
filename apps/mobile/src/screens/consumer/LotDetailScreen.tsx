import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
  useWindowDimensions,
  ActivityIndicator,
  Modal,
  Dimensions,
  SafeAreaView,
  FlatList,
  Alert,
} from 'react-native';
import Papa from 'papaparse';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { InventoryLot } from '../../types/InventoryLot';
import { fetchLotImages, LotImage } from '../../services/InventoryService';
import { resolveManifestUrl } from '../../utils/StorageUtils';
import { isMockMode } from '../../services/SupabaseConfig';
import { openWhatsApp, openEmail, BUSINESS_EMAIL } from '../../utils/ContactUtils';

// ─── Props ────────────────────────────────────────────────────────────────────
interface LotDetailScreenProps {
  lot: InventoryLot;
  onBack: () => void;
}

// ─── Status colours ────────────────────────────────────────────────────────────
const STATUS: Record<string, { bg: string; text: string; dot: string }> = {
  Available:      { bg: '#DCFCE7', text: '#15803D', dot: '#16A34A' },
  available:      { bg: '#DCFCE7', text: '#15803D', dot: '#16A34A' },
  'In Stock':     { bg: '#DCFCE7', text: '#15803D', dot: '#16A34A' },
  'Low Stock':    { bg: '#FEF9C3', text: '#A16207', dot: '#EAB308' },
  'Out of Stock': { bg: '#FEE2E2', text: '#B91C1C', dot: '#EF4444' },
};
const getStatus = (s: string) => STATUS[s] ?? { bg: '#F1F5F9', text: '#64748B', dot: '#94A3B8' };

// ─── Manifest Modal ─────────────────────────────────────────────────────────
const ManifestModal: React.FC<{
  filename: string | null;
  lotId: string;
  visible: boolean;
  onClose: () => void;
}> = ({ filename, lotId, visible, onClose }) => {
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !filename) return;
    setLoading(true);
    setError(null);
    setParsedData([]);

    if (isMockMode) {
      setLoading(true);
      setTimeout(() => {
        setParsedData([
          { "SKU": `MOCK-${lotId}-1`, "Product Name": "Mock Item A", "Quantity": 50, "Condition": "New", "Brand": "BrandX" },
          { "SKU": `MOCK-${lotId}-2`, "Product Name": "Mock Item B", "Quantity": 30, "Condition": "Refurbished", "Brand": "BrandY" },
          { "SKU": `MOCK-${lotId}-3`, "Product Name": "Mock Item C", "Quantity": 12, "Condition": "Used", "Brand": "BrandZ" },
        ]);
        setLoading(false);
      }, 500);
      return;
    }

    const bare = filename
      .replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/public\/[^/]+\//, '')
      .split('/').pop() ?? filename;

    const publicUrl = resolveManifestUrl(bare);
    if (!publicUrl) {
      setError('Could not resolve manifest URL.');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch(publicUrl);
        if (!res.ok) throw new Error(`File not found (HTTP ${res.status}). Check "${bare}" in Supabase Storage.`);
        const text = await res.text();
        
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const filtered = results.data.filter((row: any) => {
              const rowLot = row['lot_id'] || row['Lot ID'] || row['lotId'];
              if (!rowLot) return true;
              return String(rowLot).trim() === String(lotId).trim();
            });
            setParsedData(filtered);
            setLoading(false);
          },
          error: (err: any) => {
            setError(err.message);
            setLoading(false);
          }
        });
      } catch (e: any) {
        setError(e.message);
        setLoading(false);
      }
    })();
  }, [visible, filename, lotId]);

  const downloadCSV = async () => {
    try {
      const csvStr = Papa.unparse(parsedData);
      if (Platform.OS === 'web') {
        const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = `Manifest_${lotId}.csv`; link.click();
        URL.revokeObjectURL(url);
      } else {
        const fileUri = FileSystem.documentDirectory! + `Manifest_${lotId}.csv`;
        await FileSystem.writeAsStringAsync(fileUri, csvStr, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(fileUri);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to generate CSV file');
    }
  };

  const downloadExcel = async () => {
    try {
      const ws = XLSX.utils.json_to_sheet(parsedData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Manifest');
      if (Platform.OS === 'web') {
        const wbArr = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
        const blob = new Blob([wbArr], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = `Manifest_${lotId}.xlsx`; link.click();
        URL.revokeObjectURL(url);
      } else {
        const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        const fileUri = FileSystem.documentDirectory! + `Manifest_${lotId}.xlsx`;
        await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
        await Sharing.shareAsync(fileUri);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to generate Excel file');
    }
  };

  const renderSkuItem = ({ item, index }: { item: any; index: number }) => (
    <View style={ms.skuCard}>
      <Text style={ms.skuIndex}>#{index + 1}</Text>
      {Object.entries(item).map(([key, val]) => (
        <View key={key} style={ms.skuRow}>
          <Text style={ms.skuKey} numberOfLines={1}>{key}</Text>
          <Text style={ms.skuVal}>{String(val)}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={ms.overlay}>
        <View style={ms.sheet}>
          <View style={ms.handle} />
          <View style={ms.mHeader}>
            <View>
              <Text style={ms.mTitle}>Product Manifest</Text>
              <Text style={ms.mSub}>{parsedData.length > 0 ? `${parsedData.length} SKUs Found` : 'Loaded securely in-app'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={ms.closeBtn} activeOpacity={0.7}>
              <Text style={ms.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <View style={ms.center}><ActivityIndicator color="#0F172A" size="large" /><Text style={ms.loadTxt}>Loading manifest...</Text></View>
          ) : error ? (
            <View style={ms.center}><Text style={{ fontSize: 28 }}>⚠️</Text><Text style={ms.errTxt}>{error}</Text></View>
          ) : (
            <FlatList
              data={parsedData}
              keyExtractor={(_, index) => index.toString()}
              renderItem={renderSkuItem}
              contentContainerStyle={ms.listContent}
              showsVerticalScrollIndicator={true}
              initialNumToRender={15}
              windowSize={5}
              maxToRenderPerBatch={10}
            />
          )}
          {!loading && !error && parsedData.length > 0 && (
            <View style={ms.downloadRow}>
              <TouchableOpacity style={ms.dlBtn} onPress={downloadCSV} activeOpacity={0.8}>
                <Text style={ms.dlTxt}>📥 Save CSV</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[ms.dlBtn, ms.dlExcel]} onPress={downloadExcel} activeOpacity={0.8}>
                <Text style={[ms.dlTxt, {color: '#FFF'}]}>📊 Save Excel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const ms = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '82%' },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  mHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  mTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  mSub: { fontSize: 12, color: '#94A3B8', fontWeight: '500', marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  closeTxt: { fontSize: 14, color: '#64748B', fontWeight: '700' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 },
  loadTxt: { fontSize: 14, color: '#64748B' },
  errTxt: { fontSize: 13, color: '#DC2626', textAlign: 'center' },
  listContent: { padding: 16, paddingBottom: 20 },
  downloadRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 20, gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  dlBtn: { flex: 1, height: 48, backgroundColor: '#F1F5F9', borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  dlExcel: { backgroundColor: '#16A34A', borderColor: '#15803D' },
  dlTxt: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  skuCard: { backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, marginBottom: 12, position: 'relative' },
  skuIndex: { position: 'absolute', top: 12, right: 12, fontSize: 11, fontWeight: '800', color: '#CBD5E1' },
  skuRow: { flexDirection: 'row', marginBottom: 6, paddingRight: 24 },
  skuKey: { width: 90, fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },
  skuVal: { flex: 1, fontSize: 12, fontWeight: '600', color: '#0F172A' }
});

// ─── InfoRow ───────────────────────────────────────────────────────────────
const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
  </View>
);

// ─── Main Screen ─────────────────────────────────────────────────────────────
export const LotDetailScreen: React.FC<LotDetailScreenProps> = ({ lot, onBack }) => {
  const { width } = useWindowDimensions();
  const [images, setImages] = useState<LotImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [manifestOpen, setManifestOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const mainScrollRef = useRef<ScrollView>(null);

  // Is this a tablet / wide screen?
  const isWide = width >= 700;
  const THUMB_COL = 68;                                // left thumbnail strip width
  const MAIN_IMG_W = isWide ? width * 0.48 : width - THUMB_COL - 1;
  const MAIN_IMG_H = isWide ? MAIN_IMG_W * 0.85 : MAIN_IMG_W * 0.9;

  const st = getStatus(lot.stock_status);
  const price = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(lot.bulk_price || 0);
  const formattedDate = lot.created_at ? new Date(lot.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown';

  useEffect(() => {
    fetchLotImages(lot.id).then((imgs) => { setImages(imgs); setImagesLoading(false); });
  }, [lot.id]);

  const manifestFilename = lot.manifest_url
    ? lot.manifest_url.replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/public\/Manifest\//, '').split('/').pop() ?? lot.manifest_url
    : null;

  // ─── Thumbnail strip — height-capped, overflow becomes ··· button ─────────
  // Each thumb item: 52px height + 6px margin = 58px
  // Thumb strip padding: 8px top + 8px bottom = 16px
  // maxVisible = how many full thumbs fit in MAIN_IMG_H
  const THUMB_ITEM_H = 58;   // 52 height + 6 margin
  const THUMB_PADDING = 16;  // top + bottom
  const maxVisible = Math.max(1, Math.floor((MAIN_IMG_H - THUMB_PADDING) / THUMB_ITEM_H));
  const needsDots = images.length > maxVisible;
  // When we need a ··· slot, visible thumbs = maxVisible - 1 (last slot = ···)
  const visibleCount = needsDots ? maxVisible - 1 : maxVisible;
  const visibleThumbs = images.slice(0, visibleCount);

  const ThumbnailStrip = () => (
    // Fixed height = MAIN_IMG_H so the strip never creates whitespace
    <View style={[styles.thumbStrip, { height: MAIN_IMG_H }]}>
      {imagesLoading ? (
        <ActivityIndicator color="#0F172A" style={{ marginTop: 16 }} />
      ) : images.length === 0 ? (
        <View style={styles.thumbEmpty}><Text style={{ fontSize: 20 }}>📦</Text></View>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', paddingTop: 8 }}>
          {visibleThumbs.map((img, i) => (
            <TouchableOpacity
              key={img.id}
              style={[styles.thumbItem, i === activeIndex && styles.thumbItemActive]}
              onPress={() => setActiveIndex(i)}
              activeOpacity={0.8}
            >
              <Image source={{ uri: img.url }} style={styles.thumbImg} resizeMode="contain" />
            </TouchableOpacity>
          ))}
          {/* ··· overflow button */}
          {needsDots && (
            <TouchableOpacity
              style={[styles.thumbItem, styles.thumbDots]}
              onPress={() => setGalleryOpen(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.thumbDotsText}>···</Text>
              <Text style={styles.thumbDotsCount}>{images.length - visibleCount}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  // ─── Full image gallery overlay ───────────────────────────────────────────
  const ImageGalleryModal = () => (
    <Modal visible={galleryOpen} animationType="slide" transparent onRequestClose={() => setGalleryOpen(false)}>
      <View style={styles.galOverlay}>
        <View style={styles.galSheet}>
          {/* Handle */}
          <View style={styles.galHandle} />
          {/* Header */}
          <View style={styles.galHeader}>
            <Text style={styles.galTitle}>All Images ({images.length})</Text>
            <TouchableOpacity onPress={() => setGalleryOpen(false)} style={styles.galCloseBtn} activeOpacity={0.7}>
              <Text style={styles.galCloseTxt}>✕</Text>
            </TouchableOpacity>
          </View>
          {/* Grid of all thumbnails */}
          <ScrollView contentContainerStyle={styles.galGrid} showsVerticalScrollIndicator={false}>
            {images.map((img, i) => (
              <TouchableOpacity
                key={img.id}
                style={[styles.galThumb, i === activeIndex && styles.galThumbActive]}
                onPress={() => { setActiveIndex(i); setGalleryOpen(false); }}
                activeOpacity={0.8}
              >
                <Image source={{ uri: img.url }} style={styles.galThumbImg} resizeMode="contain" />
                {i === activeIndex && (
                  <View style={styles.galActiveBadge}><Text style={styles.galActiveBadgeTxt}>✓</Text></View>
                )}
                <Text style={styles.galThumbNum}>{i + 1}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // ─── Main image ──────────────────────────────────────────────────────────
  const MainImage = () => {
    const current = images[activeIndex];
    return (
      <View style={[styles.mainImgBox, { width: MAIN_IMG_W, height: MAIN_IMG_H }]}>
        {imagesLoading ? (
          <ActivityIndicator color="#0F172A" size="large" />
        ) : current ? (
          <Image source={{ uri: current.url }} style={styles.mainImg} resizeMode="contain" />
        ) : (
          <Text style={{ fontSize: 56, opacity: 0.15 }}>📦</Text>
        )}
      </View>
    );
  };

  // ─── Arrow navigation (prev / next image) ────────────────────────────────
  const ArrowNav = () => (
    <View style={styles.arrowRow}>
      <TouchableOpacity
        style={[styles.arrowBtn, activeIndex === 0 && styles.arrowBtnDisabled]}
        onPress={() => activeIndex > 0 && setActiveIndex(activeIndex - 1)}
        activeOpacity={0.7}
        disabled={activeIndex === 0}
      >
        <Text style={styles.arrowTxt}>‹</Text>
      </TouchableOpacity>
      <Text style={styles.arrowCount}>{images.length > 0 ? `${activeIndex + 1} / ${images.length}` : '—'}</Text>
      <TouchableOpacity
        style={[styles.arrowBtn, activeIndex >= images.length - 1 && styles.arrowBtnDisabled]}
        onPress={() => activeIndex < images.length - 1 && setActiveIndex(activeIndex + 1)}
        activeOpacity={0.7}
        disabled={activeIndex >= images.length - 1}
      >
        <Text style={styles.arrowTxt}>›</Text>
      </TouchableOpacity>
    </View>
  );

  // ─── Product info panel ───────────────────────────────────────────────────
  const ProductInfo = () => (
    <View style={[styles.infoPanel, isWide && styles.infoPanelWide]}>
      {/* Status */}
      <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
        <View style={[styles.statusDot, { backgroundColor: st.dot }]} />
        <Text style={[styles.statusTxt, { color: st.text }]}>● {lot.stock_status}</Text>
      </View>

      {/* Title */}
      <Text style={styles.productTitle}>{lot.title || 'Unnamed Lot'}</Text>

      {/* Divider */}
      <View style={styles.priceDivider} />

      {/* Price */}
      <Text style={styles.priceLabel}>BULK PRICE</Text>
      <Text style={styles.priceValue}>{price}</Text>

      <View style={styles.priceDivider} />

      {/* Details table */}
      <View style={styles.detailCard}>
        <Text style={styles.sectionHead}>Lot Details</Text>
        <InfoRow label="Lot ID"   value={lot.id} />
        <InfoRow label="Category" value={lot.category_id || 'Uncategorized'} />
        <InfoRow label="Added"    value={formattedDate} />
      </View>

      {/* Manifest */}
      {manifestFilename && (
        <TouchableOpacity style={styles.manifestBtn} onPress={() => setManifestOpen(true)} activeOpacity={0.85}>
          <Text style={styles.manifestBtnTxt}>📄  View Product Manifest</Text>
        </TouchableOpacity>
      )}

      {/* CTA row — WhatsApp + Email */}
      <View style={{ gap: 10, marginBottom: 16 }}>
        {Platform.OS === 'web' && (
          <Text style={styles.ctaWebNote}>
            💡 WhatsApp opens in your browser. No WhatsApp? Use the email button below.
          </Text>
        )}
        <TouchableOpacity
          style={styles.ctaBtn}
          activeOpacity={0.85}
          onPress={() => openWhatsApp(
            `Hello, I'd like to enquire about:\n\nLot: ${lot.title || 'N/A'}\nLot ID: ${lot.id}\nPrice: ${price}\n\nCould you please share more details?`
          )}
        >
          <Text style={styles.ctaBtnTxt}>💬  Enquire via WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.ctaBtnEmail}
          activeOpacity={0.85}
          onPress={() => openEmail(
            `Enquiry — ${lot.title || lot.id}`,
            `Hi,\n\nI would like to enquire about the following lot:\n\nTitle: ${lot.title || 'N/A'}\nLot ID: ${lot.id}\nPrice: ${price}\nCategory: ${lot.category_id || 'N/A'}\n\nPlease share more details at your earliest convenience.\n\nThank you.`
          )}
        >
          <Text style={styles.ctaBtnEmailTxt}>📧  Send Enquiry via Email</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{lot.title || 'Lot Detail'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView ref={mainScrollRef} showsVerticalScrollIndicator={false} bounces>

        {/* ── Amazon-style image area: thumbnail strip + main image ── */}
        <View style={styles.imageSection}>
          <ThumbnailStrip />
          <View>
            <MainImage />
            <ArrowNav />
          </View>
        </View>

        {/* ── Product info ── */}
        {isWide ? (
          /* Wide: side-by-side (image already shown above, info on right) */
          <ProductInfo />
        ) : (
          /* Narrow mobile: full-width info below */
          <ProductInfo />
        )}
      </ScrollView>

      <ManifestModal
        filename={manifestFilename}
        lotId={lot.id}
        visible={manifestOpen}
        onClose={() => setManifestOpen(false)}
      />
      <ImageGalleryModal />
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  // Header — dark slate, sober
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 12 : 4,
    paddingBottom: 12, paddingHorizontal: 12,
    backgroundColor: '#0F172A',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6 },
      android: { elevation: 6 },
      default: {},
    }),
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  backIcon: { fontSize: 26, color: '#FFF', fontWeight: '700', lineHeight: 30, marginTop: -2 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 14, fontWeight: '700', color: '#FFF', paddingHorizontal: 8 },

  // ─── Image section ────────────────────────────────────────────────────────
  imageSection: {
    flexDirection: 'row',
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },

  // Thumbnail strip — left column, exactly like Amazon
  thumbStrip: {
    width: 68,
    backgroundColor: '#F8FAFC',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    paddingTop: 8,
    paddingBottom: 8,
    alignItems: 'center',
  },
  thumbEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  thumbItem: {
    width: 52, height: 52,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 6,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
      android: { elevation: 1 },
      default: {},
    }),
  },
  thumbItemActive: {
    borderColor: '#D97706',   // Amazon amber when selected
  },
  thumbImg: { width: '90%', height: '90%' },

  // Main image
  mainImgBox: {
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainImg: { width: '90%', height: '90%' },

  // Arrow nav below image
  arrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 16,
    backgroundColor: '#FAFAFA',
  },
  arrowBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  arrowBtnDisabled: { opacity: 0.3 },
  arrowTxt: { fontSize: 22, color: '#0F172A', fontWeight: '700', lineHeight: 26, marginTop: -2 },
  arrowCount: { fontSize: 13, color: '#64748B', fontWeight: '600', minWidth: 48, textAlign: 'center' },

  // ─── Product info panel ───────────────────────────────────────────────────
  infoPanel: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  infoPanelWide: {
    paddingHorizontal: 24,
  },

  statusPill: {
    flexDirection: 'row', alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, marginBottom: 10, gap: 4,
  },
  statusDot: { width: 0 },  // dot embedded in emoji-style text
  statusTxt: { fontSize: 12, fontWeight: '700' },

  productTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 24,
    marginBottom: 6,
  },

  priceDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },

  priceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#B45309',   // amber — Amazon-style price
    letterSpacing: -0.5,
    marginBottom: 4,
  },

  detailCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHead: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 12,
  },
  infoLabel: { fontSize: 13, color: '#64748B', fontWeight: '500', flexShrink: 0 },
  infoValue: { fontSize: 13, color: '#0F172A', fontWeight: '600', textAlign: 'right', flex: 1 },

  manifestBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10, height: 46,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  manifestBtnTxt: { fontSize: 14, fontWeight: '700', color: '#0F172A' },

  ctaWebNote: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 18,
  },
  ctaBtn: {
    backgroundColor: '#16A34A',
    borderRadius: 12, height: 54,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#16A34A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 4 },
      default: {},
    }),
  },
  ctaBtnTxt: { fontSize: 16, fontWeight: '800', color: '#FFF', letterSpacing: 0.2 },
  ctaBtnEmail: {
    backgroundColor: '#FFF',
    borderRadius: 12, height: 54,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#0F172A',
  },
  ctaBtnEmailTxt: { fontSize: 15, fontWeight: '700', color: '#0F172A', letterSpacing: 0.2 },

  // ··· overflow thumb button
  thumbDots: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  thumbDotsText: { fontSize: 14, fontWeight: '800', color: '#64748B', letterSpacing: 1 },
  thumbDotsCount: { fontSize: 10, fontWeight: '700', color: '#94A3B8', marginTop: 2 },

  // Full image gallery modal
  galOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  galSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  galHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#E2E8F0', alignSelf: 'center',
    marginTop: 12, marginBottom: 4,
  },
  galHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  galTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  galCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },
  galCloseTxt: { fontSize: 14, color: '#64748B', fontWeight: '700' },
  galGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    padding: 12, gap: 10,
  },
  galThumb: {
    width: 90, height: 90,
    borderRadius: 10,
    borderWidth: 2, borderColor: 'transparent',
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
      android: { elevation: 1 },
      default: {},
    }),
  },
  galThumbActive: { borderColor: '#D97706' },
  galThumbImg: { width: '88%', height: '88%' },
  galActiveBadge: {
    position: 'absolute', top: 4, right: 4,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#D97706',
    alignItems: 'center', justifyContent: 'center',
  },
  galActiveBadgeTxt: { fontSize: 11, color: '#FFF', fontWeight: '800' },
  galThumbNum: {
    position: 'absolute', bottom: 3, left: 5,
    fontSize: 10, color: '#94A3B8', fontWeight: '600',
  },
});

