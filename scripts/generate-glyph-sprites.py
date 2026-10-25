"""Build exact, font-rendered glyph sprites from the game's current word pool.

Run locally with macOS Python + Pillow; this script never downloads a font or
model. Source font: LXGW WenKai Medium, SIL Open Font License 1.1.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "dist/app.js"
OUT = ROOT / "dist/assets/glyphs"
FONT = Path.home() / "Library/Fonts/LXGWWenKai-Medium.ttf"
REVIEW = Path("/Volumes/Seagate1TB/HanziOasisArt/review/glyph-contact-sheet.png")
SIZE = 512
FINAL_SIZE = 256


def game_characters() -> tuple[list[str], list[str]]:
    source = APP.read_text(encoding="utf-8")
    pool = source.split("const hskWords = {", 1)[1].split("};\n\n// Curriculum", 1)[0]
    components: set[str] = set()
    for group in re.findall(r"radicals:\s*\[([^\]]+)\]", pool):
        components.update(re.findall(r"'([^']+)'", group))
    targets = set("".join(re.findall(r"word:\s*'([^']+)'", pool)))
    if not components or not targets or any(len(char) != 1 for char in components):
        raise ValueError("Could not read the current character pool from app.js")
    return sorted(components), sorted(targets)


def make_sprite(char: str) -> Image.Image:
    font_size = 380
    font = ImageFont.truetype(str(FONT), font_size)
    left, top, right, bottom = font.getbbox(char)
    fit = min(400 / max(1, right - left), 400 / max(1, bottom - top))
    font = ImageFont.truetype(str(FONT), round(font_size * fit))
    left, top, right, bottom = font.getbbox(char)
    x = round((SIZE - (right - left)) / 2 - left)
    y = round((SIZE - (bottom - top)) / 2 - top)

    mask = Image.new("L", (SIZE, SIZE), 0)
    ImageDraw.Draw(mask).text((x, y), char, font=font, fill=255)
    if mask.getbbox() is None:
        raise ValueError(f"Font has no visible glyph: {char}")

    result = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    glow = mask.filter(ImageFilter.MaxFilter(25)).filter(ImageFilter.GaussianBlur(16))
    glow_layer = Image.new("RGBA", (SIZE, SIZE), (91, 190, 174, 0))
    glow_layer.putalpha(ImageChops.multiply(glow, Image.new("L", (SIZE, SIZE), 55)))
    result.alpha_composite(glow_layer)
    shadow = ImageChops.offset(mask.filter(ImageFilter.GaussianBlur(11)), 5, 7)
    result.alpha_composite(Image.merge("RGBA", (
        Image.new("L", (SIZE, SIZE), 8),
        Image.new("L", (SIZE, SIZE), 28),
        Image.new("L", (SIZE, SIZE), 31),
        ImageChops.multiply(shadow, Image.new("L", (SIZE, SIZE), 175)),
    )))

    outline = mask.filter(ImageFilter.MaxFilter(13))
    result.alpha_composite(Image.merge("RGBA", (
        Image.new("L", (SIZE, SIZE), 20),
        Image.new("L", (SIZE, SIZE), 59),
        Image.new("L", (SIZE, SIZE), 62),
        outline,
    )))
    rim = mask.filter(ImageFilter.MaxFilter(5))
    result.alpha_composite(Image.merge("RGBA", (
        Image.new("L", (SIZE, SIZE), 151),
        Image.new("L", (SIZE, SIZE), 111),
        Image.new("L", (SIZE, SIZE), 58),
        rim,
    )))
    fill = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(fill)
    for row in range(SIZE):
        t = row / (SIZE - 1)
        draw.line((0, row, SIZE, row), fill=(round(253 - 25 * t), round(247 - 45 * t), round(222 - 88 * t), 255))
    fill.putalpha(mask)
    result.alpha_composite(fill)
    return result.resize((FINAL_SIZE, FINAL_SIZE), Image.Resampling.LANCZOS)


def main() -> None:
    if not FONT.is_file():
        raise FileNotFoundError(f"Install the already-owned font first: {FONT}")
    components, targets = game_characters()
    characters = sorted(set(components + targets))
    OUT.mkdir(parents=True, exist_ok=True)
    previews: dict[str, Image.Image] = {}
    for char in characters:
        image = make_sprite(char)
        image.save(OUT / f"u{ord(char):04x}.webp", format="WEBP", quality=90, method=6)
        previews[char] = image
    columns = 8
    rows = (len(characters) + columns - 1) // columns
    atlas = Image.new("RGBA", (columns * FINAL_SIZE, rows * FINAL_SIZE), (0, 0, 0, 0))
    for index, char in enumerate(characters):
        atlas.alpha_composite(previews[char], ((index % columns) * FINAL_SIZE, (index // columns) * FINAL_SIZE))
    atlas.save(OUT / "atlas.webp", format="WEBP", quality=90, method=6)
    manifest = {
        "font": "LXGW WenKai Medium",
        "fontLicense": "SIL Open Font License 1.1",
        "fontSource": "https://github.com/lxgw/LxgwWenKai",
        "components": components,
        "completedCharacters": targets,
        "files": {char: f"u{ord(char):04x}.webp" for char in characters},
        "atlas": {
            "file": "atlas.webp",
            "columns": columns,
            "rows": rows,
            "cellSize": FINAL_SIZE,
            "index": {char: index for index, char in enumerate(characters)},
        },
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    cell = 148
    sheet = Image.new("RGB", (columns * cell, rows * cell), "#102f37")
    label_font = ImageFont.truetype(str(FONT), 18)
    canvas = ImageDraw.Draw(sheet)
    for index, char in enumerate(characters):
        col, row = index % columns, index // columns
        x, y = col * cell, row * cell
        tile = previews[char].resize((118, 118), Image.Resampling.LANCZOS)
        sheet.paste(tile, (x + 15, y + 4), tile)
        canvas.text((x + cell / 2, y + 124), f"{char}  U+{ord(char):04X}", font=label_font, fill="#d8cba9", anchor="mm")
    REVIEW.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(REVIEW)
    print(f"{len(components)} components, {len(targets)} completed characters, {len(characters)} unique sprites")
    print(f"Sprites: {OUT}")
    print(f"Review sheet: {REVIEW}")


if __name__ == "__main__":
    main()
