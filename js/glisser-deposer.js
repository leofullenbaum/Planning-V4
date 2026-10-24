/* Glisser-déposer des stations (vues 4 semaines et 3 mois).
 *
 * On peut glisser une barre vers un autre jour ou un autre emplacement, une commande du carnet
 * vers un emplacement, ou une barre vers le carnet pour la déplanifier.
 * Un simple clic (sans déplacement de plus de 6 px) ouvre la fiche de la station.
 * Tirer la poignée du bord droit d'une barre (.rz) change sa durée, en jours travaillés.
 * Après un déplacement ou un changement de durée, cascade() pousse les stations suivantes.
 */

let drag = null;
document.addEventListener("pointerdown", (e) => {
  if (S.mode !== "planning" || e.button !== 0 || e.target.closest(".overlay")) return;
  const el = e.target.closest(".sbar, .oc"); if (!el) return;
  drag = { id: el.dataset.id, el, bar: el.classList.contains("sbar"), resize: !!e.target.closest(".rz"), x: e.clientX, y: e.clientY, started: false };
});
function targetAt(x, y) {
  const el = document.elementFromPoint(x, y);
  return el?.closest(".glane") || el?.closest(".carnet") || null;
}
document.addEventListener("pointermove", (e) => {
  if (!drag) return;
  if (!drag.started) {
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
    if (readOnly) { drag = null; toast(RO_MSG); return; }
    const r = drag.el.getBoundingClientRect();
    drag.gx = drag.x - r.left; drag.gy = drag.y - r.top;
    if (drag.resize) drag.el.classList.add("resizing");
    else if (drag.bar) { drag.el.classList.add("dragging"); drag.el.style.pointerEvents = "none"; }
    else { drag.ghost = drag.el.cloneNode(true); drag.ghost.classList.add("ghost"); drag.ghost.style.width = r.width + "px"; document.body.appendChild(drag.ghost); drag.el.style.opacity = ".3"; }
    drag.started = true;
  }
  e.preventDefault();
  if (drag.resize) return resizeMove(e);
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (drag.bar) drag.el.style.transform = `translate(${dx}px, ${dy}px)`;
  else { drag.ghost.style.left = (e.clientX - drag.gx) + "px"; drag.ghost.style.top = (e.clientY - drag.gy) + "px"; }
  const t = targetAt(e.clientX, e.clientY);
  if (drag.t !== t) { drag.t?.classList.remove("hover", "drop-hover"); t?.classList.add(t.classList.contains("glane") ? "hover" : "drop-hover"); drag.t = t; }
  const w = $("gwrap").getBoundingClientRect();
  if (e.clientY > w.top && e.clientY < w.bottom) { if (e.clientX > w.right - 40) $("gwrap").scrollLeft += 12; else if (e.clientX < w.left + LW + 30) $("gwrap").scrollLeft -= 12; }
});
function endDrag(drop, e) {
  const d = drag; drag = null; if (!d) return;
  if (!d.started) { if (drop) openEdit(d.id); return; }
  if (d.resize) return resizeEnd(d, drop);
  d.t?.classList.remove("hover", "drop-hover");
  d.ghost?.remove();
  if (drop && d.t && geo) {
    const s = S.stations.get(d.id);
    if (d.t.classList.contains("glane")) {
      const lr = d.t.getBoundingClientRect(), leftEdge = e.clientX - d.gx - lr.left;
      let start;
      if (d.bar && s.debut) start = snap(add(P(s.debut), Math.round((e.clientX - d.x) / geo.dayW)));
      else start = snap(add(geo.start, Math.max(0, Math.round(leftEdge / geo.dayW))));
      patchS(d.id, { emplacement: Number(d.t.dataset.row), debut: iso(start) });
      const moved = cascade(d.id), i = info(S.stations.get(d.id));
      toast(`${s.numero} : entrée ${ddy(i.debut)}, sortie ${ddy(i.fin)}${i.retard ? `, retard de ${i.retard} j sur la livraison` : ""}.${cascadeTxt(moved)}`);
    } else if (placed(s)) { patchS(d.id, { emplacement: "", debut: "" }); toast(`${s.numero} est revenue dans le carnet.`); }
  }
  render();
}
// Changement de durée : le dernier jour suit la souris, la durée compte les jours travaillés
function resizeTarget(d, e) {
  const s = S.stations.get(d.id), lane = d.el.closest(".glane").getBoundingClientRect();
  let end = add(geo.start, Math.floor((e.clientX - lane.left) / geo.dayW));
  const debut = snap(P(s.debut)); if (end < debut) end = debut;
  while (!isWork(end) && end > debut) end = add(end, -1);
  return Math.max(1, workCount(debut, end));
}
function resizeMove(e) {
  const d = drag, n = resizeTarget(d, e), s = S.stations.get(d.id);
  const fin = endOf(snap(P(s.debut)), n), left = parseFloat(d.el.style.left);
  d.el.style.width = Math.max(geo.dayW - 2, (diff(geo.start, fin) + 1) * geo.dayW - left - 1) + "px";
  d.n = n; d.el.title = `${s.numero} : ${n} j, sortie ${ddy(fin)}`;
}
function resizeEnd(d, drop) {
  const s = S.stations.get(d.id);
  if (drop && d.n && d.n !== dur(s)) {
    patchS(d.id, { duree: d.n });
    const moved = cascade(d.id), i = info(S.stations.get(d.id));
    toast(`${s.numero} : ${d.n} jours, sortie ${ddy(i.fin)}${i.marge !== null ? `, ${margeTxt(i)}` : ""}.${cascadeTxt(moved)}`);
  }
  render();
}
document.addEventListener("pointerup", (e) => endDrag(true, e));
document.addEventListener("pointercancel", (e) => endDrag(false, e));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { if (drag) endDrag(false, e); else closeSheet(); }
  if (e.key === "Enter" && e.target.dataset?.id && e.target.closest("#gt, #carnet")) openEdit(e.target.dataset.id);
});
