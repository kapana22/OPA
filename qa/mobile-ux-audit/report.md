# OPA — მობილური QA / UX ანგარიში

თარიღი: 2026-10-03–04, Asia/Tbilisi. პროექტი: `Splash-rn`.

ლოკალური გასწორებები შესრულებულია და ქვემოთ მითითებული სცენარები ხელახლა შემოწმებულია. ეს ანგარიში არ არის გამოშვების სრული დამტკიცება: უშუალო შეხება, VoiceOver/TalkBack, native accessibility tree და საიდუმლოს app-switcher preview ჯერ დაბლოკილია. რეალური ტელეფონი ამ შემოწმებაში არ მონაწილეობდა. ყველა მდგომარეობის დაფარვა იხილეთ [coverage.md](coverage.md).

## გარემო და მეთოდი

Expo 57.0.18, expo-audio 57.0.4, React Native 0.86.3, React 19.2.3, TypeScript, Expo Router, Vitest. წაკითხულია AGENTS.md, README, კონფიგურაციები და [Expo SDK 57-ის დოკუმენტაცია](https://docs.expo.dev/versions/v57.0.0/). შემოწმებულია დაყენებული native მოდულების კოდიც. მხარდაჭერილია iOS/Android; ჩვეულებრივი ეკრანები პორტრეტულია, Heads Up და Who Am I? თამაშისას ლანდშაფტში გადადის.

| მოწყობილობა | OS | ლოგიკური ეკრანი | ფიზიკური სქრინშოტი | ტექსტის მასშტაბი |
|---|---|---|---|---|
| ძირითადი iPhone 17 Pro | iOS 26.5 | 402 × 874 pt | 1206 × 2622 px, @3× | medium, RN 0.941 |
| OPA QA Small — iPhone SE (3rd generation) | iOS 26.5 | 375 × 667 pt | 750 × 1334 px, @2× | large, RN 1; accessibility-extra-large, RN 2.643 |
| iPhone 17 Pro Max | iOS 26.5 | 440 × 956 pt | 1320 × 2868 px, @3× | large, RN 1 |
| Android AVD megobrebi / sdk_gphone64_arm64 | Android 15, API 35 | 411.43 × 914.29 dp | 1080 × 2400 px, density 420, 2.625× | 1 და 1.5 |

iOS-ზე გამოყენებულია არსებული Debug native აპი და მიმდინარე Metro bundle. Android-ზე ახალი Debug APK აიგო და დაინსტალირდა მონაცემების გასუფთავების გარეშე. Web bundle-ის ექსპორტიც შემოწმდა; desktop/browser preview არ გაშვებულა.

**მტკიცებულების სახეები ცალ-ცალკეა:**

- native screenshot: simctl/adb-ით რეალურად დარენდერებული აპის გამოსახულება;
- handler/ref: დროებითი debug კლიენტით კომპონენტის მოქმედების callback, router, TextInput.focus და ScrollView.scrollTo/scrollToEnd; ეს ფიზიკური tap, swipe ან კლავიატურით აკრეფის ტესტი არ არის;
- native interruption: Settings-ის რეალური გახსნა და აპში დაბრუნება; სისტემური font scale რეალურად იცვლებოდა;
- unit: Vitest-ის ტესტი, მათ შორის mock expo-audio; იგი native რენდერს არ ამოწმებს;
- native audio: დაყენებული expo-audio-ს ნამდვილი player-ის status events Android ემულატორზე; ეს მოსმენილი ხმის შეფასება არ არის.

Computer Use-ის განმეორებითმა მცდელობებმა დააბრუნა `Sky Computer Use native pipe startup failed`. ამიტომ არ ჩატარებულა სხვა მაუსის/კლავიატურის ინჟექტორის ინსტალაცია ან გამოყენება. [დაბრკოლების ჩანაწერი](evidence/native-control-blocker.txt). Debug შემოწმების დამხმარეში Android-ის დაბრუნებისას მოწყობილობის დაკარგვის შემთხვევაში სხვა მოწყობილობაზე ავტომატური fallback გაუქმდა; საიდუმლოს და audio-ს საბოლოო ჩანაწერები შეიცავს ზუსტ `__qaDevice`-ს. ადრეული არავალიდური მცდელობები PASS მტკიცებულებად არ გამოიყენება.

არსებული მომხმარებლის ფართო worktree შენარჩუნებულია. Git არ შექმნილა, commit/push/deploy არ გაკეთებულა. [diff-ის სრული სია](evidence/worktree-diff-numstat.txt) მოიცავს სესიის ადრინდელ ცვლილებებსაც და არ არის მხოლოდ ამ აუდიტის ავტორობის სია. Mafia-ს engine, narration და ხმები ამ სამუშაოს ფარგლებს გარეთ დარჩა; მისი წესების გვერდი მხოლოდ გრძელი ტექსტის ნიმუშად გამოიყენებოდა.

## დადასტურებული პრობლემები და გასწორებები

### QA-01 — P1 — საიდუმლო ღია რჩებოდა აპში დაბრუნებისას

კატეგორია: გამეორებადი ფუნქციური ხარვეზი. ეკრანი: Spy/Impostor, დადასტურებული მიმღები და ღია ბარათი. მოწყობილობა: iPhone 17 Pro / iOS 26.5; ხელახალი შემოწმება Android 15-ზეც.

ნაბიჯები: რაუნდის დაწყება → „მე ვარ“ → ბარათის hold callback → Settings-ში გადასვლა → აპში დაბრუნება. მოსალოდნელი: დამალული საიდუმლო და ხელახლა დადასტურება. რეალური მანამდე: სიტყვა დაბრუნებისას ღიად რჩებოდა. [მანამდე](screenshots/before/spy-resumed.png).

მიზეზი: reveal state მხოლოდ თითის აღების/ახალი მოთამაშის შემთხვევაში იწმინდებოდა. შეიცვალა `src/core/privateReveal.ts`, `src/ui/PassPhoneReveal.tsx`; დაემატა `tests/privateReveal.test.ts`. ნებისმიერ non-active AppState-ზე ბარათი და მიმღების დადასტურება იწმინდება, ახალი სვლისას reset რენდერის დროს ხდება, დამალული ტექსტი JSX-დან ამოღებულია.

შედეგი: **FIXED–VERIFIED** — იგივე iOS დაბრუნების სცენარი Spy/Impostor-ში და Android Impostor-ში. [შემდეგ iOS](screenshots/after/spy-resumed.png), [Android დაბრუნება](screenshots/after/android-private-resumed.png), [Android ზუსტი მოწყობილობის ჩანაწერი](evidence/android-private-final.json). Hold გამოწვეული იყო handler-ით, ხოლო აპის შეცვლა ნატიურად. Native app-switcher snapshot, რეალური hold/release და accessibility tree: **BLOCKED**, ამიტომ სრული privacy გარანტია არ გაიცემა.

### QA-02 — P1 — Android-ზე ტექსტის ზომის შეცვლა მიმდინარე თამაშს კარგავდა

კატეგორია: გამეორებადი ფუნქციური ხარვეზი. მოწყობილობა: Android AVD / Android 15.

ნაბიჯები: Heads Up-ის შესავალი → Settings → სისტემური font scale 1.5-დან 1-მდე → დაბრუნება. მოსალოდნელი: იგივე მოთამაშე/შესავალი, განახლებული ტექსტი. რეალური: მთავარი გვერდი. [მანამდე შესავალი](screenshots/before/android-font-change-intro.png), [დაბრუნებისას დაკარგული ეკრანი](screenshots/before/android-font-change-return.png), [state ჩანაწერი](evidence/android-font-before-returned.json).

მიზეზი: MainActivity-ს `configChanges`-ში `fontScale` არ ჰქონდა; OS ხელახლა ქმნიდა Activity-ს. [Android-ის ოფიციალური განმარტება](https://developer.android.com/topic/architecture/views/resources/runtime-changes-views). დაყენებულ RN-ში შრიფტის მეტრიკა resume-ისას ახლდება.

შეცვლილი ფაილები: `android/app/src/main/AndroidManifest.xml`, `plugins/withRuntimeFontScale.js`, `app.json`, `tests/runtimeFontScale.test.ts`. პლაგინი prebuild-ისას flag-ს ინარჩუნებს, სხვა flags-ს არ შლის და missing MainActivity-ზე აშკარად წყდება.

შედეგი: **FIXED–VERIFIED** — ახალი APK; 1↔1.5 შეცვლისას შესავალი და native font metrics შენარჩუნდა; აქტიური Word Rush-ის სვლაც დარჩა და ფონზე დრო არ დაიხარჯა. [ჩანაწერი](evidence/android-font-final.json), [განახლებული ტექსტი](screenshots/after/android-font-change-1.5.png), [აქტიური სვლა](screenshots/after/android-font-active-turn.png). Process death-ის შემდეგ პარტიის აღდგენა ამ გასწორების დაპირება არ არის.

### QA-03 — P2 — ქართული სახელები და მართვის ღილაკები ერთ რიგში იჭყლიტებოდა

მოწყობილობა: Small / iOS 26.5, 375 pt, ჩვეულებრივი და გაზრდილი ტექსტი; ძირითადი და დიდი ეკრანიც.

ნაბიჯები: მოკლე/გრძელი/დეფისიანი/ლათინური სახელების დამატება → დალაგების რეჟიმი → სისტემური ტექსტის გაზრდა. მოსალოდნელი: წაკითხვადი სახელი და მისაწვდომი მოქმედებები. რეალური: სახელს დაახლოებით 51 pt სიგანე რჩებოდა; reorder-ის ქვედა ისრის მიმართულებაც მცდარი იყო. [მანამდე](screenshots/before/small-roster-reorder.png), [ზომები](evidence/small-roster-before-bounds.json).

მიზეზი: სახელი, ავატარი, ინდექსი და მოქმედებები ერთ მჭიდრო flex რიგს იყოფდა. შეიცვალა `app/players.tsx`, საერთო `src/theme/responsive.ts`. სახელი იღებს დარჩენილ სიგანეს, საჭიროებისას მოქმედებები მეორე რიგში გადადის; გრძელი სახელი იხვევა. ქვედა ისრის როტაცია გასწორდა. ID-ები/სახელების არსებული წესები შენარჩუნდა.

შედეგი: **FIXED–VERIFIED** — 12 სატესტო მოთამაშე, reorder/down, წაშლა/Undo, ბოლო ელემენტამდე სქროლი; ფონტი 1 და 2.643. [შემდეგ](screenshots/after/small-roster-reorder.png), [დიდი ტექსტი](screenshots/after/small-large-text-roster.png), [ზომები](evidence/small-roster-after-bounds.json). Touch hit/gesture კონფლიქტის ფიზიკური ტესტი: BLOCKED.

### QA-04 — P2 — კლავიატურა დიალოგის მოქმედებას ფარავდა

ეკრანი: მოთამაშის სახელის შეცვლა. მოწყობილობა: Small / iOS 26.5, 375 pt, იგივე სახელი და ტექსტის მასშტაბი მანამდე/შემდეგ.

ნაბიჯები: სახელზე მოქმედება → TextInput.focus-ით ეკრანული კლავიატურის გახსნა. მოსალოდნელი: ველი და შენახვა/გაუქმება მისაწვდომია. რეალური: ქვედა მოქმედება კლავიატურასთან იჭრებოდა. [მანამდე](screenshots/before/small-rename-keyboard.png).

მიზეზი: Dialog-ს keyboard avoidance და შიგთავსის სქროლი აკლდა. შეიცვალა `src/ui/Dialog.tsx`: KeyboardAvoidingView, bounded scrollable card და შესაბამისი tap policy; საერთო ტექსტური ღილაკები.

შედეგი: **FIXED–VERIFIED** — ნამდვილი ეკრანული კლავიატურა; ჩვეულებრივი და გაზრდილი ტექსტი, შეყვანის callback და შენახვა/გაუქმება. [შემდეგ](screenshots/after/small-rename-keyboard.png), [დიდი ტექსტი](screenshots/after/small-large-text-rename.png). Native კლავიატურით აკრეფა/Done/Next და ფოკუსის screen-reader ტესტი BLOCKED.

### QA-05 — P2 — გაზრდილი ტექსტი onboarding-სა და არჩევანის ბადეებში იჭრებოდა

მოწყობილობები: Small iOS, RN fontScale 2.643; Android 15, 1.5.

ნაბიჯები: სისტემური ტექსტის გაზრდა → პირველი onboarding გვერდი / კატეგორიები / კომპაქტური არჩევანი. მოსალოდნელი: სრული შინაარსი სქროლით და ბოლო მოქმედება. რეალური: onboarding-ის ტექსტის ბოლო არ ჩანდა; არჩევანი რამდენიმე ვიწრო სვეტში იჭყლიტებოდა. [მანამდე onboarding](screenshots/before/small-large-onboarding.png), [კატეგორიები](screenshots/before/small-large-text-categories.png).

მიზეზი: onboarding-ის ფიქსირებული არასწორად განაწილებული სიმაღლე და არჩევანის უცვლელი კოლონები. შეიცვალა `src/ui/Onboarding.tsx`, `Cards.tsx`, `layout.ts`, `src/theme/responsive.ts`; `tests/responsive.test.ts`. თითოეულ გვერდს საკუთარი vertical scroll აქვს; ქვედა მოქმედება გარეთ რჩება. ლოგიკური სიგანე და fontScale განსაზღვრავს ნაკლებ კოლონებს; ტექსტის მასშტაბი გლობალურად არ ითიშება.

შედეგი: **FIXED–VERIFIED** — სამივე onboarding გვერდი, ბოლო ტექსტი და დასრულება; iOS დიდი ფონტი და Android 1.5. [შემდეგ onboarding-ის ბოლო](screenshots/after/small-large-onboarding-final-end.png), [კატეგორიები iOS](screenshots/after/small-large-text-responsive.png), [Android](screenshots/after/android-large-text-categories-final.png). სრული gesture/Dynamic Type VoiceOver ტესტი BLOCKED.

### QA-06 — P2 — მოქმედებების და კატეგორიების წარმოდგენა არათანმიმდევრული იყო

კატეგორია: დასაბუთებული UX პრობლემა და მომხმარებლის პირდაპირი მოთხოვნა. სხვადასხვა თამაშში ძირითადი ღილაკი სხვა ფერის იყო; ტექსტთან დეკორატიული play/arrow/flag იყო; კატეგორიის მნიშვნელოვანი სახელი ellipsis-ით იჭრებოდა. ძველი მომხმარებლის სქრინშოტები არის საწყისი კონტექსტი, არა ერთნაირი კონტროლირებადი ზომით გადაღებული before/after წყვილები.

შეცვლილი საერთო ფაილები: `src/theme/theme.ts`, `src/ui/Buttons.tsx`, `Pressable.tsx`, `Cards.tsx`, `GameTile.tsx`, `PageHeader.tsx`, `categoryPresentation.ts`, `Icon.tsx`, `PlayerCharacter.tsx`, `PlayerAvatarView.tsx`; დაკავშირებული Flow-ები და app გვერდები. საერთო primary ლაიმია, secondary იისფერი; ტექსტური მოქმედებები სადაა. ნავიგაციის/category icons ინარჩუნებს მნიშვნელობას, სახელებსა და 44 pt / 48 dp მიზნებს. კატეგორიის წარწერა იხვევა, შინაარსი აღარ იკარგება ellipsis-ით. ავატარი პატარაა და თამაშის ინფორმაციაზე არ დომინირებს. ტექსტის იერარქია და padding საერთო ტოკენებიდანაა.

შედეგი: **FIXED–VERIFIED** — სამი ზომის home/catalog/players/settings, წესები, exit/rename dialogs, თამაშების შემოწმებული ძირითადი გზები; Android shared ეკრანები. [ძირითადი გზა](evidence/wordrush-cycles.json), [მცირე კატეგორიები](screenshots/after/small-normal-categories.png), [დიდი ეკრანი](screenshots/after/large-wordrush-intro.png). ყველა ჩაშენებული/იშვიათი branch ყველა მოწყობილობაზე არ შემოწმებულა; ზუსტი ფარგლები coverage-შია.

გაზომილი 20 solid ტექსტური წყვილიდან ყველაზე დაბალი კონტრასტი 6.42:1 იყო (lavender/surfaceHigh); ყველა გაზომილი წყვილი 4.5:1-ს აჭარბებს. [გამოთვლა](evidence/contrast.json). ეს არ ნიშნავს ყველა გამჭვირვალე, ფოტოზე ან გრადიენტზე დადებული ტექსტის სრულ გაზომვას.

### QA-07 — P2 — ზედმეტი დეკორატიული ხატულები შედეგებზე, პატარა მოქმედება პერსონაჟის არჩევაზე

ბომბზე `burst.fill` რეალურად SparkleIcon-ს ნიშნავდა და მოთამაშის თავზე დიდი ვარსკვლავის ფილად ჩანდა. იგივე ტიპის trophy/face/role დეკორაცია სხვა შედეგებშიც რჩებოდა. ეს მომხმარებლის კონკრეტული უარყოფილი წარმოდგენის cleanup-ია, არა ახალი გემოვნებით შერჩეული დიზაინი.

ნაბიჯები: ბომბის რეალური მოკლე ფითილის დასრულება → აფეთქება. მოსალოდნელი: მოთამაშე/შედეგი მთავარია; რეალური: დიდი ვარსკვლავი. [მანამდე](screenshots/before/bomb-exploded.png). შეიცვალა Bomb, Alias, Charades, Who Am I?, Word Rush, No Laugh, Spy, Impostor Flow-ები და Onboarding. დეკორატიული GlyphIcon tiles ამოღებულია; Bomb-ს მცირე არსებული ავატარი, scrollable სია, სრული სახელები და 44/48 სამიზნეები აქვს. Mafia-ს სპეციფიკური ეკრანები არ შეცვლილა.

პერსონაჟის filter-ის სამიზნე native გაზომვით 36 pt იყო. `CharacterPicker.tsx` ახლა იყენებს საერთო მინიმუმს და selected სემანტიკას; გაზრდილ ტექსტზე filters/ქარდები იშლება, განმარტება სქროლშია, owner-ის სახელი არ იჭრება. [მანამდე ზომები](evidence/small-picker-before-bounds.json), [44 pt შემდეგ](evidence/small-picker-after-bounds.json).

შედეგი: **FIXED–VERIFIED** — ბომბის იგივე 6-მოთამაშიანი აფეთქება; 12 მოთამაშე Small-ზე და fontScale 2.643, ბოლომდე სქროლი; Alias winner, Spy round/final, დიდი ტექსტის picker და onboarding. [შემდეგ ბომბი](screenshots/after/bomb-exploded.png), [დიდი ტექსტის ბოლო](screenshots/after/small-large-text-bomb-bottom.png), [picker-ის ბოლო](screenshots/after/small-large-text-picker-end-final.png), [Alias](screenshots/after/alias-winner.png). ყველა დანარჩენი შედეგის წაშლილი დეკორაცია კოდით/build-ით გადამოწმდა; მათი ყველა განახლებული ვიზუალური branch ცალკე NOT RUN-ია.

### QA-08 — P1 — ხმის ასინქრონული მოთხოვნა stop/disable/release-ის შემდეგაც უკრავდა

მოწყობილობა/მეთოდი: რეალური `sound.ts` + mock expo-audio Vitest; Android native audio დამატებითი მტკიცებულება.

ნაბიჯები: მოთამაშე უკრავს → Sound.play() ხელახლა იწყებს async seek-ს → სანამ seek დასრულდება stop(), disable() ან release() → seek resolves. მოსალოდნელი: ძველი მოთხოვნა არ უკრავს; stop-ის seek ახალი play-ის პოზიციას არ გადააყენებს. ძველი Promise callback მოთხოვნის აქტუალურობას არ ამოწმებდა.

შეცვლილი ფაილები: `src/core/sound.ts`, `tests/sound.test.ts`. თითოეულ პლეერს აქვს request identity/lifetime; საერთო in-flight rewind; play-ის წინ მოთხოვნა, enabled და lifetime ხელახლა მოწმდება. ძველი stop rewind ახალი play-ის შემდეგ აღარ სრულდება დამოუკიდებლად. სწრაფი play-ებიდან მხოლოდ აქტუალური მოთხოვნა გრძელდება; seek failure არ უშვებს გაჟონილ დაკვრას.

დასრულების თვითგამეორების ეჭვიც **დადასტურდა Android ემულატორის ნამდვილ player-ზე**: ერთი play → finish-ზე seek(0) pause-ის გარეშე → 2 finish; pause→seek-ისას 1 finish, playing=false. [გარეშე](evidence/android-native-seek-without-pause.json), [pause-ით](evidence/android-native-seek-with-pause.json). დაყენებულ Android/Media3 implementation-ში seek playWhenReady-ს არ ასუფთავებს. ახალი sound finish handler seek-მდე pause-ს აკეთებს.

შედეგი: **FIXED–VERIFIED** unit-ით async cancellation/order/rapid requests და native player finish behavior. არსებული engine tests-ის noop alias ხმის მტკიცებულებად არ ჩაითვალა. რეალურ Android ტელეფონზე მოსმენით Sound.play-ის ერთჯერადობა/სწრაფი გამორთვა ჯერ **NOT RUN**.

### QA-09 — P1 — Truth or Dare-ის 60 დამატება ბანკიდან იკარგებოდა

ნაბიჯები: ბანკის heat-ით გაფილტვრა / content.test-ის ჩატვირთვა. მოსალოდნელი: ყველა დამატება შესაბამის truths/dares deck-შია; რეალური: 6 generic words ჯგუფი heat-ს არ შეიცავდა და deck მათ გამოტოვებდა, ტესტი კი arrays-ზე წყდებოდა.

შეცვლილი ფაილები: `src/content/banks.generated.json`, `src/content/banks.ts`, `tests/content.test.ts`, `tests/editorTruthDare.test.ts`, `../Tools/word-editor/editor.js`, `../Tools/word-editor/server.py`, მისი `test_server.py`, `tools/extract-banks.mjs`. 60 დამატება შესაბამის heat/ტიპის arrays-ში გაერთიანდა დაკარგვის/დუბლირების გარეშე. მიმდინარე რაოდენობები: family 45 truths + 42 dares; party 49+45; spicy 58+38; სულ 277. Editor სპეციალურ TruthDare სტრუქტურას კითხულობს/ინახავს და malformed schema-ს უარყოფს.

შედეგი: **FIXED–VERIFIED** content/editor unit ტესტები, Python editor ტესტები და native TruthDare truth/dare/swap/refusal/next გზა. [ციკლი](evidence/truthdare-cycles.json), [editor ტესტი](evidence/editor-tests.log).

ცალკე დარჩენილი წყარო: Swift extraction source-ში ეს 60 დამატება არ არის და სხვა ბანკების ძველი წყაროც მიმდინარე ექსპორტს აცდენილია. მისი სრული შეჯერება ამ აუდიტში არ გაკეთებულა. ახალი extractor guard ჩერდება არსებული ტექსტების დაკარგვის შემთხვევაში; უშუალოდ გაშვებამ exit=1 და უცვლელი generated JSON hash დაადასტურა. [ჩანაწერი](evidence/content-generator-guard.txt). `npm run gen:content` წარმატებულად არ ითვლება; არსებული მონაცემების დაცვა PASS-ია.

### QA-10 — P2 — Android Debug ძველ bundle-ს აჩვენებდა

მიზეზი: Expo host-ის default `useDevSupport` library BuildConfig-დან მოდიოდა და ამ აპში false გამოდიოდა; Debug APK-ში cached JS იტვირთებოდა და მიმდინარე Metro Inspector არ ჩანდა.

შეიცვალა `android/app/src/main/java/ge/splash/megobrebi/MainApplication.kt`: `useDevSupport = BuildConfig.DEBUG`. Release ისევ false-ია. ახალი APK აიგო/დაინსტალირდა, მიმდინარე Android აპი Metro-ს დაუკავშირდა; native UI-ის ახალი ტექსტი/მოქმედებები და device dimensions დაფიქსირდა.

შედეგი: **FIXED–VERIFIED** — [build](evidence/android-build.log), [Android საერთო გზები](evidence/android-checks.json), [Wavelength მატჩი](evidence/wavelength-cycle.json).

## თამაშები, წესები და რეგრესია

კოდიდან აღრიცხულია 21 თამაში და მათი განსხვავებული ფაზები. მიმდინარე 21 artwork ფაილი ზომებითაც გადამოწმდა: ყველა 3:4 პროპორციისაა — [ჩანაწერი](evidence/artwork-proportions.json). ძირითად iPhone-ზე ყველა შესავალი და 21 წესების გვერდი ნატიურად დაირენდერა; წესების ბოლო მოქმედება ხელმისაწვდომია და უცნობი ID მთავარზე უსაფრთხო დაბრუნებას იძლევა. [წესების ჩანაწერი](evidence/rules-final.json).

შემოწმდა სოციალური deck-ების განმეორებითი ციკლები, scoring თამაშების დასრულება/განმეორება, ბოლო მოთამაშე/რაუნდი, secret handoff, სრული writer round და ერთი Two Truths ავტორის სრული ციკლი. Alias, Heads Up, Who Am I? და Bomb-ში რეალური დრო გავიდა — ტაიმერები წარმოებაში არ აჩქარებულა. Word Rush-ის ფონზე/დიალოგზე pause და resume ცალკე რეალურ დროში შემოწმდა. ყველა კონკრეტული თამაში/მოწყობილობა/branch იხილეთ coverage-ში; ყველა თამაში ერთ მექანიკად არ არის შეფასებული.

მნიშვნელოვანი რეგრესიული ტესტები: sound cancellation/order, private AppState concealment, responsive widths/font scale, Android fontScale/prebuild guard, მინიმუმ 0/1 TruthDare start, content/editor ფორმატი და არსებული engine double-action/restart ტესტები. `AGENTS.md`-ში ჩაიწერა წესები ახალი ცვლილებებისთვის; `README.md` განახლდა მიმდინარე მექანიკებით, native config და QA ლინკებით.

| შემოწმება | შედეგი | მტკიცებულება |
|---|---|---|
| npm test | PASS — 252 ტესტი / 32 ფაილი | [ლოგი](evidence/tests.log) |
| npm run typecheck | PASS | [ლოგი](evidence/typecheck.log) |
| npm run lint | PASS | [ლოგი](evidence/lint.log) |
| Android assembleDebug --offline | PASS — ახალი native APK | [ლოგი](evidence/android-build.log) |
| Expo export iOS/Android/Web | PASS — browser preview გარეშე | [ლოგი](evidence/export-build.log) |
| Python word-editor unit tests | PASS — 4 ტესტი | [ლოგი](evidence/editor-tests.log) |
| iOS native rebuild ამ აუდიტში | NOT RUN — არსებული native Debug + ახალი JS bundle გამოიყენებოდა | iOS-ს ახალი native კოდის ცვლილება ამ ეტაპზე არ დასჭირდა |
| git diff --check | PASS — დასრულებისას whitespace გასუფთავებულია; შინაარსობრივი წინარე ცვლილებები შენარჩუნდა | [ლოგი](evidence/diff-check.log) |

iOS Debug-ის ახალი process relaunch-ის საზომი: appReady 333 ms, homeVisible 2251 ms module-ის გაზომვის დასაწყისიდან; storage/fonts preparation 34 ms. [ჩანაწერი](evidence/startup-ios-relaunch.json). ეს ერთჯერადი სიმულატორის Debug შედეგია, არა real-phone cold-start benchmark. ადრინდელი HMR timing cold start-ად არ გამოიყენება. Android Debug-ის ნიმუში appReady 508 ms/homeVisible 4740 ms ასევე Debug/emulator-ის კონტექსტითაა; release წარმადობის გარანტია არ გაიცემა.

## ღია საკითხები და დარჩენილი შემოწმება

- **P1 / BLOCKED:** საიდუმლო ინფორმაციის app-switcher preview, გარდამავალი კადრების ვიდეო და დამალული ტექსტის native AX tree; რეალური hold/release და სწრაფი tap. JS conditional unmount/AppState და დაბრუნების ეკრანები დადასტურებულია, native privacy სრული დამტკიცება — არა.
- **P2 / BLOCKED:** რეალური touch/scroll კონფლიქტი, სისტემური Back და gesture, VoiceOver/TalkBack reading order და modal focus, native keyboard typing/Done/Next. ინსტრუმენტის native pipe ვერ იწყება.
- **P3 / FAIL — Debug გარემო:** Android-ში Expo CLI connection warning განმეორდა; Inspector/Metro bundle და ძირითადი გზები მუშაობდა, მაგრამ warning overlay ზოგ სქრინშოტზე რჩება. [ლოგი](evidence/android-runtime-warnings.log). ეს release build-ზე არ შემოწმებულა და მის ქცევაზე დასკვნა არ კეთდება. Fatal ReactNativeJS error შეგროვებულ error ლოგში არ აღმოჩნდა; ეს ყველა runtime პრობლემის არარსებობის გარანტია არ არის.
- **NOT RUN:** ყველა იშვიათი branch/ორი სრული თანმიმდევრული პარტია ყველა თამაშსა და ყველა ზომაზე, ყველა შედეგის გაზრდილი ტექსტი, production release UI/ჟურნალების/წარმადობის შემოწმება, forced font-load/storage/asset failure, process-death restore. ამ მდგომარეობებს PASS არ ენიჭება.
- **NOT RUN:** Reduce Motion-ის სისტემური გადართვით რეალური native გამოცდა; არსებული მხარდაჭერა კოდში შემოწმდა. ჰაპტიკა/სენსორები/დახრა სიმულატორით სრულად არ დასტურდება.
- Swift source-ის სრული შეჯერება მიმდინარე banks-თან დარჩა; generator overwrite დაცულია და JSON უცვლელი რჩება.

რეალურ Android ტელეფონზე: adb devices-ში ამ ეტაპზე მხოლოდ emulator-5554 ჩანს. დააკავშირეთ სატესტო ტელეფონი, გაუშვით მიმდინარე dev/release build და გაიმეორეთ Sound.play ერთჯერადად, სწრაფი play→stop/disable/exit, ხმების მოსმენა, ფონიდან დაბრუნება, native back/საიდუმლო preview, დიდი ტექსტი+კლავიატურა, ჰაპტიკა და Heads Up/Who Am I? დახრის სენსორი. iOS-ზე იგივე touch/privacy/accessibility და release წარმადობის შემოწმებაც დარჩა. არსებული iPhone signing profile-ის წინა ვადაგასვლის დაბრკოლება ამ აუდიტში არ შეცვლილა.

სიმულატორები და Metro დატოვებულია მიმდინარე აპის სანახავად. მომხმარებლის მთავარი roster შენარჩუნებულია; Small/Large QA პროფილებში გამოყენებულია სინთეზური მონაცემები. QA ანგარიშით აპი სრულად დასრულებულად/გამოშვებისთვის სრულად შემოწმებულად არ არის წარმოდგენილი.
