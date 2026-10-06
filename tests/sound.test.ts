import { createRequire } from 'node:module';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Explicit .js import (resolved to TypeScript) bypasses the engine-only /core/sound alias.
// Keep the real module; only its native audio API and WAV loading are replaced.
const native = vi.hoisted(() => ({ players: [] as MockPlayer[] }));
class MockPlayer {
  playing = false;
  playWhenReady = false;
  removed = false;
  listener?: (status: { didJustFinish: boolean }) => void;
  seeks: { resolve: () => void; reject: () => void }[] = [];
  events: string[] = [];
  play = vi.fn(() => {
    if (this.removed) throw new Error('removed');
    this.playing = this.playWhenReady = true;
    this.events.push('play');
  });
  pause = vi.fn(() => {
    this.playing = this.playWhenReady = false;
    this.events.push('pause');
  });
  seekTo = vi.fn((_seconds: number) => {
    this.events.push('seek');
    return new Promise<void>((resolve, reject) => {
      this.seeks.push({ resolve: () => {
        // Model Media3: seeking from ENDED resumes when playWhenReady is true.
        this.playing = this.playWhenReady;
        resolve();
      }, reject: () => reject(new Error('seek failed')) });
    });
  });
  addListener(_event: string, listener: MockPlayer['listener']) { this.listener = listener; }
  remove = vi.fn(() => { this.removed = true; this.playing = false; });
  finish() { this.playing = false; this.listener?.({ didJustFinish: true }); }
}
vi.mock('expo-audio', () => ({
  createAudioPlayer: () => {
    const player = new MockPlayer();
    native.players.push(player);
    return player;
  },
  setAudioModeAsync: vi.fn(async () => {}),
}));
const assetRequire = createRequire(import.meta.url);
const previousWavLoader = assetRequire.extensions['.wav'];
assetRequire.extensions['.wav'] = (module) => { module.exports = 1; };
const { Sound } = await import('../src/core/sound.js');
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
const tick = () => native.players[0];
beforeEach(() => { Sound.setEnabled(true); Sound.preload(); });
afterEach(() => { Sound.release(); native.players.length = 0; });

describe('real Sound asynchronous playback', () => {
  it('plays once and pauses before rewinding at finish', async () => {
    Sound.play('tick');
    tick().finish();
    expect(tick().events).toEqual(['play', 'pause', 'seek']);
    tick().seeks[0].resolve();
    await flush();
    expect(tick().playing).toBe(false);
    expect(tick().play).toHaveBeenCalledTimes(1);
    Sound.play('tick');
    expect(tick().play).toHaveBeenCalledTimes(2);
  });
  it.each(['stop', 'disable', 'release'] as const)('cancels a pending restart on %s', async (action) => {
    Sound.play('tick'); Sound.play('tick');
    const player = tick();
    if (action === 'stop') Sound.stop();
    if (action === 'disable') { Sound.setEnabled(false); Sound.setEnabled(true); }
    if (action === 'release') Sound.release();
    player.seeks[0].resolve(); await flush();
    expect(player.play).toHaveBeenCalledTimes(1);
    expect(player.playing).toBe(false);
  });
  it('coalesces rapid requests while the native playing flag is false', async () => {
    Sound.play('tick'); Sound.play('tick'); Sound.play('tick'); Sound.play('tick');
    expect(tick().seekTo).toHaveBeenCalledTimes(1);
    tick().seeks[0].resolve(); await flush();
    expect(tick().play).toHaveBeenCalledTimes(2);
  });
  it('waits for stop rewind before a new play and cancels the old restart', async () => {
    Sound.play('tick'); Sound.play('tick'); Sound.stop(); Sound.play('tick');
    expect(tick().play).toHaveBeenCalledTimes(1);
    expect(tick().seekTo).toHaveBeenCalledTimes(1);
    tick().seeks[0].resolve(); await flush();
    expect(tick().play).toHaveBeenCalledTimes(2);
    expect(tick().playing).toBe(true);
  });
  it('waits for a standalone stop seek and a second stop cancels the waiting play', async () => {
    Sound.play('tick'); Sound.stop(); Sound.play('tick'); Sound.stop();
    expect(tick().play).toHaveBeenCalledTimes(1);
    expect(tick().seekTo).toHaveBeenCalledTimes(1);
    tick().seeks[0].resolve(); await flush();
    expect(tick().play).toHaveBeenCalledTimes(1);
    expect(tick().playing).toBe(false);
    Sound.play('tick');
    expect(tick().play).toHaveBeenCalledTimes(2);
  });
  it('does not restart on a rejected seek after stop', async () => {
    Sound.play('tick'); Sound.play('tick'); Sound.stop();
    tick().seeks[0].reject(); await flush();
    expect(tick().play).toHaveBeenCalledTimes(1);
    expect(tick().playing).toBe(false);
  });
  it('waits for finish rewind before a new play', async () => {
    Sound.play('tick'); tick().finish(); Sound.play('tick');
    expect(tick().play).toHaveBeenCalledTimes(1);
    tick().seeks[0].resolve(); await flush();
    expect(tick().play).toHaveBeenCalledTimes(2);
  });
  it('does not play on failed seek; a later request can retry', async () => {
    Sound.play('tick'); Sound.play('tick');
    tick().seeks[0].reject(); await flush();
    expect(tick().play).toHaveBeenCalledTimes(1);
    Sound.play('tick'); tick().seeks[1].resolve(); await flush();
    expect(tick().play).toHaveBeenCalledTimes(2);
  });
  it('ignores events and callbacks from a released player after reloading', async () => {
    Sound.play('tick'); Sound.play('tick'); const old = tick(); Sound.release();
    native.players.length = 0; Sound.play('tick');
    old.finish(); old.seeks[0].resolve(); await flush();
    expect(old.play).toHaveBeenCalledTimes(1);
    expect(old.seekTo).toHaveBeenCalledTimes(1);
    expect(tick().play).toHaveBeenCalledTimes(1);
  });
  it('does not prepare or play when disabled', () => {
    Sound.release(); native.players.length = 0; Sound.setEnabled(false); Sound.play('tick');
    expect(native.players).toHaveLength(0);
  });
});

// Restore the Node asset hook once this test file is done.
afterAll(() => {
  if (previousWavLoader) assetRequire.extensions['.wav'] = previousWavLoader;
  else delete assetRequire.extensions['.wav'];
});
