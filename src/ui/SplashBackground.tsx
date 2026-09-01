import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Path, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Colors } from '../theme/theme';
import { splashPath } from './splashShape';

/**
 * აპის ფონი — **მაგიდა და ლაქა**.
 *
 * პორტი: `Splash/Components/SplashBackground.swift`.
 *
 * iOS-ზე ლაქა `.blur(radius: 60)`-ით რბილდებოდა. RN-ს ასეთი ფილტრი არ აქვს,
 * ამიტომ სირბილეს **რადიალური გრადიენტი** იძლევა — შედეგი იგივეა
 * (გაფანტული ფერის ლაქა კუთხეში), ხერხი კი სხვა.
 */
export function SplashBackground({ tint = Colors.neonCyan }: { tint?: string }) {
  const { width } = useWindowDimensions();
  const size = width * 1.25;
  const d = useMemo(() => splashPath({ lobes: 8, wobble: 0.26, seed: 11, size }), [size]);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.ink, pointerEvents: 'none' }]}>
      <Svg
        width={size}
        height={size}
        style={{ position: 'absolute', left: width * 0.12 - size / 2, top: -width * 0.12 - size / 2 }}
      >
        <Defs>
          <RadialGradient id="stain" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={tint} stopOpacity={0.14} />
            <Stop offset="55%" stopColor={tint} stopOpacity={0.07} />
            <Stop offset="100%" stopColor={tint} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Path d={d} fill="url(#stain)" />
      </Svg>
    </View>
  );
}
