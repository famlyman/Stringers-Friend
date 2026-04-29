import React, { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useCustomerListData } from "../hooks/useCustomerListData";
import { useCustomerRacquets } from "../hooks/useCustomerRacquets";
import { CustomerSidebar } from "../components/customers/CustomerSidebar";
import { CustomerDetailsCard } from "../components/customers/CustomerDetailsCard";
import { AddCustomerForm } from "../components/customers/AddCustomerForm";
import { AddRacquetForm } from "../components/customers/AddRacquetForm";
import { RacquetCard } from "../components/customers/RacquetCard";
import { EditRacquetModal } from "../components/customers/EditRacquetModal";
import { RacquetQRModal } from "../components/customers/RacquetQRModal";
import { DeleteConfirmModal } from "../components/customers/DeleteConfirmModal";

export default function CustomerList({ user }: { user: any }) {
  const shopId = user?.shop_id || user?.shopId;
  const { customers, loading: customersLoading, refreshData } = useCustomerListData(shopId);
  
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const { racquets, refreshRacquets } = useCustomerRacquets(selectedCustomer?.id);

  const [searchTerm, setSearchTerm] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showAddRacquet, setShowAddRacquet] = useState(false);
  const [editingRacquet, setEditingRacquet] = useState<any | null>(null);
  const [expandedRacquetId, setExpandedRacquetId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'customer' | 'racquet', id: string, name?: string } | null>(null);
  const [showRacquetQR, setShowRacquetQR] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      ((c.first_name || "") + " " + (c.last_name || "")).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.phone && c.phone.includes(searchTerm))
    );
  }, [customers, searchTerm]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === 'customer') {
        // Cascading delete is handled by DB in some cases, but here we do it explicitly if needed
        // The original code had explicit loops. Let's stick to a simpler approach if possible
        // or keep the original logic for safety.
        
        // 1. Delete racquets
        await supabase.from('racquets').delete().eq('customer_id', deleteConfirm.id);
        // 2. Delete jobs (jobs are linked to customer_id)
        await supabase.from('jobs').delete().eq('customer_id', deleteConfirm.id);
        // 3. Delete customer
        await supabase.from('customers').delete().eq('id', deleteConfirm.id);
        
        setSelectedCustomer(null);
      } else {
        await supabase.from('racquets').delete().eq('id', deleteConfirm.id);
      }
      setDeleteConfirm(null);
      refreshData();
    } catch (err) {
      console.error("Error during deletion:", err);
    }
  };

  const handleUpdateRacquet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRacquet) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('racquets')
        .update({
          brand: editingRacquet.brand,
          model: editingRacquet.model,
          serial_number: editingRacquet.serial_number,
          head_size: editingRacquet.head_size,
          string_pattern_mains: editingRacquet.string_pattern_mains,
          string_pattern_crosses: editingRacquet.string_pattern_crosses,
          stringing_instructions: editingRacquet.stringing_instructions,
        })
        .eq('id', editingRacquet.id);

      if (error) throw error;
      setEditingRacquet(null);
      refreshRacquets();
    } catch (err) {
      console.error("Error updating racquet:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <CustomerSidebar 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filteredCustomers={filteredCustomers}
          selectedCustomerId={selectedCustomer?.id}
          setSelectedCustomer={setSelectedCustomer}
          setShowAdd={setShowAdd}
        />

        <div className="lg:col-span-2">
          {selectedCustomer ? (
            <div className="space-y-8">
              <CustomerDetailsCard 
                customer={selectedCustomer}
                setDeleteConfirm={setDeleteConfirm}
                setShowAddRacquet={setShowAddRacquet}
              />

              {showAddRacquet && (
                <AddRacquetForm 
                  customerId={selectedCustomer.id}
                  shopId={shopId}
                  onSuccess={() => { setShowAddRacquet(false); refreshRacquets(); }}
                  onCancel={() => setShowAddRacquet(false)}
                />
              )}

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-neutral-900 dark:text-white">Racquets</h3>
                {racquets.length === 0 ? (
                  <div className="py-12 text-center text-neutral-400 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
                    No racquets added yet.
                  </div>
                ) : (
                  racquets.map(racquet => (
                    <RacquetCard 
                      key={racquet.id}
                      racquet={racquet}
                      expandedRacquetId={expandedRacquetId}
                      setExpandedRacquetId={setExpandedRacquetId}
                      setEditingRacquet={setEditingRacquet}
                      setShowRacquetQR={setShowRacquetQR}
                      setDeleteConfirm={setDeleteConfirm}
                      customerName={`${selectedCustomer.first_name} ${selectedCustomer.last_name}`}
                    />
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-neutral-400 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-12">
              {showAdd ? (
                <div className="w-full max-w-md">
                  <h2 className="text-xl font-bold text-primary mb-4">Add New Customer</h2>
                  <AddCustomerForm 
                    shopId={shopId} 
                    onSuccess={() => { setShowAdd(false); refreshData(); }}
                    onCancel={() => setShowAdd(false)}
                  />
                </div>
              ) : (
                <>
                  <Search className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-lg font-medium">Select a customer to view details</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <EditRacquetModal 
        editingRacquet={editingRacquet}
        setEditingRacquet={setEditingRacquet}
        onUpdate={handleUpdateRacquet}
        submitting={submitting}
      />

      <RacquetQRModal 
        showRacquetQR={showRacquetQR}
        setShowRacquetQR={setShowRacquetQR}
      />

      <DeleteConfirmModal 
        deleteConfirm={deleteConfirm}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
