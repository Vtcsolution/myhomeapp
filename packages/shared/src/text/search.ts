import { toLatinDigits } from '../format/number';

/**
 * Normalises English and Arabic text for forgiving search: lower-case, strips
 * Arabic diacritics and tatweel, unifies alef/hamza/taa-marbuta/yaa variants
 * and converts Arabic-Indic digits. "تكييف" matches "التكييف", "أ" matches "ا".
 */
export function normalizeSearchText(value: string): string {
  return (
    toLatinDigits(value)
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      // Keep Latin letters, digits and the Arabic block; explicit ranges avoid
      // relying on Unicode property escapes, which not every JS engine supports.
      .replace(/[^a-z0-9\u00C0-\u024F\u0621-\u064A\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/** Remove the Arabic definite article so "التكييف" and "تكييف" match. */
function stripArticle(token: string): string {
  return token.length > 3 && token.startsWith('ال') ? token.slice(2) : token;
}

function tokens(value: string): string[] {
  return normalizeSearchText(value).split(' ').filter(Boolean).map(stripArticle);
}

/**
 * Relevance score of `fields` (most important first) for `query`; 0 = no match.
 * Every query token must match some field token (exact > prefix > substring).
 * Matches in several fields add up, and a field that starts with the first
 * query word gets a bonus — so "deep clean" ranks "Deep Home Cleaning" first.
 */
export function searchScore(query: string, fields: string[]): number {
  const queryTokens = tokens(query);
  if (!queryTokens.length) return 0;
  const fieldTokens = fields.map(tokens);
  const weightOf = (fieldIndex: number) => fields.length - fieldIndex;
  let score = 0;
  for (const qt of queryTokens) {
    let tokenScore = 0;
    fieldTokens.forEach((ft, fieldIndex) => {
      let best = 0;
      for (const token of ft) {
        if (token === qt) best = Math.max(best, 3);
        else if (token.startsWith(qt)) best = Math.max(best, 2);
        else if (token.includes(qt)) best = Math.max(best, 1);
      }
      tokenScore += best * weightOf(fieldIndex);
    });
    if (tokenScore === 0) return 0;
    score += tokenScore;
  }
  const first = queryTokens[0] as string;
  fieldTokens.forEach((ft, fieldIndex) => {
    if (ft[0]?.startsWith(first)) score += weightOf(fieldIndex);
  });
  return score;
}
