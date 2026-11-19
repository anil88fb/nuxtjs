"""Synthesize music + SFX for a daily short. Usage: python3 audio.py timeline.json out.wav
The timeline carries T_INTRO, T_SCENE, T_OUTRO, TOTAL, n and a seed (string); the seed picks key, progression, tempo and sound palette
so every day sounds different. Nothing is sampled: every sound is generated here."""
import sys, json, wave, hashlib
import numpy as np
TL = json.load(open(sys.argv[1])); OUT = sys.argv[2]
SR = 44100; TOTAL = TL['TOTAL']; N = int(SR * TOTAL)
h = int(hashlib.md5(str(TL.get('seed', 'x')).encode()).hexdigest()[:8], 16); rng = np.random.default_rng(h)
L = np.zeros(N); R = np.zeros(N)
TI, TS, TO, n = TL['T_INTRO'], TL['T_SCENE'], TL['T_OUTRO'], TL['n']
bounds = [TI + k * TS for k in range(n + 1)]
def midi(m): return 440 * 2 ** ((m - 69) / 12)
def add(sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR); n_ = min(len(sig), N - i)
    if n_ <= 0 or i < 0: return
    L[i:i+n_] += sig[:n_] * gain * np.sqrt((1 - pan) / 2) * 1.414; R[i:i+n_] += sig[:n_] * gain * np.sqrt((1 + pan) / 2) * 1.414
def lp(x, fc):
    from scipy.signal import lfilter
    a = np.exp(-2 * np.pi * fc / SR); return lfilter([1 - a], [1, -a], x)
def env(n_, a, r):
    e = np.ones(n_); na = int(a * SR); nr = int(r * SR); e[:na] = np.linspace(0, 1, na); e[n_-nr:] *= np.linspace(1, 0, nr); return e
key = int(rng.integers(0, 12)) + 45
PROGS = [[0, 8, 3, 10], [0, 5, 8, 7], [0, 3, 8, 10], [0, 10, 8, 7], [0, 8, 5, 7], [0, 7, 8, 5]]
prog = PROGS[int(rng.integers(0, len(PROGS)))]
def chord(deg):
    root = key + deg; third = 3 if deg in (0, 5, 7) else 4
    return [root, root + 7, root + 12, root + 12 + third, root + 19]
bpm = int(rng.choice([88, 92, 96, 100, 104])); beat = 60 / bpm
padtype = int(rng.integers(0, 3))
secs = [0] + bounds + [TOTAL]
for k in range(len(secs) - 1):
    ch = chord(prog[k % 4]) if k < len(secs) - 2 else chord(0)
    t0 = max(0, secs[k] - .4); t1 = min(TOTAL, secs[k+1] + .6); n_ = int((t1 - t0) * SR); t = np.arange(n_) / SR
    pad = np.zeros(n_)
    for m in ch[1:]:
        for d in (-.1, 0, .09):
            f = midi(m) * 2 ** (d / 12); ph = rng.random()
            pad += (2 * ((f * t + ph) % 1) - 1) if padtype == 0 else (np.sin(2*np.pi*f*t + 2*np.sin(2*np.pi*f*2*t)) if padtype == 1 else np.sign(np.sin(2*np.pi*(f*t+ph))) * .6)
    pad = lp(pad / 12, 1100) * env(n_, .9, 1.0) * (.9 + .1 * np.sin(2 * np.pi * .25 * t))
    bass = np.sin(2 * np.pi * midi(ch[0] - 12) * t) * env(n_, .4, 1)
    add(pad, t0, .24, -.25); add(pad, t0 + .011, .24, .25); add(bass, t0, .14)
def drum(f0=60, dec=.35, noise=.3):
    n_ = int(.9 * SR); t = np.arange(n_) / SR; f = f0 * (1 + 1.5 * np.exp(-t * 30))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / dec) + noise * rng.standard_normal(n_) * np.exp(-t / .03)
