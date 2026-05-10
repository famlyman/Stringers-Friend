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
              padding: 1.2mm;
              border-radius: 0.5mm;
              width: 40mm;
              height: 14mm;
              box-sizing: border-box;
              overflow: hidden;
              background: white;
            }
            .qr-img { 
              width: 12.5mm; 
              height: 12.5mm; 
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
              padding-top: 0.2mm;
            }
            .customer-name {
              font-size: 7.2pt;
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
            .specs {
              font-size: 4.5pt;
              font-weight: 700;
              color: #111;
              margin-top: 0.2mm;
              line-height: 1.1;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .racquet-model {
              font-size: 4.5pt;
              font-weight: 600;
              color: #555;
              margin-top: 0.1mm;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .footer-row {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: auto;
              padding-top: 0.4mm;
              border-top: 0.05mm solid #ddd;
            }
            .shop-info { 
              font-size: 3.5pt; 
              font-weight: 900; 
              color: #000; 
              text-transform: uppercase;
              max-width: 70%;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .date-info { 
              font-size: 3pt; 
              color: #888; 
              font-weight: 700;
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
              ${stringMain ? `<div class="specs">${stringMain}${tensionMain ? ' @ '+tensionMain : ''}</div>` : ''}
              ${stringCross ? `<div class="specs">${stringCross}${tensionCross ? ' @ '+tensionCross : ''}</div>` : ''}
              <div class="racquet-model">${label || ''}</div>
              <div class="footer-row">
                <div class="shop-info">${shopName || (customerName ? 'STRINGERS FRIEND' : '')}</div>
                <div class="date-info">${stringingDate || new Date().toLocaleDateString()}</div>
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
        skipFonts: true,
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
          text: label || value
        });
      } else {
        const link = document.createElement('a');
        link.download = `label-${label || value}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.error("Error sharing:", err);
    } finally {
      setIsSharing(false);
    }
  };

  if (minimal) {
    return (
      <div className="flex flex-col items-center">
        {qrUrl && <img src={qrUrl} alt="QR Code" className="w-32 h-32" />}
        {label && <p className="mt-2 text-sm font-bold text-neutral-900 dark:text-white">{label}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-4 bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-100 dark:border-neutral-700 w-full max-w-sm mx-auto">
      {/* Hidden element for image generation */}
      <div className="fixed -left-[9999px] top-0">
        <div 
          ref={labelRef}
          className="bg-white p-4 flex flex-row items-center justify-start text-left"
          style={{ width: '600px', height: '280px', fontFamily: 'sans-serif' }}
        >
          {qrUrl && <img src={qrUrl} alt="QR Code" className="w-[220px] h-[220px] mr-6 flex-shrink-0" />}
          <div className="flex flex-col justify-center min-w-0 flex-1 h-full py-1">
            <p className="text-3xl font-black text-black leading-none uppercase truncate mb-1.5">
              {customerName || label || 'RACQUET'}
            </p>
            <div className="space-y-0.5 mb-1.5">
              {stringMain && (
                <p className="text-xl font-bold text-neutral-800 truncate">
                  {stringMain}{tensionMain ? ` @ ${tensionMain} lbs` : ''}
                </p>
              )}
              {stringCross && (
                <p className="text-xl font-bold text-neutral-800 truncate">
                  {stringCross}{tensionCross ? ` @ ${tensionCross} lbs` : ''}
                </p>
              )}
            </div>
            {(stringMain || stringCross) && label && (
              <p className="text-xl font-semibold text-neutral-600 truncate mb-3">{label}</p>
            )}
            
            <div className="mt-auto pt-1.5 border-t border-neutral-100 flex justify-between items-end">
              <p className="text-lg font-black text-black uppercase tracking-wider">
                {shopName || (customerName ? 'STRINGERS FRIEND' : '')}
              </p>
              <p className="text-base font-bold text-neutral-400">
                {stringingDate || new Date().toLocaleDateString()}
              </p>
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
          className="flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all active:scale-95"
        >
          <Printer className="w-4 h-4" />
          Print
        </button>
        <button 
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-xl font-bold hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-all active:scale-95 disabled:opacity-50"
        >
          {isDownloading ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Image
        </button>
        <button 
          onClick={handleShare}
          disabled={isSharing}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-xl font-bold hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-all active:scale-95 disabled:opacity-50"
        >
          {isSharing ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Share2 className="w-4 h-4" />
          )}
          Share
        </button>
        <button 
          onClick={() => {
            const hasDash = value.includes('-');
            const isHexLike = /^[a-z0-9:-]+$/i.test(value);
            const isRacquetId = hasDash && isHexLike;
            const fullUrl = isRacquetId 
              ? `${window.location.origin}/r/${value}`
              : `${window.location.origin}/${value}`;
            navigator.clipboard.writeText(fullUrl);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
          }}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-xl font-bold hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-all active:scale-95"
        >
          {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          Copy Link
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-4" onClick={() => setIsModalOpen(false)}>
          <div className="relative max-w-2xl w-full flex flex-col items-center animate-scale-in" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute -top-12 right-0 p-2 text-white hover:text-primary transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center w-full">
              {qrUrl && <img src={qrUrl} alt="QR Code Large" className="w-full max-w-[400px] aspect-square object-contain" />}
              <div className="mt-8 flex flex-col items-center text-center">
                <h3 className="text-2xl font-black text-neutral-900 mb-2">{label || "Racquet QR Code"}</h3>
                <p className="text-neutral-500 font-medium mb-6">Scan to view full history and technical specs</p>
                <button 
                  onClick={() => {
                    const hasDash = value.includes('-');
                    const isHexLike = /^[a-z0-9:-]+$/i.test(value);
                    const isRacquetId = hasDash && isHexLike;
                    const fullUrl = isRacquetId 
                      ? `${window.location.origin}/r/${value}`
                      : `${window.location.origin}/${value}`;
                    navigator.clipboard.writeText(fullUrl);
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-2xl font-bold hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-all"
                >
                  {isCopied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                  {isCopied ? "Link Copied" : "Copy Profile Link"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
