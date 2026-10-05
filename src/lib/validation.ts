// Configuration
export const MAX_FILE_SIZE_BYTES = 999 * 1024 * 1024; // 999 MB (Free up to 50MB, Paid 50MB to 999MB)
export const FREE_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
export const EXPIRATION_DURATION_SECONDS = 60 * 60; // 1 hour (3600 seconds)

// Non-ambiguous charset (excluding 0, O, 1, I, L)
const CODE_CHARSET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/**
 * Generates a human-friendly, cryptographically random share code formatted as XXXX-XXXX
 * Avoids visually ambiguous characters: 0, O, 1, I, L
 */
export function generateShareCode(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let part1 = '';
  let part2 = '';

  for (let i = 0; i < 4; i++) {
    part1 += CODE_CHARSET[bytes[i] % CODE_CHARSET.length];
  }
  for (let i = 4; i < 8; i++) {
    part2 += CODE_CHARSET[bytes[i] % CODE_CHARSET.length];
  }

  return `${part1}-${part2}`;
}

/**
 * Normalizes user-inputted share code to uppercase format XXXX-XXXX
 */
export function normalizeShareCode(input: string): string {
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.length === 8) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
  }
  return cleaned;
}

/**
 * Validates if a string is a valid share code
 */
export function isValidShareCode(code: string): boolean {
  const cleaned = normalizeShareCode(code);
  return /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(cleaned);
}

/**
 * Generates a cryptographically secure random token (URL-safe string)
 */
export function generateSecureToken(length = 24): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars[bytes[i] % chars.length];
  }
  return token;
}

/**
 * Sanitizes a filename to avoid path traversal or special characters
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return 'unnamed_file';
  return filename
    .replace(/\0/g, '')
    .replace(/(\.\.[/\\])/g, '')
    .replace(/[/\\?%*:|"<>]/g, '_')
    .slice(0, 150)
    .trim();
}

/**
 * Validates a file before upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'Please choose a file to share.' };
  }
  if (file.size === 0) {
    return { valid: false, error: 'File is empty (0 bytes).' };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: 'This file is too large. Maximum allowed size is 999 MB.' };
  }
  return { valid: true };
}
