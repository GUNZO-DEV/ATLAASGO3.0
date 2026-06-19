"""Generate the AtlaasGo app icon set (Atlas mountains + sun on coral gradient).
Run from mobile/:  python3 scripts/make_icon.py
"""
from PIL import Image, ImageDraw

S = 4                      # supersample for smooth edges
N = 1024 * S
ASSETS = "assets"

CORAL_LIGHT = (255, 140, 82)
CORAL_DEEP = (231, 60, 24)
WHITE = (255, 255, 255, 255)
CORAL = (255, 87, 34, 255)


def gradient() -> Image.Image:
    """Diagonal coral gradient, opaque (required for the iOS icon)."""
    try:
        import numpy as np
        yy, xx = np.mgrid[0:N, 0:N]
        t = (xx + yy) / (2 * (N - 1))
        arr = np.zeros((N, N, 3), dtype=np.uint8)
        for i in range(3):
            arr[:, :, i] = (CORAL_LIGHT[i] + (CORAL_DEEP[i] - CORAL_LIGHT[i]) * t).astype("uint8")
        return Image.fromarray(arr, "RGB")
    except Exception:
        img = Image.new("RGB", (N, N), CORAL)
        d = ImageDraw.Draw(img)
        for y in range(N):
            f = y / (N - 1)
            d.line([(0, y), (N, y)], fill=tuple(int(CORAL_LIGHT[i] + (CORAL_DEEP[i] - CORAL_LIGHT[i]) * f) for i in range(3)))
        return img


def draw_mark(color, scale=1.0):
    """Atlas mountain range + sun — the AtlaasGo brand mark. Drawn on a
    transparent layer so the background shows through."""
    layer = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    dr = ImageDraw.Draw(layer)

    def P(x, y):
        X = (512 + (x - 512) * scale) * S
        Y = (512 + (y - 512) * scale) * S
        return (int(round(X)), int(round(Y)))

    # Mountain range: back peaks first, main peak on top → multi-peak silhouette.
    base = 712
    peaks = [
        ((380, 470), (190, base), (560, base)),
        ((655, 485), (470, base), (840, base)),
        ((512, 330), (300, base), (724, base)),
    ]
    for apex, l, r in peaks:
        dr.polygon([P(*l), P(*apex), P(*r)], fill=color)

    # Sun, upper-right, separated from the peaks.
    sx, sy, sr = 712, 298, 66
    dr.ellipse([P(sx - sr, sy - sr), P(sx + sr, sy + sr)], fill=color)
    return layer


def down(img):
    return img.resize((1024, 1024), Image.LANCZOS)


# 1) Main icon — gradient + white mark, opaque (iOS / App Store).
icon = gradient().convert("RGBA")
icon.alpha_composite(draw_mark(WHITE, scale=1.0))
down(icon.convert("RGB")).save(f"{ASSETS}/icon.png")

# 2) Android adaptive foreground — white mark on transparent (composed over #FF5722),
#    shrunk into the adaptive safe zone.
down(draw_mark(WHITE, scale=0.70)).save(f"{ASSETS}/adaptive-icon.png")

# 3) Splash — coral mark on transparent (splash bg is cream #FBF7F2).
down(draw_mark(CORAL, scale=0.66)).save(f"{ASSETS}/splash-icon.png")

# 4) Web favicon — small version of the full icon.
down(icon.convert("RGB")).resize((64, 64), Image.LANCZOS).save(f"{ASSETS}/favicon.png")

print("Wrote icon.png, adaptive-icon.png, splash-icon.png, favicon.png")
