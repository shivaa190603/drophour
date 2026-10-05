import React, { useState } from 'react';
import { Copy, Check, Hash } from 'lucide-react';

interface ShareCodeProps {
  shareCode: string;
}

export const ShareCode: React.FC<ShareCodeProps> = ({ shareCode }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = shareCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-[#666666] uppercase tracking-wider flex items-center gap-1.5">
        <Hash className="w-3.5 h-3.5" />
        <span>Share Code</span>
      </label>

      <div className="flex items-center gap-2">
        <div className="flex-1 bg-[#FFFFFF] border border-[#D9D9D9] rounded px-3.5 py-2.5 font-mono text-base font-bold tracking-widest text-[#171717] select-all">
          {shareCode}
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className={`h-10 px-4 rounded text-sm font-medium transition-colors flex items-center gap-1.5 shrink-0 ${
            copied
              ? 'bg-[#15803D] text-[#FFFFFF]'
              : 'bg-[#FFFFFF] border border-[#D9D9D9] hover:border-[#171717] text-[#171717]'
          }`}
          aria-label="Copy share code to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-white" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      <p className="text-[11px] text-[#666666]">
        Recipients can type this code directly into DropHour to retrieve your file.
      </p>
    </div>
  );
};
