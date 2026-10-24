// Planning Atelier : serveur local, sans dépendance. Lancer avec : node server.js
const http = require("http"), fs = require("fs"), path = require("path"), crypto = require("crypto");
const PORT = Number(process.env.PORT) || 8080;
const DIR = __dirname, DATA = path.join(DIR, "data", "data.json"), PAGE = path.join(DIR, "index.html");

let state = { stations: {}, reglages: {} };
try { state = { ...state, ...JSON.parse(fs.readFileSync(DATA, "utf8")) }; } catch (_) {}

// Sauvegarde atomique + une copie de secours par jour dans ./sauvegardes
function save() {
  const tmp = DATA + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, DATA);
  const bk = path.join(DIR, "data", "sauvegardes");
  fs.mkdirSync(bk, { recursive: true });
  fs.writeFileSync(path.join(bk, new Date().toISOString().slice(0, 10) + ".json"), JSON.stringify(state));
}

const clients = new Set();
function broadcast() {
  const msg = "data: " + JSON.stringify(state) + "\n\n";
  for (const res of clients) res.write(msg);
}

function body(req) {
  return new Promise((ok, ko) => {
    let b = ""; req.on("data", c => { b += c; if (b.length > 5e6) req.destroy(); });
    req.on("end", () => { try { ok(b ? JSON.parse(b) : {}); } catch (e) { ko(e); } }); req.on("error", ko);
  });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const m = url.pathname.match(/^\/api\/(stations|reglages)\/([\w.-]+)$/);
  try {
    if (url.pathname === "/" || url.pathname === "/index.html") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
      return fs.createReadStream(PAGE).pipe(res);
    }
    if (url.pathname === "/api/events") {
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
      res.write("data: " + JSON.stringify(state) + "\n\n");
      clients.add(res);
      const ping = setInterval(() => res.write(": ping\n\n"), 25000);
      req.on("close", () => { clients.delete(res); clearInterval(ping); });
      return;
    }
    if (url.pathname === "/api/id") { res.writeHead(200, { "Content-Type": "application/json" }); return res.end(JSON.stringify({ id: crypto.randomUUID() })); }
    if (m) {
      const [, col, id] = m, docs = state[col];
      if (req.method === "PUT") docs[id] = await body(req);
      else if (req.method === "PATCH") docs[id] = { ...(docs[id] || {}), ...(await body(req)) };
      else if (req.method === "DELETE") delete docs[id];
      else { res.writeHead(405); return res.end(); }
      save(); broadcast();
      res.writeHead(204); return res.end();
    }
    res.writeHead(404); res.end("Introuvable");
  } catch (e) { res.writeHead(400); res.end(String(e.message || e)); }
}).listen(PORT, () => {
  const ips = Object.values(require("os").networkInterfaces()).flat().filter(i => i && i.family === "IPv4" && !i.internal).map(i => i.address);
  console.log("Planning Atelier lancé.");
  console.log("Sur ce PC :        http://localhost:" + PORT);
  ips.forEach(ip => console.log("Depuis le réseau : http://" + ip + ":" + PORT + "   (écran atelier : ajouter #atelier)"));
  console.log("Laisser cette fenêtre ouverte. Ctrl+C pour arrêter.");
});
