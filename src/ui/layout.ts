import { StyleSheet } from 'react-native';
import { Space } from '../theme/theme';

/**
 * თამაშის ეკრანების საერთო განლაგება.
 *
 * **რას ასწორებს.** ოცდაორივე Flow ერთსა და იმავე რვა სტილს თავისთვის წერდა და
 * ისინი ნელ-ნელა დაშორდნენ: ბარათები 20-ზე იდგა, ქვედა ღილაკი 24-ზე, ზედა
 * ზოლი ზოგან 20-ზე, ზოგან 24-ზე, exit ღილაკი კი 10-ზე — ერთი თამაშის შიგნით
 * ეკრანიდან ეკრანზე ყველაფერი რამდენიმე პიქსელით „ხტებოდა“.
 *
 * ერთი გვერდითი დაშორება ({@link GUTTER}) ყველა ეკრანზე: ჰედერი, ბარათები,
 * ბადეები და ღილაკები ერთ ვერტიკალურ ხაზზე დგანან.
 */
export const GUTTER = 20;

export const Layout = StyleSheet.create({
  /** `ScreenHeader`-ის შემომსაზღვრელი — Setup ეკრანის თავი. */
  header: { paddingHorizontal: GUTTER, paddingTop: 8 },
  /** Setup ეკრანის `ScrollView`-ს `contentContainerStyle`. */
  scroll: { paddingHorizontal: GUTTER, paddingTop: Space.m, paddingBottom: Space.l, gap: 14 },
  /** არჩევანის ჩიპების რიგი ბარათის შიგნით — გრძელი წარწერები, იშლება. */
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  /** მოკლე ვარიანტების ერთი რიგი — `CategoryChip compact`-ით, თანაბარი სიგანეები. */
  segmentRow: { flexDirection: 'row', gap: 8 },
  /** ქვედა ღილაკები — ბარათებთან ერთ სიგანეზე. */
  footer: { paddingHorizontal: GUTTER, paddingBottom: Space.m, gap: 10 },
  /** თამაშის ეკრანის ზედა ზოლი: exit ღილაკი + მრიცხველები. */
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: GUTTER, paddingTop: Space.m },
  /** exit ღილაკი ზოლის გარეშე ეკრანზე — ზუსტად იქ, სადაც `topBar`-ში იდგებოდა. */
  exitSlot: { position: 'absolute', top: Space.m, left: GUTTER, zIndex: 10 },
  /** შიგთავსის ბლოკი თამაშის ეკრანზე (ბარათი, ბადე) — იგივე გვერდითი დაშორება. */
  content: { paddingHorizontal: GUTTER },
  /** სახელების ბადე — ხმის მიცემა, სამიზნის არჩევა. */
  nameGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: GUTTER, paddingVertical: 8 },
  centered: { textAlign: 'center' },
  digits: { fontVariant: ['tabular-nums'] },
  struck: { textDecorationLine: 'line-through' },
});
