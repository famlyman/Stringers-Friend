import React, { useState, useEffect } from "react";
import { RACQUET_BRANDS, RACQUET_MODELS, STRINGS } from "../constants";
import { Plus, Search, UserPlus, Mail, Phone, ChevronRight, Edit2, Trash2, X, Printer } from "lucide-react";
import QRCodeDisplay from "../components/QRCodeDisplay";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  writeBatch,
  getDocs
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { v4 as uuidv4 } from 'uuid';

export default function CustomerList({ user }: { user: any }) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", email: "", phone: "" });
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [racquets, setRacquets] = useState<any[]>([]);
  const [showAddRacquet, setShowAddRacquet] = useState(false);
  const [newRacquet, setNewRacquet] = useState({ 
    brand: "", 
    brand_custom: "",
    model: "", 
    model_custom: "",
    serial_number: "", 
    head_size: "", 
    string_pattern_mains: "", 
    string_pattern_crosses: "",
    string_main_brand: "",
    string_main_model: "",
    string_main_brand_custom: "",
    string_main_model_custom: "",
    string_cross_brand: "",
    string_cross_model: "",
    string_cross_brand_custom: "",
    string_cross_model_custom: "",
    current_string_main: "",
    current_string_cross: "",
    current_tension_main: "",
    current_tension_cross: ""
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [editingRacquet, setEditingRacquet] = useState<any | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'customer' | 'racquet', id: string, name?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user || !user.shop_id) return;

    // Fetch Shop
    const unsubscribeShop = onSnapshot(doc(db, "shops", user.shop_id), (docSnap) => {
      if (docSnap.exists()) {
        setShop(docSnap.data());
      }
    });

    const q = query(
      collection(db, "customers"), 
      where("shop_id", "==", user.shop_id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const customerList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCustomers(customerList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "customers");
      setLoading(false);
    });

    return () => {
      unsubscribeShop();
      unsubscribe();
    };
  }, [user.shop_id]);

  useEffect(() => {
    if (!selectedCustomer) {
      setRacquets([]);
      return;
    }

    const q = query(
      collection(db, "racquets"), 
      where("customer_id", "==", selectedCustomer.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const racquetList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRacquets(racquetList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `racquets?customer_id=${selectedCustomer.id}`);
    });

    return () => unsubscribe();
  }, [selectedCustomer?.id]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Check if a user with this email already exists as a customer
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", newCustomer.email), where("role", "==", "customer"));
      const userSnap = await getDocs(q);
      let linkedUid = null;
      if (!userSnap.empty) {
        linkedUid = userSnap.docs[0].id;
      }

      await addDoc(collection(db, "customers"), {
        ...newCustomer,
        shop_id: user.shop_id,
        uid: linkedUid,
        created_at: serverTimestamp()
      });
      setShowAdd(false);
      setNewCustomer({ name: "", email: "", phone: "" });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "customers");
    }
  };

  const handleAddRacquet = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const racquetId = uuidv4();
      const brand = newRacquet.brand === "Other" ? newRacquet.brand_custom : newRacquet.brand;
      const model = newRacquet.model === "Other" ? newRacquet.model_custom : newRacquet.model;

      const stringMain = newRacquet.string_main_brand === "Other" 
        ? `${newRacquet.string_main_brand_custom} ${newRacquet.string_main_model_custom}`
        : `${newRacquet.string_main_brand} ${newRacquet.string_main_model}`;
      
      const stringCross = newRacquet.string_cross_brand === "Other"
        ? `${newRacquet.string_cross_brand_custom} ${newRacquet.string_cross_model_custom}`
        : (newRacquet.string_cross_brand === "Same as Mains" ? stringMain : `${newRacquet.string_cross_brand} ${newRacquet.string_cross_model}`);

      await addDoc(collection(db, "racquets"), {
        ...newRacquet, 
        brand,
        model,
        customer_id: selectedCustomer.id,
        customer_email: selectedCustomer.email,
        shop_id: user.shop_id,
        head_size: parseInt(newRacquet.head_size) || 0,
        string_pattern_mains: parseInt(newRacquet.string_pattern_mains) || 0,
        string_pattern_crosses: parseInt(newRacquet.string_pattern_crosses) || 0,
        current_string_main: stringMain,
        current_string_cross: stringCross,
        current_tension_main: parseFloat(newRacquet.current_tension_main) || 0,
        current_tension_cross: parseFloat(newRacquet.current_tension_cross) || 0,
        qr_code: `racquet_${racquetId}`,
        created_at: serverTimestamp()
      });
      setShowAddRacquet(false);
      setNewRacquet({ 
        brand: "", brand_custom: "", model: "", model_custom: "", serial_number: "", head_size: "", 
        string_pattern_mains: "", string_pattern_crosses: "",
        string_main_brand: "", string_main_model: "", string_main_brand_custom: "", string_main_model_custom: "",
        string_cross_brand: "", string_cross_model: "", string_cross_brand_custom: "", string_cross_model_custom: "",
        current_string_main: "", current_string_cross: "",
        current_tension_main: "", current_tension_cross: ""
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "racquets");
    }
  };

  const handleUpdateRacquet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRacquet) return;
    setSubmitting(true);
    try {
      const { id, ...data } = editingRacquet;
      await updateDoc(doc(db, "racquets", id), {
        ...data,
        updated_at: serverTimestamp()
      });
      setEditingRacquet(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `racquets/${editingRacquet.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRacquet = async (racquetId: string) => {
    try {
      await deleteDoc(doc(db, "racquets", racquetId));
      setDeleteConfirm(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `racquets/${racquetId}`);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    try {
      const batch = writeBatch(db);
      
      // Delete customer
      batch.delete(doc(db, "customers", customerId));
      
      // Delete customer's racquets
      const racquetsSnap = await getDocs(query(collection(db, "racquets"), where("customer_id", "==", customerId)));
      racquetsSnap.forEach(rDoc => {
        batch.delete(doc(db, "racquets", rDoc.id));
      });
      
      // Delete customer's jobs
      const jobsSnap = await getDocs(query(collection(db, "jobs"), where("customer_id", "==", customerId)));
      jobsSnap.forEach(jDoc => {
        batch.delete(doc(db, "jobs", jDoc.id));
      });
      
      await batch.commit();
      setDeleteConfirm(null);
      setSelectedCustomer(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `delete_customer/${customerId}`);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.phone && c.phone.includes(searchTerm))
  );

  return (
    <div className="relative">
      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-sm w-full shadow-xl border border-neutral-200 dark:border-neutral-800">
            <h3 className="text-xl font-bold text-primary mb-2">Confirm Delete</h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              Are you sure you want to delete this {deleteConfirm.type}{deleteConfirm.name ? ` "${deleteConfirm.name}"` : ""}? 
              {deleteConfirm.type === 'customer' && " This will also delete all their racquets and jobs. This action cannot be undone."}
              {deleteConfirm.type === 'racquet' && " This action cannot be undone."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (deleteConfirm.type === 'customer') handleDeleteCustomer(deleteConfirm.id);
                  else if (deleteConfirm.type === 'racquet') handleDeleteRacquet(deleteConfirm.id);
                }}
                className="flex-1 bg-red-600 text-white py-2 rounded-xl font-semibold hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 py-2 rounded-xl font-semibold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Racquet Modal */}
      {editingRacquet && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-8 max-w-md w-full shadow-2xl relative text-left border border-neutral-200 dark:border-neutral-800">
            <button 
              onClick={() => setEditingRacquet(null)}
              className="absolute top-6 right-6 p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-neutral-400" />
            </button>

            <h2 className="text-2xl font-bold text-primary mb-6">Edit Racquet</h2>
            
            <form onSubmit={handleUpdateRacquet} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Brand</label>
                <select 
                  required
                  value={RACQUET_BRANDS.includes(editingRacquet.brand) ? editingRacquet.brand : "Other"}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === "Other") {
                      setEditingRacquet({...editingRacquet, brand: ""});
                    } else {
                      setEditingRacquet({...editingRacquet, brand: val, model: ""});
                    }
                  }}
                  className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select Brand</option>
                  {RACQUET_BRANDS.map(brand => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                  <option value="Other">Other</option>
                </select>
                {(!RACQUET_BRANDS.includes(editingRacquet.brand) || editingRacquet.brand === "") && (
                  <input 
                    type="text" 
                    placeholder="Enter Brand" 
                    required
                    value={editingRacquet.brand}
                    onChange={e => setEditingRacquet({...editingRacquet, brand: e.target.value})}
                    className="w-full mt-2 px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Model</label>
                {RACQUET_BRANDS.includes(editingRacquet.brand) ? (
                  <select 
                    required
                    value={RACQUET_MODELS[editingRacquet.brand]?.includes(editingRacquet.model) ? editingRacquet.model : "Other"}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === "Other") {
                        setEditingRacquet({...editingRacquet, model: ""});
                      } else {
                        setEditingRacquet({...editingRacquet, model: val});
                      }
                    }}
                    className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select Model</option>
                    {RACQUET_MODELS[editingRacquet.brand]?.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                    <option value="Other">Other</option>
                  </select>
                ) : null}
                {(!RACQUET_MODELS[editingRacquet.brand]?.includes(editingRacquet.model) || editingRacquet.model === "") && (
                  <input 
                    type="text" 
                    placeholder="Enter Model" 
                    required
                    value={editingRacquet.model}
                    onChange={e => setEditingRacquet({...editingRacquet, model: e.target.value})}
                    className="w-full mt-2 px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Serial Number</label>
                <input 
                  type="text" 
                  value={editingRacquet.serial_number || ""}
                  onChange={e => setEditingRacquet({...editingRacquet, serial_number: e.target.value})}
                  className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Head Size</label>
                  <input 
                    type="number" 
                    value={editingRacquet.head_size || ""}
                    onChange={e => setEditingRacquet({...editingRacquet, head_size: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                    placeholder="sq in"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Mains</label>
                  <input 
                    type="number" 
                    value={editingRacquet.string_pattern_mains || ""}
                    onChange={e => setEditingRacquet({...editingRacquet, string_pattern_mains: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Crosses</label>
                  <input 
                    type="number" 
                    value={editingRacquet.string_pattern_crosses || ""}
                    onChange={e => setEditingRacquet({...editingRacquet, string_pattern_crosses: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Current Main String Brand</label>
                  <select 
                    value={STRINGS.find(brand => editingRacquet.current_string_main?.startsWith(brand.brand))?.brand || "Other"}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === "Other") {
                        setEditingRacquet({...editingRacquet, current_string_main: ""});
                      } else {
                        setEditingRacquet({...editingRacquet, current_string_main: val + " "});
                      }
                    }}
                    className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select Brand</option>
                    {STRINGS.map(s => (
                      <option key={s.brand} value={s.brand}>{s.brand}</option>
                    ))}
                    <option value="Other">Other</option>
                  </select>
                  {(!STRINGS.some(brand => editingRacquet.current_string_main?.startsWith(brand.brand)) || editingRacquet.current_string_main === "") && (
                    <input 
                      type="text" 
                      placeholder="Enter String" 
                      value={editingRacquet.current_string_main || ""}
                      onChange={e => setEditingRacquet({...editingRacquet, current_string_main: e.target.value})}
                      className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                    />
                  )}
                  {STRINGS.some(brand => editingRacquet.current_string_main?.startsWith(brand.brand)) && (
                    <select 
                      value={editingRacquet.current_string_main?.split(' ').slice(1).join(' ') || ""}
                      onChange={e => {
                        const brand = STRINGS.find(b => editingRacquet.current_string_main?.startsWith(b.brand))?.brand;
                        setEditingRacquet({...editingRacquet, current_string_main: brand + " " + e.target.value});
                      }}
                      className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select Model</option>
                      {STRINGS.find(b => editingRacquet.current_string_main?.startsWith(b.brand))?.models.map(model => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                      <option value="Other">Other</option>
                    </select>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Current Cross String Brand</label>
                  <select 
                    value={editingRacquet.current_string_cross === editingRacquet.current_string_main ? "Same as Mains" : (STRINGS.find(brand => editingRacquet.current_string_cross?.startsWith(brand.brand))?.brand || "Other")}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === "Same as Mains") {
                        setEditingRacquet({...editingRacquet, current_string_cross: editingRacquet.current_string_main});
                      } else if (val === "Other") {
                        setEditingRacquet({...editingRacquet, current_string_cross: ""});
                      } else {
                        setEditingRacquet({...editingRacquet, current_string_cross: val + " "});
                      }
                    }}
                    className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select Brand</option>
                    <option value="Same as Mains">Same as Mains</option>
                    {STRINGS.map(s => (
                      <option key={s.brand} value={s.brand}>{s.brand}</option>
                    ))}
                    <option value="Other">Other</option>
                  </select>
                  {editingRacquet.current_string_cross !== editingRacquet.current_string_main && (!STRINGS.some(brand => editingRacquet.current_string_cross?.startsWith(brand.brand)) || editingRacquet.current_string_cross === "") && (
                    <input 
                      type="text" 
                      placeholder="Enter String" 
                      value={editingRacquet.current_string_cross || ""}
                      onChange={e => setEditingRacquet({...editingRacquet, current_string_cross: e.target.value})}
                      className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                    />
                  )}
                  {editingRacquet.current_string_cross !== editingRacquet.current_string_main && STRINGS.some(brand => editingRacquet.current_string_cross?.startsWith(brand.brand)) && (
                    <select 
                      value={editingRacquet.current_string_cross?.split(' ').slice(1).join(' ') || ""}
                      onChange={e => {
                        const brand = STRINGS.find(b => editingRacquet.current_string_cross?.startsWith(b.brand))?.brand;
                        setEditingRacquet({...editingRacquet, current_string_cross: brand + " " + e.target.value});
                      }}
                      className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select Model</option>
                      {STRINGS.find(b => editingRacquet.current_string_cross?.startsWith(b.brand))?.models.map(model => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                      <option value="Other">Other</option>
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Current Main Tension</label>
                  <input 
                    type="number" 
                    value={editingRacquet.current_tension_main || ""}
                    onChange={e => setEditingRacquet({...editingRacquet, current_tension_main: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Current Cross Tension</label>
                  <input 
                    type="number" 
                    value={editingRacquet.current_tension_cross || ""}
                    onChange={e => setEditingRacquet({...editingRacquet, current_tension_cross: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="flex-1 bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
                <button 
                  type="button" 
                  onClick={() => setEditingRacquet(null)} 
                  className="flex-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 py-3 rounded-xl font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Customer List */}
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

          {showAdd && (
            <form onSubmit={handleAddCustomer} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 space-y-4 shadow-sm">
              <input 
                type="text" 
                placeholder="Name" 
                required
                value={newCustomer.name}
                onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
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
                required
                value={newCustomer.phone}
                onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors">Save</button>
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 py-2 rounded-lg text-sm font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">Cancel</button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {filteredCustomers.map((customer) => (
              <button
                key={customer.id}
                onClick={() => setSelectedCustomer(customer)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  selectedCustomer?.id === customer.id 
                    ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" 
                    : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white hover:border-primary/50"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold">{customer.name}</p>
                    <p className={`text-xs ${selectedCustomer?.id === customer.id ? "text-white/70" : "text-neutral-500"}`}>
                      {customer.email}
                    </p>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${selectedCustomer?.id === customer.id ? "text-white" : "text-neutral-300 dark:text-neutral-600"}`} />
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

        {/* Customer Details & Racquets */}
        <div className="lg:col-span-2">
          {selectedCustomer ? (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white">{selectedCustomer.name}</h2>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-2">
                      <div className="flex items-center text-sm text-neutral-500 dark:text-neutral-400">
                        <Mail className="w-4 h-4 mr-2" />
                        {selectedCustomer.email}
                      </div>
                      <div className="flex items-center text-sm text-neutral-500 dark:text-neutral-400">
                        <Phone className="w-4 h-4 mr-2" />
                        {selectedCustomer.phone}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <button 
                      onClick={() => setDeleteConfirm({ type: 'customer', id: selectedCustomer.id, name: selectedCustomer.name })}
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

                {showAddRacquet && (
                  <div className="mb-8 p-6 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700">
                    <h3 className="font-bold mb-4 text-neutral-900 dark:text-white">New Racquet Details</h3>
                    <form onSubmit={handleAddRacquet} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider">Brand</label>
                        <select 
                          required
                          value={newRacquet.brand}
                          onChange={e => setNewRacquet({...newRacquet, brand: e.target.value, model: ""})}
                          className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Select Brand</option>
                          {RACQUET_BRANDS.map(brand => (
                            <option key={brand} value={brand}>{brand}</option>
                          ))}
                          <option value="Other">Other</option>
                        </select>
                        {newRacquet.brand === "Other" && (
                          <input 
                            type="text" 
                            placeholder="Enter Brand" 
                            required
                            className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                            onChange={e => setNewRacquet({...newRacquet, brand_custom: e.target.value})}
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider">Model</label>
                        {newRacquet.brand && newRacquet.brand !== "Other" ? (
                          <select 
                            required
                            value={newRacquet.model}
                            onChange={e => setNewRacquet({...newRacquet, model: e.target.value})}
                            className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="">Select Model</option>
                            {RACQUET_MODELS[newRacquet.brand]?.map(model => (
                              <option key={model} value={model}>{model}</option>
                            ))}
                            <option value="Other">Other</option>
                          </select>
                        ) : (
                          <input 
                            type="text" 
                            placeholder="Enter Model" 
                            required
                            value={newRacquet.model}
                            onChange={e => setNewRacquet({...newRacquet, model: e.target.value})}
                            className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                          />
                        )}
                        {newRacquet.model === "Other" && (
                          <input 
                            type="text" 
                            placeholder="Enter Model" 
                            required
                            className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                            onChange={e => setNewRacquet({...newRacquet, model_custom: e.target.value})}
                          />
                        )}
                      </div>
                      <input 
                        type="text" 
                        placeholder="Serial Number" 
                        value={newRacquet.serial_number}
                        onChange={e => setNewRacquet({...newRacquet, serial_number: e.target.value})}
                        className="px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                      />
                      <input 
                        type="number" 
                        placeholder="Head Size (sq in)" 
                        value={newRacquet.head_size}
                        onChange={e => setNewRacquet({...newRacquet, head_size: e.target.value})}
                        className="px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                      />
                      <input 
                        type="number" 
                        placeholder="Mains (e.g. 16)" 
                        value={newRacquet.string_pattern_mains}
                        onChange={e => setNewRacquet({...newRacquet, string_pattern_mains: e.target.value})}
                        className="px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                      />
                      <input 
                        type="number" 
                        placeholder="Crosses (e.g. 19)" 
                        value={newRacquet.string_pattern_crosses}
                        onChange={e => setNewRacquet({...newRacquet, string_pattern_crosses: e.target.value})}
                        className="px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                      />
                      <div className="md:col-span-2 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider">Current Main String Brand</label>
                            <select 
                              value={newRacquet.string_main_brand}
                              onChange={e => setNewRacquet({...newRacquet, string_main_brand: e.target.value, string_main_model: ""})}
                              className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="">Select Brand</option>
                              {STRINGS.map(s => (
                                <option key={s.brand} value={s.brand}>{s.brand}</option>
                              ))}
                              <option value="Other">Other</option>
                            </select>
                            {newRacquet.string_main_brand === "Other" && (
                              <input 
                                type="text" 
                                placeholder="Enter Brand" 
                                className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                onChange={e => setNewRacquet({...newRacquet, string_main_brand_custom: e.target.value})}
                              />
                            )}
                          </div>
                          <div className="space-y-2">
                            <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider">Current Main String Model</label>
                            {newRacquet.string_main_brand && newRacquet.string_main_brand !== "Other" ? (
                              <select 
                                value={newRacquet.string_main_model}
                                onChange={e => setNewRacquet({...newRacquet, string_main_model: e.target.value})}
                                className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                              >
                                <option value="">Select Model</option>
                                {STRINGS.find(s => s.brand === newRacquet.string_main_brand)?.models.map(model => (
                                  <option key={model} value={model}>{model}</option>
                                ))}
                                <option value="Other">Other</option>
                              </select>
                            ) : (
                              <input 
                                type="text" 
                                placeholder="Enter Model" 
                                value={newRacquet.string_main_model}
                                onChange={e => setNewRacquet({...newRacquet, string_main_model: e.target.value})}
                                className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                              />
                            )}
                            {newRacquet.string_main_model === "Other" && (
                              <input 
                                type="text" 
                                placeholder="Enter Model" 
                                className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                onChange={e => setNewRacquet({...newRacquet, string_main_model_custom: e.target.value})}
                              />
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider">Current Cross String Brand</label>
                            <select 
                              value={newRacquet.string_cross_brand}
                              onChange={e => setNewRacquet({...newRacquet, string_cross_brand: e.target.value, string_cross_model: ""})}
                              className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="">Select Brand</option>
                              <option value="Same as Mains">Same as Mains</option>
                              {STRINGS.map(s => (
                                <option key={s.brand} value={s.brand}>{s.brand}</option>
                              ))}
                              <option value="Other">Other</option>
                            </select>
                            {newRacquet.string_cross_brand === "Other" && (
                              <input 
                                type="text" 
                                placeholder="Enter Brand" 
                                className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                onChange={e => setNewRacquet({...newRacquet, string_cross_brand_custom: e.target.value})}
                              />
                            )}
                          </div>
                          <div className="space-y-2">
                            <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider">Current Cross String Model</label>
                            {newRacquet.string_cross_brand && newRacquet.string_cross_brand !== "Other" && newRacquet.string_cross_brand !== "Same as Mains" ? (
                              <select 
                                value={newRacquet.string_cross_model}
                                onChange={e => setNewRacquet({...newRacquet, string_cross_model: e.target.value})}
                                className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                              >
                                <option value="">Select Model</option>
                                {STRINGS.find(s => s.brand === newRacquet.string_cross_brand)?.models.map(model => (
                                  <option key={model} value={model}>{model}</option>
                                ))}
                                <option value="Other">Other</option>
                              </select>
                            ) : (
                              <input 
                                type="text" 
                                placeholder="Enter Model" 
                                disabled={newRacquet.string_cross_brand === "Same as Mains"}
                                value={newRacquet.string_cross_brand === "Same as Mains" ? "Same as Mains" : newRacquet.string_cross_model}
                                onChange={e => setNewRacquet({...newRacquet, string_cross_model: e.target.value})}
                                className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                              />
                            )}
                            {newRacquet.string_cross_model === "Other" && (
                              <input 
                                type="text" 
                                placeholder="Enter Model" 
                                className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                onChange={e => setNewRacquet({...newRacquet, string_cross_model_custom: e.target.value})}
                              />
                            )}
                          </div>
                        </div>
                        <input 
                          type="number" 
                          placeholder="Current Main Tension" 
                          value={newRacquet.current_tension_main}
                          onChange={e => setNewRacquet({...newRacquet, current_tension_main: e.target.value})}
                          className="px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                        />
                        <input 
                          type="number" 
                          placeholder="Current Cross Tension" 
                          value={newRacquet.current_tension_cross}
                          onChange={e => setNewRacquet({...newRacquet, current_tension_cross: e.target.value})}
                          className="px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div className="flex gap-2 md:col-span-2">
                        <button type="submit" className="flex-1 bg-primary text-white py-2 rounded-xl font-bold hover:bg-primary/90 transition-colors">Save</button>
                        <button type="button" onClick={() => setShowAddRacquet(false)} className="flex-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 py-2 rounded-xl font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">Cancel</button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {racquets.map((racquet) => (
                    <div key={racquet.id} className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                      <div className="flex-1 min-w-0 w-full">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-bold text-neutral-900 dark:text-white truncate">
                            {racquet.brand} {racquet.model}
                          </h4>
                          {racquet.serial_number && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 rounded font-mono">
                              {racquet.serial_number}
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                          {racquet.head_size > 0 && (
                            <div className="flex flex-col">
                              <span className="text-neutral-400 uppercase text-[10px] font-bold tracking-wider">Head Size</span>
                              <span className="text-neutral-700 dark:text-neutral-300 truncate">{racquet.head_size} sq in</span>
                            </div>
                          )}
                          {racquet.string_pattern_mains > 0 && (
                            <div className="flex flex-col">
                              <span className="text-neutral-400 uppercase text-[10px] font-bold tracking-wider">Pattern</span>
                              <span className="text-neutral-700 dark:text-neutral-300 truncate">{racquet.string_pattern_mains}x{racquet.string_pattern_crosses}</span>
                            </div>
                          )}
                          {racquet.current_string_main && (
                            <div className="col-span-2 mt-1">
                              <span className="text-neutral-400 uppercase text-[10px] font-bold tracking-wider">Current Setup</span>
                              <p className="text-neutral-700 dark:text-neutral-300 truncate">
                                {racquet.current_string_main} / {racquet.current_string_cross} @ {racquet.current_tension_main}/{racquet.current_tension_cross} lbs
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 flex gap-2">
                          <button 
                            onClick={() => setEditingRacquet(racquet)}
                            className="p-2 text-neutral-400 hover:text-primary transition-colors"
                            title="Edit Racquet"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setDeleteConfirm({ type: 'racquet', id: racquet.id, name: `${racquet.brand} ${racquet.model}` })}
                            className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
                            title="Delete Racquet"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex-shrink-0 w-full sm:w-auto flex justify-center sm:justify-end border-t sm:border-t-0 sm:border-l border-neutral-200 dark:border-neutral-700 pt-4 sm:pt-0 sm:pl-6">
                        <QRCodeDisplay 
                          value={racquet.qr_code} 
                          label={`${racquet.brand} ${racquet.model}`} 
                          serialNumber={racquet.serial_number}
                          minimal={true}
                        />
                      </div>
                    </div>
                  ))}
                  {racquets.length === 0 && (
                    <div className="col-span-full py-12 text-center text-neutral-400 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">
                      No racquets registered for this customer.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-neutral-400 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-12">
              <Search className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-lg font-medium">Select a customer to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
