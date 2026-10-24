/* Vue « Semaine » (vue par défaut) : les 5 emplacements toujours à la même place,
 * une ligne méca et une ligne élec, et toutes les étapes de chaque jour avec leurs heures.
 *
 *  - renderWeek(t0) : dessine le tableau ; un seul bloc par jour et par station, les étapes du jour
 *    s'y suivent de gauche à droite (largeur selon les heures) ; une case est rouge si la personne a une autre tâche
 *  - glisser une étape sur une autre de la même station change son ordre de montage
 *    (champ ordreMeca / ordreElec de la station), et toute la suite se décale
 *  - openDay() : fiche d'un jour (étape du jour, étape de la station, ordre standard)
 *  - bandeau Équipe (teamBar) : glisser une personne sur une ligne Méca ou Élec l'ajoute (3 maximum
 *    par métier, champ meca / elec « A, B, C ») ; depuis une autre station elle est déplacée ;
 *    × ou dépôt sur le bandeau la retire. Plus de monde = heures de la gamme divisées (gamme.js).
 *  - un clic sur un bloc ouvre sa fiche (personne, clôture, blocs.js) ; glisser une personne
 *    sur un bloc la met sur ce bloc seulement
 *  - la colonne du jour est en couleur avec « Aujourd'hui »
 *  - presTable() : tableau « Présence de l'équipe » sous le planning ; un clic sur un jour
 *    ajoute ou retire une absence (presence.js). Une case est aussi rouge si la personne
 *    affectée est absente ou en repos ce jour-là.
 */

