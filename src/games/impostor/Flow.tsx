import {useState} from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Space, body, title as titleFont } from '../../theme/theme';
import {
  CategoryChip,
  Divider,
  GameExitButton,
  GlassCard,
  ScreenHeader,
  Stepper,
  ToggleRow,
  CategoryChecklist, RulesSheet } from '../../ui/Cards';
import { wordEntries } from '../categoryEntries';
import { PrimaryButton, GhostButton } from '../../ui/Buttons';
import { Pressable } from '../../ui/Pressable';
import { FitText } from '../../ui/FitText';
import { PassPhoneReveal } from '../../ui/PassPhoneReveal';
import { DiscussionPanel } from '../../ui/DiscussionPanel';
import { Layout } from '../../ui/layout';
import { Confetti } from '../../ui/Confetti';
import { DISCUSSION_OPTIONS, discussionLabel } from '../../core/settings';
import { WordBank } from '../../content/banks';
import { Haptics } from '../../core/haptics';
import { useObservable } from '../../core/observable';
import { useAwardOnce } from '../../core/awardOnce';
import type { GameFlowProps } from '../registry';
import { ImpostorEngine } from './engine';
import { game as findGame } from '../catalog';

/**
 * „ერთმა არ იცის“ (Impostor) — სრული ნაკადი.
 *
 * პორტი: `Splash/Games/Impostor/*.swift`. კენჭისყრა მაგიდასთან, ხმამაღლა ხდება —
 * ტელეფონი მხოლოდ ბარათებს და ბოლოს პასუხს აჩვენებს.
 */

export function ImpostorFlow({ roster, onExit }: GameFlowProps) {
  const [engine] = useState(() => new ImpostorEngine([...roster.players]));
  useObservable(engine);

  switch (engine.phase) {
    case 'setup':
      return <Setup engine={engine} onClose={onExit} />;
    case 'reveal':
      return <Reveal engine={engine} onExit={onExit} />;
    case 'discussion':
      return <Discussion engine={engine} onExit={onExit} />;
    case 'caughtCheck':
      return <CaughtCheck engine={engine} onExit={onExit} />;
    case 'impostorGuess':
      return <Guess engine={engine} onExit={onExit} />;
    case 'result':
      return <Result engine={engine} onExit={onExit} />;
  }
}

// ── პარამეტრები

function Setup({ engine, onClose }: { engine: ImpostorEngine; onClose: () => void }) {
  const [showRules, setShowRules] = useState(false);
  const gameData = findGame('impostor');
  return (
    <View style={{ flex: 1 }}>
      <RulesSheet visible={showRules} title={gameData?.title ?? 'Imposter'} accent={Colors.phosphor} steps={gameData?.howTo ?? []} onClose={() => setShowRules(false)} />

      <View style={Layout.header}>
        <ScreenHeader title="Imposter"  onBack={onClose}  onInfo={() => setShowRules(true)} />
      </View>

      <ScrollView contentContainerStyle={Layout.scroll}>
        <GlassCard>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>იმპოსტორები</Text>
              <Text style={[body(13, '500'), { color: Colors.textSecondary }]}>
                მაქსიმუმ {engine.maxImpostors}
              </Text>
            </View>
            <Stepper
              value={engine.settings.impostorCount}
              min={1}
              max={engine.maxImpostors}
              tint={Colors.neonMagenta}
              onChange={(v) => engine.setImpostorCount(v)}
            />
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>კატეგორიები</Text>
            <CategoryChecklist
              build={() => wordEntries(WordBank, 'შემთხვევითი', null)}
              selectedIDs={engine.settings.categoryIDs}
              onChange={(ids) => engine.setCategories(ids)}
            />
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>განხილვის დრო</Text>
            <View style={Layout.segmentRow}>
              {DISCUSSION_OPTIONS.map((secs) => (
                <CategoryChip
                  compact
                  key={secs}
                  label={discussionLabel(secs)}
                  selected={engine.settings.discussionTimer === secs}
                  onPress={() => engine.setDiscussionSeconds(secs)}
                />
              ))}
            </View>
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 14 }}>
            <ToggleRow
              title="იმპოსტორმა კატეგორია იცოდეს"
              subtitle="უფრო სამართლიანია დამწყებთათვის"
              value={engine.settings.impostorKnowsCategory}
              onChange={(v) => engine.setKnowsCategory(v)}
            />
            <Divider />
            <ToggleRow
              title="დაჭერილ იმპოსტორს ბოლო შანსი ჰქონდეს"
              subtitle="სიტყვა უნდა გამოიცნოს"
              value={engine.settings.impostorCanGuess}
              onChange={(v) => engine.setCanGuess(v)}
            />
          </View>
        </GlassCard>
      </ScrollView>

      <View style={Layout.footer}>
        <PrimaryButton
          title="რაუნდის დაწყება"
          icon="play.fill"
          tint={Colors.phosphor}
          onPress={() => engine.startRound()}
        />
      </View>
    </View>
  );
}

