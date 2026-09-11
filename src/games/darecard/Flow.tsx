import React, {useState} from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Radius, Space, body, caption, title as titleFont } from '../../theme/theme';
import { icon as sf } from '../../theme/icons';
import { CategoryChip, GameExitButton, GlassCard, GlyphIcon, RadioRow, ScreenHeader } from '../../ui/Cards';
import { PrimaryButton, GhostButton } from '../../ui/Buttons';
import { Pressable } from '../../ui/Pressable';
import { Confetti } from '../../ui/Confetti';
import { Layout } from '../../ui/layout';
import { dareKindIcon, dareKindLabel, heatName, heatNote, type TruthDareHeat } from '../../content/banks';
import { PARTY_FORFEITS, forfeitNote, forfeitShort, forfeitTitle } from '../../core/partyForfeit';
import { PodiumAward } from '../../core/podiumAward';
import { Haptics } from '../../core/haptics';
import { Sound } from '../../core/sound';
import { useObservable } from '../../core/observable';
import { useAwardOnce } from '../../core/awardOnce';
import type { GameFlowProps } from '../registry';
import { DareCardEngine } from './engine';

/**
 * „გააკეთე ან...“ (Do or Pay) — სრული ნაკადი.
 *
 * პორტი: `Splash/Games/DareCard/DareCardViews.swift`.
 * **არჩევანი არ არსებობს**: ბარათი კარნახობს — ან ასრულებ, ან იხდი.
 */

const HEATS: TruthDareHeat[] = ['family', 'party', 'spicy'];
const CARD_OPTIONS = [0, 15, 25, 40];

export function DareCardFlow({ roster, onExit }: GameFlowProps) {
  const [engine] = useState(() => new DareCardEngine([...roster.players]));
  useObservable(engine);

  switch (engine.phase) {
    case 'setup':
      return <Setup engine={engine} onClose={onExit} />;
    case 'card':
      return <Play engine={engine} onExit={onExit} />;
    case 'summary':
      return <Summary engine={engine} roster={roster} onExit={onExit} />;
  }
}

// ── პარამეტრები

function Setup({ engine, onClose }: { engine: DareCardEngine; onClose: () => void }) {
  return (
    <View style={{ flex: 1 }}>
      <View style={Layout.header}>
        <ScreenHeader title="Do or Pay" subtitle="ბარათი კარნახობს" onBack={onClose} />
      </View>

      <ScrollView contentContainerStyle={Layout.scroll}>
        <GlassCard>
          <View style={{ gap: 10 }}>
            <Step n="1" text="ბარათი ეკრანზეა — ის წყვეტს, ვის ეხება: ერთს, ორს თუ მთელ მაგიდას." />
            <Step n="2" text="არჩევანი არ გაქვს: ან ასრულებ, ან იხდი." />
            <Step n="3" text="რას ნიშნავს „იხდი“ — ქვემოთ თქვენ წყვეტთ." />
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>რა მოსდევს უარს</Text>
            {PARTY_FORFEITS.map((option) => (
              <RadioRow
                key={option}
                title={forfeitTitle[option]}
                subtitle={forfeitNote[option]}
                selected={engine.settings.forfeit === option}
                onPress={() => engine.setForfeit(option)}
              />
            ))}
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>სიცხარე</Text>
            <View style={Layout.segmentRow}>
              {HEATS.map((heat) => (
                <CategoryChip
                  compact
                  key={heat}
                  label={heatName[heat]}
                  selected={engine.settings.heat === heat}
                  onPress={() => engine.setHeat(heat)}
                />
              ))}
            </View>
            <Text style={[caption(11), { color: Colors.textSecondary }]}>{heatNote[engine.settings.heat]}</Text>
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>რამდენი ბარათი</Text>
            <View style={Layout.chipRow}>
              {CARD_OPTIONS.map((count) => (
                <CategoryChip
                  key={count}
                  label={count === 0 ? 'სანამ მოგბეზრდებათ' : String(count)}
                  selected={engine.settings.cards === count}
                  onPress={() => engine.setCards(count)}
                />
              ))}
            </View>
          </View>
        </GlassCard>
      </ScrollView>

      <View style={Layout.footer}>
        <PrimaryButton
          title="დაწყება"
          icon="play.fill"
          tint={Colors.phosphor}
          enabled={engine.canPlay}
          onPress={() => engine.startGame()}
        />
      </View>
    </View>
  );
}

