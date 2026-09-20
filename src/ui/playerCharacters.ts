import type { PlayerGender } from '../core/characters';

export interface PlayerCharacterDef {
  name: string;
  color: string;
  gender: PlayerGender;
  image: any;
  avatar: any;
}

export const PLAYER_CHARACTERS: PlayerCharacterDef[] = [
  { name: 'იისფერი ჰუდი', color: '#9D65FF', gender: 'boy', image: require('../../assets/characters/00-violet.png'), avatar: require('../../assets/characters/00-violet-avatar.png') },
  { name: 'ლაიმის ჰუდი', color: '#C6FF00', gender: 'girl', image: require('../../assets/characters/01-lime.png'), avatar: require('../../assets/characters/01-lime-avatar.png') },
  { name: 'ცისფერი ბომბერი', color: '#27C9FF', gender: 'boy', image: require('../../assets/characters/02-cyan.png'), avatar: require('../../assets/characters/02-cyan-avatar.png') },
  { name: 'მარჯნისფერი სვიტერი', color: '#FF745C', gender: 'girl', image: require('../../assets/characters/03-coral.png'), avatar: require('../../assets/characters/03-coral-avatar.png') },
  { name: 'ოქროსფერი ქურთუკი', color: '#FFD54A', gender: 'boy', image: require('../../assets/characters/04-gold.png'), avatar: require('../../assets/characters/04-gold-avatar.png') },
  { name: 'ვარდისფერი ჰუდი', color: '#FA5FAD', gender: 'girl', image: require('../../assets/characters/05-rose.png'), avatar: require('../../assets/characters/05-rose-avatar.png') },
  { name: 'ფირუზისფერი სვიტერი', color: '#39DBC3', gender: 'boy', image: require('../../assets/characters/06-teal.png'), avatar: require('../../assets/characters/06-teal-avatar.png') },
  { name: 'ლავანდისფერი ბომბერი', color: '#CBB8F6', gender: 'girl', image: require('../../assets/characters/07-lavender.png'), avatar: require('../../assets/characters/07-lavender-avatar.png') },
  { name: 'წითელი ჰუდი', color: '#FF515D', gender: 'boy', image: require('../../assets/characters/08-red.png'), avatar: require('../../assets/characters/08-red-avatar.png') },
  { name: 'კრემისფერი სვიტერი', color: '#FAF5E8', gender: 'girl', image: require('../../assets/characters/09-cream.png'), avatar: require('../../assets/characters/09-cream-avatar.png') },
  { name: 'ლურჯი ქურთუკი', color: '#6690FF', gender: 'boy', image: require('../../assets/characters/10-cobalt.png'), avatar: require('../../assets/characters/10-cobalt-avatar.png') },
  { name: 'ნარინჯისფერი ჰუდი', color: '#FF9C40', gender: 'boy', image: require('../../assets/characters/11-orange.png'), avatar: require('../../assets/characters/11-orange-avatar.png') },
];

