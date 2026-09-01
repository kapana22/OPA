const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * გამოშვების ხელმოწერა, რომელიც `prebuild`-ს გადაურჩება.
 *
 * `prebuild` `android/app/build.gradle`-ს თავიდან წერს — ხელით ჩამატებული
 * `signingConfigs.release` ერთ გაშვებაში ქრებოდა და APK ჩუმად debug-გასაღებით
 * ეწერებოდა. ამიტომაა ეს პლაგინი: ცვლილება ყოველ prebuild-ზე თავიდან ედება.
 *
 * გასაღების ბილიკიც და პაროლიც `~/.gradle/gradle.properties`-შია, რეპოს გარეთ.
 * თუ ეს ჩანაწერები არ არსებობს (სხვისი მანქანა, CI), ბილდი debug-ხელმოწერაზე
 * ბრუნდება — ანუ არ წყდება, უბრალოდ მაღაზიისთვის აღარ ვარგა.
 */

const SIGNING_BLOCK = `
        release {
            if (project.hasProperty('MEGOBREBI_STORE_FILE')) {
                storeFile file(MEGOBREBI_STORE_FILE)
                storePassword MEGOBREBI_STORE_PASSWORD
                keyAlias MEGOBREBI_KEY_ALIAS
                keyPassword MEGOBREBI_KEY_PASSWORD
            }
        }
`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;

    if (gradle.includes('MEGOBREBI_STORE_FILE')) return cfg;

    // 1. `signingConfigs`-ში release-ის ბლოკის ჩამატება debug-ის გვერდით.
    const anchor = `        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
`;
    if (!gradle.includes(anchor)) {
      throw new Error('withReleaseSigning: signingConfigs.debug ვერ მოიძებნა — build.gradle შეიცვალა');
    }
    gradle = gradle.replace(anchor, anchor + SIGNING_BLOCK);

    // 2. release-ის ბილდი ახალ კონფიგზე გადაყვანა.
    const relSigning = 'signingConfig signingConfigs.debug';
    const idx = gradle.indexOf(relSigning, gradle.indexOf('buildTypes'));
    const lastIdx = gradle.lastIndexOf(relSigning);
    if (idx === -1 || idx === lastIdx) {
      throw new Error('withReleaseSigning: buildTypes.release-ის ხელმოწერა ვერ მოიძებნა');
    }
    gradle =
      gradle.slice(0, lastIdx) +
      "signingConfig project.hasProperty('MEGOBREBI_STORE_FILE') ? signingConfigs.release : signingConfigs.debug" +
      gradle.slice(lastIdx + relSigning.length);

    cfg.modResults.contents = gradle;
    return cfg;
  });
};
