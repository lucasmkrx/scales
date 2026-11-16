# Instrument artwork editing

The shipped [guitar](../../public/assets/instruments/guitar.webp) and
[bass](../../public/assets/instruments/bass.webp) assets were prepared on
November 16, 2026 with the built-in OpenAI image generation tool. These are
AI-assisted adaptations of the approved public previews, not renders from
downloaded model files. See [artwork credits](../../public/assets/instruments/credits.html)
for the original works and license.

Each tool call used one local reference image and `transparent_background: true`.
The following templates record the final prompt set; the table provides the
substitutions for the two instruments.

| Asset       | `subject`                           | `name` | `count` |
| ----------- | ----------------------------------- | ------ | ------- |
| guitar.webp | sunburst six-string electric guitar | guitar | 6       |
| bass.webp   | green four-string electric bass     | bass   | 4       |

## Initial extraction

```text
Use case: background-extraction.
Asset type: transparent product cutout for a small instrument-orientation control in a music learning app.
Edit target: the attached source preview of a {subject} by Ryan_Nein.
Primary request: remove the entire colored studio background, floor, and cast floor shadow, leaving only the existing instrument on a genuinely transparent alpha background. Mirror it horizontally so the HEADSTOCK is on the LEFT and the BODY is on the RIGHT. Keep the entire instrument within frame, from tuning pegs to the farthest body edge.
Invariants: preserve the source instrument's exact body shape, finish, materials, hardware, pickguard, string count, frets, pickups, perspective and realistic dimensional shading. Treat this as precise background extraction and horizontal mirroring; do not redesign or replace the instrument.
Composition: a wide horizontal product cutout, centered, a small transparent margin around the whole silhouette. Keep natural instrument proportions. No platform, stand, floor, scenery, border, labels, text overlays or watermark. Actual transparent output, no checkerboard drawn into the image.
```

## Detail correction

The first generated cutout was the edit target for this additional call:

```text
Use case: precise-object-edit. Edit target: attached transparent {name} product cutout. Make only one correction: the headstock must have exactly {count} distinct metallic tuning keys and {count} tuning posts, one per string, arranged along the upper edge. One key is currently missing; add it and arrange the {count} keys with credible spacing. Preserve all other pixels/geometry as closely as possible: unchanged body, neck, original finish/color, materials, hardware, overall proportions and horizontal pose, headstock left and body right. Keep whole instrument fully visible. Keep genuinely transparent background. No shadow, floor, labels or other added elements.
```

Delivery processing crops the transparent margin, scales the result proportionally
into a 632 × 152 area, centers it on a transparent 640 × 160 canvas, and encodes
WebP at quality 94. The UI treats these as decorative instrument artwork; exact
string counts and tuning pitches are rendered by the playable fretboard.
