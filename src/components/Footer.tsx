import React, { useState } from 'react';

interface FooterProps {
  onOpenHowItWorks?: () => void;
  onOpenDeveloper?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenHowItWorks, onOpenDeveloper }) => {
  const [modalContent, setModalContent] = useState<{ title: string; content: string } | null>(null);

  const showPrivacy = () => {
    setModalContent({
      title: 'Privacy Policy',
      content:
        'DropHour does not require registration, login, or personal details. Files uploaded to DropHour are stored in private cloud storage and are automatically and permanently purged from storage and database 1 hour after creation. We do not inspect file contents, track personal identities, or sell information to third parties.',
    });
  };

  const showTerms = () => {
    setModalContent({
      title: 'Terms of Service',
      content:
        'DropHour is a temporary file-sharing utility. Files up to 50MB are free. High-capacity files (50MB to 999MB) are supported via micro-payments (₹10, ₹30, ₹50). Files automatically expire and are physically deleted after 60 minutes. You may not upload malware or illegal material.',
    });
  };

  const showContact = () => {
    setModalContent({
      title: 'Contact & Support',
      content:
        'DropHour is developed and maintained by shivagopi (shivagopi@gmail.com). For support, bug reports, or feature suggestions, reach out via email or GitHub at github.com/shivaa1906.',
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
              Files automatically expire after 1 hour · Crafted by{' '}
              <button
                type="button"
                onClick={onOpenDeveloper}
                className="font-semibold text-[#171717] hover:underline"
              >
                shivagopi
              </button>
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs font-medium">
            {onOpenHowItWorks && (
              <>
                <button
                  onClick={onOpenHowItWorks}
                  className="text-[#171717] font-semibold hover:underline"
                >
                  How it works
                </button>
                <span className="text-[#D9D9D9]">•</span>
              </>
            )}
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
