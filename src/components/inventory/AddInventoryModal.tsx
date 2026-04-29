import React, { useState } from "react";
import { InventoryForm } from "./InventoryForm";

interface AddInventoryModalProps {
  onAdd: (item: any) => Promise<void>;
  onCancel: () => void;
}

export function AddInventoryModal({ onAdd, onCancel }: AddInventoryModalProps) {
  const [newItem, setNewItem] = useState<any>({ 
    category: "string",
    brand: "", 
    model: "",
    type: "string", 
    packaging: "set",
    gauge: "",
    quantity: 0, 
    low_stock_threshold: 5,
    unit_price: 0,
    color: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAdd(newItem);
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-200">
      <h3 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-white">Add New Inventory Item</h3>
      <InventoryForm 
        item={newItem} 
        setItem={setNewItem} 
        onSubmit={handleSubmit} 
        onCancel={onCancel} 
        submitLabel="Save Item"
      />
    </div>
  );
}
