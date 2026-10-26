# Testing and known limits

Scales separates automated model checks from browser interaction and visual review.
The current suite has **34 tests**. That count is a snapshot, not a coverage percentage.

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

| Area                        | Evidence                                                                                                                    | Test source                                                                                        |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Catalog and formulas        | Unique, ascending pitch collections agree with their degree formulas; mode rotation is checked against expected intervals   | [music.test.mjs](../tests/music.test.mjs)                                                          |
| Pitch calculation           | 44 tunings × 67 catalog entries × 12 roots = 35,376 configurations; each point agrees with string pitch plus fret           | [music.test.mjs](../tests/music.test.mjs)                                                          |
| Handedness                  | Coordinates reverse horizontally while row order and sounding pitches remain consistent                                     | [music.test.mjs](../tests/music.test.mjs), [guide-layout.test.mjs](../tests/guide-layout.test.mjs) |
| Custom input and URLs       | Reject invalid notes, ordering, and formulas; round-trip custom states and normalize malformed values                       | [music.test.mjs](../tests/music.test.mjs)                                                          |
| Enharmonic labels           | Both names refer to the same pitch; label choices preserve pitch, colors, geometry, and playback                            | [music.test.mjs](../tests/music.test.mjs), [scale-picker.test.mjs](../tests/scale-picker.test.mjs) |
| Search                      | Common choices are curated; every catalog entry remains reachable; bilingual and accent-insensitive search works            | [scale-picker.test.mjs](../tests/scale-picker.test.mjs)                                            |
| Workspace preferences       | Recall instrument/string setups and custom tunings; explicit URL fields override saved preferences                          | [workspace.test.mjs](../tests/workspace.test.mjs)                                                  |
| Guided books                | Match actual language, instrument, count, orientation, and sounding tuning pitches, including enharmonic equivalents        | [guides.test.mjs](../tests/guides.test.mjs)                                                        |
| PDF geometry and navigation | Check neck bounds, octave routes, contents pagination, page sizes, fonts, and real internal destinations                    | [guide-layout.test.mjs](../tests/guide-layout.test.mjs), [pdf.test.mjs](../tests/pdf.test.mjs)     |
| Audio                       | Test seven pitches at 44.1 and 48 kHz with a 3-cent tolerance, decay, repeatability, caching, and stopping scheduled voices | [string-audio.test.mjs](../tests/string-audio.test.mjs)                                            |
| Published assets            | Check that entry point, stylesheet, and module imports use one revision                                                     | [build.test.mjs](../tests/build.test.mjs)                                                          |

Some checks enumerate the full finite catalog; others use representative cases.
The tests do not independently certify the cultural naming of every scale,
perceptual realism of synthesized audio, or every possible custom tuning.

## Manual release checklist

Serve a fresh build with `node scripts/serve.mjs` and check the following:

- Switch guitar/bass and every supported string count; confirm available tunings
  and fret defaults, then confirm a previous setup can be recalled.
- Change handedness and tuning, including a custom tuning with octave numbers.
  Invalid custom input must remain uncommitted with an inline explanation.
- Search both languages, browse all scales and arpeggios, and navigate results
  with the keyboard. Browsing must not select a scale automatically.
- Open and close dialogs, including Escape and focus return. Check notes/degrees,
  spelling, outside notes, and horizontal scroll retention.
- Start and stop scale playback, activate a single note, and change configuration
  during playback. No old scheduled sequence should continue.
- Download a selected scale, preview larger scopes, and cancel an export.
  Compare the page estimate with the output and inspect representative pages.
- Confirm guided books match the configuration or show the explicit empty state.
- Check 320, 390, 720, 860, and 1280 CSS-pixel layouts. Only the fretboard should
  scroll horizontally; controls and dialogs must stay within the page width.

The documentation refresh compared computed styles for 324 HTML elements before
and after CSS consolidation at those five widths, with no differences after the
cleanup. This is a targeted regression check, not a permanent browser test suite.

## Known limits

- **Browser coverage:** recent manual checks use the Codex in-app browser.
  Safari, Firefox, Android, iOS keyboards, and screen-reader combinations need
  broader verification. Native modules, SVG, `dialog`, Web Audio, and modern CSS
  are required.
- **Accessibility:** keyboard controls, labels, focus return, and reduced-motion
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
  of export settings. Four fixed guided books are currently included.
- **State and privacy:** preferences are stored on the device when storage is
  available. URLs intentionally expose the musical configuration for sharing;
  the app has no application backend or analytics. Hosting and repository services
  have their own policies.
- **Outcomes:** there are no published adoption, usability-study, learning-gain,
  or performance benchmark results.
