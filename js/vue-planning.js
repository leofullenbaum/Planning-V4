/* Vues « 4 semaines » et « 3 mois » : une ligne par emplacement, une barre par station.
 *
 * render() est la fonction centrale : elle redessine la barre du haut (puces et alertes),
 * le carnet de commandes, puis la vue choisie. Elle délègue à renderWeek() (vue-semaine.js)
 * et à renderAtelier() (vue-atelier.js). Il suffit de l'appeler après toute modification.
 * geo garde l'échelle affichée (début, nombre de jours, largeur d'un jour) pour le glisser-déposer.
 */

let geo = null;
function range() {
  const days = S.view === "4s" ? 28 : 91;
  const start = add(monday(today0()), (S.offset - 1) * 7);
  const wrapW = Math.max(320, $("gwrap").clientWidth - 2);
  const dayW = Math.max(S.view === "4s" ? 34 : 8, (wrapW - LW) / days);
  return { start, days, dayW };
}
function render() {
  if ((drag && drag.started) || (sdrag && sdrag.started)) return;
  if (S.mode === "atelier") return renderAtelier();
  const t0 = today0(), { start, days, dayW } = range(), end = add(start, days - 1);
  geo = { start, days, dayW };
  const idx = (d) => diff(start, d);
  $("periode").textContent = `${dd(start)} au ${ddy(end)}`;
  $("wkno").textContent = `S${isoWeek(start)} à S${isoWeek(end)}`;
  $("v4s").setAttribute("aria-pressed", S.view === "4s"); $("v3m").setAttribute("aria-pressed", S.view === "3m"); $("vsem").setAttribute("aria-pressed", S.view === "sem");
  $("regle").textContent = `· Une station reste ${S.cfg.duree} jours ${S.cfg.ouvres ? "ouvrés (week-ends exclus)" : "calendaires"}.`;

  const all = [...S.stations.values()], pl = all.filter(placed), carnet = all.filter(s => !placed(s));
  // Alertes : retards et chevauchements
  const clash = new Set();
  for (let r = 1; r <= NB_EMPL; r++) {
    const l = pl.filter(s => Number(s.emplacement) === r).map(s => ({ s, ...info(s) })).sort((a, b) => a.debut - b.debut);
    for (let i = 1; i < l.length; i++) if (l[i].debut <= l[i - 1].fin) { clash.add(l[i].s.id); clash.add(l[i - 1].s.id); }
  }
  const lates = pl.filter(s => info(s).retard > 0);
  const manque = pl.filter(s => { const i = info(s); return i.fin >= t0 && i.debut <= add(t0, 91) && (!s.elec || !s.meca); });
  const horizon = add(t0, 91), inH = pl.filter(s => { const i = info(s); return i.fin >= t0 && i.debut <= horizon; });
  $("chips").innerHTML = `<span class="chip">${inH.length} station${inH.length > 1 ? "s" : ""} sur les 3 prochains mois</span><span class="chip">${carnet.length} commande${carnet.length > 1 ? "s" : ""} à placer</span>` + alertChips(t0);

  // Carnet
  carnet.sort((a, b) => (a.livraison || "9").localeCompare(b.livraison || "9"));
  $("ccount").textContent = carnet.length ? String(carnet.length) : "";
  $("carnet").innerHTML = carnet.length ? carnet.map(s => {
    const ls = s.livraison ? latestStart(P(s.livraison), dur(s)) : null, late = ls && ls < t0;
    return `<div class="oc${late ? " late" : ""}" data-id="${esc(s.id)}" tabindex="0">
      <div class="t"><span class="nm">${sw(s.couleur)}${esc(s.numero)}</span><span>${dur(s)} j</span></div>
      ${s.client ? `<div class="m">${esc(s.client)}</div>` : ""}
      <div class="m">Livraison <b>${s.livraison ? ddy(P(s.livraison)) : "?"}</b>${ls ? ` · entrée au plus tard ${late ? "<b>dépassée</b>" : dd(ls)}` : ""}</div></div>`;
  }).join("") : `<div class="hint" style="padding:8px">${S.ready ? "Tout le carnet est placé." : "Chargement…"}</div>`;

  $("oldleg").classList.toggle("nolg", S.view === "sem");
  $("app").classList.toggle("wide", S.view === "sem");
  if (S.lastView !== S.view) { S.lastView = S.view; $("gwrap").scrollLeft = 0; }
  $("gt").className = "gt";
  if (S.view === "sem") return renderWeek(t0);
  // Échelle
  const W = days * dayW;
  let mo = "", wk = "", dy = "";
  for (let i = 0; i < days;) {
    const d = add(start, i), last = new Date(d.getFullYear(), d.getMonth() + 1, 0), n = Math.min(days - i, diff(d, last) + 1);
    mo += `<div class="sg mo" style="left:${i * dayW}px;width:${n * dayW}px">${esc(d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }))}</div>`; i += n;
  }
  for (let i = 0; i < days; i += 7) { const d = add(start, i); wk += `<div class="sg" style="left:${i * dayW}px;width:${7 * dayW}px">S${isoWeek(d)}${dayW * 7 > 70 ? ` · ${dd(d)}` : ""}</div>`; }
  if (S.view === "4s") for (let i = 0; i < days; i++) {
    const d = add(start, i), we = d.getDay() === 0 || d.getDay() === 6, td = +d === +t0;
    dy += `<div class="sg dd${we ? " we" : ""}${td ? " td" : ""}" style="left:${i * dayW}px;width:${dayW}px">${"DLMMJVS"[d.getDay()]}${d.getDate()}</div>`;
  }
  const rh = S.view === "4s" ? 78 : 58;
  const weBg = `repeating-linear-gradient(to right, transparent 0 ${5 * dayW}px, color-mix(in srgb, var(--muted) 9%, transparent) ${5 * dayW}px ${7 * dayW}px)`;
  let rows = "";
  for (let r = 1; r <= NB_EMPL; r++) {
    const list = pl.filter(s => Number(s.emplacement) === r);
    const busy = list.filter(s => { const i = info(s); return i.debut <= t0 && t0 <= i.fin; })[0];
    let lane = "";
    for (const s of list) {
      const i = info(s), si = idx(i.debut), ei = idx(i.fin);
      if (s.livraison && i.livr) { const li = idx(i.livr); if (li >= 0 && li < days) lane += `<div class="livr${i.retard ? "" : " ok"}" style="left:${(li + 1) * dayW}px" title="Livraison ${esc(s.numero)} : ${ddy(i.livr)}"></div>`; }
      if (ei < 0 || si >= days) continue;
      const a = Math.max(si, 0), b = Math.min(ei + 1, days);
      const cls = (i.fin < t0 ? " past" : i.debut <= t0 ? " now" : "") + (i.retard ? " late" : "") + (clash.has(s.id) ? " clash" : "");
      let ticks = "";
      if (S.view === "4s") {
        let k = 0, every = dayW >= 30 ? 1 : 5;
        for (let d = new Date(i.debut); d <= i.fin; d = add(d, 1)) { if (!isWork(d)) continue; k++; const di = idx(d); if (di >= a && di < b && (k === 1 || k % every === 0 || k === dur(s))) ticks += `<i style="left:${(di - a + .5) * dayW}px">J${k}</i>`; }
      }
      const warn = clash.has(s.id) ? "Chevauchement" : i.retard ? `Retard ${i.retard} j` : "";
      lane += `<div class="sbar${cls}${ticks ? " has-ticks" : ""}" data-id="${esc(s.id)}" tabindex="0" style="left:${a * dayW + 1}px;width:${(b - a) * dayW - 2}px" title="${esc(s.numero)}${s.couleur ? " · shelter " + esc(s.couleur) : ""} · entrée ${ddy(i.debut)} · sortie ${ddy(i.fin)}${s.livraison ? " · livraison " + ddy(i.livr) : ""} · élec ${esc(s.elec || "à affecter")}${s.etapeElec ? " (" + esc(s.etapeElec) + ")" : ""} · méca ${esc(s.meca || "à affecter")}${s.etapeMeca ? " (" + esc(s.etapeMeca) + ")" : ""}">
        <span class="bn">${sw(s.couleur)}${esc(s.numero)}${s.client ? ` <span class="bc">${esc(s.client)}</span>` : ""}</span>
        <span class="bc">${dd(i.debut)} → ${dd(i.fin)} · <span class="act">É</span> ${who(s.elec, s.etapeElec)} · <span class="act">M</span> ${who(s.meca, s.etapeMeca)}${warn ? ` <span class="bw">${warn}</span>` : ""}</span>${ticks ? `<span class="ticks">${ticks}</span>` : ""}</div>`;
    }
    rows += `<div class="grow"><div class="glabel"><b>${esc(S.cfg.noms[r - 1] || "Emplacement " + r)}</b><span>${busy ? esc(busy.numero) + " en cours" : "Libre aujourd'hui"}</span></div>
      <div class="glane" data-row="${r}" style="width:${W}px;background:${weBg}">${lane}</div></div>`;
  }
  const ti = idx(t0);
  $("gt").style.cssText = `--lw:${LW}px;--rh:${rh}px;width:${LW + W}px`;
  $("gt").innerHTML = `<div class="ghead"><div class="corner"></div><div class="gscale" style="width:${W}px">
      <div class="lvl">${mo}</div><div class="lvl">${wk}</div>${dy ? `<div class="lvl">${dy}</div>` : ""}</div></div>${rows}
    ${ti >= 0 && ti < days ? `<div class="today-line" style="left:${LW + (ti + .5) * dayW}px" title="Aujourd'hui"></div>` : ""}`;
}
