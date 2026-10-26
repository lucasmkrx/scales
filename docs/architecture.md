# Architecture and scope

`src/catalog.mjs` defines scale intervals, degree formulas, aliases, bilingual
names, and tuning pitches. Mode structures are computed by interval rotation.
`src/music.mjs` validates inputs, spells notes, builds the pitch model, and
computes handed fret coordinates. Both SVG and PDF use those functions.

`src/scale-picker.mjs` groups common scales and searches bilingual names and aliases
without changing the musical selection. `src/board.mjs` renders keyboard-accessible SVG. `src/app.mjs` handles the
interface, URL state, Web Audio, and downloads. `src/pdf.mjs` draws vector PDF
pages in the guided-book design, embeds local fonts, and includes a vector logo
and outline navigation. `src/guide-layout.mjs` supplies continuous tapered-neck
geometry, mirrored fret positions, pitch-derived bass octave routes, and
paginated contents. Each scale shares a page with its smaller maps and legend;
guitar maps are fret-range references, while bass maps are ascending octave
routes on the two lowest strings. They adapt to the selected tuning.
`src/string-audio.mjs` synthesizes plucked strings with a fractional-delay
Karplus–Strong loop, damping, and body coloration. Guitar and bass use different
excitation and decay settings. Cached mono buffers play through a gain stage
and compressor; Stop fades and cancels active and scheduled voices. The app
invalidates pending audio starts when settings change.
No browser-generated data is sent to a server.

## Workspace controls

Root and scale remain above the full-width fretboard. Native modal dialogs hold
instrument setup, the searchable scale catalog, display preferences, and PDF
export options. Dialogs become bottom sheets at phone widths, retain a visible
close action, and return focus to their trigger. The scale catalog has a single
scrolling dialog body, manual selection, and arrow-key navigation through results.
Custom tuning uses one octave-qualified field per string with inline validation;
custom tuning and formula edits commit only after Apply succeeds.

`src/workspace.mjs` restores and normalizes device preferences, recalls instrument
and string-count setups, and computes export page counts through the same contents
planner as the PDF generator. Versioned localStorage is optional: unavailable or
invalid storage falls back to defaults. Explicit URL settings override saved
preferences. Ordinary display changes preserve the fretboard's horizontal position.

Vendored pdf-lib and fontkit are loaded only for PDF export. Keep their version
and license notices together when updating them. All fonts and branding are
local assets. The static build copies `public/` and `src/` to `dist/`, adding a
content revision to the stylesheet, entry point, and all module imports so
returning visitors receive each release together.

## Validation

Tests independently check every named formula; all 12 roots; every preset
tuning; sounding note positions; real bass octaves; mode rotation; contextual
note spelling; mirrored geometry; input rejection; shareable custom settings;
and playback's root and octave. Before release, exercise the browser at desktop
and phone widths and visually review representative generated PDFs (including
left-handed six-string bass and an altered tuning).

The UI supports six- and seven-string guitar and four-, five-, and six-string bass.
The engine accepts tuning data independently of prescribed shapes. Additional
instrument sizes should receive dedicated interface and PDF layout checks.

## Guided books

`src/guides.mjs` matches books by language, instrument, string count, handedness,
and sounding open-string pitches, including equivalent custom tunings. An empty
result links to scale export rather than showing a mismatched full course.

`public/guides/` contains the four current books. They retain their original
right/left handedness, language and tuning. Other combinations are available as
generated scale atlases, not falsely labeled as newly rewritten full courses.
The footer-branding utility can create branded copies without changing the
original source PDFs. All guide pages preserve links and bookmarks.
