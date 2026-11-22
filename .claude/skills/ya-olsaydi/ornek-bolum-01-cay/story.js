// Tuhaf Tahsin #1 · Ya çay hiç soğumasaydı? (40,5 sn)
import { TAHSIN } from "./tahsin.js";
export const meta = { fps: 30 };

// [ilk kare, ad]  (work/phrases.json ile hizalı)
const SHOTS = [[0, "hook"], [57, "name"], [97, "invent"], [209, "love"], [327, "problem"], [405, "tries"], [490, "burn"],
  [551, "second"], [619, "closed"], [680, "collect"], [765, "winter"], [815, "homes"], [950, "fact"], [1152, "end"]];
const END = 1235;
const shotAt = (f) => { let i = 0; while (i < SHOTS.length - 1 && f >= SHOTS[i + 1][0]) i++; return { name: SHOTS[i][1], f0: SHOTS[i][0], f1: (SHOTS[i + 1] || [END])[0], t: f - SHOTS[i][0] }; };

const WX = -200, HX = 200; // atölye ve ev x konumu; sokak x = 0
const TEA = "#b5401f";
let R = {};

function teaGlass(E, parent, pos, s = 1, hot = true) {
  const g = E.group(parent, pos);
  E.cyl(0.075 * s, 0.075 * s, 0.012 * s, E.mat("#c2343a"), [0, 0, 0], { parent: g });
  E.cyl(0.036 * s, 0.03 * s, 0.1 * s, E.mat(TEA, hot ? { emissive: "#ff6a1a", glow: 0.25 } : {}), [0, 0.012 * s, 0], { parent: g });
  E.cyl(0.04 * s, 0.04 * s, 0.008 * s, E.mat("#f4f1ea"), [0, 0.11 * s, 0], { parent: g });
  return g;
}
function steam(E, n = 6) {
  const arr = [];
  for (let i = 0; i < n; i++) { const m = E.sphere(1, E.flat("#ffffff", { transparent: true, opacity: 0.7 }), [0, -50, 0], { seg: 10 }); m.userData.noink = true; m.castShadow = false; arr.push(m); }
  return arr;
}
function placeSteam(arr, f, x, y, z, s = 1) {
  arr.forEach((m, i) => { const p = (f / 30 * 0.7 + i / arr.length) % 1; m.visible = true; m.position.set(x + 0.02 * s * Math.sin(p * 9 + i), y + p * 0.22 * s, z); m.scale.setScalar((0.008 + 0.014 * p) * s); m.material.opacity = 0.6 * (1 - p); });
}
const hideAll = (arr) => arr.forEach((m) => (m.visible = false));

