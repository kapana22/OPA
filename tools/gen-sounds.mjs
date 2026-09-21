#!/usr/bin/env node
/**
 * ხმოვანი ეფექტების გენერატორი — `Splash/Core/Sound.swift`-ის სინთეზის პორტი.
 *
 * **რატომ ასე.** iOS-ზე ხმები `AVAudioPCMBuffer`-ში იწერებოდა გაშვებისას და
 * აპს ერთი ბაიტიც არ ემატებოდა. RN-ს კოდიდან PCM-ის სინთეზი არ აქვს, ამიტომ
 * იგივე მათემატიკა **აწყობის დროს** გაგვაქვს: ტალღები ისევ კოდიდან იბადება,
 * უბრალოდ ერთხელ და ადრე. ჩაწერილი ხმა არსად არის.
 *
 * **ტემბრი.** პირველი ვერსია სუფთა სინუსსა და კვადრატულ ტალღას იყენებდა —
 * სინუსი თხელია, კვადრატული კი ჭრის ყურს, და ტკაცუნი 1050/1650 ჰც-ზე
 * წივილად ისმოდა. ახლა თითო ხმას რამდენიმე ჰარმონიკა აქვს, თითოეული თავისი
 * მილევით: ასე ჟღერს ხის ქსილოფონი და ზარი — სხეულიანად, არა წვრილად.
 * ინტერვალებიც მაჟორულია (C–E–G), რომ ეფექტი მხიარული იყოს და არა ნეიტრალური.
 *
 * ცვლილება ხმაში = ამ ფაილის რიცხვის შეცვლა + `node tools/gen-sounds.mjs`.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sfx');
const SAMPLE_RATE = 44100;
/** Swift: `engine.mainMixerNode.outputVolume = 0.55`. */
const MASTER = 0.44;

/**
 * ტემბრები — [ჰარმონიკის ჯერადი, ხმა, მილევის ჯერადი].
 *
 * რბილი, თბილი და სასიამოვნო ტემბრები (მარიმბა, ხე, თბილი ზარი).
 * მაღალი, მჭახე ჰარმონიკები ამოღებულია, რათა ხმა ყურს არ ჭრიდეს.
 */
const TIMBRE = {
  /** რბილი — სუფთა, თბილი სინუსი ნაზი მეორე ჰარმონიკით. */
  soft: [[1, 1, 1], [2, 0.14, 2.2]],
  /** მარიმბა / თბილი ჩაიმი — მდიდარი, მრგვალი, ხავერდოვანი. */
  marimba: [[1, 1, 1], [2, 0.22, 2.4], [3, 0.06, 3.5]],
  /** ხე / პოპ — რბილი ტაქტილური ტოკ, არა-მჭახე. */
  wood: [[1, 1, 1], [2.2, 0.2, 2.8]],
  /** ბასი — რბილი, ღრმა და მრგვალი დარტყმა. */
  sub: [[1, 1, 1], [2, 0.15, 2.0]],
};

/** ერთი ხმა: სიხშირე, ხანგრძლივობა, ხმა, მილევა, ტემბრი, დაწყება, სრიალი. */
const V = (frequency, duration, amplitude, decay, timbre = 'soft', start = 0, glide = 1) =>
  ({ frequency, duration, amplitude, decay, timbre, start, glide });

