# Testing and known limits

Tukany separates automated model checks from browser interaction and visual review.

## Run the checks

With Node.js 22 or newer:

```sh
node --test tests/*.test.mjs
node scripts/build.mjs
```

For formatting and browser checks, install the pinned development dependencies:

```sh
npm ci
npm run format:check
npx playwright install chromium firefox webkit
npm run test:browser
```

GitHub Actions runs formatting, unit tests, the build, and Playwright checks on
pull requests and pushes. All browser checks must pass before a push to `main`
can deploy to GitHub Pages. Browser failures retain traces, screenshots, and an
HTML report.

## What the automated tests establish

| Area                          | Evidence                                                                                                                                                      | Test source                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Catalog and formulas          | Unique, ascending pitch collections agree with their degree formulas; mode rotation is checked against expected intervals                                     | [music.test.mjs](../tests/music.test.mjs)                                                          |
| Pitch calculation             | 44 tunings × 67 catalog entries × 12 roots = 35,376 configurations; each point agrees with string pitch plus fret                                             | [music.test.mjs](../tests/music.test.mjs)                                                          |
| Handedness                    | Coordinates reverse horizontally while row order and sounding pitches remain consistent                                                                       | [music.test.mjs](../tests/music.test.mjs), [guide-layout.test.mjs](../tests/guide-layout.test.mjs) |
| Custom input and URLs         | Reject invalid notes, ordering, and formulas; round-trip custom states and normalize malformed values                                                         | [music.test.mjs](../tests/music.test.mjs)                                                          |
| Enharmonic labels             | Both names refer to the same pitch, and label choices preserve pitch, colors, and geometry                                                                    | [music.test.mjs](../tests/music.test.mjs), [scale-picker.test.mjs](../tests/scale-picker.test.mjs) |
| Key spelling                  | Written-degree spellings, explicit enharmonic tonics, double accidentals, and correct notated octaves across the catalog                                      | [spelling.test.mjs](../tests/spelling.test.mjs)                                                    |
| Pattern explanations          | Compact captions identify the lowest note and follow key spelling and language settings                                                                       | [pattern-summary.test.mjs](../tests/pattern-summary.test.mjs)                                      |
| Scale selector                | Common scales open on a fresh visit and every named scale and arpeggio is reachable through its family                                                        | [scale-picker.test.mjs](../tests/scale-picker.test.mjs)                                            |
| Regional localization         | Matching translation keys, catalog coverage, regional tags, saved preferences, and custom shared URLs                                                         | [locales.test.mjs](../tests/locales.test.mjs)                                                      |
| Handedness interaction        | Radio selection by pointer and keyboard, mirrored geometry, unchanged fingering points, and saved preferences                                                 | [handedness.spec.mjs](../tests/e2e/handedness.spec.mjs)                                            |
| Fretboard keyboard navigation | One tab stop, directional movement for both hands, and localized note labels                                                                                  | [board-navigation.test.mjs](../tests/board-navigation.test.mjs)                                    |
| Scale patterns                | Exact string/fret membership, reference fixtures, main-scale coverage, complete routes, tuning restrictions, and honest map fallback                          | [patterns.test.mjs](../tests/patterns.test.mjs)                                                    |
| Pattern range markers         | Shared bracket rows, overlap handling, mirrored fret alignment, localized labels, and bounded hit areas                                                       | [pattern-ranges.test.mjs](../tests/pattern-ranges.test.mjs)                                        |
| Interval names                | Written intervals have localized names in all three languages                                                                                                 | [intervals.test.mjs](../tests/intervals.test.mjs)                                                  |
| Workspace preferences         | Recall instrument/string setups and custom tunings; explicit URL fields override saved preferences                                                            | [workspace.test.mjs](../tests/workspace.test.mjs)                                                  |
| Archived lesson PDFs          | Match actual language, instrument, count, orientation, and sounding tuning pitches, including enharmonic equivalents                                          | [guides.test.mjs](../tests/guides.test.mjs)                                                        |
| PDF geometry and navigation   | Check neck bounds, octave routes, contents pagination, page sizes, fonts, and real internal destinations                                                      | [guide-layout.test.mjs](../tests/guide-layout.test.mjs), [pdf.test.mjs](../tests/pdf.test.mjs)     |
| Audio                         | Tune seven pitches at 44.1 and 48 kHz within 3 cents and check harmonic balance, decay, caching, and pluck stopping                                           | [string-audio.test.mjs](../tests/string-audio.test.mjs)                                            |
| Browser flows                 | Chromium, Firefox, and WebKit checks cover exact patterns, mobile layouts, jump focus, drafts/preferences, key spelling, audio, and PDF cancellation/download | [workspace.spec.mjs](../tests/e2e/workspace.spec.mjs)                                              |
| Appearance preferences        | Light on first visit, saved themes, independence from OS appearance, unavailable storage, keyboard switching, dark mobile layouts, and reduced motion         | [appearance.spec.mjs](../tests/e2e/appearance.spec.mjs)                                            |
| Published assets              | Check that the entry point, appearance bootstrap, icon font, stylesheet, and module imports use one revision                                                  | [build.test.mjs](../tests/build.test.mjs)                                                          |

