# Homepage design decisions

The homepage should help a player choose a scale, see its notes on the fretboard,
and hear or practice a nearby position. The refactor prioritizes that sequence
while keeping instrument, display, custom-scale, playback, and PDF settings inline.

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

Use a compact introduction, a concise scale browser beside instrument setup
above the board, and one prominent exploration surface. The two setup groups
stack on phones, with scale selection first. Keep the selected scale, Play action, position
buttons, and fretboard closely related. Reduce repeated selected-scale summaries,
tuning pitches, and formulas. Keep instrument controls grouped next to music
selection, and give export work a quieter inline section below the board. Use alignment, spacing,
and consistent type sizes before adding more cards or decorative elements.

## Constraints

- No application popup menus or modal settings; settings remain on the homepage.
- Scale selection stays above the fretboard; PDF customization stays below it.
- The complete neck stays visible at fixed dimensions, with contained scrolling.
  Pattern selection grays out notes outside the chosen frets.
- Position, half-neck, and full-neck buttons retain their color families, labels,
  selected states, handedness order, and mirrored numeric ranges.
- English, Português, and Español retain their regional musical terminology.
- Preserve custom-input validation, draft values, keyboard operation, playback,
  remembered setup, shared links, and PDF snapshot behavior.

## Verification

Compare the board's page position before and after at desktop and phone sizes.
Check 320, 390, 720, and 1280 CSS-pixel layouts in all three languages, including
long names and custom tuning. Verify choosing A minor pentatonic, changing range,
playing notes, finding handedness, and downloading a customized PDF by keyboard
and pointer. Check focus continuity, touch spacing, validation, fixed board size,
and horizontal page containment. These checks establish functional and layout
behavior; they do not establish improved usability without observing players.

## Layout measurement

In Chromium at a 900px viewport height, after fonts loaded, a six-string
E-standard guitar and C natural minor with frets 0–4 highlighted place the fretboard at these
page positions in the current layout:

| Viewport width | Fretboard top |
| -------------- | ------------- |
| 1360px         | 704px         |
| 390px          | 1223px        |

The scale and instrument panels share a row on desktop. They stack before the
board on phones, keeping both settings groups available in normal page flow.
This measures layout, not task completion time or first-time-user comprehension.
