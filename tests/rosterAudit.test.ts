import { beforeEach, describe, expect, it } from 'vitest';
import { Roster, MAX_PLAYERS } from '../src/core/roster';
import { __resetForTests } from '../src/core/storage';

describe('როსტერი — დამატება, წაშლა, დაბრუნება', () => {
  beforeEach(() => __resetForTests());

  it('დამატება შედეგს აბრუნებს და დუბლიკატს უარყოფს', () => {
    const roster = new Roster();
    expect(roster.add('  ')).toBe('empty');
    expect(roster.add('ანა')).toBe('added');
    expect(roster.add(' ანა ')).toBe('duplicate');
    for (let i = 1; i < MAX_PLAYERS; i++) roster.add(`p${i}`);
    expect(roster.add('ზედმეტი')).toBe('full');
  });

  it('წაშლილი იმავე ადგილზე, ქულით ბრუნდება', () => {
    const roster = new Roster();
    roster.add('ა'); roster.add('ბ'); roster.add('გ');
    const b = { ...roster.players[1] };
    roster.addScore(5, b.id);
    const scored = { ...roster.players[1] };
    roster.remove(b.id);
    roster.restore(scored, 1);
    expect(roster.names).toEqual(['ა', 'ბ', 'გ']);
    expect(roster.players[1].score).toBe(5);
    // მეორედ დაბრუნება დუბლიკატს არ ქმნის
    roster.restore(scored, 1);
    expect(roster.count).toBe(3);
  });

  it('დაკავებული პერსონაჟი დაბრუნებისას თავისუფლით იცვლება', () => {
    const roster = new Roster();
    roster.add('ა');
    const a = { ...roster.players[0] };
    roster.remove(a.id);
    roster.add('ბ');
    roster.setCharacter(roster.players[0].id, a.characterID!);
    roster.restore(a, 0);
    const ids = roster.players.map((p) => p.characterID);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('გადარქმევა სხვის სახელზე false-ს აბრუნებს', () => {
    const roster = new Roster();
    roster.add('ანა'); roster.add('გიო');
    expect(roster.rename(roster.players[1].id, 'ᲐᲜᲐ'.toLowerCase())).toBe(false);
    expect(roster.rename(roster.players[1].id, 'ნინო')).toBe(true);
  });
});

import { vi } from 'vitest';
import { GamePause, Ticker } from '../src/core/ticker';

describe('თამაშის საერთო პაუზა', () => {
  it('პაუზისას Ticker ტიკს ტოვებს, მოხსნისას აგრძელებს', () => {
    vi.useFakeTimers();
    let ticks = 0;
    const t = new Ticker();
    t.start(1, () => ticks++);
    vi.advanceTimersByTime(2000);
    GamePause.hold('exit-dialog');
    GamePause.hold('background');
    vi.advanceTimersByTime(3000);
    GamePause.release('exit-dialog');
    vi.advanceTimersByTime(1000);
    expect(ticks).toBe(2); // ერთი მიზეზი ჯერ კიდევ მოქმედებს
    GamePause.release('background');
    vi.advanceTimersByTime(2000);
    expect(ticks).toBe(4);
    t.stop();
    vi.useRealTimers();
  });
});
