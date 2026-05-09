import React from "react";
import { Award, Zap, ChevronRight, MapPin, Phone } from "lucide-react";
import { ShopStats } from "./ShopStats";
import { Shop } from "../../types/database";

interface PublicShopHeroProps {
  shop: Shop;
  servicesCount: number;
  openContactModal: () => void;
}

export function PublicShopHero({ shop, servicesCount, openContactModal }: PublicShopHeroProps) {
  return (
    <div className="relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-white to-secondary/5 dark:from-primary/10 dark:via-neutral-900 dark:to-secondary/10">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-10 left-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-secondary/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-accent/20 rounded-full blur-2xl"></div>
        </div>
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-bold uppercase tracking-wider mb-6">
            <Award className="w-4 h-4 mr-2" />
            Experienced Racquet Stringing Services
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-neutral-900 dark:text-white tracking-tight mb-6">
            {shop.name}
          </h1>
          <p className="text-xl md:text-2xl text-neutral-600 dark:text-neutral-300 max-w-3xl mx-auto mb-8 leading-relaxed">
            Experienced racquet stringing with precision, care, and quick turnaround. 
            Trusted by players of all levels for consistent quality and performance.
          </p>
          
          <ShopStats servicesCount={servicesCount} />
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={openContactModal}
              className="px-8 py-4 bg-primary text-white rounded-2xl font-bold text-center hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Zap className="w-5 h-5" />
              Request Stringing Service
            </button>
            <button
              onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-2xl font-bold text-center hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-all border border-neutral-200 dark:border-neutral-700 flex items-center justify-center gap-2"
            >
              View Services & Pricing
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-neutral-400 mt-4">
            Quick response guaranteed
          </p>
        </div>
        
        {/* Contact Info Bar */}
        <div className="flex flex-wrap justify-center gap-8 text-neutral-600 dark:text-neutral-400">
          {shop.address && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-sm">{shop.address}</span>
            </div>
          )}
          {shop.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary" />
              <span className="text-sm">{shop.phone}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
