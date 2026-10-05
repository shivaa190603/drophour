import React, { useEffect, useState } from 'react';
import { FileText, Loader2, ShieldCheck, ArrowLeft } from 'lucide-react';
import type { ShareMetadata } from '../types/file';
import { getShareByTokenOrCode } from '../lib/storage-service';
import { formatFileSize, getFileCategory } from '../lib/formatters';
import { Countdown } from '../components/Countdown';
import { DownloadButton } from '../components/DownloadButton';
import { Expired } from './Expired';
import { NotFound } from './NotFound';

interface SharePageProps {
  tokenOrCode: string;
  onGoHome: () => void;
}

export const Share: React.FC<SharePageProps> = ({ tokenOrCode, onGoHome }) => {
  const [metadata, setMetadata] = useState<ShareMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      setIsExpired(false);
      setIsNotFound(false);

      const res = await getShareByTokenOrCode(tokenOrCode);

      if (!isMounted) return;

      if (res.notFound) {
        setIsNotFound(true);
      } else if (res.expired) {
        setIsExpired(true);
      } else if (res.share) {
        setMetadata(res.share);
      }

      setLoading(false);
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [tokenOrCode]);

  if (loading) {
    return (
      <div className="w-full max-w-[600px] mx-auto py-20 px-4 text-center">
        <div className="bg-[#FFFFFF] border border-[#D9D9D9] rounded-lg p-10 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#171717]" />
          <p className="text-sm text-[#666666]">Checking share availability...</p>
        </div>
      </div>
    );
  }

  if (isExpired) {
    return <Expired onGoHome={onGoHome} />;
  }

  if (isNotFound || !metadata) {
    return <NotFound onGoHome={onGoHome} />;
  }

  const category = getFileCategory(metadata.original_filename, metadata.mime_type);

  return (
    <div className="w-full max-w-[600px] mx-auto py-8 sm:py-12 px-4">
      {/* Back button */}
      <div className="mb-4">
        <button
          onClick={onGoHome}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#666666] hover:text-[#171717] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Upload your own file</span>
        </button>
      </div>

      <div className="bg-[#FFFFFF] border border-[#D9D9D9] rounded-lg p-6 sm:p-8 space-y-6 shadow-sm">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D9D9D9] pb-5">
          <div>
            <span className="text-xs font-semibold text-[#666666] uppercase tracking-wider">
              Temporary Share
            </span>
            <h1 className="text-xl font-bold text-[#171717] mt-0.5">
              File ready to download
            </h1>
          </div>

          <Countdown
            expiresAt={metadata.expires_at}
            onExpire={() => setIsExpired(true)}
            size="md"
          />
        </div>

        {/* File Detail Card */}
        <div className="bg-[#F7F7F5] border border-[#D9D9D9] rounded-lg p-4 sm:p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded bg-[#FFFFFF] border border-[#D9D9D9] flex flex-col items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-[#666666] uppercase tracking-wider">
              {category.slice(0, 4)}
            </span>
            <FileText className="w-4 h-4 text-[#171717] -mt-0.5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#171717] truncate" title={metadata.original_filename}>
              {metadata.original_filename}
            </p>
            <div className="flex items-center gap-2 text-xs text-[#666666] mt-0.5">
              <span>{formatFileSize(metadata.file_size)}</span>
              <span>•</span>
              <span className="font-mono">{metadata.share_code}</span>
            </div>
          </div>
        </div>

        {/* Download Action */}
        <div className="space-y-3">
          <DownloadButton
            shareToken={metadata.share_token}
            filename={metadata.original_filename}
          />

          <div className="flex items-start gap-2 text-xs text-[#666666] pt-1">
            <ShieldCheck className="w-4 h-4 text-[#15803D] shrink-0 mt-0.5" />
            <span>
              This file will automatically disappear after the sharing period ends. Downloads are served directly via time-limited private tokens.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
