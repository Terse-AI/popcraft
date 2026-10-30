"""Painted conifers and broadleaves, built bough by bough from thousands of brush dabs."""
import math, numpy as np
import cv2
from lib import Canvas
from mountains import pnoise

def _pad(c, rng, x0, y0, side, L, droop, T, base, dv, snow=1.0, side_light=0.0):
    """One drooping bough: strokes leave the spine and hang out and down, lit on top, dark below."""
    n = max(5, int(L / 1.7))
    for i in range(n):
        s = i / (n - 1)
        sx = x0 + side * L * s
        sy = y0 + droop * L * s ** 1.5 - 0.12 * L * math.sin(s * math.pi)
        tt = T * ((1 - s ** 1.8) * 0.95 + 0.14)
        for _ in range(3):
            ang = math.radians(90 - side * rng.uniform(8, 72))
            ln = tt * rng.uniform(0.55, 1.2)
            ox, oy = rng.uniform(-1.2, 1.2), rng.uniform(-1.5, 1.5)
            dx, dy = math.cos(ang), math.sin(ang)
            a = math.degrees(ang)
            jj = rng.uniform(70, 186)
            for fr, sh in ((0.82, -1.0), (0.48, -0.25), (0.14, 0.75)):   # far (shadow) tip first, top last
                px, py = sx + ox + dx * ln * fr, sy + oy + dy * ln * fr
                v = base + dv * sh * rng.uniform(0.75, 1.15) + side_light + s * 12
                c.dab(px, py, ln * 0.30 + 0.9, rng.uniform(0.75, 1.25), a, v, jj, (255 if sh > 0 else 40) * snow)

def spruce(seed, W=340, H=1024, width=0.44, droop=0.62, fill=1.0, base=96, dv=62):
    rng = np.random.default_rng(seed)
    c = Canvas(W, H)
    cx = W * 0.5 + rng.uniform(-6, 6)
    top, bot = 16, H - 24
    R = W * width
    lean = rng.uniform(-0.02, 0.02)
    tx = lambda y: cx + (y - bot) * lean
    # trunk
    c.stroke([(tx(bot), bot + 22), (tx((top + bot) / 2), (top + bot) / 2), (tx(top + 60), top + 60)], 7, 36, 128, 0)
    c.stroke([(tx(bot) - 2, bot + 22), (tx(bot * .55) - 1, bot * .55)], 2.2, 62, 128, 0)
    # whorls bottom-up: upper boughs lie over lower ones
    ys, y = [], bot - 40
    while y > top + 8:
        t = (y - top) / (bot - top)
        ys.append((y, t))
        y -= (10 + 34 * t ** 0.9) * rng.uniform(0.72, 1.28)
    # dark inner mass, so gaps between boughs read as depth, not as holes everywhere
    for y, t in ys:
        L = R * (0.03 + 0.97 * t ** 0.92) * 0.62
        for side in (-1, 1):
            if rng.random() < 0.16 * (1 - t) + 0.05: continue
            _pad(c, rng, tx(y), y - 4, side, L * rng.uniform(.8, 1.1), droop * .8, (12 + 44 * t), 26, 14, 0.25)
    for y, t in ys:
        Lmax = R * (0.04 + 0.96 * t ** 0.9) * (1 + 0.16 * math.sin(y * .021 + seed))
        T = (9 + 54 * t ** 0.85) * fill
        for side in (-1, 1):
            if rng.random() < (0.28 * (1 - t) ** 2 + 0.05) / fill: continue
            L = Lmax * rng.uniform(0.62, 1.1)
            lit = rng.choice([0.72, 0.88, 1.0, 1.16, 1.38], p=[.2, .28, .26, .16, .1])
            lit *= 1 + 0.2 * math.sin(y * 0.009 + seed * 2.1 + side)     # large patches of light
            up = base * (0.72 + 0.34 * (1 - t)) * lit
            sl = -side * 20
            _pad(c, rng, tx(y), y + rng.uniform(-5, 5), side, L, droop * rng.uniform(.75, 1.25), T, up, dv * .78, 1.0, sl)
            if lit > 1.05:
                for _ in range(int(L * 0.55)):
                    s = rng.random()
                    px = tx(y) + side * L * s + rng.uniform(-2, 2)
                    py = y + droop * L * s ** 1.5 - 0.12 * L * math.sin(s * math.pi) + rng.uniform(-3, T * 0.32)
                    c.dab(px, py, rng.uniform(1.6, 3.4), rng.uniform(.9, 1.5), rng.uniform(40, 140), up + dv * rng.uniform(.9, 1.7), rng.uniform(60, 200), 255)
            if t > .32 and rng.random() < .75:   # short bough on the near side fills the centre
                _pad(c, rng, tx(y) + side * rng.uniform(0, 8), y + 10, side, L * rng.uniform(.3, .62), droop, T * .72, up * .9, dv * .9, 1.0, sl * .5)
    # leader
    c.stroke([(tx(top + 26), top + 26), (tx(top), top)], 2.4, 90, 128, 0)
    for k in range(9):
        y = top + 4 + k * 4.6
        for side in (-1, 1):
            _pad(c, rng, tx(y), y, side, 3 + k * 1.15, .7, 7, 128, 34)
    return c.finish()

