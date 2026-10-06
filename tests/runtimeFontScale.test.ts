import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { applyRuntimeFontScale } = require('../plugins/withRuntimeFontScale.js');

describe('Android font-size configuration across prebuilds', () => {
  it('preserves the running activity without replacing its other configuration handling', () => {
    const main = { $: { 'android:name': '.MainActivity', 'android:configChanges': 'orientation|screenSize|uiMode', 'android:windowSoftInputMode': 'adjustResize' } };
    const other = { $: { 'android:name': '.OtherActivity', 'android:configChanges': 'keyboard' } };
    const manifest = { manifest: { application: [{ activity: [main, other] }] } };
    applyRuntimeFontScale(manifest);
    applyRuntimeFontScale(manifest);
    expect(main.$['android:configChanges'].split('|')).toEqual(['orientation', 'screenSize', 'uiMode', 'fontScale']);
    expect(main.$['android:windowSoftInputMode']).toBe('adjustResize');
    expect(other.$['android:configChanges']).toBe('keyboard');
  });

  it('fails clearly when a native template changes instead of silently dropping the fix', () => {
    expect(() => applyRuntimeFontScale({ manifest: { application: [{ activity: [] }] } })).toThrow('MainActivity is missing');
  });
});
