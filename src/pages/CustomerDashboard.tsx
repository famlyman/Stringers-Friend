import React, { useState, useEffect, useMemo, useRef } from "react";
import { Clock, CheckCircle2, CreditCard, Package, X, Users, Bell, BellDot, Plus, MessageSquare, Send, Search } from "lucide-react";
import { safeFormatDate } from "../lib/utils";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Save, Edit2, ChevronDown } from "lucide-react";
import QRCodeDisplay from "../components/QRCodeDisplay";
import { RACQUET_BRANDS, RACQUET_MODELS, STRINGS, GAUGES } from "../constants";
import { racquetSpecsService } from "../services/racquetSpecsService";

export default function CustomerDashboard({ user, initialTab = 'jobs' }: { user: any, initialTab?: 'jobs' | 'racquets' | 'messages' }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState<any[]>([]);
  const [racquets, setRacquets] = useState<any[]>([]);
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'jobs' | 'racquets' | 'messages'>(
    (searchParams.get('tab') as any) || initialTab
  );

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      
      // Get customer info
      const { data: customerData } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (customerData) {
        setCustomerInfo(customerData);

        // Fetch jobs for this customer
        const { data: jobsData } = await supabase
          .from('stringing_jobs')
          .select('*')
          .eq('customer_id', customerData.id)
          .order('created_at', { ascending: false });
        
        if (jobsData) setJobs(jobsData);

        // Fetch racquets for this customer
        const { data: racquetsData } = await supabase
          .from('racquets')
          .select('*')
          .eq('customer_id', customerData.id)
          .order('created_at', { ascending: false });
        
        if (racquetsData) setRacquets(racquetsData);
      }

      setLoading(false);
    };

    fetchData();

    // Subscribe to changes
    const jobsSubscription = supabase
      .channel(`customer_jobs:${user.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'stringing_jobs' },
        () => fetchData()
      )
      .subscribe();

    return () => {
      jobsSubscription.unsubscribe();
    };
  }, [user]);

  useEffect(() => {
    const tab = searchParams.get('tab') as any;
    if (tab && ['jobs', 'racquets', 'messages'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'jobs' | 'racquets' | 'messages') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text-main mb-2">
          Welcome{customerInfo?.name ? `, ${customerInfo.name}` : ''}
        </h1>
        <p className="text-text-muted">Manage your racquets and stringing jobs</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6">
        {(['jobs', 'racquets', 'messages'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab
                ? 'bg-primary text-white'
                : 'text-text-muted hover:text-text-main hover:bg-bg-card'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Jobs Tab */}
      {activeTab === 'jobs' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">My Jobs</h2>
          
          {jobs.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No jobs yet</p>
              <p className="text-sm mt-2">Contact your stringer to get started</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {jobs.map((job) => (
                <div key={job.id} className="bg-bg-card rounded-lg p-4 border border-border-main">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-text-main">{job.service_type}</h3>
                      <p className="text-sm text-text-muted">{job.notes}</p>
                      <p className="text-xs text-text-muted mt-1">
                        {safeFormatDate(job.created_at)}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      job.status === 'completed' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : job.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                    }`}>
                      {job.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Racquets Tab */}
      {activeTab === 'racquets' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">My Racquets</h2>
          
          {racquets.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No racquets yet</p>
              <p className="text-sm mt-2">Add your racquets to track stringing history</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {racquets.map((racquet) => (
                <div key={racquet.id} className="bg-bg-card rounded-lg p-4 border border-border-main">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-text-main">
                        {racquet.brand} {racquet.model}
                      </h3>
                      <p className="text-sm text-text-muted">
                        {racquet.current_string_main || "Not specified"}
                      </p>
                      <p className="text-xs text-text-muted mt-1">
                        {safeFormatDate(racquet.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-text-muted">Tension</p>
                      <p className="font-medium">
                        {racquet.current_tension_main || 0} lbs
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Messages</h2>
          <div className="text-center py-12 text-text-muted">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Messages feature coming soon</p>
          </div>
        </div>
      )}
    </div>
  );
}
