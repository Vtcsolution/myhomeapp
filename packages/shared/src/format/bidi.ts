/**
 * Keeps Latin number runs readable inside Arabic (right-to-left) text.
 *
 * A phone number such as "+965 5555 0101" has no letters, so in an Arabic
 * sentence the bidirectional algorithm lays its groups out right to left
 * ("0101 5555 965+"). Wrapping such runs in Unicode isolates (LRI … PDI)
 * keeps them left to right on web, Android and iOS. Money, dates and times are
 * left alone: they are formatted for the locale already.
 */

const LRI = '\u2066';
const PDI = '\u2069';

/**
 * Phone-like runs (an optional +, then 7+ digits with spaces or bullets) and
 * Latin reference codes (MH-48652, T-10425, OTP-1025).
 */
const LTR_RUN = /(?:\+?\d[\d\u00a0 •]{5,}\d|[•]{2,}[\d\u00a0 •]*\d+|\b[A-Z]{1,4}-\d{3,}\b)/g;

export function isolateLtrRuns(text: string): string {
  if (!text || hasIsolates(text)) return text;
  return text.replace(LTR_RUN, (run) => `${LRI}${run}${PDI}`);
}

/** True when the text already contains an isolate (avoids wrapping twice). */
export function hasIsolates(text: string): boolean {
  return text.includes(LRI);
}
