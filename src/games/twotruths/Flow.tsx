import { PlayerCharacter } from '../../ui/PlayerCharacter';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Radius, Space, body, caption, title as titleFont } from '../../theme/theme';
import { icon as sf } from '../../theme/icons';
import { CategoryChip, GameExitButton, GlassCard, GlyphIcon, RankRow, ScreenHeader, ToggleRow , RulesSheet } from '../../ui/Cards';
import { PrimaryButton, GhostButton } from '../../ui/Buttons';
import { Pressable } from '../../ui/Pressable';
import { Confetti } from '../../ui/Confetti';
import { Layout } from '../../ui/layout';
import { PodiumAward } from '../../core/podiumAward';
import { Haptics } from '../../core/haptics';
import { useObservable } from '../../core/observable';
import { useAwardOnce } from '../../core/awardOnce';
import type { GameFlowProps } from '../registry';
import { TwoTruthsEngine } from './engine';
import { game as findGame } from '../catalog';

/**
 * „ორი სიმართლე, ერთი ტყუილი“ — სრული ნაკადი.
 *
 * პორტი: `Splash/Games/TwoTruths/*.swift` (6 ხედი).
 * დაწერილი ამბები **არსად ინახება** — პარტიის დასრულებისთანავე ქრება.
 */

const TURN_OPTIONS = [3, 5, 8];
const LIMIT = 80;

export function TwoTruthsFlow({ roster, onExit }: GameFlowProps) {
  const [engine] = useState(() => new TwoTruthsEngine([...roster.players]));
  useObservable(engine);

  switch (engine.phase) {
    case 'setup':
      return <Setup engine={engine} onClose={onExit} />;
    case 'writeHandoff':
      return (
        <Pass
          key={`write-${engine.turnIndex}`}
          kicker={`ჯერი ${engine.turnIndex + 1} / ${engine.totalTurns}`}
          playerName={engine.author.name}
          headline="შენი ჯერია"
          note="დაწერე სამი ამბავი შენს თავზე: ორი მართალი, ერთი მოგონილი. სხვას ეკრანი არ დაანახო."
          actionTitle="დაწერა"
          icon="square.and.pencil"
          onStart={() => engine.beginWriting()}
          onExit={onExit}
        />
      );
    case 'write':
      return <Write key={`writing-${engine.turnIndex}`} engine={engine} onExit={onExit} />;
    case 'guessHandoff':
      return (
        <Pass
          key={`pass-${engine.turnIndex}-${engine.guesserIndex}`}
          kicker={`${engine.guesserIndex + 1} / ${engine.guessers.length}`}
          playerName={engine.currentGuesser?.name ?? '—'}
          headline="იპოვე ტყუილი"
          note={`ავტორი — ${engine.author.name}. სამი ამბავიდან ერთი მოგონილია, აირჩიე ის, რომელიც არ გჯერა.`}
          actionTitle="ნახვა"
          icon="eye.slash.fill"
          onStart={() => engine.beginGuessing()}
          onExit={onExit}
        />
      );
    case 'guess':
      return <Guess key={`guess-${engine.turnIndex}-${engine.guesserIndex}`} engine={engine} onExit={onExit} />;
    case 'result':
      return <Result engine={engine} onExit={onExit} />;
    case 'summary':
      return <Summary engine={engine} roster={roster} onExit={onExit} />;
  }
}

// ── პარამეტრები

