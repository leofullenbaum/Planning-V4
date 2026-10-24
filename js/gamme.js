/* Gammes de montage : ordre des étapes et étape du jour.
 *
 * Une gamme (méca ou élec) est une liste d'étapes avec leur durée en heures (S.cfg.etapesMeca /
 * S.cfg.heuresMeca, idem Elec). Les étapes s'enchaînent depuis l'entrée de la station, à raison
 * de H_JOUR heures par jour travaillé.
 *  - stationOrder(s, role) : ordre des étapes de la station (son ordre propre « ordreMeca » /
 *    « ordreElec » s'il a été changé par glisser-déposer, sinon l'ordre standard)
 *  - gamme(s, role) : { "AAAA-MM-JJ": "étape(s) du jour" } pour toute la station
 *  - stepOf(s, role, jour) : étape affichée ce jour-là, par priorité :
 *    1. l'étape saisie pour ce jour (s.jours[jour][role]),
 *    2. l'étape fixée pour toute la station (s.etapeMeca / s.etapeElec),
 *    3. l'étape calculée par la gamme.
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
// La personne de ce rôle travaille-t-elle sur la station ce jour-là ? Renvoie l'étape (ou "Station") sinon ""
/* Étape d'une personne sur une station un jour donné : celle du jour si elle est saisie, sinon l'étape de la station */
/* Gamme : les étapes types s'enchaînent selon leur durée, 7 h par jour ouvré depuis l'entrée */
const H_JOUR = 7;
const gammeCache = new Map();
function gamme(s, role) {
  const std = role === "elec" ? S.cfg.etapesElec : S.cfg.etapesMeca, stdH = (role === "elec" ? S.cfg.heuresElec : S.cfg.heuresMeca) || [];
  if (!s.debut || !std.length || !std.some((_, i) => stdH[i] > 0)) return null;
  const names = stationOrder(s, role), hrs = names.map(n => hoursOf(role, n));
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
