import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Printer } from "lucide-react";

export default function QRCodeDisplay({ value, label, shopName, shopPhone }: { value: string, label?: string, shopName?: string, shopPhone?: string }) {
  const [qrUrl, setQrUrl] = useState("");

  useEffect(() => {
    if (value) {
      const fullUrl = `${window.location.origin}/scan/${value}`;
      QRCode.toDataURL(fullUrl, { width: 400, margin: 2 }, (err, url) => {
        if (!err) setQrUrl(url);
      });
    }
  }, [value]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to print QR codes");
      return;
    }
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Code</title>
          <style>
            @page {
              margin: 0;
              size: auto;
            }
            body { 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              min-height: 100vh; 
              margin: 0; 
              padding: 20px;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              background: white;
            }
            .container {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
              border: 1px dashed #ccc;
              padding: 30px;
              border-radius: 12px;
            }
            img { 
              width: 300px; 
              height: 300px; 
              margin-bottom: 20px;
            }
            .shop-name { 
              font-size: 28px; 
              font-weight: 800; 
              color: #000; 
              margin: 0;
              text-transform: uppercase;
              letter-spacing: -0.02em;
            }
            .shop-phone { 
              font-size: 20px; 
              color: #333; 
              margin-top: 8px;
              font-weight: 500;
            }
            @media print {
              .container { border: none; }
              body { min-height: auto; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <img src="${qrUrl}" />
            ${shopName ? `<div class="shop-name">${shopName}</div>` : ''}
            ${shopPhone ? `<div class="shop-phone">${shopPhone}</div>` : ''}
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="flex flex-col items-center p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm group relative">
      <div className="p-2 bg-white rounded-lg shadow-inner">
        {qrUrl && <img src={qrUrl} alt="QR Code" className="w-40 h-40 dark:invert dark:brightness-150" />}
      </div>
      {label && <p className="mt-2 text-sm font-bold text-neutral-900 dark:text-white">{label}</p>}
      <p className="mt-1 text-xs text-neutral-400 font-mono">{value}</p>
      
      <button 
        onClick={handlePrint}
        className="mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20"
      >
        <Printer className="w-3.5 h-3.5" />
        Print Label
      </button>
    </div>
  );
}