function Setup({ engine, onClose }: { engine: TwoTruthsEngine; onClose: () => void }) {
  const [showRules, setShowRules] = useState(false);
  const gameData = findGame('twotruths');
  return (
    <View style={{ flex: 1 }}>
      <RulesSheet visible={showRules} title="Two Truths" accent={Colors.neonMagenta} steps={gameData?.howTo ?? []} onClose={() => setShowRules(false)} />

      <View style={Layout.header}>
        <ScreenHeader
          title="ორი სიმართლე, ერთი ტყუილი"
          subtitle={`${engine.players.length} მოთამაშე`}
          onBack={onClose}
         onInfo={() => setShowRules(true)} />
      </View>

      <ScrollView contentContainerStyle={Layout.scroll}>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>ჯერების რაოდენობა</Text>
            <CategoryChip
              label={`ყველას თითო — ${engine.players.length}`}
              selected={engine.settings.everyonePlays}
              onPress={() => engine.setEveryonePlays(true)}
            />
            <View style={Layout.segmentRow}>
              {TURN_OPTIONS.map((count) => (
                <CategoryChip
                  compact
                  key={count}
                  label={String(count)}
                  selected={!engine.settings.everyonePlays && engine.settings.fixedTurns === count}
                  onPress={() => engine.setFixedTurns(count)}
                />
              ))}
            </View>
            <Text style={[body(12, '500'), { color: Colors.textSecondary }]}>
              თუ ჯერები მოთამაშეებზე მეტია, რიგი თავიდან იწყება.
            </Text>
          </View>
        </GlassCard>

        <GlassCard>
          <ToggleRow
            title="მინიშნებები"
            subtitle="წერისას თემები გამოჩნდება — ვისაც არაფერი მოსდის თავში"
            value={engine.settings.showHints}
            onChange={(v) => engine.setShowHints(v)}
          />
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 6 }}>
            <Text style={[body(15, '700'), { color: Colors.textPrimary }]}>არაფერი ინახება</Text>
            <Text style={[body(13, '500'), { color: Colors.textSecondary }]}>
              დაწერილი ამბები ტელეფონში არ ინახება — პარტიის დასრულებისთანავე ქრება.
            </Text>
          </View>
        </GlassCard>
      </ScrollView>

      <View style={Layout.footer}>
        <PrimaryButton
          title="დაწყება"
          icon="play.fill"
          tint={Colors.neonMagenta}
          enabled={engine.players.length >= 3}
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

// ── ტელეფონის გადაცემა

function Pass({
  kicker,
  playerName,
  headline,
  note,
  actionTitle,
  icon,
  onStart,
  onExit,
}: {
  kicker: string;
  playerName: string;
  headline: string;
  note: string;
  actionTitle: string;
  icon: string;
  onStart: () => void;
  onExit: () => void;
}) {
  return (
    <View style={{ flex: 1, gap: 18 }}>
      <View style={Layout.topBar}>
        <GameExitButton onExit={onExit} />
        <View style={{ flex: 1 }} />
        <Text style={[body(14, '700'), Layout.digits, { color: Colors.textSecondary }]}>{kicker}</Text>
      </View>
      <PlayerCharacter name={playerName} compact />

      <View style={{ flex: 1 }} />

      <Text style={[body(15, '500'), Layout.centered, { color: Colors.textSecondary }]}>{headline}</Text>

      <Text
        style={[titleFont(36), Layout.centered, { color: Colors.phosphor, paddingHorizontal: 24 }]}
        adjustsFontSizeToFit
        numberOfLines={2}
      >
        {playerName}
      </Text>

      <View style={Layout.content}>
        <GlassCard>
          <Text style={[body(14, '500'), Layout.centered, { color: Colors.textSecondary }]}>{note}</Text>
        </GlassCard>
      </View>

      <View style={{ flex: 1 }} />

      <View style={Layout.footer}>
        <PrimaryButton title={actionTitle} icon={icon} tint={Colors.neonMagenta} onPress={onStart} />
      </View>
    </View>
  );
}

// ── წერა

