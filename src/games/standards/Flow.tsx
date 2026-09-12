import React, {useState} from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Space, body, caption, title as titleFont } from '../../theme/theme';
import { CategoryChip, GameExitButton, GlassCard, GlyphIcon, RankRow, ScreenHeader, CategoryPicker } from '../../ui/Cards';
import { textEntries } from '../categoryEntries';
import { PrimaryButton, GhostButton } from '../../ui/Buttons';
import { Pressable } from '../../ui/Pressable';
import { Confetti } from '../../ui/Confetti';
import { Layout } from '../../ui/layout';
import { StandardsBank } from '../../content/banks';
import { TurnRotation } from '../../core/turnRotation';
import { PodiumAward } from '../../core/podiumAward';
import { Haptics } from '../../core/haptics';
import { useObservable } from '../../core/observable';
import { useAwardOnce } from '../../core/awardOnce';
import type { GameFlowProps } from '../registry';
import { StandardsEngine, type StandardsVerdict } from './engine';

/**
 * „ნორმაა თუ არა?“ (Where's the Line?) — სრული ნაკადი.
 *
 * პორტი: `Splash/Games/Standards/*.swift` (6 ხედი).
 * ქულა ორ ადგილას ჩნდება: **მკითხავს** ზუსტი პროგნოზისთვის და
 * **უმცირესობას** გულწრფელობისთვის.
 */

const Palette = { normal: Colors.neonCyan, tooMuch: Colors.neonMagenta, accent: Colors.neonCyan };

export function StandardsFlow({ roster, onExit }: GameFlowProps) {
  const [engine] = useState(() => new StandardsEngine([...roster.players]));
  useObservable(engine);

  switch (engine.phase) {
    case 'setup':
      return <Setup engine={engine} onClose={onExit} />;
    case 'intro':
      return <Intro engine={engine} onExit={onExit} />;
    case 'voting':
      return <Vote engine={engine} onExit={onExit} />;
    case 'result':
      return <Result engine={engine} onExit={onExit} />;
    case 'summary':
      return <Summary engine={engine} roster={roster} onExit={onExit} />;
  }
}

// ── პარამეტრები

