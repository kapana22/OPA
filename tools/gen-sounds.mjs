#!/usr/bin/env node
/**
 * ხმოვანი ეფექტების გენერატორი — `Splash/Core/Sound.swift`-ის სინთეზის პორტი.
 *
 * **რატომ ასე.** iOS-ზე ხმები `AVAudioPCMBuffer`-ში იწერებოდა გაშვებისას და
 * აპს ერთი ბაიტიც არ ემატებოდა. RN-ს კოდიდან PCM-ის სინთეზი არ აქვს, ამიტომ
 * იგივე მათემატიკა **აწყობის დროს** გაგვაქვს: ტალღები ისევ კოდიდან იბადება,
 * უბრალოდ ერთხელ და ადრე. ჩაწერილი ხმა არსად არის.
 *
 * ცვლილება ხმაში = ამ ფაილის რიცხვის შეცვლა + `npm run gen:sounds`.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sfx');
const SAMPLE_RATE = 44100;
/** Swift: `engine.mainMixerNode.outputVolume = 0.55` — ჩაშენებულია, რომ დაკვრა მარტივი იყოს. */
const MASTER = 0.55;

/** ერთი ტონი: სიხშირე, დაწყება, ხანგრძლივობა, ხმა, მილევა, კვადრატულობა. */
const T = (frequency, duration, amplitude = 0.6, decay = 18, square = false, start = 0) =>
  ({ frequency, duration, amplitude, decay, square, start });

// Swift-ის `tones(for:)` — ერთი-ერთზე.
const EFFECTS = {
  tick:    [T(1050, 0.07, 0.62, 52, true)],
  tickHot: [T(1650, 0.08, 0.78, 46, true)],
  boom:    [T(90, 0.55, 0.6, 7), T(55, 0.6, 0.45, 5), T(180, 0.25, 0.3, 14, true, 0.01)],
  correct: [T(880, 0.12, 0.45, 26), T(1320, 0.16, 0.45, 22, false, 0.07)],
  wrong:   [T(320, 0.16, 0.7, 20, true), T(220, 0.2, 0.6, 16, true, 0.08)],
  reveal:  [T(520, 0.18, 0.35, 16), T(780, 0.22, 0.3, 14, false, 0.06)],
  start:   [T(660, 0.12, 0.4, 24), T(990, 0.18, 0.42, 20, false, 0.09)],
  win:     [T(660, 0.14, 0.4, 20), T(880, 0.14, 0.42, 20, false, 0.11), T(1320, 0.34, 0.45, 10, false, 0.22)],
};

function render(voices) {
  const length = Math.max(...voices.map((v) => v.start + v.duration));
  const frames = Math.floor(length * SAMPLE_RATE);
  const out = new Float32Array(frames);

  for (let frame = 0; frame < frames; frame++) {
    const t = frame / SAMPLE_RATE;
    let sample = 0;
    for (const tone of voices) {
      const local = t - tone.start;
      if (local < 0 || local > tone.duration) continue;
      const envelope = Math.exp(-local * tone.decay);
      // 4 მილიწამიანი შესვლა — თორემ დასაწყისში ტკაცუნი ისმის.
      const attack = Math.min(1, local / 0.004);
      const phase = 2 * Math.PI * tone.frequency * local;
      const wave = tone.square ? (Math.sin(phase) >= 0 ? 1 : -1) * 0.55 : Math.sin(phase);
      sample += wave * envelope * attack * tone.amplitude;
    }
    out[frame] = Math.max(-1, Math.min(1, sample)) * MASTER;
  }
  return out;
}

/** 16-ბიტიანი მონო WAV. */
function wav(samples) {
  const dataBytes = samples.length * 2;
  const buf = Buffer.alloc(44 + dataBytes);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataBytes, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);          // PCM chunk size
  buf.writeUInt16LE(1, 20);           // PCM
  buf.writeUInt16LE(1, 22);           // მონო
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32);           // block align
  buf.writeUInt16LE(16, 34);          // bits
  buf.write('data', 36);
  buf.writeUInt32LE(dataBytes, 40);
  for (let i = 0; i < samples.length; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  }
  return buf;
}

mkdirSync(OUT, { recursive: true });
let total = 0;
for (const [name, voices] of Object.entries(EFFECTS)) {
  const data = wav(render(voices));
  writeFileSync(join(OUT, `${name}.wav`), data);
  total += data.length;
  console.log(`  ${name.padEnd(9)} ${(data.length / 1024).toFixed(1).padStart(6)} KB`);
}
console.log(`✅ ${Object.keys(EFFECTS).length} ეფექტი · სულ ${(total / 1024).toFixed(0)} KB · კოდიდან, ჩაწერის გარეშე`);
