import React from 'react';
import { Clock, HelpCircle } from 'lucide-react';

interface HeaderProps {
  onOpenHowItWorks: () => void;
  onGoHome: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenHowItWorks, onGoHome }) => {
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

        {/* Action */}
        <nav className="flex items-center gap-3">
          <button
            onClick={onOpenHowItWorks}
            className="flex items-center gap-1.5 text-sm font-medium text-[#666666] hover:text-[#171717] px-3 py-1.5 rounded border border-transparent hover:border-[#D9D9D9] transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            <span>How it works</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
