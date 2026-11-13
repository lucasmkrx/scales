# Testing and known limits

Scales separates automated model checks from browser interaction and visual review.

## Run the checks

With Node.js 22 or newer:

```sh
node --test tests/*.test.mjs
node scripts/build.mjs
```

For formatting checks, install the pinned development dependency:

```sh
npm ci
npm run format:check
```

GitHub Actions runs formatting, tests, and the build on pull requests and pushes.
Successful pushes to `main` also deploy to GitHub Pages. Manual browser checks
are not automated by that workflow.

## What the automated tests establish

| Area                          | Evidence                                                                                                                    | Test source                                                                                        |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Catalog and formulas          | Unique, ascending pitch collections agree with their degree formulas; mode rotation is checked against expected intervals   | [music.test.mjs](../tests/music.test.mjs)                                                          |
| Pitch calculation             | 44 tunings × 67 catalog entries × 12 roots = 35,376 configurations; each point agrees with string pitch plus fret           | [music.test.mjs](../tests/music.test.mjs)                                                          |
| Handedness                    | Coordinates reverse horizontally while row order and sounding pitches remain consistent                                     | [music.test.mjs](../tests/music.test.mjs), [guide-layout.test.mjs](../tests/guide-layout.test.mjs) |
| Custom input and URLs         | Reject invalid notes, ordering, and formulas; round-trip custom states and normalize malformed values                       | [music.test.mjs](../tests/music.test.mjs)                                                          |
| Enharmonic labels             | Both names refer to the same pitch; label choices preserve pitch, colors, geometry, and playback                            | [music.test.mjs](../tests/music.test.mjs), [scale-picker.test.mjs](../tests/scale-picker.test.mjs) |
| Search                        | Common choices are curated; every catalog entry remains reachable; multilingual and accent-insensitive search works         | [scale-picker.test.mjs](../tests/scale-picker.test.mjs)                                            |
| Regional localization         | Matching translation keys, catalog coverage, regional tags, saved preferences, and custom shared URLs                       | [locales.test.mjs](../tests/locales.test.mjs)                                                      |
| Fretboard keyboard navigation | One tab stop, directional movement for both hands, and localized note labels                                                | [board-navigation.test.mjs](../tests/board-navigation.test.mjs)                                    |
| Practice positions            | Playback and short exercises stay inside the highlighted range, including partial octaves and custom tunings                | [practice.test.mjs](../tests/practice.test.mjs)                                                    |
| Workspace preferences         | Recall instrument/string setups and custom tunings; explicit URL fields override saved preferences                          | [workspace.test.mjs](../tests/workspace.test.mjs)                                                  |
| Archived lesson PDFs          | Match actual language, instrument, count, orientation, and sounding tuning pitches, including enharmonic equivalents        | [guides.test.mjs](../tests/guides.test.mjs)                                                        |
| PDF geometry and navigation   | Check neck bounds, octave routes, contents pagination, page sizes, fonts, and real internal destinations                    | [guide-layout.test.mjs](../tests/guide-layout.test.mjs), [pdf.test.mjs](../tests/pdf.test.mjs)     |
| Audio                         | Test seven pitches at 44.1 and 48 kHz with a 3-cent tolerance, decay, repeatability, caching, and stopping scheduled voices | [string-audio.test.mjs](../tests/string-audio.test.mjs)                                            |
| Published assets              | Check that entry point, stylesheet, and module imports use one revision                                                     | [build.test.mjs](../tests/build.test.mjs)                                                          |

Some checks enumerate the full finite catalog; others use representative cases.
The tests do not independently certify the cultural naming of every scale,
perceptual realism of synthesized audio, or every possible custom tuning.

## Manual release checklist

Serve a fresh build with `node scripts/serve.mjs` and check the following:

- Confirm scale selection and range controls lead into the fretboard, with note
  details and playback/display options below it. Scale selection and instrument
  setup should be side by side on wider screens and stacked on phones, with scale
  selection first. The two panels should have equal height when side by side. PDF settings remain inline below the playing surface, without
  application dialogs or popovers. Use the instrument summary link to reach setup.
- Switch guitar/bass and every supported string count; confirm available tunings
  and fret defaults, then confirm a previous setup can be recalled.
