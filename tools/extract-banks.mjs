#!/usr/bin/env node
/**
 * კონტენტის ამოღება **პირდაპირ Swift-ის წყაროდან**.
 *
 * **რატომ არა JSON-იდან.** `Splash — კონტენტი.json` Word-ის კორექტურისთვის
 * აიგო და ორ რამეს **კარგავს**: კატეგორიების ემოჯის (111 ცალი) და
 * `PromptRegister`-ს (448 კითხვის ტონი). ერთეულების რაოდენობა ემთხვევა,
 * ატრიბუტები კი — არა. „არაფერი დაიკარგება“ ამას ვერ იტანს.
 *
 * ამიტომ წყარო `Splash/Data/*.swift`-ია. სკრიპტი პატარა Swift-ის
 * ლიტერალების წამკითხველია: სტრიქონებს, ფრჩხილებს და enum-ის წერტილოვან
 * ჩანაწერებს იცნობს — იმდენს, რამდენიც ამ ბაზებს სჭირდებათ.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DATA = join(ROOT, 'Splash', 'Data');
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content', 'banks.generated.json');

// ── Swift-ის ლიტერალების წამკითხველი ─────────────────────────────

/** კომენტარების მოცილება სტრიქონების დაზიანების გარეშე. */
function stripComments(src) {
  let out = '';
  let i = 0;
  let inString = false;
  while (i < src.length) {
    const c = src[i];
    if (inString) {
      if (c === '\\') { out += c + (src[i + 1] ?? ''); i += 2; continue; }
      if (c === '"') inString = false;
      out += c; i++; continue;
    }
    if (c === '"') { inString = true; out += c; i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue; }
    out += c; i++;
  }
  return out;
}

/** დამხურავი ფრჩხილის პოვნა (სტრიქონების გათვალისწინებით). */
function matchClose(src, open, chars = '()') {
  const [L, R] = chars;
  let depth = 0, i = open, inString = false;
  for (; i < src.length; i++) {
    const c = src[i];
    if (inString) {
      if (c === '\\') { i++; continue; }
      if (c === '"') inString = false;
      continue;
    }
    if (c === '"') { inString = true; continue; }
    if (c === L) depth++;
    else if (c === R) { depth--; if (depth === 0) return i; }
  }
  return -1;
}

/** ზედა დონის მძიმეებით დაშლა. */
function splitTop(src) {
  const parts = [];
  let depth = 0, start = 0, inString = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inString) { if (c === '\\') i++; else if (c === '"') inString = false; continue; }
    if (c === '"') { inString = true; continue; }
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (c === ',' && depth === 0) { parts.push(src.slice(start, i)); start = i + 1; }
  }
  const tail = src.slice(start).trim();
  if (tail) parts.push(tail);
  return parts.map((p) => p.trim());
}

/** `name: value` → [name|null, value] */
function labelled(arg) {
  const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([\s\S]*)$/.exec(arg);
  return m ? [m[1], m[2].trim()] : [null, arg.trim()];
}

const str = (v) => {
  if (typeof v !== 'string') return null;
  const m = /^"((?:[^"\\]|\\.)*)"$/.exec(v.trim());
  return m ? m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n') : null;
};
const dotCase = (v) => { if (typeof v !== 'string') return null; const m = /^\.([A-Za-z_][A-Za-z0-9_]*)$/.exec(v.trim()); return m ? m[1] : null; };

/** მასივის ელემენტები `[ ... ]`-დან. */
function arrayItems(v) {
  const t = v.trim();
  if (!t.startsWith('[')) return null;
  const close = matchClose(t, 0, '[]');
  return splitTop(t.slice(1, close));
}

/** ყველა `Name(...)` გამოძახება მოცემულ ტექსტში, ზედა დონეზე. */
function calls(src, name) {
  const out = [];
  const re = new RegExp(`\\b${name}\\s*\\(`, 'g');
  let m;
  while ((m = re.exec(src))) {
    const open = m.index + m[0].length - 1;
    const close = matchClose(src, open);
    if (close === -1) continue;
    out.push(splitTop(src.slice(open + 1, close)));
    re.lastIndex = close;
  }
  return out;
}

const read = (f) => stripComments(readFileSync(join(DATA, f), 'utf8'));

// ── ბანკების ამოღება ─────────────────────────────────────────────

const banks = {};
const problems = [];

