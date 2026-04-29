import React from "react";
import { Star, Users } from "lucide-react";

export function TestimonialsSection() {
  return (
    <section>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
          Customer Testimonials
        </h2>
        <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800 ml-6"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
          <p className="text-neutral-700 dark:text-neutral-300 mb-4 leading-relaxed">
            "Amazing service! My racquet feels brand new. The tension is perfect and the turnaround was incredibly fast."
          </p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-neutral-900 dark:text-white">Sarah J.</p>
              <p className="text-xs text-neutral-500">Tournament Player</p>
            </div>
          </div>
        </div>
        <div className="p-6 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
          <p className="text-neutral-700 dark:text-neutral-300 mb-4 leading-relaxed">
            "Professional and reliable. I've been bringing my racquets here for years and the quality is always consistent."
          </p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-secondary/20 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <p className="text-sm font-bold text-neutral-900 dark:text-white">Mike R.</p>
              <p className="text-xs text-neutral-500">League Player</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
