import React from "react";
import { Wrench, Clock, Star } from "lucide-react";

interface ShopStatsProps {
  servicesCount: number;
}

export function ShopStats({ servicesCount }: ShopStatsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-8 mb-10">
      <div className="flex items-center gap-2">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
          <Wrench className="w-6 h-6 text-primary" />
        </div>
        <div className="text-left">
          <p className="text-2xl font-black text-neutral-900 dark:text-white">{servicesCount}+</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-bold">String Options</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
          <Clock className="w-6 h-6 text-secondary" />
        </div>
        <div className="text-left">
          <p className="text-2xl font-black text-neutral-900 dark:text-white">Quick</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-bold">Turnaround</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
          <Star className="w-6 h-6 text-accent" />
        </div>
        <div className="text-left">
          <p className="text-2xl font-black text-neutral-900 dark:text-white">5.0</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-bold">Customer Rating</p>
        </div>
      </div>
    </div>
  );
}
