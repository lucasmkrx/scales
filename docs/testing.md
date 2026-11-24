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

| Area                          | Evidence                                                                                                                                                      | Test source                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Catalog and formulas          | Unique, ascending pitch collections agree with their degree formulas; mode rotation is checked against expected intervals                                     | [music.test.mjs](../tests/music.test.mjs)                                                                |
| Pitch calculation             | 44 tunings × 67 catalog entries × 12 roots = 35,376 configurations; each point agrees with string pitch plus fret                                             | [music.test.mjs](../tests/music.test.mjs)                                                                |
| Handedness                    | Coordinates reverse horizontally while row order and sounding pitches remain consistent                                                                       | [music.test.mjs](../tests/music.test.mjs), [guide-layout.test.mjs](../tests/guide-layout.test.mjs)       |
| Custom input and URLs         | Reject invalid notes, ordering, and formulas; round-trip custom states and normalize malformed values                                                         | [music.test.mjs](../tests/music.test.mjs)                                                                |
| Enharmonic labels             | Both names refer to the same pitch, and label choices preserve pitch, colors, and geometry                                                                    | [music.test.mjs](../tests/music.test.mjs), [scale-picker.test.mjs](../tests/scale-picker.test.mjs)       |
| Key spelling                  | Written-degree spellings, explicit enharmonic tonics, double accidentals, and correct notated octaves across the catalog                                      | [spelling.test.mjs](../tests/spelling.test.mjs)                                                          |
| Pattern explanations          | Compact captions identify the lowest note and follow key spelling and language settings                                                                       | [pattern-summary.test.mjs](../tests/pattern-summary.test.mjs)                                            |
| Scale selector                | Common scales open on a fresh visit and every named scale and arpeggio is reachable through its family                                                        | [scale-picker.test.mjs](../tests/scale-picker.test.mjs)                                                  |
| Regional localization         | Matching translation keys, catalog coverage, regional tags, saved preferences, and custom shared URLs                                                         | [locales.test.mjs](../tests/locales.test.mjs)                                                            |
| Handedness interaction        | Radio selection by pointer and keyboard, mirrored geometry, unchanged fingering points, and saved preferences                                                 | [handedness.spec.mjs](../tests/e2e/handedness.spec.mjs)                                                  |
| Fretboard keyboard navigation | One tab stop, directional movement for both hands, and localized note labels                                                                                  | [board-navigation.test.mjs](../tests/board-navigation.test.mjs)                                          |
| Scale patterns                | Exact string/fret membership, reference fixtures, main-scale coverage, complete routes, tuning restrictions, and honest map fallback                          | [patterns.test.mjs](../tests/patterns.test.mjs)                                                          |
| Pattern range markers         | Shared bracket rows, overlap handling, mirrored fret alignment, localized labels, and bounded hit areas                                                       | [pattern-ranges.test.mjs](../tests/pattern-ranges.test.mjs)                                              |
| Interval names                | Written intervals have localized names in all six languages                                                                                                   | [intervals.test.mjs](../tests/intervals.test.mjs)                                                        |
| Workspace preferences         | Recall instrument/string setups and custom tunings; explicit URL fields override saved preferences                                                            | [workspace.test.mjs](../tests/workspace.test.mjs)                                                        |
| PDF geometry and navigation   | Check neck bounds, octave routes, contents pagination, page sizes, fonts, and real internal destinations                                                      | [guide-layout.test.mjs](../tests/guide-layout.test.mjs), [pdf.test.mjs](../tests/pdf.test.mjs)           |
| Audio                         | Tune seven pitches at 44.1 and 48 kHz within 3 cents and check harmonic balance, decay, caching, and pluck stopping                                           | [string-audio.test.mjs](../tests/string-audio.test.mjs)                                                  |
| Browser flows                 | Chromium, Firefox, and WebKit checks cover exact patterns, mobile layouts, jump focus, drafts/preferences, key spelling, audio, and PDF cancellation/download | [workspace.spec.mjs](../tests/e2e/workspace.spec.mjs)                                                    |
| Appearance preferences        | Light on first visit, saved themes, independence from OS appearance, unavailable storage, keyboard switching, dark mobile layouts, and reduced motion         | [appearance.spec.mjs](../tests/e2e/appearance.spec.mjs)                                                  |
| Published assets              | Check that the entry point, appearance bootstrap, icon font, stylesheet, and module imports use one revision                                                  | [build.test.mjs](../tests/build.test.mjs)                                                                |
| Search discovery              | Check the language editions, canonical URLs, crawler policy, and sitemap                                                                                      | [discovery-files.test.mjs](../tests/discovery-files.test.mjs), [build.test.mjs](../tests/build.test.mjs) |

Some checks enumerate the full finite catalog; others use representative cases.
The bracket tests cover every named scale and arpeggio on all five supported guitar
and bass string counts. They check the fret endpoints, minimum row count, and matching
row assignments in both orientations for first-octave and full-neck pattern placements.
The tests do not independently certify the cultural naming of every scale,
perceptual realism of synthesized audio, or every possible custom tuning.

## Manual release checklist

Serve a fresh build with `node scripts/serve.mjs` and check the following:

- Open and dismiss the instrument dropdown at desktop and phone widths. Check that
  the button shows the active instrument and tuning, and that opening the dropdown
  keeps the fretboard in position. Verify the display controls sit inside the diagram
  and the PDF downloads sit below the playing surface.
- Switch guitar/bass and every supported string count; confirm available tunings
  and fret defaults, then confirm a previous setup can be recalled.
