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
 * სესია `mixWithOthers`-ია: წვეულებაზე ფონად მუსიკა უკრავს და თამაშმა ის არ
 * უნდა გააჩეროს. Swift-ისგან (`.ambient`) განსხვავებით ხმა **ჩუმ რეჟიმშიც**
 * ისმის — განზრახ; ვისაც არ უნდა, აპის პარამეტრებში თიშავს.
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

interface EffectPlayer {
  player: AudioPlayer;
  request: number;
  active: boolean;
  needsRewind: boolean;
  rewind?: Promise<boolean>;
}
let players: Partial<Record<SoundEffect, EffectPlayer>> = {};

// Share an in-flight rewind: a late stop/finish seek must never reset a new play.
function rewind(state: EffectPlayer): Promise<boolean> {
  if (state.rewind) return state.rewind;
  state.needsRewind = true;
  try {
    state.player.pause(); // Media3 retains playWhenReady after STATE_ENDED.
    state.rewind = state.player.seekTo(0).then(() => {
      state.needsRewind = false;
      return true;
    }, () => false).finally(() => {
      state.rewind = undefined;
    });
    return state.rewind;
  } catch {
    return Promise.resolve(false);
  }
}
let prepared = false;
/** ხმა ჩართულია თუ არა. ნაგულისხმევად — ჩართული. ყოველ ჯერზე იკითხება — იხ. `haptics.ts`. */
function isOn(): boolean {
  return getJSON<boolean>(ENABLED_KEY, true) !== false;
}

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
      const state: EffectPlayer = { player, request: 0, active: true, needsRewind: false };
      players[key] = state;
      try {
        player.addListener('playbackStatusUpdate', (status) => {
          if (status.didJustFinish && state.active) {
            ++state.request;
            void rewind(state);
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
  /**
   * წინასწარ მომზადება გაშვებისას — ადრე პლეერები პირველ `play()`-ზე იქმნებოდა
   * და სესიის პირველი ბგერა (მაგ. „start“) იგვიანებდა.
   */
  preload(): void {
    prepareIfNeeded();
  },

  get isEnabled(): boolean {
    return isOn();
  },

  setEnabled(value: boolean): void {
    setJSON(ENABLED_KEY, value);
    if (!value) Sound.stop();
  },

  play(effect: SoundEffect): void {
    if (!isOn()) return;
    prepareIfNeeded();
    const state = players[effect];
    if (!state) return;
    const request = ++state.request;
    const playIfCurrent = () => {
      if (!state.active || state.request !== request || !isOn()) return;
      try {
        state.needsRewind = true;
        state.player.play();
      } catch { /* An unavailable effect must not interrupt the game. */ }
    };
    if (state.needsRewind || state.rewind) {
      void rewind(state).then((ready) => {
        if (ready) playIfCurrent();
      });
    } else {
      playIfCurrent();
    }
  },

  /** თამაშიდან გამოსვლისას ან ხმის გამორთვისას — ყველაფერი ჩუმდება. */
  stop(): void {
    for (const state of Object.values(players)) {
      if (!state) continue;
      ++state.request;
      void rewind(state);
    }
  },

  /** აპის დახურვისას — ნატიური რესურსების გათავისუფლება. */
  release(): void {
    for (const state of Object.values(players)) {
      if (!state) continue;
      state.active = false;
      ++state.request;
      try {
        state.player.remove();
      } catch { /* ignore */ }
    }
    players = {};
    prepared = false;
  },
};
