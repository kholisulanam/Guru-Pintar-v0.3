/**
 * Utility functions for Date and Month formatting across GuruPintar
 */

const INDONESIAN_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

/**
 * Format a date string/object/number into "day month year" format
 * Example: "2026-08-15" -> "15 Agustus 2026"
 */
export function formatLongDate(dateInput?: string | Date | number | null): string {
  if (!dateInput) return '-';

  let d: Date | null = null;

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();

    // Already in "day month year" (e.g. "15 Agustus 2026" or "1 Agustus 2026")
    const indonesianMonthPattern = INDONESIAN_MONTHS.join('|');
    const alreadyFormattedRegex = new RegExp(`^\\d{1,2}\\s+(${indonesianMonthPattern})\\s+\\d{4}$`, 'i');
    if (alreadyFormattedRegex.test(trimmed)) {
      return trimmed;
    }

    // Match "Day, dd:mm:yyyy" (e.g. "Sabtu, 15:08:2026")
    if (/^[A-Za-z]+,\s*\d{2}:\d{2}:\d{4}$/.test(trimmed)) {
      const datePart = trimmed.split(',')[1].trim();
      const parts = datePart.split(':');
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      d = new Date(year, month, day);
    }
    // Match "YYYY-MM-DD"
    else if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const parts = trimmed.slice(0, 10).split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      d = new Date(year, month, day);
    }
    // Match "DD:MM:YYYY"
    else if (/^\d{1,2}:\d{1,2}:\d{4}$/.test(trimmed)) {
      const parts = trimmed.split(':');
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      d = new Date(year, month, day);
    }
    // Match "DD-MM-YYYY"
    else if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(trimmed)) {
      const parts = trimmed.split('-');
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      d = new Date(year, month, day);
    }
    // Match "DD/MM/YYYY"
    else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
      const parts = trimmed.split('/');
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      d = new Date(year, month, day);
    } else {
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        d = parsed;
      }
    }
  } else if (typeof dateInput === 'number') {
    d = new Date(dateInput);
  } else if (dateInput instanceof Date) {
    d = dateInput;
  }

  if (!d || isNaN(d.getTime())) {
    return String(dateInput);
  }

  const day = d.getDate();
  const monthName = INDONESIAN_MONTHS[d.getMonth()];
  const year = d.getFullYear();

  return `${day} ${monthName} ${year}`;
}

/**
 * Format a month string (e.g. "2026-08") or Date into Month-Year format
 * Example: "2026-08" -> "Agustus 2026"
 */
export function formatMonthYear(monthInput?: string | Date | null): string {
  if (!monthInput) return '-';

  if (typeof monthInput === 'string') {
    const trimmed = monthInput.trim();
    // Matches "YYYY-MM"
    if (/^\d{4}-\d{2}$/.test(trimmed)) {
      const parts = trimmed.split('-');
      const year = parts[0];
      const monthIndex = parseInt(parts[1], 10) - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        return `${INDONESIAN_MONTHS[monthIndex]} ${year}`;
      }
    }
    // Matches "MM-YYYY"
    if (/^\d{2}-\d{4}$/.test(trimmed)) {
      const parts = trimmed.split('-');
      const monthIndex = parseInt(parts[0], 10) - 1;
      const year = parts[1];
      if (monthIndex >= 0 && monthIndex < 12) {
        return `${INDONESIAN_MONTHS[monthIndex]} ${year}`;
      }
    }
    // Try generic date parse
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return `${INDONESIAN_MONTHS[parsed.getMonth()]} ${parsed.getFullYear()}`;
    }
    return trimmed;
  }

  const d = new Date(monthInput);
  if (isNaN(d.getTime())) return String(monthInput);
  return `${INDONESIAN_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Helper to get standard list of Month-Year options for selectors
 */
export function getMonthYearOptions(year = 2026): { value: string; label: string }[] {
  return INDONESIAN_MONTHS.map((m, idx) => {
    const monthNum = String(idx + 1).padStart(2, '0');
    return {
      value: `${year}-${monthNum}`,
      label: `${m} ${year}`,
    };
  });
}
