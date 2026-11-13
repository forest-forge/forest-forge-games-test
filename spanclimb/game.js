/* Spanclimb (Forest Forge). Pip the puffin climbs four sea stacks ahead of the rising tide,
 * throwing arched bunting bridges to stand on and to knock creatures into sweets.
 * Built on platform.js. Original game: all art drawn in code, all sound generated. */
(function () {
  "use strict";
  var clamp = FF.clamp, TS = PF.TS, LW = 20;
  var ui = FF.create({
    id: "spanclimb", title: "Spanclimb", course: "Puffin Rock", wide: true, view: { w: 640, h: 360, flex: true },
    stats: [{ id: "score", label: "Score", value: "0" }, { id: "lives", label: "Pip", value: "3" }],
    pads: { left: [{ id: "L", icon: "left", aria: "Left", keys: ["ArrowLeft", "KeyA"] }, { id: "R", icon: "right", aria: "Right", keys: ["ArrowRight", "KeyD"] }],
      right: [{ id: "B", label: "Bridge", aria: "Throw bridge", keys: ["KeyX", "KeyK", "ShiftLeft"] }, { id: "J", icon: "up", cls: "big", aria: "Jump", keys: ["Space", "ArrowUp", "KeyW", "KeyZ"] }] }
  });
  var A = ui.audio, save = ui.save; save.hi = save.hi || 0; save.open = save.open || 1;
  var PX = 2, lo = document.createElement("canvas"), g = lo.getContext("2d"), W = 320, H = 180, Q = 1;
  function sizeLo() { W = Math.ceil(ui.VW / PX); H = Math.ceil(ui.VH / PX); Q = FF.hdq ? FF.hdq(ui, PX) : 1; lo.width = Math.round(W * Q); lo.height = Math.round(H * Q); g.setTransform(Q, 0, 0, Q, 0, 0); g.imageSmoothingEnabled = false; g.hdQ = Q; }
  function R(x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  var PASTEL = ["#ffb3c8", "#ffd2a8", "#fff0a0", "#c4f2b4", "#b4e4ff", "#d4c4ff"], PASTEL_D = ["#e88aa8", "#e8ae80", "#e8d470", "#94d884", "#84c4f0", "#a894f0"];
  var STAGES = [
    { name: "Puffin Rock", h: 90, tide: 6.5, sky: ["#7ad0ff", "#d8f4ff"], stack: "#ffd8e8", seed: 3, gulls: 4, crabs: 6 },
    { name: "Lighthouse Stack", h: 105, tide: 7, sky: ["#5ac0ff", "#fff0d8"], stack: "#fff4c8", seed: 11, gulls: 6, crabs: 8 },
    { name: "Candyfloss Cliffs", h: 120, tide: 7.5, sky: ["#8ab8ff", "#ffd8f0"], stack: "#e8d8ff", seed: 23, gulls: 8, crabs: 10 },
    { name: "Pier's End", h: 135, tide: 8, sky: ["#4ab0f0", "#d8fff0"], stack: "#d8fff4", seed: 41, gulls: 10, crabs: 12 }
  ];
  function build(si) {
    var st = STAGES[si], r = rng(st.seed), h = st.h, rows = [], y, x;
    var grid = []; for (y = 0; y < h; y++) { var row = []; for (x = 0; x < LW; x++) row.push(x === 0 || x === LW - 1 || y >= h - 2 ? "#" : " "); grid.push(row); }
    var plats = [], prev = [{ a: 1, b: LW - 2 }];
    for (y = h - 5; y > 6; y -= 3) {
      var segs = [], p = prev[Math.floor(r() * prev.length)], mid = (p.a + p.b) / 2, len = 3 + Math.floor(r() * 5), c = clamp(mid + (r() * 2 - 1) * 6, 1 + len / 2, LW - 2 - len / 2), a = Math.round(c - len / 2);
      segs.push({ a: a, b: a + len - 1, y: y });
      if (r() < 0.55) { var len2 = 3 + Math.floor(r() * 4), a2 = 1 + Math.floor(r() * (LW - 2 - len2)); if (a2 > a + len + 1 || a2 + len2 < a - 1) segs.push({ a: a2, b: a2 + len2 - 1, y: y }); }
      segs.forEach(function (s) { for (var xx = s.a; xx <= s.b; xx++) grid[y][xx] = "="; plats.push(s); }); prev = segs;
    }
    for (x = 1; x < LW - 1; x++) grid[4][x] = "=";
    var top = { a: 1, b: LW - 2, y: 4 }; plats.push(top);
    // a ceiling cap above the summit
    for (x = 0; x < LW; x++) grid[0][x] = "#";
    var ents = [{ k: "goal", x: (LW / 2) * TS, y: 4 * TS - 12 }];
    var crabs = plats.filter(function (s) { return s.b - s.a >= 3 && s.y < h - 8 && s.y > 6; });
    for (var i = 0; i < st.crabs && crabs.length; i++) { var cs = crabs.splice(Math.floor(r() * crabs.length), 1)[0]; ents.push({ k: "crab", x: (cs.a + 1) * TS, y: cs.y * TS - 10, a: cs.a * TS, b: (cs.b + 1) * TS - 12, dir: r() < 0.5 ? -1 : 1 }); }
    for (var j = 0; j < st.gulls; j++) { var gy = Math.floor(10 + r() * (h - 25)); ents.push({ k: "gull", x: (2 + r() * 14) * TS, y: gy * TS, y0: gy * TS, dir: r() < 0.5 ? -1 : 1, t: r() * 6 }); }
    plats.forEach(function (s, n) { if (n % 2 === 0 && s.y < h - 4) ents.push({ k: "sweet", x: (s.a + r() * (s.b - s.a)) * TS + 4, y: s.y * TS - 12, v: 50, c: Math.floor(r() * 6) }); });
    return { L: PF.Level(grid.map(function (rw) { return rw.join(""); }), { theme: {}, seed: si }), ents: ents, h: h };
  }

  // ---------- sound ----------
  var S = {
    jump: function () { A.tone({ f: 420, f2: 760, dur: 0.1, type: "triangle", gain: 0.08 }); },
    throw: function () { [660, 880, 1100, 1320].forEach(function (f, i) { A.tone({ f: f, dur: 0.05, type: "triangle", gain: 0.06, delay: i * 0.04 }); }); },
    pop: function () { A.tone({ f: 900, f2: 300, dur: 0.12, type: "square", gain: 0.06 }); A.noise({ dur: 0.1, gain: 0.08, freq: 1500, filter: "bandpass" }); },
    sweet: function () { A.tone({ f: 1320, dur: 0.05, type: "triangle", gain: 0.07 }); A.tone({ f: 1760, dur: 0.07, type: "triangle", gain: 0.07, delay: 0.05 }); },
    snap: function () { A.noise({ dur: 0.15, gain: 0.1, freq: 900, filter: "lowpass" }); },
    hurt: function () { A.tone({ f: 600, f2: 150, dur: 0.4, type: "sawtooth", gain: 0.08 }); },
    splash: function () { A.noise({ dur: 0.5, gain: 0.15, freq: 800, filter: "lowpass" }); },
    win: function () { [523, 659, 784, 1047, 0, 1047, 1319, 1568].forEach(function (f, i) { if (f) A.tone({ f: f, dur: 0.14, type: "triangle", gain: 0.09, delay: i * 0.1 }); }); }
  };
  var SONG = { bpm: 132, order: [0, 1, 0, 2], parts: [[
    { wave: "triangle", gain: 0.11, pat: "G5 . E5 . C5 . E5 G5 A5 . G5 . E5 . . . F5 . D5 . B4 . D5 F5 G5 . F5 . D5 . . ." },
    { wave: "square", gain: 0.025, pat: "C4 E4 G4 E4 C4 E4 G4 E4 A3 C4 E4 C4 A3 C4 E4 C4 D4 F4 A4 F4 D4 F4 A4 F4 G3 B3 D4 B3 G3 B3 D4 B3" },
    { wave: "triangle", gain: 0.17, pat: "C3 . . . G2 . . . A2 . . . E2 . . . D3 . . . A2 . . . G2 . . . G2 . B2 ." },
    { wave: "drum", pat: "k . h . s . h . k . h . s . h h k . h . s . h . k . h . s . h o" }], [
    { wave: "triangle", gain: 0.11, pat: "E5 . G5 . C6 . B5 A5 G5 . E5 . C5 . D5 E5 F5 . A5 . G5 F5 E5 D5 C5 . . . . . . ." },
    { wave: "square", gain: 0.025, pat: "C4 E4 G4 E4 C4 E4 G4 E4 A3 C4 E4 C4 A3 C4 E4 C4 F3 A3 C4 A3 G3 B3 D4 B3 C4 E4 G4 E4 C4 . . ." },
    { wave: "triangle", gain: 0.17, pat: "C3 . . . C3 . . . A2 . . . A2 . . . F2 . . . G2 . . . C3 . . . C3 . . ." },
    { wave: "drum", pat: "k . h . s . h . k . h . s . h h k . h . s . h . k k h . s s o ." }], [
    { wave: "triangle", gain: 0.11, pat: "A5 . F5 . D5 . F5 A5 B5 . A5 . F5 . . . G5 . E5 . C5 . E5 G5 C6 - - - . . . ." },
    { wave: "square", gain: 0.025, pat: "D4 F4 A4 F4 D4 F4 A4 F4 G3 B3 D4 B3 G3 B3 D4 B3 C4 E4 G4 E4 C4 E4 G4 E4 C4 E4 G4 E4 C4 . . ." },
    { wave: "triangle", gain: 0.17, pat: "D3 . . . A2 . . . G2 . . . D2 . . . C3 . . . G2 . . . C3 . . . C2 . . ." },
    { wave: "drum", pat: "k . h . s . h . k . h . s . h h k . h . s . h . k . s . s s o ." }]] };

  // ---------- state ----------
  var mode = "title", si = 0, lv, L, hero, cam = { x: 0, y: 0 }, bridges = [], pieces = [], foes = [], items = [], parts = PF.Parts(), tide = 0, lives = 3, score = 0, tm = 0, won = 0, dead = 0, god = false, jellyT = 3;
  var boss = null, irisT = 0, bannerT = 0;
  function hitBoss() { var b = boss; if (!b || !b.alive || b.inv > 0) return; b.hp--; b.inv = 0.7; S.pop(); parts.add(b.x + 14, b.y + 8, 16, b.col, 110, 0.7); score += 300; hud(); if (b.hp <= 0) { b.alive = false; score += 3000; hud(); parts.add(b.x + 14, b.y + 8, 40, "#ffffff", 160, 1); S.win(); } }
  function stepBoss(dt) {
    var b = boss, h = hero; if (!b || !b.alive) return; if (!b.seen && h.y < 12 * TS) { b.seen = true; bannerT = 2.2; } if (!b.seen) return;
    b.t += dt; if (b.inv > 0) b.inv -= dt; var sp = 34 + si * 8; b.x += b.dir * sp * dt; if (b.x < 1.2 * TS) { b.x = 1.2 * TS; b.dir = 1; } if (b.x > (LW - 1.2) * TS - b.w) { b.x = (LW - 1.2) * TS - b.w; b.dir = -1; }
    if (b.t > 2.6 - si * 0.25) { b.t = 0; foes.push({ k: "bubble", x: b.x + 12, y: b.y - 4, w: 8, h: 8, alive: true, t: 0, vx: (h.x > b.x ? 1 : -1) * (40 + si * 10), vy: -60 }); }
    bridges.forEach(function (br) { if (br.p >= 1) return; arcPts(br).forEach(function (p) { if (p.x > b.x - 2 && p.x < b.x + b.w + 2 && p.y > b.y - 2 && p.y < b.y + b.h + 2) hitBoss(); }); });
    pieces.forEach(function (p) { if (p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h) hitBoss(); });
    if (PF.aabb({ x: h.x + 1, y: h.y + 2, w: h.w - 2, h: h.h - 2 }, b)) hurt();
  }
  function drawBoss(tt, cx, cy) {
    var b = boss; if (!b || !b.alive) return; if (b.inv > 0 && Math.floor(tt * 14) % 2) return; var x = Math.round(b.x - cx), y = Math.round(b.y - cy), w2 = Math.floor(tt * 6) % 2, c = b.col, d = FXP.shade(c, -0.3);
    for (var l = 0; l < 3; l++) { R(x + 3 + l * 4, y + 14 + ((l + w2) % 2), 2, 4, d); R(x + 19 + l * 3, y + 14 + ((l + 1 + w2) % 2), 2, 4, d); }
    g.fillStyle = d; g.beginPath(); g.ellipse(x + 14, y + 11, 14, 7, 0, 0, 7); g.fill(); g.fillStyle = c; g.beginPath(); g.ellipse(x + 14, y + 10, 13, 6, 0, 0, 7); g.fill();
    R(x + 7, y + 7, 14, 2, FXP.shade(c, 0.35)); R(x - 6, y + 2 - w2 * 2, 8, 6, c); R(x - 6, y + 2 - w2 * 2, 3, 3, "#ffffff"); R(x + 26, y + 2 - (1 - w2) * 2, 8, 6, c); R(x + 31, y + 2 - (1 - w2) * 2, 3, 3, "#ffffff");
    R(x + 9, y - 1, 2, 5, d); R(x + 17, y - 1, 2, 5, d); R(x + 8, y - 3, 4, 4, "#ffffff"); R(x + 16, y - 3, 4, 4, "#ffffff"); R(x + 9 + (hero.x > b.x ? 1 : 0), y - 2, 2, 2, "#111"); R(x + 17 + (hero.x > b.x ? 1 : 0), y - 2, 2, 2, "#111");
    R(x + 4, y - 7, 20, 3, "#1a1a3a"); R(x + 9, y - 11, 10, 4, "#1a1a3a"); R(x + 4, y - 5, 20, 1, "#ffe23a");
  }
  function load(i, keep) {
    si = i; lv = build(i); L = lv.L; bridges = []; pieces = []; parts.clear(); tm = 0; won = 0; dead = 0; jellyT = 3;
    foes = lv.ents.filter(function (e) { return e.k === "crab" || e.k === "gull"; }).map(function (e) { var f = Object.assign({}, e); f.w = 12; f.h = 10; f.alive = true; return f; });
    items = lv.ents.filter(function (e) { return e.k === "sweet" || e.k === "goal"; }).map(function (e) { return Object.assign({}, e); });
    hero = { x: 3 * TS, y: (lv.h - 2) * TS - 14, w: 10, h: 14, vx: 0, vy: 0, face: 1, ground: false, coyote: 0, buffer: 0, inv: 1, ph: 0, on: null };
    var BN = [["Old Nipper", "#ff5a8a"], ["Captain Clatterclaw", "#ff9a3a"], ["Madame Pincer", "#b05aff"], ["The Pier Crab", "#2ab0ff"]];
    boss = { x: (LW / 2) * TS - 14, y: 4 * TS - 18, w: 28, h: 18, hp: 3 + i, max: 3 + i, dir: 1, inv: 0, alive: true, seen: false, name: BN[i][0], col: BN[i][1], t: 0 }; irisT = 1; bannerT = 0;
    tide = L.ph + 120; cam.y = hero.y - H * 0.55; ui.setCourse(STAGES[i].name); hud();
  }
  function hud() { ui.setStat("score", FF.n(score)); ui.setStat("lives", String(lives)); }
  // bunting bridge: arc from (x0, y0) spanning 56px in dir, rising 18px
  var SPAN = 56, RISE = 12;
  function surf(b, px) { var u = (px - b.x0) / (SPAN * b.dir); if (u < 0 || u > b.p) return null; return b.y0 - Math.sin(Math.PI * u) * RISE; }
  function throwBridge() { if (bridges.length >= 3) bridges.shift(); var h = hero; bridges.push({ x0: h.face > 0 ? h.x + h.w - 2 : h.x + 2, y0: h.y + h.h, dir: h.face, p: 0, life: 5.5 }); S.throw(); }
  function arcPts(b) { var pts = []; for (var u = 0; u <= b.p + 1e-6; u += 0.1) pts.push({ x: b.x0 + u * SPAN * b.dir, y: b.y0 - Math.sin(Math.PI * u) * RISE }); return pts; }
  function popFoe(f) { f.alive = false; score += 200; S.pop(); parts.add(f.x + 6, f.y + 5, 12, PASTEL[Math.floor(Math.random() * 6)], 80, 0.6); items.push({ k: "sweet", x: f.x + 2, y: f.y, v: 300, c: Math.floor(Math.random() * 6), vy: -120, fall: 1 }); hud(); }
  function hurt() { var h = hero; if (h.inv > 0 || god) return; loseLife("hit"); }
  function loseLife(why) { if (dead) return; dead = 1.5; lives--; (why === "tide" ? S.splash : S.hurt)(); game.deaths = (game.deaths || []).concat([[si, why, Math.round(hero.y / TS)]]); hud(); }
  function respawn() { if (lives <= 0) return gameOver(); var h = hero, best = null; // highest safe platform at or below the hero, well above the tide
    for (var ty = Math.min(lv.h - 2, Math.floor((tide - 5 * TS) / TS)); ty > 4; ty--) { for (var tx = 1; tx < LW - 1; tx++) if (L.flag(tx, ty, "oneway") || (L.solid(tx, ty) && !L.solid(tx, ty - 1))) { best = { x: tx * TS + 2, y: ty * TS - h.h }; break; } if (best) break; }
    if (!best) best = { x: 3 * TS, y: (lv.h - 2) * TS - 14 }; h.x = best.x; h.y = best.y; h.vx = h.vy = 0; h.inv = 2.5; tide = Math.max(tide, best.y + h.h + 7 * TS); dead = 0; bridges = []; }

  function update(dt) {
    tm += dt; var h = hero, st = STAGES[si];
    if (won) { won -= dt; parts.step(dt); if (won <= 0) stageClear(); return; }
    if (dead) { dead -= dt; parts.step(dt); if (dead <= 0) respawn(); return; }
    if (h.inv > 0) h.inv -= dt;
    var dir = (ui.down("L") ? -1 : 0) + (ui.down("R") ? 1 : 0);
    h.vx = dir * 105; if (dir) h.face = dir;
    if (ui.hit("J")) h.buffer = 0.1; h.buffer -= dt; h.coyote -= dt;
    if (h.buffer > 0 && h.coyote > 0) { h.vy = -340; h.buffer = 0; h.coyote = 0; h.on = null; S.jump(); }
    if (!ui.down("J") && h.vy < -120) h.vy = -120;
    h.vy = Math.min(380, h.vy + 900 * dt);
    if (ui.hit("B")) throwBridge();
    var prevFeet = h.y + h.h, r = PF.move(L, h, dt), onB = null;
    // bridges: land on arcs
    if (h.vy >= 0) bridges.forEach(function (b) { var sy = surf(b, h.x + h.w / 2); if (sy == null) return; if (prevFeet <= sy + 3 && h.y + h.h >= sy - 1 && !(r.ground && h.y + h.h < sy)) { if (h.vy > 330 && !b.hard) { b.broken = 1; return; } h.y = sy - h.h; h.vy = 0; onB = b; } });
    if (r.ground || onB) { h.ground = true; h.coyote = 0.08; } else h.ground = false;
    h.ph += Math.abs(h.vx) * dt * 0.2;
    // bridges grow, live, hit foes, break into falling pieces
    bridges.forEach(function (b) { b.p = Math.min(1, b.p + dt / 0.2); b.life -= dt; var pts = arcPts(b); foes.forEach(function (f) { if (f.alive && pts.some(function (p) { return p.x > f.x - 2 && p.x < f.x + f.w + 2 && p.y > f.y - 2 && p.y < f.y + f.h + 2; }) && b.p < 1) popFoe(f); });
      if (b.broken) { S.snap(); pts.forEach(function (p, n) { pieces.push({ x: p.x, y: p.y, vy: 0, c: n % 6 }); }); } });
    bridges = bridges.filter(function (b) { return b.life > 0 && !b.broken; });
    pieces.forEach(function (p) { p.vy += 700 * dt; p.y += p.vy * dt; foes.forEach(function (f) { if (f.alive && p.x > f.x - 2 && p.x < f.x + f.w + 2 && p.y > f.y && p.y < f.y + f.h) popFoe(f); }); }); pieces = pieces.filter(function (p) { return p.y < tide + 40; });
    // foes
    foes.forEach(function (f) { if (!f.alive) return;
      if (f.k === "crab") { f.x += f.dir * 28 * dt; if (f.x < f.a) { f.x = f.a; f.dir = 1; } if (f.x > f.b) { f.x = f.b; f.dir = -1; } }
      else if (f.k === "gull") { f.t += dt; f.x += f.dir * 45 * dt; if (f.x < TS || f.x > (LW - 1) * TS - f.w) f.dir *= -1; f.y = f.y0 + Math.sin(f.t * 2) * 10; }
      else if (f.k === "bubble") { f.t += dt; f.vy += 120 * dt; f.x += f.vx * dt; f.y += f.vy * dt; if (f.t > 4 || f.x < 0 || f.x > LW * TS) f.alive = false; }
      else if (f.k === "jelly") { f.t += dt; f.y -= 22 * dt; f.x += Math.sin(f.t * 3) * 12 * dt; if (f.y < cam.y - 40) f.alive = false; }
      if (PF.aabb({ x: h.x + 1, y: h.y + 2, w: h.w - 2, h: h.h - 2 }, f)) hurt(); });
    if (foes.length > 60) foes = foes.filter(function (f) { return f.alive; });
    jellyT -= dt; if (jellyT <= 0) { jellyT = 5 - si * 0.6; foes.push({ k: "jelly", x: (2 + Math.random() * 15) * TS, y: tide - 6, w: 10, h: 10, alive: true, t: 0 }); }
    stepBoss(dt);
    // items
    items.forEach(function (it) { if (it.got) return; if (it.fall) { it.vy += 600 * dt; it.y += it.vy * dt; var ty = Math.floor((it.y + 8) / TS), tx = Math.floor((it.x + 4) / TS); if (it.vy > 0 && (L.solid(tx, ty) || L.flag(tx, ty, "oneway")) && it.y + 8 <= ty * TS + 6) { it.y = ty * TS - 8; it.vy = 0; it.fall = 0; } }
      if (PF.aabb(h, { x: it.x, y: it.y, w: 8, h: 8 })) { if (it.k === "goal" && boss && boss.alive) { } else if (it.k === "goal") { won = 2.2; S.win(); score += 1000 + Math.max(0, Math.round((tide - h.y) / TS) * 20); if (score > save.hi) save.hi = score; if (si + 2 > save.open) save.open = Math.min(STAGES.length, si + 2); ui.persist(); hud(); return; } it.got = 1; score += it.v; S.sweet(); hud(); } });
    // tide
    if (!(boss && boss.alive && boss.seen)) tide -= st.tide * dt * (1 + tm / 300); if (h.y + h.h > tide + 4) loseLife("tide");
    if (h.y > L.ph) loseLife("tide");
    cam.x = (L.pw - W) / 2; var ty2 = h.y - H * 0.55; cam.y += (ty2 - cam.y) * Math.min(1, dt * 5); cam.y = clamp(cam.y, -20, L.ph - H + 10);
    parts.step(dt);
  }

  // ---------- render ----------
  function render(c, tt) {
    if (!W) sizeLo(); if (!L) load(0);
    var st = STAGES[si], cx = Math.round(cam.x), cy = Math.round(cam.y);
    var gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, FXP.shade(st.sky[0], -0.1)); gr.addColorStop(0.5, st.sky[0]); gr.addColorStop(1, st.sky[1]); g.fillStyle = gr; g.fillRect(0, 0, W, H); FXP.glow(g, W * 0.78, H * 0.18, 80, "#fff8d0", 0.5);
    for (var ck = 0; ck < 5; ck++) FXP.cloud(g, ((ck * 131 + tt * (3 + ck)) % (W + 120)) - 60, ((ck * 47 - cy * 0.08) % (H + 60) + H + 60) % (H + 60) - 30, 5 + ck % 3 * 2, "rgba(255,255,255,0.9)", "rgba(150,190,240,0.35)");
    var gP = g; g = FXP.layer(W, H, { round: 4 });
    for (var k = 0; k < 6; k++) { var bx = ((k * 83 + tt * 6 * (k % 2 ? 1 : 0.6)) % (W + 80)) - 40, by = ((k * 57 - cy * 0.2) % (H + 40) + H + 40) % (H + 40) - 20; R(bx, by, 34, 8, "rgba(255,255,255,0.85)"); R(bx + 6, by - 5, 18, 6, "rgba(255,255,255,0.85)"); }
    for (var s2 = 0; s2 < 5; s2++) { var sx = s2 * 90 - 30 - (cx * 0.2), sh = 60 + (s2 * 37) % 50; R(sx, H - sh + 40 - cy * 0.05 % 20, 26, sh, st.stack); R(sx + 4, H - sh + 36 - cy * 0.05 % 20, 18, 6, st.stack); }
    g = gP; FXP.flush(g, null, false, { props: true, top: H * 0.45, bottom: H, light: 0.2, dark: 0.16 });
    // tiles (soft tile layer: rounded outer corners on the stack walls, rounded ends on ledges)
    var gT = g; g = FXP.tileLayer(W, H);
    var y0 = Math.max(0, Math.floor(cy / TS)), y1 = Math.min(L.h - 1, Math.floor((cy + H) / TS) + 1);
    for (var ty = y0; ty <= y1; ty++) for (var tx = 0; tx < L.w; tx++) { var ch = L.get(tx, ty), px = tx * TS - cx, py = ty * TS - cy, band = Math.floor(ty / 6) % 6;
      if (ch === "=") { var le = L.get(tx - 1, ty) !== "=", re = L.get(tx + 1, ty) !== "=", rl = le ? 3 : 0, rr2 = re ? 3 : 0;
        g.fillStyle = PASTEL_D[band]; g.beginPath(); g.roundRect(px, py + 1, TS, 8, [rl, rr2, rr2, rl]); g.fill();
        g.fillStyle = PASTEL[band]; g.beginPath(); g.roundRect(px, py, TS, 7, [rl, rr2, rr2, rl]); g.fill();
        g.fillStyle = "rgba(255,255,255,0.85)"; g.beginPath(); g.roundRect(px + (le ? 1.5 : 0), py + 0.6, TS - (le ? 1.5 : 0) - (re ? 1.5 : 0), 1.6, 0.8); g.fill();
        if ((tx + ty) % 3 === 0) { g.fillStyle = PASTEL_D[band]; g.beginPath(); g.arc(px + 7, py + 4, 1.1, 0, 7); g.fill(); } }
      else if (ch === "#") { R(px, py, TS, TS, ty >= L.h - 2 ? "#fff4d8" : "#ffffff"); R(px, py + (ty % 2 ? 4 : 11), TS, 1, PASTEL[band]); R(px + (ty % 2 ? 5 : 11), py, 1, TS, "#e8f0ff"); } }
    g = gT; FXP.tileFlush(g, function (tx, ty) { return L.get(tx, ty) === "#" && tx >= 0 && tx < L.w; }, { x: cx, y: cy }, TS, { r: 4, line: "rgba(120,150,200,0.45)" });
    // side margins when the screen is wider than the stack
    if (cx < 0) { R(0, 0, -cx, H, "rgba(255,255,255,0.35)"); R(L.pw - cx, 0, W, H, "rgba(255,255,255,0.35)"); }
    items.forEach(function (it) { if (it.got) return; var x = Math.round(it.x - cx), y = Math.round(it.y - cy); if (y < -20 || y > H + 20) return;
      if (it.k === "goal" && boss && boss.alive) return;
      if (it.k === "goal") { R(x - 1, y - 40, 3, 40, "#ffffff"); for (var b = 0; b < 4; b++) { R(x + 2, y - 40 + b * 6, 10 - b * 2, 5, PASTEL_D[b]); } R(x - 8, y - 6, 18, 6, "#ff8ab0"); return; }
      R(x, y + 2, 8, 5, PASTEL_D[it.c]); R(x + 2, y, 4, 9, PASTEL_D[it.c]); R(x + 2, y + 2, 2, 2, "#ffffff"); });
    bridges.forEach(function (b) { var pts = arcPts(b), fade = b.life < 1 && Math.floor(tt * 12) % 2; if (fade) return; for (var n = 0; n < pts.length - 1; n++) { var p = pts[n], q = pts[n + 1]; for (var u = 0; u < 1; u += 0.2) R(p.x + (q.x - p.x) * u - cx, p.y + (q.y - p.y) * u - cy, 2, 2, "#ffffff"); if (n % 1 === 0) { var fx = p.x - cx, fy = p.y - cy + 1; g.fillStyle = ["#ff8ab0", "#ffffff", "#7ac0ff"][n % 3]; g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx + 5 * b.dir, fy); g.lineTo(fx + 2.5 * b.dir, fy + 6); g.closePath(); g.fill(); } } });
    pieces.forEach(function (p) { g.fillStyle = PASTEL_D[p.c]; g.beginPath(); g.moveTo(p.x - cx, p.y - cy); g.lineTo(p.x - cx + 5, p.y - cy); g.lineTo(p.x - cx + 2.5, p.y - cy + 6); g.closePath(); g.fill(); });
    var g0 = g; g = FXP.layer(W, H); drawBoss(tt, cx, cy);
    foes.forEach(function (f) { if (!f.alive) return; if (f.k === "bubble") { var bx2 = Math.round(f.x - cx), by2 = Math.round(f.y - cy); g.fillStyle = "rgba(200,240,255,0.85)"; g.beginPath(); g.arc(bx2 + 4, by2 + 4, 4, 0, 7); g.fill(); R(bx2 + 2, by2 + 2, 2, 2, "#ffffff"); return; } var x = Math.round(f.x - cx), y = Math.round(f.y - cy), w2 = Math.floor(tt * 8) % 2; if (y < -20 || y > H + 20) return;
      if (f.k === "crab") { R(x, y + 3, 12, 6, "#ff7a9a"); R(x - 2, y + w2, 4, 4, "#ff7a9a"); R(x + 10, y + 1 - w2, 4, 4, "#ff7a9a"); R(x + 3, y + 1, 2, 2, "#fff"); R(x + 7, y + 1, 2, 2, "#fff"); R(x + 4, y + 1, 1, 1, "#111"); R(x + 8, y + 1, 1, 1, "#111"); R(x + 1, y + 9, 2, 1, "#e85a7a"); R(x + 9, y + 9, 2, 1, "#e85a7a"); }
      else if (f.k === "gull") { R(x + 2, y + 3, 9, 5, "#ffffff"); R(f.dir > 0 ? x + 10 : x, y + 2, 3, 3, "#ffffff"); R(f.dir > 0 ? x + 13 : x - 2, y + 3, 2, 1, "#ffb84a"); R(x + 3, y + (w2 ? -1 : 4), 7, 2, "#c8d8e8"); R(f.dir > 0 ? x + 11 : x + 1, y + 3, 1, 1, "#111"); }
      else { R(x, y, 10, 6, "rgba(216,180,255,0.9)"); R(x + 1, y + 6, 1, 4 + w2, "#d8b4ff"); R(x + 4, y + 6, 1, 5 - w2, "#d8b4ff"); R(x + 8, y + 6, 1, 4 + w2, "#d8b4ff"); R(x + 2, y + 1, 2, 2, "#ffffff"); } });
    if (mode !== "title" && (!dead) && (hero.inv <= 0 || Math.floor(tt * 14) % 2)) drawPip(tt);
    g = g0; FXP.flush(g, "#1a3a6a");
    parts.draw(g, cam);
    // tide
    var wy = Math.round(tide - cy); if (wy < H) { R(0, wy, W, H - wy, "rgba(40,150,230,0.72)"); for (var wx = 0; wx < W; wx += 12) R(wx + (Math.floor(tt * 10) % 12), wy - 1 + ((wx / 12) % 2), 8, 2, "#ffffff"); }
    if (mode === "play") { var gap = Math.max(0, Math.round((tide - hero.y - hero.h) / TS)); g.font = "bold 8px sans-serif"; g.textAlign = "left"; g.fillStyle = gap < 4 ? "#ff3a6a" : "#1a5a9a"; g.fillText("TIDE " + gap, 4, 10); var ht = Math.max(0, Math.round((L.ph - hero.y) / TS) - 2); g.fillStyle = "#1a5a9a"; g.textAlign = "right"; g.fillText(Math.min(100, Math.round(100 * ht / (lv.h - 6))) + "% UP", W - 4, 10); }
    FXP.ambient(g, W, H, { x: cx, y: cy }, tt, "drift", "rgba(255,255,255,0.85)", 16); FXP.vignette(g, W, H, 0.28);
    if (boss && boss.seen && boss.alive) { var bw = 90, bx3 = W / 2 - bw / 2; R(bx3 - 1, H - 13, bw + 2, 7, "#1a3a6a"); R(bx3, H - 12, bw * boss.hp / boss.max, 5, boss.col); R(bx3, H - 12, bw * boss.hp / boss.max, 1, "#ffffff"); if (bannerT > 0) FXP.banner(g, boss.name, W / 2, H * 0.4, 14, boss.col); }
    if (bannerT > 0) bannerT -= 1 / 60; if (irisT > 0) { FXP.iris(g, W, H, irisT, hero.x - cx, hero.y - cy); irisT -= 1 / 40; }
    c.imageSmoothingEnabled = Q > 1; c.drawImage(lo, 0, 0, W * PX, H * PX); c.imageSmoothingEnabled = false;
  }
  function drawPip(tt) {
    var h = hero, x = Math.round(h.x - cam.x), y = Math.round(h.y - cam.y), F = h.face > 0, step = h.ground && h.vx ? Math.floor(h.ph) % 2 : 0;
    function r(dx, dy, w, hh, col) { R(F ? x + dx : x + h.w - dx - w, y + dy, w, hh, col); }
    r(0, 3, 9, 9, "#1a1a2a"); r(3, 5, 6, 7, "#ffffff"); r(4, 0, 6, 5, "#1a1a2a"); r(6, 1, 4, 3, "#ffffff"); r(8, 2, 1, 1, "#111");
    r(10, 1, 3, 2, "#ff7a2a"); r(10, 3, 2, 1, "#ffcf3a"); r(1, h.ground ? 6 : 4, 3, h.ground ? 4 : 3, "#2a2a3a");
    r(2 + step, 12, 3, 2, "#ff7a2a"); r(6 - step, 12, 3, 2, "#ff7a2a");
    if (!h.ground) { r(-2, 4, 3, 2, "#2a2a3a"); }
    r(0, 6, 2, 3, PASTEL_D[Math.floor(tt * 4) % 6]); // bunting satchel
  }

  // ---------- flow ----------
  function stageClear() { ui.stop(); mode = "clear"; A.stopSong(); var last = si + 1 >= STAGES.length; if (last) ui.runEnded(); if (score > save.hi) save.hi = score; ui.persist();
    ui.menu({ kicker: STAGES[si].name, title: last ? "Top of the world!" : "Stack climbed", body: last ? "Pip reaches the end of the pier and the tide gives up for the day." : "The tide is still coming. On to " + STAGES[si + 1].name + ".", stats: '<b class="ff-score-xl">' + FF.n(score) + "</b><span>TIME " + FF.fmtTime(tm) + "</span>",
      buttons: last ? [{ label: "Menu", act: toTitle }] : [{ label: "Next stack", act: function () { mode = "play"; load(si + 1); ui.go(); A.playSong(SONG); } }, { label: "Menu", small: true, act: toTitle }] }); }
  function gameOver() { ui.stop(); mode = "over"; A.stopSong(); ui.runEnded(); var hi = score > save.hi; if (hi) save.hi = score; ui.persist();
    ui.menu({ title: "Washed off", body: "The tide caught Pip on " + STAGES[si].name + ".", stats: '<b class="ff-score-xl">' + FF.n(score) + "</b><span>" + (hi ? "NEW HIGH SCORE" : "HIGH SCORE " + FF.n(save.hi)) + "</span>", buttons: [{ label: "Try " + STAGES[si].name + " again", act: function () { play(si); } }, { label: "Menu", small: true, act: toTitle }] }); }
  function play(i) { mode = "play"; lives = 3; score = 0; load(i); ui.go(); A.playSong(SONG); }
  function toTitle() { ui.stop(); mode = "title"; load(0); A.playSong(SONG);
    ui.menu({ title: "SPANCLIMB", body: "Climb the sea stacks. Throw bunting bridges. Beat the tide.", stats: "<span>HIGH SCORE " + (save.hi ? FF.n(save.hi) : "-") + "</span><span>STACKS " + save.open + "/" + STAGES.length + "</span>",
      buttons: [{ label: "Play", act: function () { play(Math.min(save.open, STAGES.length) - 1); } }], row: STAGES.map(function (s, i) { return { label: String(i + 1), disabled: i >= save.open, act: function () { play(i); } }; }), app: true,
      help: ["◀ ▶ waddle, Jump (hold for higher). You can jump up through the coloured ledges.", "Bridge throws an arch of bunting in front of you: stand on it to climb, and fling it at crabs, gulls and jellyfish to turn them into sweets. Drop onto a bridge from high up and it snaps, and the falling flags knock out whatever is below.", "The tide keeps rising. Reach the flag at the top of each stack."],
      fine: "An original Forest Forge game." }); }
  var game = { toTitle: toTitle, onResize: sizeLo, update: function (dt) { if (mode === "play") update(dt); }, render: render, idle: function (dt) { if (mode === "title" && L) { cam.x = (L.pw - W) / 2; cam.y -= dt * 25; if (cam.y < 0) cam.y = L.ph - H; } }, onBack: function () { if (mode === "play") { toTitle(); return true; } return false; } };
  ui.onAdsRemoved = function () { if (mode === "title") toTitle(); };
  game.qa = { boss: function () { return boss && { x: boss.x, y: boss.y, hp: boss.hp, alive: boss.alive, seen: boss.seen }; }, toTop: function () { hero.x = 3 * TS; hero.y = 6 * TS; hero.vy = 0; tide = 18 * TS; }, play: play, god: function (v) { god = v; }, lives: function (n) { lives = n; }, L: function () { return L; }, foes: function () { return foes; },
    state: function () { return { mode: mode, si: si, x: hero.x, y: hero.y, tx: Math.floor((hero.x + 5) / TS), ty: Math.floor((hero.y + hero.h - 1) / TS), ground: hero.ground, tide: tide, lives: lives, won: won, dead: dead, score: score, bridges: bridges.length, h: lv.h }; } };
  ui.start(game);
})();
