import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Colors, body, caption } from '../../theme/theme';
import { WavelengthEngine, type Spectrum } from './engine';

/**
 * შკალა ორი პოლუსით, ქულის ზოლებითა და ნიშნულებით.
 *
 * პორტი: `Splash/Games/Wavelength/WavelengthSpectrumBar.swift`.
 * `target` მხოლოდ მაშინ გადმოეცემა, როცა სამიზნე უკვე ჩანს — თორემ ეკრანი
 * პასუხს გასცემდა.
 */

const BAR_HEIGHT = 56;
const OVERHANG = 12;
const WIDTH = 300;

function bandOpacity(points: number): number {
  if (points === 4) return 0.42;
  if (points === 3) return 0.24;
  if (points === 2) return 0.16;
  return 0.1;
}

export function SpectrumBar({
  spectrum,
  target,
  guess,
  showBands = false,
}: {
  spectrum: Spectrum;
  target?: number | null;
  guess?: number | null;
  showBands?: boolean;
}) {
  return (
    <View style={{ gap: 12 }}>
      <View style={{ height: BAR_HEIGHT + OVERHANG * 2 }}>
        <Svg width="100%" height={BAR_HEIGHT + OVERHANG * 2} viewBox={`0 0 ${WIDTH} ${BAR_HEIGHT + OVERHANG * 2}`}>
          <Defs>
            <LinearGradient id="spectrum" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor={Colors.neonCyan} />
              <Stop offset="50%" stopColor={Colors.phosphor} />
              <Stop offset="100%" stopColor={Colors.neonMagenta} />
            </LinearGradient>
          </Defs>

          <Rect x={0} y={OVERHANG} width={WIDTH} height={BAR_HEIGHT} rx={BAR_HEIGHT / 2} fill="url(#spectrum)" />

          {/* ქულის ზოლები — ვიწროდან განიერისკენ, რომ ცენტრი ყველაზე ნათელი იყოს */}
          {showBands && target != null
            ? [...WavelengthEngine.bands]
                .sort((a, b) => b.halfWidth - a.halfWidth)
                .map((band) => (
                  <Rect
                    key={band.id}
                    x={Math.max(0, WIDTH * (target - band.halfWidth))}
                    y={OVERHANG}
                    width={Math.min(WIDTH, WIDTH * band.halfWidth * 2)}
                    height={BAR_HEIGHT}
                    fill="#FFFFFF"
                    opacity={bandOpacity(band.points)}
                  />
                ))
            : null}

          {target != null ? <Needle value={target} color={Colors.textPrimary} filled /> : null}
          {guess != null ? <Needle value={guess} color={Colors.phosphor} filled={false} /> : null}
        </Svg>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <Text style={[body(14, '700'), { color: Colors.neonCyan, flex: 1 }]} numberOfLines={3}>
          {spectrum.left}
        </Text>
        <Text style={[body(14, '700'), { color: Colors.neonMagenta, flex: 1, textAlign: 'right' }]} numberOfLines={3}>
          {spectrum.right}
        </Text>
      </View>
    </View>
  );
}

function Needle({ value, color, filled }: { value: number; color: string; filled: boolean }) {
  const x = WIDTH * value;
  return (
    <>
      <Rect x={x - 2} y={OVERHANG + 2} width={4} height={BAR_HEIGHT - 4} rx={2} fill={color} />
      <Rect
        x={x - 8}
        y={OVERHANG - 12}
        width={16}
        height={16}
        rx={8}
        fill={filled ? color : Colors.ink}
        stroke={color}
        strokeWidth={3}
      />
    </>
  );
}

/** ზოლების ლეგენდა — რომელი სიგანე რამდენ ქულას ნიშნავს. */
export function BandLegend() {
  return (
    <View style={styles.legend}>
      {WavelengthEngine.bands.map((band) => (
        <View key={band.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View
            style={{
              width: (6 - band.points) * 5 + 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: '#FFFFFF',
              opacity: band.points === 4 ? 0.75 : band.points * 0.14,
            }}
          />
          <Text style={[caption(12), { color: Colors.textSecondary, fontVariant: ['tabular-nums'] }]}>
            {band.points}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
});
