import { PlayerCharacter } from '../../ui/PlayerCharacter';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Colors, Radius, Space, body, caption, title as titleFont } from '../../theme/theme';
import { GameExitButton, GlassCard, ScreenHeader, CategoryChecklist, RulesSheet } from '../../ui/Cards';
import { textEntries } from '../categoryEntries';
import { PrimaryButton, GhostButton } from '../../ui/Buttons';
import { Pressable } from '../../ui/Pressable';
import { Layout } from '../../ui/layout';
import { FitText } from '../../ui/FitText';
import { AnswerPromptBank } from '../../content/banks';
import { Haptics } from '../../core/haptics';
import { useObservable } from '../../core/observable';
import type { GameFlowProps } from '../registry';
import { WhoWroteEngine } from './engine';
import { game as findGame } from '../catalog';
import { Icon } from '../../ui/Icon';

/**
 * „ვინ დაწერა?“ — სრული ნაკადი.
 *
 * პორტი: `Splash/Games/WhoWrote/*.swift`.
 * ტელეფონი მხოლოდ ფარულ წერას და ბოლოს ანონიმურ პასუხებს აჩვენებს —
 * ვინ რა დაწერა, მაგიდასთან ხმამაღლა გამოიცნობენ.
 */

export function WhoWroteFlow({ roster, onExit }: GameFlowProps) {
  const [engine] = useState(() => new WhoWroteEngine([...roster.players]));
  useObservable(engine);

  switch (engine.phase) {
    case 'setup':
      return <Setup engine={engine} onClose={onExit} />;
    case 'intro':
      return <Intro engine={engine} onExit={onExit} />;
    case 'write':
      return engine.stage === 'handoff' ? (
        <Handoff
          playerName={engine.currentWriter?.name ?? '—'}
          counter={`${engine.writerIndex + 1} / ${engine.players.length}`}
          note="დანარჩენებმა ეკრანს არ უნდა უყურონ."
          actionTitle="მზად ვარ"
          onAction={() => engine.revealScreen()}
          onExit={onExit}
        />
      ) : (
        <Composer key={engine.writerIndex} engine={engine} onExit={onExit} />
      );
    case 'reading':
      return <Reading engine={engine} onExit={onExit} />;
  }
}

// ── პარამეტრები

function Setup({ engine, onClose }: { engine: WhoWroteEngine; onClose: () => void }) {
  const [showRules, setShowRules] = useState(false);
  const gameData = findGame('whowrote');
  return (
    <View style={{ flex: 1 }}>
      <RulesSheet visible={showRules} title="Who Wrote" accent={Colors.phosphor} steps={gameData?.howTo ?? []} onClose={() => setShowRules(false)} />

      <View style={Layout.header}>
        <ScreenHeader title="Who Wrote It?"  onBack={onClose}  onInfo={() => setShowRules(true)} />
      </View>

      <ScrollView contentContainerStyle={Layout.scroll}>
        {!engine.canPlay ? (
          <GlassCard>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <Icon name="account-off" size={21} color={Colors.neonMagenta} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={[body(15, '700'), { color: Colors.textPrimary }]}>საჭიროა მინიმუმ 3 მოთამაშე</Text>
                <Text style={[body(13, '500'), { color: Colors.textSecondary }]}>
                  დაბრუნდი და მოთამაშეების სიაში დაამატე ხალხი.
                </Text>
              </View>
            </View>
          </GlassCard>
        ) : null}

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>კატეგორიები</Text>
            <CategoryChecklist
              build={() => textEntries(AnswerPromptBank, 'answerprompt', 'ყველა')}
              selectedIDs={engine.settings.categoryIDs}
              onChange={(ids) => engine.setCategories(ids)}
            />
          </View>
        </GlassCard>
      </ScrollView>

      <View style={Layout.footer}>
        <PrimaryButton
          title="დაწყება"
          icon="play.fill"
          tint={Colors.phosphor}
          enabled={engine.canPlay}
          onPress={() => engine.startGame()}
        />
      </View>
    </View>
  );
}

// ── დავალების გაცნობა

