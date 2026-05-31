import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, Platform, Linking, Image, useWindowDimensions,
} from 'react-native';

interface Props {
  onBack: () => void;
}

const TABS = ['Home', 'Videos', 'Shorts', 'Posts'];

// ─── Real image sources ───────────────────────────────────────────────────────
const IMG = {
  v1: require('../../assets/img/v1.png'),
  v2: require('../../assets/img/v2.png'),
  v3: require('../../assets/img/v3.png'),
  v4: require('../../assets/img/v4.png'),
  v5: require('../../assets/img/v5.png'),
  v6: require('../../assets/img/v6.png'),
  v7: require('../../assets/img/v7.png'),
  v8: require('../../assets/img/v8.png'),
  s1: require('../../assets/img/s1.png'),
  s2: require('../../assets/img/s2.png'),
  s3: require('../../assets/img/s3.png'),
};

const IG  = 'https://www.instagram.com/hksenterprisesdelhi/';
const FB  = 'https://www.facebook.com/jatin.sharma.800660/';
const IG_BADGE  = '#E1306C';
const FB_BADGE  = '#1877F2';

const FEATURED = {
  id: 'feat',
  image: IMG.v1,
  title: 'HKS Enterprises Warehouse Tour | Delhi Electronics Liquidation',
  channel: 'HKS Enterprises • Instagram',
  views: '192K views', timeAgo: '2 weeks ago', duration: '9:16',
  link: IG, badge: IG_BADGE, badgeTxt: 'Instagram',
  desc: 'Join us for a tour of our newly arrived branded electronics and appliances at our Delhi warehouse. Massive liquidation discounts available for bulk dispatch.',
};

const VIDEOS = [
  { id: 'v1', image: IMG.v2, title: 'Truckload Arrival: Branded Appliances & Electronics', channel: 'HKS Enterprises • Instagram', views: '88K views', timeAgo: '1 day ago', duration: '21:24', link: IG, badge: IG_BADGE, desc: 'Fresh truckload of branded appliances just arrived at Mundka. Available immediately for bulk purchase.' },
  { id: 'v2', image: IMG.v3, title: 'Unboxing Amazon Returns: Electronics Lot', channel: 'Jatin Sharma • Facebook', views: '123K views', timeAgo: '3 days ago', duration: '11:18', link: FB, badge: FB_BADGE, desc: 'Live unboxing of our latest Amazon return electronics lot. Great margins for resellers.' },
  { id: 'v3', image: IMG.v4, title: 'Kitchen Fixtures Clearance: Hobs & Chimneys', channel: 'HKS Enterprises • Instagram', views: '56K views', timeAgo: '5 days ago', duration: '17:57', link: IG, badge: IG_BADGE, desc: 'Branded Faber & Elica kitchen chimneys and hobs available at deep liquidation prices.' },
  { id: 'v4', image: IMG.v5, title: 'B2B Profit Potential: Liquidation Sourcing Guide', channel: 'Jatin Sharma • Facebook', views: '440K views', timeAgo: '1 week ago', duration: '12:19', link: FB, badge: FB_BADGE, desc: 'A deep dive into profit margins from reselling liquidated electronics and how to get started.' },
  { id: 'v5', image: IMG.v6, title: 'Washing Machines & Appliances Bulk Lot', channel: 'HKS Enterprises • Instagram', views: '31K views', timeAgo: '2 weeks ago', duration: '8:44', link: IG, badge: IG_BADGE, desc: 'Bulk lot of branded washing machines and household appliances available for immediate dispatch.' },
  { id: 'v6', image: IMG.v7, title: 'Forklift Loading: Full Truckload Dispatch', channel: 'HKS Enterprises • Instagram', views: '19K views', timeAgo: '3 weeks ago', duration: '5:30', link: IG, badge: IG_BADGE, desc: 'Watch how we load a full truckload of mixed inventory from our Mundka warehouse.' },
  { id: 'v7', image: IMG.v8, title: 'Warehouse Walkthrough: All Categories', channel: 'Jatin Sharma • Facebook', views: '72K views', timeAgo: '1 month ago', duration: '15:22', link: FB, badge: FB_BADGE, desc: 'Complete walkthrough of all inventory categories available at HKS Enterprises.' },
];

const SHORTS = [
  { id: 's1', image: IMG.s1, title: 'Washing Machine Aisle — Warehouse Tour', views: '2.1M views', link: IG },
  { id: 's2', image: IMG.s2, title: 'Forklift Loading Pallets', views: '1.5M views', link: IG },
  { id: 's3', image: IMG.s3, title: 'Premium Kitchen Hob Display', views: '890K views', link: IG },
];

