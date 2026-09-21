import { useEffect } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Ellipse, Path, Rect } from 'react-native-svg';
import { Colors, body } from '../theme/theme';
import { Haptics } from '../core/haptics';
import { Sound } from '../core/sound';
import type { Player } from '../core/roster';

/**
 * ბოთლის ტრიალი — „სიმართლე თუ მოქმედების“ ჯერის არჩევა.
 *
 * პორტი: `Splash/Components/BottleSpinner.swift`.
 *
 * **მნიშვნელოვანი:** ბოთლი მიზანს არ ირჩევს — ძრავმა უკვე აირჩია, ეს მხოლოდ
 * ანიმაციაა, რომელიც სწორ სახელზე ჩერდება. თორემ ორი წყარო გვექნებოდა და
 * ეკრანი ძრავას აცდებოდა.
 */
export function BottleSpinner({
  players,
  targetIndex,
  onFinish,
}: {
  players: readonly Player[];
  targetIndex: number;
  onFinish: () => void;
}) {
  const { width } = useWindowDimensions();
  const size = Math.min(width - 40, 340);
  const radius = size / 2 - 34;
  const angle = useSharedValue(0);

  const count = Math.max(1, players.length);
  /** სახელები წრეზე: პირველი ზემოთ, მერე საათის ისრის მიმართულებით. */
  const step = 360 / count;
  const targetAngle = step * (targetIndex % count);

  useEffect(() => {
    // ხუთი სრული ბრუნი და მერე ზუსტად სამიზნეზე გაჩერება.
    const spin = 360 * 5 + targetAngle;
    Haptics.medium();
    Sound.play('start');
    angle.value = 0;
    angle.value = withTiming(spin, { duration: 2600, easing: Easing.out(Easing.cubic) }, (done) => {
      if (done) {
        runOnJS(Haptics.heavy)();
        runOnJS(onFinish)();
      }
    });
    // ტრიალის შუაში გასვლისას ვიბრაცია და `onFinish` უკვე დახურულ ეკრანს აღარ უნდა მისწვდეს.
    return () => cancelAnimation(angle);
    // ერთხელ, ამ ჯერზე — თავიდან ტრიალი ახალ `key`-ზე ხდება.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bottleStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${angle.value}deg` }] }));

  return (
    <View style={{ width: size, height: size, alignSelf: 'center' }}>
      {/* სახელები წრეზე */}
      {players.map((player, i) => {
        const a = ((step * i - 90) * Math.PI) / 180;
        return (
          <View
            key={player.id}
            style={[
              styles.name,
              {
                left: size / 2 + Math.cos(a) * radius - 46,
                top: size / 2 + Math.sin(a) * radius - 14,
              },
            ]}
          >
            <Text style={[body(13, '700'), styles.centered, { color: Colors.textSecondary }]} numberOfLines={1}>
              {player.name}
            </Text>
          </View>
        );
      })}

      {/* ბოთლი */}
      <Animated.View style={[styles.bottleWrap, { width: size, height: size }, bottleStyle]}>
        <Svg width={size} height={size}>
          {/* ყელი ზემოთ — ტრიალის ნულოვანი კუთხე პირველ სახელზე მიუთითებს */}
          <Rect
            x={size / 2 - 5}
            y={size / 2 - 78}
            width={10}
            height={34}
            rx={4}
            fill={Colors.neonCyan}
          />
          <Path
            d={`M ${size / 2 - 5} ${size / 2 - 46} L ${size / 2 - 17} ${size / 2 - 26} L ${size / 2 - 17} ${size / 2 + 52} L ${size / 2 + 17} ${size / 2 + 52} L ${size / 2 + 17} ${size / 2 - 26} L ${size / 2 + 5} ${size / 2 - 46} Z`}
            fill={Colors.neonCyan}
            opacity={0.9}
          />
          <Ellipse cx={size / 2} cy={size / 2 + 52} rx={17} ry={5} fill={Colors.neonCyan} opacity={0.55} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  name: { position: 'absolute', width: 92, alignItems: 'center' },
  centered: { textAlign: 'center' },
  bottleWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
