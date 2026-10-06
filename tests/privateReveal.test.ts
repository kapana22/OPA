import { describe, expect, it, vi } from 'vitest';
import { onPrivateRevealInterruption } from '../src/core/privateReveal';

function appState(currentState = 'active') {
  const listeners = new Set<(state: string) => void>();
  return {
    currentState,
    addEventListener: (_type: 'change', callback: (state: string) => void) => {
      listeners.add(callback);
      return { remove: () => { listeners.delete(callback); } };
    },
    change(state: string) { this.currentState = state; for (const callback of listeners) callback(state); },
  };
}

describe('private reveal interruption', () => {
  it.each(['inactive', 'background'])('closes on %s and stays closed on return', (state) => {
    const source = appState();
    let secretVisible = true;
    onPrivateRevealInterruption(source, () => { secretVisible = false; });
    source.change(state);
    expect(secretVisible).toBe(false);
    source.change('active');
    expect(secretVisible).toBe(false);
  });
  it('closes a reveal mounted while already inactive', () => {
    const conceal = vi.fn();
    onPrivateRevealInterruption(appState('inactive'), conceal);
    expect(conceal).toHaveBeenCalledOnce();
  });
  it('does not touch active state and removes its listener when unmounted', () => {
    const source = appState(), conceal = vi.fn();
    const unsubscribe = onPrivateRevealInterruption(source, conceal);
    source.change('active');
    expect(conceal).not.toHaveBeenCalled();
    unsubscribe();
    source.change('background');
    expect(conceal).not.toHaveBeenCalled();
  });
});
