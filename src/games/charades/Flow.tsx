import { PlayerCharacter } from '../../ui/PlayerCharacter';
import React, { useEffect, useState } from 'react';
import { AppState, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Radius, Space, body, caption, display, title as titleFont } from '../../theme/theme';
import { icon as sf } from '../../theme/icons';
import { CategoryChip, GameExitButton, GlassCard, GlyphIcon, RankRow, ScreenHeader, CategoryPicker, RulesSheet } from '../../ui/Cards';
import { wordEntries } from '../categoryEntries';
import { PrimaryButton } from '../../ui/Buttons';
import { Pressable } from '../../ui/Pressable';
import { Layout } from '../../ui/layout';
import { useLandscapeOnly } from '../../core/orientationLock';
import { CharadesBank } from '../../content/banks';
import { TurnRotation } from '../../core/turnRotation';
import { PodiumAward } from '../../core/podiumAward';
import { Haptics } from '../../core/haptics';
import { useObservable } from '../../core/observable';
import { useAwardOnce } from '../../core/awardOnce';
import type { GameFlowProps } from '../registry';
import { CharadesEngine, type CharadesEntry } from './engine';
import { game as findGame } from '../catalog';

/**
 * „ტელეფონი შუბლზე“ (Heads Up) — სრული ნაკადი.
 *
 * პორტი: `Splash/Games/Charades/*.swift` (5 ხედი).
 *
 * თამაშის ეკრანი **ლანდშაფტულია** — სიტყვა შორიდან უნდა იკითხებოდეს.
 * დახრის გვერდით ეკრანის ორივე ნახევარიც მუშაობს: მარცხენა — გამოტოვება,
 * მარჯვენა — გამოცნობა. სენსორი ყველა ტელეფონზე ერთნაირად არ იქცევა.
 */

const TIME_OPTIONS = [30, 60, 90, 120];

export function CharadesFlow({ roster, onExit }: GameFlowProps) {
  const [engine] = useState(() => new CharadesEngine([...roster.players]));
  useObservable(engine);

  // ეკრანიდან გასვლისას სენსორი და ტაიმერი უნდა გაჩერდეს.
  useEffect(() => () => engine.releaseScreen(), [engine]);

  // ფონში გასვლისას სენსორი ჩერდება, დაბრუნებისას ნული თავიდან იზომება.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      engine.handleScenePhase(state === 'active');
    });
    return () => sub.remove();
  }, [engine]);

  switch (engine.phase) {
    case 'setup':
      return <Setup engine={engine} onClose={onExit} />;
    case 'turnIntro':
      return <TurnIntro engine={engine} onExit={onExit} />;
    case 'countdown':
      return (
        <Landscape>
          <Countdown engine={engine} onExit={onExit} />
        </Landscape>
      );
    case 'playing':
      return (
        <Landscape>
          <Play engine={engine} onExit={onExit} />
        </Landscape>
      );
    case 'turnResult':
      return <TurnResult engine={engine} onExit={onExit} />;
    case 'summary':
      return <Summary engine={engine} roster={roster} onExit={onExit} />;
  }
}

// ── პარამეტრები