def larch(seed, W=340, H=1024):
    return spruce(seed, W, H, width=0.34, droop=0.5, fill=1.0, base=118, dv=58)

def _clump(c, rng, cx, cy, r, lx, ly, gain, jbias):
    """Leaf mass: dabs scattered in a disc, lit from the upper left, deep pockets toward lower right."""
    n = int(r * r * 0.55)
    pts = []
    for _ in range(n):
        ang = rng.uniform(0, math.tau); rr = r * math.sqrt(rng.random()) * rng.uniform(.82, 1.14)
        dx, dy = math.cos(ang) * rr, math.sin(ang) * rr * .86
        nz = max(0, 1 - (rr / r) ** 2) ** .5
        lam = (dx / r * lx + dy / r * ly) * .8 + nz * .28
        pts.append((lam, dx, dy))
    pts.sort(key=lambda p: p[0])             # shaded dabs first, lit dabs on top
    for lam, dx, dy in pts:
        v = 46 + 215 * max(0, lam + .22) * gain + rng.uniform(-14, 14)
        s = rng.uniform(2.2, 4.8)
        c.dab(cx + dx, cy + dy, s, s * rng.uniform(.5, .9), rng.uniform(0, 180), v, jbias + rng.uniform(-60, 60), 255 if dy < 0 else 60)

def _branch(c, rng, x, y, ang, ln, w, depth):
    ex, ey = x + math.cos(ang) * ln, y + math.sin(ang) * ln
    mx, my = (x + ex) / 2 + rng.uniform(-ln, ln) * .1, (y + ey) / 2 + rng.uniform(-ln, ln) * .1
    c.stroke([(x, y), (mx, my), (ex, ey)], max(.8, w), 30, 128, 0)
    if depth == 0: return
    for k in range(2 + (rng.random() < .35)):
        _branch(c, rng, ex, ey, ang + rng.uniform(-.7, .7), ln * rng.uniform(.62, .84), w * .66, depth - 1)

