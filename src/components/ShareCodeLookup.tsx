import React, { useState } from 'react';
import { ArrowRight, Hash } from 'lucide-react';
import { normalizeShareCode } from '../lib/validation';

interface ShareCodeLookupProps {
  onLookup: (code: string) => void;
}

export const ShareCodeLookup: React.FC<ShareCodeLookupProps> = ({ onLookup }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (raw.length <= 4) {
      setCode(raw);
    } else if (raw.length <= 8) {
      setCode(`${raw.slice(0, 4)}-${raw.slice(4)}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = normalizeShareCode(code);
    if (!clean || clean.length < 8) {
      setError('Please enter an 8-character share code (e.g. AB82-KX91)');
      return;
    }
    onLookup(clean);
  };

  return (
    <div className="w-full bg-[#FFFFFF] border border-[#D9D9D9] rounded-lg p-5">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-[#666666]" />
          <span className="text-sm font-semibold text-[#171717]">Have a share code?</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={code}
              onChange={handleChange}
              placeholder="e.g. AB82-KX91"
              maxLength={9}
              className="w-full h-10 px-3.5 bg-[#FFFFFF] border border-[#D9D9D9] focus:border-[#2563EB] rounded text-sm font-mono uppercase tracking-widest text-[#171717] outline-none"
              aria-label="Enter 8-character share code"
            />
          </div>

          <button
            type="submit"
            className="h-10 px-5 bg-[#FFFFFF] border border-[#D9D9D9] hover:border-[#171717] text-[#171717] font-medium text-sm rounded transition-colors flex items-center justify-center gap-1.5 shrink-0"
          >
            <span>Open file</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {error && <p className="text-xs text-[#DC2626]">{error}</p>}
      </form>
    </div>
  );
};
