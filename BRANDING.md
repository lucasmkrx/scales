# Tukany branding

[Tukany's toucan](public/assets/tukany-logo.svg) and
[wordmark](public/assets/tukany-wordmark.svg) are the editable SVG originals.
The toucan is 75% of the wordmark's SVG height in the header, footer, and
printable charts and guides. Its wing starts just above the capital T, and its
tail lines up with the foot of the T. The y descends below the tail.
Charcoal (`#12171B`) colors the plumage and lettering, and orange (`#D85A16`)
colors the musical note. In dark mode, cream (`#FAF8F2`) colors the plumage and
lettering, with the orange note on a transparent background.

After updating either SVG, regenerate the dark-mode logo, favicons,
home-screen icons, and social preview before building the site. From the
repository root, run

```sh
python -m pip install -r scripts/requirements.txt
python scripts/brand-assets.py
npm run build
```

The browser favicon gains a cream background in dark tabs. Safari pinned tabs
use an orange silhouette of the toucan. The launcher PNGs
have an opaque background and padding for circular or rounded masks. The
1200 × 630 share image stacks the marks and offsets the bird to the right so
its body sits over the center of the lettering. Both marks fit within the
central square crop.
