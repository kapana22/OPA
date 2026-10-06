# OPA

ქართული წვეულების თამაშები ერთი ტელეფონით, React Native / Expo SDK 57.
ერთადერთი აპი, მხოლოდ Android-ისა და iOS-ისთვის.
კატალოგში არის 21 დამოუკიდებელი თამაში, საკუთარი ქარდით, წესებითა და ნაკადით.

კლასიკური Wavelength: ორი გუნდი, ნახევარწრიული დისკი, ფარული სამიზნე,
მეტოქის მარცხენა/მარჯვენა ვარაუდი და 10 ქულამდე თამაში.
Herd Mentality-ში პასუხები ხმამაღლა ითქმის; Most Likely-ში მოთამაშეები ხელს
იშვერენ; The Line თავისუფალი განხილვაა. ამ თამაშებში ხმის მიცემა და ქულები არ არის.

OPA-ს ვიზუალი: მუქი იისფერი ფონი, ფოსფორისფერი აქცენტები, 3D პოსტერები
და 12 გამჭვირვალე PNG პერსონაჟი. თამაშების პოსტერი 3:4 პროპორციას ინარჩუნებს.

---

## სწრაფად

```bash
npm install
npx expo start          # ტელეფონზე — Expo Go ან dev build
```

ტესტები და ტიპები:

```bash
npm test                # თამაშის ლოგიკისა და პერსონაჟების ტესტები
npm run typecheck
npm run lint
```

---

## ბილდი

`android/` და `ios/` **რეპოშია** (bare workflow). `prebuild` რუტინულად
საჭირო არაა — მხოლოდ მაშინ, თუ `app.json`-ის ნატიური ნაწილი შეიცვალა
(ვერსია, ხატულა, splash, ნებართვები, პლაგინები).

> `prebuild` ნატიურ ფაილებს თავიდან წერს. ჯერ შეინახე მიმდინარე ცვლილებები და
> შეადარე მიღებული diff; ავტომატური `git checkout` მომხმარებლის სამუშაოს წაშლის.
> შეინარჩუნე საჭირო ნატიური ცვლილებები და შემდეგ გაუშვი `pod install`.

### მაღაზიისთვის ვერსიის აწევა

`app.json` → `version` (ორივე), `ios.buildNumber` და `android.versionCode`
(ყოველ ატვირთვაზე +1), მერე `npx expo prebuild --no-install`. EAS-ის
`production` პროფილი `autoIncrement`-ით თვითონ ზრდის build-ნომერს, ლოკალურ
ბილდზე კი ეს ხელით უნდა გააკეთო.

### Android

სისტემური შრიფტის შეცვლა მიმდინარე თამაშს აღარ გადატვირთავს: `fontScale`
არის `MainActivity`-ის კონფიგურაციაში და მას prebuild-ისას
`plugins/withRuntimeFontScale.js` ინარჩუნებს. პროცესი თუ შეწყდა, პარტიის
ავტომატური აღდგენა ამ ცვლილების დაპირება არ არის.

Debug build Metro-ს იყენებს. `MainApplication.kt`-ში Expo host-ს გადაეცემა
აპის `BuildConfig.DEBUG`; ბიბლიოთეკის default build flag-მა შეიძლება Debug-შიც
ძველი ჩაშენებული JS ჩატვირთოს. Release-ში developer support გამორთულია.

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@17
export ANDROID_HOME=$HOME/Library/Android/sdk
cd android && ./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```

QA რუკა და მტკიცებულებები: [qa/mobile-ux-audit/report.md](qa/mobile-ux-audit/report.md)
და [coverage.md](qa/mobile-ux-audit/coverage.md). შემდგომი ცვლილებების აუცილებელი
ლოგიკური წესები წერია [AGENTS.md](AGENTS.md)-ში.

კონტენტის ერთადერთი წყაროა `src/content/banks.generated.json` და
`src/content/games/*.json`. სახელში `generated` ისტორიულია; ფაილი ახლა
პირდაპირ რედაქტირდება `../Tools/word-editor`-ით. Swift წყარო აღარ გამოიყენება.
`npm run validate:content` ამოწმებს JSON-ის ფორმატს; ძველი `gen:content`
ბრძანებაც ამავე შემოწმებას აკეთებს და ტექსტებს არ გადაწერს.
`TruthDareBank`-ის ფორმატია `{ heat, truths, dares }`.

### iOS

ფიზიკური iPhone-ის ბილდში JavaScript და სურათები ყოველთვის ჩაშენებულია,
Debug რეჟიმშიც — დაყენებული აპი Metro-სა და ჩართულ კომპიუტერს არ საჭიროებს.
სიმულატორის Debug რეჟიმი Metro-ს იყენებს; `STANDALONE=1`-ით იქაც შეიძლება
დამოუკიდებელი ბილდის აწყობა. `prebuild`-ის შემდეგ გადაამოწმე, რომ
„Bundle React Native code and images“ ეტაპი ფიზიკურ მოწყობილობაზე
`SKIP_BUNDLING`-ს არ რთავს.

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
src/content/    JSON კონტენტი — აპისა და რედაქტორის საერთო წყარო
src/games/      21 თამაში: engine.ts + Flow.tsx
src/ui/         საერთო კომპონენტები
tools/          validate-content.mjs · gen-sounds.mjs
tests/          Vitest — ძრავები React-ისა და ნატიური მოდულების გარეშე
```

ახალი თამაში = ერთი საქაღალდე + ერთი ჩანაწერი `catalog.data.json`-ში
+ ერთი ხაზი `src/games/flows.ts`-ში. რაც არ არის რეგისტრირებული,
მთავარ ეკრანზე ჩანს, მაგრამ „მალე"-ს აჩვენებს — ანუ ნაწილობრივი
პორტიც აპს არ ტეხს.
