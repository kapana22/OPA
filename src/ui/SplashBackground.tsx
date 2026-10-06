import { memo, useId } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { GamePattern } from './GamePattern';

/** Small flat game symbols stay quieter on reading and playing screens. */
export const SplashBackground = memo(function SplashBackground({
  home = false,
  pattern,
}: { home?: boolean; pattern?: string }) {
  const { width, height } = useWindowDimensions();
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const playing = Boolean(pattern);

  return (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.background}
    >
      <View style={StyleSheet.absoluteFill}>
        <GamePattern width={width} height={height} opacity={home ? 0.26 : playing ? 0.105 : 0.18} />
      </View>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`${id}Shade`} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#130A23" stopOpacity={0.3} />
            <Stop offset="25%" stopColor="#130A23" stopOpacity={0.08} />
            <Stop offset="68%" stopColor="#130A23" stopOpacity={0.12} />
            <Stop offset="100%" stopColor="#10091B" stopOpacity={0.45} />
          </LinearGradient>
          <RadialGradient id={`${id}Glow`} gradientUnits="userSpaceOnUse"
            cx={width * 0.85} cy={height * 0.28} rx={width * 0.95} ry={height * 0.52}>
            <Stop offset="0%" stopColor="#742AD4" stopOpacity={home ? 0.12 : 0.07} />
            <Stop offset="100%" stopColor="#742AD4" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill={`url(#${id}Shade)`} />
        <Rect width={width} height={height} fill={`url(#${id}Glow)`} />
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  background: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#150B27',
    overflow: 'hidden',
  },
});
