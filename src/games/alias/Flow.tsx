import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Radius, Space, body, caption, display, title as titleFont } from '../../theme/theme';
import { icon as sf } from '../../theme/icons';
import { CategoryChip, GameExitButton, GlassCard, GlyphIcon, ScreenHeader, ToggleRow, CategoryPicker , RulesSheet } from '../../ui/Cards';
import { wordEntries } from '../categoryEntries';
import { PrimaryButton, GhostButton } from '../../ui/Buttons';
import { Pressable } from '../../ui/Pressable';
import { Confetti } from '../../ui/Confetti';
import { useDialog } from '../../ui/Dialog';
import { Layout } from '../../ui/layout';
import { useKeepScreenAwake } from '../../core/orientationLock';
import { CharadesBank } from '../../content/banks';
import { Haptics } from '../../core/haptics';
import { useObservable } from '../../core/observable';
import { useAwardOnce } from '../../core/awardOnce';
import type { GameFlowProps } from '../registry';
import { AliasEngine, type AliasEntry, type AliasTeam } from './engine';
import { game as findGame } from '../catalog';

/**
 * „ალიასი“ — სრული ნაკადი.
 *
 * პორტი: `Splash/Games/Alias/*.swift` (6 ხედი).
 * პარტია **მთელი წრის ბოლოს** მთავრდება — თუ ზღვარს ორმა ერთდროულად მიაღწია,
 * ემატება დამატებითი წრე.
 */

const TIME_OPTIONS = [30, 60, 90];
const TARGET_OPTIONS = [30, 50, 70];
const TEAM_COLORS = [Colors.neonCyan, Colors.neonMagenta, Colors.phosphor, Colors.neonCyan];

const teamColor = (index: number) => TEAM_COLORS[((index % TEAM_COLORS.length) + TEAM_COLORS.length) % TEAM_COLORS.length];
const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

export function AliasFlow({ roster, onExit }: GameFlowProps) {
  const [engine] = useState(() => new AliasEngine([...roster.players]));
  useObservable(engine);

  useEffect(() => () => engine.releaseScreen(), [engine]);

  switch (engine.phase) {
    case 'setup':
      return <Setup engine={engine} onClose={onExit} />;
    case 'teams':
      return <Teams engine={engine} />;
    case 'turnIntro':
      return <TurnIntro engine={engine} onExit={onExit} />;
    case 'countdown':
      return <Countdown engine={engine} onExit={onExit} />;
    case 'playing':
      return <Play engine={engine} onExit={onExit} />;
    case 'turnResult':
      return <TurnResult engine={engine} onExit={onExit} />;
    case 'winner':
      return <Winner engine={engine} roster={roster} onExit={onExit} />;
  }
}

// ── პარამეტრები

