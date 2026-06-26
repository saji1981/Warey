import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Height of the web top nav bar — exported so App.tsx can reserve space. */
export const TOP_NAV_H = 56;

const NAV_ITEMS = [
  { id: 'home',    emoji: '🏠', label: 'Home' },
  { id: 'browse',  emoji: '📦', label: 'All Inventory' },
  { id: 'search',  emoji: '🔔', label: 'Updates' },
  { id: 'profile', emoji: '👤', label: 'Profile' },
];

interface BottomNavProps {
  onBrowseAll?: () => void;
  onProfile?: () => void;
  onUpdates?: () => void;
  onMaster?: () => void;
  activeTabOverride?: string;
  isMaster?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  onBrowseAll, onProfile, onUpdates, onMaster, activeTabOverride, isMaster,
}) => {
  const [activeTab, setActiveTab] = useState('home');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (activeTabOverride) setActiveTab(activeTabOverride);
  }, [activeTabOverride]);

  const handleTabPress = (id: string) => {
    setActiveTab(id);
    if (id === 'browse')  onBrowseAll?.();
    if (id === 'profile') onProfile?.();
    if (id === 'search')  onUpdates?.();
    if (id === 'master')  onMaster?.();
  };

  const navItems = [...NAV_ITEMS];
  if (isMaster) navItems.push({ id: 'master', emoji: '⚙️', label: 'Master' });

  // ── Web: horizontal top bar ─────────────────────────────────────────────────
  if (Platform.OS === 'web') {
    return (
      <View style={web.container}>
        {navItems.map(item => {
          const active = activeTab === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={web.tab}
              onPress={() => handleTabPress(item.id)}
              activeOpacity={0.7}
            >
              <Text style={[web.icon, active && web.iconActive]}>{item.emoji}</Text>
              <Text style={[web.label, active && web.labelActive]}>{item.label}</Text>
              {active && <View style={web.activeBar} />}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // ── Mobile: bottom tab bar + safe-area inset for gesture/button nav ─────────
  // insets.bottom = 0 on devices with hardware buttons (the button bar is outside
  // the app area), and the gesture bar height on swipe-based Android 10+ devices.
  const bottomPad = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'android' ? 12 : 4);
  const barHeight = 58 + bottomPad;

  return (
    <View style={[mobile.container, { paddingBottom: bottomPad, height: barHeight }]}>
      {navItems.map(item => {
        const active = activeTab === item.id;
        return (
          <TouchableOpacity
            key={item.id}
            style={mobile.tab}
            activeOpacity={0.7}
            onPress={() => handleTabPress(item.id)}
          >
            <Text style={[mobile.icon, active && mobile.iconActive]}>{item.emoji}</Text>
            <Text style={[mobile.label, active && mobile.labelActive]}>{item.label}</Text>
            {active && <View style={mobile.activeBar} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// ─── Web styles (horizontal top bar) ──────────────────────────────────────────
const web = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: TOP_NAV_H,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    // Web shadow
    ...Platform.select({ default: {
      shadowColor: '#64748B',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 8,
    }}),
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    position: 'relative',
    paddingHorizontal: 8,
  },
  icon:        { fontSize: 16, marginRight: 4, color: '#94A3B8' },
  iconActive:  { color: '#D97706' },
  label:       { fontSize: 13, fontWeight: '500', color: '#64748B' },
  labelActive: { color: '#D97706', fontWeight: '700' },
  activeBar: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 3,
    backgroundColor: '#D97706',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
});

// ─── Mobile styles (bottom tab bar) ───────────────────────────────────────────
const mobile = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    elevation: 10,
    ...Platform.select({
      ios:     { shadowColor: '#64748B', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: {},
      default: {},
    }),
  },
  tab: {
    flex: 1,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 2,
    position: 'relative',
  },
  icon:        { fontSize: 22, marginBottom: 2, color: '#94A3B8' },
  iconActive:  { color: '#D97706' },
  label:       { fontSize: 10, color: '#94A3B8', fontWeight: '500' },
  labelActive: { color: '#D97706', fontWeight: '700' },
  activeBar: {
    position: 'absolute',
    top: 0,
    width: 28,
    height: 3,
    backgroundColor: '#D97706',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
});


