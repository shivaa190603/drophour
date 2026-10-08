import React, { useState } from 'react';
import {
  User,
  Mail,
  Check,
  Copy,
  X,
  ExternalLink,
} from 'lucide-react';

interface DeveloperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenContact?: () => void;
}

export const DeveloperModal: React.FC<DeveloperModalProps> = ({
  isOpen,
  onClose,
  onOpenContact,
}) => {
  const [copied, setCopied] = useState(false);
  const email = 'shivaa190603@gmail.com';
  const instagramUrl = 'https://instagram.com/shivagopichowdary03';
  const instagramHandle = 'shivagopichowdary03';

  if (!isOpen) return null;

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#FFFFFF] border border-[#D9D9D9] rounded-lg p-6 shadow-md space-y-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#D9D9D9] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#171717] text-white flex items-center justify-center font-bold text-sm">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#171717]">shivagopi</h2>
              <p className="text-xs text-[#666666]">Creator &amp; Full-Stack Developer</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[#666666] hover:text-[#171717] p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contact Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Gmail Card */}
          <div className="p-3 bg-[#F7F7F5] border border-[#D9D9D9] rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Mail className="w-4 h-4 text-[#EA4335] shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-[#666666] uppercase font-semibold block">
                  Gmail Contact
                </span>
                <a
                  href={`mailto:${email}`}
                  className="text-xs font-medium text-[#171717] hover:underline truncate block"
                  title={email}
                >
                  {email}
                </a>
              </div>
            </div>
            <button
              onClick={handleCopyEmail}
              className="p-1.5 text-[#666666] hover:text-[#171717] rounded hover:bg-[#FFFFFF] transition-colors"
              title="Copy Gmail address"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Instagram Profile Card */}
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 bg-[#F7F7F5] border border-[#D9D9D9] rounded-lg flex items-center justify-between hover:border-[#E1306C] transition-colors group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <svg className="w-4 h-4 text-[#E1306C] shrink-0 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
              <div className="min-w-0">
                <span className="text-[10px] text-[#666666] uppercase font-semibold block">
                  Instagram Profile
                </span>
                <span className="text-xs font-medium text-[#171717] group-hover:text-[#E1306C] truncate block">
                  @{instagramHandle}
                </span>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-[#666666] group-hover:text-[#E1306C]" />
          </a>
        </div>

        {/* About the Project */}
        <div className="space-y-2 text-xs text-[#666666] leading-relaxed">
          <h3 className="font-semibold text-[#171717] text-xs uppercase tracking-wider">
            About DropHour Architecture
          </h3>
          <p>
            DropHour was architected by <strong>shivagopi</strong> as a fast, anonymous, zero-clutter file sharing service with privacy-first temporary hosting:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-1 text-[#171717]">
            <li><strong>Automated 1-Hour Life Cycle:</strong> Files strictly expire and auto-delete from Supabase Storage and database after 60 minutes.</li>
            <li><strong>5-Node Supabase Pool:</strong> Intelligent load balancing across up to 5 Supabase free-tier project databases for high-capacity files up to 999MB.</li>
            <li><strong>Tiered Micro-Payments:</strong> Seamless Razorpay integration &amp; dynamic payment QR for 50MB+ transfers (₹5, ₹10, ₹20).</li>
          </ul>
        </div>

        {/* Tech Stack Badges */}
        <div className="space-y-2">
          <span className="text-[11px] font-semibold text-[#171717] uppercase tracking-wider block">
            Tech Stack
          </span>
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            {['React 19', 'TypeScript', 'Tailwind CSS', 'Supabase PostgreSQL', 'Supabase Storage', 'Razorpay Payments', 'UPI QR Generator', 'Load Balancing'].map((tech) => (
              <span
                key={tech}
                className="px-2.5 py-1 bg-[#F7F7F5] border border-[#D9D9D9] text-[#171717] rounded-md font-medium"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {onOpenContact ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenContact();
              }}
              className="text-xs text-[#171717] font-semibold underline hover:text-[#2563EB] flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5 text-[#EA4335]" />
              <span>Contact &amp; Support</span>
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#171717] hover:bg-black text-[#FFFFFF] rounded text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
