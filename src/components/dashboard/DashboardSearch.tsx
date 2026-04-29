import React from "react";
import { Search } from "lucide-react";

interface DashboardSearchProps {
  activeTab: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function DashboardSearch({ activeTab, searchQuery, setSearchQuery }: DashboardSearchProps) {
  return (
    <div className="p-4 border-b border-border-main flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
        <input
          type="text"
          placeholder={`Search ${activeTab}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-bg-elevated border border-border-main rounded-xl text-text-main placeholder:text-text-muted/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm"
        />
      </div>
    </div>
  );
}
