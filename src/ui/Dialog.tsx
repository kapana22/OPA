import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, View } from 'react-native';
import { Colors, Radius, Space, body, title as titleFont } from '../theme/theme';
import { PrimaryButton } from './Buttons';
import { Pressable } from './Pressable';

/**
 * აპისეული დიალოგი — `Alert`-ის ნაცვლად.
 *
 * **რატომ არა `Alert`.** ორივე მისი სახე ტყდება:
 * - `Alert.alert` web-ზე ნატიურ ფანჯარას ხსნის და მთელ გვერდს ბლოკავს;
 * - `Alert.prompt` **მხოლოდ iOS-ზეა** — Android-ზე ჩუმად არაფერს აკეთებს,
 *   ანუ მოთამაშის სახელის შეცვლა იქ საერთოდ არ იმუშავებდა.
 *
 * ეს კომპონენტი სამივე პლატფორმაზე ერთი და იგივეა და აპის თემაშივე ხატავს.
 */

export interface DialogAction {
  label: string;
  /** წამყვანი მოქმედება — ფოსფორის ღილაკი. */
  primary?: boolean;
  destructive?: boolean;
  onPress?: (value: string) => void;
}

interface DialogRequest {
  title: string;
  message?: string;
  actions: DialogAction[];
  /** ტექსტის ველი — თუ მოცემულია, დიალოგი შეკითხვაა. */
  input?: { placeholder?: string; initial?: string };
  /** ნებისმიერი გზით დახურვისას — ღილაკით, ფონზე შეხებით თუ „უკან“-ით. */
  onClose?: () => void;
}

type Show = (request: DialogRequest) => void;

const DialogContext = createContext<Show | null>(null);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<DialogRequest | null>(null);
  const [value, setValue] = useState('');

  // მიმდინარე მოთხოვნა ref-შიც — `onClose` state-ის updater-ში აღარ ეშვება
  // (React მას შეიძლება ორჯერ გაუშვას და პაუზა ორჯერ მოიხსნას).
  const currentRef = useRef<DialogRequest | null>(null);

  const show = useCallback<Show>((next) => {
    // ძველი დიალოგი ახლით იცვლება — მისი `onClose` მაინც უნდა გაეშვას,
    // თორემ მის მიერ დაკავებული პაუზა (`GamePause.hold`) გაჭედილი რჩებოდა.
    const previous = currentRef.current;
    currentRef.current = next;
    previous?.onClose?.();
    setValue(next.input?.initial ?? '');
    setRequest(next);
  }, []);

  const close = useCallback(() => {
    const current = currentRef.current;
    if (!current) return;
    currentRef.current = null;
    setRequest(null);
    current.onClose?.();
  }, []);

  const api = useMemo(() => show, [show]);

  return (
    <DialogContext.Provider value={api}>
      {children}
      <Modal visible={request !== null} transparent animationType="fade" onRequestClose={close}>
        <Pressable
          accessibilityLabel="დახურვა"
          onPress={close}
          style={styles.backdrop}
        >
          {/* შიგთავსზე დაჭერა დიალოგს არ ხურავს */}
          <View style={styles.cardWrap}>
          <Pressable onPress={() => {}} style={styles.card}>
            <Text style={[titleFont(20), styles.centered, { color: Colors.textPrimary }]}>{request?.title}</Text>

            {request?.message ? (
              <Text style={[body(14, '500'), styles.centered, { color: Colors.textSecondary }]}>{request.message}</Text>
            ) : null}

            {request?.input ? (
              <TextInput
                value={value}
                onChangeText={setValue}
                placeholder={request.input.placeholder}
                placeholderTextColor={Colors.textSecondary}
                autoFocus
                maxLength={24}
                style={[body(17, '600'), styles.input, { color: Colors.textPrimary }]}
              />
            ) : null}

            <View style={{ gap: 10, marginTop: Space.xs }}>
              {(request?.actions ?? []).map((action, i) =>
                action.primary ? (
                  <PrimaryButton
                    key={i}
                    title={action.label}
                    tint={action.destructive ? Colors.neonMagenta : Colors.phosphor}
                    onPress={() => {
                      close();
                      action.onPress?.(value);
                    }}
                  />
                ) : (
                  // `GhostButton`-ის ფონი `surface`-ია — დიალოგის ბარათსაც
                  // იგივე ფერი აქვს, ამიტომ იქ ის უბრალოდ ქრებოდა.
                  <Pressable
                    key={i}
                    accessibilityRole="button"
                    accessibilityLabel={action.label}
                    onPress={() => {
                      close();
                      action.onPress?.(value);
                    }}
                    style={styles.secondary}
                  >
                    <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>{action.label}</Text>
                  </Pressable>
                ),
              )}
            </View>
          </Pressable>
          </View>
        </Pressable>
      </Modal>
    </DialogContext.Provider>
  );
}

/** დიალოგის გამოძახება ნებისმიერი ეკრანიდან. */
export function useDialog(): Show {
  const show = useContext(DialogContext);
  if (!show) throw new Error('DialogProvider აკლია');
  return show;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Space.l,
  },
  cardWrap: { width: '100%', maxWidth: 420, alignItems: 'center' },
  card: {
    width: '100%',
    maxWidth: 420,
    gap: Space.s,
    padding: Space.l,
    borderRadius: Radius.default,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  centered: { textAlign: 'center' },
  secondary: {
    paddingVertical: 17,
    borderRadius: Radius.default,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceHigh,
  },
  input: {
    paddingHorizontal: Space.m,
    paddingVertical: 14,
    borderRadius: Radius.small,
    backgroundColor: Colors.surfaceHigh,
    marginTop: Space.xs,
  },
});
