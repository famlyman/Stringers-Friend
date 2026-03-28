import React, { useState, useEffect } from "react";
import { Plus, Search, Trash2, Edit2, AlertCircle } from "lucide-react";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";

export default function Inventory({ user }: { user: any }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [newItem, setNewItem] = useState({ 
    name: "", 
    brand: "", 
    type: "string", 
    sub_type: "set", 
    length: 0, 
    grip_type: "tacky",
    quantity: 0, 
    low_stock_threshold: 5,
    price: 0 
  });

  useEffect(() => {
    if (!user || !user.shop_id) return;

    const q = query(
      collection(db, "inventory"), 
      where("shop_id", "==", user.shop_id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const inventoryItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setItems(inventoryItems);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "inventory");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user.shop_id]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "inventory"), {
        ...newItem,
        shop_id: user.shop_id,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
      setShowAdd(false);
      setNewItem({ 
        name: "", 
        brand: "", 
        type: "string", 
        sub_type: "set", 
        length: 0, 
        grip_type: "tacky",
        quantity: 0, 
        low_stock_threshold: 5,
        price: 0 
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "inventory");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { id, ...data } = editingItem;
      await updateDoc(doc(db, "inventory", id), {
        ...data,
        updated_at: serverTimestamp()
      });
      setEditingItem(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `inventory/${editingItem.id}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      await deleteDoc(doc(db, "inventory", id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `inventory/${id}`);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesType = filterType === "all" || item.type === filterType;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         item.brand.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-8">
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

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input 
            type="text"
            placeholder="Search inventory..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-primary transition-all"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'string', 'grip', 'dampener', 'other'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all ${
                filterType === type 
                  ? 'bg-primary text-white shadow-md' 
                  : 'bg-white dark:bg-neutral-900 text-neutral-500 border border-neutral-200 dark:border-neutral-800 hover:border-primary/50'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {showAdd && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-200">
          <h3 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-white">Add New Inventory Item</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-500 uppercase ml-1">Type</label>
                <select 
                  value={newItem.type}
                  onChange={e => setNewItem({...newItem, type: e.target.value, sub_type: e.target.value === 'string' ? 'set' : '', grip_type: e.target.value === 'grip' ? 'tacky' : ''})}
                  className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="string">String</option>
                  <option value="grip">Grip</option>
                  <option value="dampener">Dampener</option>
                </select>
              </div>

              {newItem.type === 'string' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-500 uppercase ml-1">Packaging</label>
                  <select 
                    value={newItem.sub_type}
                    onChange={e => setNewItem({...newItem, sub_type: e.target.value, length: e.target.value === 'reel' ? 660 : 0})}
                    className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="set">Individual Set</option>
                    <option value="reel">Reel</option>
                  </select>
                </div>
              )}

              {newItem.type === 'string' && newItem.sub_type === 'reel' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-500 uppercase ml-1">Reel Length (ft)</label>
                  <div className="flex gap-2">
                    <select 
                      value={[330, 660].includes(newItem.length) ? newItem.length : 'other'}
                      onChange={e => {
                        const val = e.target.value;
                        setNewItem({...newItem, length: val === 'other' ? 0 : parseInt(val)});
                      }}
                      className="flex-1 px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="330">330 ft</option>
                      <option value="660">660 ft</option>
                      <option value="other">Other</option>
                    </select>
                    {![330, 660].includes(newItem.length) && (
                      <input 
                        type="number" 
                        placeholder="Custom ft"
                        value={newItem.length || ""}
                        onChange={e => setNewItem({...newItem, length: parseInt(e.target.value) || 0})}
                        className="w-24 px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                      />
                    )}
                  </div>
                </div>
              )}

              {newItem.type === 'grip' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-500 uppercase ml-1">Grip Feel</label>
                  <select 
                    value={newItem.grip_type}
                    onChange={e => setNewItem({...newItem, grip_type: e.target.value})}
                    className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="tacky">Tacky</option>
                    <option value="dry">Dry</option>
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-500 uppercase ml-1">Brand</label>
                <input 
                  type="text" 
                  placeholder="e.g. Wilson" 
                  required
                  value={newItem.brand}
                  onChange={e => setNewItem({...newItem, brand: e.target.value})}
                  className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-500 uppercase ml-1">Model Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Sensation" 
                  required
                  value={newItem.name}
                  onChange={e => setNewItem({...newItem, name: e.target.value})}
                  className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-500 uppercase ml-1">Quantity</label>
                <input 
                  type="number" 
                  placeholder="0" 
                  required
                  value={newItem.quantity}
                  onChange={e => setNewItem({...newItem, quantity: parseInt(e.target.value) || 0})}
                  className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-500 uppercase ml-1">Price ($)</label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="0.00" 
                  required
                  value={newItem.price}
                  onChange={e => setNewItem({...newItem, price: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-500 uppercase ml-1">Low Stock Alert at</label>
                <input 
                  type="number" 
                  placeholder="5" 
                  required
                  value={newItem.low_stock_threshold}
                  onChange={e => setNewItem({...newItem, low_stock_threshold: parseInt(e.target.value) || 0})}
                  className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors">Save Item</button>
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 py-3 rounded-xl font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-x-auto shadow-sm">
        <table className="w-full text-left border-collapse min-w-[600px] sm:min-w-0">
          <thead>
            <tr className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800">
              <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Item</th>
              <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Details</th>
              <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Stock</th>
              <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Price</th>
              <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {filteredItems.map((item) => (
              <tr key={item.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-medium text-neutral-900 dark:text-white">{item.name}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{item.brand}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="capitalize text-sm text-neutral-600 dark:text-neutral-300 font-medium">{item.type}</span>
                    <span className="text-xs text-neutral-400">
                      {item.type === 'string' && (item.sub_type === 'reel' ? `Reel (${item.length}ft)` : 'Individual Set')}
                      {item.type === 'grip' && `${item.grip_type} feel`}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <span className={`text-sm font-medium ${item.quantity <= (item.low_stock_threshold || 5) ? 'text-red-600' : 'text-neutral-900 dark:text-white'}`}>
                      {item.quantity} units
                    </span>
                    {item.quantity <= (item.low_stock_threshold || 5) && <AlertCircle className="w-4 h-4 ml-2 text-red-500" />}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-medium text-neutral-900 dark:text-white">${item.price.toFixed(2)}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => setEditingItem(item)}
                    className="p-2 text-neutral-400 hover:text-primary transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-neutral-400 hover:text-red-600 transition-colors ml-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">
                  Your inventory is empty. Add your first item to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-8 max-w-2xl w-full shadow-2xl animate-in zoom-in duration-200 border border-neutral-200 dark:border-neutral-800">
            <h2 className="text-2xl font-bold mb-6 text-primary">Edit Inventory Item</h2>
            <form onSubmit={handleUpdate} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-500 uppercase ml-1">Type</label>
                  <select 
                    value={editingItem.type}
                    onChange={e => setEditingItem({...editingItem, type: e.target.value, sub_type: e.target.value === 'string' ? 'set' : '', grip_type: e.target.value === 'grip' ? 'tacky' : ''})}
                    className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="string">String</option>
                    <option value="grip">Grip</option>
                    <option value="dampener">Dampener</option>
                  </select>
                </div>

                {editingItem.type === 'string' && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-500 uppercase ml-1">Packaging</label>
                    <select 
                      value={editingItem.sub_type}
                      onChange={e => setEditingItem({...editingItem, sub_type: e.target.value, length: e.target.value === 'reel' ? 660 : 0})}
                      className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="set">Individual Set</option>
                      <option value="reel">Reel</option>
                    </select>
                  </div>
                )}

                {editingItem.type === 'string' && editingItem.sub_type === 'reel' && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-500 uppercase ml-1">Reel Length (ft)</label>
                    <div className="flex gap-2">
                      <select 
                        value={[330, 660].includes(editingItem.length) ? editingItem.length : 'other'}
                        onChange={e => {
                          const val = e.target.value;
                          setEditingItem({...editingItem, length: val === 'other' ? 0 : parseInt(val)});
                        }}
                        className="flex-1 px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="330">330 ft</option>
                        <option value="660">660 ft</option>
                        <option value="other">Other</option>
                      </select>
                      {![330, 660].includes(editingItem.length) && (
                        <input 
                          type="number" 
                          placeholder="Custom ft"
                          value={editingItem.length || ""}
                          onChange={e => setEditingItem({...editingItem, length: parseInt(e.target.value) || 0})}
                          className="w-24 px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                        />
                      )}
                    </div>
                  </div>
                )}

                {editingItem.type === 'grip' && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-500 uppercase ml-1">Grip Feel</label>
                    <select 
                      value={editingItem.grip_type}
                      onChange={e => setEditingItem({...editingItem, grip_type: e.target.value})}
                      className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="tacky">Tacky</option>
                      <option value="dry">Dry</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-500 uppercase ml-1">Brand</label>
                  <input 
                    type="text" 
                    required
                    value={editingItem.brand}
                    onChange={e => setEditingItem({...editingItem, brand: e.target.value})}
                    className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-500 uppercase ml-1">Model Name</label>
                  <input 
                    type="text" 
                    required
                    value={editingItem.name}
                    onChange={e => setEditingItem({...editingItem, name: e.target.value})}
                    className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-500 uppercase ml-1">Quantity</label>
                  <input 
                    type="number" 
                    required
                    value={editingItem.quantity}
                    onChange={e => setEditingItem({...editingItem, quantity: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-500 uppercase ml-1">Price ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={editingItem.price}
                    onChange={e => setEditingItem({...editingItem, price: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-500 uppercase ml-1">Low Stock Alert at</label>
                  <input 
                    type="number" 
                    required
                    value={editingItem.low_stock_threshold || 0}
                    onChange={e => setEditingItem({...editingItem, low_stock_threshold: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors">Update Item</button>
                <button type="button" onClick={() => setEditingItem(null)} className="flex-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 py-3 rounded-xl font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
