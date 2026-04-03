import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QrScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (errorMessage: string) => void;
}

export const QrScanner: React.FC<QrScannerProps> = ({ onScan, onError }) => {
  const isRunningRef = useRef(false);

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
        // Ignore "NotFoundException" as it's expected during continuous scanning
        if (errorMessage && !errorMessage.includes("NotFoundException")) {
          console.log("Scan error:", errorMessage);
          if (onError) onError(errorMessage);
        }
      }
    ).then(() => {
      isRunningRef.current = true;
    }).catch(err => {
      console.error("Error starting scanner:", err);
      if (onError) onError("Camera permission denied or not available.");
    });

    return () => {
      if (isRunningRef.current) {
        html5QrCode.stop().then(() => {
          html5QrCode.clear();
          isRunningRef.current = false;
        }).catch(err => {
          console.error("Error stopping scanner:", err);
        });
      }
    };
  }, [onScan, onError]);

  return <div id="qr-reader" className="w-full h-96" />;
};
