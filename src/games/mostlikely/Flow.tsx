import { PlayerCharacter } from '../../ui/PlayerCharacter';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Space, body, title as titleFont } from '../../theme/theme';
import { CategoryChip, GameExitButton, GlassCard, GlyphIcon, RadioRow, RankRow, ScreenHeader, CategoryPicker , RulesSheet } from '../../ui/Cards';
import { keyedEntries } from '../categoryEntries';
import { PrimaryButton, GhostButton } from '../../ui/Buttons';
import { Pressable } from '../../ui/Pressable';
import { Layout } from '../../ui/layout';
import { SummaryAwards } from '../../ui/SummaryAwards';
import { PromptBank } from '../../content/banks';
import { PodiumAward } from '../../core/podiumAward';
import { Haptics } from '../../core/haptics';
import { useObservable } from '../../core/observable';
import { useAwardOnce } from '../../core/awardOnce';
import type { Player } from '../../core/roster';
import type { GameFlowProps } from '../registry';
import { MostLikelyEngine } from './engine';
import { game as findGame } from '../catalog';
import { Icon } from '../../ui/Icon';

/**
 * „ვინ არის ყველაზე...“ — სრული ნაკადი.
 *
 * პორტი: `Splash/Games/MostLikely/*.swift` (6 ხედი).
 * SwiftUI-ში ეს ექვსი ფაილი იყო; აქ ერთია — ეტაპები პატარაა და ერთად
 * კითხვადია, ძრავი კი ისედაც ცალკე დგას.
 */

const ROUND_OPTIONS = [5, 10, 15, 20];

export function MostLikelyFlow({ roster, onExit }: GameFlowProps) {
  const [instance] = useState(() => new MostLikelyEngine([...roster.players]));
  const engine = useObservable(instance);

  switch (engine.phase) {
    case 'setup':
      return <Setup engine={engine} onClose={onExit} />;
    case 'prompt':
      return <Prompt engine={engine} onExit={onExit} />;
    case 'voting':
      return <Vote engine={engine} onExit={onExit} />;
    case 'result':
      return <Result engine={engine} onExit={onExit} />;
    case 'summary':
      return <Summary engine={engine} roster={roster} onExit={onExit} />;
  }
}

// ── პარამეტრები

