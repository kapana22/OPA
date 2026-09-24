import { PlayerCharacter } from '../../ui/PlayerCharacter';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { Colors, Space, body, title as titleFont } from '../../theme/theme';
import { CategoryChip, GameExitButton, GlassCard, GlyphIcon, ScreenHeader, CategoryPicker , RulesSheet } from '../../ui/Cards';
import { wordEntries } from '../categoryEntries';
import { PrimaryButton, GhostButton } from '../../ui/Buttons';
import { Pressable } from '../../ui/Pressable';
import { Layout } from '../../ui/layout';
import { useKeepScreenAwake } from '../../core/orientationLock';
import { WordBank } from '../../content/banks';
import { Haptics } from '../../core/haptics';
import { useObservable } from '../../core/observable';
import { useAwardOnce } from '../../core/awardOnce';
import type { GameFlowProps } from '../registry';
import { BombEngine } from './engine';
import { game as findGame } from '../catalog';

/**
 * „ბომბი“ — სრული ნაკადი.
 *
 * პორტი: `Splash/Games/Bomb/*.swift`.
 * ტაიმერი **დამალულია** — არავინ იცის, როდის აფეთქდება; ეს თამაშის მთელი აზრია.
 */

const RANGES: [string, number, number][] = [
  ['მოკლე', 15, 35],
  ['საშუალო', 20, 60],
  ['გრძელი', 40, 90],
];

export function BombFlow({ roster, onExit }: GameFlowProps) {
  const [engine] = useState(() => new BombEngine([...roster.players]));
  useObservable(engine);

  // ეკრანიდან გასვლისას ტკაცუნი ფონში არ უნდა დარჩეს.
  useEffect(() => () => engine.abandon(), [engine]);

  switch (engine.phase) {
    case 'setup':
      return <Setup engine={engine} onClose={onExit} />;
    case 'playing':
      return (
        <Play
          engine={engine}
          onExit={() => {
            engine.backToSetup();
            onExit();
          }}
        />
      );
    case 'exploded':
      return <Exploded engine={engine} onExit={onExit} />;
    case 'gameOver':
      return <GameOver engine={engine} roster={roster} onExit={onExit} />;
  }
}

// ── პარამეტრები

function Setup({ engine, onClose }: { engine: BombEngine; onClose: () => void }) {
  const [showRules, setShowRules] = useState(false);
  const gameData = findGame('bomb');
  return (
    <View style={{ flex: 1 }}>
      <RulesSheet visible={showRules} title="Bomb Party" accent={Colors.neonMagenta} steps={gameData?.howTo ?? []} onClose={() => setShowRules(false)} />

      <View style={Layout.header}>
        <ScreenHeader title="Bomb Party" subtitle={`${engine.players.length} მოთამაშე`} onBack={onClose}  onInfo={() => setShowRules(true)} />
      </View>

      <ScrollView contentContainerStyle={Layout.scroll}>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>სიცოცხლე</Text>
            <View style={Layout.segmentRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <CategoryChip
                  compact
                  key={n}
                  label={String(n)}
                  selected={engine.settings.lives === n}
                  onPress={() => engine.setLives(n)}
                />
              ))}
            </View>
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>ფითილის სიგრძე</Text>
            <View style={Layout.segmentRow}>
              {RANGES.map(([name, lo, hi]) => (
                <CategoryChip
                  compact
                  key={name}
                  label={name}
                  selected={engine.settings.minSeconds === lo && engine.settings.maxSeconds === hi}
                  onPress={() => engine.setRange(lo, hi)}
                />
              ))}
            </View>
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>კატეგორია</Text>
            <CategoryPicker
              build={() => wordEntries(WordBank, 'შემთხვევითი', null, false)}
              selectedID={engine.settings.categoryID}
              onSelect={(id) => engine.setCategory(id)}
            />
          </View>
        </GlassCard>
      </ScrollView>

      <View style={Layout.footer}>
        <PrimaryButton
          title="ფითილის დანთება"
          icon="flame.fill"
          tint={Colors.neonMagenta}
          onPress={() => engine.startGame()}
        />
      </View>
    </View>
  );
}

// ── თამაში

function Play({ engine, onExit }: { engine: BombEngine; onExit: () => void }) {
  // ტაიმერიან თამაშში ეკრანი არ უნდა ჩაქრეს.
  useKeepScreenAwake();

  // ფიტილის ბოლო მეოთხედში ეკრანი წითლად ფეთქავს და ოდნავ ირყევა — ეს ის
  // მომენტია, როცა ტკაცუნიც ჩქარდება. ანიმაცია ნატიურ ძაფზე მიდის, ამიტომ
  // ძრავს წამში ოცჯერ გადახატვა აღარ სჭირდება: `isHot` ერთხელ ირთვება.
  const pulse = useSharedValue(0);
  const shake = useSharedValue(0);
  useEffect(() => {
    if (!engine.isHot) return;
    pulse.value = withRepeat(withTiming(1, { duration: 420 }), -1, true);
    shake.value = withRepeat(withSequence(withTiming(-3, { duration: 70 }), withTiming(3, { duration: 70 })), -1, true);
  }, [engine.isHot, pulse, shake]);

  const glow = useAnimatedStyle(() => ({ opacity: pulse.value * 0.22 }));
  const jitter = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  return (
    <Animated.View style={[{ flex: 1, gap: 18 }, jitter]}>
      {engine.isHot ? (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: Colors.neonMagenta }, glow]}
        />
      ) : null}
      <View style={Layout.topBar}>
        <GameExitButton onExit={onExit} />
        <Text style={[body(14, '700'), { color: Colors.textSecondary }]}>რაუნდი {engine.round}</Text>
        <View style={{ flex: 1 }} />
        <Text style={[body(14, '700'), { color: Colors.textSecondary }]}>დარჩა {engine.alive.length}</Text>
      </View>

      <View style={{ flex: 1 }} />

      <PlayerCharacter player={engine.currentPlayer} compact />
      <View style={{ gap: 6, paddingHorizontal: 24 }}>
        <Text style={[titleFont(36), Layout.centered, { color: Colors.textPrimary }]} adjustsFontSizeToFit numberOfLines={1}>
          {engine.currentPlayer?.name ?? '—'}
        </Text>
        <Text style={[body(15, '500'), Layout.centered, { color: Colors.textSecondary }]}>ბომბი აქვს</Text>
      </View>

      <View style={Layout.content}>
        <GlassCard>
          <View style={{ gap: 6, alignItems: 'center' }}>
            <Text style={[body(13, '700'), { color: Colors.textSecondary }]}>დაასახელე</Text>
            <Text style={[titleFont(24), Layout.centered, { color: Colors.phosphor }]}>
              {engine.category.emoji} {engine.category.name}
            </Text>
          </View>
        </GlassCard>
      </View>

      <View style={{ flex: 1 }} />

      <View style={Layout.footer}>
        <PrimaryButton
          title="მოვასწარი — გადავეცი"
          icon="chevron.right"
          tint={Colors.neonMagenta}
          onPress={() => engine.pass()}
        />
      </View>
    </Animated.View>
  );
}

