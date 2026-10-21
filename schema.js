/* GRÜN · schémas d'exercices (format plan/SCHEMAS_EXERCICES.md)
   window.GRUN_SCHEMA.svg(schema, {w, cls}) → chaîne SVG du court vu de dessus, style Night court.
   Coordonnées 0-1 : x = largeur du court (doubles), y = longueur (0 = fond du haut, 1 = fond du bas). */
(function () {
  const C = { bg: "#07090A", line: "#3BE08A", lineOp: .55, ball: "#E4FF3A", ink: "#F2F5F0", mute: "#9AA59E", opp: "#FF7A59", coach: "#9AA59E" };
  // court en double : 10,97 m × 23,77 m ; marge autour
  const W = 220, M = 18;
  function geo(demi) {
    const L = demi ? 23.77 / 2 + 1.2 : 23.77, H = W * L / 10.97;
    return { L, H, vbW: W + 2 * M, vbH: H + 2 * M };
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function svg(s, o) {
    o = o || {};
    s = s || {};
    const demi = s.terrain === "demi";
    const g = geo(demi);
    // y du schéma (0-1) → y en pixels ; en demi-terrain, 0 = filet (un peu au-delà), 1 = fond du bas
    const X = x => M + x * W;
    const Y = demi ? (y => M + y * g.H) : (y => M + y * g.H);
    const m = W / 10.97; // pixels par mètre
    const sx = 1.37 * m; // couloir
    let h = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.vbW} ${g.vbH}"${o.w ? ` width="${o.w}"` : ""} class="${o.cls || "gs"}" role="img" aria-label="${esc(s.titre || "Schéma de l'exercice")}">`;
    h += `<defs><marker id="gsF" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${C.ball}"/></marker><marker id="gsD" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${C.line}"/></marker></defs>`;
    h += `<rect width="${g.vbW}" height="${g.vbH}" rx="14" fill="${C.bg}"/>`;
    // lignes du court
    const top = M, bot = M + g.H, left = M, right = M + W;
    const net = demi ? M + 1.2 * m : M + g.H / 2;
    const svc = 6.40 * m;
    let L = `<g stroke="${C.line}" stroke-opacity="${C.lineOp}" stroke-width="1.6" fill="none">`;
    if (!demi) L += `<rect x="${left}" y="${top}" width="${W}" height="${g.H}"/>`;
    else L += `<path d="M${left} ${net}V${bot}H${right}V${net}"/>`;
    L += `<path d="M${left + sx} ${demi ? net : top}V${bot}M${right - sx} ${demi ? net : top}V${bot}"/>`;
    L += `<path d="M${left + sx} ${net + svc}H${right - sx}M${M + W / 2} ${net}V${net + svc}"/>`;
    if (!demi) L += `<path d="M${left + sx} ${net - svc}H${right - sx}M${M + W / 2} ${net - svc}V${net}"/>`;
    L += `</g><path d="M${left - 6} ${net}H${right + 6}" stroke="${C.mute}" stroke-width="2.4"/>`;
    h += L;
    // zones cibles
    (s.zones || []).forEach(z => {
      h += `<rect x="${X(z.x)}" y="${Y(z.y)}" width="${z.w * W}" height="${z.h * g.H}" rx="4" fill="${C.ball}" fill-opacity=".14" stroke="${C.ball}" stroke-opacity=".7" stroke-dasharray="4 3"/>`;
      if (z.label) h += `<text x="${X(z.x) + 7}" y="${Y(z.y) + 15}" text-anchor="start" font-family="Barlow Condensed,Arial Narrow,sans-serif" font-weight="700" font-size="14" fill="${C.ball}">${esc(z.label)}</text>`;
    });
    // plots
    (s.plots || []).forEach(p => { h += `<path d="M${X(p.x)} ${Y(p.y) - 6}l5 10h-10z" fill="#FF9F43"/>`; });
    const pos = {}; (s.joueurs || []).forEach(j => { pos[j.id] = [j.x, j.y]; });
    const pt = v => Array.isArray(v) ? v : (pos[v] || [.5, .5]);
    const badge = (x, y, n, col) => `<circle cx="${x}" cy="${y}" r="8" fill="${C.bg}" stroke="${col}" stroke-width="1.6"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-family="Barlow,Arial,sans-serif" font-weight="700" font-size="10.5" fill="${col}">${n}</text>`;
    // déplacements (pointillés verts)
    (s.deplacements || []).forEach(d => {
      const a = pt(d.de), b = pt(d.vers);
      h += `<path d="M${X(a[0])} ${Y(a[1])}L${X(b[0])} ${Y(b[1])}" stroke="${C.line}" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#gsD)" fill="none"/>`;
      if (d.ordre) h += badge((X(a[0]) + X(b[0])) / 2 + 10, (Y(a[1]) + Y(b[1])) / 2, d.ordre, C.line);
    });
    // frappes (courbes jaunes)
    (s.frappes || []).forEach(f => {
      const a = pt(f.de), b = pt(f.vers);
      const x1 = X(a[0]), y1 = Y(a[1]), x2 = X(b[0]), y2 = Y(b[1]);
      const cx = (x1 + x2) / 2 + (f.effet === "slice" ? -14 : 14) * (x2 >= x1 ? 1 : -1), cy = (y1 + y2) / 2;
      h += `<path d="M${x1} ${y1}Q${cx} ${cy} ${x2} ${y2}" stroke="${C.ball}" stroke-width="2.4" fill="none" marker-end="url(#gsF)"/>`;
      h += `<circle cx="${x2}" cy="${y2}" r="3.4" fill="${C.ball}"/>`;
      if (f.ordre) h += badge(cx, cy, f.ordre, C.ball);
    });
    // joueurs
    (s.joueurs || []).forEach(j => {
      const col = j.role === "adversaire" ? C.opp : j.role === "entraineur" ? C.coach : C.ink;
      h += `<circle cx="${X(j.x)}" cy="${Y(j.y)}" r="10" fill="${col}"/><text x="${X(j.x)}" y="${Y(j.y) + 4.5}" text-anchor="middle" font-family="Barlow Condensed,Arial Narrow,sans-serif" font-weight="800" font-size="13" fill="${C.bg}">${esc(j.id)}</text>`;
    });
    return h + `</svg>`;
  }
  // géométrie du dessin (éditeur de schéma : du toucher aux coordonnées 0-1) ; M = marge, W = largeur du court, H = longueur dessinée
  function dims(terrain) { const g = geo(terrain === "demi"); return { M, W, H: W * g.L / 10.97, vbW: g.vbW, vbH: g.vbH }; }
  window.GRUN_SCHEMA = { svg, dims, couleurs: C };
})();
