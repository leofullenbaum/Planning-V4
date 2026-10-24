/* Écritures vers le serveur.
 *
 * Chaque modification met d'abord à jour S (l'écran réagit tout de suite), puis part au serveur
 * dans une file par station, pour que deux modifications rapides arrivent dans l'ordre.
 *  - patchS(id, champs) : modifie une station      - createS(data) : crée une station
 *  - deleteS(id)        : supprime une station     - saveCfg(cfg)  : enregistre les réglages
 *  - guard() : vrai (et message) si la page est en lecture seule ; à appeler avant toute modification
 */

const queues = {};
function enqueue(key, fn) { queues[key] = (queues[key] || Promise.resolve()).then(fn).catch(onWriteError); }
function onWriteError(e) {
  if (e && (e.code === "invalid_argument" || e.code === "not_granted")) { readOnly = true; toast(RO_MSG); }
  else if (e && e.code === "quota_exceeded") toast("Limite de stockage atteinte : supprimez d'anciennes stations livrées.");
  else toast("Enregistrement impossible pour le moment. Réessayez.");
}
function patchS(id, patch) {
  const cur = S.stations.get(id); if (!cur) return;
  S.stations.set(id, { ...cur, ...patch });
  if (db) enqueue("s/" + id, () => db.collection("stations").doc(id).update(patch));
}
function createS(data) {
  const id = db ? db.collection("stations").doc().id : "n" + Date.now();
  S.stations.set(id, { ...data, id });
  if (db) enqueue("s/" + id, () => db.collection("stations").doc(id).set(data));
}
function deleteS(id) { S.stations.delete(id); if (db) enqueue("s/" + id, () => db.collection("stations").doc(id).delete()); }
function saveCfg(cfg) { S.cfg = cfg; if (db) enqueue("cfg", () => db.doc("reglages/general").set(cfg)); }
function guard() { if (readOnly) { toast(RO_MSG); return true; } return false; }
