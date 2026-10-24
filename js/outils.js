/* Outils communs et état de l'application.
 *
 * Raccourcis utilisés partout :
 *  - $(id)   : document.getElementById(id)
 *  - esc(t)  : protège un texte avant de l'insérer dans du HTML (à utiliser sur toute donnée saisie)
 *  - sw(c)   : petit carré de couleur RAL du shelter
 *  - who(n,e): nom de la personne (ou « à affecter » en rouge) suivi de son étape
 *
 * S (l'état en mémoire) :
 *  - S.stations : Map id → station (voir docs/donnees.md pour les champs)
 *  - S.cfg      : réglages (durée standard, noms, gammes...) ; DEF donne les valeurs par défaut
 *  - S.view     : vue affichée, "sem" (semaine), "4s" (4 semaines) ou "3m" (3 mois)
 *  - S.offset   : décalage en semaines par rapport à la semaine courante (boutons ◀ ▶)
 *  - S.mode     : "planning" ou "atelier" (écran TV)
 *  - S.ready    : vrai quand les données du serveur sont arrivées
 */

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const RO_MSG = "Vous pouvez consulter ce planning mais pas le modifier.";
const NB_EMPL = 5, LW = 128;
const DEF = { duree: 17, ouvres: true, noms: ["Emplacement 1", "Emplacement 2", "Emplacement 3", "Emplacement 4", "Emplacement 5"], elecs: [], mecas: [], etapesElec: [], etapesMeca: [], heuresElec: [], heuresMeca: [], presence: {} };
/* Teintes RAL courantes (approximation écran) */
const RAL = { "1001": "#c2b078", "1015": "#e6d2b5", "3020": "#c1121c", "5010": "#004f7c", "5015": "#2874b2", "6003": "#50533c", "6011": "#6c7c59", "6014": "#47402e", "7016": "#383e42", "7032": "#b8b799", "7035": "#cbd0cc", "7040": "#9da3a6", "8017": "#45322e", "9001": "#e9e0d2", "9005": "#0a0a0a", "9010": "#f1ece1", "9016": "#f1f0ea" };
const RAL_NOMS = { "1001": "beige", "1015": "ivoire clair", "3020": "rouge signalisation", "5010": "bleu gentiane", "5015": "bleu ciel", "6003": "vert olive", "6011": "vert réséda", "6014": "olive jaune", "7016": "gris anthracite", "7032": "gris silex", "7035": "gris clair", "7040": "gris fenêtre", "8017": "brun chocolat", "9001": "blanc crème", "9005": "noir foncé", "9010": "blanc pur", "9016": "blanc signalisation" };
const hexOf = (c) => { const m = String(c || "").match(/\b(\d{4})\b/); return m && RAL[m[1]] ? RAL[m[1]] : ""; };
const sw = (c, big) => c ? `<i class="swatch${big ? " big" : ""}${hexOf(c) ? "" : " unk"}" style="${hexOf(c) ? "background:" + hexOf(c) : ""}" title="Shelter ${esc(c)}"></i>` : "";
const who = (n, e) => (n ? esc(n) : '<b class="miss">à affecter</b>') + (e ? ` <span class="stp">${esc(e)}</span>` : "");

const S = { stations: new Map(), cfg: { ...DEF }, view: "4s", offset: 0, mode: "planning", ready: false };
let db = null, readOnly = false;
