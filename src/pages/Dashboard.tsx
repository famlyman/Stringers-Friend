import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { RACQUET_BRANDS, RACQUET_MODELS, STRINGS, GAUGES } from "../constants";
import { Plus, Search, Filter, CheckCircle2, Clock, PlayCircle, CreditCard, X, Trash2, Users, Briefcase, Edit2, ChevronRight, ChevronDown, Printer, Package, MessageSquare, Mail, Phone, Send, Scan, AlertTriangle, History, RefreshCw } from "lucide-react";
import QRCodeDisplay from "../components/QRCodeDisplay";
import { QrScanner } from "../components/QrScanner";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { safeFormatDate } from "../lib/utils";
import { v4 as uuidv4 } from "uuid";

export default function Dashboard({ user, initialTab = 'jobs' }: { user: any, initialTab?: 'jobs' | 'customers' | 'messages' | 'inventory' }) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showNewJob, setShowNewJob] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'jobs' | 'customers' | 'messages' | 'inventory'>(initialTab);
  const [customers, setCustomers] = useState<any[]>([]);
  const [racquets, setRacquets] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [inventoryStrings, setInventoryStrings] = useState<any[]>([]);

  // Fetch inventory
  useEffect(() => {
    if (!user.shop_id) return;

    const fetchInventory = async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('shop_id', user.shop_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching inventory:", error);
      } else {
        setInventoryItems(data || []);
        setInventoryStrings((data || []).filter((i: any) => i.item_type === 'string'));
      }
    };

    fetchInventory();

    const subscription = supabase
      .channel(`inventory:${user.shop_id}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'inventory', filter: `shop_id=eq.${user.shop_id}` },
        () => fetchInventory()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user.shop_id]);

  // Fetch all data
  useEffect(() => {
    if (!user || !user.shop_id) return;

    const fetchData = async () => {
      setLoading(true);
      
      // Fetch Shop
      const { data: shopData } = await supabase
        .from('shops')
        .select('*')
        .eq('id', user.shop_id)
        .single();
      if (shopData) setShop(shopData);

      // Fetch Jobs
      const { data: jobsData } = await supabase
        .from('stringing_jobs')
        .select('*')
        .eq('shop_id', user.shop_id)
        .order('created_at', { ascending: false });
      if (jobsData) setJobs(jobsData);

      // Fetch Customers
      const { data: customersData } = await supabase
        .from('customers')
        .select('*')
        .eq('shop_id', user.shop_id);
      if (customersData) setCustomers(customersData);

      // Fetch Racquets
      const { data: racquetsData } = await supabase
        .from('racquets')
        .select('*, customers!inner(shop_id)')
        .eq('customers.shop_id', user.shop_id);
      if (racquetsData) setRacquets(racquetsData);

      setLoading(false);
    };

    fetchData();

    const jobsSubscription = supabase
      .channel(`jobs:${user.shop_id}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'stringing_jobs', filter: `shop_id=eq.${user.shop_id}` },
        () => fetchData()
      )
      .subscribe();

    const customersSubscription = supabase
      .channel(`customers:${user.shop_id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'customers', filter: `shop_id=eq.${user.shop_id}` },
        () => fetchData()
      )
      .subscribe();

    return () => {
      jobsSubscription.unsubscribe();
      customersSubscription.unsubscribe();
    };
  }, [user.shop_id]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text-main mb-2">Dashboard</h1>
        <p className="text-text-muted">Manage your stringing business</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6">
        {(['jobs', 'customers', 'messages', 'inventory'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab
                ? 'bg-primary text-white'
                : 'text-text-muted hover:text-text-main hover:bg-bg-card'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Jobs Tab */}
      {activeTab === 'jobs' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Jobs</h2>
            <button
              onClick={() => setShowNewJob(true)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              New Job
            </button>
          </div>
          
          {jobs.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No jobs yet</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {jobs.map((job) => (
                <div key={job.id} className="bg-bg-card rounded-lg p-4 border border-border-main">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-text-main">{job.customer_name}</h3>
                      <p className="text-sm text-text-muted">{job.service_type}</p>
                      <p className="text-xs text-text-muted mt-1">
                        {safeFormatDate(job.created_at)}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      job.status === 'completed' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : job.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                    }`}>
                      {job.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Customers Tab */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Customers</h2>
          
          {customers.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No customers yet</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {customers.map((customer) => (
                <div key={customer.id} className="bg-bg-card rounded-lg p-4 border border-border-main">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-text-main">{customer.name}</h3>
                      <p className="text-sm text-text-muted">{customer.email}</p>
                      {customer.phone && (
                        <p className="text-sm text-text-muted">{customer.phone}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Messages</h2>
          <div className="text-center py-12 text-text-muted">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Messages feature coming soon</p>
          </div>
        </div>
      )}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Inventory</h2>
          
          {inventoryItems.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No inventory items yet</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {inventoryItems.map((item) => (
                <div key={item.id} className="bg-bg-card rounded-lg p-4 border border-border-main">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-text-main">{item.name}</h3>
                      <p className="text-sm text-text-muted">{item.brand}</p>
                      <p className="text-sm text-text-muted">Quantity: {item.quantity}</p>
                    </div>
                    <span className="text-lg font-medium text-primary">
                      ${item.price}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Job Modal - Disabled for now */}
      {showNewJob && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-bg-card rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Create New Job</h3>
            <p className="text-text-muted mb-4">
              Job creation is temporarily disabled during migration.
            </p>
            <button
              onClick={() => setShowNewJob(false)}
              className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