function Setup({ engine, onClose }: { engine: CharadesEngine; onClose: () => void }) {
  const [showRules, setShowRules] = useState(false);
  const gameData = findGame('charades');
  return (
    <View style={{ flex: 1 }}>
      <RulesSheet visible={showRules} title="Heads Up" accent={Colors.phosphor} steps={gameData?.howTo ?? []} onClose={() => setShowRules(false)} />
      <View style={Layout.header}>
        <ScreenHeader title="Heads Up" subtitle="ტელეფონი შუბლზე" onBack={onClose} onInfo={() => setShowRules(true)} />
      </View>

      <ScrollView contentContainerStyle={Layout.scroll}>
        <GlassCard>
          <View style={{ gap: 10 }}>
            <Step n="1" text="ერთი მოთამაშე ტელეფონს შუბლზე იჭერს, ეკრანით სხვებისკენ." />
            <Step n="2" text="დანარჩენები სიტყვას ხსნიან — თვითონ სიტყვის წარმოთქმის გარეშე." />
            <Step n="3" text="გამოიცანი — წინ დახარე; ვერ გამოიცანი — უკან დახარე." />
            <Step n="4" text="ჯერი წრეზე ტრიალებს — ქულა იმას ერიცხება, ვისაც ტელეფონი ეჭირა." />
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>დრო</Text>
            <View style={Layout.segmentRow}>
              {TIME_OPTIONS.map((secs) => (
                <CategoryChip
                  compact
                  key={secs}
                  label={`${secs} წმ`}
                  selected={engine.settings.seconds === secs}
                  onPress={() => engine.setSeconds(secs)}
                />
              ))}
            </View>
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>რამდენი ჯერი</Text>
            <View style={Layout.segmentRow}>
              {TurnRotation.lapOptions.map((laps) => (
                <CategoryChip
                  compact
                  key={laps}
                  label={TurnRotation.label(laps)}
                  selected={engine.settings.laps === laps}
                  onPress={() => engine.setLaps(laps)}
                />
              ))}
            </View>
            <Text style={[body(12, '500'), { color: Colors.textSecondary }]}>
              სულ {engine.totalTurns} ჯერი — ყველას ზუსტად თანაბრად ხვდება.
            </Text>
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>კატეგორია</Text>
            <CategoryPicker
              build={() => wordEntries(CharadesBank, 'ყველა', 'word.charades-all')}
              selectedID={engine.settings.categoryID}
              onSelect={(id) => engine.setCategory(id)}
            />
          </View>
        </GlassCard>

        <GlassCard>
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel="დახრის შებრუნება"
            accessibilityState={{ checked: engine.settings.invertTilt }}
            onPress={() => {
              Haptics.tap();
              engine.setInvertTilt(!engine.settings.invertTilt);
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[body(15, '700'), { color: Colors.textPrimary }]}>დახრის შებრუნება</Text>
              <Text style={[caption(11), { color: Colors.textSecondary }]}>
                თუ დახრა პირიქით მუშაობს — ჩართე და მიმართულებები გაიცვლება
              </Text>
            </View>
            <MaterialCommunityIcons
              name={engine.settings.invertTilt ? 'toggle-switch' : 'toggle-switch-off-outline'}
              size={34}
              color={engine.settings.invertTilt ? Colors.phosphor : Colors.textSecondary}
            />
          </Pressable>
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

// ── ჯერის შესავალი

function ScoreStrip({ engine }: { engine: CharadesEngine }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {engine.players.map((player) => {
        const active = player.id === engine.currentPlayer?.id;
        return (
          <View
            key={player.id}
            style={[styles.scoreCell, { backgroundColor: active ? Colors.phosphor + '2E' : Colors.surface }]}
          >
            <Text
              style={[body(11, '600'), { color: active ? Colors.textPrimary : Colors.textSecondary }]}
              numberOfLines={1}
            >
              {player.name}
            </Text>
            <Text style={[body(19, '900'), Layout.digits, { color: active ? Colors.phosphor : Colors.textPrimary }]}>
              {engine.liveScore(player)}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

function TurnIntro({ engine, onExit }: { engine: CharadesEngine; onExit: () => void }) {
  return (
    <View style={{ flex: 1, gap: Space.m }}>
      <View style={Layout.topBar}>
        <GameExitButton onExit={onExit} />
        <Text style={[body(13, '700'), Layout.digits, { color: Colors.textSecondary }]}>
          ჯერი {engine.turnNumber} / {engine.totalTurns}
        </Text>
        <View style={{ flex: 1 }} />
        <Text style={[body(12, '600'), { color: Colors.textSecondary }]} numberOfLines={1}>
          {engine.categoryLabel}
        </Text>
      </View>
      <PlayerCharacter player={engine.currentPlayer} compact />

      <View style={{ paddingHorizontal: 20 }}>
        <ScoreStrip engine={engine} />
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ gap: 12, paddingHorizontal: 24 }}>
        <Text style={[titleFont(30), Layout.centered, { color: Colors.textPrimary }]} adjustsFontSizeToFit numberOfLines={2}>
          {engine.currentPlayer?.name ?? ''} — ტელეფონი შუბლზე
        </Text>
        <Text style={[body(15, '500'), Layout.centered, { color: Colors.textSecondary }]}>
          მაგიდა სიტყვას გიხსნის — თვითონ სიტყვის თქმის გარეშე.
        </Text>
      </View>

      <View style={{ flex: 1 }} />

      <View style={Layout.footer}>
        <Text style={[body(12, '500'), Layout.centered, { color: Colors.textSecondary, opacity: 0.8, paddingHorizontal: 28 }]}>
          გამოიცანი — წინ დახარე; ვერ იცნობ — უკან. ტელეფონი ყოველ ჯერზე შუბლთან დააბრუნე.
        </Text>
        <PrimaryButton title="მზად ვარ" icon="play.fill" tint={Colors.phosphor} onPress={() => engine.beginTurn()} />
      </View>
    </View>
  );
}

// ── ლანდშაფტი — ათვლასა და თამაშს ერთი ჩაკეტვა ჰყოფნით
//
// ცალ-ცალკე რომ ჰქონდეთ, ფაზის გადასვლისას ერთი გამოსვლისას პორტრეტს ითხოვდა,
// მეორე შესვლისას ლანდშაფტს — ერთ კადრში, ტელეფონი კი უკვე შუბლზეა.
function Landscape({ children }: { children: React.ReactNode }) {
  useLandscapeOnly();
  return <>{children}</>;
}

// ── ათვლა

function Countdown({ engine, onExit }: { engine: CharadesEngine; onExit: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 }}>
      <View style={Layout.exitSlot}>
        <GameExitButton onExit={onExit} />
      </View>
      <Text
        style={[body(20, '700'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 40 }]}
        numberOfLines={2}
        adjustsFontSizeToFit
      >
        {engine.currentPlayer?.name ?? ''} — ტელეფონი შუბლზე მიიდე
      </Text>
      <Text style={[styles.huge, Layout.digits, { color: Colors.phosphor }]}>{engine.countdown}</Text>
    </View>
  );
}

// ── თამაში (ლანდშაფტი)

function Play({ engine, onExit }: { engine: CharadesEngine; onExit: () => void }) {
  const flash = engine.flash;
  const flashColor = flash?.verdict === 'correct' ? Colors.phosphor : Colors.neonMagenta;

  // ციმციმი ორ მეათედ წამში ქრება — თორემ სიტყვა აღარ ჩანს.
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => engine.clearFlash(), 260);
    return () => clearTimeout(t);
  }, [flash, engine]);

  return (
    <View style={{ flex: 1 }}>
      {flash ? <View style={[StyleSheet.absoluteFill, { backgroundColor: flashColor, opacity: 0.9 }]} /> : null}

      <View style={{ flex: 1, gap: 14 }}>
        <View style={styles.playTop}>
          <Counter symbol="✓" value={engine.correctCount} color={Colors.phosphor} />
          <View style={{ flex: 1 }} />
          <Text
            style={[styles.timer, Layout.digits, { color: engine.remaining <= 10 ? Colors.neonMagenta : Colors.textPrimary }]}
          >
            {engine.remaining}
          </Text>
          <View style={{ flex: 1 }} />
          <Counter symbol="↷" value={engine.skippedCount} color={Colors.neonCyan} />
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text
            style={[styles.word, Layout.centered, { color: flash ? Colors.ink : Colors.textPrimary }]}
            numberOfLines={3}
            adjustsFontSizeToFit
          >
            {flash ? (flash.verdict === 'correct' ? 'გამოიცანი' : 'გამოტოვება') : engine.currentWord}
          </Text>
        </View>

        <Text
          style={[
            body(13, '600'),
            Layout.centered,
            { color: flash ? Colors.ink : Colors.textSecondary, opacity: flash ? 0.6 : 1, paddingBottom: 10 },
          ]}
        >
          წინ დახარე — გამოვიცანი · უკან — გამოტოვება · შუბლთან დააბრუნე
        </Text>
      </View>

      {/* სენსორის სარეზერვო გზა: მარცხენა ნახევარი — გამოტოვება, მარჯვენა — გამოცნობა. */}
      <View style={[StyleSheet.absoluteFill, { flexDirection: 'row' }]}>
        <Pressable accessibilityLabel="გამოტოვება" onPress={() => engine.register('skipped')} style={{ flex: 1 }}>
          <View style={{ flex: 1 }} />
        </Pressable>
        <Pressable accessibilityLabel="გამოვიცანი" onPress={() => engine.register('correct')} style={{ flex: 1 }}>
          <View style={{ flex: 1 }} />
        </Pressable>
      </View>
    </View>
  );
}

function Counter({ symbol, value, color }: { symbol: string; value: number; color: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={[body(15, '900'), { color }]}>{symbol}</Text>
      <Text style={[body(22, '900'), Layout.digits, { color }]}>{value}</Text>
    </View>
  );
}

// ── ჯერის შედეგი

function TurnResult({ engine, onExit }: { engine: CharadesEngine; onExit: () => void }) {
  return (
    <View style={{ flex: 1, gap: 14 }}>
      <View style={Layout.topBar}>
        <GameExitButton onExit={onExit} />
        <Text style={[body(13, '700'), { color: Colors.textSecondary }]}>ჯერი დასრულდა</Text>
        <View style={{ flex: 1 }} />
        <Text style={[body(12, '600'), Layout.digits, { color: Colors.textSecondary }]}>
          ჯერი {engine.turnNumber} / {engine.totalTurns}
        </Text>
      </View>

      <View style={{ alignItems: 'center', gap: 6, paddingHorizontal: 24 }}>
        <Text style={[titleFont(24), { color: Colors.phosphor }]} numberOfLines={1} adjustsFontSizeToFit>
          {engine.currentPlayer?.name ?? ''}
        </Text>
        <Text style={[display(58), Layout.digits, { color: Colors.textPrimary }]}>{engine.correctCount}</Text>
        <Text style={[body(14, '600'), { color: Colors.textSecondary }]}>გამოცნობილი სიტყვა</Text>
        {engine.skippedCount > 0 ? (
          <Text style={[body(13, '500'), Layout.digits, { color: Colors.textSecondary, opacity: 0.8 }]}>
            გამოტოვებული — {engine.skippedCount}
          </Text>
        ) : null}
      </View>

      {engine.results.length > 0 ? (
        <Text style={[body(12, '500'), Layout.centered, { color: Colors.textSecondary }]}>
          სადავო სიტყვას შეეხე — ნიშანი შეიცვლება.
        </Text>
      ) : null}

      {engine.results.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={[body(15, '500'), Layout.centered, { color: Colors.textSecondary }]}>ამ ჯერის სია ცარიელია.</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 4, gap: 6 }}
        >
          {engine.results.map((entry) => (
            <WordRow key={entry.id} engine={engine} entry={entry} />
          ))}
        </ScrollView>
      )}

      <View style={Layout.footer}>
        <PrimaryButton
          title={engine.isLastTurn ? 'შედეგები' : 'შემდეგი მოთამაშე'}
          icon={engine.isLastTurn ? 'flag.checkered' : 'chevron.right'}
          tint={Colors.phosphor}
          onPress={() => engine.finishTurn()}
        />
      </View>
    </View>
  );
}

