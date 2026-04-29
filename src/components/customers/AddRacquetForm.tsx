import React, { useState } from "react";
import { Search } from "lucide-react";
import { RACQUET_BRANDS, GAUGES } from "../../constants";
import { racquetSpecsService } from "../../services/racquetSpecsService";
import { SmartStringBrandSelect, SmartStringModelSelect } from "../SmartStringSelect";
import { supabase } from "../../lib/supabase";

interface AddRacquetFormProps {
  customerId: string;
  shopId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddRacquetForm({ customerId, shopId, onSuccess, onCancel }: AddRacquetFormProps) {
  const [fetchingSpecs, setFetchingSpecs] = useState(false);
  const [searchingModels, setSearchingModels] = useState(false);
  const [modelSuggestions, setModelSuggestions] = useState<string[]>([]);
  const [showModelSuggestions, setShowModelSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newRacquet, setNewRacquet] = useState<any>({ 
    brand: "", brand_custom: "", model: "", model_custom: "", serial_number: "", head_size: "", 
    string_pattern_mains: "", string_pattern_crosses: "",
    mains_skip: "", mains_tie_off: "", crosses_start: "", crosses_tie_off: "",
    one_piece_length: "", two_piece_length: "", stringing_instructions: "",
    string_main_brand: "", string_main_model: "", string_main_brand_custom: "", string_main_model_custom: "", string_main_gauge: "",
    string_cross_brand: "", string_cross_model: "", string_cross_brand_custom: "", string_cross_model_custom: "", string_cross_gauge: "",
    current_tension_main: "", current_tension_cross: ""
  });

  const handleFetchSpecs = async () => {
    const brand = newRacquet.brand === "Other" ? newRacquet.brand_custom : newRacquet.brand;
    const model = newRacquet.model === "Other" ? newRacquet.model_custom : newRacquet.model;

    if (!brand || !model) {
      setError("Please select a brand and model first.");
      return;
    }

    setFetchingSpecs(true);
    setError(null);
    try {
      const specs = await racquetSpecsService.getSpecs(brand, model);
      if (specs) {
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
      } else {
        setError("Could not find specifications for this model.");
      }
    } catch (err) {
      console.error("Error fetching specs:", err);
      setError("Failed to fetch specifications.");
    } finally {
      setFetchingSpecs(false);
    }
  };

  const handleSearchModels = async (query: string) => {
    const brand = newRacquet.brand === "Other" ? newRacquet.brand_custom : newRacquet.brand;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const brand = newRacquet.brand === "Other" ? newRacquet.brand_custom : newRacquet.brand;
      const model = newRacquet.model === "Other" ? newRacquet.model_custom : newRacquet.model;
      const serialNumber = newRacquet.serial_number?.trim() || `SN-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const stringMain = newRacquet.string_main_brand === "Other" 
        ? `${newRacquet.string_main_brand_custom} ${newRacquet.string_main_model_custom} ${newRacquet.string_main_gauge}`.trim()
        : `${newRacquet.string_main_brand} ${newRacquet.string_main_model} ${newRacquet.string_main_gauge}`.trim();
      
      const stringCross = newRacquet.string_cross_brand === "Other"
        ? `${newRacquet.string_cross_brand_custom} ${newRacquet.string_cross_model_custom} ${newRacquet.string_cross_gauge}`.trim()
        : (newRacquet.string_cross_brand === "Same as Mains" ? stringMain : `${newRacquet.string_cross_brand} ${newRacquet.string_cross_model} ${newRacquet.string_cross_gauge}`.trim());

      const racquetId = crypto.randomUUID();
      
      const { error: insertError } = await supabase
        .from('racquets')
        .insert({
          id: racquetId,
          customer_id: customerId,
          shop_id: shopId,
          brand,
          model,
          serial_number: serialNumber,
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
          qr_code_id: racquetId,
          qr_code: racquetId,
        });

      if (insertError) throw insertError;
      onSuccess();
    } catch (err) {
      console.error("Error adding racquet:", err);
    }
  };

  return (
    <div className="mb-8 p-6 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700">
      <h3 className="font-bold mb-4 text-neutral-900 dark:text-white">New Racquet Details</h3>
      {error && <p className="text-red-500 text-xs mb-4">{error}</p>}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Basic Info */}
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
                  setNewRacquet({...newRacquet, model: val, model_custom: val});
                  if (newRacquet.brand && newRacquet.brand !== "Other" && val.length >= 2) {
                    handleSearchModels(val);
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
        
        {/* Pattern & Specs */}
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
            <input 
              type="text" 
              placeholder="Mains Skip" 
              value={newRacquet.mains_skip}
              onChange={e => setNewRacquet({...newRacquet, mains_skip: e.target.value})}
              className="w-full px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 rounded-lg outline-none"
            />
            <input 
              type="text" 
              placeholder="Mains Tie-off" 
              value={newRacquet.mains_tie_off}
              onChange={e => setNewRacquet({...newRacquet, mains_tie_off: e.target.value})}
              className="w-full px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 rounded-lg outline-none"
            />
            <input 
              type="text" 
              placeholder="Crosses Start" 
              value={newRacquet.crosses_start}
              onChange={e => setNewRacquet({...newRacquet, crosses_start: e.target.value})}
              className="w-full px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 rounded-lg outline-none"
            />
            <input 
              type="text" 
              placeholder="Crosses Tie-off" 
              value={newRacquet.crosses_tie_off}
              onChange={e => setNewRacquet({...newRacquet, crosses_tie_off: e.target.value})}
              className="w-full px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 rounded-lg outline-none"
            />
          </div>
        </div>

        {/* Current Setup */}
        <div className="md:col-span-2 space-y-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
          <div className="grid grid-cols-2 gap-4">
            <SmartStringBrandSelect
              value={newRacquet.string_main_brand}
              onChange={(val) => setNewRacquet({...newRacquet, string_main_brand: val, string_main_model: ""})}
            />
            <SmartStringModelSelect
              brand={newRacquet.string_main_brand}
              value={newRacquet.string_main_model}
              onChange={(val) => setNewRacquet({...newRacquet, string_main_model: val})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input 
              type="number" 
              placeholder="Mains Tension (lbs)" 
              value={newRacquet.current_tension_main}
              onChange={e => setNewRacquet({...newRacquet, current_tension_main: e.target.value})}
              className="px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-xl outline-none"
            />
            <input 
              type="number" 
              placeholder="Crosses Tension (lbs)" 
              value={newRacquet.current_tension_cross}
              onChange={e => setNewRacquet({...newRacquet, current_tension_cross: e.target.value})}
              className="px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-xl outline-none"
            />
          </div>
        </div>

        <div className="flex gap-2 md:col-span-2">
          <button type="submit" className="flex-1 bg-primary text-white py-2 rounded-xl font-bold hover:bg-primary/90 transition-colors">Save</button>
          <button type="button" onClick={onCancel} className="flex-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 py-2 rounded-xl font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">Cancel</button>
        </div>
      </form>
    </div>
  );
}