const EFFECTS = {
  // ტკაცუნი — რბილი, თბილი მარიმბას დაწკაპუნება (C5), მშვიდი და არა-მჭახე.
  tick: [V(523, 0.08, 0.28, 22, 'marimba')],

  // ცხელი ტკაცუნი — ოდნავ ამაღლებული თბილი მარიმბა (E5), მეტი ტემპით, მაგრამ რბილად.
  tickHot: [V(659, 0.08, 0.32, 24, 'marimba'), V(784, 0.05, 0.15, 32, 'soft', 0.01)],

  // აფეთქება — რბილი, ღრმა ბასი და ჰაეროვანი ჩაქრობა, თამაშის მხიარული „ბუმ“.
  boom: [
    V(95, 0.42, 0.55, 6, 'sub', 0, 0.4),
    V(55, 0.48, 0.45, 5, 'sub', 0, 0.6),
    V(180, 0.22, 0.2, 12, 'soft', 0, 0.4),
  ],

  // სწორი პასუხი — თბილი, მუსიკალური მაჟორული არპეჯიო (C5–E5–G5).
  correct: [
    V(523, 0.14, 0.35, 14, 'marimba'),
    V(659, 0.16, 0.35, 12, 'marimba', 0.06),
    V(784, 0.3, 0.32, 9, 'marimba', 0.12),
  ],

  // შეცდომა — რბილი, მეგობრული დაბალი ორმაგი ტონალობა (A3–F#3).
  wrong: [
    V(261, 0.14, 0.38, 12, 'soft', 0, 0.9),
    V(220, 0.25, 0.35, 10, 'soft', 0.11, 0.8),
  ],

  // გახსნა — ნაზი, ჰაეროვანი ამომავალი ჩაიმი.
  reveal: [
    V(440, 0.22, 0.26, 11, 'marimba'),
    V(554, 0.22, 0.24, 10, 'marimba', 0.06),
    V(659, 0.35, 0.22, 8, 'marimba', 0.12),
  ],

  // დაწყება — თბილი, ენერგიული 4-ნოტიანი მაჟორული მისალმება.
  start: [
    V(440, 0.1, 0.3, 18, 'marimba'),
    V(554, 0.1, 0.32, 17, 'marimba', 0.05),
    V(659, 0.1, 0.34, 15, 'marimba', 0.1),
    V(880, 0.26, 0.35, 11, 'marimba', 0.15),
  ],

  // გამარჯვება — საზეიმო, მრგვალი და მდიდარი აკორდები.
  win: [
    V(440, 0.12, 0.3, 16, 'marimba'),
    V(554, 0.12, 0.32, 15, 'marimba', 0.08),
    V(659, 0.12, 0.34, 14, 'marimba', 0.16),
    V(554, 0.1, 0.3, 16, 'marimba', 0.24),
    V(880, 0.5, 0.36, 6, 'marimba', 0.32),
  ],
};

const ATTACK = 0.008;   // 8 მწმ შესვლა — რბილი შემოსვლა ტკაცუნის გარეშე
const RELEASE = 0.018;  // 18 მწმ ჩაქრობა — ბუნებრივი, გლუვი მილევა

function render(voices) {
  const length = Math.max(...voices.map((v) => v.start + v.duration));
  const frames = Math.ceil(length * SAMPLE_RATE);
  const out = new Float32Array(frames);

  for (const voice of voices) {
    const partials = TIMBRE[voice.timbre];
    const from = Math.floor(voice.start * SAMPLE_RATE);
    const count = Math.floor(voice.duration * SAMPLE_RATE);
    // ფაზა ცალკე გვინდა — სრიალისას სიხშირე იცვლება და `f · t` ტეხს ტალღას.
    const phases = new Float64Array(partials.length);

    for (let i = 0; i < count; i++) {
      const frame = from + i;
      if (frame >= frames) break;
      const local = i / SAMPLE_RATE;
      const progress = local / voice.duration;
      // სრიალი ლოგარითმულია — ასე ისმის თანაბრად, როგორც მუსიკალური გლისანდო.
      const frequency = voice.frequency * Math.pow(voice.glide, progress);

      const attack = Math.min(1, local / ATTACK);
      const left = voice.duration - local;
      const release = Math.min(1, left / RELEASE);

      let sample = 0;
      for (let p = 0; p < partials.length; p++) {
        const [ratio, gain, decayScale] = partials[p];
        phases[p] += (2 * Math.PI * frequency * ratio) / SAMPLE_RATE;
        sample += Math.sin(phases[p]) * gain * Math.exp(-local * voice.decay * decayScale);
      }
      out[frame] += sample * voice.amplitude * attack * release;
    }
  }

  // უსაფრთხოების ზღვარი — ჰარმონიკები ერთმანეთს ემატება და პიკი შეიძლება
  // ერთს გადასცდეს; შეკვეცის ნაცვლად მთელ ტალღას ვწევთ, რომ დამახინჯება არ იყოს.
  let peak = 0;
  for (const s of out) peak = Math.max(peak, Math.abs(s));
  const safety = peak > 0.92 ? 0.92 / peak : 1;
  for (let i = 0; i < frames; i++) out[i] *= safety * MASTER;
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
