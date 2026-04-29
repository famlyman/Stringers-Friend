import React from "react";
import { Plus } from "lucide-react";

interface InventoryHeaderProps {
  setShowAdd: (show: boolean) => void;
}

export function InventoryHeader({ setShowAdd }: InventoryHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight">Inventory</h1>
        <p className="text-sm text-neutral-500 mt-1">Manage your strings, grips, and supplies</p>
      </div>
      <button 
        onClick={() => setShowAdd(true)}
        className="flex items-center justify-center px-4 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95 text-sm sm:text-base w-full sm:w-auto"
      >
        <Plus className="w-4 h-4 mr-2 text-secondary" />
        Add Item
      </button>
    </div>
  );
}
