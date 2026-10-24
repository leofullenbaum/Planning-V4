/* Dates et jours ouvrés.
 *
 * Toutes les dates sont stockées en texte « AAAA-MM-JJ » et manipulées en objets Date à minuit.
 *  - iso(d)  : Date → "2026-11-02"          - P(s)   : "2026-11-02" → Date
 *  - add(d,n): d + n jours                   - diff(a,b) : nombre de jours de a à b
 *  - dd(d)   : "02/11"                       - ddy(d) : "02/11/26"
 *  - monday(d), isoWeek(d), today0() : lundi de la semaine, n° de semaine, aujourd'hui à minuit
 *  - isWork(d) : jour travaillé ? (week-ends exclus si S.cfg.ouvres)
 *  - snap(d) : premier jour travaillé à partir de d ; nextWork(d) : jour travaillé suivant
 *  - endOf(debut, n) : dernier jour d'une station de n jours travaillés
 *  - latestStart(livr, n) : entrée au plus tard pour sortir avant la livraison
 *  - workCount(a, b) : nombre de jours travaillés de a à b inclus
 *  - info(s) : { debut, fin, livr, retard } calculés pour une station
 *
 * Les jours fériés ne sont pas encore gérés (voir l'issue « Gérer les jours fériés »).
 */

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const P = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const add = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const today0 = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
const monday = (d) => add(d, -((d.getDay() + 6) % 7));
const isoWeek = (d) => { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil(((t - y0) / 864e5 + 1) / 7); };
const dd = (d) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
const ddy = (d) => `${dd(d)}/${String(d.getFullYear()).slice(2)}`;
const diff = (a, b) => Math.round((b - a) / 864e5);
const isWork = (d) => !S.cfg.ouvres || (d.getDay() !== 0 && d.getDay() !== 6);
const snap = (d) => { let r = new Date(d); while (!isWork(r)) r = add(r, 1); return r; };
const nextWork = (d) => snap(add(d, 1));
function endOf(debut, n) { let d = snap(debut), c = 1; while (c < n) { d = add(d, 1); if (isWork(d)) c++; } return d; }
function latestStart(livr, n) { let d = new Date(livr); while (!isWork(d)) d = add(d, -1); let c = 1; while (c < n) { d = add(d, -1); if (isWork(d)) c++; } return d; }
function workCount(a, b) { let c = 0; for (let d = new Date(a); d <= b; d = add(d, 1)) if (isWork(d)) c++; return c; }
const dur = (s) => Number(s.duree) || S.cfg.duree;
const placed = (s) => s.emplacement && s.debut;
const emplName = (r) => { const n = S.cfg.noms[r - 1] || String(r); return /^\d+$/.test(n) ? "Emplacement " + n : n; };
function info(s) {
  const debut = snap(P(s.debut)), fin = endOf(debut, dur(s)), livr = s.livraison ? P(s.livraison) : null;
  const retard = livr && fin > livr ? diff(livr, fin) : 0;
  return { debut, fin, livr, retard };
}
