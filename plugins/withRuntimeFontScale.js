const { withAndroidManifest } = require('expo/config-plugins');

/** Keep the running game when system text size changes; RN updates its layout on resume. */
function applyRuntimeFontScale(manifest) {
  const activities = manifest.manifest.application?.[0]?.activity ?? [];
  const main = activities.find((activity) => activity.$?.['android:name']?.endsWith('MainActivity'));
  if (!main) throw new Error('withRuntimeFontScale: MainActivity is missing');
  const changes = new Set((main.$['android:configChanges'] ?? '').split('|').filter(Boolean));
  changes.add('fontScale');
  main.$['android:configChanges'] = [...changes].join('|');
  return manifest;
}

module.exports = function withRuntimeFontScale(config) {
  return withAndroidManifest(config, (cfg) => {
    cfg.modResults = applyRuntimeFontScale(cfg.modResults);
    return cfg;
  });
};
module.exports.applyRuntimeFontScale = applyRuntimeFontScale;
