import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity,
  SafeAreaView, ScrollView, TextInput, Modal, Image,
} from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../services/SupabaseConfig';
import { resolveImgUrl } from '../../utils/StorageUtils';

// ─── Types ─────────────────────────────────────────────────────────────────────
type Tab = 'Users' | 'Categories' | 'Inventory Lots';
interface SortState    { field: string; dir: 'asc' | 'desc'; }
interface Profile      { id: string; phone_number?: string | null; phone?: string | null; full_name?: string | null; role?: string | null; }
interface Category     { id: string; label: string; icon_name?: string | null; sort_order?: number | null; }
interface InventoryLot { id: string; title: string; category_id?: string | null; bulk_price?: number; stock_status?: string; manifest_url?: string | null; created_at?: string; }
interface LotImage     { id: string; lot_id: string; url: string; sort_order?: number | null; }

// ─── Constants ─────────────────────────────────────────────────────────────────
const TABS: Tab[]   = ['Users', 'Categories', 'Inventory Lots'];
const PAGE_SIZE     = 10;
const STOCK_OPTS    = ['Available', 'Out of Stock'];
// All filenames stored in the Supabase 'img' bucket (avoids needing list() API / RLS)
const KNOWN_IMG_FILES = [
  'Automotive.png', 'Baby Care.png', 'Beauty, Health, Grocery.png', 'Clothing.png',
  'Electronics.png', 'FMCG.png', 'Footwear.png', 'Home and Furniture.png',
  'Kitchen.png', 'Luggage.png', 'Medical.png', 'Mens Fashion.png',
  'Mobile, Computer, Accessories.png', 'Movies, Music, Games.png',
  'Musical Instruments.png', 'Sports.png', 'Stationary.png',
  'TV, Appliances, Electronics.png', 'Tools and Hardware.png',
  'Toys.png', 'Watch.png', 'Womens Fashion.png', 'Logo.png',
];
// Add .png if icon_name has no extension (handles legacy data)
const normIconName = (n: string) => n.includes('.') ? n : `${n}.png`;
const ENTITY: Record<Tab, string> = { 'Users': 'User', 'Categories': 'Category', 'Inventory Lots': 'Inventory Lot' };

// ─── Sort helpers ──────────────────────────────────────────────────────────────
function sortData<T extends Record<string, any>>(data: T[], { field, dir }: SortState): T[] {
  return [...data].sort((a, b) => {
    const va = a[field] ?? '';
    const vb = b[field] ?? '';
    const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb));
    return dir === 'asc' ? cmp : -cmp;
  });
}
function nextSort(cur: SortState, field: string): SortState {
  return { field, dir: cur.field === field && cur.dir === 'asc' ? 'desc' : 'asc' };
}

// ─── ColHeader (sortable) ──────────────────────────────────────────────────────
const ColHeader: React.FC<{ label: string; field: string; sort: SortState; onSort: (f: string) => void; style?: any }> =
  ({ label, field, sort, onSort, style }) => (
    <TouchableOpacity onPress={() => onSort(field)} activeOpacity={0.7}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 3 }, style]}>
      <Text style={s.hdrTxt}>{label}</Text>
      <Text style={{ fontSize: 8, color: sort.field === field ? '#0F172A' : '#CBD5E1' }}>
        {sort.field === field ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}
      </Text>
    </TouchableOpacity>
  );

// ─── Pager ─────────────────────────────────────────────────────────────────────
const Pager: React.FC<{ page: number; total: number; pageSize: number; onChange: (p: number) => void }> =
  ({ page, total, pageSize, onChange }) => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (total <= pageSize) return null;
    return (
      <View style={pg.row}>
        <Text style={pg.info}>{page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}</Text>
        <TouchableOpacity style={[pg.btn, page === 0 && pg.off]} onPress={() => onChange(page - 1)} disabled={page === 0} activeOpacity={0.7}>
          <Text style={[pg.txt, page === 0 && pg.txtOff]}>‹ Prev</Text>
        </TouchableOpacity>
        <Text style={pg.cur}>{page + 1} / {totalPages}</Text>
        <TouchableOpacity style={[pg.btn, page >= totalPages - 1 && pg.off]} onPress={() => onChange(page + 1)} disabled={page >= totalPages - 1} activeOpacity={0.7}>
          <Text style={[pg.txt, page >= totalPages - 1 && pg.txtOff]}>Next ›</Text>
        </TouchableOpacity>
      </View>
    );
  };
const pg = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  info: { flex: 1, fontSize: 12, color: '#94A3B8' },
  btn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFF' },
  off:  { opacity: 0.35 },
  txt:  { fontSize: 12, color: '#374151', fontWeight: '600' },
  txtOff: { color: '#9CA3AF' },
  cur:  { fontSize: 12, color: '#374151', fontWeight: '600', minWidth: 48, textAlign: 'center' },
});

// ─── NativeSelect (web HTML <select>) ─────────────────────────────────────────
const NativeSelect: React.FC<{ value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string }> =
  ({ value, onChange, options, placeholder }) => {
    const Sel: any = 'select';
    const Opt: any = 'option';
    return (
      <Sel value={value} onChange={(e: any) => onChange(e.target.value)} style={selCss}>
        {placeholder ? <Opt value="" disabled>{placeholder}</Opt> : null}
        {options.map(o => <Opt key={o.value} value={o.value}>{o.label}</Opt>)}
      </Sel>
    );
  };
const selCss: any = { width: '100%', height: 42, paddingLeft: 12, fontSize: 14, color: '#0F172A', backgroundColor: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 8, outline: 'none', cursor: 'pointer', fontFamily: 'inherit' };

// ─── FormField / SelectField ───────────────────────────────────────────────────
const FormField: React.FC<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string; keyboardType?: any; hint?: string; required?: boolean }> =
  ({ label, value, onChange, placeholder, keyboardType = 'default', hint, required }) => (
    <View style={f.wrap}>
      <Text style={f.label}>{label}{required && <Text style={{ color: '#EF4444' }}> *</Text>}</Text>
      <TextInput style={f.input} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#94A3B8" keyboardType={keyboardType} autoCapitalize="none" autoCorrect={false} />
      {hint ? <Text style={f.hint}>{hint}</Text> : null}
    </View>
  );

const SelectField: React.FC<{ label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string; required?: boolean; hint?: string }> =
  ({ label, value, onChange, options, placeholder, required, hint }) => (
    <View style={f.wrap}>
      <Text style={f.label}>{label}{required && <Text style={{ color: '#EF4444' }}> *</Text>}</Text>
      <NativeSelect value={value} onChange={onChange} options={options} placeholder={placeholder} />
      {hint ? <Text style={f.hint}>{hint}</Text> : null}
    </View>
  );

