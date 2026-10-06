import { PlayerCharacter } from '../../ui/PlayerCharacter';
import React, { useEffect, useState } from 'react';
import { AppState, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Space, body, display, title as titleFont } from '../../theme/theme';
import { CategoryChip, GameExitButton, GlassCard, RankRow, ScreenHeader, CategoryChecklist, RulesSheet, ToggleRow } from '../../ui/Cards';
import { textEntries } from '../categoryEntries';
import { PrimaryButton, GhostButton } from '../../ui/Buttons';
import { Pressable } from '../../ui/Pressable';
import { Layout } from '../../ui/layout';
import { Confetti } from '../../ui/Confetti';
import { FitText } from '../../ui/FitText';
import { useLandscapeOnly } from '../../core/orientationLock';
import { IdentityBank } from '../../content/banks';
import { TurnRotation } from '../../core/turnRotation';
import { Haptics } from '../../core/haptics';
import { useObservable } from '../../core/observable';
import { useAwardOnce } from '../../core/awardOnce';
import type { GameFlowProps } from '../registry';
import { WhoAmIEngine, type WhoAmIEntry } from './engine';
import { game as findGame } from '../catalog';
import { Icon } from '../../ui/Icon';

/**
 * „ვინ ვარ მე?“ — სრული ნაკადი.
 *
 * პორტი: `Splash/Games/WhoAmI/*.swift` (5 ხედი).
 * სტრუქტურით `Charades`-ის ტყუპია: ლანდშაფტი, დახრა, ეკრანის ორი ნახევარი
 * სარეზერვო გზად. განსხვავება — **კითხვებს მფლობელი სვამს**, მაგიდას კი
 * მხოლოდ „კი“ და „არა“ შეუძლია.
 */

const TIME_OPTIONS = [60, 90, 120];

