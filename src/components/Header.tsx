import React from 'react';
import { Clock, User, Mail } from 'lucide-react';

interface HeaderProps {
  onOpenDeveloper: () => void;
  onGoHome: () => void;
  onOpenContact?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenDeveloper,
  onGoHome,
  onOpenContact,
}) => {
  return (
    <header className="w-full border-b border-[#D9D9D9] bg-[#FFFFFF]">
      <div className="max-w-[900px] mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand */}
        <button
          onClick={onGoHome}
          className="flex items-center gap-2.5 text-[#171717] hover:opacity-80 transition-opacity focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded px-1 -ml-1 text-left"
          aria-label="DropHour home"
        >
          <div className="w-8 h-8 rounded bg-[#171717] text-[#FFFFFF] flex items-center justify-center font-bold text-sm tracking-tight">
            <Clock className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-lg tracking-tight text-[#171717]">DropHour</span>
        </button>

        {/* Navigation */}
        <nav className="flex items-center gap-2 sm:gap-2.5">
          {onOpenContact && (
            <button
              onClick={onOpenContact}
              className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#666666] hover:text-[#171717] bg-[#FFFFFF] hover:bg-[#F7F7F5] border border-[#D9D9D9] px-2.5 sm:px-3 py-1.5 rounded transition-colors"
              aria-label="Detailed Contact Information"
            >
              <Mail className="w-3.5 h-3.5 text-[#EA4335]" />
              <span className="hidden xs:inline">Contact</span>
            </button>
          )}

          {/* Developer button (shivagopi) */}
          <button
            onClick={onOpenDeveloper}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#171717] bg-[#F7F7F5] hover:bg-[#EAEAEA] border border-[#D9D9D9] px-2.5 sm:px-3 py-1.5 rounded transition-colors"
            aria-label="Developer information for shivagopi"
          >
            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#2563EB]" />
            <span>Developer: <span className="font-bold">shivagopi</span></span>
          </button>
        </nav>
      </div>
    </header>
  );
};
