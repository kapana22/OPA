import { useSyncExternalStore } from 'react';

/**
 * Swift-ის `@Observable`-ის ანალოგი.
 *
 * **რატომ ასე და არა Zustand.** ძრავები Swift-ში სუფთა კლასებია — არც UI იციან,
 * არც ჩარჩო. სწორედ ამიტომ იტესტებიან ტელეფონის გარეშე. თუ ძრავს Zustand-ის
 * store-ად გადავაკეთებდით, პორტი აღარ იქნებოდა ერთი-ერთზე და ტესტს React
 * დასჭირდებოდა.
 *
 * ამიტომ: ძრავი რჩება ჩვეულებრივ კლასად, ცვლილებას კი `notify()`-ით აცხადებს.
 * `@Observable` ამას ავტომატურად აკეთებდა; აქ ცხადია — და სწორედ ამიტომ
 * გამართვადიც.
 */
export abstract class Observable {
  private listeners = new Set<() => void>();
  private version = 0;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): number => this.version;

  /** მდგომარეობა შეიცვალა — ხედებმა თავიდან უნდა დაიხატონ. */
  protected notify(): void {
    this.version += 1;
    for (const listener of [...this.listeners]) listener();
  }
}

/** ძრავზე გამოწერა React-ის მხრიდან. */
export function useObservable<T extends Observable>(engine: T): T {
  useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot);
  return engine;
}
