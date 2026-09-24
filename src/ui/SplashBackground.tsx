import { memo, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Mask, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Colors } from '../theme/theme';
import { PATTERN_GLYPHS } from './patternGlyphs';

/**
 * საერთო ფონი. `pattern` — თამაშის id: ნახატი ამ თამაშის თემაზე იქნება.
 * `memo`: ტაიმერიან თამაშებში მასპინძელი ხშირად ხელახლა იხატება — ფონი არა.
 */
export const SplashBackground = memo(function SplashBackground({ home = false, pattern }: { home?: boolean; pattern?: string }) {
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
        <PartyPattern width={width} height={height} theme={pattern} />
        {home && (
          <Path d={`M ${width - 41} 164 l 5 -12 M ${width - 29} 173 l 11 -5`}
            stroke={Colors.phosphor} strokeOpacity={0.8} strokeWidth={2.5}
            strokeLinecap="round" fill="none" />
        )}
      </Svg>
    </View>
  );
});

/**
 * წვეულების საგნები ფონზე — კამათელი, ჯაშუში, ბოთლი, ბარათები, ნიღბები,
 * ბუშტი, პოპკორნი... ქაოსურად მიმოფანტული, სხვადასხვა ზომითა და კუთხით, როგორც
 * მაგიდაზე დაყრილი. **უძრავია** და მკრთალი — განწყობას ქმნის, ტექსტს არ ეჯიბრება.
 * ზემოთ ოდნავ ქრება, რომ სათაურები სუფთად იკითხებოდეს.
 *
 * განლაგება ფიქსირებული თესლითაა — ეკრანიდან ეკრანზე არაფერი „ხტება“.
 * თამაშის ეკრანზე (`pattern`) მხოლოდ თესლი იცვლება: ნახატი იგივე სტილისაა,
 * ოღონდ სხვანაირად დაყრილი.
 */
const PARTY = Object.keys(PATTERN_GLYPHS);
const TINTS = [Colors.softLavender, Colors.softLavender, Colors.warmCream, Colors.phosphor];

function seeded(seed: number) {
  let v = seed >>> 0;
  return () => {
    v = (v * 1664525 + 1013904223) >>> 0;
    return v / 4294967296;
  };
}

function PartyPattern({ width, height, theme }: { width: number; height: number; theme?: string }) {
  const items = useMemo(() => {
    const rnd = seeded(23 + (theme ? theme.length * 97 + theme.charCodeAt(0) * 13 : 0));
    const out: { x: number; y: number; r: number; size: number; glyph: string; tint: string; op: number }[] = [];
    // „ქაოსი“, მაგრამ არა გროვა: შემთხვევითი წერტილები მინიმალური დაშორებით.
    const target = Math.round((width * height) / 2600);
    let tries = 0;
    const bag = [...PARTY];
    while (out.length < target && tries++ < target * 30) {
      const size = 18 + rnd() * 20;
      const x = rnd() * (width + 20) - 10;
      const y = rnd() * (height + 20) - 10;
      const min = (size + 30) / 2;
      if (out.some((o) => Math.hypot(o.x + o.size / 2 - x - size / 2, o.y + o.size / 2 - y - size / 2) < min + o.size / 2)) continue;
      if (bag.length === 0) bag.push(...PARTY);
      const glyph = bag.splice(Math.floor(rnd() * bag.length), 1)[0];
      const tint = TINTS[Math.floor(rnd() * TINTS.length)];
      out.push({ x, y, size, glyph, tint, r: Math.round((rnd() - 0.5) * 80), op: tint === Colors.phosphor ? 0.1 : 0.075 });
    }

    // კოსმოსი ხატულებს შორის: წვრილი წერტილები (ვარსკვლავები), იშვიათი
    // ნაპერწკლები, რგოლები და პლუსები. ხატულებზე არ ედება.
    const dust: { x: number; y: number; kind: 'dot' | 'spark' | 'ring' | 'plus'; size: number; tint: string; op: number }[] = [];
    const inIcon = (x: number, y: number) =>
      out.some((o) => x > o.x - 4 && x < o.x + o.size + 4 && y > o.y - 4 && y < o.y + o.size + 4);
    const dustCount = Math.round((width * height) / 900);
    for (let k = 0; k < dustCount; k++) {
      const x = rnd() * width;
      const y = rnd() * height;
      if (inIcon(x, y)) continue;
      const roll = rnd();
      const kind = roll < 0.84 ? 'dot' : roll < 0.93 ? 'spark' : roll < 0.97 ? 'ring' : 'plus';
      const tint = rnd() < 0.18 ? Colors.phosphor : rnd() < 0.5 ? Colors.warmCream : Colors.softLavender;
      dust.push({
        x,
        y,
        kind,
        tint,
        size: kind === 'dot' ? 0.6 + rnd() * rnd() * 1.8 : 3 + rnd() * 3.5,
        op: kind === 'dot' ? 0.12 + rnd() * 0.3 : 0.14 + rnd() * 0.14,
      });
    }
    return { icons: out, dust };
  }, [width, height, theme]);

  return (
    <>
      <Defs>
        <LinearGradient id="patternFade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.35} />
          <Stop offset="0.35" stopColor="#FFFFFF" stopOpacity={0.85} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={1} />
        </LinearGradient>
        <Mask id="patternMask" maskUnits="userSpaceOnUse" x={0} y={0} width={width} height={height}>
          <Rect width={width} height={height} fill="url(#patternFade)" />
        </Mask>
      </Defs>
      <G mask="url(#patternMask)">
        {items.dust.map((d, i) =>
          d.kind === 'dot' ? (
            <Circle key={`d${i}`} cx={d.x} cy={d.y} r={d.size} fill={d.tint} fillOpacity={d.op} />
          ) : d.kind === 'ring' ? (
            <Circle key={`d${i}`} cx={d.x} cy={d.y} r={d.size} fill="none" stroke={d.tint} strokeOpacity={d.op} strokeWidth={1} />
          ) : d.kind === 'plus' ? (
            <Path
              key={`d${i}`}
              d={`M${d.x - d.size} ${d.y} H${d.x + d.size} M${d.x} ${d.y - d.size} V${d.y + d.size}`}
              stroke={d.tint}
              strokeOpacity={d.op}
              strokeWidth={1.2}
              strokeLinecap="round"
            />
          ) : (
            // ოთხქიმიანი ნაპერწკალი
            <Path
              key={`d${i}`}
              d={`M${d.x} ${d.y - d.size} Q${d.x} ${d.y} ${d.x + d.size} ${d.y} Q${d.x} ${d.y} ${d.x} ${d.y + d.size} Q${d.x} ${d.y} ${d.x - d.size} ${d.y} Q${d.x} ${d.y} ${d.x} ${d.y - d.size} Z`}
              fill={d.tint}
              fillOpacity={d.op + 0.08}
            />
          ),
        )}
        {items.icons.map((it, i) => (
          <G
            key={i}
            transform={`translate(${it.x} ${it.y}) rotate(${it.r} ${it.size / 2} ${it.size / 2}) scale(${it.size / 256})`}
            fill={it.tint}
            fillOpacity={it.op}
          >
            {PATTERN_GLYPHS[it.glyph].map((d, j) => (
              <Path key={j} d={d} />
            ))}
          </G>
        ))}
      </G>
    </>
  );
}
