import React from "react";
import { Users } from "lucide-react";

interface CustomersTabProps {
  filteredCustomers: any[];
  racquets: any[];
}

export function CustomersTab({ filteredCustomers, racquets }: CustomersTabProps) {
  return (
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
  );
}
