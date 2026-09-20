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
const MASTER = 0.55;

/**
 * ტემბრები — [ჰარმონიკის ჯერადი, ხმა, მილევის ჯერადი].
 *
 * ერთი სინუსი „ელექტრონულად“ ჟღერს, რადგან ბუნებაში ბგერას ყოველთვის
 * ახლავს ზედა ტონები, და ისინი უფრო სწრაფად ქრებიან, ვიდრე ფუნდამენტი —
 * სწორედ ეს აძლევს ხმას სხეულს და „ხის“ ხასიათს.
 */
const TIMBRE = {
  /** რბილი — სინუსი სუსტი მეორე ჰარმონიკით. */
  soft: [[1, 1, 1], [2, 0.16, 1.7]],
  /** ზარი/ქსილოფონი — მდიდარი, მაგრამ არა მჭახე. */
  bell: [[1, 1, 1], [2, 0.38, 1.9], [3, 0.16, 2.7], [4.2, 0.07, 3.6]],
  /** ხე — მოკლე „ტოკ“, არაჰარმონიული ზედა ტონებით. */
  wood: [[1, 1, 1], [2.7, 0.45, 2.3], [5.1, 0.2, 3.5]],
  /** ბასი — დარტყმის სხეული. */
  sub: [[1, 1, 1], [2, 0.22, 1.5]],
};

/** ერთი ხმა: სიხშირე, ხანგრძლივობა, ხმა, მილევა, ტემბრი, დაწყება, სრიალი. */
const V = (frequency, duration, amplitude, decay, timbre = 'soft', start = 0, glide = 1) =>
  ({ frequency, duration, amplitude, decay, timbre, start, glide });

const EFFECTS = {
  // ტკაცუნი — soft, high-pitched bell ping (C6), very short, pleasant.
  tick: [V(1046, 0.06, 0.4, 28, 'bell')],

  // ცხელი ტკაცუნი — higher pitch (G6/C7), adds urgency but stays pleasant.
  tickHot: [V(1567, 0.06, 0.5, 30, 'bell'), V(2093, 0.04, 0.2, 40, 'soft')],

  // აფეთქება — low thump + airy falling harmonic. Fun, not scary.
  boom: [
    V(120, 0.4, 0.7, 7, 'sub', 0, 0.3),
    V(60, 0.5, 0.6, 5, 'sub', 0, 0.5),
    V(280, 0.3, 0.3, 10, 'soft', 0, 0.4),
  ],

  // სწორი პასუხი — brighter major arpeggio.
  correct: [
    V(784, 0.16, 0.42, 12, 'bell'),
    V(1046, 0.18, 0.42, 11, 'bell', 0.06),
    V(1318, 0.35, 0.38, 8.5, 'bell', 0.12),
  ],

  // შეცდომა — descending 3-note "wah-wah" with more humor.
  wrong: [
    V(349, 0.15, 0.5, 12, 'soft', 0, 0.85),
    V(311, 0.15, 0.5, 12, 'soft', 0.13, 0.85),
    V(277, 0.3, 0.5, 10, 'soft', 0.26, 0.7),
  ],

  // გახსნა — rising shimmer, 3 notes, more magical.
  reveal: [
    V(587, 0.25, 0.32, 10, 'bell'),
    V(880, 0.25, 0.28, 9, 'bell', 0.06),
    V(1174, 0.4, 0.25, 8, 'bell', 0.12),
  ],

  // დაწყება — energetic 4-note ascending fanfare.
  start: [
    V(523, 0.1, 0.36, 18, 'bell'),
    V(659, 0.1, 0.38, 17, 'bell', 0.05),
    V(784, 0.1, 0.4, 15, 'bell', 0.1),
    V(1046, 0.3, 0.42, 10, 'bell', 0.15),
  ],

  // გამარჯვება — elaborate celebration, 5 notes with final flourish.
  win: [
    V(523, 0.12, 0.34, 16, 'bell'),
    V(659, 0.12, 0.36, 15, 'bell', 0.09),
    V(784, 0.12, 0.38, 14, 'bell', 0.18),
    V(659, 0.12, 0.36, 15, 'bell', 0.27),
    V(1046, 0.6, 0.42, 5, 'bell', 0.36),
  ],
};

const ATTACK = 0.005;   // 5 მწმ შესვლა — თორემ დასაწყისში ტკაცუნი ისმის
const RELEASE = 0.012;  // 12 მწმ ჩაქრობა — თორემ ბოლოში წყდება

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
