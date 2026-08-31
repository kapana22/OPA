/**
 * რა მოსდევს წაგებას ან უარს.
 *
 * **განზრახ პარამეტრია და არა კოდში ჩაწერილი წესი.** აპი არაფერს ავალდებულებს —
 * მაგიდა თვითონ წყვეტს, რა ღირს წაგება.
 *
 * პორტი: `Splash/Core/PartyForfeit.swift`.
 */
export type PartyForfeit = 'tableChoice' | 'point' | 'sip';

export const PARTY_FORFEITS: PartyForfeit[] = ['tableChoice', 'point', 'sip'];

export const forfeitTitle: Record<PartyForfeit, string> = {
  tableChoice: 'მაგიდის სურვილი',
  point: 'ქულა მინუსში',
  sip: 'ერთი ყლუპი',
};

export const forfeitNote: Record<PartyForfeit, string> = {
  tableChoice: 'მაგიდა თვითონ იგონებს, რა მოსდევს — ყველაზე სასაცილო ვარიანტი.',
  point: 'წაგებული ქულას კარგავს. ყველაზე მშვიდი და ყველასთვის გამოსადეგი.',
  sip: 'ვინც ვერ გაართვა თავი, სვამს. თავად გადაწყვიტეთ, რას — აპი არაფერს გირჩევთ.',
};

/** ერთი სიტყვა, რომელიც ბარათის ქვეშ წერია. */
export const forfeitShort: Record<PartyForfeit, string> = {
  tableChoice: 'სურვილი',
  point: '−1 ქულა',
  sip: 'ყლუპი',
};