const f = StyleSheet.create({
  wrap:  { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.6 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0F172A' },
  hint:  { fontSize: 11, color: '#94A3B8', marginTop: 4, fontStyle: 'italic' },
});

// ─── Web file-upload label + input helper ──────────────────────────────────────
const FileUploadBtn: React.FC<{ htmlFor: string; label: string; accept: string; multiple?: boolean; onChange: (files: FileList | null) => void; btnStyle?: any }> =
  ({ htmlFor, label, accept, multiple, onChange, btnStyle }) => {
    const Lbl: any = 'label';
    const Inp: any = 'input';
    const lStyle: any = { display: 'inline-flex', alignItems: 'center', gap: 6, paddingLeft: 14, paddingRight: 14, paddingTop: 8, paddingBottom: 8, backgroundColor: '#F1F5F9', borderRadius: 8, border: '1px solid #E2E8F0', cursor: 'pointer', fontSize: 13, color: '#374151', fontWeight: '600', fontFamily: 'inherit', ...btnStyle };
    return (
      <>
        <Lbl htmlFor={htmlFor} style={lStyle}>{label}</Lbl>
        <Inp id={htmlFor} type="file" accept={accept} multiple={!!multiple} style={{ display: 'none' }} onChange={(e: any) => onChange(e.target.files)} />
      </>
    );
  };

// ─── Main Component ────────────────────────────────────────────────────────────
interface Props { onLogout: () => void; onBack: () => void; }

export default function MasterDashboard({ onLogout, onBack }: Props) {

  const [profiles,   setProfiles]   = useState<Profile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [lots,       setLots]       = useState<InventoryLot[]>([]);
  const [images,     setImages]     = useState<LotImage[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [saving,     setSaving]     = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>('Users');

  const [usersQ,    setUsersQ]    = useState('');
  const [catsQ,     setCatsQ]     = useState('');
  const [lotsQ,     setLotsQ]     = useState('');
  const [usersSort, setUsersSort] = useState<SortState>({ field: 'phone_number', dir: 'asc' });
  const [catsSort,  setCatsSort]  = useState<SortState>({ field: 'sort_order',   dir: 'asc' });
  const [lotsSort,  setLotsSort]  = useState<SortState>({ field: 'title',        dir: 'asc' });
  const [usersPage, setUsersPage] = useState(0);
  const [catsPage,  setCatsPage]  = useState(0);
  const [lotsPage,  setLotsPage]  = useState(0);

  const [expandedLots,   setExpandedLots]   = useState<Set<string>>(new Set());
  const [uploadingLotId, setUploadingLotId] = useState<string | null>(null);
  const [lotImgErrors,   setLotImgErrors]   = useState<Map<string, string>>(new Map());

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId,    setEditingId]    = useState<string | null>(null);
  const [formError,    setFormError]    = useState<string | null>(null);
  const [confirmDel,   setConfirmDel]   = useState<{ id: string; label: string; table: string } | null>(null);

  const [showPicker,          setShowPicker]          = useState(false);
  const [catImgUploading,     setCatImgUploading]     = useState(false);
  const [sessionUploadedImgs, setSessionUploadedImgs] = useState<string[]>([]);

  const [catLabel,     setCatLabel]     = useState('');
  const [catIconName,  setCatIconName]  = useState('');
  const [catSortOrder, setCatSortOrder] = useState('');

  const [lotTitle,        setLotTitle]        = useState('');
  const [lotCategoryId,   setLotCategoryId]   = useState('');
  const [lotBulkPrice,    setLotBulkPrice]    = useState('');
  const [lotStockStatus,  setLotStockStatus]  = useState('Available');
  const [lotManifestFile, setLotManifestFile] = useState<File | null>(null);
  const [lotManifestName, setLotManifestName] = useState('');

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').limit(500);
    setProfiles(data ?? []);
    setLoading(false);
  }, []);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
    setCategories(data ?? []);
    setLoading(false);
  }, []);

  const fetchLots = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('inventory_lots').select('*').order('created_at', { ascending: false }).limit(500);
    setLots(data ?? []);
    setLoading(false);
  }, []);

  const fetchImages = useCallback(async () => {
    const { data } = await supabase.from('lot_images').select('*').order('sort_order', { ascending: true }).limit(2000);
    if (!data || data.length === 0) { setImages([]); return; }
    // Generate signed URLs so private-bucket images render in the browser
    const paths = data
      .map(img => { const m = img.url.match(/\/lotimg\/([^?]+)/); return m ? m[1] : null; })
      .filter(Boolean) as string[];
    if (paths.length > 0) {
      const { data: signed } = await supabase.storage.from('lotimg').createSignedUrls(paths, 7200);
      if (signed) {
        const signedMap = new Map(signed.filter(s => s.signedUrl).map(s => [s.path, s.signedUrl]));
        setImages(data.map(img => {
          const m = img.url.match(/\/lotimg\/([^?]+)/);
          const su = m ? signedMap.get(m[1]) : null;
          return su ? { ...img, url: su } : img;
        }));
        return;
      }
    }
    setImages(data);
  }, []);

  // Picker files: all known bucket images + any uploaded this session — no list() API call needed
  const pickerFiles = useMemo(() => {
    const all = [...new Set([...KNOWN_IMG_FILES, ...sessionUploadedImgs])];
    return all.map(name => ({
      name,
      url: supabase.storage.from('img').getPublicUrl(normIconName(name)).data.publicUrl,
    }));
  }, [sessionUploadedImgs]);

  // Upload a new image directly to the img bucket and select it
  const uploadCategoryImage = useCallback(async (files: FileList | null) => {
    if (!files?.[0]) return;
    const file = files[0];
    setCatImgUploading(true);
    setFormError(null);
    const safeName = file.name.replace(/[^a-zA-Z0-9 ._()-]/g, '_');
    const { error } = await supabase.storage.from('img').upload(safeName, file, { upsert: true, cacheControl: '3600' });
    if (error) {
      setFormError(`Image upload failed: ${error.message}`);
    } else {
      setCatIconName(safeName);
      setSessionUploadedImgs(prev => [...new Set([...prev, safeName])]);
    }
    setCatImgUploading(false);
  }, []);

  useEffect(() => { fetchProfiles(); fetchCategories(); fetchLots(); fetchImages(); }, []);

  useEffect(() => {
    if (activeTab === 'Users')           fetchProfiles();
    else if (activeTab === 'Categories') fetchCategories();
    else { fetchLots(); fetchImages(); }
  }, [activeTab]);

  const catLabelMap = useMemo(() => new Map(categories.map(c => [c.id, c.label])), [categories]);

  const filteredProfiles = useMemo(() => {
    if (!usersQ) return profiles;
    const q = usersQ.toLowerCase();
    return profiles.filter(p =>
      (p.phone_number || p.phone || '').includes(q) ||
      (p.full_name || '').toLowerCase().includes(q) ||
      (p.role || '').toLowerCase().includes(q)
    );
  }, [profiles, usersQ]);

  const filteredCats = useMemo(() => {
    if (!catsQ) return categories;
    const q = catsQ.toLowerCase();
    return categories.filter(c => c.label?.toLowerCase().includes(q) || (c.icon_name || '').toLowerCase().includes(q));
  }, [categories, catsQ]);

  const filteredLots = useMemo(() => {
    const base = lots.map(l => ({ ...l, _catLabel: catLabelMap.get(l.category_id ?? '') ?? '' }));
    if (!lotsQ) return base;
    const q = lotsQ.toLowerCase();
    return base.filter(l =>
      l.title?.toLowerCase().includes(q) ||
      l._catLabel.toLowerCase().includes(q) ||
      (l.stock_status || '').toLowerCase().includes(q)
    );
  }, [lots, lotsQ, catLabelMap]);

  const sortedProfiles = useMemo(() => sortData(filteredProfiles, usersSort), [filteredProfiles, usersSort]);
  const sortedCats     = useMemo(() => sortData(filteredCats,     catsSort),  [filteredCats, catsSort]);
  const sortedLots     = useMemo(() => {
    const field = lotsSort.field === 'category' ? '_catLabel' : lotsSort.field;
    return sortData(filteredLots, { field, dir: lotsSort.dir });
  }, [filteredLots, lotsSort]);

  const pagedProfiles = useMemo(() => sortedProfiles.slice(usersPage * PAGE_SIZE, (usersPage + 1) * PAGE_SIZE), [sortedProfiles, usersPage]);
  const pagedCats     = useMemo(() => sortedCats.slice(catsPage   * PAGE_SIZE, (catsPage  + 1) * PAGE_SIZE), [sortedCats, catsPage]);
  const pagedLots     = useMemo(() => sortedLots.slice(lotsPage   * PAGE_SIZE, (lotsPage  + 1) * PAGE_SIZE), [sortedLots, lotsPage]);

  const imagesByLot = useMemo(() => {
    const map = new Map<string, LotImage[]>();
    images.forEach(img => {
      const list = map.get(img.lot_id) ?? [];
      list.push(img);
      map.set(img.lot_id, [...list].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)));
    });
    return map;
  }, [images]);

  // ── Lot image actions ──────────────────────────────────────────────────────
  const uploadLotImages = useCallback(async (lotId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingLotId(lotId);
    const existing = imagesByLot.get(lotId) ?? [];
    const maxOrder = existing.length === 0 ? 0 : Math.max(...existing.map(i => i.sort_order ?? 0));
    const errList: string[] = [];
    await Promise.all(Array.from(files).map(async (file, idx) => {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const fileName = `${uuidv4()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('lotimg').upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (upErr) { errList.push(`${file.name}: ${upErr.message}`); return; }
      const { data: { publicUrl } } = supabase.storage.from('lotimg').getPublicUrl(fileName);
      const { error: insErr } = await supabase.from('lot_images').insert([{ id: uuidv4(), lot_id: lotId, filename: fileName, url: publicUrl, sort_order: maxOrder + idx + 1 }]);
      if (insErr) { errList.push(`${file.name} (DB): ${insErr.message}`); }
    }));
    setLotImgErrors(prev => { const m = new Map(prev); errList.length > 0 ? m.set(lotId, errList.join(' | ')) : m.delete(lotId); return m; });
    await fetchImages();
    setUploadingLotId(null);
  }, [imagesByLot, fetchImages]);

  const replaceImage = useCallback(async (img: LotImage, file: File | null) => {
    if (!file) return;
    const ext = file.name.split('.').pop() ?? 'jpg';
    const newName = `${uuidv4()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('lotimg').upload(newName, file, { cacheControl: '3600', upsert: false });
    if (upErr) {
      setLotImgErrors(prev => { const m = new Map(prev); m.set(img.lot_id, `Replace upload failed: ${upErr.message}`); return m; });
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from('lotimg').getPublicUrl(newName);
    const { data: updated, error: dbErr } = await supabase.from('lot_images').update({ filename: newName, url: publicUrl }).eq('id', img.id).select();
    if (dbErr || !updated || updated.length === 0) {
      setLotImgErrors(prev => { const m = new Map(prev); m.set(img.lot_id, `Replace failed (DB): ${dbErr?.message ?? 'No rows updated — check lot_images RLS policies.'}`); return m; });
      return;
    }
    const match = img.url.match(/\/lotimg\/([^?]+)/);
    if (match) supabase.storage.from('lotimg').remove([decodeURIComponent(match[1])]);
    await fetchImages();
  }, [fetchImages]);

  const deleteImage = useCallback(async (img: LotImage) => {
    setImages(prev => prev.filter(i => i.id !== img.id)); // optimistic remove
    const { data: deleted, error: dbErr } = await supabase.from('lot_images').delete().eq('id', img.id).select();
    if (dbErr || !deleted || deleted.length === 0) {
      // Revert — re-insert in correct sort position
      setImages(prev => [...prev, img].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)));
      const reason = dbErr?.message ?? 'No rows deleted — the lot_images table likely has RLS with no DELETE policy.';
      setLotImgErrors(prev => { const m = new Map(prev); m.set(img.lot_id, `Delete blocked: ${reason}\n\nFix — run in Supabase SQL Editor:\nGRANT DELETE ON lot_images TO anon, authenticated;\n-- OR disable RLS:\nALTER TABLE lot_images DISABLE ROW LEVEL SECURITY;`); return m; });
      return;
    }
    setLotImgErrors(prev => { const m = new Map(prev); m.delete(img.lot_id); return m; });
    const match = img.url.match(/\/lotimg\/([^?]+)/);
    if (match) supabase.storage.from('lotimg').remove([decodeURIComponent(match[1])]);
  }, []);

  const moveImage = useCallback(async (img: LotImage, dir: 'up' | 'down') => {
    const lotImgs = [...(imagesByLot.get(img.lot_id) ?? [])];
    const idx = lotImgs.findIndex(i => i.id === img.id);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= lotImgs.length) return;
    const swap = lotImgs[swapIdx];
    const newOrderA = swap.sort_order ?? swapIdx;
    const newOrderB = img.sort_order ?? idx;
    // Optimistic swap in local state so UI responds instantly
    setImages(prev => {
      const without = prev.filter(i => i.lot_id !== img.lot_id);
      const updated = lotImgs
        .map(i => i.id === img.id ? { ...i, sort_order: newOrderA } : i.id === swap.id ? { ...i, sort_order: newOrderB } : i)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      return [...without, ...updated];
    });
    const [r1, r2] = await Promise.all([
      supabase.from('lot_images').update({ sort_order: newOrderA }).eq('id', img.id).select(),
      supabase.from('lot_images').update({ sort_order: newOrderB }).eq('id', swap.id).select(),
    ]);
    const failed = r1.error ?? r2.error ?? (!r1.data?.length || !r2.data?.length ? new Error('No rows updated — RLS may be blocking UPDATE on lot_images.') : null);
    if (failed) {
      setLotImgErrors(prev => { const m = new Map(prev); m.set(img.lot_id, `Reorder blocked: ${(failed as any).message}\n\nFix — run in Supabase SQL Editor:\nGRANT UPDATE ON lot_images TO anon, authenticated;`); return m; });
      await fetchImages(); // revert to server state
    }
  }, [imagesByLot, fetchImages]);

  const uploadManifest = async (file: File): Promise<{ fileName: string | null; errMsg: string | null }> => {
    const fileName = `${uuidv4()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const { error } = await supabase.storage.from('Manifest').upload(fileName, file, { cacheControl: '3600', upsert: false });
    return error ? { fileName: null, errMsg: error.message } : { fileName, errMsg: null };
  };

  const resetCatForm = () => { setCatLabel(''); setCatIconName(''); setCatSortOrder(''); };
  const resetLotForm = () => { setLotTitle(''); setLotCategoryId(''); setLotBulkPrice(''); setLotStockStatus('Available'); setLotManifestFile(null); setLotManifestName(''); };

  const openCreate = () => {
    setEditingId(null); setFormError(null);
    if (activeTab === 'Categories')    resetCatForm();
    if (activeTab === 'Inventory Lots') resetLotForm();
    setModalVisible(true);
  };

  const openEdit = (item: any) => {
    setEditingId(item.id); setFormError(null);
    if (activeTab === 'Categories') {
      setCatLabel(item.label ?? ''); setCatIconName(item.icon_name ?? ''); setCatSortOrder(item.sort_order != null ? String(item.sort_order) : '');
    } else {
      setLotTitle(item.title ?? ''); setLotCategoryId(item.category_id ?? '');
      setLotBulkPrice(item.bulk_price != null ? String(item.bulk_price) : '');
      setLotStockStatus(item.stock_status ?? 'Available'); setLotManifestFile(null); setLotManifestName(item.manifest_url ?? '');
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    setSaving(true); setFormError(null);
    if (activeTab === 'Categories') {
      if (!catLabel.trim()) { setFormError('Label is required.'); setSaving(false); return; }
      const newCatId = editingId ?? uuidv4();
      const payload: any = { label: catLabel.trim(), icon_name: catIconName || null, sort_order: catSortOrder ? Number(catSortOrder) : null };
      const { error: e } = editingId
        ? await supabase.from('categories').update(payload).eq('id', editingId)
        : await supabase.from('categories').insert([{ ...payload, id: newCatId }]);
      if (e) { setFormError(e.message); setSaving(false); return; }
      // Optimistic update — table reflects change immediately without waiting for re-fetch
      setCategories(prev =>
        editingId
          ? prev.map(c => c.id === editingId ? { ...c, ...payload } : c)
          : [...prev, { id: newCatId, ...payload, has_stock: false }]
      );
      setSaving(false); setModalVisible(false);
      fetchCategories(); // background refresh to sync with DB
      return;
    } else if (activeTab === 'Inventory Lots') {
      if (!lotTitle.trim()) { setFormError('Title is required.'); setSaving(false); return; }
      let manifestName = lotManifestName.trim();
      if (lotManifestFile) {
        const { fileName: uploaded, errMsg: upErr } = await uploadManifest(lotManifestFile);
        if (!uploaded) { setFormError(`Manifest upload failed: ${upErr}`); setSaving(false); return; }
        manifestName = uploaded;
      }
      const payload: any = {
        title: lotTitle.trim(), category_id: lotCategoryId || null,
        bulk_price: lotBulkPrice ? Number(lotBulkPrice) : 0,
        stock_status: lotStockStatus, manifest_url: manifestName || null,
      };
      const { error: e } = editingId
        ? await supabase.from('inventory_lots').update(payload).eq('id', editingId)
        : await supabase.from('inventory_lots').insert([{ ...payload, id: uuidv4(), created_at: new Date().toISOString() }]);
      if (e) { setFormError(e.message); setSaving(false); return; }
      fetchLots();
    }
    setSaving(false); setModalVisible(false);
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    if (confirmDel.table === 'lot_images') {
      const img = images.find(i => i.id === confirmDel.id);
      if (img) await deleteImage(img);
      setConfirmDel(null);
    } else {
      const { error: e } = await supabase.from(confirmDel.table).delete().eq('id', confirmDel.id);
      if (e) { setFormError(e.message); return; } // error stays visible in the confirm modal
      // Optimistic removal from local state so table updates immediately
      if (confirmDel.table === 'categories')     setCategories(prev => prev.filter(c => c.id !== confirmDel.id));
      if (confirmDel.table === 'inventory_lots') setLots(prev => prev.filter(l => l.id !== confirmDel.id));
      setConfirmDel(null);
      if (activeTab === 'Categories')    fetchCategories();
      if (activeTab === 'Inventory Lots') fetchLots();
    }
  };

  const catOptions   = categories.map(c => ({ value: c.id, label: c.label }));
  const stockOptions = STOCK_OPTS.map(s => ({ value: s, label: s }));

  const countLabel = activeTab === 'Users'
    ? `${filteredProfiles.length} user${filteredProfiles.length !== 1 ? 's' : ''}`
    : activeTab === 'Categories'
    ? `${filteredCats.length} categor${filteredCats.length !== 1 ? 'ies' : 'y'}`
    : `${filteredLots.length} lot${filteredLots.length !== 1 ? 's' : ''}`;

  const renderSearch = (value: string, onChange: (v: string) => void, placeholder: string, onReset: () => void) => (
    <View style={s.searchBar}>
      <Text style={s.searchIcon}>🔍</Text>
      <TextInput
        style={s.searchInput} value={value} onChangeText={v => { onChange(v); onReset(); }}
        placeholder={placeholder} placeholderTextColor="#94A3B8" autoCapitalize="none" autoCorrect={false}
      />
      {value ? <TouchableOpacity onPress={() => { onChange(''); onReset(); }}><Text style={{ fontSize: 13, color: '#94A3B8', paddingRight: 4 }}>✕</Text></TouchableOpacity> : null}
    </View>
  );

  // ─── Users tab ─────────────────────────────────────────────────────────────
  const renderUsersTab = () => (
    <ScrollView style={{ flex: 1 }}>
      {renderSearch(usersQ, setUsersQ, 'Search by phone, name, role…', () => setUsersPage(0))}
      <View style={s.tableWrap}>
        <View style={[s.row, s.hdrRow]}>
          <ColHeader label="Phone" field="phone_number" sort={usersSort} onSort={f => { setUsersSort(nextSort(usersSort, f)); setUsersPage(0); }} style={{ flex: 2 }} />
          <ColHeader label="Name"  field="full_name"    sort={usersSort} onSort={f => { setUsersSort(nextSort(usersSort, f)); setUsersPage(0); }} style={{ flex: 2 }} />
          <ColHeader label="Role"  field="role"         sort={usersSort} onSort={f => { setUsersSort(nextSort(usersSort, f)); setUsersPage(0); }} style={{ width: 90 }} />
        </View>
        {pagedProfiles.map((p, i) => (
          <View key={p.id} style={[s.row, i % 2 !== 0 && s.altRow]}>
            <View style={{ flex: 2 }}>
              <Text style={[s.cell, s.bold]} numberOfLines={1}>{p.phone_number || p.phone || '—'}</Text>
              <Text style={[s.cell, s.mono]} numberOfLines={1}>{p.id}</Text>
            </View>
            <Text style={[s.cell, { flex: 2 }]} numberOfLines={1}>{p.full_name || '—'}</Text>
            <View style={{ width: 90 }}>
              <View style={[s.badge, { backgroundColor: p.role === 'master' ? '#FEF3C7' : '#EFF6FF' }]}>
                <Text style={[s.badgeTxt, { color: p.role === 'master' ? '#92400E' : '#1D4ED8' }]}>{p.role || 'user'}</Text>
              </View>
            </View>
          </View>
        ))}
        {pagedProfiles.length === 0 && !loading && <Text style={s.empty}>No users match your search.</Text>}
        <Pager page={usersPage} total={filteredProfiles.length} pageSize={PAGE_SIZE} onChange={setUsersPage} />
      </View>
      <TouchableOpacity style={s.signOutRow} onPress={onLogout} activeOpacity={0.7}>
        <Text style={s.signOutTxt}>Sign Out of Master Dashboard</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // ─── Categories tab ────────────────────────────────────────────────────────
  const renderCategoriesTab = () => (
    <ScrollView style={{ flex: 1 }}>
      {renderSearch(catsQ, setCatsQ, 'Search categories…', () => setCatsPage(0))}
      <View style={s.tableWrap}>
        <View style={[s.row, s.hdrRow]}>
          <View style={{ width: 52 }}><Text style={s.hdrTxt}>Image</Text></View>
          <ColHeader label="Label"     field="label"      sort={catsSort} onSort={f => { setCatsSort(nextSort(catsSort, f)); setCatsPage(0); }} style={{ flex: 2 }} />
          <ColHeader label="Icon File" field="icon_name"  sort={catsSort} onSort={f => { setCatsSort(nextSort(catsSort, f)); setCatsPage(0); }} style={{ flex: 2 }} />
          <ColHeader label="#"         field="sort_order" sort={catsSort} onSort={f => { setCatsSort(nextSort(catsSort, f)); setCatsPage(0); }} style={{ width: 48 }} />
          <Text style={[s.hdrTxt, { width: 108 }]}>Actions</Text>
        </View>
        {pagedCats.map((c, i) => (
          <View key={c.id} style={[s.row, i % 2 !== 0 && s.altRow]}>
            <View style={{ width: 52, alignItems: 'center' }}>
              {c.icon_name ? (
                <Image source={{ uri: resolveImgUrl(normIconName(c.icon_name)) ?? '' }} style={s.catThumb} resizeMode="contain" />
              ) : (
                <View style={[s.catThumb, { backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ fontSize: 16 }}>📁</Text>
                </View>
              )}
            </View>
            <Text style={[s.cell, s.bold, { flex: 2 }]} numberOfLines={1}>{c.label}</Text>
            <Text style={[s.cell, s.mono, { flex: 2, fontSize: 11 }]} numberOfLines={1}>{c.icon_name || '—'}</Text>
            <Text style={[s.cell, { width: 48, textAlign: 'center' }]}>{c.sort_order ?? '—'}</Text>
            <View style={[s.actions, { width: 108 }]}>
              <TouchableOpacity style={s.editBtn} onPress={() => openEdit(c)} activeOpacity={0.8}><Text style={s.editTxt}>✎ Edit</Text></TouchableOpacity>
              <TouchableOpacity style={s.delBtn}  onPress={() => { setFormError(null); setConfirmDel({ id: c.id, label: c.label, table: 'categories' }); }} activeOpacity={0.8}><Text style={s.delTxt}>✕</Text></TouchableOpacity>
            </View>
          </View>
        ))}
        {pagedCats.length === 0 && !loading && <Text style={s.empty}>No categories match your search.</Text>}
        <Pager page={catsPage} total={filteredCats.length} pageSize={PAGE_SIZE} onChange={setCatsPage} />
      </View>
    </ScrollView>
  );

  // ─── Expanded lot images panel ─────────────────────────────────────────────
  const renderExpandedLot = (lot: InventoryLot) => {
    const lotImages = imagesByLot.get(lot.id) ?? [];
    const uploading = uploadingLotId === lot.id;
    const uploadId  = `lot-up-${lot.id}`;
    return (
      <View style={s.expandedPanel}>
        <View style={s.expandedHeader}>
          <Text style={s.expandedTitle}>📸 Images ({lotImages.length})</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {uploading && <ActivityIndicator size="small" color="#0F172A" />}
            <FileUploadBtn
              htmlFor={uploadId} label="⬆ Upload Images" accept="image/*" multiple
              onChange={files => uploadLotImages(lot.id, files)}
              btnStyle={{ backgroundColor: '#0F172A', border: '1px solid #0F172A', color: '#FFF' }}
            />
          </View>
        </View>
        {lotImgErrors.has(lot.id) && (
          <View style={[s.errBox, { margin: 12, marginBottom: 0 }]}>
            <Text style={s.errTxt}>⚠️ {lotImgErrors.get(lot.id)?.split('\n\n')[0]}</Text>
            {lotImgErrors.get(lot.id)?.includes('\n\n') && (
              <View style={{ backgroundColor: '#1E1E1E', borderRadius: 6, padding: 10, marginTop: 6 }}>
                <Text style={{ fontFamily: 'monospace', fontSize: 11, color: '#D4D4D4', lineHeight: 18 }}>
                  {lotImgErrors.get(lot.id)!.split('\n\n').slice(1).join('\n\n')}
                </Text>
              </View>
            )}
          </View>
        )}
        {lotImages.length > 0 && !lotImgErrors.has(lot.id) && lotImages.every(i => !i.url) && (
          <View style={[s.errBox, { margin: 12, marginBottom: 0, backgroundColor: '#FEF9C3', borderColor: '#FDE68A' }]}>
            <Text style={{ fontSize: 12, color: '#92400E' }}>
              Images uploaded but not visible — the bucket may be private. Run in Supabase SQL Editor:{'\n'}
              <Text style={{ fontFamily: 'monospace' }}>UPDATE storage.buckets SET public = true WHERE id = 'lotimg';</Text>
            </Text>
          </View>
        )}
        {lotImages.length === 0 ? (
          <Text style={s.expandedEmpty}>No images yet. Click "⬆ Upload Images" to add photos.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 4 }}>
              {lotImages.map((img, idx) => {
                const replaceId = `rep-${img.id}`;
                return (
                  <View key={img.id} style={s.imgCard}>
                    <Image source={{ uri: img.url }} style={s.imgThumb} resizeMode="cover" />
                    <View style={s.imgOrderBadge}><Text style={s.imgOrderTxt}>#{idx + 1}</Text></View>
                    {idx === 0 && <Text style={s.thumbNote}>Thumbnail</Text>}
                    <View style={s.imgControls}>
                      <TouchableOpacity style={[s.imgCtrlBtn, idx === 0 && s.imgCtrlBtnOff]} onPress={() => moveImage(img, 'up')} disabled={idx === 0} activeOpacity={0.7}>
                        <Text style={s.imgCtrlTxt}>↑</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.imgCtrlBtn, idx === lotImages.length - 1 && s.imgCtrlBtnOff]} onPress={() => moveImage(img, 'down')} disabled={idx === lotImages.length - 1} activeOpacity={0.7}>
                        <Text style={s.imgCtrlTxt}>↓</Text>
                      </TouchableOpacity>
                      <FileUploadBtn
                        htmlFor={replaceId} label="🔄" accept="image/*"
                        onChange={files => replaceImage(img, files?.[0] ?? null)}
                        btnStyle={{ paddingLeft: 8, paddingRight: 8, paddingTop: 4, paddingBottom: 4, backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', fontSize: 12, borderRadius: 6 }}
                      />
                      <TouchableOpacity style={s.imgDelBtn} onPress={() => setConfirmDel({ id: img.id, label: `Image #${idx + 1}`, table: 'lot_images' })} activeOpacity={0.8}>
                        <Text style={s.imgDelTxt}>🗑</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}
      </View>
    );
  };

  // ─── Inventory Lots tab ────────────────────────────────────────────────────
  const renderLotsTab = () => (
    <ScrollView style={{ flex: 1 }}>
      {renderSearch(lotsQ, setLotsQ, 'Search by title, category, status…', () => setLotsPage(0))}
      <View style={s.tableWrap}>
        <View style={[s.row, s.hdrRow]}>
          <ColHeader label="Title"    field="title"        sort={lotsSort} onSort={f => { setLotsSort(nextSort(lotsSort, f)); setLotsPage(0); }} style={{ flex: 3 }} />
          <ColHeader label="Category" field="category"     sort={lotsSort} onSort={() => { setLotsSort(nextSort(lotsSort, 'category')); setLotsPage(0); }} style={{ flex: 2 }} />
          <ColHeader label="Price ₹"  field="bulk_price"   sort={lotsSort} onSort={f => { setLotsSort(nextSort(lotsSort, f)); setLotsPage(0); }} style={{ width: 110 }} />
          <ColHeader label="Status"   field="stock_status" sort={lotsSort} onSort={f => { setLotsSort(nextSort(lotsSort, f)); setLotsPage(0); }} style={{ width: 110 }} />
          <Text style={[s.hdrTxt, { width: 170 }]}>Actions</Text>
        </View>
        {pagedLots.map((l, i) => {
          const isExpanded = expandedLots.has(l.id);
          const catLbl = catLabelMap.get(l.category_id ?? '') ?? '—';
          const st = l.stock_status ?? 'Available';
          const stBg  = st === 'Available' ? '#DCFCE7' : '#FEE2E2';
          const stClr = st === 'Available' ? '#15803D' : '#B91C1C';
          const imgCount = (imagesByLot.get(l.id) ?? []).length;
          return (
            <React.Fragment key={l.id}>
              <View style={[s.row, i % 2 !== 0 && s.altRow]}>
                <View style={{ flex: 3 }}>
                  <Text style={[s.cell, s.bold]} numberOfLines={1}>{l.title}</Text>
                  {l.manifest_url && <Text style={[s.cell, { fontSize: 10, color: '#3B82F6' }]} numberOfLines={1}>📋 {l.manifest_url}</Text>}
                </View>
                <Text style={[s.cell, { flex: 2 }]} numberOfLines={1}>{catLbl}</Text>
                <Text style={[s.cell, { width: 110 }]}>₹{(l.bulk_price ?? 0).toLocaleString('en-IN')}</Text>
                <View style={{ width: 110 }}>
                  <View style={[s.badge, { backgroundColor: stBg }]}><Text style={[s.badgeTxt, { color: stClr }]}>{st}</Text></View>
                </View>
                <View style={[s.actions, { width: 170, flexWrap: 'wrap', gap: 4 }]}>
                  <TouchableOpacity
                    style={[s.imgToggleBtn, isExpanded && s.imgToggleBtnOn]}
                    onPress={() => setExpandedLots(prev => { const n = new Set(prev); n.has(l.id) ? n.delete(l.id) : n.add(l.id); return n; })}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.imgToggleTxt, isExpanded && s.imgToggleTxtOn]}>{isExpanded ? '▾ Images' : `📸${imgCount > 0 ? ` (${imgCount})` : ''}`}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.editBtn} onPress={() => openEdit(l)} activeOpacity={0.8}><Text style={s.editTxt}>✎ Edit</Text></TouchableOpacity>
                  <TouchableOpacity style={s.delBtn}  onPress={() => setConfirmDel({ id: l.id, label: l.title, table: 'inventory_lots' })} activeOpacity={0.8}><Text style={s.delTxt}>✕</Text></TouchableOpacity>
                </View>
              </View>
              {isExpanded && renderExpandedLot(l)}
            </React.Fragment>
          );
        })}
        {pagedLots.length === 0 && !loading && <Text style={s.empty}>No lots match your search.</Text>}
        <Pager page={lotsPage} total={filteredLots.length} pageSize={PAGE_SIZE} onChange={setLotsPage} />
      </View>
    </ScrollView>
  );

  // ─── Form content per tab ──────────────────────────────────────────────────
  const renderForm = () => {
    if (activeTab === 'Categories') {
      return (
        <>
          <FormField label="Label" value={catLabel} onChange={setCatLabel} placeholder="e.g. Electronics" required />
          <FormField label="Sort Order" value={catSortOrder} onChange={setCatSortOrder} placeholder="e.g. 1" keyboardType="numeric" hint="Lower number = appears first. In-stock categories always appear before out-of-stock." />
          <View style={f.wrap}>
            <Text style={f.label}>Category Image</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {catIconName ? (
                <Image source={{ uri: resolveImgUrl(catIconName.includes('.') ? catIconName : `${catIconName}.png`) ?? '' }} style={{ width: 60, height: 60, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }} resizeMode="contain" />
              ) : (
                <View style={{ width: 60, height: 60, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 26 }}>📷</Text>
                </View>
              )}
              <View style={{ flex: 1, gap: 6 }}>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  <TouchableOpacity style={s.pickerBtn} onPress={() => setShowPicker(true)} activeOpacity={0.8}>
                    <Text style={s.pickerBtnTxt}>🖼 Browse</Text>
                  </TouchableOpacity>
                  <FileUploadBtn
                    htmlFor="cat-img-upload"
                    label={catImgUploading ? '⏳ Uploading…' : '⬆ Upload New'}
                    accept="image/png,image/jpeg,image/webp"
                    onChange={uploadCategoryImage}
                    btnStyle={catImgUploading
                      ? { opacity: 0.6 }
                      : { backgroundColor: '#0F172A', border: 'none', color: '#FFF' }}
                  />
                </View>
                {catIconName ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[f.hint, { flex: 1 }]} numberOfLines={1}>{catIconName}</Text>
                    <TouchableOpacity onPress={() => setCatIconName('')}><Text style={{ color: '#DC2626', fontSize: 11 }}>✕ Clear</Text></TouchableOpacity>
                  </View>
                ) : null}
              </View>
            </View>
            <Text style={f.hint}>Images are served from the Supabase "img" storage bucket.</Text>
          </View>
        </>
      );
    }
    if (activeTab === 'Inventory Lots') {
      const manInputId = `manifest-upload-${editingId ?? 'new'}`;
      return (
        <>
          <FormField label="Title" value={lotTitle} onChange={setLotTitle} placeholder="e.g. Premium Smartphone Lot" required />
          <SelectField label="Category" value={lotCategoryId} onChange={setLotCategoryId} options={catOptions} placeholder="— Select a Category —" hint={catOptions.length === 0 ? 'Create a category first.' : undefined} />
          <FormField label="Bulk Price (₹)" value={lotBulkPrice} onChange={setLotBulkPrice} placeholder="e.g. 250000" keyboardType="numeric" required />
          <SelectField label="Stock Status" value={lotStockStatus} onChange={setLotStockStatus} options={stockOptions} required />
          <View style={f.wrap}>
            <Text style={f.label}>Manifest File</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <FileUploadBtn
                htmlFor={manInputId}
                label={lotManifestFile ? `📎 ${lotManifestFile.name}` : lotManifestName ? `📋 ${lotManifestName}` : '📎 Choose File'}
                accept=".csv,.txt,.xlsx,.xls,.pdf,.doc,.docx"
                onChange={files => {
                  if (files?.[0]) { setLotManifestFile(files[0]); setLotManifestName(files[0].name); }
                }}
              />
              {(lotManifestFile || lotManifestName) && (
                <TouchableOpacity onPress={() => { setLotManifestFile(null); setLotManifestName(''); }}>
                  <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '600' }}>✕ Clear</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={f.hint}>
              {lotManifestFile
                ? `📎 Ready to upload: ${lotManifestFile.name} (${(lotManifestFile.size / 1024).toFixed(1)} KB)`
                : lotManifestName
                ? `📋 Already saved: ${lotManifestName}`
                : 'Accepts CSV, Excel, PDF, DOC/DOCX. Uploaded to Supabase Storage → Manifest bucket on save.'}
            </Text>
          </View>
        </>
      );
    }
    return null;
  };

  const entityName = ENTITY[activeTab] ?? activeTab;

  return (
    <SafeAreaView style={s.root}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Master Dashboard</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Tab bar */}
      <View style={s.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity key={tab} style={[s.tab, activeTab === tab && s.activeTab]} onPress={() => setActiveTab(tab)} activeOpacity={0.75}>
            <Text style={[s.tabTxt, activeTab === tab && s.activeTabTxt]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Toolbar */}
      <View style={s.toolbar}>
        <Text style={s.toolbarCount}>{countLabel}</Text>
        {activeTab !== 'Users' && (
          <TouchableOpacity style={s.addBtn} onPress={openCreate} activeOpacity={0.85}>
            <Text style={s.addBtnTxt}>+ Add {entityName}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color="#0F172A" /></View>
      ) : (
        <View style={{ flex: 1 }}>
          {activeTab === 'Users'           && renderUsersTab()}
          {activeTab === 'Categories'      && renderCategoriesTab()}
          {activeTab === 'Inventory Lots'  && renderLotsTab()}
        </View>
      )}

      {/* Create/Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={s.overlay}>
          <View style={s.card}>
            <View style={s.cardHdr}>
              <Text style={s.cardTitle}>{editingId ? `Edit ${entityName}` : `New ${entityName}`}</Text>
              <TouchableOpacity style={s.cardClose} onPress={() => setModalVisible(false)} activeOpacity={0.7}>
                <Text style={s.cardCloseTxt}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={s.cardBody} contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
              {renderForm()}
              {formError && <View style={s.errBox}><Text style={s.errTxt}>⚠  {formError}</Text></View>}
            </ScrollView>
            <View style={s.cardFtr}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setModalVisible(false)} activeOpacity={0.7}>
                <Text style={s.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                {saving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={s.saveTxt}>{editingId ? 'Save Changes' : 'Create'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Picker Modal */}
      <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
        <View style={s.overlay}>
          <View style={[s.card, { maxWidth: 680 }]}>
            <View style={s.cardHdr}>
              <Text style={s.cardTitle}>Select Category Image</Text>
              <TouchableOpacity style={s.cardClose} onPress={() => setShowPicker(false)} activeOpacity={0.7}>
                <Text style={s.cardCloseTxt}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 480, padding: 16 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {pickerFiles.map(file => {
                  const isSelected = catIconName === file.name;
                  return (
                    <TouchableOpacity
                      key={file.name}
                      style={[s.pickerThumbWrap, isSelected && s.pickerThumbSelected]}
                      onPress={() => { setCatIconName(file.name); setShowPicker(false); }}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: file.url }} style={s.pickerThumb} resizeMode="contain" />
                      <Text style={s.pickerThumbName} numberOfLines={2}>{file.name.replace(/\.[^.]+$/, '')}</Text>
                      {isSelected && <View style={s.pickerCheck}><Text style={{ fontSize: 12, color: '#FFF' }}>✓</Text></View>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            <View style={s.cardFtr}>
              <TouchableOpacity style={[s.cancelBtn, { flex: 1 }]} onPress={() => setShowPicker(false)} activeOpacity={0.7}>
                <Text style={s.cancelTxt}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal visible={!!confirmDel} transparent animationType="fade" onRequestClose={() => setConfirmDel(null)}>
        <View style={s.overlay}>
          <View style={[s.card, { maxWidth: 420 }]}>
            <View style={s.cardHdr}>
              <Text style={[s.cardTitle, { color: '#DC2626' }]}>Confirm Delete</Text>
            </View>
            <View style={{ paddingHorizontal: 24, paddingVertical: 20 }}>
              <Text style={s.confirmTxt}>
                Permanently delete{'\n'}
                <Text style={{ fontWeight: '700', color: '#0F172A' }}>"{confirmDel?.label}"</Text>?{'\n\n'}
                This cannot be undone.
              </Text>
              {formError && <View style={[s.errBox, { marginTop: 10 }]}><Text style={s.errTxt}>⚠  {formError}</Text></View>}
            </View>
            <View style={s.cardFtr}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setConfirmDel(null); setFormError(null); }} activeOpacity={0.7}>
                <Text style={s.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.saveBtn, { backgroundColor: '#DC2626' }]} onPress={handleDelete} activeOpacity={0.85}>
                <Text style={s.saveTxt}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#F8FAFC' },
  header:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', paddingHorizontal: 16, paddingVertical: 13 },
  backBtn:     { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#D97706', alignItems: 'center', justifyContent: 'center' },
  backIcon:    { fontSize: 26, color: '#FFF', fontWeight: '700', lineHeight: 30, marginTop: -2 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#FFF', letterSpacing: 0.2 },
  tabBar:      { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  tab:         { flex: 1, paddingVertical: 13, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  activeTab:   { borderBottomColor: '#0F172A' },
  tabTxt:      { fontSize: 13, fontWeight: '500', color: '#94A3B8' },
  activeTabTxt:{ color: '#0F172A', fontWeight: '700' },
  toolbar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  toolbarCount: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  addBtn:       { backgroundColor: '#0F172A', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addBtnTxt:    { color: '#FFF', fontSize: 13, fontWeight: '600' },
  searchBar:   { flexDirection: 'row', alignItems: 'center', margin: 16, marginBottom: 8, backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 6 },
  searchIcon:  { fontSize: 14, marginRight: 6 },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A', paddingVertical: 4 },
  tableWrap: { marginHorizontal: 16, marginBottom: 16, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  row:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  hdrRow:    { backgroundColor: '#F8FAFC', borderBottomWidth: 2, borderBottomColor: '#E2E8F0', paddingVertical: 9 },
  altRow:    { backgroundColor: '#FAFAFA' },
  hdrTxt:    { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
  cell:      { fontSize: 13, color: '#334155', paddingRight: 8 },
  bold:      { fontWeight: '600', color: '#0F172A' },
  mono:      { fontSize: 11, color: '#94A3B8' },
  catThumb: { width: 36, height: 36, borderRadius: 6 },
  badge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, alignSelf: 'flex-start' },
  badgeTxt: { fontSize: 10, fontWeight: '700' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  editBtn: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#EFF6FF', borderRadius: 6 },
  editTxt: { fontSize: 11, color: '#1D4ED8', fontWeight: '600' },
  delBtn:  { width: 28, height: 28, borderRadius: 6, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' },
  delTxt:  { fontSize: 12, color: '#DC2626', fontWeight: '700' },
  imgToggleBtn:    { paddingHorizontal: 8, paddingVertical: 5, backgroundColor: '#F0FDF4', borderRadius: 6, borderWidth: 1, borderColor: '#BBF7D0' },
  imgToggleBtnOn:   { backgroundColor: '#DCFCE7', borderColor: '#4ADE80' },
  imgToggleTxt:     { fontSize: 11, color: '#15803D', fontWeight: '600' },
  imgToggleTxtOn:   { color: '#166534' },
  expandedPanel:  { backgroundColor: '#F8FAFC', borderTopWidth: 1, borderTopColor: '#E2E8F0', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  expandedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#F1F5F9' },
  expandedTitle:  { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  expandedEmpty:  { padding: 20, textAlign: 'center', color: '#94A3B8', fontSize: 13, fontStyle: 'italic' },
  imgCard:       { width: 130, backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  imgThumb:      { width: 130, height: 100, backgroundColor: '#E5E7EB' },
  imgOrderBadge: { position: 'absolute', top: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  imgOrderTxt:   { fontSize: 10, color: '#FFF', fontWeight: '700' },
  imgControls:   { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6, flexWrap: 'wrap' },
  imgCtrlBtn:    { width: 26, height: 26, borderRadius: 5, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  imgCtrlBtnOff: { opacity: 0.3 },
  imgCtrlTxt:    { fontSize: 13, color: '#374151', fontWeight: '700' },
  imgDelBtn:     { width: 26, height: 26, borderRadius: 5, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' },
  imgDelTxt:     { fontSize: 13 },
  thumbNote:     { fontSize: 10, color: '#D97706', fontWeight: '600', textAlign: 'center', paddingBottom: 4, backgroundColor: '#FEF3C7' },
  empty:  { padding: 32, textAlign: 'center', color: '#94A3B8', fontSize: 14, fontStyle: 'italic' },
  signOutRow: { margin: 20, marginTop: 4, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#FCA5A5', backgroundColor: '#FEF2F2', alignItems: 'center' },
  signOutTxt: { fontSize: 14, fontWeight: '600', color: '#DC2626' },
  overlay:   { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card:      { backgroundColor: '#FFF', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '90%', overflow: 'hidden' },
  cardHdr:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  cardClose: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  cardCloseTxt: { fontSize: 13, color: '#64748B', fontWeight: '700' },
  cardBody:  { paddingHorizontal: 24, paddingTop: 20, flexGrow: 0 },
  cardFtr:   { flexDirection: 'row', gap: 10, padding: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: '#E2E8F0', alignItems: 'center' },
  cancelTxt: { fontSize: 14, color: '#64748B', fontWeight: '600' },
  saveBtn:   { flex: 2, paddingVertical: 12, borderRadius: 10, backgroundColor: '#0F172A', alignItems: 'center' },
  saveTxt:   { fontSize: 14, color: '#FFF', fontWeight: '700' },
  errBox: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 8, padding: 12, marginBottom: 4 },
  errTxt: { fontSize: 13, color: '#DC2626', fontWeight: '500' },
  confirmTxt: { fontSize: 15, color: '#475569', lineHeight: 24, textAlign: 'center' },
  pickerBtn:    { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#F1F5F9', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  pickerBtnTxt: { fontSize: 13, color: '#374151', fontWeight: '600' },
  pickerThumbWrap:     { width: 110, alignItems: 'center', padding: 6, borderRadius: 10, borderWidth: 2, borderColor: '#E2E8F0', backgroundColor: '#FAFAFA' },
  pickerThumbSelected: { borderColor: '#0F172A', backgroundColor: '#F0F9FF' },
  pickerThumb:         { width: 80, height: 80, marginBottom: 4 },
  pickerThumbName:     { fontSize: 10, color: '#475569', textAlign: 'center', lineHeight: 13 },
  pickerCheck:         { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});