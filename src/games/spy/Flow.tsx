import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Radius, Space, body, title as titleFont } from '../../theme/theme';
import { icon as sf } from '../../theme/icons';
import {
  CategoryChip,
  Divider,
  GameExitButton,
  GlassCard,
  GlyphIcon,
  ScreenHeader,
  Stepper,
  ToggleRow,
} from '../../ui/Cards';
import { PrimaryButton, GhostButton } from '../../ui/Buttons';
import { Pressable } from '../../ui/Pressable';
import { PassPhoneReveal } from '../../ui/PassPhoneReveal';
import { DiscussionPanel } from '../../ui/DiscussionPanel';
import { PairBank } from '../../content/banks';
import { Haptics } from '../../core/haptics';
import { useObservable } from '../../core/observable';
import type { GameFlowProps } from '../registry';
import { SpyEngine, type SpyRole } from './engine';

/**
 * „სხვა სიტყვა“ (Undercover) — სრული ნაკადი.
 *
 * პორტი: `Splash/Games/Spy/*.swift` (7 ხედი).
 * **ჯაშუშმა თვითონაც არ იცის, რომ ჯაშუშია** — ბარათი მოქალაქისას არ განსხვავდება.
 */

const TIMER_OPTIONS = [0, 60, 120, 180, 300];

const ROLE_ICON: Record<SpyRole, string> = {
  civilian: 'person.fill',
  undercover: 'theatermasks.fill',
  mrWhite: 'person.fill.questionmark',
};

export function SpyFlow({ roster, onExit }: GameFlowProps) {
  const [engine] = useState(() => new SpyEngine([...roster.players]));
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
    case 'mrWhiteGuess':
      return <MrWhiteGuess engine={engine} onExit={onExit} />;
    case 'roundResult':
      return <RoundResult engine={engine} onExit={onExit} />;
    case 'gameOver':
      return <GameOver engine={engine} roster={roster} onExit={onExit} />;
  }
}

// ── პარამეტრები

function Setup({ engine, onClose }: { engine: SpyEngine; onClose: () => void }) {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <ScreenHeader title="სხვა სიტყვა" subtitle={`${engine.players.length} მოთამაშე`} onBack={onClose} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <GlassCard>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>ჯაშუშები</Text>
              <Text style={[body(13, '500'), { color: Colors.textSecondary }]}>
                მაქსიმუმ {engine.maxUndercovers}
              </Text>
            </View>
            <Stepper
              value={engine.settings.undercoverCount}
              min={1}
              max={engine.maxUndercovers}
              tint={Colors.neonCyan}
              onChange={(v) => engine.setUndercoverCount(v)}
            />
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ opacity: engine.canIncludeMrWhite ? 1 : 0.5 }}>
            <ToggleRow
              title="მისტერ უაითი"
              subtitle={
                engine.canIncludeMrWhite
                  ? 'სიტყვა საერთოდ არ აქვს — ბლეფით უნდა გაძლოს'
                  : 'მინიმუმ 4 მოთამაშე სჭირდება'
              }
              value={engine.settings.includeMrWhite}
              onChange={(v) => {
                if (engine.canIncludeMrWhite) engine.setIncludeMrWhite(v);
              }}
            />
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>კატეგორია</Text>
            <View style={styles.chipRow}>
              <CategoryChip
                label="შემთხვევითი"
                selected={engine.settings.categoryID === null}
                onPress={() => engine.setCategory(null)}
              />
              {PairBank.categories.map((cat) => (
                <CategoryChip
                  key={cat.id}
                  label={`${cat.emoji} ${cat.name}`}
                  selected={engine.settings.categoryID === cat.id}
                  onPress={() => engine.setCategory(cat.id)}
                />
              ))}
            </View>
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>განხილვის დრო</Text>
            <View style={styles.chipRow}>
              {TIMER_OPTIONS.map((secs) => (
                <CategoryChip
                  key={secs}
                  label={secs === 0 ? '∞' : `${secs / 60}:00`}
                  selected={engine.settings.discussionSeconds === secs}
                  onPress={() => engine.setDiscussionSeconds(secs === 0 ? 30 : secs)}
                />
              ))}
            </View>
          </View>
        </GlassCard>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          title="თამაშის დაწყება"
          icon="play.fill"
          tint={Colors.neonCyan}
          onPress={() => engine.startGame()}
        />
      </View>
    </View>
  );
}

