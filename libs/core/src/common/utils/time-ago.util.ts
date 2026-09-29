/**
 * Minimal relative-time formatter ("3 hours ago") so BaseResource's
 * timestamps() doesn't need to pull in a date library (dayjs/moment) as a
 * hard dependency just for this one helper. Equivalent of Carbon's
 * `diffForHumans()` used by ResourceTimestamps.php.
 */
export function timeAgo(date?: Date | null): string {
  if (!date) return '';

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 0) return 'just now';

  const units: [number, string][] = [
    [31536000, 'year'],
    [2592000, 'month'],
    [86400, 'day'],
    [3600, 'hour'],
    [60, 'minute'],
  ];

  for (const [unitSeconds, label] of units) {
    const value = Math.floor(seconds / unitSeconds);
    if (value >= 1) {
      return `${value} ${label}${value > 1 ? 's' : ''} ago`;
    }
  }

  return 'just now';
}
