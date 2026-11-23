# Tukany · Guitar and bass scale explorer

Tukany is a free, open-source interactive fretboard for guitar and bass. Pick a key
and scale to see its notes, hear each pitch, and print a scale chart for your own
tuning and handedness.

[**Open the explorer**](https://tukany.com/) · [Português (Brasil)](https://tukany.com/pt/) · [Español (España)](https://tukany.com/es/) · [Italiano](https://tukany.com/it/) · [Français](https://tukany.com/fr/) · [Deutsch](https://tukany.com/de/)

[![Tests, formatting, and deployment](https://github.com/lucasmkrx/tukany/actions/workflows/pages.yml/badge.svg)](https://github.com/lucasmkrx/tukany/actions/workflows/pages.yml)
[![Code license: MIT](https://img.shields.io/badge/code-MIT-20343f)](LICENSE)

![C major on a 21-fret guitar, with its interactive formula, treble staff, and PDF downloads](docs/assets/desktop.png)

Tukany helps players who learned songs from TAB connect familiar fret positions
with notes, scale degrees, and improvisation. Change the instrument, tuning, or
handedness and every diagram is recalculated from the sounding pitches. Note playback
and PDF generation run locally. Select a curated backing track below the fretboard
to play it in Tukany. [Backing tracks and practice drones](docs/backing-tracks.md)

## Start with a scale

| Practice setup                                                                                                | What to try                                                                                 |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [A minor pentatonic on guitar](https://tukany.com/?key=A&scale=minor-pentatonic)                              | Select a pattern bracket to isolate one of the five pentatonic shapes.                      |
| [C major on left-handed guitar](https://tukany.com/?key=C&hand=left)                                          | Play a fret to find the same pitch on the treble staff.                                     |
| [D natural minor on Drop C bass](https://tukany.com/?key=D&scale=natural-minor&instrument=bass&tuning=drop-c) | Switch the fret labels to degrees to find the root, minor third, and fifth across the neck. |

**Copy link** captures the key, scale, instrument setup, and selected pattern
so another player can open the same diagram. Opening a language edition without
a practice query resumes the instrument and scale saved on that device.

### Find notes and fingering patterns

Choose a root note directly on the card, then pick a scale. Common scales appear
first on a fresh visit. To find Dorian, for example, open **Scale family**, choose
**Major & modes**, then select **Dorian**. Browsing families keeps the current
scale on the fretboard. The formula pairs each degree with its note name.
Select a pair to hear it and highlight the pitch on the neck, or choose **Edit** to enter your own degrees.
On phones, a sticky current-scale shortcut jumps directly to the fretboard while
keeping every setting on the homepage.

The button in the fretboard header shows your instrument and tuning. Open its
dropdown to change instrument, handedness, tuning, string count, or fret count. Your
orientation applies to both instruments. Each instrument recalls its string count
and last tuning, including custom pitches.

The fretboard displays the full neck. On narrow screens it starts at the nut,
and you can scroll horizontally to reach the upper frets. The display controls
inside the fretboard let you switch between note names and degrees or show notes
outside the scale. Thin pattern brackets sit above the
frets they cover, labeled Pattern 1, Pattern 2, and so on.
Vertical boundary guides connect each bracket to the neck. Click one to highlight its exact string-and-fret shape;
click it again to return the visible scale notes to color.
A compact caption identifies the selected pattern and its lowest note. Each bracket’s tooltip and accessible description include its fret range and shape or starting string.

Six-string guitar offers five compact CAGED positions for major and natural
minor, five two-notes-per-string shapes for major/minor pentatonic, and five
blues patterns with the extra blue notes. The other major-scale modes, harmonic
and melodic minor with their modes, and whole-tone scales use three notes per
string. Diminished scales use four notes per string. Seven-string guitar uses
three-notes-per-string routes for major/minor instead of extending the CAGED
templates. Patterns support standard tuning intervals and uniform detuning.
Bass offers generated compact octave routes. Other notes turn gray while a pattern is selected.

Only complete patterns that fit the instrument are offered. A whole pattern
can move by an octave to fit. The app remembers your selection, and copied
links reopen it. Unsupported scales or tunings keep a
note map with an explanation.

### Read and hear the notes

Tap a fret, staff note, or degree in the scale formula to hear it and highlight
where it appears. On the staff, arrow keys move between notes and Enter or Space
plays the focused note. The staff below the fretboard uses treble clef for
guitar and bass clef for bass. It shows each pitch used by the available patterns
once, written one octave above sounding pitch. Selecting a pattern narrows the
staff to that fingering and colors its noteheads to match the fretboard.
Setups without patterns show one playable octave of the scale. Selecting a fret
marks its exact pitch on the staff, temporarily adding that note when necessary.
The key signature appears after the clef. In D harmonic minor, for example, the
signature supplies B♭ and the staff writes C♯ beside the raised seventh.
See the [staff notation conventions](docs/references.md#staff-notation).
Note names follow the scale’s written degrees. When a key has two common names,
use **Write key as** to choose between them, such as F♯ major or G♭ major.
The Scale card always offers the same 12 root notes.

Tukany opens in Light on first visit, even on a device set to dark mode. Use the
sun-and-moon button in the header to switch themes. Tukany remembers your choice
on this device. Selection and note animations respect the device's
reduced-motion setting.
See the [dark desktop preview](docs/assets/desktop-dark.png).

## Printable guitar and bass guides

The two download cards below the fretboard generate the current scale family or
the full named catalog in your selected key. Each card shows its scope, number
of maps, page count, and instrument setup. Opening a saved custom scale offers its formula as a single-scale PDF.

The four original lesson books are also available as direct PDF downloads.

| Language and orientation | Guitar (6 strings)                                                                           | Bass (4 strings)                                                                     |
| ------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| English, left-handed     | [Guitar in E standard · 42 pages](https://tukany.com/guides/guitar-standard-left-en.pdf)     | [Bass in E standard · 32 pages](https://tukany.com/guides/bass-standard-left-en.pdf) |
| Português, destro        | [Guitarra em Dó♯ padrão · 42 páginas](https://tukany.com/guides/guitar-c-sharp-right-pt.pdf) | [Baixo em Drop C · 32 páginas](https://tukany.com/guides/bass-drop-c-right-pt.pdf)   |

<details>
<summary>Printable output</summary>

![A generated major-scale A4 reference page with the full neck and five compact scale positions](docs/assets/pdf-reference.png)

</details>

## What you can explore

- **67 scales, modes, and chord arpeggios**, transposable to all 12 roots.
- **44 tuning presets** for 6- and 7-string guitar and 4-, 5-, and 6-string bass,
  plus custom tuning pitches.
- Left- and right-handed fretboards with 20, 21, 22, or 24 frets, note or degree labels,
  and shared sharp/flat names on a single pitch marker.
- American English, Brazilian Portuguese, Spanish from Spain, Italian, French, and German.
- Remembered instrument setups, keyboard controls, and shareable URLs.
- Scale-derived fingering patterns that highlight exact string and fret positions,
  plus a note-map fallback for unsupported shapes.
- Individual guitar and bass notes synthesized locally.
- Printable family and catalog atlases in the current key, instrument setup, and language.

The [design notes](docs/design.md) explain the research and layout decisions.

## Engineering highlights

| Decision                       | Purpose                                                                | Where to look                                                      |
| ------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Shared pitch model             | Keep web and PDF notes consistent across tunings and handedness        | [Music engine](src/music.mjs)                                      |
| Separate drawing geometry      | Mirror coordinates while keeping text and string order readable        | [Web fretboard](src/board.mjs), [PDF layout](src/guide-layout.mjs) |
| Procedural plucked strings     | Provide instrument-specific playback without recorded sample downloads | [Audio engine](src/string-audio.mjs)                               |
| Validated URL and device state | Make links reproducible while remembering local setups                 | [Workspace state](src/workspace.mjs)                               |
| Lazy PDF dependencies          | Load PDF tooling when a download is requested                          | [App controller](src/app.mjs), [PDF generator](src/pdf.mjs)        |
| Revisioned module graph        | Prevent a new entry point from loading stale JavaScript dependencies   | [Static build](scripts/build.mjs)                                  |

The app draws the fretboard with HTML and CSS, plays notes with Web Audio,
and serves Font Awesome Free icons locally.
Node.js provides the test runner, static build, preview server, and PDF CLI.
pdf-lib and fontkit are vendored with their license notices. Prettier and Playwright
are development dependencies. See the [design tradeoffs](docs/architecture.md#decisions-and-tradeoffs)
and [project case study](docs/case-study.md) for the reasoning behind this approach.

## Run locally

Use **Node.js 22 or newer**. Running the app and its tests does not require npm installation:

```sh
node --test tests/*.test.mjs
node scripts/build.mjs
node scripts/serve.mjs
```

Open **http://127.0.0.1:4173**. The build goes into `dist/` and uses relative paths,
so it also works under GitHub Pages' `/tukany/` project path.

To install the pinned formatting tool:

```sh
npm ci
npm run format:check
```

Use `npm run format` to format maintained source, tests, and documentation.
Vendored libraries, fonts, generated files, and guide PDFs are excluded.

## Validation

The automated pitch-model tests enumerate
**35,376 tuning/scale/root combinations**; other checks cover mirrored geometry,
custom input rejection, shared state, PDF navigation and font embedding, and
synthesized pitch at two sample rates. GitHub Actions runs formatting checks,
tests, the build, and Playwright browser checks before publishing pushes to `main`.

Run the browser suite locally after installing its engines:

```sh
npm ci
npx playwright install chromium firefox webkit
npm run test:browser
```

The suite covers Chromium, Firefox, and WebKit, including mobile layouts,
pattern selection, key spelling, saved settings, audio controls, PDF downloads,
theme preferences, and reduced-motion behavior.

Browser flows and visual output receive separate manual checks. See
[testing and known limits](docs/testing.md) for the evidence, reproduction
commands, release checklist, and current limits.

## Generate a PDF

```sh
node scripts/generate.mjs --instrument=bass --strings=6 \
  --tuning=bass-6-standard --hand=left --lang=en --root=2 \
  --scale=natural-minor --output=work/d-minor-bass.pdf
```

Use `--scope=family` or `--scope=catalog` for an atlas. `--allKeys=true` applies
to one selected scale. The CLI shares the browser's PDF generator.

## Project notes

- [Case study: from learning PDFs to an interactive explorer](docs/case-study.md)
- [Desktop previews, earlier interface screenshots, and walkthrough](docs/assets/README.md)
- [Architecture, data flow, and tradeoffs](docs/architecture.md)
- [Testing, release checks, and limitations](docs/testing.md)
- [Search discovery, language editions, and sitemap submission](docs/discovery.md)
- [Roadmap](docs/roadmap.md)
- [Contributing](CONTRIBUTING.md)
- [Musical and implementation references](docs/references.md)

Maintained by [Lucas Marques](https://github.com/lucasmkrx). The
[case study](docs/case-study.md#development-process) describes the project's
iterative development and AI assistance.

If Tukany helps you practice, you can [buy me a coffee](https://buymeacoffee.com/lucasmkrx) to support its development.

## Licenses

- Code: [MIT](LICENSE).
- Original educational content and guides: [CC BY 4.0](CONTENT-LICENSE.md).
- Marques & Co. logo: [separate branding terms](BRANDING.md).
- Icons, fonts, and vendored libraries have their own [third-party notices](THIRD-PARTY-NOTICES.md).