export function build(E) {
  const { S, T } = E;
  // ---- mahalle sokağı (x = 0) ----
  E.ground(T.grass("#86b860"), 300, 0.2);
  S.street({ len: 140, width: 8 });
  S.row(-60, -5, -10.6, { seed: 4 }); S.row(9, 60, -10.6, { seed: 8 });
  R.kahve = S.building(2, -10.6, { w: 7, floors: 2, wall: "#f3d6a8", roof: "#8a4a3a", shop: { text: "ÇAYCI RIZA" }, awning: "#b8262e" });
  S.row(-60, 60, 10.6, { seed: 12, rot: Math.PI });
  S.hills(); S.clouds();
  for (const x of [-6, 8]) S.lamp(x, -6.4, {});
  R.lampOn = S.lamp(-2.5, -6.4, { on: true }); R.lampOn.visible = false;
  for (const [x, z] of [[0.2, -5.2], [3.6, -5.2]]) { S.table(x, z, { w: 1.1, d: 0.8, h: 0.75, cloth: "#e9e2cf" }); S.chair(x - 0.8, z, { rot: Math.PI / 2 }); S.chair(x + 0.8, z, { rot: -Math.PI / 2 }); }
  R.streetGlasses = [teaGlass(E, null, [0.0, 0.75, -5.2]), teaGlass(E, null, [0.4, 0.75, -5.1]), teaGlass(E, null, [3.5, 0.75, -5.2])];
  R.kapali = E.label(T.sign("KAPALI", { bg: "#b8262e", fg: "#ffffff", size: 160 }), 1.6, 0.6, [2, 2.4, -7.0]); R.kapali.visible = false;
  R.snow = []; for (let i = 0; i < 160; i++) { const m = E.sphere(0.05, E.flat("#ffffff"), [0, -50, 0], { seg: 6 }); m.userData.noink = true; m.castShadow = false; R.snow.push(m); }

  // ---- atölye (x = -200) ----
  S.room({ x: WX, w: 9, d: 7, h: 4, wall: T.brick("#b56a4a"), floor: T.planks("#9a6a3c"), floorRep: 0.4, door: false });
  S.desk(WX, -2.6, {}); S.shelf(WX + 3.2, -3.25, {}); S.crate(WX - 3.4, -2.6); S.barrel(WX - 3.6, -1.2); S.hangLamp(WX, 4, -1.6, { i: 9 });
  R.deskGlass = teaGlass(E, null, [WX + 0.25, 0.85, -2.3], 1.6);
  R.bigGlass = teaGlass(E, null, [WX + 0.35, 1.05, 0.9], 2.2);

  // ---- ev (x = 200), gece ----
  S.room({ x: HX, w: 8, d: 7, h: 3.6, wall: T.wallpaper("#e9d3a8", "#dcc08a", "dots"), floor: T.planks("#a8743f"), night: true, door: false });
  S.rug(HX, -1.6, 4, 2.6, "#a8343e");
  S.table(HX, -1.9, { w: 2, d: 1, h: 0.8, cloth: "#f2e6cf" });
  for (const x of [-0.6, -0.2, 0.2, 0.6]) teaGlass(E, null, [HX + x, 0.8, -1.75], 1.3);
  R.glowL = new E.THREE.PointLight(0xff8a3a, 6, 6, 2); R.glowL.position.set(HX, 1.2, -1.6); E.add(R.glowL);
  E.cyl(0.35, 0.35, 0.9, E.mat("#2b2f3a"), [HX + 2.9, 0, -2.9]); E.cyl(0.07, 0.07, 2.6, E.mat("#2b2f3a"), [HX + 2.9, 0.9, -2.9]);

  // ---- karakterler (beyaz yüz: kanal imzası) ----
  E.actor("tahsin", TAHSIN);
  E.actor("anne", { skin: "#ffffff", dress: "#b8566a", apron: "#f4f1ea", hair: "bun", hairCol: "#5a3a2a", seed: 21 });
  E.actor("kom1", { skin: "#ffffff", shirt: "#5d7a3a", pants: "#3a3f52", hair: "short", hairCol: "#2a1d16", seed: 22 });
  E.actor("kom2", { skin: "#ffffff", dress: "#3f6fb5", hair: "long", hairCol: "#7a4a2a", seed: 23 });
  E.actor("amca1", { skin: "#ffffff", shirt: "#8c6a3a", jacket: "#4a4f5a", hat: "cap", hatCol: "#4a4f5a", moustache: "#d8d8d8", build: "stout", seed: 24 });
  E.actor("amca2", { skin: "#ffffff", shirt: "#c9b28a", jacket: "#6b4a3a", hat: "fedora", hatCol: "#3a2a20", beard: "#cfcfcf", seed: 25 });
  E.actor("riza", { skin: "#ffffff", shirt: "#8a3a3a", apron: "#f4f1ea", moustache: "#2a1d16", hair: "short", hairCol: "#2a1d16", build: "stout", seed: 26 });
  E.actor("cocuk", { skin: "#ffffff", shirt: "#f2b632", pants: "#3a4fa0", hair: "short", hairCol: "#2a1d16", build: "kid", seed: 27 });
  R.steamA = steam(E); R.steamB = steam(E); R.steamC = steam(E);
}

