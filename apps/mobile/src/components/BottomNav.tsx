import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

const NAV_ITEMS = [
  { id: 'home', imageSource: require('../../assets/img/Home.png'), label: 'Home' },
  { id: 'browse', imageSource: require('../../assets/img/Search.png'), label: 'All Inventory' },
  { id: 'search', imageSource: require('../../assets/img/Blog.png'), label: 'Updates' },
  { id: 'profile', imageSource: require('../../assets/img/Profile.png'), label: 'Profile' },
];

interface BottomNavProps {
  onBrowseAll?: () => void;
  onProfile?: () => void;
  onUpdates?: () => void;
  activeTabOverride?: string;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onBrowseAll, onProfile, onUpdates, activeTabOverride }) => {
  const [activeTab, setActiveTab] = useState('home');

  // Reset active tab when overlays close
  useEffect(() => {
    if (activeTabOverride) setActiveTab(activeTabOverride);
  }, [activeTabOverride]);

  const handleTabPress = (id: string) => {
    setActiveTab(id);
    if (id === 'browse')  onBrowseAll?.();
    if (id === 'profile') onProfile?.();
    if (id === 'search')  onUpdates?.();
  };

  return (
    <View style={styles.container}>
      {NAV_ITEMS.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <TouchableOpacity
            key={item.id}
            style={styles.tab}
            activeOpacity={0.7}
            onPress={() => handleTabPress(item.id)}
          >
            <Image 
              source={item.imageSource} 
              style={[styles.navImage, isActive && styles.navImageActive]} 
              resizeMode="contain" 
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>{item.label}</Text>
            {isActive && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 68,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 4,
    position: 'relative',
  },
  navImage: {
    width: 24,
    height: 24,
    marginBottom: 4,
    opacity: 0.45,
  },
  navImageActive: {
    opacity: 1,
  },
  label: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  labelActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    width: 28,
    height: 3,
    backgroundColor: '#0F172A',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
});
