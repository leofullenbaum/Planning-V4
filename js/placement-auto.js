/* Placement automatique du carnet de commandes.
 *
 * Les commandes non placées sont prises par date de livraison croissante ; chacune va sur
 * l'emplacement qui offre le premier créneau libre à partir d'aujourd'hui.
 *
 * cascade(id) : après un déplacement ou un changement de durée, les stations qui suivent sur
 * le même emplacement et qui chevaucheraient sont poussées juste après, de proche en proche.
 * cascadeTxt(liste) : texte à ajouter au message (« V4-104 décalée au 27/11 »).
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

function cascade(id) {
  const s0 = S.stations.get(id); if (!s0 || !placed(s0)) return [];
  const row = Number(s0.emplacement), moved = [];
  let prev = info(s0);
  const next = [...S.stations.values()].filter(s => s.id !== id && placed(s) && Number(s.emplacement) === row)
    .map(s => ({ s, i: info(s) })).filter(x => x.i.debut >= prev.debut).sort((a, b) => a.i.debut - b.i.debut);
  for (const { s, i } of next) {
    if (i.debut > prev.fin) break; // un jour libre ou plus : la suite n'est pas touchée
    patchS(s.id, { debut: iso(nextWork(prev.fin)) });
    const ns = S.stations.get(s.id); moved.push(ns); prev = info(ns);
  }
  return moved;
}
const cascadeTxt = (list) => list.length ? ` Décalée${list.length > 1 ? "s" : ""} en cascade : ${list.map(s => `${s.numero} au ${dd(info(s).debut)}`).join(", ")}.` : "";
