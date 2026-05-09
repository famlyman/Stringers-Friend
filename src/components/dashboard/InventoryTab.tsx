import React from "react";
import { Package } from "lucide-react";
import { InventoryItem } from "../../types/database";

interface InventoryTabProps {
  inventoryItems: InventoryItem[];
}

export function InventoryTab({ inventoryItems }: InventoryTabProps) {
  return (
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
                <p className="text-sm text-text-muted">
                  {(item.packaging === 'reel' || item.packaging === 'mini-reel') 
                    ? `${Math.round(item.remaining_length || 0)}${item.length_unit || 'm'} left (${item.quantity} reels)` 
                    : `Qty: ${item.quantity} ${item.packaging === 'set' ? 'sets' : 'units'}`
                  }
                </p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
