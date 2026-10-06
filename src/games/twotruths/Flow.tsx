import { PlayerCharacter } from '../../ui/PlayerCharacter';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Colors, Radius, Space, body, caption, title as titleFont } from '../../theme/theme';
import { GameExitButton, GlassCard, ScreenHeader, RulesSheet } from '../../ui/Cards';
import { PrimaryButton, GhostButton } from '../../ui/Buttons';
import { Pressable } from '../../ui/Pressable';
import { Layout } from '../../ui/layout';
import { FitText } from '../../ui/FitText';
import { Haptics } from '../../core/haptics';
import { useObservable } from '../../core/observable';
import type { GameFlowProps } from '../registry';
import { TwoTruthsEngine } from './engine';
import { game as findGame } from '../catalog';
import { Icon } from '../../ui/Icon';

/**
 * „ორი სიმართლე, ერთი ტყუილი“ — სრული ნაკადი.
 *
 * პორტი: `Splash/Games/TwoTruths/*.swift`. ქულები არ არის — ვინ მიხვდა, მაგიდასთან ჩანს.
 * დაწერილი ამბები **არსად ინახება** — პარტიის დასრულებისთანავე ქრება.
 */

const LIMIT = 80;

export function TwoTruthsFlow({ roster, onExit }: GameFlowProps) {
  const [engine] = useState(() => new TwoTruthsEngine([...roster.players]));
  useObservable(engine);
  useEffect(() => { if (engine.phase === 'setup' && engine.players.length >= 3) engine.startGame(); }, [engine]);

  switch (engine.phase) {
    case 'setup':
      return <Setup engine={engine} onClose={onExit} />;
    case 'writeHandoff':
      return (
        <Pass
          key={`write-${engine.turnIndex}`}
          playerName={engine.author.name}
          headline="შენი ჯერია"
          note="დაწერე სამი ამბავი შენს თავზე: ორი მართალი, ერთი მოგონილი."
          actionTitle="დაწერა"
          icon="square.and.pencil"
          onStart={() => engine.beginWriting()}
          onExit={onExit}
        />
      );
    case 'write':
      return <Write key={`writing-${engine.turnIndex}`} engine={engine} onExit={onExit} />;
    case 'show':
      return <Show key={`show-${engine.turnIndex}`} engine={engine} onExit={onExit} />;
    case 'reveal':
      return <Reveal key={`reveal-${engine.turnIndex}`} engine={engine} onExit={onExit} />;
  }
}

// ── პარამეტრები

