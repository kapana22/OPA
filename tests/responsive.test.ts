import { describe, expect, it } from 'vitest';
import { needsSingleColumn } from '../src/theme/responsive';

describe('adaptive content at native logical screen sizes', () => {
  it('preserves a dense layout on the normal small and large phones', () => {
    expect(needsSingleColumn(375, 1)).toBe(false);
    expect(needsSingleColumn(440, 1)).toBe(false);
  });
  it('gives enlarged Georgian text a full row on iOS and Android', () => {
    expect(needsSingleColumn(375, 2.643)).toBe(true);
    expect(needsSingleColumn(411, 1.5)).toBe(true);
  });
  it('uses logical width rather than the screenshot pixel width', () => {
    expect(needsSingleColumn(320, 1.1)).toBe(true);
    expect(needsSingleColumn(874, 1.5)).toBe(false);
  });
});
