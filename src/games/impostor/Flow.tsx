import React, {useState} from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Space, body, title as titleFont } from '../../theme/theme';
import {
  CategoryChip,
  Divider,
  GameExitButton,
  GlassCard,
  GlyphIcon,
  ScreenHeader,
  Stepper,
  ToggleRow, CategoryPicker } from '../../ui/Cards';
import { wordEntries } from '../categoryEntries';
import { PrimaryButton, GhostButton } from '../../ui/Buttons';
import { Pressable } from '../../ui/Pressable';
import { PassPhoneReveal } from '../../ui/PassPhoneReveal';
import { DiscussionPanel } from '../../ui/DiscussionPanel';
import { Layout } from '../../ui/layout';
import { WordBank } from '../../content/banks';
import { Haptics } from '../../core/haptics';
import { useObservable } from '../../core/observable';
import { useAwardOnce } from '../../core/awardOnce';
import type { Player } from '../../core/roster';
import type { GameFlowProps } from '../registry';
import { ImpostorEngine, type ImpostorOutcome } from './engine';

/**
 * „ერთმა არ იცის“ (Impostor) — სრული ნაკადი.
 *
 * პორტი: `Splash/Games/Impostor/*.swift` (7 ხედი).
 */

const TIMER_OPTIONS = [0, 60, 120, 180, 300];

export function ImpostorFlow({ roster, onExit }: GameFlowProps) {
  const [engine] = useState(() => new ImpostorEngine([...roster.players]));
  useObservable(engine);

  switch (engine.phase) {
    case 'setup':
      return <Setup engine={engine} onClose={onExit} />;
    case 'reveal':
      return <Reveal engine={engine} onExit={onExit} />;
    case 'discussion':
      return <Discussion engine={engine} onExit={onExit} />;
    case 'voting':
      return <Voting engine={engine} onExit={onExit} />;
    case 'impostorGuess':
      return <Guess engine={engine} onExit={onExit} />;
    case 'result':
      return <Result engine={engine} roster={roster} onExit={onExit} />;
  }
}

// ── პარამეტრები

function Setup({ engine, onClose }: { engine: ImpostorEngine; onClose: () => void }) {
  return (
    <View style={{ flex: 1 }}>
      <View style={Layout.header}>
        <ScreenHeader title="ერთმა არ იცის" subtitle={`${engine.players.length} მოთამაშე`} onBack={onClose} />
      </View>

      <ScrollView contentContainerStyle={Layout.scroll}>
        <GlassCard>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>იმპოსტორები</Text>
              <Text style={[body(13, '500'), { color: Colors.textSecondary }]}>
                მაქსიმუმ {engine.maxImpostors}
              </Text>
            </View>
            <Stepper
              value={engine.settings.impostorCount}
              min={1}
              max={engine.maxImpostors}
              tint={Colors.neonMagenta}
              onChange={(v) => engine.setImpostorCount(v)}
            />
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>კატეგორია</Text>
            <CategoryPicker
              build={() => wordEntries(WordBank, 'შემთხვევითი', null)}
              selectedID={engine.settings.categoryID}
              onSelect={(id) => engine.setCategory(id)}
            />
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>განხილვის დრო</Text>
            <View style={Layout.segmentRow}>
              {TIMER_OPTIONS.map((secs) => (
                <CategoryChip
                  compact
                  key={secs}
                  label={secs === 0 ? '∞' : `${secs / 60}:00`}
                  selected={engine.settings.discussionSeconds === secs}
                  onPress={() => engine.setDiscussionSeconds(secs === 0 ? 0 : secs)}
                />
              ))}
            </View>
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 14 }}>
            <ToggleRow
              title="იმპოსტორმა კატეგორია იცოდეს"
              subtitle="უფრო სამართლიანია დამწყებთათვის"
              value={engine.settings.impostorKnowsCategory}
              onChange={(v) => engine.setKnowsCategory(v)}
            />
            <Divider />
            <ToggleRow
              title="დაჭერილ იმპოსტორს ბოლო შანსი ჰქონდეს"
              subtitle="თუ სიტყვას გამოიცნობს, ქულებს იტოვებს"
              value={engine.settings.impostorCanGuess}
              onChange={(v) => engine.setCanGuess(v)}
            />
          </View>
        </GlassCard>
      </ScrollView>

      <View style={Layout.footer}>
        <PrimaryButton
          title="რაუნდის დაწყება"
          icon="play.fill"
          tint={Colors.phosphor}
          onPress={() => engine.startRound()}
        />
      </View>
    </View>
  );
}

// ── ბარათების დარიგება

