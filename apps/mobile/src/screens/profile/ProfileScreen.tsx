import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, TextInput, ActivityIndicator, Alert, Share,
  Switch, Platform, SafeAreaView, Linking,
} from 'react-native';
import { fetchProfile, updateProfile, signOut, UserProfile } from '../../services/ProfileService';

interface Props { onLogout: () => void; onBack: () => void; }
// ─── Simple info modal ────────────────────────────────────────────────────────
const InfoModal: React.FC<{ visible: boolean; title: string; content: string | React.ReactNode; onClose: () => void }> = ({ visible, title, content, onClose }) => (
  <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <View style={s.sheetBg}>
      <View style={s.sheet}>
        <View style={s.handle} />
        <View style={s.sheetHeader}>
          <Text style={s.sheetTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}><Text style={s.closeTxt}>✕</Text></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {typeof content === 'string'
            ? <Text style={s.bodyTxt}>{content}</Text>
            : content}
        </ScrollView>
      </View>
    </View>
  </Modal>
);

// OTP flow removed per user request

// ─── Edit Profile Modal ───────────────────────────────────────────────────────
const EditProfileModal: React.FC<{
  visible: boolean; profile: UserProfile;
  onSave: (name: string, email: string) => void; onClose: () => void;
}> = ({ visible, profile, onSave, onClose }) => {
  const [name, setName] = useState(profile.full_name ?? '');
  const [email, setEmail] = useState(profile.email ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await updateProfile(profile.id, { full_name: name.trim(), email: email.trim() });
    setSaving(false);
    onSave(name.trim(), email.trim());
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.sheetBg}>
        <View style={s.sheet}>
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}><Text style={s.closeTxt}>✕</Text></TouchableOpacity>
          </View>
          <View style={{ padding: 20, gap: 14 }}>
            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Full Name</Text>
              <TextInput style={s.textInput} value={name} onChangeText={setName} placeholder="Your full name" placeholderTextColor="#CBD5E1" />
            </View>
            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Email</Text>
              <TextInput style={s.textInput} value={email} onChangeText={setEmail} placeholder="Your email address" placeholderTextColor="#CBD5E1" keyboardType="email-address" autoCapitalize="none" />
            </View>
            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Phone (Unchangeable)</Text>
              <TextInput style={[s.textInput, s.inputDisabled]} value={profile.phone ?? ''} editable={false} />
            </View>
            <TouchableOpacity style={s.primaryBtn} onPress={save} disabled={saving} activeOpacity={0.85}>
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={s.primaryBtnTxt}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Row component ────────────────────────────────────────────────────────────
const Row: React.FC<{ label: string; onPress: () => void; danger?: boolean; right?: React.ReactNode }> = ({ label, onPress, danger, right }) => (
  <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.7}>
    <Text style={[s.rowLabel, danger && { color: '#EF4444' }]}>{label}</Text>
    {right ?? <Text style={s.rowChevron}>›</Text>}
  </TouchableOpacity>
);

