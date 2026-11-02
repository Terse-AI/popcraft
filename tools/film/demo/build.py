import json,subprocess,sys,os,glob
D=sys.argv[1] if len(sys.argv)>1 else 'out'
st=json.load(open('frames/stamps.json')); fr=sorted(glob.glob('frames/0*.jpg'))
n=min(len(st),len(fr))
# concat list with per-frame durations
with open('frames/list.txt','w') as f:
    for i in range(n):
        f.write("file '%s'\n"%os.path.basename(fr[i]))
        dur=(st[i+1]-st[i]) if i+1<n else (1/30)
        f.write("duration %.4f\n"%max(.001,dur))
    f.write("file '%s'\n"%os.path.basename(fr[n-1]))
aud=D+'.audio.webm'; have_a=os.path.exists(aud) and os.path.getsize(aud)>2000
cmd=['ffmpeg','-nostdin','-v','error','-y','-f','concat','-i','frames/list.txt']
if have_a: cmd+=['-i',aud]
cmd+=['-vf','fps=30,scale=1920:1080:flags=lanczos,unsharp=5:5:.3,format=yuv420p','-c:v','h264_videotoolbox','-b:v','16M']
if have_a: cmd+=['-c:a','aac','-b:a','192k','-shortest']
cmd+=['-movflags','+faststart',D+'.mp4']
subprocess.run(['nice','-n','10']+cmd,check=True)
d=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-show_entries','stream=codec_type,width,height','-of','default=nw=1',D+'.mp4'],capture_output=True,text=True).stdout
print('audio' if have_a else 'NO AUDIO', d.replace('\n',' '))
# audio RMS check
if have_a:
    import wave,struct
    subprocess.run(['ffmpeg','-nostdin','-v','error','-y','-i',aud,'-ac','1','-ar','8000','frames/a.wav'],check=True)
    w=wave.open('frames/a.wav'); x=w.readframes(w.getnframes())
    import array; a=array.array('h'); a.frombytes(x)
    rms=(sum(v*v for v in a)/max(1,len(a)))**.5
    print('audio samples',len(a),'rms',round(rms,1))
