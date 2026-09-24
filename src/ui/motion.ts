import { FadeInDown, FadeInRight, LinearTransition, ReduceMotion, ZoomIn } from 'react-native-reanimated';

/**
 * აპის საერთო მოძრაობა — ერთი „ხელწერა“ ყველა ეკრანზე.
 *
 * ყველა ანიმაცია სისტემის „მოძრაობის შემცირებას“ ემორჩილება
 * (`ReduceMotion.System`) — ჩართულისას ელემენტები უბრალოდ ადგილზე ჩნდება.
 *
 * დაყოვნება ზღვრულია (`MAX_STAGGER`): გრძელ სიაში მეოცე ელემენტი წამზე მეტს
 * არ უნდა ელოდოს.
 */

const STEP_MS = 55;
const MAX_STAGGER = 8;

const delayFor = (index: number) => Math.min(Math.max(index, 0), MAX_STAGGER) * STEP_MS;

/** ქვემოდან ამოსრიალება — სექციები, ბარათები, სიის რიგები. */
export const enterUp = (index = 0) =>
  FadeInDown.delay(delayFor(index))
    .springify()
    .damping(18)
    .stiffness(170)
    .reduceMotion(ReduceMotion.System);

/** მარჯვნიდან შემოსრიალება — ჰორიზონტალური რიგის ფილები. */
export const enterRight = (index = 0) =>
  FadeInRight.delay(delayFor(index))
    .springify()
    .damping(18)
    .stiffness(170)
    .reduceMotion(ReduceMotion.System);

/** „ამოხტომა“ — დიალოგის ბარათი, გვირგვინი, მთავარი ციფრი. */
export const popIn = (delayMs = 0) =>
  ZoomIn.delay(delayMs).springify().damping(13).stiffness(190).reduceMotion(ReduceMotion.System);

/** სიის გადალაგება (დამატება/წაშლა/გადათრევა) — დანარჩენები რბილად იწევენ. */
export const listLayout = LinearTransition.springify().damping(20).stiffness(180).reduceMotion(ReduceMotion.System);
