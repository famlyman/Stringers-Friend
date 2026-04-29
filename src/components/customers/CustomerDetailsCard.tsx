import React from "react";
import { Mail, Phone, Trash2, Plus } from "lucide-react";

interface CustomerDetailsCardProps {
  customer: any;
  setDeleteConfirm: (confirm: any) => void;
  setShowAddRacquet: (show: boolean) => void;
}

export function CustomerDetailsCard({ customer, setDeleteConfirm, setShowAddRacquet }: CustomerDetailsCardProps) {
  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white">
            {customer.first_name} {customer.last_name}
          </h2>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-2">
            <div className="flex items-center text-sm text-neutral-500 dark:text-neutral-400">
              <Mail className="w-4 h-4 mr-2" />
              {customer.email}
            </div>
            {customer.phone && (
              <div className="flex items-center text-sm text-neutral-500 dark:text-neutral-400">
                <Phone className="w-4 h-4 mr-2" />
                {customer.phone}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button 
            onClick={() => setDeleteConfirm({ 
              type: 'customer', 
              id: customer.id, 
              name: customer.first_name + ' ' + customer.last_name 
            })}
            className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-sm"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </button>
          <button 
            onClick={() => setShowAddRacquet(true)}
            className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95 text-sm"
          >
            <Plus className="w-4 h-4 mr-2 text-secondary" />
            Add Racquet
          </button>
        </div>
      </div>
    </div>
  );
}
