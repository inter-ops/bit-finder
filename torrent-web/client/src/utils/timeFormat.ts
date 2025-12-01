/**
 * Format a timestamp as relative time (e.g., "5d 4h ago")
 */
export function formatRelativeTime(timeStr: string): { relative: string; full: string } {
  // Try to parse the time string
  const now = Date.now();
  let timestamp: number;

  // Handle different time formats
  if (/^\d+$/.test(timeStr)) {
    // Unix timestamp
    timestamp = parseInt(timeStr) * 1000;
  } else if (/ago$/i.test(timeStr)) {
    // Already formatted as relative time, return as-is
    return { relative: timeStr, full: timeStr };
  } else {
    // Try to parse as date string
    const parsed = Date.parse(timeStr);
    if (isNaN(parsed)) {
      return { relative: timeStr, full: timeStr };
    }
    timestamp = parsed;
  }

  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  let relative: string;

  if (years > 0) {
    relative = `${years}y`;
    if (months % 12 > 0) relative += ` ${months % 12}mo`;
  } else if (months > 0) {
    relative = `${months}mo`;
    if (days % 30 > 0) relative += ` ${days % 30}d`;
  } else if (days > 0) {
    relative = `${days}d`;
    if (hours % 24 > 0) relative += ` ${hours % 24}h`;
  } else if (hours > 0) {
    relative = `${hours}h`;
    if (minutes % 60 > 0) relative += ` ${minutes % 60}m`;
  } else if (minutes > 0) {
    relative = `${minutes}m`;
  } else {
    relative = `${seconds}s`;
  }

  relative += " ago";

  const full = new Date(timestamp).toLocaleString();

  return { relative, full };
}
