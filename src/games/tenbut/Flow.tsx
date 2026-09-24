import { PlayerCharacter } from '../../ui/PlayerCharacter';
import {useState} from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { Colors, Radius, Space, body, caption, display, title as titleFont } from '../../theme/theme';
import { CategoryChip, GameExitButton, GlassCard, GlyphIcon, RankRow, ScreenHeader, CategoryPicker , RulesSheet } from '../../ui/Cards';
import { textEntries } from '../categoryEntries';
import { PrimaryButton, GhostButton } from '../../ui/Buttons';
import { Confetti } from '../../ui/Confetti';
import { Layout } from '../../ui/layout';
import { TenButBank } from '../../content/banks';
import { TurnRotation } from '../../core/turnRotation';
import { PodiumAward } from '../../core/podiumAward';
import { Haptics } from '../../core/haptics';
import { useObservable } from '../../core/observable';
import { useAwardOnce } from '../../core/awardOnce';
import type { Player } from '../../core/roster';
import type { GameFlowProps } from '../registry';
import { TenButEngine } from './engine';

/**
 * „10-ია, მაგრამ...“ (Rate Them) — სრული ნაკადი.
 *
 * პორტი: `Splash/Games/TenBut/*.swift` (6 ხედი).
 * ქულას მხოლოდ გამომცნობები იღებენ — სიზუსტისთვის.
 */

/** `TenButPalette` — ფერი ციფრის მიხედვით. */
const tintFor = (value: number) =>
  value < 3.5 ? Colors.neonMagenta : value < 6.5 ? Colors.phosphor : Colors.neonCyan;

export function TenButFlow({ roster, onExit }: GameFlowProps) {
  const [engine] = useState(() => new TenButEngine([...roster.players]));
  useObservable(engine);

  switch (engine.phase) {
    case 'setup':
      return <Setup engine={engine} onClose={onExit} />;
    case 'intro':
      return <Intro engine={engine} onExit={onExit} />;
    case 'rating':
      return <Rate engine={engine} onExit={onExit} />;
    case 'result':
      return <Result engine={engine} onExit={onExit} />;
    case 'summary':
      return <Summary engine={engine} roster={roster} onExit={onExit} />;
  }
}

// ── პარამეტრები

