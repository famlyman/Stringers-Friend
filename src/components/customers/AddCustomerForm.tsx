import React, { useState } from "react";
import { supabase } from "../../lib/supabase";

interface AddCustomerFormProps {
  shopId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddCustomerForm({ shopId, onSuccess, onCancel }: AddCustomerFormProps) {
  const [newCustomer, setNewCustomer] = useState({ first_name: "", last_name: "", email: "", phone: "" });

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: existingProfiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newCustomer.email)
        .eq('role', 'customer');

      let linkedProfileId = null;
      if (existingProfiles && existingProfiles.length > 0) {
        linkedProfileId = existingProfiles[0].id;
      }

      const { error: insertError } = await supabase
        .from('customers')
        .insert({
          shop_id: shopId,
          profile_id: linkedProfileId,
          first_name: newCustomer.first_name,
          last_name: newCustomer.last_name,
          email: newCustomer.email,
          phone: newCustomer.phone,
        });

      if (insertError) throw insertError;
      onSuccess();
    } catch (err) {
      console.error("Error adding customer:", err);
    }
  };

  return (
    <form onSubmit={handleAddCustomer} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 space-y-4 shadow-sm">
      <input 
        type="text" 
        placeholder="First Name" 
        required
        value={newCustomer.first_name}
        onChange={e => setNewCustomer({...newCustomer, first_name: e.target.value})}
        className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
      />
      <input 
        type="text" 
        placeholder="Last Name" 
        required
        value={newCustomer.last_name}
        onChange={e => setNewCustomer({...newCustomer, last_name: e.target.value})}
        className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
      />
      <input 
        type="email" 
        placeholder="Email" 
        required
        value={newCustomer.email}
        onChange={e => setNewCustomer({...newCustomer, email: e.target.value})}
        className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
      />
      <input 
        type="tel" 
        placeholder="Phone" 
        value={newCustomer.phone}
        onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
        className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
      />
      <div className="flex gap-2">
        <button type="submit" className="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors">Save</button>
        <button type="button" onClick={onCancel} className="flex-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 py-2 rounded-lg text-sm font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">Cancel</button>
      </div>
    </form>
  );
}
