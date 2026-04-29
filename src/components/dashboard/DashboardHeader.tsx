import React from "react";
import { QrCode, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

interface DashboardHeaderProps {
  shop: any;
  setShowShopQR: (show: boolean) => void;
}

export function DashboardHeader({ shop, setShowShopQR }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-text-main tracking-tight">
          {shop ? shop.name : 'Dashboard'}
        </h1>
        <p className="text-text-muted mt-1">Here's what's happening with your shop</p>
      </div>
      {shop && (
        <div className="flex gap-2">
          <button 
            onClick={() => setShowShopQR(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-bg-card border border-border-main rounded-xl text-sm font-semibold text-text-main hover:border-primary hover:text-primary transition-all"
          >
            <QrCode className="w-4 h-4" />
            Shop QR
          </button>
          <Link 
            to={`/${shop.slug}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-bg-card border border-border-main rounded-xl text-sm font-semibold text-text-main hover:border-primary hover:text-primary transition-all"
          >
            <ArrowUpRight className="w-4 h-4" />
            Public Page
          </Link>
        </div>
      )}
    </div>
  );
}
