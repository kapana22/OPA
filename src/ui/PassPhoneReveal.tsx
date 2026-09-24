import { PlayerCharacter } from './PlayerCharacter';
import { PlayerAvatarView } from './PlayerAvatarView';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Colors, Space, body, title as titleFont } from '../theme/theme';
import { Haptics } from '../core/haptics';
import { Sound } from '../core/sound';
import { PrimaryButton } from './Buttons';
import { GameExitButton } from './Cards';
import { Pressable } from './Pressable';
import { Icon } from './Icon';

export interface RevealCard {
  word: string;
  hint?: string | null;
  note?: string | null;
  tint?: string;
}

/**
 * „გადაეცი ტელეფონი“ — ბარათი მხოლოდ **დაჭერისას** ჩანს.
 *
 * პორტი: `Splash/Components/PassPhoneReveal.swift`.
 *
 * ხელს აიღებ — მაშინვე ქრება. ეს განზრახაა: ერთტელეფონიან თამაშში საიდუმლო
 * მხოლოდ იმდენ ხანს უნდა ჩანდეს, რამდენ ხანსაც თითი ეკრანზეა.
 *
 * **`confirmFirst`** — ორსაფეხურიანი გადაცემა საიდუმლო როლებისთვის. ჯერ მხოლოდ
 * სახელი ჩანს („გადაეცი ნინოს“), ბარათი კი მხოლოდ მას შემდეგ გამოჩნდება, რაც
 * მიმღები თვითონ დაადასტურებს — ასე ეკრანი გადაცემის დროს ცარიელია და
 * გვერდიდან შემთხვევით ვერავინ ნახავს, ვის რა ერგო.
 */
export function PassPhoneReveal({
  playerName,
  index,
  total,
  headerLeft,
  card,
  nextTitle,
  confirmFirst = false,
  onNext,
  onExit,
}: {
  playerName: string;
  index: number;
  total: number;
  headerLeft?: string;
  card: RevealCard;
  nextTitle: string;
  /** საიდუმლო როლებში — ბარათამდე მიმღებმა „მე ვარ“ უნდა დაადასტუროს. */
  confirmFirst?: boolean;
  onNext: () => void;
  onExit?: () => void;
}) {
  const [isHolding, setHolding] = useState(false);
  const [confirmed, setConfirmed] = useState(!confirmFirst);
  const tint = card.tint ?? Colors.textPrimary;

  // ახალი მოთამაშე — ტელეფონი ისევ გადასაცემია, დადასტურება თავიდან.
  // რენდერის დროს და არა effect-ში: ასე ძველი მოთამაშის ბარათი ერთი კადრითაც არ ჩანს.
  const turnKey = `${index}:${confirmFirst}`;
  const [seenTurn, setSeenTurn] = useState(turnKey);
  if (seenTurn !== turnKey) {
    setSeenTurn(turnKey);
    setConfirmed(!confirmFirst);
    setHolding(false);
  }

  const revealedLabel = [card.hint, card.word, card.note].filter(Boolean).join(', ');

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        {onExit ? <GameExitButton onExit={onExit} /> : null}
        <Text style={[body(14, '700'), { color: Colors.textSecondary }]}>{headerLeft ?? ''}</Text>
        <View style={{ flex: 1 }} />
        <Text style={[body(14, '700'), { color: Colors.textSecondary, fontVariant: ['tabular-nums'] }]}>
          {index + 1} / {total}
        </Text>
      </View>

      <View style={{ flex: 1 }} />

      {!confirmed ? (
        <>
          <PlayerCharacter name={playerName} />
          <View style={styles.passBlock} accessible accessibilityLabel={`გადაეცი ტელეფონი ${playerName}-ს`}>
            <Text style={[titleFont(36), styles.centered, { color: Colors.textPrimary }]} adjustsFontSizeToFit numberOfLines={1}>
              {playerName}
            </Text>
            <Text style={[body(15, '500'), styles.centered, { color: Colors.textSecondary }]}>გადაეცი ტელეფონი</Text>
          </View>
          <View style={{ flex: 1 }} />
          <View style={styles.footer}>
            <Text style={[body(12, '500'), styles.centered, { color: Colors.textSecondary, opacity: 0.8, paddingHorizontal: 8 }]}>
              დანარჩენებო, ეკრანს ნუ უყურებთ
            </Text>
            <PrimaryButton
              title="მე ვარ"
              icon="checkmark"
              tint={tint}
              onPress={() => {
                Haptics.tap();
                setConfirmed(true);
              }}
            />
          </View>
        </>
      ) : (
        <>
      <View style={{ alignItems: 'center' }}><PlayerAvatarView name={playerName} size={42} /></View>
      <View
        style={styles.nameBlock}
        accessible
        accessibilityLabel={`გადაეცი ტელეფონი ${playerName}-ს. ${index + 1} ${total}-დან`}
      >
        <Text style={[body(16, '500'), { color: Colors.textSecondary }]}>გადაეცი ტელეფონი</Text>
        <Text style={[titleFont(36), styles.centered, { color: Colors.textPrimary }]}>{playerName}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isHolding ? revealedLabel : 'დახურული ბარათი'}
        accessibilityHint={isHolding ? 'ხელს აიღებ — ბარათი დაიხურება' : 'დააჭირე და გეჭიროს, რომ ნახო'}
        onPressIn={() => {
          setHolding(true);
          Haptics.reveal();
          Sound.play('reveal');
        }}
        onPressOut={() => {
          setHolding(false);
          Haptics.tap();
        }}
        style={[
          styles.card,
          {
            backgroundColor: isHolding ? tint + '2E' : Colors.surface,
            borderColor: isHolding ? tint : Colors.stroke,
            borderWidth: isHolding ? 2 : 1,
          },
        ]}
      >
        {isHolding ? (
          <Animated.View entering={FadeIn.duration(140)} style={styles.cardInner}>
            {card.hint ? (
              <Text style={[body(14, '700'), { color: Colors.textSecondary }]}>{card.hint}</Text>
            ) : null}
            <Text
              style={[titleFont(card.word.length > 12 ? 28 : 38), styles.centered, { color: tint }]}
              adjustsFontSizeToFit
              numberOfLines={3}
            >
              {card.word}
            </Text>
            {card.note ? (
              <Text style={[body(13, '500'), styles.centered, { color: Colors.textSecondary }]}>{card.note}</Text>
            ) : null}
          </Animated.View>
        ) : (
          <View style={styles.cardInner}>
            <Icon name={'hand.tap.fill'} size={34} color={Colors.textSecondary} />
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>დააჭირე და გეჭიროს</Text>
            <Text style={[body(13, '500'), { color: Colors.textSecondary }]}>ხელს აიღებ — მაშინვე გაქრება</Text>
          </View>
        )}
      </Pressable>

      <View style={{ flex: 1 }} />

      <View style={styles.footer}>
        <PrimaryButton title={nextTitle} icon="checkmark" tint={Colors.neonCyan} enabled={!isHolding} onPress={onNext} />
      </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: Space.l },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingTop: Space.m },
  nameBlock: { gap: Space.l, alignItems: 'center', paddingHorizontal: 24 },
  passBlock: { gap: 6, paddingHorizontal: 24 },
  centered: { textAlign: 'center' },
  card: {
    height: 260,
    marginHorizontal: 24,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInner: { alignItems: 'center', gap: 12, paddingHorizontal: Space.m },
  footer: { paddingHorizontal: 24, paddingBottom: Space.m, gap: 10 },
});
