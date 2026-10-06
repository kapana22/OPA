import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Space, body, title as titleFont } from '../../theme/theme';
import { CategoryChip, GameExitButton, GlassCard, GlyphIcon, ScreenHeader, RulesSheet, ToggleRow } from '../../ui/Cards';
import { PrimaryButton, GhostButton } from '../../ui/Buttons';
import { Pressable } from '../../ui/Pressable';
import { PassPhoneReveal } from '../../ui/PassPhoneReveal';
import { Confetti } from '../../ui/Confetti';
import { DiscussionPanel } from '../../ui/DiscussionPanel';
import { discussionLabel } from '../../core/settings';
import { Layout } from '../../ui/layout';
import { FitText } from '../../ui/FitText';
import { Haptics } from '../../core/haptics';
import { useObservable } from '../../core/observable';
import { useAwardOnce } from '../../core/awardOnce';
import type { Player } from '../../core/roster';
import type { GameFlowProps } from '../registry';
import { DETECTIVE_MIN_PLAYERS, DOCTOR_MIN_PLAYERS, MAFIA_DISCUSSION_OPTIONS, MafiaEngine, roleIcon, roleTitle, type MafiaRole } from './engine';
import { NARRATION, narrate, useNightMusic, type NarrationKey } from './narration';
import { game as findGame } from '../catalog';
import { Icon } from '../../ui/Icon';

/**
 * „მაფია“ — სრული ნაკადი.
 *
 * პორტი: `Splash/Games/Mafia/*.swift`.
 * **წამყვანი აპია** — ღამით ტელეფონი მაგიდის შუაში დევს და აპი რიგრიგობით
 * აღვიძებს როლებს. ტელეფონი წრეზე მხოლოდ როლების დარიგებისას გადადის.
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
      return <Night key={engine.night} engine={engine} onExit={onExit} />;
    case 'morning':
      return <Morning engine={engine} onExit={onExit} />;
    case 'discussion':
      return <Discussion engine={engine} onExit={onExit} />;
    case 'dayVote':
      return <DayVote engine={engine} onExit={onExit} />;
    case 'dayResult':
      return <DayResult engine={engine} onExit={onExit} />;
    case 'gameOver':
      return <GameOver engine={engine} onExit={onExit} />;
  }
}

// ── პარამეტრები

function Setup({ engine, onClose }: { engine: MafiaEngine; onClose: () => void }) {
  const [showRules, setShowRules] = useState(false);
  const gameData = findGame('mafia');
  return (
    <View style={{ flex: 1 }}>
      <RulesSheet visible={showRules} title="Mafia" accent={Colors.neonCyan} steps={gameData?.howTo ?? []} onClose={() => setShowRules(false)} />

      <View style={Layout.header}>
        <ScreenHeader title="Mafia" subtitle={`${engine.players.length} მოთამაშე`} onBack={onClose}  onInfo={() => setShowRules(true)} />
      </View>

      <ScrollView contentContainerStyle={Layout.scroll}>

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
          <View style={{ gap: 12 }}>
            <ToggleRow
              title="ექიმი"
              subtitle={engine.players.length >= DOCTOR_MIN_PLAYERS ? 'ღამით ერთს გადაარჩენს' : `საჭიროა ${DOCTOR_MIN_PLAYERS} მოთამაშე`}
              value={engine.hasDoctor}
              onChange={(v) => engine.setDoctor(v)}
            />
            <ToggleRow
              title="დეტექტივი"
              subtitle={engine.players.length >= DETECTIVE_MIN_PLAYERS ? 'ღამით ერთს შეამოწმებს' : `საჭიროა ${DETECTIVE_MIN_PLAYERS} მოთამაშე`}
              value={engine.hasDetective}
              onChange={(v) => engine.setDetective(v)}
            />
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>განხილვის დრო</Text>
            <View style={Layout.segmentRow}>
              {MAFIA_DISCUSSION_OPTIONS.map((secs) => (
                <CategoryChip
                  compact
                  key={secs}
                  label={discussionLabel(secs)}
                  selected={engine.settings.discussionSeconds === secs}
                  onPress={() => engine.setDiscussionSeconds(secs)}
                />
              ))}
            </View>
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
  // მაფიამ ერთმანეთი უნდა იცნოს — თორემ ღამით ბრმად ხმობენ და დღით ერთმანეთს აძევებენ.
  const mates = role === 'mafia' ? engine.playersWith('mafia').filter((p) => p.id !== player.id) : [];
  const note = mates.length
    ? `${roleNote[role]}\n\n${mates.length > 1 ? 'შენი თანაგუნდელები' : 'შენი თანაგუნდელი'}: ${mates.map((p) => p.name).join(', ')}`
    : roleNote[role];

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
        note,
        tint: role === 'mafia' ? Colors.neonMagenta : Colors.neonCyan,
      }}
      nextTitle={isLast ? 'ვნახე — ღამე დგება' : 'ვნახე — შემდეგი'}
      onNext={() => engine.advanceReveal()}
      onExit={onExit}
    />
  );
}

// ── ღამე — ტელეფონი შუაში, აპი წამყვანია

/** ძილის ფრაზის შემდეგ პაუზა, სანამ შემდეგი როლი გაიღვიძებს. */
const SLEEP_GAP_MS = 4000;