Some checks enumerate the full finite catalog; others use representative cases.
The bracket tests cover every named scale and arpeggio on all five supported guitar
and bass string counts. They check the fret endpoints, minimum row count, and matching
row assignments in both orientations across the octave and full-neck views.
The tests do not independently certify the cultural naming of every scale,
perceptual realism of synthesized audio, or every possible custom tuning.

## Manual release checklist

Serve a fresh build with `node scripts/serve.mjs` and check the following:

- Confirm scale selection and clickable pattern ranges lead into the fretboard, with note
  details and display options below it. Scale selection and instrument
  setup should be side by side on wider screens and stacked on phones, with scale
  selection first. The two panels should have equal height when side by side. PDF settings remain inline below the playing surface, without
  application dialogs or popovers. Repeated intro, setup-summary, exercise, and PDF-configuration cards should not appear.
- Switch guitar/bass and every supported string count; confirm available tunings
  and fret defaults, then confirm a previous setup can be recalled.
- Open the tuning picker by pointer and keyboard. Check that long pitch names
  wrap within the list on phones. Choose a preset and
  confirm the button shows its name and open-string pitches. Reopen the list and
  press Escape to dismiss it while keeping that tuning.
- Change handedness and tuning directly in the instrument card, including a custom
  tuning with octave numbers. Invalid input must remain uncommitted with an inline
  explanation. Apply and cancel custom pitch edits and change instrument/string
  count while editing to check that the draft state resets cleanly.
- Check that the instrument and handedness choices are visible on phones in all
  three languages. Select Guitar, Bass, Right-handed, and Left-handed by pointer
  and by keyboard. Tap and drag each switch. Check that the filled pill and checkmark move to the selected
  label in both themes and that keyboard focus is visible. Select the numeric string and fret
  counts, then confirm the tuning picker shows the matching open pitches. Changing handedness
  should mirror the board and range labels while keeping the same fingering points.
  On a fresh visit, verify Right-handed is first and selected. Choose Left-handed,
  switch to bass, and reload. Confirm the bass stays left-handed. Choose Right-handed
  on bass and switch back to guitar. Confirm the guitar is right-handed. Open a
  shared link with an explicit orientation and verify the diagram matches it.
- Choose a root note, browse scale families in all three languages, and select a
  scale or arpeggio with the pointer or keyboard. Browsing retains the selection.
  Choosing a result updates the card title, checkmark, and formula degrees.
  After selection, check that keyboard focus stays on the chosen result. Arrow
  keys should follow the visible rows and columns after the catalog reflows.
- Open the formula editor, change a degree, and cancel. Confirm the displayed
  degrees still match the selected scale. Edit again, then change root, spelling,
  or instrument to check that the draft survives. Choose a named scale to reset
  it, and test invalid custom input.
  Switch language during a draft and confirm pitch values survive while string
  labels and active validation messages translate.
- Switch Note names between sharps, flats, both, and By key. Check that the same
  12 circles remain in the Scale card and the selected root keeps its position.
  In By key, compare F♯ major (seventh degree E♯) with G♭ major (fourth degree C♭).
  Switch between notes and degrees and check that the reference buttons fit their
  labels and the fretboard retains its horizontal scroll position.
- On a device set to dark mode, open a fresh session and confirm the page starts
  in Light. Switch to Dark, reload, and open a shared musical link to check the
  saved choice. Changing the OS appearance should preserve the selected theme.
  Switch back to Light and check it persists. Repeat the toggle with storage
  unavailable. Confirm focused notes, selected patterns, and playback survive
  each switch.
- Inspect dark controls, note labels, root rings, pattern guides, and keyboard
  focus. Icons should reinforce action labels. Emulate reduced motion and confirm
  motion stops while selection and sounding notes remain visible. Downloaded
  PDFs should retain their light reference palette.
- Switch the reference row between notes and degrees, tap its values, then use
  board notes with the pointer or keyboard. Check pitch-class highlights and the
  exact string/fret detail, which appears only after inspection. Check that changing
  the pattern stops the current note.
- Start without saved preferences and confirm frets 0–12 is selected. Use the
  sliding switch to show the full neck, reload, and confirm the view is remembered.
  Check that the limited-view label changes from 0–12 to 12–0 for left-handed playing.
  Reopen the bare URL to resume the last scale, root, view, and pattern. Open an
  explicit musical shared link to check that it takes priority over saved practice.
