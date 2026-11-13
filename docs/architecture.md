# Architecture and engineering decisions

Scales is a static browser application with a shared music model, SVG rendering,
Web Audio playback, and vector PDF export. Node.js is used for development,
testing, the static build, and an optional PDF command-line entry point.

## Data flow

```mermaid
flowchart TD
    URL[Shared URL] --> State[Workspace restoration and validation]
    Device[Device preferences] --> State
    UI[User controls] --> State
    Catalog[Scale intervals and tuning pitches] --> Music[Selected music and pitch model]
    State --> Music
    Music --> SVG[Interactive SVG fretboard]
    Music --> Layout[PDF geometry and contents plan]
    Layout --> PDF[Vector PDF atlas]
    Music --> Sequence[Ascending and descending MIDI sequence]
    Sequence --> Synth[Plucked-string synthesis]
    Synth --> Audio[Web Audio playback]
    State --> Saved[Updated URL and optional device storage]
```

The central invariant is `sounding MIDI pitch = open-string pitch + fret`.
A pitch class is that value modulo 12. Scale membership is checked relative to
the selected root; the displayed label is separate from the sounding pitch.

## Module boundaries

| Module                                          | Responsibility                                                                                                    |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| [catalog.mjs](../src/catalog.mjs)               | Scale intervals, formulas, localized names, aliases, tuning pitches, and mode rotation                            |
| [music.mjs](../src/music.mjs)                   | Validate selections; calculate notes, degrees, SVG coordinates, shared URLs, and playback sequences               |
| [pattern-ranges.mjs](../src/pattern-ranges.mjs) | Align pattern brackets with fret geometry and place patterns in numbered rows                                     |
| [patterns.mjs](../src/patterns.mjs)             | Build complete string/fret fingering sets and ordered playback routes for supported setups                        |
| [practice.mjs](../src/practice.mjs)             | Visible-position playback sequences, short exercises, and localized interval names                                |
| [workspace.mjs](../src/workspace.mjs)           | Restore preferences, recall instrument setups, resolve URL precedence, and estimate PDF pages                     |
| [scale-picker.mjs](../src/scale-picker.mjs)     | Curate common choices and search the multilingual catalog without changing the active scale                       |
| [board.mjs](../src/board.mjs)                   | Render the shared model into keyboard-accessible SVG markup                                                       |
| [guide-layout.mjs](../src/guide-layout.mjs)     | Compute tapered PDF geometry, bass octave routes, and paginated contents                                          |
| [pdf.mjs](../src/pdf.mjs)                       | Draw PDF pages, embed local fonts and branding, and add internal links and outlines                               |
| [string-audio.mjs](../src/string-audio.mjs)     | Synthesize strings and manage cached buffers, gain, scheduling, and cancellation                                  |
| [guides.mjs](../src/guides.mjs)                 | Match the four archived lesson PDFs against a configuration                                                       |
| [locales.mjs](../src/locales.mjs)               | Regional language tags, locale normalization, and tuning names                                                    |
| [i18n.mjs](../src/i18n.mjs)                     | Interface copy and educational descriptions in American English, Brazilian Portuguese, and Latin American Spanish |
| [app.mjs](../src/app.mjs)                       | Coordinate inline controls, draft validation, rendering, playback, and downloads                                  |

The pure model and layout functions can be tested without a browser. The DOM and
Web Audio integration remain in their respective controllers. See
[testing.md](testing.md) for what this separation currently verifies.

## Decisions and tradeoffs

### Native modules and static hosting

The interface uses native ES modules and browser APIs, with a small Node build
script. This keeps the deployed product compatible with GitHub Pages and avoids
requiring a server for state, playback, or export. The build copies maintained
source and local public assets rather than running a framework compiler.

The tradeoff is manual coordination of DOM state and rendering. As the interface
grows, browser-flow tests and careful controller boundaries become more valuable.
The current implementation is not evidence that a framework would be unsuitable
for a larger application.

### One musical model, two renderers

