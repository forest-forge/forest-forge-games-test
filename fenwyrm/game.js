/* Fenwyrm (Forest Forge). A little fen wyrm glides over chasms, charges through bramble
 * cages and frees the critters trapped in three bright realms off Thistle Green.
 * Original game: all art drawn in code, all sound generated (shell.js). */
(function () {
  "use strict";
  var clamp = FF.clamp, TS = 16;
  var ui = FF.create({
    id: "fenwyrm", title: "Fenwyrm", course: "Thistle Green", wide: true, view: { w: 640, h: 360, flex: true },
    stats: [{ id: "gems", label: "Gems", value: "0" }, { id: "free", label: "Freed", value: "0/12" }],
    pads: { left: [], right: [{ id: "C", label: "Charge", aria: "Charge", keys: ["KeyX", "KeyK", "ShiftLeft", "KeyC"] }, { id: "J", icon: "up", cls: "big", aria: "Jump, hold to glide", keys: ["Space", "KeyZ", "KeyJ"] }] },
    keys: [{ id: "U", keys: ["ArrowUp", "KeyW"] }, { id: "D", keys: ["ArrowDown", "KeyS"] }, { id: "L", keys: ["ArrowLeft", "KeyA"] }, { id: "R", keys: ["ArrowRight", "KeyD"] }]
  });
  var A = ui.audio, save = ui.save; save.hi = save.hi || 0; save.got = save.got || {}; save.freed = save.freed || {};
  var PX = 2, lo = document.createElement("canvas"), g = lo.getContext("2d"), W = 320, H = 180;
  function sizeLo() { W = Math.ceil(ui.VW / PX); H = Math.ceil(ui.VH / PX); lo.width = W; lo.height = H; g.imageSmoothingEnabled = false; }
  function R(x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function hash(x, y) { var n = (x * 374761393 + y * 668265263) | 0; n = (n ^ (n >>> 13)) * 1274126177; return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }

  // ---------- realms ----------
  var REALMS = {
    hub: { name: "Thistle Green", w: 40, h: 26, fill: " ",
      th: { sky: ["#3a1a8a", "#c85ad8"], star: "#ffe68a", grass: "#2ad86a", grass2: "#1fb85a", fleck: "#ffd23a", hi: "#7ae86a", hi2: "#4ac85a", side: "#5a2aa8", side2: "#3a1a7a", path: "#ffcf4a", path2: "#e8a82a", water: "#3ac8ff" },
      land: [[5, 4, 24, 17, "."], [13, 4, 8, 3, "^"], [10, 9, 14, 1, "="], [10, 15, 14, 1, "="], [10, 9, 1, 7, "="], [23, 9, 1, 7, "="], [33, 10, 5, 5, "."], [7, 6, 2, 1, "T"], [26, 6, 2, 1, "T"], [7, 18, 1, 1, "T"], [27, 18, 1, 1, "T"]],
      ents: [["S", 17, 12], ["P", 6, 12, "moor"], ["P", 28, 12, "mere"], ["P", 17, 5, "spires"], ["G", 35, 12], ["G", 34, 13], ["G", 36, 11]] },
    moor: { name: "Amethyst Moor", w: 48, h: 30, fill: " ", need: 0,
      th: { sky: ["#1a0a4a", "#8a3ad8"], star: "#ffffff", grass: "#a85ae8", grass2: "#8a3ad8", fleck: "#ffd23a", hi: "#d88aff", hi2: "#b86ae8", side: "#3a1a7a", side2: "#22104a", path: "#ffd23a", path2: "#d8a82a", water: "#5ae8ff" },
      land: [[2, 2, 10, 8, "."], [16, 2, 11, 8, "."], [22, 3, 4, 4, "^"], [36, 2, 10, 8, "."], [40, 10, 2, 6, "="], [34, 16, 12, 10, "."], [20, 18, 9, 8, "."], [3, 14, 11, 12, "."], [4, 15, 5, 4, "^"], [6, 10, 2, 4, "="], [9, 3, 1, 1, "T"], [44, 3, 1, 1, "T"], [35, 17, 1, 1, "T"]],
      ents: [["S", 5, 5], ["H", 3, 3], ["s", 18, 7], ["s", 20, 4], ["G", 24, 4], ["c", 42, 5], ["k", 38, 20], ["k", 43, 23], ["c", 44, 19], ["b", 36, 24], ["b", 37, 24], ["c", 24, 21], ["w", 22, 20], ["c", 6, 16], ["s", 10, 22], ["G", 26, 24]] },
    mere: { name: "Goldmere", w: 48, h: 30, fill: "~", need: 3,
      th: { sky: ["#0a6a9a", "#3ae8e8"], star: "#ffffff", grass: "#ffcf3a", grass2: "#f0b82a", fleck: "#ff6a3a", hi: "#fff07a", hi2: "#ffd84a", side: "#c8781a", side2: "#8a4a0a", path: "#ffffff", path2: "#c8e8ff", water: "#1ab8d8" },
      land: [[2, 12, 9, 8, "."], [11, 15, 6, 2, "="], [17, 10, 12, 12, "."], [20, 11, 6, 3, "^"], [18, 1, 12, 5, "."], [34, 8, 11, 10, "."], [38, 18, 2, 4, "="], [30, 22, 15, 7, "."], [30, 23, 4, 3, "^"], [6, 23, 12, 6, "."], [8, 13, 1, 1, "T"], [43, 9, 1, 1, "T"], [28, 2, 1, 1, "T"]],
      ents: [["S", 5, 15], ["H", 3, 13], ["s", 19, 18], ["s", 25, 20], ["b", 27, 13], ["c", 24, 3], ["w", 21, 3], ["c", 40, 12], ["k", 37, 14], ["c", 42, 26], ["w", 35, 25], ["w", 39, 24], ["b", 32, 27], ["c", 9, 25], ["s", 12, 26], ["G", 16, 24], ["G", 22, 12]] },
    spires: { name: "Saffron Spires", w: 50, h: 32, fill: " ", need: 6,
      th: { sky: ["#ff5a8a", "#ffc85a"], star: "#ffffff", grass: "#ff8a3a", grass2: "#f0702a", fleck: "#fff05a", hi: "#ffb85a", hi2: "#ff9a3a", side: "#c82a6a", side2: "#8a1a4a", path: "#ffffff", path2: "#ffd8e8", water: "#ff5ad8" },
      land: [[2, 2, 8, 7, "."], [13, 2, 5, 5, "."], [14, 3, 3, 3, "^"], [21, 4, 6, 6, "."], [30, 2, 8, 8, "."], [30, 2, 3, 3, "^"], [29, 15, 10, 6, "."], [29, 15, 3, 3, "^"], [10, 15, 10, 8, "."], [14, 23, 2, 3, "="], [8, 26, 16, 5, "."], [37, 3, 1, 1, "T"], [19, 21, 1, 1, "T"]],
      ents: [["S", 5, 5], ["H", 3, 3], ["G", 15, 4], ["k", 23, 7], ["c", 35, 5], ["w", 33, 7], ["c", 34, 18], ["k", 36, 19], ["s", 31, 19], ["c", 14, 18], ["w", 12, 20], ["c", 20, 28], ["b", 10, 28], ["b", 11, 29], ["s", 16, 28], ["k", 18, 29], ["G", 22, 27], ["H", 9, 27]] }
  };
  var ORDER = ["moor", "mere", "spires"], TOTAL = 12;
  function build(id) {
    var d = REALMS[id], t = [], x, y; for (y = 0; y < d.h; y++) { t.push([]); for (x = 0; x < d.w; x++) t[y].push(d.fill); }
    d.land.forEach(function (l) { for (var yy = l[1]; yy < l[1] + l[3]; yy++) for (var xx = l[0]; xx < l[0] + l[2]; xx++) t[yy][xx] = l[4]; });
    var M = { id: id, d: d, w: d.w, h: d.h, t: t, ents: [], start: null, gemsTotal: 0 };
    var taken = {}; d.ents.forEach(function (e) { taken[e[1] + "," + e[2]] = 1; });
    var got = save.got[id] || {}; var n = 0;
    d.ents.forEach(function (e, i) { var o = { k: e[0], x: e[1] * TS + 8, y: e[2] * TS + 8, hx: e[1] * TS + 8, hy: e[2] * TS + 8, arg: e[3], id: e[0] + i, alive: true, t: Math.random() * 6, z: 0 };
      if (o.k === "S") { M.start = { x: o.x, y: o.y }; return; }
      if (o.k === "G") { o.v = 5; M.gemsTotal += 5; if (got[o.id]) return; }
      if (o.k === "c" && save.freed[id + o.id]) o.open = 1;
      if (o.k === "b" && got[o.id]) return;
      if (o.k === "b") M.gemsTotal += 6;
      if (o.k === "w") o.z = 14;
      o.hp = o.k === "k" ? 1 : 1; M.ents.push(o); });
    for (y = 1; y < d.h - 1; y++) for (x = 1; x < d.w - 1; x++) if (t[y][x] === "." && (x * 3 + y * 5) % 7 === 0 && !taken[x + "," + y] && !taken[(x - 1) + "," + y] && !taken[(x + 1) + "," + y]) {
      var gid = "g" + x + "_" + y; M.gemsTotal += 1; n++; if (!got[gid]) M.ents.push({ k: "g", v: 1, x: x * TS + 8, y: y * TS + 8, id: gid, alive: true, t: hash(x, y) * 6, z: 0 }); }
    return M;
  }
  function tile(M, tx, ty) { if (tx < 0 || ty < 0 || tx >= M.w || ty >= M.h) return " "; return M.t[ty][tx]; }
  function hgt(c) { return c === "." || c === "=" ? 0 : c === "^" ? 10 : c === "T" ? 99 : -999; }
  function gh(px, py) { return hgt(tile(M, Math.floor(px / TS), Math.floor(py / TS))); }
  function realmGems(id) { var m = 0, o = save.got[id] || {}; for (var k in o) m += o[k]; return m; }
  function gemsAll() { var s = 0; ["hub"].concat(ORDER).forEach(function (r) { s += realmGems(r); }); return s; }
  function freedAll() { var s = 0; for (var k in save.freed) s++; return s; }
  function scoreNow() { return gemsAll() * 10 + freedAll() * 500; }

  // ---------- sound ----------
  var S = {
    gem: function (v) { A.tone({ f: v > 1 ? 1318 : 1568, dur: 0.05, type: "triangle", gain: 0.08 }); A.tone({ f: v > 1 ? 1760 : 2093, dur: 0.08, type: "triangle", gain: 0.07, delay: 0.05 }); if (v > 1) A.tone({ f: 2637, dur: 0.1, type: "triangle", gain: 0.06, delay: 0.1 }); },
    jump: function () { A.tone({ f: 380, f2: 640, dur: 0.09, type: "triangle", gain: 0.08 }); },
    glide: function () { A.noise({ dur: 0.25, gain: 0.04, freq: 1800, filter: "bandpass" }); },
    charge: function () { A.noise({ dur: 0.18, gain: 0.08, freq: 500, filter: "lowpass" }); A.tone({ f: 140, f2: 220, dur: 0.15, type: "sawtooth", gain: 0.05 }); },
    bonk: function () { A.tone({ f: 160, f2: 80, dur: 0.1, type: "square", gain: 0.1 }); },
    clang: function () { A.tone({ f: 1400, f2: 1200, dur: 0.12, type: "square", gain: 0.06 }); A.tone({ f: 1870, dur: 0.1, type: "square", gain: 0.04 }); },
    pop: function () { A.noise({ dur: 0.15, gain: 0.14, freq: 900, filter: "bandpass" }); A.tone({ f: 600, f2: 200, dur: 0.12, type: "square", gain: 0.06 }); },
    hurt: function () { A.tone({ f: 500, f2: 180, dur: 0.18, type: "square", gain: 0.1 }); },
    fall: function () { A.tone({ f: 900, f2: 120, dur: 0.6, type: "triangle", gain: 0.1 }); },
    splash: function () { A.noise({ dur: 0.35, gain: 0.15, freq: 1200, filter: "lowpass" }); },
    free: function () { [784, 988, 1175, 1568, 0, 1175, 1568].forEach(function (f, i) { if (f) A.tone({ f: f, dur: 0.12, type: "triangle", gain: 0.09, delay: i * 0.09 }); }); },
    portal: function () { for (var i = 0; i < 8; i++) A.tone({ f: 400 + i * 120, dur: 0.08, type: "sine", gain: 0.08, delay: i * 0.05 }); },
    no: function () { A.tone({ f: 220, dur: 0.12, type: "square", gain: 0.07 }); A.tone({ f: 165, dur: 0.16, type: "square", gain: 0.07, delay: 0.12 }); }
  };
  var SONGS = {
    hub: { bpm: 126, order: [0, 1], parts: [[
      { wave: "triangle", gain: 0.11, pat: "F5 . A5 C6 B5 . A5 G5 A5 . F5 . C5 . . . D5 . F5 A5 G5 . F5 E5 F5 - - - . . . ." },
      { wave: "square", gain: 0.03, pat: "F3 A3 C4 A3 F3 A3 C4 A3 G3 B3 D4 B3 G3 B3 D4 B3 D3 F3 A3 F3 D3 F3 A3 F3 C3 E3 G3 E3 C3 E3 G3 E3" },
      { wave: "triangle", gain: 0.18, pat: "F2 . . . F2 . . . G2 . . . G2 . . . D2 . . . D2 . . . C2 . . . C2 . E2 ." },
      { wave: "drum", pat: "k . h . s . h . k . h k s . h . k . h . s . h . k . h k s . o ." }], [
      { wave: "triangle", gain: 0.11, pat: "A5 . C6 . D6 C6 B5 A5 G5 . E5 . C5 . D5 E5 F5 . A5 . G5 F5 E5 D5 C5 - - - . . . ." },
      { wave: "square", gain: 0.03, pat: "D3 F3 A3 F3 D3 F3 A3 F3 C3 E3 G3 E3 C3 E3 G3 E3 B2 D3 F3 D3 G3 B3 D4 B3 C3 E3 G3 E3 C4 G3 E3 C3" },
      { wave: "triangle", gain: 0.18, pat: "D2 . . . D2 . . . C2 . . . C2 . . . B1 . . . G2 . . . C2 . . . C2 . G2 ." },
      { wave: "drum", pat: "k . h . s . h . k . h k s . h . k . h . s . h . k k h k s s o ." }]] },
    realm: { bpm: 140, order: [0, 0, 1], parts: [[
      { wave: "square", gain: 0.04, pat: "D5 . F#5 A5 . G#5 A5 . E5 . . D5 E5 . F#5 . B4 . D5 F#5 . E5 D5 . C#5 . . . A4 . . ." },
      { wave: "triangle", gain: 0.18, pat: "D2 . A2 . D3 . A2 . A1 . E2 . A2 . E2 . B1 . F#2 . B2 . F#2 . A1 . E2 . A2 . C#3 ." },
      { wave: "drum", pat: "k . h k s . h . k k h . s . h h k . h k s . h . k . h . s s s ." }], [
      { wave: "square", gain: 0.04, pat: "G5 . F#5 E5 D5 . E5 F#5 A5 . . . F#5 . D5 . G5 . A5 B5 A5 . G5 F#5 E5 - - - . . . ." },
      { wave: "triangle", gain: 0.18, pat: "G1 . D2 . G2 . D2 . D2 . A2 . D3 . A2 . G1 . D2 . G2 . D2 . A1 . E2 . A2 . E2 ." },
      { wave: "drum", pat: "k . h k s . h . k k h . s . h h k . h k s . h . k . s . s s o ." }]] }
  };

  // ---------- state ----------
  var M, hero, mode = "title", cam = { x: 0, y: 0 }, parts = [], floats = [], stick = null, msg = "", msgT = 0, realm = "hub";
  function newHero(x, y) { return { x: x, y: y, z: 0, vz: 0, fx: 1, fy: 0, ch: 0, glide: 0, inv: 0, hp: 3, bonk: 0, safe: { x: x, y: y }, safeT: 0, air: 0, walk: 0 }; }
  function enter(id, from) {
    realm = id; M = build(id); var sp = M.start; if (id === "hub" && from) { var p = M.ents.filter(function (e) { return e.k === "P" && e.arg === from; })[0]; if (p) sp = { x: p.x + (p.x < 200 ? 26 : p.x > 400 ? -26 : 0), y: p.y + (p.x > 200 && p.x < 400 ? 26 : 0) }; }
    hero = newHero(sp.x, sp.y); hero.z = gh(sp.x, sp.y); parts = []; floats = []; ui.setCourse(M.d.name); hud(); snap(); A.playSong(id === "hub" ? SONGS.hub : SONGS.realm);
    say(id === "hub" ? "Thistle Green" : M.d.name + "  -  " + realmGems(id) + "/" + M.gemsTotal + " gems");
  }
  function say(t) { msg = t; msgT = 2.6; }
  function hud() { ui.setStat("gems", FF.n(gemsAll())); ui.setStat("free", freedAll() + "/" + TOTAL); }
  function snap() { cam.x = clamp(hero.x - W / 2, -40, M.w * TS - W + 40); cam.y = clamp(hero.y - H / 2 - 10, -40, M.h * TS - H + 40); }
  function burst(x, y, z, col, n, sp) { for (var i = 0; i < n; i++) { var a = Math.random() * 6.28, s = (sp || 50) * (0.4 + Math.random()); parts.push({ x: x, y: y, z: z, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, vz: 40 + Math.random() * 60, life: 0.5 + Math.random() * 0.4, col: col }); } }
  function grab(e) { e.alive = false; var gotR = save.got[realm] = save.got[realm] || {}; gotR[e.id] = e.v; S.gem(e.v); burst(e.x, e.y, 6, e.v > 1 ? "#ff5ad8" : "#ffe23a", 5, 30); bump(); }
  function bump() { hud(); var s = scoreNow(); if (s > save.hi) save.hi = s; ui.persist(); }
  function hurt(dx, dy) { var h = hero; if (h.inv > 0) return; h.hp--; h.inv = 1.3; S.hurt(); var d = Math.hypot(dx, dy) || 1; h.kx = dx / d * 120; h.ky = dy / d * 120; h.ch = 0; if (h.hp <= 0) knockedOut(); }
  function knockedOut() { say("Knocked dizzy! Back to the start."); var keep = realm; enter(keep); }
  function fallOut(water) { var h = hero; (water ? S.splash : S.fall)(); h.hp--; if (h.hp <= 0) return knockedOut(); h.x = h.safe.x; h.y = h.safe.y; h.z = gh(h.x, h.y); h.vz = 0; h.inv = 1.3; h.ch = 0; game.falls = (game.falls || 0) + 1; }
  function freeCage(e) { if (e.open) return; e.open = 1; save.freed[realm + e.id] = 1; S.free(); burst(e.x, e.y, 8, "#ffe23a", 14, 60); floats.push({ x: e.x, y: e.y - 10, t: 0, txt: ["Ta, love!", "Cheers!", "Free at last!", "Lovely, ta!"][freedAll() % 4], kind: (freedAll() % 4) }); bump();
    var f = freedAll(); say(f >= TOTAL ? "Every critter is free!" : f + " of " + TOTAL + " critters free"); if (f >= TOTAL) setTimeout(function () { if (mode === "play") ending(); }, 1800); }

  // ---------- update ----------
  function inputVec() {
    var x = (ui.down("R") ? 1 : 0) - (ui.down("L") ? 1 : 0), y = (ui.down("D") ? 1 : 0) - (ui.down("U") ? 1 : 0);
    if (stick && stick.on) { var dx = stick.x - stick.ox, dy = stick.y - stick.oy, d = Math.hypot(dx, dy); if (d > 6) { x = dx / Math.max(d, 30); y = dy / Math.max(d, 30); } }
    var m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; } return { x: x, y: y, m: Math.min(1, m) };
  }
  function blocked(px, py, z) { return gh(px, py) > z + 2; }
  function moveAxis(h, dx, dy) {
    if (dx) { var sx = h.x + dx + (dx > 0 ? 4 : -4); if (blocked(sx, h.y - 3, h.z) || blocked(sx, h.y + 3, h.z)) { if (h.ch && Math.abs(dx) > 1) { h.ch = 0; h.bonk = 0.3; S.bonk(); } } else h.x += dx; }
    if (dy) { var sy = h.y + dy + (dy > 0 ? 3 : -3); if (blocked(h.x - 4, sy, h.z) || blocked(h.x + 4, sy, h.z)) { if (h.ch && Math.abs(dy) > 1) { h.ch = 0; h.bonk = 0.3; S.bonk(); } } else h.y += dy; }
  }
  function update(dt) {
    var h = hero, iv = inputVec(), base = gh(h.x, h.y), grounded = h.z <= base + 0.01 && h.vz <= 0 && base > -500;
    h.inv = Math.max(0, h.inv - dt); h.bonk = Math.max(0, h.bonk - dt); msgT -= dt;
    if (iv.m > 0.1 && !h.ch) { h.fx = iv.x / iv.m; h.fy = iv.y / iv.m; }
    // charge
    if (ui.down("C") && h.bonk <= 0) { if (!h.ch && grounded) { h.ch = 1; S.charge(); } }
    else h.ch = 0;
    if (h.ch && iv.m > 0.1) { var a0 = Math.atan2(h.fy, h.fx), a1 = Math.atan2(iv.y, iv.x), da = Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0)); a0 += clamp(da, -4 * dt, 4 * dt); h.fx = Math.cos(a0); h.fy = Math.sin(a0); }
    // jump and glide
    if (ui.hit("J") && grounded) { h.vz = 205; S.jump(); grounded = false; }
    h.glide = !grounded && h.vz < 0 && ui.down("J") ? 1 : 0;
    if (h.glide && !h.wasGlide) S.glide(); h.wasGlide = h.glide;
    var sp = h.ch ? 165 : h.glide ? 112 : 92, vx, vy;
    if (h.ch) { vx = h.fx * sp; vy = h.fy * sp; } else { vx = iv.x * sp; vy = iv.y * sp; }
    if (h.kx) { vx += h.kx; vy += h.ky; h.kx *= Math.pow(0.02, dt); h.ky *= Math.pow(0.02, dt); if (Math.abs(h.kx) + Math.abs(h.ky) < 5) h.kx = h.ky = 0; }
    if (h.bonk > 0) { vx = -h.fx * 40; vy = -h.fy * 40; }
    moveAxis(h, vx * dt, 0); moveAxis(h, 0, vy * dt);
    h.walk += Math.hypot(vx, vy) * dt;
    base = gh(h.x, h.y);
    if (!grounded || h.z > base + 0.01 || base < -500) {
      h.vz -= 540 * dt; if (h.glide && h.vz < -26) h.vz = -26; h.z += h.vz * dt;
      if (base > -500 && h.z <= base && h.vz <= 0) { h.z = base; h.vz = 0; burst(h.x, h.y, base, "#ffffff", 3, 20);
        // stomp
        M.ents.forEach(function (e) { if (!e.alive) return; if ((e.k === "s" || e.k === "k" || e.k === "w" || e.k === "c") && Math.hypot(e.x - h.x, e.y - h.y) < 12) stomp(e); }); }
      if (h.z < -40) fallOut(M.d.fill === "~");
    } else { h.z = base; h.safeT += dt; var ok = [[-7, -6], [7, -6], [-7, 6], [7, 6]].every(function (o) { return gh(h.x + o[0], h.y + o[1]) > -500; }); if (ok && h.safeT > 0.2) { h.safe = { x: h.x, y: h.y }; h.safeT = 0; } }
    if (h.ch && Math.random() < 0.6) parts.push({ x: h.x - h.fx * 6, y: h.y - h.fy * 6, z: h.z + 2, vx: -h.fx * 20, vy: -h.fy * 20, vz: 20, life: 0.3, col: "#fff6c8" });
    // entities
    M.ents.forEach(function (e) {
      if (!e.alive) return; e.t += dt; var dx = e.x - h.x, dy = e.y - h.y, d = Math.hypot(dx, dy);
      if (e.k === "g" || e.k === "G") { if (d < 11 && Math.abs(h.z - gh(e.x, e.y)) < 20) grab(e); return; }
      if (e.k === "P" || e.k === "H") { if (d < 12 && h.z < gh(e.x, e.y) + 8) usePortal(e); return; }
      if (e.k === "c") { if (!e.open && d < 13 && h.ch) freeCage(e); return; }
      if (e.k === "b") { if (d < 12 && h.ch) { e.alive = false; S.pop(); burst(e.x, e.y, 6, "#c88a3a", 10, 50); for (var i = 0; i < 3; i++) M.ents.push({ k: "G", v: 2, x: e.x + (i - 1) * 9, y: e.y + 6, id: e.id + "_" + i, alive: true, t: 0, z: 0 }); (save.got[realm] = save.got[realm] || {})[e.id] = 0; ui.persist(); } else if (d < 9) { h.x -= dx > 0 ? -1 : 1; } return; }
      // foes
      var sp2 = e.k === "s" ? 32 : e.k === "k" ? 22 : 40, tx = e.hx + Math.cos(e.t * 0.7) * 20, ty = e.hy + Math.sin(e.t * 0.9) * 14;
      if (d < 70 && h.inv <= 0) { tx = h.x; ty = h.y; }
      var mx = tx - e.x, my = ty - e.y, md = Math.hypot(mx, my) || 1, nx = e.x + mx / md * sp2 * dt, ny = e.y + my / md * sp2 * dt;
      if (e.k === "w") { e.x = nx; e.y = ny; e.z = d < 50 ? Math.max(3, e.z - 20 * dt) : Math.min(16, e.z + 10 * dt); }
      else if (gh(nx, ny) === 0 || gh(nx, ny) === gh(e.x, e.y)) { e.x = nx; e.y = ny; }
      e.z = e.k === "w" ? e.z : gh(e.x, e.y);
      if (d < 11 && Math.abs(h.z - e.z) < 12) {
        if (h.ch || (e.k === "w" && h.glide)) kill(e);
        else if (h.vz < 0 && h.z > e.z + 4) stomp(e);
        else hurt(-dx, -dy);
      }
    });
    floats.forEach(function (f) { f.t += dt; }); floats = floats.filter(function (f) { return f.t < 2.2; });
    parts.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; p.vz -= 300 * dt; p.z = Math.max(0, p.z + p.vz * dt); p.life -= dt; }); parts = parts.filter(function (p) { return p.life > 0; });
    if (parts.length > 300) parts.splice(0, parts.length - 300);
    var tcx = clamp(h.x - W / 2, -40, M.w * TS - W + 40), tcy = clamp(h.y - h.z * 0.5 - H / 2, -40, M.h * TS - H + 40);
    cam.x += (tcx - cam.x) * Math.min(1, dt * 6); cam.y += (tcy - cam.y) * Math.min(1, dt * 6);
  }
  function kill(e) { e.alive = false; S.pop(); burst(e.x, e.y, e.z + 4, e.k === "k" ? "#3affd8" : "#ff5ad8", 10, 60); M.ents.push({ k: "G", v: 1, x: e.x, y: e.y, id: "f" + Math.random(), alive: true, t: 0, z: 0, temp: 1 }); }
  function stomp(e) { var h = hero; if (e.k === "c") { freeCage(e); h.vz = 150; return; } if (e.k === "k") { S.clang(); h.vz = 170; say("Too tough to stomp. Charge it!"); return; } kill(e); h.vz = 170; }
  function usePortal(e) {
    var h = hero; if (h.portT && ui.time - h.portT < 1) return;
    if (e.k === "H") { S.portal(); return enter("hub", realm); }
    var need = REALMS[e.arg].need; if (freedAll() < need) { h.portT = ui.time; S.no(); say("Free " + need + " critters to open " + REALMS[e.arg].name); var dx = h.x - e.x, dy = h.y - e.y, d = Math.hypot(dx, dy) || 1; h.kx = dx / d * 140; h.ky = dy / d * 140; return; }
    S.portal(); enter(e.arg);
  }

  // ---------- render ----------
  function render(c, tt) {
    if (!W) sizeLo(); if (!M) { M = build("hub"); hero = newHero(M.start.x, M.start.y); snap(); }
    var th = M.d.th, cx = Math.round(cam.x), cy = Math.round(cam.y);
    var gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, th.sky[0]); gr.addColorStop(1, th.sky[1]); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (var i = 0; i < 40; i++) { var sx = ((hash(i, 3) * 900 - cx * 0.3) % W + W) % W, sy = ((hash(i, 9) * 600 - cy * 0.3) % H + H) % H; if (M.d.fill === "~") { R(sx, sy, 6, 1, "rgba(255,255,255,0.35)"); } else R(sx, sy, 1 + (i % 3 === 0), 1 + (i % 3 === 0), (Math.floor(tt * 2 + i) % 5) ? th.star : "rgba(255,255,255,0.3)"); }
    var x0 = Math.max(0, Math.floor(cx / TS) - 1), x1 = Math.min(M.w - 1, Math.floor((cx + W) / TS) + 1), y0 = Math.max(0, Math.floor(cy / TS) - 1), y1 = Math.min(M.h - 1, Math.floor((cy + H) / TS) + 2);
    var water = M.d.fill === "~";
    for (var ty = y0; ty <= y1; ty++) for (var tx = x0; tx <= x1; tx++) {
      var ch = M.t[ty][tx], px = tx * TS - cx, py = ty * TS - cy;
      if (ch === "~") { R(px, py, TS, TS, th.water); if ((tx + ty + Math.floor(tt * 2)) % 3 === 0) R(px + 3 + (Math.floor(tt * 3) % 4), py + 6, 6, 1, "rgba(255,255,255,0.5)"); continue; }
      if (ch === " ") continue;
      var hz = ch === "^" ? 10 : 0, below = tile(M, tx, ty + 1), bh = hgt(below), drop = bh < -500 ? (water ? 4 : 12) : Math.max(0, hz - bh);
      if (drop > 0) { R(px, py + TS - hz, TS, drop, th.side); R(px, py + TS - hz + drop - 3, TS, 3, th.side2); }
      var top = ch === "^" ? th.hi : ch === "=" ? th.path : th.grass;
      R(px, py - hz, TS, TS, top);
      if (ch === "." || ch === "T") { var hv = hash(tx, ty); if (hv < 0.35) { R(px + 3 + hv * 20 % 9, py + 4 + hv * 50 % 8, 2, 2, th.grass2); } if (hv > 0.85) { R(px + 6, py + 6, 3, 3, th.fleck); R(px + 7, py + 7, 1, 1, "#ffffff"); } }
      if (ch === "^") { R(px, py - hz, TS, 2, "rgba(255,255,255,0.35)"); if (hash(tx, ty) > 0.6) R(px + 4, py - hz + 7, 5, 2, th.hi2); }
      if (ch === "=") { var pv = hash(ty, tx); R(px + 2 + pv * 9, py + 3 + pv * 30 % 9, 3, 2, th.path2); R(px + 9 - pv * 5, py + 10 - pv * 4, 2, 2, th.path2); }
      if (ch === "T") { R(px + 6, py - 10, 4, 14, "#6a3a8a"); R(px - 2, py - 26, 20, 16, M.id === "spires" ? "#ff4a8a" : M.id === "mere" ? "#ff9a2a" : "#1fb85a"); R(px + 1, py - 30, 14, 6, M.id === "spires" ? "#ff8ab8" : M.id === "mere" ? "#ffc85a" : "#5ae86a"); R(px + 2, py - 22, 3, 3, "#ffffff"); }
    }
    // sprites sorted by y
    var list = M.ents.filter(function (e) { return e.alive && e.x - cx > -30 && e.x - cx < W + 30 && e.y - cy > -40 && e.y - cy < H + 40; });
    if (mode !== "title") list.push({ hero: 1, y: hero.y });
    list.sort(function (a, b) { return a.y - b.y; });
    list.forEach(function (e) { if (e.hero) drawHero(tt); else drawEnt(e, tt); });
    parts.forEach(function (p) { R(p.x - cx - 1, p.y - cy - p.z - 1, 2, 2, p.col); });
    floats.forEach(function (f) { var x = f.x - cx, y = f.y - cy - f.t * 22; drawCritter(f.kind, x - 5, y - 4, tt, true); g.fillStyle = "#ffffff"; g.font = "bold 8px sans-serif"; g.textAlign = "center"; g.fillText(f.txt, x, y - 8); });
    if (stick && stick.on) { R(stick.ox / PX - 12, stick.oy / PX - 12, 24, 24, "rgba(255,255,255,0.15)"); R(stick.x / PX - 5, stick.y / PX - 5, 10, 10, "rgba(255,255,255,0.45)"); }
    if (mode === "play") { for (var k = 0; k < 3; k++) { var hx = 6 + k * 12; R(hx, 6, 9, 8, k < hero.hp ? "#ffd23a" : "rgba(0,0,0,0.3)"); R(hx + 2, 4, 5, 2, k < hero.hp ? "#ffd23a" : "rgba(0,0,0,0.3)"); R(hx + 2, 8, 2, 2, k < hero.hp ? "#ff5ad8" : "rgba(0,0,0,0)"); }
      if (msgT > 0) { g.font = "bold 9px sans-serif"; g.textAlign = "center"; g.fillStyle = "rgba(20,0,40,0.55)"; var tw = g.measureText(msg).width; g.fillRect(W / 2 - tw / 2 - 6, 20, tw + 12, 14); g.fillStyle = "#fff6c8"; g.fillText(msg, W / 2, 30); } }
    c.drawImage(lo, 0, 0, W * PX, H * PX);
  }
  function drawEnt(e, tt) {
    var x = Math.round(e.x - cam.x), b = gh(e.x, e.y), y = Math.round(e.y - cam.y - Math.max(0, b)), z = e.k === "w" ? e.z : 0, bob;
    if (e.k === "g" || e.k === "G") { bob = Math.sin(tt * 4 + e.t) * 2; R(x - 3, y + 2, 6, 2, "rgba(0,0,0,0.2)");
      if (e.k === "g") { R(x - 2, y - 6 + bob, 4, 6, "#ffe23a"); R(x - 3, y - 4 + bob, 6, 2, "#ffe23a"); R(x - 1, y - 6 + bob, 1, 2, "#ffffff"); }
      else { R(x - 3, y - 9 + bob, 6, 9, "#ff3ad8"); R(x - 4, y - 6 + bob, 8, 3, "#ff3ad8"); R(x - 2, y - 8 + bob, 2, 3, "#ffc8f0"); R(x + 1, y - 3 + bob, 2, 2, "#a81a8a"); } return; }
    if (e.k === "P" || e.k === "H") { var open = e.k === "H" || freedAll() >= REALMS[e.arg].need, cols = e.k === "H" ? ["#ffd23a", "#ff9a2a"] : { moor: ["#b86aff", "#ff5ad8"], mere: ["#3affff", "#ffd23a"], spires: ["#ff8a3a", "#ff3a8a"] }[e.arg];
      R(x - 12, y - 26, 4, 28, "#e8e0ff"); R(x + 8, y - 26, 4, 28, "#e8e0ff"); R(x - 12, y - 30, 24, 5, "#ffffff"); R(x - 8, y - 25, 16, 26, open ? cols[Math.floor(tt * 6) % 2] : "#3a2a5a");
      if (open) for (var i = 0; i < 4; i++) R(x - 6 + ((i * 5 + tt * 20) % 12), y - 22 + i * 6, 3, 2, "rgba(255,255,255,0.7)");
      g.font = "bold 7px sans-serif"; g.textAlign = "center"; g.fillStyle = "#ffffff"; g.fillText(e.k === "H" ? "Home" : REALMS[e.arg].name + (open ? "" : " (" + REALMS[e.arg].need + ")"), x, y - 33); return; }
    if (e.k === "b") { R(x - 6, y - 8, 12, 10, "#e8a83a"); R(x - 6, y - 8, 12, 2, "#ffd27a"); for (var j = 0; j < 3; j++) R(x - 5 + j * 4, y - 6, 2, 8, "#b8781a"); R(x - 7, y - 10, 14, 2, "#c8882a"); return; }
    if (e.k === "c") { if (e.open) { R(x - 7, y, 3, 3, "#3a6a2a"); R(x + 4, y, 3, 3, "#3a6a2a"); return; } drawCritter(["vole", "hog", "newt", "mole"][(e.id.length + e.x) % 4], x - 5, y - 9, tt, false);
      for (var q = 0; q < 6; q++) { R(x - 9 + q * 3, y - 16, 2, 18, "#2a7a3a"); R(x - 9 + q * 3, y - 16 + (q % 2) * 6, 1, 2, "#ff5a8a"); } R(x - 10, y - 18, 20, 3, "#1a5a2a"); R(x - 10, y + 1, 20, 2, "#1a5a2a"); return; }
    R(x - 5, y + 1, 10, 3, "rgba(0,0,0,0.22)"); y -= z;
    if (e.k === "s") { R(x - 6, y - 7, 12, 8, "#3a2ad8"); R(x - 4, y - 9, 8, 3, "#6a5aff"); R(x - 8, y - 6 + (Math.floor(tt * 6) % 2), 3, 3, "#ffd23a"); R(x + 5, y - 6 + (Math.floor(tt * 6 + 1) % 2), 3, 3, "#ffd23a"); R(x - 3, y - 6, 2, 2, "#ffffff"); R(x + 1, y - 6, 2, 2, "#ffffff"); }
    else if (e.k === "k") { R(x - 7, y - 11, 14, 12, "#1ab8a8"); R(x - 6, y - 12, 12, 3, "#7affea"); R(x - 1, y - 11, 2, 12, "#0a6a6a"); R(x - 4, y - 8, 2, 2, "#ffffff"); R(x + 2, y - 8, 2, 2, "#ffffff"); R(x - 8, y - 2, 3, 3, "#0a6a6a"); R(x + 5, y - 2, 3, 3, "#0a6a6a"); }
    else if (e.k === "w") { var f = Math.floor(tt * 14) % 2; R(x - 4, y - 6, 8, 6, "#ff3a8a"); R(x - 2, y - 6, 2, 6, "#ffd23a"); R(x - 9, y - 9 + f * 2, 5, 3, "rgba(255,255,255,0.8)"); R(x + 4, y - 9 + f * 2, 5, 3, "rgba(255,255,255,0.8)"); R(x + 2, y - 5, 2, 2, "#111"); }
  }
  function drawCritter(kind, x, y, tt, happy) {
    var c = { vole: ["#c8884a", "#ffd8a8"], hog: ["#8a6a4a", "#ffe0b8"], newt: ["#ff7a2a", "#ffd23a"], mole: ["#4a3a5a", "#ff9ab8"] }[kind] || ["#c8884a", "#ffd8a8"], hop = happy ? Math.abs(Math.sin(tt * 10)) * 3 : 0;
    R(x, y + 2 - hop, 10, 7, c[0]); R(x + 6, y - hop, 5, 5, c[0]); R(x + 9, y + 2 - hop, 2, 2, c[1]); R(x + 7, y + 1 - hop, 1, 1, "#111");
    if (kind === "hog") for (var i = 0; i < 4; i++) R(x + i * 2, y + 1 - hop, 1, 2, "#3a2a1a");
    if (kind === "newt") R(x - 3, y + 6 - hop, 4, 2, c[0]);
  }
  function drawHero(tt) {
    var h = hero, base = Math.max(-20, gh(h.x, h.y)), x = Math.round(h.x - cam.x), sy = Math.round(h.y - cam.y), y = Math.round(sy - h.z);
    if (base > -500) R(x - 6, sy - base - 1, 12, 4, "rgba(0,0,0,0.25)");
    if (h.inv > 0 && Math.floor(tt * 16) % 2) return;
    var side = Math.abs(h.fx) >= Math.abs(h.fy), F = h.fx >= 0, up = !side && h.fy < 0, step = Math.floor(h.walk / 8) % 2;
    var teal = "#14c8b0", dark = "#0a7a8a", gold = "#ffcc2a", wing = "#9af04a";
    function r(dx, dy, w, hh, col) { R(side && !F ? x - dx - w : x + dx, y + dy, w, hh, col); }
    if (h.glide || (!side && h.vz !== 0)) { r(-14, -12, 10, 5, wing); r(4, -12, 10, 5, wing); r(-12, -11, 6, 2, "#d8ff8a"); r(6, -11, 6, 2, "#d8ff8a"); }
    else { r(-6, -12, 5, 4, wing); }
    if (side) {
      r(-9, -6, 5, 3, teal); r(-11, -5, 3, 2, gold); // tail
      r(-5, -9, 10, 7, teal); r(-3, -4, 7, 2, gold); // body and belly
      r(-4, -2, 2, 2 + step, dark); r(2, -2, 2, 3 - step, dark);
      r(3, -14, 7, 6, teal); r(9, -12, 3, 3, teal); r(6, -12, 2, 2, "#ffffff"); r(7, -12, 1, 1, "#111"); r(3, -16, 2, 3, gold); r(6, -17, 2, 3, gold); // head, horns
      if (h.ch) { r(10, -15, 3, 2, "#ffffff"); r(12, -10, 4, 1, "rgba(255,255,255,0.6)"); }
    } else {
      R(x - 5, y - 9, 10, 8, teal); R(x - 3, y - 7, 6, 4, up ? teal : gold); R(x - 4, y - 1, 2, 1 + step, dark); R(x + 2, y - 1, 2, 2 - step, dark);
      R(x - 4, y - 15, 8, 7, teal); if (!up) { R(x - 3, y - 13, 2, 2, "#ffffff"); R(x + 1, y - 13, 2, 2, "#ffffff"); R(x - 2, y - 12, 1, 1, "#111"); R(x + 2, y - 12, 1, 1, "#111"); } else R(x - 1, y - 6, 2, 6, gold);
      R(x - 4, y - 17, 2, 3, gold); R(x + 2, y - 17, 2, 3, gold);
    }
  }

  // ---------- flow ----------
  function ending() { ui.stop(); mode = "end"; bump(); ui.runEnded(); A.playSong(SONGS.hub);
    ui.menu({ kicker: "Thistle Green", title: "The fen is free", body: "All twelve critters are home and Thistle Green throws a party. Fen counts " + gemsAll() + " gems and has a nap.", stats: '<b class="ff-score-xl">' + FF.n(scoreNow()) + "</b><span>HIGH SCORE " + FF.n(save.hi) + "</span>", buttons: [{ label: "Keep exploring", act: function () { mode = "play"; ui.go(); } }, { label: "Menu", small: true, act: toTitle }] }); }
  function play() { mode = "play"; enter("hub"); ui.go(); }
  function reset() { save.got = {}; save.freed = {}; ui.persist(); toTitle(); }
  function toTitle() { ui.stop(); mode = "title"; if (!M || realm !== "hub") { M = build("hub"); realm = "hub"; hero = newHero(M.start.x, M.start.y); } snap(); A.playSong(SONGS.hub); ui.setCourse("Thistle Green"); hud();
    ui.menu({ title: "FENWYRM", body: "Glide the gaps, charge the brambles, free the critters.", stats: "<span>HIGH SCORE " + (save.hi ? FF.n(save.hi) : "-") + "</span><span>FREED " + freedAll() + "/" + TOTAL + "</span>",
      buttons: [{ label: freedAll() || gemsAll() ? "Continue" : "Play", act: play }, { label: "New adventure", small: true, act: function () { ui.menu({ title: "Start again?", body: "This clears your gems and freed critters. Your high score stays.", buttons: [{ label: "Start again", act: reset }, { label: "Back", small: true, act: toTitle }] }); } }], app: true,
      help: ["Drag on the left of the screen (or arrow keys) to walk. Jump, then hold Jump to glide over gaps. Glide from high ground to go further.", "Hold Charge to run with your horns down: it breaks baskets, bramble cages and shiny beetles. Land on small foes to squash them.", "Free 3 critters to open Goldmere and 6 to open Saffron Spires. Your gems and critters are saved."],
      fine: "An original Forest Forge game." }); }
  var game = { toTitle: toTitle, onResize: sizeLo, update: function (dt) { if (mode === "play") update(dt); },
    render: render, idle: function (dt) { if (mode === "title" && M) { cam.x += Math.sin(ui.time * 0.2) * dt * 20; } },
    onBack: function () { if (mode === "play") { toTitle(); return true; } return false; },
    onPointer: function (type, x, y, id) { if (type === "pointerdown" && x < ui.VW * 0.5) stick = { on: true, id: id, ox: x, oy: y, x: x, y: y }; else if (type === "pointermove" && stick && stick.id === id) { stick.x = x; stick.y = y; } else if (type === "pointerup" && stick && stick.id === id) stick = null; } };
  ui.onAdsRemoved = function () { if (mode === "title") toTitle(); };
  game.qa = { enter: function (id) { mode = "play"; enter(id); ui.go(); }, state: function () { return { mode: mode, realm: realm, x: hero.x, y: hero.y, z: hero.z, hp: hero.hp, ch: hero.ch, glide: hero.glide, freed: freedAll(), gems: gemsAll(), score: scoreNow(), falls: game.falls || 0, foes: M.ents.filter(function (e) { return e.alive && "skw".indexOf(e.k) >= 0; }).length }; },
    warp: function (tx, ty) { hero.x = tx * TS + 8; hero.y = ty * TS + 8; hero.z = gh(hero.x, hero.y); hero.vz = 0; hero.safe = { x: hero.x, y: hero.y }; snap(); }, face: function (fx, fy) { hero.fx = fx; hero.fy = fy; }, heal: function () { hero.hp = 3; hero.inv = 99; }, ents: function () { return M.ents; }, M: function () { return M; }, reset: function () { save.got = {}; save.freed = {}; } };
  ui.start(game);
})();
