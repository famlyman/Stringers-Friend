import { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabase";

export interface DashboardData {
  jobs: any[];
  customers: any[];
  racquets: any[];
  messages: any[];
  inventoryItems: any[];
  inventoryStrings: any[];
  shop: any;
  loading: boolean;
  stats: {
    pendingJobs: number;
    inProgressJobs: number;
    completedJobs: number;
    totalRevenue: number;
    thisWeekJobs: number;
    totalCustomers: number;
  };
  refreshData: () => Promise<void>;
  setJobs: React.Dispatch<React.SetStateAction<any[]>>;
}

export function useDashboardData(shopId: string | undefined) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<any[]>([]);
  const [racquets, setRacquets] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [inventoryStrings, setInventoryStrings] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);

  const fetchData = async () => {
    if (!shopId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // Parallelize all initial data fetches to reduce total load time
      const [
        { data: shopData },
        { data: jobsData },
        { data: customersData },
        { data: racquetsData },
        { data: messagesData },
        { data: inventoryData }
      ] = await Promise.all([
        supabase.from('shops').select('*').eq('id', shopId).single(),
        supabase.from('jobs').select('*, customers!inner(first_name, last_name, email)').eq('shop_id', shopId).order('created_at', { ascending: false }),
        supabase.from('customers').select('*').eq('shop_id', shopId),
        supabase.from('racquets').select('*, customers!inner(shop_id)').eq('customers.shop_id', shopId),
        supabase.from('messages').select('*, customers!inner(first_name, last_name)').eq('shop_id', shopId).order('created_at', { ascending: false }),
        supabase.from('inventory').select('*').eq('shop_id', shopId).order('created_at', { ascending: false })
      ]);

      if (shopData) setShop(shopData);
      setJobs(jobsData || []);
      setCustomers(customersData || []);
      setRacquets(racquetsData || []);
      setMessages(messagesData || []);
      
      if (inventoryData) {
        setInventoryItems(inventoryData);
        setInventoryStrings(inventoryData.filter((i: any) => i.category === 'string'));
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    if (!shopId) return;

    const jobsSubscription = supabase
      .channel(`jobs:${shopId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs', filter: `shop_id=eq.${shopId}` },
        () => fetchData())
      .subscribe();

    const customersSubscription = supabase
      .channel(`customers:${shopId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers', filter: `shop_id=eq.${shopId}` },
        () => fetchData())
      .subscribe();

    const inventorySubscription = supabase
      .channel(`inventory:${shopId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'inventory', filter: `shop_id=eq.${shopId}` },
        () => fetchData()
      )
      .subscribe();

    return () => {
      jobsSubscription.unsubscribe();
      customersSubscription.unsubscribe();
      inventorySubscription.unsubscribe();
    };
  }, [shopId]);

  const stats = useMemo(() => {
    const pendingJobs = jobs.filter(j => j.status === 'pending').length;
    const inProgressJobs = jobs.filter(j => j.status === 'in_progress').length;
    const completedJobs = jobs.filter(j => j.status === 'completed').length;
    const totalRevenue = jobs.filter(j => j.status !== 'cancelled').reduce((sum, j) => sum + (j.total_price || 0), 0);
    const thisWeekJobs = jobs.filter(j => {
      const jobDate = new Date(j.created_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return jobDate >= weekAgo;
    }).length;
    
    return { 
      pendingJobs, 
      inProgressJobs, 
      completedJobs, 
      totalRevenue, 
      thisWeekJobs, 
      totalCustomers: customers.length 
    };
  }, [jobs, customers]);

  return {
    jobs,
    customers,
    racquets,
    messages,
    inventoryItems,
    inventoryStrings,
    shop,
    loading,
    stats,
    refreshData: fetchData,
    setJobs
  };
}
