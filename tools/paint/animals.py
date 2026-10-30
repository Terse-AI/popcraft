"""Wildlife, painted side-on facing right. Parts are drawn from soft shapes, inflated into form, lit from
upper left and finished with fur dabs. Sprites are stored in colour (RGBA), not as ramp data."""
import math, numpy as np, cv2
from lib import ramp, bleed

S = 2
class Body:
    def __init__(s, w, h):
        s.w, s.h = w, h
        s.rgb = np.zeros((h * S, w * S, 3), np.float32); s.a = np.zeros((h * S, w * S), np.float32)
    def mask(s, shapes, soft=5):
        m = np.zeros((s.h * S, s.w * S), np.uint8)
        for sh in shapes:
            if sh[0] == 'e':                     # ellipse: x,y,a,b,angle
                _, x, y, a, b, ang = (*sh, 0)[:6]
                cv2.ellipse(m, (int(x * S), int(y * S)), (int(a * S), int(b * S)), ang, 0, 360, 255, -1, cv2.LINE_AA)
            else:                                # limb: points, widths
                _, pts, wd = sh
                for i in range(len(pts) - 1):
                    n = 14
                    for k in range(n + 1):
                        t = k / n; x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t; y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t
                        w0 = wd[i] + (wd[i + 1] - wd[i]) * t
                        cv2.circle(m, (int(x * S), int(y * S)), max(1, int(w0 * S / 2)), 255, -1, cv2.LINE_AA)
        f = cv2.GaussianBlur(m.astype(np.float32) / 255, (0, 0), soft * S)
        return np.clip((f - .5) / .04 + .5, 0, 1)
    def paint(s, shapes, lut, soft=5, fur=1.0, rng=None, light=1.0, seed=1):
        rng = rng or np.random.default_rng(seed)
        m = s.mask(shapes, soft)
        h = cv2.GaussianBlur(m, (0, 0), 30 * S) * 1.0 + cv2.GaussianBlur(m, (0, 0), 12 * S) * .34
        gx = cv2.Sobel(h, cv2.CV_32F, 1, 0, ksize=5); gy = cv2.Sobel(h, cv2.CV_32F, 0, 1, ksize=5)
        k = 1 / (np.percentile(np.abs(gx[m > .5]), 96) + 1e-4)
        lam = (gx * .55 + gy * .84) * k * .5 + .5
        v = np.clip((.16 + .78 * lam) * light, 0, 1)
        v = np.floor(v * 6 + .5) / 6
        col = lut[np.clip(v * 255, 0, 255).astype(int)].astype(np.float32)
        if fur:                                  # short strokes along the coat, sampled from the shaded colour
            ys, xs = np.nonzero(m > .5)
            n = int(len(ys) * .02 * fur)
            idx = rng.choice(len(ys), n, replace=False)
            for i in idx:
                x, y = int(xs[i]), int(ys[i])
                c = col[y, x] * rng.uniform(.74, 1.26)
                l = int(rng.uniform(6, 15) * S); a = rng.uniform(.3, 1.3)
                cv2.line(col, (x, y), (int(x - math.cos(a) * l), int(y + math.sin(a) * l)), tuple(float(q) for q in np.clip(c, 0, 255)), S, cv2.LINE_AA)
        s.rgb = s.rgb * (1 - m[..., None]) + col * m[..., None]
        s.a = np.maximum(s.a, m)
        return m
    def stroke(s, pts, w, color):
        c = tuple(float(v) for v in color)
        p = np.array(pts, float) * S
        cv2.polylines(s.rgb, [p.astype(np.int32)], False, c, int(w * S), cv2.LINE_AA)
        cv2.polylines(s.a, [p.astype(np.int32)], False, 1.0, int(w * S), cv2.LINE_AA)
    def dot(s, x, y, r, color):
        cv2.circle(s.rgb, (int(x * S), int(y * S)), max(1, int(r * S)), tuple(float(v) for v in color), -1, cv2.LINE_AA)
        cv2.circle(s.a, (int(x * S), int(y * S)), max(1, int(r * S)), 1.0, -1, cv2.LINE_AA)
    def finish(s):
        a = cv2.resize(s.a, (s.w, s.h), interpolation=cv2.INTER_AREA)
        rgb = cv2.resize(s.rgb, (s.w, s.h), interpolation=cv2.INTER_AREA)
        out = np.dstack([np.clip(rgb, 0, 255), a[..., None] * 255]).astype(np.uint8)
        return bleed(out, 6)

