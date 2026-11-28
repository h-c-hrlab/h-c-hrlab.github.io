// てぬぐい染め：文様のマスと絵から、数字の塗り絵をつくる（ラスター方式）。
// 同じ入力からは必ず同じ塗り絵ができる（進み具合の保存はマスの番号に依存するため、変えるときは VERSION を上げる）。
(function (root) {
  'use strict';
  const VERSION = 1;
  const W = 720, H = 960;

  // 色（伝統色の名前に、自分で決めた目安の色）
  const C = {
    ai: ['藍色', 'あいいろ', '#24496B'], kon: ['紺', 'こん', '#1E2B45'], asagi: ['浅葱色', 'あさぎいろ', '#3B98AB'], sora: ['空色', 'そらいろ', '#94C2DA'],
    shiraai: ['白藍', 'しらあい', '#CFE3E5'], kinari: ['生成り', 'きなり', '#F0E7D5'], gofun: ['胡粉', 'ごふん', '#F8F5EC'], akane: ['茜色', 'あかねいろ', '#A6343B'],
    shu: ['朱色', 'しゅいろ', '#D85A2E'], kobai: ['紅梅色', 'こうばいいろ', '#DE7B8E'], sakura: ['桜色', 'さくらいろ', '#F3D0D3'], yamabuki: ['山吹色', 'やまぶきいろ', '#E7A62A'],
    kaki: ['柿色', 'かきいろ', '#D9692B'], moegi: ['萌黄', 'もえぎ', '#9BB84B'], wakatake: ['若竹色', 'わかたけいろ', '#5EA483'], tokiwa: ['常磐色', 'ときわいろ', '#2E6A50'],
    kuri: ['栗色', 'くりいろ', '#6A3B27'], sumi: ['墨', 'すみ', '#2A2725'], nezumi: ['鼠色', 'ねずみいろ', '#8B8781'], fuji: ['藤色', 'ふじいろ', '#AA9BC9'],
    shion: ['紫苑色', 'しおんいろ', '#7B6B9F'], kogane: ['黄金', 'こがね', '#E3BA4C'], geppaku: ['月白', 'げっぱく', '#ECEFE3'], kurenai: ['紅', 'くれない', '#C23447'],
    usuzumi: ['薄墨', 'うすずみ', '#A3A09A'], tobi: ['鳶色', 'とびいろ', '#8F4B33']
  };

  // 文様：座標 → マスの鍵（数）。s はマスの大きさ。
  const SQ3 = Math.sqrt(3);
  const PATTERNS = {
    asanoha: { name: '麻の葉', yomi: 'あさのは', key(x, y, s) {
      const h = s * SQ3 / 2, b = y / h, a = x / s - b / 2, i = Math.floor(a), j = Math.floor(b), fa = a - i, fb = b - j;
      let t, l0, l1, l2;
      if (fa + fb < 1) { t = 0; l0 = 1 - fa - fb; l1 = fa; l2 = fb; } else { t = 1; l0 = fa + fb - 1; l1 = 1 - fa; l2 = 1 - fb; }
      const k = l0 <= l1 && l0 <= l2 ? 0 : l1 <= l2 ? 1 : 2;
      return (((i + 2000) * 4000 + (j + 2000)) * 2 + t) * 3 + k;
    } },
    seigaiha: { name: '青海波', yomi: 'せいがいは', key(x, y, s) {
      const R = s, dy = R / 2;
      for (let k = Math.floor((y + R) / dy); k >= Math.ceil((y - R) / dy); k--) {
        const off = (k & 1) ? R : 0, c = Math.round((x - off) / (2 * R)), cx = c * 2 * R + off, cy = k * dy, d = Math.hypot(x - cx, y - cy);
        if (d < R) { const ring = Math.min(2, Math.floor(d / (R / 3))); return (((k + 2000) * 4000 + (c + 2000)) * 3 + ring); }
      }
      return 0;
    } },
    shippo: { name: '七宝', yomi: 'しっぽう', key(x, y, s) {
      const a = s, r = a / Math.SQRT2, i = Math.floor(x / a), j = Math.floor(y / a), hit = [];
      for (const [di, dj] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const cx = (i + di) * a, cy = (j + dj) * a; if (Math.hypot(x - cx, y - cy) < r) hit.push((i + di + 2000) * 4000 + (j + dj + 2000)); }
      if (hit.length === 1) return hit[0] * 2;
      hit.sort((p, q) => p - q);
      return (hit[0] * 16000000 + hit[1]) * 2 + 1;
    } }
  };
  const SIZES = { zakkuri: { name: 'ざっくり', s: { asanoha: 100, seigaiha: 72, shippo: 72 } }, komakai: { name: 'こまかい', s: { asanoha: 72, seigaiha: 50, shippo: 50 } } };

  // 絵：図形で描く。色は C の名前で。
  function poly(g, pts) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); }
  function circ(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  function ell(g, x, y, rx, ry, rot) { g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); g.fill(); }
  function rect(g, x, y, w, h) { g.fillRect(x, y, w, h); }
  function stroke(g, w, pts) { g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.stroke(); }
  const SCENES = [
    { id: 'fuji', name: '富士と朝日', draw(g, f) {
      f('sora'); rect(g, 0, 0, W, 420); f('shiraai'); rect(g, 0, 420, W, 200);
      f('shu'); circ(g, 520, 230, 95);
      f('ai'); poly(g, [-40, 760, 360, 250, 760, 760]);
      f('gofun'); poly(g, [360, 250, 268, 368, 310, 350, 345, 392, 380, 352, 420, 380, 452, 368]);
      f('asagi'); rect(g, 0, 700, W, 120); f('kon'); rect(g, 0, 820, W, 140);
    } },
    { id: 'kingyo', name: '金魚', draw(g, f) {
      f('shiraai'); rect(g, 0, 0, W, H); f('sora'); rect(g, 0, 620, W, 340);
      f('wakatake'); poly(g, [60, 960, 120, 560, 170, 960]); poly(g, [600, 960, 650, 640, 700, 960]);
      f('kurenai'); ell(g, 330, 420, 175, 120, -0.2); poly(g, [470, 380, 660, 230, 600, 430, 680, 600]);
      f('gofun'); circ(g, 235, 390, 30); f('sumi'); circ(g, 228, 392, 15);
      f('gofun'); circ(g, 170, 220, 22); circ(g, 130, 130, 16); circ(g, 175, 60, 12);
    } },
    { id: 'ume', name: '紅梅', draw(g, f) {
      f('kinari'); rect(g, 0, 0, W, H);
      g.strokeStyle = f('kuri'); stroke(g, 44, [-20, 860, 260, 640, 330, 380, 560, 120]); stroke(g, 30, [300, 560, 600, 520, 760, 420]);
      f('kobai'); for (const [x, y] of [[430, 230], [210, 460], [560, 470], [380, 650], [620, 300], [160, 760]]) { for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5; circ(g, x + Math.cos(a) * 48, y + Math.sin(a) * 48, 40); } }
      f('yamabuki'); for (const [x, y] of [[430, 230], [210, 460], [560, 470], [380, 650], [620, 300], [160, 760]]) circ(g, x, y, 24);
    } },
    { id: 'tsuki', name: '月とすすき', draw(g, f) {
      f('kon'); rect(g, 0, 0, W, H); f('ai'); rect(g, 0, 520, W, 440);
      f('kogane'); circ(g, 440, 270, 150);
      g.strokeStyle = f('yamabuki'); for (const [x, b] of [[110, -60], [220, 50], [330, -30], [560, 40], [650, -50]]) stroke(g, 26, [x, 960, x + b * 0.5, 640, x + b, 420]);
      f('tobi'); rect(g, 0, 860, W, 100);
    } },
    { id: 'fune', name: '夕焼けの帆かけ舟', draw(g, f) {
      f('yamabuki'); rect(g, 0, 0, W, 260); f('kaki'); rect(g, 0, 260, W, 200); f('akane'); rect(g, 0, 460, W, 140);
      f('shu'); circ(g, 200, 600, 110);
      f('ai'); rect(g, 0, 600, W, 360);
      f('gofun'); poly(g, [380, 250, 380, 640, 600, 640]); f('kinari'); poly(g, [370, 300, 370, 640, 210, 640]);
      f('kuri'); poly(g, [180, 660, 640, 660, 580, 740, 240, 740]);
    } },
    { id: 'daruma', name: 'だるま', draw(g, f) {
      f('kinari'); rect(g, 0, 0, W, H); f('kogane'); rect(g, 0, 760, W, 200);
      f('kurenai'); ell(g, 360, 500, 250, 300);
      f('gofun'); ell(g, 360, 420, 150, 130);
      f('sumi'); circ(g, 300, 410, 36); circ(g, 420, 410, 36); poly(g, [250, 330, 330, 350, 330, 370, 250, 352]); poly(g, [470, 330, 390, 350, 390, 370, 470, 352]);
      f('kogane'); poly(g, [270, 640, 450, 640, 420, 720, 300, 720]);
    } },
    { id: 'tsubaki', name: '椿', draw(g, f) {
      f('shiraai'); rect(g, 0, 0, W, H);
      f('tokiwa'); ell(g, 170, 700, 170, 80, -0.7); ell(g, 560, 760, 170, 80, 0.6); ell(g, 600, 260, 140, 70, -0.5);
      f('kurenai'); for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5 - Math.PI / 2; circ(g, 360 + Math.cos(a) * 120, 470 + Math.sin(a) * 120, 120); }
      f('yamabuki'); circ(g, 360, 470, 70); f('kogane'); circ(g, 360, 470, 30);
    } },
    { id: 'kaki', name: '柿', draw(g, f) {
      f('sora'); rect(g, 0, 0, W, H);
      g.strokeStyle = f('kuri'); stroke(g, 34, [0, 160, 300, 220, 720, 120]); stroke(g, 20, [300, 220, 330, 380]);
      f('kaki'); ell(g, 330, 500, 170, 140); ell(g, 590, 360, 110, 95);
      f('tokiwa'); poly(g, [270, 380, 330, 340, 390, 380, 330, 410]); poly(g, [550, 270, 590, 240, 630, 270, 590, 295]);
      f('moegi'); ell(g, 150, 330, 120, 50, 0.5); ell(g, 470, 140, 110, 45, -0.3);
    } },
    { id: 'sakura', name: '桜と川', draw(g, f) {
      f('geppaku'); rect(g, 0, 0, W, H); f('moegi'); rect(g, 0, 560, W, 400);
      f('asagi'); poly(g, [0, 700, 720, 600, 720, 760, 0, 900]);
      g.strokeStyle = f('kuri'); stroke(g, 40, [120, 960, 160, 520, 120, 300]); stroke(g, 24, [150, 560, 420, 330]);
      f('sakura'); for (const [x, y, r] of [[160, 220, 150], [360, 250, 130], [520, 180, 120], [460, 380, 110], [80, 420, 110]]) circ(g, x, y, r);
      f('kobai'); for (const [x, y] of [[200, 180], [380, 300], [520, 160], [110, 420]]) circ(g, x, y, 40);
    } },
    { id: 'koi', name: '鯉のぼり', draw(g, f) {
      f('sora'); rect(g, 0, 0, W, H); f('gofun'); ell(g, 560, 820, 220, 90); ell(g, 140, 140, 150, 60);
      f('kuri'); rect(g, 60, 80, 34, 880); f('kogane'); circ(g, 77, 70, 32);
      function koi(y, c) { f(c); poly(g, [100, y - 60, 520, y - 60, 600, y - 110, 560, y, 600, y + 110, 520, y + 60, 100, y + 60]); f('gofun'); circ(g, 170, y - 5, 30); f('sumi'); circ(g, 170, y - 5, 14); }
      koi(230, 'sumi'); koi(450, 'kurenai'); koi(670, 'ai');
    } }
  ];

  // 塗り絵をつくる
  function build(patternId, sceneId, sizeId) {
    const P = PATTERNS[patternId], sc = SCENES.find((x) => x.id === sceneId), s = SIZES[sizeId].s[patternId];
    const N = W * H, idmap = new Int32Array(N), keys = new Map();
    let n = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const kk = P.key(x + 0.5 - (W % s) / 2, y + 0.5, s); let id = keys.get(kk);
      if (id === undefined) { id = n++; keys.set(kk, id); }
      idmap[y * W + x] = id;
    }
    // 絵を描いて、マスごとに一番多い色を選ぶ
    const cv = mkCanvas(W, H), g = cv.getContext('2d'), used = [];
    const f = (name) => { let i = used.indexOf(name); if (i < 0) { used.push(name); } g.fillStyle = C[name][2]; return C[name][2]; };
    sc.draw(g, f);
    const img = g.getImageData(0, 0, W, H).data, K = used.length, rgb = used.map((nm) => hex(C[nm][2]));
    const votes = new Int32Array(n * K), size = new Int32Array(n);
    for (let p = 0; p < N; p++) {
      const r = img[p * 4], gg = img[p * 4 + 1], b = img[p * 4 + 2]; let best = 0, bd = 1e9;
      for (let k = 0; k < K; k++) { const d = (r - rgb[k][0]) ** 2 + (gg - rgb[k][1]) ** 2 + (b - rgb[k][2]) ** 2; if (d < bd) { bd = d; best = k; } }
      votes[idmap[p] * K + best]++; size[idmap[p]]++;
    }
    const cellColor = new Int32Array(n);
    for (let c = 0; c < n; c++) { let best = 0; for (let k = 1; k < K; k++) if (votes[c * K + k] > votes[c * K + best]) best = k; cellColor[c] = best; }
    // 境目からの距離（数字を置く場所と大きさ）
    const dist = new Float32Array(N);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p = y * W + x, id = idmap[p];
      const edge = x === 0 || y === 0 || x === W - 1 || y === H - 1 || idmap[p - 1] !== id || idmap[p + 1] !== id || idmap[p - W] !== id || idmap[p + W] !== id;
      dist[p] = edge ? 0 : 1e6;
    }
    for (let y = 1; y < H; y++) for (let x = 1; x < W - 1; x++) { const p = y * W + x; dist[p] = Math.min(dist[p], dist[p - 1] + 1, dist[p - W] + 1, dist[p - W - 1] + 1.414, dist[p - W + 1] + 1.414); }
    for (let y = H - 2; y >= 0; y--) for (let x = W - 2; x >= 1; x--) { const p = y * W + x; dist[p] = Math.min(dist[p], dist[p + 1] + 1, dist[p + W] + 1, dist[p + W + 1] + 1.414, dist[p + W - 1] + 1.414); }
    const lx = new Int32Array(n), ly = new Int32Array(n), lr = new Float32Array(n);
    for (let p = 0; p < N; p++) { const c = idmap[p]; if (dist[p] > lr[c]) { lr[c] = dist[p]; lx[c] = p % W; ly[c] = (p / W) | 0; } }
    // 小さすぎるマスは、最初から塗っておく
    const MIN_R = 5, pre = new Uint8Array(n);
    for (let c = 0; c < n; c++) if (lr[c] < MIN_R || size[c] < 60) pre[c] = 1;
    // 番号：使われている色だけ、明るい順に 1,2,3…
    const count = new Int32Array(K); for (let c = 0; c < n; c++) if (!pre[c]) count[cellColor[c]]++;
    const order = [...Array(K).keys()].filter((k) => count[k] > 0).sort((a, b) => lum(rgb[b]) - lum(rgb[a]));
    const colors = order.map((k) => ({ key: used[k], name: C[used[k]][0], yomi: C[used[k]][1], hex: C[used[k]][2], count: count[k] }));
    const num = new Int32Array(n).fill(-1); for (let c = 0; c < n; c++) num[c] = order.indexOf(cellColor[c]);
    // 色だけ決まっていて番号のないマス（全部が小さいマスの色）
    const fixedHex = used.map((u) => C[u][2]);
    // マスごとの画素の一覧
    const start = new Int32Array(n + 1); for (let p = 0; p < N; p++) start[idmap[p] + 1]++;
    for (let c = 0; c < n; c++) start[c + 1] += start[c];
    const pix = new Int32Array(N), fill = start.slice(0, n); for (let p = 0; p < N; p++) pix[fill[idmap[p]]++] = p;
    const line = new Uint8Array(N); for (let p = 0; p < N; p++) if (dist[p] < 1.0) line[p] = 1;
    const bx0 = new Int32Array(n).fill(W), by0 = new Int32Array(n).fill(H), bx1 = new Int32Array(n), by1 = new Int32Array(n);
    for (let p = 0; p < N; p++) { const c = idmap[p], x = p % W, y = (p / W) | 0; if (x < bx0[c]) bx0[c] = x; if (x > bx1[c]) bx1[c] = x; if (y < by0[c]) by0[c] = y; if (y > by1[c]) by1[c] = y; }
    const playable = []; for (let c = 0; c < n; c++) if (!pre[c]) playable.push(c);
    return { W, H, n, idmap, start, pix, line, num, pre, colors, cellHex: Array.from(cellColor, (k) => fixedHex[k]), lx, ly, lr, bx0, by0, bx1, by1, playable, scene: sc, pattern: P, sizeId, total: playable.length };
  }
  function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function lum(c) { return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]; }
  function mkCanvas(w, h) { if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h); const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  root.SomeEngine = { VERSION, W, H, C, PATTERNS, SIZES, SCENES, build, hex, lum };
})(typeof window !== 'undefined' ? window : globalThis);
