const ARABIC = /[؀-ۿ]/;
const LEFT_TO_RIGHT_MARK = '‎';

/**
 * Latin text such as "Abdullah A." shown inside an Arabic (RTL) layout would
 * have its trailing punctuation moved to the start by the bidi algorithm.
 * Appending a left-to-right mark keeps it in place; Arabic text is unchanged.
 */
export function ltrIsolate(text: string): string {
  return ARABIC.test(text) ? text : `${text}${LEFT_TO_RIGHT_MARK}`;
}
