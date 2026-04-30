import React from "react";
import { Ticket, Calendar, DollarSign, Plus } from "lucide-react";
import { safeFormatDate } from "../../lib/utils";
import { supabase } from "../../lib/supabase";
import { sendNotification } from "../../lib/notifications";
import { Job } from "../../types/database";

interface JobsTabProps {
  filteredJobs: Job[];
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  setShowNewJob: (show: boolean) => void;
}

export function JobsTab({ filteredJobs, setJobs, setShowNewJob }: JobsTabProps) {
  const handleStatusChange = async (job: Job, newStatus: string) => {
    const oldStatus = job.status;
    try {
      await supabase
        .from('jobs')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', job.id);
      
      setJobs(prevJobs => prevJobs.map(j => j.id === job.id ? { ...j, status: newStatus as any } : j));

      // Inventory Deduction logic
      if (newStatus === 'completed' && oldStatus !== 'completed') {
        // 1. Fetch job details that have inventory_id linked
        const { data: jobDetails } = await supabase
          .from('job_details')
          .select('*, inventory(*)')
          .eq('job_id', job.id);
        
        if (jobDetails && jobDetails.length > 0) {
          for (const detail of jobDetails) {
            if (detail.inventory_id && detail.inventory) {
              const inv = detail.inventory;
              
              if (inv.type === 'set' || inv.type === 'unit') {
                // Deduct 1 from quantity
                await supabase
                  .from('inventory')
                  .update({ 
                    quantity: Math.max(0, inv.quantity - 1),
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', inv.id);
              } else if (inv.type === 'reel') {
                // Deduct 6 meters (typical for half-bed or hybrid piece)
                // If it's a full bed of the same string, NewJobModal creates two details? 
                // Wait, NewJobModal currently creates ONE detail for full bed and TWO for hybrid.
                // If it's full bed, we should deduct 12m. If hybrid, 6m each.
                const deduction = jobDetails.length === 2 && (detail.item_type === 'main_string' || detail.item_type === 'cross_string') ? 6 : 12;
                
                let newRemaining = (inv.remaining_length || 0) - deduction;
                let newQuantity = inv.quantity;
                
                if (newRemaining <= 0) {
                  // Use another reel if available
                  newQuantity = Math.max(0, inv.quantity - 1);
                  newRemaining = newQuantity > 0 ? (inv.total_length || 200) + newRemaining : 0;
                }
                
                await supabase
                  .from('inventory')
                  .update({ 
                    remaining_length: newRemaining,
                    quantity: newQuantity,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', inv.id);
              }
            }
          }
        }

        // Send notification
        const { data: jobData } = await supabase
          .from('jobs')
          .select('*, customers(profile_id)')
          .eq('id', job.id)
          .single();

        if (jobData?.customers?.profile_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('onesignal_player_id')
            .eq('id', jobData.customers.profile_id)
            .single();

          if (profile?.onesignal_player_id) {
            await sendNotification(
              profile.onesignal_player_id,
              'Job Completed!',
              `Your racquet is ready for pickup${job.racquets ? ` - ${job.racquets.brand} ${job.racquets.model}` : ''}`,
              { type: 'job', job_id: job.id }
            );
          }
        }
      }
    } catch (error) {
      console.error('Error updating job status:', error);
    }
  };

  return (
    <div className="divide-y divide-border-main">
      {filteredJobs.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-16 h-16 bg-bg-elevated rounded-full flex items-center justify-center mx-auto mb-4">
            <Ticket className="w-8 h-8 text-text-muted" />
          </div>
          <h3 className="font-bold text-text-main mb-1">No jobs yet</h3>
          <p className="text-sm text-text-muted mb-4">Create your first job to get started</p>
          <button
            onClick={() => setShowNewJob(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary/90 transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Job
          </button>
        </div>
      ) : (
        filteredJobs.map((job) => (
          <div key={job.id} className="p-4 hover:bg-bg-elevated/50 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-text-main truncate">
                    {job.customers?.first_name} {job.customers?.last_name}
                  </h3>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                    job.status === 'completed' 
                      ? 'bg-success/10 text-success'
                      : job.status === 'in_progress'
                      ? 'bg-blue-500/10 text-blue-500'
                      : job.status === 'pending'
                      ? 'bg-amber-500/10 text-amber-500'
                      : 'bg-error/10 text-error'
                  }`}>
                    {job.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm text-text-muted truncate">{job.notes || 'No notes'}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {safeFormatDate(job.created_at)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    ${job.total_price}
                  </span>
                </div>
              </div>
              <select
                value={job.status}
                onChange={(e) => handleStatusChange(job, e.target.value)}
                className="px-3 py-1.5 bg-bg-elevated border border-border-main rounded-lg text-xs font-medium text-text-main focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
