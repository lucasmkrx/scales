# From fretboard PDFs to Scales

[Live app](https://lucasmkrx.github.io/scales/) · [Architecture](architecture.md) · [Validation](testing.md)

## The problem

A player can learn songs from TAB for years without knowing how the notes on the
neck relate to scales or chords. A static diagram helps until the player changes
tuning, switches instruments, or needs a left-handed version. A large catalog
also creates a second problem: finding a useful starting point without already
knowing the theory vocabulary.

Scales began as guitar and bass learning PDFs. The brief expanded to multiple
tunings, orientations, string counts, and languages. Maintaining a separate
hand-edited drawing for every combination would make corrections difficult to
keep consistent.

## Product constraints

- Support guitar and bass, including extended string counts and altered tunings.
- Keep both handedness options and all three languages equally usable.
- Preserve the light fretboard design, pitch colors, Literata headings, and
  discreet Marques & Co. branding in printable output.
- Serve the tool directly from a public GitHub repository with no application server.
- Keep detailed theory available while making root and scale easy to choose.

## How the solution developed

The tool calculates each note as `open-string MIDI pitch + fret`. The resulting
pitch model feeds the web drawing and the PDF generator. A new tuning therefore
changes the actual notes and patterns rather than relabeling a standard diagram.

The initial interface collected setup, scale browsing, display settings, and PDF
export in one sidebar. The current workspace keeps instrument setup and a
scale catalog grouped by musical family above the fretboard. The Scale card shows the selected
degrees and opens an inline formula editor on demand. Display controls sit below the playing surface. Thin pattern brackets
select exact fingerings; a separate switch chooses frets 0–12 or the full neck.
These groups stack on phones. Repeated instructions, setup cards, and practice
prose are removed from the main flow.
Browsing retains the current musical selection until the player chooses a result.

PDF exports evolved into a complete reference layout: cover, clickable contents,
reading instructions, a full neck, smaller position maps, and note/degree legends.
The four original lesson books are available as repository source assets. The
browser now centers on the interactive fretboard and an inline PDF section below
it, where the contents, reference notes, and estimate are visible before download.

Individual notes use a procedural plucked-string model with different guitar and bass
settings. This adds an audible connection to the diagram without introducing a
sample catalog or an external audio service.

## Challenges and decisions

| Challenge                                | Implementation                                                            | Tradeoff                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Altered and extended-range tunings       | Store sounding pitches including octaves, then derive each fret           | Custom input must include octave numbers and ascending pitches   |
| Left-handed diagrams                     | Mirror horizontal geometry while retaining text and string order          | Requires geometry checks beyond checking note names              |
| Pitch names versus scale degrees         | Offer familiar enharmonic labels and degree-aware Key spelling            | Explicit enharmonic tonic choices add state-validation cases     |
| Web and print consistency                | Share the music model and keep separate rendering geometry                | The two drawing systems still need their own layout checks       |
| Reproducible links and remembered setups | Validate URL state and let explicit fields override local preferences     | Persistent state has more edge cases than a fresh-page-only tool |
| Accurate synthesized pitch               | Use fractional delay instead of rounding the string loop to whole samples | More DSP complexity than a basic oscillator                      |
| Reliable static releases                 | Version stylesheet and the entire module graph together                   | Formatting changes also produce a new content revision           |

The [architecture document](architecture.md) explains these choices in more detail.

## Evidence and remaining work

The automated pitch-model loop checks
35,376 tuning/scale/root combinations, while targeted tests cover geometry,
state restoration, actual bass octaves, PDF links, and generated audio pitch.
The permanent Playwright suite covers patterns, keyboard navigation, mobile
layouts, saved settings, key spelling, audio controls, and PDF cancellation/download
across Chromium, Firefox, and WebKit. Visual reviews inspect full pages and PDFs.

Validation to date focuses on musical correctness, implemented behavior, and
browser flows. Structured usability sessions with the intended players,
broader physical-device testing, and reproducible performance
measurements remain on the [roadmap](roadmap.md).

## Development process

Lucas Marques defined the product requirements and iterated on tuning choices,
handedness, language, visual design, and the learning workflow. OpenAI Codex
assisted with implementation, refactoring, tests, documentation, and browser
verification. The repository records the resulting behavior, implementation decisions, and
reproducible checks.

The project is maintained as a personal open-source tool.
