import { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import { Printer, Share2, Download, Copy, Check } from "lucide-react";
import { toPng } from "html-to-image";

export default function QRCodeDisplay({ value, label, shopName, shopPhone }: { value: string, label?: string, shopName?: string, shopPhone?: string }) {
  const [qrUrl, setQrUrl] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const labelRef = useRef<HTMLDivElement>(null);

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

  const generateImage = async () => {
    if (!labelRef.current) return null;
    try {
      // Ensure the hidden element is ready
      const dataUrl = await toPng(labelRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 2, // High quality
      });
      return dataUrl;
    } catch (err) {
      console.error("Error generating image:", err);
      return null;
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    const dataUrl = await generateImage();
    if (dataUrl) {
      const link = document.createElement('a');
      link.download = `label-${label || value}.png`;
      link.href = dataUrl;
      link.click();
    }
    setIsDownloading(false);
  };

  const handleShare = async () => {
    setIsSharing(true);
    const dataUrl = await generateImage();
    if (!dataUrl) {
      setIsSharing(false);
      return;
    }

    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], `label-${label || value}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'QR Code Label',
          text: `Label for ${label || value}`
        });
      } else {
        // Fallback to clipboard if sharing is not supported
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }
    } catch (err) {
      console.error("Error sharing:", err);
    }
    setIsSharing(false);
  };

  return (
    <div className="flex flex-col items-center p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm group relative">
      {/* Hidden element for image generation */}
      <div className="fixed -left-[9999px] top-0">
        <div 
          ref={labelRef}
          className="bg-white p-8 flex flex-col items-center justify-center text-center"
          style={{ width: '400px' }}
        >
          {qrUrl && <img src={qrUrl} alt="QR Code" className="w-64 h-64 mb-4" />}
          {label && <p className="text-2xl font-bold text-black mb-1">{label}</p>}
          {shopName && <p className="text-xl font-extrabold text-black uppercase tracking-tight">{shopName}</p>}
          {shopPhone && <p className="text-lg font-medium text-neutral-700">{shopPhone}</p>}
        </div>
      </div>

      <div className="p-2 bg-white rounded-lg shadow-inner">
        {qrUrl && <img src={qrUrl} alt="QR Code" className="w-40 h-40 dark:invert dark:brightness-150" />}
      </div>
      {label && <p className="mt-2 text-sm font-bold text-neutral-900 dark:text-white">{label}</p>}
      
      <div className="mt-4 grid grid-cols-2 gap-2 w-full">
        <button 
          onClick={handlePrint}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-primary text-white rounded-xl text-[10px] font-bold hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20"
        >
          <Printer className="w-3 h-3" />
          Print
        </button>
        <button 
          onClick={handleShare}
          disabled={isSharing}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-xl text-[10px] font-bold hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-all active:scale-95"
        >
          {isCopied ? <Check className="w-3 h-3 text-green-500" /> : <Share2 className="w-3 h-3" />}
          {isSharing ? "..." : isCopied ? "Copied" : "Share"}
        </button>
        <button 
          onClick={handleDownload}
          disabled={isDownloading}
          className="col-span-2 flex items-center justify-center gap-2 px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 rounded-xl text-[10px] font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all active:scale-95"
        >
          <Download className="w-3 h-3" />
          {isDownloading ? "Generating..." : "Download Image"}
        </button>
      </div>
    </div>
  );
}
