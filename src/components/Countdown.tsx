import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { useCountdown } from '../hooks/useCountdown';

interface CountdownProps {
  expiresAt: string;
  onExpire?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Countdown: React.FC<CountdownProps> = ({
  expiresAt,
  onExpire,
  className = '',
  size = 'md',
}) => {
  const { secondsRemaining, formattedCountdown, isExpired } = useCountdown({
    expiresAt,
    onExpire,
  });

  const isLowTime = secondsRemaining < 600; // < 10 minutes

  if (isExpired) {
    return (
      <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded bg-[#FEE2E2] text-[#DC2626] border border-[#DC2626]/20 ${className}`}>
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>This file has expired</span>
      </div>
    );
  }

  const textClasses =
    size === 'lg'
      ? 'text-lg font-mono font-bold'
      : size === 'sm'
      ? 'text-xs font-mono font-medium'
      : 'text-sm font-mono font-semibold';

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded border ${
        isLowTime
          ? 'bg-[#FEF3C7] border-[#D97706]/30 text-[#D97706]'
          : 'bg-[#F7F7F5] border-[#D9D9D9] text-[#171717]'
      } ${className}`}
      title={`Expires at ${new Date(expiresAt).toLocaleTimeString()}`}
    >
      <Clock className="w-4 h-4 text-[#666666]" />
      <span className="text-xs text-[#666666] font-sans">Expires in</span>
      <span className={textClasses}>{formattedCountdown}</span>
    </div>
  );
};
