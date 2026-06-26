import { supabase, isMockMode } from './SupabaseConfig';

export interface Category {
  id: string;
  name: string;        // normalised display label
  icon_name?: string | null; // filename in Supabase img bucket, e.g. "Electronics.png"
  sort_order?: number;
  has_stock: boolean;  // true if ≥1 lot is Available/In Stock in this category
}

export interface FetchCategoriesResult {
  data: Category[];
  error: string | null;
}

// ─── Fetch categories sorted: in-stock first (by sort_order), then no-stock ──
export const fetchCategories = async (): Promise<FetchCategoriesResult> => {
  if (isMockMode) {
    console.log('Mocking fetchCategories');
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      data: [
        { id: '1', name: 'Electronics', has_stock: true, sort_order: 1 },
        { id: '2', name: 'Clothing', has_stock: true, sort_order: 2 },
        { id: '3', name: 'Home & Furniture', has_stock: true, sort_order: 3 },
        { id: '4', name: 'Grocery', has_stock: false, sort_order: 4 },
        { id: '5', name: 'Beauty', has_stock: true, sort_order: 5 },
        { id: '6', name: 'Sports', has_stock: false, sort_order: 6 },
        { id: '7', name: 'Toys', has_stock: true, sort_order: 7 },
        { id: '8', name: 'Automotive', has_stock: false, sort_order: 8 },
        { id: '9', name: 'Footwear', has_stock: true, sort_order: 9 },
        { id: '10', name: 'Luggage', has_stock: true, sort_order: 10 },
        { id: '11', name: 'Stationary', has_stock: false, sort_order: 11 },
        { id: '12', name: 'Medical', has_stock: true, sort_order: 12 },
      ].sort((a, b) => {
        if (a.has_stock !== b.has_stock) return a.has_stock ? -1 : 1;
        return a.sort_order - b.sort_order;
      }),
      error: null
    };
  }

  try {
    // 1. All categories
    const { data: cats, error: catErr } = await supabase
      .from('categories')
      .select('*');

    if (catErr) return { data: [], error: catErr.message };
    if (!cats || cats.length === 0) return { data: [], error: null };

    // 2. Distinct category_ids that have available inventory
    const { data: stockRows } = await supabase
      .from('inventory_lots')
      .select('category_id')
      .in('stock_status', ['Available', 'available', 'In Stock', 'in stock']);

    const stockCatIds = new Set<string>(
      (stockRows ?? []).map((r: any) => String(r.category_id))
    );

    // 3. Normalise column names (schema-agnostic)
    const sample = cats[0];
    const labelKey =
      'title'         in sample ? 'title'         :
      'name'          in sample ? 'name'           :
      'label'         in sample ? 'label'          :
      'category_name' in sample ? 'category_name'  : null;

    const sortKey =
      'sort_order' in sample ? 'sort_order' :
      'sortOrder'  in sample ? 'sortOrder'  : null;

    const normalised: Category[] = cats.map((row: any) => ({
      id:         String(row.id),
      name:       labelKey ? String(row[labelKey]) : `Category ${row.id}`,
      icon_name:  row.icon_name ?? null,
      sort_order: sortKey  ? Number(row[sortKey])  : 999,
      has_stock:  stockCatIds.has(String(row.id)),
    }));

    // 4. Sort: in-stock first (by sort_order asc), then no-stock (by sort_order asc)
    normalised.sort((a, b) => {
      if (a.has_stock !== b.has_stock) return a.has_stock ? -1 : 1;
      return (a.sort_order ?? 999) - (b.sort_order ?? 999);
    });

    return { data: normalised, error: null };
  } catch (err) {
    return { data: [], error: String(err) };
  }
};
