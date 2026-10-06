import { useEffect } from 'react';
import { createAudioPlayer } from 'expo-audio';
import { Sound } from '../../core/sound';

/**
 * მაფიის წამყვანი — აპი ღამით ხმამაღლა აღვიძებს და აძინებს როლებს.
 *
 * ტექსტი ეკრანზეც ყოველთვის ჩანს. ჩაწერილი ხმა (`VOICE`) ემატება, როცა
 * ფაილი არსებობს: `assets/voice/mafia/<key>.m4a`. სანამ ფაილი არ არის,
 * მის ნაცვლად ზარი ისმის.
 */

export type NarrationKey =
  | 'citySleep'
  | 'mafiaWake'
  | 'mafiaSleep'
  | 'doctorWake'
  | 'doctorSleep'
  | 'detectiveWake'
  | 'detectiveSleep'
  | 'cityWake';

export const NARRATION: Record<NarrationKey, string> = {
  citySleep: 'ქალაქს სძინავს. დახუჭეთ თვალები.',
  mafiaWake: 'მაფია, გაიღვიძეთ და აირჩიეთ მსხვერპლი.',
  mafiaSleep: 'მაფია, დაიძინეთ.',
  doctorWake: 'ექიმო, გაიღვიძე. ვის გადაარჩენ?',
  doctorSleep: 'ექიმო, დაიძინე.',
  detectiveWake: 'დეტექტივო, გაიღვიძე. ვის შეამოწმებ?',
  detectiveSleep: 'დეტექტივო, დაიძინე.',
  cityWake: 'ქალაქო, გაიღვიძე!',
};

/** ჩაწერილი ფრაზები — `require('../../../assets/voice/mafia/<key>.m4a')`. */
const VOICE: Partial<Record<NarrationKey, number>> = {};

export function narrate(key: NarrationKey): void {
  const source = VOICE[key];
  if (source === undefined) {
    Sound.play('reveal');
    return;
  }
  try {
    const player = createAudioPlayer(source);
    player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) player.remove();
    });
    player.play();
  } catch {
    Sound.play('reveal');
  }
}

const NIGHT_MUSIC = require('../../../assets/music/mafia-night.m4a');
/** ფონური მუსიკის ხმამაღლობა — წამყვანის ფრაზები და ზარი ზემოდან უნდა ისმოდეს. */
const NIGHT_MUSIC_VOLUME = 0.35;

/** ღამის ფონური მუსიკა: ეკრანის გაჩენისას ირთვება და გამეორებით უკრავს, გაქრობისას ჩერდება. */
export function useNightMusic(): void {
  useEffect(() => {
    if (!Sound.isEnabled) return;
    Sound.preload(); // ხმის რეჟიმი: ჩუმ რეჟიმშიც ისმის და სხვა მუსიკას არ აჩერებს
    let player: ReturnType<typeof createAudioPlayer> | null = null;
    try {
      player = createAudioPlayer(NIGHT_MUSIC);
      player.loop = true;
      player.volume = NIGHT_MUSIC_VOLUME;
      player.play();
    } catch {
      player = null;
    }
    return () => {
      try {
        player?.pause();
        player?.remove();
      } catch {
        /* ignore */
      }
    };
  }, []);
}
