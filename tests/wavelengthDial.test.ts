import { describe, expect, it } from 'vitest';
import { DIAL, dialPoint, dialValue } from '../src/games/wavelength/dialGeometry';
describe('semicircular dial touch input', () => {
  it.each([240, 320, 390, 768])('matches rendered angles at width %s', (width) => {
    for (const value of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
      const p = dialPoint(value, 120);
      expect(dialValue(p.x * width / DIAL.width, p.y * width / DIAL.width, width, 0.5)).toBeCloseTo(value, 8);
    }
  });
  it('maps the top to the center and both ends to their poles', () => {
    expect(dialValue(160, 30, 320, 0)).toBe(0.5);
    expect(dialValue(14, 176, 320, 0.5)).toBe(0);
    expect(dialValue(306, 176, 320, 0.5)).toBe(1);
  });
  it('keeps the last answer at the hub and ignores invalid layout', () => {
    expect(dialValue(160, 176, 320, 0.72)).toBe(0.72);
    expect(dialValue(160, 170, 320, 0.72)).toBe(0.72);
    expect(dialValue(160, 10, 0, 0.72)).toBe(0.72);
    expect(dialValue(NaN, 10, 320, 0.72)).toBe(0.72);
  });
});
