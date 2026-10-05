import React from 'react';
import { UploadCloud, Link as LinkIcon, Clock, Trash2, X } from 'lucide-react';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#FFFFFF] border border-[#D9D9D9] rounded-lg p-6 shadow-sm max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#D9D9D9] pb-4 mb-5">
          <h2 id="modal-title" className="text-lg font-semibold text-[#171717]">
            How DropHour Works
          </h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-[#666666] hover:text-[#171717] p-1 rounded hover:bg-[#F7F7F5] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6 text-sm text-[#171717]">
          {/* Step 1 */}
          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded bg-[#F7F7F5] border border-[#D9D9D9] flex items-center justify-center shrink-0 text-[#2563EB]">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-[#171717] mb-1">1. Upload your file</h3>
              <p className="text-[#666666] leading-relaxed">
                Choose or drag any file up to 50MB. Files are sent straight to a private storage bucket without requiring registration, email, or passwords.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded bg-[#F7F7F5] border border-[#D9D9D9] flex items-center justify-center shrink-0 text-[#2563EB]">
              <LinkIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-[#171717] mb-1">2. Get link, share code &amp; QR</h3>
              <p className="text-[#666666] leading-relaxed">
                You immediately receive a unique share link, an 8-character human-friendly code (e.g. AB82-KX91), and a scannable QR code to send to recipients.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded bg-[#F7F7F5] border border-[#D9D9D9] flex items-center justify-center shrink-0 text-[#D97706]">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-[#171717] mb-1">3. Strict 1-hour lifetime</h3>
              <p className="text-[#666666] leading-relaxed">
                The server sets an immutable expiration exactly 60 minutes from upload. Downloads are served via temporary, short-lived signed URLs.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded bg-[#F7F7F5] border border-[#D9D9D9] flex items-center justify-center shrink-0 text-[#DC2626]">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-[#171717] mb-1">4. Permanent automated deletion</h3>
              <p className="text-[#666666] leading-relaxed">
                When the countdown reaches zero, downloads are blocked immediately, and automated cleanup routines delete the physical file from storage.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-[#D9D9D9] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#171717] hover:bg-black text-[#FFFFFF] text-sm font-medium rounded transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
