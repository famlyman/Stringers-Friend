import { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import { Printer, Share2, Download, Copy, Check, X, Maximize2 } from "lucide-react";
import { toPng } from "html-to-image";

export default function QRCodeDisplay({ 
  value, 
  label, 
  shopName, 
  shopPhone,
  serialNumber,
  minimal = false
}: { 
  value: string, 
  label?: string, 
  shopName?: string, 
  shopPhone?: string,
  serialNumber?: string,
  minimal?: boolean
}) {
  const [qrUrl, setQrUrl] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const labelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      // Shop QR codes are slugs (e.g., "tennis-shop"), racquet/inventory have prefixes like "SF|r|"
      const isShopQR = value.includes('/') === false && value.startsWith('SF|') === false;
      const fullUrl = isShopQR 
        ? `${window.location.origin}/${value}`  // Direct to shop landing page
        : `${window.location.origin}/scan/${value}`;  // To scan result page for other items
      QRCode.toDataURL(fullUrl, { width: 200, margin: 1, errorCorrectionLevel: 'L' }, (err, url) => {
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
              flex-direction: row;
              align-items: center;
              justify-content: flex-start;
              text-align: left;
              border: 1px dashed #ccc;
              padding: 1mm;
              border-radius: 0.5mm;
              width: 30mm;
              height: 14mm;
              box-sizing: border-box;
              overflow: hidden;
              background: white;
            }
            img { 
              width: 11mm; 
              height: 11mm; 
              margin-right: 1mm;
              flex-shrink: 0;
            }
            .info {
              display: flex;
              flex-direction: column;
              justify-content: center;
              min-width: 0;
              flex: 1;
              height: 100%;
            }
            .label-text {
              font-size: 7pt;
              font-weight: 900;
              margin: 0;
              line-height: 1.1;
              word-break: break-word;
              color: #000;
              max-height: 14pt;
              overflow: hidden;
            }
            .serial-text {
              font-size: 5pt;
              font-weight: 700;
              color: #111;
              margin-top: 0.3mm;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .shop-name { 
              font-size: 4pt; 
              font-weight: 800; 
              color: #000; 
              margin-top: 0.3mm;
              text-transform: uppercase;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .shop-phone { 
              font-size: 3pt; 
              color: #333; 
              margin-top: 0px;
              font-weight: 600;
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
            <div class="info">
              ${label ? `<div class="label-text">${label}</div>` : ''}
              ${serialNumber ? `<div class="serial-text">S/N: ${serialNumber}</div>` : ''}
              ${shopName ? `<div class="shop-name">${shopName}</div>` : ''}
              ${shopPhone ? `<div class="shop-phone">${shopPhone}</div>` : ''}
            </div>
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
      const dataUrl = await toPng(labelRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
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
        // Fallback to clipboard for images
        try {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
        } catch (clipboardErr) {
          console.warn("Clipboard image write failed, falling back to text:", clipboardErr);
          // Final fallback: just copy the URL text
          const isShopQR = !value.includes('_');
          const fullUrl = isShopQR 
            ? `${window.location.origin}/${value}`
            : `${window.location.origin}/scan/${value}`;
          await navigator.clipboard.writeText(fullUrl);
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
        }
      }
    } catch (err) {
      if (err instanceof Error && (err.name === 'AbortError' || err.message.includes('Share canceled'))) {
        // User cancelled the share - this is expected behavior
        console.log("Share operation was cancelled by the user.");
      } else {
        console.error("Error sharing:", err);
      }
    }
    setIsSharing(false);
  };

  if (minimal) {
    return (
      <div className="flex flex-col items-center gap-2">
        {/* Hidden element for image generation */}
        <div className="fixed -left-[9999px] top-0">
          <div 
            ref={labelRef}
            className="bg-white p-2 flex flex-row items-center justify-start text-left"
            style={{ width: '600px', height: '210px' }}
          >
            {qrUrl && <img src={qrUrl} alt="QR Code" className="w-48 h-48 mr-4 flex-shrink-0" />}
            <div className="flex flex-col justify-center min-width-0 flex-1">
              {label && <p className="text-3xl font-black text-black leading-tight mb-1 line-clamp-2">{label}</p>}
              {serialNumber && <p className="text-xl font-bold text-neutral-900 mb-1 truncate">S/N: {serialNumber}</p>}
              {shopName && <p className="text-sm font-black text-black uppercase tracking-tight truncate">{shopName}</p>}
              {shopPhone && <p className="text-xs font-bold text-neutral-800">{shopPhone}</p>}
            </div>
          </div>
        </div>

        <div 
          className="p-1 bg-white rounded-lg shadow-sm border border-neutral-100 dark:border-neutral-700 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
          onClick={() => setIsModalOpen(true)}
        >
          {qrUrl && <img src={qrUrl} alt="QR Code" className="w-28 h-28 dark:invert dark:brightness-150" />}
        </div>
        <div className="mt-1 flex gap-1">
          <button 
            onClick={handlePrint}
            className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-all"
            title="Print Label"
          >
            <Printer className="w-3 h-3" />
          </button>
          <button 
            onClick={handleDownload}
            className="p-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
            title="Download"
          >
            <Download className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm group relative">
      {/* Hidden element for image generation */}
      <div className="fixed -left-[9999px] top-0">
        <div 
          ref={labelRef}
          className="bg-white p-2 flex flex-row items-center justify-start text-left"
          style={{ width: '600px', height: '210px' }}
        >
          {qrUrl && <img src={qrUrl} alt="QR Code" className="w-48 h-48 mr-4 flex-shrink-0" />}
          <div className="flex flex-col justify-center min-width-0 flex-1">
            {label && <p className="text-3xl font-black text-black leading-tight mb-1 line-clamp-2">{label}</p>}
            {serialNumber && <p className="text-xl font-bold text-neutral-900 mb-1 truncate">S/N: {serialNumber}</p>}
            {shopName && <p className="text-sm font-black text-black uppercase tracking-tight truncate">{shopName}</p>}
            {shopPhone && <p className="text-xs font-bold text-neutral-800">{shopPhone}</p>}
          </div>
        </div>
      </div>

      <div 
        className="p-2 bg-white rounded-lg shadow-inner cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
        onClick={() => setIsModalOpen(true)}
        title="Click to enlarge"
      >
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

      {/* Enlarge Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-neutral-800 rounded-2xl p-6 max-w-sm w-full mx-4 relative"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-3 right-3 p-2 bg-neutral-100 dark:bg-neutral-700 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-600"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex flex-col items-center">
              <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-3 uppercase tracking-wide">Scan Racquet</p>
              <div className="p-4 bg-white rounded-xl shadow-2xl">
                {qrUrl && <img src={qrUrl} alt="QR Code" className="w-64 h-64" />}
              </div>
              <p className="mt-4 text-sm font-bold text-neutral-600 dark:text-neutral-300">{label}</p>
              {serialNumber && <p className="text-xs font-bold text-neutral-400">S/N: {serialNumber}</p>}
              
              <div className="mt-6 flex gap-2 w-full">
                <button 
                  onClick={handlePrint}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
                <button 
                  onClick={() => {
                    const isShopQR = !value.includes('_');
                    const fullUrl = isShopQR 
                      ? `${window.location.origin}/${value}`
                      : `${window.location.origin}/scan/${value}`;
                    navigator.clipboard.writeText(fullUrl);
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-xl font-bold hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-all"
                >
                  {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {isCopied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