const fmtHr = (h) => String(Math.round(h * 10) / 10).replace(".", ",") + " h";
const roleOf = (p) => (S.cfg.mecas || []).includes(p) ? "meca" : (S.cfg.elecs || []).includes(p) ? "elec" : "";
const jourTxt = (d) => esc(d.toLocaleDateString("fr-FR", { weekday: "long" }));
// Personnes d'une station pour un métier : pastilles à glisser, avec × pour retirer, et zone « + » tant qu'il reste de la place
function ppChips(s, role) {
  const l = ppl(s[role]);
  return l.map(p => `<span class="pp ${role}" data-p="${esc(p)}" data-id="${esc(s.id)}" data-role="${role}" title="Glisser vers une autre station, ou vers le bandeau Équipe pour retirer">${esc(p)}<button class="px" type="button" data-p="${esc(p)}" data-id="${esc(s.id)}" data-role="${role}" aria-label="Retirer ${esc(p)}">×</button></span>`).join("")
    + (l.length < MAX_PPL ? `<span class="pz${l.length ? "" : " miss"}" data-id="${esc(s.id)}" data-role="${role}">${l.length ? "+" : "Glisser une personne ici"}</span>` : "");
}
// Bandeau « Équipe » : chaque personne, à glisser sur une ligne Méca ou Élec ; on voit qui est libre
function teamBar(days, chw, t0) {
  const inWeek = days.some(d => +d === +t0), ref = inWeek ? t0 : null;
  const group = (role, lab) => {
    const list = (role === "elec" ? S.cfg.elecs : S.cfg.mecas) || [];
    if (!list.length) return `<div class="tg-g"><b class="tg-l">${lab}</b><span class="hint">Ajoutez des personnes dans Réglages.</span></div>`;
    return `<div class="tg-g"><b class="tg-l">${lab}</b>${list.map(p => {
      const c = chw.get(p) || {};
      let st, cls;
      if (ref) {
        const pr = presence(p, ref), t = c[iso(ref)] || [];
        if (pr !== "present") { st = PRES_TXT[pr]; cls = "off"; }
        else if (!t.length) { st = "Libre aujourd'hui"; cls = "free"; }
        else { st = [...new Set(t.map(x => x.s.numero))].join(" + "); cls = t.length > 1 ? "over" : "busy"; }
      } else {
        const free = days.filter(d => presence(p, d) === "present" && !(c[iso(d)] || []).length).length;
        st = free ? `${free} j libre${free > 1 ? "s" : ""}` : "Occupé toute la semaine"; cls = free ? "free" : "busy";
      }
      return `<span class="pp pal ${role} ${cls}" data-p="${esc(p)}" title="Glisser sur une ligne ${lab} d'une station">${esc(p)}<small>${esc(st)}</small></span>`;
    }).join("")}</div>`;
  };
  return `<div class="team" id="team"><span class="tg-t">Équipe</span>${group("meca", "Méca")}${group("elec", "Élec")}<span class="hint tg-h">Glissez une personne sur une station (3 maximum par métier). Glissez-la ici pour la retirer.</span></div>`;
}
function renderWeek(t0) {
  const start = add(monday(t0), S.offset * 7), days = []; for (let d = new Date(start); days.length < (S.cfg.ouvres ? 5 : 7); d = add(d, 1)) days.push(new Date(d));
  const end = days[days.length - 1];
  $("periode").textContent = `${dd(days[0])} au ${ddy(end)}`;
  $("wkno").textContent = `Semaine ${isoWeek(start)}`;
  const pl = [...S.stations.values()].filter(placed), chw = chargeMap(days[0], end);
  const tdc = (d) => +d === +t0 ? "td " : "";
  let clashes = 0;
  let h = teamBar(days, chw, t0) + `<table class="wk fix"><thead><tr><th class="who">Emplacement</th>${days.map(d => `<th class="${tdc(d)}">${+d === +t0 ? `<span class="auj">Aujourd'hui</span>` : ""}${jourTxt(d)} <span>${dd(d)}</span></th>`).join("")}</tr></thead>`;
  for (let r = 1; r <= NB_EMPL; r++) {
    const list = pl.filter(s => Number(s.emplacement) === r).map(s => ({ s, i: info(s) })).filter(x => x.i.debut <= end && x.i.fin >= days[0]).sort((a, b) => a.i.debut - b.i.debut);
    const multi = list.length > 1;
    let head = list.map(({ s, i }) => `<span class="st">${sw(s.couleur)}<b>${esc(s.numero)}</b>${s.client ? ` ${esc(s.client)}` : ""}<span class="gi">entrée ${dd(i.debut)} · sortie ${dd(i.fin)}${i.livr ? ` · livraison ${dd(i.livr)}` : ""}</span>${i.marge !== null ? `<b class="mg${margeCls(i) ? " " + margeCls(i) : ""}">${margeTxt(i)}</b>` : ""}<button class="lnk bl" type="button" data-blocs="${esc(s.id)}">Blocs · ${s.avancement === "" || s.avancement == null ? progress(s) : s.avancement} %</button></span>`).join("");
    if (!list.length) { const nx = pl.filter(s => Number(s.emplacement) === r).map(s => ({ s, i: info(s) })).filter(x => x.i.debut > end).sort((a, b) => a.i.debut - b.i.debut)[0]; head = `<span class="gi">Libre cette semaine${nx ? ` · prochaine : ${esc(nx.s.numero)} le ${dd(nx.i.debut)}` : ""}</span>`; }
    h += `<tbody class="em"><tr class="grp"><th colspan="${days.length + 1}"><span class="a-no sm">${r}</span>${head}</th></tr>`;
    for (const [role, lab] of [["meca", "Méca"], ["elec", "Élec"]]) {
      h += `<tr class="rw ${role}"><th class="who"><span class="rl">${lab}</span>${list.map(({ s }) => `<span class="ppg">${multi ? `<span class="tag">${esc(s.numero)}</span>` : ""}${ppChips(s, role)}</span>`).join("")}</th>`;
      for (const d of days) {
        const ds = iso(d), here = list.map(x => ({ ...x, parts: dayParts(x.s, role, d) })).filter(x => x.parts);
        if (!here.length) { h += `<td class="${tdc(d)}off"></td>`; continue; }
        let cell = "", over = [];
        for (const x of here) {
          for (const [p] of workOn(x.s, role, d)) {
            const tasks = (chw.get(p) || {})[ds] || [];
            if (x.parts.length && tasks.length > 1) over.push(`${esc(p)} aussi sur ${tasks.filter(t => t.s.id !== x.s.id).map(t => esc(t.s.numero)).join(", ")}`);
            if (presence(p, d) !== "present") over.push(`${esc(p)} : ${PRES_TXT[presence(p, d)].toLowerCase()} ce jour`);
          }
          const n = ppl(x.s[role]).length;
          cell += `<div class="dc" data-id="${esc(x.s.id)}" data-role="${role}" data-date="${ds}"><div class="dh">${multi ? `<span class="tag">${esc(x.s.numero)}</span>` : ""}<span class="jj">J${workCount(x.i.debut, d)}</span>${n > 1 ? `<span class="nb">×${n}</span>` : ""}${!n ? `<span class="nb miss">à affecter</span>` : ""}</div>`
            + (x.parts.length ? `<div class="bk">${x.parts.map(q => `<div class="si${q.own ? " own" : ""}${q.own || q.fixed ? " lock" : ""}${q.fait ? " done" : ""}" data-n="${esc(q.n)}" ${q.j !== undefined ? `data-j="${q.j}"` : ""} style="flex:${q.h || H_JOUR} 1 0" title="${esc(q.n)}${q.h ? " · " + fmtHr(q.h) : ""}${q.p ? " · " + esc(q.p) : ""}${q.fait ? " · clôturé" : ""} · cliquer pour affecter une personne ou clôturer${q.j !== undefined ? ", glisser pour changer l'ordre" : ""}"><span class="nm">${q.fait ? "✓ " : ""}${esc(q.n)}</span><span class="hh">${q.h ? fmtHr(q.h) : ""}${q.p ? ` · <b class="bp">${esc(q.p)}</b>` : ""}</span></div>`).join("")}</div>`
              : `<div class="bk"><div class="si none">${gamme(x.s, role) ? "Gamme terminée" : "Étape à définir"}</div></div>`) + `</div>`;
        }
        if (over.length) clashes++;
        h += `<td class="${tdc(d)}${over.length ? "clash" : ""}">${cell}${over.length ? `<span class="cw">⚠ ${over.join(" · ")}</span>` : ""}</td>`;
      }
      h += `</tr>`;
    }
    h += `</tbody>`;
  }
  h += `</table>` + presTable(days, chw, t0);
  $("gt").style.cssText = ""; $("gt").innerHTML = h;
  $("regle").textContent = `· Glissez une personne du bandeau Équipe sur une station. Glissez une étape sur une autre pour changer l'ordre de montage : la suite se décale. Cliquez sur un jour pour changer son étape.${clashes ? ` ${clashes} case${clashes > 1 ? "s" : ""} en rouge : la personne a une autre tâche ou n'est pas là ce jour-là.` : ""}`;
}
// Présence de l'équipe : une ligne par personne, méca puis élec
function presTable(days, chw, t0) {
  const people = [...staff()].filter(([p]) => (S.cfg.mecas || []).includes(p) || (S.cfg.elecs || []).includes(p)).sort((a, b) => a[1] === b[1] ? 0 : a[1] === "meca" ? -1 : 1);
  if (!people.length) return "";
  let h = `<table class="wk pres"><thead><tr><th class="who">Présence de l'équipe</th>${days.map(d => `<th class="${+d === +t0 ? "td" : ""}">${esc(d.toLocaleDateString("fr-FR", { weekday: "long" }))} <span>${dd(d)}</span></th>`).join("")}</tr></thead><tbody>`;
  for (const [p, role] of people) {
    h += `<tr><th class="who"><span class="rl">${role === "elec" ? "Élec" : "Méca"}</span><span class="pn">${esc(p)}</span></th>`;
    for (const d of days) {
      const ds = iso(d), st = presence(p, d), tasks = (chw.get(p) || {})[ds] || [];
      const nums = [...new Set(tasks.map(t => t.s.numero))];
      h += `<td class="pc ${st}${+d === +t0 ? " td" : ""}${st !== "present" && nums.length ? " clash" : ""}" data-p="${esc(p)}" data-date="${ds}" title="${st === "repos" ? "Jour non travaillé (Réglages)" : "Cliquer pour " + (st === "absent" ? "retirer l'absence" : "saisir une absence")}">`
        + `<span class="ps">${PRES_TXT[st]}</span>${nums.length ? nums.map(n => `<span class="tag">${esc(n)}</span>`).join(" ") : st === "present" ? `<span class="none">Sans tâche</span>` : ""}</td>`;
    }
    h += `</tr>`;
  }
  return h + `</tbody></table>`;
}
// Clic sur un jour : fiche du jour ; clic dans le tableau de présence : absence ce jour-là
$("gt").addEventListener("click", (e) => {
  if (sdragDone) { sdragDone = false; return; }
  const x = e.target.closest(".px"); if (x) return removePerson(x.dataset.id, x.dataset.role, x.dataset.p);
  const bl = e.target.closest("[data-blocs]"); if (bl) return openBlocs(bl.dataset.blocs);
  const si = e.target.closest(".wk.fix .si[data-n]"); if (si) { const c = si.closest(".dc"); return openBloc(c.dataset.id, c.dataset.role, si.dataset.n); }
  const c = e.target.closest(".wk.fix .dc"); if (c) return openDay(c.dataset.id, c.dataset.role, c.dataset.date);
  const pc = e.target.closest(".wk.pres td.pc"); if (!pc || guard()) return;
  const p = pc.dataset.p, d = P(pc.dataset.date);
  if (presence(p, d) === "repos") return toast(`${p} ne travaille pas le ${d.toLocaleDateString("fr-FR", { weekday: "long" })} : changez ses jours dans Réglages.`);
  const was = presence(p, d); toggleAbsence(p, pc.dataset.date); render();
  toast(was === "absent" ? `${p} : absence du ${dd(d)} retirée.` : `${p} : absence enregistrée le ${dd(d)}.`);
});
// Glisser une étape sur une autre : change l'ordre de montage de la station
let sdrag = null, sdragDone = false;
document.addEventListener("pointerdown", (e) => {
  if (S.mode !== "planning" || S.view !== "sem" || e.button !== 0) return;
  const it = e.target.closest(".wk.fix .si[data-j]"); if (!it) return;
  const c = it.closest(".dc"); sdrag = { it, id: c.dataset.id, role: c.dataset.role, j: Number(it.dataset.j), x: e.clientX, y: e.clientY, started: false };
});
function sTarget(g, e) {
  const el = document.elementFromPoint(e.clientX, e.clientY), it = el?.closest(".wk.fix .si[data-j]"), c = (it || el)?.closest(".wk.fix .dc");
  if (!c || c.dataset.id !== g.id || c.dataset.role !== g.role) return null;
  const t = it || c.querySelector(".si[data-j]"); return t ? { el: t, j: Number(t.dataset.j) } : null;
}
document.addEventListener("pointermove", (e) => {
  const g = sdrag; if (!g) return;
  if (!g.started) {
    if (Math.hypot(e.clientX - g.x, e.clientY - g.y) < 6) return;
    if (readOnly) { sdrag = null; toast(RO_MSG); return; }
    g.started = true; g.ghost = g.it.cloneNode(true); g.ghost.classList.add("ghost-si"); g.ghost.style.width = g.it.offsetWidth + "px"; document.body.appendChild(g.ghost); g.it.classList.add("src");
  }
  e.preventDefault();
  g.ghost.style.left = e.clientX + 8 + "px"; g.ghost.style.top = e.clientY + 8 + "px";
  const t = sTarget(g, e); document.querySelectorAll(".si.tg").forEach(x => x.classList.remove("tg"));
  if (t && t.j !== g.j) t.el.classList.add("tg");
});
function sEnd(ok, e) {
  const g = sdrag; sdrag = null; if (!g || !g.started) return;
  sdragDone = true; setTimeout(() => sdragDone = false, 50);
  g.ghost.remove(); document.querySelectorAll(".si.tg, .si.src").forEach(x => x.classList.remove("tg", "src"));
  const s = S.stations.get(g.id), t = ok && s ? sTarget(g, e) : null;
  if (t && t.j !== g.j) {
    const order = [...stationOrder(s, g.role)], [it] = order.splice(g.j, 1); order.splice(t.j, 0, it);
    patchS(g.id, { ["ordre" + ROLE_K[g.role]]: order });
    toast(`${s.numero} : « ${it} » passe en position ${t.j + 1} sur ${order.length}. Les étapes suivantes sont décalées.`);
  }
  render();
}
document.addEventListener("pointerup", (e) => sEnd(true, e));
document.addEventListener("pointercancel", (e) => sEnd(false, e));