function Intro({ engine, onExit }: { engine: WhoWroteEngine; onExit: () => void }) {
  return (
    <View style={{ flex: 1, gap: Space.l }}>
      <View style={Layout.topBar}>
        <GameExitButton onExit={onExit} />
        <View style={{ flex: 1 }} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="სხვა დავალება"
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
          <FitText style={[titleFont(26), Layout.centered, { color: Colors.textPrimary }]} maxLines={6}>
            {engine.currentPrompt}
          </FitText>
        </GlassCard>
      </View>

      <Text style={[body(14, '500'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
        ყველამ ფარულად დაწეროს პასუხი.
      </Text>

      <View style={{ flex: 1 }} />

      <View style={Layout.footer}>
        <PrimaryButton title="წერის დაწყება" icon="square.and.pencil" tint={Colors.phosphor} onPress={() => engine.beginWriting()} />
      </View>
    </View>
  );
}

// ── ტელეფონის გადაცემა

function Handoff({
  playerName,
  counter,
  note,
  actionTitle,
  onAction,
  onExit,
}: {
  playerName: string;
  counter: string;
  note: string;
  actionTitle: string;
  onAction: () => void;
  onExit: () => void;
}) {
  return (
    <View style={{ flex: 1, gap: 18 }}>
      <View style={Layout.topBar}>
        <GameExitButton onExit={onExit} />
        <View style={{ flex: 1 }} />
        <Text style={[body(14, '700'), Layout.digits, { color: Colors.textSecondary }]}>{counter}</Text>
      </View>
      <View style={{ flex: 1 }} />
      <PlayerCharacter name={playerName} />

      <View style={{ gap: 6, paddingHorizontal: 24 }}>
        <FitText style={[titleFont(28), Layout.centered, { color: Colors.textPrimary }]} maxLines={1}>
          {playerName}
        </FitText>
      </View>

      <View style={{ flex: 1 }} />

      <View style={Layout.footer}>
        <Text style={[body(12, '500'), Layout.centered, { color: Colors.textSecondary, opacity: 0.8, paddingHorizontal: 8 }]}>
          {note}
        </Text>
        <PrimaryButton title={actionTitle} icon="hand.tap.fill" tint={Colors.phosphor} onPress={onAction} />
      </View>
    </View>
  );
}

// ── პასუხის წერა

function Composer({ engine, onExit }: { engine: WhoWroteEngine; onExit: () => void }) {
  const [text, setText] = useState('');
  const trimmed = text.trim();
  const limit = WhoWroteEngine.answerLimit;

  const change = (value: string) => {
    // ერთი ხაზი — ტექსტი სიაში უნდა ჩაჯდეს.
    setText(value.replace(/\n/g, ' ').slice(0, limit));
  };

  // კლავიატურა „მზადაა“-ს არ უნდა ფარავდეს.
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={Layout.topBar}>
        <GameExitButton onExit={onExit} />
        <Text style={[body(15, '700'), { color: Colors.phosphor }]} numberOfLines={1}>
          {engine.currentWriter?.name ?? '—'}
        </Text>
        <View style={{ flex: 1 }} />
        <Text style={[body(14, '700'), Layout.digits, { color: Colors.textSecondary }]}>
          {engine.writerIndex + 1} / {engine.players.length}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[Layout.content, { paddingTop: 18, paddingBottom: 12, gap: Space.m }]}
        keyboardDismissMode="interactive"
      >
        <GlassCard padding={22}>
          <FitText style={[titleFont(22), Layout.centered, { color: Colors.textPrimary }]} maxLines={6}>
            {engine.currentPrompt}
          </FitText>
        </GlassCard>

        <TextInput
          value={text}
          onChangeText={change}
          placeholder="დაწერე პასუხი"
          placeholderTextColor={Colors.textSecondary}
          multiline
          autoFocus
          // კლავიატურამ დაწერილი არ უნდა დაიმახსოვროს და შემდეგს არ შესთავაზოს.
          autoCorrect={false}
          spellCheck={false}
          autoComplete="off"
          style={[body(18, '600'), styles.input, { color: Colors.textPrimary }]}
        />

        <Text style={[body(13, '500'), Layout.centered, { color: Colors.textSecondary }]}>
          რაც უფრო მოულოდნელია პასუხი, მით ძნელია მიხვდნენ, რომ შენ დაწერე.
        </Text>
      </ScrollView>

      <View style={[Layout.footer, { gap: 8 }]}>
        {text.length >= limit - 20 ? (
          <Text
            style={[
              caption(12),
              Layout.centered,
              Layout.digits,
              { color: text.length >= limit - 5 ? Colors.neonMagenta : Colors.textSecondary },
            ]}
          >
            {text.length} / {limit}
          </Text>
        ) : null}
        <PrimaryButton
          title="მზადაა"
          icon="checkmark"
          tint={Colors.phosphor}
          enabled={trimmed.length > 0}
          onPress={() => {
            if (!trimmed) return;
            setText('');
            engine.submitAnswer(trimmed);
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

// ── ხმამაღლა კითხვა

function Reading({ engine, onExit }: { engine: WhoWroteEngine; onExit: () => void }) {
  return (
    <View style={{ flex: 1, gap: 14 }}>
      <View style={Layout.topBar}>
        <GameExitButton onExit={onExit} />
        <View style={{ flex: 1 }} />
        <Text style={[body(12, '600'), Layout.digits, { color: Colors.textSecondary }]}>
          {engine.readingList.length} პასუხი
        </Text>
      </View>

      <View style={{ alignItems: 'center', gap: 6 }}>
        <Text style={[titleFont(26), { color: Colors.phosphor }]}>წაიკითხეთ ხმამაღლა</Text>
        <Text style={[body(15, '600'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 28 }]}>
          {engine.currentPrompt}
        </Text>
      </View>

      <ScrollView contentContainerStyle={[Layout.content, { paddingVertical: 4, gap: 8 }]}>
        {engine.readingList.map((answer, index) => (
          <View key={index} style={styles.answerRow}>
            <View style={styles.answerBadge}>
              <Text style={[body(13, '900'), { color: Colors.ink }]}>{index + 1}</Text>
            </View>
            <Text style={[body(16, '600'), { color: Colors.textPrimary, flex: 1 }]}>{answer}</Text>
          </View>
        ))}
      </ScrollView>

      <Text style={[body(12, '500'), Layout.centered, { color: Colors.textSecondary, opacity: 0.85, paddingHorizontal: 24 }]}>
        გამოიცანით, ვინ რა დაწერა.
      </Text>

      <View style={Layout.footer}>
        <PrimaryButton title="შემდეგი" icon="chevron.right" tint={Colors.phosphor} onPress={() => engine.next()} />
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
  input: {
    minHeight: 96,
    textAlignVertical: 'top',
    paddingHorizontal: Space.m,
    paddingVertical: 14,
    borderRadius: Radius.small,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: Radius.small,
    backgroundColor: Colors.surface,
  },
  answerBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.phosphor,
  },
});