function Setup({ engine, onClose }: { engine: TwoTruthsEngine; onClose: () => void }) {
  const [showRules, setShowRules] = useState(false);
  const gameData = findGame('twotruths');
  return (
    <View style={{ flex: 1 }}>
      <RulesSheet visible={showRules} title={gameData?.title ?? '2 Truths, 1 Lie'} accent={Colors.neonMagenta} steps={gameData?.howTo ?? []} onClose={() => setShowRules(false)} />

      <View style={Layout.header}>
        <ScreenHeader
          title="2 Truths, 1 Lie"

          onBack={onClose}
         onInfo={() => setShowRules(true)} />
      </View>

      <View style={{ flex: 1 }} />

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

// ── ტელეფონის გადაცემა

function Pass({
  playerName,
  note,
  actionTitle,
  icon,
  onStart,
  onExit,
}: {
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
      </View>
      <View style={{ flex: 1 }} />
      <PlayerCharacter name={playerName} />

      <View style={{ gap: 6, paddingHorizontal: 24 }}>
        <FitText style={[titleFont(28), Layout.centered, { color: Colors.textPrimary }]} maxLines={1}>
          {playerName}
        </FitText>
      </View>

      <View style={{ flex: 1 }} />

      <View style={Layout.footer}>
        <Text style={[body(12, '500'), Layout.centered, { color: Colors.textSecondary, opacity: 0.8, paddingHorizontal: 8 }]}>
          {note}
        </Text>
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
  // ძრავი ერთნაირ ამბებს არ იღებს — ღილაკიც იმავე წესით უნდა ირთვებოდეს.
  const canSubmit = TwoTruthsEngine.isValid(trimmed, lie);
  const writingHint = trimmed.some((text) => !text)
    ? 'შეავსე სამივე ამბავი.'
    : new Set(trimmed).size !== 3
      ? 'სამივე ამბავი ერთმანეთისგან უნდა განსხვავდებოდეს.'
      : lie === null
        ? 'მონიშნე, რომელი მოიგონე.'
        : null;

  const change = (index: number, value: string) => {
    setTexts((prev) => {
      const next = [...prev];
      next[index] = value.replace(/\n/g, ' ').slice(0, LIMIT);
      return next;
    });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={Layout.topBar}>
        <GameExitButton onExit={onExit} />
        <View style={{ gap: 1 }}>
          <Text style={[body(17, '700'), { color: Colors.textPrimary }]} numberOfLines={1}>
            {engine.author.name}
          </Text>
          <Text style={[caption(12), { color: Colors.textSecondary }]}>ორი მართალი, ერთი მოგონილი</Text>
        </View>
        <View style={{ flex: 1 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20, gap: 12 }}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
      >
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
                <Icon name={'shuffle'} size={12} color={Colors.textSecondary} />
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
                  spellCheck={false}
                  autoComplete="off"
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
                  <Icon
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

        {writingHint ? (
          <Text style={[body(12, '500'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 12 }]}>
            {writingHint}
          </Text>
        ) : null}
      </ScrollView>

      <View style={Layout.footer}>
        <PrimaryButton
          title="მზადაა"
          icon="checkmark"
          tint={Colors.neonMagenta}
          enabled={canSubmit}
          onPress={() => {
            if (lie === null || !engine.submit(trimmed, lie)) return;
            setTexts(['', '', '']);
            setLie(null);
            Haptics.success();
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

// ── სამი ამბავი — ყველა თითებით აჩვენებს ტყუილის ნომერს

function Statements({ engine, revealed }: { engine: TwoTruthsEngine; revealed: boolean }) {
  return (
    <>
      {[0, 1, 2].map((position) => {
        const isLie = revealed && engine.isLieAt(position);
        return (
          <View key={position} style={[styles.guessRow, revealed && { borderColor: isLie ? Colors.neonMagenta : Colors.stroke }]}>
            <View style={[styles.numBadge, { backgroundColor: isLie ? Colors.neonMagenta : Colors.surfaceHigh }]}>
              <Text style={[body(13, '900'), { color: isLie ? Colors.ink : Colors.textSecondary }]}>{position + 1}</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[body(17, '600'), { color: Colors.textPrimary }]}>{engine.statementAt(position)}</Text>
              {revealed ? (
                <Text style={[caption(11), { color: isLie ? Colors.neonMagenta : Colors.phosphor }]}>
                  {isLie ? 'ტყუილი' : 'სიმართლე'}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </>
  );
}

function Show({ engine, onExit }: { engine: TwoTruthsEngine; onExit: () => void }) {
  return (
    <View style={{ flex: 1, gap: Space.m }}>
      <View style={Layout.exitSlot}>
        <GameExitButton onExit={onExit} />
      </View>

      <View style={{ alignItems: 'center', gap: 4, paddingHorizontal: 24 }}>
        <Text style={[titleFont(28), Layout.centered, { color: Colors.textPrimary }]}>რომელია ტყუილი?</Text>
        <Text style={[body(13, '500'), { color: Colors.textSecondary }]} numberOfLines={1}>
          ავტორი — {engine.author.name}
        </Text>
      </View>

      <ScrollView contentContainerStyle={[Layout.content, { paddingVertical: 6, gap: 12 }]}>
        <Statements engine={engine} revealed={false} />
      </ScrollView>

      <Text style={[caption(12), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
        {engine.author.name} ხმამაღლა კითხულობს. სამზე ყველა თითებით აჩვენებს ტყუილის ნომერს.
      </Text>

      <View style={Layout.footer}>
        <PrimaryButton title="ტყუილის გამოჩენა" icon="chevron.right" tint={Colors.neonMagenta} onPress={() => engine.revealLie()} />
      </View>
    </View>
  );
}

function Reveal({ engine, onExit }: { engine: TwoTruthsEngine; onExit: () => void }) {
  useEffect(() => {
    Haptics.success();
  }, []);

  return (
    <View style={{ flex: 1, gap: Space.m }}>
      <View style={Layout.exitSlot}>
        <GameExitButton onExit={onExit} />
      </View>

      <Text style={[titleFont(27), Layout.centered, { color: Colors.neonMagenta, paddingHorizontal: 24 }]}>ტყუილი ეს იყო</Text>

      <ScrollView contentContainerStyle={[Layout.content, { paddingVertical: 6, gap: 12 }]}>
        <Statements engine={engine} revealed />
      </ScrollView>

      <View style={Layout.footer}>
        <PrimaryButton title="შემდეგი" icon="chevron.right" tint={Colors.neonMagenta} onPress={() => engine.next()} />
        <GhostButton title="დასრულება" icon="xmark" onPress={onExit} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
