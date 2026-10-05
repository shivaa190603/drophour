import React, { useState } from 'react';
import {
  X,
  Mail,
  User,
  Copy,
  Check,
  ExternalLink,
  Shield,
  FileText,
  Clock,
  Lock,
  AlertCircle,
  HelpCircle,
  CreditCard,
  Globe,
  Trash2,
} from 'lucide-react';

export type LegalTab = 'privacy' | 'terms' | 'contact';

interface LegalContactModalProps {
  isOpen: boolean;
  initialTab?: LegalTab;
  onClose: () => void;
}

export const LegalContactModal: React.FC<LegalContactModalProps> = ({
  isOpen,
  initialTab = 'contact',
  onClose,
}) => {
  const [selectedTab, setSelectedTab] = useState<LegalTab | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  if (!isOpen) return null;

  const activeTab = selectedTab ?? initialTab;

  const handleClose = () => {
    setSelectedTab(null);
    onClose();
  };

  const developerEmail = 'shivaa190603@gmail.com';
  const githubProfile = 'https://github.com/shivaa1906';

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(developerEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-2xl bg-[#FFFFFF] border border-[#D9D9D9] rounded-lg shadow-lg flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-[#D9D9D9] px-5 py-4 bg-[#FFFFFF]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#171717] text-white flex items-center justify-center">
              {activeTab === 'privacy' && <Shield className="w-4 h-4 text-white" />}
              {activeTab === 'terms' && <FileText className="w-4 h-4 text-white" />}
              {activeTab === 'contact' && <Mail className="w-4 h-4 text-white" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-[#171717]">
                {activeTab === 'privacy' && 'Privacy Policy'}
                {activeTab === 'terms' && 'Terms of Service'}
                {activeTab === 'contact' && 'Contact & Support'}
              </h2>
              <p className="text-xs text-[#666666]">
                DropHour Ephemeral File Sharing · Managed by{' '}
                <span className="font-semibold text-[#171717]">shivagopi</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            aria-label="Close modal"
            className="text-[#666666] hover:text-[#171717] p-1.5 rounded hover:bg-[#F7F7F5] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#D9D9D9] bg-[#F7F7F5] px-4 pt-2 gap-2 text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setSelectedTab('contact')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'contact'
                ? 'border-[#171717] text-[#171717] bg-[#FFFFFF] rounded-t'
                : 'border-transparent text-[#666666] hover:text-[#171717]'
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-[#EA4335]" />
            <span>Contact</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTab('privacy')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'privacy'
                ? 'border-[#171717] text-[#171717] bg-[#FFFFFF] rounded-t'
                : 'border-transparent text-[#666666] hover:text-[#171717]'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-[#16A34A]" />
            <span>Privacy Policy</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTab('terms')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'terms'
                ? 'border-[#171717] text-[#171717] bg-[#FFFFFF] rounded-t'
                : 'border-transparent text-[#666666] hover:text-[#171717]'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Terms of Service</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-sm text-[#171717]">
          {/* ========================================================= */}
          {/* CONTACT TAB */}
          {/* ========================================================= */}
          {activeTab === 'contact' && (
            <div className="space-y-5">
              {/* Introduction Banner */}
              <div className="bg-[#F7F7F5] border border-[#D9D9D9] rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#171717] text-white flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#171717]">
                      Developer &amp; Platform Support
                    </h3>
                    <p className="text-xs text-[#666666] mt-0.5 leading-relaxed">
                      DropHour is designed and maintained by <strong>shivagopi</strong>. For support,
                      inquiries, or feedback, feel free to reach out via email or GitHub.
                    </p>
                  </div>
                </div>
              </div>

              {/* Clean Contact Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Official Email */}
                <div className="p-4 bg-[#FFFFFF] border border-[#D9D9D9] rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#666666] uppercase flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#EA4335]" />
                      Official Email
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyEmail}
                      className="text-xs text-[#666666] hover:text-[#171717] flex items-center gap-1 px-1.5 py-0.5 rounded border border-[#D9D9D9] hover:bg-[#F7F7F5] transition-colors"
                      title="Copy email address"
                    >
                      {copiedEmail ? (
                        <>
                          <Check className="w-3 h-3 text-[#16A34A]" />
                          <span className="text-[#16A34A] text-[11px] font-medium">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span className="text-[11px]">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <a
                    href={`mailto:${developerEmail}`}
                    className="font-bold text-sm text-[#171717] hover:underline block truncate"
                  >
                    {developerEmail}
                  </a>
                  <p className="text-[11px] text-[#666666]">
                    Direct contact for all questions, feedback, and support.
                  </p>
                </div>

                {/* GitHub Profile */}
                <a
                  href={githubProfile}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 bg-[#FFFFFF] border border-[#D9D9D9] rounded-lg space-y-2 hover:border-[#171717] transition-colors block"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#666666] uppercase flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-[#171717]" viewBox="0 0 24 24" fill="currentColor">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                      </svg>
                      Developer GitHub
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#666666]" />
                  </div>
                  <div className="font-bold text-sm text-[#171717]">github.com/shivaa1906</div>
                  <p className="text-[11px] text-[#666666]">
                    View open source projects, profile &amp; activity.
                  </p>
                </a>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PRIVACY POLICY TAB */}
          {/* ========================================================= */}
          {activeTab === 'privacy' && (
            <div className="space-y-6 text-xs text-[#666666] leading-relaxed">
              <div className="p-3.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg text-[#166534] flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                <p className="text-xs">
                  <strong>Zero-Knowledge &amp; Ephemeral Guarantee:</strong> DropHour requires no
                  accounts, logs no personal identifiers, and irreversibly deletes files 1 hour
                  after upload.
                </p>
              </div>

              <div className="space-y-4 text-[#171717]">
                <section className="space-y-1.5">
                  <h3 className="font-bold text-sm text-[#171717] flex items-center gap-2">
                    <User className="w-4 h-4 text-[#2563EB]" />
                    1. No Accounts or Registration Required
                  </h3>
                  <p className="text-[#666666]">
                    DropHour does not ask for your name, phone number, physical address, or password.
                    Anyone can share files immediately. We do not maintain user identity profiles or
                    track individual uploaders across sessions.
                  </p>
                </section>

                <section className="space-y-1.5">
                  <h3 className="font-bold text-sm text-[#171717] flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#D97706]" />
                    2. Strict 1-Hour Ephemeral Lifespan (Hard Purge)
                  </h3>
                  <p className="text-[#666666]">
                    Every file uploaded to DropHour is bound to an immutable 60-minute expiration
                    timestamp. Once this 60-minute window completes:
                  </p>
                  <ul className="list-disc list-inside space-y-1 pl-1 text-[#666666]">
                    <li>The binary file is permanently deleted from Supabase cloud storage.</li>
                    <li>The metadata record is deleted from PostgreSQL databases via automated cron routines.</li>
                    <li>All share tokens, 6-character short codes, and download links cease to function immediately.</li>
                    <li>Data cannot be recovered, undeleted, or restored by anyone.</li>
                  </ul>
                </section>

                <section className="space-y-1.5">
                  <h3 className="font-bold text-sm text-[#171717] flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-[#DC2626]" />
                    3. Immediate User-Initiated Destruction
                  </h3>
                  <p className="text-[#666666]">
                    When an uploader creates a share, they receive a private cryptographic{' '}
                    <code className="text-[#171717] bg-[#F7F7F5] px-1 py-0.5 rounded border border-[#D9D9D9]">delete_token</code>.
                    The uploader can destroy their shared file at any time with a single click,
                    triggering instant server-side erasure before the 1-hour expiration completes.
                  </p>
                </section>

                <section className="space-y-1.5">
                  <h3 className="font-bold text-sm text-[#171717] flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[#16A34A]" />
                    4. End-to-End Transport Security (HTTPS &amp; RLS)
                  </h3>
                  <p className="text-[#666666]">
                    All file transfers are encrypted in transit using industry-standard TLS 1.3 /
                    HTTPS. Supabase storage buckets are configured with private Row-Level Security
                    (RLS), ensuring files can only be accessed through random 64-character tokens.
                  </p>
                </section>

                <section className="space-y-1.5">
                  <h3 className="font-bold text-sm text-[#171717] flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#2563EB]" />
                    5. Payment Data Isolation (Razorpay &amp; UPI)
                  </h3>
                  <p className="text-[#666666]">
                    For files exceeding 50 MB, optional micro-payments (₹10, ₹30, ₹50) are handled
                    via Razorpay or direct bank UPI. DropHour <strong>never</strong> collects,
                    inspects, or stores credit card numbers, CVVs, net banking credentials, or UPI
                    PINs. All transactions execute within certified PCI-DSS compliant infrastructure.
                  </p>
                </section>

                <section className="space-y-1.5">
                  <h3 className="font-bold text-sm text-[#171717] flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#666666]" />
                    6. Cookies &amp; Third-Party Trackers
                  </h3>
                  <p className="text-[#666666]">
                    DropHour operates zero advertising cookies, third-party marketing pixels, or
                    behavioral analytics trackers. We use local browser storage strictly to preserve
                    your active upload tokens on your current device.
                  </p>
                </section>

                <section className="space-y-1.5">
                  <h3 className="font-bold text-sm text-[#171717] flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#EA4335]" />
                    7. Privacy Questions &amp; Data Officer
                  </h3>
                  <p className="text-[#666666]">
                    For privacy inquiries or concerns regarding ephemeral data handling, reach out
                    directly to developer <strong>shivagopi</strong> at{' '}
                    <a href={`mailto:${developerEmail}`} className="text-[#171717] font-semibold underline">
                      {developerEmail}
                    </a>.
                  </p>
                </section>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TERMS OF SERVICE TAB */}
          {/* ========================================================= */}
          {activeTab === 'terms' && (
            <div className="space-y-6 text-xs text-[#666666] leading-relaxed">
              <div className="p-3.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg text-[#1E40AF] flex items-start gap-2.5">
                <FileText className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
                <p className="text-xs">
                  <strong>Service Agreement:</strong> By accessing DropHour, you acknowledge that
                  this is an ephemeral file transfer tool with an automatic 60-minute hard deletion
                  policy.
                </p>
              </div>

              <div className="space-y-4 text-[#171717]">
                <section className="space-y-1.5">
                  <h3 className="font-bold text-sm text-[#171717] flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#D97706]" />
                    1. Ephemeral Nature &amp; Non-Archival Service
                  </h3>
                  <p className="text-[#666666]">
                    DropHour is strictly a transient file transfer utility. It is not an archival
                    backup, permanent cloud drive, or document vault. You must retain original copies
                    of any files you share. After exactly 60 minutes, files are deleted permanently
                    and cannot be retrieved.
                  </p>
                </section>

                <section className="space-y-1.5">
                  <h3 className="font-bold text-sm text-[#171717] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-[#DC2626]" />
                    2. Acceptable Use Policy &amp; Prohibitions
                  </h3>
                  <p className="text-[#666666]">
                    You agree NOT to use DropHour for any unlawful purpose. You must not upload or
                    distribute:
                  </p>
                  <ul className="list-disc list-inside space-y-1 pl-1 text-[#666666]">
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
                  <p className="text-[#666666]">
                    DropHour implements transparent capacity tiers to balance cloud infrastructure
                    costs:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-2 text-center">
                    <div className="p-2 border border-[#D9D9D9] rounded bg-[#F7F7F5]">
                      <div className="font-bold text-[#171717]">Below 50 MB</div>
                      <div className="text-[11px] text-[#16A34A] font-semibold">100% Free</div>
                    </div>
                    <div className="p-2 border border-[#D9D9D9] rounded bg-[#F7F7F5]">
                      <div className="font-bold text-[#171717]">50 - 100 MB</div>
                      <div className="text-[11px] text-[#171717] font-semibold">₹10 (INR)</div>
                    </div>
                    <div className="p-2 border border-[#D9D9D9] rounded bg-[#F7F7F5]">
                      <div className="font-bold text-[#171717]">100 - 200 MB</div>
                      <div className="text-[11px] text-[#171717] font-semibold">₹30 (INR)</div>
                    </div>
                    <div className="p-2 border border-[#D9D9D9] rounded bg-[#F7F7F5]">
                      <div className="font-bold text-[#171717]">200 - 999 MB</div>
                      <div className="text-[11px] text-[#171717] font-semibold">₹50 (INR)</div>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#666666]">
                    Micro-payments cover real-time compute, multi-node cloud storage allocation, and
                    transfer bandwidth. Once file transfer begins, micro-payments are non-refundable.
                  </p>
                </section>

                <section className="space-y-1.5">
                  <h3 className="font-bold text-sm text-[#171717] flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#16A34A]" />
                    4. Intellectual Property &amp; DMCA Takedown
                  </h3>
                  <p className="text-[#666666]">
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
                  <p className="text-[#666666]">
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
                  <p className="text-[#666666]">
                    These Terms of Service are governed by the laws of India. Any legal dispute
                    arising from the use of this website shall be settled under applicable Indian
                    jurisdiction.
                  </p>
                </section>
              </div>
            </div>
          )}
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
            onClick={handleClose}
            className="px-4 py-2 bg-[#171717] hover:bg-black text-[#FFFFFF] text-xs font-semibold rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
