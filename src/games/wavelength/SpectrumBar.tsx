import { useLayoutEffect, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { Colors, Space, body, caption } from '../../theme/theme';
import { Haptics } from '../../core/haptics';
import { WavelengthEngine, type Spectrum } from './engine';
import { DIAL, dialPoint, dialSector, dialValue } from './dialGeometry';

export interface SpectrumBarProps {
  spectrum: Spectrum;
  target?: number | null;
  guess?: number | null;
  showBands?: boolean;
  interactive?: boolean;
  onValueChange?: (val: number) => void;
  onSlidingComplete?: () => void;
}
const bandColors = [Colors.phosphorLime, Colors.violet, Colors.softLavender];

/** A covered semicircular dial; no secret geometry is rendered while covered. */
export function SpectrumBar({ spectrum, target, guess, showBands = false, interactive = false, onValueChange, onSlidingComplete }: SpectrumBarProps) {
  const [width, setWidth] = useState(320);
  // ჟესტის დამმუშავებლები ერთხელ იქმნება, ამიტომ უახლეს მნიშვნელობებს ref-იდან კითხულობენ.
  const live = useRef({ width, interactive, onValueChange, onSlidingComplete, guess });
  useLayoutEffect(() => {
    live.current = { width, interactive, onValueChange, onSlidingComplete, guess };
  });
  const start = useRef({ x: 0, y: 0 });
  const lastValue = useRef(guess ?? 0.5);
  const change = (value: number) => {
    if (!live.current.interactive) return;
    const clamped = Math.max(0, Math.min(1, value));
    if (Math.abs(clamped - lastValue.current) >= 0.025) Haptics.tick();
    lastValue.current = clamped;
    live.current.onValueChange?.(clamped);
  };
  const move = (x: number, y: number) => change(dialValue(x, y, live.current.width, lastValue.current));
  // ref-ებს მხოლოდ ჟესტის callback-ები კითხულობენ (რენდერის შემდეგ), არა თავად რენდერი.
  // eslint-disable-next-line react-hooks/refs
  const [responder] = useState(() => PanResponder.create({
    onStartShouldSetPanResponder: () => live.current.interactive,
    onMoveShouldSetPanResponder: () => live.current.interactive,
    onPanResponderGrant: (event) => {
      start.current = { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY };
      lastValue.current = live.current.guess ?? 0.5;
      move(start.current.x, start.current.y);
    },
    onPanResponderMove: (_event, gesture) => move(start.current.x + gesture.dx, start.current.y + gesture.dy),
    onPanResponderRelease: () => { Haptics.medium(); live.current.onSlidingComplete?.(); },
    onPanResponderTerminationRequest: () => false,
  }));
  const visible = target != null;
  const needle = dialPoint(guess ?? 0.5, 126);

  return (
    <View style={styles.root}>
      <Text style={[caption(12, '700'), styles.center, { color: Colors.textSecondary }]}>
        {visible ? 'სამიზნე გახსნილია' : 'სამიზნე დამალულია'}
      </Text>
      <View
        style={{ width: '100%', aspectRatio: DIAL.width / DIAL.height }}
        onLayout={(event) => { if (event.nativeEvent.layout.width > 0) setWidth(event.nativeEvent.layout.width); }}
        accessible={interactive}
        accessibilityRole={interactive ? 'adjustable' : undefined}
        accessibilityLabel="მბრუნავი ისარი — პასუხი"
        accessibilityActions={interactive ? [{ name: 'increment', label: 'მარჯვნივ' }, { name: 'decrement', label: 'მარცხნივ' }] : undefined}
        onAccessibilityAction={(event) => change((live.current.guess ?? 0.5) + (event.nativeEvent.actionName === 'increment' ? 0.01 : -0.01))}
        {...(interactive ? responder.panHandlers : {})}
      >
        <Svg pointerEvents="none" width="100%" height="100%" viewBox={`0 0 ${DIAL.width} ${DIAL.height}`}>
          <Defs>
            <LinearGradient id="dialCover" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={Colors.softLavender} />
              <Stop offset="1" stopColor={Colors.violet} />
            </LinearGradient>
          </Defs>
          <Path d={dialSector(0, 1, 156)} fill={Colors.deepPurple} stroke={Colors.strokeActive} strokeWidth={2} />
          <Path d={dialSector(0, 1)} fill={Colors.warmCream} />
          {visible && showBands ? [...WavelengthEngine.bands].reverse().map((band) => (
            <Path key={band.id} d={dialSector(Math.max(0, target - band.halfWidth), Math.min(1, target + band.halfWidth))}
              fill={bandColors[WavelengthEngine.bands.indexOf(band)]} />
          )) : null}
          {visible && !showBands ? <Path d={dialSector(Math.max(0, target - 0.025), Math.min(1, target + 0.025))} fill={Colors.phosphorLime} /> : null}
          {!visible ? <Path d={dialSector(0, 1)} fill="url(#dialCover)" /> : null}
          {Array.from({ length: 21 }, (_, i) => {
            const a = dialPoint(i / 20, 149), b = dialPoint(i / 20, 153);
            return <Line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={Colors.softLavender} strokeWidth={1.5} />;
          })}
          {visible && showBands ? [-0.1, -0.05, 0, 0.05, 0.1].map((offset, i) => {
            const value = target + offset;
            if (value < 0.02 || value > 0.98) return null;
            const point = dialPoint(value, 127);
            return <SvgText key={i} x={point.x} y={point.y} textAnchor="middle" alignmentBaseline="central" fontSize={11} fontWeight="800"
              fill={i === 1 || i === 3 ? Colors.warmCream : Colors.deepPurple}>{['2', '3', '4', '3', '2'][i]}</SvgText>;
          }) : null}
          {visible ? (() => {
            const point = dialPoint(target, 144);
            return <Circle cx={point.x} cy={point.y} r={4} fill={Colors.phosphorLime} stroke={Colors.deepPurple} strokeWidth={2} />;
          })() : null}
          {guess != null ? <>
            <Line x1={DIAL.cx} y1={DIAL.cy} x2={needle.x} y2={needle.y} stroke={Colors.deepPurple} strokeWidth={10} strokeLinecap="round" />
            <Line x1={DIAL.cx} y1={DIAL.cy} x2={needle.x} y2={needle.y} stroke={Colors.phosphorLime} strokeWidth={5} strokeLinecap="round" />
            <Circle cx={needle.x} cy={needle.y} r={6} fill={Colors.phosphorLime} stroke={Colors.deepPurple} strokeWidth={2} />
          </> : null}
          <Circle cx={DIAL.cx} cy={DIAL.cy} r={24} fill={Colors.deepPurple} />
          <Circle cx={DIAL.cx} cy={DIAL.cy} r={17} fill={Colors.phosphorLime} />
          <Circle cx={DIAL.cx} cy={DIAL.cy} r={6} fill={Colors.deepPurple} />
        </Svg>
      </View>
      <View style={styles.labels}>
        <Text style={[body(16, '700'), styles.label, { color: Colors.textPrimary }]}>◀ {spectrum.left}</Text>
        <Text style={[body(16, '700'), styles.label, { color: Colors.textPrimary, textAlign: 'right' }]}>{spectrum.right} ▶</Text>
      </View>
      {interactive ? <Text style={[caption(12), styles.center, { color: Colors.textSecondary }]}>ისარი თითით მოატრიალეთ</Text> : null}
    </View>
  );
}

export function BandScoreLegend() {
  return <View style={styles.legend}>
    {['4 ქულა', '3 ქულა', '2 ქულა'].map((label, index) => <View key={label} style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: bandColors[index] }]} />
      <Text style={[caption(11, '700'), { color: Colors.textPrimary }]}>{label}</Text>
    </View>)}
  </View>;
}
const styles = StyleSheet.create({
  root: { gap: Space.s, alignSelf: 'stretch' },
  center: { textAlign: 'center' },
  labels: { flexDirection: 'row', justifyContent: 'space-between', gap: 14 },
  label: { flex: 1 },
  legend: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 16, paddingVertical: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