export function WhoAmIFlow({ roster, onExit }: GameFlowProps) {
  const [engine] = useState(() => new WhoAmIEngine([...roster.players]));
  useObservable(engine);

  useEffect(() => () => engine.releaseScreen(), [engine]);

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

function Setup({ engine, onClose }: { engine: WhoAmIEngine; onClose: () => void }) {
  const [showRules, setShowRules] = useState(false);
  const gameData = findGame('whoami');
  return (
    <View style={{ flex: 1 }}>
      <RulesSheet visible={showRules} title="Who Am I?" accent={Colors.phosphor} steps={gameData?.howTo ?? []} onClose={() => setShowRules(false)} />

      <View style={Layout.header}>
        <ScreenHeader title="Who Am I?"  onBack={onClose}  onInfo={() => setShowRules(true)} />
      </View>

      <ScrollView contentContainerStyle={Layout.scroll}>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>დრო</Text>
            <View style={Layout.segmentRow}>
              {TIME_OPTIONS.map((value) => (
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
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>ჯერები</Text>
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
              build={() => textEntries(IdentityBank, 'identity', 'ყველა')}
              selectedIDs={engine.settings.categoryIDs}
              onChange={(ids) => engine.setCategories(ids)}
            />
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 14 }}>
            <ToggleRow
              title="გამოტოვების ჯარიმა"
              subtitle="გამოტოვებული სახელი −1 ქულაა"
              value={engine.settings.skipPenalty}
              onChange={(on) => engine.setSkipPenalty(on)}
            />
            <ToggleRow
              title="დახრის შებრუნება"
              subtitle="თუ დახრა პირიქით მუშაობს — ჩართე და მიმართულებები გაიცვლება"
              value={engine.settings.invertTilt}
              onChange={(on) => engine.setInvertTilt(on)}
            />
          </View>
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

// ── ჯერის შესავალი

function TurnIntro({ engine, onExit }: { engine: WhoAmIEngine; onExit: () => void }) {
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
          შენ კითხულობ, მაგიდა პასუხობს: კი ან არა.
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

function Countdown({ engine, onExit }: { engine: WhoAmIEngine; onExit: () => void }) {
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

// ── თამაში

function Play({ engine, onExit }: { engine: WhoAmIEngine; onExit: () => void }) {
  const flash = engine.flash;
  const flashColor = flash?.verdict === 'guessed' ? Colors.phosphor : Colors.neonCyan;

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
          <Counter symbol="✓" value={engine.turnGuessed} color={Colors.phosphor} />
          <View style={{ flex: 1 }} />
          <Text
            style={[styles.timer, Layout.digits, { color: engine.remaining <= 10 ? Colors.neonMagenta : Colors.textPrimary }]}
          >
            {engine.remaining}
          </Text>
          <View style={{ flex: 1 }} />
          <Counter symbol="↷" value={engine.turnPassed} color={Colors.neonCyan} />
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <FitText
            style={[styles.word, Layout.centered, { color: flash ? Colors.ink : Colors.textPrimary }]}
            maxLines={3}
          >
            {flash ? (flash.verdict === 'guessed' ? 'გამოიცანი' : 'გამოტოვება') : engine.currentIdentity}
          </FitText>
        </View>

        <Text
          style={[
            body(13, '600'),
            Layout.centered,
            { color: flash ? Colors.ink : Colors.textSecondary, opacity: flash ? 0.6 : 1, paddingBottom: 10 },
          ]}
        >
          {engine.settings.invertTilt ? 'უკან — მივხვდი · წინ — გამოტოვება' : 'წინ — მივხვდი · უკან — გამოტოვება'}
        </Text>
      </View>

      <View style={[StyleSheet.absoluteFill, { flexDirection: 'row' }]}>
        <Pressable accessibilityLabel="გამოტოვება" onPress={() => engine.register('passed')} style={{ flex: 1 }}>
          <View style={{ flex: 1 }} />
        </Pressable>
        <Pressable accessibilityLabel="მივხვდი" onPress={() => engine.register('guessed')} style={{ flex: 1 }}>
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

function TurnResult({ engine, onExit }: { engine: WhoAmIEngine; onExit: () => void }) {
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
        <Text style={[display(58), Layout.digits, { color: Colors.textPrimary }]}>{engine.turnScore}</Text>
        <Text style={[body(14, '600'), { color: Colors.textSecondary }]}>
          {engine.settings.skipPenalty ? `ქულა · ${engine.turnGuessed} გამოცნობილი` : 'გამოცნობილი'}
        </Text>
        {engine.turnPassed > 0 ? (
          <Text style={[body(13, '500'), Layout.digits, { color: Colors.textSecondary, opacity: 0.8 }]}>
            გამოტოვებული — {engine.turnPassed}
          </Text>
        ) : null}
        {engine.turnPenalty > 0 ? (
          <Text style={[body(13, '600'), { color: Colors.neonMagenta }]}>ჯარიმა −{engine.turnPenalty}</Text>
        ) : null}
      </View>

      {engine.results.length > 0 ? (
        <Text style={[body(12, '500'), Layout.centered, { color: Colors.textSecondary }]}>
          სადავო სახელს შეეხე — ნიშანი შეიცვლება.
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
          contentContainerStyle={[Layout.content, { paddingVertical: 4, gap: 6 }]}
        >
          {engine.results.map((entry) => (
            <IdentityRow key={entry.id} engine={engine} entry={entry} />
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

function IdentityRow({ engine, entry }: { engine: WhoAmIEngine; entry: WhoAmIEntry }) {
  const guessed = entry.verdict === 'guessed';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${entry.identity}. ${guessed ? 'გამოცნობილი' : 'გამოტოვებული'}. შეცვლისთვის დააჭირე`}
      onPress={() => {
        Haptics.tap();
        engine.flip(entry);
      }}
      style={[styles.wordRow, { backgroundColor: guessed ? Colors.phosphor + '1F' : Colors.surface }]}
    >
      <Icon
        name={guessed ? 'check-circle' : 'close-circle'}
        size={21}
        color={guessed ? Colors.phosphor : Colors.neonMagenta}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[body(16, '600'), { color: guessed ? Colors.textPrimary : Colors.textSecondary }]} numberOfLines={1}>
          {entry.identity}
        </Text>
        {entry.isOvertime ? (
          <Text style={[body(11, '500'), { color: Colors.textSecondary, opacity: 0.8 }]}>
            ბოლო სახელი — დრო ამოიწურა
          </Text>
        ) : null}
      </View>
      <Text style={[body(14, '900'), Layout.digits, { color: guessed ? Colors.phosphor : Colors.textSecondary }]}>
        {guessed ? '+1' : '0'}
      </Text>
    </Pressable>
  );
}

// ── შეჯამება

function Summary({
  engine,
  onExit,
}: {
  engine: WhoAmIEngine;
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
        {champions.length > 0 ? `${champions.map((p) => p.name).join(', ')} — ${engine.scoreFor(champions[0])} ${engine.settings.skipPenalty ? 'ქულა' : 'გამოცნობილი'}` : 'ამ პარტიაში ვერავინ გამოიცნო'}
      </Text>


      <ScrollView contentContainerStyle={[Layout.content, { gap: 8 }]}>
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
        <GhostButton title="დასრულება" icon="xmark" onPress={onExit} />
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