function WordRow({ engine, entry }: { engine: CharadesEngine; entry: CharadesEntry }) {
  const correct = entry.verdict === 'correct';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${entry.word}. ${correct ? 'ჩათვლილი' : 'გამოტოვებული'}. შეცვლისთვის დააჭირე`}
      onPress={() => {
        Haptics.tap();
        engine.flip(entry);
      }}
      style={[styles.wordRow, { backgroundColor: correct ? Colors.phosphor + '1F' : Colors.surface }]}
    >
      <MaterialCommunityIcons
        name={correct ? 'check-circle' : 'close-circle'}
        size={21}
        color={correct ? Colors.phosphor : Colors.neonMagenta}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={[body(16, '600'), { color: correct ? Colors.textPrimary : Colors.textSecondary }]}
          numberOfLines={1}
        >
          {entry.word}
        </Text>
        {entry.isOvertime ? (
          <Text style={[body(11, '500'), { color: Colors.textSecondary, opacity: 0.8 }]}>
            ბოლო სიტყვა — დრო ამოიწურა
          </Text>
        ) : null}
      </View>
      <Text style={[body(14, '900'), Layout.digits, { color: correct ? Colors.phosphor : Colors.textSecondary }]}>
        {correct ? '+1' : '0'}
      </Text>
    </Pressable>
  );
}

// ── შეჯამება

function Summary({
  engine,
  roster,
  onExit,
}: {
  engine: CharadesEngine;
  roster: GameFlowProps['roster'];
  onExit: () => void;
}) {

  useAwardOnce(() => {
    PodiumAward.apply(engine.podiumResults, roster);
    Haptics.win();
  });

  const champion = engine.champion;

  return (
    <View style={{ flex: 1, gap: 14 }}>
      <View style={{ flex: 1 }} />

      <View style={{ alignItems: 'center' }}>
        <GlyphIcon name="trophy.fill" size={31} tint={Colors.phosphor} />
      </View>

      <Text style={[titleFont(26), Layout.centered, { color: Colors.phosphor, paddingHorizontal: 24 }]}>
        საუკეთესო გამომცნობი
      </Text>

      <Text style={[body(15, '600'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
        {champion
          ? `${champion.name} — ${engine.scoreFor(champion)} გამოცნობილი სიტყვა`
          : 'ამ პარტიაში სიტყვა ვერავინ გამოიცნო'}
      </Text>

      <Text style={[body(12, '500'), Layout.centered, { color: Colors.textSecondary, opacity: 0.7 }]}>
        საერთო ტაბლოზე პირველ სამს +3 / +2 / +1 ერიცხება
      </Text>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}>
        {engine.ranking.map((player, rank) => (
          <RankRow key={player.id} rank={rank + 1} name={player.name} score={engine.scoreFor(player)} highlight={rank === 0} />
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
        <PrimaryButton title="დასრულება" icon="xmark" tint={Colors.surfaceHigh} onPress={onExit} />
      </View>
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
  scoreCell: {
    minWidth: 72,
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: Radius.small,
  },
  playTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 40, paddingTop: 12 },
  timer: { fontSize: 44, fontWeight: '900' },
  word: { fontSize: 72, fontWeight: '900', paddingHorizontal: 40 },
  huge: { fontSize: 120, fontWeight: '900' },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Space.m,
    paddingVertical: 11,
    borderRadius: Radius.small,
  },
});
