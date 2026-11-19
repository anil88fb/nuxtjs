import numpy as np, wave
SR=44100; TOTAL=60.0; N=int(SR*TOTAL); rng=np.random.default_rng(7)
L=np.zeros(N); R=np.zeros(N)
T_INTRO,T_SCENE=3.5,7.5
bounds=[T_INTRO+k*T_SCENE for k in range(8)]  # scene starts + outro start
def midi(m): return 440*2**((m-69)/12)
def add(sig,t0,gain=1.0,pan=0.0):
    i=int(t0*SR); n=min(len(sig),N-i)
    if n<=0: return
    L[i:i+n]+=sig[:n]*gain*np.sqrt((1-pan)/2)*1.414; R[i:i+n]+=sig[:n]*gain*np.sqrt((1+pan)/2)*1.414
def lp(x,fc):
    a=np.exp(-2*np.pi*fc/SR); y=np.empty_like(x); s=0.0
    for i in range(len(x)): s=(1-a)*x[i]+a*s; y[i]=s
    return y
def env(n,a,r):
    e=np.ones(n); na=int(a*SR); nr=int(r*SR)
    e[:na]=np.linspace(0,1,na); e[n-nr:]*=np.linspace(1,0,nr); return e
# chords per section (intro, 7 wonders, outro)
chords=[[57,64,69,72],[57,60,64,69],[53,60,65,69],[48,55,64,67],[55,62,67,71],[50,57,62,65],[52,59,64,67],[53,57,64,69],[45,57,64,69,76]]
secs=[0]+bounds+[TOTAL]
for k,ch in enumerate(chords):
    t0=max(0,secs[k]-0.4); t1=secs[k+1]+0.6 if k<8 else TOTAL; n=int((t1-t0)*SR); t=np.arange(n)/SR
    pad=np.zeros(n)
    for m in ch:
        for d in(-0.12,0.0,0.11):
            f=midi(m)*2**(d/12); ph=rng.random()
            pad+=2*((f*t+ph)%1)-1
    pad=lp(pad/ (len(ch)*3),900 if k<8 else 1400)
    pad*=env(n,1.0,1.0)*(0.9+0.1*np.sin(2*np.pi*0.25*t))
    bass=np.sin(2*np.pi*midi(ch[0]-12)*t)*env(n,.5,1)
    g=0.22 if k<8 else 0.3
    add(pad,t0,g,-0.2); add(pad[::-1][::-1],t0+0.013,g,0.2); add(bass,t0,0.12)
# percussion: soft cinematic pulse (taiko-ish) 96 bpm during scenes
beat=60/96
def drum(f0=60,dec=0.35,noise=0.3):
    n=int(0.9*SR);t=np.arange(n)/SR;f=f0*(1+1.5*np.exp(-t*30))
    s=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t/dec)+noise*rng.standard_normal(n)*np.exp(-t/0.03)
    return s
dk=drum(); dh=drum(110,0.12,0.6)
t=bounds[0]; b=0
while t<bounds[7]-0.2:
    add(dk,t,0.33 if b%4==0 else 0.18); 
    if b%2==1: add(dh,t+beat/2,0.07,0.3*((-1)**b))
    t+=beat; b+=1
# shaker hats
hat=lp(rng.standard_normal(int(.06*SR)),8000); hat=(rng.standard_normal(len(hat))-hat)*np.exp(-np.arange(len(hat))/SR/0.015)
t=bounds[0]
while t<bounds[7]-0.2: add(hat,t+beat/4,0.03,0.4); add(hat,t+3*beat/4,0.02,-0.4); t+=beat/2*1
# whoosh into each boundary + impact
def whoosh(d=0.9,up=True):
    n=int(d*SR); x=rng.standard_normal(n); t=np.arange(n)/SR
    fc=300+3500*(t/d)**2 if up else 3800-3500*(t/d)
    # time-varying one-pole lowpass
    y=np.empty(n); s=0.0
    for i in range(n): a=np.exp(-2*np.pi*fc[i]/SR); s=(1-a)*x[i]+a*s; y[i]=s
    y=x*0.05+y; return y*(t/d)**2*(1 if up else 1)
def impact():
    n=int(2.2*SR); t=np.arange(n)/SR; f=90*np.exp(-t*2)+35
    s=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t/0.7)+0.5*lp(rng.standard_normal(n),600)*np.exp(-t/0.25)
    return s
W=whoosh(); I=impact()
for bt in bounds:
    add(W,bt-0.9,0.5,-0.3); add(W[::-1]*0+W,bt-0.88,0.4,0.3); add(I,bt,0.55)
# riser in intro
n=int(3.4*SR); tt=np.arange(n)/SR; riser=np.sin(2*np.pi*np.cumsum(200+800*(tt/3.4)**2)/SR)*(tt/3.4)**3*0.5+lp(rng.standard_normal(n),3000)*(tt/3.4)**3
add(riser,0.1,0.18)
# bell / chime (FM) for title & each fact
def bell(f,d=2.2):
    n=int(d*SR);t=np.arange(n)/SR; mod=np.sin(2*np.pi*f*3.5*t)*2.2*np.exp(-t/0.4)
    return np.sin(2*np.pi*f*t+mod)*np.exp(-t/0.6)*np.minimum(1,t*400)
for k in range(7):
    s=bounds[k]; ch=chords[k+1]
    add(bell(midi(ch[-1]+12)),s+0.25,0.10,0.0)
    for j,dt in enumerate([1.5,2.65,3.8]):
        add(bell(midi(ch[j+1]+12)),s+dt,0.12,(-0.5,0,0.5)[j])
    # sparkle arpeggio
    for j in range(12):
        m=ch[j%4]+24; add(bell(midi(m),1.0),s+4.4+j*beat/2,0.035*(1-j/14),np.sin(j))
# intro hits
add(I,0.3,0.4); add(bell(midi(81)),0.35,0.15); add(bell(midi(76)),0.85,0.12); add(bell(midi(84)),1.45,0.12)
# outro bells + ending
ob=bounds[7]
for j,m in enumerate([69,72,76,81,84]): add(bell(midi(m),3),ob+0.5+j*0.22,0.1,(j-2)/3)
# reverb (FFT convolution with decaying noise IR)
irn=int(2.8*SR); ir_t=np.arange(irn)/SR
def rev(x,seed):
    ir=np.random.default_rng(seed).standard_normal(irn)*np.exp(-ir_t/0.7); ir=lp(ir,5000); ir/=np.sqrt(np.sum(ir**2))
    m=1<<int(np.ceil(np.log2(N+irn))); return np.fft.irfft(np.fft.rfft(x,m)*np.fft.rfft(ir,m),m)[:N]
L2=L+0.35*rev(L,1); R2=R+0.35*rev(R,2)
# master: fade out, soft clip, normalize
fade=np.ones(N); fn=int(1.5*SR); fade[-fn:]=np.linspace(1,0,fn); fade[:int(.05*SR)]=np.linspace(0,1,int(.05*SR))
L2*=fade; R2*=fade
pk=max(np.abs(L2).max(),np.abs(R2).max()); L2=np.tanh(1.3*L2/pk)/np.tanh(1.3)*0.89; R2=np.tanh(1.3*R2/pk)/np.tanh(1.3)*0.89
st=(np.stack([L2,R2],1)*32767).astype('<i2')
w=wave.open('audio.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes()); w.close()
print('ok')
