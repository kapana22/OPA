import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Radius, Space, body, caption, title as titleFont } from '../../theme/theme';
import { icon as sf } from '../../theme/icons';
import { CategoryChip, GameExitButton, GlassCard, GlyphIcon, RadioRow, ScreenHeader } from '../../ui/Cards';
import { PrimaryButton, GhostButton } from '../../ui/Buttons';
import { Pressable } from '../../ui/Pressable';
import { Confetti } from '../../ui/Confetti';
import { Layout } from '../../ui/layout';
import { ruleKindIcon, ruleKindLabel, type RuleCard } from '../../content/banks';
import { PARTY_FORFEITS, forfeitNote, forfeitShort, forfeitTitle } from '../../core/partyForfeit';
import { PodiumAward } from '../../core/podiumAward';
import { Haptics } from '../../core/haptics';
import { Sound } from '../../core/sound';
import { useObservable } from '../../core/observable';
import { useAwardOnce } from '../../core/awardOnce';
import type { GameFlowProps } from '../registry';
import { RuleCardEngine, type ActiveRule } from './engine';

/**
 * „მაგიდის წესები“ (House Rules) — სრული ნაკადი.
 *
 * პორტი: `Splash/Games/RuleCard/RuleCardViews.swift`.
 * `rule` ტიპის ბარათი **ბოლომდე რჩება ძალაში** — ეს თამაშის მთელი აზრია.
 */

const CARD_OPTIONS = [0, 20, 30, 45];
const LIMIT_OPTIONS = [4, 6, 8];

/** სიაში სრული წინადადება არ ეტევა — მოკლე სახელი უპირატესია. */
const listLabel = (card: RuleCard) => card.short ?? card.text;

export function RuleCardFlow({ roster, onExit }: GameFlowProps) {
  const [engine] = useState(() => new RuleCardEngine([...roster.players]));
  useObservable(engine);

  switch (engine.phase) {
    case 'setup':
      return <Setup engine={engine} onClose={onExit} />;
    case 'card':
      return <Play engine={engine} onExit={onExit} />;
    case 'summary':
      return <Summary engine={engine} roster={roster} onExit={onExit} />;
  }
}

// ── პარამეტრები

