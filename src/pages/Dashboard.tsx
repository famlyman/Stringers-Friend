import React, { useState, useEffect, useMemo } from "react";
import { Plus, Search, CheckCircle2, Clock, PlayCircle, X, Briefcase, MessageSquare, DollarSign, Calendar, ArrowUpRight, Ticket, QrCode, Package, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useDashboardData } from "../hooks/useDashboardData";
import { safeFormatDate } from "../lib/utils";
import { sendNotification } from "../lib/notifications";
import { supabase } from "../lib/supabase";
import { v4 as uuidv4 } from "uuid";
import { SmartRacquetBrandSelect, SmartRacquetModelSelect } from "../components/SmartRacquetSelect";
import QRCodeDisplay from "../components/QRCodeDisplay";
import { Profile, Customer, Job } from "../types/database";

export default function Dashboard({ user, initialTab = 'jobs' }: { user: Profile, initialTab?: 'jobs' | 'customers' | 'messages' | 'inventory' }) {
  const {
    jobs,
    setJobs,
    shop,
    loading,
    customers,
    racquets,
    inventoryItems,
    messages,
    stats,
    refreshData
  } = useDashboardData(user?.shop_id || undefined);

  const [showNewJob, setShowNewJob] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'jobs' | 'customers' | 'messages' | 'inventory'>(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [showShopQR, setShowShopQR] = useState(false);
  
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
    tension_main: 0,
    tension_cross: 0,
    price: 25,
    notes: "",
    service_type: "string_full_bed"
  });
  
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedRacquetId, setSelectedRacquetId] = useState("");
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [isNewRacquet, setIsNewRacquet] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      const shopId = user.shop_id || user.shopId;
      if (!shopId) throw new Error("Shop ID is missing.");

      let finalCustomerId = selectedCustomerId;
      let finalRacquetId = selectedRacquetId;

      if (isNewCustomer) {
        const nameParts = newJob.customer_name.trim().split(' ');
        const { data: newCustomerData, error: customerError } = await supabase
          .from('customers')
          .insert({
            shop_id: shopId,
            first_name: nameParts[0],
            last_name: nameParts.slice(1).join(' ') || '',
            email: newJob.customer_email,
            phone: newJob.customer_phone,
          })
          .select()
          .single();
        
        if (customerError) throw customerError;
        finalCustomerId = newCustomerData.id;
      }

      if (isNewRacquet || !selectedRacquetId) {
        finalRacquetId = uuidv4();
        const brand = newJob.racquet_brand === "Other" ? newJob.racquet_brand_custom : newJob.racquet_brand;
        const model = newJob.racquet_model === "Other" ? newJob.racquet_model_custom : newJob.racquet_model;
        
        await supabase
          .from('racquets')
          .insert({
            id: finalRacquetId,
            customer_id: finalCustomerId,
            shop_id: shopId,
            brand,
            model,
            serial_number: newJob.racquet_serial,
            qr_code_id: `racquet_${finalRacquetId}`,
            created_at: new Date().toISOString()
          });
      }

      const jobId = uuidv4();
      await supabase
        .from('jobs')
        .insert({
          id: jobId,
          customer_id: finalCustomerId,
          racquet_id: finalRacquetId,
          shop_id: shopId,
          status: 'pending',
          payment_status: 'unpaid',
          total_price: Number(newJob.price),
          notes: newJob.notes,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      setShowNewJob(false);
      refreshData();
    } catch (err: any) {
      console.error("Error creating job:", err);
      setError(err.message || "Failed to create job");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredJobs = useMemo(() => jobs.filter((job: Job) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      job.customers?.first_name?.toLowerCase().includes(search) ||
      job.customers?.last_name?.toLowerCase().includes(search) ||
      job.customers?.email?.toLowerCase().includes(search)
    );
  }), [jobs, searchQuery]);

  const filteredCustomers = useMemo(() => customers.filter((customer: Customer) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      customer.first_name?.toLowerCase().includes(search) ||
      customer.last_name?.toLowerCase().includes(search) ||
      customer.email?.toLowerCase().includes(search)
    );
  }), [customers, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-muted font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'jobs' as const, label: 'Jobs', icon: Briefcase },
    { id: 'customers' as const, label: 'Customers', icon: Users },
    { id: 'messages' as const, label: 'Messages', icon: MessageSquare },
    { id: 'inventory' as const, label: 'Inventory', icon: Package },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-text-main tracking-tight">
            {shop ? shop.name : 'Dashboard'}
          </h1>
          <p className="text-text-muted mt-1">Here's what's happening with your shop</p>
        </div>
        {shop && (
          <div className="flex gap-2">
            <button 
              onClick={() => setShowShopQR(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-bg-card border border-border-main rounded-xl text-sm font-semibold text-text-main hover:border-primary hover:text-primary transition-all"
            >
              <QrCode className="w-4 h-4" />
              Shop QR
            </button>
            <Link 
              to={`/${shop.slug}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-bg-card border border-border-main rounded-xl text-sm font-semibold text-text-main hover:border-primary hover:text-primary transition-all"
            >
              <ArrowUpRight className="w-4 h-4" />
              Public Page
            </Link>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-bg-card rounded-2xl p-5 border border-border-main card-hover">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-amber-500/10 rounded-xl">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <span className="text-xs font-semibold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full">
              Pending
            </span>
          </div>
          <p className="text-3xl font-black text-text-main">{stats.pendingJobs}</p>
          <p className="text-sm text-text-muted mt-1">Awaiting</p>
        </div>

        <div className="bg-bg-card rounded-2xl p-5 border border-border-main card-hover">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-blue-500/10 rounded-xl">
              <PlayCircle className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-xs font-semibold text-blue-500 bg-blue-500/10 px-2 py-1 rounded-full">
              In Progress
            </span>
          </div>
          <p className="text-3xl font-black text-text-main">{stats.inProgressJobs}</p>
          <p className="text-sm text-text-muted mt-1">Working On</p>
        </div>

        <div className="bg-bg-card rounded-2xl p-5 border border-border-main card-hover">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-success/10 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-success" />
            </div>
            <span className="text-xs font-semibold text-success bg-success/10 px-2 py-1 rounded-full">
              Completed
            </span>
          </div>
          <p className="text-3xl font-black text-text-main">{stats.completedJobs}</p>
          <p className="text-sm text-text-muted mt-1">Done</p>
        </div>

        <div className="bg-bg-card rounded-2xl p-5 border border-border-main card-hover">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-full">
              Revenue
            </span>
          </div>
          <p className="text-3xl font-black text-text-main">${stats.totalRevenue.toFixed(0)}</p>
          <p className="text-sm text-text-muted mt-1">{stats.thisWeekJobs} this week</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-primary text-white shadow-lg shadow-primary/20'
                : 'bg-bg-card border border-border-main text-text-muted hover:text-text-main hover:border-primary/30'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-bg-card rounded-2xl border border-border-main overflow-hidden">
        {/* Search & Actions Bar */}
        <div className="p-4 border-b border-border-main flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-bg-elevated border border-border-main rounded-xl text-text-main placeholder:text-text-muted/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm"
            />
          </div>
          {activeTab === 'jobs' && (
            <button
              onClick={() => setShowNewJob(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Create Job
            </button>
          )}
        </div>

        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <div className="divide-y divide-border-main">
            {filteredJobs.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-bg-elevated rounded-full flex items-center justify-center mx-auto mb-4">
                  <Ticket className="w-8 h-8 text-text-muted" />
                </div>
                <h3 className="font-bold text-text-main mb-1">No jobs yet</h3>
                <p className="text-sm text-text-muted mb-4">Create your first job to get started</p>
                <button
                  onClick={() => setShowNewJob(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary/90 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Create Job
                </button>
              </div>
            ) : (
              filteredJobs.map((job) => (
                <div key={job.id} className="p-4 hover:bg-bg-elevated/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-text-main truncate">
                          {job.customers?.first_name} {job.customers?.last_name}
                        </h3>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                          job.status === 'completed' 
                            ? 'bg-success/10 text-success'
                            : job.status === 'in_progress'
                            ? 'bg-blue-500/10 text-blue-500'
                            : job.status === 'pending'
                            ? 'bg-amber-500/10 text-amber-500'
                            : 'bg-error/10 text-error'
                        }`}>
                          {job.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-text-muted truncate">{job.notes || 'No notes'}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {safeFormatDate(job.created_at)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          ${job.total_price}
                        </span>
                      </div>
                    </div>
                    <select
                      value={job.status}
                      onChange={async (e) => {
                        const newStatus = e.target.value;
                        const oldStatus = job.status;
                        try {
                          await supabase
                            .from('jobs')
                            .update({ status: newStatus, updated_at: new Date().toISOString() })
                            .eq('id', job.id);
                          setJobs(jobs.map(j => j.id === job.id ? { ...j, status: newStatus } : j));

                          // Send notification when job is marked completed
                          if (newStatus === 'completed' && oldStatus !== 'completed') {
                            // Get customer info and their push subscription
                            const { data: jobData } = await supabase
                              .from('jobs')
                              .select('*, customers(profile_id)')
                              .eq('id', job.id)
                              .single();

                            if (jobData?.customers?.profile_id) {
                              const { data: devices } = await supabase
                                .from('user_devices')
                                .select('onesignal_subscription_id')
                                .eq('profile_id', jobData.customers.profile_id);

                              const playerIds = devices?.map(d => d.onesignal_subscription_id).filter(Boolean) || [];

                              if (playerIds.length > 0) {
                                await sendNotification(
                                  playerIds,
                                  'Job Completed!',
                                  `Your racquet is ready for pickup${job.racquets ? ` - ${job.racquets.brand} ${job.racquets.model}` : ''}`,
                                  { type: 'job', job_id: job.id }
                                );
                              }
                            }
                          }
                        } catch (error) {
                          console.error('Error updating job status:', error);
                        }
                      }}
                      className="px-3 py-1.5 bg-bg-elevated border border-border-main rounded-lg text-xs font-medium text-text-main focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <div className="divide-y divide-border-main">
            {filteredCustomers.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-bg-elevated rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-text-muted" />
                </div>
                <h3 className="font-bold text-text-main mb-1">No customers yet</h3>
                <p className="text-sm text-text-muted">Create a job to add your first customer</p>
              </div>
            ) : (
              filteredCustomers.map((customer) => (
                <div key={customer.id} className="p-4 hover:bg-bg-elevated/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold">
                      {customer.first_name?.[0] || customer.name?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-text-main">
                        {customer.first_name} {customer.last_name}
                      </h3>
                      <p className="text-sm text-text-muted truncate">{customer.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-text-main">
                        {racquets.filter(r => r.customer_id === customer.id).length}
                      </p>
                      <p className="text-xs text-text-muted">racquets</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-bg-elevated rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-text-muted" />
            </div>
            <h3 className="font-bold text-text-main mb-1">No messages yet</h3>
            <p className="text-sm text-text-muted">Messages from customers will appear here</p>
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <div className="divide-y divide-border-main">
            {inventoryItems.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-bg-elevated rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-text-muted" />
                </div>
                <h3 className="font-bold text-text-main mb-1">No inventory items</h3>
                <p className="text-sm text-text-muted">Add strings and accessories to track inventory</p>
              </div>
            ) : (
              inventoryItems.map((item) => (
                <div key={item.id} className="p-4 hover:bg-bg-elevated/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-text-main">{item.brand} {item.model}</h3>
                      <p className="text-sm text-text-muted">{item.category} • Gauge: {item.gauge}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">${item.unit_price}</p>
                      <p className="text-sm text-text-muted">Qty: {item.quantity}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* New Job Modal */}
      {showNewJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-text-main">Create New Job</h3>
              <button
                onClick={() => setShowNewJob(false)}
                className="p-2 hover:bg-bg-elevated rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-error/10 border border-error/20 text-error rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateJob} className="space-y-6">
              {/* Customer Section */}
              <div className="space-y-4">
                <h4 className="font-bold text-text-main flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Customer
                </h4>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsNewCustomer(false)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                      !isNewCustomer ? 'bg-primary text-white border-primary' : 'border-border-main text-text-muted hover:border-primary/30'
                    }`}
                  >
                    Existing
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsNewCustomer(true)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                      isNewCustomer ? 'bg-primary text-white border-primary' : 'border-border-main text-text-muted hover:border-primary/30'
                    }`}
                  >
                    New
                  </button>
                </div>

                {isNewCustomer ? (
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Customer Name"
                      value={newJob.customer_name}
                      onChange={(e) => setNewJob({...newJob, customer_name: e.target.value})}
                      className="px-4 py-2.5 bg-bg-elevated border border-border-main rounded-xl text-text-main placeholder:text-text-muted/50 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                      required
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={newJob.customer_email}
                      onChange={(e) => setNewJob({...newJob, customer_email: e.target.value})}
                      className="px-4 py-2.5 bg-bg-elevated border border-border-main rounded-xl text-text-main placeholder:text-text-muted/50 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                      required
                    />
                  </div>
                ) : (
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-bg-elevated border border-border-main rounded-xl text-text-main focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                    required
                  >
                    <option value="">Select a customer</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.first_name} {c.last_name} - {c.email}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Racquet Section */}
              <div className="space-y-4">
                <h4 className="font-bold text-text-main flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  Racquet
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <SmartRacquetBrandSelect
                    value={newJob.racquet_brand}
                    onChange={(val) => setNewJob({...newJob, racquet_brand: val, racquet_model: ""})}
                  />
                  <SmartRacquetModelSelect
                    brand={newJob.racquet_brand}
                    value={newJob.racquet_model}
                    onChange={(val) => setNewJob({...newJob, racquet_model: val})}
                  />
                </div>
              </div>

              {/* Service Section */}
              <div className="space-y-4">
                <h4 className="font-bold text-text-main flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" />
                  Service
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="number"
                    placeholder="Main (lbs)"
                    value={newJob.tension_main || ''}
                    onChange={(e) => setNewJob({...newJob, tension_main: Number(e.target.value)})}
                    className="px-4 py-2.5 bg-bg-elevated border border-border-main rounded-xl text-text-main placeholder:text-text-muted/50 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Cross (lbs)"
                    value={newJob.tension_cross || ''}
                    onChange={(e) => setNewJob({...newJob, tension_cross: Number(e.target.value)})}
                    className="px-4 py-2.5 bg-bg-elevated border border-border-main rounded-xl text-text-main placeholder:text-text-muted/50 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Price $"
                    value={newJob.price || ''}
                    onChange={(e) => setNewJob({...newJob, price: Number(e.target.value)})}
                    className="px-4 py-2.5 bg-bg-elevated border border-border-main rounded-xl text-text-main placeholder:text-text-muted/50 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                    required
                  />
                </div>
                <textarea
                  placeholder="Notes (optional)"
                  value={newJob.notes}
                  onChange={(e) => setNewJob({...newJob, notes: e.target.value})}
                  className="w-full px-4 py-2.5 bg-bg-elevated border border-border-main rounded-xl text-text-main placeholder:text-text-muted/50 focus:ring-2 focus:ring-primary/20 outline-none text-sm h-20 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewJob(false)}
                  className="flex-1 py-3 border border-border-main rounded-xl font-semibold text-text-muted hover:bg-bg-elevated transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-gradient-primary text-white rounded-xl font-bold hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>Create Job</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shop QR Modal */}
      {showShopQR && shop && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative border border-neutral-200 dark:border-neutral-800">
            <button 
              onClick={() => setShowShopQR(false)}
              className="absolute top-6 right-6 p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-neutral-400" />
            </button>
            <h2 className="text-xl font-bold text-primary mb-2">{shop.name}</h2>
            <p className="text-sm text-neutral-500 mb-6">Scan to find this shop</p>
            <div className="flex justify-center">
              <QRCodeDisplay 
                value={shop.slug} 
                label={shop.name}
              />
            </div>
            <div className="mt-6 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
              <p className="text-xs text-neutral-500 text-center">
                Print and place at your shop counter
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
