import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));

/**
 * ძრავები `Haptics`-სა და `Sound`-ს იძახიან — ზუსტად ისე, როგორც Swift-ში.
 * ორივე ნატიურ მოდულს ეყრდნობა (`expo-haptics`, `expo-audio` და `.wav`
 * ასეთები), რომლებიც Node-ში არ არსებობს.
 *
 * ამიტომ ტესტში ისინი ორეულებით იცვლება. **ძრავის კოდი არ იცვლება** — სწორედ
 * ეს არის აზრი: რასაც ტესტი ამოწმებს, იგივე გადის ტელეფონზე.
 */
export default defineConfig({
  resolve: {
    alias: [
      { find: /.*\/core\/haptics$/, replacement: resolve(root, 'tests/stubs/haptics.ts') },
      { find: /.*\/core\/sound$/, replacement: resolve(root, 'tests/stubs/sound.ts') },
    ],
  },
  test: { include: ['tests/**/*.test.ts'] },
});
