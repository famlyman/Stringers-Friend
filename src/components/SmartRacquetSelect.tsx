import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Loader2 } from "lucide-react";
import { racquetSpecsService } from "../services/racquetSpecsService";
import { RACQUET_BRANDS, RACQUET_MODELS } from "../constants";

interface SmartRacquetSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: string[];
  loading?: boolean;
  onSearch?: (query: string) => void;
  searchResults?: string[];
  isSearching?: boolean;
}

function SmartSelect({ value, onChange, placeholder, options, loading, onSearch, searchResults, isSearching }: SmartRacquetSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const displayOptions = searchResults && searchResults.length > 0 ? searchResults : options;
  
  const filteredOptions = displayOptions.filter(opt => 
    opt.toLowerCase().includes(search.toLowerCase())
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    setIsOpen(true);
    if (onSearch) {
      onSearch(val);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (listRef.current && !listRef.current.contains(e.target as Node) && 
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (opt: string) => {
    onChange(opt);
    setSearch("");
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? search : value}
          onChange={handleSearchChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 bg-bg-elevated border border-border-main rounded-xl text-text-main focus:ring-2 focus:ring-primary/20 outline-none text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && filteredOptions.length > 0) {
              handleSelect(filteredOptions[0]);
            }
          }}
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-text-muted" />
        )}
      </div>
      {isOpen && filteredOptions.length > 0 && (
        <div ref={listRef} className="absolute z-50 w-full mt-1 bg-bg-elevated border border-border-main rounded-xl shadow-lg max-h-60 overflow-auto">
          {filteredOptions.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => handleSelect(opt)}
              className="w-full px-4 py-2.5 text-left text-sm text-text-main hover:bg-primary/10 transition-colors"
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SmartRacquetBrandSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [dbBrands, setDbBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadBrands = async () => {
    if (loaded) return;
    setLoading(true);
    try {
      const brands = await racquetSpecsService.getAllBrands();
      setDbBrands(brands);
    } catch (e) {
      console.warn("Failed to load brands from DB");
    }
    setLoading(false);
    setLoaded(true);
  };

  useEffect(() => {
    loadBrands();
  }, []);

  const allBrands = dbBrands.length > 0 ? dbBrands : RACQUET_BRANDS;

  return (
    <SmartSelect
      value={value}
      onChange={onChange}
      placeholder="Brand"
      options={allBrands}
      loading={loading}
    />
  );
}

export function SmartRacquetModelSelect({ brand, value, onChange }: { brand: string; value: string; onChange: (value: string) => void }) {
  const [dbModels, setDbModels] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadAllModels = useCallback(async () => {
    if (!brand || loaded) return;
    try {
      const models = await racquetSpecsService.getModelsByBrand(brand);
      setDbModels(models);
    } catch (e) {
      console.warn("Failed to load models from DB");
    }
    setLoaded(true);
  }, [brand, loaded]);

  const searchModels = useCallback(async (query: string) => {
    if (!brand || query.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const results = await racquetSpecsService.searchRacquets("", query);
      const uniqueModels = [...new Set(results.map(r => r.model))];
      setSearchResults(uniqueModels);
    } catch (e) {
      console.warn("Failed to search models");
      setSearchResults([]);
    }
    setIsSearching(false);
  }, [brand]);

  useEffect(() => {
    if (brand) {
      setLoaded(false);
      setDbModels([]);
      setSearchResults([]);
      loadAllModels();
    }
  }, [brand]);

  const allModels = dbModels.length > 0 ? dbModels : (RACQUET_MODELS[brand] || []);

  return (
    <SmartSelect
      value={value}
      onChange={onChange}
      placeholder="Model"
      options={allModels}
      onSearch={searchModels}
      searchResults={searchResults}
      isSearching={isSearching}
    />
  );
}