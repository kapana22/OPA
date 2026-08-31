import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Radius, Space, body, display, title as titleFont } from '../../theme/theme';
import { icon as sf } from '../../theme/icons';
import { CategoryChip, GameExitButton, GlassCard, GlyphIcon, RankRow, ScreenHeader } from '../../ui/Cards';
import { PrimaryButton, GhostButton } from '../../ui/Buttons';
import { Pressable } from '../../ui/Pressable';
import { Confetti } from '../../ui/Confetti';
import { PointOneBank } from '../../content/banks';
import { PodiumAward } from '../../core/podiumAward';
import { Haptics } from '../../core/haptics';
import { Sound } from '../../core/sound';
import { useObservable } from '../../core/observable';
import type { Player } from '../../core/roster';
import type { GameFlowProps } from '../registry';
import { PointOneEngine } from './engine';

/**
 * „მიუთითე ერთზე“ — სრული ნაკადი.
 *
 * პორტი: `Splash/Games/PointOne/*.swift` (4 ხედი).
 * სათამაშო ეკრანი ერთია: კითხვა, ათვლა და დასახელება ერთ ადგილას.
 */

const ROUND_OPTIONS = [8, 12, 20];

export function PointOneFlow({ roster, onExit }: GameFlowProps) {
  const [engine] = useState(() => new PointOneEngine([...roster.players]));
  useObservable(engine);

  // ეკრანიდან გასვლისას ათვლა ფონში არ უნდა გაგრძელდეს.
  useEffect(() => () => engine.abandon(), [engine]);

  switch (engine.phase) {
    case 'setup':
      return <Setup engine={engine} onClose={onExit} />;
    case 'round':
      return <Round engine={engine} onExit={onExit} />;
    case 'summary':
      return <Summary engine={engine} roster={roster} onExit={onExit} />;
  }
}

// ── პარამეტრები

