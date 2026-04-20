import React, { useState, useEffect } from "react";
import { Clock, CheckCircle2, CreditCard, Package, MessageSquare, FileText, Plus, History, Trophy, Calendar, ArrowRight, RefreshCw } from "lucide-react";
import { safeFormatDate } from "../lib/utils";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

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
      
      const { data: customerData } = await supabase
        .from('customers')
        .select('*')
        .eq('profile_id', user.id)
        .single();
      
      if (customerData) {
        setCustomerInfo(customerData);

        const { data: jobsData } = await supabase
          .from('jobs')
          .select('*')
          .eq('customer_id', customerData.id)
          .order('created_at', { ascending: false });
        
        if (jobsData) setJobs(jobsData);

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

    const jobsSubscription = supabase
      .channel(`customer_jobs:${user.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'jobs' },
        () => fetchData()
      )
      .subscribe();

    return () => { jobsSubscription.unsubscribe(); };
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

  // Calculate stats
  const stats = {
    totalJobs: jobs.length,
    completedJobs: jobs.filter(j => j.status === 'completed').length,
    totalRacquets: racquets.length,
    pendingJobs: jobs.filter(j => j.status === 'pending' || j.status === 'in_progress').length,
  };

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

  const tabs = [
    { id: 'jobs' as const, label: 'My Jobs', icon: FileText },
    { id: 'racquets' as const, label: 'My Racquets', icon: Package },
    { id: 'messages' as const, label: 'Messages', icon: MessageSquare },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return { class: 'bg-success/10 text-success', label: 'Completed' };
      case 'in_progress':
        return { class: 'bg-blue-500/10 text-blue-500', label: 'In Progress' };
      case 'pending':
        return { class: 'bg-amber-500/10 text-amber-500', label: 'Pending' };
      default:
        return { class: 'bg-text-muted/10 text-text-muted', label: status };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-text-main tracking-tight">
          Welcome back{customerInfo?.first_name ? `, ${customerInfo.first_name}` : ''} 👋
        </h1>
        <p className="text-text-muted mt-1">Track your racquets and stringing history</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-bg-card rounded-2xl p-5 border border-border-main card-hover">
          <div className="p-2.5 bg-primary/10 rounded-xl w-fit mb-3">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <p className="text-3xl font-black text-text-main">{stats.totalJobs}</p>
          <p className="text-sm text-text-muted mt-1">Total Jobs</p>
        </div>

        <div className="bg-bg-card rounded-2xl p-5 border border-border-main card-hover">
          <div className="p-2.5 bg-success/10 rounded-xl w-fit mb-3">
            <CheckCircle2 className="w-5 h-5 text-success" />
          </div>
          <p className="text-3xl font-black text-text-main">{stats.completedJobs}</p>
          <p className="text-sm text-text-muted mt-1">Completed</p>
        </div>

        <div className="bg-bg-card rounded-2xl p-5 border border-border-main card-hover">
          <div className="p-2.5 bg-secondary/10 rounded-xl w-fit mb-3">
            <Package className="w-5 h-5 text-secondary" />
          </div>
          <p className="text-3xl font-black text-text-main">{stats.totalRacquets}</p>
          <p className="text-sm text-text-muted mt-1">Racquets</p>
        </div>

        <div className="bg-bg-card rounded-2xl p-5 border border-border-main card-hover">
          <div className="p-2.5 bg-amber-500/10 rounded-xl w-fit mb-3">
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-text-main">{stats.pendingJobs}</p>
          <p className="text-sm text-text-muted mt-1">In Queue</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
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

      {/* Tab Content */}
      <div className="bg-bg-card rounded-2xl border border-border-main overflow-hidden">
        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <div className="divide-y divide-border-main">
            {jobs.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-bg-elevated rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-text-muted" />
                </div>
                <h3 className="font-bold text-text-main mb-1">No jobs yet</h3>
                <p className="text-sm text-text-muted">Contact your stringer to get started</p>
              </div>
            ) : (
              jobs.map((job) => {
                const status = getStatusBadge(job.status);
                return (
                  <div key={job.id} className="p-4 hover:bg-bg-elevated/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-text-main capitalize">
                            {job.service_type?.replace(/_/g, ' ') || 'Stringing Job'}
                          </h3>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${status.class}`}>
                            {status.label}
                          </span>
                        </div>
                        {job.notes && (
                          <p className="text-sm text-text-muted truncate">{job.notes}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {safeFormatDate(job.created_at)}
                          </span>
                          {job.total_price && (
                            <span className="inline-flex items-center gap-1">
                              ${job.total_price}
                            </span>
                          )}
                        </div>
                      </div>
                      {job.status === 'completed' && (
                        <div className="p-2 bg-success/10 rounded-xl">
                          <CheckCircle2 className="w-5 h-5 text-success" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Racquets Tab */}
        {activeTab === 'racquets' && (
          <div className="divide-y divide-border-main">
            {racquets.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-bg-elevated rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-text-muted" />
                </div>
                <h3 className="font-bold text-text-main mb-1">No racquets yet</h3>
                <p className="text-sm text-text-muted">Add your racquets to track stringing history</p>
              </div>
            ) : (
              racquets.map((racquet) => (
                <div key={racquet.id} className="p-4 hover:bg-bg-elevated/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-primary rounded-2xl flex items-center justify-center">
                      <Trophy className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-text-main">
                        {racquet.brand} {racquet.model}
                      </h3>
                      <p className="text-sm text-text-muted">
                        {racquet.current_string_main || 'No string data'}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-text-muted">
                        {racquet.current_tension_main && (
                          <span>Tension: {racquet.current_tension_main} lbs</span>
                        )}
                        <span>Added {safeFormatDate(racquet.created_at)}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-text-muted" />
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-bg-elevated rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-text-muted" />
            </div>
            <h3 className="font-bold text-text-main mb-1">Messages coming soon</h3>
            <p className="text-sm text-text-muted">Direct messaging with your stringer will be available soon</p>
          </div>
        )}
      </div>
    </div>
  );
}
