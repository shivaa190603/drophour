import React from 'react';
import {
  X,
  Shield,
  User,
  Clock,
  Trash2,
  Lock,
  CreditCard,
  Globe,
  Mail,
} from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const developerEmail = 'shivaa190603@gmail.com';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Privacy Policy"
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
            <div className="w-8 h-8 rounded bg-[#16A34A] text-white flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#171717]">Privacy Policy</h2>
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
          {/* Ephemeral Guarantee Banner */}
          <div className="p-3.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg text-[#166534] flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">
              <strong>Zero-Knowledge &amp; Ephemeral Guarantee:</strong> DropHour requires no
              accounts, logs no personal identifiers, and irreversibly deletes free files after 1 hour (and paid files after 2 hours).
            </p>
          </div>

          <div className="space-y-4 text-xs text-[#666666] leading-relaxed">
            <section className="space-y-1.5">
              <h3 className="font-bold text-sm text-[#171717] flex items-center gap-2">
                <User className="w-4 h-4 text-[#2563EB]" />
                1. No Accounts or Registration Required
              </h3>
              <p>
                DropHour does not ask for your name, phone number, physical address, or password.
                Anyone can share files immediately. We do not maintain user identity profiles or
                track individual uploaders across sessions.
              </p>
            </section>

            <section className="space-y-1.5">
              <h3 className="font-bold text-sm text-[#171717] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#D97706]" />
                2. Strict Ephemeral Lifespan &amp; Hard Purge
              </h3>
              <p>
                Every file uploaded to DropHour is bound to an immutable time-to-live timestamp (1 hour for free files up to 50MB, 2 hours for paid transfers). Once this window completes:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-1 text-[#171717]">
                <li>The physical binary file is permanently deleted from Supabase cloud storage.</li>
                <li>The metadata record is deleted from PostgreSQL databases via automated cron routines.</li>
                <li>All share tokens, 8-character short codes, and download links cease to function immediately.</li>
                <li>Data cannot be recovered, undeleted, or restored by anyone.</li>
              </ul>
            </section>

            <section className="space-y-1.5">
              <h3 className="font-bold text-sm text-[#171717] flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-[#DC2626]" />
                3. Immediate User-Initiated Destruction
              </h3>
              <p>
                When an uploader creates a share, they receive a private cryptographic{' '}
                <code className="text-[#171717] bg-[#F7F7F5] px-1 py-0.5 rounded border border-[#D9D9D9]">delete_token</code>.
                The uploader can destroy their shared file at any time with a single click,
                triggering instant server-side erasure before the scheduled expiration completes.
              </p>
            </section>

            <section className="space-y-1.5">
              <h3 className="font-bold text-sm text-[#171717] flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#16A34A]" />
                4. End-to-End Transport Security (HTTPS &amp; RLS)
              </h3>
              <p>
                All file transfers are encrypted in transit using industry-standard TLS 1.3 / HTTPS.
                Supabase storage buckets are configured with private Row-Level Security (RLS),
                ensuring files can only be accessed through randomized time-limited signed tokens.
              </p>
            </section>

            <section className="space-y-1.5">
              <h3 className="font-bold text-sm text-[#171717] flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#2563EB]" />
                5. Payment Data Isolation (Razorpay &amp; UPI)
              </h3>
              <p>
                For files exceeding 50 MB, optional micro-payments (₹5, ₹10, ₹20) are handled
                via Razorpay. DropHour <strong>never</strong> collects,
                inspects, or stores credit card numbers, CVVs, net banking credentials, or UPI
                PINs. All transactions execute within certified PCI-DSS compliant infrastructure.
              </p>
            </section>

            <section className="space-y-1.5">
              <h3 className="font-bold text-sm text-[#171717] flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#666666]" />
                6. Zero Advertising Cookies &amp; Third-Party Trackers
              </h3>
              <p>
                DropHour operates zero advertising cookies, third-party marketing pixels, or
                behavioral analytics trackers. We use local browser storage strictly to preserve
                your active upload tokens on your current device.
              </p>
            </section>

            <section className="space-y-1.5">
              <h3 className="font-bold text-sm text-[#171717] flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#EA4335]" />
                7. Privacy Questions &amp; Contact
              </h3>
              <p>
                For privacy inquiries or concerns regarding ephemeral data handling, reach out
                directly to developer <strong>shivagopi</strong> at{' '}
                <a href={`mailto:${developerEmail}`} className="text-[#171717] font-semibold underline">
                  {developerEmail}
                </a>.
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