/** `XCategory(id:name:emoji: <itemsKey>: [...])` — მარტივი ტექსტური ბანკები. */
function simpleBank(files, ctor, itemsKey) {
  const cats = [];
  for (const f of files) {
    for (const args of calls(read(f), ctor)) {
      const cat = { id: null, name: null, emoji: null, items: [] };
      for (const a of args) {
        const [label, value] = labelled(a);
        if (label === 'id') cat.id = str(value);
        else if (label === 'name') cat.name = str(value);
        else if (label === 'emoji') cat.emoji = str(value);
        else if (label === itemsKey) cat.items = (arrayItems(value) ?? []).map(str).filter((x) => x !== null);
      }
      if (!cat.id) problems.push(`${ctor} in ${f}: id ვერ წაიკითხა`);
      cats.push(cat);
    }
  }
  return cats;
}

// WordBank / CharadesBank — `easy/medium/hard` ან `words/levels`
function wordCategories(files) {
  const cats = [];
  for (const f of files) {
    for (const args of calls(read(f), 'WordCategory')) {
      const cat = { id: null, name: null, emoji: null, words: [] };
      const tiers = {};
      let plainWords = null;
      for (const a of args) {
        const [label, value] = labelled(a);
        if (label === 'id') cat.id = str(value);
        else if (label === 'name') cat.name = str(value);
        else if (label === 'emoji') cat.emoji = str(value);
        else if (label === 'easy' || label === 'medium' || label === 'hard')
          tiers[label] = (arrayItems(value) ?? []).map(str).filter((x) => x !== null);
        else if (label === 'words') plainWords = (arrayItems(value) ?? []).map(str).filter((x) => x !== null);
      }
      if (plainWords) cat.words = plainWords.map((text) => ({ text, level: 'medium' }));
      else for (const level of ['easy', 'medium', 'hard'])
        for (const text of tiers[level] ?? []) cat.words.push({ text, level });
      if (!cat.id) problems.push(`WordCategory in ${f}: id ვერ წაიკითხა`);
      cats.push(cat);
    }
  }
  return cats;
}

banks.WordBank = wordCategories(['WordBank.swift', 'WordBankExtra.swift']);
banks.CharadesBank = wordCategories(['CharadesBank.swift']);

// PairBank — `PairCategory(..., pairs: [WordPair("a","b",.level)])`
banks.PairBank = (() => {
  const cats = [];
  for (const f of ['PairBank.swift', 'PairBankExtra.swift']) {
    for (const args of calls(read(f), 'PairCategory')) {
      const cat = { id: null, name: null, emoji: null, pairs: [] };
      for (const a of args) {
        const [label, value] = labelled(a);
        if (label === 'id') cat.id = str(value);
        else if (label === 'name') cat.name = str(value);
        else if (label === 'emoji') cat.emoji = str(value);
        else if (label === 'pairs')
          for (const p of calls(value, 'WordPair')) {
            const a0 = str(p[0]), b0 = str(p[1]);
            const d = p[2] !== undefined ? dotCase(p[2]) : 'medium';
            if (a0 === null || b0 === null) { problems.push(`WordPair in ${f}: ${p.join(' | ')}`); continue; }
            cat.pairs.push({ a: a0, b: b0, difficulty: d ?? 'medium' });
          }
      }
      cats.push(cat);
    }
  }
  return cats;
})();

