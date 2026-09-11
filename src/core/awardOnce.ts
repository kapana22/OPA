import { useEffect, useRef } from 'react';

/**
 * შედეგის ეკრანზე ქულა ერთხელ ირიცხება — ხელახალი რენდერი მეორედ არ უნდა
 * დაარიცხოს. ეკრანი თავიდან რომ იხსნება (`restart()` ფაზას ცვლის და
 * კომპონენტს ხელახლა ქმნის), დარიცხვაც თავიდან ხდება — ეს სწორია.
 *
 * ref და არა state: React-ის მკაცრი რეჟიმი ეფექტს ორჯერ უშვებს, ref კი ორივეს
 * უძლებს. ადრე 21 ეკრანს ერთი და იგივე `applied` ბლოკი ჰქონდა გადაწერილი.
 */
export function useAwardOnce(award: () => void): void {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    award();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
