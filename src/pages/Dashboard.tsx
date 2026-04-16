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
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  
  // New Job Form State
  const [newJob, setNewJob] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    racquet_brand: "",
    racquet_model: "",
    racquet_brand_custom: "",
    racquet_model_custom: "",
    racquet_serial: "",
    racquet_head_size: "",
    racquet_mains: "",
    racquet_crosses: "",
    racquet_mains_skip: "",
    racquet_mains_tie_off: "",
    racquet_crosses_start: "",
    racquet_crosses_tie_off: "",
    racquet_one_piece_length: "",
    racquet_two_piece_length: "",
    racquet_stringing_instructions: "",
    string_main_brand: "",
    string_main_model: "",
    string_main_brand_custom: "",
    string_main_model_custom: "",
    string_main_gauge: "",
    string_cross_brand: "Same as Mains",
    string_cross_model: "Same as Mains",
    string_cross_brand_custom: "",
    string_cross_model_custom: "",
    string_cross_gauge: "",
    tension_main: 0,
    tension_cross: 0,
    price: 25,
    service_type: "string_full_bed",
    custom_service_category: "string",
    additional_service_request: "",
    notes: "",
    keep_same_string: false,
    string_main: "",
    string_cross: ""
  });
  
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedRacquetId, setSelectedRacquetId] = useState("");
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [isNewRacquet, setIsNewRacquet] = useState(false);
  const [selectedInventoryId, setSelectedInventoryId] = useState("");
  const [selectedCrossInventoryId, setSelectedCrossInventoryId] = useState("");

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      if (!user.shop_id) throw new Error("Shop ID is missing. Please check your profile.");

      let finalCustomerId = selectedCustomerId;
      let finalRacquetId = selectedRacquetId;
      let finalCustomerEmail = newJob.customer_email;
      let finalCustomerName = newJob.customer_name;

      // Handle customer
      if (isNewCustomer) {
        if (!newJob.customer_name || !newJob.customer_email) {
          throw new Error("Customer name and email are required.");
        }
        
        const nameParts = newJob.customer_name.trim().split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || '';
        
        const { data: existingCustomers } = await supabase
          .from('customers')
          .select('id')
          .eq('email', newJob.customer_email)
          .eq('shop_id', user.shop_id);
        
        if (existingCustomers && existingCustomers.length > 0) {
          finalCustomerId = existingCustomers[0].id;
        } else {
          const { data: newCustomerData, error: customerError } = await supabase
            .from('customers')
            .insert({
              shop_id: user.shop_id,
              first_name: firstName,
              last_name: lastName,
              email: newJob.customer_email,
              phone: newJob.customer_phone,
            })
            .select()
            .single();
          
          if (customerError) throw customerError;
          finalCustomerId = newCustomerData.id;
        }
        finalCustomerEmail = newJob.customer_email;
        finalCustomerName = newJob.customer_name;
      } else if (selectedCustomerId) {
        const customer = customers.find(c => c.id === selectedCustomerId);
        if (customer) {
          finalCustomerEmail = customer.email;
          finalCustomerName = `${customer.first_name} ${customer.last_name}`;
        }
      } else {
        throw new Error("Please select a customer or add a new one.");
      }

      // Handle racquet
      if (isNewRacquet || !selectedRacquetId) {
        finalRacquetId = uuidv4();
        const brand = newJob.racquet_brand === "Other" ? newJob.racquet_brand_custom : newJob.racquet_brand;
        const model = newJob.racquet_model === "Other" ? newJob.racquet_model_custom : newJob.racquet_model;
        
        if (!brand || !model) throw new Error("Racquet brand and model are required.");

        await supabase
          .from('racquets')
          .insert({
            id: finalRacquetId,
            customer_id: finalCustomerId,
            shop_id: user.shop_id,
            brand,
            model,
            serial_number: newJob.racquet_serial,
            qr_code_id: `racquet_${finalRacquetId}`,
            notes: '',
            created_at: new Date().toISOString()
          });
      } else {
        finalRacquetId = selectedRacquetId;
      }

      // Create job
      const jobId = uuidv4();
      await supabase
        .from('jobs')
        .insert({
          id: jobId,
          customer_id: finalCustomerId,
          racquet_id: finalRacquetId,
          shop_id: user.shop_id,
          status: 'pending',
          payment_status: 'unpaid',
          total_price: Number(newJob.price),
          notes: newJob.notes,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      // Create job_details for the stringing service
      const { data: inventoryItem } = await supabase
        .from('inventory')
        .select('id')
        .eq('shop_id', user.shop_id)
        .eq('brand', newJob.string_main_brand)
        .eq('model', newJob.string_main_model)
        .eq('gauge', newJob.string_main_gauge)
        .eq('category', 'string')
        .single();

      await supabase
        .from('job_details')
        .insert({
          job_id: jobId,
          item_type: newJob.service_type === 'string_full_bed' ? 'main_string' : 
                    newJob.service_type === 'string_mains_only' ? 'main_string' :
                    newJob.service_type === 'string_crosses_only' ? 'cross_string' : 'service',
          inventory_id: inventoryItem?.id || null,
          tension: `${newJob.tension_main}/${newJob.tension_cross}`,
          price: Number(newJob.price),
          created_at: new Date().toISOString()
        });

      // Reset form
      setShowNewJob(false);
      setNewJob({
        customer_name: "",
        customer_email: "",
        customer_phone: "",
        racquet_brand: "",
        racquet_model: "",
        racquet_brand_custom: "",
        racquet_model_custom: "",
        racquet_serial: "",
        racquet_head_size: "",
        racquet_mains: "",
        racquet_crosses: "",
        racquet_mains_skip: "",
        racquet_mains_tie_off: "",
        racquet_crosses_start: "",
        racquet_crosses_tie_off: "",
        racquet_one_piece_length: "",
        racquet_two_piece_length: "",
        racquet_stringing_instructions: "",
        string_main_brand: "",
        string_main_model: "",
        string_main_brand_custom: "",
        string_main_model_custom: "",
        string_main_gauge: "",
        string_cross_brand: "Same as Mains",
        string_cross_model: "Same as Mains",
        string_cross_brand_custom: "",
        string_cross_model_custom: "",
        string_cross_gauge: "",
        tension_main: 0,
        tension_cross: 0,
        price: 25,
        service_type: "string_full_bed",
        custom_service_category: "string",
        additional_service_request: "",
        notes: "",
        keep_same_string: false,
        string_main: "",
        string_cross: ""
      });
      setSelectedCustomerId("");
      setSelectedRacquetId("");
      setIsNewCustomer(false);
      setIsNewRacquet(false);
      
    } catch (err: any) {
      console.error("Error creating job:", err);
      setError(err.message || "Failed to create job");
    } finally {
      setSubmitting(false);
    }
  };

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
    if (!user || !user.shop_id) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      
      try {
        // Fetch Shop
        const { data: shopData } = await supabase
          .from('shops')
          .select('*')
          .eq('id', user.shop_id)
          .single();
        if (shopData) setShop(shopData);

        // Fetch Jobs
        const { data: jobsData } = await supabase
          .from('jobs')
          .select('*, customers!inner(first_name, last_name, email)')
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

        // Fetch Messages
        const { data: messagesData } = await supabase
          .from('messages')
          .select('*, customers!inner(first_name, last_name)')
          .eq('shop_id', user.shop_id)
          .order('created_at', { ascending: false });
        if (messagesData) setMessages(messagesData);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const jobsSubscription = supabase
      .channel(`jobs:${user.shop_id}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'jobs', filter: `shop_id=eq.${user.shop_id}` },
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

    const messagesSubscription = supabase
      .channel(`messages:${user.shop_id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `shop_id=eq.${user.shop_id}` },
        () => fetchData()
      )
      .subscribe();

    return () => {
      jobsSubscription.unsubscribe();
      customersSubscription.unsubscribe();
      messagesSubscription.unsubscribe();
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
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-text-main mb-2">Dashboard</h1>
          <p className="text-text-muted">Manage your stringing business</p>
        </div>
        {shop && (
          <div className="flex flex-col items-center">
            <QRCodeDisplay 
              value={shop.qr_code || shop.slug} 
              label="Shop QR" 
              shopName={shop.name}
              shopPhone={shop.phone}
              minimal={true}
            />
            <p className="text-xs text-text-muted mt-2">Scan to join shop</p>
          </div>
        )}
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
                      <h3 className="font-medium text-text-main">{job.customers?.first_name} {job.customers?.last_name}</h3>
                      <p className="text-sm text-text-muted">{job.service_type}</p>
                      <p className="text-xs text-text-muted mt-1">
                        {safeFormatDate(job.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <select
                        value={job.status}
                        onChange={async (e) => {
                          const newStatus = e.target.value;
                          try {
                            await supabase
                              .from('jobs')
                              .update({ 
                                status: newStatus,
                                updated_at: new Date().toISOString()
                              })
                              .eq('id', job.id);
                            
                            // Update local state
                            setJobs(jobs.map(j => 
                              j.id === job.id ? { ...j, status: newStatus } : j
                            ));
                          } catch (error) {
                            console.error('Error updating job status:', error);
                          }
                        }}
                        className={`px-2 py-1 rounded-full text-xs font-medium border ${
                          job.status === 'completed' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-700'
                            : job.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300 dark:border-blue-700'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-300 dark:border-gray-700'
                        }`}
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
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
          
          {messages.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No messages yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className="bg-bg-card rounded-lg p-4 border border-border-main">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-text-main">
                        {msg.customers?.first_name} {msg.customers?.last_name}
                      </p>
                      <p className="text-sm text-text-muted mt-1">{msg.content}</p>
                      <p className="text-xs text-text-muted mt-2">
                        {safeFormatDate(msg.created_at)}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      msg.sender_type === 'shop' 
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-secondary/20 text-secondary'
                    }`}>
                      {msg.sender_type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                      <h3 className="font-medium text-text-main">{item.brand} {item.model}</h3>
                      <p className="text-sm text-text-muted">{item.brand}</p>
                      <p className="text-sm text-text-muted">Quantity: {item.quantity}</p>
                    </div>
                    <span className="text-lg font-medium text-primary">
                      ${item.unit_price}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Job Modal */}
      {showNewJob && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Create New Job</h3>
              <button
                onClick={() => setShowNewJob(false)}
                className="text-text-muted hover:text-text-main"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateJob} className="space-y-6">
              {/* Customer Section */}
              <div className="border-b border-border-main pb-6">
                <h4 className="font-medium mb-4">Customer Information</h4>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <input
                      type="radio"
                      id="existing-customer"
                      checked={!isNewCustomer}
                      onChange={() => setIsNewCustomer(false)}
                      className="w-4"
                    />
                    <label htmlFor="existing-customer" className="text-sm">
                      Select Existing Customer
                    </label>
                    <input
                      type="radio"
                      id="new-customer"
                      checked={isNewCustomer}
                      onChange={() => setIsNewCustomer(true)}
                      className="w-4"
                    />
                    <label htmlFor="new-customer" className="text-sm">
                      Add New Customer
                    </label>
                  </div>

                  {isNewCustomer ? (
                    <>
                      <input
                        type="text"
                        placeholder="Customer Name"
                        value={newJob.customer_name}
                        onChange={(e) => setNewJob({...newJob, customer_name: e.target.value})}
                        className="w-full px-3 py-2 border border-border-main rounded-lg"
                        required
                      />
                      <input
                        type="email"
                        placeholder="Customer Email"
                        value={newJob.customer_email}
                        onChange={(e) => setNewJob({...newJob, customer_email: e.target.value})}
                        className="w-full px-3 py-2 border border-border-main rounded-lg"
                        required
                      />
                      <input
                        type="tel"
                        placeholder="Phone (optional)"
                        value={newJob.customer_phone}
                        onChange={(e) => setNewJob({...newJob, customer_phone: e.target.value})}
                        className="w-full px-3 py-2 border border-border-main rounded-lg"
                      />
                    </>
                  ) : (
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="w-full px-3 py-2 border border-border-main rounded-lg"
                      required
                    >
                      <option value="">Select a customer</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name} - {customer.email}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Racquet Section */}
              <div className="border-b border-border-main pb-6">
                <h4 className="font-medium mb-4">Racquet Information</h4>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <input
                      type="radio"
                      id="existing-racquet"
                      checked={!isNewRacquet}
                      onChange={() => setIsNewRacquet(false)}
                      className="w-4"
                    />
                    <label htmlFor="existing-racquet" className="text-sm">
                      Select Existing Racquet
                    </label>
                    <input
                      type="radio"
                      id="new-racquet"
                      checked={isNewRacquet}
                      onChange={() => setIsNewRacquet(true)}
                      className="w-4"
                    />
                    <label htmlFor="new-racquet" className="text-sm">
                      Add New Racquet
                    </label>
                  </div>

                  {isNewRacquet ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Brand</label>
                          <select
                            value={newJob.racquet_brand}
                            onChange={(e) => setNewJob({...newJob, racquet_brand: e.target.value})}
                            className="w-full px-3 py-2 border border-border-main rounded-lg"
                            required
                          >
                            <option value="">Select brand</option>
                            {RACQUET_BRANDS.map((brand) => (
                              <option key={brand} value={brand}>{brand}</option>
                            ))}
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Model</label>
                          {newJob.racquet_brand === "Other" ? (
                            <input
                              type="text"
                              placeholder="Enter model"
                              value={newJob.racquet_model_custom}
                              onChange={(e) => setNewJob({...newJob, racquet_model_custom: e.target.value})}
                              className="w-full px-3 py-2 border border-border-main rounded-lg"
                              required
                            />
                          ) : (
                            <select
                              value={newJob.racquet_model}
                              onChange={(e) => setNewJob({...newJob, racquet_model: e.target.value})}
                              className="w-full px-3 py-2 border border-border-main rounded-lg"
                              required
                            >
                              <option value="">Select model</option>
                              {RACQUET_MODELS[newJob.racquet_brand]?.map((model) => (
                                <option key={model} value={model}>{model}</option>
                              ))}
                              <option value="Other">Other</option>
                            </select>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Serial Number</label>
                          <input
                            type="text"
                            placeholder="Serial number"
                            value={newJob.racquet_serial}
                            onChange={(e) => setNewJob({...newJob, racquet_serial: e.target.value})}
                            className="w-full px-3 py-2 border border-border-main rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Head Size</label>
                          <input
                            type="number"
                            placeholder="Head size"
                            value={newJob.racquet_head_size}
                            onChange={(e) => setNewJob({...newJob, racquet_head_size: e.target.value})}
                            className="w-full px-3 py-2 border border-border-main rounded-lg"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <select
                      value={selectedRacquetId}
                      onChange={(e) => setSelectedRacquetId(e.target.value)}
                      className="w-full px-3 py-2 border border-border-main rounded-lg"
                      required
                    >
                      <option value="">Select a racquet</option>
                      {racquets.map((racquet) => (
                        <option key={racquet.id} value={racquet.id}>
                          {racquet.brand} {racquet.model}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Service Section */}
              <div className="border-b border-border-main pb-6">
                <h4 className="font-medium mb-4">Service Details</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Service Type</label>
                    <select
                      value={newJob.service_type}
                      onChange={(e) => setNewJob({...newJob, service_type: e.target.value})}
                      className="w-full px-3 py-2 border border-border-main rounded-lg"
                    >
                      <option value="string_full_bed">Full String Bed</option>
                      <option value="string_mains_only">Mains Only</option>
                      <option value="string_crosses_only">Crosses Only</option>
                      <option value="custom">Custom Service</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Main Tension (lbs)</label>
                      <input
                        type="number"
                        min="40"
                        max="80"
                        value={newJob.tension_main}
                        onChange={(e) => setNewJob({...newJob, tension_main: Number(e.target.value)})}
                        className="w-full px-3 py-2 border border-border-main rounded-lg"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Cross Tension (lbs)</label>
                      <input
                        type="number"
                        min="40"
                        max="80"
                        value={newJob.tension_cross}
                        onChange={(e) => setNewJob({...newJob, tension_cross: Number(e.target.value)})}
                        className="w-full px-3 py-2 border border-border-main rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Price ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newJob.price}
                      onChange={(e) => setNewJob({...newJob, price: Number(e.target.value)})}
                      className="w-full px-3 py-2 border border-border-main rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Notes</label>
                    <textarea
                      placeholder="Any special instructions..."
                      value={newJob.notes}
                      onChange={(e) => setNewJob({...newJob, notes: e.target.value})}
                      className="w-full px-3 py-2 border border-border-main rounded-lg"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowNewJob(false)}
                  className="px-4 py-2 border border-border-main rounded-lg hover:bg-bg-card transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
