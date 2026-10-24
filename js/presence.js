/* Jours de présence des personnes.
 *
 * Chaque personne a ses jours de travail dans la semaine et ses absences (congés, maladie...),
 * rangés dans S.cfg.presence : { "Chloé": { jours: [1, 2, 3, 4], absences: ["2026-11-16", ...] } }
 * jours : 0 = dimanche, 1 = lundi ... 6 = samedi. Sans réglage, la personne travaille tous les jours ouvrés.
 *  - presence(p, d)      : "present", "repos" (jour non travaillé dans sa semaine) ou "absent" (absence saisie)
 *  - joursDe(p)          : jours de travail de la semaine de la personne
 *  - toggleAbsence(p, ds): ajoute ou retire une absence ce jour-là, puis enregistre les réglages
 *  - absTxt(liste)       : absences → texte « 2026-11-16 au 2026-11-20, 2026-12-24 »
 *  - parseAbs(texte)     : l'inverse ; renvoie { dates, bad } (bad : morceaux non compris)
 * La présence n'allonge pas les stations : elle sert aux alertes, à la vue Semaine et à la TV.
 */

const JOURS_NOMS = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];
const presOf = (p) => (S.cfg.presence || {})[p] || {};
const joursDe = (p) => Array.isArray(presOf(p).jours) ? presOf(p).jours : (S.cfg.ouvres ? [1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6]);
function presence(p, d) {
  if (!p) return "present";
  if (!joursDe(p).includes(d.getDay())) return "repos";
  return (presOf(p).absences || []).includes(iso(d)) ? "absent" : "present";
}
const PRES_TXT = { present: "Au travail", absent: "Absence", repos: "Repos" };
function toggleAbsence(p, ds) {
  const all = { ...(S.cfg.presence || {}) }, cur = { ...presOf(p) }, abs = new Set(cur.absences || []);
  if (abs.has(ds)) abs.delete(ds); else abs.add(ds);
  cur.absences = [...abs].sort(); all[p] = cur;
  saveCfg({ ...S.cfg, presence: all });
}
function absTxt(list) {
  const out = []; let a = null, b = null;
  [...(list || [])].sort().forEach(ds => { const d = P(ds); if (b && +add(b, 1) === +d) b = d; else { if (a) out.push([a, b]); a = b = d; } });
  if (a) out.push([a, b]);
  return out.map(([x, y]) => +x === +y ? iso(x) : `${iso(x)} au ${iso(y)}`).join(", ");
}
function parseAbs(txt) {
  const dates = new Set(), bad = [];
  String(txt || "").split(/[,;\n]/).map(x => x.trim()).filter(Boolean).forEach(part => {
    const m = part.match(/^(\d{4}-\d{2}-\d{2})(?:\s*(?:au|à|->|→)\s*(\d{4}-\d{2}-\d{2}))?$/);
    if (!m || isNaN(P(m[1])) || (m[2] && isNaN(P(m[2])))) return bad.push(part);
    const e = m[2] ? P(m[2]) : P(m[1]);
    for (let d = P(m[1]), k = 0; d <= e && k < 400; d = add(d, 1), k++) dates.add(iso(d));
  });
  return { dates: [...dates].sort(), bad };
}
