import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StorageBackend } from './storage';

/**
 * `AsyncStorage`-ის backend სინქრონული ფასადისთვის (იხ. `storage.ts`).
 *
 * ჩაწერა „ცეცხლი და დაივიწყე“-ა: მეხსიერება უკვე განახლებულია, დისკი კი
 * ცოტა მოგვიანებით ეწევა. თამაშის ტემპში ეს შეუმჩნეველია, ჩავარდნა კი
 * მხოლოდ იმას ნიშნავს, რომ ერთი ჩანაწერი არ შეინახა — და არა იმას, რომ
 * რაუნდი გაწყდა.
 */
export const asyncStorageBackend: StorageBackend = {
  async load() {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith('splash.'));
    if (keys.length === 0) return {};
    const pairs = await AsyncStorage.multiGet(keys);
    const out: Record<string, string> = {};
    for (const [key, value] of pairs) if (value !== null) out[key] = value;
    return out;
  },
  persist(key, value) {
    void AsyncStorage.setItem(key, value).catch(() => {});
  },
  remove(key) {
    void AsyncStorage.removeItem(key).catch(() => {});
  },
};
