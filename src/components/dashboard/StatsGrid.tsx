import React from "react";
import { Clock, PlayCircle, CheckCircle2, DollarSign } from "lucide-react";

interface StatsGridProps {
  stats: {
    pendingJobs: number;
    inProgressJobs: number;
    completedJobs: number;
    totalRevenue: number;
    thisWeekJobs: number;
    totalCustomers: number;
  };
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-bg-card rounded-2xl p-5 border border-border-main card-hover">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2.5 bg-amber-500/10 rounded-xl">
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <span className="text-xs font-semibold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full">
            Pending
          </span>
        </div>
        <p className="text-3xl font-black text-text-main">{stats.pendingJobs}</p>
        <p className="text-sm text-text-muted mt-1">Awaiting</p>
      </div>

      <div className="bg-bg-card rounded-2xl p-5 border border-border-main card-hover">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2.5 bg-blue-500/10 rounded-xl">
            <PlayCircle className="w-5 h-5 text-blue-500" />
          </div>
          <span className="text-xs font-semibold text-blue-500 bg-blue-500/10 px-2 py-1 rounded-full">
            In Progress
          </span>
        </div>
        <p className="text-3xl font-black text-text-main">{stats.inProgressJobs}</p>
        <p className="text-sm text-text-muted mt-1">Working On</p>
      </div>

      <div className="bg-bg-card rounded-2xl p-5 border border-border-main card-hover">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2.5 bg-success/10 rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-success" />
          </div>
          <span className="text-xs font-semibold text-success bg-success/10 px-2 py-1 rounded-full">
            Completed
          </span>
        </div>
        <p className="text-3xl font-black text-text-main">{stats.completedJobs}</p>
        <p className="text-sm text-text-muted mt-1">Done</p>
      </div>

      <div className="bg-bg-card rounded-2xl p-5 border border-border-main card-hover">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-full">
            Revenue
          </span>
        </div>
        <p className="text-3xl font-black text-text-main">${stats.totalRevenue.toFixed(0)}</p>
        <p className="text-sm text-text-muted mt-1">{stats.thisWeekJobs} this week</p>
      </div>
    </div>
  );
}
