/* Engineering Calculators – mobile app UI */
(function () {
  "use strict";
  const D = window.APPDATA, XL = window.XL;
  const book = new XL.Book(D.sheets);
  const KEY = "engcalc.inputs.v1";
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { saved = {}; }
  for (const k in saved) { const i = k.lastIndexOf("!"); book.setInput(k.slice(0, i), k.slice(i + 1), saved[k]); }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) { /* storage unavailable – keep in memory */ } }

  const $ = (s, el) => (el || document).querySelector(s);
  const h = (tag, attrs, ...kids) => {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) { const v = attrs[k]; if (v == null || v === false) continue; if (k === "class") e.className = v; else if (k.startsWith("on")) e.addEventListener(k.slice(2), v); else if (k === "html") e.innerHTML = v; else e.setAttribute(k, v === true ? "" : v); }
    for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(String(k)));
    return e;
  };
  const view = $("#view"), titleEl = $("#title"), backBtn = $("#back"), bottom = $("#bottom");
  const order = D.order.filter(n => n !== "Data");
  const byCode = {}; D.index.forEach(x => byCode[x.s] = x);

  function statusClass(v) { const s = typeof v === "string" ? v.trim() : ""; return s.startsWith("✔") ? "ok" : s.startsWith("⚠") ? "warn" : s.startsWith("✖") ? "bad" : ""; }
  function show(v, nf) { if (XL.isErr(v)) return v.code; if (v === null || v === undefined) return "–"; if (typeof v === "boolean") return v ? "Yes" : "No"; return XL.fmtNum(v, nf); }
  function parseInput(s) { const t = String(s).trim(); if (t === "") return null; const c = t.replace(/,/g, ""); if (/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(c)) return parseFloat(c); return t; }
  function defaultOf(sh, a) { const r = D.sheets[sh] && D.sheets[sh][a]; return r ? r : null; }
  function isOverridden(sh, a) { return (sh + "!" + a) in saved; }
  function setVal(sh, a, v) { saved[sh + "!" + a] = v; book.setInput(sh, a, v); persist(); }
  function clearVal(sh, a) { delete saved[sh + "!" + a]; book.setInput(sh, a, undefined); persist(); }
  function rangeValues(sh, f) {
    try { const r = book.evalFormula(sh, f); if (r instanceof XL.Range) { const out = []; for (let i = r.r1; i <= r.r2; i++) for (let j = r.c1; j <= r.c2; j++) { const v = book.cell(r.sh, i, j); if (v !== null && v !== "" && !XL.isErr(v)) out.push(v); } return out; } } catch (e) { }
    return [];
  }

  // ------------------------------------------------ input widget
  let updaters = [];
  function inputWidget(sh, blk) {
    const a = blk.a, dv = blk.dv;
    const cur = () => book.get(sh, a);
    const def = defaultOf(sh, a);
    const auto = def && def.f;
    let el;
    if (dv && (dv[0] === "list" || dv[0] === "formula")) {
      el = h("select", { class: "inp", "aria-label": blk.l || a });
      const fill = () => {
        const opts = dv[0] === "list" ? dv[1] : rangeValues(sh, dv[1]);
        const v = cur(); const sv = v === null ? "" : String(v);
        const key = opts.join("\u0001");
        if (el._key !== key) { el.innerHTML = ""; el.append(h("option", { value: "" }, "— select —")); opts.forEach(o => el.append(h("option", { value: String(o) }, String(o)))); el._key = key; }
        if (sv && !opts.map(String).includes(sv)) el.append(h("option", { value: sv }, sv));
        el.value = sv;
      };
      fill();
      el.addEventListener("change", () => { setVal(sh, a, parseInput(el.value)); refresh(); });
      updaters.push(fill);
    } else {
      const numeric = !blk.txt && ((dv && dv[0] === "num") || (def && typeof def.v === "number") || (!def) || auto);
      el = h("input", { class: "inp", type: "text", inputmode: numeric ? "decimal" : "text", enterkeyhint: "next", autocomplete: "off", "aria-label": blk.l || a });
      const fill = () => { if (document.activeElement === el) return; const v = cur(); el.value = (v === null || v === undefined) ? "" : (typeof v === "number" ? String(parseFloat(v.toPrecision(10))) : (XL.isErr(v) ? v.code : String(v))); el.classList.toggle("auto", !!auto && !isOverridden(sh, a)); };
      fill();
      el.addEventListener("input", () => { setVal(sh, a, parseInput(el.value)); refresh(el); el.classList.remove("auto"); });
      el.addEventListener("blur", fill);
      updaters.push(fill);
    }
    return el;
  }
  function outputText(sh, a, nf, el, extra) {
    const f = () => { const v = book.get(sh, a); el.textContent = show(v, nf); const sc = statusClass(v); if (extra) extra(el, v, sc); };
    f(); updaters.push(f); return el;
  }
  function refresh() { for (const u of updaters) u(); }

  // ------------------------------------------------ pages
  function setChrome(title, isHome, sheet) {
    titleEl.textContent = title; backBtn.style.visibility = isHome ? "hidden" : "visible";
    bottom.innerHTML = "";
    if (sheet) {
      const i = order.indexOf(sheet);
      const prev = i > 0 ? order[i - 1] : null, next = i >= 0 && i < order.length - 1 ? order[i + 1] : null;
      bottom.append(
        h("button", { class: "nav", disabled: !prev, onclick: () => go(prev) }, "◄ " + (prev ? prev.split(" ")[0] : "")),
        h("button", { class: "nav home", onclick: () => go(null) }, "⌂ HOME"),
        h("button", { class: "nav", disabled: !next, onclick: () => go(next) }, (next ? next.split(" ")[0] : "") + " ►"));
      bottom.style.display = "flex";
    } else bottom.style.display = "none";
  }
  const slug = n => n.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const bySlug = {}; Object.keys(D.pages).forEach(n => bySlug[slug(n)] = n);
  function go(sheet) { location.hash = sheet ? "#" + slug(sheet) : "#home"; }
  window.addEventListener("hashchange", route);
  backBtn.addEventListener("click", () => go(null));

  function renderHome() {
    updaters = [];
    setChrome("Engineering Calculators", true, null);
    view.innerHTML = "";
    const q = h("input", { class: "search", type: "search", placeholder: "Search calculators… (pump, pipe, tank, H2SO4…)", "aria-label": "Search" });
    const wrap = h("div", { class: "home" });
    view.append(h("div", { class: "hero" }, h("div", { class: "hero-t" }, "Mechanical · Process · Maintenance"), h("div", { class: "hero-s" }, `${D.index.length} calculators · works offline · only yellow fields are editable`)), q, wrap);
    const groups = {};
    D.index.forEach(x => (groups[x.g] = groups[x.g] || []).push(x));
    const cards = [];
    for (const g in groups) {
      const sec = h("section", { class: "grp" }, h("h2", null, g));
      for (const x of groups[g]) {
        const st = h("div", { class: "st" });
        const card = h("button", { class: "card", onclick: () => go(x.s) },
          h("span", { class: "code" }, x.code), h("div", { class: "ct" }, h("div", { class: "cn" }, x.title), h("div", { class: "cd" }, x.desc), st));
        card._text = (x.code + " " + x.title + " " + x.desc + " " + g).toLowerCase(); card._sec = sec;
        cards.push({ card, st, x }); sec.append(card);
      }
      wrap.append(sec);
    }
    wrap.append(h("button", { class: "card data", onclick: () => { location.hash = "#reference-data"; } }, h("span", { class: "code" }, "📚"), h("div", { class: "ct" }, h("div", { class: "cn" }, "Reference data (view only)"), h("div", { class: "cd" }, "Fluids, pipes, materials, steam table, motors, compatibility matrix…"))));
    wrap.append(h("p", { class: "foot" }, "Results are for preliminary design, screening and maintenance decisions. Verify pressure equipment, lifting gear and relief systems with the current code edition and a qualified engineer."));
    q.addEventListener("input", () => {
      const t = q.value.trim().toLowerCase();
      cards.forEach(c => c.card.style.display = !t || c.card._text.includes(t) ? "" : "none");
      wrap.querySelectorAll(".grp").forEach(s => s.style.display = [...s.querySelectorAll(".card")].some(c => c.style.display !== "none") ? "" : "none");
    });
    // live statuses, computed after first paint
    let i = 0;
    const step = () => { const t0 = performance.now(); while (i < cards.length && performance.now() - t0 < 30) { const c = cards[i++]; if (!c.x.d) { c.st.textContent = "Conversion table"; continue; } let v; try { v = book.evalFormula("HOME", c.x.d); if (v instanceof XL.Range) v = book.deref(v); } catch (e) { v = ""; } c.st.textContent = show(v); c.st.className = "st " + statusClass(v); } if (i < cards.length) setTimeout(step, 0); };
    setTimeout(step, 30);
  }

  function renderCalc(sheet, page) {
    updaters = [];
    const meta = byCode[sheet];
    setChrome(meta ? meta.code + " · " + meta.title : sheet, false, sheet);
    view.innerHTML = "";
    const body = h("div", { class: "page" });
    view.append(body);
    if (page.desc) body.append(h("p", { class: "desc" }, page.desc.replace(/^\[[A-Z0-9]+\]\s*/, "").replace("Fill only the yellow cells (blue text). ", "")));
    // split into sections
    const secs = []; let cur = null;
    for (const b of page.blocks) {
      if (b.t === "sec") { cur = { title: b.x, items: [] }; secs.push(cur); continue; }
      if (!cur) { cur = { title: "", items: [] }; secs.push(cur); }
      cur.items.push(b);
    }
    for (const s of secs) {
      const isIn = s.items.some(b => b.t === "in");
      const hasRes = s.items.some(b => b.res || b.main || b.wide);
      const box = h("section", { class: "sec " + (isIn ? "in" : hasRes ? "res" : "calc") });
      const content = h("div", { class: "sec-b" });
      const title = s.title.replace(/\s*\(yellow = you enter\)/i, "");
      if (title) {
        const head = h("button", { class: "sec-h", type: "button" }, h("span", null, title), h("span", { class: "chev" }, "▾"));
        head.addEventListener("click", () => box.classList.toggle("closed"));
        box.append(head);
      }
      if (!isIn && !hasRes) box.classList.add("closed");
      for (const b of s.items) content.append(renderBlock(sheet, b));
      box.append(content); body.append(box);
    }
    if (page.table && page.table.rows.length) body.append(renderTable(sheet, page.table));
    body.append(h("div", { class: "actions" },
      h("button", { class: "btn ghost", onclick: () => { resetSheet(sheet); } }, "↺ Reset inputs to defaults")));
    refresh();
  }
  function renderBlock(sheet, b) {
    if (b.t === "note") return h("p", { class: "note" }, b.x);
    if (b.t === "in") {
      const row = h("label", { class: "field" },
        h("span", { class: "fl" }, b.l),
        h("span", { class: "fi" }, inputWidget(sheet, b), b.u && b.u !== "–" ? h("span", { class: "unit" }, b.u) : null),
        b.n ? h("span", { class: "fn" }, b.n) : null);
      return row;
    }
    // output
    const val = h("span", { class: "ov" });
    const row = h("div", { class: "out" + (b.res ? " r" : "") + (b.main ? " main" : "") + (b.wide ? " wide" : "") },
      h("span", { class: "ol" }, b.l), h("span", { class: "ovw" }, val, b.u && b.u !== "–" && !b.wide ? h("span", { class: "unit" }, b.u) : null),
      b.n && !b.wide ? h("span", { class: "on" }, b.n) : null);
    outputText(sheet, b.a, b.nf, val, (el, v, sc) => { row.classList.remove("ok", "warn", "bad", "status"); if (sc) row.classList.add("status", sc); });
    return row;
  }
  function renderTable(sheet, t) {
    const box = h("section", { class: "sec calc closed" });
    const head = h("button", { class: "sec-h", type: "button" }, h("span", null, t.title || "Detail table"), h("span", { class: "chev" }, "▾"));
    head.addEventListener("click", () => box.classList.toggle("closed"));
    const tbl = h("table", { class: "tbl" }, h("thead", null, h("tr", null, t.head.map(x => h("th", null, x)))));
    const tb = h("tbody"); tbl.append(tb);
    for (const r of t.rows) {
      const tr = h("tr");
      r.forEach(c => { const td = h("td"); outputText(sheet, c.a, c.nf, td); tr.append(td); });
      updaters.push(() => { const txt = tr.textContent; tr.className = /SELECTED/.test(txt) ? "sel" : ""; tr.style.display = [...tr.children].slice(1).every(td => td.textContent === "–" || td.textContent === "" || td.textContent === "0") && r.length > 3 ? "none" : ""; });
      tb.append(tr);
    }
    box.append(head, h("div", { class: "sec-b" }, h("div", { class: "scroll" }, tbl), (t.notes || []).map(n => h("p", { class: "note" }, n))));
    return box;
  }
  function resetSheet(sheet) {
    for (const k of Object.keys(saved)) if (k.startsWith(sheet + "!")) { const i = k.lastIndexOf("!"); clearVal(sheet, k.slice(i + 1)); }
    route();
  }

  function renderGrid(sheet, page) {
    updaters = [];
    const meta = byCode[sheet];
    setChrome(meta ? meta.code + " · " + meta.title : sheet, false, sheet);
    view.innerHTML = "";
    const body = h("div", { class: "page" }); view.append(body);
    if (page.desc) body.append(h("p", { class: "desc" }, page.desc));
    const rows = page.rows.filter(r => r.r !== 2);
    const txtCol = {};
    rows.forEach(r => r.c.forEach((c, j) => { if (c && c.k === "in" && !c.dv) { const d = defaultOf(sheet, c.a); if (d && typeof d.v === "string") txtCol[j] = true; } }));
    const hi = rows.findIndex(r => r.c.filter(c => c && c.h).length >= 3);
    const head = hi >= 0 ? rows[hi].c.map(c => c ? String(book.get(sheet, c.a) || "") : "") : [];
    const valueCell = (c, j) => {
      if (c.k === "in") return inputWidget(sheet, { a: c.a, dv: c.dv, l: head[j] || c.a, txt: txtCol[j] });
      const sp = h("span", { class: "ov" }); outputText(sheet, c.a, c.nf, sp, (el, v, sc) => { el.parentNode && el.parentNode.classList.remove("ok", "warn", "bad"); if (sc && el.parentNode) el.parentNode.classList.add(sc); }); return sp;
    };
    const kv = (list) => {
      const box = h("section", { class: "sec res" }), inner = h("div", { class: "sec-b" }); box.append(inner);
      const items = []; let seq = 0;
      for (const r of list) {
        let label = null, labCol = null, last = null;
        r.c.forEach((c, j) => {
          if (!c) { last = null; return; }
          if (c.k === "t") {
            const tx = String(book.get(sheet, c.a) ?? "");
            if (last && last.j === j - 1 && last.unit === null && !/:\s*$/.test(tx)) { last.unit = tx; last.el.append(h("span", { class: "unit" }, " " + tx)); return; }
            if (c.b && !r.c.slice(j + 1).some(x => x && x.k !== "t")) { items.push({ col: j, h: true, el: h("div", { class: "kvh" }, tx), n: seq++ }); return; }
            label = tx; labCol = j; return;
          }
          const isIn = c.k === "in";
          const vw = h("span", { class: "fi" }, valueCell(c, j));
          const row = h(isIn ? "label" : "div", { class: isIn ? "field" : "out r kvwide" }, h("span", { class: isIn ? "fl" : "ol" }, label || ""), vw);
          items.push({ col: labCol !== null ? labCol : j, el: row, n: seq++ }); last = { j, unit: null, el: vw }; label = null; labCol = null;
        });
      }
      const hcols = items.filter(x => x.h).map(x => x.col).sort((a, b) => a - b);
      const band = c => { let b = -1; for (const x of hcols) if (x <= c) b = x; return b; };
      items.forEach(x => x.b = band(x.col));
      items.sort((x, y) => x.b - y.b || (x.h ? -1 : y.h ? 1 : x.n - y.n));
      items.forEach(x => inner.append(x.el));
      return box;
    };
    if (hi < 0) { body.append(kv(rows)); refresh(); return; }
    const pre = rows.slice(0, hi), data = [], post = [];
    rows.slice(hi + 1).forEach(r => (r.c.filter(Boolean).length >= 3 && post.length === 0 ? data : post).push(r));
    if (pre.length) body.append(kv(pre));
    const list = h("div", { class: "items" }); body.append(h("h3", { class: "dh" }, "Items"), list);
    const used = r => r.c.some(c => c && c.k === "in" && (() => { const v = book.get(sheet, c.a); return v !== null && v !== ""; })());
    const cards = data.map((r, idx) => {
      const card = h("div", { class: "item" });
      const num = r.c[0] && r.c[0].k !== "in" ? book.get(sheet, r.c[0].a) : idx + 1;
      card.append(h("div", { class: "ih" }, "Item " + num));
      const g = h("div", { class: "ig" });
      r.c.forEach((c, j) => {
        if (!c || j === 0 && c.k !== "in") return;
        const lab = (head[j] || "").replace(/\s+/g, " ");
        if (c.k === "f" && /what to enter|help/i.test(lab)) { const sp = h("span", { class: "fn" }); outputText(sheet, c.a, c.nf, sp); g.append(h("div", { class: "ihelp" }, sp)); return; }
        const cell = h("div", { class: "if" + (c.k === "in" ? "" : " io") + (c.r ? " r" : "") }, h("span", { class: "ifl" }, lab), valueCell(c, j));
        g.append(cell);
      });
      card.append(g); card._used = used(r); return card;
    });
    let shown = 0;
    cards.forEach((c, i) => { if (c._used) shown = i + 1; });
    shown = Math.min(cards.length, shown + 1);
    const addBtn = h("button", { class: "btn", type: "button" }, "＋ Add item");
    const paint = () => { cards.forEach((c, i) => c.style.display = i < shown ? "" : "none"); addBtn.style.display = shown < cards.length ? "" : "none"; };
    addBtn.addEventListener("click", () => { shown = Math.min(cards.length, shown + 1); paint(); cards[shown - 1].scrollIntoView({ behavior: "smooth", block: "center" }); });
    cards.forEach(c => list.append(c)); paint();
    body.append(h("div", { class: "actions" }, addBtn));
    if (post.length) body.append(kv(post));
    body.append(h("div", { class: "actions" }, h("button", { class: "btn ghost", onclick: () => resetSheet(sheet) }, "↺ Reset inputs to defaults")));
    refresh();
  }
  function renderData() {
    updaters = [];
    setChrome("Reference data", false, null);
    bottom.style.display = "flex"; bottom.innerHTML = ""; bottom.append(h("button", { class: "nav home", onclick: () => go(null) }, "⌂ HOME"));
    view.innerHTML = "";
    const page = D.pages["Data"];
    const body = h("div", { class: "page" }); view.append(body);
    body.append(h("p", { class: "desc" }, "Reference tables used by the calculators (view only). Edit them in the Excel version if your company data differs."));
    let tb = null;
    const cellText = v => v === null ? "" : (typeof v === "number" ? String(parseFloat(v.toPrecision(8))) : (XL.isErr(v) ? v.code : String(v)));
    for (const r of page.rows) {
      const vals = r.c.map(a => a ? book.get("Data", a) : null);
      if (r.k === "h") {
        const box = h("section", { class: "sec calc closed" });
        const head = h("button", { class: "sec-h", type: "button" }, h("span", null, cellText(vals[0])), h("span", { class: "chev" }, "▾"));
        head.addEventListener("click", () => box.classList.toggle("closed"));
        const note = vals.slice(1).filter(v => v !== null && v !== "").map(cellText).join(" ");
        const tbl = h("table", { class: "grid data" }); tb = h("tbody"); tbl.append(tb);
        box.append(head, h("div", { class: "sec-b" }, note ? h("p", { class: "note" }, note) : null, h("div", { class: "scroll gridwrap" }, tbl)));
        body.append(box); continue;
      }
      if (!tb) continue;
      const tr = h("tr", { class: r.k === "s" ? "gh2" : "" });
      vals.forEach(v => tr.append(h("td", null, cellText(v))));
      tb.append(tr);
    }
  }
  function route() {
    const hs = location.hash;
    window.scrollTo(0, 0);
    if (hs === "#reference-data") return renderData();
    const sheet = bySlug[hs.slice(1)];
    if (sheet && sheet !== "Data") { const page = D.pages[sheet]; return page.type === "grid" ? renderGrid(sheet, page) : renderCalc(sheet, page); }
    renderHome();
  }
  // install prompt
  let deferred = null;
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred = e; const b = $("#install"); if (b) b.style.display = "inline-block"; });
  const ib = $("#install"); if (ib) ib.addEventListener("click", async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; ib.style.display = "none"; });
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) { try { navigator.serviceWorker.register("sw.js").catch(() => { }); } catch (e) { } }
  route();
})();
