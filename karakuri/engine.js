// からくりねじ：面を作る・遊びのきまり（画面と切り離した純粋な処理）。
// 面は「解ける外し方」を先に決めてから色を割り当てるので、必ず道具なしで解ける。
(function (root) {
  'use strict';
  const VERSION = 1;
  const BW = 360, BH = 460;           // 箱の中の広さ（論理座標）
  const SR = 15;                      // ねじの半径
  const TRAY = 5, SLOTS = 2, PER = 3; // 予備の穴・同時に並ぶ箱・箱に入る数

  // 色と紋（色だけでなく形でも見分ける）
  const COLORS = [
    { id: 'shu', name: '朱', hex: '#CF4630', mon: 'maru' },
    { id: 'ai', name: '藍', hex: '#2B5C8C', mon: 'hishi' },
    { id: 'yamabuki', name: '山吹', hex: '#E0A42A', mon: 'uroko' },
    { id: 'wakatake', name: '若竹', hex: '#3D9A6D', mon: 'kikko' },
    { id: 'fuji', name: '藤', hex: '#8D7BC2', mon: 'igeta' },
    { id: 'momo', name: '桃', hex: '#E58BA4', mon: 'sakura' },
    { id: 'sumi', name: '墨', hex: '#3A3634', mon: 'mitsuboshi' },
    { id: 'gofun', name: '胡粉', hex: '#EFEAE0', mon: 'kaku' }
  ];
  const MON = { maru: '丸', hishi: '菱', uroko: '鱗', kikko: '亀甲', igeta: '井桁', sakura: '桜', mitsuboshi: '三つ星', kaku: '角' };

  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  // 面の大きさ：面の番号で少しずつ難しく
  function paramsFor(n) {
    const k = Math.max(1, n);
    if (k > 30) {
      // 31面から先：面ごとに形を変える（板の数・錠・色・板の長さ）。10面ごとに少しやさしい「ひと息」の面
      const h = hashStr('shape-' + k), rest = k % 10 === 0, long = (h >> 9) % 3;
      return { plates: rest ? 9 + (h % 3) : 10 + (h % 6), colors: 6 + ((h >> 3) % 3), swaps: 0, win: 0, triple: 0.2 + ((h >> 5) % 4) * 0.1, locks: rest ? 1 : 1 + ((h >> 7) % 4),
        lenMin: [90, 110, 140][long], lenSpan: [90, 130, 120][long], band: rest ? [0.45, 0.92] : [0.12, 0.75] };
    }
    return { plates: Math.min(4 + Math.floor((k - 1) / 3), 15), colors: Math.min(3 + Math.floor((k - 1) / 8), 8), swaps: Math.min(4 + k * 2, 120), win: Math.min(4 + Math.floor(k / 3), 20), triple: Math.min(0.15 + k * 0.01, 0.5), locks: k < 6 ? 0 : k < 16 ? 1 : k < 40 ? 2 : 3, band: k <= 5 ? [0, 1] : k <= 15 ? [0.3, 0.97] : k <= 30 ? [0.3, 0.88] : [0.12, 0.75] };
  }

  // 点が板（回った長方形）の上か
  function onPlate(px, py, p, pad) {
    const c = Math.cos(-p.rot), s = Math.sin(-p.rot), dx = px - p.x, dy = py - p.y, lx = dx * c - dy * s, ly = dx * s + dy * c;
    return Math.abs(lx) <= p.len / 2 + pad && Math.abs(ly) <= p.th / 2 + pad;
  }

  function generate(seed, n) {
    const P = paramsFor(n);
    for (let attempt = 0; attempt < 120; attempt++) {
      const r = rng(seed + attempt * 7919), lv = tryGen(r, P);
      if (lv) { lv.seed = seed; lv.n = n; return lv; }
    }
    return null;
  }
  function tryGen(r, P) {
    const plates = [], screws = [], ROTS = [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4, Math.PI / 6, -Math.PI / 6, Math.PI / 3, -Math.PI / 3];
    for (let i = 0; i < P.plates; i++) {
      let placed = false;
      for (let t = 0; t < 80 && !placed; t++) {
        const len = (P.lenMin || 110) + Math.floor(r() * (P.lenSpan || 130)), th = 46, rot = ROTS[Math.floor(r() * ROTS.length)];
        const x = 50 + r() * (BW - 100), y = 50 + r() * (BH - 100);
        const three = r() < P.triple && len > 170, offs = three ? [-(len / 2 - 22), 0, len / 2 - 22] : [-(len / 2 - 22), len / 2 - 22];
        const pts = offs.map((o) => [x + Math.cos(rot) * o, y + Math.sin(rot) * o]);
        if (!pts.every(([px, py]) => px > SR + 8 && px < BW - SR - 8 && py > SR + 8 && py < BH - SR - 8)) continue;
        if (!pts.every(([px, py]) => screws.every((s) => Math.hypot(s.x - px, s.y - py) > 36))) continue;
        const pid = plates.length;
        plates.push({ id: pid, x, y, len, th, rot, wood: Math.floor(r() * 4) });
        pts.forEach(([px, py]) => screws.push({ id: screws.length, x: px, y: py, plate: pid, color: -1 }));
        placed = true;
      }
    }
    if (plates.length < Math.max(3, P.plates - 2)) return null;
    // ねじの数を3の倍数に（足りない分は、真ん中にねじを足せる板に足す）
    let need = (3 - (screws.length % 3)) % 3;
    for (const p of plates) {
      if (!need) break; if (screws.some((s) => s.plate === p.id && Math.hypot(s.x - p.x, s.y - p.y) < 5)) continue;
      if (screws.every((s) => Math.hypot(s.x - p.x, s.y - p.y) > 36) && p.len > 140) { screws.push({ id: screws.length, x: p.x, y: p.y, plate: p.id, color: -1 }); need--; }
    }
    if (screws.length % 3) return null;
    // 解ける外し方を1つ決める
    const lv = { plates, screws, colors: P.colors };
    const order = [], st = { removed: new Uint8Array(screws.length), fallen: new Uint8Array(plates.length) };
    while (order.length < screws.length) {
      const can = screws.filter((s) => !st.removed[s.id] && !covered(lv, st, s.id)).map((s) => s.id);
      if (!can.length) return null;
      const id = can[Math.floor(r() * can.length)]; order.push(id); st.removed[id] = 1; dropPlates(lv, st);
    }
    // 色を決める：色ごとに3の倍数。箱の順は自由に混ぜ、解き手で「解ける」ことを確かめる
    const G = screws.length / 3, boxes = [];
    for (let g = 0; g < G; g++) boxes.push(g < P.colors ? g : Math.floor(r() * P.colors));
    const pool = []; boxes.forEach((c) => pool.push(c, c, c));
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    screws.forEach((sc, i) => { sc.color = pool[i]; });
    const gcol = boxes.slice(); for (let i = gcol.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [gcol[i], gcol[j]] = [gcol[j], gcol[i]]; }
    lv.queue = gcol;
    const sol = solve(lv, 40000); if (!sol) return null;
    order.length = 0; sol.forEach((id) => order.push(id));
    const peak = simulate(lv, gcol, order);
    if (peak < 0) return null;
    // からくりの錠：決めた外し方で、その板の最初のねじより前に「満杯になった箱」の紋でだけ開く
    const doneAt = [], g0 = newState(lv, gcol), seen = new Set();
    order.forEach((id) => { doneAt.push(new Set(seen)); const ev = applyColor(g0, screws[id].color); ev.filled.forEach((f) => seen.add(f.color)); });
    const cand = plates.filter((p) => { const fi = order.findIndex((id) => screws[id].plate === p.id); return fi > 0 && doneAt[fi].size > 0; });
    for (let k = 0; k < P.locks && cand.length; k++) {
      const p = cand.splice(Math.floor(r() * cand.length), 1)[0], fi = order.findIndex((id) => screws[id].plate === p.id), opts = [...doneAt[fi]];
      p.lock = opts[Math.floor(r() * opts.length)];
    } lv.order = order; lv.peak = peak; lv.total = screws.length;
    // 手ごたえ：同じ色の箱があればそこへ入れる、という素直な遊び方で何割解けるか
    lv.ease = greedyRate(lv, 60, r);
    const [lo, hi] = P.band; if (lv.ease < lo || lv.ease > hi) return null;
    return lv;
  }
  function covered(lv, st, sid) {
    const s = lv.screws[sid], z = s.plate;
    for (let q = z + 1; q < lv.plates.length; q++) if (!st.fallen[q] && onPlate(s.x, s.y, lv.plates[q], SR * 0.55)) return true;
    return false;
  }
  function dropPlates(lv, st) {
    const out = [];
    lv.plates.forEach((p) => { if (!st.fallen[p.id] && lv.screws.every((s) => s.plate !== p.id || st.removed[s.id])) { st.fallen[p.id] = 1; out.push(p.id); } });
    return out;
  }
  // 解き手：深さ優先＋同じ形の局面は2回見ない。解けたら外す順を返す（錠は考えない＝錠はあとで解ける順に合わせて付ける）
  function solve(lv, limit) {
    const seen = new Set(), path = []; let nodes = 0;
    const g = newState(lv);
    const key = () => { let k = ''; for (const x of g.removed) k += x; return k + '|' + g.next + '|' + g.boxes.map((b) => (b ? b.color + ':' + b.n : '-')).join(',') + '|' + g.tray.slice().sort().join(''); };
    function dfs() {
      if (g.removed.every((x) => x)) return g.tray.length === 0;
      if (++nodes > limit) return false;
      const k = key(); if (seen.has(k)) return false; seen.add(k);
      const can = lv.screws.filter((s) => !g.removed[s.id] && !covered(lv, g, s.id));
      can.sort((a, b) => (g.boxes.some((x) => x && x.color === b.color && x.n < PER) ? 1 : 0) - (g.boxes.some((x) => x && x.color === a.color && x.n < PER) ? 1 : 0));
      const tried = new Set();
      for (const s of can) {
        const toBox = g.boxes.some((x) => x && x.color === s.color && x.n < PER);
        if (!toBox && g.tray.length >= TRAY) continue;
        const sig = s.color + ':' + toBox; if (toBox && tried.has('b' + s.color) && false) continue; tried.add(sig);
        const snap = snapshot(g); applyColor(g, s.color); g.removed[s.id] = 1; dropPlates(lv, g); path.push(s.id);
        if (dfs()) return true;
        path.pop(); restore(g, snap);
      }
      return false;
    }
    return dfs() ? path.slice() : null;
  }
  function greedyRate(lv, tries, r) {
    let win = 0;
    for (let t = 0; t < tries; t++) {
      const g = newState(lv); let ok = false;
      for (let step = 0; step < 400; step++) {
        const can = lv.screws.filter((s) => canTake(lv, g, s.id)); if (!can.length) break;
        const m = can.filter((s) => g.boxes.some((b) => b && b.color === s.color && b.n < PER)); const pick = m.length ? m : can;
        const ev = take(lv, g, pick[Math.floor(r() * pick.length)].id); if (ev.full || ev.stuck) break; if (ev.win) { ok = true; break; }
      }
      if (ok) win++;
    }
    return win / tries;
  }
  // 決めた外し方で遊んだときの、予備の穴の最大（失敗なら -1）
  function simulate(lv, queue, order) {
    const g = newState(lv, queue); let peak = 0;
    for (const id of order) { const ev = applyColor(g, lv.screws[id].color); if (ev.fail) return -1; peak = Math.max(peak, g.tray.length); }
    return g.tray.length ? -1 : peak;
  }

  // ---- 遊びの状態 ----
  function newState(lv, queue) {
    const q = queue || lv.queue;
    return { removed: new Uint8Array(lv.screws.length), fallen: new Uint8Array(lv.plates.length), next: Math.min(SLOTS, q.length), boxes: [0, 1].map((i) => (i < q.length ? { color: q[i], n: 0, qi: i } : null)), tray: [], queue: q, moves: 0, done: {} };
  }
  // 色を1本入れる（箱か予備の穴へ）。箱が満杯になったら次の箱、予備の穴から移す。
  function applyColor(g, color) {
    const ev = { to: null, filled: [], moved: [] };
    const bi = g.boxes.findIndex((b) => b && b.color === color && b.n < PER);
    if (bi >= 0) { g.boxes[bi].n++; ev.to = { box: bi, qi: g.boxes[bi].qi }; }
    else { if (g.tray.length >= TRAY) { ev.fail = true; return ev; } g.tray.push(color); ev.to = { tray: g.tray.length - 1 }; }
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < SLOTS; i++) {
        const b = g.boxes[i];
        if (b && b.n >= PER) { ev.filled.push({ slot: i, color: b.color, qi: b.qi }); g.done[b.color] = (g.done[b.color] || 0) + 1; g.boxes[i] = g.next < g.queue.length ? { color: g.queue[g.next], n: 0, qi: g.next++ } : null; changed = true; }
        const nb = g.boxes[i];
        if (nb && nb.n < PER) { for (let t = 0; t < g.tray.length && nb.n < PER; t++) { if (g.tray[t] === nb.color) { g.tray.splice(t, 1); t--; nb.n++; ev.moved.push({ slot: i, color: nb.color, qi: nb.qi }); changed = true; } } }
      }
    }
    return ev;
  }
  function locked(lv, g, sid) { const p = lv.plates[lv.screws[sid].plate]; return p.lock !== undefined && !g.done[p.lock]; }
  function canTake(lv, g, sid) { return !g.removed[sid] && !covered(lv, g, sid) && !locked(lv, g, sid); }
  function take(lv, g, sid) {
    if (!g.removed[sid] && !covered(lv, g, sid) && locked(lv, g, sid)) return { locked: lv.plates[lv.screws[sid].plate].lock };
    if (!canTake(lv, g, sid)) return { blocked: true };
    if (g.tray.length >= TRAY && !g.boxes.some((b) => b && b.color === lv.screws[sid].color && b.n < PER)) return { full: true };
    const ev = applyColor(g, lv.screws[sid].color); g.removed[sid] = 1; g.moves++;
    ev.dropped = dropPlates(lv, g);
    ev.win = g.removed.every((x) => x) && g.tray.length === 0;
    ev.stuck = !ev.win && g.tray.length >= TRAY && !lv.screws.some((s) => canTake(lv, g, s.id) && g.boxes.some((b) => b && b.color === s.color && b.n < PER));
    return ev;
  }
  function snapshot(g) { return { removed: g.removed.slice(), fallen: g.fallen.slice(), next: g.next, boxes: g.boxes.map((b) => (b ? { color: b.color, n: b.n, qi: b.qi } : null)), tray: g.tray.slice(), moves: g.moves, done: Object.assign({}, g.done) }; }
  function restore(g, s) { g.removed = s.removed.slice(); g.fallen = s.fallen.slice(); g.next = s.next; g.boxes = s.boxes.map((b) => (b ? { color: b.color, n: b.n, qi: b.qi } : null)); g.tray = s.tray.slice(); g.moves = s.moves; g.done = Object.assign({}, s.done); }

  function level(n) { return generate(hashStr('karakuri-v' + VERSION + '-' + n), n); }
  function daily(dateKey) { const lv = generate(hashStr('karakuri-daily-v' + VERSION + '-' + dateKey), 18); return lv; }

  root.KarakuriEngine = { VERSION, BW, BH, SR, TRAY, SLOTS, PER, COLORS, MON, rng, hashStr, paramsFor, generate, level, daily, newState, solve, take, canTake, covered, locked, snapshot, restore, onPlate, simulate };
})(typeof window !== 'undefined' ? window : globalThis);
