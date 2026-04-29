import React from "react";
import { X } from "lucide-react";
import QRCodeDisplay from "../QRCodeDisplay";

interface InventoryQRModalProps {
  showQRCodeModal: { value: string, label: string } | null;
  setShowQRCodeModal: (data: { value: string, label: string } | null) => void;
}

export function InventoryQRModal({ showQRCodeModal, setShowQRCodeModal }: InventoryQRModalProps) {
  if (!showQRCodeModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative border border-neutral-200 dark:border-neutral-800">
        <button 
          onClick={() => setShowQRCodeModal(null)}
          className="absolute top-6 right-6 p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
        >
          <X className="w-6 h-6 text-neutral-400" />
        </button>
        <h2 className="text-xl font-bold text-primary mb-6">Inventory QR Code</h2>
        <div className="flex justify-center">
          <QRCodeDisplay 
            value={showQRCodeModal.value} 
            label={showQRCodeModal.label}
          />
        </div>
      </div>
    </div>
  );
}
