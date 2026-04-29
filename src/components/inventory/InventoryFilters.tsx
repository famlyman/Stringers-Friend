import React from "react";
import { Search } from "lucide-react";

interface InventoryFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterType: string;
  setFilterType: (type: string) => void;
}

export function InventoryFilters({ searchQuery, setSearchQuery, filterType, setFilterType }: InventoryFiltersProps) {
  return (
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
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
        {['all', 'string', 'grip', 'dampener', 'other', 'low-stock'].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-4 py-2 rounded-xl text-sm font-bold capitalize whitespace-nowrap transition-all ${
              filterType === type 
                ? 'bg-primary text-white shadow-md' 
                : 'bg-white dark:bg-neutral-900 text-neutral-500 border border-neutral-200 dark:border-neutral-800 hover:border-primary/50'
            }`}
          >
            {type === 'low-stock' ? 'Low Stock' : type}
          </button>
        ))}
      </div>
    </div>
  );
}
