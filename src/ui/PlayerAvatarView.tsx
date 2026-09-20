import React from 'react';
import { Image, View } from 'react-native';
import { Colors, glow } from '../theme/theme';
import { stainSeed } from '../theme/playerPalette';
import type { Player } from '../core/roster';
import { isCharacterID } from '../core/characters';
import { useRoster } from '../state/state';
import { PLAYER_CHARACTERS } from './playerCharacters';

export interface PlayerAvatarViewProps {
  player?: Player;
  name?: string;
  color?: string;
  index?: number;
  size?: number;
  glowing?: boolean;
  mascotID?: number;
}
export function usePlayerCharacter(player?: Player | null, name?: string) {
  const roster = useRoster();
  const resolved = player ?? roster.players.find(p => p.name === name);
  const id = isCharacterID(resolved?.characterID) ? resolved.characterID : stainSeed(resolved?.id ?? name ?? '') % PLAYER_CHARACTERS.length;
  return PLAYER_CHARACTERS[id];
}
export function PlayerAvatarView({ player, name = player?.name ?? '', color, size = 36, glowing = false }: PlayerAvatarViewProps) {
  const character = usePlayerCharacter(player, name);
  const borderColor = glowing ? Colors.phosphor : color ?? character.color;
  return <View accessibilityLabel={`მოთამაშე: ${name}`} style={{ width: size, height: size, borderRadius: size / 2,
    backgroundColor: Colors.surfaceHigh, borderColor, borderWidth: glowing ? 2 : 1,
    ...glow(borderColor, glowing ? 'medium' : 'soft') }}>
    <Image source={character.avatar} resizeMode="contain" accessible={false}
      style={{ width: '100%', height: '100%', borderRadius: size / 2 }} />
  </View>;
}