function Setup({ engine, onClose }: { engine: PointOneEngine; onClose: () => void }) {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <ScreenHeader title="მიუთითე ერთზე" subtitle={`${engine.players.length} მოთამაშე`} onBack={onClose} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>რაუნდები</Text>
            <View style={styles.chipRow}>
              {ROUND_OPTIONS.map((count) => (
                <CategoryChip
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
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel="სამამდე ათვლა"
            accessibilityState={{ checked: engine.settings.useCountdown }}
            onPress={() => {
              Haptics.tap();
              engine.setCountdown(!engine.settings.useCountdown);
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[body(16, '700'), { color: Colors.textPrimary }]}>სამამდე ათვლა</Text>
              <Text style={[body(12, '500'), { color: Colors.textSecondary }]}>
                სამი ვიბრაცია და ყველა ერთდროულად უთითებს
              </Text>
            </View>
            <MaterialCommunityIcons
              name={engine.settings.useCountdown ? 'check-circle' : 'circle-outline'}
              size={23}
              color={engine.settings.useCountdown ? Colors.neonMagenta : Colors.textSecondary}
            />
          </Pressable>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>კატეგორია</Text>
            <View style={styles.chipRow}>
              <CategoryChip
                label="ყველა"
                selected={engine.settings.categoryID === null}
                onPress={() => engine.setCategory(null)}
              />
              {PointOneBank.categories.map((cat) => (
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

      <View style={styles.footer}>
        <PrimaryButton title="დაწყება" icon="play.fill" tint={Colors.neonMagenta} onPress={() => engine.startGame()} />
      </View>
    </View>
  );
}

// ── რაუნდი

function Round({ engine, onExit }: { engine: PointOneEngine; onExit: () => void }) {
  return (
    <View style={{ flex: 1, gap: Space.m, paddingBottom: Space.m }}>
      <View style={styles.topBar}>
        <GameExitButton onExit={onExit} />
        <Text style={[body(14, '700'), styles.digits, { color: Colors.textSecondary }]}>
          რაუნდი {engine.round} / {engine.settings.rounds}
        </Text>
        <View style={{ flex: 1 }} />
      </View>

      <View style={{ flex: 1 }} />

      {engine.stage === 'countdown' ? (
        <View style={{ alignItems: 'center', gap: 12 }}>
          <Text style={[display(120), styles.digits, { color: Colors.neonMagenta }]}>{engine.countdownValue}</Text>
          <Text style={[body(15, '600'), { color: Colors.textSecondary }]}>მოემზადეთ — ერთდროულად უთითებთ</Text>
        </View>
      ) : (
        <>
          <View style={{ paddingHorizontal: 20 }}>
            <GlassCard>
              <Text style={[titleFont(26), styles.centered, { color: Colors.textPrimary }]}>
                {engine.currentQuestion}
              </Text>
            </GlassCard>
          </View>

          {engine.stage === 'ready' ? (
            <>
              <View style={{ paddingHorizontal: 24 }}>
                <PrimaryButton
                  title="მზად ხართ"
                  icon="hand.point.up.left.fill"
                  tint={Colors.neonMagenta}
                  onPress={() => engine.begin()}
                />
              </View>
              <View style={{ paddingHorizontal: 24 }}>
                <GhostButton title="სხვა კითხვა" icon="shuffle" onPress={() => engine.swapQuestion()} />
              </View>
            </>
          ) : (
            <>
              <Text style={[body(13, '500'), styles.centered, { color: Colors.textSecondary }]}>
                ვისზეც ყველაზე მეტმა მიუთითა — შეეხე
              </Text>

              <View style={styles.playerGrid}>
                {engine.players.map((player) => (
                  <PlayerChip key={player.id} engine={engine} player={player} />
                ))}
              </View>

              <View style={{ paddingHorizontal: 24 }}>
                <PrimaryButton
                  title={engine.isLastRound ? 'შედეგები' : 'შემდეგი'}
                  icon={engine.isLastRound ? 'flag.checkered' : 'chevron.right'}
                  tint={Colors.neonMagenta}
                  enabled={engine.picked.size > 0}
                  onPress={() => engine.next()}
                />
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  Haptics.tap();
                  engine.skipRound();
                }}
                style={{ alignItems: 'center' }}
              >
                <Text style={[body(14, '600'), { color: Colors.textSecondary }]}>ვერ შევთანხმდით</Text>
              </Pressable>
            </>
          )}
        </>
      )}

      <View style={{ flex: 1 }} />

      {/* მიმდინარე ტაბლო — რაუნდიდან გასვლის გარეშე ჩანს, ვინ იგებს. */}
      {engine.stage !== 'countdown' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.standings}>
          {engine.ranking.slice(0, 4).map((player) => (
            <View key={player.id} style={styles.standingChip}>
              <Text style={[body(12, '600'), { color: Colors.textSecondary }]}>{player.name}</Text>
              <Text style={[body(12, '900'), styles.digits, { color: Colors.neonMagenta }]}>
                {engine.totalFor(player)}
              </Text>
            </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

function PlayerChip({ engine, player }: { engine: PointOneEngine; player: Player }) {
  const on = engine.named(player);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${player.name}. ${engine.totalFor(player)} ქულა`}
      accessibilityState={{ selected: on }}
      onPress={() => engine.toggle(player)}
      style={[
        styles.playerChip,
        { backgroundColor: on ? Colors.neonMagenta : Colors.surface, borderColor: on ? 'transparent' : Colors.stroke },
      ]}
    >
      <Text
        style={[body(15, '700'), styles.centered, { color: on ? Colors.ink : Colors.textPrimary }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {player.name}
      </Text>
      <Text style={[body(11, '900'), styles.digits, { color: on ? Colors.ink : Colors.textSecondary, opacity: on ? 0.7 : 1 }]}>
        {engine.totalFor(player)}
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
  engine: PointOneEngine;
  roster: GameFlowProps['roster'];
  onExit: () => void;
}) {
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (applied) return;
    setApplied(true);
    Sound.play('win');
    Haptics.win();
    // ერთნაირი შედეგი — ერთნაირი ჯილდო; ფრეს ანბანი აღარ წყვეტს.
    PodiumAward.apply(engine.results, roster);
  }, [applied, engine, roster]);

  const top = engine.ranking[0];
  const champion = top && engine.totalFor(top) > 0 ? top : null;

  const stars = engine.starsOfTheNight;
  const starsLine =
    stars.length === 0
      ? null
      : stars.length === 1
        ? `${stars[0].name} — ყველაზე ხშირად დასახელებული`
        : `${stars.map((p) => p.name).join(', ')} — თანაბრად ხშირად დაასახელეს`;

  const quiet = engine.neverNamed;
  const quietLine =
    quiet.length === 0 || quiet.length >= engine.players.length
      ? null
      : `${quiet.map((p) => p.name).join(', ')} — მთელ პარტიაში არავინ დაასახელა`;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, gap: 14 }}>
        <View style={{ flex: 1 }} />

        <View style={{ alignItems: 'center' }}>
          <GlyphIcon name="hand.point.right.fill" size={31} tint={Colors.neonMagenta} />
        </View>

        <Text style={[titleFont(28), styles.centered, { color: Colors.neonMagenta }]}>
          {champion === null ? 'ქულა ვერავინ აიღო' : 'ღამის ვარსკვლავი'}
        </Text>

        {starsLine ? (
          <Text style={[body(15, '600'), styles.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
            {starsLine}
          </Text>
        ) : null}

        {quietLine ? (
          <Text
            style={[body(13, '500'), styles.centered, { color: Colors.textSecondary, opacity: 0.85, paddingHorizontal: 32 }]}
          >
            {quietLine}
          </Text>
        ) : null}

        <Text style={[body(12, '500'), styles.centered, { color: Colors.textSecondary, opacity: 0.7 }]}>
          საერთო ტაბლოზე პირველ სამს +3 / +2 / +1 ერიცხება
        </Text>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}>
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

        <View style={[styles.footer, { gap: 10, paddingHorizontal: 24 }]}>
          <PrimaryButton
            title="თავიდან"
            icon="arrow.clockwise"
            tint={Colors.neonMagenta}
            onPress={() => {
              setApplied(false);
              engine.restart();
            }}
          />
          <GhostButton title="დასრულება" icon="xmark" onPress={onExit} />
        </View>
      </View>

      {champion !== null ? <Confetti /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: Space.m, paddingBottom: 24, gap: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  footer: { paddingHorizontal: 20, paddingBottom: Space.m },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 12 },
  centered: { textAlign: 'center' },
  digits: { fontVariant: ['tabular-nums'] },
  playerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20 },
  playerChip: {
    width: '30%',
    flexGrow: 1,
    minWidth: 100,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 13,
    paddingHorizontal: 6,
    borderRadius: Radius.small,
    borderWidth: 1,
  },
  standings: { gap: 8, paddingHorizontal: 20 },
  standingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.surface,
  },
});
