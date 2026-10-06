import { Image, StyleSheet, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import type { Player } from '../core/roster';
import { usePlayerCharacter } from './PlayerAvatarView';
import { Colors } from '../theme/theme';
import { turnFade } from './motion';

/** პატარა საჯარო ავატარი — სახელი და თამაშის მოქმედება მთავარ ადგილს ინარჩუნებს. */
export function PlayerCharacter({ player, name, compact = false }: { player?: Player | null; name?: string; compact?: boolean }) {
  const { height } = useWindowDimensions();
  const character = usePlayerCharacter(player, name);
  if (!player && !name) return null;
  const size = Math.min(compact ? 88 : 104, height * 0.16);

  return (
    <Animated.View key={character.name} entering={turnFade} pointerEvents="none"
      accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Image source={character.avatar} resizeMode="contain" accessible={false} style={styles.image} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignSelf: 'center', overflow: 'hidden', backgroundColor: Colors.surfaceHigh, borderWidth: 1, borderColor: Colors.stroke },
  image: { width: '100%', height: '100%' },
});
