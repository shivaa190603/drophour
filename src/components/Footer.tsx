import React, { useState } from 'react';
import { ContactModal } from './ContactModal';
import { PrivacyModal } from './PrivacyModal';
import { TermsModal } from './TermsModal';

interface FooterProps {
  onOpenHowItWorks?: () => void;
  onOpenDeveloper?: () => void;
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
  onOpenContact?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenHowItWorks,
  onOpenDeveloper,
  onOpenPrivacy,
  onOpenTerms,
  onOpenContact,
}) => {
  // Local fallback if callbacks are not provided
  const [internalContactOpen, setInternalContactOpen] = useState(false);
  const [internalPrivacyOpen, setInternalPrivacyOpen] = useState(false);
  const [internalTermsOpen, setInternalTermsOpen] = useState(false);

  const handlePrivacyClick = () => {
    if (onOpenPrivacy) {
      onOpenPrivacy();
    } else {
      setInternalPrivacyOpen(true);
    }
  };

  const handleTermsClick = () => {
    if (onOpenTerms) {
      onOpenTerms();
    } else {
      setInternalTermsOpen(true);
    }
  };

  const handleContactClick = () => {
    if (onOpenContact) {
      onOpenContact();
    } else {
      setInternalContactOpen(true);
    }
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
                  type="button"
                  onClick={onOpenHowItWorks}
                  className="text-[#171717] font-semibold hover:underline"
                >
                  How it works
                </button>
                <span className="text-[#D9D9D9]">•</span>
              </>
            )}
            <button
              type="button"
              onClick={handlePrivacyClick}
              className="text-[#666666] hover:text-[#171717] hover:underline transition-colors"
            >
              Privacy Policy
            </button>
            <span className="text-[#D9D9D9]">•</span>
            <button
              type="button"
              onClick={handleTermsClick}
              className="text-[#666666] hover:text-[#171717] hover:underline transition-colors"
            >
              Terms of Service
            </button>
            <span className="text-[#D9D9D9]">•</span>
            <button
              type="button"
              onClick={handleContactClick}
              className="text-[#171717] font-semibold hover:underline transition-colors flex items-center gap-1"
            >
              Contact
            </button>
          </div>
        </div>
      </footer>

      {/* Internal Modals fallback */}
      <ContactModal
        isOpen={internalContactOpen}
        onClose={() => setInternalContactOpen(false)}
      />
      <PrivacyModal
        isOpen={internalPrivacyOpen}
        onClose={() => setInternalPrivacyOpen(false)}
      />
      <TermsModal
        isOpen={internalTermsOpen}
        onClose={() => setInternalTermsOpen(false)}
      />
    </>
  );
};
