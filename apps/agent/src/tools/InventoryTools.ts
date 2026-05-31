import { supabase } from '../services/SupabaseConfig';

/**
 * Tool Contract: InventoryTools
 * Provides strictly typed tool definitions for the Rule-Based Agentic AI.
 */

export const check_live_stock = async (sku: string): Promise<string> => {
  console.log(`[Security Audit] Tool check_live_stock invoked for SKU: ${sku}`);
  
  try {
    const { data, error } = await supabase
      .from('inventory_lots')
      .select('stock_status')
      .eq('id', sku)
      .single();

    if (error || !data) {
      console.warn(`[Security Audit] check_live_stock query failed for SKU: ${sku}`, error?.message);
      return "Product Not Found"; // Hostile Auditor constraint: Zero hallucination on missing SKUs
    }

    return data.stock_status;
  } catch (error) {
    console.error(`[Security Audit] Exception in check_live_stock:`, error);
    return "Product Not Found";
  }
};

export const get_bulk_price = async (sku: string): Promise<number> => {
  console.log(`[Security Audit] Tool get_bulk_price invoked for SKU: ${sku}`);
  
  try {
    const { data, error } = await supabase
      .from('inventory_lots')
      .select('bulk_price')
      .eq('id', sku)
      .single();

    if (error || !data) {
      console.warn(`[Security Audit] get_bulk_price query failed for SKU: ${sku}`, error?.message);
      return 0; // Hostile Auditor constraint: Never guess prices, return 0 if invalid
    }

    return Number(data.bulk_price);
  } catch (error) {
    console.error(`[Security Audit] Exception in get_bulk_price:`, error);
    return 0;
  }
};