Both renderers calculate from the same interval and tuning data. Changing tuning
changes each note and position. Handedness mirrors horizontal coordinates while
retaining string order and readable text. SVG and PDF use different coordinate
systems and density constraints, so they have separate layout functions.

This prevents duplicated musical facts, but does not eliminate separate visual
QA. The PDF uses a continuous tapered neck; the web uses its own SVG layout.
Both renderers use the shared guitar pattern model. The homepage favors complete
first-octave instances where available; the PDF can use a different whole-octave
instance on the full instrument neck. Each renderer uses exact pattern points.
The bass PDF shows octave routes from the two lowest strings; the homepage
offers compact routes from any viable starting string. Unavailable fingerings
retain an explicitly labeled note-map fallback.

### Sounding pitches, note labels, and degree formulas

Tunings store actual MIDI pitches including octave numbers, ordered from lowest
to highest. This distinguishes extended strings and octave-shifted custom tunings
that share the same note letters. The app supports 6- and 7-string guitar and
4-, 5-, and 6-string bass.

Notes can display both enharmonic names, only sharps/flats, or key-aware spelling.
Key spelling derives each letter from the written degree formula, including E♯,
C♭, and double accidentals. The root selector separates common enharmonic tonics;
an optional validated `tonic` value preserves that choice in URLs and saved practice.
Without an explicit tonic, the model chooses the simpler spelling, favoring sharps
on a tie. Contextual MIDI labels retain written octaves, such as B♯3 for sounding C4.
These display choices preserve pitches, colors, geometry, and playback.

### Shareable state and device preferences

The URL contains a reproducible musical configuration. On startup, stored
preferences are read defensively, explicit URL fields are applied, and the result
is normalized. Bare URLs resume the last root, scale, custom formula, neck view,
and selected pattern. New sessions start at frets 0–12; the full-neck view is an
explicit switch choice. Shared URLs encode this as `neck=octave` or `neck=full`;
the device preference is `preferences.neckView`. An explicit neck URL value
takes priority over that saved preference.
Explicit musical links take priority over that saved practice selection. Preferences are versioned and optional: unavailable storage does
not prevent use of the app.

Instrument and string-count setups are recalled separately. Changing instrument
keeps the musical selection and restores a compatible setup, with default fret
counts of 21 for guitar and 20 for bass when no explicit choice exists. Custom
tuning and formula edits commit only after validation. Display changes retain
horizontal fretboard position; a new setup starts at its open-string end.

### Inline settings and focused interaction

A compact searchable scale browser sits beside instrument setup above the
fretboard on wider screens. The groups stack on narrow screens, with scale
selection first. The browser keeps root, search, collections, results, and the
custom formula editor together. Search and
collection browsing retain the current musical selection until a result is chosen.
The selected scale and Play action lead into the diagram, keeping the musical
result close to its controls. The page begins directly with settings; its main heading remains available to screen readers.

The instrument section includes string count, handedness, fret count, and tuning;
choosing a custom tuning reveals its pitch fields in place. PDF customization
remains in its own full-width section below the playing surface.
All settings remain on the homepage without application popup menus.
On phones, a sticky current-scale shortcut scrolls to the fretboard and focuses
its heading. The mobile settings use tighter spacing without hiding controls.

Custom formula drafts survive unrelated setting changes. Selecting a named scale
resets the formula editor to that scale's degrees. The apply action appears only
after an edit; routine formula help stays available to screen readers. Custom
tuning and formula validation appear beside their inputs. Keyboard selection returns focus to the
chosen result after its active state updates.

