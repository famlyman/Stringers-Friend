import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export interface InventoryItem {
  id: string;
  shop_id: string;
  category: string;
  brand: string;
  model: string;
  name: string;
  type: string;
  gauge: string;
  packaging?: string;
  total_length?: number;
  remaining_length?: number;
  quantity: number;
  low_stock_threshold: number;
  unit_price: number;
  color?: string;
  qr_code?: string;
}

export function useInventoryData(shopId: string | undefined) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInventory = async () => {
    if (!shopId) return;
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('shop_id', shopId);

    if (error) {
      console.error("Error fetching inventory:", error);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInventory();

    if (!shopId) return;

    const subscription = supabase
      .channel(`inventory:${shopId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'inventory', filter: `shop_id=eq.${shopId}` },
        () => fetchInventory()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [shopId]);

  const addItem = async (newItem: Partial<InventoryItem>) => {
    const { data, error } = await supabase
      .from('inventory')
      .insert({ ...newItem, shop_id: shopId })
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const updateItem = async (id: string, updates: Partial<InventoryItem>) => {
    const { error } = await supabase
      .from('inventory')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', id);

    if (error) throw error;
  };

  return { items, loading, addItem, updateItem, deleteItem, refreshInventory: fetchInventory };
}
