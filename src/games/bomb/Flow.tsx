import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Colors, Space, body, title as titleFont } from '../../theme/theme';
import { CategoryChip, GameExitButton, GlassCard, GlyphIcon, ScreenHeader } from '../../ui/Cards';
import { PrimaryButton, GhostButton } from '../../ui/Buttons';
import { Layout } from '../../ui/layout';
import { useKeepScreenAwake } from '../../core/orientationLock';
import { WordBank } from '../../content/banks';
import { Haptics } from '../../core/haptics';
import { useObservable } from '../../core/observable';
import { useAwardOnce } from '../../core/awardOnce';
import type { GameFlowProps } from '../registry';
import { BombEngine } from './engine';

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
  return (
    <View style={{ flex: 1 }}>
      <View style={Layout.header}>
        <ScreenHeader title="Bomb Party" subtitle={`${engine.players.length} მოთამაშე`} onBack={onClose} />
      </View>

      <ScrollView contentContainerStyle={Layout.scroll}>
        <GlassCard>
          <View style={{ gap: 8 }}>
            <Text style={[body(14, '600'), { color: Colors.textPrimary }]}>
              ტაიმერი დამალულია — არავინ იცის, როდის აფეთქდება.
            </Text>
            <Text style={[body(13, '500'), { color: Colors.textSecondary }]}>
              სიტყვა თქვი კატეგორიიდან და ტელეფონი შემდეგს გადაეცი. ვისთანაც აფეთქდება, ერთ სიცოცხლეს კარგავს.
            </Text>
          </View>
        </GlassCard>

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
            <View style={Layout.chipRow}>
              <CategoryChip
                label="შემთხვევითი"
                selected={engine.settings.categoryID === null}
                onPress={() => engine.setCategory(null)}
              />
              {WordBank.categories.map((cat) => (
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

  return (
    <View style={{ flex: 1, gap: 18 }}>
      <View style={Layout.topBar}>
        <GameExitButton onExit={onExit} />
        <Text style={[body(14, '700'), { color: Colors.textSecondary }]}>რაუნდი {engine.round}</Text>
        <View style={{ flex: 1 }} />
        <Text style={[body(14, '700'), { color: Colors.textSecondary }]}>დარჩა {engine.alive.length}</Text>
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ alignItems: 'center' }}>
        <GlyphIcon name="timer" size={34} tint={Colors.neonMagenta} />
      </View>

      <View style={{ alignItems: 'center', gap: 6 }}>
        <Text style={[body(14, '500'), { color: Colors.textSecondary }]}>ბომბი აქვს</Text>
        <Text
          style={[titleFont(34), Layout.centered, { color: Colors.textPrimary, paddingHorizontal: 24 }]}
          adjustsFontSizeToFit
          numberOfLines={2}
        >
          {engine.currentPlayer?.name ?? '—'}
        </Text>
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
    </View>
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
              return (
                <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text
                    style={[
                      body(15, '600'),
                      { color: lives > 0 ? Colors.textPrimary : Colors.textSecondary, flex: 1 },
                      lives === 0 ? Layout.struck : null,
                    ]}
                    numberOfLines={1}
                  >
                    {p.name}
                  </Text>
                  <Text style={{ fontSize: 13, color: Colors.neonMagenta }}>{'♥'.repeat(lives)}</Text>
                </View>
              );
            })}
          </View>
        </GlassCard>
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