dk = drum(); sn = drum(180, .12, .9)
hat = rng.standard_normal(int(.06 * SR)); hat = (hat - lp(hat, 6000)) * np.exp(-np.arange(len(hat)) / SR / .015)
t = bounds[0]; b = 0
while t < bounds[-1] - .2:
    add(dk, t, .34 if b % 4 == 0 else .16)
    if b % 4 == 2: add(sn, t, .1)
    add(hat, t + beat / 2, .04, .4 * (-1) ** b); t += beat; b += 1
def bell(f, d=2.0):
    n_ = int(d * SR); t = np.arange(n_) / SR; mod = np.sin(2 * np.pi * f * 3.5 * t) * 2 * np.exp(-t / .4)
    return np.sin(2 * np.pi * f * t + mod) * np.exp(-t / .6) * np.minimum(1, t * 400)
# arpeggio pluck line during scenes
arp = rng.permutation([0, 1, 2, 3, 4])
t = bounds[0]; j = 0
while t < bounds[-1] - .3:
    k = min(n - 1, int((t - TI) // TS)); ch = chord(prog[(k + 1) % 4])
    add(bell(midi(ch[arp[j % 5]] + 12), .7), t, .03, np.sin(j)); t += beat / 2; j += 1
def whoosh(d=.9):
    n_ = int(d * SR); x = rng.standard_normal(n_); t = np.arange(n_) / SR
    out = np.zeros(n_); blk = 512
    for s in range(0, n_, blk):
        fc = 300 + 3500 * (s / n_) ** 2; out[s:s+blk] = lp(x[s:s+blk], fc)
    return (x * .05 + out) * (t / d) ** 2
def impact():
    n_ = int(2 * SR); t = np.arange(n_) / SR; f = 90 * np.exp(-t * 2) + 35
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .7) + .5 * lp(rng.standard_normal(n_), 600) * np.exp(-t / .25)
W = whoosh(); I = impact()
for bt in bounds: add(W, bt - .9, .5, -.3); add(W, bt - .88, .4, .3); add(I, bt, .5)
n_ = int((TI - .1) * SR); tt = np.arange(n_) / SR; rz = (tt / tt[-1]) ** 3
add(np.sin(2 * np.pi * np.cumsum(200 + 800 * rz ** .66) / SR) * rz * .5 + lp(rng.standard_normal(n_), 3000) * rz, .1, .16)
add(I, .3, .4); add(bell(midi(key + 36)), .35, .14)
gap = (TS - 2.6) / 3
for k in range(n):
    s = bounds[k]; ch = chord(prog[(k + 1) % 4])
    add(bell(midi(ch[-1] + 12)), s + .25, .1)
    for j in range(3): add(bell(midi(ch[j + 2] + 12)), s + 1.5 + j * gap, .12, (-.5, 0, .5)[j])
for j, m in enumerate([0, 3, 7, 12, 15]): add(bell(midi(key + 24 + m), 3), bounds[-1] + .5 + j * .22, .1, (j - 2) / 3)
from scipy.signal import fftconvolve
irn = int(2.6 * SR); irt = np.arange(irn) / SR
def rev(x, s):
    ir = np.random.default_rng(s).standard_normal(irn) * np.exp(-irt / .7); ir = lp(ir, 5000); ir /= np.sqrt(np.sum(ir ** 2)); return fftconvolve(x, ir)[:N]
L2 = L + .33 * rev(L, 1); R2 = R + .33 * rev(R, 2)
fade = np.ones(N); fn = int(1.4 * SR); fade[-fn:] = np.linspace(1, 0, fn); fade[:int(.05*SR)] = np.linspace(0, 1, int(.05*SR)); L2 *= fade; R2 *= fade
pk = max(np.abs(L2).max(), np.abs(R2).max()); L2 = np.tanh(1.3 * L2 / pk) / np.tanh(1.3) * .89; R2 = np.tanh(1.3 * R2 / pk) / np.tanh(1.3) * .89
w = wave.open(OUT, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.stack([L2, R2], 1) * 32767).astype('<i2').tobytes()); w.close()
print('audio ok', OUT, f'key={key} bpm={bpm} prog={prog}')
