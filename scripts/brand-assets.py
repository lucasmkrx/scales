"""Rebuild the website's icon and share images from its two original SVGs."""

from io import BytesIO
from pathlib import Path
from xml.etree import ElementTree as ET

import pymupdf
from PIL import Image, ImageDraw, ImageOps

PUBLIC = Path(__file__).resolve().parents[1] / "public"
ASSETS = PUBLIC / "assets"
SVG = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG)


def render(svg, width):
    # Oversample the paths before reducing them to tab and launcher sizes.
    root = ET.parse(svg).getroot()
    _, _, w, h = map(float, root.attrib["viewBox"].split())
    height = round(width * h / w)
    root.attrib.update(width=str(width * 4), height=str(height * 4))
    with pymupdf.open(stream=ET.tostring(root), filetype="svg") as doc:
        pixmap = doc[0].get_pixmap(alpha=True)
        with Image.open(BytesIO(pixmap.tobytes("png"))) as raster:
            return raster.resize((width, height), Image.Resampling.LANCZOS)


def tile(icon, size, coverage, radius=0, *, background="white", offset=(0, 0)):
    canvas = Image.new("RGBA", (size, size))
    ImageDraw.Draw(canvas).rounded_rectangle((0, 0, size - 1, size - 1), radius, background)
    width = round(size * coverage)
    height = round(width * icon.height / icon.width)
    mark = icon.resize((width, height), Image.Resampling.LANCZOS)
    left = (size - width) // 2 + offset[0]
    top = (size - height) // 2 + offset[1]
    canvas.alpha_composite(mark, (left, top))
    return canvas


def favicon(source):
    root = ET.parse(source).getroot()
    _, _, w, h = map(float, root.attrib["viewBox"].split())
    side = w / 0.96
    x, y = (w - side) / 2, (h - side) / 2
    root.set("viewBox", f"{x:.2f} {y:.2f} {side:.2f} {side:.2f}")
    # Safari tints this single-color silhouette when a tab is pinned.
    mask = ET.Element(f"{{{SVG}}}svg", viewBox="0 0 16 16")
    outline = ET.SubElement(mask, f"{{{SVG}}}path", fill="black")
    outline.set("transform", f"scale({16 / side:.8f}) translate({-x:.2f} {-y:.2f})")
    outline.set("d", " ".join(path.attrib["d"] for path in root.iter(f"{{{SVG}}}path")))
    ET.indent(mask, space="  ")
    (ASSETS / "pinned-tab.svg").write_bytes(ET.tostring(mask) + b"\n")
    tile = ET.Element(
        f"{{{SVG}}}rect", x=f"{x:.2f}", y=f"{y:.2f}", width=f"{side:.2f}",
        height=f"{side:.2f}", rx=f"{side * 0.17:.2f}", fill="none",
    )
    style = ET.Element(f"{{{SVG}}}style")
    style.text = "@media (prefers-color-scheme: dark) { rect { fill: #faf8f2; } }"
    root.insert(0, style)
    root.insert(1, tile)
    ET.indent(root, space="  ")
    (ASSETS / "favicon.svg").write_bytes(ET.tostring(root) + b"\n")


def social_image(icon, wordmark):
    card = Image.new("RGB", (1200, 630), "#faf8f2")
    with Image.open(ASSETS / "guitar-banner.webp") as guitar:
        photo = ImageOps.fit(guitar, (352, 630), centering=(0.96, 0.5))
        card.paste(photo, (848, 0))
    # Keep both marks inside the central 630px square used by thumbnail crops.
    center = 547
    bird = icon.resize((262, round(262 * icon.height / icon.width)), Image.Resampling.LANCZOS)
    # At this size the toucan's visible ink is centered 46px left of its bounding-box center.
    card.paste(bird, (center - bird.width // 2 + 46, 88), bird)
    card.paste(wordmark, (center - wordmark.width // 2, 325), wordmark)
    card.save(ASSETS / "tukany-social.jpg", quality=93, subsampling=0, optimize=True)


def main():
    source = ASSETS / "tukany-logo.svg"
    icon = render(source, 768)
    favicon(source)
    tab = tile(icon, 256, 0.90, radius=43)
    tab.save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    # Balance the heavy left wing inside the square. iOS applies its own corner mask.
    touch = tile(icon, 180, 0.78, background="#faf8f2", offset=(7, 2))
    touch.convert("RGB").save(ASSETS / "apple-touch-icon.png", optimize=True)
    for name, size, coverage in (
        # The wing and tail both fit inside the launcher's 80%-diameter safe circle.
        ("icon-192.png", 192, 0.65),
        ("icon.png", 512, 0.65),
    ):
        tile(icon, size, coverage).convert("RGB").save(ASSETS / name, optimize=True)
    social_image(icon, render(ASSETS / "tukany-wordmark.svg", 470))


if __name__ == "__main__":
    main()
