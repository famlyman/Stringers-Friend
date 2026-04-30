import React from "react";
import { MapPin, Phone } from "lucide-react";
import { Shop } from "../../types/database";

interface ShopInfoSidebarProps {
  shop: Shop;
}

export function ShopInfoSidebar({ shop }: ShopInfoSidebarProps) {
  return (
    <div className="p-8 bg-neutral-900 dark:bg-white rounded-3xl text-white dark:text-neutral-900 shadow-2xl">
      <h3 className="text-xl font-bold mb-6">Shop Info</h3>
      <div className="space-y-6">
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/10 dark:bg-neutral-100 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-widest opacity-50 mb-1">Location</p>
            <p className="text-sm font-medium">{shop.address || "Contact for address"}</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/10 dark:bg-neutral-100 flex items-center justify-center shrink-0">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-widest opacity-50 mb-1">Phone</p>
            <p className="text-sm font-medium">{shop.phone || "Contact for phone"}</p>
          </div>
        </div>
      </div>
      
      <div className="mt-10 pt-10 border-t border-white/10 dark:border-neutral-100">
        <p className="text-xs opacity-70 leading-relaxed">
          We specialize in high-performance racquet stringing using the latest techniques and materials.
        </p>
      </div>
    </div>
  );
}
