import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Space, body, title as titleFont } from '../theme/theme';
import { GamePause } from '../core/ticker';
import { Haptics } from '../core/haptics';
import { Sound } from '../core/sound';
import { PrimaryButton, GhostButton } from './Buttons';
import { GlassCard, GameExitButton } from './Cards';
import { Icon } from './Icon';

/**
 * განხილვის ეტაპი — ტაიმერი, ვინ იწყებს და მოკლე მინიშნებები.
 *
 * პორტი: `Splash/Components/DiscussionPanel.swift`.
 * `seconds === 0` = ტაიმერის გარეშე (მაგიდა თვითონ წყვეტს, როდის დაასრულოს).
 */
export function DiscussionPanel({
  title,
  starterLabel = 'იწყებს',
  starterName,
  seconds,
  tips,
  accent = Colors.neonMagenta,
  actionTitle = 'კენჭისყრა',
  onAction,
  onExit,
}: {
  title: string;
  starterLabel?: string;
  starterName?: string | null;
  seconds: number;
  tips: string[];
  accent?: string;
  actionTitle?: string;
  onAction: () => void;
  onExit?: () => void;
}) {
  const hasTimer = seconds > 0;
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(true);
  const remainingRef = useRef(seconds);

  useEffect(() => {
    setRemaining(seconds);
    remainingRef.current = seconds;
  }, [seconds]);

  useEffect(() => {
    if (!hasTimer || !running) return;
    const handle = setInterval(() => {
      if (remainingRef.current <= 0 || GamePause.isPaused) return;
      remainingRef.current -= 1;
      setRemaining(remainingRef.current);
      if (remainingRef.current === 0) {
        Haptics.error();
        // მაგიდაზე დადებულ ტელეფონზე ვიბრაცია არავის ესმის — ბგერაც საჭიროა.
        Sound.play('boom');
        // ნულზე ათვლა დასრულდა — ინტერვალი ტყუილად აღარ უნდა ტრიალებდეს.
        clearInterval(handle);
      } else if (remainingRef.current <= 5) {
        Haptics.tap();
        Sound.play('tick');
      }
    }, 1000);
    return () => clearInterval(handle);
  }, [hasTimer, running]);

  const clock = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;

  return (
    <View style={styles.root}>
      {onExit ? (
        <View style={styles.exitSlot}>
          <GameExitButton onExit={onExit} />
        </View>
      ) : null}

      <View style={{ flex: 1 }} />

      <Text style={[body(16, '500'), styles.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
        {title}
      </Text>

      {starterName ? (
        <View style={styles.starter}>
          <Text style={[body(13, '700'), { color: Colors.textSecondary }]}>{starterLabel}</Text>
          <Text style={[titleFont(34), styles.centered, { color: Colors.phosphor }]}>{starterName}</Text>
        </View>
      ) : null}

      {hasTimer ? (
        <>
          <Text
            style={[
              styles.clock,
              { color: remaining <= 10 ? Colors.neonMagenta : Colors.textPrimary },
            ]}
          >
            {clock}
          </Text>
          <View style={styles.pauseSlot}>
            <GhostButton
              title={running ? 'პაუზა' : 'გაგრძელება'}
              icon={running ? 'pause.fill' : 'play.fill'}
              onPress={() => setRunning((v) => !v)}
            />
          </View>
        </>
      ) : null}

      <View style={styles.tipsSlot}>
        <GlassCard>
          <View style={{ gap: 8 }}>
            {tips.map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <Icon
                  name={`numeric-${Math.min(i + 1, 9)}-circle` as never}
                  size={17}
                  color={Colors.textSecondary}
                />
                <Text style={[body(14, '500'), { color: Colors.textSecondary, flex: 1 }]}>{tip}</Text>
              </View>
            ))}
          </View>
        </GlassCard>
      </View>

      <View style={{ flex: 1 }} />

      <View style={styles.footer}>
        <PrimaryButton title={actionTitle} icon="hand.raised.fill" tint={accent} onPress={onAction} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: 22 },
  exitSlot: { position: 'absolute', top: 10, left: 20, zIndex: 10 },
  centered: { textAlign: 'center' },
  starter: { alignItems: 'center', gap: 6 },
  clock: { fontSize: 64, fontWeight: '900', textAlign: 'center', fontVariant: ['tabular-nums'] },
  pauseSlot: { paddingHorizontal: 60 },
  tipsSlot: { paddingHorizontal: 24 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  footer: { paddingHorizontal: 24, paddingBottom: Space.m },
});
