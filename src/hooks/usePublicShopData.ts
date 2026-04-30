import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Shop, InventoryItem } from "../types/database";

export interface Service {
  id: string;
  name: string;
  price: number;
  description?: string;
}

export function usePublicShopData(slug: string | undefined, user: any) {
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [isCustomerOfShop, setIsCustomerOfShop] = useState(false);

  useEffect(() => {
    const fetchShop = async () => {
      if (!slug) return;
      setLoading(true);
      try {
        const { data: shops } = await supabase
          .from('shops')
          .select('*')
          .eq('slug', slug.toLowerCase())
          .single();

        if (shops) {
          const shopData = shops as Shop;
          setShop(shopData);
          
          const { data: inventory } = await supabase
            .from('inventory')
            .select('*')
            .eq('shop_id', shopData.id)
            .eq('category', 'string'); // Assuming category is the right column
            
          const servicesData = (inventory as InventoryItem[])?.map(item => ({
            id: item.id,
            name: `${item.brand} ${item.model}`,
            price: item.unit_price || 0,
            description: item.gauge ? `${item.gauge} gauge` : ''
          })) || [];
          setServices(servicesData);

          if (user) {
            const { data: customers } = await supabase
              .from('customers')
              .select('id')
              .eq('email', user.email || '')
              .eq('shop_id', shopData.id);
            setIsCustomerOfShop(!!customers && customers.length > 0);
          }
        } else {
          setError("Shop not found");
        }
      } catch (err: any) {
        console.error("Error fetching shop:", err);
        setError("Failed to load shop.");
      } finally {
        setLoading(false);
      }
    };

    fetchShop();
  }, [slug, user]);

  return { shop, loading, error, services, isCustomerOfShop, setIsCustomerOfShop };
}
