import { PlayerCharacter } from '../../ui/PlayerCharacter';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Radius, Space, body, caption, title as titleFont } from '../../theme/theme';
import { icon as sf } from '../../theme/icons';
import { CategoryChip, GameExitButton, GlassCard, GlyphIcon, RankRow, ScreenHeader, CategoryPicker , RulesSheet } from '../../ui/Cards';
import { wordEntries } from '../categoryEntries';
import { PrimaryButton, GhostButton } from '../../ui/Buttons';
import { Pressable } from '../../ui/Pressable';
import { Confetti } from '../../ui/Confetti';
import { Layout } from '../../ui/layout';
import { useKeepScreenAwake } from '../../core/orientationLock';
import { CharadesBank } from '../../content/banks';
import { PodiumAward } from '../../core/podiumAward';
import { Haptics } from '../../core/haptics';
import { Sound } from '../../core/sound';
import { useObservable } from '../../core/observable';
import { useAwardOnce } from '../../core/awardOnce';
import type { GameFlowProps } from '../registry';
import { WordRushEngine } from './engine';
import { game as findGame } from '../catalog';

/**
 * „სიტყვის რბოლა“ — სრული ნაკადი.
 *
 * პორტი: `Splash/Games/WordRush/*.swift` (6 ხედი).
 * თამაშის ეკრანზე **მთელი შუა არე ერთი შესახებია** — თითს არ ეძებ.
 */

const SECOND_OPTIONS = [30, 45, 60, 90];
const ROUND_OPTIONS = [1, 2, 3];

export function WordRushFlow({ roster, onExit }: GameFlowProps) {
  const [engine] = useState(() => new WordRushEngine([...roster.players]));
  useObservable(engine);

  useEffect(() => () => engine.abandon(), [engine]);

  switch (engine.phase) {
    case 'setup':
      return <Setup engine={engine} onClose={onExit} />;
    case 'intro':
      return <Intro engine={engine} onExit={onExit} />;
    case 'playing':
      return <Play engine={engine} onExit={onExit} />;
    case 'turnResult':
      return <TurnResult engine={engine} onExit={onExit} />;
    case 'summary':
      return <Summary engine={engine} roster={roster} onExit={onExit} />;
  }
}

// ── პარამეტრები

function Setup({ engine, onClose }: { engine: WordRushEngine; onClose: () => void }) {
  const [showRules, setShowRules] = useState(false);
  const gameData = findGame('wordrush');
  return (
    <View style={{ flex: 1 }}>
      <RulesSheet visible={showRules} title="Word Rush" accent={Colors.phosphor} steps={gameData?.howTo ?? []} onClose={() => setShowRules(false)} />

      <View style={Layout.header}>
        <ScreenHeader title="სიტყვის რბოლა" subtitle={`${engine.players.length} მოთამაშე`} onBack={onClose}  onInfo={() => setShowRules(true)} />
      </View>

      <ScrollView contentContainerStyle={Layout.scroll}>
        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>რამდენი წამი აქვს თითოეულს</Text>
            <View style={Layout.segmentRow}>
              {SECOND_OPTIONS.map((value) => (
                <CategoryChip
                  compact
                  key={value}
                  label={`${value} წამი`}
                  selected={engine.settings.seconds === value}
                  onPress={() => engine.setSeconds(value)}
                />
              ))}
            </View>
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>წრეები</Text>
            <Text style={[body(13, '500'), { color: Colors.textSecondary }]}>ერთი წრე — თითო ჯერი ყველას.</Text>
            <View style={Layout.segmentRow}>
              {ROUND_OPTIONS.map((value) => (
                <CategoryChip
                  compact
                  key={value}
                  label={String(value)}
                  selected={engine.settings.rounds === value}
                  onPress={() => engine.setRounds(value)}
                />
              ))}
            </View>
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>კატეგორია</Text>
            <CategoryPicker
              build={() => wordEntries(CharadesBank, 'შემთხვევითი', null)}
              selectedID={engine.settings.categoryID}
              onSelect={(id) => engine.setCategory(id)}
            />
          </View>
        </GlassCard>
      </ScrollView>

      <View style={Layout.footer}>
        <PrimaryButton title="დაწყება" icon="play.fill" tint={Colors.phosphor} onPress={() => engine.startGame()} />
      </View>
    </View>
  );
}

// ── ჯერის შესავალი

