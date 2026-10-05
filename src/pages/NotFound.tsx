import React from 'react';
import { HelpCircle } from 'lucide-react';

interface NotFoundProps {
  onGoHome: () => void;
}

export const NotFound: React.FC<NotFoundProps> = ({ onGoHome }) => {
  return (
    <div className="w-full max-w-[600px] mx-auto py-12 px-4 text-center">
      <div className="bg-[#FFFFFF] border border-[#D9D9D9] rounded-lg p-8 sm:p-12 space-y-6">
        <div className="w-14 h-14 rounded-full bg-[#F7F7F5] border border-[#D9D9D9] flex items-center justify-center mx-auto text-[#666666]">
          <HelpCircle className="w-7 h-7" strokeWidth={1.75} />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold text-[#171717]">
            We couldn't find that file
          </h1>
          <p className="text-sm text-[#666666] max-w-md mx-auto leading-relaxed">
            The link may be incorrect, expired, or already deleted.
          </p>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onGoHome}
            className="h-11 px-6 bg-[#171717] hover:bg-black text-[#FFFFFF] text-sm font-medium rounded transition-colors"
          >
            Go to homepage
          </button>
        </div>
      </div>
    </div>
  );
};
