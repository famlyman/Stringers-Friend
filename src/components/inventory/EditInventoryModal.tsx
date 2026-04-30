import React from "react";
import { X } from "lucide-react";
import { InventoryForm } from "./InventoryForm";
import { InventoryItem } from "../../types/database";

interface EditInventoryModalProps {
  editingItem: InventoryItem;
  setEditingItem: (item: InventoryItem) => void;
  onUpdate: (e: React.FormEvent) => Promise<void>;
  onCancel: () => void;
}

export function EditInventoryModal({ editingItem, setEditingItem, onUpdate, onCancel }: EditInventoryModalProps) {
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-8 max-w-2xl w-full shadow-2xl animate-in zoom-in duration-200 border border-neutral-200 dark:border-neutral-800">
        <h2 className="text-2xl font-bold mb-6 text-primary">Edit Inventory Item</h2>
        <div className="max-h-[70vh] overflow-y-auto pr-2">
          <InventoryForm 
            item={editingItem} 
            setItem={setEditingItem} 
            onSubmit={onUpdate} 
            onCancel={onCancel} 
            submitLabel="Update Item"
          />
        </div>
      </div>
    </div>
  );
}
