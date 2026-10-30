"""Shared dab-painting helpers. Sprites are stored as data, not colour:
R=value (0 shade..255 lit), G=hue jitter, B=snow/up-facing mask, A=coverage.
The game turns that into colour through ramps, so one painting serves every season and hour."""
import math, numpy as np, cv2

SS = 2  # paint at 2x, area-downsample for clean edges

def hex2rgb(h): h = h.lstrip('#'); return np.array([int(h[i:i+2], 16) for i in (0, 2, 4)], float)

def ramp(stops):
    pts = np.array([hex2rgb(s) for s in stops]); n = len(pts)
    x = np.linspace(0, n - 1, 256); i = np.clip(x.astype(int), 0, n - 2); f = (x - i)[:, None]
    return pts[i] * (1 - f) + pts[i + 1] * f

class Canvas:
    def __init__(s, w, h):
        s.w, s.h = w, h
        s.img = np.zeros((h * SS, w * SS, 4), np.uint8)

    def dab(s, x, y, a, b, ang, v, j=128, u=0):
        """Elongated brush dab. x,y,a,b are in output pixels."""
        cv2.ellipse(s.img, (int(x * SS * 16), int(y * SS * 16)),
                    (max(1, int(a * SS * 16)), max(1, int(b * SS * 16))), ang, 0, 360,
                    (int(np.clip(v, 0, 255)), int(np.clip(j, 0, 255)), int(np.clip(u, 0, 255)), 255),
                    -1, cv2.LINE_AA, 4)

    def stroke(s, pts, width, v, j=128, u=0):
        p = (np.array(pts, float) * SS * 16).astype(np.int32)
        for a, b in zip(p[:-1], p[1:]):
            cv2.line(s.img, tuple(int(q) for q in a), tuple(int(q) for q in b),
                     (int(np.clip(v, 0, 255)), int(j), int(u), 255), max(1, int(width * SS)), cv2.LINE_AA, 4)

    def poly(s, pts, v, j=128, u=0):
        p = (np.array(pts, float) * SS * 16).astype(np.int32)
        cv2.fillPoly(s.img, [p], (int(np.clip(v, 0, 255)), int(np.clip(j, 0, 255)), int(np.clip(u, 0, 255)), 255), cv2.LINE_AA, 4)

    def finish(s):
        small = cv2.resize(s.img, (s.w, s.h), interpolation=cv2.INTER_AREA).astype(np.float32)
        a = small[..., 3:4] / 255.0
        rgb = small[..., :3] / np.maximum(a, 1e-3)  # AA over empty = premultiplied
        rgb = np.where(a > 0.02, rgb, 0)
        out = np.dstack([np.clip(rgb, 0, 255), small[..., 3]]).astype(np.uint8)
        return bleed(out)

def bleed(img, it=10):
    """Grow colour into transparent texels so mipmaps do not fringe dark."""
    mask = (img[..., 3] > 8).astype(np.uint8)
    rgb = img[..., :3].copy()
    k = np.ones((3, 3), np.uint8)
    for _ in range(it):
        grown = cv2.dilate(rgb, k)
        m2 = cv2.dilate(mask, k)
        new = (m2 > 0) & (mask == 0)
        rgb[new] = grown[new]
        mask = m2
    out = img.copy(); out[..., :3] = rgb
    return out

def colorize(img, lut, jit=0.14):
    v = img[..., 0].astype(float) + (img[..., 1].astype(float) - 128) * jit
    return lut[np.clip(v, 0, 255).astype(int)]

def over(bg, img, lut, x, y, jit=0.14):
    h, w = img.shape[:2]
    a = (img[..., 3:4] / 255.0)
    a = np.clip((a - 0.35) / 0.3, 0, 1)
    rgb = colorize(img, lut, jit)
    roi = bg[y:y + h, x:x + w]
    roi[:] = roi * (1 - a) + rgb * a
