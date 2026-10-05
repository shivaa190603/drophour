import React, { useState } from 'react';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  filename: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  filename,
  onConfirm,
  onCancel,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      setIsDeleting(true);
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      onClick={isDeleting ? undefined : onCancel}
    >
      <div
        className="w-full max-w-sm bg-[#FFFFFF] border border-[#D9D9D9] rounded-lg p-6 shadow-sm space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-[#FEE2E2] text-[#DC2626] border border-[#DC2626]/20 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 id="delete-dialog-title" className="font-semibold text-base text-[#171717]">
              Delete this file?
            </h3>
            <p className="text-xs text-[#666666] truncate max-w-[220px]" title={filename}>
              {filename}
            </p>
          </div>
        </div>

        <div className="bg-[#FEF2F2] border border-[#FCA5A5]/40 rounded p-3 text-xs text-[#991B1B] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-[#DC2626] mt-0.5" />
          <span>
            Are you sure? This file will be immediately and permanently removed from storage. The link and QR code will cease to function.
          </span>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#D9D9D9]">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 border border-[#D9D9D9] hover:border-[#666666] text-[#171717] rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded text-sm font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {isDeleting && <Loader2 className="w-4 h-4 animate-spin text-white" />}
            <span>{isDeleting ? 'Deleting...' : 'Delete now'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
