import { supabase, isMockMode } from './SupabaseConfig';
import { InventoryLot } from '../types/InventoryLot';
import { resolveLotImageUrl, resolveManifestUrl } from '../utils/StorageUtils';

export interface LotImage {
  id: string;
  lot_id: string;
  filename: string;   // bare name stored in DB
  url: string;        // resolved full public URL
  sort_order: number;
}

export interface FetchLotsOptions {
  categoryId?: string;
  searchQuery?: string;
  limit?: number;
}

export interface FetchLotsResult {
  data: InventoryLot[];
  error: string | null;
}

const mockLots: InventoryLot[] = [
  { id: '101', title: 'Premium Smartphone Lot', category_id: 1, bulk_price: 250000, stock_status: 'Available', created_at: new Date().toISOString(), thumbnail_url: 'https://picsum.photos/seed/101/400/300', manifest_url: 'mock_manifest.csv' },
  { id: '102', title: 'Designer Clothing Bundle', category_id: 2, bulk_price: 85000, stock_status: 'Available', created_at: new Date().toISOString(), thumbnail_url: 'https://picsum.photos/seed/102/400/300', manifest_url: 'mock_manifest.csv' },
  { id: '103', title: 'Modern Furniture Set', category_id: 3, bulk_price: 150000, stock_status: 'Available', created_at: new Date().toISOString(), thumbnail_url: 'https://picsum.photos/seed/103/400/300', manifest_url: 'mock_manifest.csv' },
  { id: '104', title: 'Cosmetics Surplus', category_id: 5, bulk_price: 45000, stock_status: 'Available', created_at: new Date().toISOString(), thumbnail_url: 'https://picsum.photos/seed/104/400/300', manifest_url: 'mock_manifest.csv' },
  { id: '105', title: 'Branded Footwear Pallet', category_id: 9, bulk_price: 120000, stock_status: 'Available', created_at: new Date().toISOString(), thumbnail_url: 'https://picsum.photos/seed/105/400/300', manifest_url: 'mock_manifest.csv' },
  { id: '106', title: 'Travel Luggage Clearance', category_id: 10, bulk_price: 65000, stock_status: 'Available', created_at: new Date().toISOString(), thumbnail_url: 'https://picsum.photos/seed/106/400/300', manifest_url: 'mock_manifest.csv' }
];

export const fetchInventoryLots = async (
  options: FetchLotsOptions = {}
): Promise<FetchLotsResult> => {
  if (isMockMode) {
    console.log('Mocking fetchInventoryLots');
    await new Promise(resolve => setTimeout(resolve, 500));
    let data = [...mockLots];
    if (options.categoryId) {
      data = data.filter(lot => String(lot.category_id) === String(options.categoryId));
    }
    if (options.searchQuery && options.searchQuery.trim() !== '') {
      data = data.filter(lot => lot.title.toLowerCase().includes(options.searchQuery!.toLowerCase()));
    }
    return { data: data.slice(0, options.limit || 60), error: null };
  }

  const { categoryId, searchQuery, limit = 60 } = options;

  try {
    let query = supabase
      .from('inventory_lots')
      .select(`
        id, title, category_id, bulk_price, stock_status, manifest_url, created_at,
        lot_images ( url, sort_order )
      `)
      .limit(limit)
      .order('created_at', { ascending: false });

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    if (searchQuery && searchQuery.trim().length > 0) {
      query = query.ilike('title', `%${searchQuery.trim()}%`);
    }

    const { data, error } = await query;

    if (error) return { data: [], error: error.message };

    const resolved = (data ?? []).map((lot: any) => {
      // Sort images and pick the first as thumbnail
      const imgs: { url: string; sort_order: number }[] = lot.lot_images ?? [];
      imgs.sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      const firstImg = imgs[0]?.url ?? null;

      return {
        ...lot,
        manifest_url: resolveManifestUrl(lot.manifest_url),
        thumbnail_url: resolveLotImageUrl(firstImg),
        lot_images: undefined,   // strip nested relation from the typed object
      };
    });

    return { data: resolved as InventoryLot[], error: null };
  } catch (err) {
    return { data: [], error: String(err) };
  }
};

/** Fetch all images for a single lot from the lot_images table */
export const fetchLotImages = async (lotId: string): Promise<LotImage[]> => {
  if (isMockMode) {
    console.log(`[LotImages] Mocking images for lot: ${lotId}`);
    await new Promise(resolve => setTimeout(resolve, 300));
    return [
      { id: 'img1', lot_id: lotId, filename: 'mock1.jpg', url: `https://picsum.photos/seed/${lotId}A/600/400`, sort_order: 1 },
      { id: 'img2', lot_id: lotId, filename: 'mock2.jpg', url: `https://picsum.photos/seed/${lotId}B/600/400`, sort_order: 2 }
    ];
  }

  try {
    console.log(`[LotImages] Fetching images for lot: ${lotId}`);

    const { data, error } = await supabase
      .from('lot_images')
      .select('id, lot_id, url, sort_order')   // 'url' = bare filename in DB
      .eq('lot_id', lotId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.warn(`[LotImages] Supabase error:`, error.message, error.code);
      return [];
    }

    console.log(`[LotImages] Rows returned: ${data?.length ?? 0}`, data);

    if (!data || data.length === 0) return [];

    const mapped = data.map((row: any) => ({
      id:         row.id,
      lot_id:     row.lot_id,
      filename:   row.url,
      url:        resolveLotImageUrl(row.url) ?? '',
      sort_order: row.sort_order ?? 0,
    }));

    console.log(`[LotImages] Resolved URLs:`, mapped.map(m => m.url));
    return mapped;
  } catch (err) {
    console.error(`[LotImages] Unexpected error:`, err);
    return [];
  }
};

// ─── Quick search: top 8 lots matching the query (for home search overlay) ──
export const quickSearch = async (query: string): Promise<InventoryLot[]> => {
  if (isMockMode) {
    if (!query || query.trim().length < 2) return [];
    console.log('Mocking quickSearch');
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockLots
      .filter(lot => lot.title.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 8);
  }

  if (!query || query.trim().length < 2) return [];
  try {
    const { data, error } = await supabase
      .from('inventory_lots')
      .select(`
        id, title, category_id, bulk_price, stock_status, manifest_url, created_at,
        lot_images ( url, sort_order )
      `)
      .ilike('title', `%${query.trim()}%`)
      .limit(8);

    if (error || !data) return [];

    return data.map((lot: any) => {
      const imgs = (lot.lot_images ?? []).sort(
        (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
      );
      return {
        ...lot,
        manifest_url:  resolveManifestUrl(lot.manifest_url),
        thumbnail_url: resolveLotImageUrl(imgs[0]?.url ?? null),
        lot_images:    undefined,
      } as InventoryLot;
    });
  } catch {
    return [];
  }
};
