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
  stringMain,
  stringCross,
  tensionMain,
  tensionCross,
  customerName,
  stringingDate,
  minimal = false
}: { 
  value: string, 
  label?: string, 
  shopName?: string, 
  shopPhone?: string,
  serialNumber?: string,
  stringMain?: string,
  stringCross?: string,
  tensionMain?: string | number,
  tensionCross?: string | number,
  customerName?: string,
  stringingDate?: string,
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
      // UUIDs with dashes are racquets - route to /r/{id}
      const hasDash = value.includes('-');
      const isHexLike = /^[a-z0-9:-]+$/i.test(value);
      const isRacquetId = hasDash && isHexLike;
      
      const fullUrl = isRacquetId 
        ? `${window.location.origin}/r/${value}`
        : `${window.location.origin}/${value}`;
      
      QRCode.toDataURL(fullUrl, { width: 300, margin: 1, errorCorrectionLevel: 'M' }, (err, url) => {
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
              width: 40mm;
              height: 14mm;
              box-sizing: border-box;
              overflow: hidden;
              background: white;
            }
            .qr-img { 
              width: 12mm; 
              height: 12mm; 
              margin-right: 1.5mm;
              flex-shrink: 0;
            }
            .info {
              display: flex;
              flex-direction: column;
              justify-content: center;
              min-width: 0;
              flex: 1;
              height: 100%;
              padding-top: 1.8mm;
            }
            .customer-name {
              font-size: 7.5pt;
              font-weight: 950;
              margin: 0;
              line-height: 1;
              color: #000;
              text-transform: uppercase;
              letter-spacing: -0.1mm;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .specs-container {
              display: flex;
              flex-direction: column;
              gap: 0.1mm;
              margin: 0.3mm 0;
            }
            .specs {
              font-size: 4pt;
              font-weight: 700;
              color: #111;
              line-height: 1.1;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .racquet-model {
              font-size: 4pt;
              font-weight: 600;
              color: #444;
              line-height: 1.1;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .shop-name-block {
              font-size: 3.8pt;
              font-weight: 950;
              color: #000;
              text-transform: uppercase;
              margin-top: auto;
              padding-top: 0.2mm;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .date-info { 
              font-size: 3.2pt; 
              color: #666; 
              font-weight: 700;
              margin-top: 0.2mm;
            }
            .footer-row {
              display: flex;
              justify-content: center;
              align-items: center;
              padding-top: 0.3mm;
              border-top: 0.05mm solid #eee;
            }
            .powered-by { 
              font-size: 2.8pt; 
              color: #bbb; 
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.1mm;
            }
            @media print {
              .container { border: none; }
              body { min-height: auto; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <img class="qr-img" src="${qrUrl}" />
            <div class="info">
              <div class="customer-name">${customerName || label || 'RACQUET'}</div>
              <div class="specs-container">
                ${stringMain ? `<div class="specs">${stringMain}${tensionMain ? ' @ '+tensionMain : ''}</div>` : ''}
                ${stringCross ? `<div class="specs">${stringCross}${tensionCross ? ' @ '+tensionCross : ''}</div>` : ''}
                <div class="racquet-model">${label || ''}</div>
                <div class="date-info">${stringingDate || new Date().toLocaleDateString()}</div>
              </div>
              <div class="shop-name-block">${shopName || ''}</div>
              <div class="footer-row">
                <div class="powered-by">Powered by Stringer's Friend</div>
              </div>
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
      // Filter out problematic elements (OneSignal widgets) that cause CSS insertRule errors
      const filter = (node: HTMLElement) => {
        const id = node.id || '';
        const className = typeof node.className === 'string' ? node.className : '';
        return !id.includes('onesignal') && !className.includes('onesignal');
      };

      const dataUrl = await toPng(labelRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 3,
        filter: filter as any,
        skipFonts: true, // Speeds up generation and avoids font-loading issues
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
            style={{ width: '600px', height: '280px' }}
          >
            {qrUrl && <img src={qrUrl} alt="QR Code" className="w-[220px] h-[220px] mr-4 flex-shrink-0" />}
            <div className="flex flex-col justify-center min-w-0 flex-1">
              {customerName && <p className="text-5xl font-black text-black leading-tight mb-2 line-clamp-2">{customerName}</p>}
              {stringMain && <p className="text-4xl font-bold text-black mb-2 truncate">{stringMain}{tensionMain ? ' '+tensionMain+' lbs' : ''}</p>}
              {stringCross && <p className="text-4xl font-bold text-black mb-2 truncate">{stringCross}{tensionCross ? ' '+tensionCross+' lbs' : ''}</p>}
              {label && <p className="text-4xl font-bold text-black truncate">{label}</p>}
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
          className="bg-white p-4 flex flex-row items-center justify-start text-left"
          style={{ width: '600px', height: '280px', fontFamily: 'sans-serif' }}
        >
          {qrUrl && <img src={qrUrl} alt="QR Code" className="w-[220px] h-[220px] mr-6 flex-shrink-0" />}
          <div className="flex flex-col justify-center min-w-0 flex-1 h-full py-1 pt-4">
            <p className="text-3xl font-black text-black leading-none uppercase truncate mb-1">
              {customerName || label || 'RACQUET'}
            </p>
            <div className="space-y-0.5 my-1 overflow-hidden">
              {stringMain && (
                <p className="text-lg font-bold text-neutral-800 leading-tight truncate">
                  {stringMain}{tensionMain ? ` @ ${tensionMain} lbs` : ''}
                </p>
              )}
              {stringCross && (
                <p className="text-lg font-bold text-neutral-800 leading-tight truncate">
                  {stringCross}{tensionCross ? ` @ ${tensionCross} lbs` : ''}
                </p>
              )}
              <p className="text-lg font-semibold text-neutral-600 truncate">{label || ''}</p>
              <p className="text-base font-bold text-neutral-400 truncate">
                {stringingDate || new Date().toLocaleDateString()}
              </p>
            </div>
            
            <p className="text-base font-black text-black uppercase truncate mt-auto mb-1">
              {shopName || ''}
            </p>
            
            <div className="pt-1.5 border-t border-neutral-100 flex justify-center">
              <p className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest">Powered by Stringer's Friend</p>
            </div>
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
