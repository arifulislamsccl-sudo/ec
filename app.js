/* EngCalc – mobile UI (dark instrument style) */
(function () {
  "use strict";
  const D = window.APPDATA, XL = window.XL;
  const book = new XL.Book(D.sheets);
  const KEY = "engcalc.inputs.v1", HKEY = "engcalc.hints";
  let saved = {}, hints = false;
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; hints = localStorage.getItem(HKEY) === "1"; } catch (e) { saved = {}; }
  for (const k in saved) { const i = k.lastIndexOf("!"); book.setInput(k.slice(0, i), k.slice(i + 1), saved[k]); }
  const store = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* memory only */ } };
  const persist = () => store(KEY, JSON.stringify(saved));

  const $ = s => document.querySelector(s);
  const h = (tag, attrs, ...kids) => {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) { const v = attrs[k]; if (v == null || v === false) continue; if (k === "class") e.className = v; else if (k.startsWith("on")) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? "" : v); }
    for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(String(k)));
    return e;
  };
  const svg = (p, w) => { const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("fill", "none"); s.setAttribute("stroke", "currentColor"); s.setAttribute("stroke-width", w || "1.8"); s.setAttribute("stroke-linecap", "round"); s.setAttribute("stroke-linejoin", "round"); s.innerHTML = p; return s; };
  const ICON = {
    "Pumps": '<circle cx="11" cy="13" r="6.5"/><circle cx="11" cy="13" r="2"/><path d="M11 6.5h9v4.5"/>',
    "Piping": '<path d="M3 9h9a4 4 0 0 1 4 4v8"/><path d="M3 4h9a9 9 0 0 1 9 9v8"/>',
    "Vessels & Tanks": '<rect x="7" y="3" width="10" height="18" rx="5"/><path d="M7 9.5h10M7 14.5h10"/>',
    "Heat Transfer": '<rect x="3" y="7" width="18" height="10" rx="2.5"/><path d="M6.5 10.5h11M6.5 13.5h11"/>',
    "Process": '<path d="M9 3h6M10 3v6l-5.2 9.2A2 2 0 0 0 6.5 21h11a2 2 0 0 0 1.7-2.8L14 9V3"/><path d="M7.5 15h9"/>',
    "Machine Design": '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
    "Maintenance": '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
    "Energy & Utilities": '<path d="M13 2.5L4.5 14H11l-1 7.5L19.5 10H13z"/>',
    "Project": '<path d="M4 20V11M10 20V5M16 20v-6M21 20H3"/>',
    "Beams": '<path d="M5 4h14M5 20h14M12 4v16"/>',
    "Structural": '<path d="M3 21V4h18v17M3 12.5h18M12 4v17"/>',
    "Chemical Compatibility": '<path d="M12 3s6 7 6 11.2A6 6 0 0 1 6 14.2C6 10 12 3 12 3z"/>',
    "Insulation": '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    "Unit Converter": '<path d="M4 8h15l-3.5-3.5M20 16H5l3.5 3.5"/>',
    "Home": '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
    "About": '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
    "Data": '<path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z"/><path d="M8 9h8M8 13h6"/>'
  };
  const SHORT = { "Pumps": "Pump", "Piping": "Pipe", "Vessels & Tanks": "Vessel", "Heat Transfer": "Heat", "Process": "Process", "Machine Design": "Machine", "Maintenance": "Maint.", "Energy & Utilities": "Energy", "Project": "Project", "Beams": "Beam", "Structural": "Steel", "Chemical Compatibility": "Chemical", "Insulation": "Insul.", "Unit Converter": "Units" };
  const OK_I = '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.6 2.6L16 9.5"/>', WARN_I = '<path d="M12 3.5l9 16H3z"/><path d="M12 10v4M12 17v.01"/>', BAD_I = '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>', NEU_I = '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/>';
  const iconFor = sc => sc === "ok" ? OK_I : sc === "warn" ? WARN_I : sc === "bad" ? BAD_I : NEU_I;
  const CHEV = '<path d="M9 6l6 6-6 6"/>';

  const view = $("#view"), titleEl = $("#title"), subEl = $("#sub"), back = $("#back"), resetB = $("#reset"), hintB = $("#hints"), dock = $("#dock");
  const order = D.order.filter(n => n !== "Data");
  const meta = {}; D.index.forEach(x => meta[x.s] = x);
  const groups = []; const gmap = {};
  D.index.forEach(x => { if (!gmap[x.g]) { gmap[x.g] = []; groups.push(x.g); } gmap[x.g].push(x); });
  const slug = n => n.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const bySlug = {}; Object.keys(D.pages).forEach(n => bySlug[slug(n)] = n);
  const gBySlug = {}; groups.forEach(g => gBySlug["g-" + slug(g)] = g);

  const statusOf = v => { const s = typeof v === "string" ? v.trim() : ""; return s.startsWith("✔") ? "ok" : s.startsWith("⚠") ? "warn" : s.startsWith("✖") ? "bad" : ""; };
  const strip = s => String(s).replace(/^[✔⚠✖]️?\s*/, "");
  const show = (v, nf) => { if (XL.isErr(v)) return v.code; if (v === null || v === undefined || v === "") return "–"; if (typeof v === "boolean") return v ? "Yes" : "No"; return XL.fmtNum(v, nf); };
  const parseInput = s => { const t = String(s).trim(); if (t === "") return null; const c = t.replace(/,/g, ""); return /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(c) ? parseFloat(c) : t; };
  const defaultOf = (sh, a) => (D.sheets[sh] && D.sheets[sh][a]) || null;
  const isOver = (sh, a) => (sh + "!" + a) in saved;
  const setVal = (sh, a, v) => { saved[sh + "!" + a] = v; book.setInput(sh, a, v); persist(); };
  const clearVal = (sh, a) => { delete saved[sh + "!" + a]; book.setInput(sh, a, undefined); persist(); };
  const unit = u => (u && u !== "–" && u !== "-" && u !== "×") ? u : (u === "×" ? "×" : "");
  const ACR = new Set(["NPSH", "IEC", "API", "ASME", "PSV", "OEE", "MTBF", "MTTR", "EOQ", "VFD", "TDH", "ISO", "BOM", "RPN", "FLC", "HP", "MAWP", "LMTD", "COP", "TR", "PF", "NPV", "IRR", "CPI", "SPI", "EAC", "ETC", "VAC", "TCPI", "CS", "SS", "PP", "PVC", "HDPE", "FRP", "PTFE", "ISMB", "ISMC", "ISA", "NPS", "DN", "ID", "OD", "RT", "CA", "BEP", "PWHT"]);
  const sentence = l => { if (!l) return l; const w = l.match(/^[A-Z][A-Z\-]+\b/); if (!w || ACR.has(w[0])) return l; let first = true; return l.replace(/\b[A-Z][A-Z\-]{1,}\b/g, m => { if (ACR.has(m)) { first = false; return m; } const r = first ? m.charAt(0) + m.slice(1).toLowerCase() : m.toLowerCase(); first = false; return r; }); };
  function rangeValues(sh, f) {
    try { const r = book.evalFormula(sh, f); if (r instanceof XL.Range) { const out = []; for (let i = r.r1; i <= r.r2; i++) for (let j = r.c1; j <= r.c2; j++) { const v = book.cell(r.sh, i, j); if (v !== null && v !== "" && !XL.isErr(v)) out.push(v); } return out; } } catch (e) { /* bad list */ }
    return [];
  }

  // ------------------------------------------------------------ reactive bits
  let ups = [];
  const refresh = () => ups.forEach(u => u());
  const bind = (sh, a, fn) => { const f = () => fn(book.get(sh, a)); f(); ups.push(f); };
  function inputEl(sh, b) {
    const a = b.a, dv = b.dv, def = defaultOf(sh, a), auto = def && def.f, cur = () => book.get(sh, a);
    let el;
    if (dv && (dv[0] === "list" || dv[0] === "formula")) {
      el = h("select", { class: "inp", "aria-label": b.l || a });
      const fill = () => {
        const opts = dv[0] === "list" ? dv[1] : rangeValues(sh, dv[1]), v = cur(), sv = v === null ? "" : String(v), key = opts.join("\u0001");
        if (el._k !== key) { el.innerHTML = ""; el.append(h("option", { value: "" }, "Select…")); opts.forEach(o => el.append(h("option", { value: String(o) }, String(o)))); el._k = key; }
        if (sv && !opts.map(String).includes(sv)) el.append(h("option", { value: sv }, sv));
        el.value = sv;
      };
      fill(); ups.push(fill);
      el.addEventListener("change", () => { setVal(sh, a, parseInput(el.value)); refresh(); });
    } else {
      const numeric = !b.txt && ((dv && dv[0] === "num") || (def && typeof def.v === "number") || !def || auto);
      el = h("input", { class: "inp", type: "text", inputmode: numeric ? "decimal" : "text", enterkeyhint: "next", autocomplete: "off", spellcheck: "false", "aria-label": b.l || a, placeholder: numeric ? "auto" : "" });
      const fill = () => { if (document.activeElement === el) return; const v = cur(); el.value = v === null || v === undefined ? "" : typeof v === "number" ? String(parseFloat(v.toPrecision(10))) : XL.isErr(v) ? v.code : String(v); el.classList.toggle("auto", !!auto && !isOver(sh, a)); };
      fill(); ups.push(fill);
      el.addEventListener("input", () => { setVal(sh, a, parseInput(el.value)); el.classList.remove("auto"); refresh(); });
      el.addEventListener("blur", fill);
      el.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); const all = [...view.querySelectorAll(".inp")]; const n = all[all.indexOf(el) + 1]; n ? n.focus() : el.blur(); } });
    }
    return el;
  }
  const isText = b => b.dv && (b.dv[0] === "list" || b.dv[0] === "formula");

  // ------------------------------------------------------------ chrome / routing
  let curSheet = null, curGroup = null;
  function chrome(title, sub, opts) {
    document.querySelector(".top").hidden = !!opts.noBar;
    titleEl.textContent = title; subEl.textContent = sub || "";
    back.hidden = !opts.back; resetB.hidden = !opts.reset; hintB.hidden = !opts.hints;
    hintB.classList.toggle("on", hints);
    dock.querySelectorAll(".dk").forEach(d => d.classList.toggle("on", d.dataset.g === (opts.group || "Home")));
    const act = dock.querySelector(".dk.on"); if (act) act.scrollIntoView({ inline: "center", block: "nearest" });
  }
  function buildDock() {
    dock.innerHTML = "";
    const mk = (g, label, href) => { const b = h("button", { class: "dk", "data-g": g, onclick: () => { location.hash = href; } }, h("span", { class: "dk-i" }, svg(ICON[g] || ICON.Process)), label); dock.append(b); };
    mk("Home", "Home", "#home");
    groups.forEach(g => mk(g, SHORT[g] || g, "#g-" + slug(g)));
    mk("About", "About", "#about");
  }
  back.addEventListener("click", () => { if (curSheet && meta[curSheet]) location.hash = "#g-" + slug(meta[curSheet].g); else history.length > 1 ? history.back() : (location.hash = "#home"); });
  resetB.addEventListener("click", () => { if (!curSheet) return; for (const k of Object.keys(saved)) if (k.startsWith(curSheet + "!")) clearVal(curSheet, k.slice(k.lastIndexOf("!") + 1)); route(); });
  hintB.addEventListener("click", () => { hints = !hints; store(HKEY, hints ? "1" : "0"); hintB.classList.toggle("on", hints); view.querySelectorAll(".f-h").forEach(e => e.hidden = !hints); });
  const go = s => { location.hash = "#" + slug(s); };

  // ------------------------------------------------------------ status lists (home / group)
  function statusList(items) {
    const lst = h("div", { class: "lst" }), rows = [];
    items.forEach(x => {
      const st = h("span"), s = h("div", { class: "li-s" }, h("i", { class: "dot" }), st);
      const b = h("button", { class: "li", onclick: () => go(x.s) }, h("span", { class: "li-c" }, x.code), h("span", { class: "li-t" }, x.title), svg(CHEV), s);
      b._t = (x.code + " " + x.title + " " + x.desc + " " + x.g).toLowerCase();
      rows.push({ b, s, st, x }); lst.append(b);
    });
    return { lst, rows };
  }
  function fillStatuses(rows) {
    let i = 0;
    const step = () => { const t0 = performance.now(); while (i < rows.length && performance.now() - t0 < 24) { const r = rows[i++]; if (!r.x.d) { r.st.textContent = "Unit conversion"; continue; } let v; try { v = book.evalFormula("HOME", r.x.d); if (v instanceof XL.Range) v = book.deref(v); } catch (e) { v = ""; } r.st.textContent = strip(show(v)); r.s.className = "li-s " + statusOf(v); r.b.classList.remove("ok", "warn", "bad"); if (statusOf(v)) r.b.classList.add(statusOf(v)); } if (i < rows.length) setTimeout(step, 0); };
    setTimeout(step, 16);
  }
  function renderHome() {
    ups = []; curSheet = null;
    chrome("EngCalc", "", { group: "Home", hints: false, noBar: true });
    view.innerHTML = "";
    const mark = svg('<rect x="1" y="1" width="22" height="22" rx="6" fill="#122334" stroke="#2A4560" stroke-width=".8"/><circle cx="12" cy="12" r="5.2" stroke="#4FB3FF" stroke-width="1.6"/><circle cx="12" cy="12" r="1.6" fill="#4FB3FF" stroke="none"/><path d="M12 3.6v2.6M12 17.8v2.6M3.6 12h2.6M17.8 12h2.6" stroke="#E7EFF6" stroke-width="1.6"/>');
    view.append(h("div", { class: "hello" }, mark, h("div", null, h("div", { class: "brand-row" }, h("b", null, "EngCalc"), h("i", { class: "credit", role: "link", tabindex: "0", onclick: () => { location.hash = "#about"; } }, "Design & Developed by Md. Ariful Islam")), h("span", null, `${D.index.length} calculators · offline`))));
    const q = h("input", { type: "search", placeholder: "Search pump, pipe, H2SO4, tank…", "aria-label": "Search" });
    view.append(h("div", { class: "search" }, svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'), q));
    const mods = h("div", { class: "mods" });
    groups.forEach(g => mods.append(h("button", { class: "mod", onclick: () => { location.hash = "#g-" + slug(g); } }, svg(ICON[g]), SHORT[g] || g, h("small", null, gmap[g].length))));
    mods.append(h("button", { class: "mod", onclick: () => { location.hash = "#reference-data"; } }, svg(ICON.Data), "Data", h("small", null, "tables")));
    view.append(mods);
    const all = h("div"); const { lst, rows } = statusList(D.index);
    let open = false;
    const arrow = svg('<path d="M6 9l6 6 6-6"/>');
    const toggle = h("button", { class: "gh gh-btn", type: "button", "aria-expanded": "false" }, svg(ICON.Home), "All calculators", h("small", null, D.index.length), h("span", { class: "gh-arrow" }, arrow));
    const setOpen = o => { open = o; lst.hidden = !o; toggle.setAttribute("aria-expanded", String(o)); toggle.classList.toggle("open", o); };
    toggle.addEventListener("click", () => setOpen(!open));
    all.append(toggle, lst); setOpen(false);
    view.append(all);
    const none = h("p", { class: "foot", hidden: true }, "No calculator matches. Try a shorter word, like “pump” or “tank”.");
    view.append(none, h("p", { class: "foot" }, "For preliminary design, screening and maintenance decisions. Check pressure equipment, lifting gear and relief systems against the current code with a qualified engineer."));
    q.addEventListener("input", () => { const t = q.value.trim().toLowerCase(); let any = false; rows.forEach(r => { r.b.hidden = !!t && !r.b._t.includes(t); any = any || !r.b.hidden; }); mods.hidden = !!t; none.hidden = any; if (t) { lst.hidden = false; toggle.hidden = true; } else { toggle.hidden = false; setOpen(open); } });
    fillStatuses(rows);
  }
  function renderGroup(g) {
    ups = []; curSheet = null;
    chrome(g, gmap[g].length + " calculators", { group: g, back: true });
    view.innerHTML = "";
    const { lst, rows } = statusList(gmap[g]);
    view.append(h("div", { style: "height:6px" }), lst);
    fillStatuses(rows);
  }

  // ------------------------------------------------------------ calculator
  const HERO = { "PM Pump & Motor Selection": "Selected standard motor (IEC)", "PR8 Stream Mixing": "Mixed temperature" };
  const VERDICT = { "PM Pump & Motor Selection": "OVERALL STATUS" };
  const findA = (page, re) => { const b = page.blocks.find(x => x.l && re.test(x.l)); return b ? b.a : null; };
  const GAUGES = {
    "PI1 Pipe Size by Fluid": p => ({ title: "Flow velocity range", v: findA(p, /^Actual velocity/), lo: findA(p, /^Minimum velocity/), hi: findA(p, /^Maximum velocity used/), u: "m/s", kind: "band" }),
    "P2 NPSH Cavitation": p => ({ title: "NPSH margin", v: findA(p, /^NPSH available/), req: findA(p, /^NPSH required/), u: "m", kind: "npsh" }),
    "R4 Vibration ISO 10816": p => ({ title: "Vibration zone", v: findA(p, /^Measured velocity/), z: [findA(p, /A\/B/), findA(p, /B\/C/), findA(p, /C\/D/)], u: "mm/s", kind: "zones" }),
    "ST1 Beam Selection": p => ({ title: "Bending utilisation", v: findA(p, /^Bending utilisation/), kind: "util" }),
    "M8 Lifting Beam": p => ({ title: "Bending utilisation", v: findA(p, /^Bending utilisation/), kind: "util" }),
    "R2 OEE": p => ({ title: "OEE vs world class", v: findA(p, /^OEE$/), kind: "oee" }),
    "M7 Sling Tension": p => ({ title: "Sling leg utilisation", v: findA(p, /^Leg utilisation/), kind: "util" })
  };
  function gauge(sh, cfg) {
    const head = h("div", { class: "g-h" }, h("span", null, cfg.title), h("b"));
    const bar = h("div", { class: "g-bar" }), mk = h("i", { class: "g-m" }), scale = h("div", { class: "g-s" });
    const box = h("div", { class: "gauge" }, head, bar, scale);
    const fmt = x => (Math.round(x * 100) / 100).toString();
    ups.push(() => {
      const num = a => { const v = a ? book.get(sh, a) : null; return typeof v === "number" ? v : null; };
      const v = num(cfg.v); if (v === null) { box.hidden = true; return; } box.hidden = false;
      let zones, max, lab, cls, ticks;
      if (cfg.kind === "band") { const lo = num(cfg.lo) || 0, hi = num(cfg.hi) || 1; max = Math.max(hi * 1.5, v * 1.1); zones = lo > 0 ? [[lo, "warn"], [hi, "ok"], [max, "bad"]] : [[hi, "ok"], [max, "bad"]]; cls = v > hi ? "bad" : v < lo ? "warn" : "ok"; lab = cls === "ok" ? "Within range" : cls === "bad" ? "Too fast" : "Too slow"; ticks = ["0", lo > 0 ? "min " + fmt(lo) : "", "max " + fmt(hi), fmt(max) + " " + cfg.u]; }
      else if (cfg.kind === "npsh") { const r = num(cfg.req) || 1, need = Math.max(1.3 * r, r + 1); max = Math.max(need * 1.6, v * 1.1); zones = [[r, "bad"], [need, "warn"], [max, "ok"]]; cls = v >= need ? "ok" : v > r ? "warn" : "bad"; lab = cls === "ok" ? "Safe" : cls === "warn" ? "Marginal" : "Cavitation"; ticks = ["0", "NPSHr " + fmt(r), "safe " + fmt(need), fmt(max) + " m"]; }
      else if (cfg.kind === "zones") { const z = cfg.z.map(num); max = Math.max(z[2] * 1.4, v * 1.1); zones = [[z[0], "ok"], [z[1], "ok"], [z[2], "warn"], [max, "bad"]]; cls = v <= z[1] ? "ok" : v <= z[2] ? "warn" : "bad"; lab = "Zone " + (v <= z[0] ? "A" : v <= z[1] ? "B" : v <= z[2] ? "C" : "D"); ticks = ["0", "B " + fmt(z[0]), "C " + fmt(z[1]), "D " + fmt(z[2])]; }
      else if (cfg.kind === "util") { max = Math.max(1.5, v * 1.1); zones = [[0.8, "ok"], [1, "warn"], [max, "bad"]]; cls = v <= 0.8 ? "ok" : v <= 1 ? "warn" : "bad"; lab = Math.round(v * 100) + "% used"; ticks = ["0%", "80%", "100%", Math.round(max * 100) + "%"]; }
      else if (cfg.kind === "oee") { max = 1; zones = [[0.6, "bad"], [0.85, "warn"], [1, "ok"]]; cls = v >= 0.85 ? "ok" : v >= 0.6 ? "warn" : "bad"; lab = Math.round(v * 100) + "%"; ticks = ["0%", "60%", "85% world class", "100%"]; }
      bar.innerHTML = ""; let prev = 0;
      zones.forEach(([to, c]) => { const w = Math.max(0, Math.min(to, max) - prev) / max * 100; if (w > 0) bar.append(h("span", { class: "g-z " + c, style: "width:" + w + "%" })); prev = Math.min(to, max); });
      mk.style.left = Math.max(0, Math.min(100, v / max * 100)) + "%"; bar.append(mk);
      const b = head.querySelector("b"); b.textContent = lab; b.className = cls;
      scale.innerHTML = ""; ticks.filter(Boolean).forEach(t => scale.append(h("span", null, t)));
    });
    return box;
  }
  function renderCalc(sheet, page) {
    ups = []; curSheet = sheet;
    const m = meta[sheet] || { code: "", title: sheet, g: "" };
    chrome(m.title, m.code + " · " + m.g, { group: m.g, back: true, reset: true, hints: true });
    view.innerHTML = "";
    // classify blocks
    const ins = [], calc = [], res = [], notes = [];
    let inRes = false;
    for (const b of page.blocks) {
      if (b.t === "sec") { inRes = /RESULT/i.test(b.x); continue; }
      if (b.t === "in") ins.push(b);
      else if (b.t === "note") notes.push(b.x);
      else if (b.res || b.main || b.wide || inRes) res.push(b);
      else if (!/^Internal$/i.test(b.n || "")) calc.push(b);
    }
    const isNum = b => b.nf !== "@" && !b.wide;
    const heroB = res.find(b => HERO[sheet] && b.l === HERO[sheet]) || res.find(b => b.main) || res.find(b => isNum(b) && (b.res || b.main)) || res.find(b => b.res && !b.wide && !/DECISION|STATUS/i.test(b.l));
    const numRes = res.filter(b => b !== heroB && isNum(b) && b.res);
    const sideB = numRes[0];
    const textRes = res.filter(b => b !== heroB && !numRes.includes(b));
    const verdictB = textRes.find(b => VERDICT[sheet] && b.l === VERDICT[sheet]) || textRes.find(b => /^DECISION|^PRACTICAL SHELL|STATUS/i.test(b.l)) || textRes.find(b => b.wide);
    // hero card
    const hero = h("section", { class: "card fade" });
    const groupName = m.g;
    hero.append(h("div", { class: "hero-top" }, h("span", { class: "pill" }, heroB ? sentence(heroB.l).toUpperCase().slice(0, 34) : "RESULT"), h("span", { class: "pill g" }, svg(ICON[groupName] || ICON.Process, "2"), SHORT[groupName] || groupName)));
    if (heroB) {
      const bv = h("span", { class: "big" }), bu = h("span", { class: "big-u" }, unit(heroB.u));
      const left = h("div", null, h("div", null, bv, bu), heroB.n && !/^Internal$/.test(heroB.n) ? h("div", { class: "big-l" }, heroB.n) : null);
      bind(sheet, heroB.a, v => { bv.textContent = show(v, heroB.nf); });
      const row = h("div", { class: "hero-main" }, left);
      if (sideB) { const sv = h("div", { class: "side-v" }); row.append(h("div", { class: "side" }, h("div", { class: "side-l" }, sentence(sideB.l)), sv, h("div", { class: "side-u" }, unit(sideB.u)))); bind(sheet, sideB.a, v => { sv.textContent = show(v, sideB.nf); }); }
      hero.append(row);
    }
    if (verdictB) {
      const vt = h("div", { class: "vt" }), ic = h("span"), vb = h("div", { class: "verdict" }, ic, vt);
      bind(sheet, verdictB.a, v => { const sc = statusOf(v); vb.className = "verdict " + sc; ic.innerHTML = ""; ic.append(svg(iconFor(sc), "2")); vt.textContent = strip(show(v, verdictB.nf)); });
      hero.append(vb);
    }
    if (GAUGES[sheet]) hero.append(gauge(sheet, GAUGES[sheet](page)));
    const stats = numRes.slice(sideB ? 1 : 0);
    if (stats.length) {
      const st = h("div", { class: "stats" });
      stats.forEach(b => { const v = h("div", { class: "st-v" }); st.append(h("div", null, h("div", { class: "st-l" }, sentence(b.l)), v)); bind(sheet, b.a, x => { v.textContent = show(x, b.nf); const u = unit(b.u); if (u && typeof x === "number") v.append(h("small", null, u)); }); });
      hero.append(st);
    }
    view.append(hero);
    // related calculators
    const i = order.indexOf(sheet), prev = order[i - 1], next = order[i + 1];
    const rel = h("div", { class: "rel" });
    if (prev && meta[prev]) rel.append(h("button", { class: "rc", onclick: () => go(prev) }, "‹ ", h("b", null, meta[prev].code), meta[prev].title.split(/[–,(]/)[0].trim()));
    (gmap[m.g] || []).filter(x => x.s !== sheet && x.s !== prev && x.s !== next).forEach(x => rel.append(h("button", { class: "rc", onclick: () => go(x.s) }, h("b", null, x.code), x.title.split(/[–,(]/)[0].trim())));
    if (next && meta[next]) rel.append(h("button", { class: "rc", onclick: () => go(next) }, h("b", null, meta[next].code), meta[next].title.split(/[–,(]/)[0].trim(), " ›"));
    view.append(rel);
    // tabs
    const checks = textRes.filter(b => b !== verdictB);
    const tabs = [["Inputs", ins.length], ["Checks", checks.length], ["Calculation", calc.length], ["Table", page.table && page.table.rows.length ? 1 : 0], ["Notes", 1]].filter(t => t[1]);
    const bar = h("div", { class: "tabs", role: "tablist" }), panes = {};
    const pane = h("div");
    const showTab = name => { bar.querySelectorAll(".tab").forEach(t => t.classList.toggle("on", t.dataset.t === name)); for (const k in panes) panes[k].hidden = k !== name; };
    tabs.forEach(([name, n]) => bar.append(h("button", { class: "tab", "data-t": name, role: "tab", onclick: () => showTab(name) }, name, name === "Calculation" || name === "Checks" ? h("small", null, n) : null)));
    view.append(bar, pane);
    // inputs pane
    if (ins.length) {
      const c = h("section", { class: "card" }, h("div", { class: "grp-t" }, "Inputs", h("span", null, "edit")));
      ins.forEach(b => {
        const def = defaultOf(sheet, b.a), stack = isText(b);
        const u = unit(b.u);
        c.append(h("label", { class: "f" + (stack ? " stack" : "") }, h("span", { class: "f-l" }, b.l, def && def.f ? h("em", null, "linked") : null), h("span", { class: "box" }, inputEl(sheet, b), u ? h("span", { class: "u" }, u) : null), b.n && !/^(select from list|dropdown)$/i.test(b.n) ? h("span", { class: "f-h", hidden: !hints }, b.n) : null));
      });
      panes.Inputs = c; pane.append(c);
    }
    if (checks.length) {
      const c = h("section", { class: "card" });
      checks.forEach(b => { const t = h("div", { class: "chk-t" }), ic = h("span"), row = h("div", { class: "chk" }, ic, h("div", { class: "chk-l" }, sentence(b.l)), t); bind(sheet, b.a, v => { const sc = statusOf(v); row.className = "chk " + sc; ic.innerHTML = ""; ic.append(svg(iconFor(sc), "2")); t.textContent = typeof v === "number" ? show(v, b.nf) + (unit(b.u) ? " " + b.u : "") : strip(show(v, b.nf)); }); c.append(row); });
      panes.Checks = c; pane.append(c);
    }
    if (calc.length) {
      const c = h("section", { class: "card" });
      calc.forEach(b => {
        if (b.nf === "@") { const t = h("div", { class: "chk-t" }), ic = h("span"), row = h("div", { class: "chk" }, ic, h("div", { class: "chk-l" }, sentence(b.l)), t); bind(sheet, b.a, v => { const sc = statusOf(v); row.className = "chk " + sc; ic.innerHTML = ""; ic.append(svg(iconFor(sc), "2")); t.textContent = strip(show(v)); }); c.append(row); return; }
        const rv = h("span", { class: "r-v" });
        c.append(h("div", { class: "r" }, h("span", { class: "r-l" }, sentence(b.l)), rv));
        bind(sheet, b.a, v => { rv.textContent = show(v, b.nf); const u = unit(b.u); if (u && typeof v === "number") rv.append(h("small", null, u)); });
      });
      panes.Calculation = c; pane.append(c);
    }
    if (page.table && page.table.rows.length) {
      const t = page.table, tb = h("tbody");
      const tbl = h("table", { class: "tbl" }, h("thead", null, h("tr", null, t.head.map(x => h("th", null, x)))), tb);
      t.rows.forEach(r => { const tr = h("tr"), tds = r.map(c => { const td = h("td"); bind(sheet, c.a, v => { td.textContent = show(v, c.nf); }); return td; }); tds.forEach(td => tr.append(td)); ups.push(() => { tr.className = /SELECTED/.test(tr.textContent) ? "sel" : ""; tr.hidden = r.length > 3 && tds.slice(1).every(td => ["–", "", "0"].includes(td.textContent)); }); tb.append(tr); });
      const c = h("section", { class: "card" }, h("div", { class: "grp-t" }, (t.title || "Table").replace(/\s*\(auto\)/i, "")), h("div", { class: "scroll" }, tbl), (t.notes || []).map(n => h("p", { class: "note" }, n)));
      panes.Table = c; pane.append(c);
    }
    const desc = (page.desc || "").replace(/^\[[A-Z0-9]+\]\s*/, "").replace(/Fill only the yellow cells \(blue text\)\.\s*/, "").replace(/^Enter the yellow cells\.\s*/, "");
    panes.Notes = h("section", { class: "card" }, h("p", { class: "note" }, desc), notes.map(n => h("p", { class: "note" }, n)));
    pane.append(panes.Notes);
    showTab(tabs[0][0]);
    refresh();
  }

  // ------------------------------------------------------------ BOM / FMEA pages
  function renderGrid(sheet, page) {
    ups = []; curSheet = sheet;
    const m = meta[sheet] || { code: "", title: sheet, g: "" };
    chrome(m.title, m.code + " · " + m.g, { group: m.g, back: true, reset: true });
    view.innerHTML = "";
    const rows = page.rows.filter(r => r.r !== 2);
    const txtCol = {};
    rows.forEach(r => r.c.forEach((c, j) => { if (c && c.k === "in" && !c.dv) { const d = defaultOf(sheet, c.a); if (d && typeof d.v === "string") txtCol[j] = true; } }));
    const hi = rows.findIndex(r => r.c.filter(c => c && c.h).length >= 3);
    const head = hi >= 0 ? rows[hi].c.map(c => c ? String(book.get(sheet, c.a) || "") : "") : [];
    const kv = list => {
      const card = h("section", { class: "card fade" }); const items = []; let seq = 0;
      for (const r of list) {
        let label = null, labCol = null, last = null;
        r.c.forEach((c, j) => {
          if (!c) { last = null; return; }
          if (c.k === "t") {
            const tx = String(book.get(sheet, c.a) ?? "");
            if (last && last.j === j - 1 && !last.u && !/:\s*$/.test(tx)) { last.u = tx; if (last.box) last.box.append(h("span", { class: "u" }, tx)); else last.ov.dataset.u = tx; return; }
            if (c.b && !r.c.slice(j + 1).some(x => x && x.k !== "t")) { items.push({ col: j, hd: true, el: h("div", { class: "grp-t" }, sentence(tx)), n: seq++ }); return; }
            label = tx.replace(/:\s*$/, ""); labCol = j; return;
          }
          let el; const rec = { j };
          if (c.k === "in") { const bx = h("span", { class: "box" }, inputEl(sheet, { a: c.a, dv: c.dv, l: label || c.a })); el = h("label", { class: "f" }, h("span", { class: "f-l" }, label || ""), bx); rec.box = bx; }
          else if (c.nf === "@" || /DECISION/i.test(label || "")) { const vt = h("div", { class: "vt" }), ic = h("span"); el = h("div", { class: "verdict" }, ic, vt); bind(sheet, c.a, v => { const sc = statusOf(v); el.className = "verdict " + sc; ic.innerHTML = ""; ic.append(svg(iconFor(sc), "2")); vt.textContent = strip(show(v, c.nf)); }); }
          else { const ov = h("span", { class: "r-v" }); rec.ov = ov; el = h("div", { class: "r" }, h("span", { class: "r-l" }, label || ""), ov); bind(sheet, c.a, v => { ov.textContent = show(v, c.nf); if (ov.dataset.u) ov.append(h("small", null, ov.dataset.u)); }); }
          items.push({ col: labCol !== null ? labCol : j, el, n: seq++ }); last = rec; label = null; labCol = null;
        });
      }
      const hc = items.filter(x => x.hd).map(x => x.col).sort((a, b) => a - b);
      items.forEach(x => { let b = -1; for (const c of hc) if (c <= x.col) b = c; x.b = b; });
      items.sort((x, y) => x.b - y.b || (x.hd ? -1 : y.hd ? 1 : x.n - y.n)).forEach(x => card.append(x.el));
      return card;
    };
    if (hi < 0) { view.append(kv(rows)); refresh(); return; }
    const pre = rows.slice(0, hi), data = [], post = [];
    rows.slice(hi + 1).forEach(r => (r.c.filter(Boolean).length >= 3 && !post.length ? data : post).push(r));
    if (pre.length) view.append(kv(pre));
    const used = r => r.c.some(c => c && c.k === "in" && (() => { const v = book.get(sheet, c.a); return v !== null && v !== ""; })());
    const cards = data.map((r, idx) => {
      const num = r.c[0] && r.c[0].k !== "in" ? book.get(sheet, r.c[0].a) : idx + 1;
      const g = h("div", { class: "ig" });
      r.c.forEach((c, j) => {
        if (!c || (j === 0 && c.k !== "in")) return;
        const lab = (head[j] || "").replace(/\s+/g, " ");
        if (c.k === "f" && /what to enter|help/i.test(lab)) { const sp = h("span"); bind(sheet, c.a, v => { const s = show(v, c.nf); sp.textContent = s === "–" ? "" : s; }); g.append(h("div", { class: "ihelp" }, sp)); return; }
        if (c.k === "in") g.append(h("label", null, h("span", { class: "f-l" }, lab), h("span", { class: "box" }, inputEl(sheet, { a: c.a, dv: c.dv, l: lab, txt: txtCol[j] }))));
        else { const val = h("div", { class: "val" }); bind(sheet, c.a, v => { val.textContent = strip(show(v, c.nf)); val.className = "val " + statusOf(v); }); g.append(h("div", null, h("span", { class: "f-l" }, lab), val)); }
      });
      const card = h("div", { class: "item" }, h("div", { class: "item-h" }, h("span", null, "Item " + num)), g);
      card._u = used(r); return card;
    });
    let shown = 0; cards.forEach((c, i) => { if (c._u) shown = i + 1; }); shown = Math.min(cards.length, shown + 1);
    const add = h("button", { class: "btn solid", type: "button" }, "+ Add item");
    const paint = () => { cards.forEach((c, i) => c.hidden = i >= shown); add.hidden = shown >= cards.length; };
    add.addEventListener("click", () => { shown = Math.min(cards.length, shown + 1); paint(); const c = cards[shown - 1]; c.scrollIntoView({ block: "center" }); const f = c.querySelector(".inp"); if (f) f.focus({ preventScroll: true }); });
    view.append(h("div", { class: "gh" }, svg(ICON[m.g] || ICON.Process), "Items"));
    cards.forEach(c => view.append(c)); paint(); view.append(add);
    if (post.length) view.append(kv(post));
    refresh();
  }

  // ------------------------------------------------------------ reference data
  function renderData() {
    ups = []; curSheet = null;
    chrome("Reference data", "Tables used by the calculators", { group: "Home", back: true });
    view.innerHTML = "";
    const txt = v => v === null ? "" : typeof v === "number" ? String(parseFloat(v.toPrecision(8))) : XL.isErr(v) ? v.code : String(v);
    let tb = null;
    for (const r of D.pages.Data.rows) {
      const vals = r.c.map(a => a ? book.get("Data", a) : null);
      if (r.k === "h") {
        const note = vals.slice(1).filter(v => v !== null && v !== "").map(txt).join(" ");
        const tbl = h("table", { class: "dtbl" }); tb = h("tbody"); tbl.append(tb);
        view.append(h("details", { class: "card" }, h("summary", null, h("span", null, txt(vals[0])), svg('<path d="M6 9l6 6 6-6"/>')), note ? h("p", { class: "note" }, note) : null, h("div", { class: "scroll" }, tbl)));
        continue;
      }
      if (!tb) continue;
      const tr = h("tr", { class: r.k === "s" ? "hd" : "" }); vals.forEach(v => tr.append(h("td", null, txt(v)))); tb.append(tr);
    }
  }

  function renderAbout() {
    ups = []; curSheet = null;
    chrome("About", "EngCalc", { group: "About", back: true });
    view.innerHTML = "";
    const P = t => h("p", { class: "ab-p" }, t);
    const objectives = ["Simplify complex engineering calculations.", "Reduce manual calculation time and repetitive work.", "Support mechanical design and process engineering.", "Assist in maintenance planning and troubleshooting.", "Improve engineering productivity and decision-making.", "Provide a centralized calculation platform."];
    const mark = svg('<rect x="1" y="1" width="22" height="22" rx="6" fill="#122334" stroke="#2A4560" stroke-width=".8"/><circle cx="12" cy="12" r="5.2" stroke="#4FB3FF" stroke-width="1.6"/><circle cx="12" cy="12" r="1.6" fill="#4FB3FF" stroke="none"/><path d="M12 3.6v2.6M12 17.8v2.6M3.6 12h2.6M17.8 12h2.6" stroke="#E7EFF6" stroke-width="1.6"/>');
    view.append(h("section", { class: "card ab-hero" }, mark, h("div", null, h("b", null, "EngCalc"), h("span", null, D.index.length + " engineering calculators"))));
    view.append(h("section", { class: "card" },
      h("div", { class: "grp-t" }, "About this application"),
      P("This application is a comprehensive Excel-based engineering toolkit developed to simplify and streamline various mechanical engineering calculations, design activities, and technical decision-making processes."),
      P("It brings together a wide range of engineering calculators covering mechanical design, equipment sizing, piping systems, pressure vessels, tanks, thermodynamics, fluid mechanics, maintenance, utilities, and process engineering."),
      P("The primary purpose of developing this application was to create a practical, user-friendly, and efficient engineering solution for my own professional use — minimizing repetitive manual calculations, saving valuable time, improving calculation accuracy, and supporting faster, data-driven engineering decisions."),
      P("The application is designed with a minimal-input approach, allowing users to obtain useful engineering results quickly and efficiently.")));
    view.append(h("section", { class: "card" }, h("div", { class: "grp-t" }, "Key objectives"),
      h("ul", { class: "ab-list" }, objectives.map(o => h("li", null, svg(OK_I, "2"), h("span", null, o))))));
    const row = (icon, label, value, href) => h("a", { class: "ab-c", href }, h("span", { class: "ab-ci" }, svg(icon)), h("span", null, h("small", null, label), h("b", null, value)));
    view.append(h("section", { class: "card ab-dev" },
      h("div", { class: "ab-k" }, "Design & developed by"),
      h("div", { class: "ab-name" }, "MD. ARIFUL ISLAM"),
      h("div", { class: "ab-deg" }, "B. Sc. in Mechanical Engineer"),
      row('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>', "Email", "arifulislam.me@gmail.com", "mailto:arifulislam.me@gmail.com"),
      row('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>', "Phone", "+880 1779-341833", "tel:+8801779341833"),
      h("p", { class: "ab-tag" }, "Developed for engineering excellence, efficiency, and continuous improvement.")));
    view.append(h("p", { class: "foot ab-copy" }, "© 2026 MD. Ariful Islam. All Rights Reserved."));
  }
  function route() {
    const k = location.hash.slice(1);
    view.classList.remove("fade"); void view.offsetWidth; view.classList.add("fade");
    window.scrollTo(0, 0);
    if (k === "reference-data") return renderData();
    if (k === "about") return renderAbout();
    if (gBySlug[k]) return renderGroup(gBySlug[k]);
    const sheet = bySlug[k];
    if (sheet && sheet !== "Data") { const p = D.pages[sheet]; return p.type === "grid" ? renderGrid(sheet, p) : renderCalc(sheet, p); }
    renderHome();
  }
  window.addEventListener("hashchange", route);
  let deferred = null; const ib = $("#install");
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred = e; ib.style.display = "inline-block"; });
  ib.addEventListener("click", async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; ib.style.display = "none"; });
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) { try { navigator.serviceWorker.register("sw.js").catch(() => { }); } catch (e) { /* unsupported */ } }
  buildDock();
  route();
})();
