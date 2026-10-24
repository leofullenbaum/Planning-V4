/* Gammes de montage : ordre des étapes et étape du jour.
 *
 * Une gamme (méca ou élec) est une liste d'étapes avec leur durée en heures (S.cfg.etapesMeca /
 * S.cfg.heuresMeca, idem Elec). Les étapes s'enchaînent depuis l'entrée de la station, à raison
 * de H_JOUR heures par jour travaillé. Avec plusieurs personnes du même métier sur la station,
 * chaque étape va plus vite : sa durée est divisée par le nombre de personnes (hoursFor).
 *  - stationOrder(s, role) : ordre des étapes de la station (son ordre propre « ordreMeca » /
 *    « ordreElec » s'il a été changé par glisser-déposer, sinon l'ordre standard)
 *  - gamme(s, role) : { "AAAA-MM-JJ": "étape(s) du jour" } pour toute la station
 *  - stepOf(s, role, jour) : étape affichée ce jour-là, par priorité :
 *    1. l'étape saisie pour ce jour (s.jours[jour][role]),
 *    2. l'étape fixée pour toute la station (s.etapeMeca / s.etapeElec),
 *    3. l'étape calculée par la gamme.
 *  - blocs : chaque étape de la gamme est un bloc. Champ blocsMeca / blocsElec de la station :
 *    { "étape": { p: "personne", fait: true } }. Un bloc avec une personne est fait par elle
 *    seule (heures pleines) ; sans personne, par les personnes de la station (heures divisées).
 *    Un bloc clôturé (fait) ne compte plus dans la charge de la personne.
 *  - blockSpans(s, role) : blocs de la station dans l'ordre, avec heures, jours et personne
 *  - dayParts(s, role, jour) : blocs d'un jour avec la part d'heures du jour
 *  - workOn(s, role, jour) : personne → étapes ce jour-là (pour la charge et les alertes)
 *  - progress(s) : % d'heures clôturées sur toute la station (méca + élec)
 * role vaut toujours "meca" ou "elec".
 */

const ROLE_K = { meca: "Meca", elec: "Elec" };
// Ordre des étapes d'une station : son ordre propre s'il existe, sinon la gamme standard
function stationOrder(s, role) {
  const std = (role === "elec" ? S.cfg.etapesElec : S.cfg.etapesMeca) || [], own = s["ordre" + ROLE_K[role]];
  if (!Array.isArray(own) || !own.length) return std;
  const out = own.filter(n => std.includes(n));
  std.forEach(n => { if (!out.includes(n)) out.push(n); });
  return out;
}
const customOrder = (s, role) => Array.isArray(s["ordre" + ROLE_K[role]]) && s["ordre" + ROLE_K[role]].length > 0;
function hoursOf(role, name) {
  const names = (role === "elec" ? S.cfg.etapesElec : S.cfg.etapesMeca) || [], hrs = (role === "elec" ? S.cfg.heuresElec : S.cfg.heuresMeca) || [];
  const i = names.indexOf(name); return i >= 0 && hrs[i] > 0 ? hrs[i] : H_JOUR;
}
const blocOf = (s, role, n) => (s["blocs" + ROLE_K[role]] || {})[n] || {};
// Durée d'une étape sur une station : heures pleines si le bloc a sa personne, sinon divisées par le nombre de personnes du métier
const hoursFor = (s, role, name) => blocOf(s, role, name).p ? hoursOf(role, name) : hoursOf(role, name) / Math.max(1, ppl(s[role]).length);
// La personne de ce rôle travaille-t-elle sur la station ce jour-là ? Renvoie l'étape (ou "Station") sinon ""
/* Étape d'une personne sur une station un jour donné : celle du jour si elle est saisie, sinon l'étape de la station */
/* Gamme : les étapes types s'enchaînent selon leur durée, 7 h par jour ouvré depuis l'entrée */
const H_JOUR = 7;
const gammeCache = new Map();
function gamme(s, role) {
  const std = role === "elec" ? S.cfg.etapesElec : S.cfg.etapesMeca, stdH = (role === "elec" ? S.cfg.heuresElec : S.cfg.heuresMeca) || [];
  if (!s.debut || !std.length || !std.some((_, i) => stdH[i] > 0)) return null;
  const names = stationOrder(s, role), hrs = names.map(n => hoursFor(s, role, n));
  const key = s.debut + "|" + role + "|" + S.cfg.ouvres + "|" + names.join(",") + "|" + hrs.join(",");
  if (gammeCache.has(key)) return gammeCache.get(key);
  const days = []; let t = 0;
  names.forEach((n, i) => { const h = hrs[i] > 0 ? hrs[i] : H_JOUR; const a = Math.floor(t / H_JOUR), b = Math.ceil((t + h) / H_JOUR); for (let k = a; k < b; k++) (days[k] = days[k] || []).push(n); t += h; });
  const map = {}; let d = snap(P(s.debut));
  days.forEach((l) => { map[iso(d)] = l.join(" / "); d = nextWork(d); });
  gammeCache.set(key, map); return map;
}
const baseStep = (s, role, ds) => (role === "elec" ? s.etapeElec : s.etapeMeca) || (gamme(s, role) || {})[ds] || "";
const stepOf = (s, role, ds) => { const j = s.jours && s.jours[ds] && s.jours[ds][role]; return j || baseStep(s, role, ds); };