def broadleaf(seed, W=720, H=860, rx=.38, ry=.37, n_scale=1.0, lobes=64):
    """Maple / aspen crown. The silhouette is a noise-warped blob; inflating it gives lobes at every
    scale, lit from upper left, and small dabs carry the light so it reads as brushwork."""
    rng = np.random.default_rng(seed)
    c = Canvas(W, H)
    bx, by = W * .5 + rng.uniform(-14, 14), H - 10
    cx, cy, rx, ry = W * .5, H * .44, W * rx, H * ry
    c.stroke([(bx, by), (bx + rng.uniform(-6, 6), by - H * .26)], 13, 26, 128, 0)
    for k in range(4):
        _branch(c, rng, bx, by - H * .24, -math.pi / 2 + (k - 1.5) * .42 + rng.uniform(-.1, .1), H * .17, 7, 3)
    n1, n2 = pnoise((H, W), 2.2, rng).astype(np.float32), pnoise((H, W), 1.5, rng).astype(np.float32)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    u, w = (xx - cx) / rx, (yy - cy) / ry
    # leaf masses: spheres packed in a wobbling outline, so the crown has lobes at two scales
    ph = rng.uniform(0, 6, 3); pts = []; tries = 0
    while len(pts) < lobes and tries < 4000:
        tries += 1
        a, rr = rng.uniform(0, math.tau), math.sqrt(rng.random()) * 1.02
        lim = 1 + .12 * math.sin(3 * a + ph[0]) + .08 * math.sin(5 * a + ph[1])
        x, y = cx + math.cos(a) * rr * rx * lim, cy + math.sin(a) * rr * ry * lim
        r = rng.uniform(.085, .17) * W * (1.1 - .4 * rr)
        if x - r < 14 or x + r > W - 14 or y - r < 14 or y + r > H - 40: continue
        if any((x - p[0]) ** 2 + (y - p[1]) ** 2 < (.5 * (r + p[2])) ** 2 for p in pts): continue
        pts.append((x, y, r))
    h = np.full((H, W), -1e3, np.float32)
    for x, y, r in pts:
        h = np.maximum(h, np.sqrt(np.maximum(r * r - (xx - x) ** 2 - (yy - y) ** 2, 0)) + (r * .5) * (y < cy) - 1e3 * ((xx - x) ** 2 + (yy - y) ** 2 > r * r))
    mask = ((h > -500) & (n1 * 40 + np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) * 0 > -60)).astype(np.float32)
    h = np.where(h > -500, h, 0).astype(np.float32)
    hs = (cv2.GaussianBlur(h, (0, 0), 2.2) + n2 * 7 + n1 * 11).astype(np.float32)
    gx = cv2.Sobel(hs, cv2.CV_32F, 1, 0, ksize=3) / 8; gy = cv2.Sobel(hs, cv2.CV_32F, 0, 1, ksize=3) / 8
    nz = 1 / np.sqrt(gx ** 2 + gy ** 2 + 1)
    lam = (gx * .52 + gy * .74 + .42) * nz                   # sun upper left
    ao = np.clip((cv2.GaussianBlur(h, (0, 0), 20) - h) / 40, 0, 1)
    val = np.clip(.3 + .5 * lam - .22 * w - .1 * u - .38 * ao + .1 * n2, 0, 1)
    val = cv2.GaussianBlur(val.astype(np.float32), (0, 0), 1.5)
    val = np.floor(val * 7 + .5 + n2 * .22) / 7
    ys, xs = np.nonzero(mask)
    idx = rng.choice(len(ys), int(len(ys) * .1 * n_scale), replace=False)
    order = idx[np.argsort(val[ys[idx], xs[idx]])]
    for i in order:
        x, y = float(xs[i]), float(ys[i]); v = float(val[ys[i], xs[i]])
        d = rng.uniform(2.4, 5.0)
        c.dab(x + rng.uniform(-3, 3), y + rng.uniform(-3, 3), d, d * rng.uniform(.5, .85), rng.uniform(0, 180),
              30 + 222 * v + rng.uniform(-9, 9), rng.uniform(70, 186), 255 if lam[ys[i], xs[i]] > .5 else 60)
    return c.finish()

def shrub(seed, W=420, H=260, r=60):
    rng = np.random.default_rng(seed)
    c = Canvas(W, H)
    n = 5 + int(rng.integers(4))
    for k in range(n):
        x = W * (.18 + .64 * (k + .5) / n) + rng.uniform(-14, 14)
        y = H - r * rng.uniform(.6, 1.1)
        c.stroke([(W * .5 + rng.uniform(-30, 30), H - 2), (x, y)], 3, 30, 128, 0)
        _clump(c, rng, x, y, r * rng.uniform(.75, 1.05), -.5, -.86, .4, 128)
    for k in range(n):
        x = W * (.18 + .64 * (k + .5) / n) + rng.uniform(-18, 18)
        y = H - r * rng.uniform(.8, 1.25)
        _clump(c, rng, x, y, r * rng.uniform(.6, .9), -.5, -.86, rng.uniform(.8, 1.2), 128)
    return c.finish()

def tuft(seed, W=300, H=240, n=120, curl=.5, seedheads=False):
    """Grass / sedge tuft: long curved blades from a tight base, darkest at the root."""
    rng = np.random.default_rng(seed)
    c = Canvas(W, H)
    order = sorted(rng.uniform(0, 1, n))
    for o in order:
        bx = W * .5 + rng.normal(0, W * .1)
        ln = H * rng.uniform(.45, .98)
        bend = rng.normal(0, 1) * curl
        v0 = 34 + 130 * o
        pts = []
        for i in range(9):
            s = i / 8
            pts.append((bx + (bend * s * s * ln * .6) + (bx - W * .5) * s * .7, H - 2 - ln * s * (1 - .12 * s * abs(bend))))
        j = rng.uniform(70, 186)
        for i, (a, b) in enumerate(zip(pts[:-1], pts[1:])):
            s = i / 7
            c.stroke([a, b], 2.6 * (1 - s) + .9, v0 * (.55 + .75 * s) + rng.uniform(-8, 8), j, 40)
        if seedheads and rng.random() < .28:
            c.dab(pts[-1][0], pts[-1][1], 2.2, 6.5, 90 + bend * 20, 60, 200, 0)
    return c.finish()

