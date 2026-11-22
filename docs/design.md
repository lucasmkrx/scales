# Homepage design decisions

The homepage should help a player choose a scale, see its notes on the fretboard,
and hear or practice a nearby position. The refactor prioritizes that sequence
while keeping instrument, display, custom-scale, and PDF settings inline.

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

Begin directly with a concise scale browser beside instrument setup above the
board and one prominent exploration surface. The two setup groups
stack on phones, with scale selection first. Keep the selected scale, pattern
ranges, and fretboard closely related. Reduce repeated selected-scale summaries,
tuning pitches, and formulas. Keep instrument controls grouped next to music
selection, and give export work a quieter inline section below the board. Use alignment, spacing,
and consistent type sizes before adding more cards or decorative elements.

The Scale card shows the current root and scale name above the controls. Players
can transpose the diagram using 12 circular root buttons. Accidentals show both
names in one circle, such as F♯ and G♭. Common scales are
available on a fresh visit. A family menu brings related choices such as blues
scales or arpeggios into view. The scale buttons share a height, including
when a translated name wraps. A check marks the active scale.
The formula shows one degree per chip, in playing order.
Edit opens a text field for entering a custom formula.

Pill-shaped buttons appear in the scale catalog, playback controls, and PDF
actions. A check marks the current scale, and the switch thumb marks the active
instrument or orientation.

On phones, a sticky current-scale shortcut gives a direct route to the fretboard
while leaving the settings visible in normal page order. Activating it focuses
the fretboard heading below the shortcut. A single inline caption explains the selected
pattern and its lowest note and degree. The bracket already supplies its fret span.
The fretboard’s Note names menu controls how pitches are written. By key
follows the scale formula and offers a choice of tonic spelling when a pitch
has alternative names. The reference buttons follow the current note or degree
mode. Short labels fit in a circle. Longer labels expand to a pill. Repeated setup cards,
practice prose, and the PDF configuration summary are removed.

The instrument and orientation switches each show two labeled positions. A filled pill slides behind the selected label, which also shows a checkmark.
Players can tap a label, drag to either side, or use the arrow keys. Guitar shows a Telecaster headstock with six tuning pegs.
Bass shows a Fender bass headstock with four. Both icons follow their labels’
color in light and dark themes. The available string and fret
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
screen readers. The appearance button shows a sun beside “Light” or a moon beside
“Dark.” The visible label follows the selected language, and the accessible
name identifies the current theme and the next action. Light is the default in
every operating-system theme. Choosing Dark keeps it active on future visits until
the player switches back to Light.

Light and dark themes share the same layout and note colors. Dedicated fretboard
surfaces, labels, guides, and focus colors keep the diagram integrated with the
rest of the interface. Theme changes recolor the existing surface without moving
the notes, clearing a selection, or interrupting audio. Printable references
keep their separate light palette.

Motion is brief feedback for selection, button activation, and sounding notes.
It does not stretch or move the neck. Reduced-motion preferences disable those
animations and transitions while retaining the same visible states.

## Constraints

- Settings remain on the homepage, including the expanded tuning list.
- Scale selection stays above the fretboard; PDF customization stays below it.
- Frets 0–12 is the default; a labeled sliding switch reveals the full neck.
  Each view keeps fixed proportions with contained scrolling. Pattern selection
  grays out notes outside the chosen string/fret point set.
- Thin pattern brackets sit above the frets they describe, each with a centered label such as “Pattern 1”. The brackets mirror for
  handedness. Click once to select and again to clear; selection must also work
  by keyboard and expose its pressed state.
- English, Português, and Español retain their regional musical terminology.
- Preserve custom-input validation, draft values, keyboard operation, note audio,
  remembered setup, shared links, and PDF snapshot behavior.

## Verification

Compare the board's page position before and after at desktop and phone sizes.
Check 320, 390, 720, and 1280 CSS-pixel layouts in all three languages, including
long names and custom tuning. Verify choosing A minor pentatonic, changing range,
playing notes, finding handedness, and downloading a customized PDF by keyboard
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

The default 0–12 view reduces the amount of neck a new player must scan. A visible,
two-position sliding switch sits in the fretboard header, keeping
view controls separate from pattern annotations. It offers the full neck without
hiding settings and wraps below the title on phones. View choices are remembered
and shareable. Only complete patterns are offered within
the chosen view: an entire fingering may move by an octave to fit, while a shape
that still cannot fit is omitted. A short full-neck cue explains missing patterns.
Expanding the view retains a fitting first-octave instance rather than moving a
selected pattern unnecessarily. This keeps the simpler view from silently
clipping shapes or playing hidden notes.

## Layout measurement

Measure the selected neck view's page position at desktop and phone sizes after
fonts load, with a named scale, tuning, and selected pattern recorded. Scale and
instrument panels share a row on desktop and stack before the board on phones.
These measurements describe layout, not task completion time or comprehension.

The documentation captures use C major, six strings in E standard, right-handed
playing, compact Position 1, and frets 0–12. After local fonts loaded:

| Viewport width | Fretboard card top | Pattern-and-neck surface top | Settings layout               |
| -------------- | ------------------ | ---------------------------- | ----------------------------- |
| 1360px         | 618px              | 732px                        | Side by side, each 517px high |
| 390px          | 1270px             | 1439px                       | Stacked                       |

Both captures contain the page width without horizontal page overflow. The phone
scrolls the fixed-size diagram inside its own surface. The light and dark captures
have matching settings, fretboard card, and neck positions.
