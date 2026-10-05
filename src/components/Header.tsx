import React from 'react';
import { Clock, User, Server } from 'lucide-react';

interface HeaderProps {
  onOpenDeveloper: () => void;
  onOpenDatabasePool: () => void;
  onGoHome: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenDeveloper,
  onOpenDatabasePool,
  onGoHome,
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
        <nav className="flex items-center gap-2 sm:gap-3">
          {/* Developer button (shivagopi) */}
          <button
            onClick={onOpenDeveloper}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#171717] bg-[#F7F7F5] hover:bg-[#EAEAEA] border border-[#D9D9D9] px-2.5 sm:px-3 py-1.5 rounded transition-colors"
            aria-label="Developer information for shivagopi"
          >
            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#2563EB]" />
            <span>Developer: <span className="font-bold">shivagopi</span></span>
          </button>

          {/* Database pool load balancer manager */}
          <button
            onClick={onOpenDatabasePool}
            className="flex items-center gap-1 text-xs font-medium text-[#666666] hover:text-[#171717] px-2.5 py-1.5 rounded border border-transparent hover:border-[#D9D9D9] transition-colors"
            title="Configure 5 Supabase Database Nodes"
          >
            <Server className="w-3.5 h-3.5 text-[#666666]" />
            <span className="hidden sm:inline">5-Node Pool</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
