/* Kediler vs Köpekler – Halat Çekme
 * İzleyiciler yorumla takıma katılır, her yorum/beğeni/hediye halatı kendi takımına çeker.
 * URL seçenekleri: ?test=1 (klavye ile sahte olaylar)  ?transparent=1 (şeffaf arka plan)
 *                  ?round=90 (tur süresi, sn)  ?debug=1 (bağlantı durumunu göster)
 */
(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const CFG = {
    roundSec: clampNum(params.get('round'), 30, 600, 90),
    introSec: 6,
    winSec: 9,
    winLimit: 100,          // halat bu değere ulaşınca anında kazanır
    chatPull: 2,            // her yorumun gücü
    chatCooldownMs: 700,    // aynı kişinin yorumları arasında en az bu kadar süre
    likePull: 0.25,         // beğeni başına (üst sınır likeMax)
    likeMax: 3,
    giftBase: 4,
    giftPerDiamond: 2,
    giftMax: 45,
    followPull: 5,
    finalBoostSec: 10,      // son saniyelerde güç x2
  };

  const TEAMS = {
    kedi: { key: 'kedi', name: 'KEDİLER', emoji: '🐱', color: '#ff8a3d', dark: '#c4561a', dir: -1 },
    kopek: { key: 'kopek', name: 'KÖPEKLER', emoji: '🐶', color: '#3da5ff', dark: '#1b6bb8', dir: 1 },
  };

  // ---------- Yardımcılar ----------
  function clampNum(v, min, max, def) {
    const n = Number(v);
    return Number.isFinite(n) && v !== null ? Math.min(max, Math.max(min, n)) : def;
  }
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const shortName = (s) => { const t = String(s || 'izleyici').trim(); return t.length > 14 ? t.slice(0, 13) + '…' : t; };
  const storage = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* yok say */ } },
  };

  function detectTeam(text) {
    const t = String(text).toLocaleLowerCase('tr').trim();
    if (t === '1') return 'kedi';
    if (t === '2') return 'kopek';
    const cat = t.search(/kedi|kedı|cat|miyav|🐱|🐈|😺/u);
    const dog = t.search(/k[öo]pek|dog|hav ?hav|🐶|🐕/u);
    if (cat < 0 && dog < 0) return null;
    if (cat < 0) return 'kopek';
    if (dog < 0) return 'kedi';
    return cat < dog ? 'kedi' : 'kopek';
  }

  // ---------- Avatarlar ----------
  const avatarCache = new Map();
  function avatarImg(url) {
    if (!url) return null;
    let e = avatarCache.get(url);
    if (!e) {
      const img = new Image();
      e = { img, ok: false };
      img.referrerPolicy = 'no-referrer';
      img.onload = () => { e.ok = true; };
      img.src = url;
      avatarCache.set(url, e);
    }
    return e.ok ? e.img : null;
  }

  // ---------- Ses (WebAudio, basit sentez) ----------
  const sound = {
    on: storage.get('kvk_sound', true), ctx: null, last: 0,
    ensure() {
      if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } }
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return this.ctx;
    },
    tone(freq, dur = 0.08, type = 'square', vol = 0.05, slide = 0) {
      if (!this.on) return;
      const ctx = this.ensure(); if (!ctx || ctx.state !== 'running') return;
      const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
    },
    pull(team) { const n = performance.now(); if (n - this.last < 70) return; this.last = n; this.tone(team === 'kedi' ? 660 : 440, 0.06, 'triangle', 0.04); },
    gift() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.14, 'square', 0.05), i * 70)); },
    join() { this.tone(880, 0.1, 'sine', 0.05, 400); },
    win() { [523, 659, 784, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.2, 'square', 0.06), i * 130)); },
    tick() { this.tone(1200, 0.05, 'sine', 0.05); },
  };
  ['pointerdown', 'keydown'].forEach((ev) => addEventListener(ev, () => sound.ensure(), { passive: true }));

  // ---------- Oyun durumu ----------
  const players = new Map(); // id -> {id,name,avatar,team,lastPull,pulls,bob}
  const state = {
    phase: 'intro', phaseEnd: 0, round: 1,
    pos: 0, shownPos: 0,
    score: storage.get('kvk_score', { kedi: 0, kopek: 0 }),
    roundPulls: new Map(), // id -> güç
    lastActivity: 0,
    winner: null,
  };

  function teamMembers(team) {
    const out = [];
    for (const p of players.values()) if (p.team === team) out.push(p);
    return out;
  }

  function getPlayer(user) {
    const id = String(user?.id || 'anonim');
    let p = players.get(id);
    if (!p) {
      p = { id, name: shortName(user?.name || id), avatar: user?.avatar || null, team: null, lastPull: 0, pulls: 0, bob: 0, joinedAt: 0 };
      players.set(id, p);
    } else {
      if (user?.avatar) p.avatar = user.avatar;
      if (user?.name) p.name = shortName(user.name);
    }
    return p;
  }

  function joinTeam(p, team) {
    if (p.team === team) return;
    const switched = !!p.team;
    p.team = team; p.joinedAt = performance.now(); p.bob = 1;
    feed(`${p.name} ${TEAMS[team].emoji} ${switched ? 'takım değiştirdi!' : 'takımına katıldı!'}`, team);
    sound.join();
  }

  function smallerTeam() {
    return teamMembers('kedi').length <= teamMembers('kopek').length ? 'kedi' : 'kopek';
  }

  /** Halatı çek. amount pozitif sayı. */
  function pull(p, amount, opts = {}) {
    if (state.phase !== 'play' || !p.team) return;
    const team = TEAMS[p.team];
    // Geride kalan takıma biraz destek: maçlar daha heyecanlı kalır
    const losingBy = clamp(state.pos * team.dir * -1, 0, 100); // çeken takım ne kadar gerideyse
    let mult = 1 + losingBy / 160;
    const left = (state.phaseEnd - performance.now()) / 1000;
    if (left <= CFG.finalBoostSec) mult *= 2;
    const power = amount * mult;
    state.pos = clamp(state.pos + team.dir * power, -CFG.winLimit, CFG.winLimit);
    p.pulls += power; p.bob = 1;
    state.roundPulls.set(p.id, (state.roundPulls.get(p.id) || 0) + power);
    spawnFloat(p.team, `+${Math.round(power)}`, opts.big);
    sound.pull(p.team);
    if (Math.abs(state.pos) >= CFG.winLimit) endRound(p.team);
  }

  // ---------- Olay işleme ----------
  function handle(ev) {
    if (!ev || !ev.type) return;
    const p = getPlayer(ev.user);
    state.lastActivity = performance.now();

    switch (ev.type) {
      case 'chat': {
        const team = detectTeam(ev.text);
        if (team) { joinTeam(p, team); if (state.phase === 'play') pull(p, CFG.chatPull); return; }
        if (!p.team) return;
        const now = performance.now();
        if (now - p.lastPull < CFG.chatCooldownMs) return;
        p.lastPull = now;
        pull(p, CFG.chatPull);
        return;
      }
      case 'like': {
        if (!p.team) return;
        pull(p, Math.min(CFG.likeMax, (ev.count || 1) * CFG.likePull));
        if (Math.random() < 0.08) feed(`${p.name} ❤️ beğeni gönderdi`, p.team);
        return;
      }
      case 'gift': {
        if (!p.team) joinTeam(p, smallerTeam());
        const total = Math.max(1, ev.diamonds || 1) * Math.max(1, ev.count || 1);
        const power = Math.min(CFG.giftMax, CFG.giftBase + total * CFG.giftPerDiamond);
        showBanner(`🎁 ${p.name}: SÜPER ÇEKİŞ!`, `${ev.count > 1 ? ev.count + '× ' : ''}${ev.gift || 'Hediye'} → ${TEAMS[p.team].emoji} ${TEAMS[p.team].name}`);
        feed(`${p.name} 🎁 ${ev.gift || 'hediye'} gönderdi!`, p.team);
        confetti(TEAMS[p.team].color, 40);
        shake();
        sound.gift();
        pull(p, power, { big: true });
        return;
      }
      case 'follow':
      case 'share': {
        feed(`${p.name} ${ev.type === 'follow' ? '➕ takip etti' : '↗️ paylaştı'}!`, p.team);
        if (p.team) pull(p, CFG.followPull, { big: true });
        return;
      }
      case 'join':
        // Odaya girenleri göstermiyoruz (çok kalabalık olur), sadece aktiflik sayılır
        return;
    }
  }

  // ---------- Tur akışı ----------
  function setPhase(phase, sec) {
    state.phase = phase;
    state.phaseEnd = performance.now() + sec * 1000;
  }

  function startIntro() {
    state.pos = 0; state.winner = null; state.roundPulls.clear();
    for (const p of players.values()) p.pulls = 0;
    setPhase('intro', CFG.introSec);
    showCenter(`<div class="big">TUR ${state.round}</div><div class="sub">Takımını seç! Yorum yaz:<br><b class="cat">KEDİ</b> ya da <b class="dog">KÖPEK</b></div>`);
  }

  function startPlay() {
    setPhase('play', CFG.roundSec);
    hideCenter();
    showBanner('ÇEKİN! 💪', 'Her yorum halatı takımına çeker', 1600);
  }

  function endRound(winnerKey) {
    if (state.phase !== 'play') return;
    if (!winnerKey) {
      if (Math.abs(state.pos) < 1) winnerKey = null; // berabere
      else winnerKey = state.pos < 0 ? 'kedi' : 'kopek';
    }
    state.winner = winnerKey;
    setPhase('win', CFG.winSec);
    $('banner').classList.add('hidden');
    let html;
    if (winnerKey) {
      const t = TEAMS[winnerKey];
      state.score[winnerKey]++;
      storage.set('kvk_score', state.score);
      const el = $(winnerKey === 'kedi' ? 'scoreCat' : 'scoreDog');
      el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
      html = `<div class="big" style="color:${t.color}">${t.emoji} ${t.name}<br>KAZANDI!</div>`;
      confetti(t.color, 160); confetti('#ffd93d', 80);
      sound.win();
    } else {
      html = `<div class="big">BERABERE!</div>`;
    }
    const mvp = topPullers(1)[0];
    if (mvp) {
      const img = mvp.avatar ? `<img src="${encodeURI(mvp.avatar)}" referrerpolicy="no-referrer" alt="">` : `<span class="ph" style="background:${TEAMS[mvp.team || 'kedi'].color}">${TEAMS[mvp.team || 'kedi'].emoji}</span>`;
      html += `<div class="mvp">${img}<span>⭐ Turun yıldızı: <span id="mvpName"></span></span></div>`;
    }
    html += `<div class="sub">Yeni tur birazdan…</div>`;
    showCenter(html);
    if (mvp) $('mvpName').textContent = mvp.name; // kullanıcı adı her zaman textContent ile
    state.round++;
  }

  function topPullers(n) {
    return [...state.roundPulls.entries()]
      .sort((a, b) => b[1] - a[1]).slice(0, n)
      .map(([id, power]) => ({ ...players.get(id), power }))
      .filter((p) => p && p.id);
  }

  // ---------- HUD ----------
  let bannerTimer = 0;
  function showBanner(title, sub, ms = 2600) {
    const b = $('banner');
    b.textContent = title;
    if (sub) { const s = document.createElement('small'); s.textContent = sub; b.appendChild(s); }
    b.classList.remove('hidden'); b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
    clearTimeout(bannerTimer); bannerTimer = setTimeout(() => b.classList.add('hidden'), ms);
  }
  function showCenter(html) { const c = $('center'); c.innerHTML = html; c.classList.remove('hidden'); }
  function hideCenter() { $('center').classList.add('hidden'); }

  function feed(text, team) {
    const ul = $('feed');
    const li = document.createElement('li');
    li.textContent = text;
    if (team) li.className = team;
    ul.prepend(li);
    while (ul.children.length > 3) ul.lastChild.remove();
  }

  let lastHud = 0;
  function updateHud(now) {
    if (now - lastHud < 120) return;
    lastHud = now;
    const left = Math.max(0, Math.ceil((state.phaseEnd - now) / 1000));
    const timer = $('timer');
    if (state.phase === 'play') {
      timer.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
      const hurry = left <= CFG.finalBoostSec;
      timer.classList.toggle('hurry', hurry);
      if (hurry && left !== updateHud.lastTick) { updateHud.lastTick = left; sound.tick(); }
    } else {
      timer.textContent = state.phase === 'intro' ? `${left}` : '🎉';
      timer.classList.remove('hurry');
    }
    $('roundLabel').textContent = state.phase === 'play' && left <= CFG.finalBoostSec ? 'GÜÇ x2!' : `TUR ${state.phase === 'win' ? state.round - 1 : state.round}`;
    $('scoreCat').textContent = state.score.kedi;
    $('scoreDog').textContent = state.score.kopek;

    const catPct = Math.round(50 - state.shownPos / 2);
    $('powerCat').style.width = `${catPct}%`;
    $('powerDog').style.width = `${100 - catPct}%`;
    $('pctCat').textContent = `🐱 %${catPct}`;
    $('pctDog').textContent = `%${100 - catPct} 🐶`;
    $('teamCounts').textContent = `${teamMembers('kedi').length} oyuncu · ${teamMembers('kopek').length} oyuncu`;

    const ol = $('leaderList');
    ol.replaceChildren(...topPullers(5).map((p, i) => {
      const li = document.createElement('li');
      let av;
      if (p.avatar) { av = document.createElement('img'); av.src = p.avatar; av.referrerPolicy = 'no-referrer'; av.alt = ''; }
      else { av = document.createElement('span'); av.textContent = TEAMS[p.team || 'kedi'].emoji; av.style.background = TEAMS[p.team || 'kedi'].color; }
      av.className = 'av';
      const n = document.createElement('span'); n.className = 'n'; n.textContent = `${['🥇', '🥈', '🥉', '4.', '5.'][i]} ${p.name}`;
      const pw = document.createElement('span'); pw.className = 'p'; pw.textContent = Math.round(p.power);
      li.append(av, n, pw);
      return li;
    }));

    const idle = now - state.lastActivity > 15000;
    $('howto').classList.toggle('attract', idle || state.phase === 'intro');
  }

  // ---------- Arena çizimi ----------
  const cv = $('arena');
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const GROUND = 600, ROPE_Y = 440, MAX_SHIFT = 330;
  const floats = [], parts = [];

  function spawnFloat(team, text, big) {
    const x = W / 2 + state.shownPos / CFG.winLimit * MAX_SHIFT + TEAMS[team].dir * (120 + Math.random() * 200);
    floats.push({ x, y: ROPE_Y - 60 - Math.random() * 60, text, color: TEAMS[team].color, life: 1, big });
    if (floats.length > 60) floats.shift();
  }
  function confetti(color, n) {
    for (let i = 0; i < n; i++) {
      parts.push({ x: Math.random() * W, y: -20 - Math.random() * 200, vx: (Math.random() - 0.5) * 4, vy: 3 + Math.random() * 5,
        r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3, color: Math.random() < 0.5 ? color : '#ffffff', life: 1 });
    }
    if (parts.length > 500) parts.splice(0, parts.length - 500);
  }
  function shake() { cv.classList.remove('shake'); void cv.offsetWidth; cv.classList.add('shake'); }

  function drawBackground(t) {
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
    sky.addColorStop(0, 'rgba(120,200,255,0.0)'); sky.addColorStop(1, 'rgba(120,200,255,0.18)');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, GROUND);
    // zemin: iki takım rengi
    ctx.fillStyle = '#4fbf5a'; ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = '#3fa64a';
    for (let x = -40; x < W; x += 80) ctx.fillRect(x + ((t / 40) % 80), GROUND + 30, 40, 12);
    // çamur çukuru ortada
    ctx.fillStyle = '#7a4b2a';
    ctx.beginPath(); ctx.ellipse(W / 2, GROUND + 70, 150, 34, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8f5b35';
    ctx.beginPath(); ctx.ellipse(W / 2, GROUND + 64, 120, 22, 0, 0, Math.PI * 2); ctx.fill();
    // kazanma çizgileri
    ctx.setLineDash([18, 14]); ctx.lineWidth = 6;
    ctx.strokeStyle = TEAMS.kedi.color; line(W / 2 - MAX_SHIFT, 360, W / 2 - MAX_SHIFT, GROUND);
    ctx.strokeStyle = TEAMS.kopek.color; line(W / 2 + MAX_SHIFT, 360, W / 2 + MAX_SHIFT, GROUND);
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 4; line(W / 2, 360, W / 2, GROUND);
  }
  function line(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }

  function drawAvatar(p, x, y, r, team) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r + 5, 0, Math.PI * 2); ctx.fillStyle = team.color; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
    const img = avatarImg(p.avatar);
    if (img) ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
    else {
      ctx.fillStyle = team.dark; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.fillStyle = '#fff'; ctx.font = `900 ${r}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText((p.name[0] || '?').toLocaleUpperCase('tr'), x, y + 2);
    }
    ctx.restore();
  }

  function drawTeam(teamKey, ropeShift, t) {
    const team = TEAMS[teamKey];
    const d = team.dir; // -1 sol, +1 sağ
    const strain = Math.sin(t / 120) * 3;
    // Lider (büyük emoji) halatın ucunda
    const lx = W / 2 + ropeShift + d * 250;
    const lean = -d * 0.28;
    ctx.save();
    ctx.translate(lx, GROUND - 10);
    ctx.rotate(lean + strain * 0.004);
    ctx.font = '150px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.save(); if (d < 0) ctx.scale(-1, 1); ctx.fillText(teamKey === 'kedi' ? '🐈' : '🐕', 0, 0); ctx.restore();
    ctx.restore();

    // Takım tribünü: kendi yarı sahasında 3 sıra avatar; çeken kişi zıplar
    const all = teamMembers(teamKey).sort((a, b) => b.joinedAt - a.joinedAt);
    const COLS = 7, ROWS = 3, SHOW = COLS * ROWS, GAP = 68;
    const members = all.slice(0, all.length > SHOW ? SHOW - 1 : SHOW);
    const half0 = d < 0 ? 62 : W / 2 + 50;
    const slot = (i) => ({ x: half0 + (i % COLS) * GAP + (Math.floor(i / COLS) % 2) * 16, y: 120 + Math.floor(i / COLS) * 82 });
    members.forEach((p, i) => {
      const { x, y } = slot(i);
      p.bob = Math.max(0, p.bob - 0.04);
      const jump = Math.sin(p.bob * Math.PI) * 28;
      drawAvatar(p, x, y - jump, 30, team);
    });
    if (all.length > SHOW) {
      const { x, y } = slot(SHOW - 1);
      ctx.beginPath(); ctx.arc(x, y, 35, 0, Math.PI * 2); ctx.fillStyle = team.dark; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '900 26px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`+${all.length - SHOW + 1}`, x, y);
    }
    if (!all.length) {
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '700 32px "Baloo 2","Segoe UI",sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`"${teamKey === 'kedi' ? 'KEDİ' : 'KÖPEK'}" yaz, ilk sen katıl!`, W / 2 + d * 270, 200);
    }

    // Takım adı
    ctx.font = '900 44px "Baloo 2","Segoe UI",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(0,0,0,.45)';
    const tx = W / 2 + d * 270;
    ctx.strokeText(`${team.emoji} ${team.name}`, tx, 60); ctx.fillStyle = team.color; ctx.fillText(`${team.emoji} ${team.name}`, tx, 60);
  }

  function drawRope(ropeShift, t) {
    const cx = W / 2 + ropeShift;
    const wob = Math.sin(t / 90) * 4;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#6b4321'; ctx.lineWidth = 22;
    ctx.beginPath(); ctx.moveTo(cx - 560, ROPE_Y + 40); ctx.quadraticCurveTo(cx, ROPE_Y + wob + 14, cx + 560, ROPE_Y + 40); ctx.stroke();
    ctx.strokeStyle = '#c99254'; ctx.lineWidth = 14;
    ctx.setLineDash([16, 12]); ctx.lineDashOffset = -ropeShift;
    ctx.beginPath(); ctx.moveTo(cx - 560, ROPE_Y + 40); ctx.quadraticCurveTo(cx, ROPE_Y + wob + 14, cx + 560, ROPE_Y + 40); ctx.stroke();
    ctx.setLineDash([]);
    // orta bayrak
    ctx.fillStyle = '#ff3b6b';
    ctx.beginPath(); ctx.moveTo(cx - 6, ROPE_Y + 20); ctx.lineTo(cx + 6, ROPE_Y + 20);
    ctx.lineTo(cx + 26, ROPE_Y + 110 + wob); ctx.lineTo(cx - 26, ROPE_Y + 110 + wob); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd93d'; ctx.beginPath(); ctx.arc(cx, ROPE_Y + 24, 16, 0, Math.PI * 2); ctx.fill();
  }

  function drawEffects() {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i];
      f.y -= f.big ? 2.4 : 1.6; f.life -= f.big ? 0.012 : 0.02;
      if (f.life <= 0) { floats.splice(i, 1); continue; }
      ctx.globalAlpha = Math.min(1, f.life * 1.5);
      ctx.font = `900 ${f.big ? 84 : 46}px "Baloo 2","Segoe UI",sans-serif`;
      ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.x += p.vx; p.y += p.vy; p.r += p.vr; p.vy += 0.05;
      if (p.y > H + 20) { parts.splice(i, 1); continue; }
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.color; ctx.fillRect(-8, -4, 16, 8); ctx.restore();
    }
  }

  // ---------- Ana döngü ----------
  function frame(now) {
    if (state.phase === 'intro' && now >= state.phaseEnd) startPlay();
    else if (state.phase === 'play' && now >= state.phaseEnd) endRound(null);
    else if (state.phase === 'win' && now >= state.phaseEnd) startIntro();

    // Turlar arası halat ortaya yavaşça döner
    if (state.phase === 'intro') state.pos *= 0.95;
    state.shownPos += (state.pos - state.shownPos) * 0.12;

    const ropeShift = state.shownPos / CFG.winLimit * MAX_SHIFT;
    ctx.clearRect(0, 0, W, H);
    drawBackground(now);
    drawRope(ropeShift, now);
    drawTeam('kedi', ropeShift, now);
    drawTeam('kopek', ropeShift, now);
    drawEffects();
    updateHud(now);
    requestAnimationFrame(frame);
  }

  // ---------- Sahneyi ekrana sığdır ----------
  function fit() {
    const s = Math.min(innerWidth / 1080, innerHeight / 1920);
    $('stage').style.transform = `translate(-50%, -50%) scale(${s})`;
  }
  addEventListener('resize', fit);

  // ---------- Bağlantı ----------
  function connect() {
    if (typeof io !== 'function') { setStatus('Sunucuya bağlanılamadı (socket.io yok). Sadece test modu çalışır.', true); return; }
    const socket = io();
    socket.on('game', handle);
    socket.on('status', (s) => setStatus(s.message, !s.connected));
    socket.on('disconnect', () => setStatus('Sunucu bağlantısı koptu…', true));
  }
  function setStatus(msg, problem) {
    const el = $('status');
    el.textContent = `● ${msg}`;
    el.classList.toggle('show', params.has('debug') || params.has('test') || !!problem);
    el.style.color = problem ? '#ff8080' : '#8dff9a';
  }

  // ---------- Test modu (klavye) ----------
  let testId = 0, storm = 0;
  function fakeUser() { testId++; return { id: 'test' + testId, name: 'test' + testId, avatar: null }; }
  function randomMember(team) { const m = teamMembers(team); return m.length ? m[Math.floor(Math.random() * m.length)] : null; }
  function setupTest() {
    if (!params.has('test')) return;
    $('testpanel').classList.remove('hidden');
    addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'k') handle({ type: 'chat', user: fakeUser(), text: 'kedi' });
      if (k === 'd') handle({ type: 'chat', user: fakeUser(), text: 'köpek' });
      if (k === '1' || k === '2') {
        const m = randomMember(k === '1' ? 'kedi' : 'kopek');
        if (m) { m.lastPull = 0; handle({ type: 'chat', user: m, text: 'çek!' }); }
      }
      if (k === 'g') { const all = [...players.values()]; const u = all.length ? all[Math.floor(Math.random() * all.length)] : fakeUser(); handle({ type: 'gift', user: u, gift: 'Gül', diamonds: 1, count: 5 }); }
      if (k === 'l') { const m = randomMember(Math.random() < 0.5 ? 'kedi' : 'kopek'); if (m) handle({ type: 'like', user: m, count: 10 }); }
      if (k === 'f') { const m = randomMember(Math.random() < 0.5 ? 'kedi' : 'kopek'); if (m) handle({ type: 'follow', user: m }); }
      if (k === 's') {
        if (storm) { clearInterval(storm); storm = 0; return; }
        storm = setInterval(() => {
          if (Math.random() < 0.15 || players.size < 6) { handle({ type: 'chat', user: fakeUser(), text: Math.random() < 0.5 ? 'kedi' : 'köpek' }); return; }
          const m = randomMember(Math.random() < 0.5 ? 'kedi' : 'kopek'); if (m) handle({ type: 'chat', user: m, text: 'hadi' });
        }, 150);
      }
      if (k === 'r') { state.score = { kedi: 0, kopek: 0 }; storage.set('kvk_score', state.score); }
    });
  }
  addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'm') { sound.on = !sound.on; storage.set('kvk_sound', sound.on); showBanner(sound.on ? '🔊 Ses açık' : '🔇 Ses kapalı', '', 1000); }
  });

  // ---------- Başlat ----------
  if (params.has('transparent')) document.body.classList.add('transparent');
  fit();
  setupTest();
  connect();
  startIntro();
  requestAnimationFrame(frame);
})();