function Setup({ engine, onClose }: { engine: MostLikelyEngine; onClose: () => void }) {
  const [showRules, setShowRules] = useState(false);
  const gameData = findGame('mostlikely');
  return (
    <View style={{ flex: 1 }}>
      <RulesSheet visible={showRules} title="Most Likely" accent={Colors.phosphor} steps={gameData?.howTo ?? []} onClose={() => setShowRules(false)} />

      <View style={Layout.header}>
        <ScreenHeader title="ვინ არის ყველაზე..." subtitle={`${engine.players.length} მოთამაშე`} onBack={onClose}  onInfo={() => setShowRules(true)} />
      </View>

      <ScrollView contentContainerStyle={Layout.scroll}>
        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>რეჟიმი</Text>
            <RadioRow
              title="სწრაფი"
              subtitle="სამამდე ითვლით და ერთდროულად უთითებთ"
              selected={engine.settings.mode === 'quick'}
              onPress={() => engine.setMode('quick')}
            />
            <RadioRow
              title="ფარული"
              subtitle="ტელეფონი წრეზე გადადის, ხმები ბოლოს ჩნდება"
              selected={engine.settings.mode === 'secret'}
              onPress={() => engine.setMode('secret')}
            />
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>რაუნდები</Text>
            <View style={Layout.segmentRow}>
              {ROUND_OPTIONS.map((count) => (
                <CategoryChip
                  compact
                  key={count}
                  label={String(count)}
                  selected={engine.settings.rounds === count}
                  onPress={() => engine.setRounds(count)}
                />
              ))}
            </View>
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>კატეგორია</Text>
            <CategoryPicker
              build={() => keyedEntries(PromptBank, 'prompt', (c) => c.prompts.map((p) => p.text), 'ყველა')}
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

// ── კითხვა

function Prompt({ engine, onExit }: { engine: MostLikelyEngine; onExit: () => void }) {
  return (
    <View style={{ flex: 1, gap: Space.l }}>
      <View style={Layout.topBar}>
        <GameExitButton onExit={onExit} />
        <Text style={[body(14, '700'), { color: Colors.textSecondary, fontVariant: ['tabular-nums'] }]}>
          რაუნდი {engine.round} / {engine.settings.rounds}
        </Text>
        <View style={{ flex: 1 }} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="სხვა კითხვა"
          onPress={() => {
            Haptics.tap();
            engine.skipPrompt();
          }}
          style={styles.pill}
        >
          <Icon name={'shuffle'} size={13} color={Colors.textSecondary} />
          <Text style={[body(13, '700'), { color: Colors.textSecondary }]}>სხვა</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1 }} />

      <View style={Layout.content}>
        <GlassCard padding={28}>
          <Text style={[titleFont(28), Layout.centered, { color: Colors.textPrimary }]} adjustsFontSizeToFit numberOfLines={5}>
            {engine.currentPrompt}
          </Text>
        </GlassCard>
      </View>

      <Text style={[body(14, '500'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
        {engine.isSecret ? 'ფარული რეჟიმი — ტელეფონი წრეზე გადადის' : 'დათვალეთ სამამდე და ერთდროულად მიუთითეთ'}
      </Text>

      <View style={{ flex: 1 }} />

      <View style={Layout.footer}>
        <PrimaryButton
          title={engine.isSecret ? 'კენჭისყრის დაწყება' : 'ვისზე უთითებთ?'}
          icon="hand.point.up.left.fill"
          tint={Colors.phosphor}
          onPress={() => engine.beginVoting()}
        />
      </View>
    </View>
  );
}

// ── კენჭისყრა

function Vote({ engine, onExit }: { engine: MostLikelyEngine; onExit: () => void }) {
  // ფარულ რეჟიმში ყოველ ამომრჩეველს ჯერ „მზად ვარ“ აქვს: სახელების ბადე ადრე
  // იმავე ადგილას რჩებოდა და წინა მოთამაშის მეორე შეხება შემდეგის ხმად ითვლებოდა.
  const [readyFor, setReadyFor] = useState<number | null>(null);
  if (engine.isSecret && readyFor !== engine.voterIndex) {
    return (
      <View style={{ flex: 1, gap: Space.m }}>
        <View style={Layout.topBar}>
          <GameExitButton onExit={onExit} />
          <View style={{ flex: 1 }} />
          <Text style={[body(13, '700'), Layout.digits, { color: Colors.textSecondary }]}>
            {engine.voterIndex + 1} / {engine.players.length}
          </Text>
        </View>
        <View style={{ flex: 1 }} />
        <PlayerCharacter player={engine.currentVoter} />
        <View style={{ gap: 6, paddingHorizontal: 24 }}>
          <Text style={[titleFont(36), Layout.centered, { color: Colors.textPrimary }]} adjustsFontSizeToFit numberOfLines={1}>
            {engine.currentVoter?.name ?? '—'}
          </Text>
          <Text style={[body(15, '500'), Layout.centered, { color: Colors.textSecondary }]}>გადაეცი ტელეფონი</Text>
        </View>
        <View style={{ flex: 1 }} />
        <View style={Layout.footer}>
          <PrimaryButton title="მზად ვარ" icon="checkmark" onPress={() => setReadyFor(engine.voterIndex)} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, gap: Space.m }}>
      <View style={Layout.exitSlot}>
        <GameExitButton onExit={onExit} />
      </View>

      <View style={{ flex: 1 }} />

      {engine.isSecret ? (
        <View style={{ alignItems: 'center', gap: 4 }}>
          <PlayerCharacter player={engine.currentVoter} compact />
          <Text style={[titleFont(30), { color: Colors.neonCyan }]}>{engine.currentVoter?.name ?? '—'}</Text>
          <Text style={[body(13, '700'), { color: Colors.textSecondary, fontVariant: ['tabular-nums'] }]}>
            {engine.voterIndex + 1} / {engine.players.length}
          </Text>
        </View>
      ) : (
        <Text style={[titleFont(28), Layout.centered, { color: Colors.textPrimary }]}>ვისზე უთითებთ?</Text>
      )}

      <Text style={[body(15, '600'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
        {engine.currentPrompt}
      </Text>

      <ScrollView contentContainerStyle={Layout.nameGrid}>
        {engine.players
          .filter((player) => !engine.isSecret || player.id !== engine.currentVoter?.id)
          .map((player) => (
          <Pressable
            key={player.id}
            accessibilityRole="button"
            accessibilityLabel={player.name}
            onPress={() => {
              Haptics.medium();
              if (engine.isSecret) engine.castVote(player);
              else engine.pick(player);
            }}
            style={styles.nameCell}
          >
            <Text style={[body(17, '700'), Layout.centered, { color: Colors.textPrimary }]} numberOfLines={2} adjustsFontSizeToFit>
              {player.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={{ flex: 1 }} />
    </View>
  );
}

// ── რაუნდის შედეგი

function Result({ engine, onExit }: { engine: MostLikelyEngine; onExit: () => void }) {
  useEffect(() => {
    Haptics.success();
  }, []);

  const winners = engine.roundWinners.map((id) => engine.player(id)).filter((p): p is Player => !!p);

  return (
    <View style={{ flex: 1, gap: Space.m }}>
      <View style={Layout.exitSlot}>
        <GameExitButton onExit={onExit} />
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ alignItems: 'center' }}>
        <GlyphIcon name={winners.length > 1 ? 'hands.clap.fill' : 'crown.fill'} size={29} />
      </View>

      <Text style={[titleFont(30), Layout.centered, { color: Colors.phosphor, paddingHorizontal: 24 }]} adjustsFontSizeToFit numberOfLines={3}>
        {winners.map((p) => p.name).join(' და ')}
      </Text>

      <Text style={[body(15, '500'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
        {engine.currentPrompt}
      </Text>

      {engine.isSecret ? (
        <View style={Layout.content}>
          <GlassCard>
            <View style={{ gap: 10 }}>
              {engine.players
                .filter((p) => engine.votesFor(p) > 0)
                .map((player) => {
                  const count = engine.votesFor(player);
                  const fraction = engine.totalVotes > 0 ? count / engine.totalVotes : 0;
                  const won = engine.roundWinners.includes(player.id);
                  return (
                    <View key={player.id} style={{ gap: 5 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[body(14, '600'), { color: Colors.textPrimary, flex: 1 }]}>{player.name}</Text>
                        <Text style={[body(14, '900'), { color: Colors.neonCyan, fontVariant: ['tabular-nums'] }]}>{count}</Text>
                      </View>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            { width: `${Math.max(4, fraction * 100)}%`, backgroundColor: won ? Colors.phosphor : Colors.neonCyan },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
            </View>
          </GlassCard>
        </View>
      ) : null}

      <View style={{ flex: 1 }} />

      <View style={Layout.footer}>
        <PrimaryButton
          title={engine.round >= engine.settings.rounds ? 'შედეგები' : 'შემდეგი კითხვა'}
          icon="chevron.right"
          tint={Colors.phosphor}
          onPress={() => engine.next()}
        />
      </View>
    </View>
  );
}

// ── შეჯამება

function Summary({ engine, roster, onExit }: { engine: MostLikelyEngine; roster: GameFlowProps['roster']; onExit: () => void }) {

  useAwardOnce(() => {
    // ერთნაირი შედეგი — ერთნაირი ჯილდო; ფრეს ანბანი აღარ წყვეტს.
    PodiumAward.apply(engine.results, roster);
    Haptics.success();
  });

  const leaders = engine.leaders;
  const top = leaders[0];

  return (
    <View style={{ flex: 1, gap: 14 }}>
      <View style={{ flex: 1 }} />

      <View style={{ alignItems: 'center' }}>
        <GlyphIcon name="trophy.fill" size={31} tint={Colors.phosphor} />
      </View>

      <Text style={[titleFont(28), Layout.centered, { color: Colors.phosphor }]}>ღამის გმირი</Text>

      {top ? (
        <>
          <Text style={[body(15, '600'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
            {leaders.map((p) => p.name).join(' და ')} — სულ {engine.totalFor(top)} დასახელება
          </Text>
          <Text style={[body(12, '500'), Layout.centered, { color: Colors.textSecondary, opacity: 0.7 }]}>
            საერთო ტაბლოზე პირველ სამს +3 / +2 / +1 ერიცხება
          </Text>
        </>
      ) : null}

      <SummaryAwards
        awards={[
          { title: 'ტელეფონის მაგნიტი', players: leaders, note: 'ყველაზე ხშირად დასახელებული', tint: Colors.phosphor },
          { title: 'რადარის ქვემოთ', players: engine.neverNamed, note: 'ვერავინ დაასახელა ვერც ერთხელ', tint: Colors.neonCyan },
        ]}
      />

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
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: Colors.surface,
  },
  nameCell: {
    width: '47%',
    flexGrow: 1,
    minHeight: 70,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: Radius.small,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: Colors.surfaceHigh, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
});
