/* Charge des personnes et alertes du bandeau.
 *
 *  - chargeMap(du, au) : personne → jour → tâches ; sert aux alertes et à la vue semaine
 *  - alerts(t0) : calcule toutes les alertes sur 90 jours :
 *      over  : surcharge, une personne sur 2 tâches le même jour
 *      late  : station qui sort après sa livraison
 *      clash : deux stations sur le même emplacement en même temps
 *      nores : station sans élec ou sans méca
 *      idle  : personne sans tâche certains jours des 4 prochaines semaines (jours d'absence exclus)
 *      abs   : personne affectée à une station un jour où elle est absente ou en repos (presence.js)
 *      tight : marge de 2 jours ouvrés ou moins avant la livraison
 *  - ALERT_DEF : couleur et texte de chaque alerte (ajouter une ligne ici pour une nouvelle alerte)
 *  - openAlerts(k) : liste détaillée affichée au clic sur une alerte
 */

// Métier pourvu : des personnes sur la station, ou une personne sur chaque bloc de la gamme
const staffed = (s, role) => ppl(s[role]).length > 0 || (blockSpans(s, role).length > 0 && blockSpans(s, role).every(b => b.p));
const staff = () => {
  const set = new Map();
  (S.cfg.mecas || []).forEach(n => set.set(n, "meca")); (S.cfg.elecs || []).forEach(n => set.has(n) || set.set(n, "elec"));
  for (const s of S.stations.values()) if (placed(s)) for (const role of ["meca", "elec"]) [...ppl(s[role]), ...blockSpans(s, role).map(b => b.p).filter(Boolean)].forEach(p => set.has(p) || set.set(p, role));
  return set;
};
// Charge : personne → jour (iso) → [{ s, role, step }]
function chargeMap(from, to) {
  const map = new Map(), pl = [...S.stations.values()].filter(placed);
  for (const s of pl) {
    const i = info(s), a = i.debut > from ? i.debut : from, b = i.fin < to ? i.fin : to;
    for (let d = new Date(a); d <= b; d = add(d, 1)) for (const role of ["meca", "elec"]) {
      for (const [p, st] of workOn(s, role, d)) { if (!map.has(p)) map.set(p, {}); ((map.get(p))[iso(d)] = (map.get(p))[iso(d)] || []).push({ s, role, step: st }); }
    }
  }
  return map;
}
// Regroupe des jours ouvrés consécutifs en plages
function ranges(dates) {
  const out = []; let cur = null;
  dates.sort().forEach(ds => { const d = P(ds); if (cur && +nextWork(cur.to) === +d) cur.to = d; else { cur = { from: d, to: d }; out.push(cur); } });
  return out;
}
const plage = (r) => +r.from === +r.to ? `le ${dd(r.from)}` : `du ${dd(r.from)} au ${dd(r.to)}`;
function alerts(t0) {
  const H = 90, to = add(t0, H), ch = chargeMap(t0, to), A = { over: [], abs: [], idle: [], late: [], tight: [], nores: [], clash: [] };
  // Surcharge : deux tâches ou plus le même jour
  for (const [p, days] of ch) {
    const byKey = {};
    for (const ds in days) if (days[ds].length > 1) { const k = days[ds].map(x => x.s.id).sort().join("|"); (byKey[k] = byKey[k] || { list: days[ds], dates: [] }).dates.push(ds); }
    for (const k in byKey) ranges(byKey[k].dates).forEach(r => A.over.push({ p, r, list: byKey[k].list }));
  }
  // Absence : une tâche prévue un jour où la personne n'est pas là
  for (const [p, days] of ch) {
    const off = Object.keys(days).filter(ds => presence(p, P(ds)) !== "present");
    if (off.length) A.abs.push({ p, rs: ranges(off), n: off.length, list: [...new Map(off.flatMap(ds => days[ds]).map(t => [t.s.id, t.s])).values()] });
  }
  // Sans tâche : jours ouvrés des 4 prochaines semaines sans rien
  const horizon = []; for (let d = snap(t0); horizon.length < 20; d = nextWork(d)) horizon.push(iso(d));
  for (const [p, role] of staff()) {
    if (!(S.cfg.mecas || []).includes(p) && !(S.cfg.elecs || []).includes(p)) continue;
    const days = ch.get(p) || {}, free = horizon.filter(ds => !days[ds] && presence(p, P(ds)) === "present");
    if (free.length) A.idle.push({ p, role, rs: ranges(free), n: free.length });
  }
  const pl = [...S.stations.values()].filter(placed);
  for (const s of pl) {
    const i = info(s); if (i.fin < t0) continue;
    const m = i.marge;
    if (i.retard) A.late.push({ s, i }); else if (m !== null && m <= MARGE_FAIBLE) A.tight.push({ s, i, m });
    if (!staffed(s, "elec") || !staffed(s, "meca")) A.nores.push({ s, i });
  }
  for (let r = 1; r <= NB_EMPL; r++) {
    const l = pl.filter(s => Number(s.emplacement) === r).map(s => ({ s, i: info(s) })).sort((a, b) => a.i.debut - b.i.debut);
    for (let k = 1; k < l.length; k++) if (l[k].i.debut <= l[k - 1].i.fin && l[k].i.fin >= t0) A.clash.push({ a: l[k - 1], b: l[k], r });
  }
  return A;
}
const ALERT_DEF = [
  ["over", "bad", (n) => `${n} surcharge${n > 1 ? "s" : ""} : une personne sur 2 tâches`],
  ["abs", "bad", (n) => `${n} personne${n > 1 ? "s" : ""} prévue${n > 1 ? "s" : ""} un jour d'absence`],
  ["late", "bad", (n) => `${n} commande${n > 1 ? "s" : ""} en retard sur la livraison`],
  ["clash", "bad", (n) => `${n} chevauchement${n > 1 ? "s" : ""} d'emplacement`],
  ["nores", "warn", (n) => `${n} station${n > 1 ? "s" : ""} sans élec ou méca`],
  ["idle", "warn", (n) => `${n} personne${n > 1 ? "s" : ""} sans tâche certains jours`],
  ["tight", "orange", (n) => `${n} marge${n > 1 ? "s" : ""} faible${n > 1 ? "s" : ""} (2 j ou moins)`],
];
let lastAlerts = null;
function alertChips(t0) {
  const A = lastAlerts = alerts(t0), any = ALERT_DEF.some(([k]) => A[k].length);
  return ALERT_DEF.filter(([k]) => A[k].length).map(([k, c, f]) => `<button class="chip ${c} al" data-al="${k}">⚠ ${f(A[k].length)}</button>`).join("")
    + (any ? "" : `<span class="chip ok">Aucune alerte : chacun a sa tâche, pas de surcharge ni de retard</span>`);
}
function openAlerts(k) {
  const A = lastAlerts || alerts(today0()), lk = (s, txt) => `<button class="lnk" data-open="${esc(s.id)}">${esc(s.numero)}</button>${txt ? " " + txt : ""}`;
  const item = {
    over: (x) => `<b>${esc(x.p)}</b> ${plage(x.r)} : ${x.list.map(e => lk(e.s, +x.r.from === +x.r.to ? `<span class="mut">(${esc(e.step)})</span>` : "")).join(" et ")}`,
    abs: (x) => `<b>${esc(x.p)}</b> : ${x.n} jour${x.n > 1 ? "s" : ""} prévu${x.n > 1 ? "s" : ""} sans être là, ${x.rs.slice(0, 4).map(plage).join(", ")}${x.rs.length > 4 ? "…" : ""} · ${x.list.map(s => lk(s)).join(" ")}`,
    late: (x) => `${lk(x.s, esc(x.s.client || ""))} sort le ${ddy(x.i.fin)}, livraison le ${ddy(x.i.livr)} : <b class="bad">${x.i.retard} j de retard</b>`,
    tight: (x) => `${lk(x.s, esc(x.s.client || ""))} sort le ${ddy(x.i.fin)}, livraison le ${ddy(x.i.livr)} : marge ${x.m} j`,
    clash: (x) => `${esc(emplName(x.r))} : ${lk(x.a.s)} (sortie ${dd(x.a.i.fin)}) et ${lk(x.b.s)} (entrée ${dd(x.b.i.debut)})`,
    nores: (x) => `${lk(x.s)} : ${[!staffed(x.s, "meca") && "méca", !staffed(x.s, "elec") && "élec"].filter(Boolean).join(" et ")} à affecter`,
    idle: (x) => `<b>${esc(x.p)}</b> (${x.role === "elec" ? "élec" : "méca"}) : ${x.n} jour${x.n > 1 ? "s" : ""} sans tâche, ${x.rs.slice(0, 4).map(plage).join(", ")}${x.rs.length > 4 ? "…" : ""}`,
  };
  const help = { abs: "Sur 90 jours. Affectez une autre personne dans la fiche de la station, ou changez la présence dans la vue Semaine ou les Réglages.", over: "Changez la personne dans la fiche de la station, ou décalez l'une des stations.", idle: "Sur les 4 prochaines semaines. Affectez cette personne à une station, ou avancez une station.", late: "Avancez la station dans la vue 4 semaines ou réduisez sa durée.", tight: "Ces stations sortent à 2 jours ouvrés ou moins de leur livraison.", clash: "Deux stations occupent le même emplacement en même temps.", nores: "Ouvrez la fiche pour choisir la personne." };
  openSheet(`<h2>${ALERT_DEF.find(d => d[0] === k)[2](A[k].length)}</h2><div class="hint">${help[k]}</div>
    <ul class="alist">${A[k].map(x => `<li>${item[k](x)}</li>`).join("")}</ul>
    <div class="actions"><button class="btn" type="button" id="cancel">Fermer</button></div>`);
  $("cancel").onclick = closeSheet;
}
$("chips").addEventListener("click", (e) => { const b = e.target.closest("[data-al]"); if (b) openAlerts(b.dataset.al); });
$("sheet").addEventListener("click", (e) => { const b = e.target.closest("[data-open]"); if (b) { closeSheet(); openEdit(b.dataset.open); } });
