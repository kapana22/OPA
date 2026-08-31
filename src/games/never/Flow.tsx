import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Radius, Space, body, caption, title as titleFont } from '../../theme/theme';
import { icon as sf } from '../../theme/icons';
import { CategoryChip, GameExitButton, GlassCard, GlyphIcon, ScreenHeader } from '../../ui/Cards';
import { PrimaryButton, GhostButton } from '../../ui/Buttons';
import { Pressable } from '../../ui/Pressable';
import { Confetti } from '../../ui/Confetti';
import { NeverBank } from '../../content/banks';
import { PodiumAward } from '../../core/podiumAward';
import { Haptics } from '../../core/haptics';
import { Sound } from '../../core/sound';
import { useObservable } from '../../core/observable';
import type { Player } from '../../core/roster';
import type { GameFlowProps } from '../registry';
import { NeverEngine } from './engine';

/**
 * „მე არასდროს...“ — სრული ნაკადი.
 *
 * პორტი: `Splash/Games/Never/*.swift` (4 ხედი).
 */

const LIFE_OPTIONS = [3, 5, 7];
/** დებულებები ამ სიტყვებით იწყება — ბარათზე ცალკე, ფოსფორის ფერად ჩანს. */
const LEAD = 'მე არასდროს';

export function NeverFlow({ roster, onExit }: GameFlowProps) {
  const [engine] = useState(() => new NeverEngine([...roster.players]));
  useObservable(engine);

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

function livesHint(lives: number): string {
  if (lives === 3) return 'სამი — სწრაფი პარტია, პირველი გასვლები მალევე იწყება.';
  if (lives === 5) return 'ხუთი — ოქროს შუალედი დიდი კომპანიისთვის.';
  return 'შვიდი — გრძელი პარტია, ბოლომდე ყველა თამაშობს.';
}

function Setup({ engine, onClose }: { engine: NeverEngine; onClose: () => void }) {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <ScreenHeader title="მე არასდროს" subtitle={`${engine.players.length} მოთამაშე`} onBack={onClose} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <GlassCard>
          <View style={{ gap: 8 }}>
            <Text style={[body(14, '600'), { color: Colors.textPrimary }]}>ეკრანს ყველა ერთად უყურებს.</Text>
            <Text style={[body(13, '500'), { color: Colors.textSecondary }]}>
              ვისაც დებულებაში ნათქვამი გაუკეთებია, პატიოსნად ამბობს — და მის სახელს დააჭერთ თითს. ერთი შეხება ერთ
              სიცოცხლედ უჯდება.
            </Text>
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>სიცოცხლე</Text>
            <View style={styles.chipRow}>
              {LIFE_OPTIONS.map((count) => (
                <CategoryChip
                  key={count}
                  label={String(count)}
                  selected={engine.settings.startingLives === count}
                  onPress={() => engine.setLives(count)}
                />
              ))}
            </View>
            <Text style={[body(12, '500'), { color: Colors.textSecondary }]}>
              {livesHint(engine.settings.startingLives)}
            </Text>
          </View>
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
              {NeverBank.categories.map((cat) => (
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
        <PrimaryButton title="დაწყება" icon="play.fill" tint={Colors.neonCyan} onPress={() => engine.startGame()} />
      </View>
    </View>
  );
}

// ── რაუნდი

function Round({ engine, onExit }: { engine: NeverEngine; onExit: () => void }) {
  const text = engine.currentStatement;
  const tail = text.startsWith(LEAD) ? text.slice(LEAD.length).trim() : text;

  const gone = engine.eliminatedThisRound;
  const dropoutLine =
    gone.length === 0
      ? null
      : gone.length === 1
        ? `${gone[0].name} თამაშიდან გავიდა — სიცოცხლე აღარ დარჩა.`
        : `${gone.map((p) => p.name).join(' და ')} თამაშიდან გავიდნენ — სიცოცხლე აღარ დარჩათ.`;

  return (
    <View style={{ flex: 1, gap: 14 }}>
      <View style={styles.topBar}>
        <GameExitButton onExit={onExit} />
        <Text style={[body(14, '700'), styles.digits, { color: Colors.textSecondary }]}>
          რაუნდი {engine.round} / {engine.totalRounds}
        </Text>
        <View style={{ flex: 1 }} />
        <Text style={[body(14, '700'), styles.digits, { color: Colors.textSecondary }]}>
          თამაშში {engine.alive.length}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="სხვა დებულება"
          onPress={() => {
            Haptics.tap();
            engine.skipStatement();
          }}
          style={styles.pill}
        >
          <MaterialCommunityIcons name={sf('shuffle')} size={13} color={Colors.textSecondary} />
          <Text style={[body(13, '700'), { color: Colors.textSecondary }]}>სხვა</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 14 }}>
        <GlassCard padding={24}>
          <View style={{ gap: 8, alignItems: 'center' }}>
            <Text style={[body(15, '700'), { color: Colors.phosphor }]}>{LEAD}</Text>
            <Text
              style={[titleFont(tail.length > 70 ? 20 : 25), styles.centered, { color: Colors.textPrimary }]}
              adjustsFontSizeToFit
              numberOfLines={5}
            >
              {tail}
            </Text>
          </View>
        </GlassCard>

        <Text style={[body(13, '500'), styles.centered, { color: Colors.textSecondary }]}>
          ვისაც გაუკეთებია — მის სახელს დააჭირე.
        </Text>

        <View style={styles.playerGrid}>
          {engine.players.map((player) => (
            <PlayerChip key={player.id} engine={engine} player={player} />
          ))}
        </View>

        {dropoutLine ? (
          <Text style={[body(13, '600'), styles.centered, { color: Colors.neonMagenta, paddingHorizontal: 24 }]}>
            {dropoutLine}
          </Text>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          title={engine.isFinalRound ? 'შედეგები' : 'შემდეგი'}
          icon="chevron.right"
          tint={Colors.neonCyan}
          onPress={() => engine.next()}
        />
      </View>
    </View>
  );
}

function PlayerChip({ engine, player }: { engine: NeverEngine; player: Player }) {
  const out = engine.isOut(player);
  const marked = engine.isMarked(player);
  const left = engine.livesLeft(player);
  const total = Math.max(1, engine.settings.startingLives);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${player.name}. ${out ? 'გავიდა' : `${left} სიცოცხლე`}`}
      accessibilityState={{ selected: marked, disabled: !engine.canTap(player) }}
      disabled={!engine.canTap(player)}
      onPress={() => engine.toggle(player)}
      style={[
        styles.playerChip,
        {
          backgroundColor: marked ? Colors.neonMagenta + '33' : Colors.surface,
          borderColor: marked ? Colors.neonMagenta : Colors.stroke,
          borderWidth: marked ? 2 : 1,
          opacity: out ? 0.4 : 1,
        },
      ]}
    >
      <Text
        style={[
          body(15, '700'),
          styles.centered,
          { color: out ? Colors.textSecondary : Colors.textPrimary },
          out ? styles.struck : null,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {player.name}
      </Text>

      {left === 0 ? (
        <Text style={[caption(11), { color: Colors.textSecondary }]}>გავიდა</Text>
      ) : total <= 5 ? (
        <View style={{ flexDirection: 'row', gap: 3 }}>
          {Array.from({ length: total }, (_, i) => (
            <MaterialCommunityIcons
              key={i}
              name={i < left ? 'heart' : 'heart-outline'}
              size={12}
              color={i < left ? Colors.neonMagenta : Colors.textSecondary}
            />
          ))}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <MaterialCommunityIcons name="heart" size={12} color={Colors.neonMagenta} />
          <Text style={[body(13, '900'), styles.digits, { color: Colors.textPrimary }]}>{left}</Text>
        </View>
      )}
    </Pressable>
  );
}

// ── შეჯამება

function Summary({
  engine,
  roster,
  onExit,
}: {
  engine: NeverEngine;
  roster: GameFlowProps['roster'];
  onExit: () => void;
}) {
  const [applied, setApplied] = useState(false);
  const winners = engine.winners;

  useEffect(() => {
    if (applied) return;
    setApplied(true);
    Sound.play('win');
    Haptics.win();
    // შიდა სიცოცხლეები ტაბლოზე არ გადადის — მხოლოდ ადგილი ითვლება, რაც
    // დანარჩენ თამაშებთან თანაზომადს ხდის (2-4 ქულა პარტიაზე).
    PodiumAward.apply(engine.results, roster);
  }, [applied, engine, roster]);

  const title = winners.length === 0 ? 'ყველა გავიდა თამაშიდან' : winners.map((p) => p.name).join(' და ');

  const subtitle = (() => {
    if (winners.length === 0) return 'ბოლო რაუნდში სიცოცხლე ერთდროულად ამოგეწურათ.';
    const lives = engine.topLives;
    if (engine.alive.length === 1) return `ბოლო გადარჩენილი — შერჩა ${lives} სიცოცხლე.`;
    return winners.length > 1
      ? `ყველაზე მეტი სიცოცხლე თანაბრად შერჩათ — თითოს ${lives}.`
      : `მაგიდაზე ყველაზე მეტი სიცოცხლე შერჩა — ${lives}.`;
  })();

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, gap: 12 }}>
        <View style={{ flex: 1 }} />

        <View style={{ alignItems: 'center' }}>
          <GlyphIcon
            name={winners.length === 0 ? 'questionmark.circle' : winners.length > 1 ? 'hands.clap.fill' : 'trophy.fill'}
            size={31}
            tint={Colors.phosphor}
          />
        </View>

        <Text
          style={[titleFont(30), styles.centered, { color: Colors.phosphor, paddingHorizontal: 24 }]}
          adjustsFontSizeToFit
          numberOfLines={3}
        >
          {title}
        </Text>

        <Text style={[body(15, '500'), styles.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
          {subtitle}
        </Text>

        <Text
          style={[body(12, '500'), styles.centered, { color: Colors.textSecondary, opacity: 0.7, paddingHorizontal: 32 }]}
        >
          საერთო ტაბლოზე პირველ სამ ადგილს +3 / +2 / +1 ერიცხება
        </Text>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 4, gap: 8 }}>
          {engine.ranking.map((player, rank) => {
            const left = engine.livesLeft(player);
            const isWinner = winners.some((w) => w.id === player.id);
            return (
              <View key={player.id} style={styles.summaryRow}>
                <Text style={[body(16, '900'), { color: Colors.textSecondary, width: 30 }]}>{rank + 1}</Text>
                <Text
                  style={[
                    body(16, '600'),
                    { color: left > 0 ? Colors.textPrimary : Colors.textSecondary, flex: 1 },
                    left === 0 ? styles.struck : null,
                  ]}
                  numberOfLines={1}
                >
                  {player.name}
                </Text>
                {left > 0 ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <MaterialCommunityIcons name="heart" size={14} color={Colors.neonMagenta} />
                    <Text style={[titleFont(20), styles.digits, { color: isWinner ? Colors.phosphor : Colors.textPrimary }]}>
                      {left}
                    </Text>
                  </View>
                ) : (
                  <Text style={[caption(11), { color: Colors.textSecondary }]}>გავიდა</Text>
                )}
              </View>
            );
          })}
        </ScrollView>

        <View style={[styles.footer, { gap: 10 }]}>
          <PrimaryButton
            title="თავიდან"
            icon="arrow.clockwise"
            tint={Colors.neonCyan}
            onPress={() => {
              setApplied(false);
              engine.restart();
            }}
          />
          <GhostButton title="დასრულება" icon="xmark" onPress={onExit} />
        </View>
      </View>

      {winners.length > 0 ? <Confetti /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: Space.m, paddingBottom: 24, gap: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  footer: { paddingHorizontal: 20, paddingBottom: Space.m },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: Space.m },
  centered: { textAlign: 'center' },
  digits: { fontVariant: ['tabular-nums'] },
  struck: { textDecorationLine: 'line-through' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: Colors.surface,
  },
  playerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  playerChip: {
    width: '47%',
    flexGrow: 1,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    borderRadius: Radius.small,
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
