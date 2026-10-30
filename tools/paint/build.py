"""Paint every sprite sheet and panorama into assets/paint. Run from tools/paint: python3 build.py [group ...]"""
import json, sys, os, numpy as np, cv2
from PIL import Image
sys.path.insert(0, '.')
import trees as T, mountains as M, animals as A

OUT = '../../assets/paint'
FORCE = set(os.environ.get('FORCE', '').split(','))
os.makedirs(OUT, exist_ok=True)

def save(arr, name, q=90):
    Image.fromarray(arr, 'RGBA' if arr.shape[2] == 4 else 'RGB').save(f'{OUT}/{name}.webp', quality=q, method=5, exact=True, alpha_quality=95)
    print(name, os.path.getsize(f'{OUT}/{name}.webp') // 1024, 'KB', flush=True)

SHEETS = {
    'sheet_trees': (2048, 2048, [
        ('spruce_a', lambda: T.spruce(1)), ('spruce_b', lambda: T.spruce(2)), ('spruce_c', lambda: T.spruce(5)), ('spruce_d', lambda: T.spruce(8, width=.36)),
        ('larch_a', lambda: T.larch(7)), ('larch_b', lambda: T.larch(9)),
        ('broad_a', lambda: T.broadleaf(3, W=680, H=812)), ('broad_b', lambda: T.broadleaf(4, W=680, H=812)), ('broad_c', lambda: T.broadleaf(5, W=680, H=812)),
        ('shrub_a', lambda: T.shrub(1, W=420, H=210, r=52)), ('shrub_b', lambda: T.shrub(2, W=420, H=210, r=52)), ('shrub_c', lambda: T.shrub(3, W=420, H=210, r=52)),
    ]),
    'sheet_animals': (2048, 1024, [
        ('bear_0', lambda: A.bear(0)), ('bear_1', lambda: A.bear(1)), ('bear_2', lambda: A.bear(2)),
        ('dog_sit', lambda: A.dog('sit')), ('dog_w1', lambda: A.dog('walk1', W_=360, H_=300)), ('dog_w2', lambda: A.dog('walk2', W_=360, H_=300)),
        ('heron_a', lambda: A.heron()), ('heron_b', lambda: A.heron(True)), ('deer_a', lambda: A.deer()),
        ('duck_a', lambda: A.duck()), ('salmon_a', lambda: A.salmon()),
    ]),
    'sheet_near': (2048, 2048, [
        ('bough_a', lambda: T.bough(1)), ('bough_b', lambda: T.bough(2)), ('bough_c', lambda: T.bough(3)),
        ('clump_a', lambda: T.leaf_clump(1)), ('clump_b', lambda: T.leaf_clump(2)), ('clump_c', lambda: T.leaf_clump(3)), ('clump_d', lambda: T.leaf_clump(4)), ('clump_e', lambda: T.leaf_clump(5)), ('clump_f', lambda: T.leaf_clump(6)), ('clump_g', lambda: T.leaf_clump(7)), ('clump_h', lambda: T.leaf_clump(8)),
        ('frond_a', lambda: T.frond(1)), ('frond_b', lambda: T.frond(2)),
    ]),
    'sheet_plants': (2048, 1536, [
        ('pine_big', lambda: T.big_pine(4)),
        ('snag_a', lambda: T.snag(1)), ('snag_b', lambda: T.snag(2, W=380, H=700)),
        ('tuft_a', lambda: T.tuft(1)), ('tuft_b', lambda: T.tuft(2, curl=.8)), ('tuft_c', lambda: T.tuft(3, W=240, H=170, n=90)),
        ('reed_a', lambda: T.tuft(4, W=220, H=300, n=60, curl=.16, seedheads=True)),
        ('fern_a', lambda: T.fern(1)), ('fern_b', lambda: T.fern(2)),
    ]),
}

def pack(w, h, items):
    x = y = shelf = 0; rects = {}; pad = 1
    for name, im in sorted(items, key=lambda it: -it[1].shape[0]):
        ih, iw = im.shape[:2]
        if x + iw > w: x = 0; y += shelf + pad; shelf = 0
        if y + ih > h: raise SystemExit(f'{name} does not fit')
        rects[name] = (x, y, iw, ih); x += iw + pad; shelf = max(shelf, ih)
    return rects

def sheets(which):
    atlas = json.load(open(f'{OUT}/atlas.json')) if os.path.exists(f'{OUT}/atlas.json') else {}
    for sheet, (w, h, spec) in SHEETS.items():
        if which and sheet not in which: continue
        items = []
        for name, fn in spec:
            cf = f'/tmp/sv_paint_{name}.npy'
            if os.path.exists(cf) and name not in FORCE: im = np.load(cf)
            else: im = fn(); np.save(cf, im)
            items.append((name, im)); print(' painted', name, im.shape, flush=True)
        rects = pack(w, h, items)
        canvas = np.zeros((h, w, 4), np.uint8)
        for name, im in items:
            x, y, iw, ih = rects[name]; canvas[y:y + ih, x:x + iw] = im
            atlas[name] = dict(sheet=sheet, u0=x / w, v0=1 - (y + ih) / h, u1=(x + iw) / w, v1=1 - y / h, w=iw, h=ih)
        save(canvas, sheet, 92)
    json.dump(atlas, open(f'{OUT}/atlas.json', 'w'), indent=0)

def panos():
    for n in ('far', 'mid'):
        save(M.paint(n), 'mt_' + n, 88)
    save(M.forest(), 'mt_forest', 88)
    save(M.clouds(), 'clouds', 88)

def tile(size=2048, seed=51):
    """Ground detail, tiling. R=grass dabs, G=earth and pebbles, B=rock strokes."""
    rng = np.random.default_rng(seed)
    S = size
    def wrapped(draw, n):
        im = np.full((S, S), 128, np.uint8)
        for _ in range(n):
            x, y = rng.uniform(0, S), rng.uniform(0, S)
            for ox in (0, -S, S):
                if ox and min(x, S - x) > 40: continue
                for oy in (0, -S, S):
                    if oy and min(y, S - y) > 40: continue
                    draw(im, x + ox, y + oy)
        return im
    n1 = (M.pnoise((S, S), 1.6, rng) * .5 + .5)
    def grass(im, x, y):
        v = 70 + 150 * np.clip(n1[int(y) % S, int(x) % S], 0, 1) + rng.uniform(-34, 34)
        cv2.ellipse(im, (int(x), int(y)), (int(rng.uniform(6, 15)), int(rng.uniform(1, 2.4))), rng.uniform(50, 130), 0, 360, int(np.clip(v, 0, 255)), -1, cv2.LINE_AA)
    def earth(im, x, y):
        v = 110 + rng.uniform(-70, 90)
        r = rng.uniform(2, 9)
        cv2.ellipse(im, (int(x), int(y)), (int(r), max(1, int(r * .62))), rng.uniform(0, 180), 0, 360, int(v), -1, cv2.LINE_AA)
    def rock(im, x, y):
        v = 70 + 170 * np.clip(n1[int(y) % S, int(x) % S], 0, 1) + rng.uniform(-40, 40)
        cv2.ellipse(im, (int(x), int(y)), (int(rng.uniform(14, 46)), int(rng.uniform(2, 6))), rng.uniform(-22, 22), 0, 360, int(np.clip(v, 0, 255)), -1, cv2.LINE_AA)
    out = np.dstack([wrapped(grass, 200000), wrapped(earth, 90000), wrapped(rock, 30000)])
    save(out, 'ground_tile', 88)

def surfaces(S=512, seed=61):
    """Tiling building surfaces, painted in colour: shingles, boards, fieldstone."""
    rng = np.random.default_rng(seed)
    from lib import hex2rgb
    def jit(c, a=14):
        d = rng.uniform(-a, a)                       # brightness varies stone to stone; hue barely does
        return tuple(float(np.clip(v + d + rng.uniform(-2.5, 2.5), 0, 255)) for v in c[::-1])

    # shingles: staggered rows, each tile darker at its lower lip
    im = np.zeros((S, S, 3), np.uint8); im[:] = (40, 44, 52)
    rows, cols = 10, 7; rh = S / rows; cw = S / cols
    for r in range(rows):
        for c in range(cols + 1):
            x0 = (c + (r % 2) * .5) * cw + rng.uniform(-3, 3); y0 = r * rh
            base = hex2rgb(rng.choice(['#585c6c', '#50546a', '#5e6072', '#565a6c']))
            w = cw * rng.uniform(.9, 1.0)
            for ox in (0, -S, S):
                cv2.rectangle(im, (int(x0 + ox), int(y0)), (int(x0 + ox + w), int(y0 + rh + 3)), jit(base), -1)
                cv2.rectangle(im, (int(x0 + ox), int(y0 + rh * .76)), (int(x0 + ox + w), int(y0 + rh + 3)), jit(base * .62, 6), -1)
                cv2.line(im, (int(x0 + ox), int(y0)), (int(x0 + ox), int(y0 + rh + 3)), (30, 26, 26), 2, cv2.LINE_AA)
    for _ in range(1400):
        x, y = rng.uniform(0, S), rng.uniform(0, S); v = rng.uniform(-22, 22)
        cv2.line(im, (int(x), int(y)), (int(x + rng.uniform(-3, 3)), int(y + rng.uniform(6, 16))), tuple(float(np.clip(q + v, 0, 255)) for q in im[int(y) % S, int(x) % S]), 1, cv2.LINE_AA)
    save(im[:, :, ::-1], 'surf_shingle', 86)

    # boards: vertical planks with grain and dark gaps
    im = np.zeros((S, S, 3), np.uint8)
    n = 7; bw = S / n
    for i in range(n):
        base = hex2rgb(rng.choice(['#6e4e36', '#74543a', '#684a34', '#7a583c']))
        cv2.rectangle(im, (int(i * bw), 0), (int((i + 1) * bw), S), jit(base), -1)
        for _ in range(170):
            x = i * bw + rng.uniform(2, bw - 2); y = rng.uniform(0, S); l = rng.uniform(26, 110); v = rng.uniform(-30, 26)
            cv2.line(im, (int(x), int(y)), (int(x + rng.uniform(-2, 2)), int(y + l)), tuple(float(np.clip(q + v, 0, 255)) for q in base[::-1]), 1, cv2.LINE_AA)
        cv2.line(im, (int(i * bw), 0), (int(i * bw), S), (22, 28, 34), 3, cv2.LINE_AA)
    save(im[:, :, ::-1], 'surf_boards', 86)

    # bark and log end grain share one tile: long horizontal strokes
    im = np.zeros((S, S, 3), np.uint8); im[:] = (46, 66, 92)
    for _ in range(3800):
        x, y = rng.uniform(0, S), rng.uniform(0, S); l = rng.uniform(22, 90)
        base = hex2rgb(rng.choice(['#6a4a32', '#7c5a3e', '#54392a', '#8a6848', '#44301f']))
        for ox in (0, -S):
            cv2.line(im, (int(x + ox), int(y)), (int(x + ox + l), int(y + rng.uniform(-2, 2))), jit(base, 10), int(rng.uniform(1, 3)), cv2.LINE_AA)
    save(im[:, :, ::-1], 'surf_log', 86)

    # fieldstone: rounded stones over dark mortar
    im = np.zeros((S, S, 3), np.uint8); im[:] = (34, 34, 38)
    y = 0
    while y < S:
        h = rng.uniform(44, 74); x = rng.uniform(-30, 0)
        while x < S:
            w = rng.uniform(60, 120)
            base = hex2rgb(rng.choice(['#8a7f7a', '#7a7270', '#938478', '#857874']))
            for ox in (0, -S, S):
                cv2.ellipse(im, (int(x + w / 2 + ox), int(y + h / 2)), (int(w / 2 - 2), int(h / 2 - 2)), 0, 0, 360, jit(base), -1, cv2.LINE_AA)
                cv2.ellipse(im, (int(x + w / 2 + ox), int(y + h * .36)), (int(w * .36), int(h * .22)), 0, 0, 360, jit(base * 1.14), -1, cv2.LINE_AA)
            x += w
        y += h
    save(im[:, :, ::-1], 'surf_stone', 86)

def groundbits(S=1024, seed=81):
    """Tiling scatter drawn over the ground in the shader. R=pebble light, G=pebble mask, B=fallen-leaf mask."""
    rng = np.random.default_rng(seed)
    r = np.zeros((S, S), np.uint8); g = np.zeros((S, S), np.uint8); bl = np.zeros((S, S), np.uint8)
    for _ in range(5200):
        x, y = rng.uniform(0, S), rng.uniform(0, S); a = rng.uniform(5, 19); bb = a * rng.uniform(.55, .9); ang = rng.uniform(0, 180); v = rng.uniform(70, 190)
        for ox in (0, -S, S):
            for oy in (0, -S, S):
                if (ox and min(x, S - x) > 30) or (oy and min(y, S - y) > 30): continue
                c = (int(x + ox), int(y + oy))
                cv2.ellipse(r, c, (int(a), int(bb)), ang, 0, 360, int(v * .5), -1, cv2.LINE_AA)
                cv2.ellipse(r, (c[0] - int(a * .18), c[1] - int(bb * .24)), (int(a * .62), int(bb * .55)), ang, 0, 360, int(v), -1, cv2.LINE_AA)
                cv2.ellipse(g, c, (int(a), int(bb)), ang, 0, 360, 255, -1, cv2.LINE_AA)
    prof = [(1, 0), (.46, .16), (.7, .52), (.26, .34), (.2, .68), (0, .34), (-.3, .46), (-.1, .16), (-.46, .08)]
    shape = np.array([(p, q) for p, q in prof] + [(p, -q) for p, q in reversed(prof[1:])], float)
    for _ in range(2600):
        x, y = rng.uniform(0, S), rng.uniform(0, S); sz = rng.uniform(9, 20); a = rng.uniform(0, 6.28); ca, sa = np.cos(a), np.sin(a); v = int(rng.uniform(90, 255))
        for ox in (0, -S, S):
            for oy in (0, -S, S):
                if (ox and min(x, S - x) > 30) or (oy and min(y, S - y) > 30): continue
                p = np.stack([x + ox + (shape[:, 0] * ca - shape[:, 1] * sa) * sz, y + oy + (shape[:, 0] * sa + shape[:, 1] * ca) * sz], 1).astype(np.int32)
                cv2.fillPoly(bl, [p], v, cv2.LINE_AA)
    save(np.dstack([r, g, bl]), 'ground_bits', 84)

def fur(S=512, seed=71):
    """Soft coat tile for the animals: long overlapping strokes, near-white so vertex colour tints it."""
    rng = np.random.default_rng(seed)
    im = np.full((S, S), 205, np.uint8)
    for _ in range(26000):
        x, y = rng.uniform(0, S), rng.uniform(0, S); l = rng.uniform(7, 24); a = rng.uniform(-.5, .5) + 1.4
        v = int(np.clip(rng.normal(208, 34), 110, 255))
        for ox in (0, -S, S):
            for oy in (0, -S, S):
                if (ox and min(x, S - x) > 30) or (oy and min(y, S - y) > 30): continue
                cv2.line(im, (int(x + ox), int(y + oy)), (int(x + ox + np.cos(a) * l), int(y + oy + np.sin(a) * l)), v, 2, cv2.LINE_AA)
    save(np.dstack([im] * 3), 'surf_fur', 84)

def ringmaps():
    enc, rel, mask, h = M.ring()
    Image.fromarray(enc).save(f'{OUT}/mt_height.png', optimize=True)
    save(rel, 'mt_ring', 84); save(mask, 'mt_mask', 80); save(M.rock_tile(), 'mt_detail', 84)

if __name__ == '__main__':
    which = sys.argv[1:]
    sh = [w for w in which if w.startswith('sheet_')]
    if not which or sh: sheets(sh)
    if not which or 'panos' in which: panos()
    if not which or 'tile' in which: tile()
    if not which or 'surfaces' in which: surfaces()
    if not which or 'fur' in which: fur()
    if not which or 'bits' in which: groundbits()
    if not which or 'ring' in which: ringmaps()
