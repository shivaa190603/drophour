// File size thresholds and pricing configuration for DropHour
export const TIER_THRESHOLDS = {
  FREE_MAX_BYTES: 50 * 1024 * 1024, // 50 MB -> Free (1-Hour Expiration)
  TIER_1_MAX_BYTES: 100 * 1024 * 1024, // 100 MB -> ₹5 (2-Hour Expiration)
  TIER_2_MAX_BYTES: 200 * 1024 * 1024, // 200 MB -> ₹10 (2-Hour Expiration)
  TIER_3_MAX_BYTES: 999 * 1024 * 1024, // 999 MB -> ₹20 (2-Hour Expiration)
  MAX_ALLOWED_BYTES: 999 * 1024 * 1024, // 999 MB
};

export interface PricingTierInfo {
  priceInr: number;
  isPaid: boolean;
  tierName: string;
  description: string;
  badgeLabel: string;
  expiryHours: number; // 1 for free tier, 2 for paid tiers
}

/**
 * Calculates pricing tier, payment requirement, and retention duration (1h free, 2h paid)
 */
export function getFilePricingTier(sizeBytes: number): PricingTierInfo {
  if (sizeBytes <= TIER_THRESHOLDS.FREE_MAX_BYTES) {
    return {
      priceInr: 0,
      isPaid: false,
      tierName: 'Free Tier',
      description: 'Files up to 50 MB are 100% free with 1-hour automatic expiration.',
      badgeLabel: 'Free · 1hr',
      expiryHours: 1,
    };
  }

  if (sizeBytes <= TIER_THRESHOLDS.TIER_1_MAX_BYTES) {
    return {
      priceInr: 5,
      isPaid: true,
      tierName: 'Plus Tier (50 MB – 100 MB)',
      description: 'High-speed transfer with extended 2-hour retention.',
      badgeLabel: '₹5 (50–100MB · 2hr)',
      expiryHours: 2,
    };
  }

  if (sizeBytes <= TIER_THRESHOLDS.TIER_2_MAX_BYTES) {
    return {
      priceInr: 10,
      isPaid: true,
      tierName: 'Pro Tier (100 MB – 200 MB)',
      description: 'Expanded capacity transfer with extended 2-hour retention.',
      badgeLabel: '₹10 (100–200MB · 2hr)',
      expiryHours: 2,
    };
  }

  if (sizeBytes <= TIER_THRESHOLDS.TIER_3_MAX_BYTES) {
    return {
      priceInr: 20,
      isPaid: true,
      tierName: 'Ultra Tier (200 MB – 999 MB)',
      description: 'Maximum capacity transfer up to 999 MB with extended 2-hour retention.',
      badgeLabel: '₹20 (200–999MB · 2hr)',
      expiryHours: 2,
    };
  }

  return {
    priceInr: -1,
    isPaid: false,
    tierName: 'Exceeds Limit',
    description: 'File size exceeds the 999 MB maximum upload limit.',
    badgeLabel: 'Exceeds 999MB',
    expiryHours: 1,
  };
}
