import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated from 'react-native-reanimated';
import type { Player } from '../core/roster';
import { usePlayerCharacter } from './PlayerAvatarView';
import { Colors } from '../theme/theme';
import { turnFade } from './motion';

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

  const frameHeight = Math.min(compact ? 210 : 340, height * (compact ? 0.26 : 0.4));
  const frameWidth = Math.min(width - 64, frameHeight * ART_RATIO);
  // ფერადი ჩარჩო (როგორც კოლექციურ ბარათზე) და შიგნით თეთრი ბარათი.
  const frame = compact ? 3 : 4;
  const cardHeight = frameHeight - frame * 2;
  const cardWidth = frameWidth - frame * 2;
  const accent = accentFor(character.color);
  const radius = compact ? 24 : 30;
  const id = compact ? 'pcC' : 'pcF';

  return (
    <Animated.View
      key={character.name}
      entering={turnFade}
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.shadow,
        { width: frameWidth, height: frameHeight, borderRadius: radius, padding: frame, backgroundColor: accent, shadowColor: accent },
      ]}
    >
      <View style={[styles.card, { borderRadius: radius - frame }]}>
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
            width: cardWidth,
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
    shadowOpacity: 0.45,
    shadowRadius: 26,
    elevation: 10,
  },
  card: {
    flex: 1,
    overflow: 'hidden',
    // თხელი თეთრი შიდა ხაზი — ფერად ჩარჩოსა და ფოტოს შორის სისუფთავე.
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    backgroundColor: Colors.warmCream,
  },
});
