/* Vue « Semaine » (vue par défaut) : les 5 emplacements toujours à la même place,
 * une ligne méca et une ligne élec, et toutes les étapes de chaque jour avec leurs heures.
 *
 *  - dayParts(s, role, jour) : étapes d'une personne ce jour-là, avec la part d'heures du jour
 *  - renderWeek(t0) : dessine le tableau ; une case est rouge si la personne a une autre tâche
 *  - glisser une étape sur une autre de la même station change son ordre de montage
 *    (champ ordreMeca / ordreElec de la station), et toute la suite se décale
 *  - openDay() : fiche d'un jour (étape du jour, étape de la station, ordre standard)
 *  - presTable() : tableau « Présence de l'équipe » sous le planning ; un clic sur un jour
 *    ajoute ou retire une absence (presence.js). Une case est aussi rouge si la personne
 *    affectée est absente ou en repos ce jour-là.
 */

// Étapes d'une personne sur une station un jour donné : [{ n, h, j }] ; null si la station n'est pas dans l'atelier ce jour-là
function dayParts(s, role, d) {
  const i = info(s); if (!isWork(d) || d < i.debut || d > i.fin) return null;
  const ds = iso(d), own = s.jours && s.jours[ds] && s.jours[ds][role];
  if (own) return [{ n: own, own: true }];
  const fixed = role === "elec" ? s.etapeElec : s.etapeMeca; if (fixed) return [{ n: fixed, fixed: true }];
  if (!gamme(s, role)) return [];
  const k = workCount(i.debut, d) - 1, a = k * H_JOUR, b = a + H_JOUR, out = []; let t = 0;
  stationOrder(s, role).forEach((n, j) => { const h = hoursOf(role, n), x = Math.max(t, a), y = Math.min(t + h, b); if (y > x) out.push({ n, h: y - x, j }); t += h; });
  return out;
}
const fmtHr = (h) => String(Math.round(h * 10) / 10).replace(".", ",") + " h";
function renderWeek(t0) {
  const start = add(monday(t0), S.offset * 7), days = []; for (let d = new Date(start); days.length < (S.cfg.ouvres ? 5 : 7); d = add(d, 1)) days.push(new Date(d));
  const end = days[days.length - 1];
  $("periode").textContent = `${dd(days[0])} au ${ddy(end)}`;
  $("wkno").textContent = `Semaine ${isoWeek(start)}`;
  const pl = [...S.stations.values()].filter(placed), chw = chargeMap(days[0], end);
  let clashes = 0;
  let h = `<table class="wk fix"><thead><tr><th class="who">Emplacement</th>${days.map(d => `<th class="${+d === +t0 ? "td" : ""}">${esc(d.toLocaleDateString("fr-FR", { weekday: "long" }))} <span>${dd(d)}</span></th>`).join("")}</tr></thead>`;
  for (let r = 1; r <= NB_EMPL; r++) {
    const list = pl.filter(s => Number(s.emplacement) === r).map(s => ({ s, i: info(s) })).filter(x => x.i.debut <= end && x.i.fin >= days[0]).sort((a, b) => a.i.debut - b.i.debut);
    const multi = list.length > 1;
    let head = list.map(({ s, i }) => `<span class="st">${sw(s.couleur)}<b>${esc(s.numero)}</b>${s.client ? ` ${esc(s.client)}` : ""}<span class="gi">entrée ${dd(i.debut)} · sortie ${dd(i.fin)}${i.livr ? ` · livraison ${dd(i.livr)}` : ""}</span>${i.marge !== null ? `<b class="mg${margeCls(i) ? " " + margeCls(i) : ""}">${margeTxt(i)}</b>` : ""}</span>`).join("");
    if (!list.length) { const nx = pl.filter(s => Number(s.emplacement) === r).map(s => ({ s, i: info(s) })).filter(x => x.i.debut > end).sort((a, b) => a.i.debut - b.i.debut)[0]; head = `<span class="gi">Libre cette semaine${nx ? ` · prochaine : ${esc(nx.s.numero)} le ${dd(nx.i.debut)}` : ""}</span>`; }
    h += `<tbody class="em"><tr class="grp"><th colspan="${days.length + 1}"><span class="a-no sm">${r}</span>${head}</th></tr>`;
    for (const [role, lab] of [["meca", "Méca"], ["elec", "Élec"]]) {
      const names = [...new Set(list.map(x => x.s[role] || "à affecter"))];
      h += `<tr class="rw ${role}"><th class="who"><span class="rl">${lab}</span>${list.length ? names.map(n => `<span class="${n === "à affecter" ? "miss" : "pn"}">${esc(n)}</span>`).join(" ") : ""}</th>`;
      for (const d of days) {
        const ds = iso(d), here = list.map(x => ({ ...x, parts: dayParts(x.s, role, d) })).filter(x => x.parts);
        if (!here.length) { h += `<td class="${+d === +t0 ? "td " : ""}off"></td>`; continue; }
        let cell = "", over = [];
        for (const x of here) {
          const p = x.s[role], tasks = p ? ((chw.get(p) || {})[ds] || []) : [];
          if (x.parts.length && tasks.length > 1) over.push(`${esc(p)} aussi sur ${tasks.filter(t => t.s.id !== x.s.id).map(t => esc(t.s.numero)).join(", ")}`);
          if (p && presence(p, d) !== "present") over.push(`${esc(p)} : ${PRES_TXT[presence(p, d)].toLowerCase()} ce jour`);
          cell += `<div class="dc" data-id="${esc(x.s.id)}" data-role="${role}" data-date="${ds}">${multi ? `<span class="tag">${esc(x.s.numero)}</span>` : ""}<span class="jj">J${workCount(x.i.debut, d)}</span>`
            + (x.parts.length ? x.parts.map(q => `<div class="si${q.own ? " own" : ""}${q.own || q.fixed ? " lock" : ""}" ${q.j !== undefined ? `data-j="${q.j}"` : ""} title="${q.own ? "Étape choisie pour ce jour" : q.fixed ? "Étape fixée pour la station" : "Glisser sur une autre étape pour changer l'ordre"}">${q.j !== undefined ? `<i class="gp">⋮⋮</i>` : ""}<span class="nm">${esc(q.n)}</span>${q.h ? `<span class="hh">${fmtHr(q.h)}</span>` : ""}</div>`).join("")
              : `<div class="si none">${gamme(x.s, role) ? "Gamme terminée" : "Étape à définir"}</div>`) + `</div>`;
        }
        if (over.length) clashes++;
        h += `<td class="${+d === +t0 ? "td " : ""}${over.length ? "clash" : ""}">${cell}${over.length ? `<span class="cw">⚠ ${over.join(" · ")}</span>` : ""}</td>`;
      }
      h += `</tr>`;
    }
    h += `</tbody>`;
  }
  h += `</table>` + presTable(days, chw, t0);
  $("gt").style.cssText = ""; $("gt").innerHTML = h;
  $("regle").textContent = `· Cliquez sur un jour pour changer son étape. Glissez une étape sur une autre pour changer l'ordre de montage de la station : la suite se décale.${clashes ? ` ${clashes} case${clashes > 1 ? "s" : ""} en rouge : la personne a une autre tâche ou n'est pas là ce jour-là.` : ""} Cliquez sur un jour du tableau de présence pour saisir ou retirer une absence.`;
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
