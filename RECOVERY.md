# Recovery checkpoint — 2026-09-20

Recovered from the earlier session's source edits and surviving simulator assets.
A source/assets archive and binary Git diff were saved outside this repository before repair.

Restored:
- Quiet purple background, phosphor edge light and neon controls; preserved current OPA Home, posters and dock.
- Twelve transparent character portraits and twelve avatar crops. Restored portrait display on public handoffs and turn introductions, plus roster and scoreboard avatars.
- Classic two-team Wavelength engine and semicircular dial. Reconnected the phone flow with setup help, private viewing, handoff, opponent prediction and result phases.
- Classic Herd free answers, agreed answer merging, pink cow, ties and eight-point goal.
- DareCard participant-specific results and DareCard/RuleCard point penalties.
- Phone-specific rules, Undercover description and embedded TenBut help.
- Manual character/gender selections now survive reload even when the name suggests another selection.
- Corrected the content-generator script path. Existing word/question banks were not modified.

Validation:
- 143 tests passed; TypeScript passed.
- All static asset references resolved. All 24 character PNGs have real alpha transparency.
- Every home catalog entry has a registered flow. The 19 catalog entries include Read the Room, which contains three playable modes; they are not missing separate home tiles.
- iOS release JS bundle exported and installed on iPhone 17 simulator.
- Visually verified Home, roster, character picker and Wavelength handoff/dial/result flow.
- Existing content bank is byte-identical to the saved pre-edit original.

Limits:
- Not every game has been manually played end to end during this recovery. Engine tests cover restored scoring and phase transitions.
- Android APK has not been built; the user requested building it only when explicitly asked.
- This checkpoint covers the React Native app; the separate Swift project was not changed.