const card = (lines) => (g, w, h) => {
  const k = w / 1080, x = 90 * k, y = 300 * k, cw = 900 * k, ch = 520 * k;
  g.save(); g.fillStyle = "rgba(29,22,34,.9)"; g.beginPath(); g.roundRect(x, y, cw, ch, 36 * k); g.fill();
  g.fillStyle = "#e8742c"; g.fillRect(x, y, cw, 14 * k);
  g.textAlign = "center"; g.textBaseline = "middle";
  for (const [t, size, col, dy] of lines) { g.font = `900 ${size * k}px CizgiFont, Nunito, sans-serif`; g.fillStyle = col; g.fillText(t, x + cw / 2, y + dy * k); }
  g.restore();
};
const nameCard = (g, w, h) => {
  const k = w / 1080, x = 70 * k, y = 1390 * k, pw = 470 * k;
  g.save(); g.fillStyle = "rgba(20,14,24,.88)"; g.beginPath(); g.roundRect(x, y, pw, 112 * k, 22 * k); g.fill();
  g.fillStyle = "#e8742c"; g.fillRect(x, y, 10 * k, 112 * k);
  g.font = `900 ${46 * k}px CizgiFont, Nunito, sans-serif`; g.fillStyle = "#fff"; g.textBaseline = "middle"; g.fillText("Tuhaf Tahsin", x + 34 * k, y + 40 * k);
  g.font = `700 ${30 * k}px CizgiFont, Nunito, sans-serif`; g.fillStyle = "#e8742c"; g.fillText("mahallenin mucidi", x + 34 * k, y + 82 * k); g.restore();
};

