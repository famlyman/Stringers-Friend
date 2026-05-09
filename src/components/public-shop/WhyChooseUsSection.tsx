import React from "react";
import { Award, Clock, ShieldCheck } from "lucide-react";

export function WhyChooseUsSection() {
  return (
    <section>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
          Why Choose Us
        </h2>
        <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800 ml-6"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-8 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 hover:shadow-lg transition-all">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
            <Award className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-3">Expert Quality</h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">Experienced stringing with precision tensioning for every racquet type and playing style.</p>
        </div>
        <div className="p-8 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 hover:shadow-lg transition-all">
          <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center mb-6">
            <Clock className="w-6 h-6 text-secondary" />
          </div>
          <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-3">Fast Turnaround</h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">Most jobs completed within 3-4 days. Express service available for urgent needs.</p>
        </div>
        <div className="p-8 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 hover:shadow-lg transition-all">
          <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center mb-6">
            <ShieldCheck className="w-6 h-6 text-accent" />
          </div>
          <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-3">Track Progress</h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">Get real-time updates and notifications when your racquet is ready for pickup.</p>
        </div>
      </div>
    </section>
  );
}
