interface AppStateSource {
  currentState: string | null;
  addEventListener(type: 'change', listener: (state: string) => void): { remove(): void };
}

/** ზარი ან აპის შეცვლა საიდუმლოს ხურავს; დაბრუნება მას ავტომატურად არ ხსნის. */
export function onPrivateRevealInterruption(source: AppStateSource, conceal: () => void): () => void {
  const listener = (state: string) => { if (state !== 'active') conceal(); };
  const subscription = source.addEventListener('change', listener);
  if (source.currentState) listener(source.currentState);
  return () => subscription.remove();
}
