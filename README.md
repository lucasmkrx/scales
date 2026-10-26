# Scales

**Notes, scales, and improvisation for guitar and bass.**

[Open the interactive tool](https://lucasmkrx.github.io/scales/) ·
[Português](https://lucasmkrx.github.io/scales/?lang=pt) ·
[Guided books](public/guides/)

Scales is for players who already learn songs from TAB and want to understand
their notes, learn scales, and improvise over backing tracks. The explorer,
audio playback, and PDF generator run entirely in the browser on GitHub Pages.
No account, backend, analytics, or external API is required.

## What is included

- 67 named scales, modes, and chord arpeggios, transposable to all 12 roots.
- 44 tuning presets for six- and seven-string guitar and four-, five-, and six-string bass.
- A searchable scale picker with common scales first, the complete catalog, and chord arpeggios.
- Custom tuning pitches with real octave numbers, and custom scale formulas.
- Right- and left-handed neck maps, with 20, 21, 22, or 24 frets.
- American English and Brazilian Portuguese.
- Contextual note spelling, degrees, roots, and the original seven-note color palette.
- Click or keyboard-activate a note to hear it; play an ascending/descending scale.
- Shareable URLs containing the full configuration.
- Vector PDF atlases for a scale, family, or full catalog; selected scales can
  also be exported in all 12 keys. Downloads match the guided books: a light cover,
  clickable contents, reading instructions, and a full map with smaller positions
  and a note/degree legend on each scale page. Every page has discreet Marques & Co. branding.
- Four guided books from the original project, with eight applied-theory
  studies and six improvisation lessons each.

The catalog covers all seven modes of major, harmonic minor, jazz/ascending
melodic minor, harmonic major, and double harmonic major; pentatonics, blues,
whole tone, diminished, augmented, chromatic, bebop, and common chord arpeggios.
“All scales” is not a claim to catalog every named tradition or every possible
pitch collection. Custom formulas cover other 12-tone collections. Pelog is
explicitly labeled as a 12-tone approximation; traditional tuning systems are
not reduced to a claim of exact equivalence.

## Run locally

Install Node.js 22 or newer. There are no package-install steps.

```sh
node --test tests/*.test.mjs
node scripts/build.mjs
node scripts/serve.mjs
```

Open http://127.0.0.1:4173. The portable build is in `dist/`; all paths are
relative so the same build works under GitHub Pages' `/scales/` project path.

## Generate PDFs from the command line

```sh
node scripts/generate.mjs --instrument=bass --strings=6 \
  --tuning=bass-6-standard --hand=left --lang=en --root=2 \
  --scale=natural-minor --output=work/d-minor-bass.pdf
```

Use `--scope=family` or `--scope=catalog` for an atlas. `--allKeys=true` applies
to a selected scale. `--frets=24` and `--labels=degrees` customize the maps.
To add a predefined scale or tuning, edit `src/catalog.mjs` and run the tests.

## How the diagrams work

Tuning arrays list sounding MIDI pitches from the lowest string to the highest.
Diagrams put the thinnest string at the top. Right-handed neck maps have the nut
on the left; left-handed maps have it on the right. Handedness changes the neck
coordinates, not the pitches or string order. **TAB always reads left to right
in time.** Position windows show available notes, not a prescribed fingering or
a universal CAGED shape; shapes change with the tuning.

The generator derives every note from `open-string pitch + fret`. It never
relabels a standard-tuning image to simulate another tuning. Automatic spelling
retains the degree-based letter names of seven-note scales
and explicitly supplied formulas, including E♯ and C♭. The Sharps and Flats
settings instead show equivalent pitch names consistently across note strips,
fretboards, open-string labels, and PDF exports. Pitches, colors, and degrees
stay the same.

## Deploy

Enable **Settings → Pages → Source → GitHub Actions**. The included workflow
tests the music engine, builds the static site, and deploys pushes to `main`.
Pull requests run checks without publishing. See [architecture](docs/architecture.md)
and [musical references](docs/references.md).

## Licenses

- Code: [MIT](LICENSE).
- Original educational content and guides: [CC BY 4.0](CONTENT-LICENSE.md).
- Marques & Co. logo: [separate branding terms](BRANDING.md).
- Fonts and bundled libraries: [third-party notices](THIRD-PARTY-NOTICES.md).
