import React from "react";
import { Briefcase, Users, MessageSquare, Package } from "lucide-react";

export type TabId = 'jobs' | 'customers' | 'messages' | 'inventory';

interface DashboardTabsProps {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
}

export function DashboardTabs({ activeTab, setActiveTab }: DashboardTabsProps) {
  const tabs = [
    { id: 'jobs' as const, label: 'Jobs', icon: Briefcase },
    { id: 'customers' as const, label: 'Customers', icon: Users },
    { id: 'messages' as const, label: 'Messages', icon: MessageSquare },
    { id: 'inventory' as const, label: 'Inventory', icon: Package },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
            activeTab === tab.id
              ? 'bg-gradient-primary text-white shadow-lg shadow-primary/20'
              : 'bg-bg-card border border-border-main text-text-muted hover:text-text-main hover:border-primary/30'
          }`}
        >
          <tab.icon className="w-4 h-4" />
          {tab.label}
        </button>
      ))}
    </div>
  );
}
