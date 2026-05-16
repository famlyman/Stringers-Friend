import React, { useState, useMemo, useEffect } from "react";
import { X, Users, Package, Briefcase, RefreshCw, Layers } from "lucide-react";
import { SmartRacquetBrandSelect, SmartRacquetModelSelect } from "../SmartRacquetSelect";
import { SmartStringBrandSelect, SmartStringModelSelect } from "../SmartStringSelect";
import { supabase } from "../../lib/supabase";
import { v4 as uuidv4 } from "uuid";
import { Profile, Customer, Racquet, InventoryItem } from "../../types/database";

interface NewJobModalProps {
  user: Profile;
  customers: Customer[];
  racquets?: Racquet[];
  inventoryStrings?: InventoryItem[];
  setShowNewJob: (show: boolean) => void;
  refreshData: () => Promise<void>;
}

export function NewJobModal({ user, customers, racquets = [], inventoryStrings = [], setShowNewJob, refreshData }: NewJobModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Customer State
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  
  // Racquet State
  const [isNewRacquet, setIsNewRacquet] = useState(true);
  const [selectedRacquetId, setSelectedRacquetId] = useState("");
  
  const [newJob, setNewJob] = useState({
    // Customer info (if new)
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    // Racquet info (if new)
    racquet_brand: "",
    racquet_model: "",
    racquet_brand_custom: "",
    racquet_model_custom: "",
    racquet_serial: "",
    // Service info
    string_main_brand: "",
    string_main_model: "",
    string_main_gauge: "",
    string_cross_brand: "",
    string_cross_model: "",
    string_cross_gauge: "",
    is_hybrid: false,
    tension_main: 55,
    tension_cross: 55,
    labor_price: 20,
    string_price_main: 0,
    string_price_cross: 0,
    notes: "",
  });

  // Filter racquets for selected customer
  const customerRacquets = useMemo(() => {
    if (!selectedCustomerId || isNewCustomer) return [];
    return racquets.filter(r => r.customer_id === selectedCustomerId);
  }, [selectedCustomerId, isNewCustomer, racquets]);

  // Reset racquet selection when customer changes
  useEffect(() => {
    setSelectedRacquetId("");
    if (customerRacquets.length > 0) {
      setIsNewRacquet(false);
    } else {
      setIsNewRacquet(true);
    }
  }, [selectedCustomerId, customerRacquets.length]);

  const totalPrice = useMemo(() => {
    let total = Number(newJob.labor_price) || 0;
    total += Number(newJob.string_price_main) || 0;
    if (newJob.is_hybrid) {
      total += Number(newJob.string_price_cross) || 0;
    }
    return total;
  }, [newJob.labor_price, newJob.string_price_main, newJob.string_price_cross, newJob.is_hybrid]);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      if (!user) throw new Error("User not authenticated.");
      const shopId = user.shop_id || user.shopId;
      if (!shopId) throw new Error("Shop ID is missing.");

      let finalCustomerId = selectedCustomerId;

      // 1. Handle Customer
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
          .eq('shop_id', shopId);
        
        if (existingCustomers && existingCustomers.length > 0) {
          finalCustomerId = existingCustomers[0].id;
        } else {
          const { data: newCustomerData, error: customerError } = await supabase
            .from('customers')
            .insert({
              shop_id: shopId,
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
      } else if (!selectedCustomerId) {
        throw new Error("Please select a customer or add a new one.");
      }

      // 2. Handle Racquet
      let finalRacquetId = selectedRacquetId;
      if (isNewRacquet) {
        const brand = newJob.racquet_brand === "Other" ? newJob.racquet_brand_custom : newJob.racquet_brand;
        const model = newJob.racquet_model === "Other" ? newJob.racquet_model_custom : newJob.racquet_model;
        
        if (!brand || !model) throw new Error("Racquet brand and model are required.");

        const racquetId = uuidv4();
        const { error: racquetError } = await supabase
          .from('racquets')
          .insert({
            id: racquetId,
            customer_id: finalCustomerId,
            shop_id: shopId,
            brand,
            model,
            serial_number: newJob.racquet_serial || `SN-${Date.now()}`,
            qr_code: `racquet_${racquetId}`,
            created_at: new Date().toISOString()
          });
        
        if (racquetError) throw racquetError;
        finalRacquetId = racquetId;
      } else if (!selectedRacquetId) {
        throw new Error("Please select a racquet or add a new one.");
      }

      // 3. Create Job
      const jobId = uuidv4();
      const { error: jobError } = await supabase
        .from('jobs')
        .insert({
          id: jobId,
          customer_id: finalCustomerId,
          racquet_id: finalRacquetId,
          shop_id: shopId,
          status: 'pending',
          payment_status: 'unpaid',
          total_price: totalPrice,
          notes: newJob.notes,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (jobError) throw jobError;

      // 4. Create Job Details
      const details = [];
      
      // Labor/Service
      details.push({
        job_id: jobId,
        item_type: 'service',
        price: Number(newJob.labor_price) || 0,
      });

      // Find matching inventory items (tries exact match, then model-only match)
      const findInventoryId = (brand: string, model: string) => {
        if (!brand || !model || !inventoryStrings) return null;
        let match = inventoryStrings.find(i => 
          i.brand.toLowerCase() === brand.toLowerCase() && 
          i.model.toLowerCase() === model.toLowerCase()
        );
        if (!match) {
          match = inventoryStrings.find(i =>
            i.model.toLowerCase() === model.toLowerCase()
          );
        }
        if (!match) {
          match = inventoryStrings.find(i =>
            i.model.toLowerCase().includes(model.toLowerCase()) ||
            model.toLowerCase().includes(i.model.toLowerCase())
          );
        }
        return match?.id || null;
      };

      // Main String
      details.push({
        job_id: jobId,
        item_type: 'main_string',
        tension: String(newJob.tension_main),
        price: Number(newJob.string_price_main) || 0,
        inventory_id: findInventoryId(newJob.string_main_brand, newJob.string_main_model)
      });

      // Cross String (if hybrid)
      if (newJob.is_hybrid) {
        details.push({
          job_id: jobId,
          item_type: 'cross_string',
          tension: String(newJob.tension_cross),
          price: Number(newJob.string_price_cross) || 0,
          inventory_id: findInventoryId(newJob.string_cross_brand, newJob.string_cross_model)
        });
      }

      const { error: detailsError } = await supabase
        .from('job_details')
        .insert(details);

      if (detailsError) throw detailsError;

      await refreshData();
      setShowNewJob(false);
      
    } catch (err: any) {
      console.error("Error creating job:", err);
      setError(err.message || "Failed to create job");
    } finally {
      setSubmitting(false);
    }
  };

  return (
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

        <form onSubmit={handleCreateJob} className="space-y-8">
          {/* Customer Section */}
          <section className="space-y-4">
            <h4 className="font-bold text-text-main flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              1. Customer
            </h4>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsNewCustomer(false)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  !isNewCustomer ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'border-border-main text-text-muted hover:border-primary/30'
                }`}
              >
                Existing
              </button>
              <button
                type="button"
                onClick={() => setIsNewCustomer(true)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  isNewCustomer ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'border-border-main text-text-muted hover:border-primary/30'
                }`}
              >
                New
              </button>
            </div>

            {isNewCustomer ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  id="customer_name"
                  name="customer_name"
                  type="text"
                  placeholder="Full Name"
                  value={newJob.customer_name}
                  onChange={(e) => setNewJob({...newJob, customer_name: e.target.value})}
                  className="px-4 py-2.5 bg-bg-elevated border border-border-main rounded-xl text-text-main placeholder:text-text-muted/50 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                  required
                  autoComplete="name"
                />
                <input
                  id="customer_email"
                  name="customer_email"
                  type="email"
                  placeholder="Email"
                  value={newJob.customer_email}
                  onChange={(e) => setNewJob({...newJob, customer_email: e.target.value})}
                  className="px-4 py-2.5 bg-bg-elevated border border-border-main rounded-xl text-text-main placeholder:text-text-muted/50 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                  required
                  autoComplete="email"
                />
                <input
                  id="customer_phone"
                  name="customer_phone"
                  type="tel"
                  placeholder="Phone"
                  value={newJob.customer_phone}
                  onChange={(e) => setNewJob({...newJob, customer_phone: e.target.value})}
                  className="px-4 py-2.5 bg-bg-elevated border border-border-main rounded-xl text-text-main placeholder:text-text-muted/50 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                  autoComplete="tel"
                />
              </div>
            ) : (
              <select
                id="selected_customer"
                name="selected_customer"
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
          </section>

          {/* Racquet Section */}
          <section className="space-y-4">
            <h4 className="font-bold text-text-main flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              2. Racquet
            </h4>
            
            {!isNewCustomer && selectedCustomerId && (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewRacquet(false)}
                  disabled={customerRacquets.length === 0}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                    !isNewRacquet ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'border-border-main text-text-muted hover:border-primary/30'
                  } disabled:opacity-50`}
                >
                  Existing ({customerRacquets.length})
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewRacquet(true)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                    isNewRacquet ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'border-border-main text-text-muted hover:border-primary/30'
                  }`}
                >
                  New
                </button>
              </div>
            )}

            {isNewRacquet ? (
              <div className="space-y-3">
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
                <input
                  id="racquet_serial"
                  name="racquet_serial"
                  type="text"
                  placeholder="Serial Number (optional)"
                  value={newJob.racquet_serial}
                  onChange={(e) => setNewJob({...newJob, racquet_serial: e.target.value})}
                  className="w-full px-4 py-2.5 bg-bg-elevated border border-border-main rounded-xl text-text-main placeholder:text-text-muted/50 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                />
              </div>
            ) : (
              <select
                id="selected_racquet"
                name="selected_racquet"
                value={selectedRacquetId}
                onChange={(e) => setSelectedRacquetId(e.target.value)}
                className="w-full px-4 py-2.5 bg-bg-elevated border border-border-main rounded-xl text-text-main focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                required
              >
                <option value="">Select a racquet</option>
                {customerRacquets.map((r) => (
                  <option key={r.id} value={r.id}>{r.brand} {r.model} {r.serial_number ? `(${r.serial_number})` : ''}</option>
                ))}
              </select>
            )}
          </section>

          {/* Service Section */}
          <section className="space-y-4">
            <h4 className="font-bold text-text-main flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              3. Service Details
            </h4>
            
            <div className="flex items-center gap-3 mb-4">
              <button
                type="button"
                onClick={() => setNewJob({...newJob, is_hybrid: false})}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                  !newJob.is_hybrid ? 'bg-primary text-white border-primary' : 'border-border-main text-text-muted'
                }`}
              >
                Full Bed
              </button>
              <button
                type="button"
                onClick={() => setNewJob({...newJob, is_hybrid: true})}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                  newJob.is_hybrid ? 'bg-primary text-white border-primary' : 'border-border-main text-text-muted'
                }`}
              >
                Hybrid
              </button>
            </div>

            <div className="space-y-6">
              {/* Main String */}
              <div className="p-4 bg-bg-elevated rounded-2xl border border-border-main space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <Layers className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-text-muted">Mains</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <SmartStringBrandSelect
                    value={newJob.string_main_brand}
                    onChange={(val) => setNewJob({...newJob, string_main_brand: val, string_main_model: ""})}
                  />
                  <SmartStringModelSelect
                    brand={newJob.string_main_brand}
                    value={newJob.string_main_model}
                    onChange={(val) => setNewJob({...newJob, string_main_model: val})}
                  />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <input
                    id="string_main_gauge"
                    name="string_main_gauge"
                    type="text"
                    placeholder="Gauge"
                    value={newJob.string_main_gauge}
                    onChange={(e) => setNewJob({...newJob, string_main_gauge: e.target.value})}
                    className="px-4 py-2.5 bg-bg-card border border-border-main rounded-xl text-sm"
                  />
                  <input
                    id="tension_main"
                    name="tension_main"
                    type="number"
                    placeholder="Tension (lbs)"
                    value={newJob.tension_main}
                    onChange={(e) => setNewJob({...newJob, tension_main: Number(e.target.value)})}
                    className="px-4 py-2.5 bg-bg-card border border-border-main rounded-xl text-sm"
                    required
                  />
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">$</span>
                    <input
                      id="string_price_main"
                      name="string_price_main"
                      type="number"
                      placeholder="String Price"
                      value={newJob.string_price_main || ''}
                      onChange={(e) => setNewJob({...newJob, string_price_main: Number(e.target.value)})}
                      className="w-full pl-7 pr-4 py-2.5 bg-bg-card border border-border-main rounded-xl text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Cross String (if hybrid) */}
              {newJob.is_hybrid && (
                <div className="p-4 bg-bg-elevated rounded-2xl border border-border-main space-y-4 animate-in slide-in-from-top-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-secondary/10 flex items-center justify-center">
                      <Layers className="w-3.5 h-3.5 text-secondary" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-text-muted">Crosses</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <SmartStringBrandSelect
                      value={newJob.string_cross_brand}
                      onChange={(val) => setNewJob({...newJob, string_cross_brand: val, string_cross_model: ""})}
                    />
                    <SmartStringModelSelect
                      brand={newJob.string_cross_brand}
                      value={newJob.string_cross_model}
                      onChange={(val) => setNewJob({...newJob, string_cross_model: val})}
                    />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <input
                      id="string_cross_gauge"
                      name="string_cross_gauge"
                      type="text"
                      placeholder="Gauge"
                      value={newJob.string_cross_gauge}
                      onChange={(e) => setNewJob({...newJob, string_cross_gauge: e.target.value})}
                      className="px-4 py-2.5 bg-bg-card border border-border-main rounded-xl text-sm"
                    />
                    <input
                      id="tension_cross"
                      name="tension_cross"
                      type="number"
                      placeholder="Tension (lbs)"
                      value={newJob.tension_cross}
                      onChange={(e) => setNewJob({...newJob, tension_cross: Number(e.target.value)})}
                      className="px-4 py-2.5 bg-bg-card border border-border-main rounded-xl text-sm"
                      required
                    />
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">$</span>
                      <input
                        id="string_price_cross"
                        name="string_price_cross"
                        type="number"
                        placeholder="String Price"
                        value={newJob.string_price_cross || ''}
                        onChange={(e) => setNewJob({...newJob, string_price_cross: Number(e.target.value)})}
                        className="w-full pl-7 pr-4 py-2.5 bg-bg-card border border-border-main rounded-xl text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Labor & Total */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div className="space-y-2">
                  <label htmlFor="labor_price" className="text-xs font-black uppercase tracking-widest text-text-muted px-1">Labor / Service Fee</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">$</span>
                    <input
                      id="labor_price"
                      name="labor_price"
                      type="number"
                      value={newJob.labor_price}
                      onChange={(e) => setNewJob({...newJob, labor_price: Number(e.target.value)})}
                      className="w-full pl-7 pr-4 py-2.5 bg-bg-elevated border border-border-main rounded-xl text-sm font-bold"
                    />
                  </div>
                </div>
                
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 flex justify-between items-center">
                  <span className="font-bold text-text-main">Total Job Price</span>
                  <span className="text-2xl font-black text-primary">${totalPrice}</span>
                </div>
              </div>
            </div>

            <textarea
              id="job_notes"
              name="job_notes"
              placeholder="Internal notes or customer requests..."
              value={newJob.notes}
              onChange={(e) => setNewJob({...newJob, notes: e.target.value})}
              className="w-full px-4 py-3 bg-bg-elevated border border-border-main rounded-xl text-text-main placeholder:text-text-muted/50 focus:ring-2 focus:ring-primary/20 outline-none text-sm h-24 resize-none"
            />
          </section>

          <div className="flex gap-3 pt-4 border-t border-border-main">
            <button
              type="button"
              onClick={() => setShowNewJob(false)}
              className="flex-1 py-4 border border-border-main rounded-2xl font-bold text-text-muted hover:bg-bg-elevated transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-2 py-4 bg-gradient-primary text-white rounded-2xl font-black hover:shadow-xl hover:shadow-primary/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
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
  );
}