function Intro({ engine, onExit }: { engine: WordRushEngine; onExit: () => void }) {
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, gap: Space.m, paddingVertical: Space.m }}>
      <View style={Layout.exitSlot}>
        <GameExitButton onExit={onExit} />
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ alignItems: 'center' }}>
        <GlyphIcon name="bolt.fill" size={30} tint={Colors.phosphor} />
      </View>

          <PlayerCharacter player={engine.currentPlayer} compact />
      <Text style={[body(15, '500'), Layout.centered, { color: Colors.textSecondary }]}>ტელეფონი გადაეცი</Text>

      <Text
        style={[titleFont(36), Layout.centered, { color: Colors.phosphor, paddingHorizontal: 24 }]}
        adjustsFontSizeToFit
        numberOfLines={2}
      >
        {engine.currentPlayer?.name ?? '—'}
      </Text>

      <View style={Layout.content}>
        <View style={styles.categoryBox}>
          <Text style={[caption(12), { color: Colors.textSecondary }]}>კატეგორია</Text>
          <Text style={[titleFont(24), Layout.centered, { color: Colors.textPrimary }]}>{engine.categoryName}</Text>
        </View>
      </View>

      {engine.canSwapCategory ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            Haptics.tap();
            engine.swapCategory();
          }}
          style={{ alignItems: 'center' }}
        >
          <Text style={[body(14, '700'), { color: Colors.textSecondary }]}>სხვა კატეგორია</Text>
        </Pressable>
      ) : null}

      <View style={Layout.content}>
        <GlassCard>
          <View style={{ gap: 8 }}>
            <Tip icon="megaphone.fill" text="ასახელებ ამ კატეგორიის სიტყვებს, სანამ დრო გაქვს." />
            <Tip icon="hand.tap.fill" text="ყოველ ჩათვლილზე ეკრანს ეხები." />
            <Tip icon="person.3.fill" text="მაგიდა მსაჯობს — არ ჩაითვალა? „−1“ იქვეა." />
          </View>
        </GlassCard>
      </View>

      <Text style={[body(13, '700'), Layout.centered, Layout.digits, { color: Colors.textSecondary }]}>
        წრე {engine.round} / {engine.settings.rounds}
      </Text>

      <View style={{ flex: 1 }} />

      <View style={Layout.footer}>
        <PrimaryButton title="დროის დაწყება" icon="play.fill" tint={Colors.phosphor} onPress={() => engine.beginTurn()} />
      </View>
    </ScrollView>
  );
}

function Tip({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
      <MaterialCommunityIcons name={sf(icon)} size={16} color={Colors.textSecondary} />
      <Text style={[body(14, '500'), { color: Colors.textSecondary, flex: 1 }]}>{text}</Text>
    </View>
  );
}

// ── თამაში

