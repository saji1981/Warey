import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { InventoryLot } from '../types/InventoryLot';

interface LotCardProps {
  lot: InventoryLot;
  onPress: (lot: InventoryLot) => void;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Available:   { bg: '#DCFCE7', text: '#16A34A' },
  available:   { bg: '#DCFCE7', text: '#16A34A' },
  'In Stock':  { bg: '#DCFCE7', text: '#16A34A' },
  'Low Stock': { bg: '#FEF9C3', text: '#CA8A04' },
  'Out of Stock': { bg: '#FEE2E2', text: '#DC2626' },
};

const getStatusStyle = (status: string) =>
  STATUS_COLORS[status] ?? { bg: '#F1F5F9', text: '#64748B' };

export const LotCard: React.FC<LotCardProps> = ({ lot, onPress }) => {
  const { width } = useWindowDimensions();
  const isNarrow = width < 400;
  const statusStyle = getStatusStyle(lot.stock_status);

  const formattedPrice = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(lot.bulk_price || 0);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(lot)}
      activeOpacity={0.8}
    >
      {/* Header row */}
      <View style={styles.header}>
        <Text style={[styles.title, isNarrow && { fontSize: 14 }]} numberOfLines={2}>
          {lot.title || 'Unnamed Lot'}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.statusText, { color: statusStyle.text }]}>
            {lot.stock_status}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Bottom row: price + chevron */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.priceLabel}>Bulk Price</Text>
          <Text style={styles.price}>{formattedPrice}</Text>
        </View>
        <View style={styles.chevronWrapper}>
          <Text style={styles.chevron}>›</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    flexShrink: 0,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  price: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1D4ED8',
    letterSpacing: -0.5,
  },
  chevronWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    fontSize: 22,
    color: '#1D4ED8',
    fontWeight: '700',
    lineHeight: 26,
  },
});
