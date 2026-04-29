import React, { useState, useEffect, useMemo } from "react";
import { useDashboardData } from "../hooks/useDashboardData";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { StatsGrid } from "../components/dashboard/StatsGrid";
import { DashboardTabs, TabId } from "../components/dashboard/DashboardTabs";
import { DashboardSearch } from "../components/dashboard/DashboardSearch";
import { JobsTab } from "../components/dashboard/JobsTab";
import { CustomersTab } from "../components/dashboard/CustomersTab";
import { MessagesTab } from "../components/dashboard/MessagesTab";
import { InventoryTab } from "../components/dashboard/InventoryTab";
import { NewJobModal } from "../components/dashboard/NewJobModal";
import { ShopQRModal } from "../components/dashboard/ShopQRModal";

export default function Dashboard({ user, initialTab = 'jobs' }: { user: any, initialTab?: TabId }) {
  const {
    jobs,
    customers,
    racquets,
    inventoryItems,
    shop,
    loading,
    stats,
    refreshData,
    setJobs
  } = useDashboardData(user?.shop_id || user?.shopId);

  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewJob, setShowNewJob] = useState(false);
  const [showShopQR, setShowShopQR] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      if (!searchQuery) return true;
      const search = searchQuery.toLowerCase();
      return (
        job.customers?.first_name?.toLowerCase().includes(search) ||
        job.customers?.last_name?.toLowerCase().includes(search) ||
        job.customers?.email?.toLowerCase().includes(search)
      );
    });
  }, [jobs, searchQuery]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      if (!searchQuery) return true;
      const search = searchQuery.toLowerCase();
      return (
        customer.first_name?.toLowerCase().includes(search) ||
        customer.last_name?.toLowerCase().includes(search) ||
        customer.email?.toLowerCase().includes(search)
      );
    });
  }, [customers, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-muted font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <DashboardHeader shop={shop} setShowShopQR={setShowShopQR} />
      
      <StatsGrid stats={stats} />

      <DashboardTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="bg-bg-card rounded-2xl border border-border-main overflow-hidden">
        <DashboardSearch 
          activeTab={activeTab} 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
        />

        {activeTab === 'jobs' && (
          <JobsTab 
            filteredJobs={filteredJobs} 
            setJobs={setJobs} 
            setShowNewJob={setShowNewJob} 
          />
        )}

        {activeTab === 'customers' && (
          <CustomersTab 
            filteredCustomers={filteredCustomers} 
            racquets={racquets} 
          />
        )}

        {activeTab === 'messages' && <MessagesTab />}

        {activeTab === 'inventory' && (
          <InventoryTab inventoryItems={inventoryItems} />
        )}
      </div>

      {showNewJob && (
        <NewJobModal 
          user={user} 
          customers={customers} 
          setShowNewJob={setShowNewJob} 
          refreshData={refreshData}
        />
      )}

      {showShopQR && (
        <ShopQRModal shop={shop} setShowShopQR={setShowShopQR} />
      )}
    </div>
  );
}
