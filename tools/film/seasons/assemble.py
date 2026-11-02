# Nine takes on the reference's cuts, the music from the reference, captions over them, a white-out into the title
import subprocess,os
D='/Users/James/Desktop/StarVale_Film/四季MV'; T=D+'/takes/'
S=[('M1',0,3.833),('M2',3.833,7.2),('M3',7.2,9.6),('M4',9.6,11.267),('M5',11.267,15.333),('M6',15.333,19.2),('M7',19.2,22.533),('M8',22.533,26.4),('M9',26.4,30.467)]
inp=[];f=[]
for i,(n,a,b) in enumerate(S):
    inp+=['-i',T+n+'.mp4']; d=b-a; ex=',fade=t=out:st=%.3f:d=1.05:color=0xfff2dc'%(d-1.05) if n=='M9' else ''
    f.append('[%d:v]trim=0:%.4f,setpts=PTS-STARTPTS,fps=30,scale=3840:2160:flags=lanczos,unsharp=5:5:0.45,format=yuv420p%s[v%d]'%(i,d,ex,i))
n=len(S)
inp+=['-loop','1','-framerate','30','-t','3.04','-i',D+'/work/title.png','-framerate','30','-i',D+'/work/caps/%04d.png','-i',D+'/work/reference.mp4']
f.append('[%d:v]format=yuv420p,fade=t=in:st=0:d=0.5:color=0xfff2dc[tt]'%n)
f.append(''.join('[v%d]'%i for i in range(n))+'concat=n=%d:v=1:a=0[film]'%n)
f.append('[film][%d:v]overlay=0:0:eof_action=pass:format=auto[cap]'%(n+1))
f.append('[cap][tt]concat=n=2:v=1:a=0,format=yuv420p[out]')
open('fc.txt','w').write(';\n'.join(f))
out=D+'/StarVale_四季MV_4K_master.mp4'
subprocess.run(['nice','-n','10','ffmpeg','-nostdin','-v','error','-y']+inp+['-filter_complex_script','fc.txt','-map','[out]','-map','%d:a'%(n+2),'-c:v','h264_videotoolbox','-b:v','85M','-profile:v','high','-c:a','aac','-b:a','320k','-t','33.5','-movflags','+faststart',out],check=True)
subprocess.run(['nice','-n','10','ffmpeg','-nostdin','-v','error','-y','-i',out,'-vf','scale=1920:1080:flags=lanczos','-c:v','h264_videotoolbox','-b:v','22M','-c:a','aac','-b:a','256k','-movflags','+faststart',D+'/StarVale_四季MV_1080p.mp4'],check=True)
subprocess.run(['nice','-n','10','ffmpeg','-nostdin','-v','error','-y','-i',out,'-vf','scale=1280:720:flags=lanczos','-c:v','h264_videotoolbox','-b:v','5M','-c:a','aac','-b:a','128k','-movflags','+faststart',D+'/StarVale_四季MV_手机预览.mp4'],check=True)
print('ok')
