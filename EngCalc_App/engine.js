/* Mini Excel formula engine – evaluates the same formulas as the Excel workbook. */
(function (G) {
  "use strict";
  class XErr { constructor(c) { this.code = c; } toString() { return this.code; } }
  const E = { NA: new XErr("#N/A"), VALUE: new XErr("#VALUE!"), DIV: new XErr("#DIV/0!"), NUM: new XErr("#NUM!"), REF: new XErr("#REF!"), NAME: new XErr("#NAME?") };
  const isErr = v => v instanceof XErr;
  class Range { constructor(sh, r1, c1, r2, c2) { this.sh = sh; this.r1 = r1; this.c1 = c1; this.r2 = r2; this.c2 = c2; } }

  function colNum(s) { let n = 0; for (const ch of s) n = n * 26 + (ch.charCodeAt(0) - 64); return n; }
  function colName(n) { let s = ""; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; } return s; }
  function parseAddr(a) { const m = /^\$?([A-Z]{1,3})\$?(\d+)$/.exec(a); return { c: colNum(m[1]), r: +m[2] }; }

  // ---------------- tokenizer
  const RE = {
    ws: /^\s+/, str: /^"((?:[^"]|"")*)"/,
    func: /^(_xlfn\.)?([A-Za-z_][A-Za-z0-9_.]*)\(/,
    sref: /^('(?:[^']|'')+'|[A-Za-z_][A-Za-z0-9_.]*)!(\$?[A-Z]{1,3}\$?\d+)(?::(\$?[A-Z]{1,3}\$?\d+))?/,
    ref: /^(\$?[A-Z]{1,3}\$?\d+)(?::(\$?[A-Z]{1,3}\$?\d+))?/,
    num: /^(\d+\.?\d*(?:[Ee][+-]?\d+)?|\.\d+(?:[Ee][+-]?\d+)?)/,
    bool: /^(TRUE|FALSE)\b/,
    op: /^(<=|>=|<>|[-+*/^&=<>(),%])/
  };
  function tokenize(s) {
    const t = []; let i = 0, m;
    while (i < s.length) {
      const r = s.slice(i);
      if ((m = RE.ws.exec(r))) { i += m[0].length; continue; }
      if ((m = RE.str.exec(r))) { t.push({ k: "s", v: m[1].replace(/""/g, '"') }); i += m[0].length; continue; }
      if ((m = RE.func.exec(r))) { t.push({ k: "f", v: m[2].toUpperCase() }); i += m[0].length; continue; }
      if ((m = RE.sref.exec(r))) { let sh = m[1]; if (sh[0] === "'") sh = sh.slice(1, -1).replace(/''/g, "'"); t.push({ k: "r", sh, a: m[2], b: m[3] }); i += m[0].length; continue; }
      if ((m = RE.bool.exec(r))) { t.push({ k: "b", v: m[1] === "TRUE" }); i += m[0].length; continue; }
      if ((m = RE.ref.exec(r))) { t.push({ k: "r", sh: null, a: m[1], b: m[2] }); i += m[0].length; continue; }
      if ((m = RE.num.exec(r))) { t.push({ k: "n", v: parseFloat(m[1]) }); i += m[0].length; continue; }
      if ((m = RE.op.exec(r))) { t.push({ k: "o", v: m[1] }); i += m[0].length; continue; }
      throw new Error("Bad token at: " + r.slice(0, 20));
    }
    return t;
  }
  // ---------------- parser -> AST
  function parse(src) {
    const t = tokenize(src); let p = 0;
    const peek = () => t[p], next = () => t[p++];
    const isOp = (v) => t[p] && t[p].k === "o" && t[p].v === v;
    function cmp() { let l = cat(); while (t[p] && t[p].k === "o" && ["=", "<>", "<", ">", "<=", ">="].includes(t[p].v)) { const o = next().v; l = { k: "bin", o, l, r: cat() }; } return l; }
    function cat() { let l = add(); while (isOp("&")) { next(); l = { k: "bin", o: "&", l, r: add() }; } return l; }
    function add() { let l = mul(); while (isOp("+") || isOp("-")) { const o = next().v; l = { k: "bin", o, l, r: mul() }; } return l; }
    function mul() { let l = pow(); while (isOp("*") || isOp("/")) { const o = next().v; l = { k: "bin", o, l, r: pow() }; } return l; }
    function pow() { let l = una(); while (isOp("^")) { next(); l = { k: "bin", o: "^", l, r: una() }; } return l; }
    function una() { if (isOp("-")) { next(); return { k: "neg", x: una() }; } if (isOp("+")) { next(); return una(); } let x = prim(); while (isOp("%")) { next(); x = { k: "bin", o: "/", l: x, r: { k: "n", v: 100 } }; } return x; }
    function prim() {
      const k = next(); if (!k) throw new Error("Unexpected end");
      if (k.k === "n") return { k: "n", v: k.v };
      if (k.k === "s") return { k: "s", v: k.v };
      if (k.k === "b") return { k: "n", v: k.v, bool: true };
      if (k.k === "r") return { k: "ref", sh: k.sh, a: k.a, b: k.b };
      if (k.k === "f") { const args = []; if (!isOp(")")) { do { if (isOp(",")) { args.push({ k: "blank" }); continue; } args.push(cmp()); } while (isOp(",") && next()); } if (!isOp(")")) throw new Error("Missing )"); next(); return { k: "fn", n: k.v, args }; }
      if (k.k === "o" && k.v === "(") { const x = cmp(); if (!isOp(")")) throw new Error("Missing )"); next(); return x; }
      throw new Error("Unexpected " + JSON.stringify(k));
    }
    const ast = cmp(); if (p < t.length) throw new Error("Trailing tokens in " + src); return ast;
  }

  // ---------------- number formatting (Excel subset)
  function roundHalfAway(x, d) { const f = Math.pow(10, d); const y = Math.abs(x) * f; let r = Math.round(y + 1e-9 * Math.max(1, y)); return Math.sign(x) * r / f; }
  function general(v) {
    if (typeof v !== "number") return String(v);
    if (!isFinite(v)) return "#NUM!";
    if (Number.isInteger(v) && Math.abs(v) < 1e15) return String(v);
    const a = Math.abs(v);
    if (a !== 0 && (a < 1e-9 || a >= 1e15)) return v.toExponential(5).replace(/\.?0+e/, "E").replace("E+", "E+").toUpperCase();
    return String(parseFloat(v.toPrecision(15)));
  }
  function fmtNum(v, f) {
    if (v === null || v === undefined || v === "") return "";
    if (isErr(v)) return v.code;
    if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
    if (typeof v === "string") return v;
    if (!isFinite(v)) return "#NUM!";
    if (!f || f === "General" || f === "@") { const a = Math.abs(v); if (Number.isInteger(v)) return v.toLocaleString("en-US"); if (a >= 1000) return roundHalfAway(v, 2).toLocaleString("en-US", { maximumFractionDigits: 2 }); return String(parseFloat(v.toPrecision(6))); }
    f = f.split(";")[0];
    const pct = f.includes("%");
    if (/E\+/i.test(f)) { const d = (f.split(".")[1] || "").split(/E/i)[0].length; let s = v.toExponential(d).toUpperCase(); s = s.replace(/E([+-])(\d)$/, "E$10$2"); return s; }
    if (pct) v = v * 100;
    const body = f.replace(/[%"]/g, "");
    const parts = body.split(".");
    const dec = parts[1] ? parts[1] : "";
    const req = (dec.match(/0/g) || []).length, opt = (dec.match(/#/g) || []).length;
    const thou = parts[0].includes(",");
    let x = roundHalfAway(v, req + opt);
    let s = Math.abs(x).toFixed(req + opt);
    if (opt) { s = s.replace(new RegExp("0{1," + opt + "}$"), ""); if (s.endsWith(".")) s = s.slice(0, -1); }
    if (thou) { const [i, d] = s.split("."); s = i.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (d !== undefined ? "." + d : ""); }
    if (x < 0 && /[1-9]/.test(s)) s = "-" + s;
    return s + (pct ? "%" : "");
  }

  // ---------------- normal inverse (Acklam)
  function normsinv(p) {
    if (p <= 0 || p >= 1) return E.NUM;
    const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
    const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
    const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
    const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
    const pl = 0.02425; let q, r;
    if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p <= 1 - pl) { q = p - 0.5; r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
    q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  function gammaln(x) {
    if (x <= 0) return E.NUM;
    const g = 7, cf = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - gammaln(1 - x);
    x -= 1; let a = cf[0]; const t = x + g + 0.5; for (let i = 1; i < 9; i++) a += cf[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }
  function rate(n, pmt, pv, fv, type, guess) {
    fv = fv || 0; type = type || 0; let r = guess === undefined ? 0.1 : guess;
    for (let i = 0; i < 100; i++) {
      let f, df;
      if (Math.abs(r) < 1e-10) { f = pv + pmt * n + fv; df = pmt * n * (n - 1) / 2 + pv * n; }
      else { const t = Math.pow(1 + r, n); f = pv * t + pmt * (1 + r * type) * (t - 1) / r + fv; df = n * pv * Math.pow(1 + r, n - 1) + pmt * (1 + r * type) * ((n * Math.pow(1 + r, n - 1) * r - (t - 1)) / (r * r)) + pmt * type * (t - 1) / r; }
      const nr = r - f / df; if (!isFinite(nr)) return E.NUM; if (Math.abs(nr - r) < 1e-10) return nr; r = nr;
    }
    return E.NUM;
  }

  // ---------------- workbook
  class Book {
    constructor(sheets) { this.sheets = sheets; this.over = {}; this.cache = new Map(); this.compiled = new Map(); this.stack = new Set(); }
    key(sh, r, c) { return sh + "!" + colName(c) + r; }
    raw(sh, addr) { const s = this.sheets[sh]; if (!s) return undefined; return s[addr]; }
    setInput(sh, addr, v) { const k = sh + "!" + addr; if (v === undefined) delete this.over[k]; else this.over[k] = v; this.cache.clear(); }
    cell(sh, r, c) {
      const addr = colName(c) + r, k = sh + "!" + addr;
      if (k in this.over) return this.over[k];
      if (this.cache.has(k)) return this.cache.get(k);
      const raw = this.raw(sh, addr);
      if (!raw) return null;
      if ("v" in raw) return raw.v;
      if (this.stack.has(k)) return E.REF;
      this.stack.add(k);
      let v;
      try { v = this.evalFormula(sh, raw.f); } catch (e) { v = E.NAME; if (G.ENGINE_DEBUG) console.error(k, raw.f, e); }
      this.stack.delete(k);
      if (v instanceof Range) v = this.deref(v);
      if (typeof v === "number" && !isFinite(v)) v = E.NUM;
      this.cache.set(k, v);
      return v;
    }
    get(sh, addr) { const a = parseAddr(addr); return this.cell(sh, a.r, a.c); }
    evalFormula(sh, f) { let ast = this.compiled.get(f); if (!ast) { ast = parse(f); this.compiled.set(f, ast); } return this.ev(ast, sh); }
    deref(v) { if (v instanceof Range) { if (v.r1 === v.r2 && v.c1 === v.c2) return this.cell(v.sh, v.r1, v.c1); return E.VALUE; } return v; }
    vals(v) { // flatten range or scalar
      if (v instanceof Range) { const out = []; for (let r = v.r1; r <= v.r2; r++) for (let c = v.c1; c <= v.c2; c++) out.push(this.cell(v.sh, r, c)); return out; }
      return [v];
    }
    ev(n, sh) {
      switch (n.k) {
        case "n": return n.v; case "s": return n.v; case "blank": return null;
        case "ref": { const s = n.sh || sh; const a = parseAddr(n.a); const b = n.b ? parseAddr(n.b) : a; return new Range(s, Math.min(a.r, b.r), Math.min(a.c, b.c), Math.max(a.r, b.r), Math.max(a.c, b.c)); }
        case "neg": { const v = num(this.deref(this.ev(n.x, sh))); return isErr(v) ? v : -v; }
        case "bin": return this.bin(n.o, this.deref(this.ev(n.l, sh)), this.deref(this.ev(n.r, sh)));
        case "fn": return this.fn(n.n, n.args, sh);
      }
    }
    bin(o, a, b) {
      if (isErr(a)) return a; if (isErr(b)) return b;
      if (o === "&") return str(a) + str(b);
      if ("+-*/^".includes(o)) {
        const x = num(a), y = num(b); if (isErr(x)) return x; if (isErr(y)) return y;
        switch (o) { case "+": return x + y; case "-": return x - y; case "*": return x * y; case "/": return y === 0 ? E.DIV : x / y; case "^": { const r = Math.pow(x, y); return isFinite(r) && !isNaN(r) ? r : E.NUM; } }
      }
      const c = compare(a, b);
      switch (o) { case "=": return c === 0; case "<>": return c !== 0; case "<": return c < 0; case ">": return c > 0; case "<=": return c <= 0; case ">=": return c >= 0; }
    }
    fn(name, args, sh) {
      const self = this;
      const A = (i) => self.ev(args[i], sh);                 // may be Range
      const V = (i) => args[i] === undefined ? undefined : self.deref(self.ev(args[i], sh));
      const N = (i) => num(V(i));
      const S = (i) => { const v = V(i); return isErr(v) ? v : str(v); };
      const nums = (from) => { const out = []; for (let i = from || 0; i < args.length; i++) { const a = A(i); if (a instanceof Range) { for (const v of self.vals(a)) { if (isErr(v)) return v; if (typeof v === "number") out.push(v); } } else { const v = self.deref(a); if (isErr(v)) return v; const x = num(v); if (isErr(x)) return x; out.push(x); } } return out; };
      const math1 = (f, chk) => { const x = N(0); if (isErr(x)) return x; if (chk && !chk(x)) return E.NUM; const r = f(x); return isFinite(r) ? r : E.NUM; };
      switch (name) {
        case "IF": { const c = V(0); if (isErr(c)) return c; const t = bool(c); if (isErr(t)) return t; return t ? (args.length > 1 ? this.ev(args[1], sh) : true) : (args.length > 2 ? this.ev(args[2], sh) : false); }
        case "IFERROR": { const v = V(0); return isErr(v) ? this.ev(args[1], sh) : v; }
        case "ISERROR": return isErr(V(0));
        case "ISNA": { const v = V(0); return isErr(v) && v.code === "#N/A"; }
        case "ISNUMBER": return typeof V(0) === "number";
        case "ISBLANK": return V(0) === null;
        case "AND": { for (let i = 0; i < args.length; i++) { const v = V(i); if (isErr(v)) return v; if (!bool(v)) return false; } return true; }
        case "OR": { for (let i = 0; i < args.length; i++) { const v = V(i); if (isErr(v)) return v; if (bool(v)) return true; } return false; }
        case "NOT": { const v = V(0); return isErr(v) ? v : !bool(v); }
        case "TRUE": return true; case "FALSE": return false;
        case "PI": return Math.PI;
        case "ABS": return math1(Math.abs);
        case "SQRT": return math1(Math.sqrt, x => x >= 0);
        case "LN": return math1(Math.log, x => x > 0);
        case "LOG10": return math1(Math.log10, x => x > 0);
        case "EXP": return math1(Math.exp);
        case "SIN": return math1(Math.sin); case "COS": return math1(Math.cos); case "TAN": return math1(Math.tan);
        case "ASIN": return math1(Math.asin, x => x >= -1 && x <= 1); case "ACOS": return math1(Math.acos, x => x >= -1 && x <= 1); case "ATAN": return math1(Math.atan);
        case "DEGREES": return math1(x => x * 180 / Math.PI); case "RADIANS": return math1(x => x * Math.PI / 180);
        case "GAMMALN": { const x = N(0); return isErr(x) ? x : gammaln(x); }
        case "NORMSINV": { const x = N(0); return isErr(x) ? x : normsinv(x); }
        case "ROUND": { const x = N(0), d = N(1); if (isErr(x)) return x; if (isErr(d)) return d; return roundHalfAway(x, d); }
        case "ROUNDUP": { const x = N(0), d = N(1); if (isErr(x)) return x; if (isErr(d)) return d; const f = Math.pow(10, d); return Math.sign(x) * Math.ceil(Math.abs(x) * f - 1e-9) / f; }
        case "ROUNDDOWN": { const x = N(0), d = N(1); if (isErr(x)) return x; const f = Math.pow(10, d); return Math.sign(x) * Math.floor(Math.abs(x) * f + 1e-9) / f; }
        case "CEILING": { const x = N(0), s = args.length > 1 ? N(1) : 1; if (isErr(x)) return x; if (isErr(s)) return s; if (s === 0) return 0; if (x > 0 && s < 0) return E.NUM; return Math.ceil(x / s - 1e-12) * s; }
        case "INT": { const x = N(0); return isErr(x) ? x : Math.floor(x); }
        case "N": { const v = V(0); return typeof v === "number" ? v : (typeof v === "boolean" ? +v : (isErr(v) ? v : 0)); }
        case "VALUE": { const v = V(0); return num(v); }
        case "MIN": { const a = nums(); if (isErr(a)) return a; return a.length ? Math.min(...a) : 0; }
        case "MAX": { const a = nums(); if (isErr(a)) return a; return a.length ? Math.max(...a) : 0; }
        case "SUM": { const a = nums(); if (isErr(a)) return a; return a.reduce((s, x) => s + x, 0); }
        case "AVERAGE": { const a = nums(); if (isErr(a)) return a; return a.length ? a.reduce((s, x) => s + x, 0) / a.length : E.DIV; }
        case "COUNT": { let c = 0; for (let i = 0; i < args.length; i++) for (const v of this.vals(A(i))) if (typeof v === "number") c++; return c; }
        case "COUNTIF": { const r = A(0), crit = V(1); const t = critFn(crit); let c = 0; for (const v of this.vals(r)) if (t(v)) c++; return c; }
        case "SUMIF": { const r = A(0), crit = V(1), sr = args.length > 2 ? A(2) : r; const t = critFn(crit); const a = this.vals(r), b = this.vals(sr); let s = 0; for (let i = 0; i < a.length; i++) if (t(a[i]) && typeof b[i] === "number") s += b[i]; return s; }
        case "INDEX": {
          const r = A(0); if (!(r instanceof Range)) return r;
          let ri = N(1), ci = args.length > 2 ? N(2) : 1; if (isErr(ri)) return ri; if (isErr(ci)) return ci;
          const rows = r.r2 - r.r1 + 1, cols = r.c2 - r.c1 + 1;
          if (args.length === 2 && rows === 1 && cols > 1) { ci = ri; ri = 1; }
          ri = Math.floor(ri); ci = Math.floor(ci);
          if (ri < 1 || ci < 1 || ri > rows || ci > cols) return E.REF;
          return this.cell(r.sh, r.r1 + ri - 1, r.c1 + ci - 1);
        }
        case "MATCH": {
          const v = V(0); if (isErr(v)) return v; const arr = this.vals(A(1)); const type = args.length > 2 ? N(2) : 1;
          if (type === 0) { for (let i = 0; i < arr.length; i++) { const x = arr[i]; if (x === null || isErr(x)) continue; if (typeof x === typeof v || (typeof v === "boolean")) { if (compare(x, v) === 0) return i + 1; } } return E.NA; }
          let idx = -1;
          for (let i = 0; i < arr.length; i++) { const x = arr[i]; if (x === null || isErr(x)) continue; if (typeof x !== typeof v) continue; const c = compare(x, v); if (type > 0) { if (c <= 0) idx = i; else break; } else { if (c >= 0) idx = i; else break; } }
          return idx < 0 ? E.NA : idx + 1;
        }
        case "OFFSET": { const r = A(0); if (!(r instanceof Range)) return E.VALUE; const dr = N(1), dc = N(2); if (isErr(dr)) return dr; if (isErr(dc)) return dc; const h = args.length > 3 ? N(3) : r.r2 - r.r1 + 1, w = args.length > 4 ? N(4) : r.c2 - r.c1 + 1; if (isErr(h)) return h; if (isErr(w)) return w; const r1 = r.r1 + dr, c1 = r.c1 + dc; if (r1 < 1 || c1 < 1 || h < 1 || w < 1) return E.REF; return new Range(r.sh, r1, c1, r1 + h - 1, c1 + w - 1); }
        case "TEXT": { const v = V(0); if (isErr(v)) return v; const f = S(1); const x = typeof v === "string" ? (isNaN(parseFloat(v)) ? v : parseFloat(v)) : v; return typeof x === "number" ? fmtNum(x, f) : str(x); }
        case "LEFT": { const s = S(0); if (isErr(s)) return s; const n = args.length > 1 ? N(1) : 1; return Array.from(s).slice(0, n).join(""); }
        case "RIGHT": { const s = S(0); if (isErr(s)) return s; const n = args.length > 1 ? N(1) : 1; const a = Array.from(s); return a.slice(Math.max(0, a.length - n)).join(""); }
        case "MID": { const s = S(0); if (isErr(s)) return s; const st = N(1), n = N(2); return Array.from(s).slice(st - 1, st - 1 + n).join(""); }
        case "LEN": { const s = S(0); return isErr(s) ? s : Array.from(s).length; }
        case "LOWER": { const s = S(0); return isErr(s) ? s : s.toLowerCase(); }
        case "UPPER": { const s = S(0); return isErr(s) ? s : s.toUpperCase(); }
        case "SEARCH": { const f = S(0), s = S(1); if (isErr(f)) return f; if (isErr(s)) return s; const i = s.toLowerCase().indexOf(f.toLowerCase()); return i < 0 ? E.VALUE : i + 1; }
        case "CONCAT": case "CONCATENATE": { let o = ""; for (let i = 0; i < args.length; i++) for (const v of this.vals(A(i))) { if (isErr(v)) return v; o += str(v); } return o; }
        case "TEXTJOIN": { const d = S(0), ig = bool(V(1)); const parts = []; for (let i = 2; i < args.length; i++) for (const v of this.vals(A(i))) { if (isErr(v)) return v; const s = str(v); if (ig && s === "") continue; parts.push(s); } return parts.join(d); }
        case "RATE": { const n = N(0), p = N(1), pv = N(2); const fv = args.length > 3 ? N(3) : 0; if ([n, p, pv, fv].some(isErr)) return E.VALUE; return rate(n, p, pv, fv); }
      }
      return E.NAME;
    }
  }
  function num(v) { if (isErr(v)) return v; if (v === null || v === undefined) return 0; if (typeof v === "number") return v; if (typeof v === "boolean") return v ? 1 : 0; const s = String(v).trim(); if (s === "") return E.VALUE; const x = Number(s); return isNaN(x) ? E.VALUE : x; }
  function str(v) { if (v === null || v === undefined) return ""; if (typeof v === "boolean") return v ? "TRUE" : "FALSE"; if (typeof v === "number") return general(v); return String(v); }
  function bool(v) { if (v === null) return false; if (typeof v === "boolean") return v; if (typeof v === "number") return v !== 0; if (typeof v === "string") { const u = v.toUpperCase(); if (u === "TRUE") return true; if (u === "FALSE") return false; return E.VALUE; } return false; }
  function rank(v) { return typeof v === "number" ? 0 : typeof v === "string" ? 1 : 2; }
  function compare(a, b) {
    if (a === null && b === null) return 0;
    if (a === null) a = typeof b === "string" ? "" : (typeof b === "boolean" ? false : 0);
    if (b === null) b = typeof a === "string" ? "" : (typeof a === "boolean" ? false : 0);
    const ra = rank(a), rb = rank(b); if (ra !== rb) return ra - rb;
    if (ra === 1) { const x = a.toLowerCase(), y = b.toLowerCase(); return x < y ? -1 : x > y ? 1 : 0; }
    const x = +a, y = +b; return x < y ? -1 : x > y ? 1 : 0;
  }
  function critFn(c) {
    if (typeof c === "number") return v => typeof v === "number" && v === c;
    let s = str(c), op = "=";
    const m = /^(<=|>=|<>|=|<|>)(.*)$/.exec(s); if (m) { op = m[1]; s = m[2]; }
    const n = Number(s);
    if (s !== "" && !isNaN(n) && op !== "=") return v => typeof v === "number" && ({ "<": v < n, ">": v > n, "<=": v <= n, ">=": v >= n, "<>": v !== n })[op];
    if (/[*?]/.test(s)) { const re = new RegExp("^" + s.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[\\s\\S]*").replace(/\?/g, ".") + "$", "i"); return v => { const t = typeof v === "string" ? v : ""; const r = re.test(t); return op === "<>" ? !r : r; }; }
    return v => { const r = (v === null ? "" : str(v)).toLowerCase() === s.toLowerCase(); return op === "<>" ? !r : r; };
  }
  G.XL = { Book, Range, XErr, isErr, fmtNum, parseAddr, colName, str };
})(typeof window !== "undefined" ? window : globalThis);
