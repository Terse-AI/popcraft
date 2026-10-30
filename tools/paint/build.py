"""Paint every sprite sheet and panorama into assets/paint. Run from tools/paint: python3 build.py [group ...]"""
import json, sys, os, numpy as np, cv2
from PIL import Image
sys.path.insert(0, '.')
import trees as T, mountains as M

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

def tile(size=1024, seed=51):
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
        cv2.ellipse(im, (int(x), int(y)), (int(rng.uniform(4, 11)), int(rng.uniform(1, 2.6))), rng.uniform(55, 125), 0, 360, int(np.clip(v, 0, 255)), -1, cv2.LINE_AA)
    def earth(im, x, y):
        v = 110 + rng.uniform(-70, 90)
        r = rng.uniform(2, 9)
        cv2.ellipse(im, (int(x), int(y)), (int(r), max(1, int(r * .62))), rng.uniform(0, 180), 0, 360, int(v), -1, cv2.LINE_AA)
    def rock(im, x, y):
        v = 70 + 170 * np.clip(n1[int(y) % S, int(x) % S], 0, 1) + rng.uniform(-40, 40)
        cv2.ellipse(im, (int(x), int(y)), (int(rng.uniform(14, 46)), int(rng.uniform(2, 6))), rng.uniform(-22, 22), 0, 360, int(np.clip(v, 0, 255)), -1, cv2.LINE_AA)
    out = np.dstack([wrapped(grass, 60000), wrapped(earth, 22000), wrapped(rock, 9000)])
    save(out, 'ground_tile', 88)

if __name__ == '__main__':
    which = sys.argv[1:]
    sh = [w for w in which if w.startswith('sheet_')]
    if not which or sh: sheets(sh)
    if not which or 'panos' in which: panos()
    if not which or 'tile' in which: tile()
