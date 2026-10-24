/* Placement automatique du carnet de commandes.
 *
 * Les commandes non placées sont prises par date de livraison croissante ; chacune va sur
 * l'emplacement qui offre le premier créneau libre à partir d'aujourd'hui.
 */

function earliestIn(row, n, from, skipId) {
  const list = [...S.stations.values()].filter(s => s.id !== skipId && placed(s) && Number(s.emplacement) === row).map(info).sort((a, b) => a.debut - b.debut);
  let cand = snap(from);
  for (const s of list) { if (s.fin < cand) continue; if (endOf(cand, n) < s.debut) break; cand = nextWork(s.fin); }
  return cand;
}
function autoPlace() {
  if (guard()) return;
  const todo = [...S.stations.values()].filter(s => !placed(s)).sort((a, b) => (a.livraison || "9").localeCompare(b.livraison || "9"));
  if (!todo.length) return toast("Le carnet est vide : toutes les commandes sont placées.");
  let late = 0;
  for (const s of todo) {
    let best = null;
    for (let r = 1; r <= NB_EMPL; r++) { const c = earliestIn(r, dur(s), today0(), s.id); if (!best || c < best.c) best = { r, c }; }
    patchS(s.id, { emplacement: best.r, debut: iso(best.c) });
    if (info(S.stations.get(s.id)).retard) late++;
  }
  render();
  toast(`${todo.length} commande${todo.length > 1 ? "s placées" : " placée"}${late ? ` · ${late} sortirai${late > 1 ? "ent" : "t"} après la livraison` : ", toutes à l'heure"}.`);
}
