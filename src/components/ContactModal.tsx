import React, { useState } from 'react';
import {
  X,
  Mail,
  User,
  Copy,
  Check,
  ExternalLink,
  Send,
  MessageSquare,
  CheckCircle2,
} from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedCleanMsg, setCopiedCleanMsg] = useState(false);

  // Gmail support form state
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [inquiryCategory, setInquiryCategory] = useState('General Inquiry & Support');
  const [messageContent, setMessageContent] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setFeedbackMsg(null);
    onClose();
  };

  const developerEmail = 'shivaa190603@gmail.com';
  const instagramProfile = 'https://instagram.com/shivagopichowdary03';
  const instagramHandle = 'shivagopichowdary03';

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(developerEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const formatCleanEmailBody = () => {
    return [
      '==================================================',
      '           DROPHOUR USER SUPPORT INQUIRY          ',
      '==================================================',
      `Sender Name:   ${senderName.trim() || 'Anonymous User'}`,
      `Sender Email:  ${senderEmail.trim() || 'Not provided'}`,
      `Topic:         ${inquiryCategory}`,
      `Date & Time:   ${new Date().toLocaleString()}`,
      '',
      '-------------------- MESSAGE ---------------------',
      messageContent.trim(),
      '--------------------------------------------------',
      'Sent via:      DropHour Ephemeral Sharing Portal',
      `Developer:     shivagopi (${developerEmail})`,
      '==================================================',
    ].join('\n');
  };

  const getCleanSubject = () => {
    const sender = senderName.trim() ? `from ${senderName.trim()}` : 'Support Request';
    return `[DropHour] ${inquiryCategory} (${sender})`;
  };

  const handleSendViaGmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim()) {
      setFeedbackMsg('Please enter your message details before sending.');
      return;
    }

    const subject = getCleanSubject();
    const body = formatCleanEmailBody();

    const gmailWebUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      developerEmail
    )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.open(gmailWebUrl, '_blank', 'noopener,noreferrer');
    setFeedbackMsg('Opening formatted draft in Gmail Web. Check your new browser tab to click Send!');
  };

  const handleSendViaMailApp = () => {
    if (!messageContent.trim()) {
      setFeedbackMsg('Please enter your message details before sending.');
      return;
    }
    const subject = getCleanSubject();
    const body = formatCleanEmailBody();
    const mailtoUrl = `mailto:${encodeURIComponent(developerEmail)}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
    setFeedbackMsg('Opening your system mail client. You can also copy the clean message below.');
  };

  const handleCopyCleanMessage = () => {
    if (!messageContent.trim()) {
      setFeedbackMsg('Please type a message first to copy.');
      return;
    }
    const cleanText = formatCleanEmailBody();
    navigator.clipboard.writeText(cleanText);
    setCopiedCleanMsg(true);
    setFeedbackMsg('Message copied to clipboard in clean format! You can paste it into any email client.');
    setTimeout(() => setCopiedCleanMsg(false), 2500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Contact & Support"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-2xl bg-[#FFFFFF] border border-[#D9D9D9] rounded-lg shadow-xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#D9D9D9] px-5 py-4 bg-[#FFFFFF]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#171717] text-white flex items-center justify-center">
              <Mail className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#171717]">Contact &amp; Developer Support</h2>
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

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-sm text-[#171717]">
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
                  DropHour is designed and maintained by <strong>shivagopi</strong>. You can reach out
                  directly via Gmail using the quick contact composer below or through our direct channels.
                </p>
              </div>
            </div>
          </div>

          {/* Direct Channels Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Official Email */}
            <div className="p-3.5 bg-[#FFFFFF] border border-[#D9D9D9] rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#666666] uppercase flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#EA4335]" />
                  Official Gmail
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
                Direct inbox monitored for support, payments &amp; feedback.
              </p>
            </div>

            {/* Instagram Profile */}
            <a
              href={instagramProfile}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3.5 bg-[#FFFFFF] border border-[#D9D9D9] rounded-lg space-y-2 hover:border-[#E1306C] transition-colors block group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#666666] uppercase flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-[#E1306C]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                  Instagram Profile
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-[#666666] group-hover:text-[#E1306C]" />
              </div>
              <div className="font-bold text-sm text-[#171717] group-hover:text-[#E1306C]">@{instagramHandle}</div>
              <p className="text-[11px] text-[#666666]">
                Follow &amp; connect with the developer on Instagram.
              </p>
            </a>
          </div>

          {/* Gmail Support Composer Form */}
          <form onSubmit={handleSendViaGmail} className="bg-[#F7F7F5] border border-[#D9D9D9] rounded-lg p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#D9D9D9] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-[#EA4335] text-white flex items-center justify-center">
                  <Mail className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[#171717] uppercase tracking-wider">
                    Gmail Support Composer
                  </h4>
                  <p className="text-[11px] text-[#666666]">
                    Pre-formats your inquiry cleanly and opens directly in Gmail
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded">
                Direct Send
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#666666] uppercase mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g. Alex"
                  className="w-full text-xs px-3 py-2 bg-[#FFFFFF] border border-[#D9D9D9] rounded focus:outline-none focus:border-[#171717]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#666666] uppercase mb-1">
                  Your Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="alex@example.com"
                  className="w-full text-xs px-3 py-2 bg-[#FFFFFF] border border-[#D9D9D9] rounded focus:outline-none focus:border-[#171717]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#666666] uppercase mb-1">
                Inquiry Topic
              </label>
              <select
                value={inquiryCategory}
                onChange={(e) => setInquiryCategory(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-[#FFFFFF] border border-[#D9D9D9] rounded focus:outline-none focus:border-[#171717]"
              >
                <option value="General Inquiry & Support">General Inquiry &amp; Support</option>
                <option value="Bug Report / Technical Issue">🐛 Bug Report / Technical Issue</option>
                <option value="Payment & UPI Verification">💳 Payment &amp; UPI / Razorpay Support</option>
                <option value="DMCA / Content Takedown">⚖️ DMCA / Content Removal Request</option>
                <option value="Feature Suggestion">💡 Feature Suggestion &amp; Feedback</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#666666] uppercase mb-1">
                Message Details *
              </label>
              <textarea
                rows={4}
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Enter your message, issue description, or question here..."
                className="w-full text-xs p-3 bg-[#FFFFFF] border border-[#D9D9D9] rounded focus:outline-none focus:border-[#171717] resize-none"
                required
              />
            </div>

            {feedbackMsg && (
              <div className="p-2.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded text-xs text-[#166534] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                <span>{feedbackMsg}</span>
              </div>
            )}

            {/* Form Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyCleanMessage}
                className="text-xs text-[#666666] hover:text-[#171717] border border-[#D9D9D9] bg-[#FFFFFF] px-3 py-2 rounded flex items-center gap-1.5 hover:bg-[#F7F7F5] transition-colors"
              >
                {copiedCleanMsg ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                    <span className="text-[#16A34A] font-medium">Copied Clean Format!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Clean Format</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSendViaMailApp}
                  className="px-3.5 py-2 bg-[#FFFFFF] hover:bg-[#EAEAEA] text-[#171717] border border-[#D9D9D9] text-xs font-semibold rounded flex items-center gap-1.5 transition-colors"
                  title="Open in your default email program (Outlook, Mail, Thunderbird)"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Mail App</span>
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 bg-[#EA4335] hover:bg-[#D93025] text-white text-xs font-semibold rounded flex items-center gap-1.5 transition-colors shadow-sm"
                  title="Open in Gmail Web with pre-filled formatted body"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send via Gmail</span>
                </button>
              </div>
            </div>
          </form>
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
