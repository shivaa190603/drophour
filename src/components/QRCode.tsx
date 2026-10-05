import React, { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, QrCode as QrIcon, Check, Copy } from 'lucide-react';
import { getShareUrl } from '../lib/formatters';

interface QRCodeProps {
  shareToken: string;
  shareCode?: string;
}

export const QRCode: React.FC<QRCodeProps> = ({ shareToken, shareCode }) => {
  const qrRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const shareUrl = getShareUrl(shareToken);

  const downloadQR = () => {
    if (!qrRef.current) return;
    const canvas = qrRef.current.querySelector('canvas');
    if (!canvas) return;

    const image = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = image;
    a.download = `DropHour-QR-${shareCode || shareToken.slice(0, 8)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#D9D9D9] rounded-lg p-5 flex flex-col items-center text-center space-y-4">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#666666] uppercase tracking-wider">
        <QrIcon className="w-3.5 h-3.5" />
        <span>Scan QR Code</span>
      </div>

      {/* QR Code Container */}
      <div
        ref={qrRef}
        className="p-3 bg-white border border-[#D9D9D9] rounded inline-block"
      >
        <QRCodeCanvas
          value={shareUrl}
          size={168}
          level="M"
          bgColor="#FFFFFF"
          fgColor="#171717"
          marginSize={1}
        />
      </div>

      <p className="text-xs text-[#666666]">
        Scan with a phone camera to open the secure download page
      </p>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-1 w-full">
        <button
          type="button"
          onClick={downloadQR}
          className="h-9 px-3.5 bg-[#FFFFFF] border border-[#D9D9D9] hover:border-[#171717] text-[#171717] rounded text-xs font-medium transition-colors flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download QR</span>
        </button>

        <button
          type="button"
          onClick={copyUrl}
          className="h-9 px-3.5 bg-[#F7F7F5] border border-[#D9D9D9] hover:border-[#666666] text-[#666666] hover:text-[#171717] rounded text-xs font-medium transition-colors flex items-center gap-1.5"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#15803D]" />
              <span className="text-[#15803D]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy link</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
