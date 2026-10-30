"""Painted mountain panoramas. A periodic heightfield is rendered from the side, so ridges carry
real relief: cast shadows, snowfields broken along the ridgelines, a forest skirt at the foot.
Output channels: R=light on the slope, G=snow, B=forest, A=coverage."""
import numpy as np, cv2
from scipy.ndimage import gaussian_filter

def pnoise(shape, beta, rng):
    """Periodic power-law noise via FFT."""
    h, w = shape
    fy = np.fft.fftfreq(h)[:, None]; fx = np.fft.rfftfreq(w)[None, :]
    f = np.sqrt(fx ** 2 + fy ** 2); f[0, 0] = 1
    sp = (rng.normal(size=f.shape) + 1j * rng.normal(size=f.shape)) / f ** beta
    sp[0, 0] = 0
    n = np.fft.irfft2(sp, s=shape)
    return (n - n.mean()) / n.std()

def band(shape, f, rng):
    """Periodic noise limited to one octave around f cycles per pixel."""
    h, w = shape
    fy = np.fft.fftfreq(h)[:, None]; fx = np.fft.rfftfreq(w)[None, :]
    r = np.sqrt(fx ** 2 + fy ** 2)
    m = np.exp(-(np.log2(np.maximum(r, 1e-6) / f)) ** 2 * 2.2)
    sp = (rng.normal(size=r.shape) + 1j * rng.normal(size=r.shape)) * m
    sp[0, 0] = 0
    n = np.fft.irfft2(sp, s=shape)
    return n / n.std() * .5

def eroded(shape, f0, rng, oct=7, k=1.5):
    """Ridged fbm where each octave is damped on slopes already steep: sharp crests, smooth valleys."""
    h = np.zeros(shape); dx = np.zeros(shape); dz = np.zeros(shape); a = 1.0; tot = 0
    for o in range(oct):
        f = f0 * 2 ** o
        r = 1 - 2 * np.abs(band(shape, f, rng))
        gx = np.gradient(r, axis=1) / f * .25; gz = np.gradient(r, axis=0) / f * .25
        dx += gx * a; dz += gz * a
        h += a * r / (1 + k * (dx ** 2 + dz ** 2))
        tot += a; a *= .5
    return h / tot

def heightfield(W, D, rng, peaks):
    """Hand-placed massifs (composition) carved by eroded noise (form)."""
    zz = np.linspace(0, 1, D)[:, None]; xx = np.linspace(0, 1, W, endpoint=False)[None, :]
    wx = pnoise((D, W), 2.4, rng); wz = pnoise((D, W), 2.4, rng)
    env = np.zeros((D, W))
    for px, pz, ph, pw, pd in peaks:
        dx = (((xx - px + .5) % 1) - .5) / pw + wx * .1
        dz = (zz - pz) / pd + wz * .12
        d = np.sqrt(dx ** 2 + dz ** 2)
        env = np.maximum(env, ph * np.clip(1 - d, 0, 1) ** .9)
    e = eroded((D, W), 1 / 420, rng, oct=6)
    e = (e - e.min()) / (e.max() - e.min())
    h = env * (.34 + 1.05 * e) - .12 * (1 - env) * (1 - e)
    h = np.clip(h, 0, None)
    return gaussian_filter(h, 1.6, mode=('nearest', 'wrap'))

def render(H0, W, Hpx, vscale, tilt, rng, snowline, forest_top=.1):
    """Side-on projection: each pixel sees the nearest terrain row whose projected height clears it."""
    D = H0.shape[0]
    Hs = gaussian_filter(H0, 1.6, mode=('nearest', 'wrap'))
    wz = 2.0                                 # one row is worth this many columns of ground
    gx = np.gradient(Hs, axis=1) * vscale * 1.1
    gz = np.gradient(Hs, axis=0) * vscale * 1.1 / wz
    nrm = 1 / np.sqrt(gx ** 2 + gz ** 2 + 1)
    L = np.array([-.66, .30, .69]); L = L / np.linalg.norm(L)
    lam = (-gx * L[0] - gz * L[1] + L[2]) * nrm
    # cast shadow marched along the sun's x direction
    run = H0.copy()
    drop = vscale ** -1 * 1.05
    for x in range(W * 2):
        i = x % W
        run[:, i] = np.maximum(run[:, i], run[:, i - 1] - drop)
    sh = gaussian_filter((run - H0 < .006).astype(float), 1.2, mode='wrap')
    light = np.clip(lam * .95 + .02, 0, 1) * (.36 + .64 * sh)
    fine = pnoise((D, W), 1.5, rng) * .035
    streak = pnoise((D, W), 1.9, rng)
    gully = np.clip(-(gaussian_filter(H0, 7, mode=('nearest', 'wrap')) - H0) * 30, -1, 1)      # + on crests
    level = H0 + streak * .1 - gully * .07
    snowf = np.clip((level - snowline) / .035, 0, 1)
    snowf *= np.clip(1.5 - np.sqrt(gx ** 2 + gz ** 2) * .26, .35, 1)
    forest = np.clip((forest_top - H0 + streak * .025) / .03, 0, 1) * (H0 > 0)
    proj = gaussian_filter(H0, 2.2, mode=('nearest', 'wrap')) * vscale + np.linspace(0, tilt, D)[:, None]
    best = np.maximum.accumulate(proj, axis=0)
    out = np.zeros((Hpx, W, 4), np.float32)
    rows = np.arange(Hpx)[::-1].astype(float)
    for x in range(W):
        idx = np.searchsorted(best[:, x], rows)
        hit = idx < D
        i = np.clip(idx, 0, D - 1)
        out[hit, x, 0] = np.clip(light[i[hit], x] + fine[i[hit], x], 0, 1) * 255
        out[hit, x, 1] = snowf[i[hit], x] * 255
        out[hit, x, 2] = forest[i[hit], x] * 255
        out[hit, x, 3] = 255
        base = idx == 0                      # below the nearest row: plain ground, hidden by the next layer
        out[base, x, 0] = 70; out[base, x, 1] = 0; out[base, x, 2] = 255
    return out