// ─── Main ProfileScreen ───────────────────────────────────────────────────────
export const ProfileScreen: React.FC<Props> = ({ onLogout, onBack }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  useEffect(() => {
    fetchProfile().then(({ profile: p }) => { setProfile(p); setLoading(false); });
  }, []);

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : (profile?.phone ?? '?').slice(-2);


  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: async () => { await signOut(); onLogout(); } },
    ]);
  };

  const handleShare = () => {
    Share.share({ message: 'Check out Trulots — the smart B2B liquidation marketplace! Download the app and start buying bulk inventory at great prices.' });
  };

  const handleEditPress = () => {
    setEditOpen(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={onBack}><Text style={s.backIcon}>‹</Text></TouchableOpacity>
          <Text style={s.headerTitle}>Profile</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#0F172A" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onBack}><Text style={s.backIcon}>‹</Text></TouchableOpacity>
        <Text style={s.headerTitle}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>


      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

        {/* ── Hero Banner ── */}
        <View style={s.heroBanner}>
          <View style={s.heroAvatarRow}>
            <View style={s.avatarContainer}>
              <View style={s.avatarCircle}>
                <Text style={s.avatarText}>{initials}</Text>
              </View>
              {profile?.profile_verified && (
                <View style={s.verifiedBadgeIcon}>
                  <Text style={{ fontSize: 11, color: '#FFF', fontWeight: '800' }}>✓</Text>
                </View>
              )}
            </View>
            <TouchableOpacity style={s.editBadgeBtn} onPress={handleEditPress} activeOpacity={0.85}>
              <Text style={s.editBadgeTxt}>Edit Profile</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.heroName}>{profile?.full_name || 'Your Business Name'}</Text>
          <Text style={s.heroSub}>{profile?.email || 'Add your email address'}</Text>
          <Text style={s.heroPhone}>{profile?.phone ? `+91 ${profile.phone.slice(-10)}` : 'Phone not set'}</Text>

          <View style={s.membershipBadge}>
            <Text style={s.membershipText}>B2B Verified Buyer  •  Trulots</Text>
          </View>
        </View>

        {/* ── Support & Information ── */}
        <Text style={s.sectionLabel}>Support & Information</Text>
        <View style={s.card}>
          <Row label="Contact & Warehouse" onPress={() => setContactOpen(true)} />
          <View style={s.sep} />
          <Row label="Frequently Asked Questions" onPress={() => setFaqOpen(true)} />
          <View style={s.sep} />
          <Row label="About HKS Enterprises" onPress={() => setAboutOpen(true)} />
          <View style={s.sep} />
          <Row label="Terms & Privacy Policy" onPress={() => setTermsOpen(true)} />
        </View>

        {/* ── Account Settings ── */}
        <Text style={s.sectionLabel}>Account Settings</Text>
        <View style={s.card}>
          <Row label="Rate the Trulots App" onPress={() => Linking.openURL('market://details?id=com.trulots').catch(() => Linking.openURL('https://play.google.com/store/apps/details?id=com.trulots'))} />
          <View style={s.sep} />
          <Row label="Share App with Retailers" onPress={handleShare} />
          <View style={s.sep} />
          <Row label="Log Out" onPress={handleLogout} danger />
        </View>

        <Text style={s.versionTxt}>Trulots v1.0.0  •  HKS Enterprises  •  New Delhi</Text>
      </ScrollView>


      {/* ── Modals ── */}
      {profile && (
        <EditProfileModal
          visible={editOpen} profile={profile}
          onSave={(name, email) => { setProfile({ ...profile, full_name: name, email }); setEditOpen(false); }}
          onClose={() => setEditOpen(false)}
        />
      )}

      {/* Contact Us */}
      <InfoModal visible={contactOpen} title="Contact Us" onClose={() => setContactOpen(false)} content={
        <View style={{ gap: 16 }}>
          <Text style={s.bodyTxt}>Have questions about our latest stocklots, or want to place a bulk order? Get in touch with us directly or visit our warehouse in Delhi.</Text>
          
          <Text style={s.sectionHeader}>Warehouse & Head Office</Text>
          <View style={s.contactBlock}>
            <Text style={s.contactVal}>HKS Enterprises</Text>
            <Text style={s.contactLabel}>Proprietor: Jatin Sharma</Text>
            <Text style={[s.contactLabel, { marginTop: 4 }]}>Khasra No. 124/19, Mundka-Ranholla Road, Near Master Azad Farmhouse, Mundka, New Delhi, Delhi – 110041, India.</Text>
            <Text style={[s.contactLabel, { marginTop: 4 }]}>Landmark: Near Pandey Chai Wala</Text>
          </View>

          <Text style={s.sectionHeader}>Business Hours</Text>
          <View style={s.contactBlock}>
            <Text style={s.contactVal}>Monday to Saturday: 10:00 AM – 8:00 PM</Text>
            <Text style={s.contactLabel}>Sunday: Closed</Text>
          </View>

          <Text style={s.sectionHeader}>Digital & B2B Channels</Text>
          <View style={[s.contactBlock, { paddingVertical: 4 }]}>
            <TouchableOpacity style={s.actionRow} onPress={() => Linking.openURL('https://m.indiamart.com/company/262507832/')}>
              <Text style={s.actionRowLink}>B2B Catalogue (IndiaMART)</Text>
              <Text style={s.rowChevron}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionRow} onPress={() => Linking.openURL('https://www.facebook.com/jatin.sharma.800660/')}>
              <Text style={s.actionRowLink}>Facebook Marketplace</Text>
              <Text style={s.rowChevron}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionRow, { borderBottomWidth: 0 }]} onPress={() => Linking.openURL('https://in.linkedin.com/in/jatin-sharma-49591b2a2')}>
              <Text style={s.actionRowLink}>Professional Network (LinkedIn)</Text>
              <Text style={s.rowChevron}>›</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.sectionHeader}>Live Stock Updates</Text>
          <Text style={[s.bodyTxt, { marginTop: -8 }]}>Follow our daily warehouse walkthroughs, live truckload arrivals, and unboxing videos here:</Text>
          <View style={[s.contactBlock, { paddingVertical: 4 }]}>
            <TouchableOpacity style={[s.actionRow, { borderBottomWidth: 0 }]} onPress={() => Linking.openURL('https://www.instagram.com/hksenterprisesdelhi/')}>
              <Text style={s.actionRowLink}>@hksenterprisesdelhi on Instagram</Text>
              <Text style={s.rowChevron}>›</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.sectionHeader}>How to Reach Us</Text>
          <View style={s.contactBlock}>
            <Text style={s.contactVal}>By Metro</Text>
            <Text style={s.contactLabel}>Take the Green Line to Mundka Metro Station. We are just a short auto-rickshaw ride away from the station.</Text>
            <TouchableOpacity style={[s.actionRow, { borderBottomWidth: 0, paddingBottom: 0, paddingTop: 16 }]} onPress={() => Linking.openURL('https://www.google.com/search?kgmid=/g/11kqckw379')}>
               <Text style={s.actionRowLink}>View on Google Maps</Text>
               <Text style={s.rowChevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>
      } />

      {/* FAQs */}
      <InfoModal visible={faqOpen} title="FAQs" onClose={() => setFaqOpen(false)} content={
        <View style={{ gap: 16 }}>
          <Text style={s.sectionHeader}>About Trulots & The App</Text>
          <View style={s.faqItem}>
            <Text style={s.faqQ}>What is Trulots?</Text>
            <Text style={s.faqA}>Trulots is a specialized B2B liquidation marketplace application connecting verified buyers, retailers, and resellers directly with premium surplus inventory at deep wholesale bulk prices. It serves as the digital catalog and ordering system for HKS Enterprises.</Text>
          </View>
          <View style={s.faqItem}>
            <Text style={s.faqQ}>Where can I get the Trulots App?</Text>
            <Text style={s.faqA}>The Trulots App is available for download on major mobile platforms. You can download the official application to browse live stocklots directly from your smartphone:</Text>
            <View style={[s.bulletRow, { marginTop: 8 }]}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}>Android Users: Download via the Google Play Store.</Text></View>
            <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}>iOS Users: Download via the Apple App Store.</Text></View>
            <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}>(Links to the respective app stores can be found on our main website homepage).</Text></View>
          </View>
          <View style={s.faqItem}>
            <Text style={s.faqQ}>Why should I use the Trulots App instead of traditional sourcing?</Text>
            <Text style={s.faqA}>The app provides real-time access to fast-moving liquidation inventory. By using the app, you get instant push notifications the moment a new truckload, Amazon return lot, or appliance batch arrives at our Mundka warehouse, allowing you to secure high-demand stock before it sells out.</Text>
          </View>

          <Text style={s.sectionHeader}>Sourcing & Ordering</Text>
          <View style={s.faqItem}>
            <Text style={s.faqQ}>How do I place an order?</Text>
            <Text style={s.faqA}>Ordering is streamlined directly through our digital application:</Text>
            <View style={[s.bulletRow, { marginTop: 8 }]}><Text style={s.bulletDot}>1.</Text><Text style={s.bulletText}>Open the Trulots App and browse our live, available lots.</Text></View>
            <View style={s.bulletRow}><Text style={s.bulletDot}>2.</Text><Text style={s.bulletText}>Select the specific inventory lot or pallet you are interested in.</Text></View>
            <View style={s.bulletRow}><Text style={s.bulletDot}>3.</Text><Text style={s.bulletText}>Tap the "Enquire via WhatsApp" button.</Text></View>
            <View style={s.bulletRow}><Text style={s.bulletDot}>4.</Text><Text style={s.bulletText}>Our dedicated sales and logistics team will instantly connect with you to finalize pricing, volume breakdowns, and freight details.</Text></View>
          </View>
          <View style={s.faqItem}>
            <Text style={s.faqQ}>How are prices determined?</Text>
            <Text style={s.faqA}>Liquidation markets move rapidly. Prices on Trulots are dynamically set based on current wholesale market rates, the overall volume of the batch, and the physical condition of the specific lot (e.g., brand-new overstock versus raw customer returns) at the exact time of listing.</Text>
          </View>
          <View style={s.faqItem}>
            <Text style={s.faqQ}>What is the Minimum Order Quantity (MOQ)?</Text>
            <Text style={s.faqA}>Because we operate as high-volume liquidation wholesalers, we deal primarily in bulk categories. MOQs vary by lot and are clearly displayed on each product card inside the Trulots App. We typically sell by the full box, pallet, or complete truckload (FTL).</Text>
          </View>

          <Text style={s.sectionHeader}>Security, Privacy & Tech</Text>
          <View style={s.faqItem}>
            <Text style={s.faqQ}>Is my data secure?</Text>
            <Text style={s.faqA}>Yes, your business and personal data are completely safe with us. All user profile data, business credentials, and interaction logs are fully encrypted and securely stored using Supabase backend infrastructure.</Text>
          </View>
          <View style={s.faqItem}>
            <Text style={s.faqQ}>How do you prevent data leaks or unauthorized access?</Text>
            <Text style={s.faqA}>We strictly enforce Row-Level Security (RLS) policies within our Supabase database architecture. This means your enterprise data, order inquiries, and transaction histories are isolated and completely inaccessible to any other buyers or unauthorized third parties on the platform.</Text>
          </View>

          <Text style={s.sectionHeader}>Shipping, Logistics & Returns</Text>
          <View style={s.faqItem}>
            <Text style={s.faqQ}>Can I return items?</Text>
            <Text style={s.faqA}>Due to the deeply discounted nature of liquidation stocklots, all sales are generally final. However, we understand the complexities of B2B trade. Returns are assessed strictly on a case-by-case basis if there is a major discrepancy in the lot description. Please contact our support team immediately via WhatsApp to discuss any order issues.</Text>
          </View>
          <View style={s.faqItem}>
            <Text style={s.faqQ}>Can I inspect the goods before the logistics are finalized?</Text>
            <Text style={s.faqA}>Absolutely. We follow an open-warehouse model. While you can browse and inquire via the Trulots App, you are always welcome to physically visit our main facility at Mundka, New Delhi to visually audit the container loads and pallets before making final payment.</Text>
          </View>
          <View style={s.faqItem}>
            <Text style={s.faqQ}>How is shipping handled?</Text>
            <Text style={s.faqA}>Once you tap "Enquire via WhatsApp" and lock in your lot, our team assists you with logistics. We work with trusted freight networks to coordinate safe commercial transport across India, or you can arrange your own transport vehicle to pick up the stock directly from our warehouse docks.</Text>
          </View>
        </View>
      } />

      <InfoModal visible={aboutOpen} title="About Us" onClose={() => setAboutOpen(false)} content={
        <View style={{ gap: 16 }}>
          <Text style={s.bodyTxt}>Welcome to HKS Enterprises, New Delhi’s premier liquidation, stocklot, and e-commerce surplus distribution hub.</Text>
          <Text style={s.bodyTxt}>Founded and led by partner Jatin Sharma, we have built a reputation as a trusted, high-volume B2B sourcing partner for retailers, resellers, and online merchants across India. Operating from our central warehouse facility in West Delhi, we bridge the gap between major brands, e-commerce giants, and business owners looking for high-profit inventory.</Text>

          <Text style={s.sectionHeader}>Our Mission</Text>
          <Text style={s.bodyTxt}>Our mission is simple: to help businesses maximise their profit margins by giving them direct access to top-tier consumer brands at a fraction of their original retail cost. We buy massive bulk quantities so we can pass the deepest liquidator discounts straight down to you.</Text>

          <Text style={s.sectionHeader}>What We Specialise In</Text>
          <Text style={[s.bodyTxt, { marginBottom: -8 }]}>We handle large-scale liquidation stocks, overstocks, closeouts, and ageing inventory across diverse product segments:</Text>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>E-Commerce & Amazon Return Lots:</Text> High-volume customer returns, giving tech-savvy resellers access to massive unboxed electronics and housewares batches.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Electronics & Household Appliances:</Text> Fully functioning bulk inventory including LED TVs, smart washing machines, refrigerators, and heavy-duty air coolers.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Premium Kitchen Fixtures:</Text> Direct-from-factory liquidations of high-end branded items like Faber kitchen chimneys, built-in hobs, and dishwashers.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Consumer Goods:</Text> Freshly liquidated wholesale batches of popular lifestyle items, including brand-new Hero cycles.</Text></View>

          <Text style={s.sectionHeader}>Why Partner With Us?</Text>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Unbeatable Profit Margins:</Text> We skip the middlemen to deliver heavy liquidation prices that protect your bottom line.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Open-Warehouse Model:</Text> We believe in total transparency. Buyers are always welcome to physically visit our Mundka facility to inspect stock containers live.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Diverse & Evolving Catalogue:</Text> Our inventory changes constantly as new truckloads come in, ensuring a continuous stream of profitable products for your store.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Verified B2B Supplier:</Text> Backed by a strong digital and marketplace presence, we provide a secure, professional, and reliable trade experience.</Text></View>

          <Text style={s.sectionHeader}>Our Core Values</Text>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Total Transparency:</Text> We operate an open-warehouse policy so you can inspect stock lots yourself before buying.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Value Creation:</Text> We buy in massive volume to guarantee you the deepest possible liquidation discounts.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Speed & Agility:</Text> We secure and move fast-changing inventory quickly so your shelves never stay empty.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Trust & Integrity:</Text> We verify every batch to build long-term, reliable B2B partnerships across India.</Text></View>

          <Text style={s.sectionHeader}>How It Works</Text>
          <View style={s.bulletRow}><Text style={s.bulletDot}>1.</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Check Current Stock:</Text> Browse our latest arrivals on <Text style={s.linkTxt} onPress={() => Linking.openURL('https://www.instagram.com/hksenterprisesdelhi/')}>Instagram</Text> or view our verified catalog on <Text style={s.linkTxt} onPress={() => Linking.openURL('https://m.indiamart.com/company/262507832/')}>IndiaMART</Text>.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>2.</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Connect or Visit:</Text> Message Jatin Sharma on <Text style={s.linkTxt} onPress={() => Linking.openURL('https://www.facebook.com/jatin.sharma.800660/')}>Facebook</Text> or drop by our West Delhi warehouse in person.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>3.</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Pick Your Lot:</Text> Choose from open pallets, mixed assortment boxes, or complete full-truckload (FTL) shipments.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>4.</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Safe Payment & Logistics:</Text> Finalize your order with standard B2B invoicing and easily coordinate your shipping pickup.</Text></View>
        </View>
      } />
      <InfoModal visible={termsOpen} title="Terms & Policies" onClose={() => setTermsOpen(false)} content={
        <View style={{ gap: 16 }}>
          <Text style={[s.bodyTxt, { fontWeight: '800', fontSize: 18, color: '#0F172A' }]}>Terms of Service</Text>
          <Text style={[s.bodyTxt, { marginTop: -12, fontSize: 13, color: '#64748B' }]}>Last Updated: May 17, 2026</Text>
          <Text style={s.bodyTxt}>Welcome to Trulots, a mobile application and digital marketplace owned and operated by HKS Enterprises ("Company", "we", "us", or "our"), a business entity based in New Delhi, India, managed by partner Jatin Sharma.</Text>
          <Text style={s.bodyTxt}>These Terms of Service ("Terms") constitute a legally binding agreement between HKS Enterprises and you, whether personally or on behalf of an entity ("you", "user", or "buyer"), concerning your access to and use of the Trulots mobile application, our website, and any related corporate communication channels (collectively, the "Services").</Text>
          <Text style={s.bodyTxt}>By downloading the Trulots App, creating a commercial account, or initiating a transaction, you expressly acknowledge that you have read, understood, and agreed to be bound by all of these Terms. If you do not agree with all of these Terms, you are expressly prohibited from using our Services and must discontinue use immediately.</Text>

          <Text style={s.sectionHeader}>1. B2B Eligibility & Account Registration</Text>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Commercial Nature:</Text> Trulots is strictly a Business-to-Business (B2B) wholesale liquidation platform. It is not intended for retail consumers or casual end-users.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Age & Representation:</Text> By creating an account, you affirm that you are at least 18 years of age and hold the legal authority to bind your business or corporate entity to these Terms.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Verification:</Text> We reserve the right to request valid business verification documents, including but not limited to Goods and Services Tax (GST) registrations, PAN cards, or trade licenses, before granting access to specific stocklot pricing.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Account Security:</Text> You are entirely responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account.</Text></View>

          <Text style={s.sectionHeader}>2. Nature of Liquidation Inventory & "As-Is" Sales</Text>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Inventory Classification:</Text> Users explicitly acknowledge that the inventory listed on Trulots consists of surplus, overstock, shelf pulls, liquidation stocklots, and raw e-commerce/Amazon customer returns.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>No Warranties ("As-Is" Clause):</Text> Unless explicitly stated otherwise in writing on a specific premium lot invoice, all stocklots are sold on an "As-Is, Where-Is" basis. HKS Enterprises makes no express or implied warranties regarding the merchantability, fitness for a particular purpose, or functionality of items within a liquidated lot.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Defect Manifestation:</Text> Customer return lots may contain items that are defective, missing parts, or damaged in transit. The risk of these variations is a standard component of liquidation sourcing, and the buyer assumes full financial risk upon purchase.</Text></View>

          <Text style={s.sectionHeader}>3. Dynamic Pricing & Order Sourcing Process</Text>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Price Fluctuation:</Text> Prices for liquidation lots are highly dynamic and are set based on changing market conditions, lot contents, and volume at the exact hour of listing. A price quote visible on the app does not constitute a permanent offer.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Order Flow:</Text> Tapping "Enquire via WhatsApp" initiates a direct communication channel with our corporate desk. An order is only deemed legally accepted when an official proforma invoice or commercial bill is generated by HKS Enterprises and shared with the buyer.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Inventory Allocation:</Text> Stocklots are allocated on a strict first-come, first-served basis. We cannot hold lots without receiving an official financial commitment or token advance.</Text></View>

          <Text style={s.sectionHeader}>4. Financial Transactions & GST Invoicing</Text>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Payment Terms:</Text> All shipments require 100% advance payment via verified banking channels (IMPS, NEFT, RTGS, UPI) or authorized commercial digital networks prior to dispatch from our warehouse docks.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Tax Compliance:</Text> All sales are subject to applicable Indian Goods and Services Tax (GST) brackets. Buyers must provide accurate billing details and GSTIN records to ensure compliant tax credit routing.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>No Cancellation:</Text> Once an advance payment or full payment is finalized for a designated lot, the order cannot be altered, canceled, or refunded.</Text></View>

          <Text style={s.sectionHeader}>5. Freight, Logistics & Risk of Loss</Text>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Ex-Warehouse Basis:</Text> Unless explicitly agreed upon differently during the WhatsApp confirmation process, all commercial transactions are executed on an Ex-Warehouse (Mundka, New Delhi) basis.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Risk Transfer:</Text> The legal ownership and risk of transit loss, theft, or damage shift entirely to the buyer the moment the inventory is loaded onto the freight vehicle at our facility docks.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Logistics Coordination:</Text> While our team assists in connecting buyers with third-party transport networks, HKS Enterprises acts solely as a facilitator and carries zero liability for transit delays or courier negligence.</Text></View>

          <Text style={s.sectionHeader}>6. Return and Discrepancy Policy</Text>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Case-by-Case Assessment:</Text> As established in our core guidelines, returns are not a standard right. They are rigorously audited strictly on a case-by-case basis.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Discrepancy Reporting:</Text> If a delivered lot fundamentally violates the structural category description provided (e.g., you ordered kitchen chimneys but received apparel), you must submit a detailed dispute via WhatsApp with unedited video proof of the container unboxing within 48 hours of cargo receipt.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Discretionary Resolution:</Text> HKS Enterprises retains sole discretionary power to issue a partial store credit, coordinate an exchange, or reject claims filed outside the 48-hour audit window.</Text></View>

          <Text style={s.sectionHeader}>7. App Security, Data & Platform Infrastructure</Text>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Supabase Integration:</Text> The Trulots App utilizes a high-tier backend infrastructure powered by Supabase. Your business account logs, inquiries, and app-interactions are heavily safeguarded.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Row-Level Security (RLS):</Text> We enforce precise database-level RLS policies. Any attempt by a user to bypass security protocols, reverse-engineer the application, or scrape catalog data will result in immediate account termination and legal action under the IT Act, 2000.</Text></View>

          <Text style={s.sectionHeader}>8. Intellectual Property Rights</Text>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Trademarks & Imagery:</Text> The names "Trulots," "HKS Enterprises," and all logos, application graphics, UI designs, and marketing assets are the exclusive property of our firm.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Brand Liquidations:</Text> When buying branded inventory (such as Faber or Hero), the buyer agrees to adhere to the respective brand's local resale rules. HKS Enterprises does not transfer brand authorization certificates or manufacturing rights to the buyer.</Text></View>

          <Text style={s.sectionHeader}>9. Limitation of Liability & Indemnification</Text>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Liability Cap:</Text> To the maximum extent permitted by Indian law, HKS Enterprises, its partners (including Jatin Sharma), and its employees shall not be liable for any indirect, incidental, or consequential business losses, loss of profits, or data corruption resulting from your use of the app or resale of the stocklots.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Indemnity:</Text> You agree to indemnify and hold harmless HKS Enterprises from any third-party legal claims, damages, or operational losses arising out of your breach of these Terms or your mismanagement of the acquired products.</Text></View>

          <Text style={s.sectionHeader}>10. Governing Law & Dispute Resolution</Text>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Jurisdiction:</Text> These Terms are governed by and construed in accordance with the laws of the Republic of India.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Arbitration:</Text> Any dispute, controversy, or claim arising out of this agreement shall be settled through mutual mediation. If mediation fails, it shall be referred to binding arbitration in New Delhi under the provisions of the Arbitration and Conciliation Act, 1996.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Courts:</Text> The courts located in New Delhi, India shall have exclusive territorial jurisdiction over any legal proceedings initiated under these Terms.</Text></View>

          <Text style={s.sectionHeader}>11. Contact and Notice</Text>
          <Text style={[s.bodyTxt, { marginBottom: -8 }]}>All legal notices, questions, or compliance clarifications regarding these Terms should be routed directly to our corporate desk:</Text>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Entity:</Text> HKS Enterprises / Trulots Support Desk</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Managing Partner:</Text> Jatin Sharma</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Physical Hub:</Text> Khasra No. 124/19, Mundka-Ranholla Road, Mundka, New Delhi, Delhi – 110041, India.</Text></View>

          {/* Divider */}
          <View style={{ height: 24 }} />
          <View style={{ height: 1, backgroundColor: '#E2E8F0', marginVertical: 8 }} />
          
          <Text style={[s.bodyTxt, { fontWeight: '800', fontSize: 18, color: '#0F172A' }]}>Privacy Policy</Text>
          <Text style={[s.bodyTxt, { marginTop: -12, fontSize: 13, color: '#64748B' }]}>Last Updated: May 17, 2026</Text>
          <Text style={s.bodyTxt}>At HKS Enterprises ("we," "our," or "us"), we value the trust you place in us when sharing your business and personal information. This Privacy Policy outlines how we collect, use, disclose, and safeguard your data when you visit our warehouse, use our website, check our digital catalogs on platforms like IndiaMART, or interact with us on social media (Facebook, Instagram, LinkedIn).</Text>
          <Text style={s.bodyTxt}>By accessing our services or engaging in business transactions with us, you agree to the terms outlined in this policy.</Text>

          <Text style={s.sectionHeader}>1. Information We Collect</Text>
          <Text style={[s.bodyTxt, { marginBottom: -8 }]}>We collect information necessary to establish secure, legitimate B2B trade partnerships and process high-volume inventory orders.</Text>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Business Identity Information:</Text> Business name, type of entity, registration certificates, and Goods and Services Tax (GST) numbers.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Contact Data:</Text> Full names of owners/representatives (such as Jatin Sharma), billing address, shipping warehouse address, email addresses, and phone numbers.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Transaction Data:</Text> Records of stocklots purchased, invoices generated, bank transfer details, payment status, and order history.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Digital & Technical Data:</Text> Basic log data, device information, and communication history when you interact with our official digital channels or social media profiles.</Text></View>

          <Text style={s.sectionHeader}>2. How We Use Your Information</Text>
          <Text style={[s.bodyTxt, { marginBottom: -8 }]}>Your data is used strictly to facilitate smooth business operations and order fulfillment. We use your information to:</Text>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}>Verify business legitimacy and process GST-compliant invoices.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}>Coordinate freight, transport, and truckload (FTL) deliveries from our Mundka warehouse to your destination.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}>Broadcast live updates regarding new inventory arrivals, Amazon return lots, and liquidation stocks.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}>Respond to your B2B sourcing inquiries, price negotiations, and catalog requests.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}>Comply with Indian statutory legal and tax obligations.</Text></View>

          <Text style={s.sectionHeader}>3. Sharing and Disclosure of Information</Text>
          <Text style={[s.bodyTxt, { marginBottom: -8 }]}>We respect your privacy and do not sell, rent, or trade your data to third-party marketing firms. Information is shared only with trusted entities required to complete your transactions:</Text>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Logistics & Freight Partners:</Text> Transport agencies, truck operators, or delivery personnel tasked with moving your purchased inventory.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Third-Party B2B Platforms:</Text> Sourcing platforms like IndiaMART or social marketplaces like Meta (Facebook/Instagram) where you initiate contact, subject to their respective privacy terms.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Legal and Tax Authorities:</Text> Government or tax departments to comply with GST invoicing regulations, auditing, or valid legal warrants under Indian jurisdiction.</Text></View>

          <Text style={s.sectionHeader}>4. Data Security</Text>
          <Text style={[s.bodyTxt, { marginBottom: -8 }]}>We implement strict physical, technical, and administrative safeguards to protect your business information.</Text>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Warehouse Security:</Text> Visitor logs and restricted access areas protect sensitive operational data.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Digital Security:</Text> B2B transaction records and accounting details are stored on secure networks with restricted employee access.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}>While we strive to protect your personal data, no method of transmission over the internet or electronic storage is 100% secure. We encourage you to use secure networks when communicating payment details.</Text></View>

          <Text style={s.sectionHeader}>5. Cookies and Third-Party Links</Text>
          <Text style={s.bodyTxt}>Our online catalog or social media pages may utilize cookies to enhance user browsing experiences. Additionally, our digital touchpoints contain links to external sites (such as Google Maps, Instagram, and LinkedIn). We have no control over, and assume no responsibility for, the content or privacy practices of these external platforms.</Text>

          <Text style={s.sectionHeader}>6. Your Legal Rights</Text>
          <Text style={[s.bodyTxt, { marginBottom: -8 }]}>As a business owner or representative partnering with us, you retain the right to:</Text>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}>Review, correct, or update the business contact details we have on file.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}>Opt out of our digital broadcast channels or stock update messages.</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}>Request clarity on how your historical billing or delivery data is stored.</Text></View>

          <Text style={s.sectionHeader}>7. Changes to This Privacy Policy</Text>
          <Text style={s.bodyTxt}>We reserve the right to modify this Privacy Policy at any time to reflect updates in our wholesale operations or changes in compliance laws. Any modifications will be posted on this page with an updated "Last Updated" date.</Text>

          <Text style={s.sectionHeader}>8. Contact Our Grievance Officer</Text>
          <Text style={[s.bodyTxt, { marginBottom: -8 }]}>If you have any questions, concerns, or requests regarding this Privacy Policy or the handling of your business data, please contact us:</Text>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Company Name:</Text> HKS Enterprises</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Attn:</Text> Jatin Sharma</Text></View>
          <View style={s.bulletRow}><Text style={s.bulletDot}>•</Text><Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Address:</Text> Khasra No. 124/19, Mundka-Ranholla Road, Near Master Azad Farmhouse, Mundka, New Delhi, Delhi – 110041, India.</Text></View>
        </View>
      } />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#0F172A', paddingHorizontal: 12,
    paddingTop: Platform.OS === 'android' ? 12 : 4, paddingBottom: 12,
  },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 26, color: '#FFF', fontWeight: '700', lineHeight: 30, marginTop: -2 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#FFF' },

  // Hero Banner
  heroBanner: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 28,
    marginBottom: 0,
  },
  heroAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  avatarContainer: { position: 'relative' },
  avatarCircle: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#FFF', fontSize: 22, fontWeight: '800', letterSpacing: 1 },
  verifiedBadgeIcon: {
    position: 'absolute', bottom: -2, right: -2,
    backgroundColor: '#10B981', borderRadius: 12,
    width: 22, height: 22, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#0F172A',
  },
  editBadgeBtn: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8,
  },
  editBadgeTxt: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  heroName: { fontSize: 22, fontWeight: '800', color: '#FFF', marginBottom: 6, letterSpacing: -0.4 },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: '500', marginBottom: 3 },
  heroPhone: { fontSize: 13, color: 'rgba(255,255,255,0.45)', fontWeight: '500', marginBottom: 20 },
  membershipBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
  },
  membershipText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },

  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: '#64748B',
    letterSpacing: 0.5, marginTop: 24, marginBottom: 8,
    marginHorizontal: 16,
  },
  card: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 1 },
    }),
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 14 },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1E293B' },
  rowChevron: { fontSize: 20, color: '#CBD5E1', fontWeight: '700' },
  sep: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 16 },

  versionTxt: { textAlign: 'center', fontSize: 13, color: '#94A3B8', fontWeight: '500', paddingVertical: 12 },

  // Shared sheet
  sheetBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', paddingBottom: Platform.OS === 'ios' ? 34 : 20 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  closeTxt: { fontSize: 14, color: '#64748B', fontWeight: '700' },

  // OTP
  otpHint: { fontSize: 14, color: '#64748B', lineHeight: 20 },
  otpInput: { borderWidth: 2, borderColor: '#E2E8F0', borderRadius: 12, height: 56, fontSize: 28, fontWeight: '800', color: '#0F172A', letterSpacing: 12 },
  linkTxt: { fontSize: 14, color: '#1D4ED8', fontWeight: '600' },

  // Edit form
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
  textInput: { height: 46, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 14, fontSize: 14, color: '#0F172A', fontWeight: '500', backgroundColor: '#FFF' },
  inputDisabled: { backgroundColor: '#F8FAFC', color: '#94A3B8' },

  // Primary button
  primaryBtn: { backgroundColor: '#0F172A', borderRadius: 12, height: 50, alignItems: 'center', justifyContent: 'center' },
  primaryBtnTxt: { color: '#FFF', fontSize: 15, fontWeight: '800' },

  // Content
  bodyTxt: { fontSize: 14, color: '#475569', lineHeight: 24 },
  sectionHeader: { fontSize: 12, fontWeight: '800', color: '#0F172A', textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 16, marginBottom: 8, paddingLeft: 10, borderLeftWidth: 3, borderLeftColor: '#2563EB' },
  contactBlock: { backgroundColor: '#FFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  contactLabel: { fontSize: 13, color: '#64748B', fontWeight: '500', lineHeight: 20 },
  contactVal: { fontSize: 15, color: '#0F172A', fontWeight: '700', marginBottom: 4 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  actionRowLink: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', paddingRight: 10, marginBottom: 4 },
  bulletDot: { fontSize: 14, color: '#2563EB', fontWeight: '800', width: 16, marginTop: 2 },
  bulletText: { flex: 1, fontSize: 14, color: '#475569', lineHeight: 24 },
  faqItem: { backgroundColor: '#FFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  faqQ: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 8, lineHeight: 22 },
  faqA: { fontSize: 14, color: '#475569', lineHeight: 24 },
});
