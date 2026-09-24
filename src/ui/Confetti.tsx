import { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming, Easing } from 'react-native-reanimated';
import { useEffect } from 'react';
import { Colors } from '../theme/theme';

/**
 * გამარჯვების კონფეტი.
 *
 * პორტი: `Splash/Theme/Confetti.swift` — იგივე 40 ნაჭერი, იგივე დეტერმინისტული
 * თესლი (42), ამიტომ ყოველ გამარჯვებაზე ერთი და იგივე „ფეთქება“ ხდება.
 */

const COLORS = [Colors.neonCyan, Colors.neonMagenta, Colors.phosphor, Colors.neonCyan, Colors.neonMagenta];

/** Swift-ის `SplashRandom`-ის მსუბუქი ვარიანტი — ნაჭრებისთვის საკმარისი. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s % 10000) / 10000;
  };
}

function Piece({
  x,
  delay,
  duration,
  size,
  spin,
  color,
  isCircle,
  height,
}: {
  x: number;
  delay: number;
  duration: number;
  size: number;
  spin: number;
  color: string;
  isCircle: boolean;
  height: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay * 1000,
      withTiming(1, { duration: duration * 1000, easing: Easing.in(Easing.quad) }),
    );
  }, [delay, duration, progress]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: -40 + progress.value * (height + 80) },
      { rotate: `${progress.value * spin}deg` },
    ],
    opacity: 1 - progress.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x,
          width: size,
          height: size * (isCircle ? 1 : 1.6),
          borderRadius: isCircle ? size / 2 : 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

export function Confetti({ count = 40 }: { count?: number }) {
  const { width, height } = useWindowDimensions();
  // „მოძრაობის შემცირება“ ჩართულია — ცვენა-ტრიალს არ ვაჩვენებთ.
  const reduceMotion = useReducedMotion();

  const pieces = useMemo(() => {
    const next = rng(42);
    return Array.from({ length: count }, (_, i) => ({
      key: i,
      x: next() * width,
      delay: next() * 0.5,
      duration: 1.6 + next() * 1.2,
      size: 6 + next() * 8,
      spin: (next() - 0.5) * 900,
      color: COLORS[i % COLORS.length],
      isCircle: next() > 0.55,
    }));
  }, [count, width]);

  if (reduceMotion) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      {pieces.map(({ key, ...p }) => (
        <Piece key={key} {...p} height={height} />
      ))}
    </View>
  );
}
