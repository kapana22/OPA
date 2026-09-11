import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Radius, Space, body, caption, title as titleFont } from '../../theme/theme';
import { icon as sf } from '../../theme/icons';
import { CategoryChip, Divider, GameExitButton, GlassCard, GlyphIcon, RankRow, ScreenHeader } from '../../ui/Cards';
import { PrimaryButton, GhostButton } from '../../ui/Buttons';
import { Pressable } from '../../ui/Pressable';
import { Layout } from '../../ui/layout';
import { AnswerPromptBank } from '../../content/banks';
import { PodiumAward } from '../../core/podiumAward';
import { Haptics } from '../../core/haptics';
import { useObservable } from '../../core/observable';
import { useAwardOnce } from '../../core/awardOnce';
import type { GameFlowProps } from '../registry';
import { WhoWroteEngine, type Reveal } from './engine';

/**
 * „ვინ დაწერა?“ — სრული ნაკადი.
 *
 * პორტი: `Splash/Games/WhoWrote/*.swift` (8 ხედი).
 * **წაკითხვის ეტაპი** განზრახ დგას წერასა და გამოცნობას შორის.
 */

const ROUND_OPTIONS = [3, 5, 7];

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
          prompt={engine.currentPrompt}
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
    case 'guess':
      return engine.stage === 'handoff' ? (
        <Handoff
          playerName={engine.currentGuesser?.name ?? '—'}
          counter={`${engine.guesserIndex + 1} / ${engine.players.length}`}
          note="ერთი პასუხი გელოდება. წაიკითხე და თქვი, ვინ დაწერა."
          actionTitle="პასუხის ნახვა"
          onAction={() => engine.revealScreen()}
          onExit={onExit}
        />
      ) : (
        <Picker engine={engine} onExit={onExit} />
      );
    case 'result':
      return <Result engine={engine} onExit={onExit} />;
    case 'summary':
      return <Summary engine={engine} roster={roster} onExit={onExit} />;
  }
}

// ── პარამეტრები