// Personnes : glisser une pastille du bandeau Équipe (ajoute) ou d'une station (déplace) ; × ou dépôt sur le bandeau : retire
function setPeople(id, role, list) { patchS(id, { [role]: list.join(", ") }); }
function removePerson(id, role, p) {
  const s = S.stations.get(id); if (!s || guard()) return;
  setPeople(id, role, ppl(s[role]).filter(x => x !== p)); render();
  toast(`${p} n'est plus sur ${s.numero}.`);
}
function pTarget(e) {
  const el = document.elementFromPoint(e.clientX, e.clientY); if (!el) return null;
  if (el.closest("#team")) return { team: true, el: el.closest("#team") };
  const si = el.closest(".wk.fix .si[data-n]");
  if (si) { const c = si.closest(".dc"); return { id: c.dataset.id, role: c.dataset.role, n: si.dataset.n, el: si }; }
  const z = el.closest(".wk.fix .pz, .wk.fix .dc, .wk.fix .pp[data-id]");
  if (z) return { id: z.dataset.id, role: z.dataset.role, el: z.matches(".pp") ? z.closest(".who") : z };
  const who = el.closest(".wk.fix tr.rw .who");
  if (who) { const g = who.querySelectorAll(".ppg"); if (g.length === 1) { const t = g[0].querySelector("[data-id]"); if (t) return { id: t.dataset.id, role: t.dataset.role, el: who }; } }
  return null;
}
function dropPerson(g, t) {
  const p = g.p, s = S.stations.get(t.id); if (!s) return;
  const want = roleOf(p);
  if (want && want !== t.role) return toast(`${p} est ${want === "elec" ? "élec" : "méca"} : glissez cette personne sur une ligne ${want === "elec" ? "Élec" : "Méca"}.`);
  if (t.n) { if (guard()) return; setBloc(s.id, t.role, t.n, { p }); render(); return toast(`${s.numero} : ${p} fait le bloc « ${t.n} ».`); }
  if (g.fromId === t.id && g.fromRole === t.role) return;
  const cur = ppl(s[t.role]);
  if (cur.includes(p)) return toast(`${p} est déjà sur ${s.numero}.`);
  if (cur.length >= MAX_PPL) return toast(`${MAX_PPL} personnes maximum par métier sur une station.`);
  if (guard()) return;
  if (g.fromId) { const f = S.stations.get(g.fromId); if (f) setPeople(f.id, g.fromRole, ppl(f[g.fromRole]).filter(x => x !== p)); }
  setPeople(s.id, t.role, [...cur, p]);
  render();
  const i = info(s), busy = [...S.stations.values()].filter(o => o.id !== s.id && placed(o) && ppl(o[t.role]).includes(p) && info(o).debut <= i.fin && info(o).fin >= i.debut).map(o => o.numero);
  toast(`${s.numero} : ${p} rejoint l'équipe ${t.role === "elec" ? "élec" : "méca"}${g.fromId ? ` (venant de ${S.stations.get(g.fromId)?.numero || ""})` : ""}, ${cur.length + 1} personne${cur.length ? "s" : ""} au total.${busy.length ? ` Attention : aussi sur ${busy.join(", ")} sur la même période.` : ""}`);
}
let pdrag = null;
document.addEventListener("pointerdown", (e) => {
  if (S.mode !== "planning" || S.view !== "sem" || e.button !== 0 || e.target.closest(".px")) return;
  const it = e.target.closest("#gt .pp"); if (!it) return;
  pdrag = { it, p: it.dataset.p, fromId: it.dataset.id || "", fromRole: it.dataset.role || "", x: e.clientX, y: e.clientY, started: false };
});
document.addEventListener("pointermove", (e) => {
  const g = pdrag; if (!g) return;
  if (!g.started) {
    if (Math.hypot(e.clientX - g.x, e.clientY - g.y) < 6) return;
    if (readOnly) { pdrag = null; toast(RO_MSG); return; }
    g.started = true; g.ghost = document.createElement("span"); g.ghost.className = `pp ghost ${roleOf(g.p)}`; g.ghost.textContent = g.p; document.body.appendChild(g.ghost); g.it.classList.add("src");
  }
  e.preventDefault();
  g.ghost.style.left = e.clientX + 10 + "px"; g.ghost.style.top = e.clientY + 10 + "px";
  document.querySelectorAll("#gt .drop").forEach(x => x.classList.remove("drop"));
  const t = pTarget(e); if (t && (!t.team || g.fromId)) t.el.classList.add("drop");
});
function pEnd(ok, e) {
  const g = pdrag; pdrag = null; if (!g || !g.started) return;
  sdragDone = true; setTimeout(() => sdragDone = false, 50);
  g.ghost.remove(); g.it.classList.remove("src"); document.querySelectorAll("#gt .drop").forEach(x => x.classList.remove("drop"));
  const t = ok ? pTarget(e) : null;
  if (t && t.team) { if (g.fromId) removePerson(g.fromId, g.fromRole, g.p); return; }
  if (t) dropPerson(g, t);
}
document.addEventListener("pointerup", (e) => pEnd(true, e));
document.addEventListener("pointercancel", (e) => pEnd(false, e));

