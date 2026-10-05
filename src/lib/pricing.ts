// File size thresholds and pricing configuration for DropHour
export const TIER_THRESHOLDS = {
  FREE_MAX_BYTES: 50 * 1024 * 1024, // 50 MB
  TIER_1_MAX_BYTES: 100 * 1024 * 1024, // 100 MB -> ₹10
  TIER_2_MAX_BYTES: 200 * 1024 * 1024, // 200 MB -> ₹30
  TIER_3_MAX_BYTES: 999 * 1024 * 1024, // 999 MB -> ₹50
  MAX_ALLOWED_BYTES: 999 * 1024 * 1024, // 999 MB
};

export interface PricingTierInfo {
  priceInr: number;
  isPaid: boolean;
  tierName: string;
  description: string;
  badgeLabel: string;
}

/**
 * Calculates pricing tier and payment requirement for a given file size in bytes
 */
export function getFilePricingTier(sizeBytes: number): PricingTierInfo {
  if (sizeBytes <= TIER_THRESHOLDS.FREE_MAX_BYTES) {
    return {
      priceInr: 0,
      isPaid: false,
      tierName: 'Free Tier',
      description: 'Files up to 50 MB are 100% free with no account required.',
      badgeLabel: 'Free',
    };
  }

  if (sizeBytes <= TIER_THRESHOLDS.TIER_1_MAX_BYTES) {
    return {
      priceInr: 10,
      isPaid: true,
      tierName: 'Plus Tier (50 MB – 100 MB)',
      description: 'High-speed temporary transfer for files between 50 MB and 100 MB.',
      badgeLabel: '₹10 (50–100MB)',
    };
  }

  if (sizeBytes <= TIER_THRESHOLDS.TIER_2_MAX_BYTES) {
    return {
      priceInr: 30,
      isPaid: true,
      tierName: 'Pro Tier (100 MB – 200 MB)',
      description: 'Expanded capacity transfer for files between 100 MB and 200 MB.',
      badgeLabel: '₹30 (100–200MB)',
    };
  }

  if (sizeBytes <= TIER_THRESHOLDS.TIER_3_MAX_BYTES) {
    return {
      priceInr: 50,
      isPaid: true,
      tierName: 'Ultra Tier (200 MB – 999 MB)',
      description: 'Maximum capacity transfer for files up to 999 MB.',
      badgeLabel: '₹50 (200–999MB)',
    };
  }

  return {
    priceInr: -1,
    isPaid: false,
    tierName: 'Exceeds Limit',
    description: 'File size exceeds the 999 MB maximum upload limit.',
    badgeLabel: 'Exceeds 999MB',
  };
}

/**
 * Generates a valid UPI payment deep link string
 * Compatible with Google Pay, PhonePe, Paytm, BHIM, etc.
 */
export function generateUpiPaymentUri(amountInr: number, filename: string): string {
  const upiId = import.meta.env.VITE_UPI_ID || 'shivagopi@okaxis'; // Configured via env or default developer UPI
  const payeeName = 'DropHour by Shivagopi';
  const cleanName = filename.slice(0, 20).replace(/[^a-zA-Z0-9_-]/g, '_');
  const note = `DropHour ${amountInr}rs for ${cleanName}`;

  return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    payeeName
  )}&am=${amountInr}&cu=INR&tn=${encodeURIComponent(note)}`;
}
