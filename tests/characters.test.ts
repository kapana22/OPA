import { beforeEach, describe, expect, it } from 'vitest';
import { Roster } from '../src/core/roster';
import { __resetForTests, setJSON } from '../src/core/storage';

beforeEach(() => __resetForTests());
describe('player characters', () => {
  it('assigns twelve distinct IDs and preserves identity through rename, reorder, scores and reload', () => {
    const roster = new Roster();
    for (let i = 0; i < 12; i++) roster.add(`player ${i}`);
    expect(new Set(roster.players.map(p => p.characterID)).size).toBe(12);
    const original = Object.fromEntries(roster.players.map(p => [p.id, p.characterID]));
    const id = roster.players[0].id;
    roster.rename(id, 'გიო'); roster.move(0, 4); roster.addScore(3, id); roster.resetScores();
    const reloaded = new Roster();
    expect(Object.fromEntries(reloaded.players.map(p => [p.id, p.characterID]))).toEqual(original);
  });
  it('reuses the available character after removing a player', () => {
    const r = new Roster(); for (let i = 0; i < 12; i++) r.add(String(i));
    const freed = r.players[5].characterID; r.removeAt(5); r.add('new');
    expect(r.players[11].characterID).toBe(freed);
  });
  it('migrates old, duplicate and invalid IDs without losing names or scores', () => {
    setJSON('splash.roster.v1', [
      { id: 'a', name: 'გიო', score: 3, characterID: 4 },
      { id: 'b', name: 'ნინო', score: 2, characterID: 4 },
      { id: 'c', name: 'ანა', score: 1, characterID: 99 },
      { id: 'd', name: 'დათო', score: 0 },
    ]);
    const r = new Roster(); expect(r.players[0].characterID).toBe(4);
    expect(new Set(r.players.map(p => p.characterID)).size).toBe(4);
    expect(r.players.map(p => p.score)).toEqual([3, 2, 1, 0]);
    expect(new Roster().players).toEqual(r.players);
  });
  it('swaps occupied choices and rejects invalid IDs', () => {
    const r = new Roster(); r.add('a'); r.add('b');
    const [a, b] = r.players; const oldA = a.characterID; const oldB = b.characterID;
    const genderB = b.gender;
    r.setCharacter(a.id, oldB!); expect(a.characterID).toBe(oldB);
    // მეორე არასოდეს დუბლირდება, სქესს ინარჩუნებს და თავისუფალს იღებს (ან ადგილს ცვლის).
    expect(b.characterID).not.toBe(oldB); expect(b.gender).toBe(genderB);
    expect(b.characterID === oldA || !r.players.some((p) => p !== b && p.characterID === b.characterID)).toBe(true);
    r.setCharacter(a.id, 12); expect(a.characterID).toBe(oldB);
  });
  it('taking a girl character from a girl keeps her a girl', () => {
    const r = new Roster(); r.add('მარი'); r.add('გიო', 'boy');
    const [mari, gio] = r.players;
    r.setCharacter(gio.id, mari.characterID!);
    expect(mari.gender).toBe('girl');
    expect([1, 3, 5, 7, 9]).toContain(mari.characterID);
    expect(mari.characterID).not.toBe(gio.characterID);
  });
  it('assigns correct girl characters for female names and allows toggling gender', () => {
    const r = new Roster();
    r.add('მარი');
    expect(r.players[0].gender).toBe('girl');
    expect([1, 3, 5, 7, 9]).toContain(r.players[0].characterID);

    r.add('გიო', 'boy');
    expect(r.players[1].gender).toBe('boy');
    expect([0, 2, 4, 6, 8, 10, 11]).toContain(r.players[1].characterID);

    // Toggle gender of player 0
    r.setGender(r.players[0].id, 'boy');
    expect(r.players[0].gender).toBe('boy');
    expect([0, 2, 4, 6, 8, 10, 11]).toContain(r.players[0].characterID);
  });
  it('preserves manual gender and portrait after reloading a recognized name', () => {
    const r = new Roster(); r.add('მარი');
    r.setGender(r.players[0].id, 'boy');
    const selected = r.players[0].characterID;
    const restored = new Roster().players[0];
    expect(restored.gender).toBe('boy');
    expect(restored.characterID).toBe(selected);
  });

});


describe('player names', () => {
  it('rejects duplicate renames after trimming and case folding, including after reload', () => {
    const roster = new Roster();
    roster.add('Ana');
    roster.add('Gio');
    const id = roster.players[1].id;
    roster.rename(id, '  aNA  ');
    expect(roster.names).toEqual(['Ana', 'Gio']);
    expect(new Roster().names).toEqual(['Ana', 'Gio']);
    roster.rename(id, '  Nino  ');
    expect(new Roster().names).toEqual(['Ana', 'Nino']);
  });
});