// ── ბარათების დარიგება

function Reveal({ engine, onExit }: { engine: ImpostorEngine; onExit: () => void }) {
  const player = engine.currentRevealPlayer;
  if (!player) return null;

  const info = engine.card(player);
  const isLast = engine.revealIndex + 1 >= engine.players.length;

  return (
    <PassPhoneReveal
      confirmFirst
      key={engine.revealIndex}
      playerName={player.name}
      index={engine.revealIndex}
      total={engine.players.length}
      headerLeft={`რაუნდი ${engine.round}`}
      card={{
        word: info.word,
        hint: info.hint,
        note: info.isImpostor ? 'ილაპარაკე ისე, თითქოს იცოდე.' : null,
        tint: info.isImpostor ? Colors.neonMagenta : Colors.textPrimary,
      }}
      nextTitle={isLast ? 'ვნახე — დაწყება' : 'ვნახე — შემდეგი'}
      onNext={() => engine.advanceReveal()}
      onExit={onExit}
    />
  );
}

// ── განხილვა

function Discussion({ engine, onExit }: { engine: ImpostorEngine; onExit: () => void }) {
  return (
    <DiscussionPanel
      title="თითოეული თითო სიტყვას ამბობს"
      starterName={engine.startingPlayer?.name}
      seconds={engine.settings.discussionTimer}
      tips={[]}
      accent={Colors.neonMagenta}
      actionTitle="პასუხის ნახვა"
      onAction={() => engine.showResult()}
      onExit={onExit}
    />
  );
}

// ── დაიჭირეს?

function CaughtCheck({ engine, onExit }: { engine: ImpostorEngine; onExit: () => void }) {
  return (
    <View style={{ flex: 1, gap: 18 }}>
      <View style={Layout.exitSlot}>
        <GameExitButton onExit={onExit} />
      </View>

      <View style={{ flex: 1 }} />

      <Text style={[titleFont(28), Layout.centered, { color: Colors.textPrimary, paddingHorizontal: 24 }]}>
        {engine.impostors.length > 1 ? 'იმპოსტორები დაიჭირეთ?' : 'იმპოსტორი დაიჭირეთ?'}
      </Text>
      <Text style={[body(15, '500'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
        თუ კი, ტელეფონი მას გადაეცით.
      </Text>

      <View style={{ flex: 1 }} />

      <View style={Layout.footer}>
        <PrimaryButton
          title="დიახ, ბოლო შანსი"
          icon="target"
          tint={Colors.phosphor}
          onPress={() => engine.impostorCaught()}
        />
        <GhostButton title="არა" icon="xmark" onPress={() => engine.impostorNotCaught()} />
      </View>
    </View>
  );
}

// ── იმპოსტორის ბოლო შანსი

function Guess({ engine, onExit }: { engine: ImpostorEngine; onExit: () => void }) {
  return (
    <View style={{ flex: 1, gap: 18 }}>
      <View style={Layout.exitSlot}>
        <GameExitButton onExit={onExit} />
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ alignItems: 'center', gap: 6 }}>
        <Text style={[titleFont(30), { color: Colors.neonMagenta }]}>დაგიჭირეს!</Text>
        <Text style={[body(15, '500'), Layout.centered, { color: Colors.textSecondary }]}>
          ბოლო შანსი: რომელი სიტყვა იყო?
        </Text>
      </View>

      <View style={{ alignItems: 'center' }}>
        <View style={styles.pill}>
          <Text style={[body(14, '700'), { color: Colors.textSecondary }]}>
            {engine.category.emoji} {engine.category.name}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 8, gap: 10 }}>
        {engine.guessOptions.map((word) => (
          <Pressable
            key={word}
            accessibilityRole="button"
            accessibilityLabel={word}
            onPress={() => {
              Haptics.heavy();
              engine.submitGuess(word);
            }}
            style={styles.optionRow}
          >
            <FitText style={[body(18, '700'), Layout.centered, { color: Colors.textPrimary }]} maxLines={2}>
              {word}
            </FitText>
          </Pressable>
        ))}
      </ScrollView>

      <View style={{ flex: 1 }} />
    </View>
  );
}

