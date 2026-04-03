import React, { useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QrScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (errorMessage: string) => void;
}

export const QrScanner: React.FC<QrScannerProps> = ({ onScan, onError }) => {
  useEffect(() => {
    const html5QrCode = new Html5Qrcode("qr-reader");
    
    html5QrCode.start(
      { facingMode: "environment" },
      { 
        fps: 10, 
        qrbox: { width: 300, height: 300 },
        aspectRatio: 1.0
      },
      (decodedText) => {
        console.log("Scanned QR code:", decodedText);
        onScan(decodedText);
      },
      (errorMessage) => {
        console.log("Scan error:", errorMessage);
        if (onError) onError(errorMessage);
      }
    ).catch(err => {
      console.error("Error starting scanner:", err);
      if (onError) onError("Camera permission denied or not available.");
    });

    return () => {
      html5QrCode.stop().catch(err => console.error("Error stopping scanner:", err));
    };
  }, [onScan, onError]);

  return <div id="qr-reader" className="w-full h-96" />;
};
