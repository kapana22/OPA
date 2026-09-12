import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Radius, Space, body, title as titleFont } from '../../theme/theme';
import { icon as sf } from '../../theme/icons';
import { CategoryChip, Divider, GameExitButton, GlassCard, GlyphIcon, ScreenHeader, ToggleRow } from '../../ui/Cards';
import { PrimaryButton, GhostButton } from '../../ui/Buttons';
import { Pressable } from '../../ui/Pressable';
import { PassPhoneReveal } from '../../ui/PassPhoneReveal';
import { Confetti } from '../../ui/Confetti';
import { Layout } from '../../ui/layout';
import { Haptics } from '../../core/haptics';
import { useObservable } from '../../core/observable';
import { useAwardOnce } from '../../core/awardOnce';
import type { Player } from '../../core/roster';
import type { GameFlowProps } from '../registry';
import { MafiaEngine, roleIcon, roleTitle, type MafiaRole } from './engine';

/**
 * „მაფია“ — სრული ნაკადი.
 *
 * პორტი: `Splash/Games/Mafia/*.swift` (7 ხედი).
 * **წამყვანი არ სჭირდება** — ღამით ტელეფონი წრეზე გადადის და თითოეული
 * თავის ეკრანს ხედავს.
 */

const roleNote: Record<MafiaRole, string> = {
  civilian: 'ღამით გძინავს. დღისით იპოვე მაფია.',
  mafia: 'ღამით ირჩევ მსხვერპლს.\nდღისით — მოქალაქეს თამაშობ.',
  doctor: 'ღამით ერთ ადამიანს არჩენ.\nშეიძლება საკუთარ თავსაც.',
  detective: 'ღამით ერთს ამოწმებ და გაიგებ,\nმაფიაა თუ არა.',
};

export function MafiaFlow({ roster, onExit }: GameFlowProps) {
  const [engine] = useState(() => new MafiaEngine([...roster.players]));
  useObservable(engine);

  switch (engine.phase) {
    case 'setup':
      return <Setup engine={engine} onClose={onExit} />;
    case 'reveal':
      return <Reveal engine={engine} onExit={onExit} />;
    case 'night':
      return <Night key={engine.nightIndex} engine={engine} onExit={onExit} />;
    case 'morning':
      return <Morning engine={engine} onExit={onExit} />;
    case 'dayVote':
      return <DayVote engine={engine} onExit={onExit} />;
    case 'dayResult':
      return <DayResult engine={engine} onExit={onExit} />;
    case 'gameOver':
      return <GameOver engine={engine} roster={roster} onExit={onExit} />;
  }
}

// ── პარამეტრები

function Setup({ engine, onClose }: { engine: MafiaEngine; onClose: () => void }) {
  return (
    <View style={{ flex: 1 }}>
      <View style={Layout.header}>
        <ScreenHeader title="Mafia" subtitle={`${engine.players.length} მოთამაშე`} onBack={onClose} />
      </View>

      <ScrollView contentContainerStyle={Layout.scroll}>
        <GlassCard>
          <Text style={[body(14, '500'), { color: Colors.textSecondary }]}>
            წამყვანი არ სჭირდება — ღამით ტელეფონი ყველას გადაეცემა რიგრიგობით და თითოეული თავის ეკრანს ხედავს.
          </Text>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <View style={{ gap: 3 }}>
              <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>მაფია</Text>
              <Text style={[body(13, '500'), { color: Colors.textSecondary }]}>მაქსიმუმ {engine.maxMafia}</Text>
            </View>
            <View style={Layout.segmentRow}>
              {Array.from({ length: engine.maxMafia }, (_, i) => i + 1).map((n) => (
                <CategoryChip
                  compact
                  key={n}
                  label={String(n)}
                  selected={engine.settings.mafiaCount === n}
                  onPress={() => engine.setMafiaCount(n)}
                />
              ))}
            </View>
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 14 }}>
            <ToggleRow
              title="ექიმი"
              subtitle="ღამით ერთ ადამიანს არჩენს"
              value={engine.settings.includeDoctor}
              onChange={(v) => engine.setDoctor(v)}
            />
            <Divider />
            <ToggleRow
              title="დეტექტივი"
              subtitle="ღამით ერთ ადამიანს ამოწმებს"
              value={engine.settings.includeDetective}
              onChange={(v) => engine.setDetective(v)}
            />
          </View>
        </GlassCard>
      </ScrollView>

      <View style={Layout.footer}>
        <PrimaryButton
          title="როლების დარიგება"
          icon="play.fill"
          tint={Colors.neonCyan}
          onPress={() => engine.startGame()}
        />
      </View>
    </View>
  );
}

