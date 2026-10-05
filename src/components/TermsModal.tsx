import React from 'react';
import {
  X,
  FileText,
  Clock,
  AlertCircle,
  CreditCard,
  Shield,
  HelpCircle,
  Globe,
} from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const developerEmail = 'shivaa190603@gmail.com';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Terms of Service"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#FFFFFF] border border-[#D9D9D9] rounded-lg shadow-xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#D9D9D9] px-5 py-4 bg-[#FFFFFF]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#2563EB] text-white flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#171717]">Terms of Service</h2>
              <p className="text-xs text-[#666666]">
                DropHour Ephemeral File Sharing · Managed by{' '}
                <span className="font-semibold text-[#171717]">shivagopi</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-[#666666] hover:text-[#171717] p-1.5 rounded hover:bg-[#F7F7F5] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-sm text-[#171717]">
          {/* Agreement Notice Banner */}
          <div className="p-3.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg text-[#1E40AF] flex items-start gap-2.5">
            <FileText className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">
              <strong>Service Agreement:</strong> By accessing DropHour, you acknowledge that this is an
              ephemeral file transfer tool with automatic hard deletion after 1 hour (free) or 2 hours (paid).
            </p>
          </div>

          <div className="space-y-4 text-xs text-[#666666] leading-relaxed">
            <section className="space-y-1.5">
              <h3 className="font-bold text-sm text-[#171717] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#D97706]" />
                1. Ephemeral Nature &amp; Non-Archival Service
              </h3>
              <p>
                DropHour is strictly a transient file transfer utility. It is not an archival
                backup, permanent cloud drive, or document vault. You must retain original copies
                of any files you share. After the expiration window completes, files are deleted permanently
                and cannot be retrieved.
              </p>
            </section>

            <section className="space-y-1.5">
              <h3 className="font-bold text-sm text-[#171717] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#DC2626]" />
                2. Acceptable Use Policy &amp; Prohibitions
              </h3>
              <p>
                You agree NOT to use DropHour for any unlawful purpose. You must not upload or distribute:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-1 text-[#171717]">
                <li>Malicious software, viruses, trojans, ransomware, or keyloggers.</li>
                <li>Files that infringe upon copyrights, patents, trademarks, or trade secrets.</li>
                <li>Content that violates privacy rights or applicable local/international law.</li>
                <li>Automated scrapers, flood scripts, or denial-of-service payloads.</li>
              </ul>
            </section>

            <section className="space-y-1.5">
              <h3 className="font-bold text-sm text-[#171717] flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#2563EB]" />
                3. File Size Tiers &amp; Micro-Payments
              </h3>
              <p>
                DropHour implements transparent capacity tiers to balance cloud infrastructure costs:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-2 text-center">
                <div className="p-2 border border-[#D9D9D9] rounded bg-[#F7F7F5]">
                  <div className="font-bold text-[#171717]">Below 50 MB</div>
                  <div className="text-[11px] text-[#16A34A] font-semibold">100% Free · 1 Hr</div>
                </div>
                <div className="p-2 border border-[#D9D9D9] rounded bg-[#F7F7F5]">
                  <div className="font-bold text-[#171717]">50 - 100 MB</div>
                  <div className="text-[11px] text-[#171717] font-semibold">₹10 · 2 Hr</div>
                </div>
                <div className="p-2 border border-[#D9D9D9] rounded bg-[#F7F7F5]">
                  <div className="font-bold text-[#171717]">100 - 200 MB</div>
                  <div className="text-[11px] text-[#171717] font-semibold">₹30 · 2 Hr</div>
                </div>
                <div className="p-2 border border-[#D9D9D9] rounded bg-[#F7F7F5]">
                  <div className="font-bold text-[#171717]">200 - 999 MB</div>
                  <div className="text-[11px] text-[#171717] font-semibold">₹50 · 2 Hr</div>
                </div>
              </div>
              <p className="text-[11px]">
                Micro-payments cover real-time compute, dedicated multi-node cloud storage allocation, and
                transfer bandwidth. Once file transfer begins, micro-payments are non-refundable.
              </p>
            </section>

            <section className="space-y-1.5">
              <h3 className="font-bold text-sm text-[#171717] flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#16A34A]" />
                4. Intellectual Property &amp; DMCA Takedown
              </h3>
              <p>
                Uploaders retain full ownership and responsibility for the content they upload.
                DropHour responds immediately to legitimate copyright claims. If your copyright
                is violated, notify{' '}
                <a href={`mailto:${developerEmail}`} className="text-[#171717] font-semibold underline">
                  {developerEmail}
                </a>{' '}
                with the link or share code for instant destruction.
              </p>
            </section>

            <section className="space-y-1.5">
              <h3 className="font-bold text-sm text-[#171717] flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#666666]" />
                5. Disclaimer of Warranties &amp; Liability
              </h3>
              <p>
                DropHour is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis
                without warranties of any kind. DropHour and its developer (shivagopi) are not
                liable for any lost data, service interruptions, or damages arising from the use
                of the service.
              </p>
            </section>

            <section className="space-y-1.5">
              <h3 className="font-bold text-sm text-[#171717] flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#171717]" />
                6. Governing Law
              </h3>
              <p>
                These Terms of Service are governed by the laws of India. Any legal dispute
                arising from the use of this website shall be settled under applicable Indian
                jurisdiction.
              </p>
            </section>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-[#D9D9D9] px-5 py-3.5 bg-[#F7F7F5] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-[#666666] flex items-center gap-1.5">
            <span className="font-semibold text-[#171717]">DropHour</span> · Developer: shivagopi (
            <a href={`mailto:${developerEmail}`} className="underline hover:text-[#171717]">
              {developerEmail}
            </a>
            )
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#171717] hover:bg-black text-[#FFFFFF] text-xs font-semibold rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
