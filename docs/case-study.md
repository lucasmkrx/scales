# From fretboard PDFs to Tukany

[Live app](https://tukany.com/) · [Architecture](architecture.md) · [Validation](testing.md)

## The problem

A player can learn songs from TAB for years without knowing how the notes on the
neck relate to scales or chords. A static diagram helps until the player changes
tuning, switches instruments, or needs a left-handed version. A large catalog
also creates a second problem: finding a useful starting point without already
knowing the theory vocabulary.

Tukany began as guitar and bass learning PDFs. The brief expanded to multiple
tunings, orientations, string counts, and languages. Maintaining a separate
hand-edited drawing for every combination would make corrections difficult to
keep consistent.

## Product constraints

- Support guitar and bass, including extended string counts and altered tunings.
- Keep both handedness options and all six languages equally usable.
- Preserve the light fretboard design and pitch colors in printable output.
- Serve the tool directly from a public GitHub repository with no application server.
- Keep detailed theory available while making root and scale easy to choose.

## How the solution developed

The tool calculates each note as `open-string MIDI pitch + fret`. The resulting
pitch model feeds the web drawing and the PDF generator. A new tuning therefore
changes the actual notes and patterns rather than relabeling a standard diagram.

The initial interface collected setup, scale browsing, display settings, and PDF
export in one sidebar. The homepage now places the scale catalog above the board.
Each formula button pairs a scale degree with its playable note. The fretboard
header opens an instrument settings dropdown, and compact display controls sit inside the diagram.
The full neck scrolls from its nut on smaller screens. Players can select a pattern
bracket to isolate that fingering on the fretboard and staff.
Browsing retains the current musical selection until the player chooses a result.

PDF exports evolved into a complete reference layout: cover, clickable contents,
reading instructions, a full neck, smaller position maps, and note/degree legends.

The download section offers a one-page chart, a family guide, and a full catalog.
Players choose A4 or US Letter for all three. The catalog includes family bookmarks
and an alphabetical chart index.

Individual notes use a procedural plucked-string model with different guitar and bass
settings. This adds an audible connection to the diagram without introducing a
sample catalog or an external audio service.

## Challenges and decisions

| Challenge                                | Implementation                                                            | Tradeoff                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Altered and extended-range tunings       | Store sounding pitches including octaves, then derive each fret           | Custom input must include octave numbers and ascending pitches   |
| Left-handed diagrams                     | Mirror horizontal geometry while retaining text and string order          | Requires geometry checks beyond checking note names              |
| Pitch names versus scale degrees         | Use degree-aware note spelling and offer enharmonic tonic choices         | Explicit enharmonic tonic choices add state-validation cases     |
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
