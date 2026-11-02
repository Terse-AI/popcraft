# Cuts the takes together on the reference's timeline: hard cuts on the hit points, a dissolve at 14.3, the flash to white at 18, black before the drop at 39.4, and the title
import subprocess,sys,os
D='/Users/James/Desktop/StarVale_Film/大片_4K'; T=D+'/takes/'
S=[('A',1.6,4.43),('B',4.43,6.23),('C',6.23,9.2),('D',9.2,12.27),('E1',12.27,14.8),('E2',14.3,18.0),('E3',18.0,20.7),('F',20.7,22.5),('G',22.5,24.27),('H',24.27,25.47),('I',25.47,26.07),('J',26.07,27.27),('K',27.27,29.63),('L',29.63,31.43),('M',31.43,33.87),('N',33.87,35.07),('O',35.07,36.27),('P',36.27,38.7),('Q',39.4,41.83),('R',41.83,44.6),('S',44.6,48.8),('T',48.8,50.6),('U1',50.6,53.37),('U2',53.37,54.87),('U3',54.87,57.27),('V',57.27,59.6)]
for s in S:
    assert os.path.exists(T+s[0]+'.mp4'),s[0]
inp=[]; f=[]; lab=[]
for i,(n,a,b) in enumerate(S):
    inp+=['-i',T+n+'.mp4']; d=b-a; ex=''
    if n=='A': ex=',fade=t=in:st=0:d=0.45'
    if n=='E2': ex=',fade=t=out:st=%.3f:d=0.28:color=white'%(d-.28)
    if n=='E3': ex=',fade=t=in:st=0:d=0.62:color=white'
    if n=='P': ex=',fade=t=out:st=%.3f:d=0.5'%(d-.5)
    if n=='V': ex=',fade=t=out:st=%.3f:d=0.55'%(d-.55)
    f.append('[%d:v]trim=0:%.4f,setpts=PTS-STARTPTS,fps=30,scale=3840:2160:flags=lanczos,unsharp=5:5:.45,format=yuv420p%s[v%d]'%(i,d,ex,i)); lab.append('v%d'%i)
n=len(S)
e1=[i for i,s in enumerate(S) if s[0]=='E1'][0]; e2=e1+1
f.append('[v%d][v%d]xfade=transition=fade:duration=0.5:offset=%.3f[x]'%(e1,e2,14.3-12.27))
inp+=['-f','lavfi','-t','1.6','-i','color=c=black:s=3840x2160:r=30','-f','lavfi','-t','0.7','-i','color=c=black:s=3840x2160:r=30','-loop','1','-framerate','30','-t','4.4','-i',D+'/work/title.png','-i',D+'/work/music_from_reference.wav']
f.append('[%d:v]format=yuv420p[b0]'%n); f.append('[%d:v]format=yuv420p[b1]'%(n+1)); f.append('[%d:v]format=yuv420p,fade=t=in:st=0.15:d=0.8,fade=t=out:st=3.55:d=0.7[tt]'%(n+2))
order=['b0']+lab[:e1]+['x']+lab[e2+1:]
p=order.index('v%d'%[i for i,s in enumerate(S) if s[0]=='P'][0]); order.insert(p+1,'b1'); order.append('tt')
f.append(''.join('[%s]'%o for o in order)+'concat=n=%d:v=1:a=0[out]'%len(order))
open('fc.txt','w').write(';\n'.join(f))
out=D+'/StarVale_大片_4K_master.mp4'
cmd=['ffmpeg','-nostdin','-v','error','-y']+inp+['-filter_complex_script','fc.txt','-map','[out]','-map','%d:a'%(n+3),'-c:v','h264_videotoolbox','-b:v','85M','-profile:v','high','-c:a','aac','-b:a','320k','-t','63.86','-movflags','+faststart',out]
subprocess.run(['nice','-n','10']+cmd,check=True)
o2=D+'/StarVale_大片_1080p.mp4'
subprocess.run(['nice','-n','10','ffmpeg','-nostdin','-v','error','-y','-i',out,'-vf','scale=1920:1080:flags=lanczos','-c:v','h264_videotoolbox','-b:v','22M','-c:a','aac','-b:a','256k','-movflags','+faststart',o2],check=True)
print('ok')
