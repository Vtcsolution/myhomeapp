/**
 * The brand palette must keep text readable (WCAG 2.2 AA: 4.5:1 for normal
 * text) on every surface it is used on, in light and dark mode.
 */
import { describe, expect, it } from 'vitest';
import { brand } from './brand.config';

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  );
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

describe.each(['light', 'dark'] as const)('%s palette', (scheme) => {
  const p = brand.palette[scheme];
  const surfaces = { background: p.background, surface: p.surface, surfaceMuted: p.surfaceMuted };

  it.each([
    'textPrimary',
    'textSecondary',
    'textMuted',
    'accentText',
    'warningText',
    'successText',
  ] as const)('%s is readable on every surface', (token) => {
    for (const [name, bg] of Object.entries(surfaces)) {
      expect({ token, on: name, ratio: +contrast(p[token], bg).toFixed(2) }).toEqual(
        expect.objectContaining({ ratio: expect.toSatisfy((r: number) => r >= 4.5) }),
      );
    }
  });

  it('accent text is readable on the soft accent badge tint', () => {
    expect(contrast(p.accentText, p.accentSoft)).toBeGreaterThanOrEqual(4.5);
  });

  it('button labels are readable on primary and accent fills', () => {
    expect(contrast(p.onPrimary, p.primary)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.onAccent, p.accent)).toBeGreaterThanOrEqual(4.5);
  });
});
