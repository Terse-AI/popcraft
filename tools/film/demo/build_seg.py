import json,subprocess,sys,os,glob
LANG=sys.argv[1] if len(sys.argv)>1 else 'en'
ROOT='seg_'+LANG
WORK=os.getcwd()
segs=sorted(d for d in glob.glob(ROOT+'/*') if os.path.isdir(d))
clips=[]
for d in segs:
    stp=os.path.join(d,'stamps.json')
    if not os.path.exists(stp): continue
    st=json.load(open(stp)); fr=sorted(glob.glob(os.path.join(d,'0*.jpg'))); n=min(len(st),len(fr))
    if n<2: continue
    lst=os.path.join(d,'list.txt')
    with open(lst,'w') as f:
        for i in range(n):
            f.write("file '%s'\n"%os.path.abspath(fr[i]))
            dur=(st[i+1]-st[i]) if i+1<n else 1/30
            f.write("duration %.4f\n"%max(.001,dur))
        f.write("file '%s'\n"%os.path.abspath(fr[n-1]))
    aud=os.path.join(d,'audio.webm'); ha=os.path.exists(aud) and os.path.getsize(aud)>2000
    clip=os.path.abspath(os.path.join(d,'clip.mp4'))
    cmd=['ffmpeg','-nostdin','-v','error','-y','-safe','0','-f','concat','-i',os.path.abspath(lst)]
    if ha: cmd+=['-i',os.path.abspath(aud)]
    else: cmd+=['-f','lavfi','-i','anullsrc=r=48000:cl=stereo']
    cmd+=['-vf','fps=30,unsharp=5:5:.2,format=yuv420p','-r','30','-c:v','h264_videotoolbox','-b:v','22M','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-shortest','-movflags','+faststart',clip]
    subprocess.run(['nice','-n','10']+cmd,check=True)
    clips.append(clip)
    dd=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',clip],capture_output=True,text=True).stdout.strip()
    print('clip',os.path.basename(d),dd)
cl=os.path.abspath(os.path.join(ROOT,'clips.txt'))
open(cl,'w').write('\n'.join("file '%s'"%c for c in clips)+'\n')
name='中文' if LANG=='zh' else 'EN'
out='/Users/James/Desktop/StarVale_Film/讲解Demo/StarVale_讲解Demo_%s_1080p.mp4'%name
r=subprocess.run(['ffmpeg','-nostdin','-v','error','-y','-safe','0','-f','concat','-i',cl,'-c','copy','-movflags','+faststart',out],capture_output=True,text=True)
if r.returncode!=0:
    subprocess.run(['ffmpeg','-nostdin','-v','error','-y','-safe','0','-f','concat','-i',cl,'-c:v','h264_videotoolbox','-b:v','14M','-c:a','aac','-b:a','192k','-movflags','+faststart',out],check=True)
prev='/Users/James/Desktop/StarVale_Film/讲解Demo/StarVale_讲解Demo_%s_预览.mp4'%name
subprocess.run(['nice','-n','10','ffmpeg','-nostdin','-v','error','-y','-i',out,'-vf','scale=1280:720:flags=lanczos','-c:v','h264_videotoolbox','-b:v','3200k','-c:a','aac','-b:a','128k','-movflags','+faststart',prev],check=True)
dd=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-show_entries','stream=nb_frames','-of','default=nw=1',out],capture_output=True,text=True).stdout.replace('\n',' ')
print('FINAL',out,dd)
