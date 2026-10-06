import { memo, useId, useMemo } from 'react';
import Svg, { Circle, Defs, G, Path, Use } from 'react-native-svg';
import { Colors } from '../theme/theme';
import { PATTERN_GLYPHS } from './patternGlyphs';
import { GAME_PATTERN_MOTIFS, createPatternMarks } from './gamePatternData';
import { PATTERN_SKETCHES } from './patternSketches';

/** Small vector constellations: one game mark, with varied satellite details. */
export const GamePattern = memo(function GamePattern({ width, height, opacity = 0.14 }: {
  width: number; height: number; opacity?: number;
}) {
  const id = `gamePattern${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const marks = useMemo(() => createPatternMarks(width, height), [width, height]);
  return (
    <Svg width={width} height={height} opacity={opacity} accessible={false}>
      <Defs>
        {Object.entries(GAME_PATTERN_MOTIFS).map(([name, parts]) => (
          <G key={name} id={`${id}${name}`}>
            {parts.map(({ glyph, x = 0, y = 0, scale = 1 }, index) => (
              <G key={index} transform={`translate(${x} ${y}) scale(${scale})`}>
                {PATTERN_SKETCHES[glyph]
                  ? PATTERN_SKETCHES[glyph].map((d, pathIndex) => <Path key={pathIndex} d={d}
                    fill="none" stroke="currentColor" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />)
                  : PATTERN_GLYPHS[glyph].map((d, pathIndex) => <Path key={pathIndex} d={d} />)}
              </G>
            ))}
          </G>
        ))}
      </Defs>
      {marks.map(({ motif, x, y, size, angle, accent, cream, strength }) => (
        <G key={motif} transform={`translate(${x} ${y}) rotate(${angle})`}
          color={accent ? Colors.lime : cream ? Colors.warmCream : Colors.lavender}
          fill={accent ? Colors.lime : cream ? Colors.warmCream : Colors.lavender} opacity={strength}>
          <Use href={`#${id}${motif}`} transform={`translate(${-size / 2} ${-size / 2}) scale(${size / 256})`} />
        </G>
      ))}
      {marks.map(({ x, y, angle, size, cream }, index) => (
        <G key={`satellites${index}`} transform={`translate(${x} ${y}) rotate(${angle})`}
          color={cream ? Colors.warmCream : Colors.lavender} stroke="currentColor" fill="none" strokeWidth={0.8}
          strokeLinecap="round" strokeLinejoin="round" opacity={0.65}>
          <G transform={`translate(${size * 0.78 + 5} ${-size * 0.64 - 4}) rotate(${index * 37 % 180})`}>
            {index % 6 === 0 ? <Path d="M-4 0 Q0 0 0-4 Q0 0 4 0 Q0 0 0 4 Q0 0-4 0Z" />
              : index % 6 === 1 ? <Path d="M-3-2 L1 2 M1-2 L5 2" />
                : index % 6 === 2 ? <Path d="M-4 2 Q0-5 5-2" />
                  : index % 6 === 3 ? <Path d="M-4 2 L0-3 L4 2Z" />
                    : index % 6 === 4 ? <Path d="M-4 0H4 M0-4V4" />
                      : <Circle r={2.1} />}
          </G>
          <G transform={`translate(${-size * 0.72 - 5} ${size * 0.52 + 6})`} opacity={0.6}>
            {index % 3 === 0 ? <Path d="M-5 0 H-2 M2 0H5" />
              : index % 3 === 1 ? <Path d="M-3-2 Q0 4 3-2" />
                : <><Circle cx={-2.5} r={0.8} fill="currentColor" /><Circle cx={2.5} cy={-2} r={0.8} fill="currentColor" /></>}
          </G>
          {index % 4 === 0 ? <Path d={`M${-size * 0.72} ${-size * 0.8} l-3-3 m6 1 l-1-4`} opacity={0.5} /> : null}
        </G>
      ))}
    </Svg>
  );
});