// ── ბარათები

function Reveal({ engine, onExit }: { engine: SpyEngine; onExit: () => void }) {
  const player = engine.currentRevealPlayer;
  if (!player) return null;

  const info = engine.card(player);
  const isLast = engine.revealIndex + 1 >= engine.players.length;

  return (
    <PassPhoneReveal
      key={engine.revealIndex}
      playerName={player.name}
      index={engine.revealIndex}
      total={engine.players.length}
      headerLeft="შენი სიტყვა"
      card={{
        word: info.word,
        hint: null,
        note: info.note,
        tint: info.isSpecial ? Colors.phosphor : Colors.textPrimary,
      }}
      nextTitle={isLast ? 'ვნახე — დაწყება' : 'ვნახე — შემდეგი'}
      onNext={() => engine.advanceReveal()}
      onExit={onExit}
    />
  );
}

// ── განხილვა

function Discussion({ engine, onExit }: { engine: SpyEngine; onExit: () => void }) {
  return (
    <DiscussionPanel
      key={engine.turn}
      title={`რაუნდი ${engine.turn} — თითოეული ერთი სიტყვით აღწერს თავისას`}
      starterName={engine.startingPlayer?.name}
      seconds={engine.settings.discussionSeconds}
      tips={[
        'შენი სიტყვა შეიძლება სხვებისას ოდნავ ასცდეს — ეს ნორმალურია.',
        'ზედმეტად ზუსტი ნუ იქნები, თორემ ჯაშუში მიხვდება.',
        'მოუსმინე — ვინც ოდნავ „აცდენილად“ აღწერს, ალბათ ჯაშუშია.',
      ]}
      accent={Colors.neonCyan}
      actionTitle="კენჭისყრა"
      onAction={() => engine.beginVoting()}
      onExit={onExit}
    />
  );
}

// ── კენჭისყრა

function Voting({ engine, onExit }: { engine: SpyEngine; onExit: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <View style={{ flex: 1, gap: 18 }}>
      <View style={styles.exitSlot}>
        <GameExitButton onExit={onExit} />
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ alignItems: 'center', gap: 6 }}>
        <Text style={[titleFont(28), { color: Colors.textPrimary }]}>ვინ გავაძევოთ?</Text>
        <Text style={[body(14, '500'), { color: Colors.textSecondary }]}>
          რაუნდი {engine.turn} · დარჩა {engine.alive.length}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.nameGrid}>
        {engine.alive.map((player) => {
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
                { backgroundColor: on ? Colors.neonCyan : Colors.surface, borderColor: on ? 'transparent' : Colors.stroke },
              ]}
            >
              <Text
                style={[body(17, '700'), styles.centered, { color: on ? Colors.ink : Colors.textPrimary }]}
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

      <View style={styles.footer}>
        <PrimaryButton
          title="გაძევება"
          icon="person.fill.xmark"
          tint={Colors.neonCyan}
          enabled={selected !== null}
          onPress={() => {
            const player = engine.alive.find((p) => p.id === selected);
            if (player) engine.eliminate(player);
          }}
        />
      </View>
    </View>
  );
}

// ── მისტერ უაითის ბოლო შანსი

