const MONTH_NAMES = Object.freeze([
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]);

export function formatMonthYear(value) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);
  if (!match) throw new Error(`Invalid YYYY-MM date: ${value}`);
  return `${MONTH_NAMES[Number(match[2]) - 1]} ${match[1]}`;
}

export function formatMonthRange(startDate, endDate) {
  return `${formatMonthYear(startDate)}–${endDate === null ? 'present' : formatMonthYear(endDate)}`;
}

export function formatYearRange(startDate, endDate) {
  if (!/^\d{4}$/.test(startDate) || (endDate !== null && !/^\d{4}$/.test(endDate))) {
    throw new Error('Education dates must use YYYY.');
  }
  return `${startDate}–${endDate ?? 'present'}`;
}