def snag(seed, W=460, H=760):
    """Bare dead tree."""
    rng = np.random.default_rng(seed)
    c = Canvas(W, H)
    bx = W * .5
    c.stroke([(bx, H - 6), (bx + rng.uniform(-10, 10), H * .6)], 12, 40, 128, 200)
    for k in range(5):
        _branch(c, rng, bx, H * .62, -math.pi / 2 + (k - 2) * .5 + rng.uniform(-.12, .12), H * .2, 7, 4)
    return c.finish()

def fern(seed, W=340, H=220):
    rng = np.random.default_rng(seed)
    c = Canvas(W, H)
    fronds = sorted(rng.uniform(-1.25, 1.25, 11), key=lambda a: -abs(a))
    for a0 in fronds:
        ln = H * rng.uniform(.75, 1.05); bend = a0 * .9
        x, y = W * .5, H - 3
        a = -math.pi / 2 + a0 * .75
        n = 18
        v0 = rng.uniform(70, 150)
        for i in range(n):
            s = i / n
            a += bend * .05
            nx, ny = x + math.cos(a) * ln / n, y + math.sin(a) * ln / n
            c.stroke([(x, y), (nx, ny)], 1.6, v0 * .6, 128, 40)
            w = (1 - s) ** .8 * ln * .2 + 1
            for sd in (-1, 1):
                pa = a + sd * 1.15
                c.dab(nx + math.cos(pa) * w * .5, ny + math.sin(pa) * w * .5, w * .52, 1.5, math.degrees(pa), v0 + 70 * (1 - abs(sd * .3)) * (1 - s * .4) + rng.uniform(-10, 10), rng.uniform(80, 176), 90)
            x, y = nx, ny
    return c.finish()

def big_pine(seed, W=900, H=1024):
    """Wide old pine used to frame a view: leaning trunk, flat dark pads of needles."""
    rng = np.random.default_rng(seed)
    c = Canvas(W, H)
    x, y = W * .5, H - 6.0
    path = [(x, y)]
    a = -math.pi / 2 - .1
    for i in range(14):
        a += rng.uniform(-.1, .1); x += math.cos(a) * H * .066; y += math.sin(a) * H * .066
        path.append((x, y))
    for i, (p, q) in enumerate(zip(path[:-1], path[1:])):
        c.stroke([p, q], 40 * (1 - i / 16) + 6, 30, 128, 0)
        c.stroke([(p[0] - 9, p[1]), (q[0] - 8, q[1])], 8 * (1 - i / 16) + 1, 74, 128, 0)
    pads = []
    for i in range(5, 14):
        px, py = path[i]
        for side in (-1, 1):
            if rng.random() < .15: continue
            ln = H * rng.uniform(.18, .34) * (1.12 - i / 18)
            ang = -math.pi / 2 + side * rng.uniform(.75, 1.25)
            ex, ey = px + math.cos(ang) * ln, py + math.sin(ang) * ln * .7
            ex = min(W - 70, max(70, ex))
            c.stroke([(px, py), ((px + ex) / 2, (py + ey) / 2 + 10), (ex, ey)], 9 * (1.2 - i / 16) + 2, 34, 128, 0)
            pads.append((ex, ey, side))
    pads.sort(key=lambda p: -p[1])
    for ex, ey, side in pads:
        for k in range(rng.integers(3, 6)):
            ox = rng.uniform(-90, 90); oy = rng.uniform(-22, 26)
            L = rng.uniform(55, 120)
            lit = rng.choice([.7, 1.0, 1.4])
            for s2 in (-1, 1):
                _pad(c, rng, ex + ox, ey + oy, s2, L, .26, 34, 92 * lit, 58, 1.0, -s2 * 10)
    return c.finish()
