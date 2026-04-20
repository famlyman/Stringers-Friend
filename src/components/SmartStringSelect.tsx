import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Loader2 } from "lucide-react";
import { stringSpecsService } from "../services/stringSpecsService";

interface SmartStringSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: string[];
  loading?: boolean;
  onSearch?: (query: string) => void;
  searchResults?: string[];
  isSearching?: boolean;
}

function SmartStringSelect({ value, onChange, placeholder, options, loading, onSearch, searchResults, isSearching }: SmartStringSelectProps) {
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
          className="w-full px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && filteredOptions.length > 0) {
              handleSelect(filteredOptions[0]);
            }
          }}
        />
        {(loading || isSearching) && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-neutral-400" />
        )}
      </div>
      {isOpen && filteredOptions.length > 0 && (
        <div ref={listRef} className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg max-h-60 overflow-auto">
          {filteredOptions.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => handleSelect(opt)}
              className="w-full px-4 py-2.5 text-left text-sm text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SmartStringBrandSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [dbBrands, setDbBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadBrands = async () => {
    if (loaded) return;
    setLoading(true);
    try {
      const brands = await stringSpecsService.searchBrands();
      setDbBrands(brands);
    } catch (e) {
      console.warn("Failed to load string brands from DB");
    }
    setLoading(false);
    setLoaded(true);
  };

  useEffect(() => {
    loadBrands();
  }, []);

  return (
    <SmartStringSelect
      value={value}
      onChange={onChange}
      placeholder="Brand"
      options={dbBrands}
      loading={loading}
    />
  );
}

export function SmartStringModelSelect({ brand, value, onChange }: { brand: string; value: string; onChange: (value: string) => void }) {
  const [dbModels, setDbModels] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadAllModels = useCallback(async () => {
    if (!brand || loaded) return;
    try {
      const models = await stringSpecsService.searchModels(brand);
      setDbModels(models);
    } catch (e) {
      console.warn("Failed to load string models from DB");
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
      const strings = await stringSpecsService.searchStrings(query);
      const uniqueModels = [...new Set(strings.map(s => s.model))];
      setSearchResults(uniqueModels);
    } catch (e) {
      console.warn("Failed to search string models");
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

  return (
    <SmartStringSelect
      value={value}
      onChange={onChange}
      placeholder="Model"
      options={dbModels}
      isSearching={isSearching}
      onSearch={searchModels}
      searchResults={searchResults}
    />
  );
}

export function SmartStringGaugeSelect({ brand, model, value, onChange }: { brand: string; model: string; value: string; onChange: (value: string) => void }) {
  const [dbGauges, setDbGauges] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const loadGauges = useCallback(async () => {
    if (!brand || !model) return;
    setLoading(true);
    try {
      const gauges = await stringSpecsService.getGauges(brand, model);
      setDbGauges(gauges);
    } catch (e) {
      console.warn("Failed to load string gauges from DB");
    }
    setLoading(false);
  }, [brand, model]);

  useEffect(() => {
    loadGauges();
  }, []);

  return (
    <SmartStringSelect
      value={value}
      onChange={onChange}
      placeholder="Gauge"
      options={dbGauges}
      loading={loading}
    />
  );
}