function Step({ n, text }: { n: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
      <View style={styles.stepBadge}>
        <Text style={[body(12, '900'), { color: Colors.ink }]}>{n}</Text>
      </View>
      <Text style={[body(14, '500'), { color: Colors.textSecondary, flex: 1 }]}>{text}</Text>
    </View>
  );
}

// ── ბარათი

function Play({ engine, onExit }: { engine: DareCardEngine; onExit: () => void }) {
  const card = engine.currentCard;
  const holder = engine.holder?.name ?? '—';

  const subject =
    card.kind === 'group'
      ? `${holder} კითხულობს`
      : card.kind === 'duel'
        ? `${holder} და ${engine.rival?.name ?? '—'}`
        : holder;

  const forfeitLabel =
    engine.settings.forfeit === 'tableChoice'
      ? 'ვერ გავაკეთე — მაგიდის სურვილი'
      : engine.settings.forfeit === 'point'
        ? 'ვერ გავაკეთე — ქულა მინუსში'
        : 'ვერ გავაკეთე — ვიხდი';

  return (
    <View style={{ flex: 1, gap: Space.m }}>
      <View style={Layout.topBar}>
        <GameExitButton onExit={onExit} />
        <Text style={[body(13, '700'), Layout.digits, { color: Colors.textSecondary }]}>
          {engine.settings.cards > 0 ? `ბარათი ${engine.drawn} / ${engine.settings.cards}` : `ბარათი ${engine.drawn}`}
        </Text>
        <View style={{ flex: 1 }} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="სხვა ბარათი"
          onPress={() => engine.swapCard()}
          style={styles.pill}
        >
          <MaterialCommunityIcons name={sf('shuffle')} size={12} color={Colors.textSecondary} />
          <Text style={[body(12, '700'), { color: Colors.textSecondary }]}>სხვა</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ paddingHorizontal: 20 }}>
        <View style={styles.cardFace}>
          <View style={styles.kindBadge}>
            <MaterialCommunityIcons name={sf(dareKindIcon[card.kind])} size={13} color={Colors.ink} />
            <Text style={[body(12, '900'), { color: Colors.ink }]}>{dareKindLabel[card.kind]}</Text>
          </View>

          <Text
            style={[titleFont(24), Layout.centered, { color: Colors.phosphor, paddingHorizontal: 20 }]}
            numberOfLines={2}
            adjustsFontSizeToFit
          >
            {subject}
          </Text>

          <Text
            style={[titleFont(card.text.length > 70 ? 22 : 27), Layout.centered, { color: Colors.textPrimary, paddingHorizontal: 22 }]}
            adjustsFontSizeToFit
            numberOfLines={7}
          >
            {card.text}
          </Text>

          <Text style={[caption(11), { color: Colors.textSecondary, opacity: 0.8 }]}>
            {forfeitShort[engine.settings.forfeit]}
          </Text>
        </View>
      </View>

      <View style={{ flex: 1 }} />

      <View style={Layout.footer}>
        {engine.needsDuelWinner ? (
          <>
            {/* დუელს გამარჯვებული სჭირდება — თორემ ორივეს ერთი და იგივე ეწერება. */}
            <Text style={[body(13, '700'), Layout.centered, { color: Colors.textSecondary }]}>ვინ მოიგო?</Text>
            {engine.holder ? (
              <PrimaryButton
                title={engine.holder.name}
                icon="crown.fill"
                tint={Colors.phosphor}
                onPress={() => engine.resolveDuel(engine.holder!)}
              />
            ) : null}
            {engine.rival ? (
              <PrimaryButton
                title={engine.rival.name}
                icon="crown.fill"
                tint={Colors.neonCyan}
                onPress={() => engine.resolveDuel(engine.rival!)}
              />
            ) : null}
          </>
        ) : (
          <>
            <PrimaryButton title="გავაკეთე" icon="checkmark" tint={Colors.phosphor} onPress={() => engine.markDone()} />
            <GhostButton title={forfeitLabel} icon="xmark" onPress={() => engine.markForfeit()} />
          </>
        )}

        {engine.settings.cards === 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              Haptics.tap();
              engine.finishNow();
            }}
            style={{ alignItems: 'center', paddingTop: 4 }}
          >
            <Text style={[body(13, '700'), { color: Colors.textSecondary }]}>დასრულება</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// ── შეჯამება