function Setup({ engine, onClose }: { engine: StandardsEngine; onClose: () => void }) {
  return (
    <View style={{ flex: 1 }}>
      <View style={Layout.header}>
        <ScreenHeader title="ნორმაა თუ არა?" subtitle={`${engine.players.length} მოთამაშე`} onBack={onClose} />
      </View>

      <ScrollView contentContainerStyle={Layout.scroll}>
        <GlassCard>
          <View style={{ gap: 10 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>როგორ ითვლება ქულა</Text>
            <Rule text="ეკრანზე ერთი მოლოდინია — ყველა ფარულად წყვეტს: ნორმაა თუ გადამეტება." />
            <Rule
              text={`რაუნდის მკითხავი პროგნოზსაც წერს: რამდენი იტყვის „ნორმაა“. ზუსტი +${StandardsEngine.exactReward}, ერთით აცდენა +${StandardsEngine.closeReward}.`}
            />
            <Rule text={`უმცირესობაში დარჩენილებს +${StandardsEngine.minorityReward} — გულწრფელობა ჯილდოვდება.`} />
            <Rule text="ერთსულოვნებაზე უმცირესობის ქულა არავის ერგება." />
          </View>
        </GlassCard>

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
            <Text style={[body(12, '500'), { color: Colors.textSecondary }]}>
              სულ {engine.totalRounds} რაუნდი — მკითხავობა ყველას თანაბრად ხვდება.
            </Text>
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>კატეგორია</Text>
            <CategoryPicker
              build={() => textEntries(StandardsBank, 'standards', 'ყველა')}
              selectedID={engine.settings.categoryID}
              onSelect={(id) => engine.setCategory(id)}
            />
          </View>
        </GlassCard>
      </ScrollView>

      <View style={Layout.footer}>
        <PrimaryButton title="დაწყება" icon="play.fill" tint={Palette.accent} onPress={() => engine.startGame()} />
      </View>
    </View>
  );
}

function Rule({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
      <Text style={[body(14, '700'), { color: Colors.textSecondary }]}>•</Text>
      <Text style={[body(14, '500'), { color: Colors.textSecondary, flex: 1 }]}>{text}</Text>
    </View>
  );
}

// ── მოლოდინის გაცნობა

function Intro({ engine, onExit }: { engine: StandardsEngine; onExit: () => void }) {
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
            <Text style={[body(16, '700'), { color: Palette.tooMuch }]}>ნორმაა თუ გადამეტებაა?</Text>
            <Text style={[titleFont(26), Layout.centered, { color: Colors.textPrimary }]} adjustsFontSizeToFit numberOfLines={5}>
              {engine.currentExpectation}
            </Text>
          </View>
        </GlassCard>
      </View>

      <Text
        style={[body(17, '900'), Layout.centered, { color: Colors.phosphor, paddingHorizontal: 32 }]}
        numberOfLines={2}
        adjustsFontSizeToFit
      >
        ამ რაუნდის მკითხავი — {engine.reader?.name ?? '—'}
      </Text>

      <Text style={[body(14, '500'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
        ჯერ არაფერს ამბობთ — ტელეფონი წრეზე გადადის
      </Text>

      <View style={{ flex: 1 }} />

      <View style={Layout.footer}>
        <PrimaryButton title="დავიწყოთ" icon="chevron.right" tint={Palette.accent} onPress={() => engine.beginVoting()} />
        <GhostButton title="სხვა მოლოდინი" icon="shuffle" onPress={() => engine.swapExpectation()} />
      </View>
    </View>
  );
}

// ── ფარული ხმა

function Vote({ engine, onExit }: { engine: StandardsEngine; onExit: () => void }) {
  const [handedOver, setHandedOver] = useState(false);
  const [verdict, setVerdict] = useState<StandardsVerdict | null>(null);
  const [prediction, setPrediction] = useState<number | null>(null);

  const header = (
    <View style={Layout.topBar}>
      <GameExitButton onExit={onExit} />
      <Text style={[body(14, '700'), Layout.digits, { color: Colors.textSecondary }]}>
        რაუნდი {engine.round} / {engine.totalRounds}
      </Text>
      <View style={{ flex: 1 }} />
      <Text style={[body(14, '700'), Layout.digits, { color: Colors.textSecondary }]}>
        {engine.voterIndex + 1} / {engine.players.length}
      </Text>
    </View>
  );

  if (!handedOver) {
    return (
      <View style={{ flex: 1, gap: 20 }}>
        {header}
        <View style={{ flex: 1 }} />
        <Text style={[body(16, '500'), Layout.centered, { color: Colors.textSecondary }]}>გადაეცი ტელეფონი</Text>
        <Text
          style={[titleFont(36), Layout.centered, { color: Colors.textPrimary, paddingHorizontal: 24 }]}
          adjustsFontSizeToFit
          numberOfLines={2}
        >
          {engine.currentVoter?.name ?? '—'}
        </Text>
        {engine.currentVoterIsReader ? (
          <Text style={[body(14, '700'), Layout.centered, { color: Colors.phosphor }]}>
            შენ ხარ ამ რაუნდის მკითხავი
          </Text>
        ) : null}
        <Text style={[body(13, '500'), Layout.centered, { color: Colors.textSecondary }]}>დანარჩენები არ იყურებიან</Text>
        <View style={{ flex: 1 }} />
        <View style={Layout.footer}>
          <PrimaryButton
            title="ჩემი ჯერია"
            icon="hand.raised.fill"
            tint={Palette.accent}
            onPress={() => {
              setVerdict(null);
              setPrediction(null);
              setHandedOver(true);
            }}
          />
        </View>
      </View>
    );
  }

  const canSubmit = verdict !== null && (!engine.currentVoterIsReader || prediction !== null);

  return (
    <View style={{ flex: 1 }}>
      {header}

      <ScrollView contentContainerStyle={{ paddingBottom: 20, gap: Space.m, paddingTop: 10 }}>
        <Text style={[body(19, '700'), Layout.centered, { color: Colors.textPrimary, paddingHorizontal: 24 }]}>
          {engine.currentExpectation}
        </Text>

        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20 }}>
          <VerdictButton
            title="ნორმაა"
            tint={Palette.normal}
            on={verdict === 'normal'}
            onPress={() => setVerdict('normal')}
          />
          <VerdictButton
            title="გადამეტებაა"
            tint={Palette.tooMuch}
            on={verdict === 'tooMuch'}
            onPress={() => setVerdict('tooMuch')}
          />
        </View>

        {/* პროგნოზი მხოლოდ მკითხავს ეკითხება. */}
        {engine.currentVoterIsReader ? (
          <View style={{ paddingHorizontal: 20 }}>
            <GlassCard>
              <View style={{ gap: 10 }}>
                <Text style={[body(15, '700'), { color: Colors.textPrimary }]}>რამდენი იტყვის „ნორმაა“?</Text>
                <Text style={[caption(11), { color: Colors.textSecondary }]}>
                  შენ ხარ მკითხავი: ზუსტი პროგნოზი +{StandardsEngine.exactReward}, ერთით აცდენა +
                  {StandardsEngine.closeReward}.
                </Text>
                <View style={Layout.chipRow}>
                  {Array.from({ length: engine.players.length + 1 }, (_, n) => (
                    <CategoryChip key={n} label={String(n)} selected={prediction === n} onPress={() => setPrediction(n)} />
                  ))}
                </View>
              </View>
            </GlassCard>
          </View>
        ) : (
          <Text style={[caption(11), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
            უმცირესობაში დარჩენა +{StandardsEngine.minorityReward} ქულაა — გულწრფელად უპასუხე.
          </Text>
        )}
      </ScrollView>

      <View style={Layout.footer}>
        <PrimaryButton
          title="დაფიქსირება"
          icon="checkmark"
          tint={Palette.accent}
          enabled={canSubmit}
          onPress={() => {
            if (!verdict) return;
            setHandedOver(false);
            engine.cast(verdict, prediction);
          }}
        />
      </View>
    </View>
  );
}

function VerdictButton({ title, tint, on, onPress }: { title: string; tint: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected: on }}
      onPress={() => {
        Haptics.medium();
        onPress();
      }}
      style={[
        styles.verdictButton,
        { backgroundColor: on ? tint : Colors.surface, borderColor: on ? 'transparent' : Colors.stroke },
      ]}
    >
      <Text style={[body(16, '700'), { color: on ? Colors.ink : Colors.textPrimary }]}>{title}</Text>
    </Pressable>
  );
}

// ── შედეგი

function Result({ engine, onExit }: { engine: StandardsEngine; onExit: () => void }) {
  const total = Math.max(1, engine.players.length);
  const share = engine.normalVotes / total;
  const gap = engine.predictionGap;

  return (
    <View style={{ flex: 1, gap: 14 }}>
      <View style={Layout.exitSlot}>
        <GameExitButton onExit={onExit} />
      </View>

      <View style={{ flex: 1 }} />

      <Text style={[body(16, '600'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 28 }]}>
        {engine.currentExpectation}
      </Text>

      <View style={{ gap: 10, paddingHorizontal: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <Text style={[titleFont(34), Layout.digits, { color: Palette.normal }]}>{engine.normalVotes}</Text>
          <Text style={[titleFont(24), { color: Colors.textSecondary }]}>:</Text>
          <Text style={[titleFont(34), Layout.digits, { color: Palette.tooMuch }]}>{engine.tooMuchVotes}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 4, height: 20 }}>
          <View style={{ flex: Math.max(0.06, share), borderRadius: 8, backgroundColor: Palette.normal }} />
          <View style={{ flex: Math.max(0.06, 1 - share), borderRadius: 8, backgroundColor: Palette.tooMuch }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={[caption(11), { color: Palette.normal }]}>ნორმაა</Text>
          <Text style={[caption(11), { color: Palette.tooMuch }]}>გადამეტებაა</Text>
        </View>
      </View>

      {engine.isUnanimous ? (
        <Text style={[body(13, '500'), Layout.centered, { color: Colors.phosphor, paddingHorizontal: 32 }]}>
          მაგიდა ერთხმად შეთანხმდა — იშვიათი შემთხვევაა.
        </Text>
      ) : null}

      <ScrollView contentContainerStyle={[Layout.content, { paddingTop: 2, gap: 7 }]}>
        {engine.players.map((player) => {
          const v = engine.verdictFor(player);
          const minority = engine.isInMinority(player);
          const points = engine.roundPoint(player);
          return (
            <View key={player.id} style={styles.playerRow}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: v === 'normal' ? Palette.normal : v === 'tooMuch' ? Palette.tooMuch : Colors.surfaceHigh },
                ]}
              />
              <Text style={[body(15, '600'), { color: Colors.textPrimary, flex: 1 }]} numberOfLines={1}>
                {player.name}
              </Text>
              {engine.isReader(player) ? (
                <Text style={[caption(10), { color: Colors.phosphor }]}>მკითხავი</Text>
              ) : null}
              {minority ? <Text style={[caption(10), { color: Colors.textSecondary }]}>უმცირესობა</Text> : null}
              {points > 0 ? (
                <Text style={[body(14, '900'), Layout.digits, { color: Colors.phosphor }]}>+{points}</Text>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      {engine.prediction !== null ? (
        <Text style={[body(13, '600'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 28 }]}>
          {engine.reader?.name ?? '—'} იწინასწარმეტყველა {engine.prediction} — {gap === 0 ? 'ზუსტად' : `${gap}-ით აცდა`}
        </Text>
      ) : null}

      <Text
        style={[caption(11), Layout.centered, { color: Colors.textSecondary, opacity: 0.8, paddingHorizontal: 28 }]}
      >
        მკითხავს ზუსტი პროგნოზი +{StandardsEngine.exactReward} · ერთით აცდენა +{StandardsEngine.closeReward} ·
        უმცირესობას +{StandardsEngine.minorityReward}
      </Text>

      <View style={{ flex: 1 }} />

      <View style={Layout.footer}>
        <PrimaryButton
          title={engine.isLastRound ? 'შედეგები' : 'შემდეგი რაუნდი'}
          icon={engine.isLastRound ? 'flag.checkered' : 'chevron.right'}
          tint={Palette.accent}
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
  engine: StandardsEngine;
  roster: GameFlowProps['roster'];
  onExit: () => void;
}) {

  useAwardOnce(() => {
    PodiumAward.apply(engine.results, roster);
    Haptics.win();
  });

  const top = engine.ranking[0];
  const champion = top && engine.totalFor(top) > 0 ? top : null;
  const softest = engine.softest;
  const strictest = engine.strictest;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, gap: 14 }}>
        <View style={{ flex: 1 }} />

        <View style={{ alignItems: 'center' }}>
          <GlyphIcon name="crown.fill" size={31} tint={Colors.phosphor} />
        </View>

        <Text style={[titleFont(28), Layout.centered, { color: Palette.tooMuch }]}>
          {champion === null ? 'ქულა ვერავინ აიღო' : 'მაგიდის მკითხველი'}
        </Text>

        {champion ? (
          <Text style={[body(15, '600'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
            {champion.name} — ყველაზე ხშირად გამოიცნო, სად გაივლიდა ჯგუფი ხაზს
          </Text>
        ) : null}

        <View style={{ gap: 4 }}>
          {softest.length > 0 ? (
            <Text style={[caption(11), Layout.centered, { color: Palette.normal }]}>
              ყველაზე რბილი — {softest.map((p) => p.name).join(', ')}
            </Text>
          ) : null}
          {strictest.length > 0 ? (
            <Text style={[caption(11), Layout.centered, { color: Palette.tooMuch }]}>
              ყველაზე მკაცრი — {strictest.map((p) => p.name).join(', ')}
            </Text>
          ) : null}
        </View>

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
            tint={Palette.accent}
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
  verdictButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: Radius.default,
    borderWidth: 1,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: Radius.small,
    backgroundColor: Colors.surface,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