function Setup({ engine, onClose }: { engine: AliasEngine; onClose: () => void }) {
  const [showRules, setShowRules] = useState(false);
  const gameData = findGame('alias');
  if (!engine.canPlay) {
    return (
      <View style={{ flex: 1 }}>
      <RulesSheet visible={showRules} title="Alias" accent={Colors.neonCyan} steps={gameData?.howTo ?? []} onClose={() => setShowRules(false)} />

        <View style={Layout.header}>
          <ScreenHeader title="Alias" subtitle={`${engine.players.length} მოთამაშე`} onBack={onClose}  onInfo={() => setShowRules(true)} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: Space.m }}>
          <GlyphIcon name="person.2.fill" size={32} tint={Colors.phosphor} />
          <Text style={[titleFont(24), Layout.centered, { color: Colors.textPrimary }]}>ალიასი გუნდური თამაშია</Text>
          <Text style={[body(15, '500'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
            {engine.players.length === 0
              ? 'სია ჯერ ცარიელია. დაამატე მინიმუმ ოთხი მოთამაშე — თითო გუნდში ორი მაინც უნდა იყოს.'
              : `ახლა ${engine.players.length} ხართ. საჭიროა ოთხი მაინც, რომ ორი გუნდი შედგეს.`}
          </Text>
        </View>
        <View style={Layout.footer}>
          <GhostButton title="უკან" icon="chevron.left" onPress={onClose} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <RulesSheet visible={showRules} title="Alias" accent={Colors.neonCyan} steps={gameData?.howTo ?? []} onClose={() => setShowRules(false)} />
      <View style={Layout.header}>
        <ScreenHeader title="Alias" subtitle={`${engine.players.length} მოთამაშე`} onBack={onClose}  onInfo={() => setShowRules(true)} />
      </View>

      <ScrollView contentContainerStyle={Layout.scroll}>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>გუნდები</Text>
            <View style={Layout.segmentRow}>
              {[2, 3, 4].map((count) => (
                <View key={count} style={{ flex: 1, opacity: count <= engine.maxTeams ? 1 : 0.35 }}>
                  <CategoryChip
                    compact
                    label={`${count} გუნდი`}
                    selected={engine.normalizedTeamCount === count}
                    onPress={() => {
                      if (count <= engine.maxTeams) engine.setTeamCount(count);
                    }}
                  />
                </View>
              ))}
            </View>
            {engine.maxTeams < 4 ? (
              <Text style={[body(12, '500'), { color: Colors.textSecondary }]}>
                მეტი გუნდისთვის მეტი მოთამაშეა საჭირო — თითოში ორი მაინც.
              </Text>
            ) : null}
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>რაუნდის ხანგრძლივობა</Text>
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
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>ქულების ლიმიტი</Text>
            <View style={Layout.segmentRow}>
              {TARGET_OPTIONS.map((value) => (
                <CategoryChip
                  compact
                  key={value}
                  label={String(value)}
                  selected={engine.settings.target === value}
                  onPress={() => engine.setTarget(value)}
                />
              ))}
            </View>
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>კატეგორია</Text>
            <CategoryPicker
              build={() => wordEntries(CharadesBank, 'ყველა', 'word.charades-all')}
              selectedID={engine.settings.categoryID}
              onSelect={(id) => engine.setCategory(id)}
            />
          </View>
        </GlassCard>

        <GlassCard>
          <ToggleRow
            title="ჯარიმა გამოტოვებაზე"
            subtitle="ყოველი გამოტოვებული სიტყვა −1 ქულა"
            value={engine.settings.penalizeSkip}
            onChange={(v) => engine.setPenalizeSkip(v)}
          />
        </GlassCard>
      </ScrollView>

      <View style={Layout.footer}>
        <PrimaryButton
          title="გუნდების შედგენა"
          icon="person.2.fill"
          tint={Colors.neonCyan}
          onPress={() => engine.goToTeams()}
        />
      </View>
    </View>
  );
}

// ── გუნდები

function Teams({ engine }: { engine: AliasEngine }) {
  const dialog = useDialog();

  return (
    <View style={{ flex: 1 }}>
      <View style={Layout.header}>
        <ScreenHeader
          title="გუნდები"
          subtitle={`${engine.teams.length} გუნდი · ${engine.players.length} მოთამაშე`}
          onBack={() => engine.backToSetup()}
        />
      </View>

      <ScrollView contentContainerStyle={Layout.scroll}>
        <GlassCard padding={16}>
          <View style={{ gap: 8 }}>
            <Tip icon="hand.tap.fill" text="მოთამაშეს შეეხე და ის მომდევნო გუნდში გადავა." />
            <Tip icon="square.and.pencil" text="გუნდის სახელს შეეხე, რომ გადაარქვა." />
          </View>
        </GlassCard>

        {engine.teams.map((team) => {
          const color = teamColor(team.id);
          const squad = engine.members(team);
          return (
            <GlassCard key={team.id} padding={16}>
              <View style={{ gap: 12 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${team.name} — სახელის შეცვლა`}
                  onPress={() => {
                    Haptics.tap();
                    dialog({
                      title: 'გუნდის სახელი',
                      input: { placeholder: 'სახელი', initial: team.name },
                      actions: [
                        { label: 'შენახვა', primary: true, onPress: (value) => engine.renameTeam(team.id, value) },
                        { label: 'გაუქმება' },
                      ],
                    });
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
                  <View style={[styles.teamDot, { backgroundColor: color }]} />
                  <Text style={[titleFont(20), { color, flex: 1 }]} numberOfLines={1}>
                    {team.name}
                  </Text>
                  <MaterialCommunityIcons name={sf('square.and.pencil')} size={16} color={Colors.textSecondary} />
                </Pressable>

                <View style={Layout.chipRow}>
                  {squad.map((player) => (
                    <Pressable
                      key={player.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${player.name} — შემდეგ გუნდში`}
                      onPress={() => engine.movePlayerForward(player.id)}
                      style={[styles.memberChip, { borderColor: color + '59' }]}
                    >
                      <Text style={[body(14, '600'), { color: Colors.textPrimary }]} numberOfLines={1}>
                        {player.name}
                      </Text>
                    </Pressable>
                  ))}
                  {squad.length === 0 ? (
                    <Text style={[caption(11), { color: Colors.neonMagenta }]}>ცარიელია</Text>
                  ) : null}
                </View>
              </View>
            </GlassCard>
          );
        })}

        <GhostButton title="ხელახლა არევა" icon="shuffle" onPress={() => engine.rebuildTeams(true)} />

        {!engine.teamsAreValid ? (
          <Text style={[body(13, '600'), Layout.centered, { color: Colors.neonMagenta, paddingHorizontal: 16 }]}>
            თითოეულ გუნდში ორი მოთამაშე მაინც უნდა იყოს.
          </Text>
        ) : null}
      </ScrollView>

      <View style={Layout.footer}>
        <PrimaryButton
          title="თამაშის დაწყება"
          icon="play.fill"
          tint={Colors.neonCyan}
          enabled={engine.teamsAreValid}
          onPress={() => engine.startMatch()}
        />
      </View>
    </View>
  );
}

