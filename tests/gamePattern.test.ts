import { describe, expect, it } from 'vitest';
import catalog from '../src/games/catalog.data.json';
import { GAME_PATTERN_IDS, GAME_PATTERN_MOTIFS, createPatternMarks } from '../src/ui/gamePatternData';
import { PATTERN_GLYPHS } from '../src/ui/patternGlyphs';
import { PATTERN_SKETCHES } from '../src/ui/patternSketches';

describe('game background catalog coverage', () => {
  it('includes a rendered, valid motif for every catalog game', () => {
    expect([...GAME_PATTERN_IDS].sort()).toEqual(catalog.map((game) => game.id).sort());
    const marks = createPatternMarks(393, 852);
    for (const game of catalog) {
      const parts = GAME_PATTERN_MOTIFS[game.id];
      expect(parts?.length, game.id).toBeGreaterThan(0);
      for (const part of parts) expect((PATTERN_GLYPHS[part.glyph] ?? PATTERN_SKETCHES[part.glyph])?.length, part.glyph).toBeGreaterThan(0);
      expect(marks.some((mark) => mark.motif === game.id), game.id).toBe(true);
    }
    expect(new Set(marks.map((mark) => mark.motif)).size).toBe(marks.length);
    expect(marks.every((mark) => mark.size <= 26)).toBe(true);
  });
});