BEAR = ramp(['#160e0a', '#2e1c12', '#4e3020', '#6e4a30', '#8e6846', '#b08c62'])
GOLD = ramp(['#4a2a12', '#8a5620', '#bc8434', '#dcaa54', '#f0cc84', '#fbe8b8'])
GOLD2 = ramp(['#3a2010', '#6e4018', '#9a6426', '#c08a3c', '#dcb060'])
GREY = ramp(['#262c3a', '#465264', '#6c7c90', '#94a4b4', '#c4d0d8', '#eef2f4'])
TAN = ramp(['#2e1c12', '#5a3a22', '#86603a', '#a88454', '#c8a878', '#e4cca4'])
MALL = ramp(['#2a2420', '#4e443a', '#766a5c', '#9c9080', '#c4b8a8'])
GREEN = ramp(['#0c2018', '#124030', '#1c6048', '#2c8460'])
SAL = ramp(['#50181c', '#8c2c28', '#c04a38', '#dc7a58', '#f0b090'])
Y = (232, 186, 56); DK = (18, 22, 30); W = (240, 240, 236); BEAK = (226, 160, 44)

def bear(walk=0, W_=460, H_=300):
    b = Body(W_, H_); r = np.random.default_rng(3)
    lx = [0, 22, -22][walk]
    b.paint([('l', [(132 + lx, 190), (122 + lx, 282)], [64, 44]), ('l', [(286 - lx, 190), (296 - lx, 282)], [58, 42])], BEAR, 5, 1, r, .6)
    body = [('e', 205, 150, 128, 80), ('e', 150, 108, 74, 56), ('e', 112, 170, 62, 60), ('e', 292, 142, 74, 62),
            ('l', [(150 - lx, 176), (136 - lx, 284)], [78, 50]), ('l', [(264 + lx, 186), (262 + lx, 284)], [70, 46])]
    b.paint(body, BEAR, 9, 1.2, r)
    b.paint([('e', 356, 136, 52, 44), ('e', 402, 150, 30, 20), ('e', 332, 94, 16, 18), ('e', 372, 92, 15, 17)], BEAR, 5, 1, r, 1.08)
    b.dot(372, 126, 4, DK); b.dot(428, 146, 6.5, DK)
    return b.finish()

def dog(pose='sit', W_=340, H_=320):
    b = Body(W_, H_); r = np.random.default_rng(5)
    if pose == 'sit':
        b.paint([('l', [(70, 250), (34, 262), (18, 226)], [30, 22, 8])], GOLD2, 3, 1.2, r)                 # tail
        b.paint([('l', [(120, 270), (96, 296)], [40, 34]), ('e', 118, 250, 56, 50)], GOLD, 5, 1, r, .8)
        b.paint([('l', [(184, 214), (192, 296)], [30, 26])], GOLD, 3, .8, r, .78)
        b.paint([('e', 134, 200, 66, 84, 22), ('e', 178, 160, 52, 66)], GOLD, 9, 1.3, r)
        b.paint([('l', [(208, 200), (220, 296)], [32, 26]), ('e', 224, 300, 22, 11)], GOLD, 3, .8, r)
        b.paint([('e', 216, 96, 56, 50), ('e', 262, 112, 34, 22)], GOLD, 4, 1, r, 1.04)
        b.paint([('e', 184, 112, 26, 46, -12)], GOLD2, 4, 1, r, .9)                                           # ear
        b.dot(232, 88, 4.4, DK); b.dot(292, 106, 7, DK); b.stroke([(290, 120), (262, 128)], 2.4, (120, 90, 70))
    else:
        k = 0 if pose == 'walk1' else 1
        la, lb = (-22, 20) if k else (20, -22)
        b.paint([('l', [(52, 136), (22, 112), (10, 84)], [28, 20, 8])], GOLD2, 3, 1.2, r)
        b.paint([('l', [(96, 170), (92 + la, 268)], [34, 22]), ('l', [(226, 176), (232 + lb, 268)], [30, 20])], GOLD, 3, .8, r, .74)
        b.paint([('e', 150, 146, 104, 54), ('e', 234, 132, 54, 58)], GOLD, 8, 1.3, r)
        b.paint([('l', [(114, 176), (118 - la, 268)], [34, 22]), ('l', [(244, 180), (250 - lb, 268)], [30, 20])], GOLD, 3, .8, r)
        b.paint([('e', 278, 86, 46, 42), ('e', 316, 100, 26, 18)], GOLD, 4, 1, r, 1.04)
        b.paint([('e', 254, 98, 22, 38, -12)], GOLD2, 4, 1, r, .9)
        b.dot(292, 78, 3.8, DK); b.dot(336, 96, 6, DK)
    return b.finish()