function Play({ engine, onExit }: { engine: WordRushEngine; onExit: () => void }) {
  useKeepScreenAwake();
  const hot = engine.remaining <= 5;

  return (
    <View style={{ flex: 1, gap: 14 }}>
      <View style={Layout.exitSlot}>
        <GameExitButton onExit={onExit} />
      </View>

      <View style={[Layout.topBar, { paddingTop: 58 }]}>
        <Text style={[body(15, '700'), { color: Colors.textSecondary, flex: 1 }]} numberOfLines={1}>
          {engine.categoryName}
        </Text>
        <Text style={[titleFont(26), Layout.digits, { color: hot ? Colors.neonMagenta : Colors.textPrimary }]}>
          {engine.remaining}
        </Text>
      </View>

      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            {
              width: `${Math.max(1, engine.fraction * 100)}%`,
              backgroundColor: hot ? Colors.neonMagenta : Colors.phosphor,
            },
          ]}
        />
      </View>

      {/* მთელი დანარჩენი ეკრანი — ერთი შესახები არე. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`ჩათვლა. ახლა ${engine.turnCount}`}
        onPress={() => engine.count()}
        style={styles.tapArea}
      >
        <Text style={[styles.bigCount, { color: Colors.phosphor }]}>{engine.turnCount}</Text>
        <Text style={[body(14, '600'), { color: Colors.textSecondary }]}>შეეხე ყოველ ჩათვლილ სიტყვაზე</Text>
        {engine.starter && engine.turnCount === 0 ? (
          <Text style={[body(13, '500'), { color: Colors.textSecondary, opacity: 0.7, paddingTop: 4 }]}>
            დასაწყისისთვის: {engine.starter}
          </Text>
        ) : null}
      </Pressable>

      <View style={[Layout.footer, { flexDirection: 'row', gap: 10 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="მინუს ერთი"
          disabled={engine.turnCount === 0}
          onPress={() => engine.uncount()}
          style={[styles.secondaryButton, { opacity: engine.turnCount === 0 ? 0.45 : 1 }]}
        >
          <MaterialCommunityIcons name="minus" size={16} color={Colors.textPrimary} />
          <Text style={[body(16, '700'), { color: Colors.textPrimary }]}>−1</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="დასრულება"
          onPress={() => engine.endTurn()}
          style={styles.secondaryButton}
        >
          <Text style={[body(16, '700'), { color: Colors.textPrimary }]}>დასრულება</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── ჯერის შედეგი

function verdictFor(count: number): string {
  if (count === 0) return 'ერთიც ვერ მოასწარი';
  if (count <= 5) return 'დასაწყისისთვის ცუდი არაა';
  if (count <= 11) return 'კარგი ტემპი';
  if (count <= 17) return 'მაგიდა შენზეა';
  return 'რბოლის რეკორდი';
}

function TurnResult({ engine, onExit }: { engine: WordRushEngine; onExit: () => void }) {
  const count = engine.lastTurn?.count ?? 0;

  return (
    <View style={{ flex: 1, gap: Space.m }}>
      <View style={Layout.exitSlot}>
        <GameExitButton onExit={onExit} />
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ alignItems: 'center' }}>
        <GlyphIcon name="bolt.fill" size={30} tint={Colors.phosphor} />
      </View>

      <Text style={[titleFont(28), Layout.centered, { color: Colors.textPrimary }]}>
        {engine.lastTurn?.player.name ?? '—'}
      </Text>

      <Text style={[styles.bigCount, Layout.centered, { color: Colors.phosphor, fontSize: 92 }]}>{count}</Text>

      <Text style={[body(16, '600'), Layout.centered, { color: Colors.textSecondary }]}>{verdictFor(count)}</Text>

      {engine.players.length > 1 ? (
        <View style={[Layout.content, { gap: 8, paddingTop: 4 }]}>
          {engine.ranking.slice(0, 3).map((player) => (
            <View key={player.id} style={styles.miniRow}>
              <Text style={[body(15, '600'), { color: Colors.textPrimary, flex: 1 }]} numberOfLines={1}>
                {player.name}
              </Text>
              <Text style={[body(16, '900'), Layout.digits, { color: Colors.phosphor }]}>
                {engine.totalFor(player)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={{ flex: 1 }} />

      <View style={Layout.footer}>
        <PrimaryButton
          title={engine.isGameOver ? 'შედეგები' : 'შემდეგი'}
          icon={engine.isGameOver ? 'trophy.fill' : 'chevron.right'}
          tint={Colors.phosphor}
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
  engine: WordRushEngine;
  roster: GameFlowProps['roster'];
  onExit: () => void;
}) {

  useAwardOnce(() => {
    Sound.play('win');
    Haptics.win();
    PodiumAward.apply(engine.results, roster);
  });

  const best = engine.best;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, gap: 14 }}>
        <View style={{ flex: 1 }} />

        <View style={{ alignItems: 'center' }}>
          <GlyphIcon name="trophy.fill" size={31} tint={Colors.phosphor} />
        </View>

        <Text style={[titleFont(28), Layout.centered, { color: Colors.textPrimary }]}>
          {best === null ? 'სიტყვა ვერავინ თქვა' : 'რბოლის გამარჯვებული'}
        </Text>

        {best ? (
          <Text style={[body(15, '600'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
            {best.name} — {engine.totalFor(best)} სიტყვა
          </Text>
        ) : null}

        <Text style={[body(12, '500'), Layout.centered, { color: Colors.textSecondary, opacity: 0.7 }]}>
          საერთო ტაბლოზე პირველ სამს +3 / +2 / +1 ერიცხება
        </Text>

        <ScrollView contentContainerStyle={[Layout.content, { gap: 8 }]}>
          {engine.ranking.map((player, rank) => (
            <RankRow
              key={player.id}
              rank={rank + 1}
              name={player.name}
              score={engine.totalFor(player)}
              highlight={rank === 0}
            />
          ))}
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
          <GhostButton title="დასრულება" icon="xmark" onPress={onExit} />
        </View>
      </View>

      {best ? <Confetti /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  categoryBox: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 20,
    borderRadius: Radius.default,
    backgroundColor: Colors.surface,
  },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: Colors.surfaceHigh, marginHorizontal: 24, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  tapArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  bigCount: { fontSize: 116, fontWeight: '900', fontVariant: ['tabular-nums'] },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    borderRadius: Radius.default,
    backgroundColor: Colors.surface,
  },
  miniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Space.m,
    paddingVertical: 12,
    borderRadius: Radius.small,
    backgroundColor: Colors.surface,
  },
});
