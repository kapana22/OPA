import { useState, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Space, body, caption, title as titleFont, Elevation } from '../../theme/theme';
import { GameExitButton, ScreenHeader , RulesSheet } from '../../ui/Cards';
import { CompactButton, GhostButton, PrimaryButton } from '../../ui/Buttons';
import { Pressable } from '../../ui/Pressable';
import { Layout } from '../../ui/layout';
import { FitText } from '../../ui/FitText';
import { ruleKindIcon, ruleKindLabel, type RuleCard } from '../../content/banks';
import { useObservable } from '../../core/observable';
import type { GameFlowProps } from '../registry';
import { RuleCardEngine, type ActiveRule } from './engine';
import { game as findGame } from '../catalog';
import { Icon } from '../../ui/Icon';

/**
 * „მაგიდის წესები“ (House Rules) — სრული ნაკადი.
 *
 * პორტი: `Splash/Games/RuleCard/RuleCardViews.swift`.
 * `rule` ტიპის ბარათი **ბოლომდე რჩება ძალაში** — ეს თამაშის მთელი აზრია.
 */


/** სიაში სრული წინადადება არ ეტევა — მოკლე სახელი უპირატესია. */
const listLabel = (card: RuleCard) => card.short ?? card.text;

export function RuleCardFlow({ roster, onExit }: GameFlowProps) {
  const [engine] = useState(() => new RuleCardEngine([...roster.players]));
  useObservable(engine);
  useEffect(() => { if (engine.phase === 'setup' && engine.canPlay) engine.startGame(); }, [engine]);

  switch (engine.phase) {
    case 'setup':
      return <Setup engine={engine} onClose={onExit} />;
    case 'card':
      return <Play engine={engine} onExit={onExit} />;
    case 'summary':
      return null;
  }
}

// ── პარამეტრები

function Setup({ engine, onClose }: { engine: RuleCardEngine; onClose: () => void }) {
  const [showRules, setShowRules] = useState(false);
  const gameData = findGame('rulecard');
  return (
    <View style={{ flex: 1 }}>
      <RulesSheet visible={showRules} title="House Rules" accent={Colors.neonMagenta} steps={gameData?.howTo ?? []} onClose={() => setShowRules(false)} />

      <View style={Layout.header}>
        <ScreenHeader title="House Rules" subtitle="წესები გროვდება" onBack={onClose}  onInfo={() => setShowRules(true)} />
      </View>

      <ScrollView contentContainerStyle={Layout.scroll}>

      </ScrollView>

      <View style={Layout.footer}>
        <PrimaryButton
          title="დაწყება"
          icon="play.fill"
          tint={Colors.neonMagenta}
          enabled={engine.canPlay}
          onPress={() => engine.startGame()}
        />
      </View>
    </View>
  );
}

// ── ბარათი

function Play({ engine, onExit }: { engine: RuleCardEngine; onExit: () => void }) {
  // ბარათის გაჩენის დრო — „შვების“ სიაზე ორმაგი შეხება წესს შემთხვევით არ უნდა მოხსნიდეს.
  const shownAt = useRef(Number.MAX_SAFE_INTEGER);
  useEffect(() => {
    shownAt.current = Date.now();
  }, [engine.drawn]);
  const card = engine.currentCard;
  const isRule = card.kind === 'rule';
  const isRelief = card.kind === 'relief';

  const tint = isRule ? Colors.neonMagenta : isRelief ? Colors.neonCyan : Colors.phosphor;

  return (
    <View style={{ flex: 1, gap: 12 }}>
      <View style={Layout.topBar}>
        <GameExitButton onExit={onExit} />
        <View style={{ flex: 1 }} />
        {engine.canSwap ? (
          <CompactButton title="სხვა ბარათი" onPress={() => engine.swapCard()} />
        ) : null}
      </View>

      {/* მოქმედი წესები — თამაშის მეხსიერება, ყოველთვის თვალწინ */}
      {engine.activeRules.length === 0 ? (
        <Text style={[caption(11), Layout.centered, { color: Colors.textSecondary, opacity: 0.7 }]}>
          მოქმედი წესი ჯერ არ არის
        </Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rulesStrip}>
          {engine.activeRules.map((rule) => (
            <View key={rule.id} style={styles.ruleChip}>
              <Icon name="check-decagram" size={11} color={Colors.neonMagenta} />
              <Text style={[body(12, '700'), { color: Colors.neonMagenta }]} numberOfLines={1}>
                {listLabel(rule.card)}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={{ flex: 1 }} />

      <View style={{ paddingHorizontal: 20 }}>
        <View style={[styles.cardFace, { borderColor: tint + '57' }, Elevation.card]}>
          <View style={[styles.kindBadge, { backgroundColor: tint }]}>
            <Icon name={ruleKindIcon[card.kind]} size={14} color={Colors.ink} />
            <Text style={[body(13, '900'), { color: Colors.ink }]}>{ruleKindLabel[card.kind]}</Text>
          </View>

          <FitText
            style={[titleFont(22), Layout.centered, { color: tint, paddingHorizontal: 20 }]}
            maxLines={1}
          >
            {engine.holder?.name ?? '—'}
          </FitText>

          <FitText
            style={[titleFont(card.text.length > 75 ? 24 : 28), Layout.centered, { color: Colors.textPrimary, paddingHorizontal: 22 }]}
            maxLines={8}
          >
            {card.text}
          </FitText>

        </View>
      </View>

      <View style={{ flex: 1 }} />

      <View style={Layout.footer}>
        {isRule ? (
          <PrimaryButton
            title="წესი მიღებულია"
            icon="checkmark"
            tint={Colors.neonMagenta}
            onPress={() => engine.acceptRule()}
          />
        ) : isRelief ? (
          engine.activeRules.length === 0 ? (
            <PrimaryButton
              title="მოსახსნელი არაფერია"
              icon="chevron.right"
              tint={Colors.neonCyan}
              onPress={() => engine.markDone()}
            />
          ) : (
            <>
              <Text style={[body(13, '700'), Layout.centered, { color: Colors.textSecondary }]}>
                რომელი წესი მოიხსნას?
              </Text>
              <ScrollView style={{ maxHeight: 170 }} contentContainerStyle={{ gap: 8 }}>
                {engine.activeRules.map((rule: ActiveRule) => (
                  <Pressable
                    key={rule.id}
                    accessibilityRole="button"
                    accessibilityLabel={`მოხსნა — ${listLabel(rule.card)}`}
                    onPress={() => {
                      if (Date.now() - shownAt.current < 600) return;
                      engine.removeRule(rule);
                    }}
                    style={styles.ruleRow}
                  >
                    <Icon name="close-circle" size={17} color={Colors.neonCyan} />
                    <Text style={[body(14, '600'), { color: Colors.textPrimary, flex: 1 }]} numberOfLines={2}>
                      {listLabel(rule.card)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )
        ) : (
          <PrimaryButton title="შემდეგი" icon="chevron.right" tint={Colors.phosphor} onPress={() => engine.markDone()} />
        )}

        {engine.isEndless ? (
          <GhostButton title="დასრულება" onPress={onExit} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: Colors.surface,
  },
  rulesStrip: { gap: 8, paddingHorizontal: 20 },
  ruleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: Colors.neonMagenta + '24',
  },
  cardFace: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 34,
    borderRadius: 30,
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 1.5,
  },
  kindBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: Radius.small,
    backgroundColor: Colors.surface,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Space.m,
    paddingVertical: 13,
    borderRadius: Radius.small,
  },
});
