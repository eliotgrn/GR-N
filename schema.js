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
    // coordonnées bornées : un joueur ou un point placé hors du court reste visible dans la marge
    const cl = (v, a, b) => Math.min(b, Math.max(a, +v || 0));
    const mx = (M - 11) / W, my = (M - 11) / g.H;
    const X = x => M + cl(x, -mx, 1 + mx) * W;
    const Y = y => M + cl(y, -my, 1 + my) * g.H;
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
    // étiquette de zone : dans le coin le plus proche du haut-gauche qui n'est pas caché par un joueur
    const etiq = [];
    (s.zones || []).forEach(z => {
      const x0 = X(z.x), y0 = Y(z.y), x1 = x0 + z.w * W, y1 = y0 + z.h * g.H;
      h += `<rect x="${x0}" y="${y0}" width="${z.w * W}" height="${z.h * g.H}" rx="4" fill="${C.ball}" fill-opacity=".14" stroke="${C.ball}" stroke-opacity=".7" stroke-dasharray="4 3"/>`;
      if (!z.label) return;
      const lw = 6.5 * String(z.label).length, coins = [[x0 + 7, y0 + 15, "start"], [x1 - 7, y0 + 15, "end"], [x0 + 7, y1 - 5, "start"], [x1 - 7, y1 - 5, "end"]];
      for (let yy = y0 + 35; yy < y1 - 15; yy += 20) coins.push([x0 + 7, yy, "start"], [x1 - 7, yy, "end"]);   // coins cachés : on descend le long des bords
      coins.push([x0, y0 - 4, "start"], [x1, y1 + 13, "end"], [x1 + 4, y0 + 12, "start"], [x0 - 4, y0 + 12, "end"]);   // petite zone encombrée : juste à côté
      const boite = ([x, y, a]) => a === "start" ? [x, y - 11, x + lw, y + 1] : [x - lw, y - 11, x, y + 1];
      const cache = b => (s.joueurs || []).some(j => { const px = X(j.x), py = Y(j.y); return px > b[0] - 12 && px < b[2] + 12 && py > b[1] - 12 && py < b[3] + 12; })
        || etiq.some(e => b[0] < e[5] + 4 && b[2] > e[3] - 4 && b[1] < e[6] + 3 && b[3] > e[4] - 3)   // ni sous un joueur, ni sur une autre étiquette
        || b[0] < 2 || b[2] > g.vbW - 2 || b[1] < 2 || b[3] > g.vbH - 2;   // ni hors du dessin
      const c = coins.find(k => !cache(boite(k))) || coins[0], bx = boite(c);
      etiq.push([(bx[0] + bx[2]) / 2, (bx[1] + bx[3]) / 2, Math.max(6, lw / 2), bx[0], bx[1], bx[2], bx[3]]);
      h += `<text x="${c[0]}" y="${c[1]}" text-anchor="${c[2]}" font-family="Barlow Condensed,Arial Narrow,sans-serif" font-weight="700" font-size="14" fill="${C.ball}">${esc(z.label)}</text>`;
    });
    // plots
    (s.plots || []).forEach(p => { h += `<path d="M${X(p.x)} ${Y(p.y) - 6}l5 10h-10z" fill="#FF9F43"/>`; });
    const pos = {}; (s.joueurs || []).forEach(j => { pos[j.id] = [j.x, j.y]; });
    // le déroulé suit les numéros : un joueur qui s'est déplacé (déplacement de numéro plus petit) frappe ou repart de sa nouvelle place
    const acts = [...(s.frappes || []).map(a => ({ k: "f", a })), ...(s.deplacements || []).map(a => ({ k: "d", a }))];
    const ici = (v, n, frappe) => {   // position de v (joueur ou point) au moment de l'action numéro n ; une frappe suit le déplacement de même numéro (« se déplace et frappe »)
      if (Array.isArray(v)) return v;
      let p = pos[v] || [.5, .5], best = 0;
      if (n) acts.forEach(({ k, a }) => { const o = +a.ordre; if (k === "d" && a.de === v && Array.isArray(a.vers) && o && (o < n || (frappe && o === n)) && o >= best) { best = o; p = a.vers; } });
      return p;
    };
    const badge = (x, y, n, col) => `<circle cx="${x}" cy="${y}" r="8" fill="${C.bg}" stroke="${col}" stroke-width="1.6"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-family="Barlow,Arial,sans-serif" font-weight="700" font-size="10.5" fill="${col}">${n}</text>`;
    // géométrie de tous les trajets : at(t) → [x, y, dx, dy] (point et tangente)
    const T = acts.map(({ k, a }) => {
      const p1 = ici(a.de, +a.ordre, k === "f"), p2 = ici(a.vers, +a.ordre, k === "f");
      const x1 = X(p1[0]), y1 = Y(p1[1]), x2 = X(p2[0]), y2 = Y(p2[1]);
      if (k === "d") return { k, a, x1, y1, x2, y2, at: t => [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, x2 - x1, y2 - y1] };
      const cx = (x1 + x2) / 2 + (a.effet === "slice" ? -14 : 14) * (x2 >= x1 ? 1 : -1), cy = (y1 + y2) / 2;
      return { k, a, x1, y1, x2, y2, cx, cy, at: t => { const u = 1 - t; return [u * u * x1 + 2 * u * t * cx + t * t * x2, u * u * y1 + 2 * u * t * cy + t * t * y2, 2 * u * (cx - x1) + 2 * t * (x2 - cx), 2 * u * (cy - y1) + 2 * t * (y2 - cy)]; } };
    });
    // déplacements (pointillés verts) puis frappes (courbes jaunes)
    T.filter(p => p.k === "d").forEach(p => { h += `<path d="M${p.x1} ${p.y1}L${p.x2} ${p.y2}" stroke="${C.line}" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#gsD)" fill="none"/>`; });
    T.filter(p => p.k === "f").forEach(p => {
      h += `<path d="M${p.x1} ${p.y1}Q${p.cx} ${p.cy} ${p.x2} ${p.y2}" stroke="${C.ball}" stroke-width="2.4" fill="none" marker-end="url(#gsF)"/>`;
      h += `<circle cx="${p.x2}" cy="${p.y2}" r="3.4" fill="${C.ball}"/>`;
    });
    // numéros : près de leur trajet, jamais sur un joueur, un plot, un point de chute, une étiquette de zone ou un autre numéro ; si possible hors des autres trajets
    const dur = (s.joueurs || []).map(j => [X(j.x), Y(j.y), 13]);
    T.forEach(p => dur.push([p.x2, p.y2, 5]));
    (s.plots || []).forEach(q => dur.push([X(q.x), Y(q.y), 7]));
    etiq.forEach(e => dur.push(e.slice(0, 3)));
    const echant = T.map(p => { const r = []; for (let i = 0; i <= 24; i++) r.push(p.at(i / 24)); return r; });
    const dansCadre = (x, y) => x > 9 && x < g.vbW - 9 && y > 9 && y < g.vbH - 9;
    const cout = (x, y, moi) => {
      let c = 0;
      for (const [ox, oy, r] of dur) { const d = Math.hypot(x - ox, y - oy); if (d < r + 9) c += 100 + (r + 9 - d); }
      echant.forEach((e, i) => {   // sur son propre trajet : à éviter ; près d'un autre trajet : ambigu (à quel trajet est ce numéro ?)
        let m = 1e9; for (const [ex, ey] of e) m = Math.min(m, Math.hypot(x - ex, y - ey));
        if (i === moi) { if (m < 9.5) c += 40; } else if (m < 16) c += (m < 10 ? 12 : 0) + (16 - m) * 1.2;
      });
      return dansCadre(x, y) ? c : c + 1000;
    };
    T.map((p, i) => [p, i]).filter(([p]) => p.a.ordre).sort((u, v) => (+u[0].a.ordre) - (+v[0].a.ordre)).forEach(([p, i]) => {
      let best = null;
      const essai = (x, y, pref) => { const c = cout(x, y, i) + pref; if (!best || c < best[2]) best = [x, y, c]; };
      [.5, .4, .6, .32, .68, .25, .75, .18, .82].forEach((t, r) => {
        const [x, y, dx, dy] = p.at(t), L = Math.hypot(dx, dy) || 1;
        for (const sgn of [1, -1]) essai(x - dy / L * 11 * sgn, y + dx / L * 11 * sgn, r * .8 + (sgn < 0 ? .3 : 0));
      });
      if (best[2] >= 12) {   // trajet très court ou encombré : on cherche autour du milieu
        const [mx, my] = p.at(.5);
        for (const r of [18, 24, 30]) for (let k = 0; k < 12; k++) essai(mx + r * Math.cos(k * Math.PI / 6), my + r * Math.sin(k * Math.PI / 6), 8 + r / 3);
      }
      dur.push([best[0], best[1], 8]);
      h += badge(best[0], best[1], p.a.ordre, p.k === "f" ? C.ball : C.line);
    });
    // joueurs
    // deux joueurs trop proches (données ou bornage) : on les écarte légèrement pour qu'ils restent lisibles
    const posJ = (s.joueurs || []).map(j => [X(j.x), Y(j.y)]);
    for (let i = 0; i < posJ.length; i++) for (let k = 0; k < i; k++) {
      const dx = posJ[i][0] - posJ[k][0], dy = posJ[i][1] - posJ[k][1], d = Math.hypot(dx, dy);
      if (d < 21) { const ux = d ? dx / d : 1, uy = d ? dy / d : 0, push = (21 - d); posJ[i][0] += ux * push; posJ[i][1] += uy * push; if (Math.abs(ux) < .5) posJ[i][0] += 12; }
    }
    (s.joueurs || []).forEach((j, ji) => {
      const jx = posJ[ji][0], jy = posJ[ji][1];
      const col = j.role === "adversaire" ? C.opp : j.role === "entraineur" ? C.coach : C.ink;
      h += `<circle cx="${jx}" cy="${jy}" r="10" fill="${col}"/><text x="${jx}" y="${jy + 4.5}" text-anchor="middle" font-family="Barlow Condensed,Arial Narrow,sans-serif" font-weight="800" font-size="13" fill="${C.bg}">${esc(j.id)}</text>`;
    });
    return h + `</svg>`;
  }
  // géométrie du dessin (éditeur de schéma : du toucher aux coordonnées 0-1) ; M = marge, W = largeur du court, H = longueur dessinée
  function dims(terrain) { const g = geo(terrain === "demi"); return { M, W, H: W * g.L / 10.97, vbW: g.vbW, vbH: g.vbH }; }
  window.GRUN_SCHEMA = { svg, dims, couleurs: C };
})();
