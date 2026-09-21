import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Colors } from '../theme/theme';

/** A shared quiet backdrop; the home screen gets a small signature accent. */
export function SplashBackground({ home = false }: { home?: boolean }) {
  const { width, height } = useWindowDimensions();
  return (
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { backgroundColor: '#10091B' }]}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="quietBase" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#1B102B" />
            <Stop offset="48%" stopColor="#140C22" />
            <Stop offset="100%" stopColor="#10091B" />
          </LinearGradient>
          <RadialGradient id="quietGlow" gradientUnits="userSpaceOnUse"
            cx={width * 0.35} cy={0} rx={Math.max(width * 0.95, 360)} ry={440}>
            <Stop offset="0%" stopColor="#7045A0" stopOpacity={home ? 0.22 : 0.14} />
            <Stop offset="55%" stopColor="#7045A0" stopOpacity={0.05} />
            <Stop offset="100%" stopColor="#7045A0" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="phosphorGlow" gradientUnits="userSpaceOnUse"
            cx={-width * 0.12} cy={home ? 115 : 50} rx={width * 0.95} ry={home ? 330 : 250}>
            <Stop offset="0%" stopColor={Colors.phosphor} stopOpacity={home ? 0.24 : 0.12} />
            <Stop offset="40%" stopColor={Colors.phosphor} stopOpacity={home ? 0.085 : 0.035} />
            <Stop offset="100%" stopColor={Colors.phosphor} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="violetEdge" gradientUnits="userSpaceOnUse"
            cx={width * 1.2} cy={height * 0.45} rx={width * 0.8} ry={350}>
            <Stop offset="0%" stopColor="#7829FF" stopOpacity={0.22} />
            <Stop offset="100%" stopColor="#7829FF" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#quietBase)" />
        <Rect width={width} height={height} fill="url(#quietGlow)" />
        <Rect width={width} height={height} fill="url(#phosphorGlow)" />
        <Rect width={width} height={height} fill="url(#violetEdge)" />
        {home && (
          <Path d={`M ${width - 41} 164 l 5 -12 M ${width - 29} 173 l 11 -5`}
            stroke={Colors.phosphor} strokeOpacity={0.8} strokeWidth={2.5}
            strokeLinecap="round" fill="none" />
        )}
      </Svg>
    </View>
  );
}
