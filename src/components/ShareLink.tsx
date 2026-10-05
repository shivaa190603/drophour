import React, { useState } from 'react';
import { Copy, Check, Link as LinkIcon } from 'lucide-react';
import { getShareUrl } from '../lib/formatters';

interface ShareLinkProps {
  shareToken: string;
}

export const ShareLink: React.FC<ShareLinkProps> = ({ shareToken }) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = getShareUrl(shareToken);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // fallback
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
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
        <LinkIcon className="w-3.5 h-3.5" />
        <span>Share Link</span>
      </label>

      <div className="flex items-center gap-2">
        <div className="flex-1 bg-[#FFFFFF] border border-[#D9D9D9] rounded px-3.5 py-2.5 text-sm font-mono text-[#171717] select-all overflow-x-auto whitespace-nowrap">
          {shareUrl}
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className={`h-10 px-4 rounded text-sm font-medium transition-colors flex items-center gap-1.5 shrink-0 ${
            copied
              ? 'bg-[#15803D] text-[#FFFFFF]'
              : 'bg-[#171717] hover:bg-black text-[#FFFFFF]'
          }`}
          aria-label="Copy share link to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-white" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-white" />
              <span>Copy link</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