// ── აფეთქება

function Exploded({ engine, onExit }: { engine: BombEngine; onExit: () => void }) {
  const victim = engine.victim;
  const left = victim ? engine.livesLeft(victim) : 0;

  return (
    <View style={{ flex: 1, gap: Space.m }}>
      <View style={Layout.exitSlot}>
        <GameExitButton onExit={onExit} />
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ alignItems: 'center' }}>
        <GlyphIcon name="burst.fill" size={44} tint={Colors.neonMagenta} />
      </View>

      <Text
        style={[titleFont(34), Layout.centered, { color: Colors.neonMagenta, paddingHorizontal: 24 }]}
        adjustsFontSizeToFit
        numberOfLines={2}
      >
        {victim?.name ?? '—'}
      </Text>

      <Text style={[body(16, '600'), Layout.centered, { color: Colors.textSecondary }]}>
        {left === 0 ? 'სიცოცხლე აღარ დარჩა — თამაშიდან გავიდა' : `დარჩა ${left} სიცოცხლე`}
      </Text>

      <View style={Layout.content}>
        <GlassCard>
          <View style={{ gap: 8 }}>
            {engine.players.map((p) => {
              const lives = engine.livesLeft(p);
              const isVictim = p.id === victim?.id;
              // ბომბი გადაცემისას აფეთქდა — სხვა ცოცხალ მოთამაშეზე შეხება ბრალს გადაიტანს.
              const canPick = !isVictim && lives > 0;
              return (
                <Pressable
                  key={p.id}
                  disabled={!canPick}
                  accessibilityRole={canPick ? 'button' : undefined}
                  onPress={() => engine.reassignVictim(p)}
                  style={{ flexDirection: 'row', alignItems: 'center', minHeight: 32 }}
                >
                  <Text
                    style={[
                      body(15, isVictim ? '800' : '600'),
                      {
                        color: isVictim ? Colors.neonMagenta : lives > 0 ? Colors.textPrimary : Colors.textSecondary,
                        flex: 1,
                      },
                      lives === 0 && !isVictim ? Layout.struck : null,
                    ]}
                    numberOfLines={1}
                  >
                    {p.name}
                  </Text>
                  <Text style={{ fontSize: 13, color: Colors.neonMagenta }}>{'♥'.repeat(lives)}</Text>
                </Pressable>
              );
            })}
          </View>
        </GlassCard>
        <Text style={[body(13, '500'), Layout.centered, { color: Colors.textSecondary, marginTop: 8 }]}>
          ბომბი სხვას ეჭირა? შეეხე მის სახელს.
        </Text>
      </View>

      <View style={{ flex: 1 }} />

      <View style={Layout.footer}>
        <PrimaryButton
          title={engine.alive.length <= 1 ? 'შედეგი' : 'შემდეგი რაუნდი'}
          icon="chevron.right"
          tint={Colors.neonMagenta}
          onPress={() => engine.continueGame()}
        />
      </View>
    </View>
  );
}

// ── ბოლო

function GameOver({
  engine,
  roster,
  onExit,
}: {
  engine: BombEngine;
  roster: GameFlowProps['roster'];
  onExit: () => void;
}) {

  useAwardOnce(() => {
    // ერთი გადარჩენილია — პოდიუმი აქ არ სჭირდება, სამი ქულა პირდაპირ.
    if (engine.winner) roster.addScore(3, engine.winner.id);
    Haptics.success();
  });

  return (
    <View style={{ flex: 1, gap: Space.m }}>
      <View style={{ flex: 1 }} />

      <View style={{ alignItems: 'center' }}>
        <GlyphIcon name="trophy.fill" size={37} tint={Colors.phosphor} />
      </View>

      <Text
        style={[titleFont(34), Layout.centered, { color: Colors.phosphor, paddingHorizontal: 24 }]}
        adjustsFontSizeToFit
        numberOfLines={2}
      >
        {engine.winner?.name ?? 'ფრე'}
      </Text>

      <Text style={[body(15, '500'), Layout.centered, { color: Colors.textSecondary }]}>
        ბოლო გადარჩენილი — ბომბმა ვერაფერი დააკლო
      </Text>

      <View style={{ flex: 1 }} />

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
  );
}
