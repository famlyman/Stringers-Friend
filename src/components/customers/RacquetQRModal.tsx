import React from "react";
import { X } from "lucide-react";
import QRCodeDisplay from "../QRCodeDisplay";
import { Racquet } from "../../types/database";

interface RacquetQRModalProps {
  showRacquetQR: Racquet | null;
  setShowRacquetQR: (data: Racquet | null) => void;
  customerName?: string;
  shopName?: string;
}

export function RacquetQRModal({ showRacquetQR, setShowRacquetQR, customerName, shopName }: RacquetQRModalProps) {
  if (!showRacquetQR) return null;

  // Safer derivation of customer name to avoid TypeErrors
  const getCustomerName = () => {
    if (customerName) return customerName;
    const racquetWithData = showRacquetQR as any;
    if (racquetWithData.customers?.first_name) {
      return `${racquetWithData.customers.first_name} ${racquetWithData.customers.last_name || ''}`.trim();
    }
    return racquetWithData.customerName || 'RACQUET';
  };

  const derivedCustomerName = getCustomerName();

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={() => setShowRacquetQR(null)}
    >
      <div 
        className="bg-white dark:bg-neutral-800 rounded-2xl p-6 max-w-sm w-full mx-4 relative"
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={() => setShowRacquetQR(null)}
          className="absolute top-3 right-3 p-2 bg-neutral-100 dark:bg-neutral-700 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-600"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex flex-col items-center">
          <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-3 uppercase tracking-wide">Racquet QR Code</p>
          <QRCodeDisplay 
            value={showRacquetQR.id} 
            customerName={derivedCustomerName}
            serialNumber={showRacquetQR.serial_number || undefined}
            label={`${showRacquetQR.brand} ${showRacquetQR.model}`}
            shopName={shopName || (showRacquetQR as any).shop?.name}
          />
        </div>
      </div>
    </div>
  );
}