- Open the tuning picker by pointer and keyboard. Check that long pitch names
  wrap within the list on phones. Choose a preset and
  confirm the button shows its name and open-string pitches. Reopen the list and
  press Escape to dismiss it while keeping that tuning.
- Choose **Customize tuning** from a preset. Step a string by a semitone and type
  a pitch with an octave. Check that errors appear beside the affected string and
  that **Cancel edit** restores the instrument settings. Apply a tuning and reopen
  its practice link to verify the pitches.
- Check that the instrument and handedness choices are visible on phones in all
  six languages. Select Guitar, Bass, Right-handed, and Left-handed by pointer
  and by keyboard. Tap and drag each switch. Check that the filled pill and checkmark move to the selected
  label in both themes and that keyboard focus is visible. Select the numeric string and fret
  counts, then confirm the tuning picker shows the matching open pitches. Changing handedness
  should mirror the board and range labels while keeping the same fingering points.
  On a fresh visit, verify Right-handed is first and selected. Choose Left-handed,
  switch to bass, and reload. Confirm the bass stays left-handed. Choose Right-handed
  on bass and switch back to guitar. Confirm the guitar is right-handed. Open a
  shared link with an explicit orientation and verify the diagram matches it.
- Choose a root note, browse scale families in all six languages, and select a
  scale or arpeggio with the pointer or keyboard. Browsing retains the selection.
  Choosing a result updates the fretboard heading, checkmark, and formula degrees.
  After selection, check that keyboard focus stays on the chosen result. Arrow
  keys should follow the visible rows and columns after the catalog reflows.
- Select a scale and play a formula degree. Check that its spelled pitch matches
  the highlighted notes. Open a saved custom-formula link and confirm its degrees
  still display after switching languages.
- Tap the 12 roots on a phone and use the arrow keys on a desktop. Check that
  focus moves in circle-of-fifths order and that the ring center and fretboard
  show the same root. Open an older link to G♭ major with `spelling=both` and
  confirm that the F♯ / G♭ button stays selected and the fourth degree is C♭.
  Switch between notes and degrees, then toggle Show other notes. Check that the
  fretboard retains its horizontal scroll position and that the formula continues
  to show each degree with its spelled note.
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
- Play formula buttons and fretboard notes by pointer and keyboard. Check the
  pitch-class highlights and the inspected string/fret detail. Changing the
  pattern should stop the current note.
- Open a translated edition with JavaScript disabled. Check its heading,
  language links, and canonical URL in the HTML source. After deployment,
  fetch the production sitemap and open the edition from it. [Release verification and submission](discovery.md#verify-a-release)
- On a narrow screen, start at the nut in both orientations and scroll to the
  last fret. Save a bass setup and a selected pattern. Reopen the bare URL,
  then `/fr/` and the older `/?lang=fr`, and confirm all three resume that setup.
  Open
  `?key=F&scale=minor-blues&hand=left` and check for a left-handed six-string
  guitar in standard tuning, English labels, and the full fretboard. Open a
  legacy link with numeric `root` and `neck=octave`, then copy its link and
  check that the compact URL reopens the same selection on a second device.
- Download the individual chart, current family and full catalog. Compare the
  displayed counts with the files. Switch from A4 to US Letter and verify the
  page dimensions and remembered choice. Try a custom formula, then open its
  single-page chart. Follow a family bookmark and an alphabetical index link
  in the catalog. Cancel an export, then
  change the musical setup during another and check that its PDF reflects the
  configuration captured at the start.
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
- Confirm each offered fingering fits within the instrument’s fret count.
  Select each pattern and check the staff contains just its distinct pitches.
  Clear the pattern and compare the overview with the union of their pitches.
  Try an unsupported tuning and inspect a fret outside the displayed octave.
- Check old numeric-range links clear the pattern selection, and new pattern links
  and saved preferences restore valid selections on the full neck. Click a
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
- Check 320, 390, 720, 860, and 1280 CSS-pixel layouts. The fretboard and staff should
  scroll within their own surfaces. The page, inline controls, and scale results
  should stay within the viewport width.

The permanent suite runs workspace and appearance flows in Chromium, Firefox, and
WebKit. It includes phone-width checks, language changes, both instruments,
and both handedness settings. Additional visual checks inspect the homepage
and generated PDFs. The layout measurement approach is recorded in
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
- **Spelling:** Note names follow the written degree formula. An explicit tonic
  spelling takes priority over the automatic enharmonic choice.
- **Practice guidance:** track matching uses the musical information in the
  catalog. To check a new entry, confirm the key and tempo against the creator’s
  description and verify that playback advances inside Tukany.
- **Patterns:** compact major/minor positions match the chosen CAGED reference;
  numbering conventions can differ between teaching systems. These note sets do
  not prescribe which finger every player must use. Unsupported scale/tuning
  combinations and unreachable bass routes keep an explicit note-map fallback;
  the catalog can display more scales than it can offer verified fingerings for.
- **Audio:** plucked strings are synthesized, not recorded instrument samples.
  Audio needs a user gesture and may be unavailable under browser/device restrictions.
- **PDFs:** large catalogs use more time and memory; cancellation is available.
  Automated checks cover selected structures and examples, not all combinations
  of export settings.
- **State and privacy:** preferences are stored on the device when storage is
  available. URLs intentionally expose the musical configuration for sharing;
  the app has no application backend or analytics. Browsing backing tracks
  happens locally. Selecting a track connects to YouTube to load the embedded player.
  Hosting and repository services have their own policies.
- **Outcomes:** there are no published adoption, usability-study, learning-gain,
  or performance benchmark results.
