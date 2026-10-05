import React, { useState } from 'react';
import { FileText, Trash2, PlusCircle, AlertCircle } from 'lucide-react';
import { useUpload } from '../hooks/useUpload';
import { UploadBox } from '../components/UploadBox';
import { FilePreview } from '../components/FilePreview';
import { Countdown } from '../components/Countdown';
import { ShareLink } from '../components/ShareLink';
import { ShareCode } from '../components/ShareCode';
import { QRCode } from '../components/QRCode';
import { ShareCodeLookup } from '../components/ShareCodeLookup';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { formatFileSize, getFileCategory } from '../lib/formatters';
import { deleteShareImmediately } from '../lib/storage-service';

interface HomePageProps {
  onNavigateToShare: (tokenOrCode: string) => void;
}

export const Home: React.FC<HomePageProps> = ({ onNavigateToShare }) => {
  const {
    file,
    stage,
    progressPercent,
    errorMessage,
    result,
    handleFileSelected,
    cancelSelection,
    startUpload,
    reset,
  } = useUpload();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  const handleDeleteConfirmed = async () => {
    if (!result) return;
    const res = await deleteShareImmediately(result.delete_token, result.share_token);
    if (res.success) {
      setIsDeleteModalOpen(false);
      setIsDeleted(true);
      setTimeout(() => {
        setIsDeleted(false);
        reset();
      }, 2500);
    }
  };

  return (
    <div className="w-full max-w-[900px] mx-auto py-8 sm:py-14 px-4 space-y-10">
      {/* Hero Section */}
      <section className="text-center space-y-3 max-w-[650px] mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#171717]">
          Share files. They disappear in an hour.
        </h1>
        <p className="text-sm sm:text-base text-[#666666] leading-relaxed">
          Upload a file and get a private link, sharing code, and QR code instantly. No account required.
        </p>
      </section>

      {/* Main Interactive Stage */}
      <div className="max-w-[700px] mx-auto space-y-6">
        {/* Error notification */}
        {errorMessage && (
          <div className="bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg p-4 flex items-center gap-3 text-sm text-[#991B1B]">
            <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Deleted feedback notification */}
        {isDeleted && (
          <div className="bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg p-4 flex items-center gap-3 text-sm text-[#991B1B]">
            <Trash2 className="w-5 h-5 text-[#DC2626] shrink-0" />
            <span>File permanently deleted from storage. Returning to upload...</span>
          </div>
        )}

        {/* State 1: Upload Completed (Share Result Page) */}
        {result && !isDeleted ? (
          <div className="bg-[#FFFFFF] border border-[#D9D9D9] rounded-lg p-6 sm:p-8 space-y-7 shadow-sm">
            {/* Result Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D9D9D9] pb-6">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-[#15803D] uppercase tracking-wider">
                  Ready to share
                </span>
                <h2 className="text-xl font-bold text-[#171717]">Your file is ready.</h2>
              </div>

              <Countdown expiresAt={result.expires_at} size="md" />
            </div>

            {/* File Info Summary */}
            <div className="bg-[#F7F7F5] border border-[#D9D9D9] rounded-lg p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded bg-[#FFFFFF] border border-[#D9D9D9] flex flex-col items-center justify-center shrink-0">
                <span className="text-[9px] font-bold text-[#666666] uppercase">
                  {getFileCategory(result.original_filename).slice(0, 4)}
                </span>
                <FileText className="w-3.5 h-3.5 text-[#171717] -mt-0.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#171717] truncate" title={result.original_filename}>
                  {result.original_filename}
                </p>
                <p className="text-xs text-[#666666] mt-0.5">
                  {formatFileSize(result.file_size)}
                </p>
              </div>
            </div>

            {/* Sharing Methods */}
            <div className="space-y-5">
              <ShareLink shareToken={result.share_token} />
              <ShareCode shareCode={result.share_code} />
            </div>

            {/* QR Code Section */}
            <div>
              <QRCode shareToken={result.share_token} shareCode={result.share_code} />
            </div>

            {/* Management & Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#D9D9D9]">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="w-full sm:w-auto h-9 px-3.5 rounded text-xs font-medium text-[#DC2626] border border-[#DC2626]/30 hover:bg-[#FEE2E2] transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete now</span>
              </button>

              <button
                type="button"
                onClick={reset}
                className="w-full sm:w-auto h-9 px-4 rounded text-xs font-medium bg-[#171717] hover:bg-black text-[#FFFFFF] transition-colors flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Share another file</span>
              </button>
            </div>

            {/* Delete Modal */}
            <DeleteConfirmModal
              isOpen={isDeleteModalOpen}
              filename={result.original_filename}
              onConfirm={handleDeleteConfirmed}
              onCancel={() => setIsDeleteModalOpen(false)}
            />
          </div>
        ) : file ? (
          /* State 2: File Selected / In Progress */
          <FilePreview
            file={file}
            stage={stage}
            progressPercent={progressPercent}
            onRemove={cancelSelection}
            onUpload={startUpload}
          />
        ) : (
          /* State 3: Idle Upload Box */
          <UploadBox onFileSelected={handleFileSelected} />
        )}

        {/* Share Code Search Box */}
        {!result && (
          <div className="pt-2">
            <ShareCodeLookup onLookup={onNavigateToShare} />
          </div>
        )}
      </div>
    </div>
  );
};
