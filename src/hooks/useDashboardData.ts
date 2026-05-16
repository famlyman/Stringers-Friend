import { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { Job, Customer, Racquet, Message, InventoryItem, Shop } from "../types/database";

export interface DashboardData {
  jobs: Job[];
  customers: Customer[];
  racquets: Racquet[];
  messages: Message[];
  inventoryItems: InventoryItem[];
  inventoryStrings: InventoryItem[];
  shop: Shop | null;
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
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
}

export function useDashboardData(shopId: string | undefined): DashboardData {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [racquets, setRacquets] = useState<Racquet[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryStrings, setInventoryStrings] = useState<InventoryItem[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const fetchData = async () => {
    if (!shopId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const [
        { data: shopData },
        { data: jobsData },
        { data: customersData },
        { data: racquetsData },
        { data: messagesData },
        { data: inventoryData }
      ] = await Promise.all([
        supabase.from('shops').select('*').eq('id', shopId).single(),
        supabase.from('jobs').select('*, customers(first_name, last_name, email)').eq('shop_id', shopId).order('created_at', { ascending: false }),
        supabase.from('customers').select('*').eq('shop_id', shopId),
        supabase.from('racquets').select('*').eq('shop_id', shopId),
        supabase.from('messages').select('*, customers(first_name, last_name)').eq('shop_id', shopId).order('created_at', { ascending: false }),
        supabase.from('inventory').select('*').eq('shop_id', shopId).order('created_at', { ascending: false })
      ]);

      if (shopData) setShop(shopData);
      setJobs(jobsData || []);
      setCustomers(customersData || []);
      setRacquets(racquetsData || []);
      setMessages(messagesData || []);
      
      if (inventoryData) {
        setInventoryItems(inventoryData as InventoryItem[]);
        setInventoryStrings((inventoryData as InventoryItem[]).filter((i: InventoryItem) => (i as any).category === 'string' || (i as any).item_type === 'string'));
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
