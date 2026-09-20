import type { ImageSourcePropType } from 'react-native';

export const gameArtwork: Record<string, ImageSourcePropType> = {
  wavelength: require('../../assets/game-cards/opa-wavelength.png'),
  wordrush: require('../../assets/game-cards/opa-wordrush.png'),
  rulecard: require('../../assets/game-cards/opa-rulecard.png'),
  darecard: require('../../assets/game-cards/opa-darecard.png'),
  mostlikely: require('../../assets/game-cards/opa-mostlikely.png'),
  tableread: require('../../assets/game-cards/opa-tableread.png'),
  impostor: require('../../assets/game-cards/opa-impostor.png'),
  spy: require('../../assets/game-cards/opa-spyfall.png'),
  spyfall: require('../../assets/game-cards/opa-spyfall.png'),
  charades: require('../../assets/game-cards/opa-charades.png'),
  bomb: require('../../assets/game-cards/opa-bomb.png'),
  mafia: require('../../assets/game-cards/opa-mafia.png'),
  whowrote: require('../../assets/game-cards/opa-whowrote.png'),
  twotruths: require('../../assets/game-cards/opa-twotruths.png'),
  never: require('../../assets/game-cards/opa-never.png'),
  nolaugh: require('../../assets/game-cards/opa-nolaugh.png'),
  alias: require('../../assets/game-cards/opa-alias.png'),
  truthdare: require('../../assets/game-cards/opa-truthdare.png'),
  whoami: require('../../assets/game-cards/opa-whoami.png')
};

export const gameCaptions: Record<string, string> = {
  "mostlikely": "თქვენ შორის ვის შეეფერება ეს აღწერა?",
  "tableread": "გამოიცანი მეგობრების პასუხები.",
  "impostor": "მინიშნებებით გამოიცანით, ვინ ბლეფობს.",
  "spy": "მსგავსი სიტყვები — იპოვე განსხვავებული როლი.",
  "spyfall": "ყველამ იცის ადგილი, ჯაშუშის გარდა.",
  "charades": "ტელეფონი შუბლზე — გამოიცანი, რა წერია.",
  "bomb": "თქვი სიტყვა და დროზე გადაეცი ტელეფონი.",
  "mafia": "გამოიცანით, ვინ არის მაფიის წევრი.",
  "whowrote": "გამოიცანი, ვინ დაწერა პასუხი.",
  "twotruths": "სამი ამბიდან რომელია ტყუილი?",
  "never": "აღიარე, თუ შენც გაგიკეთებია.",
  "nolaugh": "ეცადე, არ გაგეცინოს.",
  "alias": "აუხსენი სიტყვა შენს გუნდს.",
  "truthdare": "სიმართლე თუ მოქმედება — აირჩიე.",
  "whoami": "დასვი კითხვები და გამოიცანი, ვინ ხარ.",
  "wavelength": "გამოიცანით ადგილი შკალაზე.",
  "wordrush": "რამდენ სიტყვას მოასწრებ?",
  "rulecard": "დაიმახსოვრე წესები და ეცადე, არ დაარღვიო.",
  "darecard": "შეასრულე დავალება ან მიიღე ჯარიმა."
};

