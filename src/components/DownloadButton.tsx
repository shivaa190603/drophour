import React, { useState } from 'react';
import { Download, Loader2, CheckCircle2 } from 'lucide-react';
import { downloadFile } from '../lib/storage-service';

interface DownloadButtonProps {
  shareToken: string;
  filename: string;
  disabled?: boolean;
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({
  shareToken,
  filename,
  disabled = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    if (disabled || loading) return;

    try {
      setLoading(true);
      setError(null);

      const result = await downloadFile(shareToken);

      // Trigger browser download
      const anchor = document.createElement('a');
      anchor.href = result.url;
      anchor.download = result.filename || filename;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      if (result.isDirectBlob) {
        // Clean up object URL after a delay
        setTimeout(() => URL.revokeObjectURL(result.url), 30000);
      }

      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Download failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2 w-full">
      <button
        type="button"
        onClick={handleDownload}
        disabled={disabled || loading}
        className={`w-full h-12 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${
          disabled
            ? 'bg-[#E5E5E5] text-[#999999] cursor-not-allowed'
            : downloaded
            ? 'bg-[#15803D] text-[#FFFFFF]'
            : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-[#FFFFFF]'
        }`}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin text-white" />
            <span>Preparing download...</span>
          </>
        ) : downloaded ? (
          <>
            <CheckCircle2 className="w-5 h-5 text-white" />
            <span>Downloaded!</span>
          </>
        ) : (
          <>
            <Download className="w-5 h-5 text-white" />
            <span>Download file</span>
          </>
        )}
      </button>

      {error && (
        <p className="text-xs text-center text-[#DC2626] font-medium">{error}</p>
      )}
    </div>
  );
};
