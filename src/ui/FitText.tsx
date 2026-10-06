import { Text, type TextProps } from 'react-native';

/**
 * დიდი სიტყვა ან ფრაზა, რომელიც **სიტყვის შუაში არასდროს იჭრება**.
 *
 * ხაზების რაოდენობა სიტყვების რაოდენობას არ აჭარბებს: ერთი სიტყვა — ერთი
 * ხაზი. თუ არ ეტევა, შრიფტი პატარავდება (`adjustsFontSizeToFit`), ტელეფონი
 * კი „მოუთმენ / ლობა“-ს აღარ დაწერს.
 */
export function FitText({
  children,
  maxLines = 4,
  ...rest
}: Omit<TextProps, 'numberOfLines' | 'adjustsFontSizeToFit' | 'children'> & { children: string; maxLines?: number }) {
  const words = children.trim().split(/\s+/).filter(Boolean).length;
  return (
    <Text
      {...rest}
      numberOfLines={Math.max(1, Math.min(maxLines, words))}
      adjustsFontSizeToFit
      minimumFontScale={0.3}
      textBreakStrategy="simple"
    >
      {children}
    </Text>
  );
}