Clickable pattern ranges above the neck select exact string/fret point sets.
Their spans describe where a fingering lies, rather than selecting every note
inside a rectangular fret window. Thin bracket caps use centered pattern, shape,
and fret-range labels, with one pattern per row in pattern-number order. They
share the neck's SVG geometry and horizontal scrolling. Both ends have vertical guides extending
through the neck behind the notes; selection strengthens those guides. A marker
toggles on with a click, Enter, or Space, and toggles off when activated again. Pressed
state and keyboard focus survive the SVG update.
A restrained inline caption names the selected pattern and its lowest note and
degree. It does not repeat the fret span already drawn on the bracket or add a
note-count card. The lowest note is distinct from the tonic where playback begins.
The full toggle instructions remain accessible to screen readers.
Six-string guitars with standard tuning intervals (including uniform
transpositions) use verified five-position CAGED templates for major and natural
minor scales. Major position numbers follow E, D, C, A, G shape order; minor
positions follow Em, Dm, Cm, Am, Gm. They are not scale-degree or mode numbers.
Templates preserve the exact extension notes shown by the reference diagrams.
C major Position 1, for example, has 17 points on frets 7–10, including high-E
fret 8 and no fret 12.

Major/minor pentatonic scales retain five two-notes-per-string shapes, including
supported seven-string extensions. Six-string blues uses five reference-checked
boxes for each blues scale, preserving the source's edge passing tones.
Seven-string blues adds intervening blue notes to generated pentatonic routes.
The remaining diatonic modes, harmonic and melodic minor with
their modes, and whole tone use generated three-notes-per-string routes. Seven-string
major/minor also use that system rather than unverified CAGED extensions. Both
diminished scales use four notes per string. Symmetric scales have repeated
interval geometry across different starting degrees; their position numbers do
not claim that every fingering is a distinct shape. Three- and four-note routes
can shift along the neck and span more frets than compact CAGED positions.
Other collections and unsupported tuning intervals retain the explicit note-map
fallback. A complete fingering must fit the selected view; no point is individually
clipped or wrapped.

Bass patterns are generated compact root-to-octave routes, each beginning on an
available starting string. Their exact points follow the selected scale and sounding tuning.
The model avoids presenting a clipped or unreachable route as a complete pattern.

A sliding switch in the fretboard header beside playback selects frets 0–12 or
the full neck, with both choices visibly labeled. The header controls wrap into
their own row on narrow screens. The limited-view label counts down as 12–0 for left-handed playing.
Frets 0–12 is the default; the chosen view is remembered and shared.
Each view offers only complete patterns within its visible fret bounds. A whole
shape may move by an octave to fit, preserving its fingering and identity. Patterns
that still cannot fit are omitted with a cue that the full neck shows more. A
selection that no longer fits is cleared rather than partially drawn or played.
Expanding the view retains first-octave instances when available, so a selected
pattern does not move to another octave just because more frets are shown.
PDF atlases continue to include the full instrument neck and available patterns;
the homepage view switch does not crop the printable reference.

Notes outside a selected pattern's point set turn gray, including notes at frets
that other strings use inside the pattern. Marker geometry and range labels
follow handedness, while pattern identities stay musically stable. There are no
separate pattern or half-neck buttons. An unselected marker state shows all scale
notes in the chosen view. The diagram's dimensions depend on the selected view
and instrument string count and remain fixed across viewport sizes. Narrow
screens scroll the diagram horizontally with its pattern brackets; choosing a pattern
brings its points into view. Clearing the pattern preserves that horizontal
position. The settings panels stretch to equal height when they share a row.

Pattern IDs for CAGED, two-, three-, and four-notes-per-string systems, blues,
and bass routes survive device preferences and shared links. Old numeric-range
and region links clear the fingering selection rather than pretending that a
legacy window is a pattern. A 3NPS ID only restores for a scale/setup that uses
that system; it is never reinterpreted as a CAGED position. New pattern links restore a
valid selected marker in
the chosen neck view.

Display controls, tempo, repeat, and a single interactive reference row sit below
the diagram. That row follows the chosen note or degree labels. The root legend
and share action share one footer beneath the neck; note feedback appears there
only after inspection. Repeated playback hints, suggested exercises, the lesson
section, and a visible orientation sentence are omitted. The main
board has one tab stop, with arrow keys moving along strings and frets in the displayed orientation.
The page groups these controls by their musical task and stacks the groups on
phones. The rationale and research sources are recorded in [design.md](design.md).
Assistive-technology compatibility still needs broader validation.

