import { useEffect, useRef, useState } from 'react';
import Animated, { FadeOutLeft, ReduceMotion } from 'react-native-reanimated';
import { enterUp, listLayout } from '../src/ui/motion';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Space, body, caption, toTT } from '../src/theme/theme';
import { SplashBackground } from '../src/ui/SplashBackground';
import { GlyphIcon } from '../src/ui/Cards';
import { CharacterPicker } from '../src/ui/CharacterPicker';
import { PlayerAvatarView } from '../src/ui/PlayerAvatarView';
import { PrimaryButton } from '../src/ui/Buttons';
import { PageHeader } from '../src/ui/PageHeader';
import { Pressable } from '../src/ui/Pressable';
import { useRoster } from '../src/state/state';
import { MAX_PLAYERS, type Player } from '../src/core/roster';
import { Haptics } from '../src/core/haptics';
import { useDialog } from '../src/ui/Dialog';
import { Icon } from '../src/ui/Icon';

/**
 * პორტი: `Splash/App/PlayersView.swift`.
 *
 * **ერთი განზრახი განსხვავება.** iOS-ზე რიგი `List.onMove`-ით, გადათრევით
 * იცვლებოდა. RN-ში ეს ცალკე ბიბლიოთეკას მოითხოვს; თორმეტკაციან სიაზე
 * ისრები ისეთივე სწრაფია და Android-ზე უფრო ნაცნობიც. რიგის **მნიშვნელობა**
 * უცვლელია — ჯერი სწორედ ამ თანმიმდევრობით ტრიალებს.
 */
