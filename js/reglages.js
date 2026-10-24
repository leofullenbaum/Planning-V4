/* Réglages : noms des emplacements, durée standard, personnes et gammes.
 *
 * Les gammes se saisissent une étape par ligne, « Nom ; 11 h » ou « Nom ; 1,5 j » (7 h par jour).
 * parseGamme() transforme ce texte en { etapesMeca: [...], heuresMeca: [...] }.
 */

const fmtH = (h) => !(h > 0) ? "" : (h >= 14 && (h / 7) % 0.5 === 0 ? String(h / 7).replace(".", ",") + " j" : String(h).replace(".", ",") + " h");
const gammeTxt = (names, hrs) => names.map((n, i) => (hrs || [])[i] > 0 ? `${n} ; ${fmtH(hrs[i])}` : n).join("\n");
function parseGamme(id, suf) {
  const names = [], hrs = [];
  $(id).value.split("\n").map(x => x.trim()).filter(Boolean).forEach((l) => {
    const m = l.match(/^(.*?)\s*[;|]\s*([\d.,]+)\s*(h|j)?[a-z]*\s*$/i);
    const n = (m ? m[1] : l).trim(); if (!n || names.includes(n)) return;
    let h = m ? parseFloat(m[2].replace(",", ".")) : 0; if (m && /^j/i.test(m[3] || "")) h *= H_JOUR;
    names.push(n); hrs.push(h > 0 ? h : null);
  });
  return { ["etapes" + suf]: names, ["heures" + suf]: hrs };
}
const lines = (id) => [...new Set($(id).value.split("\n").map(x => x.trim()).filter(Boolean))];
function openSettings() {
  openSheet(`<h2>Réglages</h2>
    <form id="cfgForm" class="fields">
      ${S.cfg.noms.map((n, i) => `<label class="f full">Nom de l'emplacement ${i + 1}<input id="c-n${i}" value="${esc(n)}" required></label>`).join("")}
      <label class="f">Durée standard (jours)<input id="c-duree" type="number" min="1" step="1" value="${esc(S.cfg.duree)}"></label>
      <label class="f">Électriciens (un par ligne)<textarea id="c-elecs" rows="4">${esc(S.cfg.elecs.join("\n"))}</textarea></label>
      <label class="f">Mécaniciens (un par ligne)<textarea id="c-mecas" rows="4">${esc(S.cfg.mecas.join("\n"))}</textarea></label>
      <label class="f">Gamme élec, dans l'ordre (étape ; durée)<textarea id="c-ee" rows="9">${esc(gammeTxt(S.cfg.etapesElec, S.cfg.heuresElec))}</textarea></label>
      <label class="f">Gamme méca, dans l'ordre (étape ; durée)<textarea id="c-em" rows="9">${esc(gammeTxt(S.cfg.etapesMeca, S.cfg.heuresMeca))}</textarea></label>
      <label class="chk" style="align-self:end;padding-bottom:8px"><input id="c-ouvres" type="checkbox"${S.cfg.ouvres ? " checked" : ""}> Jours ouvrés seulement</label>
      <div class="hint full">La durée standard s'applique aux nouvelles commandes et à celles sans durée propre. « Jours ouvrés » exclut les samedis et dimanches du décompte. Gamme : une étape par ligne, avec sa durée en heures ou en jours (ex. « MECA ODO 1 ; 11 h » ou « TEST ELEC ; 4 j », 7 h par jour). Les journées de chaque station se remplissent selon cet ordre, sauf si une étape est fixée sur la station ou sur le jour. Les jours fériés ne sont pas encore pris en compte.</div>
      <div class="actions full"><button class="btn primary" type="submit">Enregistrer</button><button class="btn" type="button" id="cancel">Annuler</button></div>
    </form>`);
  $("cancel").onclick = closeSheet;
  $("cfgForm").onsubmit = (e) => {
    e.preventDefault(); if (guard()) return;
    saveCfg({ noms: S.cfg.noms.map((_, i) => $("c-n" + i).value.trim() || "Emplacement " + (i + 1)), duree: Number($("c-duree").value) || 17, ouvres: $("c-ouvres").checked,
      elecs: lines("c-elecs"), mecas: lines("c-mecas"), ...parseGamme("c-ee", "Elec"), ...parseGamme("c-em", "Meca") });
    closeSheet(); render();
  };
}
