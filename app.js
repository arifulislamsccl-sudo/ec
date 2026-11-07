/* EngCalc – mobile UI */
(function () {
  "use strict";
  const D = window.APPDATA, XL = window.XL;
  const book = new XL.Book(D.sheets);
  const KEY = "engcalc.inputs.v1";
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { saved = {}; }
  for (const k in saved) { const i = k.lastIndexOf("!"); book.setInput(k.slice(0, i), k.slice(i + 1), saved[k]); }
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) { /* in-memory only */ } };

  const $ = (s, el) => (el || document).querySelector(s);
  const h = (tag, attrs, ...kids) => {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) { const v = attrs[k]; if (v == null || v === false) continue; if (k === "class") e.className = v; else if (k.startsWith("on")) e.addEventListener(k.slice(2), v); else if (k === "html") e.innerHTML = v; else e.setAttribute(k, v === true ? "" : v); }
    for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(String(k)));
    return e;
  };
  const svg = (paths, cls) => { const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("fill", "none"); s.setAttribute("stroke", "currentColor"); s.setAttribute("stroke-width", "1.8"); s.setAttribute("stroke-linecap", "round"); s.setAttribute("stroke-linejoin", "round"); if (cls) s.setAttribute("class", cls); s.innerHTML = paths; return s; };
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
    "Unit Converter": '<path d="M4 8h15l-3.5-3.5M20 16H5l3.5 3.5"/>'
  };
  const CHEV = '<path d="M9 6l6 6-6 6"/>';
  const view = $("#view"), titleEl = $("#title"), backBtn = $("#back"), bottom = $("#bottom");
  const order = D.order.filter(n => n !== "Data");
  const byCode = {}; D.index.forEach(x => byCode[x.s] = x);
  const slug = n => n.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const bySlug = {}; Object.keys(D.pages).forEach(n => bySlug[slug(n)] = n);

  const statusOf = v => { const s = typeof v === "string" ? v.trim() : ""; return s.startsWith("✔") ? "ok" : s.startsWith("⚠") ? "warn" : s.startsWith("✖") ? "bad" : ""; };
  const strip = s => String(s).replace(/^[✔⚠✖]️?\s*/, "");
  const show = (v, nf) => { if (XL.isErr(v)) return v.code; if (v === null || v === undefined || v === "") return "–"; if (typeof v === "boolean") return v ? "Yes" : "No"; return XL.fmtNum(v, nf); };
  const parseInput = s => { const t = String(s).trim(); if (t === "") return null; const c = t.replace(/,/g, ""); return /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(c) ? parseFloat(c) : t; };
  const defaultOf = (sh, a) => (D.sheets[sh] && D.sheets[sh][a]) || null;
  const isOver = (sh, a) => (sh + "!" + a) in saved;
  const setVal = (sh, a, v) => { saved[sh + "!" + a] = v; book.setInput(sh, a, v); persist(); };
  const clearVal = (sh, a) => { delete saved[sh + "!" + a]; book.setInput(sh, a, undefined); persist(); };
  const ACR = new Set(["NPSH", "IEC", "API", "ASME", "PSV", "OEE", "MTBF", "MTTR", "EOQ", "VFD", "TDH", "ISO", "BOM", "RPN", "FLC", "HP", "MAWP", "LMTD", "COP", "TR", "PF", "NPV", "IRR", "EVM", "CPI", "SPI", "EAC", "ETC", "VAC", "TCPI", "CS", "SS", "PP", "PVC", "HDPE", "FRP", "PTFE", "ISMB", "ISMC", "ISA", "NPS", "DN", "ID", "OD", "RT", "CA", "BEP", "PWHT"]);
  const sentence = l => { if (!l) return l; const w = l.match(/^[A-Z][A-Z\-]+\b/); if (!w || ACR.has(w[0])) return l; let first = true; return l.replace(/\b[A-Z][A-Z\-]{1,}\b/g, m => { if (ACR.has(m)) { first = false; return m; } const r = first ? m.charAt(0) + m.slice(1).toLowerCase() : m.toLowerCase(); first = false; return r; }); };
  const cleanUnit = u => (u && u !== "–" && u !== "-") ? u : "";
  function rangeValues(sh, f) {
    try { const r = book.evalFormula(sh, f); if (r instanceof XL.Range) { const out = []; for (let i = r.r1; i <= r.r2; i++) for (let j = r.c1; j <= r.c2; j++) { const v = book.cell(r.sh, i, j); if (v !== null && v !== "" && !XL.isErr(v)) out.push(v); } return out; } } catch (e) { /* invalid list */ }
    return [];
  }

  // ---------------------------------------------------------------- inputs
  let updaters = [];
  const refresh = () => { for (const u of updaters) u(); };
  function inputWidget(sh, blk) {
    const a = blk.a, dv = blk.dv, def = defaultOf(sh, a), auto = def && def.f;
    const cur = () => book.get(sh, a);
    let el;
    if (dv && (dv[0] === "list" || dv[0] === "formula")) {
      el = h("select", { class: "inp", "aria-label": blk.l || a });
      const fill = () => {
        const opts = dv[0] === "list" ? dv[1] : rangeValues(sh, dv[1]);
        const v = cur(), sv = v === null ? "" : String(v), key = opts.join("\u0001");
        if (el._key !== key) { el.innerHTML = ""; el.append(h("option", { value: "" }, "Select…")); opts.forEach(o => el.append(h("option", { value: String(o) }, String(o)))); el._key = key; }
        if (sv && !opts.map(String).includes(sv)) el.append(h("option", { value: sv }, sv));
        el.value = sv;
      };
      fill(); updaters.push(fill);
      el.addEventListener("change", () => { setVal(sh, a, parseInput(el.value)); refresh(); });
    } else {
      const numeric = !blk.txt && ((dv && dv[0] === "num") || (def && typeof def.v === "number") || !def || auto);
      el = h("input", { class: "inp", type: "text", inputmode: numeric ? "decimal" : "text", enterkeyhint: "next", autocomplete: "off", spellcheck: "false", "aria-label": blk.l || a, placeholder: numeric ? "blank = auto" : "" });
      const fill = () => { if (document.activeElement === el) return; const v = cur(); el.value = (v === null || v === undefined) ? "" : (typeof v === "number" ? String(parseFloat(v.toPrecision(10))) : (XL.isErr(v) ? v.code : String(v))); el.classList.toggle("auto", !!auto && !isOver(sh, a)); };
      fill(); updaters.push(fill);
      el.addEventListener("input", () => { setVal(sh, a, parseInput(el.value)); el.classList.remove("auto"); refresh(); });
      el.addEventListener("blur", fill);
      el.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); const all = [...view.querySelectorAll(".inp")]; const n = all[all.indexOf(el) + 1]; if (n) n.focus(); else el.blur(); } });
    }
    return el;
  }
  function bind(sh, a, fn) { const f = () => fn(book.get(sh, a)); f(); updaters.push(f); }

  // ---------------------------------------------------------------- chrome + routing
  function setChrome(title, sheet, showBack) {
    titleEl.textContent = title;
    backBtn.style.visibility = showBack ? "visible" : "hidden";
    bottom.innerHTML = "";
    if (sheet) {
      const i = order.indexOf(sheet), prev = i > 0 ? order[i - 1] : null, next = i >= 0 && i < order.length - 1 ? order[i + 1] : null;
      const code = n => n ? (byCode[n] ? byCode[n].code : n.split(" ")[0]) : "";
      bottom.append(
        h("button", { class: "nav", disabled: !prev, onclick: () => go(prev), "aria-label": "Previous calculator" }, svg('<path d="M15 18l-6-6 6-6"/>'), code(prev)),
        h("button", { class: "nav home", onclick: () => go(null) }, "All"),
        h("button", { class: "nav", disabled: !next, onclick: () => go(next), "aria-label": "Next calculator" }, code(next), svg(CHEV)));
      bottom.style.display = "flex";
    } else if (showBack) { bottom.append(h("button", { class: "nav home", onclick: () => go(null) }, "All calculators")); bottom.style.display = "flex"; }
    else bottom.style.display = "none";
  }
  function go(sheet) { location.hash = sheet ? "#" + slug(sheet) : "#home"; }
  backBtn.addEventListener("click", () => go(null));
  window.addEventListener("hashchange", route);

  // ---------------------------------------------------------------- home
  let homeScroll = 0, homeQuery = "";
  function renderHome() {
    updaters = [];
    setChrome("EngCalc", null, false);
    view.innerHTML = "";
    const mark = svg('<rect x="1" y="1" width="22" height="22" rx="6" fill="#14212B" stroke="none"/><circle cx="12" cy="12" r="5.2" stroke="#F2B705" stroke-width="1.6"/><circle cx="12" cy="12" r="1.6" fill="#F2B705" stroke="none"/><path d="M12 3.6v2.6M12 17.8v2.6M3.6 12h2.6M17.8 12h2.6" stroke="#EAF2F6" stroke-width="1.6"/>');
    view.append(h("div", { class: "brand" }, mark, h("div", null, h("div", { class: "brand-n" }, "EngCalc"), h("div", { class: "brand-s" }, `${D.index.length} calculators for plant, process and maintenance engineers. Works offline.`))));
    const q = h("input", { type: "search", placeholder: "Search: pump, pipe size, H2SO4, tank…", "aria-label": "Search calculators", value: homeQuery });
    view.append(h("div", { class: "search" }, svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'), q));
    const groups = {}; D.index.forEach(x => (groups[x.g] = groups[x.g] || []).push(x));
    const rail = h("div", { class: "rail", role: "navigation", "aria-label": "Categories" });
    view.append(rail);
    const wrap = h("div"); view.append(wrap);
    const rows = [];
    for (const g in groups) {
      const sec = h("section", { class: "grp", id: "g-" + slug(g) });
      sec.append(h("div", { class: "grp-h" }, svg(ICON[g] || ICON["Process"]), g, h("small", null, groups[g].length + (groups[g].length === 1 ? " tool" : " tools"))));
      const list = h("div", { class: "list" });
      for (const x of groups[g]) {
        const st = h("span"), rs = h("div", { class: "rs" }, h("i", { class: "dot" }), st);
        const row = h("button", { class: "row", onclick: () => { homeScroll = window.scrollY; go(x.s); } }, h("span", { class: "tag" }, x.code), h("span", { class: "rt" }, x.title), svg(CHEV, "chev"), rs);
        row._t = (x.code + " " + x.title + " " + x.desc + " " + g).toLowerCase();
        rows.push({ row, rs, st, x }); list.append(row);
      }
      sec.append(list); wrap.append(sec);
      rail.append(h("button", { class: "chip", onclick: () => sec.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }) }, svg(ICON[g] || ICON["Process"]), g));
    }
    const ref = h("section", { class: "grp" }, h("div", { class: "grp-h" }, svg('<path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z"/><path d="M8 9h8M8 13h6"/>'), "Reference data"),
      h("div", { class: "list" }, h("button", { class: "row", onclick: () => { location.hash = "#reference-data"; } }, h("span", { class: "tag" }, "DATA"), h("span", { class: "rt" }, "Fluids, pipes, materials, steam table, motors, compatibility"), svg(CHEV, "chev"), h("div", { class: "rs" }, h("span", null, "View only")))));
    wrap.append(ref);
    const none = h("p", { class: "empty", hidden: true }, "No calculator matches. Try a shorter word, e.g. “pump” or “tank”.");
    wrap.append(none);
    wrap.append(h("p", { class: "foot" }, "Results support preliminary design, screening and maintenance decisions. Check pressure equipment, lifting gear and relief systems against the current code edition with a qualified engineer."));
    const filter = () => {
      homeQuery = q.value; const t = q.value.trim().toLowerCase(); let any = false;
      rows.forEach(r => { const m = !t || r.row._t.includes(t); r.row.hidden = !m; any = any || m; });
      wrap.querySelectorAll(".grp").forEach(s => { const rs = s.querySelectorAll(".row"); s.hidden = rs.length > 0 && [...rs].every(r => r.hidden) && s !== ref; });
      ref.hidden = !!t; rail.hidden = !!t; none.hidden = any;
    };
    q.addEventListener("input", filter); filter();
    let i = 0;
    const step = () => {
      const t0 = performance.now();
      while (i < rows.length && performance.now() - t0 < 24) {
        const r = rows[i++];
        if (!r.x.d) { r.st.textContent = "Conversion table"; continue; }
        let v; try { v = book.evalFormula("HOME", r.x.d); if (v instanceof XL.Range) v = book.deref(v); } catch (e) { v = ""; }
        r.st.textContent = strip(show(v)); r.rs.className = "rs " + statusOf(v);
      }
      if (i < rows.length) setTimeout(step, 0);
    };
    setTimeout(step, 20);
    requestAnimationFrame(() => window.scrollTo(0, homeScroll));
  }

  // ---------------------------------------------------------------- calculator page
  function pageHead(sheet, page) {
    const meta = byCode[sheet];
    const desc = (page.desc || "").replace(/^\[[A-Z0-9]+\]\s*/, "").replace(/Fill only the yellow cells \(blue text\)\.\s*/, "").replace(/^Enter the yellow cells\.\s*/, "");
    return h("div", { class: "ph" }, h("span", { class: "ph-code" }, meta ? meta.code : ""), h("h2", null, meta ? meta.title : sheet), desc ? h("p", null, desc) : null);
  }
  function renderCalc(sheet, page) {
    updaters = [];
    const meta = byCode[sheet];
    setChrome(meta ? meta.code : sheet, sheet, true);
    view.innerHTML = "";
    view.append(pageHead(sheet, page));
    const secs = []; let cur = null;
    for (const b of page.blocks) {
      if (b.t === "sec") { cur = { title: b.x, items: [] }; secs.push(cur); continue; }
      if (!cur) { cur = { title: "", items: [] }; secs.push(cur); }
      cur.items.push(b);
    }
    for (const s of secs) {
      const ins = s.items.filter(b => b.t === "in");
      const isRes = s.items.some(b => b.res || b.main || b.wide);
      const title = s.title.replace(/^\d+\.\s*/, "").replace(/\s*\(yellow = you enter\)/i, "").replace(/^RESULT\s*—\s*/i, "");
      const nice = t => t.charAt(0) + t.slice(1).toLowerCase();
      const box = h("section", { class: "blk" });
      const body = h("div", { class: "blk-b" });
      const head = h("button", { class: "blk-h", type: "button", "aria-expanded": "true" }, h("span", null, nice(title || "Results"), ins.length ? h("small", null, ins.length + " inputs") : null), svg('<path d="M6 9l6 6 6-6"/>', "cv"));
      head.addEventListener("click", () => { box.classList.toggle("closed"); head.setAttribute("aria-expanded", String(!box.classList.contains("closed"))); });
      box.append(head, body);
      if (isRes) {
        // faceplate for numeric key results, lamps for verdicts and text results
        const nums = s.items.filter(b => b.t === "out" && (b.res || b.main) && !b.wide && (b.nf !== "@" || b.main));
        const main = nums.find(b => b.main) || nums[0];
        if (main) {
          const fv = h("b"), fu = h("span", null, cleanUnit(main.u));
          const grid = h("div", { class: "face-g" });
          const face = h("div", { class: "face" }, h("div", { class: "face-l" }, sentence(main.l)), h("div", { class: "face-v" }, fv, fu), grid);
          bind(sheet, main.a, v => { fv.textContent = show(v, main.nf); });
          nums.filter(b => b !== main).forEach(b => { const vv = h("span"); const rv = h("div", { class: "rd-v" }); const rd = h("div", { class: "rd" }, h("div", { class: "rd-l" }, sentence(b.l)), rv); bind(sheet, b.a, v => { rv.textContent = show(v, b.nf); const u = cleanUnit(b.u); if (u) rv.append(h("span", null, u)); }); grid.append(rd); });
          box.insertBefore(face, body); face.style.margin = "4px 16px 12px";
        }
        let lead = true;
        s.items.forEach(b => { if (nums.includes(b)) return; body.append(renderOut(sheet, b, lead && (b.wide || b.l === "DECISION"))); if (b.wide || b.l === "DECISION") lead = false; });
      } else {
        s.items.forEach(b => body.append(b.t === "in" ? renderInput(sheet, b) : b.t === "note" ? h("p", { class: "note" }, b.x) : renderOut(sheet, b, false)));
        if (!ins.length) box.classList.add("closed");
      }
      if (!body.childNodes.length) body.remove();
      view.append(box);
    }
    if (page.table && page.table.rows.length) view.append(renderTable(sheet, page.table));
    view.append(h("div", { class: "actions" }, h("button", { class: "btn", onclick: () => resetSheet(sheet) }, "Reset to default values")));
    refresh();
  }
  function renderInput(sheet, b) {
    const def = defaultOf(sheet, b.a);
    const lab = h("span", { class: "fl" }, b.l, def && def.f ? h("span", { class: "linked" }, "linked") : null);
    const u = cleanUnit(b.u);
    return h("label", { class: "field" }, lab, h("span", { class: "fbox" }, inputWidget(sheet, b), u ? h("span", { class: "unit" }, u) : null), b.n && !/^select from list$/i.test(b.n) && !/^Dropdown$/i.test(b.n) ? h("span", { class: "fn" }, b.n) : null);
  }
  function renderOut(sheet, b, lead) {
    if (b.t === "note") return h("p", { class: "note" }, b.x);
    const label = sentence(b.l);
    if (b.wide || b.nf === "@" || b.res) {
      const t = h("div", { class: "lamp-t" });
      const row = h("div", { class: "lamp" }, h("i", { class: "dot" }), h("div", { class: "lamp-l" }, label), t);
      bind(sheet, b.a, v => { const sc = statusOf(v); row.className = "lamp" + (sc ? " " + sc : "") + (lead ? " lead" : ""); t.textContent = typeof v === "number" ? show(v, b.nf) + (cleanUnit(b.u) ? " " + b.u : "") : strip(show(v, b.nf)); });
      return row;
    }
    const ov = h("span", { class: "ov" });
    const row = h("div", { class: "out" }, h("span", { class: "ol" }, label), ov, b.n ? h("span", { class: "on" }, b.n) : null);
    bind(sheet, b.a, v => { ov.textContent = show(v, b.nf); const u = cleanUnit(b.u); if (u && typeof v === "number") ov.append(h("small", null, u)); });
    return row;
  }
  function renderTable(sheet, t) {
    const box = h("section", { class: "blk closed" });
    const head = h("button", { class: "blk-h", type: "button" }, h("span", null, t.title ? t.title.replace(/\s*\(auto\)/i, "") : "Detail table"), svg('<path d="M6 9l6 6 6-6"/>', "cv"));
    head.addEventListener("click", () => box.classList.toggle("closed"));
    const tbl = h("table", { class: "tbl" }, h("thead", null, h("tr", null, t.head.map(x => h("th", null, x))))), tb = h("tbody"); tbl.append(tb);
    for (const r of t.rows) {
      const tr = h("tr"), tds = r.map(c => { const td = h("td"); bind(sheet, c.a, v => { td.textContent = show(v, c.nf); }); return td; });
      tds.forEach(td => tr.append(td));
      updaters.push(() => { tr.className = /SELECTED/.test(tr.textContent) ? "sel" : ""; tr.hidden = r.length > 3 && tds.slice(1).every(td => ["–", "", "0"].includes(td.textContent)); });
      tb.append(tr);
    }
    box.append(head, h("div", { class: "blk-b" }, h("div", { class: "scroll" }, tbl), (t.notes || []).map(n => h("p", { class: "note" }, n))));
    return box;
  }
  function resetSheet(sheet) {
    for (const k of Object.keys(saved)) if (k.startsWith(sheet + "!")) clearVal(sheet, k.slice(k.lastIndexOf("!") + 1));
    route();
  }

  // ---------------------------------------------------------------- list pages (BOM / FMEA)
  function renderGrid(sheet, page) {
    updaters = [];
    const meta = byCode[sheet];
    setChrome(meta ? meta.code : sheet, sheet, true);
    view.innerHTML = "";
    view.append(pageHead(sheet, { desc: page.desc }));
    const rows = page.rows.filter(r => r.r !== 2);
    const txtCol = {};
    rows.forEach(r => r.c.forEach((c, j) => { if (c && c.k === "in" && !c.dv) { const d = defaultOf(sheet, c.a); if (d && typeof d.v === "string") txtCol[j] = true; } }));
    const hi = rows.findIndex(r => r.c.filter(c => c && c.h).length >= 3);
    const head = hi >= 0 ? rows[hi].c.map(c => c ? String(book.get(sheet, c.a) || "") : "") : [];
    const valueCell = (c, j) => {
      if (c.k === "in") return h("span", { class: "fbox" }, inputWidget(sheet, { a: c.a, dv: c.dv, l: head[j] || c.a, txt: txtCol[j] }));
      const sp = h("span", { class: "ov" }); bind(sheet, c.a, v => { sp.textContent = strip(show(v, c.nf)); const p = sp.parentNode; if (p) { p.classList.remove("ok", "warn", "bad"); const sc = statusOf(v); if (sc) p.classList.add(sc); } }); return sp;
    };
    const kv = list => {
      const box = h("section", { class: "blk" }), inner = h("div", { class: "blk-b" }); box.append(h("div", { style: "height:10px" }), inner);
      const items = []; let seq = 0;
      for (const r of list) {
        let label = null, labCol = null, last = null;
        r.c.forEach((c, j) => {
          if (!c) { last = null; return; }
          if (c.k === "t") {
            const tx = String(book.get(sheet, c.a) ?? "");
            if (last && last.j === j - 1 && last.unit === null && !/:\s*$/.test(tx)) { last.unit = tx; if (last.box) last.box.append(h("span", { class: "unit" }, tx)); else last.ov.dataset.u = tx; return; }
            if (c.b && !r.c.slice(j + 1).some(x => x && x.k !== "t")) { items.push({ col: j, h: true, el: h("div", { class: "kvh" }, tx.charAt(0) + tx.slice(1).toLowerCase()), n: seq++ }); return; }
            label = tx.replace(/:\s*$/, ""); labCol = j; return;
          }
          let el, rec = { j, unit: null };
          if (c.k === "in") { const bx = h("span", { class: "fbox" }, inputWidget(sheet, { a: c.a, dv: c.dv, l: label || c.a })); el = h("label", { class: "field" }, h("span", { class: "fl" }, label || ""), bx); rec.box = bx; }
          else {
            const ov = h("span", { class: "ov" }); rec.ov = ov;
            const isTxt = c.nf === "@" || /DECISION/i.test(label || "");
            if (isTxt) { const t = h("div", { class: "lamp-t" }); el = h("div", { class: "lamp lead" }, h("i", { class: "dot" }), h("div", { class: "lamp-l" }, sentence(label || "")), t); bind(sheet, c.a, v => { const sc = statusOf(v); el.className = "lamp lead" + (sc ? " " + sc : ""); t.textContent = strip(show(v, c.nf)); }); }
            else { el = h("div", { class: "out" }, h("span", { class: "ol" }, label || ""), ov); bind(sheet, c.a, v => { ov.textContent = show(v, c.nf); if (ov.dataset.u) ov.append(h("small", null, ov.dataset.u)); }); }
          }
          items.push({ col: labCol !== null ? labCol : j, el, n: seq++ }); last = rec; label = null; labCol = null;
        });
      }
      const hcols = items.filter(x => x.h).map(x => x.col).sort((a, b) => a - b);
      const band = c => { let b = -1; for (const x of hcols) if (x <= c) b = x; return b; };
      items.forEach(x => x.b = band(x.col));
      items.sort((x, y) => x.b - y.b || (x.h ? -1 : y.h ? 1 : x.n - y.n));
      items.forEach(x => inner.append(x.el));
      return box;
    };
    if (hi < 0) { view.append(kv(rows)); refresh(); return; }
    const pre = rows.slice(0, hi), data = [], post = [];
    rows.slice(hi + 1).forEach(r => (r.c.filter(Boolean).length >= 3 && post.length === 0 ? data : post).push(r));
    if (pre.length) view.append(kv(pre));
    const list = h("div", { class: "items" });
    view.append(list);
    const used = r => r.c.some(c => c && c.k === "in" && (() => { const v = book.get(sheet, c.a); return v !== null && v !== ""; })());
    const cards = data.map((r, idx) => {
      const num = r.c[0] && r.c[0].k !== "in" ? book.get(sheet, r.c[0].a) : idx + 1;
      const g = h("div", { class: "ig" });
      r.c.forEach((c, j) => {
        if (!c || (j === 0 && c.k !== "in")) return;
        const lab = (head[j] || "").replace(/\s+/g, " ");
        if (c.k === "f" && /what to enter|help/i.test(lab)) { const sp = h("span"); bind(sheet, c.a, v => { sp.textContent = show(v, c.nf) === "–" ? "" : show(v, c.nf); }); g.append(h("div", { class: "ihelp" }, sp)); return; }
        g.append(h("div", { class: "if" + (c.k === "in" ? "" : " io") + (c.r ? " r" : "") }, h("span", { class: "ifl" }, lab), valueCell(c, j)));
      });
      const card = h("div", { class: "item" }, h("div", { class: "ih" }, "Item " + num), g);
      card._used = used(r); return card;
    });
    let shown = 0; cards.forEach((c, i) => { if (c._used) shown = i + 1; }); shown = Math.min(cards.length, shown + 1);
    const addBtn = h("button", { class: "btn primary", type: "button" }, "Add item");
    const paint = () => { cards.forEach((c, i) => c.hidden = i >= shown); addBtn.hidden = shown >= cards.length; };
    addBtn.addEventListener("click", () => { shown = Math.min(cards.length, shown + 1); paint(); const c = cards[shown - 1]; c.scrollIntoView({ block: "center" }); const f = c.querySelector(".inp"); if (f) f.focus({ preventScroll: true }); });
    cards.forEach(c => list.append(c)); paint();
    view.append(h("div", { class: "actions" }, addBtn));
    if (post.length) view.append(kv(post));
    view.append(h("div", { class: "actions" }, h("button", { class: "btn", onclick: () => resetSheet(sheet) }, "Reset to default values")));
    refresh();
  }

  // ---------------------------------------------------------------- reference data
  function renderData() {
    updaters = [];
    setChrome("Reference data", null, true);
    view.innerHTML = "";
    view.append(h("div", { class: "ph" }, h("h2", null, "Reference data"), h("p", null, "Tables the calculators use. View only – change them in the Excel version if your company data differs.")));
    const txt = v => v === null ? "" : (typeof v === "number" ? String(parseFloat(v.toPrecision(8))) : (XL.isErr(v) ? v.code : String(v)));
    let tb = null;
    for (const r of D.pages["Data"].rows) {
      const vals = r.c.map(a => a ? book.get("Data", a) : null);
      if (r.k === "h") {
        const box = h("section", { class: "blk closed" });
        const head = h("button", { class: "blk-h", type: "button" }, h("span", null, txt(vals[0])), svg('<path d="M6 9l6 6 6-6"/>', "cv"));
        head.addEventListener("click", () => box.classList.toggle("closed"));
        const note = vals.slice(1).filter(v => v !== null && v !== "").map(txt).join(" ");
        const tbl = h("table", { class: "dtbl" }); tb = h("tbody"); tbl.append(tb);
        box.append(head, h("div", { class: "blk-b" }, note ? h("p", { class: "note" }, note) : null, h("div", { class: "scroll" }, tbl)));
        view.append(box); continue;
      }
      if (!tb) continue;
      const tr = h("tr", { class: r.k === "s" ? "hd" : "" }); vals.forEach(v => tr.append(h("td", null, txt(v)))); tb.append(tr);
    }
  }

  function route() {
    const hs = location.hash;
    view.classList.remove("enter"); void view.offsetWidth; view.classList.add("enter");
    if (hs === "#reference-data") { window.scrollTo(0, 0); return renderData(); }
    const sheet = bySlug[hs.slice(1)];
    if (sheet && sheet !== "Data") { window.scrollTo(0, 0); const page = D.pages[sheet]; return page.type === "grid" ? renderGrid(sheet, page) : renderCalc(sheet, page); }
    renderHome();
  }
  let deferred = null;
  const ib = $("#install");
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred = e; ib.style.display = "inline-block"; });
  ib.addEventListener("click", async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; ib.style.display = "none"; });
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) { try { navigator.serviceWorker.register("sw.js").catch(() => { }); } catch (e) { /* not supported here */ } }
  route();
})();
