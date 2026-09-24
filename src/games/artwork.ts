import type { ImageSourcePropType } from 'react-native';

export const gameArtwork: Record<string, ImageSourcePropType> = {
  wavelength: require('../../assets/game-cards/opa-wavelength.jpg'),
  wordrush: require('../../assets/game-cards/opa-wordrush.jpg'),
  rulecard: require('../../assets/game-cards/opa-rulecard.jpg'),
  darecard: require('../../assets/game-cards/opa-darecard.jpg'),
  mostlikely: require('../../assets/game-cards/opa-mostlikely.jpg'),
  tableread: require('../../assets/game-cards/opa-tableread.jpg'),
  impostor: require('../../assets/game-cards/opa-impostor.jpg'),
  spy: require('../../assets/game-cards/opa-spyfall.jpg'),
  spyfall: require('../../assets/game-cards/opa-spyfall.jpg'),
  charades: require('../../assets/game-cards/opa-charades.jpg'),
  bomb: require('../../assets/game-cards/opa-bomb.jpg'),
  mafia: require('../../assets/game-cards/opa-mafia.jpg'),
  whowrote: require('../../assets/game-cards/opa-whowrote.jpg'),
  twotruths: require('../../assets/game-cards/opa-twotruths.jpg'),
  never: require('../../assets/game-cards/opa-never.jpg'),
  nolaugh: require('../../assets/game-cards/opa-nolaugh.jpg'),
  alias: require('../../assets/game-cards/opa-alias.jpg'),
  truthdare: require('../../assets/game-cards/opa-truthdare.jpg'),
  whoami: require('../../assets/game-cards/opa-whoami.jpg')
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