def heron(down=False, W_=300, H_=440):
    b = Body(W_, H_); r = np.random.default_rng(7)
    b.stroke([(120, 280), (116, 348), (124, 430)], 5, (80, 66, 56)); b.stroke([(150, 280), (156, 352), (148, 430)], 5, (92, 80, 66))
    b.stroke([(124, 430), (146, 434)], 4, (80, 66, 56)); b.stroke([(148, 430), (172, 434)], 4, (92, 80, 66))
    b.paint([('e', 124, 226, 84, 46, 22), ('l', [(66, 248), (28, 300)], [36, 8])], GREY, 7, 1.1, r, .86)
    if down:
        pts = [(186, 224), (214, 190), (226, 214), (248, 260)]; hx, hy = 256, 272
        b.paint([('l', pts, [24, 15, 13, 12])], GREY, 3, .8, r, 1.12)
        b.paint([('e', hx, hy, 20, 13, 58)], GREY, 3, .4, r, 1.2)
        b.stroke([(hx + 8, hy + 12), (hx + 28, hy + 62)], 7, BEAK); b.dot(hx + 2, hy - 2, 2.8, DK)
        b.stroke([(hx - 10, hy - 8), (hx - 44, hy - 30)], 4, (40, 34, 34))
    else:
        pts = [(182, 218), (204, 170), (172, 122), (186, 74)]; hx, hy = 196, 58
        b.paint([('l', pts, [24, 15, 13, 12])], GREY, 3, .8, r, 1.12)
        b.paint([('e', hx, hy, 22, 13, 8)], GREY, 3, .4, r, 1.2)
        b.stroke([(hx + 16, hy + 2), (hx + 78, hy + 12)], 7, BEAK); b.dot(hx + 8, hy - 2, 2.8, DK)
        b.stroke([(hx - 6, hy - 11), (hx - 58, hy + 4)], 4, (40, 34, 34))
    return b.finish()

def deer(W_=420, H_=440):
    b = Body(W_, H_); r = np.random.default_rng(9)
    b.paint([('l', [(116, 236), (104, 330), (112, 424)], [28, 14, 9]), ('l', [(272, 240), (280, 330), (272, 424)], [24, 13, 9])], TAN, 2, .7, r, .72)
    b.paint([('e', 192, 200, 104, 56), ('e', 110, 186, 54, 52), ('e', 112, 148, 14, 10, -30)], TAN, 8, 1.1, r)
    b.paint([('l', [(138, 236), (136, 330), (130, 424)], [30, 14, 9]), ('l', [(250, 240), (256, 330), (250, 424)], [26, 13, 9])], TAN, 2, .7, r)
    b.paint([('l', [(278, 188), (318, 98)], [52, 32]), ('e', 336, 84, 36, 22, 12), ('e', 300, 66, 20, 9, -28)], TAN, 4, .9, r, 1.05)
    b.dot(340, 76, 3.6, DK); b.dot(368, 92, 4.4, DK)
    c = (140, 106, 70)
    b.stroke([(322, 62), (312, 26), (280, 8)], 5, c); b.stroke([(314, 38), (336, 12)], 4, c); b.stroke([(298, 18), (306, 2)], 4, c)
    b.stroke([(332, 62), (336, 32), (362, 12)], 4.4, c); b.stroke([(337, 40), (358, 40)], 3.4, c)
    return b.finish()

def duck(W_=240, H_=130):
    b = Body(W_, H_); r = np.random.default_rng(11)
    b.paint([('e', 104, 86, 86, 34), ('l', [(40, 76), (10, 58)], [30, 8])], MALL, 5, .7, r)
    b.paint([('e', 112, 80, 52, 20, -4)], ramp(['#3a3430', '#6e6054', '#a89888', '#d8ccbc']), 3, .5, r, 1.1)
    b.paint([('l', [(168, 74), (178, 42)], [24, 18]), ('e', 186, 34, 26, 21)], GREEN, 3, .2, r, 1.15)
    b.stroke([(170, 66), (190, 62)], 5, W)
    b.stroke([(208, 34), (232, 38)], 9, BEAK); b.dot(192, 28, 3, DK)
    return b.finish()

