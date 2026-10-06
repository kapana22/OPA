import { PlayerCharacter } from '../../ui/PlayerCharacter';
import React, { useEffect, useState } from 'react';
import { AppState, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Space, body, display, title as titleFont } from '../../theme/theme';
import { CategoryChip, GameExitButton, GlassCard, RankRow, ScreenHeader, CategoryChecklist, RulesSheet, ToggleRow } from '../../ui/Cards';
import { wordEntries } from '../categoryEntries';
import { PrimaryButton } from '../../ui/Buttons';
import { Pressable } from '../../ui/Pressable';
import { Layout } from '../../ui/layout';
import { Confetti } from '../../ui/Confetti';
import { FitText } from '../../ui/FitText';
import { useLandscapeOnly } from '../../core/orientationLock';
import { CharadesBank } from '../../content/banks';
import { TurnRotation } from '../../core/turnRotation';
import { Haptics } from '../../core/haptics';
import { useObservable } from '../../core/observable';
import { useAwardOnce } from '../../core/awardOnce';
import type { GameFlowProps } from '../registry';
import { CharadesEngine, type CharadesEntry } from './engine';
import { game as findGame } from '../catalog';
import { Icon } from '../../ui/Icon';

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
        <ScreenHeader title="Heads Up" onBack={onClose} onInfo={() => setShowRules(true)} />
      </View>

      <ScrollView contentContainerStyle={Layout.scroll}>
        {/* წესები „?“-შია — setup-ზე მხოლოდ პარამეტრები. */}
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
              სულ {engine.totalTurns} ჯერი.
            </Text>
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>კატეგორიები</Text>
            <CategoryChecklist
              build={() => wordEntries(CharadesBank, 'ყველა', 'word.charades-all')}
              selectedIDs={engine.settings.categoryIDs}
              onChange={(ids) => engine.setCategories(ids)}
            />
          </View>
        </GlassCard>

        <GlassCard>
          <ToggleRow
            title="დახრის შებრუნება"
            subtitle="თუ დახრა პირიქით მუშაობს — ჩართე და მიმართულებები გაიცვლება"
            value={engine.settings.invertTilt}
            onChange={(on) => engine.setInvertTilt(on)}
          />
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
      <View style={{ flex: 1 }} />
      <PlayerCharacter player={engine.currentPlayer} />

      {/* დიდად სახელი, ქვემოთ — მოკლედ და პატარა ასოებით. */}
      <View style={{ gap: 6, paddingHorizontal: 24 }}>
        <FitText style={[titleFont(28), Layout.centered, { color: Colors.textPrimary }]} maxLines={1}>
          {engine.currentPlayer?.name ?? ''}
        </FitText>
        <Text style={[body(15, '500'), Layout.centered, { color: Colors.textSecondary }]}>ტელეფონი შუბლზე</Text>
      </View>

      <View style={{ flex: 1 }} />

      <View style={Layout.footer}>
        <Text style={[body(12, '500'), Layout.centered, { color: Colors.textSecondary, opacity: 0.8, paddingHorizontal: 28 }]}>
          {engine.settings.invertTilt ? 'უკან — გამოვიცანი, წინ — გამოტოვება' : 'წინ — გამოვიცანი, უკან — გამოტოვება'}
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
      <FitText
        style={[body(20, '700'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 40 }]}
        maxLines={2}
      >
        {`${engine.currentPlayer?.name ?? ''} — ტელეფონი შუბლზე მიიდე`}
      </FitText>
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
          <FitText
            style={[styles.word, Layout.centered, { color: flash ? Colors.ink : Colors.textPrimary }]}
            maxLines={3}
          >
            {flash ? (flash.verdict === 'correct' ? 'გამოიცანი' : 'გამოტოვება') : engine.currentWord}
          </FitText>
        </View>

        <Text
          style={[
            body(13, '600'),
            Layout.centered,
            { color: flash ? Colors.ink : Colors.textSecondary, opacity: flash ? 0.6 : 1, paddingBottom: 10 },
          ]}
        >
          {engine.settings.invertTilt ? 'უკან — გამოვიცანი · წინ — გამოტოვება' : 'წინ — გამოვიცანი · უკან — გამოტოვება'}
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
      {/* სარეზერვო ზონების ზემოთ — უკან გასრიალება თამაშში გამორთულია და სხვა გასასვლელი აქ არ იყო. */}
      <View style={{ position: 'absolute', top: 4, left: 4 }}>
        <GameExitButton onExit={onExit} />
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
        <FitText style={[titleFont(24), { color: Colors.phosphor }]} maxLines={1}>
          {engine.currentPlayer?.name ?? ''}
        </FitText>
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
      <Icon
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
  onExit,
}: {
  engine: CharadesEngine;
  roster: GameFlowProps['roster'];
  onExit: () => void;
}) {

  useAwardOnce(() => {
    Haptics.win();
  });

  const champions = engine.champions;

  return (
    <View style={{ flex: 1, gap: 14 }}>
      <View style={{ flex: 1 }} />

      {champions.length > 0 ? (
        <>
          <Text style={[titleFont(26), Layout.centered, { color: Colors.phosphor, paddingHorizontal: 24 }]}>
            საუკეთესო გამომცნობი
          </Text>
        </>
      ) : null}

      <Text style={[body(15, '600'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
        {champions.length > 0
          ? `${champions.map((p) => p.name).join(', ')} — ${engine.scoreFor(champions[0])} გამოცნობილი სიტყვა`
          : 'ამ პარტიაში სიტყვა ვერავინ გამოიცნო'}
      </Text>


      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}>
        {engine.ranking.map((player) => (
          <RankRow
            key={player.id}
            rank={engine.rankOf(player)}
            name={player.name}
            score={engine.scoreFor(player)}
            highlight={champions.some((c) => c.id === player.id)}
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
        <PrimaryButton title="დასრულება" icon="xmark" tint={Colors.surfaceHigh} onPress={onExit} />
      </View>
      {champions.length > 0 ? <Confetti /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
