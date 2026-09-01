import { describe, it, expect } from 'vitest';
import { AliasEngine } from '../src/games/alias/engine';
import { BombEngine } from '../src/games/bomb/engine';
import { CharadesEngine } from '../src/games/charades/engine';
import { DareCardEngine } from '../src/games/darecard/engine';
import { HerdEngine } from '../src/games/herd/engine';
import { ImpostorEngine } from '../src/games/impostor/engine';
import { MafiaEngine } from '../src/games/mafia/engine';
import { MostLikelyEngine } from '../src/games/mostlikely/engine';
import { NeverEngine } from '../src/games/never/engine';
import { NoLaughEngine } from '../src/games/nolaugh/engine';
import { PointOneEngine } from '../src/games/pointone/engine';
import { RuleCardEngine } from '../src/games/rulecard/engine';
import { SpyEngine } from '../src/games/spy/engine';
import { StandardsEngine } from '../src/games/standards/engine';
import { TenButEngine } from '../src/games/tenbut/engine';
import { TruthDareEngine } from '../src/games/truthdare/engine';
import { TwoTruthsEngine } from '../src/games/twotruths/engine';
import { WavelengthEngine } from '../src/games/wavelength/engine';
import { WhoAmIEngine } from '../src/games/whoami/engine';
import { WhoWroteEngine } from '../src/games/whowrote/engine';
import { WordRushEngine } from '../src/games/wordrush/engine';

/**
 * ცარიელი როსტერი — თამაშის გახსნა მოთამაშეების გარეშე შესაძლებელია,
 * ამიტომ ვერც ერთი ძრავი ვერ უნდა ჩამოვარდეს. iOS-ის სიმულატორზე
 * აღმოჩნდა, რომ ზოგიერთი „დაწყება“ 0 მოთამაშესთანაც ჩართულია —
 * Swift-შიც ასე იყო, ანუ დაცვა ძრავზეა და არა ღილაკზე.
 */
const ENGINES: [string, new (p: never[]) => { startGame?: () => void }][] = [
  ['alias', AliasEngine as never], ['bomb', BombEngine as never],
  ['charades', CharadesEngine as never], ['darecard', DareCardEngine as never],
  ['herd', HerdEngine as never], ['impostor', ImpostorEngine as never],
  ['mafia', MafiaEngine as never], ['mostlikely', MostLikelyEngine as never],
  ['never', NeverEngine as never], ['nolaugh', NoLaughEngine as never],
  ['pointone', PointOneEngine as never], ['rulecard', RuleCardEngine as never],
  ['spy', SpyEngine as never], ['standards', StandardsEngine as never],
  ['tenbut', TenButEngine as never], ['truthdare', TruthDareEngine as never],
  ['twotruths', TwoTruthsEngine as never], ['wavelength', WavelengthEngine as never],
  ['whoami', WhoAmIEngine as never], ['whowrote', WhoWroteEngine as never],
  ['wordrush', WordRushEngine as never],
];

describe('ცარიელი როსტერი', () => {
  for (const [name, Engine] of ENGINES) {
    it(`${name} — აგება და startGame() არ ვარდება`, () => {
      expect(() => {
        const engine = new Engine([]);
        engine.startGame?.();
      }).not.toThrow();
    });
  }
});