def salmon(W_=260, H_=130):
    b = Body(W_, H_); r = np.random.default_rng(13)
    b.paint([('e', 120, 64, 92, 32), ('l', [(40, 62), (8, 40)], [26, 8]), ('l', [(40, 66), (8, 92)], [26, 8]), ('e', 120, 34, 24, 10, -10)], SAL, 3, .8, r)
    b.dot(190, 56, 3.6, DK)
    return b.finish()


def portrait(col, style, idx, S_=256):
    """A villager's bust, painted the same way as the animals: soft shapes, value steps, brush strokes."""
    r = np.random.default_rng(100 + idx)
    b = Body(S_, S_)
    hexs = '#%06x' % col
    from lib import hex2rgb
    c = hex2rgb(hexs)
    def tone(k): return '#%02x%02x%02x' % tuple(int(np.clip(v * k, 0, 255)) for v in c)
    CL = ramp([tone(.38), tone(.62), tone(.85), tone(1.05), tone(1.3)])
    skin = [['#6e4632', '#a8724e', '#d8a278', '#efc49a', '#fbe0c0'], ['#5a3626', '#8e5c3e', '#bc8660', '#d8a67e', '#ecc29c'], ['#3e2418', '#6a4028', '#8e5c3e', '#ac7a56', '#c89a74'], ['#7a5038', '#b88460', '#e4b48c', '#f4d2ac', '#ffe8cc']][idx % 4]
    SK = ramp(skin)
    hairs = [['#1a100a', '#3a2416', '#5a3a24', '#7a5436'], ['#101014', '#22222a', '#3a3a46', '#54545e'], ['#3e1e0c', '#7a4418', '#a86a30', '#d09450'], ['#3a3a40', '#6c6c74', '#9c9ca4', '#cacad0'], ['#5a3a10', '#a87a24', '#d8ae48', '#f0d27c'], ['#2a0e0a', '#5a2418', '#84402a', '#a86248']][(idx + style) % 6]
    HR = ramp(hairs)
    b.paint([('e', 128, 262, 104, 74)], CL, 8, 1.3, r)
    b.paint([('e', 128, 176, 30, 34)], SK, 5, 0, r, .84)
    if style % 4 == 2: b.paint([('e', 128, 126, 78, 84), ('e', 66, 150, 26, 54), ('e', 190, 150, 26, 54)], HR, 7, 1.5, r)
    b.paint([('e', 128, 118, 62, 72)], SK, 7, 0, r, 1.02)
    if style % 4 == 0: b.paint([('e', 128, 74, 66, 40), ('e', 72, 104, 18, 34), ('e', 184, 104, 18, 34)], HR, 7, 1.6, r)
    if style % 4 == 1:
        b.paint([('e', 128, 70, 96, 15)], HR, 4, .9, r); b.paint([('e', 128, 50, 52, 30)], HR, 6, 1, r)
    if style % 4 == 2: b.paint([('e', 128, 68, 62, 28)], HR, 6, 1.5, r)
    if style % 4 == 3:
        b.paint([('e', 128, 62, 66, 34)], CL, 6, 1, r); b.paint([('e', 128, 86, 78, 7)], CL, 3, .6, r, .7)
        b.paint([('e', 128, 160, 44, 28)], HR, 7, 1.7, r)
    for s in (-1, 1):
        x = 128 + s * 25
        b.dot(x, 116, 8, (250, 246, 238)); b.dot(x, 117, 5.4, (42, 30, 26)); b.dot(x - 1.6, 114.5, 1.8, (255, 255, 255))
        b.stroke([(x - 12, 100 - abs(s)), (x + 12, 99)], 3.4, tuple(hex2rgb(hairs[1])))
        b.dot(128 + s * 36, 134, 9, tuple(np.array(hex2rgb(skin[3])) * np.array([1.04, .84, .78])))
    b.stroke([(124, 124), (120, 140), (130, 142)], 2.4, tuple(hex2rgb(skin[1])))
    if style % 4 != 3: b.stroke([(112, 152), (128, 160), (144, 152)], 3.2, (120, 60, 50))
    out = b.finish()
    return out
