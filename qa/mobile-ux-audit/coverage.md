# OPA — შემოწმების რუკა და დაფარვა

2026-10-03–04. თითოეული PASS ეხება მხოლოდ ცხრილში დასახელებულ მეთოდსა და მდგომარეობას. handler/ref ნიშნავს debug callback/router/საჯარო native ref-ს; არ ნიშნავს ნამდვილ tap/swipe-ს. სქრინშოტი native აპიდანაა და არცერთი რიგი არ არის browser preview. სტატუსების მნიშვნელობა: PASS, FAIL, FIXED–VERIFIED, FIXED–UNVERIFIED, BLOCKED, NOT RUN, NOT APPLICABLE.

მოწყობილობის შემოკლებები: **M** — iPhone 17 Pro/iOS 26.5/402×874 pt/font 0.941; **S** — iPhone SE 3/iOS 26.5/375×667 pt/font 1 ან 2.643; **L** — iPhone 17 Pro Max/iOS 26.5/440×956 pt/font 1; **A** — Android 15/API35/411.43×914.29 dp/font 1 ან 1.5. ფიზიკური px და მოწყობილობის ID-ები report.md-შია. Small/Large შეიქმნა/გამოიყენა სინთეზური მონაცემებით; ძირითადი roster არ გასუფთავებულა.

## საერთო ეკრანები და მდგომარეობები