const POSTS = [
  { id: 'p1', author: 'Jatin Sharma', initial: 'J', time: '2 hours ago', content: 'Just received a massive shipment of Hero cycles! Perfect condition, ready for wholesale dispatch. DM for bulk pricing.', link: FB },
  { id: 'p2', author: 'HKS Enterprises', initial: 'H', time: 'Yesterday', content: 'Our warehouse is open Monday to Saturday, 10:00 AM – 8:00 PM. Visit us at Mundka, New Delhi to inspect the latest stocklots in person!', link: FB },
  { id: 'p3', author: 'HKS Enterprises', initial: 'H', time: '3 days ago', content: 'New batch of Faber chimneys and kitchen hobs just arrived. Unbeatable prices for bulk buyers. Contact us on WhatsApp to lock your lot.', link: FB },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
const PlatformBadge = ({ color, label }: { color: string; label: string }) => (
  <View style={[st.platBadge, { backgroundColor: color }]}>
    <Text style={st.platBadgeTxt}>{label}</Text>
  </View>
);

const DurationBadge = ({ dur }: { dur: string }) => (
  <View style={st.durBadge}><Text style={st.durTxt}>{dur}</Text></View>
);

// ─── Main screen ──────────────────────────────────────────────────────────────
export const UpdatesScreen: React.FC<Props> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('Home');
  const { width } = useWindowDimensions();

  const openLink = (url: string) => Linking.openURL(url).catch(() => {});

  const shortCardW = (width - 48) / 2;

  return (
    <SafeAreaView style={st.root}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity style={st.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={st.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={st.headerTitle}>HKS Enterprises</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tabs */}
      <View style={st.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.tabScroll}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab}
              style={[st.tabBtn, activeTab === tab && st.tabBtnActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[st.tabTxt, activeTab === tab && st.tabTxtActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.scroll}>

        {/* ── HOME TAB ── */}
        {activeTab === 'Home' && (
          <>
            {/* Featured */}
            <TouchableOpacity activeOpacity={0.92} onPress={() => openLink(FEATURED.link)}>
              <Image source={FEATURED.image} style={[st.featImg, { width }]} resizeMode="cover" />
              <PlatformBadge color={FEATURED.badge} label={FEATURED.badgeTxt} />
              <DurationBadge dur={FEATURED.duration} />
              <View style={st.featMeta}>
                <Text style={st.featTitle}>{FEATURED.title}</Text>
                <Text style={st.featSub}>{FEATURED.channel} • {FEATURED.views} • {FEATURED.timeAgo}</Text>
                <Text style={st.featDesc} numberOfLines={2}>{FEATURED.desc}</Text>
              </View>
            </TouchableOpacity>

            <View style={st.divider} />

            {/* Videos row */}
            <Text style={st.sectionTitle}>Videos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.hList}>
              {VIDEOS.slice(0, 5).map(v => (
                <TouchableOpacity key={v.id} style={st.hCard} activeOpacity={0.88} onPress={() => openLink(v.link)}>
                  <View style={st.hThumbWrap}>
                    <Image source={v.image} style={st.hThumb} resizeMode="cover" />
                    <PlatformBadge color={v.badge} label={v.badge === IG_BADGE ? 'IG' : 'FB'} />
                    <DurationBadge dur={v.duration} />
                  </View>
                  <Text style={st.hTitle} numberOfLines={2}>{v.title}</Text>
                  <Text style={st.hSub}>{v.views} • {v.timeAgo}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* ── VIDEOS TAB ── */}
        {activeTab === 'Videos' && (
          <View>
            {[FEATURED, ...VIDEOS].map(v => (
              <TouchableOpacity key={v.id} activeOpacity={0.92} onPress={() => openLink(v.link)} style={st.vCard}>
                <View style={st.vThumbWrap}>
                  <Image source={v.image} style={[st.vThumb, { width }]} resizeMode="cover" />
                  <PlatformBadge color={v.badge} label={v.badge === IG_BADGE ? 'Instagram' : 'Facebook'} />
                  <DurationBadge dur={v.duration} />
                </View>
                <View style={st.vMeta}>
                  <Text style={st.vTitle}>{v.title}</Text>
                  <Text style={st.vSub}>{v.channel} • {v.views} • {v.timeAgo}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── SHORTS TAB ── */}
        {activeTab === 'Shorts' && (
          <View style={st.shortsGrid}>
            {SHORTS.map(s => (
              <TouchableOpacity key={s.id} style={[st.shortCard, { width: shortCardW }]} activeOpacity={0.88} onPress={() => openLink(s.link)}>
                <Image source={s.image} style={[st.shortImg, { width: shortCardW, height: shortCardW * 1.78 }]} resizeMode="cover" />
                <Text style={st.shortTitle} numberOfLines={2}>{s.title}</Text>
                <Text style={st.shortViews}>{s.views}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── POSTS TAB ── */}
        {activeTab === 'Posts' && (
          <View style={st.postsList}>
            {POSTS.map(p => (
              <TouchableOpacity key={p.id} style={st.postCard} activeOpacity={0.88} onPress={() => openLink(p.link)}>
                <View style={st.postHeader}>
                  <View style={st.postAvatar}><Text style={st.postAvatarTxt}>{p.initial}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.postAuthor}>{p.author}</Text>
                    <Text style={st.postTime}>{p.time}</Text>
                  </View>
                  <View style={[st.platBadge, { backgroundColor: FB_BADGE }]}>
                    <Text style={st.platBadgeTxt}>Facebook</Text>
                  </View>
                </View>
                <Text style={st.postContent}>{p.content}</Text>
                <Text style={st.postCta}>View on Facebook ›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const elev = (n: number) => Platform.select({
  ios: { shadowColor: '#000', shadowOffset: { width: 0, height: n }, shadowOpacity: 0.1, shadowRadius: n * 2 },
  android: { elevation: n },
  default: {},
});

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#0F172A',
    ...elev(4),
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 26, color: '#FFF', fontWeight: '700', lineHeight: 30, marginTop: -2 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#FFF' },

  // Tabs
  tabBar: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#FFF' },
  tabScroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  tabBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9' },
  tabBtnActive: { backgroundColor: '#0F172A' },
  tabTxt: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  tabTxtActive: { color: '#FFF' },

  scroll: { paddingBottom: 16 },

  // Featured
  featImg: { height: 220 },
  platBadge: { position: 'absolute', top: 10, left: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  platBadgeTxt: { color: '#FFF', fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  durBadge: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  durTxt: { color: '#FFF', fontSize: 11, fontWeight: '600' },
  featMeta: { paddingHorizontal: 16, paddingVertical: 14 },
  featTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A', lineHeight: 24, marginBottom: 6 },
  featSub: { fontSize: 12, color: '#64748B', fontWeight: '500', marginBottom: 6 },
  featDesc: { fontSize: 13, color: '#94A3B8', lineHeight: 20 },

  divider: { height: 8, backgroundColor: '#F8FAFC', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', paddingHorizontal: 16, marginBottom: 14 },

  // Horizontal cards
  hList: { paddingHorizontal: 16, gap: 14, paddingBottom: 4 },
  hCard: { width: 200 },
  hThumbWrap: { borderRadius: 10, overflow: 'hidden', marginBottom: 10, position: 'relative' },
  hThumb: { width: 200, height: 114, backgroundColor: '#1E293B' },
  hTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A', lineHeight: 19, marginBottom: 4 },
  hSub: { fontSize: 11, color: '#64748B', fontWeight: '500' },

  // Full videos list
  vCard: { marginBottom: 4 },
  vThumbWrap: { position: 'relative' },
  vThumb: { height: 210, backgroundColor: '#1E293B' },
  vMeta: { paddingHorizontal: 16, paddingVertical: 12 },
  vTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', lineHeight: 22, marginBottom: 5 },
  vSub: { fontSize: 12, color: '#64748B', fontWeight: '500' },

  // Shorts grid
  shortsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 16, paddingTop: 8 },
  shortCard: { marginBottom: 4 },
  shortImg: { borderRadius: 12, backgroundColor: '#1E293B', marginBottom: 8 },
  shortTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A', lineHeight: 19, marginBottom: 3 },
  shortViews: { fontSize: 12, color: '#64748B', fontWeight: '500' },

  // Posts
  postsList: { padding: 16, gap: 14 },
  postCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#E2E8F0', ...elev(2),
  },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  postAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
  postAvatarTxt: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  postAuthor: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  postTime: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  postContent: { fontSize: 14, color: '#1E293B', lineHeight: 22, marginBottom: 14 },
  postCta: { fontSize: 13, fontWeight: '700', color: '#1877F2' },
});