function Setup({ engine, onClose }: { engine: WhoWroteEngine; onClose: () => void }) {
  return (
    <View style={{ flex: 1 }}>
      <View style={Layout.header}>
        <ScreenHeader title="ვინ დაწერა?" subtitle={`${engine.players.length} მოთამაშე`} onBack={onClose} />
      </View>

      <ScrollView contentContainerStyle={Layout.scroll}>
        {!engine.canPlay ? (
          <GlassCard>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <MaterialCommunityIcons name="account-off" size={21} color={Colors.neonMagenta} />
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
          <View style={{ gap: 10 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>როგორ თამაშობთ</Text>
            <View style={{ gap: 7 }}>
              <Step n="1" text="ეკრანზე ერთი დავალებაა — ყველა კითხულობს ერთად." />
              <Step n="2" text="ტელეფონი წრეზე გადადის და თითოეული ფარულად წერს თავის პასუხს." />
              <Step n="3" text="მეორე წრეზე ყველას ერთი უცხო პასუხი ხვდება — უნდა გამოიცნოს ავტორი." />
              <Step n="4" text="სწორი გამოცნობა +2 ქულაა; თუ შენი პასუხი ვერ იცნეს, +2 შენ გერგება." />
            </View>
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
            <View style={Layout.chipRow}>
              <CategoryChip
                label="ყველა"
                selected={engine.settings.categoryID === null}
                onPress={() => engine.setCategory(null)}
              />
              {AnswerPromptBank.categories.map((cat) => (
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

function Step({ n, text }: { n: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
      <View style={styles.stepBadge}>
        <Text style={[body(12, '900'), { color: Colors.ink }]}>{n}</Text>
      </View>
      <Text style={[body(13, '500'), { color: Colors.textSecondary, flex: 1 }]}>{text}</Text>
    </View>
  );
}

// ── დავალების გაცნობა

function Intro({ engine, onExit }: { engine: WhoWroteEngine; onExit: () => void }) {
  return (
    <View style={{ flex: 1, gap: Space.l }}>
      <View style={Layout.topBar}>
        <GameExitButton onExit={onExit} />
        <Text style={[body(14, '700'), Layout.digits, { color: Colors.textSecondary }]}>
          რაუნდი {engine.round} / {engine.settings.rounds}
        </Text>
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
          <MaterialCommunityIcons name={sf('shuffle')} size={13} color={Colors.textSecondary} />
          <Text style={[body(13, '700'), { color: Colors.textSecondary }]}>სხვა</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1 }} />

      <View style={Layout.content}>
        <GlassCard padding={28}>
          <Text style={[titleFont(26), Layout.centered, { color: Colors.textPrimary }]} adjustsFontSizeToFit numberOfLines={5}>
            {engine.currentPrompt}
          </Text>
        </GlassCard>
      </View>

      <Text style={[body(14, '500'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
        წაიკითხეთ ერთად, მერე ტელეფონი წრეზე გაივლის და თითოეული ფარულად დაწერს პასუხს.
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
  prompt,
  note,
  actionTitle,
  onAction,
  onExit,
}: {
  playerName: string;
  counter: string;
  prompt?: string;
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

      <Text style={[body(16, '500'), Layout.centered, { color: Colors.textSecondary }]}>გადაეცი ტელეფონი</Text>

      <Text
        style={[titleFont(36), Layout.centered, { color: Colors.phosphor, paddingHorizontal: 24 }]}
        adjustsFontSizeToFit
        numberOfLines={2}
      >
        {playerName}
      </Text>

      <View style={Layout.content}>
        <GlassCard>
          <View style={{ gap: 10, alignItems: 'center' }}>
            {prompt ? (
              <Text style={[body(16, '700'), Layout.centered, { color: Colors.textPrimary }]}>{prompt}</Text>
            ) : null}
            <Text style={[body(13, '500'), Layout.centered, { color: Colors.textSecondary }]}>{note}</Text>
          </View>
        </GlassCard>
      </View>

      <View style={{ flex: 1 }} />

      <View style={Layout.footer}>
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

  return (
    <View style={{ flex: 1 }}>
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
          <Text style={[titleFont(22), Layout.centered, { color: Colors.textPrimary }]} adjustsFontSizeToFit numberOfLines={4}>
            {engine.currentPrompt}
          </Text>
        </GlassCard>

        <TextInput
          value={text}
          onChangeText={change}
          placeholder="დაწერე პასუხი"
          placeholderTextColor={Colors.textSecondary}
          multiline
          autoFocus
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
    </View>
  );
}

// ── ხმამაღლა კითხვა

function Reading({ engine, onExit }: { engine: WhoWroteEngine; onExit: () => void }) {
  return (
    <View style={{ flex: 1, gap: 14 }}>
      <View style={Layout.topBar}>
        <GameExitButton onExit={onExit} />
        <Text style={[body(13, '700'), Layout.digits, { color: Colors.textSecondary }]}>
          რაუნდი {engine.round} / {engine.settings.rounds}
        </Text>
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
        ავტორები დამალულია. ჯერ იკამათეთ, მერე ტელეფონი ისევ წრეზე გავა.
      </Text>

      <View style={Layout.footer}>
        <PrimaryButton title="გამოცნობა" icon="chevron.right" tint={Colors.phosphor} onPress={() => engine.beginGuessing()} />
      </View>
    </View>
  );
}

// ── გამოცნობა

function Picker({ engine, onExit }: { engine: WhoWroteEngine; onExit: () => void }) {
  const answer = engine.answerToGuess;

  return (
    <View style={{ flex: 1, gap: 14 }}>
      <View style={Layout.topBar}>
        <GameExitButton onExit={onExit} />
        <Text style={[body(15, '700'), { color: Colors.phosphor }]} numberOfLines={1}>
          {engine.currentGuesser?.name ?? '—'}
        </Text>
        <View style={{ flex: 1 }} />
        <Text style={[body(14, '700'), Layout.digits, { color: Colors.textSecondary }]}>
          {engine.guesserIndex + 1} / {engine.players.length}
        </Text>
      </View>

      <View style={Layout.content}>
        <GlassCard padding={24}>
          <Text
            style={[titleFont(answer.length > 34 ? 22 : 28), Layout.centered, { color: Colors.textPrimary }]}
            adjustsFontSizeToFit
            numberOfLines={5}
          >
            {answer}
          </Text>
        </GlassCard>
      </View>

      <Text style={[body(16, '700'), Layout.centered, { color: Colors.textSecondary }]}>ვინ დაწერა?</Text>

      <ScrollView contentContainerStyle={Layout.nameGrid}>
        {engine.guessOptions.map((player) => (
          <Pressable
            key={player.id}
            accessibilityRole="button"
            accessibilityLabel={player.name}
            onPress={() => {
              Haptics.medium();
              engine.submitGuess(player);
            }}
            style={styles.nameCell}
          >
            <Text style={[body(17, '700'), Layout.centered, { color: Colors.textPrimary }]} numberOfLines={2} adjustsFontSizeToFit>
              {player.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

// ── რაუნდის შედეგი

function Result({ engine, onExit }: { engine: WhoWroteEngine; onExit: () => void }) {
  useEffect(() => {
    Haptics.success();
  }, []);

  const scored = engine.players.filter((p) => engine.roundPoints(p) > 0);

  return (
    <View style={{ flex: 1, gap: 14 }}>
      <View style={Layout.topBar}>
        <GameExitButton onExit={onExit} />
        <Text style={[body(14, '700'), Layout.digits, { color: Colors.textSecondary }]}>
          რაუნდი {engine.round} / {engine.settings.rounds}
        </Text>
        <View style={{ flex: 1 }} />
      </View>

      <Text style={[body(15, '600'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
        {engine.currentPrompt}
      </Text>

      <ScrollView contentContainerStyle={[Layout.content, { paddingVertical: 8, gap: 10 }]}>
        {engine.reveals.map((reveal: Reveal) => (
          <GlassCard key={reveal.id} padding={16}>
            <View style={{ gap: 10 }}>
              <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>„{reveal.answer}“</Text>
              <Row label="ავტორი" value={reveal.authorName} tint={Colors.phosphor} />
              <Row label="გამომცნობი" value={reveal.guesserName} />
              <Row label="დაასახელა" value={reveal.pickedName} tint={reveal.correct ? Colors.phosphor : Colors.neonMagenta} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[body(13, '700'), { color: reveal.correct ? Colors.phosphor : Colors.neonMagenta }]}>
                  {reveal.correct ? 'იცნო' : 'ვერ იცნო'}
                </Text>
                <View style={{ flex: 1 }} />
                <Text style={[body(13, '900'), { color: Colors.textPrimary }]} numberOfLines={1}>
                  +2 · {reveal.correct ? reveal.guesserName : reveal.authorName}
                </Text>
              </View>
            </View>
          </GlassCard>
        ))}

        {scored.length > 0 ? (
          <GlassCard>
            <View style={{ gap: 8 }}>
              <Text style={[body(13, '700'), { color: Colors.textSecondary }]}>რაუნდის ქულები</Text>
              {scored.map((player) => (
                <View key={player.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[body(15, '600'), { color: Colors.textPrimary, flex: 1 }]}>{player.name}</Text>
                  <Text style={[body(15, '900'), Layout.digits, { color: Colors.phosphor }]}>
                    +{engine.roundPoints(player)}
                  </Text>
                </View>
              ))}
            </View>
          </GlassCard>
        ) : null}
      </ScrollView>

      <View style={Layout.footer}>
        <PrimaryButton
          title={engine.isLastRound ? 'შედეგები' : 'შემდეგი რაუნდი'}
          icon="chevron.right"
          tint={Colors.phosphor}
          onPress={() => engine.next()}
        />
      </View>
    </View>
  );
}

function Row({ label, value, tint = Colors.textPrimary }: { label: string; value: string; tint?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Text style={[body(13, '500'), { color: Colors.textSecondary }]}>{label}</Text>
      <View style={{ flex: 1 }} />
      <Text style={[body(14, '700'), { color: tint }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

// ── შეჯამება

function Summary({
  engine,
  roster,
  onExit,
}: {
  engine: WhoWroteEngine;
  roster: GameFlowProps['roster'];
  onExit: () => void;
}) {

  useAwardOnce(() => {
    PodiumAward.apply(engine.results, roster);
    Haptics.success();
  });

  const top = engine.ranking[0];

  return (
    <View style={{ flex: 1, gap: 14 }}>
      <View style={{ flex: 1 }} />

      <View style={{ alignItems: 'center' }}>
        <GlyphIcon name="trophy.fill" size={31} tint={Colors.phosphor} />
      </View>

      <Text style={[titleFont(28), Layout.centered, { color: Colors.phosphor }]}>გამარჯვებული</Text>

      {top ? (
        <>
          <Text style={[body(15, '600'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
            {top.name} — {engine.totalFor(top)} ქულა
          </Text>
          <Text style={[body(12, '500'), Layout.centered, { color: Colors.textSecondary, opacity: 0.7 }]}>
            საერთო ტაბლოზე პირველ სამს +3 / +2 / +1 ერიცხება
          </Text>
        </>
      ) : null}

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
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.phosphor,
  },
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
});
