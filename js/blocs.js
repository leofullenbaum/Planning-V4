/* Blocs d'une station : chaque étape de la gamme est un bloc, avec sa personne et sa clôture.
 *
 *  - setBloc(id, role, étape, { p, fait }) : enregistre le bloc (champ blocsMeca / blocsElec)
 *    et recalcule l'avancement de la station quand une clôture change
 *  - personSelect(s, role, bloc, ch) : liste déroulante des personnes du métier, les disponibles
 *    d'abord (présentes et sans autre tâche sur les jours du bloc), les autres avec la raison
 *  - openBloc(id, role, étape) : fiche d'un bloc (clic sur un bloc de la vue Semaine)
 *  - openBlocs(id) : tous les blocs de la station, méca et élec, avec « Nouveau bloc » en haut
 */

function setBloc(id, role, n, val) {
  const s = S.stations.get(id); if (!s) return;
  const k = "blocs" + ROLE_K[role], all = { ...(s[k] || {}) }, b = { ...(all[n] || {}), ...val };
  if (!b.p) delete b.p; if (!b.fait) delete b.fait;
  if (Object.keys(b).length) all[n] = b; else delete all[n];
  const patch = { [k]: all };
  if ("fait" in val) patch.avancement = progress({ ...s, [k]: all });
  patchS(id, patch);
}
// Disponibilité d'une personne sur les jours d'un bloc : { abs, busy: [numéros], free }
function dispo(s, role, sp, p, ch) {
  let abs = 0; const busy = new Set();
  for (let d = new Date(sp.from); d <= sp.to; d = add(d, 1)) {
    if (!isWork(d)) continue;
    if (presence(p, d) !== "present") { abs++; continue; }
    for (const t of (ch.get(p) || {})[iso(d)] || []) if (t.s.id !== s.id || (t.role === role && !t.step.split(" / ").includes(sp.n))) busy.add(t.s.id === s.id ? "un autre bloc" : t.s.numero);
  }
  return { abs, busy: [...busy], free: !abs && !busy.size };
}
function personSelect(s, role, sp, ch, attrs) {
  const list = [...((role === "elec" ? S.cfg.elecs : S.cfg.mecas) || [])]; if (sp.p && !list.includes(sp.p)) list.push(sp.p);
  const st = ppl(s[role]), rows = list.map(p => ({ p, d: dispo(s, role, sp, p, ch) }));
  const opt = ({ p, d }) => `<option value="${esc(p)}"${p === sp.p ? " selected" : ""}>${esc(p)}${d.free ? "" : " · " + [d.abs && `absent ${d.abs} j`, d.busy.length && `aussi sur ${d.busy.join(", ")}`].filter(Boolean).join(", ")}</option>`;
  const ok = rows.filter(r => r.d.free), ko = rows.filter(r => !r.d.free);
  return `<select ${attrs}><option value="">${st.length ? "Personnes de la station (" + esc(st.join(", ")) + ")" : "— À affecter —"}</option>`
    + (ok.length ? `<optgroup label="Disponibles">${ok.map(opt).join("")}</optgroup>` : "")
    + (ko.length ? `<optgroup label="Pas disponibles">${ko.map(opt).join("")}</optgroup>` : "") + `</select>`;
}
const spanTxt = (sp) => +sp.from === +sp.to ? `le ${dd(sp.from)}` : `du ${dd(sp.from)} au ${dd(sp.to)}`;
const findSpan = (s, role, n) => blockSpans(s, role).find(b => b.n === n);
function openBloc(id, role, n) {
  const s = S.stations.get(id); if (!s) return;
  const sp = findSpan(s, role, n) || { n, h: hoursOf(role, n), from: today0(), to: today0(), ...blocOf(s, role, n) }, label = role === "elec" ? "élec" : "méca";
  openSheet(`<h2>${esc(s.numero)} · ${label}</h2>
    <div class="hint"><b>${esc(n)}</b> · ${fmtHr(sp.h)} · ${spanTxt(sp)}${sp.fait ? " · <b class=\"ok\">clôturé</b>" : ""}</div>
    <form id="bForm" class="fields">
      <label class="f full">Personne sur ce bloc${personSelect(s, role, sp, chargeMap(sp.from, sp.to), 'id="b-p"')}</label>
      <div class="hint full">Une personne choisie fait ce bloc seule. Sans choix, ce sont les personnes de la station.</div>
      <div class="actions full">
        <button class="btn primary" type="submit">Enregistrer</button>
        <button class="btn" type="button" id="bDone">${sp.fait ? "Rouvrir le bloc" : "Clôturer le bloc"}</button>
        <button class="btn" type="button" id="bAll">Tous les blocs de la station</button>
        <button class="btn" type="button" id="cancel">Annuler</button>
      </div></form>`);
  $("cancel").onclick = closeSheet;
  $("bAll").onclick = () => openBlocs(id);
  $("bForm").onsubmit = (e) => { e.preventDefault(); if (guard()) return; setBloc(id, role, n, { p: $("b-p").value }); closeSheet(); render(); };
  $("bDone").onclick = () => {
    if (guard()) return; setBloc(id, role, n, { p: $("b-p").value, fait: !sp.fait }); closeSheet(); render();
    toast(`${s.numero} : « ${n} » ${sp.fait ? "rouvert" : "clôturé"}. Avancement ${S.stations.get(id).avancement} %.`);
  };
}
function openBlocs(id) {
  const s = S.stations.get(id); if (!s) return;
  const roles = [["meca", "Méca"], ["elec", "Élec"]], spans = Object.fromEntries(roles.map(([r]) => [r, blockSpans(s, r)]));
  const all = Object.values(spans).flat(); if (!all.length) return toast(`${s.numero} : pas de gamme. Placez la station et renseignez les étapes dans Réglages.`);
  const ch = chargeMap(new Date(Math.min(...all.map(b => +b.from))), new Date(Math.max(...all.map(b => +b.to))));
  const pc = s.avancement === "" || s.avancement == null ? progress(s) : s.avancement;
  const row = (r, b) => `<tr class="${b.fait ? "done" : ""}"><td><input type="checkbox" class="b-f" data-r="${r}" data-n="${esc(b.n)}"${b.fait ? " checked" : ""} aria-label="Clôturer ${esc(b.n)}"></td>
    <td><b>${esc(b.n)}</b><small>${fmtHr(b.h)} · ${spanTxt(b)}</small></td><td>${personSelect(s, r, b, ch, `class="b-p" data-r="${r}" data-n="${esc(b.n)}"`)}</td></tr>`;
  openSheet(`<h2>${esc(s.numero)} · blocs</h2>
    <div class="avc"><span>Avancement <b>${pc} %</b></span><span class="pgb"><i style="width:${pc}%"></i></span></div>
    <div class="hint">Cochez un bloc terminé pour le clôturer : l'avancement suit les heures clôturées.</div>
    <form id="nbForm" class="nb fields"><b class="full">Nouveau bloc</b>
      <label class="f full">Étape de la gamme<select id="nb-n">${roles.map(([r, l]) => `<optgroup label="${l}">${spans[r].map(b => `<option value="${r}|${esc(b.n)}">${esc(b.n)}${b.p ? " · " + esc(b.p) : ""}</option>`).join("")}</optgroup>`).join("")}</select></label>
      <label class="f full">Personne<span id="nb-ps"></span></label>
      <div class="actions full"><button class="btn primary" type="submit">Affecter</button></div></form>
    ${roles.map(([r, l]) => spans[r].length ? `<table class="blist"><thead><tr><th>✓</th><th>${l}</th><th>Personne</th></tr></thead><tbody>${spans[r].map(b => row(r, b)).join("")}</tbody></table>` : "").join("")}
    <div class="actions"><button class="btn" type="button" id="cancel">Fermer</button></div>`);
  const nbPick = () => { const [r, n] = $("nb-n").value.split("|"), b = spans[r].find(x => x.n === n); $("nb-ps").innerHTML = personSelect(s, r, { ...b, p: "" }, ch, 'id="nb-p"'); };
  const first = all.find(b => !b.p && !b.fait); if (first) $("nb-n").value = (spans.meca.includes(first) ? "meca" : "elec") + "|" + first.n;
  nbPick(); $("nb-n").onchange = nbPick;
  $("cancel").onclick = closeSheet;
  $("nbForm").onsubmit = (e) => {
    e.preventDefault(); const [r, n] = $("nb-n").value.split("|"), p = $("nb-p").value;
    if (!p) return toast("Choisissez une personne pour ce bloc.");
    if (guard()) return; setBloc(id, r, n, { p }); render(); openBlocs(id); toast(`${s.numero} : ${p} fait le bloc « ${n} ».`);
  };
  $("sheet").querySelectorAll(".b-p").forEach(x => x.onchange = () => { if (guard()) return; setBloc(id, x.dataset.r, x.dataset.n, { p: x.value }); render(); openBlocs(id); });
  $("sheet").querySelectorAll(".b-f").forEach(x => x.onchange = () => { if (guard()) return; setBloc(id, x.dataset.r, x.dataset.n, { fait: x.checked }); render(); openBlocs(id); toast(`${s.numero} : avancement ${S.stations.get(id).avancement} %.`); });
}
