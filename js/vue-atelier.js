/* Écran atelier (adresse /#atelier, pour la TV) : les 5 emplacements vus de dessus,
 * placés comme dans l'atelier (1-2-3 en bas, 5 et 4 en haut ; positions dans POS).
 * Chaque station montre son jour (J5/17), sa barre d'avancement, l'élec et le méca avec
 * l'étape du jour, sa sortie et un éventuel retard. L'écran se redessine toutes les 15 s.
 */

const POS = { 1: [30, 470], 2: [450, 470], 3: [870, 470], 4: [1270, 30], 5: [800, 30] }, SW = 300, SH = 400;
const stpSvg = (t, x, y) => t.length <= 22 ? `<text class="stp" x="${x}" y="${y}">${esc(t)}</text>` : `<text class="stp" x="${x}" y="${y}" style="font-size:16px">${esc(cut(t, 31))}</text>`;
const cut = (t, n) => { t = String(t || ""); return t.length > n ? t.slice(0, n - 1) + "…" : t; };
function stationSvg(r, cur, nx, t0) {
  const [x, y] = POS[r], cx = x + SW / 2, top = r >= 4;
  const doors = top ? `<path class="door" d="M${x} ${y + 190} l-26 -22 M${x} ${y + 210} l-26 22"/>` : `<path class="door" d="M${x + SW} ${y + 190} l26 -22 M${x + SW} ${y + 210} l26 22"/>`;
  const num = `<circle class="num" cx="${x + 40}" cy="${y + 40}" r="26"/><text class="numt" x="${x + 40}" y="${y + 42}">${r}</text>`;
  if (!cur) return `<g>${doors}<rect class="bay" x="${x}" y="${y}" width="${SW}" height="${SH}" rx="8"/>${num}
    <text class="lib" x="${cx}" y="${y + 190}">Libre</text>${nx ? `<text class="sm" x="${cx}" y="${y + 240}">Prochaine : ${esc(nx.s.numero)}</text><text class="sm" x="${cx}" y="${y + 268}">entrée le ${dd(nx.debut)}</text>` : ""}</g>`;
  const wh = (v) => { const l = ppl(v); if (!l.length) return ["à affecter", " miss"]; const off = l.filter(p => presence(p, t0) !== "present"); return off.length ? [cut(l.join(", "), 12) + " · " + (l.length > 1 ? off.length + " absent" : PRES_TXT[presence(off[0], t0)].toLowerCase()), " miss"] : [cut(l.join(", "), 16), ""]; };
  const [eN, eC] = wh(cur.s.elec), [mN, mC] = wh(cur.s.meca);
  const k = workCount(cur.debut, t0), n = dur(cur.s), hex = hexOf(cur.s.couleur) || "#c9d3cc", s = cur.s, pw = SW - 60;
  return `<g class="${cur.retard ? "late" : ""}">${doors}<rect class="shel" x="${x}" y="${y}" width="${SW}" height="${SH}" rx="8" style="fill:${hex}"/>
    <rect class="panel" x="${x + 16}" y="${y + 78}" width="${SW - 32}" height="${SH - 94}" rx="8"/>${num}
    <text class="sn" x="${x + 80}" y="${y + 52}">${esc(cut(s.numero, 10))}</text>
    <text class="jr" x="${x + 30}" y="${y + 128}">J${k}<tspan class="jn">/${n}</tspan></text>
    <rect class="pg0" x="${x + 30}" y="${y + 144}" width="${pw}" height="12" rx="6"/><rect class="pg1" x="${x + 30}" y="${y + 144}" width="${pw * Math.min(1, k / n)}" height="12" rx="6"/>
    <text class="lbl" x="${x + 30}" y="${y + 190}">ÉLEC</text><text class="who${eC}" x="${x + 92}" y="${y + 190}">${esc(eN)}</text>
    ${stpSvg(stepOf(s, "elec", iso(t0)), x + 30, y + 218)}
    <text class="lbl" x="${x + 30}" y="${y + 258}">MÉCA</text><text class="who${mC}" x="${x + 92}" y="${y + 258}">${esc(mN)}</text>
    ${stpSvg(stepOf(s, "meca", iso(t0)), x + 30, y + 286)}
    <text class="sm${cur.retard ? " miss" : ""}" x="${cx}" y="${y + 340}">Sortie ${dd(cur.fin)}${cur.retard ? ` · retard ${cur.retard} j` : ""}</text>
    <text class="sm" x="${cx}" y="${y + 368}">${esc(cut([s.client, s.couleur].filter(Boolean).join(" · "), 30))}</text></g>`;
}
function renderAtelier() {
  const now = new Date(), t0 = today0();
  $("aclock").textContent = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  $("adate").innerHTML = `${esc(now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }))}<small>Semaine ${isoWeek(now)} · stations V4</small>`;
  const pl = [...S.stations.values()].filter(placed);
  let plan = "";
  for (let r = 1; r <= NB_EMPL; r++) {
    const l = pl.filter(s => Number(s.emplacement) === r).map(s => ({ s, ...info(s) })).sort((a, b) => a.debut - b.debut);
    plan += stationSvg(r, l.find(x => x.debut <= t0 && t0 <= x.fin), l.find(x => x.debut > t0), t0);
  }
  $("aplan").innerHTML = `<svg viewBox="0 0 1600 900" role="img" aria-label="Les 5 stations de l'atelier vues de dessus">${plan}</svg>`;
}