function Setup({ engine, onClose }: { engine: TenButEngine; onClose: () => void }) {
  const [showRules, setShowRules] = useState(false);
  const rules = [
    'სამიზნე მოთამაშე ჩვევას ფარულად აფასებს 0-დან 10-მდე. შემდეგ ტელეფონს დანარჩენებს გადასცემს.',
    'დანარჩენები რიგრიგობით წერენ, რა შეფასება აირჩია სამიზნემ. სხვის პასუხს შედეგების ეკრანამდე ვერ ხედავენ.',
    'ზუსტი გამოცნობა +3 ქულაა, ერთით აცდენა +2, ორით აცდენა +1.',
    'შემდეგ სამიზნე იცვლება. ყველას თანაბარი რაოდენობის სვლა აქვს. ბოლოს ითვლება საერთო შედეგი.'
  ];
  return (
    <View style={{ flex: 1 }}>
      <RulesSheet visible={showRules} title="Ten But" accent={Colors.neonCyan} steps={rules} onClose={() => setShowRules(false)} />

      <View style={Layout.header}>
        <ScreenHeader title="10-ია, მაგრამ..." subtitle={`${engine.players.length} მოთამაშე`} onBack={onClose}  onInfo={() => setShowRules(true)} />
      </View>

      <ScrollView contentContainerStyle={Layout.scroll}>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>რაუნდები</Text>
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
            <Text style={[caption(11), { color: Colors.textSecondary }]}>
              სულ {engine.totalRounds} რაუნდი.
            </Text>
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>კატეგორია</Text>
            <CategoryPicker
              build={() => textEntries(TenButBank, 'tenbut', 'ყველა')}
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

// ── ჩვევის გაცნობა

function Intro({ engine, onExit }: { engine: TenButEngine; onExit: () => void }) {
  return (
    <View style={{ flex: 1, gap: 18 }}>
      <View style={Layout.topBar}>
        <GameExitButton onExit={onExit} />
        <Text style={[body(14, '700'), Layout.digits, { color: Colors.textSecondary }]}>
          რაუნდი {engine.round} / {engine.totalRounds}
        </Text>
        <View style={{ flex: 1 }} />
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ paddingHorizontal: 20 }}>
        <GlassCard padding={24}>
          <View style={{ gap: 14, alignItems: 'center' }}>
            <Text style={[body(16, '700'), { color: Colors.phosphor }]}>10-ია, მაგრამ...</Text>
            <Text style={[titleFont(28), Layout.centered, { color: Colors.textPrimary }]} adjustsFontSizeToFit numberOfLines={5}>
              {engine.currentFlaw}
            </Text>
          </View>
        </GlassCard>
      </View>

      <View style={{ gap: 6, paddingHorizontal: 32 }}>
        <Text style={[body(17, '900'), Layout.centered, { color: Colors.phosphor }]} numberOfLines={2} adjustsFontSizeToFit>
          ამ რაუნდის სამიზნე — {engine.target?.name ?? '—'}
        </Text>
        <Text style={[body(14, '500'), Layout.centered, { color: Colors.textSecondary }]}>
          ჯერ ის აფასებს ფარულად, მერე დანარჩენები გამოიცნობენ, რა დაწერა.
        </Text>
      </View>

      <View style={{ flex: 1 }} />

      <View style={Layout.footer}>
        <PrimaryButton title="დავიწყოთ" icon="chevron.right" tint={Colors.phosphor} onPress={() => engine.beginRating()} />
        <GhostButton title="სხვა ჩვევა" icon="shuffle" onPress={() => engine.swapFlaw()} />
      </View>
    </View>
  );
}

// ── შეფასება

