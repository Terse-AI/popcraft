# Centred bilingual captions on the reference's timing and motion. The words are our own, one line per view.
from PIL import Image,ImageDraw,ImageFont,ImageFilter
import os
W,H,FPS=3840,2160,30
EN=ImageFont.truetype('/System/Library/Fonts/Avenir Next.ttc',112,index=5)
ZH=ImageFont.truetype('/System/Library/Fonts/PingFang.ttc',86,index=0)
L=[(0,1.97,'Spring on a mirror lake','春天,湖面像一面镜子',1),
   (1.97,3.83,'Glide toward the village','滑向湖对岸的村庄',1),
   (3.83,7.2,'Summer lifts us high above the whole green valley','夏天把我们托起,俯瞰整片绿色山谷',1),
   (7.2,9.6,'Snow falls on a quiet town','雪落在安静的小镇',0),
   (9.6,11.27,'Autumn rows past the lighthouse','秋天划过灯塔',0),
   (11.27,15.1,'Run toward the sun until the light breaks through the trees','迎着太阳奔跑,直到光穿过树林',1),
   (15.33,17.3,'A campfire in the meadow','草地上的一堆篝火',0),
   (17.3,19.2,'The northern lights begin to dance','北方的天空开始起舞',0),
   (19.2,22.53,'Through the frozen night to where the windows glow','穿过冰封的夜,走向亮着灯的窗',0),
   (22.53,24.63,'Then the summer storm rolls in','然后夏天的暴风雨来了',0),
   (24.63,26.4,'Mist swallows the mountains','雾吞没了群山',0),
   (26.4,28.33,'The sun goes down in gold','太阳在金色里落下',0),
   (28.33,30.47,'Every season, StarVale','每个季节,都是星星人露谷',2)]
def sprite(en,zh):
    w=int(max(EN.getlength(en),ZH.getlength(zh)))+240; h=420
    t=Image.new('RGBA',(w,h),(0,0,0,0)); d=ImageDraw.Draw(t)
    d.text((w/2,150),en,font=EN,anchor='mm',fill=(255,255,255,255)); d.text((w/2,292),zh,font=ZH,anchor='mm',fill=(255,255,255,240))
    a=t.split()[3]; sh=Image.new('RGBA',(w,h),(0,0,0,0)); sh.putalpha(a.filter(ImageFilter.GaussianBlur(14)).point(lambda v:int(v*.72)))
    out=Image.new('RGBA',(w,h),(0,0,0,0)); out.alpha_composite(sh,(0,6)); out.alpha_composite(t); return out
# lyrics.txt, if filled in, replaces our lines: one line per slot, English and Chinese split by ' | ', in the order of the timings above
if os.path.exists('lyrics.txt'):
    rows=[r.rstrip('\n') for r in open('lyrics.txt',encoding='utf8') if not r.startswith('#')]
    for i,r in enumerate(rows[:len(L)]):
        if '|' in r and r.split('|')[0].strip():
            en,zh=[x.strip() for x in r.split('|',1)]; a,b,_,_,m=L[i]; L[i]=(a,b,en,zh,m)
S=[sprite(e,z) for _,_,e,z,_ in L]
os.makedirs('caps',exist_ok=True)
N=int(30.47*FPS)+1
ease=lambda u:1-(1-u)**3
blank=Image.new('RGBA',(W,H),(0,0,0,0))
for f in range(N):
    t=f/FPS; im=None
    for (a,b,e,z,mode),sp in zip(L,S):
        if not (a<=t<b): continue
        u=(t-a)/(b-a); k_in=ease(min(1,(t-a)/.28)); alpha=min(1,(t-a)/.12)
        sc=1.08-.08*k_in
        if mode==1: sc*=1+.09*u
        if mode==2: sc*=1-.18*max(0,(t-(b-.7))/.7)
        out=b-t
        if out<.16 and mode==1: alpha*=out/.16
        if mode==2: alpha*=min(1,out/.6)
        sw,shh=int(sp.width*sc),int(sp.height*sc); s2=sp.resize((sw,shh),Image.LANCZOS)
        if alpha<1: s2.putalpha(s2.split()[3].point(lambda v:int(v*alpha)))
        im=blank.copy(); im.alpha_composite(s2,(W//2-sw//2,int(H*.515)-shh//2))
    (im or blank).save('caps/%04d.png'%f,compress_level=1)
print('frames',N)