function MrWhiteGuess({ engine, onExit }: { engine: SpyEngine; onExit: () => void }) {
  return (
    <View style={{ flex: 1, gap: Space.m }}>
      <View style={styles.exitSlot}>
        <GameExitButton onExit={onExit} />
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ alignItems: 'center' }}>
        <GlyphIcon name="person.fill.questionmark" size={31} tint={Colors.neonCyan} />
      </View>

      <View style={{ alignItems: 'center', gap: 6 }}>
        <Text style={[titleFont(26), styles.centered, { color: Colors.phosphor }]}>მისტერ უაითი გააძევეს!</Text>
        <Text style={[body(15, '500'), styles.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
          {engine.lastEliminated?.name ?? '—'}, დაასახელე მოქალაქეების სიტყვა — და თამაშს მარტო წაიღებ.
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 8, gap: 10 }}>
        {engine.mrWhiteOptions.map((word) => (
          <Pressable
            key={word}
            accessibilityRole="button"
            accessibilityLabel={word}
            onPress={() => {
              Haptics.heavy();
              engine.submitMrWhiteGuess(word);
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

// ── რაუნდის შედეგი

function RoundResult({ engine, onExit }: { engine: SpyEngine; onExit: () => void }) {
  useEffect(() => {
    Haptics.warning();
  }, []);

  const role = engine.lastEliminated ? engine.roleOf(engine.lastEliminated) : 'civilian';
  const badge =
    role === 'civilian'
      ? { icon: 'person.fill', title: 'მოქალაქე იყო', color: Colors.neonCyan }
      : role === 'undercover'
        ? { icon: 'theatermasks.fill', title: 'ჯაშუში იყო!', color: Colors.phosphor }
        : { icon: 'person.fill.questionmark', title: 'მისტერ უაითი იყო', color: Colors.phosphor };

  return (
    <View style={{ flex: 1, gap: 18 }}>
      <View style={styles.exitSlot}>
        <GameExitButton onExit={onExit} />
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ alignItems: 'center' }}>
        <GlyphIcon name={badge.icon} size={32} tint={badge.color} />
      </View>

      <Text
        style={[titleFont(32), styles.centered, { color: Colors.textPrimary, paddingHorizontal: 24 }]}
        adjustsFontSizeToFit
        numberOfLines={2}
      >
        {engine.lastEliminated?.name ?? '—'}
      </Text>

      <Text style={[body(18, '700'), styles.centered, { color: badge.color }]}>{badge.title}</Text>

      {engine.mrWhiteGuess ? (
        <Text style={[body(14, '500'), styles.centered, { color: Colors.textSecondary }]}>
          ვარაუდი: „{engine.mrWhiteGuess}“ — არასწორია
        </Text>
      ) : null}

      <View style={{ paddingHorizontal: 24 }}>
        <GlassCard>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Stat label="დარჩა" value={String(engine.alive.length)} />
            <View style={styles.vDivider} />
            <Stat label="რაუნდი" value={String(engine.turn)} />
            <View style={styles.vDivider} />
            <Stat label="გაძევდა" value={String(engine.eliminated.size)} />
          </View>
        </GlassCard>
      </View>

      <Text style={[body(14, '500'), styles.centered, { color: Colors.textSecondary }]}>
        თამაში გრძელდება — ტელეფონი ისევ მაგიდაზე.
      </Text>

      <View style={{ flex: 1 }} />

      <View style={styles.footer}>
        <PrimaryButton
          title="შემდეგი რაუნდი"
          icon="chevron.right"
          tint={Colors.neonCyan}
          onPress={() => engine.continueGame()}
        />
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 3 }}>
      <Text style={[titleFont(20), { color: Colors.textPrimary, fontVariant: ['tabular-nums'] }]}>{value}</Text>
      <Text style={[body(12, '500'), { color: Colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

// ── თამაშის დასასრული

function GameOver({
  engine,
  roster,
  onExit,
}: {
  engine: SpyEngine;
  roster: GameFlowProps['roster'];
  onExit: () => void;
}) {
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (applied) return;
    setApplied(true);
    for (const [id, points] of Object.entries(engine.finalPoints)) roster.addScore(points, id);
    Haptics.success();
  }, [applied, engine, roster]);

  const head =
    engine.winner === 'civilians'
      ? {
          icon: 'party.popper.fill',
          title: 'მოქალაქეებმა გაიმარჯვეს!',
          subtitle: 'ყველა ჯაშუში გაძევდა — ერთმაც ვერ გაძლო ბოლომდე.',
          color: Colors.phosphor,
        }
      : engine.winner === 'undercovers'
        ? {
            icon: 'theatermasks.fill',
            title: 'ჯაშუშებმა გაიმარჯვეს!',
            subtitle: 'მოქალაქეები იმდენად შემცირდნენ, რომ ჯაშუშები რაოდენობით გაუტოლდნენ.',
            color: Colors.neonCyan,
          }
        : engine.winner === 'mrWhite'
          ? {
              icon: 'person.fill.questionmark',
              title: 'მისტერ უაითმა მარტო მოიგო!',
              subtitle: `სიტყვა ზუსტად დაასახელა — „${engine.civilianWord}“.`,
              color: Colors.phosphor,
            }
          : { icon: 'flag.checkered', title: 'თამაში დასრულდა', subtitle: '', color: Colors.textPrimary };

  return (
    <View style={{ flex: 1, gap: 14 }}>
      <View style={{ flex: 1 }} />

      <View style={{ alignItems: 'center' }}>
        <GlyphIcon name={head.icon} size={32} tint={head.color} />
      </View>

      <Text style={[titleFont(28), styles.centered, { color: head.color, paddingHorizontal: 24 }]}>{head.title}</Text>

      {head.subtitle ? (
        <Text style={[body(15, '500'), styles.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
          {head.subtitle}
        </Text>
      ) : null}

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}>
        <GlassCard>
          <View style={{ gap: 12 }}>
            <Row label="მოქალაქეების სიტყვა" value={engine.civilianWord} tint={Colors.neonCyan} />
            <Divider />
            <Row label="ჯაშუშის სიტყვა" value={engine.undercoverWord} tint={Colors.neonMagenta} />
            <Divider />
            <Row label="კატეგორია" value={engine.categoryLabel} />
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 10 }}>
            <Text style={[body(13, '700'), { color: Colors.textSecondary }]}>ვინ ვინ იყო</Text>
            {engine.players.map((p) => {
              const points = engine.finalPoints[p.id] ?? 0;
              const out = engine.eliminated.has(p.id);
              return (
                <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialCommunityIcons
                    name={sf(ROLE_ICON[engine.roleOf(p)])}
                    size={16}
                    color={Colors.textSecondary}
                  />
                  <Text
                    style={[
                      body(15, '600'),
                      { color: Colors.textPrimary, flex: 1 },
                      out ? styles.struck : null,
                    ]}
                    numberOfLines={1}
                  >
                    {p.name}
                  </Text>
                  {points > 0 ? (
                    <Text style={[body(15, '900'), { color: Colors.phosphor, fontVariant: ['tabular-nums'] }]}>
                      +{points}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        </GlassCard>
      </ScrollView>

      <View style={[styles.footer, { gap: 10 }]}>
        <PrimaryButton
          title="თავიდან"
          icon="arrow.clockwise"
          tint={Colors.neonCyan}
          onPress={() => {
            setApplied(false);
            engine.restart();
          }}
        />
        <GhostButton title="დასრულება" icon="xmark" onPress={onExit} />
      </View>
    </View>
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
  scroll: { paddingHorizontal: 20, paddingTop: Space.m, paddingBottom: 24, gap: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  footer: { paddingHorizontal: 24, paddingBottom: Space.m },
  exitSlot: { position: 'absolute', top: 10, left: 20, zIndex: 10 },
  centered: { textAlign: 'center' },
  struck: { textDecorationLine: 'line-through' },
  nameGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 24, paddingVertical: 8 },
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
  vDivider: { width: 1, height: 34, backgroundColor: Colors.stroke },
});
