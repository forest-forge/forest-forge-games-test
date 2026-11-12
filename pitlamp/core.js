/* Pitlamp core (Forest Forge): room designer, physics and route solver. Shared by the
 * game and the QA tools so the rooms the game plays are the rooms the solver checked.
 * Rooms are generated from fixed seeds by an original designer; no copied layouts. */
(function (root) {
  "use strict";
  var COLS = 32, ROWS = 16, T = 8, HW = 7, HH = 16, FATAL = 44;
  var JT = [-3, -3, -2, -2, -2, -2, -2, -1, -1, -1, -1, -1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2];
  var NAMES = ["The Lamp Room", "Tally Office", "Pasty Larder", "Pit Pony Stables", "Coal Drop", "Engine House", "The Tin Mill", "Clay Pit Shuffle", "Brass Band Hall", "Flooded Level",
    "Winding Gear", "Slate Stairs", "Chapel Gallery", "Gas Pocket", "Fool's Gold Seam", "Pigeon Loft", "Tea Hut at Midnight", "The Deep Adit", "Bell Pit", "Up to Daylight"];
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function isFloor(c) { return c === "=" || c === "~" || c === "<" || c === ">" || c === "W"; }
  function at(room, tx, ty) { if (tx < 0 || tx >= COLS) return "W"; if (ty < 0) return "W"; if (ty >= ROWS) return " "; return room.g[ty][tx]; }
  function supported(room, x, y) { if (y % T !== 0) return false; var ty = y / T; return isFloor(at(room, Math.floor(x / T), ty)) || isFloor(at(room, Math.floor((x + HW - 1) / T), ty)); }
  function wallHit(room, x, y) { var x0 = Math.floor(x / T), x1 = Math.floor((x + HW - 1) / T), y0 = Math.floor((y - HH) / T), y1 = Math.floor((y - 1) / T); for (var ty = y0; ty <= y1; ty++) if (at(room, x0, ty) === "W" || at(room, x1, ty) === "W") return true; return false; }
  function overlaps(room, x, y, ch, inset) { inset = inset || 0; var x0 = Math.floor((x + inset) / T), x1 = Math.floor((x + HW - 1 - inset) / T), y0 = Math.floor((y - HH + inset) / T), y1 = Math.floor((y - 1 - inset) / T), out = []; for (var ty = y0; ty <= y1; ty++) for (var tx = x0; tx <= x1; tx++) if (at(room, tx, ty) === ch) out.push([tx, ty]); return out; }
  function conveyor(room, x, y) { var c = at(room, Math.floor((x + 3) / T), y / T); return c === "<" ? -1 : c === ">" ? 1 : 0; }
  // one frame. s = {x, y, m: 0 ground | 1 jump | 2 fall, j, d, top}. inp = {dx: -1|0|1, jump: bool}. Returns new state or {dead: why}.
  function step(room, s, inp) {
    var n = { x: s.x, y: s.y, m: s.m, j: s.j, d: s.d, top: s.top };
    if (n.m === 0) {
      if (!supported(room, n.x, n.y)) { n.m = 2; n.top = n.y; }
      else if (inp.jump) { n.m = 1; n.j = 0; n.d = inp.dx; n.top = n.y; }
      else { var c = conveyor(room, n.x, n.y), dx = inp.dx; if (c) dx = dx === -c ? 0 : c; if (dx && !wallHit(room, n.x + dx, n.y)) n.x += dx; return n; }
    }
    if (n.m === 1) {
      var dy = n.j < JT.length ? JT[n.j] : 3; n.j++;
      if (n.d && !wallHit(room, n.x + n.d, n.y)) n.x += n.d; else n.d = 0;
      if (dy < 0) { for (var k = 0; k < -dy; k++) { if (wallHit(room, n.x, n.y - 1)) { n.m = 2; n.top = n.y; break; } n.y--; } if (n.y < n.top) n.top = n.y; return n; }
      for (var k2 = 0; k2 < dy; k2++) { n.y++; if (supported(room, n.x, n.y)) { n.m = 0; return n.y - n.top > FATAL ? { dead: "fall" } : n; } }
      if (n.y > ROWS * T + HH) return { dead: "fall" };
      return n;
    }
    // falling straight down
    for (var k3 = 0; k3 < 2; k3++) { n.y++; if (supported(room, n.x, n.y)) { n.m = 0; return n.y - n.top > FATAL ? { dead: "fall" } : n; } }
    if (n.y > ROWS * T + HH) return { dead: "fall" };
    return n;
  }
  function keyOf(s) { return s.m === 0 ? s.x + 256 * s.y : s.m === 1 ? 100000 + (s.x + 256 * s.y) * 200 + Math.min(s.j, 60) * 3 + (s.d + 1) : 9000000000 + (s.x + 256 * s.y) * 64 + Math.min(63, s.y - s.top); }
  var INPUTS = [{ dx: 0, jump: false }, { dx: -1, jump: false }, { dx: 1, jump: false }, { dx: 0, jump: true }, { dx: -1, jump: true }, { dx: 1, jump: true }];
  // BFS. goal(state) -> bool. Returns {path: [input index per frame], end: state} or null. visit(state) is called for every reachable state.
  function search(room, start, goal, visit, limit) {
    var q = [start], seen = new Map(); seen.set(keyOf(start), null); var qi = 0, prev = new Map();
    while (qi < q.length) {
      var s = q[qi++]; if (visit) visit(s); if (goal && goal(s)) { var path = [], k = keyOf(s); while (prev.has(k)) { var p = prev.get(k); path.push(p[1]); k = p[0]; } return { path: path.reverse(), end: s }; }
      if (limit && qi > limit) break;
      var ins = s.m === 0 ? [0, 1, 2, 3, 4, 5] : [0];
      for (var i = 0; i < ins.length; i++) { var n = step(room, s, INPUTS[ins[i]]); if (n.dead) continue; if (overlaps(room, n.x, n.y, "*", 1).length) continue; var kk = keyOf(n); if (seen.has(kk)) continue; seen.set(kk, 1); prev.set(kk, [keyOf(s), ins[i]]); q.push(n); }
    }
    return null;
  }
  function design(i, bump) {
    var r = rng(i * 7919 + (bump || 0) * 104729 + 11), g = [], x, y, k;
    for (y = 0; y < ROWS; y++) { g.push([]); for (x = 0; x < COLS; x++) g[y].push(x === 0 || x === COLS - 1 || y === 0 ? "W" : y === ROWS - 1 ? "=" : " "); }
    var pConv = Math.min(0.35, 0.05 + i * 0.02), pCrumb = Math.min(0.4, 0.08 + i * 0.02);
    var rows = [13, 11, 9, 7, 5, 3];
    rows.forEach(function (ry) { var nseg = 1 + Math.floor(r() * 3); for (var s = 0; s < nseg; s++) { var len = 3 + Math.floor(r() * 7), x0 = 1 + Math.floor(r() * (COLS - 2 - len)), roll = r(), ch = roll < pConv ? (r() < 0.5 ? "<" : ">") : roll < pConv + pCrumb ? "~" : "="; for (x = x0; x < x0 + len; x++) g[ry][x] = ch; } });
    // a few bottom-row features
    if (i >= 3) { var bx = 10 + Math.floor(r() * 14), bl = 2 + Math.floor(r() * 4), bc = r() < 0.5 ? "~" : (r() < 0.5 ? "<" : ">"); for (x = bx; x < bx + bl; x++) g[ROWS - 1][x] = bc; }
    // walls (pillars standing on a floor)
    var nW = Math.floor(i / 3); for (k = 0; k < nW; k++) { var wx = 6 + Math.floor(r() * 22), wr = rows[Math.floor(r() * rows.length)], hgt = 1 + Math.floor(r() * 2); if (g[wr][wx] !== " ") for (y = wr - hgt; y < wr; y++) g[y][wx] = "W"; }
    // hazards on floors
    var nH = Math.min(12, 2 + Math.floor(i * 0.6)); for (k = 0; k < nH * 4 && nH > 0; k++) { var hx = 2 + Math.floor(r() * 28), hr = [15, 13, 11, 9, 7, 5][Math.floor(r() * 6)]; if (hr === 15 && hx < 7) continue; if (isFloor(g[hr][hx]) && g[hr - 1][hx] === " " && g[hr - 2][hx] === " ") { g[hr - 1][hx] = "*"; nH--; } }
    var room = { i: i, name: NAMES[i], g: g, start: { x: 8, y: 120, m: 0 } };
    // reach: cells overlapped by any state; ground spots
    var cells = {}, ground = [];
    search(room, room.start, null, function (s) { var x0 = Math.floor(s.x / T), x1 = Math.floor((s.x + HW - 1) / T), y0 = Math.floor((s.y - HH) / T), y1 = Math.floor((s.y - 1) / T); for (var ty = y0; ty <= y1; ty++) for (var tx = x0; tx <= x1; tx++) cells[tx + "," + ty] = 1; if (s.m === 0 && s.x % T === 0) ground.push(s); });
    var cand = Object.keys(cells).map(function (c) { var p = c.split(","); return [+p[0], +p[1]]; }).filter(function (p) { return p[1] > 0 && p[1] < ROWS - 1 && g[p[1]][p[0]] === " " && !(p[1] >= 13 && p[0] < 6); });
    var nK = Math.min(6, 3 + Math.floor(i / 4)); if (cand.length < nK + 6) return null;
    var keys = [], pts = [[1, 14]];
    for (k = 0; k < nK; k++) { var best = null, bd = -1; cand.forEach(function (c) { var d = Infinity; pts.forEach(function (p) { d = Math.min(d, Math.abs(p[0] - c[0]) + Math.abs(p[1] - c[1]) * 1.5); }); d += r() * 3; if (d > bd) { bd = d; best = c; } }); keys.push(best); pts.push(best); g[best[1]][best[0]] = "k"; }
    // exit: ground spot far from the start with 2x2 free above
    var ex = null, ed = -1; ground.forEach(function (s) { var tx = s.x / T, ty = s.y / T; if (tx > COLS - 3) return; if ([[0, -1], [1, -1], [0, -2], [1, -2]].some(function (o) { return at(room, tx + o[0], ty + o[1]) !== " "; })) return; if (!isFloor(at(room, tx + 1, ty))) return; var d = Math.abs(tx - 1) + Math.abs(ty - 15) * 1.4 + r() * 2; if (d > ed) { ed = d; ex = [tx, ty - 2]; } });
    if (!ex) return null; room.exit = ex;
    // guardians on reachable floor runs
    var runs = []; for (y = 3; y < ROWS; y += 2) { var sx = -1; for (x = 1; x < COLS; x++) { var f = isFloor(g[y][x]) && g[y][x] !== "W" && g[y - 1][x] === " " && g[y - 2][x] === " "; if (f && sx < 0) sx = x; if ((!f || x === COLS - 1) && sx >= 0) { var ex2 = f ? x : x - 1; if (ex2 - sx >= 4 && cells[sx + "," + (y - 1)]) runs.push([sx, ex2, y]); sx = -1; } } }
    runs = runs.filter(function (rn) { return !(rn[2] === 15 && rn[0] < 6); });
    var nG = Math.min(4, 1 + Math.floor(i / 4)), guards = []; for (k = 0; k < nG && runs.length; k++) { var ri = Math.floor(r() * runs.length), rn = runs.splice(ri, 1)[0]; var lo = rn[2] === 15 ? Math.max(rn[0], 8) : rn[0]; guards.push({ x0: lo * T, x1: rn[1] * T, y: rn[2] * T, sp: 0.5 + r() * 0.4 + i * 0.02, kind: (i + k) % 6 }); }
    if (i >= 8) { var vx = 8 + Math.floor(r() * 18); guards.push({ vert: 1, x: vx * T, y0: 3 * T, y1: 13 * T, sp: 0.6 + r() * 0.3, kind: (i + 3) % 6 }); }
    room.guards = guards; room.keys = keys;
    return room;
  }
  function goalKeys(room, remaining) { return function (s) { return remaining.some(function (k) { return overlaps(room, s.x, s.y, "k").some(function (c) { return c[0] === k[0] && c[1] === k[1]; }); }); }; }
  function inExit(room, s) { var e = room.exit, x0 = e[0] * T, y0 = e[1] * T; return s.x + HW > x0 + 2 && s.x < x0 + 14 && s.y > y0 + 4 && s.y - HH < y0 + 14; }
  // full route: keys (nearest first) then exit, on a copy of the grid with keys removed as taken
  function route(room) {
    var g2 = room.g.map(function (r) { return r.slice(); }), rm = { g: g2, exit: room.exit }, s = room.start, rem = room.keys.slice(), frames = [];
    while (rem.length) { var res = search(rm, s, goalKeys(rm, rem)); if (!res) return null; frames = frames.concat(res.path); s = res.end; var got = overlaps(rm, s.x, s.y, "k"); got.forEach(function (c) { g2[c[1]][c[0]] = " "; }); rem = rem.filter(function (k) { return g2[k[1]][k[0]] === "k"; }); }
    var fin = search(rm, s, function (st) { return inExit(rm, st); }); if (!fin) return null; return frames.concat(fin.path);
  }

  // guard positions per frame, simulated exactly as the game moves them
  function guardTrack(room, T) { return room.guards.map(function (gd) { var p = gd.vert ? gd.y0 : gd.x0, dir = 1, lo = gd.vert ? gd.y0 : gd.x0, hi = gd.vert ? gd.y1 : gd.x1, out = new Float64Array(T + 1); out[0] = p; for (var t = 1; t <= T; t++) { p += gd.sp * dir; if (p > hi || p < lo) dir *= -1; out[t] = p; } return out; }); }
  function guardHit(room, tracks, t, s) { for (var i = 0; i < room.guards.length; i++) { var gd = room.guards[i], gx = gd.vert ? gd.x : tracks[i][t], gy = gd.vert ? tracks[i][t] : gd.y; if (s.x + 1 < gx + 7 && s.x + 6 > gx + 1 && s.y - 15 < gy && s.y - 1 > gy - 15) return true; } return false; }
  // time-aware search: layers by frame, so guards are where the game will have them
  function timedSearch(room, tracks, start, t0, goal, T, cap) {
    var layer = [{ s: start, path: null }], seen;
    for (var t = t0; t < T; t++) {
      var next = [], seenL = new Set();
      for (var i = 0; i < layer.length; i++) { var cur = layer[i], ins = cur.s.m === 0 ? [0, 1, 2, 3, 4, 5] : [0];
        for (var k = 0; k < ins.length; k++) { var n = step(room, cur.s, INPUTS[ins[k]]); if (n.dead) continue; if (overlaps(room, n.x, n.y, "*", 1).length) continue; if (guardHit(room, tracks, t + 1, n)) continue;
          var kk = keyOf(n); if (seenL.has(kk)) continue; seenL.add(kk); var node = { s: n, path: { prev: cur.path, inp: ins[k] } };
          if (goal(n)) { var arr = [], pp = node.path; while (pp) { arr.push(pp.inp); pp = pp.prev; } return { path: arr.reverse(), end: n, t: t + 1 }; }
          next.push(node); } }
      if (next.length > cap) { for (var j = next.length - 1; j > 0; j--) { var q = Math.floor(Math.random() * (j + 1)), tmp = next[j]; next[j] = next[q]; next[q] = tmp; } next.length = cap; }
      layer = next; if (!layer.length) return null;
    }
    return null;
  }
  function timedRoute(room, T, cap) {
    T = T || 3600; cap = cap || 20000; var tracks = guardTrack(room, T + 2), g2 = room.g.map(function (r) { return r.slice(); }), rm = { g: g2, exit: room.exit, guards: room.guards }, s = { x: 8, y: 120, m: 0 }, t = 0, rem = room.keys.slice(), frames = [];
    if (guardHit(rm, tracks, 0, s)) return null;
    while (rem.length) { var res = timedSearch(rm, tracks, s, t, goalKeys(rm, rem), T, cap); if (!res) return null; frames = frames.concat(res.path); s = res.end; t = res.t; overlaps(rm, s.x, s.y, "k").forEach(function (c) { g2[c[1]][c[0]] = " "; }); rem = rem.filter(function (k) { return g2[k[1]][k[0]] === "k"; }); }
    var fin = timedSearch(rm, tracks, s, t, function (st) { return inExit(rm, st); }, T, cap); if (!fin) return null; return frames.concat(fin.path);
  }
  var cache = {};
  function room(i) { if (cache[i]) return cache[i]; var pre = root && root.PL_ROOMS && root.PL_ROOMS[i]; if (pre) { cache[i] = { i: i, name: NAMES[i], g: pre.g.map(function (r) { return r.split(""); }), start: { x: 8, y: 120, m: 0 }, exit: pre.exit, keys: pre.keys, guards: pre.guards, air: pre.air, bump: pre.bump }; return cache[i]; } for (var b = 0; b < 60; b++) { var rm = design(i, b); if (!rm) continue; var rt = route(rm); if (!rt) continue; var tr = timedRoute(rm); if (!tr) continue; rm.route = tr; rm.bump = b; rm.air = Math.max(2400, Math.ceil(tr.length * 2 / 60) * 60); cache[i] = rm; return rm; } throw new Error("no room " + i); }
  var api = { route: route, timedRoute: timedRoute, design: design, COLS: COLS, ROWS: ROWS, T: T, HW: HW, HH: HH, NAMES: NAMES, INPUTS: INPUTS, step: step, room: room, overlaps: overlaps, supported: supported, at: at, inExit: inExit, conveyor: conveyor, isFloor: isFloor };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.PLC = api;
})(this);
