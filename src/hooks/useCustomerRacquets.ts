import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useCustomerRacquets(customerId: string | undefined) {
  const [racquets, setRacquets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRacquets = async () => {
    if (!customerId) {
      setRacquets([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('racquets')
        .select('*')
        .eq('customer_id', customerId);

      if (error) throw error;
      setRacquets(data || []);
    } catch (err) {
      console.error("Error fetching customer racquets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRacquets();

    if (!customerId) return;

    const subscription = supabase
      .channel(`racquets:customer:${customerId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'racquets', filter: `customer_id=eq.${customerId}` },
        () => fetchRacquets()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [customerId]);

  return { racquets, loading, refreshRacquets: fetchRacquets };
}