function Write({ engine, onExit }: { engine: TwoTruthsEngine; onExit: () => void }) {
  const [texts, setTexts] = useState(['', '', '']);
  const [lie, setLie] = useState<number | null>(null);

  const trimmed = texts.map((t) => t.trim());
  const canSubmit = lie !== null && trimmed.every((t) => t.length > 0);

  const change = (index: number, value: string) => {
    setTexts((prev) => {
      const next = [...prev];
      next[index] = value.replace(/\n/g, ' ').slice(0, LIMIT);
      return next;
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={Layout.topBar}>
        <GameExitButton onExit={onExit} />
        <View style={{ gap: 1 }}>
          <Text style={[body(17, '700'), { color: Colors.textPrimary }]} numberOfLines={1}>
            {engine.author.name}
          </Text>
          <Text style={[caption(12), { color: Colors.textSecondary }]}>ორი მართალი, ერთი მოგონილი</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Text style={[body(14, '700'), Layout.digits, { color: Colors.textSecondary }]}>
          {engine.turnIndex + 1} / {engine.totalTurns}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20, gap: 12 }}
        keyboardDismissMode="interactive"
      >
        {engine.settings.showHints ? (
          <GlassCard padding={16}>
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[body(14, '700'), { color: Colors.textPrimary, flex: 1 }]}>თემები</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="სხვა თემები"
                  onPress={() => {
                    Haptics.tap();
                    engine.rollHints();
                  }}
                  style={styles.pill}
                >
                  <MaterialCommunityIcons name={sf('shuffle')} size={12} color={Colors.textSecondary} />
                  <Text style={[body(12, '700'), { color: Colors.textSecondary }]}>სხვა</Text>
                </Pressable>
              </View>
              {engine.hints.map((hint, i) => (
                <Text key={i} style={[body(13, '500'), { color: Colors.textSecondary }]}>
                  {hint.emoji} {hint.text}
                </Text>
              ))}
            </View>
          </GlassCard>
        ) : null}

        {[0, 1, 2].map((index) => {
          const isLie = lie === index;
          const count = texts[index].length;
          return (
            <View
              key={index}
              style={[
                styles.statementCard,
                {
                  backgroundColor: isLie ? Colors.phosphor + '1F' : Colors.surface,
                  borderColor: isLie ? Colors.phosphor : Colors.stroke,
                  borderWidth: isLie ? 2 : 1,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <View style={[styles.numBadge, { backgroundColor: isLie ? Colors.phosphor : Colors.surfaceHigh }]}>
                  <Text style={[body(13, '900'), { color: isLie ? Colors.ink : Colors.textSecondary }]}>{index + 1}</Text>
                </View>
                <TextInput
                  value={texts[index]}
                  onChangeText={(v) => change(index, v)}
                  placeholder="მოკლედ, ერთი წინადადებით"
                  placeholderTextColor={Colors.textSecondary}
                  multiline
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[body(16, '600'), { color: Colors.textPrimary, flex: 1, minHeight: 44 }]}
                />
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${index + 1} — ეს ტყუილია`}
                  accessibilityState={{ selected: isLie }}
                  onPress={() => {
                    Haptics.tap();
                    setLie(isLie ? null : index);
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                >
                  <MaterialCommunityIcons
                    name={isLie ? 'check-circle' : 'circle-outline'}
                    size={16}
                    color={isLie ? Colors.phosphor : Colors.textSecondary}
                  />
                  <Text style={[body(13, '700'), { color: isLie ? Colors.phosphor : Colors.textSecondary }]}>
                    ეს ტყუილია
                  </Text>
                </Pressable>
                <View style={{ flex: 1 }} />
                {count >= LIMIT - 20 ? (
                  <Text
                    style={[caption(12), Layout.digits, { color: count >= LIMIT ? Colors.neonMagenta : Colors.textSecondary }]}
                  >
                    {count} / {LIMIT}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}

        <Text style={[body(12, '500'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 12 }]}>
          {lie === null
            ? 'მონიშნე, რომელი მოიგონე — ამის გარეშე ვერ გააგრძელებ.'
            : 'მზად ხარ. ღილაკზე დაჭერისთანავე ეკრანი დაიმალება.'}
        </Text>
      </ScrollView>

      <View style={Layout.footer}>
        <PrimaryButton
          title="მზადაა — გადაცემა"
          icon="checkmark"
          tint={Colors.neonMagenta}
          enabled={canSubmit}
          onPress={() => {
            if (lie === null) return;
            engine.submit(trimmed, lie);
            setTexts(['', '', '']);
            setLie(null);
            Haptics.success();
          }}
        />
      </View>
    </View>
  );
}

// ── გამოცნობა

function Guess({ engine, onExit }: { engine: TwoTruthsEngine; onExit: () => void }) {
  return (
    <View style={{ flex: 1, gap: Space.m }}>
      <View style={Layout.topBar}>
        <GameExitButton onExit={onExit} />
        <View style={{ flex: 1 }} />
        <Text style={[body(14, '700'), Layout.digits, { color: Colors.textSecondary }]}>
          {engine.guesserIndex + 1} / {engine.guessers.length}
        </Text>
      </View>

      <View style={{ alignItems: 'center', gap: 4, paddingHorizontal: 24 }}>
        <Text style={[body(15, '700'), { color: Colors.phosphor }]} numberOfLines={1}>
          {engine.currentGuesser?.name ?? '—'}
        </Text>
        <Text style={[titleFont(28), Layout.centered, { color: Colors.textPrimary }]}>რომელია ტყუილი?</Text>
        <Text style={[body(13, '500'), { color: Colors.textSecondary }]} numberOfLines={1}>
          ავტორი — {engine.author.name}
        </Text>
      </View>

      <ScrollView contentContainerStyle={[Layout.content, { paddingVertical: 6, gap: 12 }]}>
        {[0, 1, 2].map((position) => (
          <Pressable
            key={position}
            accessibilityRole="button"
            accessibilityLabel={engine.statementAt(position)}
            onPress={() => {
              Haptics.medium();
              engine.castGuess(position);
            }}
            style={styles.guessRow}
          >
            <View style={[styles.numBadge, { backgroundColor: Colors.surfaceHigh }]}>
              <Text style={[body(13, '900'), { color: Colors.textSecondary }]}>{position + 1}</Text>
            </View>
            <Text style={[body(17, '600'), { color: Colors.textPrimary, flex: 1 }]}>{engine.statementAt(position)}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text
        style={[caption(12), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32, paddingBottom: Space.m }]}
      >
        აირჩიე ის, რომელიც არ გჯერა — არჩევანს ვერავინ დაინახავს.
      </Text>
    </View>
  );
}

// ── ჯერის შედეგი

function Result({ engine, onExit }: { engine: TwoTruthsEngine; onExit: () => void }) {
  useEffect(() => {
    Haptics.success();
  }, []);

  const found = engine.finders.length;
  const fooled = engine.fooled.length;
  const authorPoints = engine.pointsFor(engine.author);

  const head =
    found === 0
      ? {
          icon: 'eye.slash.fill',
          title: 'ტყუილი ვერავინ იპოვა!',
          subtitle: `${engine.author.name} ყველას მოატყუა და +${authorPoints} მიიღო.`,
          color: Colors.neonMagenta,
        }
      : fooled === 0
        ? {
            icon: 'magnifyingglass',
            title: 'ყველამ იპოვა ტყუილი!',
            subtitle: `${engine.author.name}, ამჯერად ბლეფმა არ იმუშავა.`,
            color: Colors.phosphor,
          }
        : {
            icon: 'exclamationmark.circle.fill',
            title: 'ტყუილი ეს იყო',
            subtitle: `${found} მოთამაშემ იპოვა, ${fooled} კი მოტყუვდა.`,
            color: Colors.phosphor,
          };

  const scored = engine.players.filter((p) => engine.pointsFor(p) > 0);

  return (
    <View style={{ flex: 1, gap: 14 }}>
      <View style={Layout.exitSlot}>
        <GameExitButton onExit={onExit} />
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ alignItems: 'center' }}>
        <GlyphIcon name={head.icon} size={30} tint={head.color} />
      </View>

      <Text
        style={[titleFont(27), Layout.centered, { color: head.color, paddingHorizontal: 24 }]}
        adjustsFontSizeToFit
        numberOfLines={2}
      >
        {head.title}
      </Text>

      <Text style={[body(14, '500'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
        {head.subtitle}
      </Text>

      <ScrollView contentContainerStyle={[Layout.content, { paddingVertical: 4, gap: 12 }]}>
        <GlassCard>
          <View style={{ gap: 14 }}>
            {[0, 1, 2].map((position) => {
              const isLie = engine.isLieAt(position);
              const voters = engine.votersAt(position);
              return (
                <View key={position} style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                    <MaterialCommunityIcons
                      name={isLie ? 'close-circle' : 'check-circle'}
                      size={19}
                      color={isLie ? Colors.neonMagenta : Colors.phosphor}
                    />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={[body(15, '600'), { color: Colors.textPrimary }]}>{engine.statementAt(position)}</Text>
                      <Text style={[caption(11), { color: isLie ? Colors.neonMagenta : Colors.phosphor }]}>
                        {isLie ? 'ტყუილი' : 'სიმართლე'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[caption(11), { color: Colors.textSecondary, paddingLeft: 29, opacity: voters.length ? 1 : 0.7 }]}>
                    {voters.length === 0 ? 'ამას არავინ აირჩია' : `აირჩია: ${voters.map((p) => p.name).join(', ')}`}
                  </Text>
                </View>
              );
            })}
          </View>
        </GlassCard>

        {scored.length > 0 ? (
          <GlassCard>
            <View style={{ gap: 8 }}>
              <Text style={[body(13, '700'), { color: Colors.textSecondary }]}>ჯერის ქულები</Text>
              {scored.map((player) => (
                <View key={player.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[body(15, '600'), { color: Colors.textPrimary }]} numberOfLines={1}>
                    {player.name}
                  </Text>
                  {player.id === engine.author.id ? (
                    <View style={styles.authorBadge}>
                      <Text style={[caption(11), { color: Colors.phosphor }]}>ავტორი</Text>
                    </View>
                  ) : null}
                  <View style={{ flex: 1 }} />
                  <Text style={[body(15, '900'), Layout.digits, { color: Colors.phosphor }]}>
                    +{engine.pointsFor(player)}
                  </Text>
                </View>
              ))}
            </View>
          </GlassCard>
        ) : null}
      </ScrollView>

      <View style={Layout.footer}>
        <PrimaryButton
          title={engine.isLastTurn ? 'შედეგები' : 'შემდეგი ჯერი'}
          icon="chevron.right"
          tint={Colors.neonMagenta}
          onPress={() => engine.next()}
        />
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
  engine: TwoTruthsEngine;
  roster: GameFlowProps['roster'];
  onExit: () => void;
}) {

  useAwardOnce(() => {
    PodiumAward.apply(engine.results, roster);
    Haptics.win();
  });

  const top = engine.ranking[0];
  const champion = top && engine.totalFor(top) > 0 ? top : null;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, gap: 14 }}>
        <View style={{ flex: 1 }} />

        <View style={{ alignItems: 'center' }}>
          <GlyphIcon name="trophy.fill" size={31} tint={Colors.phosphor} />
        </View>

        <Text style={[titleFont(28), Layout.centered, { color: Colors.phosphor }]}>ბლეფის ოსტატი</Text>

        <Text style={[body(15, '600'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
          {champion ? `${champion.name} — ${engine.totalFor(champion)} ქულა` : 'ამ პარტიაში ქულა ვერავინ აიღო'}
        </Text>

        <Text style={[body(12, '500'), Layout.centered, { color: Colors.textSecondary, opacity: 0.7 }]}>
          საერთო ტაბლოზე პირველ სამს +3 / +2 / +1 ერიცხება
        </Text>

        <ScrollView contentContainerStyle={[Layout.content, { gap: 8 }]}>
          {engine.ranking.map((player, rank) => (
            <RankRow key={player.id} rank={rank + 1} name={player.name} score={engine.totalFor(player)} highlight={rank === 0} />
          ))}
        </ScrollView>

        <View style={Layout.footer}>
          <PrimaryButton
            title="თავიდან"
            icon="arrow.clockwise"
            tint={Colors.neonMagenta}
            onPress={() => {
              engine.restart();
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
  numBadge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.surfaceHigh,
  },
  statementCard: { gap: 10, padding: 16, borderRadius: Radius.default },
  guessRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 18,
    borderRadius: Radius.default,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  authorBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, backgroundColor: Colors.phosphor + '29' },
});