| ეკრანი / სცენარი | მდგომარეობა | მოწყობილობა | მეთოდი | შედეგი | მტკიცებულება |
|---|---|---|---|---|---|
| გაშვება / საწყისი ანიმაცია | ახალი process, storage/fonts readiness, home | M; A Debug ნიმუში | native launch + timing + screenshot | PASS | evidence/startup-ios-relaunch.json; evidence/startup-android-debug.json |
| პირველი შესვლა | 3 onboarding გვერდი, ბოლო ტექსტი/დასრულება, დიდი ფონტი | S 2.643 | handler + native scrollToEnd + screenshot | FIXED–VERIFIED | evidence/small-onboard-final.json; screenshots/after/small-large-onboarding-final-end.png |
| მთავარი / home sections | ჩვეულებრივი ტექსტი და სხვადასხვა ზომა | M/S/L/A | router + native screenshot | PASS | screenshots/before/qa-current-home.png; screenshots/after/{small,large,android}-home.png |
| კატალოგი | covers, centered caption, 3:4 image area | M/S/L/A | router + screenshot + source/assets check | PASS | screenshots/after/{small,large}-games.png; screenshots/after/android-catalog.png; src/ui/GameTile.tsx |
| კატალოგის გაზრდილი ტექსტი | caption wrapping, scroll | A 1.5; S 2.643 setup ნიმუშები | native font + screenshot | PASS მხოლოდ გადაღებული მდგომარეობებისთვის | screenshots/after/android-large-text-categories-final.png; screenshots/after/small-large-text-responsive.png |
| ძებნა | query matching, ცარიელი შედეგის fallback | კოდის/ტესტის გარემო | unit / source | PASS unit; native input NOT RUN | tests/standalone-games.test.ts; app/games.tsx |
| თამაშის აღწერა/წესები | 21 წესების გვერდი და ბოლო close | M | router + scroll + screenshot | PASS | evidence/rules-final.json; screenshots/after/rules-*.png |
| გრძელი წესები | Mafia ტექსტის ბოლო/მოქმედება | S/L/A | router + scroll + screenshot | PASS | screenshots/after/{small,large}-rules-mafia.png; screenshots/after/android-rules-mafia.png |
| უცნობი rules ID | fallback + მთავარზე დაბრუნება | M | handler + rendered state | PASS | evidence/rules-final.json |
| თამაშის წესების modal | shared RulesSheet, scroll / close | კოდი; setup ნატიური ეკრანები | source + bundle | PASS კოდის შემოწმება; ყოველი გახსნილი modal-ის native retest NOT RUN | src/ui/Cards.tsx; evidence/export-build.log |
| მოთამაშეები | მოკლე, გრძელი, დეფისი, ლათინური, ციფრი/# | S/M/L/A | callbacks + native screenshot/bounds | FIXED–VERIFIED | screenshots/after/small-12-players.png; evidence/small-roster-after-bounds.json |
| მოთამაშეების ფორმა | actual ეკრანული keyboard, active field | S/L/A | TextInput.focus + screenshot; data onChangeText | PASS ამ მეთოდით | screenshots/after/large-players-keyboard.png; screenshots/after/android-keyboard.png; screenshots/before/small-players-keyboard.png |
| მოთამაშეების ფორმა | whitespace/duplicate/max12 | S; unit | callbacks + screenshot + unit | PASS არსებული წესებით | screenshots/after/small-duplicate.png; screenshots/after/small-12-players.png; tests/rosterAudit.test.ts |
| reorder/delete/undo | ბოლო სახელები, down მიმართულება | S | callbacks + native bounds/scroll | FIXED–VERIFIED | screenshots/after/small-roster-reorder.png; evidence/small-roster-after-bounds.json |
| ცარიელი roster / minimum | 0/1 start guards და სხვადასხვა game's minimum | unit | engine tests | PASS unit; თითოეული game's native minimum NOT RUN | tests/fixes.test.ts; tests/gameLogicFixes.test.ts; src/games/*/engine.ts |
| rename dialog | კლავიატურა, Save/Cancel, large text | S 1/2.643 | focus + callbacks + screenshot | FIXED–VERIFIED | screenshots/before/small-rename-keyboard.png; screenshots/after/small-rename-keyboard.png; screenshots/after/small-large-text-rename.png |
| character picker | filter selected, 44 pt, long owner, scroll last, big font | S 1/2.643 | callbacks + measureInWindow + screenshot | FIXED–VERIFIED | evidence/small-picker-after-bounds.json; screenshots/after/small-large-text-picker-end-final.png |
| პარამეტრები | sound/haptics controls, scroll, common buttons | S/L/A | router + screenshot / sound unit | PASS ნატიური წარმოდგენა; რეალური მოსმენა/ჰაპტიკა NOT RUN | screenshots/after/{small,large,android}-settings.png; tests/sound.test.ts |
| category/compact choices | selected, wrap/one column, no ellipsis | S 1/2.643; A 1/1.5; L | native system text + callbacks/screenshot | FIXED–VERIFIED | screenshots/after/small-normal-categories.png; screenshots/after/small-large-text-responsive.png; screenshots/after/android-large-text-categories-final.png |
| exit confirmation | active game → cancel/continue, timer hold | M/L/A; S large rename მაგალითი | handler + actual elapsed timer + screenshot | PASS | evidence/wordrush-background-timer.json; screenshots/after/large-exit-dialog.png; screenshots/after/android-exit-dialog.png |
| active game interruption | Settings/background → return → pause/resume | L; A native font change | native launch + actual elapsed time + engine state | PASS | evidence/wordrush-background-timer.json; evidence/android-font-final.json |
| Android font settings | 1↔1.5 same intro/turn and changed RN metrics | A | native Settings/font change + new APK | FIXED–VERIFIED | evidence/android-font-final.json; screenshots/after/android-font-active-turn.png |
| secret role handoff | intentional open → release/next → concealed | M; A one Impostor role | callbacks + screenshot | PASS callbacks; actual touch BLOCKED | evidence/impostor-cycles.json; evidence/spy-final-cycle.json; evidence/android-private-final.json |
| secret interruption | hold → actual Settings → return; confirm reset | M/A | callbacks + native AppState transition + screenshot | FIXED–VERIFIED | screenshots/before/spy-resumed.png; screenshots/after/spy-resumed.png; screenshots/after/android-private-resumed.png |
| secret preview / hidden AX | OS switcher snapshot, transition flash, native AX tree | iOS/Android | native Computer Use attempt | BLOCKED | evidence/native-control-blocker.txt; report QA-01 |
| audio once / native finish | seek without pause vs pause/seek | A | real native expo-audio status events | FIXED–VERIFIED native mechanism | evidence/android-native-seek-without-pause.json; evidence/android-native-seek-with-pause.json |
| audio async races | play→stop/disable/release; stop→new play; rapid requests | unit real sound.ts / mock expo-audio | focused unit | FIXED–VERIFIED unit | tests/sound.test.ts; evidence/tests.log |
| TruthDare malformed additions | 60 additions / 277 records / heat decks / editor | unit + native M cycle | tests, editor Python, callbacks | FIXED–VERIFIED | tests/content.test.ts; tests/editorTruthDare.test.ts; evidence/truthdare-cycles.json |
| content regeneration | stale Swift source / retain all current texts | CLI | generator exit/hash | PASS protection; source reconciliation NOT RUN | evidence/content-generator-guard.txt |
| text contrast | 20 solid text/surface pairs | tokens | measured luminance/composited secondary | PASS measured pairs, min 6.42:1 | evidence/contrast.json |
| all image/gradient contrast | every pixel/background/title combination | — | — | NOT RUN | report QA-06 |
| native accessibility | reader order/modal focus/labels vs actual AX | iOS/Android | source + failed native control | BLOCKED actual test; source review done | evidence/native-control-blocker.txt; src/ui/PassPhoneReveal.tsx |
| Reduce Motion | system on/off and actual animations | iOS/Android | source | NOT RUN native; source support reviewed | src/ui/motion.ts; src/ui/LaunchAnimation.tsx |
| system/app Back & gestures | physical touch/back / rapid screen-transition presses | iOS/Android | source/unit vs native tool failure | BLOCKED physical; engine guards unit PASS | evidence/native-control-blocker.txt; tests/gameLogicFixes.test.ts |
| keyboard Done/Next | native text entry, focus traversal | iOS/Android | — | BLOCKED | evidence/native-control-blocker.txt |
| loading/storage/font/asset error | forced native failure and fallback UI | — | source only | NOT RUN fault injection | src/state/state.tsx |
| offline connection | bundled content offline architecture | source + native loaded bundles | code | PASS bundled-source check; airplane-mode native NOT RUN | src/content; app.json |
| auth/payment/subscription | არ არსებობს მიმდინარე app-ში | — | code inventory | NOT APPLICABLE — არ არის შესაბამისი flow | app/; src/games/catalog.data.json |
| push/deploy / real users | ამ აუდიტში არ იყო ნებადართული | — | — | NOT APPLICABLE | report.md |
| Tablet and other OS versions | პროექტი iPad-ს უშვებს, აქ არ დაიტესტა | — | — | NOT RUN | app.json |
| real phones | audio/listening/haptics/accelerometer/performance | — | adb inventory | BLOCKED Android phone unavailable; NOT RUN real phone tests | adb მხოლოდ emulator-5554; report.md |

## თამაშების კოდიდან აღრიცხული ფაზები

ქვემოთ ყველა phase არსებული engine-იდანაა. ჩამოთვლილი phase თავისთავად native PASS არ არის; შემდეგი ცხრილი ზუსტად აღწერს შესრულებულ გზას.

| თამაში / ID | არსებული ფაზები | native შესავალი | მტკიცებულება |
|---|---|---|---|
| No Yes No / `noyesno` | setup → handoff → playing → result → summary | M — PASS, handler + screenshot | [საწყისი](screenshots/before/noyesno-entry.png); [state](evidence/noyesno-entry.json) |
| Most Likely / `mostlikely` | setup → prompt → summary | M — PASS, handler + screenshot | [საწყისი](screenshots/before/mostlikely-entry.png); [state](evidence/mostlikely-entry.json) |
| Herd Mentality / `herd` | setup → question | M — PASS, handler + screenshot | [საწყისი](screenshots/before/herd-entry.png); [state](evidence/herd-entry.json) |
| The Line / `standards` | setup → discussion | M — PASS, handler + screenshot | [საწყისი](screenshots/before/standards-entry.png); [state](evidence/standards-entry.json) |
| Rate Them / `tenbut` | setup → card → summary | M — PASS, handler + screenshot | [საწყისი](screenshots/before/tenbut-entry.png); [state](evidence/tenbut-entry.json) |
| Imposter / `impostor` | setup → reveal → discussion | M — PASS, handler + screenshot | [საწყისი](screenshots/before/impostor-entry.png); [state](evidence/impostor-entry.json) |
| Spyfall / `spy` | setup → reveal → discussion → voting → mrWhiteGuess → roundResult → gameOver | M — PASS, handler + screenshot | [საწყისი](screenshots/before/spy-entry.png); [state](evidence/spy-entry.json) |
| Heads Up / `charades` | setup → turnIntro → countdown → playing → turnResult → summary | M — PASS, handler + screenshot | [საწყისი](screenshots/before/charades-entry.png); [state](evidence/charades-entry.json) |
| Bomb Party / `bomb` | setup → playing → exploded → gameOver | M — PASS, handler + screenshot | [საწყისი](screenshots/before/bomb-entry.png); [state](evidence/bomb-entry.json) |
| Mafia / `mafia` | setup → reveal → night → morning → discussion → dayVote → dayResult → gameOver | M — PASS, handler + screenshot | [საწყისი](screenshots/before/mafia-entry.png); [state](evidence/mafia-entry.json) |
| Who Wrote It? / `whowrote` | setup → intro → write → reading | M — PASS, handler + screenshot | [საწყისი](screenshots/before/whowrote-entry.png); [state](evidence/whowrote-entry.json) |
| 2 Truths, 1 Lie / `twotruths` | setup → writeHandoff → write → show | M — PASS, handler + screenshot | [საწყისი](screenshots/before/twotruths-entry.png); [state](evidence/twotruths-entry.json) |
| Never Have I Ever / `never` | setup → round → summary | M — PASS, handler + screenshot | [საწყისი](screenshots/before/never-entry.png); [state](evidence/never-entry.json) |
| Don't Laugh / `nolaugh` | setup → announce → round → result → summary | M — PASS, handler + screenshot | [საწყისი](screenshots/before/nolaugh-entry.png); [state](evidence/nolaugh-entry.json) |
| Alias / `alias` | setup → teams → turnIntro → countdown → playing → turnResult → winner | M — PASS, handler + screenshot | [საწყისი](screenshots/before/alias-entry.png); [state](evidence/alias-entry.json) |
| Wavelength / `wavelength` | setup → pass → clue → handoff → guess → side → locked → result → summary | M — PASS, handler + screenshot | [საწყისი](screenshots/before/wavelength-entry.png); [state](evidence/wavelength-entry.json) |
| Who Am I? / `whoami` | setup → turnIntro → countdown → playing → turnResult → summary | M — PASS, handler + screenshot | [საწყისი](screenshots/before/whoami-entry.png); [state](evidence/whoami-entry.json) |
| Word Rush / `wordrush` | setup → intro → playing → turnResult → summary | M — PASS, handler + screenshot | [საწყისი](screenshots/before/wordrush-entry.png); [state](evidence/wordrush-entry.json) |
| House Rules / `rulecard` | setup → card → summary | M — PASS, handler + screenshot | [საწყისი](screenshots/before/rulecard-entry.png); [state](evidence/rulecard-entry.json) |
| Do or Pay / `darecard` | setup → card → summary | M — PASS, handler + screenshot | [საწყისი](screenshots/before/darecard-entry.png); [state](evidence/darecard-entry.json) |
| Truth or Dare / `truthdare` | setup → turn → task → summary | M — PASS, handler + screenshot | [საწყისი](screenshots/before/truthdare-entry.png); [state](evidence/truthdare-entry.json) |

## შესრულებული თამაშის გზები

PASS ნიშნავს ქვემოთ აღწერილი გზის callback/ref შესრულებას რეალურ native აპში და შესაბამის screenshot/state მტკიცებულებას; ყველა თამაშის physical-touch ციკლი **BLOCKED**. თუ ქულა/summary არ არსებობს, ისინი ხელოვნურად არ დამატებულა. ადამიანის ხმამაღლა საუბარი/ხელის გაშვერა software simulator-ით არ შეფასებულა.

| თამაში | მოწყობილობა | შესრულებული გზა / მდგომარეობა | მეთოდი | შედეგი | მტკიცებულება |
|---|---|---|---|---|---|
| No Yes No | M | 6 turn; accepted/forbidden answer → results → replay; natural timer branch NOT RUN | handlers + native screenshot/state; ტაიმერებზე რეალური დრო | PASS მხოლოდ აღწერილი გზა | [ჩანაწერი](evidence/noyesno-cycles.json) |
| Most Likely | M | კითხვა → მინიშნება/ხელით ჩვენება → next; ორი ციკლი, exit/reentry | handlers + native screenshot/state; ტაიმერებზე რეალური დრო | PASS მხოლოდ აღწერილი გზა | [ჩანაწერი](evidence/mostlikely-cycles.json) |
| Herd Mentality | M | ზეპირი კითხვა → next; ორი ციკლი, exit/reentry | handlers + native screenshot/state; ტაიმერებზე რეალური დრო | PASS მხოლოდ აღწერილი გზა | [ჩანაწერი](evidence/herd-cycles.json) |
| The Line | M | საუბრის ბარათი → next; ორი ციკლი, exit/reentry | handlers + native screenshot/state; ტაიმერებზე რეალური დრო | PASS მხოლოდ აღწერილი გზა | [ჩანაწერი](evidence/standards-cycles.json) |
| Rate Them | M | შეფასების ბარათი → next; ორი ციკლი, exit/reentry | handlers + native screenshot/state; ტაიმერებზე რეალური დრო | PASS მხოლოდ აღწერილი გზა | [ჩანაწერი](evidence/tenbut-cycles.json) |
| Imposter | M; A interruption | 6 secret reveal → discussion → caught-check/no → result → next-round; caught-last-chance branch NOT RUN | handlers + native screenshot/state; ტაიმერებზე რეალური დრო | PASS მხოლოდ აღწერილი გზა | [ჩანაწერი](evidence/impostor-cycles.json) |
| Spyfall | M | 6 secret reveal → discussion → voting/elimination until winner → restart (ახალი reveal, 6 alive) | handlers + native screenshot/state; ტაიმერებზე რეალური დრო | PASS მხოლოდ აღწერილი გზა | [ჩანაწერი](evidence/spy-final-cycle.json) |
| Heads Up | M | 6 რეალური 30 წმ turn; correct/skip; landscape → summary → replay | handlers + native screenshot/state; ტაიმერებზე რეალური დრო | PASS მხოლოდ აღწერილი გზა | [ჩანაწერი](evidence/charades-timed-cycle.json) |
| Bomb Party | M; S extra exploded state | 6 მოთამაშე, 1 life, 5 ნამდვილი მოკლე ფითილი → elimination → winner → replay; S 12-player/large-text შედეგი | handlers + native screenshot/state; ტაიმერებზე რეალური დრო | PASS მხოლოდ აღწერილი გზა | [ჩანაწერი](evidence/bomb-cycle.json) |
| Mafia | M entry/rules only | engine, narration და unfinished sounds მომხმარებლის გამონაკლისია; სრული პარტია NOT RUN | handlers + native screenshot/state; ტაიმერებზე რეალური დრო | NOT RUN — engine გამონაკლისი | [ჩანაწერი](evidence/mafia-entry.json) |
| Who Wrote It? | S, 12 მოთამაშე | ყველა 12 writer → anonymous reading → შემდეგი კითხვა; guessing ყველა ავტორზე NOT RUN | handlers + native screenshot/state; ტაიმერებზე რეალური დრო | PASS მხოლოდ აღწერილი გზა | [ჩანაწერი](evidence/whowrote-cycle.json) |
| 2 Truths, 1 Lie | S | ერთი ავტორის 3 სინთეზური ამბავი → lie choice → public guessing → reveal → შემდეგი ავტორი; ყველა ავტორის როტაცია NOT RUN | handlers + native screenshot/state; ტაიმერებზე რეალური დრო | PASS მხოლოდ აღწერილი გზა | [keyboard](screenshots/after/small-twotruths-keyboard.png); [reveal](screenshots/after/small-twotruths-reveal.png) |
| Never Have I Ever | M | აღიარების ბარათი → next; ორი ციკლი, exit/reentry | handlers + native screenshot/state; ტაიმერებზე რეალური დრო | PASS მხოლოდ აღწერილი გზა | [ჩანაწერი](evidence/never-cycles.json) |
| Don't Laugh | M | 6 turn; task-next/laughed → results → replay; survived natural-timer branch NOT RUN | handlers + native screenshot/state; ტაიმერებზე რეალური დრო | PASS მხოლოდ აღწერილი გზა | [ჩანაწერი](evidence/nolaugh-cycles.json) |
| Alias | M | გუნდები → 4 ნამდვილი 30 წმ team turn → winner → ახალი პარტია (turnIntro); score corrections/tie NOT RUN | handlers + native screenshot/state; ტაიმერებზე რეალური დრო | PASS მხოლოდ აღწერილი გზა | [ჩანაწერი](evidence/alias-cycle.json) |
| Wavelength | A | clue hold/hide → handoff → dial guess → side → reveal → next; 10-point მატჩის summary → replay | handlers + native screenshot/state; ტაიმერებზე რეალური დრო | PASS მხოლოდ აღწერილი გზა | [ჩანაწერი](evidence/wavelength-cycle.json) |
| Who Am I? | L | 6 რეალური 60 წმ turn; guessed/skip; landscape → summary → replay | handlers + native screenshot/state; ტაიმერებზე რეალური დრო | PASS მხოლოდ აღწერილი გზა | [ჩანაწერი](evidence/whoami-timed-cycle.json) |
| Word Rush | M; L interruption | 6 ხელით დასრულებული turn → summary → replay; ცალკე real-time background/dialog pause | handlers + native screenshot/state; ტაიმერებზე რეალური დრო | PASS მხოლოდ აღწერილი გზა | [ჩანაწერი](evidence/wordrush-cycles.json) |
| House Rules | M | draw/swap → accept/release/done → finish; უსასრულო deck-ს summary არ აქვს | handlers + native screenshot/state; ტაიმერებზე რეალური დრო | PASS მხოლოდ აღწერილი გზა | [ჩანაწერი](evidence/rulecard-cycles.json) |
| Do or Pay | M | დავალება → next; ორი ციკლი, exit/reentry | handlers + native screenshot/state; ტაიმერებზე რეალური დრო | PASS მხოლოდ აღწერილი გზა | [ჩანაწერი](evidence/darecard-cycles.json) |
| Truth or Dare | M | 6 მოთამაშის სრული როტაცია; dare/swap/refuse/penalty და truth/next; exit | handlers + native screenshot/state; ტაიმერებზე რეალური დრო | PASS მხოლოდ აღწერილი გზა | [ჩანაწერი](evidence/truthdare-cycles.json) |

## დაუფარავი მდგომარეობები

ყველა game's დანარჩენი იშვიათი branch, ყველა მოდალი/disabled state ყოველ მოწყობილობაზე, ორი სრული პარტია ყველა finite თამაშში, restart სხვა roster-ით, მაქსიმალური/მინიმალური roster თითოეული game's native flow-ში, შედეგები ყველა ზომაზე/ყველა ენაზე და production release სხივის ტესტი — **NOT RUN**. ინგლისური TT game სათაურები და ქართული UI შემოწმდა; სხვა UI ლოკალიზაცია მიმდინარე პროდუქტში არ აღმოჩნდა (NOT APPLICABLE).

პატარა/დიდ ეკრანზე განმეორდა home, კატალოგი, players, გრძელი წესები, WordRush intro, shared dialog/keyboard; S-ზე დამატებით Twotruths/Whowrote და Bomb-ის შედეგი, L-ზე WhoAmI-ის სრული შედეგი. ერთი ზომის ყველა branch მეორე ზომაზე PASS-ად არ გადატანილა. Android-ზე iOS შედეგები ავტომატურად არ ითვლება: A-ს rows არის საკუთარი screenshot/state და native font/audio მტკიცებულება.

ჩვეულებრივ app გვერდებს ახალი landscape დიზაინი არ დაემატა. Heads Up / WhoAmI-ის ლანდშაფტი რეალურად დაირენდერა; სინთეზურად დაჭერილი correct/skip არ არის accelerometer-ის რეალური ტელეფონით ტესტი.

სქრინშოტების before საქაღალდე შეიცავს ამ QA ეტაპის დასაწყისის ჩანაწერებს, როცა სესიის ადრინდელი ცვლილებები უკვე არსებობდა. ყველაზე პირდაპირი კონტროლირებადი წყვილები: small rename, small reorder, spy resume და bomb exploded — იგივე native პროფილი და fontScale. მომხმარებლის ჩატის ძველი ფოტოები კონტექსტია, არა იგივე ზომით გადაღებული reference. რამდენიმე after ფაილი ასახავს შუალედურ დეფექტს (მაგ. `small-large-text-picker-end.png`, `android-large-text-categories.png`); საბოლოო ვერსია მითითებულია `*-final`/`*-settled` ფაილში ან report-ის კონკრეტულ ლინკში.

ღია P1 privacy შემოწმების და blocked native input/accessibility-ის გამო ეს coverage არ ამტკიცებს, რომ აპი მთლიანად დასრულებული ან release-ისთვის სრულად შემოწმებულია.