### Procedural instrument audio

The string model uses Karplus–Strong synthesis, an averaging loop, a fractional
delay correction, damping, and body coloration. A shaped harmonic pluck supplies
a stable fundamental, with filtered pick noise for attack texture and separate
guitar/bass harmonic balance and decay settings. The fractional correction avoids
rounding every note's delay to an integer number of samples.

An LRU cache holds up to 48 generated mono buffers. Sources play through a gain
stage and compressor. Stop fades active voices and cancels scheduled ones; a
version token invalidates audio starts waiting for a resumed AudioContext.
The app prewarms the selected route's unique notes before choosing its schedule
start time. Pattern playback follows the exact ordered string/fret route up and
back, and sounding highlights stay on those route points. Full-map playback
uses a complete available octave when possible, with partial-route handling
for sparse custom scales. Tempo controls the interval between note
onsets. Repeat schedules one pass at a time with a one-beat rest after each pass.
Changing the setup or pattern cancels the current pass.

Hear tonic uses quiet sine oscillators at the root and octave with short gain
fades. It has independent lifecycle state, so stopping a scale leaves the tonic
reference playing. Root, instrument, string-count, or tuning changes stop it,
as do page hiding and navigation. It never starts from saved preferences or URLs.

The note and degree table doubles as a set of pitch controls. Activating a tone
highlights its pitch class across the visible neck and shows its interval and
location. Board notes retain their actual string and fret in the detail readout.

This avoids recorded sample downloads and sample-library licensing. It introduces
DSP complexity and produces a synthesized timbre rather than the range of a
recorded instrument. The tests measure pitch and envelope properties, not
perceptual realism. References are recorded in [references.md](references.md).

### PDF layout and cancellation

pdf-lib and fontkit load on demand. Fonts and the vector logo are local assets.
The generator plans the cover, contents, reading page, and scale pages before
rendering. Export estimates reuse that planner, including additional contents
pages for a large catalog.

The PDF section beneath the fretboard keeps contents, reference-note choices,
and a page estimate beside the download action. It omits the repeated configuration
card and format description.
The browser captures the selected configuration and export scope before awaiting
libraries or rendering. Progress and cancellation operate on that export, so a
later state change cannot silently rename a PDF generated from an earlier state.
Larger atlases still require more browser memory and time.

### Cache-consistent releases

The build hashes the source modules and stylesheet. It appends that revision to
the entry script, stylesheet URL, and relative module imports throughout the graph.
An updated entry point therefore requests matching dependencies rather than
reusing an older unversioned import. All paths remain relative for project hosting.

This is cache busting, not an offline cache. Formatting changes also change the
revision. CI verifies the published references and tests/builds before deployment.

## Guided books and licensing boundaries

The four [original lesson PDFs](../public/guides/) are repository source assets
with their original language, orientation, and tuning. The archived matching
helper checks language, instrument, string count, handedness, and sounding
open-string pitches. Equivalent enharmonic custom tunings can match, while octave
and string-count differences are significant.

The browser provides configurable scale-reference exports in the PDF section
beneath the fretboard. It allows a selected scale,
family, or full catalog, with all 12 reference notes available for selected-scale
exports.

Code uses MIT; original educational content uses CC BY 4.0. Logo rights and
third-party font/library licenses are documented separately. No recorded samples
are bundled. The app sends no application data to a backend; hosting services
and any external links retain their own policies.

## Extending the system

For a new tuning, provide exact sounding pitches including octaves. For a scale,
provide intervals, degrees, names in all three languages, and aliases. Add entries to
`catalog.mjs`, run the tests, and check the web and PDF layouts. Existing shared
links depend on stable IDs, so prefer adding aliases over renaming identifiers.

A new instrument/string count requires validation, controls, audio-range, and
both renderer checks. It should not be implemented solely by adding an option to
a dropdown. See [Contributing](../CONTRIBUTING.md) and the [roadmap](roadmap.md).
