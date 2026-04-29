import React, { useState } from "react";
import { X, Users, Package, Briefcase, RefreshCw } from "lucide-react";
import { SmartRacquetBrandSelect, SmartRacquetModelSelect } from "../SmartRacquetSelect";
import { supabase } from "../../lib/supabase";
import { v4 as uuidv4 } from "uuid";

interface NewJobModalProps {
  user: any;
  customers: any[];
  setShowNewJob: (show: boolean) => void;
  refreshData: () => Promise<void>;
}

export function NewJobModal({ user, customers, setShowNewJob, refreshData }: NewJobModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  
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
    service_type: "string_full_bed",
    notes: "",
  });

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      if (!user) throw new Error("User not authenticated.");
      const shopId = user.shop_id || user.shopId;
      if (!shopId) throw new Error("Shop ID is missing.");

      let finalCustomerId = selectedCustomerId;

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

      const racquetId = uuidv4();
      const brand = newJob.racquet_brand === "Other" ? newJob.racquet_brand_custom : newJob.racquet_brand;
      const model = newJob.racquet_model === "Other" ? newJob.racquet_model_custom : newJob.racquet_model;
      
      if (!brand || !model) throw new Error("Racquet brand and model are required.");

      await supabase
        .from('racquets')
        .insert({
          id: racquetId,
          customer_id: finalCustomerId,
          shop_id: shopId,
          brand,
          model,
          serial_number: newJob.racquet_serial || `SN-${Date.now()}`,
          qr_code_id: `racquet_${racquetId}`,
          created_at: new Date().toISOString()
        });

      const jobId = uuidv4();
      await supabase
        .from('jobs')
        .insert({
          id: jobId,
          customer_id: finalCustomerId,
          racquet_id: racquetId,
          shop_id: shopId,
          status: 'pending',
          payment_status: 'unpaid',
          total_price: Number(newJob.price),
          notes: newJob.notes,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      await supabase
        .from('job_details')
        .insert({
          job_id: jobId,
          item_type: 'main_string',
          tension: `${newJob.tension_main}/${newJob.tension_cross}`,
          price: Number(newJob.price),
          created_at: new Date().toISOString()
        });

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
  );
}