// PromptBank — `Prompt("text", .register)` (ტონი JSON-ში არ იყო!)
banks.PromptBank = (() => {
  const src = read('PromptBank.swift');
  const cats = [];
  // კატეგორიები დამხმარე ფუნქციით იგება: make(id, name, emoji, [Prompt…])
  const re = /\bmake\s*\(/g;
  let m;
  while ((m = re.exec(src))) {
    const open = m.index + m[0].length - 1;
    const close = matchClose(src, open);
    if (close === -1) continue;
    const args = splitTop(src.slice(open + 1, close));
    const cat = { id: str(args[0]), name: str(args[1]), emoji: str(args[2]), prompts: [] };
    // `func make(...)` განსაზღვრებაც ემთხვევა — მას სტრიქონული არგუმენტი არ აქვს.
    if (cat.id === null) { re.lastIndex = close; continue; }
    for (const p of calls(args.slice(3).join(','), 'Prompt')) {
      const text = str(p[0]);
      const register = p[1] !== undefined ? dotCase(p[1]) : 'playful';
      if (text === null) { problems.push(`Prompt: ${p.join(' | ')}`); continue; }
      cat.prompts.push({ text, register: register ?? 'playful' });
    }
    if (cat.id) cats.push(cat);
    re.lastIndex = close;
  }
  return cats;
})();

// SpectrumBank — `Spectrum(left:, right:)`
banks.SpectrumBank = (() => {
  const cats = [];
  for (const args of calls(read('SpectrumBank.swift'), 'SpectrumCategory')) {
    const cat = { id: null, name: null, emoji: null, spectrums: [] };
    for (const a of args) {
      const [label, value] = labelled(a);
      if (label === 'id') cat.id = str(value);
      else if (label === 'name') cat.name = str(value);
      else if (label === 'emoji') cat.emoji = str(value);
      else if (label === 'spectrums')
        for (const s of calls(value, 'Spectrum')) {
          const parsed = {};
          for (const sa of s) { const [l, v] = labelled(sa); if (l) parsed[l] = str(v); }
          if (parsed.left && parsed.right) cat.spectrums.push({ left: parsed.left, right: parsed.right });
          else problems.push(`Spectrum: ${s.join(' | ')}`);
        }
    }
    cats.push(cat);
  }
  return cats;
})();

// მარტივი ტექსტური ბანკები
const SIMPLE = [
  ['AnswerPromptBank', 'AnswerPromptCategory', 'prompts'],
  ['IdentityBank', 'IdentityCategory', 'identities'],
  ['LaughBank', 'LaughCategory', 'tasks'],
  ['NeverBank', 'NeverCategory', 'statements'],
  ['PointOneBank', 'PointOneCategory', 'questions'],
  ['StandardsBank', 'StandardsCategory', 'expectations'],
  ['TenButBank', 'TenButCategory', 'flaws'],
  ['TwoTruthsBank', 'TwoTruthsHintCategory', 'hints'],
];
for (const [bank, ctor, key] of SIMPLE) banks[bank] = simpleBank([`${bank}.swift`], ctor, key);

// DilemmaBank — `Dilemma(question:, a:, b:)`.
// JSON-ში სამივე ველი ერთ სტრიქონად იყო ჩაწყობილი („კითხვა ⟨ა⟩ ⟨ბ⟩“) — აქ ცალკეა.
banks.DilemmaBank = (() => {
  const cats = [];
  for (const args of calls(read('DilemmaBank.swift'), 'DilemmaCategory')) {
    const cat = { id: null, name: null, emoji: null, dilemmas: [] };
    for (const a of args) {
      const [label, value] = labelled(a);
      if (label === 'id') cat.id = str(value);
      else if (label === 'name') cat.name = str(value);
      else if (label === 'emoji') cat.emoji = str(value);
      else if (label === 'dilemmas')
        for (const d of calls(value, 'Dilemma')) {
          const parsed = {};
          for (const da of d) { const [l, v] = labelled(da); if (l) parsed[l] = str(v); }
          if (parsed.question && parsed.a && parsed.b) cat.dilemmas.push({ question: parsed.question, a: parsed.a, b: parsed.b });
          else problems.push(`Dilemma: ${d.join(' | ')}`);
        }
    }
    cats.push(cat);
  }
  return cats;
})();

// TruthDareBank — `TruthDareSet(heat:truths:dares:)`
banks.TruthDareBank = calls(read('TruthDareBank.swift'), 'TruthDareSet').map((args) => {
  const set = { heat: null, truths: [], dares: [] };
  for (const a of args) {
    const [label, value] = labelled(a);
    if (label === 'heat') set.heat = dotCase(value);
    else if (label === 'truths' || label === 'dares')
      set[label] = (arrayItems(value) ?? []).map(str).filter((x) => x !== null);
  }
  return set;
});

// DareCardBank / RuleCardBank — ბარათების ბრტყელი დასტები
// DareCardBank — ბარათს **ორი** ნიშანი აქვს: `kind` (ვის ეხება) და `heat`
// (რომელ დასტაშია). heat ცალკეა და მასივის სახელით განისაზღვრება, ამიტომ
// თითოეულ მასივს ცალკე ვკითხულობთ — ბრტყლად აღება მას კარგავს.
banks.DareCardBank = (() => {
  const src = read('DareCardBank.swift');
  const out = [];
  for (const heat of ['family', 'party', 'spicy']) {
    const m = new RegExp(`static let ${heat}\\s*:\\s*\\[DareCard\\]\\s*=\\s*\\[`).exec(src);
    if (!m) { problems.push(`DareCardBank: „${heat}“ დასტა ვერ მოიძებნა`); continue; }
    const open = m.index + m[0].length - 1;
    const close = matchClose(src, open, '[]');
    for (const args of calls(src.slice(open, close), 'DareCard')) {
      const card = { text: null, kind: null, heat };
      for (const a of args) { const [l, v] = labelled(a); if (l === 'text') card.text = str(v); else if (l === 'kind') card.kind = dotCase(v); }
      out.push(card);
    }
  }
  return out;
})();
banks.RuleCardBank = calls(read('RuleCardBank.swift'), 'RuleCard').map((args) => {
  const card = { text: null, kind: null, short: null };
  for (const a of args) {
    const [l, v] = labelled(a);
    if (l === 'text') card.text = str(v);
    else if (l === 'kind') card.kind = dotCase(v);
    else if (l === 'shortName') card.short = str(v);
  }
  return card;
});

// ── შემოწმება ────────────────────────────────────────────────────

function countItems(bank, value) {
  if (Array.isArray(value) && value.length && 'truths' in value[0])
    return value.reduce((n, s) => n + s.truths.length + s.dares.length, 0);
  if (Array.isArray(value) && value.length && 'text' in value[0]) return value.length;
  return value.reduce((n, c) => n + (c.items ?? c.words ?? c.pairs ?? c.prompts ?? c.spectrums ?? c.dilemmas ?? []).length, 0);
}

let total = 0;
const report = [];
for (const [bank, value] of Object.entries(banks)) {
  const n = countItems(bank, value);
  total += n;
  const cats = Array.isArray(value) && value.length && ('text' in value[0] || 'truths' in value[0]) ? value.length : value.length;
  report.push([bank, cats, n]);
  for (const c of value) {
    if (c.id !== undefined && !c.id) problems.push(`${bank}: კატეგორია id-ის გარეშე`);
    if (c.text !== undefined && !c.text) problems.push(`${bank}: ბარათი ტექსტის გარეშე`);
    if (c.kind !== undefined && !c.kind) problems.push(`${bank}: ბარათი ტიპის გარეშე`);
  }
}

// ── ჯვარედინი შემოწმება Word-ის ექსპორტთან ────────────────────────
//
// `Splash — კონტენტი.json` ატრიბუტებს კარგავს, მაგრამ **რაოდენობა** მასში
// სწორია და სულ სხვა კოდით არის აგებული (Swift-ის ექსპორტიორი). ორი
// დამოუკიდებელი გზა უნდა დაემთხვეს — თუ არა, რაღაც გამოგვრჩა.
try {
  const exported = JSON.parse(readFileSync(join(ROOT, 'Splash — კონტენტი.json'), 'utf8'));
  // ბანკის ჯამი
  const expected = {};
  for (const b of exported) expected[b.bank] = (expected[b.bank] ?? 0) + b.items.length;
  for (const [bank, , count] of report) {
    if (expected[bank] === undefined) problems.push(`${bank}: Word-ის ექსპორტში საერთოდ არ არის`);
    else if (expected[bank] !== count) problems.push(`${bank}: ექსპორტში ${expected[bank]}, აქ ${count}`);
  }
  for (const bank of Object.keys(expected)) if (!(bank in banks)) problems.push(`${bank}: ექსპორტშია, ამოღებაში — არა`);

  // **კატეგორიის დონეზეც** — ბანკის ჯამი შეიძლება დაემთხვეს, ჯგუფი კი დაიკარგოს.
  // (სწორედ ასე გამომრჩა თავიდან `DareCard`-ის სიცხარე.)
  const mine = {};
  const put = (bank, cat, n) => { mine[`${bank}/${cat}`] = (mine[`${bank}/${cat}`] ?? 0) + n; };
  for (const [bank, value] of Object.entries(banks)) {
    for (const c of value) {
      if (c.id) put(bank, c.id, (c.items ?? c.words ?? c.pairs ?? c.prompts ?? c.spectrums ?? c.dilemmas ?? []).length);
      else if (c.heat && c.truths) { put(bank, `${c.heat}.truths`, c.truths.length); put(bank, `${c.heat}.dares`, c.dares.length); }
      else if (c.heat) put(bank, c.heat, 1);          // DareCard — სიცხარის დასტა
      else if (c.kind) put(bank, c.kind, 1);          // RuleCard — ტიპის დასტა
    }
  }
  for (const b of exported) {
    const key = `${b.bank}/${b.category}`;
    if (mine[key] === undefined) problems.push(`${key}: ექსპორტშია, ამოღებაში — არა`);
    else if (mine[key] !== b.items.length) problems.push(`${key}: ექსპორტში ${b.items.length}, აქ ${mine[key]}`);
  }
} catch (e) {
  problems.push(`ჯვარედინი შემოწმება ვერ შესრულდა: ${e.message}`);
}

if (problems.length) {
  console.error('❌ ამოღება შეჩერდა:\n' + problems.slice(0, 20).map((p) => '  · ' + p).join('\n'));
  if (problems.length > 20) console.error(`  … და კიდევ ${problems.length - 20}`);
  process.exit(1);
}

writeFileSync(OUT, JSON.stringify(banks), 'utf8');
for (const [bank, cats, n] of report) console.log(`  ${bank.padEnd(18)} ${String(cats).padStart(3)} კატ. ${String(n).padStart(5)} ერთეული`);
const emoji = Object.values(banks).flat().filter((c) => c.emoji).length;
const registers = (banks.PromptBank ?? []).reduce((n, c) => n + c.prompts.length, 0);
console.log(`✅ სულ ${total} ერთეული · ${emoji} ემოჯი · ${registers} კითხვა ტონით — ორივე JSON-ში აკლდა`);
