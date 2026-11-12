/* Canopy Carts (Forest Forge). Juniper the otter and Sprig the red squirrel race
 * through the Great Glasshouse: seed-pod cannons, vine swings, rail carts in the
 * fern caves, and a buddy to swap to. Four stages. Built on platform.js.
 * Original game: all art drawn in code, all sound generated (shell.js). */
(function () {
  "use strict";
  var clamp = FF.clamp, TS = PF.TS;
  PF.TILES["-"] = { oneway: 1, rail: 1 };
  var ui = FF.create({
    id: "canopy-carts", title: "Canopy Carts", course: "Great Glasshouse", wide: true, view: { w: 640, h: 360, flex: true },
    stats: [{ id: "fruit", label: "Fruit", value: "0" }, { id: "score", label: "Score", value: "0" }],
    pads: {
      left: [{ id: "L", icon: "left", aria: "Left", keys: ["ArrowLeft", "KeyA"] }, { id: "R", icon: "right", aria: "Right", keys: ["ArrowRight", "KeyD"] }],
      right: [{ id: "S", label: "Swap", aria: "Swap buddy", keys: ["KeyC", "KeyQ", "Tab"] }, { id: "A", label: "Dash", aria: "Dash", keys: ["KeyX", "KeyK", "ShiftLeft"] }, { id: "J", icon: "up", cls: "big", aria: "Jump", keys: ["Space", "ArrowUp", "KeyW", "KeyZ"] }]
    }
  });
  var A = ui.audio, save = ui.save; save.hi = save.hi || 0; save.open = save.open || 1; save.best = save.best || {};
  var PX = 2, lo = document.createElement("canvas"), g = lo.getContext("2d"), W = 320, H = 180;
  function sizeLo() { W = Math.ceil(ui.VW / PX); H = Math.ceil(ui.VH / PX); lo.width = W; lo.height = H; g.imageSmoothingEnabled = false; }
  function R(x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }

  // ---------- stages ----------
  var HT = 16;
  function Map(w) { var gr = []; for (var y = 0; y < HT; y++) { var r = []; for (var x = 0; x < w; x++) r.push(" "); gr.push(r); }
    var m = { r: function (x0, y0, x1, y1, c) { for (var y = Math.max(0, y0); y <= Math.min(HT - 1, y1); y++) for (var x = Math.max(0, x0); x <= Math.min(w - 1, x1); x++) gr[y][x] = c; }, p: function (x, y, c) { if (x >= 0 && x < w && y >= 0 && y < HT) gr[y][x] = c; }, rows: function () { return gr.map(function (r) { return r.join(""); }); } };
    m.ground = function (x0, x1, h) { m.r(x0, HT - h, x1, HT - 1, "#"); }; m.fruit = function (x0, x1, y) { for (var x = x0; x <= x1; x += 2) m.p(x, y, "f"); }; return m; }
  var STAGES = [
    { name: "Palm House", th: "palm", build: function () { var m = Map(150);
      m.ground(0, 30, 3); m.p(2, 12, "P"); m.fruit(6, 14, 11); m.p(20, 12, "b"); m.ground(34, 50, 3); m.fruit(30, 34, 9); m.r(40, 9, 44, 9, "="); m.fruit(40, 44, 8); m.p(47, 12, "b");
      m.ground(51, 70, 5); m.p(60, 7, "r"); m.p(65, 10, "b"); m.fruit(54, 60, 9); m.ground(74, 92, 3); m.p(80, 12, "H"); m.p(85, 12, "c"); m.p(91, 12, "O");
      m.fruit(98, 108, 6); m.ground(111, 150, 3); m.p(114, 12, "K"); m.p(122, 12, "b"); m.p(130, 9, "r"); m.r(125, 10, 128, 10, "^"); m.r(124, 11, 129, 12, "#"); m.p(136, 12, "c"); m.p(118, 12, "F"); m.p(145, 12, "G"); return m; } },
    { name: "Sunset Canopy", th: "sunset", build: function () { var m = Map(160);
      m.ground(0, 20, 4); m.p(2, 11, "P"); m.fruit(6, 16, 10); m.p(24, 3, "V"); m.p(30, 3, "V"); m.ground(35, 50, 4); m.p(42, 11, "b"); m.r(46, 11, 47, 11, "^");
      m.p(54, 3, "V"); m.p(60, 3, "V"); m.p(66, 3, "V"); m.ground(71, 90, 4); m.p(74, 11, "K"); m.p(80, 7, "r"); m.p(86, 11, "c"); m.fruit(76, 88, 10);
      m.r(93, 9, 95, 9, "="); m.r(99, 8, 101, 8, "="); m.fruit(93, 101, 7); m.ground(104, 120, 4); m.p(108, 11, "H"); m.p(115, 11, "b");
      m.p(124, 3, "V"); m.p(130, 3, "V"); m.p(136, 3, "V"); m.p(127, 7, "F"); m.ground(141, 160, 4); m.p(150, 11, "b"); m.p(156, 11, "G"); return m; } },
    { name: "Fern Cave", th: "cave", build: function () { var m = Map(176);
      m.r(0, 0, 175, 1, "#"); m.ground(0, 12, 3); m.p(2, 12, "P"); m.p(8, 12, "C");
      m.r(13, 13, 29, 13, "-"); m.r(34, 13, 49, 13, "-"); m.r(55, 13, 69, 13, "-"); m.r(74, 13, 79, 13, "-"); m.r(80, 11, 99, 11, "-"); m.r(103, 13, 120, 13, "-"); m.r(125, 11, 135, 11, "-"); m.r(139, 13, 152, 13, "-");
      m.fruit(30, 33, 10); m.fruit(50, 54, 10); m.fruit(70, 73, 10); m.fruit(84, 98, 9); m.fruit(121, 124, 9); m.p(110, 12, "b"); m.p(96, 6, "r");
      m.p(150, 12, "E"); m.ground(153, 175, 3); m.p(156, 12, "K"); m.p(162, 12, "b"); m.p(166, 12, "F"); m.p(171, 12, "G"); return m; } },
    { name: "Boiler Vaults", th: "vault", build: function () { var m = Map(150);
      m.r(0, 0, 149, 0, "#"); m.ground(0, 14, 3); m.p(2, 12, "P"); m.p(8, 12, "b"); m.p(13, 12, "Q"); m.p(25, 12, "O"); m.fruit(16, 24, 11);
      m.ground(40, 58, 3); m.p(43, 12, "K"); m.p(48, 12, "c"); m.p(53, 12, "H"); m.p(58, 12, "Q"); m.p(70, 12, "O"); m.fruit(61, 69, 11);
      m.ground(86, 110, 3); m.p(90, 12, "K"); m.p(96, 12, "b"); m.p(100, 8, "r"); m.p(105, 12, "b");
      m.r(112, 11, 113, 11, "="); m.fruit(112, 113, 10); m.ground(115, 124, 3); m.r(125, 15, 127, 15, "^"); m.p(126, 10, "F"); m.ground(128, 149, 3); m.p(136, 12, "c"); m.p(144, 12, "G"); return m; } }
  ];
  var THEMES = {
    palm: { sky: ["#3ac8f0", "#d8ffd0"], far: "#2a9a4a", near: "#1a7a3a", trees: "#0e5a2a", dirt: "#7a4a2a", dirtD: "#5a3420", top: "#3ae04a", topD: "#1fa83a", deco: ["#ff4aa0", "#ffe23a", "#ff8a2a"], plank: "#c87a3a", spike: "#2a8a3a", glass: "rgba(220,255,240,0.25)" },
    sunset: { sky: ["#ff6a3a", "#ffd27a"], sun: "#fff0a0", far: "#c84a5a", near: "#7a2a4a", trees: "#3a1a3a", dirt: "#6a3a2a", dirtD: "#4a2418", top: "#ff9a3a", topD: "#d86a2a", deco: ["#ffe23a", "#ff4a6a"], plank: "#a85a2a", spike: "#5a2a3a", glass: "rgba(255,220,180,0.2)" },
    cave: { sky: ["#0a1a4a", "#1a4a8a"], far: "#12306a", near: "#0e2458", dirt: "#1e3a7a", dirtD: "#142a5a", top: "#3ad8c8", topD: "#1aa8a0", deco: ["#7affea", "#c8a0ff"], plank: "#5a6aa8", spike: "#5ad8ff", glass: "rgba(120,200,255,0.12)" },
    vault: { sky: ["#1a2a6a", "#ff8a3a"], far: "#3a2a5a", near: "#2a1e4a", dirt: "#4a3a6a", dirtD: "#342850", top: "#ffb03a", topD: "#d8782a", deco: ["#ffe23a"], plank: "#ff8a3a", spike: "#ffb03a", glass: "rgba(255,180,120,0.15)" }
  };
  var PODS = { O: [0.707, -0.707], Q: [1, 0], U: [0, -1] };

  // ---------- sound ----------
  var S = {
    jump: function () { A.tone({ f: 260, f2: 560, dur: 0.1, type: "square", gain: 0.09 }); },
    fruit: function () { A.tone({ f: 990, f2: 1320, dur: 0.07, type: "triangle", gain: 0.14 }); },
    boom: function () { A.noise({ dur: 0.3, gain: 0.3, freq: 300, filter: "lowpass" }); A.tone({ f: 120, f2: 60, dur: 0.25, type: "square", gain: 0.12 }); },
    thud: function () { A.noise({ dur: 0.08, gain: 0.15, freq: 500, filter: "lowpass" }); },
    stomp: function () { A.tone({ f: 600, f2: 150, dur: 0.12, type: "square", gain: 0.12 }); },
    swap: function () { A.tone({ f: 523, dur: 0.06, type: "square", gain: 0.08 }); A.tone({ f: 784, dur: 0.08, type: "square", gain: 0.08, delay: 0.06 }); },
    hurt: function () { A.tone({ f: 440, f2: 110, dur: 0.35, type: "sawtooth", gain: 0.12 }); },
    grab: function () { A.tone({ f: 330, dur: 0.05, type: "triangle", gain: 0.15 }); },
    cart: function () { A.noise({ dur: 0.06, gain: 0.05, freq: 2400, filter: "bandpass" }); },
    life: function () { [523, 659, 784, 1047].forEach(function (f, i) { A.tone({ f: f, dur: 0.1, type: "square", gain: 0.09, delay: i * 0.07 }); }); },
    clear: function () { [392, 523, 659, 784, 659, 784, 1047].forEach(function (f, i) { A.tone({ f: f, dur: 0.15, type: "triangle", gain: 0.18, delay: i * 0.1 }); }); }
  };
  var SONGS = {
    palm: { bpm: 118, swing: 0.15, order: [0, 1], parts: [[
      { wave: "triangle", gain: 0.16, pat: "E5 . G5 . A5 . . G5 E5 . D5 . C5 . . . D5 . E5 . G5 . . E5 D5 . C5 . A4 . . ." },
      { wave: "square", gain: 0.03, pat: "A2 . A3 . E3 . A3 . F2 . F3 . C3 . F3 . G2 . G3 . D3 . G3 . E2 . E3 . B2 . E3 ." },
      { wave: "drum", pat: "k . . h s . h . k h k . s . h h k . . h s . h . k h k . s . o ." }], [
      { wave: "triangle", gain: 0.16, pat: "C6 . B5 . A5 . G5 . A5 . . . E5 . . . F5 . G5 . A5 . C6 . B5 . . . G5 . . ." },
      { wave: "square", gain: 0.03, pat: "F2 . F3 . C3 . F3 . A2 . A3 . E3 . A3 . D2 . D3 . A2 . D3 . E2 . E3 . B2 . G#2 ." },
      { wave: "drum", pat: "k . . h s . h . k h k . s . h h k . . h s . h . k k s . s s o ." }]] },
    cave: { bpm: 90, order: [0], parts: [[
      { wave: "triangle", gain: 0.14, pat: "E5 - - - B4 - - - C5 - D5 - B4 - - - A4 - - - E4 - - - G4 - A4 - B4 - - -" },
      { wave: "square", gain: 0.02, pat: "E3 B3 E4 B3 E3 B3 E4 B3 C3 G3 C4 G3 C3 G3 C4 G3 A2 E3 A3 E3 A2 E3 A3 E3 B2 F#3 B3 F#3 B2 F#3 D#4 F#3" },
      { wave: "drum", pat: "k . . . h . . . s . . . h . . . k . . . h . k . s . . . h . h ." }]] }
  };

  // ---------- state ----------
  var L, si = 0, mode = "title", cam = PF.Camera(), parts = PF.Parts(), hero, foes = [], items = [], pods = [], vines = [], cart = null, trail = [], score = 0, fruit = 0, lives = 3, buddy = true, active = "otter", cp = null, won = 0, dead = 0, tm = 0, fled = null;
  var CH = { otter: { w: 12, h: 16, speed: 104, jump: 330, name: "Juniper" }, squirrel: { w: 10, h: 13, speed: 122, jump: 315, name: "Sprig" } };
  function hud() { ui.setStat("fruit", String(fruit)); ui.setStat("score", FF.n(score)); }
  function load(i, keepCp) {
    si = i; var st = STAGES[i]; L = PF.Level(st.build().rows(), { theme: THEMES[st.th], seed: i + 5 });
    foes = []; items = []; pods = []; vines = []; cart = null; parts.clear(); won = 0; dead = 0; fled = null; if (!keepCp) { cp = null; tm = 0; }
    var start = { x: 32, y: 12 * TS };
    L.ents.forEach(function (e) {
      if (e.ch === "P") start = { x: e.x + 2, y: e.y };
      else if ("bcrn".indexOf(e.ch) >= 0) foes.push({ k: e.ch, x: e.x + 2, y: e.y + (e.ch === "r" ? 0 : TS - 9), w: 12, h: 9, vx: e.ch === "r" ? 0 : -28, vy: 0, hx: e.x, hy: e.y, t: Math.random() * 4, alive: true, dir: -1 });
      else if (PODS[e.ch]) pods.push({ x: e.x + 8, y: e.y + 8, d: PODS[e.ch], k: e.ch, cd: 0 });
      else if (e.ch === "V") vines.push({ x: e.x + 8, y: e.y, len: 88, cd: 0, sway: Math.random() * 6 });
      else if (e.ch === "C") cart = { x: e.x - 2, y: e.y + TS - 8, w: 20, h: 8, vx: 0, vy: 0, ride: false, home: { x: e.x - 2, y: e.y + TS - 8 } };
      else items.push({ k: e.ch, x: e.x + 3, y: e.y + 3, w: 10, h: 10, tx: e.tx, ty: e.ty });
    });
    var s = cp || start, c = CH[active];
    hero = { x: s.x, y: s.y + TS - c.h, w: c.w, h: c.h, vx: 0, vy: 0, face: 1, ground: false, coyote: 0, buffer: 0, inv: 1, ph: 0, state: "run", pod: null, vine: null, blast: 0, dash: 0, dashCd: 0 };
    if (cp && cart && cp.x > cart.x) cart = null;
    trail = []; cam.x = hero.x - W / 3; cam.y = hero.y - H / 2; PF.follow(cam, L, hero, W, H, 1);
    ui.setCourse(st.name); hud();
  }
  function setActive(k) { var h = hero, c = CH[k], by = h.y + h.h; active = k; h.w = c.w; h.h = c.h; h.y = by - c.h; }

  // ---------- update ----------
  function hurt() {
    var h = hero; if (h.inv > 0 || dead || won) return;
    if (h.state === "cart") { h.state = "run"; cart = null; }
    if (buddy) { fled = { k: active, x: h.x, y: h.y, vx: -h.face * 90, vy: -260, t: 1.2 }; buddy = false; setActive(active === "otter" ? "squirrel" : "otter"); h.inv = 1.4; h.vy = -200; S.hurt(); return; }
    die();
  }
  function die() { if (dead) return; dead = 1.5; lives--; (game.deaths = game.deaths || []).push([hero.state, Math.round(hero.x / TS)]); S.hurt(); A.stopSong(); hero.vy = -300; hero.state = "dead"; }
  function update(dt) {
    tm += dt; var h = hero;
    if (won) { won -= dt; if (won <= 0) stageClear(); parts.step(dt); return; }
    if (dead) { dead -= dt; h.vy += 900 * dt; h.y += h.vy * dt; if (dead <= 0) { if (lives <= 0) return gameOver(); buddy = true; load(si, true); playSong(); } return; }
    if (fled) { fled.t -= dt; fled.vy += 900 * dt; fled.x += fled.vx * dt; fled.y += fled.vy * dt; if (fled.t <= 0) fled = null; }
    if (h.inv > 0) h.inv -= dt;
    var c = CH[active], dir = (ui.down("L") ? -1 : 0) + (ui.down("R") ? 1 : 0), jumpHit = ui.hit("J");
    if (ui.hit("S") && buddy && h.state === "run") { setActive(active === "otter" ? "squirrel" : "otter"); S.swap(); parts.add(h.x + h.w / 2, h.y + h.h / 2, 8, "#fff", 60); }
    pods.forEach(function (p) { if (p.cd > 0) p.cd -= dt; }); vines.forEach(function (v) { if (v.cd > 0) v.cd -= dt; v.sway += dt; });
    if (h.state === "pod") {
      var p = h.pod; h.x = p.x - h.w / 2; h.y = p.y - h.h / 2; h.podT += dt;
      if (jumpHit || h.podT > 1.6) { h.state = "run"; h.launched = 1; h.blast = 0.42; h.vx = p.d[0] * 400; h.vy = p.d[1] * 400; p.cd = 0.5; S.boom(); parts.add(p.x + p.d[0] * 10, p.y + p.d[1] * 10, 14, "#ffe0a0", 90); }
    } else if (h.state === "vine") {
      var v = h.vine; h.th = h.th || 0; h.om = h.om || 0;
      h.om += (-(900 / v.len) * Math.sin(h.th) + dir * 2.2) * dt; h.om *= 0.998; h.th = clamp(h.th + h.om * dt, -1.3, 1.3);
      h.x = v.x + Math.sin(h.th) * v.len - h.w / 2; h.y = v.y + Math.cos(h.th) * v.len - 4; if (dir) h.face = dir;
      if (jumpHit) { h.state = "run"; h.vx = Math.cos(h.th) * h.om * v.len + h.face * 40; h.vy = -Math.sin(h.th) * h.om * v.len - 230; v.cd = 0.5; h.vine = null; S.jump(); }
    } else if (h.state === "cart") {
      var ct = cart; ct.vx = 185; ct.vy = Math.min(420, ct.vy + 900 * dt);
      if (jumpHit && ct.ground) { ct.vy = -330; S.jump(); }
      var rc = PF.move(L, ct, dt); ct.ground = rc.ground; if (rc.wallR) { h.state = "run"; cart = null; hurt(); }
      if (ct.ground && Math.floor(tm * 8) % 2 && Math.random() < 0.2) S.cart();
      h.x = ct.x + 4; h.y = ct.y - h.h + 4; h.face = 1; h.vx = 185;
      if (ct.y > L.ph + 10) die();
      items.forEach(function (it) { if (it.k === "E" && ct.x > it.x - 4) { h.state = "run"; h.vy = -260; ct.done = true; } });
    } else {
      if (h.blast > 0) { h.blast -= dt; }
      var acc = h.ground ? 900 : 600;
      if (h.dash > 0) { h.dash -= dt; h.vx = h.face * 220; }
      else if (h.blast <= 0) { if (dir) { if (Math.abs(h.vx) > c.speed && dir === Math.sign(h.vx)) h.vx -= Math.sign(h.vx) * (h.ground ? 900 : 120) * dt; else { h.vx += dir * acc * dt; if (!(Math.abs(h.vx) > c.speed && dir !== Math.sign(h.vx))) h.vx = clamp(h.vx, -c.speed, c.speed); } h.face = dir; } else if (h.ground) { var fr = 1000 * dt; h.vx = Math.abs(h.vx) <= fr ? 0 : h.vx - Math.sign(h.vx) * fr; } }
      if (jumpHit) h.buffer = 0.12; h.buffer -= dt; h.coyote -= dt; h.dashCd -= dt;
      if (h.buffer > 0 && h.coyote > 0) { h.vy = -c.jump; h.buffer = 0; h.coyote = 0; S.jump(); }
      if (ui.hit("A") && h.ground && h.dashCd <= 0) { h.dash = 0.32; h.dashCd = 0.6; S.thud(); }
      if (h.blast <= 0) { if (!ui.down("J") && h.vy < -130 && !h.launched) h.vy = -130; h.vy = Math.min(420, h.vy + 900 * dt); if (active === "squirrel" && ui.down("J") && h.vy > 55) h.vy = 55; }
      var r = PF.move(L, h, dt); if (r.ground) { h.ground = true; h.coyote = 0.09; if (h.blast < 0.3) { h.blast = 0; h.launched = 0; } } else h.ground = false;
      if (r.wallL || r.wallR || r.ceil) h.blast = 0;
      h.ph += Math.abs(h.vx) * dt * 0.15;
      if (h.y > L.ph + 10) return die();
      if (PF.touching(L, { x: h.x + 1, y: h.y + 3, w: h.w - 2, h: h.h - 3 }, "hurt")) hurt();
      pods.forEach(function (p) { if (p.cd <= 0 && Math.abs(p.x - (h.x + h.w / 2)) < 14 && Math.abs(p.y - (h.y + h.h / 2)) < 16) { h.state = "pod"; h.pod = p; h.podT = 0; h.vx = h.vy = 0; h.blast = 0; S.grab(); } });
      if (!h.ground) vines.forEach(function (v) { if (h.state !== "run" || v.cd > 0) return; var dx = h.x + h.w / 2 - v.x, dy = h.y - v.y; if (dy > 10 && dy < v.len + 12 && Math.abs(dx) < 12) { h.state = "vine"; h.vine = v; h.th = Math.asin(clamp(dx / v.len, -1, 1)); h.om = h.vx / v.len; S.grab(); } });
      if (cart && !cart.done && h.state === "run" && PF.aabb(h, cart)) { h.state = "cart"; cart.ride = true; cart.vy = 0; S.grab(); }
    }
    // foes
    foes.forEach(function (f) {
      if (!f.alive) return; f.t += dt; if (Math.abs(f.x - h.x) > W * 1.3) return;
      if (f.k === "r") { f.x = f.hx + Math.sin(f.t * 0.9) * 50; f.y = f.hy + Math.sin(f.t * 2.4) * 14; f.dir = Math.cos(f.t * 0.9) > 0 ? 1 : -1; }
      else if (f.k === "n") { f.up = Math.sin(f.t * 1.6) > 0.2; }
      else { f.vy = Math.min(400, f.vy + 900 * dt); var rr = PF.move(L, f, dt); if (rr.wallL || rr.wallR) f.dir = -f.dir; var ah = Math.floor((f.dir < 0 ? f.x - 1 : f.x + f.w + 1) / TS), bl = Math.floor((f.y + f.h + 2) / TS); if (rr.ground && !L.solid(ah, bl) && !L.flag(ah, bl, "oneway")) f.dir = -f.dir; f.vx = f.dir * (f.k === "c" ? 18 : 30); }
      if (h.state === "pod" || h.state === "dead") return;
      if (PF.aabb(h, f)) {
        var stomp = h.vy > 40 && h.y + h.h - f.y < 8 && f.k !== "c";
        if (stomp || h.dash > 0 || h.blast > 0 || h.state === "cart" && f.k !== "c") { f.alive = false; score += 100; S.stomp(); parts.add(f.x + 6, f.y + 4, 12, "#fff0b0", 80); if (stomp) h.vy = ui.down("J") ? -330 : -220; hud(); }
        else hurt();
      }
    });
    // items
    items.forEach(function (it) {
      if (it.got || !PF.aabb(h, it)) return;
      if (it.k === "f") { it.got = 1; fruit++; score += 10; S.fruit(); if (fruit % 100 === 0) { lives++; S.life(); } hud(); }
      else if (it.k === "F") { it.got = 1; lives++; score += 500; S.life(); hud(); }
      else if (it.k === "H" && !buddy) { it.got = 1; buddy = true; S.swap(); parts.add(it.x, it.y, 14, "#ffe23a", 70); }
      else if (it.k === "K" && (!cp || cp.x < it.x)) { cp = { x: it.x - 3, y: it.ty * TS }; S.grab(); }
      else if (it.k === "G" && !won) { won = 2; S.clear(); A.stopSong(); h.vx = 0; }
    });
    trail.push({ x: h.x, y: h.y + h.h, f: h.face, ph: h.ph, g: h.ground }); if (trail.length > 14) trail.shift();
    parts.step(dt); PF.follow(cam, L, h, W, H, dt);
  }

  // ---------- render ----------
  function render(c, tt) {
    if (!W) sizeLo(); if (!L) load(0);
    var th = L.theme; PF.drawBack(g, th, cam, W, H, tt);
    // glasshouse frame
    g.fillStyle = th.glass; for (var x = 0; x < W + 40; x += 40) { var gx = Math.round(x - (cam.x * 0.3) % 40); g.fillRect(gx, 0, 2, H); } for (var y = 20; y < H; y += 36) g.fillRect(0, Math.round(y - (cam.y * 0.3) % 36), W, 1);
    if (th === THEMES.palm || th === THEMES.sunset) for (var k = 0; k < 10; k++) { var px = ((k * 83 - cam.x * 0.6) % (W + 80) + W + 80) % (W + 80) - 40, py = H * 0.8 - cam.y * 0.2; R(px + 6, py - 50, 3, 60, th === THEMES.palm ? "#6a4a2a" : "#4a1a2a"); for (var l = 0; l < 5; l++) { R(px + 7 - 14 + l * 6, py - 54 + Math.abs(l - 2) * 3, 8, 3, th.near); } }
    PF.drawTiles(g, L, th, cam, W, H, tt);
    for (var ty = Math.floor(cam.y / TS); ty <= Math.ceil((cam.y + H) / TS); ty++) for (var tx = Math.floor(cam.x / TS); tx <= Math.ceil((cam.x + W) / TS); tx++) if (L.get(tx, ty) === "-") { var rx = tx * TS - cam.x, ry = ty * TS - cam.y; R(rx, ry, TS, 2, "#d8e0f0"); R(rx, ry + 5, TS, 2, "#a8b0c8"); R(rx + 2, ry + 2, 3, 6, "#8a5a3a"); R(rx + 10, ry + 2, 3, 6, "#8a5a3a"); R(rx + 6, ry + 7, 2, 9, "#5a6a8a"); }
    vines.forEach(function (v) { var on = hero.vine === v, th2 = on ? hero.th : Math.sin(v.sway) * 0.12, ex = v.x + Math.sin(th2) * v.len, ey = v.y + Math.cos(th2) * v.len; for (var i = 0; i <= 16; i++) { var t2 = i / 16; R(v.x + (ex - v.x) * t2 - cam.x - 1, v.y + (ey - v.y) * t2 - cam.y, 2, 4, i % 3 ? "#2ab84a" : "#1a8a3a"); if (i % 4 === 2) R(v.x + (ex - v.x) * t2 - cam.x + 1, v.y + (ey - v.y) * t2 - cam.y, 3, 2, "#5ae05a"); } R(v.x - cam.x - 4, v.y - cam.y - 2, 8, 4, "#1a6a2a"); });
    items.forEach(function (it) { if (it.got) return; var x = Math.round(it.x - cam.x), y = Math.round(it.y - cam.y), b = Math.round(Math.sin(tt * 4 + it.x) * 1.5);
      if (it.k === "f") { R(x + 2, y + 2 + b, 6, 6, "#9a2ae0"); R(x + 3, y + 3 + b, 2, 2, "#e8a0ff"); R(x + 4, y + b, 2, 2, "#2ab84a"); }
      else if (it.k === "F") { R(x, y + b - 2, 10, 10, "#ff4aa0"); R(x + 2, y + b, 3, 3, "#ffd0f0"); R(x + 4, y + b - 4, 2, 3, "#2ab84a"); R(x - 1, y + b + 9, 12, 1, "rgba(255,255,255,0.5)"); }
      else if (it.k === "H") { R(x - 2, y + 2, 14, 9, "#d8a050"); R(x - 2, y + 2, 14, 2, "#a86a2a"); R(x + 1, y - 2, 8, 2, "#a86a2a"); R(x + 2, y + 5, 2, 2, "#ff4a4a"); R(x + 7, y + 6, 2, 2, "#ffe23a"); }
      else if (it.k === "K") { R(x + 3, y - 10, 2, 20, "#e8e8e8"); R(x + 5, y - 10, 8, 6, cp && cp.x >= it.x - 3 ? "#3ae04a" : "#ff4a6a"); }
      else if (it.k === "G") { R(x - 4, y - 22, 18, 32, "#e8f8ff"); R(x - 2, y - 20, 14, 28, "rgba(120,220,255,0.6)"); R(x + 4, y - 20, 2, 28, "#e8f8ff"); R(x - 2, y - 8, 14, 1, "#e8f8ff"); R(x - 6, y - 26, 22, 4, "#2ab84a"); } });
    pods.forEach(function (p) { var x = p.x - cam.x, y = p.y - cam.y, ang = Math.atan2(p.d[1], p.d[0]); g.save(); g.translate(Math.round(x), Math.round(y)); g.rotate(ang); g.fillStyle = "#ff9a2a"; g.beginPath(); g.ellipse(0, 0, 11, 8, 0, 0, 7); g.fill(); g.fillStyle = "#d8601a"; g.fillRect(-9, -1, 18, 2); g.fillStyle = "#3a1a0a"; g.fillRect(7, -5, 4, 10); g.fillStyle = "#2ab84a"; g.fillRect(-13, -3, 3, 6); g.restore(); });
    if (cart) { var cx = Math.round(cart.x - cam.x), cy = Math.round(cart.y - cam.y); R(cx, cy - 4, 20, 8, "#3a6ae8"); R(cx + 1, cy - 4, 18, 2, "#7ab0ff"); R(cx + 2, cy + 3, 5, 5, "#222"); R(cx + 13, cy + 3, 5, 5, "#222"); R(cx + 4, cy + 5, 1, 1, "#aaa"); R(cx + 15, cy + 5, 1, 1, "#aaa"); }
    foes.forEach(function (f) { if (!f.alive) return; var x = Math.round(f.x - cam.x), y = Math.round(f.y - cam.y); if (x < -20 || x > W + 20) return; var fl = Math.floor(tt * 8) % 2;
      if (f.k === "b") { R(x, y + 1, 12, 6, "#1a6ae8"); R(x + 1, y, 10, 2, "#3ad8ff"); R(x + 5, y + 1, 1, 6, "#0a2a6a"); R(f.dir < 0 ? x - 2 : x + 11, y + 2, 3, 3, "#111"); R(x + 1 + fl, y + 7, 2, 2, "#111"); R(x + 8 - fl, y + 7, 2, 2, "#111"); }
      else if (f.k === "c") { for (var s = 0; s < 4; s++) { R(x + s * 3, y + 2 + ((s + fl) % 2), 4, 5, s % 2 ? "#ffe23a" : "#ff6a2a"); R(x + s * 3 + 1, y + ((s + fl) % 2), 1, 2, "#111"); } R(f.dir < 0 ? x - 1 : x + 10, y + 2, 3, 3, "#ff6a2a"); }
      else if (f.k === "r") { R(x, y + 2, 12, 6, "#ff3a3a"); R(x + 2, y + 3, 4, 3, "#ffe23a"); R(f.dir > 0 ? x + 10 : x - 2, y + 1, 4, 4, "#ff3a3a"); R(f.dir > 0 ? x + 13 : x - 3, y + 3, 2, 2, "#333"); R(x + 3, y + (fl ? -2 : 6), 6, 3, "#2a6ae8"); R(f.dir > 0 ? x - 3 : x + 11, y + 4, 4, 2, "#2ab84a"); } });
    if (fled) drawChar(fled.k, fled.x - cam.x, fled.y + CH[fled.k].h - cam.y, -1, 0, false, tt, true);
    if (buddy && mode !== "title" && hero.state !== "pod" && hero.state !== "dead") { var o = trail[0] || { x: hero.x, y: hero.y + hero.h, f: 1, ph: 0, g: true }; var other = active === "otter" ? "squirrel" : "otter"; drawChar(other, o.x - (hero.state === "cart" ? 8 : o.f * 6) - cam.x, (hero.state === "cart" ? hero.y + hero.h : o.y) - cam.y, o.f, o.ph, !o.g, tt); }
    if (mode !== "title" && hero.state !== "pod" && (hero.inv <= 0 || Math.floor(tt * 14) % 2)) drawChar(active, hero.x - cam.x, hero.y + hero.h - cam.y, hero.face, hero.ph, !hero.ground && hero.state === "run", tt, false, hero.state === "vine", hero.dash > 0);
    parts.draw(g, cam);
    if (mode !== "title") { R(3, 3, 40, 9, "rgba(0,0,0,0.4)"); g.fillStyle = "#fff"; g.font = "8px monospace"; g.fillText("x" + lives + (buddy ? " +1" : ""), 6, 10); }
    c.drawImage(lo, 0, 0, W * PX, H * PX);
  }
  function drawChar(k, x, by, face, ph, air, tt, sad, hang, dash) {
    x = Math.round(x); by = Math.round(by); var lg = air ? 2 : Math.round(Math.sin(ph * 2) * 2), f = face < 0;
    function r(dx, dy, w, h, c2) { R(f ? x + (k === "otter" ? 12 : 10) - dx - w : x + dx, by + dy, w, h, c2); }
    if (k === "otter") {
      r(-6, -6, 7, 3, "#6a3a1a"); r(1 + lg, -3, 3, 3, "#4a2410"); r(7 - lg, -3, 3, 3, "#4a2410");
      r(0, dash ? -10 : -12, 11, dash ? 7 : 9, "#8a4a20"); r(3, dash ? -8 : -10, 6, 6, "#e8c89a");
      r(7, dash ? -14 : -17, 7, 6, "#8a4a20"); r(9, dash ? -12 : -15, 5, 3, "#e8c89a"); r(11, dash ? -13 : -16, 1, 1, "#111"); r(13, dash ? -12 : -15, 1, 1, "#111"); r(7, dash ? -15 : -18, 2, 2, "#6a3a1a");
      r(0, -12, 11, 2, "#2a8ae8"); if (hang) r(8, -24, 2, 8, "#8a4a20");
    } else {
      r(-7, -14, 6, 9, "#e8601a"); r(-6, -15, 4, 3, "#ff8a3a"); r(-8, -9, 3, 4, "#e8601a");
      r(1 + lg, -3, 2, 3, "#a83a10"); r(6 - lg, -3, 2, 3, "#a83a10"); r(0, -10, 8, 7, "#e8601a"); r(3, -8, 4, 5, "#fff0d8");
      r(4, -15, 6, 6, "#e8601a"); r(7, -13, 1, 1, "#111"); r(9, -12, 1, 1, "#111"); r(4, -18, 2, 3, "#e8601a"); r(4, -19, 1, 1, "#fff"); r(0, -10, 8, 1, "#ffe23a");
      if (hang) r(6, -22, 2, 7, "#e8601a");
    }
    if (sad) { R(x + 4, by - 26, 2, 4, "#fff"); }
  }

  // ---------- flow ----------
  function playSong() { A.playSong(STAGES[si].th === "cave" || STAGES[si].th === "vault" ? SONGS.cave : SONGS.palm); }
  function stageClear() {
    ui.stop(); mode = "clear"; var b = save.best[si]; if (!b || tm < b) save.best[si] = tm; if (si + 2 > save.open) save.open = Math.min(STAGES.length, si + 2); if (score > save.hi) save.hi = score; ui.persist();
    var last = si + 1 >= STAGES.length;
    ui.menu({ kicker: STAGES[si].name, title: last ? "Glasshouse cleared!" : "Stage clear", stats: '<b class="ff-score-xl">' + FF.n(score) + "</b><span>TIME " + FF.fmtTime(tm) + "</span><span>FRUIT " + fruit + "</span>",
      buttons: last ? [{ label: "Menu", act: toTitle }] : [{ label: "Next stage", act: function () { mode = "play"; load(si + 1); ui.go(); playSong(); } }, { label: "Menu", small: true, act: toTitle }] });
    if (last) ui.runEnded();
  }
  function gameOver() { ui.stop(); mode = "over"; A.stopSong(); ui.runEnded(); var hi = score > save.hi; if (hi) save.hi = score; ui.persist();
    ui.menu({ title: "Game over", stats: '<b class="ff-score-xl">' + FF.n(score) + "</b><span>" + (hi ? "NEW HIGH SCORE" : "HIGH SCORE " + FF.n(save.hi)) + "</span>", buttons: [{ label: "Try " + STAGES[si].name + " again", act: function () { play(si); } }, { label: "Menu", act: toTitle }] }); }
  function play(i) { mode = "play"; score = 0; fruit = 0; lives = 3; buddy = true; active = "otter"; load(i); ui.go(); playSong(); }
  function toTitle() { ui.stop(); mode = "title"; load(0); A.playSong(SONGS.palm); ui.setCourse("Great Glasshouse");
    ui.menu({ title: "CANOPY CARTS", body: "Juniper the otter and Sprig the squirrel versus the Great Glasshouse.", stats: "<span>HIGH SCORE " + (save.hi ? FF.n(save.hi) : "-") + "</span><span>STAGES " + save.open + "/" + STAGES.length + "</span>",
      buttons: [{ label: "Play", act: function () { play(Math.min(save.open, STAGES.length) - 1); } }], row: STAGES.map(function (s, i) { return { label: String(i + 1), disabled: i >= save.open, act: function () { play(i); } }; }), app: true,
      help: ["◀ ▶ run, Jump (hold for higher). Dash bowls creatures over. Swap changes buddy: Juniper is sturdy, Sprig is quick and floats if you hold Jump.", "Seed-pods: jump in, tap Jump to fire. Vines: jump onto them, ◀ ▶ to swing, Jump to let go. Rail carts: Jump over the gaps.", "A knock sends your buddy running: pick them up again from a picnic hamper. Purple fruit: 100 for an extra life."], fine: "A Forest Forge game" }); }
  var game = { toTitle: toTitle, onResize: sizeLo, update: function (dt) { if (mode === "play") update(dt); }, render: render,
    idle: function (dt) { if (mode === "title" && L) { cam.x += dt * 30; if (cam.x > L.pw - W) cam.x = 0; } }, onBack: function () { if (mode === "title") return "exit"; toTitle(); return "menu"; } };
  ui.onAdsRemoved = function () { if (mode === "title") toTitle(); };
  game.qa = { play: play, state: function () { return { mode: mode, si: si, x: hero.x, y: hero.y, tx: Math.floor((hero.x + hero.w / 2) / TS), ty: Math.floor((hero.y + hero.h - 1) / TS), vx: hero.vx, vy: hero.vy, ground: hero.ground, st: hero.state, th: hero.th, om: hero.om, lives: lives, buddy: buddy, won: won, dead: dead, pw: L.pw }; }, L: function () { return L; }, foes: function () { return foes; }, vines: function () { return vines; }, pods: function () { return pods; }, lives: function (n) { lives = n; }, inv: function () { hero.inv = 1e9; } };
  ui.start(game);
})();