function Tip({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
      <MaterialCommunityIcons name={sf(icon)} size={15} color={Colors.textSecondary} />
      <Text style={[body(13, '500'), { color: Colors.textSecondary, flex: 1 }]}>{text}</Text>
    </View>
  );
}

// ── ტაბლოს ზოლი

function ScoreStrip({ engine }: { engine: AliasEngine }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {engine.teams.map((team) => {
        const color = teamColor(team.id);
        const active = team.id === engine.activeTeam?.id;
        return (
          <View
            key={team.id}
            style={[styles.scoreCell, { backgroundColor: active ? color + '2E' : Colors.surface }]}
          >
            <Text style={[body(11, '600'), { color: Colors.textSecondary }]} numberOfLines={1}>
              {team.name}
            </Text>
            <Text style={[body(19, '900'), Layout.digits, { color }]}>{engine.liveScore(team)}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ── ჯერის შესავალი

function TurnIntro({ engine, onExit }: { engine: AliasEngine; onExit: () => void }) {
  const team = engine.activeTeam;
  const color = teamColor(team?.id ?? 0);
  const explainer = team ? engine.explainer(team) : null;
  const squad = team ? engine.guessers(team) : [];

  return (
    <View style={{ flex: 1, gap: Space.m }}>
      <View style={Layout.topBar}>
        <GameExitButton onExit={onExit} />
        <Text style={[body(13, '700'), { color: Colors.textSecondary }]}>
          წრე {engine.lap} · ლიმიტი {engine.settings.target} ქულა
        </Text>
        <View style={{ flex: 1 }} />
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        <ScoreStrip engine={engine} />
      </View>

      {engine.extraLap ? (
        <Text style={[body(13, '600'), Layout.centered, { color: Colors.phosphor, paddingHorizontal: 24 }]}>
          ფრეა — თამაში დამატებით წრეზე გრძელდება.
        </Text>
      ) : null}

      <View style={{ flex: 1 }} />

      {team && explainer ? (
        <View style={{ alignItems: 'center', gap: 10 }}>
          <Text style={[titleFont(26), { color }]} numberOfLines={1} adjustsFontSizeToFit>
            {team.name}
          </Text>
          <Text style={[body(14, '500'), { color: Colors.textSecondary }]}>ხსნის</Text>
          <Text
            style={[display(46), Layout.centered, { color: Colors.textPrimary, paddingHorizontal: 24 }]}
            adjustsFontSizeToFit
            numberOfLines={2}
          >
            {explainer.name}
          </Text>
          {squad.length > 0 ? (
            <Text style={[body(14, '500'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 28 }]}>
              გამოიცნობენ: {squad.map((p) => p.name).join(', ')}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={{ flex: 1 }} />

      <View style={Layout.footer}>
        <Text style={[body(13, '500'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 28 }]}>
          ტელეფონი იმას გადაეცი, ვინც ხსნის — სიტყვას მხოლოდ ის ხედავს.
        </Text>
        <PrimaryButton title="მზად ვართ" icon="play.fill" tint={color} onPress={() => engine.beginTurn()} />
      </View>
    </View>
  );
}

// ── ათვლა

function Countdown({ engine, onExit }: { engine: AliasEngine; onExit: () => void }) {
  const color = teamColor(engine.activeTeam?.id ?? 0);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 }}>
      <View style={Layout.exitSlot}>
        <GameExitButton onExit={onExit} />
      </View>
      <Text style={[body(18, '700'), { color }]}>{engine.activeTeam?.name ?? ''}</Text>
      <Text style={[body(20, '600'), { color: Colors.textSecondary }]}>მოემზადეთ</Text>
      <Text style={[styles.huge, Layout.digits, { color }]}>{engine.countdown}</Text>
    </View>
  );
}

// ── რაუნდი

function Play({ engine, onExit }: { engine: AliasEngine; onExit: () => void }) {
  useKeepScreenAwake();

  const color = teamColor(engine.activeTeam?.id ?? 0);
  const flash = engine.flash;
  const flashTint = flash ? (flash.verdict === 'correct' ? Colors.phosphor : Colors.neonCyan) : null;
  const fraction = Math.min(1, Math.max(0, engine.remaining / Math.max(1, engine.settings.seconds)));

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => engine.clearFlash(), 180);
    return () => clearTimeout(t);
  }, [flash, engine]);

  return (
    <View style={{ flex: 1, gap: 14 }}>
      <View style={[Layout.topBar, { paddingTop: 14 }]}>
        <GameExitButton onExit={onExit} />
        <View style={[styles.teamBadge, { backgroundColor: color + '2E' }]}>
          <View style={[styles.teamDot, { backgroundColor: color }]} />
          <Text style={[body(14, '700'), { color }]} numberOfLines={1}>
            {engine.activeTeam?.name ?? ''}
          </Text>
        </View>
        <View style={{ flex: 1 }} />
        <Text
          style={[display(40), Layout.digits, { color: engine.remaining <= 10 ? Colors.neonMagenta : Colors.textPrimary }]}
        >
          {engine.remaining}
        </Text>
      </View>

      <View style={styles.barTrack}>
        <View
          style={{
            width: `${Math.max(2, fraction * 100)}%`,
            height: 6,
            borderRadius: 3,
            backgroundColor: engine.remaining <= 10 ? Colors.neonMagenta : color,
          }}
        />
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ paddingHorizontal: 20 }}>
        <View
          style={[
            styles.wordCard,
            {
              backgroundColor: flashTint ? flashTint + '38' : Colors.surface,
              borderColor: flashTint ?? Colors.stroke,
              borderWidth: flashTint ? 2 : 1,
            },
          ]}
        >
          <Text
            style={[
              display(engine.currentWord.length > 14 ? 40 : 54),
              Layout.centered,
              { color: Colors.textPrimary },
            ]}
            numberOfLines={4}
            adjustsFontSizeToFit
          >
            {engine.currentWord}
          </Text>
        </View>
      </View>

      <View style={{ flex: 1 }} />

      <View style={styles.counters}>
        <Counter icon="check-circle" value={engine.turnCorrect} color={Colors.phosphor} />
        <Counter icon="skip-next-circle" value={engine.turnSkipped} color={Colors.neonCyan} />
        <View style={{ flex: 1 }} />
        <Text
          style={[body(20, '900'), Layout.digits, { color: engine.turnScore < 0 ? Colors.neonMagenta : Colors.textPrimary }]}
        >
          {signed(engine.turnScore)}
        </Text>
      </View>

      <View style={[Layout.footer, { flexDirection: 'row', gap: 12 }]}>
        <BigControl title="გამოტოვება" icon="xmark" onPress={() => engine.register('skipped')} />
        <BigControl title="გამოიცნეს" icon="checkmark" onPress={() => engine.register('correct')} filled />
      </View>
    </View>
  );
}

function Counter({ icon, value, color }: { icon: string; value: number; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <MaterialCommunityIcons name={icon as never} size={18} color={color} />
      <Text style={[body(18, '900'), Layout.digits, { color }]}>{value}</Text>
    </View>
  );
}

function BigControl({
  title,
  icon,
  onPress,
  filled,
}: {
  title: string;
  icon: string;
  onPress: () => void;
  filled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={[
        styles.bigControl,
        { backgroundColor: filled ? Colors.neonCyan : Colors.surface },
      ]}
    >
      <MaterialCommunityIcons
        name={sf(icon)}
        size={20}
        color={filled ? Colors.ink : Colors.textPrimary}
      />
      <Text style={[body(16, '700'), { color: filled ? Colors.ink : Colors.textPrimary }]}>{title}</Text>
    </Pressable>
  );
}

// ── ჯერის შედეგი

function TurnResult({ engine, onExit }: { engine: AliasEngine; onExit: () => void }) {
  const team = engine.activeTeam;
  const color = teamColor(team?.id ?? 0);
  const reachedTarget = team ? engine.liveScore(team) >= engine.settings.target : false;

  return (
    <View style={{ flex: 1, gap: 14 }}>
      <View style={Layout.topBar}>
        <GameExitButton onExit={onExit} />
        <Text style={[body(13, '700'), { color: Colors.textSecondary }]}>რაუნდი დასრულდა</Text>
        <View style={{ flex: 1 }} />
      </View>

      <View style={{ alignItems: 'center', gap: 8, paddingHorizontal: 24 }}>
        <Text style={[titleFont(24), { color }]} numberOfLines={1} adjustsFontSizeToFit>
          {team?.name ?? ''}
        </Text>
        <Text
          style={[display(58), Layout.digits, { color: engine.turnScore < 0 ? Colors.neonMagenta : Colors.textPrimary }]}
        >
          {signed(engine.turnScore)}
        </Text>
        <Text style={[body(14, '600'), { color: Colors.textSecondary }]}>
          {engine.turnCorrect} გამოცნობილი · {engine.turnSkipped} გამოტოვებული
        </Text>
      </View>

      {engine.results.length > 0 ? (
        <Text style={[body(12, '500'), Layout.centered, { color: Colors.textSecondary }]}>
          სადავო სიტყვას შეეხე — ნიშანი შეიცვლება.
        </Text>
      ) : null}

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 4, gap: 6 }}
      >
        {engine.results.map((entry) => (
          <WordRow key={entry.id} engine={engine} entry={entry} />
        ))}
      </ScrollView>

      {engine.turnEndsInTie ? (
        <Text style={[body(12, '600'), Layout.centered, { color: Colors.phosphor, paddingHorizontal: 28 }]}>
          ფრეა — ყველაზე მეტი ქულა რამდენიმე გუნდს აქვს, ამიტომ კიდევ ერთი წრე ითამაშება.
        </Text>
      ) : reachedTarget && !engine.turnEndsMatch ? (
        <Text style={[body(12, '600'), Layout.centered, { color: Colors.phosphor, paddingHorizontal: 28 }]}>
          ლიმიტი გადალახეთ — წრე ბოლომდე მიდის, რომ ყველა გუნდს თანაბარი ცდა ჰქონდეს.
        </Text>
      ) : null}

      <View style={Layout.footer}>
        <PrimaryButton
          title={engine.turnEndsMatch ? 'შედეგები' : 'შემდეგი გუნდი'}
          icon={engine.turnEndsMatch ? 'flag.checkered' : 'chevron.right'}
          tint={color}
          onPress={() => engine.finishTurn()}
        />
      </View>
    </View>
  );
}

