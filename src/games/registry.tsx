import type React from 'react';
import type { Roster } from '../core/roster';

/**
 * თამაშის ეკრანების რეესტრი.
 *
 * Swift-ში ეს `PartyGame.makeView` იყო — კატალოგშივე ჩაწერილი ჩაკეტვა.
 * აქ ცალკე ფაილია, რომ `catalog.data.json` სუფთა მონაცემად დარჩეს.
 *
 * **ახალი თამაშის ჩართვა = ერთი ხაზი აქ.** რაც რეესტრში არაა, ავტომატურად
 * „მალე“-დ ჩანს — ანუ ნაწილობრივი პორტიც არ ტეხს აპს.
 */
export interface GameFlowProps {
  roster: Roster;
  onExit: () => void;
}

export type GameFlow = React.ComponentType<GameFlowProps>;

const registry: Record<string, GameFlow> = {};

export function registerGame(id: string, flow: GameFlow): void {
  registry[id] = flow;
}

export function gameFlow(id: string): GameFlow | undefined {
  return registry[id];
}

export function isPlayable(id: string): boolean {
  return id in registry;
}
