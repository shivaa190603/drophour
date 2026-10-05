/**
 * Format bytes into human-readable string (e.g. 2.4 MB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = bytes / Math.pow(k, i);
  return `${parseFloat(val.toFixed(i === 0 ? 0 : 1))} ${sizes[i]}`;
}

/**
 * Format total remaining seconds into MM:SS (or HH:MM:SS if > 1 hour)
 */
export function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return '00:00';
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Get friendly file extension or category
 */
export function getFileCategory(filename: string, mimeType?: string): string {
  const ext = filename.split('.').pop()?.toUpperCase() || '';
  if (ext && ext.length <= 5) return ext;

  if (mimeType?.includes('pdf')) return 'PDF';
  if (mimeType?.includes('image')) return 'IMG';
  if (mimeType?.includes('video')) return 'VIDEO';
  if (mimeType?.includes('audio')) return 'AUDIO';
  if (mimeType?.includes('zip') || mimeType?.includes('compressed')) return 'ZIP';
  if (mimeType?.includes('text')) return 'TXT';

  return 'FILE';
}

/**
 * Construct public share URL given token.
 * When testing on localhost, uses the public Netlify domain so mobile phone QR scanners can reach the file!
 */
export function getShareUrl(token: string): string {
  const origin = window.location.origin;
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return `https://shareanywhere.netlify.app/s/${token}`;
  }
  return `${origin}/s/${token}`;
}
