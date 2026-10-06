#!/usr/bin/env node
// Validate the editable React Native source without rewriting any content.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const banks = JSON.parse(readFileSync(new URL('../src/content/banks.generated.json', import.meta.url), 'utf8'));
const text = (value, label) => assert(typeof value === 'string' && value.trim(), `${label}: empty text`);
const categories = {
  WordBank: ['words'], CharadesBank: ['words'], PairBank: ['pairs', 'a', 'b'],
  PromptBank: ['prompts', 'text', 'register'], SpectrumBank: ['spectrums', 'left', 'right'],
  DilemmaBank: ['dilemmas', 'question', 'a', 'b'],
  ...Object.fromEntries(['AnswerPromptBank', 'IdentityBank', 'LaughBank', 'NeverBank',
    'PointOneBank', 'StandardsBank', 'TenButBank', 'TwoTruthsBank'].map(name => [name, ['items']])),
};
for (const [bank, [key, ...fields]] of Object.entries(categories)) {
  assert(Array.isArray(banks[bank]) && banks[bank].length, `${bank}: missing categories`);
  const ids = new Set();
  for (const category of banks[bank]) {
    for (const field of ['id', 'name', 'emoji']) text(category[field], `${bank}.${field}`);
    assert(!ids.has(category.id), `${bank}: duplicate category ${category.id}`);
    ids.add(category.id);
    assert(Array.isArray(category[key]) && category[key].length, `${bank}.${category.id}: missing ${key}`);
    for (const item of category[key]) {
      if (!fields.length) text(item, `${bank}.${category.id}`);
      else for (const field of fields) {
        // Existing editor data can contain unfinished second words. Preserve it.
        if (bank === 'PairBank' && field === 'b' && item[field] === '') {
          console.warn(`WARNING: ${bank}.${category.id}: empty second word for ${item.a}`);
        } else text(item[field], `${bank}.${category.id}.${field}`);
      }
    }
  }
}
const heats = ['family', 'party', 'spicy'];
assert(Array.isArray(banks.TruthDareBank) && banks.TruthDareBank.length === heats.length, 'TruthDareBank: missing sets');
for (const heat of heats) {
  const sets = banks.TruthDareBank.filter(set => set.heat === heat);
  assert(sets.length === 1, `TruthDareBank: expected one ${heat} set`);
  for (const kind of ['truths', 'dares']) {
    assert(Array.isArray(sets[0][kind]) && sets[0][kind].length, `TruthDareBank.${heat}.${kind}: missing texts`);
    for (const item of sets[0][kind]) text(item, `TruthDareBank.${heat}.${kind}`);
  }
}
for (const [bank, kinds] of Object.entries({ DareCardBank: ['solo', 'group', 'target', 'duel'], RuleCardBank: ['rule', 'now', 'game', 'vote', 'relief'] })) {
  assert(Array.isArray(banks[bank]) && banks[bank].length, `${bank}: missing cards`);
  for (const card of banks[bank]) {
    text(card.text, bank);
    assert(kinds.includes(card.kind), `${bank}: invalid kind`);
    if (bank === 'DareCardBank') assert(heats.includes(card.heat), `${bank}: invalid heat`);
  }
}
console.log(`Validated ${Object.keys(banks).length} React Native content banks; no files rewritten.`);