function Night({ engine, onExit }: { engine: MafiaEngine; onExit: () => void }) {
  const step = engine.nightStep;
  const awake = engine.awake;
  useNightMusic();

  // წამყვანის ხმა: როლი იღვიძებს → „გაიღვიძე“; ქმედების შემდეგ → „დაიძინე“ და პაუზა.
  useEffect(() => {
    if (step === 'dusk' && !awake) return;
    if (step !== 'dusk' && awake) {
      narrate(`${step}Wake` as NarrationKey);
      return;
    }
    narrate(step === 'dusk' ? 'citySleep' : (`${step}Sleep` as NarrationKey));
    const timer = setTimeout(() => engine.nextNightStep(), SLEEP_GAP_MS);
    return () => clearTimeout(timer);
  }, [engine, step, awake, engine.night]);

  const header = (
    <View style={Layout.topBar}>
      <GameExitButton onExit={onExit} />
      <Text style={[body(14, '700'), { color: Colors.textSecondary }]}>ღამე {engine.night}</Text>
      <View style={{ flex: 1 }} />
    </View>
  );

  if (step === 'dusk' && !awake) {
    return (
      <View style={{ flex: 1, gap: 18 }}>
        {header}
        <View style={{ flex: 1 }} />
        <View style={{ alignItems: 'center' }}>
          <GlyphIcon name="moon.stars.fill" size={36} tint={Colors.neonCyan} />
        </View>
        <Text style={[titleFont(30), Layout.centered, { color: Colors.textPrimary }]}>ღამე {engine.night}</Text>
        <Text style={[body(15, '500'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
          ტელეფონი შუაში დადეთ.
        </Text>
        <View style={{ flex: 1 }} />
        <View style={Layout.footer}>
          <PrimaryButton title="ღამის დაწყება" icon="moon.stars.fill" tint={Colors.neonCyan} onPress={() => engine.sleepCity()} />
        </View>
      </View>
    );
  }

  // ძილის პაუზა — ეკრანზე არაფერი, რაც ვინმეს როლს გასცემს.
  if (step === 'dusk' || !awake) {
    const line = step === 'dusk' ? NARRATION.citySleep : NARRATION[`${step}Sleep` as NarrationKey];
    return (
      <View style={{ flex: 1, gap: 18 }}>
        {header}
        <View style={{ flex: 1 }} />
        <View style={{ alignItems: 'center' }}>
          <GlyphIcon name="moon.stars.fill" size={36} tint={Colors.textSecondary} />
        </View>
        <Text style={[titleFont(24), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>{line}</Text>
        <View style={{ flex: 1 }} />
      </View>
    );
  }

  // დეტექტივს შედეგი უკვე აქვს — ჩვენება.
  if (step === 'detective' && engine.checkResult !== null) {
    const isMafia = engine.checkResult === true;
    return (
      <View style={{ flex: 1, gap: Space.m }}>
        {header}
        <View style={{ flex: 1 }} />
        <View style={{ alignItems: 'center' }}>
          <GlyphIcon name={isMafia ? 'scope' : 'person.fill'} size={36} tint={isMafia ? Colors.neonMagenta : Colors.phosphor} />
        </View>
        <FitText style={[titleFont(30), Layout.centered, { color: Colors.textPrimary }]} maxLines={2}>{engine.checked?.name ?? '—'}</FitText>
        <Text style={[titleFont(24), Layout.centered, { color: isMafia ? Colors.neonMagenta : Colors.phosphor }]}>
          {isMafia ? 'მაფიაა!' : 'მაფია არ არის'}
        </Text>
        <View style={{ flex: 1 }} />
        <View style={Layout.footer}>
          <PrimaryButton title="დავიმახსოვრე" icon="checkmark" tint={Colors.neonCyan} onPress={() => engine.detectiveDone()} />
        </View>
      </View>
    );
  }

  const config =
    step === 'mafia'
      ? {
          title: 'მაფია, აირჩიეთ მსხვერპლი',
          subtitle: 'ჩუმად შეთანხმდით და შეეხეთ სახელს.',
          // მაფია ერთმანეთს არ ხოცავს.
          exclude: engine.alive.filter((p) => engine.roleOf(p) === 'mafia').map((p) => p.id),
          onPick: (t: Player) => engine.mafiaChoose(t),
        }
      : step === 'doctor'
        ? {
            title: 'ექიმო, ვის გადაარჩენ?',
            subtitle: 'ერთსა და იმავეს ზედიზედ ორ ღამეს ვერ გადაარჩენ.',
            exclude: engine.doctorExcluded,
            onPick: (t: Player) => engine.doctorSave(t),
          }
        : {
            title: 'დეტექტივო, ვის შეამოწმებ?',
            subtitle: 'გაიგებ, მაფიაა თუ არა.',
            exclude: engine.alive.filter((p) => engine.roleOf(p) === 'detective').map((p) => p.id),
            onPick: (t: Player) => engine.detectiveCheck(t),
          };

  return (
    <View style={{ flex: 1, gap: 14 }}>
      {header}
      <View style={{ flex: 1 }} />
      <Text style={[titleFont(26), Layout.centered, { color: Colors.textPrimary, paddingHorizontal: 24 }]}>{config.title}</Text>
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
              <FitText style={[body(17, '700'), Layout.centered, { color: Colors.textPrimary }]} maxLines={2}>
                {target.name}
              </FitText>
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
  useEffect(() => {
    narrate('cityWake');
  }, []);

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
          <FitText
            style={[titleFont(34), Layout.centered, { color: Colors.neonMagenta, paddingHorizontal: 24 }]}
            maxLines={2}
          >
            {victim.name}
          </FitText>
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

      <View style={{ flex: 1 }} />

      <View style={Layout.footer}>
        <PrimaryButton
          title={engine.winner !== null ? 'შედეგები' : 'განხილვა და კენჭისყრა'}
          icon={engine.winner !== null ? 'flag.checkered' : 'person.3.fill'}
          tint={Colors.neonCyan}
          onPress={() => engine.beginVote()}
        />
      </View>
    </View>
  );
}

// ── დღის განხილვა (მხოლოდ ჩართული ტაიმერით)

function Discussion({ engine, onExit }: { engine: MafiaEngine; onExit: () => void }) {
  return (
    <DiscussionPanel
      title="ვინ არის მაფია?"
      seconds={engine.settings.discussionSeconds}
      tips={['განიხილეთ და ერთად აირჩიეთ.', 'როცა მზად ხართ — გადადით კენჭისყრაზე.']}
      accent={Colors.neonCyan}
      actionTitle="კენჭისყრა"
      onAction={() => engine.endDiscussion()}
      onExit={onExit}
    />
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
              <FitText
                style={[body(17, '700'), Layout.centered, { color: on ? Colors.ink : Colors.textPrimary }]}
                maxLines={2}
              >
                {player.name}
              </FitText>
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
        <GhostButton title="არავის ვაძევებთ" icon="xmark" onPress={() => engine.voteNobody()} />
      </View>
    </View>
  );
}

// ── დღის შედეგი

function DayResult({ engine, onExit }: { engine: MafiaEngine; onExit: () => void }) {
  const votedOut = engine.votedOut;

  useEffect(() => {
    if (votedOut) Haptics.warning();
    // მხოლოდ ეკრანის გამოჩენისას.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const role = votedOut ? engine.roleOf(votedOut) : 'civilian';
  const wasMafia = role === 'mafia';

  return (
    <View style={{ flex: 1, gap: Space.m }}>
      <View style={Layout.exitSlot}>
        <GameExitButton onExit={onExit} />
      </View>

      <View style={{ flex: 1 }} />

      {votedOut ? (
        <>
          <View style={{ alignItems: 'center' }}>
            <GlyphIcon
              name={wasMafia ? 'party.popper.fill' : 'exclamationmark.circle.fill'}
              size={34}
              tint={wasMafia ? Colors.phosphor : Colors.neonMagenta}
            />
          </View>

          <FitText
            style={[titleFont(32), Layout.centered, { color: Colors.textPrimary, paddingHorizontal: 24 }]}
            maxLines={2}
          >
            {votedOut.name}
          </FitText>

          <Text style={[titleFont(22), Layout.centered, { color: wasMafia ? Colors.phosphor : Colors.neonMagenta }]}>
            {roleTitle[role]} იყო
          </Text>

          {wasMafia ? (
            <Text style={[body(15, '500'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
              ქალაქმა ზუსტად მიაგნო.
            </Text>
          ) : null}
        </>
      ) : null}

      <View style={{ flex: 1 }} />

      <View style={Layout.footer}>
        <PrimaryButton
          title={engine.winner !== null ? 'შედეგები' : 'ღამე დგება'}
          icon={engine.winner !== null ? 'flag.checkered' : 'moon.stars.fill'}
          tint={Colors.neonCyan}
          onPress={() => engine.continueGame()}
        />
      </View>
    </View>
  );
}

// ── დასასრული

function GameOver({ engine, onExit }: { engine: MafiaEngine; onExit: () => void }) {
  const cityWon = engine.winner === 'city';

  useAwardOnce(() => {
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

        <ScrollView contentContainerStyle={Layout.content}>
          <GlassCard>
            <View style={{ gap: 10 }}>
              <Text style={[body(13, '700'), { color: Colors.textSecondary }]}>ვინ ვინ იყო</Text>
              {engine.players.map((p) => {
                const role = engine.roleOf(p);
                const out = engine.eliminated.has(p.id);
                return (
                  <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Icon name={roleIcon[role]} size={16} color={Colors.textSecondary} />
                    <Text
                      style={[body(15, '600'), { color: Colors.textPrimary }, out ? Layout.struck : null]}
                      numberOfLines={1}
                    >
                      {p.name}
                    </Text>
                    <View style={{ flex: 1 }} />
                    <Text style={[body(13, '500'), { color: Colors.textSecondary }]}>{roleTitle[role]}</Text>
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

      {engine.winner !== null ? <Confetti /> : null}
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
