# Contributing

Scales accepts corrections and improvements to its music model, interface,
printable references, and educational content. Start with the [architecture](docs/architecture.md)
and [testing guide](docs/testing.md).

## Local workflow

Use Node.js 22 or newer. The test, build, preview, and PDF commands run without
installing npm packages. Install the pinned development dependency for formatting:

```sh
npm ci
npm run format:check
npm test
npm run build
npm run dev
```

Open http://127.0.0.1:4173. Use `npm run format` after editing maintained source
or documentation. Vendored libraries, fonts, guide PDFs, and generated artifacts
are excluded from formatting. CI checks formatting, tests, and the static build.

## Music and catalog changes

- Include exact sounding pitches with octaves for tunings, or intervals and degree
  formulas for scales, plus a reliable musical reference.
- Keep existing IDs stable so shared links keep working. Document aliases rather
  than duplicating the same scale under different names.
- Include English and Brazilian Portuguese names or explain which translation
  needs review. Keep musical facts separate from generated drawing coordinates.
- Check altered tunings, extended string counts, both orientations, and labels.
  Changes to the music model must also be checked in an exported PDF.

## Interface and documentation changes

- Keep root and scale easy to reach on phone and desktop layouts.
- Use explicit labels, keyboard controls, meaningful focus return, and inline
  validation. Follow the manual checklist in [testing.md](docs/testing.md).
- Describe the final behavior, validation performed, and any remaining limits in
  the pull request. Add tests for behavior changes where they catch meaningful
  regressions; documentation-only changes do not need tests that mirror text.
- Update screenshots when a visible change makes them inaccurate. The README
  walkthrough is assembled from actual app captures; it is a demonstration,
  not an automated test or a recording of audio.

## Licensing and attribution

Use original educational prose. Code contributions are MIT-licensed; original
educational content uses CC BY 4.0. Follow [BRANDING.md](BRANDING.md) for the logo
and preserve [third-party notices](THIRD-PARTY-NOTICES.md). Do not add instrument
samples or other assets without documenting their source and license.

AI assistance is welcome. Review generated changes, verify musical claims, and
record relevant validation rather than assuming generated code is correct.
