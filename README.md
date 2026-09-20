# OPA

ქართული წვეულების თამაშები ერთი ტელეფონით, React Native / Expo SDK 57.
მთავარ ეკრანზე არის 19 ჩანაწერი; Read the Room აერთიანებს Herd Mentality,
Where’s the Line? და Rate Them რეჟიმებს.

კლასიკური Wavelength: ორი გუნდი, ნახევარწრიული დისკი, ფარული სამიზნე,
მეტოქის მარცხენა/მარჯვენა ვარაუდი და 10 ქულამდე თამაში.
კლასიკური Herd: თავისუფალი პასუხები, ვარდისფერი ძროხა და 8 ქულამდე თამაში.

OPA-ს ვიზუალი: მუქი იისფერი ფონი, ფოსფორისფერი აქცენტები, 3D პოსტერები
და 12 გამჭვირვალე PNG პერსონაჟი. ორიგინალი სიტყვების ბანკი უცვლელია.

---

## სწრაფად

```bash
npm install
npx expo start          # ტელეფონზე — Expo Go ან dev build
npx expo start --web    # ბრაუზერში
```

ტესტები და ტიპები:

```bash
npm test                # თამაშის ლოგიკისა და პერსონაჟების ტესტები
npx tsc --noEmit
```

---

## ბილდი

`android/` და `ios/` **რეპოშია** (bare workflow). `prebuild` რუტინულად
საჭირო არაა — მხოლოდ მაშინ, თუ `app.json`-ის ნატიური ნაწილი შეიცვალა
(ვერსია, ხატულა, splash, ნებართვები, პლაგინები).

> `prebuild` `ios/`-ში `Podfile.lock`-ს, `PrivacyInfo.xcprivacy`-ს და
> `project.pbxproj`-ს თავიდან წერს. გაშვების შემდეგ ისინი git-იდან დააბრუნე
> (`git checkout -- ios/Podfile.lock ios/megobrebi/PrivacyInfo.xcprivacy`)
> და `pod install` გაუშვი.

### მაღაზიისთვის ვერსიის აწევა

`app.json` → `version` (ორივე), `ios.buildNumber` და `android.versionCode`
(ყოველ ატვირთვაზე +1), მერე `npx expo prebuild --no-install`. EAS-ის
`production` პროფილი `autoIncrement`-ით თვითონ ზრდის build-ნომერს, ლოკალურ
ბილდზე კი ეს ხელით უნდა გააკეთო.

### Android

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@17
export ANDROID_HOME=$HOME/Library/Android/sdk
cd android && ./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```

### iOS

```bash
cd ios && pod install
xcodebuild -workspace megobrebi.xcworkspace -scheme megobrebi \
  -configuration Release -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,name=iPhone 17' \
  -derivedDataPath build CODE_SIGNING_ALLOWED=NO
```

მოწყობილობაზე ან App Store-ისთვის Apple Developer-ის ანგარიში და
ხელმოწერის პროფილი სჭირდება — ისინი Xcode-ში ან EAS-ში ისმება.

> **prebuild-ის შემდეგ `pod install` აუცილებელია.** `prebuild` `ios/`-ს
> თავიდან წერს და `Pods/`-ს შლის.

---

## ხელმოწერა

გამოშვების გასაღები **რეპოში არ არის და არც უნდა მოხვდეს**:

| რა | სად |
|---|---|
| გასაღები | `~/.android-keystores/megobrebi-release.keystore` |
| პაროლი | `~/.gradle/gradle.properties` (`MEGOBREBI_*`) |

`android/app/build.gradle`-ის ხელმოწერის ბლოკს
`plugins/withReleaseSigning.js` ადებს — ანუ `prebuild` ვეღარ შლის.
თუ `MEGOBREBI_STORE_FILE` არ არსებობს (სხვისი მანქანა, CI), ბილდი
debug-ხელმოწერაზე ბრუნდება: არ წყდება, მაგრამ მაღაზიისთვის აღარ ვარგა.

> ⚠️ **გასაღების დაკარგვა = Play Store-ზე განახლების დაკარგვა.**
> Google ვერაფრით აღადგენს. გადაინახე ორივე ფაილი უსაფრთხოდ.

---

## ორიენტაცია

აპი პორტრეტულია, **გარდა ორისა** — Heads Up და Who Am I?, სადაც
ტელეფონი შუბლზეა და ლანდშაფტი სჭირდება.

ნატიურ დონეზე ლანდშაფტი **დაშვებულია** ორივე პლატფორმაზე (ზუსტად
როგორც Swift აპში იყო), პორტრეტს კი აპი თვითონ იჭერს გაშვებისას —
`src/core/portraitDefault.ts`. სხვაგვარად `useLandscapeOnly()` iOS-ზე
ჩუმად ჩავარდებოდა: `Info.plist` მყარი ჭერია.

---

## აგებულება

```
app/            expo-router-ის მარშრუტები (6 ეკრანი)
src/core/       საერთო ლოგიკა — საცავი, ხმა, ჰაპტიკა, სენსორი, როსტერი
src/content/    6,764 ერთეული — Swift-იდან სკრიპტით ამოღებული
src/games/      19 საქაღალდე: engine.ts + Flow.tsx
src/ui/         საერთო კომპონენტები
tools/          extract-banks.mjs · gen-sounds.mjs
tests/          Vitest — ძრავები React-ისა და ნატიური მოდულების გარეშე
```

ახალი თამაში = ერთი საქაღალდე + ერთი ჩანაწერი `catalog.data.json`-ში
+ ერთი ხაზი `src/games/flows.ts`-ში. რაც არ არის რეგისტრირებული,
მთავარ ეკრანზე ჩანს, მაგრამ „მალე"-ს აჩვენებს — ანუ ნაწილობრივი
პორტიც აპს არ ტეხს.
