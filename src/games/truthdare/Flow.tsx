import { PlayerCharacter } from '../../ui/PlayerCharacter';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Radius, Space, body, caption, title as titleFont } from '../../theme/theme';
import { icon as sf } from '../../theme/icons';
import { CategoryChip, GameExitButton, GlassCard, GlyphIcon, ScreenHeader , RulesSheet } from '../../ui/Cards';
import { PrimaryButton, GhostButton } from '../../ui/Buttons';
import { Pressable } from '../../ui/Pressable';
import { BottleSpinner } from '../../ui/BottleSpinner';
import { Layout } from '../../ui/layout';
import { useKeepScreenAwake } from '../../core/orientationLock';
import { heatName, heatNote, type TruthDareHeat } from '../../content/banks';
import { PodiumAward } from '../../core/podiumAward';
import { Haptics } from '../../core/haptics';
import { useObservable } from '../../core/observable';
import { useAwardOnce } from '../../core/awardOnce';
import type { GameFlowProps } from '../registry';
import { TruthDareEngine, orderTitle, type TruthDareOrder } from './engine';
import { game as findGame } from '../catalog';

/**
 * „სიმართლე თუ მოქმედება“ — სრული ნაკადი.
 *
 * პორტი: `Splash/Games/TruthDare/*.swift` (5 ხედი).
 * სიმართლე +1, მოქმედება +2 — რისკი ქულით ფასდება. პასი ყოველთვის შეიძლება.
 */

const HEATS: TruthDareHeat[] = ['family', 'party', 'spicy'];
const ORDERS: TruthDareOrder[] = ['circle', 'bottle'];
const TURN_OPTIONS = [0, 10, 20, -1];

function turnLabel(value: number): string {
  if (value === 0) return 'ყველა ერთხელ';
  if (value === -1) return 'უსასრულო';
  return String(value);
}

export function TruthDareFlow({ roster, onExit }: GameFlowProps) {
  const [engine] = useState(() => new TruthDareEngine([...roster.players]));
  useObservable(engine);

  switch (engine.phase) {
    case 'setup':
      return <Setup engine={engine} onClose={onExit} />;
    case 'turn':
      return <Turn engine={engine} onExit={onExit} />;
    case 'task':
      return <Task engine={engine} onExit={onExit} />;
    case 'summary':
      return <Summary engine={engine} roster={roster} onExit={onExit} />;
  }
}

// ── პარამეტრები

function Setup({ engine, onClose }: { engine: TruthDareEngine; onClose: () => void }) {
  const [showRules, setShowRules] = useState(false);
  const gameData = findGame('truthdare');
  return (
    <View style={{ flex: 1 }}>
      <RulesSheet visible={showRules} title="Truth or Dare" accent={Colors.neonCyan} steps={gameData?.howTo ?? []} onClose={() => setShowRules(false)} />

      <View style={Layout.header}>
        <ScreenHeader
          title="სიმართლე თუ მოქმედება"
          subtitle={`${engine.players.length} მოთამაშე`}
          onBack={onClose}
         onInfo={() => setShowRules(true)} />
      </View>

      <ScrollView contentContainerStyle={Layout.scroll}>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>დონე</Text>
            <View style={Layout.segmentRow}>
              {HEATS.map((heat) => (
                <CategoryChip
                  compact
                  key={heat}
                  label={heatName[heat]}
                  selected={engine.settings.heat === heat}
                  onPress={() => engine.setHeat(heat)}
                />
              ))}
            </View>
            <Text style={[body(12, '500'), { color: Colors.textSecondary }]}>{heatNote[engine.settings.heat]}</Text>
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>ვის ერგება ჯერი</Text>
            <View style={Layout.segmentRow}>
              {ORDERS.map((order) => (
                <CategoryChip
                  compact
                  key={order}
                  label={orderTitle[order]}
                  selected={engine.settings.order === order}
                  onPress={() => engine.setOrder(order)}
                />
              ))}
            </View>
            <Text style={[body(12, '500'), { color: Colors.textSecondary }]}>
              {engine.settings.order === 'circle'
                ? 'ჯერი წრეზე ტრიალებს — ყველას თანაბრად ერგება.'
                : 'ტელეფონი ბოთლივით ირჩევს — ზედიზედ ერთი და იგივე არავის ერგება.'}
            </Text>
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>რამდენი ჯერი</Text>
            <View style={Layout.chipRow}>
              {TURN_OPTIONS.map((value) => (
                <CategoryChip
                  key={value}
                  label={turnLabel(value)}
                  selected={engine.settings.turns === value}
                  onPress={() => engine.setTurns(value)}
                />
              ))}
            </View>
            <Text style={[body(12, '500'), { color: Colors.textSecondary }]}>
              {engine.isEndless ? 'თამაში არ მთავრდება — შეჯამებას თვითონ გამოიძახებთ.' : `სულ ${engine.totalTurns} ჯერი.`}
            </Text>
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <MaterialCommunityIcons name={sf('hand.raised.fill')} size={15} color={Colors.neonCyan} />
            <Text style={[body(12, '500'), { color: Colors.textSecondary, flex: 1 }]}>
              დავალება, რომელიც ვინმეს რეალურად აზარალებს, არ სრულდება — პასი ყოველთვის ნებადართულია.
            </Text>
          </View>
        </GlassCard>
      </ScrollView>

      <View style={Layout.footer}>
        <PrimaryButton title="დაწყება" icon="play.fill" tint={Colors.neonCyan} onPress={() => engine.startGame()} />
      </View>
    </View>
  );
}

