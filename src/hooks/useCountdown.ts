import { useState, useEffect, useRef } from 'react';
import { formatCountdown } from '../lib/formatters';

interface UseCountdownOptions {
  expiresAt: string;
  totalDurationSeconds?: number;
  onExpire?: () => void;
}

function getRemainingSeconds(expiresAt: string): number {
  if (!expiresAt) return 0;
  const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
  return Math.max(0, diff);
}

export function useCountdown({
  expiresAt,
  totalDurationSeconds = 3600,
  onExpire,
}: UseCountdownOptions) {
  const [prevExpiresAt, setPrevExpiresAt] = useState(expiresAt);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() =>
    getRemainingSeconds(expiresAt)
  );

  // Adjust state during render when prop changes (idiomatic React pattern)
  if (prevExpiresAt !== expiresAt) {
    setPrevExpiresAt(expiresAt);
    setSecondsRemaining(getRemainingSeconds(expiresAt));
  }

  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = getRemainingSeconds(expiresAt);
      setSecondsRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onExpireRef.current?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const isExpired = secondsRemaining <= 0;
  const formattedCountdown = formatCountdown(secondsRemaining);
  const percentRemaining = Math.max(0, Math.min(100, (secondsRemaining / totalDurationSeconds) * 100));

  return {
    secondsRemaining,
    formattedCountdown,
    isExpired,
    percentRemaining,
  };
}
