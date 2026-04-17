import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { racquetSpecsService } from "../services/racquetSpecsService";
import { RACQUET_BRANDS, RACQUET_MODELS } from "../constants";

interface SmartRacquetSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: string[];
  loading?: boolean;
}

function SmartSelect({ value, onChange, placeholder, options, loading }: SmartRacquetSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(search.toLowerCase())
  );

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
      <input
        ref={inputRef}
        type="text"
        value={isOpen ? search : value}
        onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 bg-bg-elevated border border-border-main rounded-xl text-text-main focus:ring-2 focus:ring-primary/20 outline-none text-sm"
        onKeyDown={(e) => {
          if (e.key === "Enter" && filteredOptions.length > 0) {
            handleSelect(filteredOptions[0]);
          }
        }}
      />
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

interface SmartRacquetBrandSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function SmartRacquetBrandSelect({ value, onChange }: SmartRacquetBrandSelectProps) {
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

  const allBrands = dbBrands.length > 0 
    ? dbBrands 
    : RACQUET_BRANDS;

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

interface SmartRacquetModelSelectProps {
  brand: string;
  value: string;
  onChange: (value: string) => void;
}

export function SmartRacquetModelSelect({ brand, value, onChange }: SmartRacquetModelSelectProps) {
  const [dbModels, setDbModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadModels = async () => {
    if (!brand || loaded) return;
    setLoading(true);
    try {
      const models = await racquetSpecsService.getModelsByBrand(brand);
      setDbModels(models);
    } catch (e) {
      console.warn("Failed to load models from DB");
    }
    setLoading(false);
    setLoaded(true);
  };

  useEffect(() => {
    if (brand) {
      setLoaded(false);
      setDbModels([]);
      loadModels();
    }
  }, [brand]);

  const allModels = dbModels.length > 0 
    ? dbModels 
    : (RACQUET_MODELS[brand] || []);

  return (
    <SmartSelect
      value={value}
      onChange={onChange}
      placeholder="Model"
      options={allModels}
      loading={loading}
    />
  );
}