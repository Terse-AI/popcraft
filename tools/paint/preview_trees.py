import sys, numpy as np, cv2
sys.path.insert(0, '.')
from lib import ramp, over
from trees import *
SP = ramp(['#0a1216','#10232a','#17343a','#234a3f','#3c6444','#6d8144','#a89a4e','#dcc06a'])
GO = ramp(['#1e1410','#4f2c14','#8a5a1e','#c28a2a','#e4b23e','#f6d670','#fff0b0'])
OR = ramp(['#2c0f0f','#5a1a14','#9c2c18','#d24e1a','#ec7c24','#f4a93a','#fbd66a'])
RD = ramp(['#250a10','#4c1016','#821c1c','#b4301e','#d8542a','#ec8a3e'])
YE = ramp(['#3a2410','#6e4414','#b07a1c','#dca52c','#f2cc4c','#fbe88a'])
bg = np.zeros((1080, 2400, 3), float)
for y in range(1080): bg[y] = np.array([176, 190, 208]) * (1 - y / 1500) + np.array([96, 104, 116]) * (y / 1500)
out = sys.argv[1]
x = 0
for s in range(2):
    im = spruce(s + 1); over(bg, im, SP, x, 40); x += 290
im = larch(7); over(bg, im, GO, x, 40); x += 280
im = broadleaf(3); over(bg, im, OR, x, 210); x += 620
im = broadleaf(4); over(bg, im, YE, x, 210); x += 620
im = broadleaf(5, W=620, H=760); over(bg, im, RD, 1750, 300)
im = shrub(1); over(bg, im, RD, 1500, 800)
im = tuft(1); over(bg, im, GO, 1100, 830)
cv2.imwrite(out, bg[:, :, ::-1].astype(np.uint8))
