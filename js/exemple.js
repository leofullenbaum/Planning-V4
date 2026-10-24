/* Données d'exemple, utilisées seulement si aucun serveur ne répond
 * (page ouverte sans server.js). Rien n'est enregistré dans ce mode.
 */

const DEMO_EE = ["Passage câble ODO + ROXTEC", "Passage de câble GAZ + ROXTEC", "Passage de câble ELEC", "Câblage ODO", "Câblage BJ GAZ", "Câblage poste Gaz", "Câblage Local elec et Armoire électrique", "TEST ELEC"], DEMO_HE = [7, 11, 7, 7, 7, 7, 24.5, 28];
const DEMO_EM = ["MECA ODO 1", "MECA GAZ 1", "MECA ELEC 1 Rail", "MECA ELEC 2", "MECA EXT", "AUTOCOL", "MECA ODO 2", "MECA GAZ 2", "MECA ELEC 3"], DEMO_HM = [11, 7, 7, 7, 7, 4, 7, 11, 7];
function demoData() {
  const m = monday(today0()), map = new Map(); let n = 21;
  const put = (empl, debut, livrDelta, client) => {
    const id = "d" + n, s = { numero: "V4-0" + n++, client, emplacement: empl, debut: iso(debut), duree: 17, note: "" };
    s.livraison = iso(add(endOf(debut, 17), livrDelta)); map.set(id, { id, ...s }); return endOf(debut, 17);
  };
  [-14, -7, -21, 0, 7].forEach((off, i) => { const f = put(i + 1, add(m, off), 10, "Client exemple " + "ABCDE"[i]); put(i + 1, nextWork(f), i === 2 ? -3 : 12, "Client exemple " + "FGHIJ"[i]); });
  [[45, "K"], [52, "L"], [60, "M"], [66, "N"], [75, "O"], [88, "P"]].forEach(([j, c]) => { const id = "d" + n; map.set(id, { id, numero: "V4-0" + n++, client: "Client exemple " + c, livraison: iso(add(m, j)), emplacement: "", debut: "", duree: 17, note: "" }); });
  const cols = ["RAL 7032", "RAL 1015"], E = ["Élec A", "Élec B", "Élec C"], M = ["Méca A", "Méca B", "Méca C"], EE = DEMO_EE, EM = DEMO_EM;
  [...map.values()].forEach((s, i) => { s.couleur = cols[i % cols.length]; s.elec = placed(s) ? E[i % 3] : ""; s.meca = placed(s) && i !== 9 ? M[(i + 1) % 3] : ""; s.etapeElec = ""; s.etapeMeca = ""; });
  return map;
}
