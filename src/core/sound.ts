import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { getJSON, setJSON } from './storage';

/**
 * აპის ხმები — **კოდიდან სინთეზირებული**, ჩაწერილი ერთი ბგერაც არაა.
 *
 * პორტი: `Splash/Core/Sound.swift`. iOS-ზე ტალღები გაშვებისას იწერებოდა
 * `AVAudioPCMBuffer`-ში; RN-ს ეს არ შეუძლია, ამიტომ **იგივე მათემატიკა
 * აწყობის დროს გადის** (`tools/gen-sounds.mjs`) და WAV-ებად ჯდება.
 * ტალღა ისევ კოდიდან იბადება — უბრალოდ ერთხელ და ადრე.
 *
 * სესია `mixWithOthers`-ია და ჩუმ რეჟიმს პატივს სცემს (Swift: `.ambient`):
 * წვეულებაზე ფონად მუსიკა უკრავს და თამაშმა ის არ უნდა გააჩეროს.
 */

export type SoundEffect = 'tick' | 'tickHot' | 'boom' | 'correct' | 'wrong' | 'reveal' | 'start' | 'win';

const SOURCES: Record<SoundEffect, number> = {
  tick: require('../../assets/sfx/tick.wav'),
  tickHot: require('../../assets/sfx/tickHot.wav'),
  boom: require('../../assets/sfx/boom.wav'),
  correct: require('../../assets/sfx/correct.wav'),
  wrong: require('../../assets/sfx/wrong.wav'),
  reveal: require('../../assets/sfx/reveal.wav'),
  start: require('../../assets/sfx/start.wav'),
  win: require('../../assets/sfx/win.wav'),
};

const ENABLED_KEY = 'splash.sound.enabled.v1';

let players: Partial<Record<SoundEffect, AudioPlayer>> = {};
let prepared = false;
/** ხმა ჩართულია თუ არა. ნაგულისხმევად — ჩართული. */
let enabled = getJSON<boolean>(ENABLED_KEY, true);

function prepareIfNeeded(): void {
  if (prepared) return;
  prepared = true;

  // ხმა უნდა ისმოდეს Silent რეჟიმშიც (როცა iPhone დადუმებულია)
  void setAudioModeAsync({
    playsInSilentMode: true,
    interruptionMode: 'mixWithOthers',
    interruptionModeAndroid: 'mixWithOthers',
    shouldPlayInBackground: false,
    allowsRecording: false,
    shouldRouteThroughEarpiece: false,
  }).catch(() => {
    // ხმის რეჟიმის დაყენება არ არის კრიტიკული — თამაში მის გარეშეც უნდა მუშაობდეს.
  });

  for (const key of Object.keys(SOURCES) as SoundEffect[]) {
    try {
      const player = createAudioPlayer(SOURCES[key]);
      players[key] = player;
      try {
        player.addListener('playbackStatusUpdate', (status) => {
          if (status.didJustFinish) {
            void player.seekTo(0).catch(() => {});
          }
        });
      } catch {
        /* ignore */
      }
    } catch {
      // ერთი ეფექტის ჩავარდნამ დანარჩენი არ უნდა წაიღოს.
    }
  }
}

export const Sound = {
  get isEnabled(): boolean {
    return enabled;
  },

  setEnabled(value: boolean): void {
    enabled = value;
    setJSON(ENABLED_KEY, value);
    if (!value) Sound.stop();
  },

  play(effect: SoundEffect): void {
    if (!enabled) return;
    prepareIfNeeded();
    const player = players[effect];
    if (!player) return;
    try {
      if (player.playing) {
        player.pause();
        void player
          .seekTo(0)
          .then(() => {
            try {
              player.play();
            } catch {}
          })
          .catch(() => {
            try {
              player.play();
            } catch {}
          });
      } else {
        // უკვე ნულზეა — მომენტალურად ჩაირთვება ყოველგვარი დაყოვნების გარეშე
        player.play();
      }
    } catch {
      try {
        player.play();
      } catch {}
    }
  },

  /** თამაშიდან გამოსვლისას ან ხმის გამორთვისას — ყველაფერი ჩუმდება. */
  stop(): void {
    for (const player of Object.values(players)) {
      try {
        player?.pause();
      } catch {
        /* ignore */
      }
    }
  },

  /** აპის დახურვისას — ნატიური რესურსების გათავისუფლება. */
  release(): void {
    for (const player of Object.values(players)) {
      try {
        player?.remove();
      } catch {
        /* ignore */
      }
    }
    players = {};
    prepared = false;
  },
};
