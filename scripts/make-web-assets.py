"""Builds the web icon set + link-preview image in apps/wallet/public from brand/.

Run from the repo root after npm install (it uses the Poppins font from node_modules):
    pip install pillow && python3 scripts/make-web-assets.py .
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

repo = Path(sys.argv[1])
brand = repo / "brand"
out = repo / "apps/wallet/public"
(out / "icons").mkdir(parents=True, exist_ok=True)
fonts = repo / "node_modules/@expo-google-fonts/poppins"

ios = Image.open(brand / "app-icons/ios-app-icon-1024.png").convert("RGB")
fg = Image.open(brand / "app-icons/android-adaptive-foreground-1024.png").convert("RGBA")

def save(im, name, size):
    im.resize((size, size), Image.LANCZOS).save(out / "icons" / name, optimize=True)

# Browser tab + PWA "any" icons: the store icon artwork, as shipped in brand/.
for s in (16, 32, 48):
    save(ios, f"favicon-{s}.png", s)
for s in (192, 512):
    save(ios, f"icon-{s}.png", s)
# iOS "Add to Home Screen" (Safari wants 180 px, no transparency).
save(ios, "apple-touch-icon.png", 180)

# Android/PWA maskable: launcher crops to a circle, so use the safe-zone padded foreground
# on the same white the native Android adaptive icon uses (app.config.ts backgroundColor).
mask = Image.new("RGBA", fg.size, (255, 255, 255, 255))
mask.alpha_composite(fg)
save(mask.convert("RGB"), "maskable-512.png", 512)
save(mask.convert("RGB"), "maskable-192.png", 192)

# Link preview (WhatsApp, Facebook, LinkedIn, Slack): 1200x630.
W, H = 1200, 630
og = Image.new("RGB", (W, H), (244, 247, 252))
d = ImageDraw.Draw(og)
# soft brand-blue glow in the corner, like the balance card
glow = Image.new("L", (W, H), 0)
ImageDraw.Draw(glow).ellipse((W - 520, -320, W + 260, 420), fill=120)
glow = glow.filter(ImageFilter.GaussianBlur(90))
og.paste(Image.new("RGB", (W, H), (37, 99, 235)), (0, 0), glow.point(lambda v: v // 3))

logo = Image.open(brand / "logo/airwallet-logo-light.png").convert("RGBA")
logo = logo.crop(logo.getbbox())
lw = 560
logo = logo.resize((lw, round(logo.height * lw / logo.width)), Image.LANCZOS)
lx, ly = 90, 110
og.paste(logo, (lx, ly), logo)

bold = ImageFont.truetype(str(fonts / "600SemiBold/Poppins_600SemiBold.ttf"), 46)
reg = ImageFont.truetype(str(fonts / "400Regular/Poppins_400Regular.ttf"), 28)
ty = ly + logo.height + 48
for i, line in enumerate(["Send, pay and exchange", "in Taka."]):
    d.text((lx + 6, ty + i * 60), line, font=bold, fill=(15, 26, 51))
for i, line in enumerate(["Web, Android and iPhone.", "One wallet, always in sync."]):
    d.text((lx + 8, ty + 140 + i * 42), line, font=reg, fill=(107, 122, 153))

# Card art: transparent rounded corners already. Rotate, then drop a soft shadow.
card = Image.open(brand / "cards/card-purple.png").convert("RGBA")
cw = 380
card = card.resize((cw, round(card.height * cw / card.width)), Image.LANCZOS).rotate(-8, expand=True, resample=Image.BICUBIC)
pad = 80  # room for the blur, so the shadow never gets a hard clipped edge
shadow = Image.new("RGBA", (card.width + 2 * pad, card.height + 2 * pad), (30, 20, 80, 0))
alpha = Image.new("L", shadow.size, 0)
alpha.paste(card.getchannel("A").point(lambda a: a * 2 // 5), (pad, pad))
shadow.putalpha(alpha.filter(ImageFilter.GaussianBlur(22)))
cx, cy = W - card.width - 70, (H - card.height) // 2 + 30
og.paste(shadow, (cx - pad + 8, cy - pad + 24), shadow)
og.paste(card, (cx, cy), card)
og.save(out / "og-image.png", optimize=True)

print("wrote", sorted(p.name for p in (out / "icons").iterdir()), "+ og-image.png")
