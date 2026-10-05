import React from 'react';
import { FileText, X, Loader2, ArrowRight } from 'lucide-react';
import type { UploadStage } from '../types/file';
import { formatFileSize, getFileCategory } from '../lib/formatters';

interface FilePreviewProps {
  file: File;
  stage: UploadStage;
  progressPercent: number;
  onRemove: () => void;
  onUpload: () => void;
}

export const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  stage,
  progressPercent,
  onRemove,
  onUpload,
}) => {
  const isBusy = stage === 'uploading' || stage === 'securing';
  const category = getFileCategory(file.name, file.type);

  const getButtonText = () => {
    switch (stage) {
      case 'uploading':
        return `Uploading... ${progressPercent}%`;
      case 'securing':
        return 'Creating secure link...';
      case 'completed':
        return 'Ready to share';
      default:
        return 'Upload & Create Link';
    }
  };

  return (
    <div className="w-full bg-[#FFFFFF] border border-[#D9D9D9] rounded-lg p-5 sm:p-6 space-y-5">
      {/* File Info Row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Badge */}
          <div className="w-11 h-11 rounded bg-[#F7F7F5] border border-[#D9D9D9] flex flex-col items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-[#666666] uppercase tracking-wider">
              {category.slice(0, 4)}
            </span>
            <FileText className="w-4 h-4 text-[#171717] -mt-0.5" />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#171717] truncate max-w-[280px] sm:max-w-[420px]" title={file.name}>
              {file.name}
            </p>
            <p className="text-xs text-[#666666] mt-0.5">
              {formatFileSize(file.size)}
            </p>
          </div>
        </div>

        {/* Remove Button */}
        {!isBusy && (
          <button
            type="button"
            onClick={onRemove}
            className="flex items-center gap-1 text-xs font-medium text-[#666666] hover:text-[#DC2626] border border-[#D9D9D9] hover:border-[#DC2626] rounded px-2.5 py-1 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>Remove</span>
          </button>
        )}
      </div>

      {/* Progress Bar (Visible during upload or securing) */}
      {isBusy && (
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs text-[#666666]">
            <span>{stage === 'securing' ? 'Registering 1-hour expiration...' : 'Uploading file bytes...'}</span>
            <span className="font-mono font-medium text-[#171717]">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 bg-[#F7F7F5] border border-[#D9D9D9] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#2563EB] transition-all duration-200"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Action Button */}
      <div>
        <button
          type="button"
          onClick={onUpload}
          disabled={isBusy}
          className="w-full h-11 bg-[#171717] hover:bg-black text-[#FFFFFF] font-medium text-sm rounded transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isBusy && <Loader2 className="w-4 h-4 animate-spin text-white" />}
          <span>{getButtonText()}</span>
          {!isBusy && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