function openDay(id, role, ds) {
  const s = S.stations.get(id); if (!s) return;
  const lst = role === "elec" ? S.cfg.etapesElec : S.cfg.etapesMeca, own = (s.jours && s.jours[ds] && s.jours[ds][role]) || "";
  const label = role === "elec" ? "élec" : "méca", d = P(ds);
  openSheet(`<h2>${esc(s.numero)} · ${label}</h2>
    <div class="hint">${esc(s[role] || "Personne non affectée")} · ${esc(d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }))} · emplacement ${esc(s.emplacement)}</div>
    <form id="dForm" class="fields">
      <label class="f full">Étape ${label} ce jour-là<input id="d-step" list="dl" value="${esc(own || stepOf(s, role, ds))}"><datalist id="dl">${lst.map(x => `<option value="${esc(x)}">`).join("")}</datalist></label>
      <div class="hint full">Sans étape du jour, c'est ${(role === "elec" ? s.etapeElec : s.etapeMeca) ? "l'étape fixée pour la station" : "la gamme"} qui s'affiche : « ${esc(baseStep(s, role, ds) || "aucune")} ».</div>
      <div class="actions full">
        <button class="btn primary" type="submit">Enregistrer pour ce jour</button>
        <button class="btn" type="button" id="dAll">Utiliser pour toute la station</button>
        ${own ? '<button class="btn" type="button" id="dClr">Revenir à l\'étape de la station</button>' : ""}
        ${customOrder(s, role) ? '<button class="btn" type="button" id="dStd">Remettre l\'ordre standard des étapes</button>' : ""}
        <button class="btn" type="button" id="cancel">Annuler</button>
      </div></form>`);
  const setDay = (v) => { const j = { ...(s.jours || {}) }; j[ds] = { ...(j[ds] || {}), [role]: v }; patchS(id, { jours: j }); };
  $("cancel").onclick = closeSheet;
  $("dForm").onsubmit = (e) => { e.preventDefault(); if (guard()) return; setDay($("d-step").value.trim()); closeSheet(); render(); };
  $("dAll").onclick = () => { if (guard()) return; patchS(id, { [role === "elec" ? "etapeElec" : "etapeMeca"]: $("d-step").value.trim() }); closeSheet(); render(); };
  if ($("dClr")) $("dClr").onclick = () => { if (guard()) return; setDay(""); closeSheet(); render(); };
  if ($("dStd")) $("dStd").onclick = () => { if (guard()) return; patchS(id, { ["ordre" + ROLE_K[role]]: "" }); closeSheet(); render(); toast(`${s.numero} : ordre standard des étapes ${label} rétabli.`); };
}
