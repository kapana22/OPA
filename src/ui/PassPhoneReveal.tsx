import { PlayerCharacter } from './PlayerCharacter';
import { PlayerAvatarView } from './PlayerAvatarView';
import { useEffect, useState } from 'react';
import { AppState, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Colors, Space, body, title as titleFont } from '../theme/theme';
import { FitText } from './FitText';
import { Haptics } from '../core/haptics';
import { Sound } from '../core/sound';
import { onPrivateRevealInterruption } from '../core/privateReveal';
import { PrimaryButton } from './Buttons';
import { GameExitButton } from './Cards';
import { Pressable } from './Pressable';

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
  useEffect(() => onPrivateRevealInterruption(AppState, () => {
    setHolding(false);
    setConfirmed(!confirmFirst);
  }), [confirmFirst]);

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
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.root}>
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
            <Text style={[titleFont(28), styles.centered, { color: Colors.textPrimary }]} adjustsFontSizeToFit numberOfLines={2}>
              {playerName}
            </Text>
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
        <FitText style={[titleFont(28), styles.centered, { color: Colors.textPrimary }]} maxLines={2}>{playerName}</FitText>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isHolding ? revealedLabel : 'დახურული ბარათი'}
        accessibilityHint={isHolding ? 'ხელს აიღებ — ბარათი დაიხურება' : 'დააჭირე და გეჭიროს, რომ ნახო'}
        onPressIn={() => {
          if (AppState.currentState !== 'active') return;
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
            <FitText style={[titleFont(card.word.length > 12 ? 28 : 38), styles.centered, { color: tint }]} maxLines={3}>
              {card.word}
            </FitText>
            {card.note ? (
              <Text style={[body(13, '500'), styles.centered, { color: Colors.textSecondary }]}>{card.note}</Text>
            ) : null}
          </Animated.View>
        ) : (
          <View style={styles.cardInner}>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flexGrow: 1, gap: Space.m },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: Space.m },
  nameBlock: { gap: 6, alignItems: 'center', paddingHorizontal: 20 },
  passBlock: { gap: 6, paddingHorizontal: 24 },
  centered: { textAlign: 'center' },
  card: {
    minHeight: 210,
    paddingVertical: 20,
    marginHorizontal: 20,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInner: { alignItems: 'center', gap: 12, paddingHorizontal: Space.m },
  footer: { paddingHorizontal: 20, paddingBottom: Space.m, gap: 10 },
});
