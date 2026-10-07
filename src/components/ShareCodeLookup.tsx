import React, { useState, useEffect } from 'react';
import { ArrowRight, Hash, ShieldAlert } from 'lucide-react';
import { normalizeShareCode } from '../lib/validation';

interface ShareCodeLookupProps {
  onLookup: (code: string) => void;
}

export const ShareCodeLookup: React.FC<ShareCodeLookupProps> = ({ onLookup }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Active countdown during brute-force rate-limit lockout
  useEffect(() => {
    if (lockoutSeconds <= 0) return;

    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setFailedAttempts(0);
          setError(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (lockoutSeconds > 0) return;
    setError(null);
    const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (raw.length <= 4) {
      setCode(raw);
    } else if (raw.length <= 8) {
      setCode(`${raw.slice(0, 4)}-${raw.slice(4)}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSeconds > 0) return;

    const clean = normalizeShareCode(code);
    if (!clean || clean.length < 8) {
      const nextFailed = failedAttempts + 1;
      setFailedAttempts(nextFailed);
      if (nextFailed >= 3) {
        setLockoutSeconds(30);
        setError('Too many failed attempts. Security cooldown active for 30 seconds.');
      } else {
        setError(`Please enter an 8-character share code (Attempt ${nextFailed}/3)`);
      }
      return;
    }

    // Reset attempts on valid code submission and navigate
    setFailedAttempts(0);
    onLookup(clean);
  };

  return (
    <div className="w-full bg-[#FFFFFF] border border-[#D9D9D9] rounded-lg p-5">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-[#666666]" />
            <span className="text-sm font-semibold text-[#171717]">Have a share code?</span>
          </div>
          {lockoutSeconds > 0 && (
            <span className="text-xs text-[#DC2626] font-semibold flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Cooldown: {lockoutSeconds}s</span>
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={code}
              onChange={handleChange}
              disabled={lockoutSeconds > 0}
              placeholder={lockoutSeconds > 0 ? 'Locked out...' : 'e.g. AB82-KX91'}
              maxLength={9}
              className="w-full h-10 px-3.5 bg-[#FFFFFF] border border-[#D9D9D9] focus:border-[#2563EB] rounded text-sm font-mono uppercase tracking-widest text-[#171717] outline-none disabled:bg-[#F3F4F6] disabled:text-[#9CA3AF] disabled:cursor-not-allowed"
              aria-label="Enter 8-character share code"
            />
          </div>

          <button
            type="submit"
            disabled={lockoutSeconds > 0}
            className="h-10 px-5 bg-[#FFFFFF] border border-[#D9D9D9] hover:border-[#171717] text-[#171717] font-medium text-sm rounded transition-colors flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
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
