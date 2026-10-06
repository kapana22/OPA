import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, title as titleFont } from '../theme/theme';
import { IconButton } from './Buttons';

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
      <IconButton label="უკან" icon="chevron.left" onPress={goBack} />

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
  title: { flex: 1, textAlign: 'center', color: Colors.textPrimary, letterSpacing: 0.6 },
  side: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
