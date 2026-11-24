# Tukany branding

[Tukany's toucan](public/assets/tukany-logo.svg) and
[wordmark](public/assets/tukany-wordmark.svg) are the editable SVG originals.
The header and footer display the toucan at the full height of the wordmark.
The tail lines up with the foot of the capital T, with room below for the y.
In light mode, the toucan has black plumage and an orange musical note
(`#ff5a1f`) beside black lettering. In dark mode, the header and footer use
the same artwork in white on a transparent background, with identical sizing
and alignment.
Generated atlas covers use the wordmark.

After updating either SVG, regenerate the favicons, home-screen icons, and
social preview before building the site. From the repository root, run

```sh
python -m pip install -r scripts/requirements.txt
python scripts/brand-assets.py
npm run build
```

The browser favicon gains a cream background in dark tabs. Safari pinned tabs
use a single-color silhouette of the toucan. The launcher PNGs
have an opaque background and padding for circular or rounded masks. The
1200 × 630 share image offsets the bird to the right so its body sits
over the center of the lettering. Both marks fit within the central square crop.

## Marques & Co. publisher mark

The Marques & Co. logo in `public/assets/marques-and-co.png` is supplied by
Lucas Marques. Its use is governed by the terms below.

You may retain the embedded logo when redistributing unmodified Tukany
guides or running an unmodified copy of Tukany. This does not grant permission
to use the logo independently, modify it, or imply that Marques & Co. endorses
your work. Derivatives may remove the logo while retaining the educational
attribution required by CC BY 4.0.

Generated PDFs place the logo discreetly in the footer of every page.
