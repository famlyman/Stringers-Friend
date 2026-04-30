import React from "react";
import { Plus, Search, User } from "lucide-react";
import { Customer } from "../../types/database";

interface CustomerSidebarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filteredCustomers: Customer[];
  selectedCustomerId: string | undefined;
  setSelectedCustomer: (customer: Customer) => void;
  setShowAdd: (show: boolean) => void;
}

export function CustomerSidebar({ 
  searchTerm, 
  setSearchTerm, 
  filteredCustomers, 
  selectedCustomerId, 
  setSelectedCustomer, 
  setShowAdd 
}: CustomerSidebarProps) {
  return (
    <div className="lg:col-span-1 space-y-6">
      <div className="flex justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-primary">Customers</h1>
        <button 
          onClick={() => setShowAdd(true)}
          className="flex items-center px-4 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95 text-sm"
        >
          <UserPlus className="w-4 h-4 mr-2 text-secondary" />
          Add
        </button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input 
          type="text" 
          placeholder="Search customers..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="space-y-2">
        {filteredCustomers.map((customer) => (
          <button
            key={customer.id}
            onClick={() => setSelectedCustomer(customer)}
            className={`w-full text-left p-4 rounded-2xl border transition-all ${
              selectedCustomerId === customer.id 
                ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" 
                : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white hover:border-primary/50"
            }`}
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold">{customer.first_name} {customer.last_name}</p>
                <p className={`text-xs ${selectedCustomerId === customer.id ? "text-white/70" : "text-neutral-500"}`}>
                  {customer.email}
                </p>
              </div>
              <ChevronRight className={`w-4 h-4 ${selectedCustomerId === customer.id ? "text-white" : "text-neutral-300 dark:text-neutral-600"}`} />
            </div>
          </button>
        ))}
        {filteredCustomers.length === 0 && (
          <div className="py-12 text-center text-neutral-400">
            No customers found.
          </div>
        )}
      </div>
    </div>
  );
}
