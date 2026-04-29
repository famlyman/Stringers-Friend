import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useCustomerListData(shopId: string | undefined) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [allRacquets, setAllRacquets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const { data: customersData } = await supabase
        .from('customers')
        .select('*')
        .eq('shop_id', shopId);
      setCustomers(customersData || []);

      const { data: racquetsData } = await supabase
        .from('racquets')
        .select('*')
        .eq('shop_id', shopId);
      setAllRacquets(racquetsData || []);
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
