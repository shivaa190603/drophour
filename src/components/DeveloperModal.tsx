import React, { useState } from 'react';
import {
  User,
  Mail,
  Check,
  Copy,
  Server,
  X,
  ExternalLink,
} from 'lucide-react';

interface DeveloperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDatabasePool?: () => void;
}

export const DeveloperModal: React.FC<DeveloperModalProps> = ({
  isOpen,
  onClose,
  onOpenDatabasePool,
}) => {
  const [copied, setCopied] = useState(false);
  const email = 'shivagopi@gmail.com';
  const githubUrl = 'https://github.com/shivaa1906';

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

          {/* GitHub Card */}
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 bg-[#F7F7F5] border border-[#D9D9D9] rounded-lg flex items-center justify-between hover:border-[#171717] transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <svg className="w-4 h-4 text-[#171717] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <div>
                <span className="text-[10px] text-[#666666] uppercase font-semibold block">
                  GitHub Profile
                </span>
                <span className="text-xs font-medium text-[#171717]">github.com/shivaa1906</span>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-[#666666]" />
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
            <li><strong>Tiered Micro-Payments:</strong> Seamless Razorpay integration &amp; dynamic UPI QR code generator for 50MB+ transfers (₹10, ₹30, ₹50).</li>
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

        {/* Database Pool Shortcut */}
        {onOpenDatabasePool && (
          <div className="pt-2 border-t border-[#D9D9D9]">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenDatabasePool();
              }}
              className="w-full py-2 px-3 bg-[#F7F7F5] hover:bg-[#EAEAEA] border border-[#D9D9D9] rounded text-xs font-medium text-[#171717] flex items-center justify-center gap-2 transition-colors"
            >
              <Server className="w-4 h-4 text-[#2563EB]" />
              <span>Configure 5 Supabase Database Nodes (Load Balancer)</span>
            </button>
          </div>
        )}

        <div className="flex justify-end pt-2">
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