export function frame(f, E) {
  const X = E.X, sh = shotAt(f), t = sh.t, A = [], FX = [];
  const st = (seed, o = {}) => ({ blink: E.blink(f, seed), ...E.idle(f, seed), ...o });
  const cup = (o = {}) => ({ kind: "cup", hand: "r", col: TEA, ...o });
  let cam, light = "day", dof = { focus: 4, amount: 6 }, flash = 0, overlay = null, focusPt = null;
  hideAll(R.steamA); hideAll(R.steamB); hideAll(R.steamC); R.snow.forEach((m) => (m.visible = false));
  const kap = E.at("kapattı");
  R.kapali.visible = kap >= 0 && f >= kap - 2; R.lampOn.visible = false;
  const flashIn = (f0, n = 6) => Math.max(0, 1 - Math.abs(f - f0) / n);

  switch (sh.name) {
    case "hook": case "name": {
      light = "interior";
      placeSteam(R.steamA, f, WX + 0.35, 1.32, 0.9, 2.2);
      A.push({ id: "tahsin", pos: [WX - 0.1, 0, -0.4], st: st(1, sh.name === "hook" ? { face: "wow", arms: "chin", look: 0.4 } : { face: "grin", arms: "point", look: 0.5 }) });
      cam = E.camAt(f, [{ f: 0, pos: [WX + 0.25, 1.45, 2.6], look: [WX + 0.1, 1.4, -0.4], fov: 40 }, { f: 97, pos: [WX + 0.15, 1.55, 2.2], look: [WX, 1.55, -0.4], fov: 38 }]);
      dof = { focus: [WX, 1.5, -0.4], amount: 8 };
      FX.push({ kind: sh.name === "hook" ? "question" : "idea", pos: [WX + 0.55, 2.65, -0.4], size: 0.55, t: t / 30 });
      if (sh.name === "name") overlay = nameCard;
      break;
    }
    case "invent": {
      light = "interior";
      A.push({ id: "tahsin", pos: [WX - 0.35, 0, -1.7], st: st(2, { face: f < 150 ? "think" : "grin", arms: f < 150 ? "chin" : "up", prop: f >= 150 ? cup() : null, look: 0.6 }) });
      placeSteam(R.steamB, f, WX + 0.25, 1.05, -2.3, 1.6);
      cam = E.camAt(f, [{ f: 97, pos: [WX + 0.6, 1.7, 1.6], look: [WX, 1.2, -2.2], fov: 40 }, { f: 208, pos: [WX + 0.3, 1.6, 0.9], look: [WX - 0.1, 1.4, -2.2], fov: 38 }]);
      dof = { focus: [WX, 1.2, -2.1], amount: 8 };
      if (f >= 150) FX.push({ kind: "idea", pos: [WX - 0.1, 2.7, -1.7], size: 0.6, t: (f - 150) / 30 }, { kind: "stars", pos: [WX - 0.3, 2.3, -1.6], size: 0.8, t: (f - 150) / 30 });
      flash = flashIn(150, 5) * 0.6;
      break;
    }
    case "love": {
      light = "day";
      const who = f < 271 ? 0 : f < 287 ? 1 : 2;
      A.push({ id: "anne", pos: [-1.6, 0, -5.6], st: st(3, { face: "laugh", arms: "holdR", prop: cup() }) });
      A.push({ id: "kom1", pos: [-0.7, 0, -6.0], st: st(4, { face: "happy", arms: "holdR", prop: cup() }) });
      A.push({ id: "kom2", pos: [-2.4, 0, -6.1], st: st(5, { face: "happy", arms: "wave" }) });
      A.push({ id: "amca1", pos: [0.9, 0, -5.9], st: st(6, { face: "happy", arms: "holdR", prop: cup(), legs: "sit" }) });
      A.push({ id: "amca2", pos: [-0.65, 0, -5.4], st: st(7, { face: "laugh", arms: "holdR", prop: cup(), legs: "sit" }), yaw: 0.6 });
      const shots = [{ pos: [-1.2, 1.65, -2.6], look: [-1.6, 1.55, -5.6], fov: 40 }, { pos: [-1.6, 1.8, -1.4], look: [-1.5, 1.5, -6], fov: 44 }, { pos: [0.5, 2.3, -0.6], look: [0.2, 1.1, -5.5], fov: 46 }];
      cam = E.camAt(f, [{ f: sh.f0, ...shots[who] }]);
      FX.push({ kind: "hearts", pos: who === 0 ? [-1.3, 2.6, -5.6] : who === 1 ? [-1.5, 2.8, -6] : [0.4, 2.2, -5.6], size: 0.6, t: (t % 40) / 40 });
      dof = { focus: shots[who].look, amount: 7 };
      break;
    }
    case "problem": {
      light = "day";
      placeSteam(R.steamA, f, 0.0, 0.88, -5.2, 2.6); placeSteam(R.steamB, f, 0.4, 0.88, -5.1, 2.6);
      A.push({ id: "tahsin", pos: [0.9, 0, -5.9], st: st(8, { face: "nervous", arms: "hip", sweat: true, look: -0.6 }) });
      cam = E.camAt(f, [{ f: 327, pos: [0.15, 1.2, -3.6], look: [0.2, 0.9, -5.2], fov: 38 }, { f: 404, pos: [0.15, 1.05, -4.1], look: [0.2, 0.9, -5.2], fov: 34 }]);
      dof = { focus: [0.2, 0.9, -5.2], amount: 10 };
      break;
    }
    case "tries": {
      light = "day";
      const b = f < 428 ? 0 : f < 450 ? 1 : f < 473 ? 2 : 3;
      placeSteam(R.steamA, f, 0.0, 0.88, -5.2, 1.4);
      A.push({ id: "amca2", pos: [-0.65, 0, -5.4], st: st(7, { face: ["talk", "sleep", "determined", "sad"][b], arms: b === 2 ? "reach" : "cross", legs: "sit", talk: b === 0 ? 0.8 : 0 }), yaw: 0.6 });
      A.push({ id: "amca1", pos: [0.9, 0, -5.9], st: st(6, { face: ["neutral", "sleep", "wow", "sad"][b], arms: "cross", legs: "sit" }) });
      cam = E.camAt(f, [{ f: 405, pos: [0.2, 1.5, -2.4], look: [0.1, 1.0, -5.5], fov: 46 }, { f: 489, pos: [0.2, 1.45, -2.8], look: [0.1, 1.0, -5.5], fov: 44 }]);
      if (b === 0) FX.push({ kind: "lines", pos: [-0.25, 1.0, -5.25], size: 0.35, t: t / 20 });
      if (b === 1) FX.push({ kind: "zzz", pos: [-0.4, 1.7, -5.4], size: 0.5, t: (f - 428) / 22 });
      if (b === 2) FX.push({ kind: "sparkle", pos: [0.0, 1.0, -5.2], size: 0.35, t: (f - 450) / 22 });
      if (b === 3) FX.push({ kind: "puff", pos: [0.0, 1.0, -5.2], size: 0.5, t: (f - 473) / 17 }, { kind: "cross", pos: [0.0, 1.55, -5.2], size: 0.35 });
      dof = { focus: [0.0, 1.0, -5.3], amount: 7 };
      break;
    }
    case "burn": {
      light = "day";
      const ids = ["anne", "kom1", "kom2", "amca1", "amca2", "cocuk"];
      ids.forEach((id, i) => A.push({ id, pos: [-1.9 + i * 0.75, 0, -5.6 - (i % 2) * 0.5], st: st(10 + i, { face: i % 2 ? "shock" : "angry", arms: i % 3 === 0 ? "up" : "facepalm", sweat: true }) }));
      cam = E.camAt(f, [{ f: 490, pos: [-0.2, 2.2, 1.4], look: [-0.2, 1.3, -5.7], fov: 48 }, { f: 550, pos: [-0.2, 2.0, 0.6], look: [-0.2, 1.4, -5.7], fov: 46 }]);
      const [sx, sy] = E.shake(f, E.at("yandı"), 0.12, 10); cam.pos[0] += sx; cam.pos[1] += sy;
      ids.forEach((_, i) => FX.push({ kind: i % 2 ? "anger" : "exclaim", pos: [-1.9 + i * 0.75 + 0.3, 2.55, -5.6 - (i % 2) * 0.5], size: 0.42, t: t / 30 }));
      dof = { focus: [-0.2, 1.4, -5.7], amount: 4 };
      break;
    }
    case "second": {
      light = "golden";
      placeSteam(R.steamA, f, 0.0, 0.88, -5.2, 1.4); placeSteam(R.steamB, f, 0.4, 0.88, -5.1, 1.4); placeSteam(R.steamC, f, 3.5, 0.88, -5.2, 1.4);
      A.push({ id: "amca1", pos: [0.9, 0, -5.9], st: st(6, { face: "sad", arms: "chin", legs: "sit" }) });
      A.push({ id: "amca2", pos: [-0.65, 0, -5.4], st: st(7, { face: "sad", arms: "cross", legs: "sit" }), yaw: 0.6 });
      A.push({ id: "riza", pos: [2.2, 0, -6.4], st: st(9, { face: "nervous", arms: "hold", prop: { kind: "cup", hand: "l", col: TEA }, sweat: true }) });
      cam = E.camAt(f, [{ f: 551, pos: [0.8, 1.6, -1.6], look: [0.8, 1.1, -5.7], fov: 46 }, { f: 618, pos: [1.0, 1.5, -2.2], look: [0.9, 1.1, -5.7], fov: 44 }]);
      dof = { focus: [0.9, 1.1, -5.7], amount: 6 };
      break;
    }
    case "closed": {
      light = ["golden", "dramatic", X.span(f, 619, 680)];
      A.push({ id: "riza", pos: [2.0, 0, -6.6], st: st(9, { face: "sad", arms: "hang", headTilt: -6 }) });
      cam = E.camAt(f, [{ f: 619, pos: [2.0, 2.0, -2.0], look: [2.0, 2.0, -7.0], fov: 46 }, { f: 679, pos: [2.0, 2.1, -2.8], look: [2.0, 2.1, -7.0], fov: 44 }]);
      if (f >= kap - 2) FX.push({ kind: "puff", pos: [2.0, 2.4, -6.9], size: 0.8, t: X.span(f, kap - 2, kap + 14) });
      dof = { focus: [2.0, 2.0, -6.8], amount: 5 };
      break;
    }
    case "collect": {
      light = "golden";
      const x = X.keyed(f, [[680, -5.5], [765, -1.2]]);
      A.push({ id: "tahsin", pos: [x, 0, -5.4], st: st(1, { face: "determined", legs: "walk", phase: t / 24, arms: "holdR", prop: cup() }) });
      cam = { pos: [x + 0.6, 1.6, -2.2], look: [x + 0.2, 1.35, -5.4], fov: 44 };
      dof = { focus: [x, 1.4, -5.4], amount: 7 };
      break;
    }
    case "winter": {
      light = ["golden", "night", X.span(f, 765, 790)];
      R.lampOn.visible = true;
      R.snow.forEach((m, i) => { const r1 = (i * 0.618) % 1, r2 = (i * 0.37) % 1, p = ((f - 765) / 30 * 0.35 + r1) % 1; m.visible = true; m.position.set(-4 + r2 * 6 + 0.2 * Math.sin(p * 8 + i), 4.5 - p * 4.5, -1.5 - ((i * 0.13) % 1) * 4.5); });
      A.push({ id: "tahsin", pos: [-1.2, 0, -5.4], st: st(1, { face: "shock", arms: "up" }) });
      cam = E.camAt(f, [{ f: 765, pos: [-1.2, 1.7, -2.0], look: [-1.2, 1.7, -5.4], fov: 46 }, { f: 814, pos: [-1.2, 2.2, -1.2], look: [-1.2, 2.0, -5.4], fov: 52 }]);
      flash = flashIn(767, 6);
      dof = { focus: [-1.2, 1.6, -5.4], amount: 5 };
      break;
    }
    case "homes": {
      light = "interior";
      A.push({ id: "anne", pos: [HX - 0.55, 0, -2.6], st: st(3, { face: "happy", arms: "hold" }) });
      A.push({ id: "cocuk", pos: [HX + 0.1, 0, -2.7], st: st(4, { face: "laugh", arms: "cheer" }) });
      A.push({ id: "tahsin", pos: [HX + 0.55, 0, -2.6], st: st(1, { face: "smug", arms: "present", look: 0.7 }) });
      R.glowL.intensity = 6 + 1.5 * Math.sin(f / 5);
      const stove = f >= 895;
      cam = stove ? E.camAt(f, [{ f: 895, pos: [HX + 1.0, 1.7, 0.9], look: [HX + 2.7, 1.2, -2.9], fov: 46 }, { f: 949, pos: [HX + 1.2, 1.6, 0.4], look: [HX + 2.7, 1.2, -2.9], fov: 44 }])
        : E.camAt(f, [{ f: 815, pos: [HX + 0.1, 2.1, 2.6], look: [HX, 1.25, -2.3], fov: 44 }, { f: 894, pos: [HX + 0.2, 1.9, 1.8], look: [HX, 1.3, -2.3], fov: 42 }]);
      if (stove) FX.push({ kind: "zzz", pos: [HX + 2.9, 1.5, -2.9], size: 0.5, t: (f - 895) / 30 });
      else FX.push({ kind: "sparkle", pos: [HX, 1.1, -1.75], size: 0.6, t: t / 30 });
      dof = { focus: stove ? [HX + 2.9, 1.0, -2.9] : [HX, 1.1, -2.2], amount: 6 };
      break;
    }
    case "fact": {
      light = "interior";
      placeSteam(R.steamA, f, WX + 0.35, 1.32, 0.9, 2.2);
      A.push({ id: "tahsin", pos: [WX - 0.1, 0, -0.4], st: st(1, { face: "happy", arms: "present", prop: cup(), look: 0.4 }) });
      cam = E.camAt(f, [{ f: 950, pos: [WX + 0.2, 1.4, 3.2], look: [WX, 1.35, -0.4], fov: 42 }, { f: 1151, pos: [WX + 0.1, 1.45, 2.7], look: [WX, 1.4, -0.4], fov: 40 }]);
      const show = X.span(f, 985, 1000);
      if (show > 0) overlay = (g, w, h) => { g.save(); g.globalAlpha = show; card([["GERÇEKTE", 54, "#e8742c", 80], ["Türkiye", 118, "#fbf5ea", 190], ["kişi başı çay tüketiminde", 46, "#fbf5ea", 290], ["DÜNYA BİRİNCİSİ", 76, "#ffcf4a", 370], ["yılda 3 kilodan fazla", 46, "#2fa39a", 450]])(g, w, h); g.restore(); };
      dof = { focus: [WX, 1.4, -0.4], amount: 6 };
      break;
    }
    case "end": {
      light = "interior";
      A.push({ id: "tahsin", pos: [WX - 0.1, 0, -0.4], st: st(1, { face: "nervous", arms: "shrug", sweat: true, look: 0 }) });
      cam = E.camAt(f, [{ f: 1152, pos: [WX, 1.6, 2.2], look: [WX, 1.6, -0.4], fov: 40 }, { f: END, pos: [WX, 1.65, 1.5], look: [WX, 1.65, -0.4], fov: 36 }]);
      FX.push({ kind: "question", pos: [WX + 0.55, 2.7, -0.4], size: 0.55, t: t / 30 });
      dof = { focus: [WX, 1.6, -0.4], amount: 8 };
      break;
    }
  }
  return { cam, light, dof, actors: A, fx: FX, flash, overlay, focusPt };
}
