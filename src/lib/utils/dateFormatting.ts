import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import customParseFormat from 'dayjs/plugin/customParseFormat';

// Initialize dayjs with plugins
dayjs.extend(relativeTime);
dayjs.extend(customParseFormat);

/**
 * Enhanced timestamp formatting function
 * Uses relative time for dates within the last month, absolute dates for older timestamps
 */
export function formatTimestamp(date: Date | null): string {
  if (!date) return '';

  const now = dayjs();
  const dateObj = dayjs(date);
  const diffInDays = now.diff(dateObj, 'day');

  // Use relative time for dates within the last month (30 days)
  if (diffInDays <= 30) {
    return dateObj.fromNow();
  }

  // Use absolute dates for older timestamps
  const currentYear = now.year();
  const dateYear = dateObj.year();

  if (dateYear === currentYear) {
    return dateObj.format('D MMM'); // e.g., "6 Apr"
  } else {
    return dateObj.format('D MMM YYYY'); // e.g., "1 Oct 2024"
  }
}

/**
 * Formats date for tooltip display
 */
export function formatTooltip(date: Date | null): string {
  if (!date) return '';
  return dayjs(date).format('ddd, D MMM YYYY, HH:mm'); // e.g., "Sun, 1 Oct 2024, 14:24"
}