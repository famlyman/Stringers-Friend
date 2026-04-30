import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Customer, Racquet } from "../types/database";

export function useCustomerListData(shopId: string | undefined) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allRacquets, setAllRacquets] = useState<Racquet[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      // Parallelize fetches for better performance
      const [
        { data: customersData },
        { data: racquetsData }
      ] = await Promise.all([
        supabase.from('customers').select('*').eq('shop_id', shopId),
        supabase.from('racquets').select('*').eq('shop_id', shopId)
      ]);
      
      setCustomers((customersData || []) as Customer[]);
      setAllRacquets((racquetsData || []) as Racquet[]);
    } catch (err) {
      console.error("Error fetching customer list data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    if (!shopId) return;

    const customersSubscription = supabase
      .channel(`customers:${shopId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'customers', filter: `shop_id=eq.${shopId}` },
        () => fetchData()
      )
      .subscribe();

    const racquetsSubscription = supabase
      .channel(`racquets:${shopId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'racquets', filter: `shop_id=eq.${shopId}` },
        () => fetchData()
      )
      .subscribe();

    return () => {
      customersSubscription.unsubscribe();
      racquetsSubscription.unsubscribe();
    };
  }, [shopId]);

  return { customers, allRacquets, loading, refreshData: fetchData };
}