// ── პასუხი

function Result({ engine, onExit }: { engine: ImpostorEngine; onExit: () => void }) {
  useAwardOnce(() => {
    Haptics.success();
  });

  const winner = engine.winner;

  return (
    <View style={{ flex: 1 }}>
    <ScrollView contentContainerStyle={{ flexGrow: 1, gap: Space.m, paddingVertical: Space.m }}>
      <View style={{ flex: 1 }} />

      {winner ? (
        <Text style={[titleFont(28), Layout.centered, { color: winner === 'group' ? Colors.phosphor : Colors.neonMagenta, paddingHorizontal: 24 }]}>
          {winner === 'group'
            ? 'იმპოსტორი დაიჭირეს!'
            : engine.caught
              ? 'დაიჭირეს, მაგრამ გამოიცნო!'
              : 'იმპოსტორმა გაასწრო!'}
        </Text>
      ) : null}

      <View style={Layout.content}>
        <GlassCard>
          <View style={{ gap: 12 }}>
            <Row label="საიდუმლო სიტყვა" value={engine.secretWord} tint={Colors.phosphor} />
            <Divider />
            <Row label="კატეგორია" value={`${engine.category.emoji} ${engine.category.name}`} />
            <Divider />
            <Row
              label={engine.impostors.length > 1 ? 'იმპოსტორები' : 'იმპოსტორი'}
              value={engine.impostors.map((p) => p.name).join(', ')}
              tint={Colors.phosphor}
            />
            {engine.impostorGuess !== null ? (
              <>
                <Divider />
                <Row
                  label="ვარაუდი"
                  value={`${engine.impostorGuess} · ${engine.guessedRight ? 'გამოიცნო!' : 'ვერ გამოიცნო'}`}
                  tint={engine.guessedRight ? Colors.phosphor : Colors.textSecondary}
                />
              </>
            ) : null}
          </View>
        </GlassCard>
      </View>

      <View style={{ flex: 1 }} />

      <View style={Layout.footer}>
        <PrimaryButton
          title="შემდეგი რაუნდი"
          icon="arrow.clockwise"
          tint={Colors.phosphor}
          onPress={() => {
            engine.nextRound();
          }}
        />
        <GhostButton title="დასრულება" icon="xmark" onPress={onExit} />
      </View>
    </ScrollView>
      {winner ? <Confetti /> : null}
    </View>
  );
}

function Row({ label, value, tint = Colors.textPrimary }: { label: string; value: string; tint?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
      <Text style={[body(14, '500'), { color: Colors.textSecondary }]}>{label}</Text>
      <View style={{ flex: 1 }} />
      <FitText style={[body(16, '700'), { color: tint, textAlign: 'right', flexShrink: 1 }]} maxLines={3}>
        {value}
      </FitText>
    </View>
  );
}

const styles = StyleSheet.create({
  optionRow: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: Radius.small,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: Colors.surface },
});