function Rate({ engine, onExit }: { engine: TenButEngine; onExit: () => void }) {
  const [handedOver, setHandedOver] = useState(false);
  const [value, setValue] = useState(5);

  const isTarget = engine.targetScore === null;
  const targetName = engine.target?.name ?? '—';

  const header = (
    <View style={Layout.topBar}>
      <GameExitButton onExit={onExit} />
      <Text style={[body(14, '700'), Layout.digits, { color: Colors.textSecondary }]}>
        რაუნდი {engine.round} / {engine.totalRounds}
      </Text>
      <View style={{ flex: 1 }} />
      <Text style={[body(14, '700'), Layout.digits, { color: Colors.textSecondary }]}>
        {engine.holderNumber} / {engine.holderTotal}
      </Text>
    </View>
  );

  if (!handedOver) {
    return (
      <View style={{ flex: 1, gap: 20 }}>
        {header}
        <View style={{ flex: 1 }} />
          <PlayerCharacter player={engine.currentHolder} />
        <Text style={[body(16, '500'), Layout.centered, { color: Colors.textSecondary }]}>გადაეცი ტელეფონი</Text>
        <Text
          style={[titleFont(36), Layout.centered, { color: Colors.textPrimary, paddingHorizontal: 24 }]}
          adjustsFontSizeToFit
          numberOfLines={2}
        >
          {engine.currentHolder?.name ?? '—'}
        </Text>
        <Text
          style={[body(14, '600'), Layout.centered, { color: isTarget ? Colors.phosphor : Colors.neonCyan, paddingHorizontal: 28 }]}
        >
          {isTarget ? 'შენ ხარ ამ რაუნდის სამიზნე' : `გამოიცანი, რა დაწერა ${targetName}-მა`}
        </Text>
        <Text style={[body(13, '500'), Layout.centered, { color: Colors.textSecondary }]}>დანარჩენები არ იყურებიან</Text>
        <View style={{ flex: 1 }} />
        <View style={Layout.footer}>
          <PrimaryButton
            title="ჩემი ჯერია"
            icon="hand.raised.fill"
            tint={Colors.phosphor}
            onPress={() => {
              setValue(5);
              setHandedOver(true);
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, gap: Space.m }}>
      {header}
      <View style={{ flex: 1 }} />

      <Text style={[body(17, '600'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 28 }]}>
        {engine.currentFlaw}
      </Text>

      <Text
        style={[body(13, '700'), Layout.centered, { color: isTarget ? Colors.phosphor : Colors.neonCyan, paddingHorizontal: 28 }]}
      >
        {isTarget ? 'შენი შეფასება' : `${targetName}-ის შეფასება შენი აზრით`}
      </Text>

      <Text style={[display(88), Layout.centered, Layout.digits, { color: tintFor(value) }]}>{Math.round(value)}</Text>

      <View style={{ gap: 6, paddingHorizontal: 28 }}>
        <Slider
          value={value}
          minimumValue={0}
          maximumValue={10}
          step={1}
          onValueChange={setValue}
          minimumTrackTintColor={tintFor(value)}
          maximumTrackTintColor={Colors.surfaceHigh}
          thumbTintColor={tintFor(value)}
        />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={[caption(11), { color: Colors.textSecondary }]}>0 — არავითარ შემთხვევაში</Text>
          <Text style={[caption(11), { color: Colors.textSecondary }]}>10 — არაფერი მიშლის</Text>
        </View>
      </View>

      <Text style={[caption(11), Layout.centered, { color: Colors.textSecondary, opacity: 0.85, paddingHorizontal: 28 }]}>
        {isTarget
          ? 'შეაფასე გულწრფელად.'
          : `ზუსტად +${TenButEngine.exactReward} · ერთით აცდენა +${TenButEngine.closeReward} · ორით +${TenButEngine.nearReward}`}
      </Text>

      <View style={{ flex: 1 }} />

      <View style={Layout.footer}>
        <PrimaryButton
          title="დაფიქსირება"
          icon="checkmark"
          tint={Colors.phosphor}
          onPress={() => {
            setHandedOver(false);
            engine.submit(Math.round(value));
          }}
        />
      </View>
    </View>
  );
}

// ── რაუნდის შედეგი

function Result({ engine, onExit }: { engine: TenButEngine; onExit: () => void }) {
  const score = engine.targetScore ?? 0;
  const exact = engine.exactGuessers;
  const surprised = engine.surprisedCount;

  const headline =
    exact.length > 0
      ? `${exact.map((p) => p.name).join(', ')} — ზუსტად მიაგნო`
      : surprised > 0
        ? `${engine.target?.name ?? '—'}-მა ${surprised} ადამიანი გააკვირვა`
        : 'ახლოს იყავით, მაგრამ ზუსტად ვერავინ';

  return (
    <View style={{ flex: 1, gap: 12 }}>
      <View style={Layout.exitSlot}>
        <GameExitButton onExit={onExit} />
      </View>

      <View style={{ flex: 1 }} />

      <Text style={[body(14, '600'), Layout.centered, { color: Colors.phosphor, paddingHorizontal: 24 }]} numberOfLines={1}>
        {engine.target?.name ?? '—'}-ის შეფასება
      </Text>

      <Text style={[display(76), Layout.centered, Layout.digits, { color: tintFor(score) }]}>{score}</Text>

      <Text style={[body(14, '500'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
        {engine.currentFlaw}
      </Text>

      <Text style={[titleFont(20), Layout.centered, { color: Colors.textPrimary, paddingHorizontal: 28 }]} numberOfLines={2}>
        {headline}
      </Text>

      <ScrollView contentContainerStyle={[Layout.content, { paddingTop: 4, gap: 7 }]}>
        {engine.guessers.map((player) => (
          <GuessRow key={player.id} engine={engine} player={player} />
        ))}
        {engine.target ? (
          <View style={[styles.playerRow, { backgroundColor: Colors.phosphor + '1F' }]}>
            <Text style={[body(15, '700'), { color: Colors.textPrimary, flex: 1 }]} numberOfLines={1}>
              {engine.target.name}
            </Text>
            <Text style={[caption(10), { color: Colors.textSecondary }]}>სამიზნე</Text>
            {engine.roundPoint(engine.target) > 0 ? (
              <Text style={[body(14, '900'), Layout.digits, { color: Colors.phosphor }]}>
                +{engine.roundPoint(engine.target)}
              </Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <Text style={[caption(11), Layout.centered, { color: Colors.textSecondary, opacity: 0.8, paddingHorizontal: 28 }]}>
        ზუსტად +{TenButEngine.exactReward} · ერთით აცდენა +{TenButEngine.closeReward} · ორით +{TenButEngine.nearReward}
      </Text>

      <View style={{ flex: 1 }} />

      <View style={Layout.footer}>
        <PrimaryButton
          title={engine.isLastRound ? 'შედეგები' : 'შემდეგი რაუნდი'}
          icon={engine.isLastRound ? 'flag.checkered' : 'chevron.right'}
          tint={Colors.phosphor}
          onPress={() => engine.next()}
        />
      </View>
    </View>
  );
}

function GuessRow({ engine, player }: { engine: TenButEngine; player: Player }) {
  const guess = engine.guessFor(player);
  const gap = engine.gapFor(player);
  const points = engine.roundPoint(player);

  return (
    <View style={styles.playerRow}>
      <Text style={[body(15, '600'), { color: Colors.textPrimary, flex: 1 }]} numberOfLines={1}>
        {player.name}
      </Text>
      <Text style={[body(15, '900'), Layout.digits, { color: guess === undefined ? Colors.textSecondary : tintFor(guess) }]}>
        {guess ?? '—'}
      </Text>
      {gap !== null ? (
        <Text style={[caption(10), { color: Colors.textSecondary }]}>{gap === 0 ? 'ზუსტად' : `${gap}-ით`}</Text>
      ) : null}
      {points > 0 ? <Text style={[body(14, '900'), Layout.digits, { color: Colors.phosphor }]}>+{points}</Text> : null}
    </View>
  );
}

// ── შეჯამება

function Summary({
  engine,
  roster,
  onExit,
}: {
  engine: TenButEngine;
  roster: GameFlowProps['roster'];
  onExit: () => void;
}) {

  useAwardOnce(() => {
    PodiumAward.apply(engine.results, roster);
    Haptics.win();
  });

  const champion = engine.champion;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, gap: 14 }}>
        <View style={{ flex: 1 }} />

        <View style={{ alignItems: 'center' }}>
          <GlyphIcon name="crown.fill" size={31} tint={Colors.phosphor} />
        </View>

        <Text style={[titleFont(28), Layout.centered, { color: Colors.phosphor }]}>
          {champion === null ? 'ქულა ვერავინ აიღო' : 'ვინც ყველაზე კარგად კითხულობს'}
        </Text>

        {champion ? (
          <Text style={[body(15, '600'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
            {champion.name} — {engine.totalFor(champion)} ქულა
          </Text>
        ) : null}

        <Text style={[body(12, '500'), Layout.centered, { color: Colors.textSecondary, opacity: 0.7 }]}>
          საერთო ტაბლოზე პირველ სამს +3 / +2 / +1 ერიცხება
        </Text>

        <ScrollView contentContainerStyle={[Layout.content, { gap: 8 }]}>
          {engine.ranking.map((player, rank) => (
            <RankRow key={player.id} rank={rank + 1} name={player.name} score={engine.totalFor(player)} highlight={rank === 0} />
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

      {champion ? <Confetti /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: Radius.small,
    backgroundColor: Colors.surface,
  },
});
