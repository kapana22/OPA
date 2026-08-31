/** ხმის ორეული ტესტებისთვის — `.wav`-ებიც და `expo-audio`-ც მხოლოდ აპშია. */
export type SoundEffect = string;
const noop = () => {};
export const Sound = { isEnabled: true, setEnabled: noop, play: noop, stop: noop, release: noop };
