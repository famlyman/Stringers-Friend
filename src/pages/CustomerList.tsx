import React, { useState, useEffect, useMemo } from "react";
import { RACQUET_BRANDS, RACQUET_MODELS, STRINGS, GAUGES } from "../constants";
import { racquetSpecsService } from "../services/racquetSpecsService";
import { Plus, Search, UserPlus, Mail, Phone, ChevronRight, Edit2, Trash2, X, Printer, Info } from "lucide-react";
import QRCodeDisplay from "../components/QRCodeDisplay";
import { supabase } from "../lib/supabase";

export default function CustomerList({ user }: { user: any }) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ first_name: "", last_name: "", email: "", phone: "" });
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
    mains_skip: "",
    mains_tie_off: "",
    crosses_start: "",
    crosses_tie_off: "",
    one_piece_length: "",
    two_piece_length: "",
    stringing_instructions: "",
    string_main_brand: "",
    string_main_model: "",
    string_main_brand_custom: "",
    string_main_model_custom: "",
    string_main_gauge: "",
    string_cross_brand: "",
    string_cross_model: "",
    string_cross_brand_custom: "",
    string_cross_model_custom: "",
    string_cross_gauge: "",
    current_tension_main: "",
    current_tension_cross: ""
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [editingRacquet, setEditingRacquet] = useState<any | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'customer' | 'racquet', id: string, name?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fetchingSpecs, setFetchingSpecs] = useState(false);
  const [searchingModels, setSearchingModels] = useState(false);
  const [modelSuggestions, setModelSuggestions] = useState<string[]>([]);
  const [showModelSuggestions, setShowModelSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allRacquets, setAllRacquets] = useState<any[]>([]);
  const [inventoryStrings, setInventoryStrings] = useState<any[]>([]);

  const customModels = useMemo(() => {
    const models: Record<string, string[]> = {};
    allRacquets.forEach(r => {
      if (r.brand && r.model) {
        if (!models[r.brand]) models[r.brand] = [];
        if (!models[r.brand].includes(r.model)) {
          if (!RACQUET_MODELS[r.brand]?.includes(r.model)) {
            models[r.brand].push(r.model);
          }
        }
      }
    });
    return models;
  }, [allRacquets]);

  const handleFetchSpecs = async (brandParam?: string, modelParam?: string, isEditing: boolean = false) => {
    const brand = brandParam || (isEditing ? editingRacquet.brand : (newRacquet.brand === "Other" ? newRacquet.brand_custom : newRacquet.brand));
    const model = modelParam || (isEditing ? editingRacquet.model : (newRacquet.model === "Other" ? newRacquet.model_custom : newRacquet.model));

    if (!brand || !model) {
      setError("Please select a brand and model first.");
      return;
    }

    setFetchingSpecs(true);
    setError(null);
    try {
      const specs = await racquetSpecsService.getSpecs(brand, model);
      if (specs) {
        if (isEditing) {
          setEditingRacquet(prev => ({
            ...prev,
            head_size: specs.headSize,
            string_pattern_mains: specs.patternMains,
            string_pattern_crosses: specs.patternCrosses,
            mains_skip: specs.mainsSkip || "",
            mains_tie_off: specs.mainsTieOff || "",
            crosses_start: specs.crossesStart || "",
            crosses_tie_off: specs.crossesTieOff || "",
            one_piece_length: specs.onePieceLength || 0,
            two_piece_length: specs.twoPieceLength || 0,
            stringing_instructions: specs.stringingInstructions || "",
          }));
        } else {
          setNewRacquet(prev => ({
            ...prev,
            head_size: specs.headSize.toString(),
            string_pattern_mains: specs.patternMains.toString(),
            string_pattern_crosses: specs.patternCrosses.toString(),
            mains_skip: specs.mainsSkip || "",
            mains_tie_off: specs.mainsTieOff || "",
            crosses_start: specs.crossesStart || "",
            crosses_tie_off: specs.crossesTieOff || "",
            one_piece_length: specs.onePieceLength?.toString() || "",
            two_piece_length: specs.twoPieceLength?.toString() || "",
            stringing_instructions: specs.stringingInstructions || "",
          }));
        }
      } else {
        setError("Could not find specifications for this model.");
      }
    } catch (err) {
      console.error("Error fetching specs in handleFetchSpecs:", err);
      setError(`Failed to fetch specifications: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setFetchingSpecs(false);
    }
  };

  const handleSearchModels = async (query: string, isEditing: boolean = false) => {
    const brand = isEditing 
      ? editingRacquet.brand 
      : (newRacquet.brand === "Other" ? newRacquet.brand_custom : newRacquet.brand);
    if (!brand || query.length < 2) return;

    setSearchingModels(true);
    try {
      const models = await racquetSpecsService.searchModels(brand, query);
      setModelSuggestions(models);
      setShowModelSuggestions(true);
    } catch (err) {
      console.error("Error searching models:", err);
    } finally {
      setSearchingModels(false);
    }
  };

  useEffect(() => {
    if (!user || !user.shop_id) return;

    const fetchData = async () => {
      setLoading(true);
      
      // Fetch Shop
      const { data: shopData } = await supabase
        .from('shops')
        .select('*')
        .eq('id', user.shop_id)
        .single();
      if (shopData) setShop(shopData);

      // Fetch Customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .eq('shop_id', user.shop_id);
      
      if (customersError) {
        console.error("Error fetching customers:", customersError);
      } else {
        setCustomers(customersData || []);
      }

      // Fetch All Racquets for the shop
      const { data: racquetsData } = await supabase
        .from('racquets')
        .select('*, customers!inner(shop_id)')
        .eq('customers.shop_id', user.shop_id);
      if (racquetsData) setAllRacquets(racquetsData);

      // Fetch Inventory Strings
      const { data: inventoryData } = await supabase
        .from('inventory')
        .select('*')
        .eq('shop_id', user.shop_id)
        .eq('item_type', 'string');
      if (inventoryData) setInventoryStrings(inventoryData);

      setLoading(false);
    };

    fetchData();

    const customersSubscription = supabase
      .channel(`customers:${user.shop_id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'customers', filter: `shop_id=eq.${user.shop_id}` },
        () => fetchData()
      )
      .subscribe();

    const racquetsSubscription = supabase
      .channel(`racquets:${user.shop_id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'racquets' },
        () => fetchData()
      )
      .subscribe();

    return () => {
      customersSubscription.unsubscribe();
      racquetsSubscription.unsubscribe();
    };
  }, [user.shop_id]);

  useEffect(() => {
    if (!selectedCustomer) {
      setRacquets([]);
      return;
    }

    // Fetch racquets for selected customer using Supabase
    const fetchRacquets = async () => {
      const { data, error } = await supabase
        .from('racquets')
        .select('*')
        .eq('customer_id', selectedCustomer.id);

      if (error) {
        console.error("Error fetching racquets:", error);
      } else {
        setRacquets(data || []);
      }
    };

    fetchRacquets();

    // Subscribe to racquet changes for this customer
    const subscription = supabase
      .channel(`racquets:customer:${selectedCustomer.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'racquets', filter: `customer_id=eq.${selectedCustomer.id}` },
        () => fetchRacquets()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [selectedCustomer?.id]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: existingProfiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newCustomer.email)
        .eq('user_role', 'customer');

      let linkedProfileId = null;
      if (existingProfiles && existingProfiles.length > 0) {
        linkedProfileId = existingProfiles[0].id;
      }

      const { error: insertError } = await supabase
        .from('customers')
        .insert({
          shop_id: user.shop_id,
          profile_id: linkedProfileId,
          first_name: newCustomer.first_name,
          last_name: newCustomer.last_name,
          email: newCustomer.email,
          phone: newCustomer.phone,
        });

      if (insertError) throw insertError;

      setShowAdd(false);
      setNewCustomer({ first_name: "", last_name: "", email: "", phone: "" });
    } catch (err) {
      console.error("Error adding customer:", err);
    }
  };

  const handleAddRacquet = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const brand = newRacquet.brand === "Other" ? newRacquet.brand_custom : newRacquet.brand;
      const model = newRacquet.model === "Other" ? newRacquet.model_custom : newRacquet.model;

      const stringMain = newRacquet.string_main_brand === "Other" 
        ? `${newRacquet.string_main_brand_custom} ${newRacquet.string_main_model_custom} ${newRacquet.string_main_gauge}`.trim()
        : `${newRacquet.string_main_brand} ${newRacquet.string_main_model} ${newRacquet.string_main_gauge}`.trim();
      
      const stringCross = newRacquet.string_cross_brand === "Other"
        ? `${newRacquet.string_cross_brand_custom} ${newRacquet.string_cross_model_custom} ${newRacquet.string_cross_gauge}`.trim()
        : (newRacquet.string_cross_brand === "Same as Mains" ? stringMain : `${newRacquet.string_cross_brand} ${newRacquet.string_cross_model} ${newRacquet.string_cross_gauge}`.trim());

      const { error: insertError } = await supabase
        .from('racquets')
        .insert({
          customer_id: selectedCustomer.id,
          brand,
          model,
          serial_number: newRacquet.serial_number,
          head_size: parseInt(newRacquet.head_size) || 0,
          string_pattern_mains: parseInt(newRacquet.string_pattern_mains) || 0,
          string_pattern_crosses: parseInt(newRacquet.string_pattern_crosses) || 0,
          mains_skip: newRacquet.mains_skip,
          mains_tie_off: newRacquet.mains_tie_off,
          crosses_start: newRacquet.crosses_start,
          crosses_tie_off: newRacquet.crosses_tie_off,
          one_piece_length: String(parseFloat(newRacquet.one_piece_length) || 0),
          two_piece_length: String(parseFloat(newRacquet.two_piece_length) || 0),
          stringing_instructions: newRacquet.stringing_instructions,
          current_string_main: stringMain,
          current_string_cross: stringCross,
          current_tension_main: parseFloat(newRacquet.current_tension_main) || 0,
          current_tension_cross: parseFloat(newRacquet.current_tension_cross) || 0,
          qr_code: `racquet_${crypto.randomUUID()}`,
        });

      if (insertError) throw insertError;

      setShowAddRacquet(false);
      setNewRacquet({ 
        brand: "", brand_custom: "", model: "", model_custom: "", serial_number: "", head_size: "", 
        string_pattern_mains: "", string_pattern_crosses: "",
        mains_skip: "", mains_tie_off: "", crosses_start: "", crosses_tie_off: "",
        one_piece_length: "", two_piece_length: "", stringing_instructions: "",
        string_main_brand: "", string_main_model: "", string_main_brand_custom: "", string_main_model_custom: "", string_main_gauge: "",
        string_cross_brand: "", string_cross_model: "", string_cross_brand_custom: "", string_cross_model_custom: "", string_cross_gauge: "",
        current_tension_main: "", current_tension_cross: ""
      });
    } catch (err) {
      console.error("Error adding racquet:", err);
    }
  };

  const handleUpdateRacquet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRacquet) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('racquets')
        .update({
          brand: editingRacquet.brand,
          model: editingRacquet.model,
          serial_number: editingRacquet.serial_number,
          head_size: editingRacquet.head_size,
          string_pattern_mains: editingRacquet.string_pattern_mains,
          string_pattern_crosses: editingRacquet.string_pattern_crosses,
          current_string_main: editingRacquet.current_string_main,
          current_string_cross: editingRacquet.current_string_cross,
          current_tension_main: editingRacquet.current_tension_main,
          current_tension_cross: editingRacquet.current_tension_cross,
        })
        .eq('id', editingRacquet.id);

      if (error) throw error;
      setEditingRacquet(null);
    } catch (err) {
      console.error("Error updating racquet:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRacquet = async (racquetId: string) => {
    try {
      // Delete associated jobs first
      const { data: jobsToDelete } = await supabase
        .from('stringing_jobs')
        .select('id')
        .eq('shop_id', user.shop_id);

      if (jobsToDelete) {
        for (const job of jobsToDelete) {
          await supabase
            .from('stringing_jobs')
            .delete()
            .eq('id', job.id);
        }
      }

      // Delete racquet
      const { error } = await supabase
        .from('racquets')
        .delete()
        .eq('id', racquetId);

      if (error) throw error;
      setDeleteConfirm(null);
    } catch (err) {
      console.error("Error deleting racquet:", err);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    try {
      // Get customer's racquets
      const { data: racquetsToDelete } = await supabase
        .from('racquets')
        .select('id')
        .eq('customer_id', customerId);

      // Delete customer's racquets
      if (racquetsToDelete) {
        for (const racquet of racquetsToDelete) {
          await supabase
            .from('racquets')
            .delete()
            .eq('id', racquet.id);
        }
      }

      // Delete customer's jobs
      const { data: jobsToDelete } = await supabase
        .from('stringing_jobs')
        .select('id')
        .eq('shop_id', user.shop_id);

      if (jobsToDelete) {
        for (const job of jobsToDelete) {
          await supabase
            .from('stringing_jobs')
            .delete()
            .eq('id', job.id);
        }
      }

      // Delete customer
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);

      if (error) throw error;
      
      setDeleteConfirm(null);
      setSelectedCustomer(null);
    } catch (err) {
      console.error("Error deleting customer:", err);
    }
  };

  const filteredCustomers = customers.filter(c => 
    ((c.first_name || "") + " " + (c.last_name || "")).toLowerCase().includes(searchTerm.toLowerCase()) ||
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
              <div className="relative">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Model</label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Search or enter model" 
                    required
                    value={editingRacquet.model}
                    onChange={e => {
                      setEditingRacquet({...editingRacquet, model: e.target.value});
                      handleSearchModels(e.target.value, true);
                    }}
                    onFocus={() => editingRacquet.model.length >= 2 && setShowModelSuggestions(true)}
                    className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  />
                  {searchingModels && (
                    <div className="absolute right-3 top-2.5">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    </div>
                  )}
                </div>
                
                {showModelSuggestions && modelSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {modelSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        className="w-full text-left px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white transition-colors"
                        onClick={() => {
                          setEditingRacquet({...editingRacquet, model: suggestion});
                          setShowModelSuggestions(false);
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleFetchSpecs(editingRacquet.brand, editingRacquet.model, true)}
                  disabled={!editingRacquet.brand || !editingRacquet.model || fetchingSpecs}
                  className="mt-2 text-xs text-primary hover:text-primary/80 flex items-center gap-1 disabled:opacity-50"
                >
                  <Search className="w-3 h-3" />
                  {fetchingSpecs ? "Searching..." : "Search Technical Specs"}
                </button>
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
                placeholder="First Name" 
                required
                value={newCustomer.first_name}
                onChange={e => setNewCustomer({...newCustomer, first_name: e.target.value})}
                className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
              />
              <input 
                type="text" 
                placeholder="Last Name" 
                required
                value={newCustomer.last_name}
                onChange={e => setNewCustomer({...newCustomer, last_name: e.target.value})}
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
                    <p className="font-bold">{customer.first_name} {customer.last_name}</p>
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
                    <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white">{selectedCustomer.first_name} {selectedCustomer.last_name}</h2>
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
                      onClick={() => setDeleteConfirm({ type: 'customer', id: selectedCustomer.id, name: selectedCustomer.first_name + ' ' + selectedCustomer.last_name })}
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
                      <div className="space-y-2 relative">
                        <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider">Model</label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <input 
                              type="text" 
                              placeholder="Search or Enter Model" 
                              required
                              value={newRacquet.model === "Other" ? newRacquet.model_custom : newRacquet.model}
                              onChange={e => {
                                const val = e.target.value;
                                if (newRacquet.brand && newRacquet.brand !== "Other") {
                                  setNewRacquet({...newRacquet, model: val, model_custom: val});
                                  if (val.length >= 2) handleSearchModels(val);
                                } else {
                                  setNewRacquet({...newRacquet, model: val, model_custom: val});
                                }
                              }}
                              onFocus={() => {
                                if (modelSuggestions.length > 0) setShowModelSuggestions(true);
                              }}
                              className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                            />
                            {showModelSuggestions && modelSuggestions.length > 0 && (
                              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {modelSuggestions.map((suggestion, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                      setNewRacquet({...newRacquet, model: suggestion, model_custom: suggestion});
                                      setShowModelSuggestions(false);
                                    }}
                                    className="w-full px-4 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-700 text-sm text-neutral-900 dark:text-white"
                                  >
                                    {suggestion}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          {searchingModels && (
                            <div className="flex items-center">
                              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          )}
                        </div>
                        
                        {(newRacquet.brand && (newRacquet.model || newRacquet.model_custom)) && (
                          <button
                            type="button"
                            onClick={() => handleFetchSpecs()}
                            disabled={fetchingSpecs}
                            className="mt-1 px-3 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-lg hover:bg-primary/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Search className="w-3 h-3" />
                            {fetchingSpecs ? "Searching..." : "Search Technical Specs"}
                          </button>
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

                      {/* Detailed Stringing Specs */}
                      <div className="md:col-span-2 space-y-4 border-t border-neutral-100 dark:border-neutral-800 pt-4">
                        <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Stringing Pattern & Specs</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-neutral-500 uppercase">Mains Skip</label>
                            <input 
                              type="text" 
                              placeholder="7H, 9H, 7T, 9T" 
                              value={newRacquet.mains_skip}
                              onChange={e => setNewRacquet({...newRacquet, mains_skip: e.target.value})}
                              className="w-full px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-neutral-500 uppercase">Mains Tie-off</label>
                            <input 
                              type="text" 
                              placeholder="8T" 
                              value={newRacquet.mains_tie_off}
                              onChange={e => setNewRacquet({...newRacquet, mains_tie_off: e.target.value})}
                              className="w-full px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-neutral-500 uppercase">Crosses Start</label>
                            <input 
                              type="text" 
                              placeholder="Head" 
                              value={newRacquet.crosses_start}
                              onChange={e => setNewRacquet({...newRacquet, crosses_start: e.target.value})}
                              className="w-full px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-neutral-500 uppercase">Crosses Tie-off</label>
                            <input 
                              type="text" 
                              placeholder="5H, 11T" 
                              value={newRacquet.crosses_tie_off}
                              onChange={e => setNewRacquet({...newRacquet, crosses_tie_off: e.target.value})}
                              className="w-full px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-neutral-500 uppercase">1-Piece Length (ft)</label>
                            <input 
                              type="number" 
                              placeholder="33" 
                              value={newRacquet.one_piece_length}
                              onChange={e => setNewRacquet({...newRacquet, one_piece_length: e.target.value})}
                              className="w-full px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-neutral-500 uppercase">2-Piece Length (ft)</label>
                            <input 
                              type="number" 
                              placeholder="20/18" 
                              value={newRacquet.two_piece_length}
                              onChange={e => setNewRacquet({...newRacquet, two_piece_length: e.target.value})}
                              className="w-full px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                        </div>
                        <div className="space-y-1 mt-4">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase">Detailed Stringing Instructions</label>
                          <textarea 
                            placeholder="Additional pattern notes, mounting instructions, etc..." 
                            value={newRacquet.stringing_instructions}
                            onChange={e => setNewRacquet({...newRacquet, stringing_instructions: e.target.value})}
                            className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-primary min-h-[120px] resize-y"
                          />
                        </div>
                      </div>

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
                              {(() => {
                                const allStrings = [...STRINGS];
                                inventoryStrings.forEach(item => {
                                  const existingBrand = allStrings.find(s => s.brand === item.brand);
                                  if (existingBrand) {
                                    if (!existingBrand.models.includes(item.name)) {
                                      existingBrand.models.push(item.name);
                                    }
                                  } else {
                                    allStrings.push({ brand: item.brand, models: [item.name] });
                                  }
                                });
                                return allStrings.map(s => (
                                  <option key={s.brand} value={s.brand}>{s.brand}</option>
                                ));
                              })()}
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
                                {(() => {
                                  const brand = STRINGS.find(s => s.brand === newRacquet.string_main_brand);
                                  const models = brand ? [...brand.models] : [];
                                  
                                  // Add inventory models
                                  inventoryStrings.filter(s => s.brand === newRacquet.string_main_brand).forEach(item => {
                                    if (!models.includes(item.name)) {
                                      models.push(item.name);
                                    }
                                  });

                                  return models.map(model => (
                                    <option key={model} value={model}>{model}</option>
                                  ));
                                })()}
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
                              {(() => {
                                const allStrings = [...STRINGS];
                                inventoryStrings.forEach(item => {
                                  const existingBrand = allStrings.find(s => s.brand === item.brand);
                                  if (existingBrand) {
                                    if (!existingBrand.models.includes(item.name)) {
                                      existingBrand.models.push(item.name);
                                    }
                                  } else {
                                    allStrings.push({ brand: item.brand, models: [item.name] });
                                  }
                                });
                                return allStrings.map(s => (
                                  <option key={s.brand} value={s.brand}>{s.brand}</option>
                                ));
                              })()}
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
                                {(() => {
                                  const brand = STRINGS.find(s => s.brand === newRacquet.string_cross_brand);
                                  const models = brand ? [...brand.models] : [];
                                  
                                  // Add inventory models
                                  inventoryStrings.filter(s => s.brand === newRacquet.string_cross_brand).forEach(item => {
                                    if (!models.includes(item.name)) {
                                      models.push(item.name);
                                    }
                                  });

                                  return models.map(model => (
                                    <option key={model} value={model}>{model}</option>
                                  ));
                                })()}
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

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider">Mains Gauge</label>
                            <select 
                              value={newRacquet.string_main_gauge}
                              onChange={e => setNewRacquet({...newRacquet, string_main_gauge: e.target.value})}
                              className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="">Select Gauge</option>
                              {GAUGES.map(g => (
                                <option key={g} value={g}>{g}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider">Crosses Gauge</label>
                            <select 
                              value={newRacquet.string_cross_brand === "Same as Mains" ? newRacquet.string_main_gauge : newRacquet.string_cross_gauge}
                              disabled={newRacquet.string_cross_brand === "Same as Mains"}
                              onChange={e => setNewRacquet({...newRacquet, string_cross_gauge: e.target.value})}
                              className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                            >
                              <option value="">Select Gauge</option>
                              {GAUGES.map(g => (
                                <option key={g} value={g}>{g}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider">Mains Tension</label>
                            <input 
                              type="number" 
                              placeholder="Current Main Tension" 
                              value={newRacquet.current_tension_main}
                              onChange={e => setNewRacquet({...newRacquet, current_tension_main: e.target.value})}
                              className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider">Crosses Tension</label>
                            <input 
                              type="number" 
                              placeholder="Current Cross Tension" 
                              value={newRacquet.current_tension_cross}
                              onChange={e => setNewRacquet({...newRacquet, current_tension_cross: e.target.value})}
                              className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                        </div>
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