// ── ჯერი (ბოთლი ან პირდაპირ არჩევანი)

function Turn({ engine, onExit }: { engine: TruthDareEngine; onExit: () => void }) {
  const [bottleDone, setBottleDone] = useState(false);
  const needsBottle = engine.settings.order === 'bottle' && engine.players.length >= 2 && !bottleDone;

  // ახალი ჯერი — ბოთლი ისევ უნდა დატრიალდეს.
  useEffect(() => {
    setBottleDone(false);
  }, [engine.turn]);

  const header = (
    <View style={Layout.topBar}>
      <GameExitButton onExit={onExit} />
      <Text style={[body(14, '700'), Layout.digits, { color: Colors.textSecondary }]}>
        {engine.isEndless ? `ჯერი ${engine.turn}` : `ჯერი ${engine.turn} / ${engine.totalTurns}`}
      </Text>
      <View style={{ flex: 1 }} />
      <Text style={[body(13, '700'), { color: Colors.neonCyan }]}>{engine.heatName}</Text>
    </View>
  );

  if (needsBottle) {
    return (
      <View style={{ flex: 1, gap: 18 }}>
        {header}
        <View style={{ flex: 1 }} />
        <BottleSpinner
          key={engine.turn}
          players={engine.players}
          targetIndex={engine.currentIndex}
          onFinish={() => setBottleDone(true)}
        />
        <View style={{ flex: 1 }} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, gap: 18 }}>
      {header}
      <View style={{ flex: 1 }} />

      <View style={{ alignItems: 'center' }}>
        <GlyphIcon
          name={engine.settings.order === 'bottle' ? 'arrow.clockwise.circle.fill' : 'person.fill'}
          size={30}
          tint={Colors.neonCyan}
        />
      </View>

      <PlayerCharacter player={engine.currentPlayer} compact />
      <Text style={[body(15, '500'), Layout.centered, { color: Colors.textSecondary }]}>ჯერი გიდგება</Text>

      <Text
        style={[titleFont(38), Layout.centered, { color: Colors.textPrimary, paddingHorizontal: 24 }]}
        adjustsFontSizeToFit
        numberOfLines={2}
      >
        {engine.currentPlayer?.name ?? '—'}
      </Text>

      <Text style={[body(13, '700'), Layout.centered, { color: Colors.textSecondary }]}>აირჩიე</Text>

      <View style={{ flex: 1 }} />

      <View style={[Layout.footer, { gap: 12 }]}>
        <ChoiceButton
          title="სიმართლე"
          subtitle="+1 ქულა"
          icon="bubble.left.and.bubble.right.fill"
          tint={Colors.neonCyan}
          onPress={() => engine.pick('truth')}
        />
        <ChoiceButton
          title="მოქმედება"
          subtitle="+2 ქულა"
          icon="figure.run"
          tint={Colors.phosphor}
          onPress={() => engine.pick('dare')}
        />
        {engine.isEndless ? (
          <GhostButton title="შეჯამება" icon="flag.checkered" onPress={() => engine.finishNow()} />
        ) : null}
      </View>
    </View>
  );
}

function ChoiceButton({
  title,
  subtitle,
  icon,
  tint,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: string;
  tint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      onPress={() => {
        Haptics.medium();
        onPress();
      }}
      style={[styles.choice, { borderColor: tint + '59' }]}
    >
      <MaterialCommunityIcons name={sf(icon)} size={22} color={tint} style={{ width: 30 }} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[titleFont(21), { color: Colors.textPrimary }]}>{title}</Text>
        <Text style={[body(12, '600'), { color: Colors.textSecondary }]}>{subtitle}</Text>
      </View>
      <MaterialCommunityIcons name={sf('chevron.right')} size={16} color={Colors.textSecondary} />
    </Pressable>
  );
}

// ── დავალება