// ── როლების დარიგება

function Reveal({ engine, onExit }: { engine: MafiaEngine; onExit: () => void }) {
  const player = engine.currentRevealPlayer;
  if (!player) return null;

  const role = engine.roleOf(player);
  const isLast = engine.revealIndex + 1 >= engine.players.length;

  return (
    <PassPhoneReveal
      confirmFirst
      key={engine.revealIndex}
      playerName={player.name}
      index={engine.revealIndex}
      total={engine.players.length}
      headerLeft="როლების დარიგება"
      card={{
        word: roleTitle[role],
        hint: null,
        note: roleNote[role],
        tint: role === 'mafia' ? Colors.neonMagenta : Colors.neonCyan,
      }}
      nextTitle={isLast ? 'ვნახე — ღამე დგება' : 'ვნახე — შემდეგი'}
      onNext={() => engine.advanceReveal()}
      onExit={onExit}
    />
  );
}

// ── ღამე

function Night({ engine, onExit }: { engine: MafiaEngine; onExit: () => void }) {
  // ახალი მოთამაშე = ახალი კომპონენტი (`key={nightIndex}`) — ტელეფონი ისევ
  // უნდა გადაეცეს, წინა როლი კი ერთი კადრითაც არ უნდა გამოჩნდეს.
  const [ready, setReady] = useState(false);
  const player = engine.currentNightPlayer;
  const role = player ? engine.roleOf(player) : 'civilian';

  const header = (
    <View style={Layout.topBar}>
      <GameExitButton onExit={onExit} />
      <Text style={[body(14, '700'), { color: Colors.textSecondary }]}>ღამე {engine.night}</Text>
      <View style={{ flex: 1 }} />
      <Text style={[body(14, '700'), Layout.digits, { color: Colors.textSecondary }]}>
        {engine.nightIndex + 1} / {engine.alive.length}
      </Text>
    </View>
  );

  if (!ready) {
    return (
      <View style={{ flex: 1, gap: 18 }}>
        {header}
        <View style={{ flex: 1 }} />
        <View style={{ alignItems: 'center' }}>
          <GlyphIcon name="moon.stars.fill" size={32} tint={Colors.neonCyan} />
        </View>
        <Text style={[body(16, '500'), Layout.centered, { color: Colors.textSecondary }]}>გადაეცი ტელეფონი</Text>
        <Text
          style={[titleFont(34), Layout.centered, { color: Colors.textPrimary, paddingHorizontal: 24 }]}
          adjustsFontSizeToFit
          numberOfLines={2}
        >
          {player?.name ?? '—'}
        </Text>
        <Text style={[body(13, '500'), Layout.centered, { color: Colors.textSecondary }]}>
          დანარჩენებო, თვალები დახუჭეთ
        </Text>
        <View style={{ flex: 1 }} />
        <View style={Layout.footer}>
          <PrimaryButton
            title="მე ვარ — გავაგრძელოთ"
            icon="chevron.right"
            tint={Colors.neonCyan}
            onPress={() => setReady(true)}
          />
        </View>
      </View>
    );
  }

  // მოქალაქეს ღამით ქმედება არ აქვს — ტელეფონი მაინც გადადის, რომ როლი არ გაიცეს.
  if (role === 'civilian') {
    return (
      <View style={{ flex: 1, gap: Space.m }}>
        {header}
        <View style={{ flex: 1 }} />
        <View style={{ alignItems: 'center' }}>
          <GlyphIcon name="zzz" size={37} tint={Colors.textSecondary} />
        </View>
        <Text style={[titleFont(30), Layout.centered, { color: Colors.textPrimary }]}>შენ გძინავს</Text>
        <Text style={[body(14, '500'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 40 }]}>
          არაფერი გჭირდება — უბრალოდ გადაეცი შემდეგს.
        </Text>
        <View style={{ flex: 1 }} />
        <View style={Layout.footer}>
          <PrimaryButton title="გადავეცი" icon="chevron.right" tint={Colors.neonCyan} onPress={() => engine.skipNightTurn()} />
        </View>
      </View>
    );
  }

  // დეტექტივს შედეგი უკვე აქვს — ჩვენება.
  if (role === 'detective' && engine.checkResult !== null) {
    const isMafia = engine.checkResult === true;
    return (
      <View style={{ flex: 1, gap: Space.m }}>
        {header}
        <View style={{ flex: 1 }} />
        <View style={{ alignItems: 'center' }}>
          <GlyphIcon
            name={isMafia ? 'scope' : 'person.fill'}
            size={36}
            tint={isMafia ? Colors.neonMagenta : Colors.phosphor}
          />
        </View>
        <Text style={[titleFont(30), Layout.centered, { color: Colors.textPrimary }]}>{engine.checked?.name ?? '—'}</Text>
        <Text style={[titleFont(24), Layout.centered, { color: isMafia ? Colors.neonMagenta : Colors.phosphor }]}>
          {isMafia ? 'მაფიაა!' : 'მაფია არ არის'}
        </Text>
        <Text style={[body(13, '500'), Layout.centered, { color: Colors.textSecondary }]}>
          დაიმახსოვრე — ჩაწერა არსად ხდება.
        </Text>
        <View style={{ flex: 1 }} />
        <View style={Layout.footer}>
          <PrimaryButton title="დავიმახსოვრე" icon="checkmark" tint={Colors.neonCyan} onPress={() => engine.detectiveDone()} />
        </View>
      </View>
    );
  }

  const config =
    role === 'mafia'
      ? {
          title: 'აირჩიე მსხვერპლი',
          subtitle: 'ღამით ის დაიღუპება, თუ ექიმი არ გადაარჩენს',
          // მაფია ერთმანეთს არ ხოცავს — ორი მაფიის შემთხვევაში ბრმად რომ არ ხმობდნენ.
          exclude: engine.alive.filter((p) => engine.roleOf(p) === 'mafia').map((p) => p.id),
          onPick: (t: Player) => engine.mafiaChoose(t),
        }
      : role === 'doctor'
        ? {
            title: 'ვინ გადაარჩინო?',
            subtitle: 'შეგიძლია საკუთარი თავიც აირჩიო',
            exclude: [] as string[],
            onPick: (t: Player) => engine.doctorSave(t),
          }
        : {
            title: 'ვინ შეამოწმო?',
            subtitle: 'გაიგებ, მაფიაა თუ არა',
            exclude: player ? [player.id] : [],
            onPick: (t: Player) => engine.detectiveCheck(t),
          };

  return (
    <View style={{ flex: 1, gap: 14 }}>
      {header}
      <View style={{ flex: 1 }} />
      <Text style={[titleFont(26), Layout.centered, { color: Colors.textPrimary }]}>{config.title}</Text>
      <Text style={[body(14, '500'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
        {config.subtitle}
      </Text>

      <ScrollView contentContainerStyle={Layout.nameGrid}>
        {engine.alive
          .filter((p) => !config.exclude.includes(p.id))
          .map((target) => (
            <Pressable
              key={target.id}
              accessibilityRole="button"
              accessibilityLabel={target.name}
              onPress={() => {
                Haptics.medium();
                config.onPick(target);
              }}
              style={[styles.nameCell, { borderColor: Colors.neonCyan + '80' }]}
            >
              <Text style={[body(17, '700'), Layout.centered, { color: Colors.textPrimary }]} numberOfLines={2} adjustsFontSizeToFit>
                {target.name}
              </Text>
            </Pressable>
          ))}
      </ScrollView>

      <View style={{ flex: 1 }} />
    </View>
  );
}

// ── დილა

function Morning({ engine, onExit }: { engine: MafiaEngine; onExit: () => void }) {
  const victim = engine.killed;

  return (
    <View style={{ flex: 1, gap: Space.m }}>
      <View style={Layout.exitSlot}>
        <GameExitButton onExit={onExit} />
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ alignItems: 'center' }}>
        <GlyphIcon
          name={victim === null ? 'sunrise.fill' : 'flame.fill'}
          size={34}
          tint={victim === null ? Colors.phosphor : Colors.neonMagenta}
        />
      </View>

      {victim ? (
        <>
          <Text style={[body(15, '500'), Layout.centered, { color: Colors.textSecondary }]}>ღამით დაიღუპა</Text>
          <Text
            style={[titleFont(34), Layout.centered, { color: Colors.neonMagenta, paddingHorizontal: 24 }]}
            adjustsFontSizeToFit
            numberOfLines={2}
          >
            {victim.name}
          </Text>
          <Text style={[body(15, '600'), Layout.centered, { color: Colors.textSecondary }]}>
            მისი როლი: {roleTitle[engine.roleOf(victim)]}
          </Text>
        </>
      ) : (
        <>
          <Text style={[titleFont(28), Layout.centered, { color: Colors.phosphor }]}>ღამე მშვიდად ჩაიარა</Text>
          <Text style={[body(15, '500'), Layout.centered, { color: Colors.textSecondary }]}>ამ ღამეს ყველა გადარჩა.</Text>
        </>
      )}

      <View style={Layout.content}>
        <GlassCard>
          <View style={{ gap: 6 }}>
            <Text style={[body(13, '700'), { color: Colors.textSecondary }]}>ცოცხლები — {engine.alive.length}</Text>
            <Text style={[body(15, '600'), { color: Colors.textPrimary }]}>
              {engine.alive.map((p) => p.name).join(', ')}
            </Text>
          </View>
        </GlassCard>
      </View>

      <View style={{ flex: 1 }} />

      <View style={Layout.footer}>
        <PrimaryButton
          title="განხილვა და კენჭისყრა"
          icon="person.3.fill"
          tint={Colors.neonCyan}
          onPress={() => engine.beginVote()}
        />
      </View>
    </View>
  );
}

// ── დღის კენჭისყრა

function DayVote({ engine, onExit }: { engine: MafiaEngine; onExit: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <View style={{ flex: 1, gap: Space.m }}>
      <View style={Layout.exitSlot}>
        <GameExitButton onExit={onExit} />
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ alignItems: 'center', gap: 6 }}>
        <Text style={[titleFont(28), { color: Colors.textPrimary }]}>ვინ არის მაფია?</Text>
        <Text style={[body(14, '500'), { color: Colors.textSecondary }]}>განიხილეთ და ერთად აირჩიეთ</Text>
      </View>

      <ScrollView contentContainerStyle={Layout.nameGrid}>
        {engine.alive.map((player) => {
          const on = selected === player.id;
          return (
            <Pressable
              key={player.id}
              accessibilityRole="button"
              accessibilityLabel={player.name}
              accessibilityState={{ selected: on }}
              onPress={() => {
                Haptics.tap();
                setSelected(player.id);
              }}
              style={[
                styles.nameCell,
                { backgroundColor: on ? Colors.neonCyan : Colors.surface, borderColor: on ? 'transparent' : Colors.stroke },
              ]}
            >
              <Text
                style={[body(17, '700'), Layout.centered, { color: on ? Colors.ink : Colors.textPrimary }]}
                numberOfLines={2}
                adjustsFontSizeToFit
              >
                {player.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ flex: 1 }} />

      <View style={Layout.footer}>
        <PrimaryButton
          title="ქალაქიდან გაძევება"
          icon="person.fill.xmark"
          tint={Colors.neonCyan}
          enabled={selected !== null}
          onPress={() => {
            const player = engine.alive.find((p) => p.id === selected);
            if (player) engine.voteOut(player);
          }}
        />
      </View>
    </View>
  );
}

// ── დღის შედეგი

function DayResult({ engine, onExit }: { engine: MafiaEngine; onExit: () => void }) {
  useEffect(() => {
    Haptics.warning();
  }, []);

  const votedOut = engine.votedOut;
  const role = votedOut ? engine.roleOf(votedOut) : 'civilian';
  const wasMafia = role === 'mafia';

  return (
    <View style={{ flex: 1, gap: Space.m }}>
      <View style={Layout.exitSlot}>
        <GameExitButton onExit={onExit} />
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ alignItems: 'center' }}>
        <GlyphIcon
          name={wasMafia ? 'party.popper.fill' : 'exclamationmark.circle.fill'}
          size={34}
          tint={wasMafia ? Colors.phosphor : Colors.neonMagenta}
        />
      </View>

      <Text
        style={[titleFont(32), Layout.centered, { color: Colors.textPrimary, paddingHorizontal: 24 }]}
        adjustsFontSizeToFit
        numberOfLines={2}
      >
        {votedOut?.name ?? '—'}
      </Text>

      <Text style={[titleFont(22), Layout.centered, { color: wasMafia ? Colors.phosphor : Colors.neonMagenta }]}>
        {roleTitle[role]} იყო
      </Text>

      <Text style={[body(15, '500'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
        {wasMafia ? 'ქალაქმა ზუსტად მიაგნო.' : 'უდანაშაულო გააძევეს — მაფია ხარობს.'}
      </Text>

      <View style={{ flex: 1 }} />

      <View style={Layout.footer}>
        <PrimaryButton title="ღამე დგება" icon="moon.stars.fill" tint={Colors.neonCyan} onPress={() => engine.continueGame()} />
      </View>
    </View>
  );
}

// ── დასასრული

function GameOver({
  engine,
  roster,
  onExit,
}: {
  engine: MafiaEngine;
  roster: GameFlowProps['roster'];
  onExit: () => void;
}) {
  const cityWon = engine.winner === 'city';

  useAwardOnce(() => {
    for (const [id, points] of Object.entries(engine.finalPoints)) roster.addScore(points, id);
    Haptics.win();
  });

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, gap: 14 }}>
        <View style={{ flex: 1 }} />

        <View style={{ alignItems: 'center' }}>
          <GlyphIcon
            name={cityWon ? 'party.popper.fill' : 'scope'}
            size={33}
            tint={cityWon ? Colors.phosphor : Colors.neonMagenta}
          />
        </View>

        <Text
          style={[titleFont(28), Layout.centered, { color: cityWon ? Colors.phosphor : Colors.neonMagenta, paddingHorizontal: 24 }]}
        >
          {cityWon ? 'ქალაქმა გაიმარჯვა!' : 'მაფიამ გაიმარჯვა!'}
        </Text>

        <Text style={[body(15, '500'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
          {cityWon
            ? 'ყველა მაფია გაძევდა — ქალაქს ახლა მშვიდად სძინავს.'
            : 'მაფია რაოდენობით გაუტოლდა ქალაქს.'}
        </Text>

        <ScrollView contentContainerStyle={Layout.content}>
          <GlassCard>
            <View style={{ gap: 10 }}>
              <Text style={[body(13, '700'), { color: Colors.textSecondary }]}>ვინ ვინ იყო</Text>
              {engine.players.map((p) => {
                const role = engine.roleOf(p);
                const points = engine.finalPoints[p.id] ?? 0;
                const out = engine.eliminated.has(p.id);
                return (
                  <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <MaterialCommunityIcons name={sf(roleIcon[role])} size={16} color={Colors.textSecondary} />
                    <Text
                      style={[body(15, '600'), { color: Colors.textPrimary }, out ? Layout.struck : null]}
                      numberOfLines={1}
                    >
                      {p.name}
                    </Text>
                    <View style={{ flex: 1 }} />
                    <Text style={[body(13, '500'), { color: Colors.textSecondary }]}>{roleTitle[role]}</Text>
                    {points > 0 ? (
                      <Text style={[body(14, '900'), Layout.digits, { color: Colors.phosphor }]}>+{points}</Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </GlassCard>
        </ScrollView>

        <View style={Layout.footer}>
          <PrimaryButton
            title="ახალი პარტია"
            icon="arrow.clockwise"
            tint={Colors.neonCyan}
            onPress={() => {
              engine.restart();
            }}
          />
          <GhostButton title="დასრულება" icon="xmark" onPress={onExit} />
        </View>
      </View>

      {cityWon ? <Confetti /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
  },
});
