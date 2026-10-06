import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Space, body, title as titleFont } from '../../theme/theme';
import {
  CategoryChip,
  Divider,
  GameExitButton,
  GlassCard,
  ScreenHeader,
  Stepper,
  ToggleRow,
  CategoryChecklist, RulesSheet } from '../../ui/Cards';
import { keyedEntries } from '../categoryEntries';
import { PrimaryButton, GhostButton } from '../../ui/Buttons';
import { Pressable } from '../../ui/Pressable';
import { PassPhoneReveal } from '../../ui/PassPhoneReveal';
import { DiscussionPanel } from '../../ui/DiscussionPanel';
import { Layout } from '../../ui/layout';
import { Confetti } from '../../ui/Confetti';
import { DISCUSSION_OPTIONS, discussionLabel } from '../../core/settings';
import { PairBank } from '../../content/banks';
import { Haptics } from '../../core/haptics';
import { useObservable } from '../../core/observable';
import { useAwardOnce } from '../../core/awardOnce';
import type { GameFlowProps } from '../registry';
import { SpyEngine, type SpyRole } from './engine';
import { game as findGame } from '../catalog';
import { Icon } from '../../ui/Icon';
import { FitText } from '../../ui/FitText';

/**
 * „სხვა სიტყვა“ (Undercover) — სრული ნაკადი.
 *
 * პორტი: `Splash/Games/Spy/*.swift`.
 * **ჯაშუშმა თვითონაც არ იცის, რომ ჯაშუშია** — ბარათი მოქალაქისას არ განსხვავდება.
 */

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
      return <GameOver engine={engine} onExit={onExit} />;
  }
}

// ── პარამეტრები

