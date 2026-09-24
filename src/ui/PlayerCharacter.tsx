import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated from 'react-native-reanimated';
import type { Player } from '../core/roster';
import { usePlayerCharacter } from './PlayerAvatarView';
import { Colors } from '../theme/theme';
import { popIn } from './motion';

/** პერსონაჟის სურათის პროპორცია (640×768). */
const ART_RATIO = 640 / 768;

/** კრემისფერ პერსონაჟს კრემისფერ ბარათზე აქცენტი არ გამოუჩნდება — იისფერს ვიღებთ. */
function accentFor(color: string): string {
  return color.toUpperCase() === Colors.warmCream.toUpperCase() ? Colors.violet : color;
}

/**
 * მოთამაშის პორტრეტი — „ვისი ჯერია“ ეკრანებზე.
 *
 * **რატომ ბარათი.** სურათები მკერდამდე მოჭრილი კუთხეებია; მუქ ფონზე ჰაერში
 * გამოკიდებული ქვედა კიდე დაუმთავრებლად ჩანდა. ბარათის ქვედა კიდე ამ ჭრილს
 * ჩარჩოდ აქცევს — როგორც თამაშების ფილებზე. ფონი ღია კრემისფერია (ბრენდის
 * „თბილი კრემი“) და ქვემოდან პერსონაჟის ფერით ოდნავ ფერადდება.
 *
 * ახალ მოთამაშეზე ბარათი თავიდან „ამოხტება“ (`key` პერსონაჟზეა მიბმული).
 *
 * საჯარო იდენტობაა — ფარულ როლზე არასოდეს იცვლება.
 */
export function PlayerCharacter({ player, name, compact = false }: { player?: Player | null; name?: string; compact?: boolean }) {
  const { width, height } = useWindowDimensions();
  const character = usePlayerCharacter(player, name);
  if (!player && !name) return null;

  const cardHeight = Math.min(compact ? 176 : 300, height * (compact ? 0.22 : 0.36));
  const cardWidth = Math.min(width - 64, cardHeight * ART_RATIO);
  const accent = accentFor(character.color);
  const radius = compact ? 22 : 28;
  const id = compact ? 'pcC' : 'pcF';

  return (
    <Animated.View
      key={character.name}
      entering={popIn()}
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.shadow,
        { width: cardWidth, height: cardHeight, borderRadius: radius, shadowColor: accent },
      ]}
    >
      <View style={[styles.card, { borderRadius: radius, borderColor: accent }]}>
        <Svg width={cardWidth} height={cardHeight} style={[StyleSheet.absoluteFill, { zIndex: 0 }]}>
          <Defs>
            <LinearGradient id={`${id}-base`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FFFFFF" />
              <Stop offset="100%" stopColor={Colors.warmCream} />
            </LinearGradient>
            <RadialGradient id={`${id}-tint`} cx="50%" cy="100%" rx="75%" ry="70%">
              <Stop offset="0%" stopColor={accent} stopOpacity={0.38} />
              <Stop offset="100%" stopColor={accent} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width={cardWidth} height={cardHeight} fill={`url(#${id}-base)`} />
          <Rect width={cardWidth} height={cardHeight} fill={`url(#${id}-tint)`} />
        </Svg>
        {/* ზემოთ ცოტა ჰაერი რჩება, ქვემოთ სურათი ბარათის კიდეს ეყრდნობა. */}
        <Image
          source={character.image}
          resizeMode="contain"
          accessible={false}
          // ზომა ცხადად — Android-ზე მხოლოდ `left/right`-ით გაწელილი სურათი არ ჩანდა.
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: cardWidth - 4,
            height: cardHeight * 0.94,
            zIndex: 1,
          }}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    alignSelf: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 22,
    elevation: 10,
  },
  card: {
    flex: 1,
    overflow: 'hidden',
    borderWidth: 2,
    backgroundColor: Colors.warmCream,
  },
});
