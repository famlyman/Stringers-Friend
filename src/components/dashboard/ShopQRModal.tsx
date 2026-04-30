import React from "react";
import { X } from "lucide-react";
import QRCodeDisplay from "../QRCodeDisplay";
import { Shop } from "../../types/database";

interface ShopQRModalProps {
  shop: Shop | null;
  setShowShopQR: (show: boolean) => void;
}

export function ShopQRModal({ shop, setShowShopQR }: ShopQRModalProps) {
  if (!shop) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative border border-neutral-200 dark:border-neutral-800">
        <button 
          onClick={() => setShowShopQR(false)}
          className="absolute top-6 right-6 p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
        >
          <X className="w-6 h-6 text-neutral-400" />
        </button>
        <h2 className="text-xl font-bold text-primary mb-2">{shop.name}</h2>
        <p className="text-sm text-neutral-500 mb-6">Scan to find this shop</p>
        <div className="flex justify-center">
          <QRCodeDisplay 
            value={shop.slug} 
            label={shop.name}
          />
        </div>
        <div className="mt-6 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
          <p className="text-xs text-neutral-500 text-center">
            Print and place at your shop counter
          </p>
        </div>
      </div>
    </div>
  );
}
