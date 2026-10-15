/* GRÜN — noyau commun à tous les modules (chargé AVANT le script du module).
   Tout est stocké sur l'appareil (localStorage). Demain : comptes + base en ligne branchés ici (G.sync).
   Règle : un module ne lit/écrit JAMAIS directement les joueurs, groupes, journal, banque perso, tests perso :
   il passe par GRUN.*. Ses propres données (séances, plans, routines…) restent sous sa clé historique. */
(function () {
  "use strict";
  const G = (window.GRUN = {});
  G.version = "1.0";

  /* ---------- stockage ---------- */
  G.load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  G.save = (k, o) => { try { localStorage.setItem(k, JSON.stringify(o)); emit(k); return true; } catch (e) { console.warn("GRUN.save", k, e); return false; } };
  G.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  G.today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  G.esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  G.frD = s => s ? String(s).slice(0, 10).split("-").reverse().join("/") : "";

  /* Clés : les clés historiques sont gardées (reprise automatique des données des anciennes applis, même origine). */
  G.K = {
    joueurs: "grilles_joueurs_v1",     // {joueurs:[Joueur]}  (partagé depuis l'appli Grilles)
    groupes: "grun_groupes_v1",        // {groupes:[Groupe]}
    journal: "grun_journal_v1",        // {retours:[Retour], forme:[Forme]}
    banque: "grun_banque_v1",          // {perso:[Exo], over:{id:patch}, fav:[id], hide:[id]}
    tests: "grun_tests_v1",            // {perso:[Test], over:{id:patch}}
    handoff: "grun_handoff_v1",        // passage de relais entre modules (poupée russe)
    mode: "grun_mode_v1",              // {m:"coach"|"joueur", jid}
    reglages: "grun_reglages_v1",      // {theme, fs, nomCoach}
    // données propres aux modules (inchangées) :
    veille: "veille_v1", banqueDocs: "banque_v1", grillesDocs: "grilles_docs_v1", saisons: "saisons_v1",
    prog: "programmation_v1", progCache: "programmation_cache_v1", seances: "seances_v1", routines: "routines_v1",
    radar: "radar_joueurs_v1"
  };

  /* ---------- évènements (même page + autres onglets) ---------- */
  const L = {};
  function emit(k) { (L[k] || []).forEach(f => { try { f(); } catch (e) { console.error(e); } }); }
  G.on = (k, f) => { (L[k] ||= []).push(f); };
  addEventListener("storage", e => { if (e.key) emit(e.key); });

  /* ---------- modules et pôles ---------- */
  G.POLES = [
    { id: "ind", t: "Individualisation", s: "Le dossier complet de chaque joueur et de chaque groupe", c: "#0F766E" },
    { id: "create", t: "Create", s: "Prog, séance, warm-up : construits pour le joueur", c: "#C2410C" },
    { id: "res", t: "Ressources et savoirs", s: "Veille, banque d'exercices, référentiel de programmation", c: "#1D4ED8" },
    { id: "tests", t: "Tests et profilage", s: "Grilles de compétences, tests, profil radar", c: "#6D3FC0" }
  ];
  G.MODS = {
    accueil: { f: "index.html", t: "Accueil", pole: null },
    joueurs: { f: "index.html", h: "#/joueurs", t: "Individualisation", pole: "ind" },
    prog: { f: "prog.html", t: "Create my prog", pole: "create", s: "Programmation adaptée au joueur : semaine, cycle ou saison" },
    seances: { f: "seances.html", t: "Create my séance", pole: "create", s: "Structure automatique, exos choisis dans la banque" },
    warmup: { f: "warmup.html", t: "Choose your warm-up", pole: "create", s: "30 échauffements performance prêts à lancer, modifiables" },
    veille: { f: "veille.html", t: "Veille de connaissances", pole: "res", s: "291 documents : âge, préparation physique, biomécanique, entraîner" },
    banque: { f: "banque.html", t: "Banque d'exercices", pole: "res", s: "Tous les exercices, jeux et situations, plus les tiens" },
    saisons: { f: "saisons.html", t: "Référentiel de programmation", pole: "res", s: "Les saisons de référence de la méthode, 4 à 18 ans" },
    grilles: { f: "grilles.html", t: "Grilles et tests", pole: "tests", s: "Grilles de compétences 4-18 ans, tests, barèmes, bilans, profil radar" }
  };
  G.href = (mod, hash) => { const m = G.MODS[mod]; if (!m) return "index.html"; return m.f + (hash != null ? (String(hash).startsWith("#") ? hash : "#" + hash) : (m.h || "")); };
  G.go = (mod, hash) => { location.href = G.href(mod, hash); };

  /* ---------- mode coach / joueur ---------- */
  G.mode = () => G.load(G.K.mode, { m: "coach", jid: null });
  G.setMode = (m, jid) => G.save(G.K.mode, { m, jid: jid || null });
  G.isJoueur = () => G.mode().m === "joueur";
  /* profil d'utilisation : "coach" (défaut) ou "autonome" (joueur sans coach, son propre profil jidMoi) */
  G.reglages = () => G.load(G.K.reglages, {});
  G.profil = () => G.reglages().profil || "coach";
  G.moi = () => G.reglages().jidMoi || null;
  G.isAutonome = () => G.profil() === "autonome";
  /* thème et taille du texte, appliqués à chaque module */
  (function appliquerReglages() { const r = G.reglages(); const h = document.documentElement;
    if (r.theme === "light" || r.theme === "dark") h.setAttribute("data-theme", r.theme); else if (r.theme === "auto") h.removeAttribute("data-theme");
    if (r.fs && +r.fs !== 100) { h.style.setProperty("--grun-fs", r.fs / 100); h.style.fontSize = r.fs + "%"; } })();

  /* ---------- JOUEURS ----------
     Joueur = {id, nom, sexe:"F"|"G", naissance:"AAAA-MM-JJ", groupe:"texte libre (ancien)", notes,
       bilans:[{id,date,age,note,v:{PP:[],GE:[],DE:[]},sel:[],res:{}}], cur,         // grilles (module Grilles)
       main:"D"|"G", revers:"1"|"2", classement:"NC"|"40"|…, croissance:bool, zones:[], prio:[], objectifs:"",
       dispo:{pp:n, tennis:n}, mesures:[{date,taille,assise,poids,envergure}], blessures:[{id,debut,fin,zone,desc,statut}],
       agenda:[{id,date,fin,type:"tournoi"|"bilan"|"seance"|"repos"|"autre",titre,ref}], favWarmup:[idRoutine], cree, maj } */
  const JDEF = { groupe: "", notes: "", bilans: [], main: "D", revers: "2", classement: "NC", croissance: false, zones: [], prio: [], objectifs: "", dispo: {}, mesures: [], blessures: [], agenda: [], favWarmup: [] };
  function jstore() { const s = G.load(G.K.joueurs, { joueurs: [] }); if (!Array.isArray(s.joueurs)) s.joueurs = []; return s; }
  function norm(j) { for (const k in JDEF) if (j[k] == null) j[k] = JSON.parse(JSON.stringify(JDEF[k])); return j; }
  G.joueurs = {
    all(o) { return jstore().joueurs.filter(j => (o && o.archives) || !j.archive).map(norm).sort((a, b) => a.nom.localeCompare(b.nom, "fr")); },
    get(id) { const j = jstore().joueurs.find(x => x.id === id); return j ? norm(j) : null; },
    save(j) { const s = jstore(); const i = s.joueurs.findIndex(x => x.id === j.id); j.maj = G.today(); if (i < 0) s.joueurs.push(j); else s.joueurs[i] = j; return G.save(G.K.joueurs, s); },
    create(f) { const j = norm({ id: G.uid(), nom: (f.nom || "").trim() || "Sans nom", sexe: f.sexe === "F" ? "F" : "G", naissance: f.naissance || "", cree: G.today(), ...f }); j.id = j.id || G.uid(); G.joueurs.save(j); return j; },
    update(id, patch) { const j = G.joueurs.get(id); if (!j) return null; Object.assign(j, patch); G.joueurs.save(j); return j; },
    /* SUPPRESSION DÉFINITIVE : la fiche + tout ce qui ne concerne que lui (journal, plans individuels, séances et routines dont il est le seul joueur) ;
       il est retiré des groupes, des séances et routines partagées. */
    remove(id) {
      const s = jstore(); s.joueurs = s.joueurs.filter(x => x.id !== id); G.save(G.K.joueurs, s);
      const g = gstore(); g.groupes.forEach(x => x.jids = x.jids.filter(y => y !== id)); G.save(G.K.groupes, g);
      const J = G.load(G.K.journal, null); if (J) { J.retours = (J.retours || []).filter(r => r.jid !== id); J.forme = (J.forme || []).filter(r => r.jid !== id); G.save(G.K.journal, J); }
      const P = G.load(G.K.prog, null); if (P) { if (Array.isArray(P.plans)) P.plans = P.plans.filter(p => p.jid !== id); if (P.profils) delete P.profils[id]; G.save(G.K.prog, P); }
      const C = G.load(G.K.progCache, null); if (C && typeof C === "object") { for (const k in C) if (C[k] && C[k].jid === id) delete C[k]; G.save(G.K.progCache, C); }
      const S = G.load(G.K.seances, null); if (S && Array.isArray(S.seances)) { S.seances = S.seances.filter(x => !(Array.isArray(x.joueurs) && x.joueurs.length === 1 && x.joueurs[0] === id && !x.gid)); S.seances.forEach(x => { if (Array.isArray(x.joueurs)) x.joueurs = x.joueurs.filter(y => y !== id); }); G.save(G.K.seances, S); }
      const R = G.load(G.K.routines, null); if (R && Array.isArray(R.routines)) { R.routines = R.routines.filter(x => !(Array.isArray(x.jids) && x.jids.length === 1 && x.jids[0] === id && !x.gid)); R.routines.forEach(x => { if (Array.isArray(x.jids)) x.jids = x.jids.filter(y => y !== id); }); if (Array.isArray(R.hist)) R.hist = R.hist.filter(h => h.jid !== id && h.who !== id); if (R.profil) delete R.profil[id]; G.save(G.K.routines, R); }
      const D = G.load(G.K.grillesDocs, null); if (D && Array.isArray(D.gbs)) { D.gbs.forEach(x => { if (Array.isArray(x.jids)) x.jids = x.jids.filter(y => y !== id); }); G.save(G.K.grillesDocs, D); }
      const C2 = G.load(G.K.progCache, null); if (C2 && typeof C2 === "object") { for (const k in C2) if (C2[k] && Array.isArray(C2[k].jids)) C2[k].jids = C2[k].jids.filter(y => y !== id); G.save(G.K.progCache, C2); }
      const Rg = G.reglages(); if (Rg.jidMoi === id) { delete Rg.jidMoi; G.save(G.K.reglages, Rg); }
      const M = G.mode(); if (M.jid === id) G.setMode("coach", null);
    },
    /* ARCHIVER (« je ne l'entraîne plus ») : il disparaît de toutes les listes, son dossier reste consultable et restaurable. */
    archiver(id, oui = true) { return G.joueurs.update(id, { archive: !!oui, archiveLe: oui ? G.today() : null }); },
    archives() { return jstore().joueurs.filter(j => j.archive).map(norm).sort((a, b) => a.nom.localeCompare(b.nom, "fr")); },
    /* retrouver ou créer (réception d'un envoi) */
    ensure(f) { const s = jstore(); let j = s.joueurs.find(x => x.id === f.id) || s.joueurs.find(x => x.nom === f.nom && (x.naissance || "") === (f.naissance || "")); return j ? norm(j) : G.joueurs.create(f); }
  };
  G.on(G.K.joueurs, () => emit("grun:joueurs"));

  /* âge civil (entier) et décimal */
  G.ageCiv = (nai, ref) => { if (!nai) return null; const a = new Date(nai), r = new Date(ref || G.today()); let y = r.getFullYear() - a.getFullYear(); if (r.getMonth() < a.getMonth() || (r.getMonth() === a.getMonth() && r.getDate() < a.getDate())) y--; return y; };
  /* adulte : case cochée sur la fiche (j.adulte) ou 19 ans et plus. Grille de référence adulte = 18 ans. */
  G.adulte = () => false; /* GRÜN = 4-18 ans uniquement (décision du 15 oct. 23 h 12) ; les adultes auront leur propre appli « GRÜN Adulte » */
  G.ageDec = (nai, ref) => nai ? (new Date(ref || G.today()) - new Date(nai)) / (365.25 * 864e5) : null;

  /* ---------- MATURATION (âge biologique) ----------
     Décalage de maturité (Mirwald) à partir de la taille, de la taille assise, du poids et de l'âge ;
     âge du pic de croissance (APHV) = âge − décalage ; âge biologique = âge + (APHV de référence − APHV du joueur),
     références de la méthode : filles ≈ 12 ans, garçons ≈ 14 ans. Sans taille assise : formule de Moore (taille ou taille assise). */
  G.REF_APHV = { F: 12.0, G: 14.0 };
  G.maturite = (j, m) => {
    if (G.adulte(j)) return null;
    m = m || (j.mesures || []).filter(x => x.taille).sort((a, b) => a.date < b.date ? 1 : -1)[0];
    if (!m || !j.naissance) return null;
    const A = G.ageDec(j.naissance, m.date), H = +m.taille, SH = +m.assise || null, W = +m.poids || null;
    if (!A || !H) return null;
    let off = null, methode = "";
    if (SH && W) {
      const LL = H - SH;
      off = j.sexe === "F"
        ? -9.376 + 0.0001882 * (LL * SH) + 0.0022 * (A * LL) + 0.005841 * (A * SH) - 0.002658 * (A * W) + 0.07693 * (W / H * 100)
        : -9.236 + 0.0002708 * (LL * SH) - 0.001663 * (A * LL) + 0.007216 * (A * SH) + 0.02292 * (W / H * 100);
      methode = "taille, taille assise, poids";
    } else if (j.sexe === "F") { off = -7.709133 + 0.0042232 * (A * H); methode = "taille seule (estimation)"; }
    else if (SH) { off = -8.1 + 0.0070346 * (A * SH); methode = "taille assise (estimation)"; }
    else return null;
    const aphv = A - off, bio = A + (G.REF_APHV[j.sexe] - aphv);
    const statut = off < -1 ? "avant le pic" : off <= 1 ? "autour du pic (zone sensible)" : "après le pic";
    const avance = aphv < G.REF_APHV[j.sexe] - 1 ? "précoce" : aphv > G.REF_APHV[j.sexe] + 1 ? "tardif" : "dans la moyenne";
    return { date: m.date, age: A, decalage: off, aphv, bio, grille: Math.max(4, Math.min(18, Math.round(bio))), statut, avance, methode };
  };
  /* vitesse de croissance (cm/an) entre les 2 dernières mesures espacées d'au moins 3 mois */
  G.vitesseCroissance = j => {
    const M = (j.mesures || []).filter(x => x.taille).sort((a, b) => a.date < b.date ? -1 : 1); if (M.length < 2) return null;
    const b = M[M.length - 1]; let a = null; for (let i = M.length - 2; i >= 0; i--) { if ((new Date(b.date) - new Date(M[i].date)) / 864e5 >= 90) { a = M[i]; break; } }
    if (!a) return null; const ans = (new Date(b.date) - new Date(a.date)) / (365.25 * 864e5); return (b.taille - a.taille) / ans;
  };
  /* grille conseillée : âge biologique si mesures, sinon âge civil */
  G.grilleConseillee = j => { if (G.adulte(j)) return 18; const m = G.maturite(j); if (m) return m.grille; const a = G.ageCiv(j.naissance); return a == null ? null : Math.max(4, Math.min(18, a)); };

  /* ---------- GROUPES ---------- Groupe = {id, nom, jids:[], notes, couleur, cree} */
  function gstore() { const s = G.load(G.K.groupes, { groupes: [] }); if (!Array.isArray(s.groupes)) s.groupes = []; return s; }
  G.groupes = {
    all() { return gstore().groupes.sort((a, b) => a.nom.localeCompare(b.nom, "fr")); },
    get(id) { return gstore().groupes.find(x => x.id === id) || null; },
    save(g) { const s = gstore(); const i = s.groupes.findIndex(x => x.id === g.id); if (i < 0) s.groupes.push(g); else s.groupes[i] = g; return G.save(G.K.groupes, s); },
    create(f) { const g = { id: G.uid(), nom: (f.nom || "").trim() || "Groupe", jids: f.jids || [], notes: f.notes || "", cree: G.today() }; G.groupes.save(g); return g; },
    remove(id) { const s = gstore(); s.groupes = s.groupes.filter(x => x.id !== id); G.save(G.K.groupes, s); },
    joueurs(id) { const g = G.groupes.get(id); return g ? g.jids.map(G.joueurs.get).filter(j => j && !j.archive) : []; },   // un joueur archivé n'apparaît plus dans son groupe
    de(jid) { return gstore().groupes.filter(g => g.jids.includes(jid)); }
  };

  /* ---------- JOURNAL ----------
     Retour = {id, jid, date, type:"seance"|"warmup"|"tennis"|"match"|"autre", ref (id séance/routine), titre, duree (min), rpe (0-10), douleur:{zone,int}|null, fait:true|false|"partiel", comment}
     Forme  = {id, jid, date, sommeil, fatigue, courbatures, stress, humeur (tous de 1 à 5, 5 = MEILLEUR état : fatigue 5 = plein d'énergie), douleur:{zone,int}|null, comment}
     Charge d'une séance = rpe × durée (UA). Aiguë = somme 7 j ; chronique = moyenne hebdo sur 28 j ; ratio aigu/chronique. */
  function jr() { const s = G.load(G.K.journal, { retours: [], forme: [] }); s.retours ||= []; s.forme ||= []; return s; }
  G.journal = {
    retours(jid) { return jr().retours.filter(r => !jid || r.jid === jid).sort((a, b) => a.date < b.date ? 1 : -1); },
    forme(jid) { return jr().forme.filter(r => !jid || r.jid === jid).sort((a, b) => a.date < b.date ? 1 : -1); },
    addRetour(r) { const s = jr(); r.id ||= G.uid(); r.date ||= G.today(); const i = s.retours.findIndex(x => x.id === r.id); if (i < 0) s.retours.push(r); else s.retours[i] = r; G.save(G.K.journal, s); return r; },
    addForme(f) { const s = jr(); f.id ||= G.uid(); f.date ||= G.today(); const i = s.forme.findIndex(x => x.jid === f.jid && x.date === f.date); if (i < 0) s.forme.push(f); else s.forme[i] = { ...s.forme[i], ...f }; G.save(G.K.journal, s); return f; },
    remove(id) { const s = jr(); s.retours = s.retours.filter(x => x.id !== id); s.forme = s.forme.filter(x => x.id !== id); G.save(G.K.journal, s); },
    charge(jid, ref) {
      const R = jr().retours.filter(r => r.jid === jid && r.rpe != null && r.duree), end = new Date(ref || G.today());
      const days = n => R.filter(r => { const d = (end - new Date(r.date)) / 864e5; return d >= 0 && d < n; }).reduce((a, r) => a + r.rpe * r.duree, 0);
      const prem = R.length ? R.map(r => r.date).sort()[0] : null, recul = prem ? (end - new Date(prem)) / 864e5 : 0;
      const aigu = days(7), chron = days(28) / 4, ratio = chron && recul >= 21 ? aigu / chron : null;
      const alerte = ratio == null ? null : ratio > 1.5 ? "haute" : ratio > 1.3 ? "attention" : ratio < 0.8 ? "basse" : "ok";
      const semaines = []; for (let k = 11; k >= 0; k--) { const e = new Date(end - k * 7 * 864e5); semaines.push({ fin: e.toISOString().slice(0, 10), ua: R.filter(r => { const d = (e - new Date(r.date)) / 864e5; return d >= 0 && d < 7; }).reduce((a, r) => a + r.rpe * r.duree, 0) }); }
      return { aigu, chronique: chron, ratio, alerte, semaines };
    }
  };

  /* ---------- BANQUE D'EXERCICES (répertoire central) ----------
     Base : data-banque.json {ex:[Exo], fams:[{c,t,dom,dossier,intro,subs}], mat:[[code,nom]]}
     Exo = {id, n, f (famille 5.x.y), s (sous-famille), dom ("PP"|"GE"|"DE"|"PH"|"JEU"…), L:["PP1","DE6"…], a (âge min), ax (âge max), v (niveau 1-4),
            ob, ma, de, co, er, ut, an, m:[codes matériel], c (1 = sur le court), e (1 = grand espace), k (catégorie de dosage),
            w: {et:"MR|MO|AC|CV|ST|PO", but, fmt:[], lieu:[], mat:[], int, dur, apres:[], ci:[], complet, va, a:[min,max]} (si utilisable en échauffement),
            // champs ajoutés pour les exos créés/modifiés :
            dos (dosage conseillé, texte), vid (lien vidéo), img (image dataURL réduite), auteur ("moi"), st ("perso"|"propose"|"valide"), cree }
     Perso : grun_banque_v1 {perso:[Exo], over:{id:patch}, fav:[id], hide:[id], seq:n}
     Les exos perso ont un identifiant MOI-0001… ; « over » = modifications d'un exo d'origine (bouton « remettre l'original » = supprimer over[id]). */
  let BQ = null, BQP = null;
  function bstore() { const s = G.load(G.K.banque, { perso: [], over: {}, fav: [], hide: [], seq: 0 }); s.perso ||= []; s.over ||= {}; s.fav ||= []; s.hide ||= []; s.seq ||= 0; return s; }
  function merge(base) {
    const s = bstore(), byId = {};
    const ex = base.ex.map(e => { const o = s.over[e.id]; const x = o ? { ...e, ...o, modifie: true, orig: e } : e; byId[x.id] = x; return x; });
    for (const p of s.perso) { const x = { ...p, perso: true }; ex.push(x); byId[x.id] = x; }
    return { ex, fams: base.fams, mat: base.mat, lv: base.lv, byId, fav: s.fav, hide: s.hide };
  }
  G.banque = {
    async load() { if (!BQP) BQP = fetch("data-banque.json").then(r => r.json()); const base = await BQP; BQ = merge(base); return BQ; },
    cache() { return BQ; },
    get(id) { return BQ ? BQ.byId[id] : null; },
    add(e) { const s = bstore(); s.seq++; const x = { ...e, id: "MOI-" + String(s.seq).padStart(4, "0"), auteur: "moi", st: e.st || "perso", cree: G.today() }; s.perso.push(x); G.save(G.K.banque, s); return x; },
    edit(id, patch) { const s = bstore(); const p = s.perso.find(x => x.id === id); if (p) Object.assign(p, patch); else s.over[id] = { ...(s.over[id] || {}), ...patch }; G.save(G.K.banque, s); },
    reset(id) { const s = bstore(); delete s.over[id]; G.save(G.K.banque, s); },
    remove(id) { const s = bstore(); s.perso = s.perso.filter(x => x.id !== id); G.save(G.K.banque, s); },
    perso() { return bstore().perso; },
    toggleFav(id) { const s = bstore(); s.fav = s.fav.includes(id) ? s.fav.filter(x => x !== id) : [...s.fav, id]; G.save(G.K.banque, s); return s.fav.includes(id); },
    toggleHide(id) { const s = bstore(); s.hide = s.hide.includes(id) ? s.hide.filter(x => x !== id) : [...s.hide, id]; G.save(G.K.banque, s); return s.hide.includes(id); }
  };
  G.on(G.K.banque, () => { if (BQP) BQP.then(b => { BQ = merge(b); emit("grun:banque"); }); });

  /* vidéos : videos.json (commun, rempli par Claude) + liens perso (champ vid) */
  let VP = null;
  G.videos = () => VP ||= fetch("videos.json", { cache: "no-store" }).then(r => r.ok ? r.json() : {}).catch(() => ({}));
  G.video = async id => { const e = G.banque.get(id); if (e && e.vid) return e.vid; const v = await G.videos(); return v[id] || null; };

  /* ---------- TESTS PERSO ----------
     Test = {id:"T-MOI-001", nom, dom:"PP"|"GE"|"DE", lignes:[n], protocole, materiel, mesures:[{k:"m1",nom:"Essai",unite:"s"}], sens:"petit"|"grand" (meilleur résultat),
             seuils:{F:{"4":[s2,s3,s4] ou {cléMesure:[s2,s3,s4]},…,"18":…,"A":… (adulte, repli sur 18)}, G:{…}}  (3 seuils : passage au niveau 2, 3, 4), prio:false, vid, cree }
     Bilan (fiche joueur) : {id,date,age,adulte:bool,note,v:{PP,GE,DE},sel,res}.
     over : modifications d'un test d'origine (protocole, seuils…). */
  function tstore() { const s = G.load(G.K.tests, { perso: [], over: {}, seq: 0 }); s.perso ||= []; s.over ||= {}; s.seq ||= 0; return s; }
  G.tests = {
    perso() { return tstore().perso; },
    over() { return tstore().over; },
    add(t) { const s = tstore(); s.seq++; const x = { ...t, id: "T-MOI-" + String(s.seq).padStart(3, "0"), cree: G.today() }; s.perso.push(x); G.save(G.K.tests, s); return x; },
    edit(id, patch) { const s = tstore(); const p = s.perso.find(x => x.id === id); if (p) Object.assign(p, patch); else s.over[id] = { ...(s.over[id] || {}), ...patch }; G.save(G.K.tests, s); },
    reset(id) { const s = tstore(); delete s.over[id]; G.save(G.K.tests, s); },
    remove(id) { const s = tstore(); s.perso = s.perso.filter(x => x.id !== id); G.save(G.K.tests, s); }
  };

  /* ---------- PASSAGE DE RELAIS (poupée russe) ----------
     G.relais.envoyer({de:"prog", vers:"seances", retour:"prog.html#…", jid, gid, theme, lignes, duree, type, apres, cle, plan…}) puis G.go(…)
     Le module d'arrivée lit G.relais.lire() ; quand il a fini il appelle G.relais.rendre(resultat) puis location.href = relais.retour ;
     le module de départ lit G.relais.resultat() au retour. */
  /* pile : prog → séance → warm-up. Envoyer depuis un module qui a lui-même été appelé met le relais en cours de côté ;
     resultat() le restaure, si bien que la séance retrouve ensuite le chemin de retour vers la prog. */
  function rget() { const h = G.load(G.K.handoff, null); return h && Date.now() - (h.t || 0) < 864e5 ? h : null; }
  G.relais = {
    envoyer(o) { const cur = rget(); const pile = cur ? [...(cur.pile || []), ...(cur.res == null ? [{ ...cur, pile: undefined }] : [])] : [];
      G.save(G.K.handoff, { ...o, t: Date.now(), res: null, pile }); },
    lire() { const h = rget(); if (!h) return null; const { pile, ...r } = h; return r; },
    rendre(res) { const h = rget(); if (h) { h.res = res; h.tr = Date.now(); G.save(G.K.handoff, h); } },
    resultat(de) { const h = rget(); if (h && h.res && (!de || h.de === de)) { const { pile, ...r } = h; const p = (pile || []).slice(); const parent = p.pop();
        G.save(G.K.handoff, parent ? { ...parent, t: Date.now(), pile: p } : null); return r; } return null; },
    vider() { const h = rget(); const p = h && h.pile ? h.pile.slice() : []; const parent = p.pop(); G.save(G.K.handoff, parent ? { ...parent, t: Date.now(), pile: p } : null); }
  };


  /* ---------- SAUVEGARDE / RESTAURATION GLOBALE ---------- */
  G.exportAll = () => { const o = { app: "GRUN", v: G.version, date: G.today(), data: {} }; for (const k of Object.values(G.K)) { const v = localStorage.getItem(k); if (v != null) o.data[k] = JSON.parse(v); } return o; };
  G.importAll = (o, fusion = true) => {
    if (!o || !o.data) throw new Error("Fichier non reconnu");
    for (const [k, v] of Object.entries(o.data)) {
      if (!fusion || localStorage.getItem(k) == null) { localStorage.setItem(k, JSON.stringify(v)); continue; }
      const cur = JSON.parse(localStorage.getItem(k));
      localStorage.setItem(k, JSON.stringify(fusionner(cur, v)));
    }
    Object.values(G.K).forEach(emit);
  };
  function fusionner(a, b) { // fusion de listes d'objets par id ; objets fusionnés récursivement ; b gagne sinon
    if (Array.isArray(a) && Array.isArray(b)) { if (a.every(x => x && x.id) && b.every(x => x && x.id)) { const m = new Map(a.map(x => [x.id, x])); b.forEach(x => m.set(x.id, x)); return [...m.values()]; } return [...new Set([...a, ...b].map(x => JSON.stringify(x)))].map(x => JSON.parse(x)); }
    if (a && b && typeof a === "object" && typeof b === "object") { const r = { ...a }; for (const k in b) r[k] = k in a ? fusionner(a[k], b[k]) : b[k]; return r; }
    return b;
  }
  G.telecharger = (obj, nom) => { const b = new Blob([JSON.stringify(obj)], { type: "application/json" }); const f = new File([b], nom, { type: "application/json" });
    if (navigator.canShare && navigator.canShare({ files: [f] })) return navigator.share({ files: [f], title: nom }).catch(() => {});
    const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = nom; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); };

  /* ---------- REPRISE DES ANCIENNES DONNÉES ---------- */
  (function migrer() {
    if (G.load("grun_migre_v1", false)) return;
    try {
      const R = G.load(G.K.radar, null); const lst = R && (R.joueurs || R.players || (Array.isArray(R) ? R : null));
      if (Array.isArray(lst)) { const s = jstore(); for (const p of lst) { if (!p || !p.nom) continue;
          const bil = (p.bilans || []).map(b => ({ id: b.id || G.uid(), date: b.date || G.today(), age: b.age, note: b.note || "", v: b.valeurs || b.v || { PP: [], GE: [], DE: [] }, sel: [], res: {} }));
          const ex = s.joueurs.find(x => x.nom === p.nom);
          if (!ex) s.joueurs.push(norm({ id: p.id || G.uid(), nom: p.nom, sexe: p.sexe === "F" ? "F" : "G", naissance: p.naissance || "", notes: p.notes || "", bilans: bil }));
          else { ex.bilans ||= []; for (const b of bil) if (!ex.bilans.some(x => x.date === b.date && x.age === b.age)) ex.bilans.push(b); } }
        G.save(G.K.joueurs, s); }
      const P = G.load(G.K.prog, null); // profils de l'appli Programmation → fiche joueur unique
      if (P && P.profils) { const s = jstore(); for (const j of s.joueurs) { const pr = P.profils[j.id]; if (pr) { for (const k of ["classement", "croissance", "zones", "prio"]) if (pr[k] != null && (j[k] == null || (Array.isArray(j[k]) && !j[k].length) || j[k] === "NC" || j[k] === false)) j[k] = pr[k]; } } G.save(G.K.joueurs, s); }
      G.save("grun_migre_v1", true);
    } catch (e) { console.warn("migration", e); }
  })();

  /* ---------- NAVIGATION COMMUNE (barre du bas) ---------- */
  const ICO = {
    acc: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    ind: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    create: '<path d="M12 5v14M5 12h14"/><rect x="3" y="3" width="18" height="18" rx="4"/>',
    res: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/>',
    tests: '<path d="M12 3l8.5 6.2-3.2 10H6.7L3.5 9.2z"/><path d="M12 8l4 3-1.5 4.5h-5L8 11z"/>'
  };
  G.nav = (actif) => {
    if (document.getElementById("grun-nav")) return;
    const j = G.isJoueur(), auto = G.isAutonome();
    const items = auto && !j
      ? [["acc", "Mon dossier", "index.html"], ["create", "Create", "index.html#/pole/create"], ["tests", "Tests", "index.html#/pole/tests"]]
      : j
      ? [["acc", "Mon dossier", "index.html"], ["create", "Ma séance", "index.html#/pole/create"], ["tests", "Mes tests", "index.html#/pole/tests"]]
      : [["acc", "Accueil", "index.html"], ["ind", "Joueurs", "index.html#/joueurs"], ["create", "Create", "index.html#/pole/create"], ["res", "Ressources", "index.html#/pole/res"], ["tests", "Tests", "index.html#/pole/tests"]];
    const n = document.createElement("nav"); n.id = "grun-nav"; n.setAttribute("aria-label", "Pôles de GRÜN");
    n.innerHTML = items.map(([k, t, h]) => `<a href="${h}" class="${k === actif ? "on" : ""}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICO[k]}</svg><span>${t}</span></a>`).join("");
    document.body.appendChild(n); document.body.classList.add("grun-has-nav");
    /* bouton « ‹ » commun : toujours visible dans les modules ; sur l'accueil d'un module, il remonte à la page du pôle (ou à l'accueil) */
    const mod = (document.querySelector('meta[name="grun-module"]') || {}).content;
    if (mod && mod !== "accueil") {
      document.documentElement.classList.add("grun-mod");
      document.addEventListener("click", e => { const b = e.target.closest && e.target.closest("#back"); if (!b) return;
        if (/^#?\/?$/.test(location.hash)) { e.stopImmediatePropagation(); e.preventDefault();
          location.href = (actif && actif !== "acc" && !(auto && actif === "res")) ? "index.html#/pole/" + actif : "index.html"; } }, true);
    }
  };
  G.poleDe = mod => (G.MODS[mod] || {}).pole || "acc";

  /* service worker commun */
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
})();
