import React, { useState } from 'react';

export const Footer: React.FC = () => {
  const [modalContent, setModalContent] = useState<{ title: string; content: string } | null>(null);

  const showPrivacy = () => {
    setModalContent({
      title: 'Privacy Policy',
      content:
        'DropHour does not require registration, login, or personal details. Files uploaded to DropHour are stored in private cloud storage and are automatically and permanently purged 1 hour after creation. We do not inspect file contents, track personal identities, or sell information to third parties.',
    });
  };

  const showTerms = () => {
    setModalContent({
      title: 'Terms of Service',
      content:
        'DropHour is a free temporary file-sharing utility. Files automatically expire and are deleted permanently after 60 minutes. You may not upload malware, illegal material, or copyrighted works you do not have permission to distribute. Files are provided "as-is" without warranty.',
    });
  };

  const showContact = () => {
    setModalContent({
      title: 'Contact & Support',
      content:
        'DropHour is an open developer utility. For issues, questions, or abuse reports regarding temporary links, please reach out via GitHub or our administrative support contact.',
    });
  };

  return (
    <>
      <footer className="w-full border-t border-[#D9D9D9] bg-[#FFFFFF] py-8 mt-auto text-sm text-[#666666]">
        <div className="max-w-[900px] mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <p className="font-medium text-[#171717]">
              DropHour <span className="text-[#666666] font-normal">— Temporary file sharing without an account.</span>
            </p>
            <p className="text-xs text-[#666666]">
              Files automatically expire after 1 hour. No account. No subscriptions. No clutter.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <button
              onClick={showPrivacy}
              className="text-[#666666] hover:text-[#171717] hover:underline"
            >
              Privacy
            </button>
            <span className="text-[#D9D9D9]">•</span>
            <button
              onClick={showTerms}
              className="text-[#666666] hover:text-[#171717] hover:underline"
            >
              Terms
            </button>
            <span className="text-[#D9D9D9]">•</span>
            <button
              onClick={showContact}
              className="text-[#666666] hover:text-[#171717] hover:underline"
            >
              Contact
            </button>
          </div>
        </div>
      </footer>

      {/* Info Modal */}
      {modalContent && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setModalContent(null)}
        >
          <div
            className="w-full max-w-md bg-[#FFFFFF] border border-[#D9D9D9] rounded-lg p-6 shadow-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#D9D9D9] pb-3 mb-4">
              <h3 className="font-semibold text-base text-[#171717]">{modalContent.title}</h3>
              <button
                onClick={() => setModalContent(null)}
                className="text-[#666666] hover:text-[#171717] text-sm px-1.5 py-0.5 rounded"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-[#666666] leading-relaxed mb-6">{modalContent.content}</p>
            <div className="flex justify-end">
              <button
                onClick={() => setModalContent(null)}
                className="px-4 py-2 bg-[#171717] text-[#FFFFFF] text-sm font-medium rounded hover:bg-black transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
