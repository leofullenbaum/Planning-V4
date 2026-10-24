/* Connexion au serveur local (server.js).
 *
 * L'application a d'abord été écrite pour claude.ai, qui fournit une base de données
 * « window.claude.use("db") ». Ce fichier imite cette base avec le serveur local :
 *  - lecture : un flux en direct GET /api/events renvoie tout l'état à chaque modification ;
 *  - écriture : PUT / PATCH / DELETE sur /api/stations/<id> et /api/reglages/<id>.
 * Si la connexion tombe, elle est relancée toutes les 3 secondes.
 * Le reste du code ne parle qu'à cet objet « db » : pour changer de stockage, il suffit
 * de changer ce fichier.
 */

(function () {
  let state = null; const subs = [];
  const docSnap = (id, d) => ({ id, exists: d !== undefined, data: () => d });
  const emit = () => subs.forEach(f => f());
  function connect() {
    const es = new EventSource("/api/events");
    es.onmessage = (e) => { state = JSON.parse(e.data); emit(); };
    es.onerror = () => { es.close(); setTimeout(connect, 3000); };
  }
  const send = async (method, col, id, data) => {
    const r = await fetch(`/api/${col}/${encodeURIComponent(id)}`, { method, headers: { "Content-Type": "application/json" }, body: data === undefined ? undefined : JSON.stringify(data) });
    if (!r.ok) throw new Error("http " + r.status);
  };
  const newId = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  const doc = (col, id) => ({
    id,
    set: (d) => send("PUT", col, id, d), update: (d) => send("PATCH", col, id, d), delete: () => send("DELETE", col, id),
    onSnapshot(next) { const f = () => state && next(docSnap(id, state[col][id])); subs.push(f); f(); return () => {}; },
  });
  const db = {
    collection: (col) => ({
      doc: (id) => doc(col, id || newId()),
      onSnapshot(next) {
        const f = () => { if (!state) return; const docs = Object.entries(state[col]).map(([id, d]) => docSnap(id, d)); next({ docs, size: docs.length, metadata: { fromCache: false } }); };
        subs.push(f); f(); return () => {};
      },
    }),
    doc: (p) => { const [col, id] = p.split("/"); return doc(col, id); },
  };
  connect();
  window.claude = { use: async (name) => (name === "db" ? db : null) };
})();
