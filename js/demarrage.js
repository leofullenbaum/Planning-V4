/* Démarrage : boutons de la barre d'outils, passage planning / écran atelier,
 * puis connexion aux données et premier affichage.
 * Ce fichier doit rester le dernier chargé par index.html.
 */

let clock = null, wake = null;
async function setMode(m) {
  S.mode = m;
  $("atelier").hidden = m !== "atelier"; $("app").hidden = m === "atelier";
  clearInterval(clock);
  if (m === "atelier") { clock = setInterval(renderAtelier, 15000); try { wake = await navigator.wakeLock?.request("screen"); } catch (_) { wake = null; } }
  else { try { await wake?.release(); } catch (_) {} wake = null; }
  render();
}
window.addEventListener("hashchange", () => setMode(location.hash === "#atelier" ? "atelier" : "planning"));
$("atelierBtn").onclick = () => { location.hash = "atelier"; if (location.hash !== "#atelier") setMode("atelier"); };
$("backBtn").onclick = () => { try { if (document.fullscreenElement) document.exitFullscreen(); } catch (_) {} history.replaceState(null, "", location.pathname + location.search); setMode("planning"); };
$("fsBtn").onclick = async () => { try { document.fullscreenElement ? await document.exitFullscreen() : await document.documentElement.requestFullscreen(); } catch (_) { toast("Le plein écran n'est pas disponible ici. Utilisez la touche F11 du navigateur."); } };
document.addEventListener("visibilitychange", async () => { if (S.mode === "atelier" && document.visibilityState === "visible") { try { wake = await navigator.wakeLock?.request("screen"); } catch (_) {} } });
const setView = (v) => { S.view = v; S.offset = 0; try { localStorage.setItem("vue", v); } catch (_) {} render(); };
$("v4s").onclick = () => setView("4s");
$("v3m").onclick = () => setView("3m");
$("vsem").onclick = () => setView("sem");
$("prev").onclick = () => { S.offset -= S.view === "3m" ? 4 : 1; render(); };
$("next").onclick = () => { S.offset += S.view === "3m" ? 4 : 1; render(); };
$("todayBtn").onclick = () => { S.offset = 0; render(); };
$("newS").onclick = () => guard() || openEdit(null);
$("setBtn").onclick = openSettings;
$("autoBtn").onclick = autoPlace;
let rz = null; window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(render, 120); });
try { const v = localStorage.getItem("vue"); S.view = ["3m", "4s", "sem"].includes(v) ? v : "sem"; } catch (_) { S.view = "sem"; }

setMode(location.hash === "#atelier" ? "atelier" : "planning");
(async () => {
  try { db = window.claude ? await window.claude.use("db") : null; } catch (_) { db = null; }
  if (!db) {
    S.stations = demoData(); S.ready = true; S.cfg = { ...DEF, elecs: ["Élec A", "Élec B", "Élec C"], mecas: ["Méca A", "Méca B", "Méca C"], etapesElec: DEMO_EE, etapesMeca: DEMO_EM, heuresElec: DEMO_HE, heuresMeca: DEMO_HM };
    $("banner").textContent = "Mode démonstration avec des commandes d'exemple : les modifications ne sont pas enregistrées dans cette vue.";
    $("banner").hidden = false; render(); return;
  }
  let gs = false, gc = false;
  const fail = (e) => { if (e?.code !== "revoked") toast("Connexion au planning interrompue. Rechargez la page."); $("alive").textContent = "Mise à jour interrompue"; };
  db.collection("stations").onSnapshot((snap) => {
    S.stations = new Map(snap.docs.map(d => [d.id, { id: d.id, ...d.data() }]));
    gs = gs || !snap.metadata.fromCache || snap.size > 0; S.ready = gs && gc; render();
  }, fail);
  db.doc("reglages/general").onSnapshot((d) => {
    if (d.exists) { const c = d.data(); S.cfg = { ...DEF, ...c, elecs: c.elecs || [], mecas: c.mecas || [], etapesElec: c.etapesElec || [], etapesMeca: c.etapesMeca || [], heuresElec: c.heuresElec || [], heuresMeca: c.heuresMeca || [], presence: c.presence || {}, noms: Array.from({ length: NB_EMPL }, (_, i) => (c.noms || [])[i] || DEF.noms[i]) }; }
    gc = true; S.ready = gs && gc; render();
  }, fail);
})();