function WordRow({ engine, entry }: { engine: AliasEngine; entry: AliasEntry }) {
  const correct = entry.verdict === 'correct';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${entry.word}. ${correct ? 'ჩათვლილი' : 'გამოტოვებული'}`}
      onPress={() => {
        Haptics.tap();
        engine.flip(entry);
      }}
      style={[styles.wordRow, { backgroundColor: correct ? Colors.phosphor + '1F' : Colors.surface }]}
    >
      <MaterialCommunityIcons
        name={correct ? 'check-circle' : 'close-circle'}
        size={21}
        color={correct ? Colors.phosphor : Colors.neonMagenta}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[body(16, '600'), { color: correct ? Colors.textPrimary : Colors.textSecondary }]} numberOfLines={1}>
          {entry.word}
        </Text>
        {entry.isOvertime ? (
          <Text style={[body(11, '500'), { color: Colors.textSecondary, opacity: 0.8 }]}>
            ბოლო სიტყვა — ჯარიმა არ ერიცხება
          </Text>
        ) : null}
      </View>
      <Text style={[body(14, '900'), Layout.digits, { color: correct ? Colors.phosphor : Colors.textSecondary }]}>
        {correct ? '+1' : engine.settings.penalizeSkip && !entry.isOvertime ? '−1' : '0'}
      </Text>
    </Pressable>
  );
}

// ── გამარჯვებული

function Winner({
  engine,
  roster,
  onExit,
}: {
  engine: AliasEngine;
  roster: GameFlowProps['roster'];
  onExit: () => void;
}) {
  const winner = engine.winnerTeam;
  const color = teamColor(winner?.id ?? 0);

  useAwardOnce(() => {
    // გამარჯვებული გუნდის თითოეულ მოთამაშეს +3, დანარჩენებს +1.
    for (const team of engine.teams) {
      const reward = team.id === winner?.id ? 3 : 1;
      for (const player of engine.members(team)) roster.addScore(reward, player.id);
    }
    Haptics.win();
  });

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, gap: 12 }}>
        <View style={{ flex: 1 }} />

        <View style={{ alignItems: 'center' }}>
          <GlyphIcon name="trophy.fill" size={32} tint={Colors.phosphor} />
        </View>

        <Text style={[body(14, '500'), Layout.centered, { color: Colors.textSecondary }]}>გამარჯვებული გუნდი</Text>

        <Text
          style={[titleFont(34), Layout.centered, { color, paddingHorizontal: 24 }]}
          adjustsFontSizeToFit
          numberOfLines={2}
        >
          {winner?.name ?? '—'}
        </Text>

        {winner ? (
          <Text style={[body(14, '600'), Layout.centered, Layout.digits, { color: Colors.textSecondary }]}>
            {winner.score} ქულა · {engine.lap - 1} წრე
          </Text>
        ) : null}

        <Text
          style={[body(12, '500'), Layout.centered, { color: Colors.textSecondary, opacity: 0.75, paddingHorizontal: 32 }]}
        >
          საერთო ტაბლოზე გამარჯვებული გუნდის თითოეულ მოთამაშეს +3 ერიცხება, დანარჩენებს — +1.
        </Text>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 4, gap: 8 }}
        >
          {engine.standings.map((team: AliasTeam) => {
            const isWinner = team.id === winner?.id;
            const tint = teamColor(team.id);
            const squad = engine.members(team).map((p) => p.name).join(', ');
            return (
              <View
                key={team.id}
                style={[styles.teamRow, { backgroundColor: isWinner ? tint + '2E' : Colors.surface }]}
              >
                <Text style={[body(16, '900'), { color: Colors.textSecondary, width: 24 }]}>{isWinner ? '★' : '•'}</Text>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[body(16, '700'), { color: Colors.textPrimary }]} numberOfLines={1}>
                    {team.name}
                  </Text>
                  <Text style={[body(12, '500'), { color: Colors.textSecondary }]} numberOfLines={2}>
                    {squad || '—'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Text style={[titleFont(20), Layout.digits, { color: isWinner ? tint : Colors.textPrimary }]}>
                    {team.score}
                  </Text>
                  <Text style={[body(12, '900'), Layout.digits, { color: Colors.phosphor }]}>
                    {isWinner ? '+3' : '+1'}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={Layout.footer}>
          <PrimaryButton
            title="ახალი პარტია"
            icon="arrow.clockwise"
            tint={color}
            onPress={() => {
              engine.restartMatch();
            }}
          />
          <GhostButton
            title="გუნდების შეცვლა"
            icon="person.2.fill"
            onPress={() => {
              engine.backToTeams();
            }}
          />
          <GhostButton title="დასრულება" icon="xmark" onPress={onExit} />
        </View>
      </View>

      <Confetti />
    </View>
  );
}

const styles = StyleSheet.create({
  teamDot: { width: 10, height: 10, borderRadius: 5 },
  teamBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  memberChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 1,
  },
  scoreCell: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 8, borderRadius: Radius.small },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: Colors.surfaceHigh, marginHorizontal: 20, overflow: 'hidden' },
  wordCard: { paddingHorizontal: 20, paddingVertical: 36, borderRadius: 32, alignItems: 'center' },
  counters: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 26 },
  bigControl: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
    borderRadius: Radius.default,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Space.m,
    paddingVertical: 11,
    borderRadius: Radius.small,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: Space.m,
    paddingVertical: 13,
    borderRadius: Radius.small,
  },
  huge: { fontSize: 126, fontWeight: '900' },
});