- Change handedness and tuning directly in the instrument card, including a custom
  tuning with octave numbers. Invalid input must remain uncommitted with an inline
  explanation. Apply and cancel custom pitch edits and change instrument/string
  count while editing to check that the draft state resets cleanly.
- Search all three languages in the inline catalog, browse scales and arpeggios,
  and choose results with the pointer or keyboard. Browsing retains the selection.
  After selection, check that keyboard focus stays on the chosen result. Arrow
  keys should follow the visible rows and columns after the catalog reflows.
- Edit a custom formula, then change root, spelling, or instrument to check that the
  draft survives. Choose a named scale to reset it, and test invalid custom input.
  Switch language during a draft and confirm pitch values survive while string
  labels and active validation messages translate.
- Use the inline notes/degrees, spelling, and outside-note controls. Confirm that
  settings remain available and horizontal fretboard scroll is retained.
- Play a low and high position and confirm the sounding MIDI notes are visible.
  Change tempo, repeat a position, and stop or change configuration during a pass.
  No old scheduled sequence should continue.
- Tap notes and degrees in the table, then board notes with the pointer or keyboard.
  Check pitch-class highlights and the exact string/fret detail.
- Reopen the bare URL to resume the last scale, root, and range. Open an explicit
  musical shared link to check that it takes priority over saved practice.
- Customize PDF contents and reference notes in the section below the fretboard.
  Preview larger scopes and cancel an export. Change the musical setup during an
  export and confirm its displayed configuration stays with the captured snapshot
  until completion, then refreshes. Compare the page estimate with the output and
  inspect representative pages.
- Select each position button, frets 0–12, and the full neck. Confirm one selected
  button, keyboard access, and copied-link restoration. The full neck must keep
  the same dimensions for every selection, with gray notes only outside the
  highlighted frets. Full neck restores every scale note to color.
  Navigate notes with the arrow keys after changing a position.
- Check 320, 390, 720, 860, and 1280 CSS-pixel layouts. Only the fretboard should
  scroll horizontally; inline control groups and the scale results must stay within
  the page width.

The refactored homepage was checked in Chromium at 320, 390, 720, and 1280 CSS pixels
in all three languages. The checks covered page-width containment, keyboard
selection, draft validation, saved and shared state, playback, PDF downloads,
cancellation, and changing settings during an export. These are targeted manual
checks, not a permanent browser test suite. The layout measurement approach
is recorded in [design.md](design.md#layout-measurement).

## Known limits

- **Browser coverage:** recent manual checks use Chromium.
  Safari, Firefox, Android, iOS keyboards, and screen-reader combinations need
  broader verification. Native modules, SVG, Web Audio, and modern CSS are required.
- **Accessibility:** keyboard controls, labels, selection focus, and reduced-motion
  styling are implemented. A formal accessibility audit has not been completed;
  there is no WCAG conformance claim.
- **Music scope:** the catalog contains 67 named 12-tone collections, not every
  possible scale or tuning tradition. Pelog is explicitly a 12-tone approximation.
  Melodic minor uses its ascending/jazz form in both directions.
- **Spelling:** note names prioritize familiar sharp/flat equivalents. Degree
  formulas retain interval meaning; the app does not enforce formal diatonic
  spellings such as E♯ and C♭ for every key.
- **Practice guidance:** the app does not analyze a YouTube track, infer its
  chords, or guarantee that one scale fits an entire progression.
- **Diagrams:** guitar windows are position references, not prescribed fingerings
  or a universal CAGED system. Extreme custom tunings can require a position-map
  fallback when a bass octave route cannot be reached.
- **Audio:** plucked strings are synthesized, not recorded instrument samples.
  Audio needs a user gesture and may be unavailable under browser/device restrictions.
- **PDFs:** large catalogs use more time and memory; cancellation is available.
  Automated checks cover selected structures and examples, not all combinations
  of export settings. Four original lesson PDFs are included as repository assets.
- **State and privacy:** preferences are stored on the device when storage is
  available. URLs intentionally expose the musical configuration for sharing;
  the app has no application backend or analytics. Hosting and repository services
  have their own policies.
- **Outcomes:** there are no published adoption, usability-study, learning-gain,
  or performance benchmark results.