def brushify(img, rng, amount=1.1):
    """Warp with fine noise, then a median: edges break into short painted strokes."""
    h, w = img.shape[:2]
    dx = cv2.GaussianBlur(rng.normal(size=(h, w)).astype(np.float32), (0, 0), 1.2) * amount * 2.4
    dy = cv2.GaussianBlur(rng.normal(size=(h, w)).astype(np.float32), (0, 0), 1.2) * amount * 1.3
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    out = cv2.remap(img, xx + dx, yy + dy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    rgb = out[..., :3].astype(np.uint8)
    rgb = cv2.medianBlur(rgb, 3)
    q = rgb[..., 0].astype(np.float32) / 255
    q = (np.floor(q * 9 + .5 + cv2.GaussianBlur(rng.normal(size=(h, w)).astype(np.float32), (0, 0), .8) * .55)) / 9   # tones, not gradients
    rgb[..., 0] = np.clip(q, 0, 1) * 255
    return np.dstack([rgb, out[..., 3].astype(np.uint8)])

LAYERS = {
    'far': dict(W=4096, D=1024, Hpx=640, v=620, tilt=70, snow=.40, seed=11, forest=.0,
                peaks=[(.04, .6, .86, .1, .72), (.14, .5, .6, .085, .6), (.25, .6, .78, .1, .72), (.36, .5, .52, .085, .6),
                       (.47, .62, .98, .115, .76), (.58, .5, .6, .09, .6), (.69, .6, .84, .1, .72), (.8, .5, .62, .085, .6), (.91, .6, .74, .1, .7)]),
    'mid': dict(W=4096, D=800, Hpx=430, v=420, tilt=36, snow=.60, seed=23, forest=.16,
                peaks=[(.09, .5, .62, .1, .62), (.2, .5, .44, .08, .55), (.31, .5, .7, .1, .62), (.43, .5, .4, .08, .55),
                       (.55, .5, .64, .1, .62), (.67, .5, .46, .08, .55), (.78, .5, .72, .1, .62), (.93, .5, .5, .09, .6)]),
}

def paint(name):
    p = LAYERS[name]; rng = np.random.default_rng(p['seed'])
    h = heightfield(p['W'], p['D'], rng, p['peaks'])
    p['v'] = min(p['v'], (p['Hpx'] - p['tilt'] - 24) / h.max())      # keep every summit on the sheet
    img = render(h, p['W'], p['Hpx'], p['v'], p['tilt'], rng, p['snow'] * h.max(), p['forest'] * h.max())
    return brushify(img, rng)

def forest(W=4096, H=300, seed=31):
    """Near hills: rows of little spruces on rolling ground. R=light, G=deciduous patch, B=255."""
    from lib import Canvas
    import math
    rng = np.random.default_rng(seed)
    c = Canvas(W, H)
    light = (pnoise((H, W), 2.2, rng) * .5 + .5).astype(np.float32)
    decid = (pnoise((H, W), 2.5, rng)).astype(np.float32)
    hill = lambda x, ph, a: sum(a / (k + 1) * math.sin(math.tau * (k + 1) * x / W * (k * 2 + 2) + ph * (k + 1.7)) for k in range(3))
    for row, (y0, amp, sp, tall, gain) in enumerate([(120, 62, 9, 44, .78), (150, 40, 10, 52, .9), (190, 28, 12, 62, 1.0), (232, 18, 14, 72, 1.08)]):
        ph = rng.uniform(0, 6)
        pts = [(x, y0 + hill(x, ph, amp)) for x in np.arange(0, W, 4)]
        c.img[:, :, :] = c.img
        # solid ground under this row
        import cv2 as _c
        poly = np.array([[int(x * 2), int(y * 2)] for x, y in pts] + [[W * 2, H * 2], [0, H * 2]], np.int32)
        _c.fillPoly(c.img, [poly], (int(26 * gain), 128, 255, 255))
        for x in np.arange(-20, W + 20, sp):
            x = x + rng.uniform(-3, 3)
            y = y0 + hill(x % W, ph, amp) + rng.uniform(-6, 10)
            h = tall * rng.uniform(.6, 1.15)
            lx = int(min(W - 1, max(0, x))); ly = int(min(H - 1, max(0, y)))
            lit = float(light[ly, lx])
            g = 255 * float(decid[ly, lx] > .35) if rng.random() < .8 else 0
            for k in range(9):
                t = k / 8
                w = (h * .27) * (1 - t) ** .85 + .8
                yy = y - h * t
                v = (30 + 46 * lit + 58 * lit * t) * gain
                c.dab(x + .6, yy + 1.5, w, 2.2, 0, v * .55, g, 255)
                c.dab(x - w * .32, yy, w * .68, 1.7, -8, v + rng.uniform(-8, 12), g, 255)
    return c.finish()

def clouds(W=4096, H=1024, seed=41):
    """Sky sheet. R=light on cumulus, G=cumulus density, B=stratus density. Coverage is cut in the shader."""
    rng = np.random.default_rng(seed)
    n = band((H, W), 1 / 520, rng) * 1.5 + band((H, W), 1 / 240, rng) * 1.0 + band((H, W), 1 / 110, rng) * .5
    n = cv2.resize(n[:, ::2][::2], (W, H), interpolation=cv2.INTER_CUBIC)     # widen forms: clouds run long and low
    n2 = pnoise((H, W), 1.45, rng)
    yy = np.linspace(0, 1, H)[:, None]                      # 0 = zenith, 1 = horizon
    prof = np.exp(-((yy - .66) / .34) ** 2)
    d = n * .9 + n2 * .06 + prof * .55 - .72
    m = (d > 0).astype(np.float32)
    n3 = gaussian_filter(n2, 2.5, mode=('nearest', 'wrap'))
    h = gaussian_filter(np.clip(d, 0, 1.4), 12, mode=('nearest', 'wrap')) + gaussian_filter(np.clip(d, 0, 1.4), 4, mode=('nearest', 'wrap')) * .3 + n3 * .02
    gx = np.gradient(h, axis=1) * 44; gy = np.gradient(h, axis=0) * 44
    lam = (gx * .62 + gy * .78 + .55) / np.sqrt(gx ** 2 + gy ** 2 + 1)
    edge = np.clip(d * 3, 0, 1)
    light = np.clip(.5 + .7 * (lam - .45) + .24 * edge * (1 - np.clip(gy * -1, -1, 1)) * .4, 0, 1)
    light = np.floor(light * 5 + .5 + n3 * .12) / 5
    st = cv2.resize(pnoise((H, W // 8), 1.7, rng), (W, H), interpolation=cv2.INTER_CUBIC)
    st2 = cv2.resize(pnoise((H // 2, W // 6), 1.3, rng), (W, H), interpolation=cv2.INTER_CUBIC)
    sd = st * .8 + st2 * .3 + np.exp(-((yy - .78) / .2) ** 2) * 1.0 - .55
    return np.dstack([np.clip(light, 0, 1) * 255, np.clip((d + .9) / 1.8, 0, 1) * 255, np.clip((sd + .5) / 1.5, 0, 1) * 255]).astype(np.uint8)

if __name__ == '__main__':
    import sys
    from lib import ramp
    ROCK = ramp(['#232a42', '#2f3a58', '#46506e', '#6b7288', '#9a9aa6', '#c4beba'])
    SNOW = ramp(['#6e80ae', '#9fb2d6', '#dbe4f2', '#ffffff'])
    FOR = np.array([42, 56, 58.])
    for n in sys.argv[2:]:
        im = paint(n)
        a = im[..., 3:4] / 255.0; v = im[..., 0].astype(int)
        col = ROCK[v]; s = im[..., 1:2] / 255.0
        col = col * (1 - s) + SNOW[v] * s
        f = im[..., 2:3] / 255.0; col = col * (1 - f) + (FOR * (.5 + v[..., None] / 255.0 * .9)) * f
        bg = np.array([214, 200, 200.])
        out = col * a + bg * (1 - a)
        cv2.imwrite(f'{sys.argv[1]}/mt_{n}.png', out[:, :2048, ::-1].astype(np.uint8))
