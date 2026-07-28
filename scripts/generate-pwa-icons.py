"""Generate PWA icons that show the full Alpha circle (no square crop)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public" / "alpha-logo.png"
OUT = ROOT / "public" / "icons"
BG = (5, 8, 15, 255)  # #05080f


def load_logo() -> Image.Image:
    img = Image.open(SRC).convert("RGBA")
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    return img


def sample_fill(logo: Image.Image) -> tuple[int, int, int, int]:
    """Dark fill for the circular disc behind the emblem."""
    w, h = logo.size
    px = logo.getpixel((w // 2, int(h * 0.72)))
    if px[3] < 200:
        return (8, 28, 48, 255)
    return (px[0], px[1], px[2], 255)


def circular_mask(size: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((1, 1, size - 2, size - 2), fill=255)
    return mask


def make_circle_icon(
    logo: Image.Image,
    canvas: int,
    fill: float,
    *,
    transparent_outside: bool,
) -> Image.Image:
    """
    Build a round emblem:
    - filled circular disc (so clipped L/R sides of the source still read as a full circle)
    - logo centered on top
    - transparent outside the circle for purpose=any, or solid BG for maskable/apple
    """
    if transparent_outside:
        base = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    else:
        base = Image.new("RGBA", (canvas, canvas), BG)

    disc = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    draw = ImageDraw.Draw(disc)
    pad = int(canvas * (1 - fill) / 2)
    fill_color = sample_fill(logo)
    draw.ellipse((pad, pad, canvas - pad - 1, canvas - pad - 1), fill=fill_color)

    target = int(canvas * fill)
    lw, lh = logo.size
    scale = min(target / lw, target / lh)
    nw, nh = max(1, int(lw * scale)), max(1, int(lh * scale))
    resized = logo.resize((nw, nh), Image.Resampling.LANCZOS)
    x = (canvas - nw) // 2
    y = (canvas - nh) // 2
    disc.paste(resized, (x, y), resized)

    # Clip everything to a clean circle.
    r, g, b, a = disc.split()
    a = ImageChops.multiply(a, circular_mask(canvas))
    disc = Image.merge("RGBA", (r, g, b, a))

    return Image.alpha_composite(base, disc)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    logo = load_logo()

    # purpose=any — transparent corners → circular home-screen icon
    for size in (192, 512):
        make_circle_icon(logo, size, 0.96, transparent_outside=True).save(
            OUT / f"icon-{size}.png", optimize=True
        )

    # purpose=maskable — solid bg + safe-zone padding (Android adaptive)
    make_circle_icon(logo, 512, 0.62, transparent_outside=False).save(
        OUT / "icon-maskable-512.png", optimize=True
    )

    # iOS
    make_circle_icon(logo, 180, 0.88, transparent_outside=False).save(
        OUT / "apple-touch-icon.png", optimize=True
    )

    print("Wrote icons to", OUT)


if __name__ == "__main__":
    main()
