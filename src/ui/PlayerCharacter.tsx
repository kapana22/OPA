import { Image, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import type { Player } from '../core/roster';
import { usePlayerCharacter } from './PlayerAvatarView';
import { Colors } from '../theme/theme';

/** Public player identity only: never varies by hidden game role. */
export function PlayerCharacter({ player, name, compact = false }: { player?: Player | null; name?: string; compact?: boolean }) {
  const { width, height } = useWindowDimensions();
  const character = usePlayerCharacter(player, name);
  if (!player && !name) return null;
  const size = Math.min(width - 64, compact ? 150 : 285, height * (compact ? 0.2 : 0.34));
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden
    style={{ height: size, width: size, alignSelf: 'center' }}>
    <Svg width={size} height={size} style={{ position: 'absolute' }}>
      <Defs><RadialGradient id="characterHalo" cx="50%" cy="60%" rx="50%" ry="48%">
        <Stop offset="0%" stopColor={Colors.phosphor} stopOpacity={0.17} />
        <Stop offset="100%" stopColor={Colors.phosphor} stopOpacity={0} />
      </RadialGradient></Defs>
      <Rect width={size} height={size} fill="url(#characterHalo)" />
    </Svg>
    <Image source={character.image} resizeMode="contain" accessible={false} style={{ width: '100%', height: '100%' }} />
  </View>;
}