export default function Players() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const roster = useRoster();

  const [characterPlayer, setCharacterPlayer] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [reordering, setReordering] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  // ბოლო წაშლილი — ერთი შემთხვევითი შეხება მოთამაშეს ქულიანად არ უნდა კარგავდეს.
  const [removed, setRemoved] = useState<{ player: Player; index: number } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dialog = useDialog();

  useEffect(() => () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }, []);

  const full = roster.count >= MAX_PLAYERS;
  const canAdd = newName.trim().length > 0 && !full;

  const add = () => {
    if (!canAdd) return;
    const result = roster.add(newName);
    if (result === 'added') {
      setNewName('');
      setAddError(null);
      Haptics.medium();
    } else {
      // ადრე ველი მაინც სუფთავდებოდა და „წარმატების“ ვიბრაცია მოდიოდა.
      setAddError(result === 'duplicate' ? 'ეს სახელი უკვე სიაშია' : null);
      Haptics.warning();
    }
  };

  const removePlayer = (player: Player, index: number) => {
    Haptics.warning();
    roster.remove(player.id);
    setRemoved({ player, index });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setRemoved(null), 5000);
  };

  const undoRemove = () => {
    if (!removed) return;
    roster.restore(removed.player, removed.index);
    setRemoved(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    Haptics.tap();
  };

  // `Alert.prompt` მხოლოდ iOS-ზეა — Android-ზე სახელის შეცვლა საერთოდ არ იმუშავებდა.
  // შეცდომა იმავე დიალოგში ჩანს — ადრე დამატების ველის ქვეშ იწერებოდა,
  // ცარიელ სახელზე კი უბრალოდ ვიბრირებდა და არაფერს ამბობდა.
  const rename = (id: string, current: string, error?: string) => {
    dialog({
      title: 'სახელის შეცვლა',
      message: error,
      input: { placeholder: 'სახელი', initial: current },
      actions: [
        {
          label: 'შენახვა',
          primary: true,
          onPress: (value) => {
            if (roster.rename(id, value)) return;
            Haptics.warning();
            rename(id, value, value.trim() ? 'ეს სახელი უკვე სიაშია' : 'სახელი ცარიელია');
          },
        },
        { label: 'გაუქმება' },
      ],
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <SplashBackground />
      <CharacterPicker playerID={characterPlayer} onClose={() => setCharacterPlayer(null)} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, gap: 14 }}
      >
        <PageHeader title={`მოთამაშეები ${roster.count}/${MAX_PLAYERS}`} />

        <View style={styles.addRow}>
          <TextInput
            value={newName}
            onChangeText={(text) => {
              setNewName(text);
              if (addError) setAddError(null);
            }}
            onSubmitEditing={add}
            // ზედიზედ რამდენიმე სახელის შეყვანისას კლავიატურა არ უნდა დაიხუროს.
            submitBehavior="submit"
            editable={!full}
            maxLength={24}
            placeholder={full ? `მაქსიმუმ ${MAX_PLAYERS} მოთამაშე` : 'სახელი'}
            placeholderTextColor={Colors.textSecondary}
            returnKeyType="next"
            style={[body(17, '600'), styles.input, { color: Colors.textPrimary }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="დამატება"
            disabled={!canAdd}
            onPress={add}
            style={[styles.addButton, { backgroundColor: canAdd ? Colors.phosphor : Colors.surfaceHigh }]}
          >
            <Icon name={'plus'} size={20} color={canAdd ? Colors.onAccent : Colors.textSecondary} />
          </Pressable>
        </View>
        {addError ? (
          <Text style={[body(13, '700'), { color: Colors.warning, paddingHorizontal: 20, marginTop: -6 }]}>{addError}</Text>
        ) : null}

        {roster.count === 0 ? (
          <View style={styles.empty}>
            <GlyphIcon name="person.2.fill" size={27} tint={Colors.phosphor} />
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>სია ჯერ ცარიელია</Text>
            <Text style={[body(14, '500'), { color: Colors.textSecondary }]}>
              სამი სახელი მაინც დაამატე და დავიწყოთ
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.hintRow}>
              <Text style={[caption(11), { color: Colors.textSecondary, flex: 1 }]} numberOfLines={3}>
                {reordering ? 'ისრებით დაალაგე სუფრის რიგზე' : 'პერსონაჟის შესაცვლელად შეეხე მის სურათს'}
              </Text>
              {roster.count > 1 ? (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <SmallChip
                    icon="shuffle"
                    label="არევა"
                    onPress={() => {
                      Haptics.medium();
                      roster.shuffleOrder();
                    }}
                  />
                  <SmallChip
                    icon={reordering ? 'checkmark' : 'arrow.up.arrow.down'}
                    label={reordering ? 'მზადაა' : 'დალაგება'}
                    active={reordering}
                    onPress={() => {
                      Haptics.tap();
                      setReordering((v) => !v);
                    }}
                  />
                </View>
              ) : null}
            </View>

            <ScrollView
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
            >
              {roster.players.map((player, index) => (
                <Animated.View
                  key={player.id}
                  entering={enterUp(index)}
                  exiting={FadeOutLeft.duration(220).reduceMotion(ReduceMotion.System)}
                  layout={listLayout}
                  style={styles.row}
                >
                  <Text style={[body(13, '900'), { color: Colors.textSecondary, width: 22 }]}>{index + 1}</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel={`${player.name} — პერსონაჟის შეცვლა`}
                    onPress={() => setCharacterPlayer(player.id)}>
                    <PlayerAvatarView player={player} size={44} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${player.name}. სახელის შესაცვლელად დააჭირე`}
                    onPress={() => rename(player.id, player.name)}
                    style={{ flex: 1 }}
                  >
                    <Text style={[body(17, '600'), { color: Colors.textPrimary }]} numberOfLines={1}>
                      {player.name}
                    </Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`სქესის შეცვლა: ${player.gender === 'girl' ? 'გოგო' : 'ბიჭი'}`}
                    onPress={() => {
                      Haptics.tap();
                      const nextGender = player.gender === 'girl' ? 'boy' : 'girl';
                      roster.setGender(player.id, nextGender);
                    }}
                    style={[
                      styles.genderBadge,
                      player.gender === 'girl' ? styles.genderBadgeGirl : styles.genderBadgeBoy,
                    ]}
                  >
                    <Text style={{ fontSize: 16 }}>{player.gender === 'girl' ? '👧' : '👦'}</Text>
                  </Pressable>

                  {reordering ? (
                    <>
                      <RowIcon
                        name="chevron.left"
                        rotate
                        label={`${player.name} — ზემოთ`}
                        disabled={index === 0}
                        onPress={() => {
                          Haptics.tap();
                          roster.move(index, index - 1);
                        }}
                      />
                      <RowIcon
                        name="chevron.right"
                        rotate
                        label={`${player.name} — ქვემოთ`}
                        disabled={index === roster.count - 1}
                        onPress={() => {
                          Haptics.tap();
                          roster.move(index, index + 1);
                        }}
                      />
                    </>
                  ) : (
                    <RowIcon
                      name="trash"
                      label={`${player.name} — წაშლა`}
                      onPress={() => removePlayer(player, index)}
                    />
                  )}
                </Animated.View>
              ))}
            </ScrollView>
          </>
        )}

        <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 12, gap: 10 }}>
          {removed ? (
            <View style={styles.undoBar}>
              <Text style={[body(14, '600'), { color: Colors.textPrimary, flex: 1 }]} numberOfLines={1}>
                {removed.player.name} წაიშალა
              </Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`${removed.player.name} — დაბრუნება`} onPress={undoRemove} hitSlop={8}>
                <Text style={[body(14, '900'), { color: Colors.phosphor }]}>დაბრუნება</Text>
              </Pressable>
            </View>
          ) : null}
          <PrimaryButton title="მზად ვართ" icon="checkmark" tint={Colors.phosphor} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function SmallChip({
  icon,
  label,
  active,
  onPress,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.smallChip, { backgroundColor: active ? Colors.phosphor : Colors.surface }]}
    >
      <Icon name={icon} size={12} color={active ? Colors.onAccent : Colors.textPrimary} />
      <Text style={[body(11, '800'), { color: active ? Colors.onAccent : Colors.textPrimary, letterSpacing: 0.5, textTransform: 'uppercase' }]}>{toTT(label)}</Text>
    </Pressable>
  );
}

function RowIcon({
  name,
  label,
  onPress,
  disabled,
  rotate,
}: {
  name: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  rotate?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.rowIcon, { opacity: disabled ? 0.3 : 1 }]}
    >
      <Icon
        name={name}
        size={16}
        color={Colors.textSecondary}
        style={rotate ? { transform: [{ rotate: name === 'chevron.left' ? '90deg' : '-90deg' }] } : undefined}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  addRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 8, alignItems: 'center' },
  input: {
    flex: 1,
    paddingHorizontal: Space.m,
    paddingVertical: 14,
    borderRadius: Radius.small,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  addButton: { width: 50, height: 50, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20 },
  smallChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Space.m,
    paddingVertical: 15,
    borderRadius: Radius.small,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  genderBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  genderBadgeGirl: {
    borderColor: 'rgba(250, 95, 173, 0.45)',
    backgroundColor: 'rgba(250, 95, 173, 0.15)',
  },
  genderBadgeBoy: {
    borderColor: 'rgba(39, 201, 255, 0.45)',
    backgroundColor: 'rgba(39, 201, 255, 0.15)',
  },
  undoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Space.m,
    paddingVertical: 12,
    borderRadius: Radius.small,
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  rowIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceHigh },
});
