type MotifPart = { glyph: string; x?: number; y?: number; scale?: number };

/** Each catalog game gets its own readable outline motif; compound marks tell its story. */
export const GAME_PATTERN_MOTIFS: Record<string, MotifPart[]> = {
  noyesno: [{ glyph: 'ChoiceBubbles' }],
  mostlikely: [{ glyph: 'HandPointing' }],
  herd: [{ glyph: 'UsersThree' }],
  standards: [{ glyph: 'ChatLine' }],
  tenbut: [{ glyph: 'RatingCard' }],
  impostor: [{ glyph: 'SecretCards' }],
  spy: [{ glyph: 'Detective' }],
  charades: [{ glyph: 'HeadsUpSketch' }],
  bomb: [{ glyph: 'Bomb' }],
  mafia: [{ glyph: 'MaskSad', y: 42, scale: 0.83 }, { glyph: 'MoonStars', x: 135, y: -3, scale: 0.46 }],
  whowrote: [{ glyph: 'SecretNote' }],
  twotruths: [{ glyph: 'CheckCircle', scale: 0.5 }, { glyph: 'CheckCircle', x: 128, scale: 0.5 }, { glyph: 'XCircle', x: 64, y: 127, scale: 0.5 }],
  never: [{ glyph: 'HandPalm' }],
  nolaugh: [{ glyph: 'SmileyWink' }],
  alias: [{ glyph: 'Megaphone' }],
  wavelength: [{ glyph: 'WavelengthDial' }],
  whoami: [{ glyph: 'UserFocus', scale: 0.85, y: 32 }, { glyph: 'Question', x: 145, scale: 0.43 }],
  wordrush: [{ glyph: 'Timer' }],
  rulecard: [{ glyph: 'ClipboardText' }],
  darecard: [{ glyph: 'Cards' }, { glyph: 'Lightning', x: 89, y: 72, scale: 0.49 }],
  truthdare: [{ glyph: 'SpinningBottle' }],
  dice: [{ glyph: 'DiceFive' }],
  cheers: [{ glyph: 'Champagne' }],
  confetti: [{ glyph: 'Confetti' }],
  crown: [{ glyph: 'Crown' }],
  music: [{ glyph: 'MusicNotes' }],
  star: [{ glyph: 'Sparkle' }],
  heart: [{ glyph: 'Heart' }],
  microphone: [{ glyph: 'Microphone' }],
  sunglasses: [{ glyph: 'Sunglasses' }],
  martini: [{ glyph: 'Martini' }],
  eye: [{ glyph: 'Eye' }],
  bullseye: [{ glyph: 'Target' }],
  chat: [{ glyph: 'ChatCircleDots' }],
  theater: [{ glyph: 'MaskHappy' }],
  three: [{ glyph: 'DiceThree' }],
  trophy: [{ glyph: 'Trophy' }],
  controller: [{ glyph: 'GameController' }],
  puzzle: [{ glyph: 'PuzzlePiece' }],
  fire: [{ glyph: 'Fire' }],
  idea: [{ glyph: 'Lightbulb' }],
  hourglass: [{ glyph: 'Hourglass' }],
  ghost: [{ glyph: 'Ghost' }],
  alien: [{ glyph: 'Alien' }],
  rocket: [{ glyph: 'Rocket' }],
  gift: [{ glyph: 'Gift' }],
  cake: [{ glyph: 'Cake' }],
  popcorn: [{ glyph: 'Popcorn' }],
  pizza: [{ glyph: 'Pizza' }],
  icecream: [{ glyph: 'IceCream' }],
  burger: [{ glyph: 'Hamburger' }],
  wine: [{ glyph: 'Wine' }],
  cookie: [{ glyph: 'Cookie' }],
  headphones: [{ glyph: 'Headphones' }],
  ticket: [{ glyph: 'Ticket' }],
  guitar: [{ glyph: 'Guitar' }],
  balloon: [{ glyph: 'Balloon' }],
  spade: [{ glyph: 'Spade' }],
  club: [{ glyph: 'Club' }],
  diamond: [{ glyph: 'Diamond' }],
  domino: [{ glyph: 'DominoSketch' }],
  duel: [{ glyph: 'DuelSketch' }],
  go: [{ glyph: 'GoSketch' }],
  tally: [{ glyph: 'TallySketch' }],
  play: [{ glyph: 'PlaySketch' }],
  coin: [{ glyph: 'CoinSketch' }],
  wink: [{ glyph: 'WinkSketch' }],
  finish: [{ glyph: 'FinishSketch' }],
};

export const GAME_PATTERN_IDS = [
  'noyesno', 'mostlikely', 'herd', 'standards', 'tenbut', 'impostor', 'spy', 'charades',
  'bomb', 'mafia', 'whowrote', 'twotruths', 'never', 'nolaugh', 'alias', 'wavelength',
  'whoami', 'wordrush', 'rulecard', 'darecard', 'truthdare',
] as const;

type Mark = { motif: string; x: number; y: number; size: number; angle: number; accent: boolean; cream: boolean; strength: number };

/** A whole-screen composition: each motif appears once, without a repeating tile. */
export function createPatternMarks(width: number, height: number): readonly Mark[] {
  let seed = 731905;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
  const motifs = Object.keys(GAME_PATTERN_MOTIFS);
  for (let i = motifs.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [motifs[i], motifs[j]] = [motifs[j], motifs[i]];
  }
  const marks: Mark[] = [];
  for (const motif of motifs) {
    let best = { x: 0, y: 0, gap: -Infinity };
    const size = 17 + random() * 9;
    // Fewer candidates and a small score variation keep the field organic,
    // while the distance penalty prevents colliding principal symbols.
    for (let attempt = 0; attempt < 14; attempt++) {
      const x = 8 + random() * Math.max(0, width - 16);
      const y = 8 + random() * Math.max(0, height - 16);
      const gap = Math.min(...marks.map((mark) => Math.hypot(x - mark.x, y - mark.y) - (size + mark.size) / 2));
      const score = gap + random() * 16;
      if (score > best.gap) best = { x, y, gap: score };
    }
    marks.push({ motif, x: best.x, y: best.y, size, angle: random() * 96 - 48,
      accent: random() < 0.07, cream: random() < 0.32, strength: 0.6 + random() * 0.25 });
  }
  return marks;
}
