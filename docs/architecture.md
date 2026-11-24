# Architecture and engineering decisions

Tukany is a static browser application with a shared music model, an HTML fretboard,
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
    Music --> Board[Interactive HTML fretboard]
    Music --> Layout[PDF geometry and contents plan]
    Layout --> PDF[Vector PDF atlas]
    Board --> Synth[Plucked-string synthesis]
    Synth --> Audio[Web Audio]
    State --> Saved[Updated URL and optional device storage]
```

The central invariant is `sounding MIDI pitch = open-string pitch + fret`.
A pitch class is that value modulo 12. Scale membership is checked relative to
the selected root; the displayed label is separate from the sounding pitch.

## Module boundaries

| Module                                          | Responsibility                                                                                   |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [catalog.mjs](../src/catalog.mjs)               | Scale intervals, formulas, localized names, aliases, tuning pitches, and mode rotation           |
| [music.mjs](../src/music.mjs)                   | Validate selections and calculate notes, degrees, and fretboard coordinates                      |
| [practice-link.mjs](../src/practice-link.mjs)   | Encode portable practice links, read older links, and preserve the bare homepage                 |
| [pattern-ranges.mjs](../src/pattern-ranges.mjs) | Align brackets to frets and let separated brackets share a row                                   |
| [patterns.mjs](../src/patterns.mjs)             | Build complete string/fret fingering sets for supported setups                                   |
| [intervals.mjs](../src/intervals.mjs)           | Name written intervals in all supported languages                                                |
| [workspace.mjs](../src/workspace.mjs)           | Restore preferences, recall instrument setups, resolve URL precedence, and estimate PDF pages    |
| [scale-picker.mjs](../src/scale-picker.mjs)     | Curate common choices and group the catalog by musical family                                    |
| [board.mjs](../src/board.mjs)                   | Place frets, strings, note controls, and pattern markers on a keyboard-accessible HTML fretboard |
| [guide-layout.mjs](../src/guide-layout.mjs)     | Compute tapered PDF geometry, bass octave routes, and paginated contents                         |
| [pdf.mjs](../src/pdf.mjs)                       | Draw PDF pages, embed local fonts and branding, and add internal links and outlines              |
| [string-audio.mjs](../src/string-audio.mjs)     | Synthesize plucked notes, manage cached buffers, and fade stopped sounds                         |
| [locales.mjs](../src/locales.mjs)               | Regional language tags, locale normalization, and tuning names                                   |
| [i18n.mjs](../src/i18n.mjs)                     | Interface copy and educational descriptions in the six supported languages                       |
| [theme.js](../public/theme.js)                  | Apply the saved Light or Dark theme before paint, using Light on the first visit                 |
| [app.mjs](../src/app.mjs)                       | Coordinate inline controls, draft validation, rendering, playback, and downloads                 |

The pure model and layout functions can be tested without a browser. The DOM and
Web Audio integration remain in their respective controllers. See
[testing.md](testing.md) for what this separation currently verifies.

## Decisions and tradeoffs

### Native modules and static hosting

The interface uses native ES modules and browser APIs, with a small Node build
script. This keeps the deployed product compatible with GitHub Pages and avoids
requiring a server for state, playback, or export. The build renders the same
explorer template in six languages and shares the JavaScript, styles, fonts, and
PDFs across them. Each edition has its own URL, localized HTML, and canonical
link. A crawler can read the page title and follow language links before the
app starts. [Public URLs and discovery files](discovery.md)

Tukany selects backing tracks locally from a catalog of YouTube video IDs.
Selecting a track loads YouTube’s embedded player below the fretboard. [Track selection and catalog maintenance](backing-tracks.md)

The tradeoff is manual coordination of DOM state and rendering. As the interface
grows, browser-flow tests and careful controller boundaries become more valuable.
The current implementation is not evidence that a framework would be unsuitable
for a larger application.

### One musical model, two renderers

Both renderers calculate from the same interval and tuning data. Changing tuning
changes each note and position. Handedness mirrors horizontal coordinates while
retaining string order and readable text. The HTML fretboard and PDF use different coordinate
systems and density constraints, so they have separate layout functions.

Each renderer needs its own visual checks. The PDF uses a continuous tapered neck.
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

Key spelling derives each letter from the written degree formula, including E♯,
C♭, and double accidentals. The Scale card always shows the same 12 pitches.
The Scale card offers alternative names for the selected tonic. The music model
keeps an explicit choice in its validated `tonic` field.
Without an explicit tonic, the model chooses the simpler spelling, favoring sharps
on a tie. Contextual MIDI labels retain written octaves, such as B♯3 for sounding C4.
The explorer uses key spelling and ignores the legacy `spelling` preference.

### Shareable state and device preferences

`?key=F&scale=minor-blues&hand=left` opens F minor blues on a left-handed
six-string guitar in standard tuning. The presence of `key` marks a complete
practice link. Omitted settings use application defaults for that instrument
and string count, regardless of what the recipient last played.

- `key` uses letter names. For example, `key=Gb` selects G♭ and `key=F%23`
  selects F♯. Accidentals pin that spelling by default. `spell=auto` preserves
  automatic spelling for an accidental key, and `spell=fixed` preserves an
  explicitly chosen natural. Major is the default scale. Other scales use
  their catalog ID in `scale`, and custom scales use `formula`.
- `instrument`, `strings`, `frets`, and `hand` describe the instrument setup.
  Preset names such as `tuning=drop-d` apply to the specified instrument and
  string count. Custom tunings use `pitches` with octave numbers in ascending order.
- `pattern` highlights a fingering. `labels=degrees` displays scale degrees,
  `notes=all` reveals pitches outside the scale, and `lang` selects an interface
  language. English is the default.

A bare URL resumes saved practice. A language path such as `/fr/` or an older
language-only link such as `/?lang=fr` opens that session in French. The root
path serves English HTML and honors a returning player's language preference in
the app. Older links with numeric `root`, full tuning IDs, or `range` still open.
Storage is optional.

Handedness is a shared preference and defaults to right-handed.
Each instrument remembers its fret count and last string count.
Each string count remembers its tuning and custom pitches for that instrument.
Switching instruments keeps the musical selection and current orientation. New
setups start with 21 frets for guitar and 20 for bass. Custom tuning edits
commit after validation. Display changes retain the horizontal fretboard
position. A new setup starts at its open-string end.

The document head applies Light before paint unless the player has saved Dark
under `scales.theme` on this device. Both themes stay consistent across
operating-system appearance changes and shared musical links. When device storage
is unavailable, the button still switches themes for the current visit. A theme
change updates CSS variables while preserving the fretboard and playback state.

### Inline settings and focused interaction

The Scale card sits above the fretboard. Root-note radios transpose the current
music. Selecting a family changes the visible scale choices. Choosing a scale
updates the fretboard heading, diagram, and formula. The main heading is available
to screen readers.

The instrument button in the fretboard header displays the current instrument
and tuning. Its dropdown contains switches for instrument and handedness.
Choosing Guitar or Bass restores a compatible setup. Choosing Right-handed or
Left-handed updates the fretboard geometry, range labels, and PDF output.
Native radio groups expose the available string and fret counts directly.
The full-width tuning picker includes the open pitches from lowest to highest.
Choosing a custom tuning reveals its pitch fields in place.
One shared listbox serves tuning, language, scale family, and tonic spelling.
Keyboard, pointer, and touch selections use the same
change handlers. On phones, a sticky current-scale shortcut scrolls to the
fretboard and focuses its heading.

The formula pairs each degree with its spelled note in a playable button.
Selecting a scale updates those degrees. Shared links and saved sessions can also
display a custom formula. Custom tuning validation appears next to its inputs.
Keyboard selection returns focus to the chosen result after its active state updates.

Clickable pattern ranges above the neck select exact string/fret point sets.
Their spans describe where a fingering lies, rather than selecting every note
inside a rectangular fret window. Each bracket carries a numbered label, such as
“Pattern 1.” Its accessible description and tooltip give the shape or starting
string, fret span, and lowest degree. Brackets can share a row when their spans and
labels fit side by side. They scroll horizontally with the frets. Both ends have vertical guides extending
through the neck behind the notes; selection strengthens those guides. A marker
toggles on with a click, Enter, or Space, and toggles off when activated again. Pressed
state and keyboard focus survive the fretboard update.
A restrained inline caption names the selected pattern and its lowest note and
degree. It does not repeat the fret span already drawn on the bracket or add a
note-count card.
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
fallback. Every fingering fits the configured instrument neck.

Bass patterns are generated compact root-to-octave routes, each beginning on an
available starting string. Their exact points follow the selected scale and sounding tuning.
The model avoids presenting a clipped or unreachable route as a complete pattern.

The homepage favors complete first-octave placements when available. The remaining
patterns use complete placements elsewhere on the configured neck. The printable
atlas also covers the full neck.

Notes outside a selected pattern's point set turn gray, including notes at frets
that other strings use inside the pattern. Marker geometry and fret descriptions
follow handedness, while pattern identities stay musically stable. With all markers
cleared, the board shows the scale across the neck. The diagram's dimensions
depend on fret and string counts. Narrow screens start at the nut on the left for a
right-handed setup or the right for a left-handed setup, including when a shared
link restores a pattern. Selecting a bracket brings that pattern into view.
Clearing it preserves the horizontal position.

Pattern IDs for CAGED, two-, three-, and four-notes-per-string systems, blues,
and bass routes survive device preferences and shared links. Old numeric-range
and region links clear the fingering selection rather than pretending that a
legacy window is a pattern. A 3NPS ID only restores for a scale/setup that uses
that system.

The root legend, Notes/Degrees switch, Show other notes checkbox, and share action
sit inside the diagram beneath the neck. Note feedback appears there after
inspection. The board has one note tab stop, with arrow keys moving along
strings and frets in the displayed orientation.

The staff draws each distinct pitch used by the available patterns in ascending
order. Selecting a pattern limits the staff to that fingering. With no complete
pattern, the staff shows one playable octave of the scale. Inspecting another
fret can temporarily add its exact pitch.
The page groups these controls by their musical task and stacks the groups on
phones. The rationale and research sources are recorded in [design.md](design.md).
Assistive-technology compatibility still needs broader validation.

### Procedural instrument audio

The string model uses Karplus–Strong synthesis, an averaging loop, a fractional
delay correction, damping, and body coloration. A shaped harmonic pluck supplies
a stable fundamental, with filtered pick noise for attack texture and separate
guitar/bass harmonic balance and decay settings. The fractional correction avoids
rounding every note's delay to an integer number of samples.

An LRU cache holds up to 48 generated mono buffers. Plucked notes play through
a gain stage and compressor. Activating another note or changing the setup or
pattern fades the current pluck. A version token cancels pending audio starts
and prevents an older pluck from clearing the current note's highlight when it
ends.

The Scale card’s formula buttons also control playback. Activating a tone
highlights its pitch class across the visible neck and shows its interval and
location. Board notes retain their actual string and fret in the detail readout.

This avoids recorded sample downloads and sample-library licensing. It introduces
DSP complexity and produces a synthesized timbre rather than the range of a
recorded instrument. The tests measure pitch and envelope properties, not
perceptual realism. References are recorded in [references.md](references.md).

### PDF layout and cancellation

pdf-lib and fontkit load on demand. Fonts and the publisher logo are local assets.
The generator plans the cover, contents, reading page, and scale pages before
rendering. Export estimates reuse that planner, including additional contents
pages for a large catalog.

The two download cards describe their contents, map and page counts, format, and
instrument configuration. One exports the selected family in the current key,
or the individual scale for a custom formula. The other exports the full catalog
in that key.
The browser captures the selected configuration and export scope before awaiting
libraries or rendering. Progress and cancellation operate on that export, so a
later state change cannot silently rename a PDF generated from an earlier state.
Larger atlases still require more browser memory and time.

### Cache-consistent releases

The build computes a shared revision for the source modules, appearance bootstrap,
styles, and visual assets. The published page uses that revision for its scripts,
stylesheets, icon font, and relative module imports.
An updated entry point therefore requests matching dependencies rather than
reusing an older unversioned import. All paths remain relative for project hosting.

This is cache busting, not an offline cache. Formatting changes also change the
revision. CI verifies the published references and tests/builds before deployment.

## Licensing boundaries

Code uses MPL 2.0. Original educational content uses CC BY 4.0. Logo rights and
third-party font/library licenses are documented separately. No recorded samples
are bundled. YouTube hosts the backing tracks and serves the embedded player
when the user plays a track in Tukany.

## Extending the system

For a new tuning, provide exact sounding pitches including octaves. For a scale,
provide intervals, degrees, names in all six languages, and aliases. Add entries to
`catalog.mjs`, run the tests, and check the web and PDF layouts. Existing shared
links depend on stable IDs, so prefer adding aliases over renaming identifiers.

A new instrument/string count requires validation, controls, audio-range, and
both renderer checks. It should not be implemented solely by adding an option to
a dropdown. See [Contributing](../CONTRIBUTING.md) and the [roadmap](roadmap.md).
