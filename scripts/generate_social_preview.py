"""Regenerate the 1200×630 social preview image (requires Pillow)."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
FONT_PAIRS = [
    (Path("C:/Windows/Fonts/segoeui.ttf"), Path("C:/Windows/Fonts/segoeuib.ttf")),
    (Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"), Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")),
    (Path("/System/Library/Fonts/Supplemental/Arial.ttf"), Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf")),
]


def font(size, bold=False):
    for regular, heavy in FONT_PAIRS:
        path = heavy if bold else regular
        if path.exists():
            return ImageFont.truetype(str(path), size)
    raise FileNotFoundError("Install Segoe UI, DejaVu Sans, or Arial to generate the social image")


image = Image.new("RGB", (1200, 630), "#142820")
pixels = image.load()
for y in range(630):
    for x in range(1200):
        glow = max(0, 1 - ((x - 980) ** 2 / 850 ** 2 + (y - 60) ** 2 / 630 ** 2))
        pixels[x, y] = (
            int(20 + 27 * glow),
            int(40 + 44 * glow),
            int(32 + 36 * glow),
        )

draw = ImageDraw.Draw(image)
draw.rounded_rectangle((55, 50, 1145, 580), radius=28, fill="#1c382d", outline="#426b56", width=2)
draw.rounded_rectangle((98, 96, 171, 169), radius=17, fill="#335f4b")
draw.line([(111, 133), (125, 133), (135, 115), (147, 151), (157, 133), (169, 133)], fill="#d7f5df", width=5, joint="curve")
draw.text((190, 96), "pulse.", font=font(54, True), fill="#f3f8f3")
draw.text((103, 216), "Free API load testing", font=font(67, True), fill="#f3f8f3")
draw.text((103, 303), "from your browser.", font=font(67, True), fill="#a7d6b7")
draw.text((105, 405), "Response time  •  Throughput  •  HTTP errors  •  Rate limits", font=font(27), fill="#c3d8ca")
draw.rounded_rectangle((101, 491, 434, 540), radius=24, fill="#d1ebd7")
draw.text((124, 499), "FREE  •  NO ACCOUNT", font=font(23, True), fill="#214634")
draw.text((924, 505), "apulse.tech", font=font(25, True), fill="#d5e9d9")

image.save(ROOT / "social-preview.png", optimize=True)
