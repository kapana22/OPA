import { useRouter } from 'expo-router';
import type { PartyGame } from '../games/types';
import { useNightLog, useRecentGames, useRoster } from './state';
import { useDialog } from '../ui/Dialog';

/**
 * თამაშის გახსნა ერთი ადგილიდან — მთავარი ეკრანიც და „ყველა თამაში“-ც ერთსა
 * და იმავე კარს იყენებენ: ცოტანი ხართ → დიალოგი; თორემ ჟურნალში ჩაწერა და
 * გადასვლა. ორ ეკრანზე ერთი და იგივე ლოგიკა თავიდან რომ არ დაწერილიყო.
 */
export function useOpenGame(): (game: PartyGame) => void {
  const router = useRouter();
  const roster = useRoster();
  const night = useNightLog();
  const recent = useRecentGames();
  const dialog = useDialog();

  return (game: PartyGame) => {
    if (game.comingSoon) {
      router.push(`/rules/${game.id}`);
      return;
    }
    if (roster.count < game.minPlayers) {
      dialog({
        title: 'ჯერ ცოტანი ხართ',
        message: `${game.title} — მინიმუმ ${game.minPlayers} მოთამაშე სჭირდება.`,
        actions: [
          { label: 'მოთამაშეების დამატება', primary: true, onPress: () => router.push('/players') },
          { label: 'კარგი' },
        ],
      });
      return;
    }
    recent.record(game.id);
    night.record(game.id);
    router.push(`/game/${game.id}`);
  };
}
