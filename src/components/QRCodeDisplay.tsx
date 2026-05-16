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
      const hasDash = value.includes('-');
      const isHexLike = /^[a-z0-9:-]+$/i.test(value);
      const isRacquetId = hasDash && isHexLike;
      
      const fullUrl = isRacquetId 
        ? `${window.location.origin}/r/${value}`
        : `${window.location.origin}/${value}`;
      
      QRCode.toDataURL(fullUrl, { width: 400, margin: 0, errorCorrectionLevel: 'M' }, (err, url) => {
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
              size: 40mm 14mm;
              margin: 0;
            }
            body { 
              margin: 0; 
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              background: white;
              height: 14mm;
              width: 40mm;
              overflow: hidden;
            }
            .container {
              display: flex;
              flex-direction: row;
              align-items: center;
              width: 40mm;
              height: 14mm;
              box-sizing: border-box;
              background: white;
              border: 1px dashed #eee;
            }
            .qr-img { 
              height: 10mm; 
              width: 10mm; 
              margin-left: 0.8mm;
              margin-right: 1.5mm;
              flex-shrink: 0;
            }
            .info {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: center;
              height: 100%;
              padding: 0.5mm 0;
              min-width: 0;
              gap: 0.5mm;
            }
            .customer-name {
              font-size: 6pt;
              font-weight: 950;
              line-height: 1;
              color: #000;
              text-transform: uppercase;
              white-space: nowrap;
            }
            .serial-number {
              font-size: 5.5pt;
              font-weight: 900;
              color: #000;
              line-height: 1;
              white-space: nowrap;
            }
            .shop-name-line {
              font-size: 5pt;
              font-weight: 950;
              text-transform: uppercase;
              white-space: nowrap;
            }
            .powered-by {
              font-size: 4pt;
              font-weight: 800;
              text-transform: uppercase;
              color: #555;
              text-align: left;
            }
            @media print {
              .container { border: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <img class="qr-img" src="${qrUrl}" />
            <div class="info">
              <div class="customer-name">${customerName || label || 'RACQUET'}</div>

              <div class="serial-number">
                ${serialNumber ? 'SN: ' + serialNumber.slice(-4) : 'N/A'}
              </div>

              <div class="shop-name-line">${shopName || ''}</div>
              <div class="powered-by">Powered by Stringer's Friend</div>
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
        pixelRatio: 4,
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
      {/* Hidden element for image generation (686x240 for 40x14mm) */}
      <div className="fixed -left-[9999px] top-0">
        <div 
          ref={labelRef}
          className="bg-white flex flex-row items-center justify-start text-left"
          style={{ width: '686px', height: '240px', fontFamily: 'sans-serif' }}
        >
          {qrUrl && <img src={qrUrl} alt="QR Code" style={{ width: '170px', height: '170px', marginLeft: '14px', marginRight: '26px' }} />}
          <div className="flex flex-col justify-center flex-1 h-full py-5 pr-8 min-w-0 gap-1">
            <p className="text-3xl font-black text-black leading-none uppercase whitespace-nowrap">
              {customerName || label || 'RACQUET'}
            </p>
            <p className="text-2xl font-black text-black leading-none whitespace-nowrap">
              {serialNumber ? `SN: ${serialNumber.slice(-4)}` : 'N/A'}
            </p>
            <p className="text-xl font-black text-black uppercase whitespace-nowrap">{shopName || ''}</p>
            <p className="text-sm font-bold text-neutral-500 uppercase tracking-widest text-left">Powered by Stringer's Friend</p>
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
