/**
 * Precision currency and date formatters.
 */

export const REASON_CODE_DESCRIPTIONS: Record<string, { desc: string; isDenial: boolean }> = {
  'CO-16': { desc: 'Claim/service lacks information (Denial)', isDenial: true },
  'CO-50': { desc: 'Service deemed not medically necessary (Denial)', isDenial: true },
  'CO-197': { desc: 'Precertification/authorization absent (Denial)', isDenial: true },
  'CO-45': { desc: 'Charges exceed contractual fee schedule allowance', isDenial: false },
  'PR-1': { desc: 'Deductible amount', isDenial: false },
  'PR-3': { desc: 'Co-payment amount', isDenial: false },
};

/**
 * Format integer cents into standard currency display.
 * Avoids floating point drift by calculating whole and fractional cents safely.
 */
export function formatCurrency(cents: number | null | undefined, symbol: string = '$'): string {
  if (cents === null || cents === undefined) {
    return '—';
  }
  const isNegative = cents < 0;
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const remainder = abs % 100;
  const formatted = `${dollars.toLocaleString('en-US')}.${remainder.toString().padStart(2, '0')}`;
  return isNegative ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}

/**
 * Format cents as raw integer with cents symbol for audit transparency.
 */
export function formatRawCents(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) {
    return '—';
  }
  return `${cents.toLocaleString('en-US')}¢`;
}

/**
 * Format ISO date string (YYYY-MM-DD) for display.
 */
export function formatDate(isoStr: string): string {
  if (!isoStr) return '—';
  try {
    const [year, month, day] = isoStr.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return isoStr;
  }
}
