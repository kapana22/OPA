import { useEffect, useId, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import * as SplashScreen from 'expo-splash-screen';
import { Colors } from '../theme/theme';
import { recordStartupTiming } from '../core/startupTiming';
import { GamePattern } from './GamePattern';

// Match the native splash asset exactly so the handoff has no double logo.
const LOGO = require('../../assets/splash-icon.png');
const PARTICLES = Array.from({ length: 18 }, (_, i) => {
  const angle = (i * 137.5 * Math.PI) / 180;
  const radius = 135 + (i % 5) * 27;
  return {
    x: Math.cos(angle) * radius, y: Math.sin(angle) * radius,
    color: [Colors.lime, Colors.violet, Colors.lavender][i % 3],
    size: 4 + (i % 4) * 2, spin: i % 2 ? 140 : -170,
  };
});
/** A finite, silent brand reveal. Native splash stays until the first branded frame is ready. */
export function LaunchAnimation({ ready, onReveal, onFinish }: {
  ready: boolean; onReveal: (reduceMotion: boolean) => void; onFinish: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const [progress] = useState(() => new Animated.Value(0));
  const [opacity] = useState(() => new Animated.Value(1));
  const reducedMotion = useRef(true);
  const [pulse] = useState(() => new Animated.Value(1));
  const [motionFinished, setMotionFinished] = useState(false);
  const [laidOut, setLaidOut] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const gradientId = `launch${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const logoWidth = Math.min(width * 0.95, 380);
  const spread = Math.min(width / 390, 1.2);
  const interpolate = (inputRange: number[], outputRange: number[]) =>
    progress.interpolate({ inputRange, outputRange, extrapolate: 'clamp' });

  useEffect(() => {
    if (!laidOut || !imageReady) return;
    let cancelled = false;
    const finishMotion = () => { if (!cancelled) setMotionFinished(true); };
    // This timeout ends decorative motion; it never exposes an unprepared app.
    const fallback = setTimeout(finishMotion, 2200);
    let ambient: Animated.CompositeAnimation | undefined;
    void Promise.all([
      SplashScreen.hideAsync().catch(() => {}),
      AccessibilityInfo.isReduceMotionEnabled().catch(() => true),
    ]).then(([, reduceMotion]) => {
      if (cancelled) return;
      reducedMotion.current = reduceMotion;
      recordStartupTiming('animationStarted');
      if (reduceMotion) {
        progress.setValue(0.8);
        finishMotion();
      } else {
        // Continue a gentle light pulse if preparation takes longer than the reveal.
        ambient = Animated.loop(Animated.sequence([
          Animated.timing(pulse, { toValue: 0.65, duration: 700, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]));
        ambient.start();
        Animated.timing(progress, { toValue: 1, duration: 1050, easing: Easing.linear, useNativeDriver: true })
          .start(({ finished }) => { if (finished) finishMotion(); });
      }
    });
    return () => {
      cancelled = true;
      clearTimeout(fallback);
      ambient?.stop();
      progress.stopAnimation();
      pulse.stopAnimation();
    };
  }, [laidOut, imageReady, progress, pulse]);

  useEffect(() => {
    if (!motionFinished || !ready) return;
    onReveal(reducedMotion.current);
    const fade = Animated.timing(opacity, { toValue: 0, duration: 240, useNativeDriver: true });
    fade.start(({ finished }) => { if (finished) onFinish(); });
    return () => fade.stop();
  }, [motionFinished, ready, onReveal, onFinish, opacity]);

  return (
    <Animated.View onLayout={() => setLaidOut(true)} style={[styles.root, { opacity }]}
      accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[StyleSheet.absoluteFill, {
        opacity: interpolate([0, 0.35, 0.7, 1], [0.2, 0.45, 1, 0.8]),
        transform: [{ scale: interpolate([0, 1], [1.06, 1]) }],
      }]}>
        <GamePattern width={width} height={height} opacity={0.14} />
      </Animated.View>
      <Animated.View style={[styles.center, {
        opacity: Animated.multiply(pulse, interpolate([0, 0.2, 0.42, 0.75, 1], [0.15, 0.55, 0.85, 0.7, 0.55])),
        transform: [{ scale: interpolate([0, 0.3, 0.65, 1], [0.6, 0.8, 1.15, 1.1]) }],
      }]}>
        <Svg width={650} height={650} viewBox="0 0 650 650">
          <Defs><RadialGradient id={gradientId} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={Colors.violet} stopOpacity={0.95} />
            <Stop offset="0.4" stopColor={Colors.deepPurple} stopOpacity={0.75} />
            <Stop offset="1" stopColor={Colors.ink} stopOpacity={0} />
          </RadialGradient></Defs>
          <Rect width={650} height={650} fill={`url(#${gradientId})`} />
        </Svg>
      </Animated.View>
      {/* A violet shockwave follows the logo impact, then dissolves. */}
      {[0, 1, 2].map(i => (
        <Animated.View key={`ring${i}`} style={[styles.ring, {
          borderColor: i === 1 ? Colors.lavender : Colors.violet, borderWidth: i === 0 ? 3 : 1,
          opacity: interpolate([0, 0.32 + i * 0.05, 0.43 + i * 0.05, 0.84, 1], [0, 0, 0.6, 0, 0]),
          transform: [
            { scale: interpolate([0, 0.34 + i * 0.05, 0.8, 1], [0.1, 0.2, 3.5, 4]) },
            { rotateX: '24deg' },
          ],
        }]} />
      ))}
      {/* Light streaks accelerate outwards rather than forming a loading spinner. */}
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i * 30 * Math.PI) / 180;
        return <Animated.View key={`ray${i}`} style={[styles.ray, {
          backgroundColor: i % 3 ? Colors.violet : Colors.lavender,
          opacity: interpolate([0, 0.32, 0.46, 0.7, 1], [0, 0, 0.65, 0, 0]),
          transform: [
            { translateX: interpolate([0, 0.32, 0.7, 1], [0, Math.cos(angle) * 35, Math.cos(angle) * width, Math.cos(angle) * width]) },
            { translateY: interpolate([0, 0.32, 0.7, 1], [0, Math.sin(angle) * 35, Math.sin(angle) * width, Math.sin(angle) * width]) },
            { rotate: `${i * 30}deg` }, { scaleX: interpolate([0, 0.4, 0.7, 1], [0.2, 1.5, 0.4, 0.4]) },
          ],
        }]} />;
      })}
      {PARTICLES.map((p, i) => (
        <Animated.View key={`particle${i}`} style={[styles.particle, {
          width: p.size, height: i % 3 ? p.size * 0.4 : p.size, backgroundColor: p.color,
          borderRadius: i % 3 ? 2 : p.size,
          opacity: interpolate([0, 0.15, 0.3, 0.45, 0.8, 1], [0, 0.4, 0.15, 1, 0.65, 0]),
          transform: [
            { translateX: interpolate([0, 0.2, 0.32, 0.55, 1], [p.x * 0.8, p.x * 0.6, p.x * 0.1, p.x * spread, p.x * spread * 1.4]) },
            { translateY: interpolate([0, 0.2, 0.32, 0.55, 1], [p.y * 0.8, p.y * 0.6, p.y * 0.1, p.y * spread, p.y * spread * 1.4 + 45]) },
            { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
          ],
        }]} />
      ))}
      <Animated.Image source={LOGO} resizeMode="contain" fadeDuration={0}
        onLoad={() => setImageReady(true)} onError={() => setImageReady(true)}
        style={{ width: logoWidth, height: logoWidth, transform: [
          { scale: interpolate([0, 0.25, 0.65, 0.85, 1], [200 / logoWidth, 0.7, 1.025, 1, 1]) },
          { rotate: progress.interpolate({ inputRange: [0, 0.3, 0.7, 1], outputRange: ['0deg', '-2deg', '1deg', '0deg'] }) },
        ] }} />

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 1000,
    backgroundColor: Colors.ink, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  center: { position: 'absolute', width: 650, height: 650 },
  ring: { position: 'absolute', width: 180, height: 180, borderRadius: 90 },
  ray: { position: 'absolute', width: 90, height: 2, borderRadius: 2 },
  particle: { position: 'absolute' },

});