function Task({ engine, onExit }: { engine: TruthDareEngine; onExit: () => void }) {
  useKeepScreenAwake();
  const isTruth = engine.choice === 'truth';
  const tint = isTruth ? Colors.neonCyan : Colors.phosphor;

  return (
    <View style={{ flex: 1, gap: Space.m }}>
      <View style={Layout.topBar}>
        <GameExitButton onExit={onExit} />
        <Text style={[body(14, '700'), Layout.digits, { color: Colors.textSecondary }]}>
          {engine.isEndless ? `ჯერი ${engine.turn}` : `ჯერი ${engine.turn} / ${engine.totalTurns}`}
        </Text>
        <View style={{ flex: 1 }} />
        <Text style={[body(14, '700'), { color: tint }]} numberOfLines={1}>
          {engine.currentPlayer?.name ?? '—'}
        </Text>
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ alignItems: 'center' }}>
        <GlyphIcon name={isTruth ? 'bubble.left.and.bubble.right.fill' : 'figure.run'} size={30} tint={tint} />
      </View>

      <Text style={[body(14, '700'), Layout.centered, { color: tint }]}>{isTruth ? 'სიმართლე' : 'მოქმედება'}</Text>

      <View style={Layout.content}>
        <GlassCard padding={26}>
          <Text
            style={[titleFont(24), Layout.centered, { color: Colors.textPrimary }]}
            adjustsFontSizeToFit
            numberOfLines={6}
          >
            {engine.currentText}
          </Text>
        </GlassCard>
      </View>

      <Text style={[body(12, '500'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
        {isTruth
          ? 'პასუხი გულწრფელი უნდა იყოს — მაგიდა ხომ ისედაც მიხვდება.'
          : 'შესრულება ახლავე, ყველას თვალწინ.'}
      </Text>

      <View style={{ flex: 1 }} />

      <View style={Layout.footer}>
        <GhostButton title="სხვა ბარათი" icon="shuffle" onPress={() => engine.swap()} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="პასი"
            onPress={() => engine.pass()}
            style={styles.passButton}
          >
            <MaterialCommunityIcons name={sf('hand.raised.fill')} size={16} color={Colors.textSecondary} />
            <Text style={[body(16, '700'), { color: Colors.textSecondary }]}>პასი</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="შესრულდა"
            onPress={() => engine.complete()}
            style={[styles.doneButton, { backgroundColor: tint }]}
          >
            <MaterialCommunityIcons name={sf('checkmark')} size={16} color={Colors.onAccent} />
            <Text style={[body(16, '700'), { color: Colors.onAccent }]}>შესრულდა</Text>
          </Pressable>
        </View>
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
  engine: TruthDareEngine;
  roster: GameFlowProps['roster'];
  onExit: () => void;
}) {

  useAwardOnce(() => {
    PodiumAward.apply(engine.results, roster);
    Haptics.success();
  });

  const champion = engine.champion;
  const fearless = engine.fearless;

  return (
    <View style={{ flex: 1, gap: 14 }}>
      <View style={{ flex: 1 }} />

      <View style={{ alignItems: 'center' }}>
        <GlyphIcon name="flame.fill" size={31} tint={Colors.neonCyan} />
      </View>

      <Text style={[titleFont(26), Layout.centered, { color: Colors.neonCyan, paddingHorizontal: 24 }]}>
        ყველაზე გაბედული
      </Text>

      <Text style={[body(15, '600'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
        {champion ? `${champion.name} — ${engine.scoreFor(champion)} ქულა` : 'ამ პარტიაში ქულა ვერავინ აიღო'}
      </Text>

      {fearless.length > 0 ? (
        <Text style={[body(12, '600'), Layout.centered, { color: Colors.phosphor, paddingHorizontal: 28 }]}>
          პასის გარეშე: {fearless.map((p) => p.name).join(', ')}
        </Text>
      ) : null}

      <Text
        style={[body(12, '500'), Layout.centered, { color: Colors.textSecondary, opacity: 0.7, paddingHorizontal: 24 }]}
      >
        საერთო ტაბლოზე პირველ სამს +3 / +2 / +1 ერიცხება
      </Text>

      <ScrollView contentContainerStyle={[Layout.content, { gap: 8 }]}>
        {engine.ranking.map((player, rank) => {
          const passes = engine.passCount(player);
          return (
            <View key={player.id} style={styles.summaryRow}>
              <Text style={[body(16, '900'), { color: Colors.textSecondary, width: 30 }]}>{rank + 1}</Text>
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={[body(16, '600'), { color: Colors.textPrimary }]} numberOfLines={1}>
                  {player.name}
                </Text>
                {passes > 0 ? (
                  <Text style={[caption(11), { color: Colors.textSecondary }]}>პასი — {passes}</Text>
                ) : null}
              </View>
              <Text
                style={[titleFont(20), Layout.digits, { color: rank === 0 ? Colors.neonCyan : Colors.textPrimary }]}
              >
                {engine.scoreFor(player)}
              </Text>
            </View>
          );
        })}
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
    </View>
  );
}

const styles = StyleSheet.create({
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderRadius: Radius.default,
    backgroundColor: Colors.surface,
    borderWidth: 1,
  },
  passButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 17,
    borderRadius: Radius.default,
    backgroundColor: Colors.surface,
  },
  doneButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 17,
    borderRadius: Radius.default,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Space.m,
    paddingVertical: 13,
    borderRadius: Radius.small,
    backgroundColor: Colors.surface,
  },
});
