export interface InventoryLot {
  id: string;
  title: string;
  category_id?: string;
  manifest_url?: string;
  bulk_price: number;
  stock_status: string;
  created_at: string;
  thumbnail_url?: string | null;   // resolved from first lot_image row
}
