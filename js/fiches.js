/* Panneaux latéraux (« fiches ») et messages.
 *
 *  - openSheet(html) / closeSheet() : ouvre / ferme le panneau de droite
 *  - openEdit(id) : fiche d'une station (ou nouvelle commande si id est null)
 *  - toast(msg) : petit message en bas de l'écran pendant 4 secondes
 */

function openSheet(html) { $("sheet").innerHTML = html; $("ovl").hidden = false; $("sheet").querySelector("input,select,button")?.focus(); }
function closeSheet() { $("ovl").hidden = true; $("sheet").innerHTML = ""; }
$("ovl").addEventListener("pointerdown", (e) => { if (e.target === $("ovl")) closeSheet(); });

function openEdit(id) {
  const s = id ? S.stations.get(id) : { numero: nextNum(), client: "", livraison: "", duree: S.cfg.duree, emplacement: "", debut: "", note: "" };
  if (!s) return;
  const opts = `<option value="">— Dans le carnet —</option>` + S.cfg.noms.map((n, i) => `<option value="${i + 1}"${Number(s.emplacement) === i + 1 ? " selected" : ""}>${esc(n)}</option>`).join("");
  openSheet(`<h2>${id ? "Station " + esc(s.numero) : "Nouvelle commande"}</h2>
    <form id="sForm" class="fields">
      <label class="f">N° station<input id="f-numero" required value="${esc(s.numero)}"></label>
      <label class="f">Livraison<input id="f-livraison" type="date" value="${esc(s.livraison)}"></label>
      <label class="f">Client<input id="f-client" value="${esc(s.client)}"></label>
      <label class="f">Couleur du shelter<select id="f-couleur">${["RAL 7032", "RAL 1015"].concat(s.couleur && !["RAL 7032", "RAL 1015"].includes(s.couleur) ? [s.couleur] : []).map(c => `<option value="${c}"${(s.couleur || "RAL 7032") === c ? " selected" : ""}>${c} · ${RAL_NOMS[c.slice(4)] || ""}</option>`).join("")}</select></label>
      <div class="f">Élec (3 maximum)<div class="picks" id="f-elec">${picks(S.cfg.elecs, s.elec)}</div></div>
      <label class="f">Étape élec<input id="f-etapeElec" list="lee" value="${esc(s.etapeElec)}" placeholder="Vide : suit la gamme"><datalist id="lee">${S.cfg.etapesElec.map(x => `<option value="${esc(x)}">`).join("")}</datalist></label>
      <div class="f">Méca (3 maximum)<div class="picks" id="f-meca">${picks(S.cfg.mecas, s.meca)}</div></div>
      <label class="f">Étape méca<input id="f-etapeMeca" list="lem" value="${esc(s.etapeMeca)}" placeholder="Vide : suit la gamme"><datalist id="lem">${S.cfg.etapesMeca.map(x => `<option value="${esc(x)}">`).join("")}</datalist></label>
      <label class="f">Emplacement<select id="f-empl">${opts}</select></label>
      <label class="f">Entrée atelier<input id="f-debut" type="date" value="${esc(s.debut)}"></label>
      <label class="f">Durée (jours)<input id="f-duree" type="number" min="1" step="1" value="${esc(dur(s))}"></label>
      <label class="f">Avancement (%)<input id="f-avancement" type="number" min="0" max="100" step="5" value="${esc(s.avancement ?? "")}" placeholder="Auto, selon la date"></label>
      <div class="f" style="justify-content:end"><button class="btn" type="button" id="fit">Premier créneau libre</button></div>
      <div class="hint full" id="calc"></div>
      <label class="f full">Consigne pour l'atelier<textarea id="f-note" rows="2">${esc(s.note)}</textarea></label>
      <div class="actions full">
        <button class="btn primary" type="submit">${id ? "Enregistrer" : "Ajouter au carnet"}</button>
        ${id && placed(s) ? '<button class="btn" type="button" id="unplan">Remettre au carnet</button>' : ""}
        <button class="btn" type="button" id="cancel">Annuler</button>
        ${id ? '<button class="btn danger" type="button" id="del" style="margin-left:auto">Supprimer</button>' : ""}
      </div>
    </form>`);
  const calc = () => {
    const n = Number($("f-duree").value) || S.cfg.duree, l = $("f-livraison").value, b = $("f-debut").value;
    const parts = [];
    if (b) {
      const f = endOf(P(b), n), i = { fin: f, livr: l ? P(l) : null }; i.marge = marge(i);
      parts.push(`Sortie prévue le ${f.toLocaleDateString("fr-FR")}`);
      if (i.marge !== null) parts.push(`<b class="mg ${margeCls(i)}">${margeTxt(i)} (jours ouvrés)</b>`);
    }
    if (l) parts.push(`entrée au plus tard le ${latestStart(P(l), n).toLocaleDateString("fr-FR")}`);
    $("calc").innerHTML = parts.join(" · ");
  };
  ["f-duree", "f-livraison", "f-debut"].forEach(k => $(k).addEventListener("input", calc)); calc();
  $("fit").onclick = () => {
    const n = Number($("f-duree").value) || S.cfg.duree; let best = null;
    const rows = $("f-empl").value ? [Number($("f-empl").value)] : [1, 2, 3, 4, 5];
    for (const r of rows) { const c = earliestIn(r, n, today0(), id); if (!best || c < best.c) best = { r, c }; }
    $("f-empl").value = best.r; $("f-debut").value = iso(best.c); calc();
  };
  $("cancel").onclick = closeSheet;
  if ($("unplan")) $("unplan").onclick = () => { if (guard()) return; patchS(id, { emplacement: "", debut: "" }); closeSheet(); render(); };
  if ($("del")) $("del").onclick = (e) => {
    if (guard()) return;
    if (!e.target.classList.contains("armed")) { e.target.classList.add("armed"); e.target.textContent = "Confirmer la suppression"; return; }
    deleteS(id); closeSheet(); render(); toast(`${s.numero} supprimée.`);
  };
  $("sForm").onsubmit = (e) => {
    e.preventDefault(); if (guard()) return;
    const picked = (k) => [...$("f-" + k).querySelectorAll("input:checked")].map(x => x.value);
    if (picked("meca").length > MAX_PPL || picked("elec").length > MAX_PPL) return toast(`${MAX_PPL} personnes maximum par métier sur une station.`);
    const v = (k) => ["meca", "elec"].includes(k) ? picked(k).join(", ") : $("f-" + k).value.trim(), ok = v("empl") && v("debut");
    const data = { numero: v("numero"), client: v("client"), couleur: v("couleur"), elec: v("elec"), meca: v("meca"), etapeElec: v("etapeElec"), etapeMeca: v("etapeMeca"), livraison: v("livraison"), duree: Number(v("duree")) || S.cfg.duree,
      emplacement: ok ? Number(v("empl")) : "", debut: ok ? iso(snap(P(v("debut")))) : "", note: v("note"), avancement: v("avancement") === "" ? "" : Math.max(0, Math.min(100, Number(v("avancement")) || 0)) };
    let moved = []; const half = !!v("empl") !== !!v("debut");
    if (id) { const patch = {}; for (const k in data) if (data[k] !== s[k]) patch[k] = data[k]; if (Object.keys(patch).length) patchS(id, patch); if (patch.debut || patch.emplacement || patch.duree) moved = cascade(id); }
    else createS(data);
    closeSheet(); render();
    if (moved.length) toast(cascadeTxt(moved).trim());
    if (half) toast("Il faut un emplacement et une date d'entrée pour placer la station : elle reste dans le carnet.");
  };
}
// Cases à cocher des personnes d'un métier (jusqu'à MAX_PPL sur la station)
function picks(list, cur) {
  const on = ppl(cur), l = [...list]; on.forEach(p => l.includes(p) || l.push(p));
  if (!l.length) return `<span class="hint">Ajoutez des personnes dans Réglages.</span>`;
  return l.map(n => `<label class="pick"><input type="checkbox" value="${esc(n)}"${on.includes(n) ? " checked" : ""}> ${esc(n)}</label>`).join("");
}
function nextNum() {
  const nums = [...S.stations.values()].map(s => parseInt(String(s.numero).replace(/\D/g, "").slice(1) || String(s.numero).replace(/\D/g, ""), 10)).filter(n => !isNaN(n));
  return "V4-" + String(nums.length ? Math.max(...nums) + 1 : 1).padStart(3, "0");
}
let toastT = null;
function toast(msg) { const t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 4200); }
