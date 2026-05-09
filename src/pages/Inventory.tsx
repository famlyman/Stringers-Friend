import React, { useState, useMemo } from "react";
import { useInventoryData } from "../hooks/useInventoryData";
import { InventoryHeader } from "../components/inventory/InventoryHeader";
import { InventoryFilters } from "../components/inventory/InventoryFilters";
import { InventoryTable } from "../components/inventory/InventoryTable";
import { AddInventoryModal } from "../components/inventory/AddInventoryModal";
import { EditInventoryModal } from "../components/inventory/EditInventoryModal";
import { InventoryQRModal } from "../components/inventory/InventoryQRModal";
import { Profile, InventoryItem } from "../types/database";

export default function Inventory({ user }: { user: Profile }) {
  const { items, loading, addItem, updateItem, deleteItem } = useInventoryData(user?.shop_id || undefined);

  const [showAdd, setShowAdd] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showQRCodeModal, setShowQRCodeModal] = useState<{ value: string, label: string } | null>(null);

  const handleAddItem = async (newItem: Partial<InventoryItem>) => {
    try {
      await addItem(newItem);
      setShowAdd(false);
    } catch (err) {
      console.error("Error adding inventory:", err);
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      await updateItem(editingItem.id, editingItem);
      setEditingItem(null);
    } catch (err) {
      console.error("Error updating inventory:", err);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      await deleteItem(id);
    } catch (err) {
      console.error("Error deleting inventory:", err);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const isReel = item.packaging === 'reel' || item.packaging === 'mini-reel';
      const isLowStock = isReel 
        ? (item.remaining_length || 0) <= (item.low_stock_threshold || 20)
        : item.quantity <= (item.low_stock_threshold || 5);
      const matchesType = filterType === "all" || (filterType === "low-stock" ? isLowStock : item.category === filterType);
      const matchesSearch = item.model.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           item.brand.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [items, filterType, searchQuery]);

  return (
    <div className="space-y-8 animate-fade-in">
      <InventoryHeader setShowAdd={setShowAdd} />

      <InventoryFilters 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery} 
        filterType={filterType} 
        setFilterType={setFilterType} 
      />

      {showAdd && (
        <AddInventoryModal onAdd={handleAddItem} onCancel={() => setShowAdd(false)} />
      )}

      <InventoryTable 
        items={filteredItems} 
        loading={loading} 
        setShowQRCodeModal={setShowQRCodeModal}
        setEditingItem={setEditingItem}
        handleDelete={handleDeleteItem}
      />

      {editingItem && (
        <EditInventoryModal 
          editingItem={editingItem} 
          setEditingItem={setEditingItem} 
          onUpdate={handleUpdateItem} 
          onCancel={() => setEditingItem(null)} 
        />
      )}

      <InventoryQRModal 
        showQRCodeModal={showQRCodeModal} 
        setShowQRCodeModal={setShowQRCodeModal} 
      />
    </div>
  );
}
