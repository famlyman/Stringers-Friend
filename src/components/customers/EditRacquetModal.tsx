import React, { useState } from "react";
import { X, Search } from "lucide-react";
import { RACQUET_BRANDS, STRINGS, GAUGES } from "../../constants";
import { racquetSpecsService } from "../../services/racquetSpecsService";

interface EditRacquetModalProps {
  editingRacquet: any;
  setEditingRacquet: (racquet: any) => void;
  onUpdate: (e: React.FormEvent) => Promise<void>;
  submitting: boolean;
}

export function EditRacquetModal({ editingRacquet, setEditingRacquet, onUpdate, submitting }: EditRacquetModalProps) {
  const [fetchingSpecs, setFetchingSpecs] = useState(false);
  const [searchingModels, setSearchingModels] = useState(false);
  const [modelSuggestions, setModelSuggestions] = useState<string[]>([]);
  const [showModelSuggestions, setShowModelSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!editingRacquet) return null;

  const handleFetchSpecs = async () => {
    if (!editingRacquet.brand || !editingRacquet.model) return;
    setFetchingSpecs(true);
    setError(null);
    try {
      const specs = await racquetSpecsService.getSpecs(editingRacquet.brand, editingRacquet.model);
      if (specs) {
        setEditingRacquet({
          ...editingRacquet,
          head_size: specs.headSize,
          string_pattern: specs.stringPattern || "",
          string_pattern_mains: specs.patternMains,
          string_pattern_crosses: specs.patternCrosses,
          tension_range: specs.tensionRange || "",
          recommended_tension: specs.recommendedTension || "",
          mains_skip: specs.mainsSkip || "",
          mains_tie_off: specs.mainsTieOff || "",
          crosses_start: specs.crossesStart || "",
          crosses_tie_off: specs.crossesTieOff || "",
          one_piece_length: specs.onePieceLength || 0,
          two_piece_length: specs.twoPieceLength || 0,
          stringing_instructions: specs.stringingInstructions || "",
        });
      }
    } catch (err) {
      console.error("Error fetching specs:", err);
      setError("Failed to fetch specifications.");
    } finally {
      setFetchingSpecs(false);
    }
  };

  const handleSearchModels = async (query: string) => {
    if (!editingRacquet.brand || query.length < 2) return;
    setSearchingModels(true);
    try {
      const models = await racquetSpecsService.searchModels(editingRacquet.brand, query);
      setModelSuggestions(models);
      setShowModelSuggestions(true);
    } catch (err) {
      console.error("Error searching models:", err);
    } finally {
      setSearchingModels(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-8 max-w-2xl w-full shadow-2xl relative text-left border border-neutral-200 dark:border-neutral-800 max-h-[90vh] overflow-y-auto">
        <button 
          onClick={() => setEditingRacquet(null)}
          className="absolute top-6 right-6 p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
        >
          <X className="w-6 h-6 text-neutral-400" />
        </button>

        <h2 className="text-2xl font-bold text-primary mb-6">Edit Racquet</h2>
        {error && <p className="text-red-500 text-xs mb-4">{error}</p>}
        
        <form onSubmit={onUpdate} className="space-y-6">
          {/* Form fields go here - similar to the original inline form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="edit-racquet-brand" className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Brand</label>
              <select 
                id="edit-racquet-brand"
                name="brand"
                value={RACQUET_BRANDS.includes(editingRacquet.brand) ? editingRacquet.brand : "Other"}
                onChange={e => setEditingRacquet({...editingRacquet, brand: e.target.value === "Other" ? "" : e.target.value})}
                className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-xl outline-none"
              >
                <option value="">Select Brand</option>
                {RACQUET_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="edit-racquet-model" className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Model</label>
              <div className="relative">
                <input 
                  id="edit-racquet-model"
                  name="model"
                  type="text" 
                  value={editingRacquet.model}
                  onChange={e => {
                    setEditingRacquet({...editingRacquet, model: e.target.value});
                    handleSearchModels(e.target.value);
                  }}
                  className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-xl outline-none"
                />
                <button type="button" onClick={handleFetchSpecs} className="mt-1 text-xs text-primary font-bold">Search Specs</button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label htmlFor="edit-racquet-head-size" className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Head Size</label>
              <input id="edit-racquet-head-size" name="head_size" type="number" value={editingRacquet.head_size || ""} onChange={e => setEditingRacquet({...editingRacquet, head_size: e.target.value})} className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-xl outline-none" />
            </div>
            <div className="space-y-1">
              <label htmlFor="edit-racquet-mains" className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Mains</label>
              <input id="edit-racquet-mains" name="string_pattern_mains" type="number" value={editingRacquet.string_pattern_mains || ""} onChange={e => setEditingRacquet({...editingRacquet, string_pattern_mains: e.target.value})} className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-xl outline-none" />
            </div>
            <div className="space-y-1">
              <label htmlFor="edit-racquet-crosses" className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Crosses</label>
              <input id="edit-racquet-crosses" name="string_pattern_crosses" type="number" value={editingRacquet.string_pattern_crosses || ""} onChange={e => setEditingRacquet({...editingRacquet, string_pattern_crosses: e.target.value})} className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-xl outline-none" />
            </div>
            <div className="space-y-1">
              <label htmlFor="edit-racquet-serial" className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Serial</label>
              <input id="edit-racquet-serial" name="serial_number" type="text" value={editingRacquet.serial_number || ""} onChange={e => setEditingRacquet({...editingRacquet, serial_number: e.target.value})} className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-xl outline-none" />
            </div>
          </div>

          <div className="space-y-4 border-t border-neutral-100 dark:border-neutral-800 pt-4">
            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Official Specifications</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase ml-1">Tension Range</label>
                <input name="tension_range" type="text" value={editingRacquet.tension_range || ""} onChange={e => setEditingRacquet({...editingRacquet, tension_range: e.target.value})} className="w-full px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-800 rounded-lg outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase ml-1">Recommended Tension</label>
                <input name="recommended_tension" type="text" value={editingRacquet.recommended_tension || ""} onChange={e => setEditingRacquet({...editingRacquet, recommended_tension: e.target.value})} className="w-full px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-800 rounded-lg outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase ml-1">Combined Pattern</label>
                <input name="string_pattern" type="text" value={editingRacquet.string_pattern || ""} onChange={e => setEditingRacquet({...editingRacquet, string_pattern: e.target.value})} className="w-full px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-800 rounded-lg outline-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-neutral-100 dark:border-neutral-800 pt-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase ml-1">Mains Skip</label>
              <input name="mains_skip" type="text" value={editingRacquet.mains_skip || ""} onChange={e => setEditingRacquet({...editingRacquet, mains_skip: e.target.value})} className="w-full px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-lg outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase ml-1">Mains Tie-off</label>
              <input name="mains_tie_off" type="text" value={editingRacquet.mains_tie_off || ""} onChange={e => setEditingRacquet({...editingRacquet, mains_tie_off: e.target.value})} className="w-full px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-lg outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase ml-1">Crosses Start</label>
              <input name="crosses_start" type="text" value={editingRacquet.crosses_start || ""} onChange={e => setEditingRacquet({...editingRacquet, crosses_start: e.target.value})} className="w-full px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-lg outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase ml-1">Crosses Tie-off</label>
              <input name="crosses_tie_off" type="text" value={editingRacquet.crosses_tie_off || ""} onChange={e => setEditingRacquet({...editingRacquet, crosses_tie_off: e.target.value})} className="w-full px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-lg outline-none" />
            </div>
          </div>

          <div className="space-y-2 border-t border-neutral-100 dark:border-neutral-800 pt-4">

          <div className="flex gap-4 pt-4">
            <button type="submit" disabled={submitting} className="flex-1 bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50">
              {submitting ? "Saving..." : "Save Changes"}
            </button>
            <button type="button" onClick={() => setEditingRacquet(null)} className="flex-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 py-3 rounded-xl font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