function Summary({
  engine,
  roster,
  onExit,
}: {
  engine: DareCardEngine;
  roster: GameFlowProps['roster'];
  onExit: () => void;
}) {

  useAwardOnce(() => {
    Sound.play('win');
    Haptics.win();
    PodiumAward.apply(engine.results, roster);
  });

  const champion = engine.champion;
  const worst = engine.mostForfeits;
  const forfeitLine =
    worst.length > 0 && engine.forfeitCount(worst[0]) > 0
      ? `ყველაზე ხშირად იხადა — ${worst.map((p) => p.name).join(', ')} (${engine.forfeitCount(worst[0])})`
      : null;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, gap: 14 }}>
        <View style={{ flex: 1 }} />

        <View style={{ alignItems: 'center' }}>
          <GlyphIcon name="flame.fill" size={31} tint={Colors.phosphor} />
        </View>

        <Text style={[titleFont(28), Layout.centered, { color: Colors.phosphor }]}>
          {champion === null ? 'არავინ დაიძაბა' : 'ვინც არ დაიხია'}
        </Text>

        {champion ? (
          <Text style={[body(15, '600'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
            {champion.name} — {engine.doneCount(champion)} შესრულებული ბარათი
          </Text>
        ) : null}

        {forfeitLine ? (
          <Text
            style={[body(13, '600'), Layout.centered, { color: Colors.textSecondary, opacity: 0.9, paddingHorizontal: 32 }]}
          >
            {forfeitLine}
          </Text>
        ) : null}

        <Text style={[body(12, '500'), Layout.centered, { color: Colors.textSecondary, opacity: 0.7 }]}>
          საერთო ტაბლოზე პირველ სამს +3 / +2 / +1 ერიცხება
        </Text>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}>
          {engine.ranking.map((player, rank) => {
            const forfeits = engine.forfeitCount(player);
            return (
              <View
                key={player.id}
                style={[styles.summaryRow, { backgroundColor: rank === 0 ? Colors.phosphor + '24' : Colors.surface }]}
              >
                <Text style={[body(16, '900'), { color: Colors.textSecondary, width: 30 }]}>{rank + 1}</Text>
                <Text style={[body(16, '600'), { color: Colors.textPrimary, flex: 1 }]} numberOfLines={1}>
                  {player.name}
                </Text>
                {forfeits > 0 ? (
                  <Text style={[caption(10), { color: Colors.textSecondary }]}>{forfeits} ჯარიმა</Text>
                ) : null}
                <Text
                  style={[titleFont(20), Layout.digits, { color: rank === 0 ? Colors.phosphor : Colors.textPrimary }]}
                >
                  {engine.doneCount(player)}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        <View style={Layout.footer}>
          <PrimaryButton
            title="თავიდან"
            icon="arrow.clockwise"
            tint={Colors.phosphor}
            onPress={() => {
              engine.restart();
            }}
          />
          <GhostButton
            title="პარამეტრები"
            icon="slider.horizontal.3"
            onPress={() => {
              engine.backToSetup();
            }}
          />
          <GhostButton title="დასრულება" icon="xmark" onPress={onExit} />
        </View>
      </View>

      {champion ? <Confetti /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.phosphor,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: Colors.surface,
  },
  cardFace: {
    alignItems: 'center',
    gap: 18,
    paddingVertical: 34,
    borderRadius: 30,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.phosphor + '4D',
  },
  kindBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: Colors.phosphor,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Space.m,
    paddingVertical: 13,
    borderRadius: Radius.small,
  },
});