function Setup({ engine, onClose }: { engine: SpyEngine; onClose: () => void }) {
  const [showRules, setShowRules] = useState(false);
  const gameData = findGame('spy');
  return (
    <View style={{ flex: 1 }}>
      <RulesSheet visible={showRules} title={gameData?.title ?? 'Spyfall'} accent={Colors.neonCyan} steps={gameData?.howTo ?? []} onClose={() => setShowRules(false)} />

      <View style={Layout.header}>
        <ScreenHeader title="Spyfall"  onBack={onClose}  onInfo={() => setShowRules(true)} />
      </View>

      <ScrollView contentContainerStyle={Layout.scroll}>
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
                  : 'მინიმუმ 5 მოთამაშე სჭირდება'
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
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>კატეგორიები</Text>
            <CategoryChecklist
              build={() => keyedEntries(PairBank, 'pair', (c) => c.pairs.map((p) => `${p.a}|${p.b}`), 'შემთხვევითი')}
              selectedIDs={engine.settings.categoryIDs}
              onChange={(ids) => engine.setCategories(ids)}
            />
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>განხილვის დრო</Text>
            <View style={Layout.segmentRow}>
              {DISCUSSION_OPTIONS.map((secs) => (
                <CategoryChip
                  compact
                  key={secs}
                  label={discussionLabel(secs)}
                  selected={engine.settings.discussionTimer === secs}
                  onPress={() => engine.setDiscussionSeconds(secs)}
                />
              ))}
            </View>
          </View>
        </GlassCard>

      </ScrollView>

      <View style={Layout.footer}>
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
      confirmFirst
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
      title="თითოეული ერთი სიტყვით აღწერს თავისას"
      starterName={engine.startingPlayer?.name}
      seconds={engine.settings.discussionTimer}
      tips={[]}
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
      <View style={Layout.exitSlot}>
        <GameExitButton onExit={onExit} />
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ alignItems: 'center', gap: 6 }}>
        <Text style={[titleFont(28), { color: Colors.textPrimary }]}>ვინ გავაძევოთ?</Text>
        <Text style={[body(14, '500'), { color: Colors.textSecondary }]}>
          რაუნდი {engine.turn} · დარჩა {engine.alive.length}
        </Text>
      </View>

      <ScrollView contentContainerStyle={Layout.nameGrid}>
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
      <View style={Layout.exitSlot}>
        <GameExitButton onExit={onExit} />
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ alignItems: 'center', gap: 6 }}>
        <Text style={[titleFont(26), Layout.centered, { color: Colors.phosphor }]}>მისტერ უაითი გააძევეს!</Text>
        <Text style={[body(15, '500'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
          {engine.lastEliminated?.name ?? '—'}, დაასახელე მოქალაქეების სიტყვა და მარტო მოიგებ.
        </Text>
      </View>

      <ScrollView contentContainerStyle={[Layout.content, { paddingVertical: 8, gap: 10 }]}>
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
            <FitText style={[body(18, '700'), Layout.centered, { color: Colors.textPrimary }]} maxLines={2}>
              {word}
            </FitText>
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
      <View style={Layout.exitSlot}>
        <GameExitButton onExit={onExit} />
      </View>

      <View style={{ flex: 1 }} />

      <Text
        style={[titleFont(32), Layout.centered, { color: Colors.textPrimary, paddingHorizontal: 24 }]}
        adjustsFontSizeToFit
        numberOfLines={2}
      >
        {engine.lastEliminated?.name ?? '—'}
      </Text>

      <Text style={[body(18, '700'), Layout.centered, { color: badge.color }]}>{badge.title}</Text>

      {engine.mrWhiteGuess ? (
        <Text style={[body(14, '500'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 24 }]}>
          ვარაუდი: „{engine.mrWhiteGuess}“ · არასწორია
        </Text>
      ) : null}

      <View style={{ flex: 1 }} />

      <View style={Layout.footer}>
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

// ── თამაშის დასასრული

function GameOver({ engine, onExit }: { engine: SpyEngine; onExit: () => void }) {
  useAwardOnce(() => {
    Haptics.success();
  });

  const head =
    engine.winner === 'civilians'
      ? { icon: 'party.popper.fill', title: 'მოქალაქეებმა გაიმარჯვეს!', color: Colors.phosphor }
      : engine.winner === 'undercovers'
        ? { icon: 'theatermasks.fill', title: 'ჯაშუშებმა გაიმარჯვეს!', color: Colors.neonCyan }
        : engine.winner === 'mrWhite'
          ? { icon: 'person.fill.questionmark', title: 'მისტერ უაითმა მარტო მოიგო!', color: Colors.phosphor }
          : { icon: 'flag.checkered', title: 'თამაში დასრულდა', color: Colors.textPrimary };

  return (
    <View style={{ flex: 1, gap: 14 }}>
      <View style={{ flex: 1 }} />

      <Text style={[titleFont(28), Layout.centered, { color: head.color, paddingHorizontal: 24 }]}>{head.title}</Text>

      {engine.winner === 'mrWhite' ? (
        <Text style={[body(15, '500'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
          სიტყვა ზუსტად დაასახელა: „{engine.civilianWord}“.
        </Text>
      ) : null}

      <ScrollView contentContainerStyle={[Layout.content, { gap: 12 }]}>
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
              const out = engine.eliminated.has(p.id);
              return (
                <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Icon
                    name={ROLE_ICON[engine.roleOf(p)]}
                    size={16}
                    color={Colors.textSecondary}
                  />
                  <Text
                    style={[
                      body(15, '600'),
                      { color: Colors.textPrimary, flex: 1 },
                      out ? Layout.struck : null,
                    ]}
                    numberOfLines={1}
                  >
                    {p.name}
                  </Text>
                </View>
              );
            })}
          </View>
        </GlassCard>
      </ScrollView>

      <View style={Layout.footer}>
        <PrimaryButton
          title="თავიდან"
          icon="arrow.clockwise"
          tint={Colors.neonCyan}
          onPress={() => {
            engine.restart();
          }}
        />
        <GhostButton title="დასრულება" icon="xmark" onPress={onExit} />
      </View>
      {engine.winner ? <Confetti /> : null}
    </View>
  );
}

function Row({ label, value, tint = Colors.textPrimary }: { label: string; value: string; tint?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
      <Text style={[body(14, '500'), { color: Colors.textSecondary }]}>{label}</Text>
      <View style={{ flex: 1 }} />
      <FitText style={[body(16, '700'), { color: tint, textAlign: 'right', flexShrink: 1 }]} maxLines={3}>
        {value}
      </FitText>
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
    paddingHorizontal: 16,
    borderRadius: Radius.small,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
});