// Blocs de la station dans l'ordre : [{ n, j, h, from, to, p, fait }] (from / to : premier et dernier jour)
function blockSpans(s, role) {
  if (!gamme(s, role)) return [];
  const d0 = snap(P(s.debut)), day = (k) => { let d = d0; for (let i = 0; i < k; i++) d = nextWork(d); return d; };
  let t = 0;
  return stationOrder(s, role).map((n, j) => {
    const h = hoursFor(s, role, n), a = Math.floor(t / H_JOUR), b = Math.max(a, Math.ceil((t + h) / H_JOUR) - 1); t += h;
    return { n, j, h, from: day(a), to: day(b), ...blocOf(s, role, n) };
  });
}
// Blocs d'une station un jour donné : [{ n, h, j, p, fait }] ; null si la station n'est pas dans l'atelier ce jour-là
function dayParts(s, role, d) {
  const i = info(s); if (!isWork(d) || d < i.debut || d > i.fin) return null;
  const ds = iso(d), own = s.jours && s.jours[ds] && s.jours[ds][role];
  if (own) return [{ n: own, own: true, ...blocOf(s, role, own) }];
  const fixed = role === "elec" ? s.etapeElec : s.etapeMeca; if (fixed) return [{ n: fixed, fixed: true, ...blocOf(s, role, fixed) }];
  if (!gamme(s, role)) return [];
  const k = workCount(i.debut, d) - 1, a = k * H_JOUR, b = a + H_JOUR, out = []; let t = 0;
  stationOrder(s, role).forEach((n, j) => { const h = hoursFor(s, role, n), x = Math.max(t, a), y = Math.min(t + h, b); if (y > x) out.push({ n, h: y - x, j, ...blocOf(s, role, n) }); t += h; });
  return out;
}
// Qui travaille sur la station ce jour-là, et sur quoi : Map personne → "étape / étape"
function workOn(s, role, d) {
  const m = new Map(); if (!placed(s)) return m;
  const parts = dayParts(s, role, d), st = ppl(s[role]); if (!parts) return m;
  if (!parts.length) { if (!gamme(s, role)) st.forEach(p => m.set(p, "Sur la station")); return m; }
  for (const q of parts) if (!q.fait) for (const p of (q.p ? [q.p] : st)) m.set(p, m.has(p) ? m.get(p) + " / " + q.n : q.n);
  return m;
}
// Avancement : heures des blocs clôturés sur les heures de la gamme (méca + élec), en %
function progress(s) {
  let all = 0, done = 0;
  for (const role of ["meca", "elec"]) for (const n of stationOrder(s, role)) { const h = hoursOf(role, n); all += h; if (blocOf(s, role, n).fait) done += h; }
  return all ? Math.round(done / all * 100) : 0;
}