function Reveal({ engine, onExit }: { engine: ImpostorEngine; onExit: () => void }) {
  const player = engine.currentRevealPlayer;
  if (!player) return null;

  const info = engine.card(player);
  const isLast = engine.revealIndex + 1 >= engine.players.length;

  return (
    <PassPhoneReveal
      confirmFirst
      key={engine.revealIndex}
      playerName={player.name}
      index={engine.revealIndex}
      total={engine.players.length}
      headerLeft={`რაუნდი ${engine.round}`}
      card={{
        word: info.word,
        hint: info.hint,
        note: info.isImpostor ? 'არავინ იცის, რომ შენ არ იცი.\nჩაერიე ისე, თითქოს იცოდე.' : null,
        tint: info.isImpostor ? Colors.neonMagenta : Colors.textPrimary,
      }}
      nextTitle={isLast ? 'ვნახე — დაწყება' : 'ვნახე — შემდეგი'}
      onNext={() => engine.advanceReveal()}
      onExit={onExit}
    />
  );
}

// ── განხილვა

function Discussion({ engine, onExit }: { engine: ImpostorEngine; onExit: () => void }) {
  return (
    <DiscussionPanel
      title="რიგრიგობით — თითოეული ერთ სიტყვას ამბობს"
      starterName={engine.startingPlayer?.name}
      seconds={engine.settings.discussionSeconds}
      tips={[
        'ერთი სიტყვა და გაჩერდი — მეტი არა.',
        'ძალიან ზუსტი ნუ იქნები — იმპოსტორი გისმენს.',
        'როცა მზად ხართ — გადადით კენჭისყრაზე.',
      ]}
      accent={Colors.neonMagenta}
      actionTitle="კენჭისყრა"
      onAction={() => engine.beginVoting()}
      onExit={onExit}
    />
  );
}

// ── კენჭისყრა