function Setup({ engine, onClose }: { engine: RuleCardEngine; onClose: () => void }) {
  return (
    <View style={{ flex: 1 }}>
      <View style={Layout.header}>
        <ScreenHeader title="House Rules" subtitle="წესები გროვდება" onBack={onClose} />
      </View>

      <ScrollView contentContainerStyle={Layout.scroll}>
        <GlassCard>
          <View style={{ gap: 10 }}>
            <Step n="1" text="ბარათი ან ერთხელ მოქმედებს, ან ბოლომდე რჩება ძალაში." />
            <Step n="2" text="მოქმედი წესები ეკრანზე სიად ჩანს — ვინც დაარღვევს, იხდის." />
            <Step n="3" text="რაც უფრო შორს მიდის თამაში, მით უფრო აბსურდულად ლაპარაკობს მაგიდა." />
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>რა მოსდევს დარღვევას</Text>
            {PARTY_FORFEITS.map((option) => (
              <RadioRow
                key={option}
                title={forfeitTitle[option]}
                subtitle={forfeitNote[option]}
                selected={engine.settings.forfeit === option}
                onPress={() => engine.setForfeit(option)}
              />
            ))}
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>რამდენი ბარათი</Text>
            <View style={Layout.chipRow}>
              {CARD_OPTIONS.map((count) => (
                <CategoryChip
                  key={count}
                  label={count === 0 ? 'სანამ მოგბეზრდებათ' : String(count)}
                  selected={engine.settings.cards === count}
                  onPress={() => engine.setCards(count)}
                />
              ))}
            </View>
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>წესების ჭერი</Text>
            <View style={Layout.segmentRow}>
              {LIMIT_OPTIONS.map((n) => (
                <CategoryChip
                  compact
                  key={n}
                  label={String(n)}
                  selected={engine.settings.ruleLimit === n}
                  onPress={() => engine.setRuleLimit(n)}
                />
              ))}
            </View>
            <Text style={[caption(11), { color: Colors.textSecondary }]}>
              ჭერზე მისვლისას მოდის „შვება“ — ერთი წესი უქმდება. თორემ წესები უსასრულოდ გროვდება.
            </Text>
          </View>
        </GlassCard>
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

function Step({ n, text }: { n: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
      <View style={styles.stepBadge}>
        <Text style={[body(12, '900'), { color: Colors.ink }]}>{n}</Text>
      </View>
      <Text style={[body(14, '500'), { color: Colors.textSecondary, flex: 1 }]}>{text}</Text>
    </View>
  );
}

// ── ბარათი

function Play({ engine, onExit }: { engine: RuleCardEngine; onExit: () => void }) {
  const [charged, setCharged] = useState<Set<string>>(new Set());
  const card = engine.currentCard;
  const isRule = card.kind === 'rule';
  const isRelief = card.kind === 'relief';

  // ახალი ბარათი — ჯარიმების არჩევანი იწმინდება.
  useEffect(() => {
    setCharged(new Set());
  }, [card.text]);

  const tint = isRule ? Colors.neonMagenta : isRelief ? Colors.neonCyan : Colors.phosphor;

  return (
    <View style={{ flex: 1, gap: 12 }}>
      <View style={Layout.topBar}>
        <GameExitButton onExit={onExit} />
        <Text style={[body(13, '700'), Layout.digits, { color: Colors.textSecondary }]}>
          {engine.settings.cards > 0 ? `ბარათი ${engine.drawn} / ${engine.settings.cards}` : `ბარათი ${engine.drawn}`}
        </Text>
        <View style={{ flex: 1 }} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="სხვა ბარათი"
          onPress={() => engine.swapCard()}
          style={styles.pill}
        >
          <MaterialCommunityIcons name={sf('shuffle')} size={12} color={Colors.textSecondary} />
          <Text style={[body(12, '700'), { color: Colors.textSecondary }]}>სხვა</Text>
        </Pressable>
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
              <MaterialCommunityIcons name="check-decagram" size={11} color={Colors.neonMagenta} />
              <Text style={[body(12, '700'), { color: Colors.neonMagenta }]} numberOfLines={1}>
                {listLabel(rule.card)}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={{ flex: 1 }} />

      <View style={{ paddingHorizontal: 20 }}>
        <View style={[styles.cardFace, { borderColor: tint + '57' }]}>
          <View style={[styles.kindBadge, { backgroundColor: tint }]}>
            <MaterialCommunityIcons name={sf(ruleKindIcon[card.kind])} size={13} color={Colors.ink} />
            <Text style={[body(12, '900'), { color: Colors.ink }]}>{ruleKindLabel[card.kind]}</Text>
          </View>

          <Text
            style={[titleFont(22), Layout.centered, { color: tint, paddingHorizontal: 20 }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {engine.holder?.name ?? '—'}
          </Text>

          <Text
            style={[titleFont(card.text.length > 75 ? 21 : 26), Layout.centered, { color: Colors.textPrimary, paddingHorizontal: 22 }]}
            adjustsFontSizeToFit
            numberOfLines={7}
          >
            {card.text}
          </Text>

          {isRule ? (
            <Text style={[caption(11), { color: Colors.neonMagenta }]}>ბოლომდე მოქმედებს</Text>
          ) : (
            <Text style={[caption(11), { color: Colors.textSecondary, opacity: 0.8 }]}>
              {forfeitShort[engine.settings.forfeit]}
            </Text>
          )}
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
                    onPress={() => engine.removeRule(rule)}
                    style={styles.ruleRow}
                  >
                    <MaterialCommunityIcons name="close-circle" size={17} color={Colors.neonCyan} />
                    <Text style={[body(14, '600'), { color: Colors.textPrimary, flex: 1 }]} numberOfLines={2}>
                      {listLabel(rule.card)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )
        ) : (
          <>
            <View style={{ gap: 6 }}>
              <Text style={[caption(11), Layout.centered, { color: Colors.textSecondary }]}>
                ვინ იხდის? შეეხე სახელს
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {engine.players.map((player) => {
                  const on = charged.has(player.id);
                  return (
                    <Pressable
                      key={player.id}
                      accessibilityRole="button"
                      accessibilityLabel={player.name}
                      accessibilityState={{ selected: on }}
                      onPress={() => {
                        Haptics.tap();
                        setCharged((prev) => {
                          const next = new Set(prev);
                          if (on) next.delete(player.id);
                          else next.add(player.id);
                          return next;
                        });
                      }}
                      style={[styles.nameChip, { backgroundColor: on ? Colors.neonMagenta : Colors.surface }]}
                    >
                      <Text style={[body(13, '700'), { color: on ? Colors.ink : Colors.textPrimary }]} numberOfLines={1}>
                        {player.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <PrimaryButton
              title={charged.size === 0 ? 'არავინ დაირღვია' : 'დაფიქსირდა — შემდეგი'}
              icon={charged.size === 0 ? 'checkmark' : 'chevron.right'}
              tint={Colors.phosphor}
              onPress={() =>
                charged.size === 0
                  ? engine.markDone()
                  : engine.finishForfeits(engine.players.filter((p) => charged.has(p.id)))
              }
            />
          </>
        )}

        {engine.settings.cards === 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              Haptics.tap();
              engine.finishNow();
            }}
            style={{ alignItems: 'center', paddingTop: 4 }}
          >
            <Text style={[body(13, '700'), { color: Colors.textSecondary }]}>დასრულება</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// ── შეჯამება

function Summary({
  engine,
  roster,
  onExit,
}: {
  engine: RuleCardEngine;
  roster: GameFlowProps['roster'];
  onExit: () => void;
}) {

  useAwardOnce(() => {
    Sound.play('win');
    Haptics.win();
    PodiumAward.apply(engine.results, roster);
  });

  const lawmaker = engine.lawmaker;
  const worst = engine.mostForfeits;
  const forfeitLine =
    worst.length > 0 && engine.forfeitCount(worst[0]) > 0
      ? `ყველაზე ხშირად იხადა — ${worst.map((p) => p.name).join(', ')} (${engine.forfeitCount(worst[0])})`
      : null;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, gap: 14 }}>
        <View style={{ flex: 1 }} />

        <View style={{ alignItems: 'center' }}>
          <GlyphIcon name="checklist" size={31} tint={Colors.neonMagenta} />
        </View>

        <Text style={[titleFont(27), Layout.centered, { color: Colors.neonMagenta, paddingHorizontal: 24 }]}>
          {lawmaker === null ? 'წესი არავის შემოუტანია' : 'მაგიდის კანონმდებელი'}
        </Text>

        {lawmaker ? (
          <Text style={[body(15, '600'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
            {lawmaker.name} — {engine.broughtCount(lawmaker)} შემოტანილი წესი
          </Text>
        ) : null}

        {forfeitLine ? (
          <Text
            style={[body(13, '600'), Layout.centered, { color: Colors.textSecondary, opacity: 0.9, paddingHorizontal: 32 }]}
          >
            {forfeitLine}
          </Text>
        ) : null}

        {engine.activeRules.length > 0 ? (
          <View style={{ gap: 5, paddingHorizontal: 28 }}>
            <Text style={[caption(11), Layout.centered, { color: Colors.textSecondary }]}>
              ბოლოს ეს წესები მოქმედებდა
            </Text>
            {engine.activeRules.map((rule) => (
              <Text
                key={rule.id}
                style={[body(13, '500'), Layout.centered, { color: Colors.textPrimary }]}
                numberOfLines={1}
              >
                • {listLabel(rule.card)}
              </Text>
            ))}
          </View>
        ) : null}

        <ScrollView contentContainerStyle={[Layout.content, { gap: 8 }]}>
          {engine.ranking.map((player, rank) => {
            const forfeits = engine.forfeitCount(player);
            return (
              <View
                key={player.id}
                style={[styles.summaryRow, { backgroundColor: rank === 0 ? Colors.neonMagenta + '24' : Colors.surface }]}
              >
                <Text style={[body(16, '900'), { color: Colors.textSecondary, width: 30 }]}>{rank + 1}</Text>
                <Text style={[body(16, '600'), { color: Colors.textPrimary, flex: 1 }]} numberOfLines={1}>
                  {player.name}
                </Text>
                {forfeits > 0 ? (
                  <Text style={[caption(10), { color: Colors.textSecondary }]}>{forfeits} ჯარიმა</Text>
                ) : null}
                <Text
                  style={[titleFont(20), Layout.digits, { color: rank === 0 ? Colors.neonMagenta : Colors.textPrimary }]}
                >
                  {engine.broughtCount(player)}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        <View style={Layout.footer}>
          <PrimaryButton
            title="თავიდან"
            icon="arrow.clockwise"
            tint={Colors.neonMagenta}
            onPress={() => {
              engine.restart();
            }}
          />
          <GhostButton
            title="პარამეტრები"
            icon="slider.horizontal.3"
            onPress={() => {
              engine.backToSetup();
            }}
          />
          <GhostButton title="დასრულება" icon="xmark" onPress={onExit} />
        </View>
      </View>

      {lawmaker ? <Confetti /> : null}
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
    backgroundColor: Colors.neonMagenta,
  },
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
    paddingVertical: 30,
    borderRadius: 30,
    backgroundColor: Colors.surface,
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
  nameChip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999 },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Space.m,
    paddingVertical: 13,
    borderRadius: Radius.small,
  },
});
