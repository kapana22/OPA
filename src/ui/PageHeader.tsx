import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, title as titleFont } from '../theme/theme';
import { Haptics } from '../core/haptics';
import { Pressable } from './Pressable';
import { Icon } from './Icon';

/** უკან — თუ ისტორია არ არის (ღრმა ბმული), მთავარზე. */
export function useGoBack(): () => void {
  const router = useRouter();
  return () => (router.canGoBack() ? router.back() : router.replace('/'));
}

/**
 * სრულეკრანიანი გვერდის სათაური: მარცხნივ „უკან“, შუაში სათაური.
 *
 * **რატომ.** ადრე ეს ეკრანები ქვემოდან ამოსრიალებულ ფურცლად იხსნებოდა და
 * დასახურად ჩამოსრიალება იყო საჭირო — ეს ყველამ არ იცის, განსაკუთრებით
 * წვეულებაზე, სადაც ტელეფონი ხელიდან ხელში გადადის. ახლა გასასვლელი ყოველთვის
 * ერთ ადგილას, თვალსაჩინოდ დევს.
 */
export function PageHeader({ title, trailing }: { title: string; trailing?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const goBack = useGoBack();

  return (
    <View style={[styles.row, { paddingTop: Math.max(insets.top, 20) + 6 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="უკან"
        hitSlop={10}
        onPress={() => {
          Haptics.tap();
          goBack();
        }}
        style={styles.back}
      >
        <Icon name={'chevron.left'} size={22} color={Colors.textPrimary} />
      </Pressable>

      <Text
        accessibilityRole="header"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={[titleFont(20), styles.title]}
      >
        {title}
      </Text>

      {/* მარჯვენა მხარე — სათაური ზუსტად შუაში რომ დადგეს. */}
      <View style={styles.side}>{trailing}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 10,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.stroke,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, textAlign: 'center', color: Colors.textPrimary, letterSpacing: 0.6 },
  side: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