function Voting({ engine, onExit }: { engine: ImpostorEngine; onExit: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <View style={{ flex: 1, gap: 18 }}>
      <View style={Layout.exitSlot}>
        <GameExitButton onExit={onExit} />
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ alignItems: 'center', gap: 6 }}>
        <Text style={[titleFont(28), { color: Colors.textPrimary }]}>ვინ არის იმპოსტორი?</Text>
        <Text style={[body(14, '500'), { color: Colors.textSecondary }]}>დათვალეთ სამამდე და ერთად აირჩიეთ</Text>
      </View>

      <ScrollView contentContainerStyle={Layout.nameGrid}>
        {engine.players.map((player) => {
          const on = selected === player.id;
          return (
            <Pressable
              key={player.id}
              accessibilityRole="button"
              accessibilityLabel={player.name}
              accessibilityState={{ selected: on }}
              onPress={() => {
                Haptics.tap();
                setSelected(player.id);
              }}
              style={[
                styles.nameCell,
                { backgroundColor: on ? Colors.neonMagenta : Colors.surface, borderColor: on ? 'transparent' : Colors.stroke },
              ]}
            >
              <Text
                style={[body(17, '700'), Layout.centered, { color: on ? Colors.ink : Colors.textPrimary }]}
                numberOfLines={2}
                adjustsFontSizeToFit
              >
                {player.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ flex: 1 }} />

      <View style={Layout.footer}>
        <PrimaryButton
          title="დადასტურება"
          icon="checkmark"
          tint={Colors.phosphor}
          enabled={selected !== null}
          onPress={() => {
            const player = engine.players.find((p) => p.id === selected);
            if (player) engine.accuse(player);
          }}
        />
      </View>
    </View>
  );
}

// ── იმპოსტორის ბოლო შანსი

function Guess({ engine, onExit }: { engine: ImpostorEngine; onExit: () => void }) {
  return (
    <View style={{ flex: 1, gap: 18 }}>
      <View style={Layout.exitSlot}>
        <GameExitButton onExit={onExit} />
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ alignItems: 'center' }}>
        <GlyphIcon name="target" size={31} tint={Colors.phosphor} />
      </View>

      <View style={{ alignItems: 'center', gap: 6 }}>
        <Text style={[titleFont(30), { color: Colors.neonMagenta }]}>დაგიჭირეს!</Text>
        <Text style={[body(15, '500'), Layout.centered, { color: Colors.textSecondary }]}>
          ბოლო შანსი — რომელი სიტყვა იყო?
        </Text>
      </View>

      <View style={{ alignItems: 'center' }}>
        <View style={styles.pill}>
          <Text style={[body(14, '700'), { color: Colors.textSecondary }]}>
            {engine.category.emoji} {engine.category.name}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 8, gap: 10 }}>
        {engine.guessOptions.map((word) => (
          <Pressable
            key={word}
            accessibilityRole="button"
            accessibilityLabel={word}
            onPress={() => {
              Haptics.heavy();
              engine.submitGuess(word);
            }}
            style={styles.optionRow}
          >
            <Text style={[body(18, '700'), { color: Colors.textPrimary }]}>{word}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={{ flex: 1 }} />
    </View>
  );
}

// ── შედეგი

interface Headline {
  icon: string;
  title: string;
  subtitle: string;
  color: string;
}

function headlineFor(engine: ImpostorEngine): Headline {
  const outcome: ImpostorOutcome | null = engine.outcome;
  if (outcome === 'impostorCaught')
    return {
      icon: 'party.popper.fill',
      title: 'იმპოსტორი დაიჭირეს!',
      subtitle: 'ჯგუფმა ზუსტად მიაგნო — ბლეფი არ გაჭრა.',
      color: Colors.phosphor,
    };
  if (outcome === 'impostorGuessedWord')
    return {
      icon: 'exclamationmark.circle.fill',
      title: 'დაიჭირეს, მაგრამ გამოიცნო!',
      subtitle: 'ბოლო წამს გადაირჩინა თავი — ქულები გაიყო.',
      color: Colors.phosphor,
    };
  if (outcome === 'impostorEscaped')
    return {
      icon: 'eye.slash.fill',
      title: 'იმპოსტორმა გაასწრო!',
      subtitle: `${engine.accused?.name ?? 'არჩეული'} სულ უდანაშაულო აღმოჩნდა.`,
      color: Colors.neonMagenta,
    };
  return { icon: 'questionmark.circle', title: 'რაუნდი დასრულდა', subtitle: '', color: Colors.textPrimary };
}

function Result({
  engine,
  roster,
  onExit,
}: {
  engine: ImpostorEngine;
  roster: GameFlowProps['roster'];
  onExit: () => void;
}) {
  const head = headlineFor(engine);

  useAwardOnce(() => {
    for (const [id, points] of Object.entries(engine.roundPoints)) roster.addScore(points, id);
    Haptics.success();
  });

  const scored = engine.players.filter((p) => (engine.roundPoints[p.id] ?? 0) > 0);

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, gap: Space.m, paddingVertical: Space.m }}>
      <View style={{ flex: 1 }} />

      <View style={{ alignItems: 'center' }}>
        <GlyphIcon name={head.icon} size={32} tint={head.color} />
      </View>

      <Text style={[titleFont(28), Layout.centered, { color: head.color, paddingHorizontal: 24 }]}>{head.title}</Text>

      {head.subtitle ? (
        <Text style={[body(15, '500'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
          {head.subtitle}
        </Text>
      ) : null}

      <View style={Layout.content}>
        <GlassCard>
          <View style={{ gap: 12 }}>
            <Row label="საიდუმლო სიტყვა" value={engine.secretWord} tint={Colors.phosphor} />
            <Divider />
            <Row label="კატეგორია" value={`${engine.category.emoji} ${engine.category.name}`} />
            <Divider />
            <Row
              label={engine.impostors.length > 1 ? 'იმპოსტორები' : 'იმპოსტორი'}
              value={engine.impostors.map((p) => p.name).join(', ')}
              tint={Colors.phosphor}
            />
            {engine.impostorGuess ? (
              <>
                <Divider />
                <Row
                  label="ვარაუდი"
                  value={engine.impostorGuess}
                  tint={engine.impostorGuess === engine.secretWord ? Colors.phosphor : Colors.textSecondary}
                />
              </>
            ) : null}
          </View>
        </GlassCard>
      </View>

      {scored.length > 0 ? (
        <View style={Layout.content}>
          <GlassCard>
            <View style={{ gap: 8 }}>
              <Text style={[body(13, '700'), { color: Colors.textSecondary }]}>რაუნდის ქულები</Text>
              {scored.map((p) => (
                <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[body(15, '600'), { color: Colors.textPrimary, flex: 1 }]}>{p.name}</Text>
                  <Text style={[body(15, '900'), { color: Colors.phosphor, fontVariant: ['tabular-nums'] }]}>
                    +{engine.roundPoints[p.id] ?? 0}
                  </Text>
                </View>
              ))}
            </View>
          </GlassCard>
        </View>
      ) : null}

      <View style={{ flex: 1 }} />

      <View style={Layout.footer}>
        <PrimaryButton
          title="შემდეგი რაუნდი"
          icon="arrow.clockwise"
          tint={Colors.phosphor}
          onPress={() => {
            engine.nextRound();
          }}
        />
        <GhostButton title="დასრულება" icon="xmark" onPress={onExit} />
      </View>
    </ScrollView>
  );
}

function Row({ label, value, tint = Colors.textPrimary }: { label: string; value: string; tint?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
      <Text style={[body(14, '500'), { color: Colors.textSecondary }]}>{label}</Text>
      <View style={{ flex: 1 }} />
      <Text style={[body(16, '700'), { color: tint, textAlign: 'right', flexShrink: 1 }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  nameCell: {
    width: '47%',
    flexGrow: 1,
    minHeight: 70,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: Radius.small,
    borderWidth: 1,
  },
  optionRow: {
    paddingVertical: 18,
    borderRadius: Radius.small,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: Colors.surface },
});
