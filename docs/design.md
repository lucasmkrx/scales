# Homepage design decisions

The homepage should help a player choose a scale, see its notes on the fretboard,
and hear or practice a nearby position. The refactor prioritizes that sequence
while keeping instrument settings, display controls, playable scale degrees, and PDF downloads on the homepage.

## Evidence

### Design principles

- Nielsen Norman Group describes visual hierarchy through scale, contrast, and
  grouping. Proximity and whitespace communicate relationships; adding a boundary
  around every group can introduce clutter.
  [Visual hierarchy](https://www.nngroup.com/articles/visual-hierarchy-ux-definition/)
- Its minimalist-design heuristic emphasizes necessary information and useful
  controls. Redundant or decorative content competes with task-relevant content;
  removing necessary functionality is not the objective.
  [Aesthetic and minimalist design](https://www.nngroup.com/articles/aesthetic-minimalist-design/)
- WCAG's target-size guidance specifies 24 × 24 CSS-pixel targets or qualifying
  spacing/exceptions and explains why larger targets can improve activation.
  [Target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- Color must have another visible means of conveying meaning.
  [Use of color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)

### Comparable tools

These are observations of published tools, not evidence of their usability.

- [All Guitar Chords](https://www.all-guitar-chords.com/scales) explains scale
  selection as root, category, scale, then shape.
- [Fretastic](https://fretastic.com/guitar) presents the selected scale and its
  constituent notes alongside playback.
- [FretMap](https://fretmap.app/) centers fretboard exploration and associates
  position selection, tuning, note information, and playback with that surface.
  Its menus are not a pattern to adopt here.

## Design interpretation

Our inference is that the current problem is competing visual priorities and a
long path to the diagram. A quieter hierarchy can retain functionality while
making the main task easier to identify.

The scale browser leads into the fretboard. A prominent button in the fretboard
header shows the current instrument and tuning. It opens a settings dropdown
over the diagram so the neck stays in position.
The single download section below the playing surface offers a practice chart,
a related-family guide, and a smaller full-catalog action. Its paper selector
applies to every download.

The Scale card has a music note icon. The PDF downloads card uses the same
heading style with a PDF icon. The larger fretboard heading shows the selected
root and scale name. Players can transpose the diagram using 12 buttons arranged
in a circle of fifths. The center shows the current root and scale. Accidentals
show both names on one button, such as F♯ and G♭. Common scales are
available on a fresh visit. A family menu brings related choices such as blues
scales or arpeggios into view. Each name has its degree formula underneath.
Selecting a name applies it to the fretboard. A solid green background and a
checkmark identify the selected scale. Names occupy two columns on wide
screens and one on phones.
Below the fretboard title, each formula button pairs a degree with its spelled
note. The buttons play in ascending pitch order from the root and highlight the
corresponding pitch on the fretboard.

On phones, the instrument and tuning appear in a compact control, and the
formula buttons use a four-column grid. A caption identifies the selected
pattern and its lowest note and degree. The bracket supplies its fret span.
The fretboard and circle center use the tonic spelling chosen for the scale
formula or supplied by a practice link.
The Notes/Degrees switch and Show other notes checkbox sit alongside the root legend
at the foot of the fretboard. They control the diagram labels and visibility
of pitches outside the scale.

The instrument and orientation switches each show two labeled positions. A filled pill slides behind the selected label, which also shows a checkmark.
Players can tap a label, drag to either side, or use the arrow keys. Guitar shows a Telecaster headstock with six tuning pegs.
Bass shows a Fender bass headstock with four. Both headstocks mirror horizontally
for left-handed playing and follow their labels’ color in light and dark themes. The available string and fret
counts appear as numeric choices that players can select directly. The tuning
picker is a full-width rounded rectangle that shows the open strings from lowest
to highest. Its 14px corner radius leaves room for the pitch labels. All dropdown
menus have 20px outer corners. Option rows keep 12px corners even when a label
wraps or a tuning shows its pitches on a second line. A check marks the current
choice, and long lists scroll within the menu.
Choosing a custom tuning reveals individual pitch fields.

### Appearance and feedback

Controls pair their labels with solid icons from the locally served Font Awesome
Free webfont. The icons inherit the control's text color and are hidden from
screen readers. The appearance switch shows a sun and a moon together. A filled
background marks the active theme. Its tooltip
and accessible name identify the current theme and the next action in the
selected language. Light is the default in
every operating-system theme. Choosing Dark keeps it active on future visits until
the player switches back to Light.

Both themes use IBM Plex Sans for headings and interface copy, and IBM Plex Mono
for diagram labels. Light mode pairs charcoal controls with off-white panels
and fretboards. Dark mode uses warm stone controls against charcoal.
Each natural pitch has a distinct color in both themes. Changing the palette
preserves the player’s position, selection, and audio. Printable references
use a separate light palette.

Motion is brief feedback for selection, button activation, and sounding notes.
It does not stretch or move the neck. Reduced-motion preferences disable those
animations and transitions while retaining the same visible states.

### Printed charts

One landscape page keeps the neck, staff, and available fingerings together.
The guitar layout follows the whole-neck and position views used in
[Fretwork’s one-page chart](https://guitarfretwork.com/printables/minor-pentatonic-scale-chart/).
The bass layout pairs the instrument diagram with staff notation, as in
[Better Bass Lessons’ printable chart](https://blog.betterbasslessons.com/bass-scale-chart/).

The generator uses the physical dimensions of the chosen paper. Fingering
diagrams use the main fretboard’s equal-tempered spacing. Frets near the nut
are wider, and the open strings have their own lane. The diagrams wrap into
rows as space permits. On a crowded sheet the overview and all its patterns
use the same reduced scale, so a given fret has exactly the same printed width
everywhere on that page.
[W3C page-size definitions](https://www.w3.org/TR/css-page-3/#page-size)

Longer books offer linked contents. The catalog adds an alphabetical index and
bookmarks grouped by family so readers can look up a chart by name or browse
related sounds. [W3C bookmark guidance](https://www.w3.org/WAI/WCAG22/Techniques/pdf/PDF2)

## Constraints

- Settings remain on the homepage, including the expanded tuning list.
- Scale selection stays above the fretboard. The PDF downloads sit below it.
- The fretboard spans the configured number of frets at a fixed scale. Narrow
  screens start at the nut and scroll horizontally. Pattern selection grays out
  notes outside the chosen string/fret point set.
- Thin pattern brackets sit above the frets they describe, each with a centered label such as “Pattern 1”. The brackets mirror for
  handedness. Click once to select and again to clear; selection must also work
  by keyboard and expose its pressed state.
- Use the musical terminology of each language in labels, scale names, and generated atlases.
- Preserve custom-input validation, draft values, keyboard operation, note audio,
  remembered setup, shared links, and PDF snapshot behavior.

## Verification

Compare the board's page position before and after at desktop and phone sizes.
Check 320, 390, 720, and 1280 CSS-pixel layouts in all six languages, including
long names and custom tuning. Verify choosing A minor pentatonic, selecting a
pattern, playing notes, changing handedness, and downloading each PDF by keyboard
and pointer. Check focus continuity, touch spacing, validation, fixed board size,
and horizontal page containment. These checks establish functional and layout
behavior; they do not establish improved usability without observing players.

## Musical pattern decisions

Fret windows are useful map regions, but they are not fingering patterns. The
implementation now stores membership as exact string/fret coordinates and uses
those same points for highlighting.

### Accuracy audit and chosen system

For six-string major and natural minor, the earlier diagonal three-notes-per-string patterns agree with
[Fret Science's 3NPS diagrams](https://fretscience.com/2022/10/09/3nps-one-pattern-to-rule-them-all).
They are a valid fingering system, but they did not match the compact major/minor
positions intended for this tool. Pattern numbers alone do not identify a universal
fingering: the system and reference convention must also be stated.

The six-string guitar now uses the five compact CAGED positions from
[Applied Guitar Theory's major-scale diagrams](https://appliedguitartheory.com/lessons/major-scale/)
and its [natural-minor diagrams](https://appliedguitartheory.com/lessons/natural-minor-scale/).
Major positions follow E, D, C, A, G shape order; the corresponding minor shapes
are Em, Dm, Cm, Am, Gm. Numbers identify those position templates, not scale degrees
or modes. Templates are checked against the original diagrams, including their
lower and upper extension notes, and transposed as whole coordinate sets.

A concrete regression reference is
[C major Position 1](https://appliedguitartheory.com/lessons/c-major-scale-on-guitar/):
its 17 notes occupy frets 7–10, include C at fret 8 of the high E string, and do
not include fret 12. From low E to high E, the frets are
`7 8 10 / 7 8 10 / 7 9 10 / 7 9 10 / 8 10 / 7 8 10`.
This fixture distinguishes the intended E-shape position from a 3NPS route.

Major/minor pentatonic shapes retain the verified two-notes-per-string system;
see the [major pentatonic reference](https://appliedguitartheory.com/scale/a-major-pentatonic-scale/)
and [minor pentatonic reference](https://appliedguitartheory.com/lessons/a-minor-pentatonic-scale/).
Standard tuning intervals and uniform transpositions are supported, including
seven-string pentatonic extensions. Six-string blues preserves the exact five
boxes in the [minor-blues lesson](https://appliedguitartheory.com/lessons/blues-scale/)
and [major-blues lesson](https://appliedguitartheory.com/lessons/major-blues-scale/),
including their edge passing tones. Seven-string blues adds intervening blue
notes to generated pentatonic routes; it does not claim those routes are the
six-string reference boxes.

The other major-scale modes and harmonic/melodic-minor families use a labeled
three-notes-per-string system. This follows the approach in
[Anyone Can Play Guitar's 3NPS lesson](https://www.anyonecanplayguitar.co.uk/three-note-per-string-scales/),
[Jens Larsen's harmonic-minor patterns](https://jenslarsen.nl/harmonic-minor-scale-3-notes-per-string/),
and [Jazz Guitar Licks' melodic-minor positions](https://www.jazz-guitar-licks.com/pages/guitar-scales-modes/modes-of-the-melodic-minor-scale/melodic-minor-scale-guitar-positions.html).
Seven-string major/minor use these generated routes, not invented CAGED extensions.
Notes follow consecutive scale tones across each string change; a fingering is
an exact path with a defined starting degree. The positions can involve shifts
and wider reaches than the compact CAGED templates.

Whole tone also uses three notes per string. Both diminished scales use four.
Their symmetric interval cycles repeat, so numbered positions identify starting
degrees rather than a claim of six or eight unique fingering geometries.
Unsupported exotic collections and altered tuning intervals keep the note-map
fallback. A generated route is never presented as a verified compact CAGED template.

Bass uses generated compact root-to-octave routes rather than guitar boxes. These
are practical calculated paths, not a claim of one canonical bass fingering. The
[StudyBass one-octave major lesson](https://www.studybass.com/lessons/bass-scales/one-octave-major-scale/)
provides a reference for a practical route with a defined starting string and
hand position. Other scales and tunings require their own pitch-correct route;
a complete, compact route must exist before a pattern is offered.

Pattern brackets use a thin horizontal cap and short end strokes, with a
centered label such as “Pattern 1.” Shape and fret details are available on hover and to assistive technology.
Brackets share rows where space allows. Overlapping brackets sit at different heights so each label stays readable. Thin strokes and
open space make the spans read as fretboard annotations. Spatial placement shows
the occupied frets before selection. Vertical lines extend from both ends down through the
neck behind the notes; the selected pattern uses stronger guides. The markers
and neck scroll as one surface; clearing a selected range restores the visible map without jumping to the nut. The range is
a spatial guide to an exact fingering, not a rectangle defining note membership.

Complete fingerings use their lower-octave placements when they fit within the
first twelve frets. Other patterns appear at their playable positions farther
along the neck. Each bracket and its notes scroll together.

## Layout measurement

Measure the fretboard's position after fonts load at desktop and phone widths.
Record the scale, tuning, and selected pattern. Confirm that the neck stays in
position when the instrument dropdown opens. Check that both themes place the card and neck at the same
coordinates and that the fretboard and staff scroll within the page.
