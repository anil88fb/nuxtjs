// Tuhaf Tahsin · standart kadrajlar. Her bölümde story.js'e kopyala:
//   import { shot, DOF } from "./kadraj.js";
//   cam = E.camAt(f, [{ f: f0, ...shot("genis", [x, 0, z]) }, { f: f1, ...shot("genis", [x, 0, z], { side: 0.2, push: 0.8 }) }]);
// hedef = karakterin AYAK noktası (pos). Kamera hedefin +z tarafında durur ve -z'ye bakar.
//
//  genis : mekânı kuran plan. Karakter kare yüksekliğinin ~%25-35'i, binalar/oda/gökyüzü görünür.
//  orta  : tam boy karakter + yakın çevre (masa, tezgâh, kapı). Karakter ~%45-55.
//  yakin : bel üstü. Sadece kanca (ilk 2 sn) ve final tepkisi için; bölüm başına en fazla 2.
export const SHOTS = {
  genis: { dist: 8.5, h: 2.8, fov: 52, lookY: 1.3 },
  orta: { dist: 5.0, h: 2.0, fov: 46, lookY: 1.15 },
  yakin: { dist: 2.4, h: 1.65, fov: 40, lookY: 1.5 },
};
// Alan derinliği: geniş/orta planda arka plan okunabilir kalsın.
export const DOF = { genis: 1.5, orta: 2.5, yakin: 6 };

/** kind: genis|orta|yakin · o.side: yatay açı (radyan, + sağdan) · o.push: 0..1 yaklaşma · o.dy: kamera yüksekliği ek · o.dx: hedefi kaydır */
export function shot(kind, target, o = {}) {
  const s = SHOTS[kind], side = o.side || 0, d = s.dist * (1 - 0.18 * (o.push || 0)) * (o.scale || 1);
  const tx = target[0] + (o.dx || 0), tz = target[2];
  return {
    pos: [tx + Math.sin(side) * d, s.h + (o.dy || 0), tz + Math.cos(side) * d],
    look: [tx, s.lookY + (o.lookDy || 0), tz],
    fov: s.fov + (o.fov || 0),
  };
}
export const dof = (kind, focus) => ({ focus, amount: DOF[kind] });