- Customize PDF contents and reference notes in the section below the fretboard.
  Preview larger scopes and cancel an export. Change the musical setup during an
  export and confirm the downloaded file retains the captured scale, root, and
  configuration. Compare the page estimate with the output and inspect
  representative pages.
- Compare all five major and natural-minor CAGED positions and the pentatonic
  shapes with the original teaching diagrams. Confirm C major Position 1 contains
  exactly 17 points at frets 7–10, including high-E fret 8 and no fret 12.
  Choose every offered pattern;
  notes at the same fret on different strings must be emphasized independently.
  Change root and tuning and confirm the shape is recalculated or an explicit
  unsupported-pattern explanation appears. Test six- and seven-string guitar,
  uniform detuning, altered tuning intervals, uncommon scales, and generated bass
  routes. Seven-string major/minor should use the labeled three-notes-per-string
  system. Check all major-scale modes, harmonic and melodic minor with their
  modes, both blues scales, whole tone, and both diminished scales. Three- and
  four-note routes can shift along the neck; they should not be labeled CAGED.
  Unsupported collections and altered tuning intervals should explain their
  note-map fallback.
- In frets 0–12, verify every offered pattern fits completely. Compare octave
  placements with the full-neck view: a pattern may shift as a whole by 12 frets,
  but individual notes must not be clipped or wrapped. Select a full-neck pattern
  that cannot fit, switch to 0–12, and confirm the selection clears. The full-neck
  cue should explain missing pattern numbers.
- Check old numeric-range links clear the pattern selection, and new pattern links
  and saved preferences restore valid selections in the chosen neck view. Click a
  selected pattern bracket again to clear it and restore visible scale notes to color
  without resetting horizontal scroll. No separate pattern or half-neck buttons
  should remain. Check that separated brackets can share a row and that overlapping
  ones sit at different heights. Each bracket must show a localized label such as
  “Pattern 1”, align with its frets in either handedness, and scroll with the diagram.
  Both ends must have vertical guides continuing through
  the neck behind notes; the selected guides should be stronger. Test Enter and
  Space and confirm focus stays on the activated range after the board updates.
  The neck should keep its dimensions across pattern selections. Navigate
  muted and highlighted notes by keyboard and confirm pattern brackets retain access.
  Check that the 0–12/full-neck switch sits in the header, wraps
  cleanly on phones, and remains keyboard-operable.
- Check 320, 390, 720, 860, and 1280 CSS-pixel layouts. Only the fretboard should
  scroll horizontally; inline control groups and the scale results must stay within
  the page width.

The permanent suite runs workspace and appearance flows in Chromium, Firefox, and
WebKit. It includes phone-width checks in all three languages, both instruments,
and both handedness settings. Additional visual checks inspect complete
pages and generated PDFs; the layout measurement approach is recorded in
[design.md](design.md#layout-measurement).

## Known limits

- **Browser coverage:** CI covers Chromium, Firefox, and WebKit. WebKit coverage
  does not replace physical Safari/iPhone, Android, mobile-keyboard, and screen-reader
  testing. Native modules, Web Audio, and modern CSS are required.
- **Accessibility:** keyboard controls, labels, selection focus, and reduced-motion
  styling are implemented. A formal accessibility audit has not been completed;
  there is no WCAG conformance claim.
- **Music scope:** the catalog contains 67 named 12-tone collections, not every
  possible scale or tuning tradition. Pelog is explicitly a 12-tone approximation.
  Melodic minor uses its ascending/jazz form in both directions.
- **Spelling:** Key mode follows the written degree formula; Both, Sharps, and
  Flats retain simpler pitch-name displays. Automatic enharmonic tonic choices
  are a display convention; explicit root spellings take priority.
- **Practice guidance:** the app does not analyze a YouTube track, infer its
  chords, or guarantee that one scale fits an entire progression.
- **Patterns:** compact major/minor positions match the chosen CAGED reference;
  numbering conventions can differ between teaching systems. These note sets do
  not prescribe which finger every player must use. Unsupported scale/tuning
  combinations and unreachable bass routes keep an explicit note-map fallback;
  the catalog can display more scales than it can offer verified fingerings for.
- **Audio:** plucked strings are synthesized, not recorded instrument samples.
  Audio needs a user gesture and may be unavailable under browser/device restrictions.
- **PDFs:** large catalogs use more time and memory; cancellation is available.
  Automated checks cover selected structures and examples, not all combinations
  of export settings. Four original lesson PDFs are included as repository assets.
- **State and privacy:** preferences are stored on the device when storage is
  available. URLs intentionally expose the musical configuration for sharing;
  the app has no application backend or analytics. Following the backing-track
  link opens the musical query in a new YouTube tab. YouTube, hosting, and
  repository services have their own policies.
- **Outcomes:** there are no published adoption, usability-study, learning-gain,
  or performance benchmark results.
