import { useRef, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Colors, body, title as titleFont } from '../theme/theme';
import { getJSON, setJSON } from '../core/storage';
import { Haptics } from '../core/haptics';
import { SplashBackground } from './SplashBackground';
import { GlyphIcon } from './Cards';
import { PrimaryButton } from './Buttons';
import { Pressable } from './Pressable';

/**
 * პირველი გაშვების სამი ეკრანი. ერთხელ ჩანს, შემდეგ აღარასდროს.
 *
 * პორტი: `Splash/App/OnboardingView.swift` — ტექსტები ერთი-ერთზეა.
 */

const KEY = 'splash.onboarded.v1';

export const Onboarded = {
  get done(): boolean {
    return getJSON<boolean>(KEY, false) === true;
  },
  finish(): void {
    setJSON(KEY, true);
  },
};

const PAGES = [
  {
    icon: 'circle.hexagongrid.fill',
    title: 'ერთი ტელეფონი,\nმთელი კომპანია',
    text: 'წვეულების თამაშები, სადაც ტელეფონი წრეზე გადადის. სხვა არაფერი დაგჭირდებათ — არც მაგიდა, არც კალამი.',
    tint: Colors.phosphor,
  },
  {
    icon: 'person.2.fill',
    title: 'სახელებს ერთხელ\nწერ და მორჩა',
    text: 'ერთი სია ყველა თამაშს ემსახურება, ქულებიც ერთ ტაბლოზე გროვდება.',
    tint: Colors.softLavender,
  },
  {
    icon: 'wifi.slash',
    title: 'ინტერნეტი\nარ დაგჭირდება',
    text: 'ყველა სიტყვა და კითხვა უკვე ტელეფონშია — იმუშავებს მთაშიც, თვითმფრინავშიც და იქაც, სადაც ქსელი არ იჭერს.',
    tint: Colors.softLavender,
  },
] as const;

function Dot({ active, tint }: { active: boolean; tint: string }) {
  const style = useAnimatedStyle(() => ({
    width: withSpring(active ? 22 : 7, { damping: 16, stiffness: 220 }),
    backgroundColor: active ? tint : Colors.stroke,
  }));
  return <Animated.View style={[styles.dot, style]} />;
}

export function Onboarding({ onFinish }: { onFinish: () => void }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scroller = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const last = page === PAGES.length - 1;
  const tint = PAGES[page].tint;

  const finish = () => {
    Onboarded.finish();
    onFinish();
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== page) {
      Haptics.tap();
      setPage(next);
    }
  };

  const next = () => {
    if (last) return finish();
    scroller.current?.scrollTo({ x: (page + 1) * width, animated: true });
    setPage(page + 1);
  };

  return (
    <View style={{ flex: 1 }}>
      <SplashBackground home />
      <View style={{ flex: 1, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }}>
        <View style={{ alignItems: 'center' }}>
          <Image source={require('../../assets/Logo.png')} style={{ height: 48, width: 140 }} resizeMode="contain" />
        </View>

        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
          style={{ flexGrow: 0, marginTop: 'auto' }}
        >
          {PAGES.map((p, i) => (
            <View key={i} style={[styles.page, { width }]}>
              <GlyphIcon name={p.icon} size={40} tint={p.tint} />
              <Text style={[titleFont(30), styles.title]}>{p.title}</Text>
              <Text style={[body(16, '500'), styles.text]}>{p.text}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.dots}>
          {PAGES.map((_, i) => (
            <Dot key={i} active={i === page} tint={tint} />
          ))}
        </View>

        <View style={{ marginTop: 'auto', paddingHorizontal: 28, gap: 4 }}>
          <PrimaryButton
            title={last ? 'დავიწყოთ' : 'შემდეგი'}
            icon={last ? 'checkmark' : 'arrow.right'}
            tint={tint}
            onPress={next}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="გამოტოვება"
            disabled={last}
            onPress={finish}
            style={[styles.skip, { opacity: last ? 0 : 1 }]}
          >
            <Text style={[body(14, '600'), { color: Colors.textSecondary }]}>გამოტოვება</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { alignItems: 'center', gap: 20, paddingHorizontal: 36 },
  title: { color: Colors.textPrimary, textAlign: 'center' },
  text: { color: Colors.textSecondary, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 7, justifyContent: 'center', marginTop: 24 },
  dot: { height: 7, borderRadius: 4 },
  skip: { alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 20 },
});
