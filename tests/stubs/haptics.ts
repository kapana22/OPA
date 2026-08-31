/** ჰაპტიკის ორეული ტესტებისთვის — ნატიური მოდული Node-ში არ არსებობს. */
export type HapticPattern = string;
const noop = () => {};
export const Haptics = {
  isEnabled: true,
  setEnabled: noop,
  play: noop,
  tap: noop, medium: noop, heavy: noop, success: noop, warning: noop, error: noop,
  tick: noop, tickHot: noop, boom: noop, reveal: noop, win: noop,
};
