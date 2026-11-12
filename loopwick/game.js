/* Loopwick (Forest Forge). Fenn the hare tears along the chalk downs above the sea:
 * momentum on slopes, a low tuck, loops, trampolines, gusts and sea-glass
 * pebbles to collect. Three acts. Original game: all art drawn in
 * code, all sound generated (shell.js). */
(function () {
  "use strict";
  var clamp = FF.clamp;
  var ui = FF.create({
    id: "loopwick", title: "Loopwick", course: "Chalk Downs", wide: true, view: { w: 640, h: 360, flex: true },
    stats: [{ id: "rings", label: "Sea-glass", value: "0" }, { id: "score", label: "Score", value: "0" }],
    pads: {
      left: [{ id: "L", icon: "left", aria: "Left", keys: ["ArrowLeft", "KeyA"] }, { id: "R", icon: "right", aria: "Right", keys: ["ArrowRight", "KeyD"] }],
      right: [{ id: "D", label: "Tuck", aria: "Tuck", keys: ["ArrowDown", "KeyS", "ShiftLeft", "KeyX"] }, { id: "J", icon: "up", cls: "big", aria: "Jump", keys: ["Space", "ArrowUp", "KeyW", "KeyZ"] }]
    }
  });
  var A = ui.audio, save = ui.save; save.hi = save.hi || 0; save.best = save.best || {}; save.open = save.open || 1;
  var PX = 2, lo = document.createElement("canvas"), g = lo.getContext("2d"), W = 320, H = 180;
  function sizeLo() { W = Math.ceil(ui.VW / PX); H = Math.ceil(ui.VH / PX); lo.width = W; lo.height = H; g.imageSmoothingEnabled = false; }
  function R(x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }

  // ---------- acts: built from a list of commands into a height field ----------
  var COL = 4, BOTTOM = 700;
  var ACTS = [
    { name: "Act 1 · Seaview Down", boss: "The Kite Captain", bc: ["#ff3a5a", "#ffe23a"], secs: [
      "flat 360|rings 6|hill 320 50|flat 120|crab|slope 360 110|loop|flat 200|rings 8|spring|plats|flat 260|pit 100|flat 200|crab",
      "flat 160|gust|hill 260 40|hill 260 60|flat 120|wasp|flat 140|pit 90|flat 160|rings 6|slope 260 -60|flat 120|spikes|flat 160|crab|loop|flat 220",
      "flat 140|spring|plats|flat 180|wasp|slope 300 80|flat 120|pit 110|flat 140|rings 8|hill 380 70|flat 160|crab|spikes|flat 200"] },
    { name: "Act 2 · Cuckmere Run", boss: "Old Gale", bc: ["#2a6ae8", "#ffffff"], secs: [
      "flat 300|gust|slope 400 140|loop|flat 160|wasp|hill 300 60|crab|flat 160|pit 130|flat 140|spring|plats|flat 200",
      "flat 120|spikes|flat 120|slope 320 -100|rings 8|flat 160|crab|slope 420 160|loop|loop2|flat 200|wasp|pit 140|flat 160",
      "flat 160|hill 200 30|hill 200 50|hill 200 70|flat 120|crab|spikes|flat 200|gust|pit 120|flat 140|rings 10|loop|flat 260"] },
    { name: "Act 3 · Beachy Heights", boss: "The Brolly Brigadier", bc: ["#1fb84a", "#ff5ab0"], secs: [
      "flat 260|crab|slope 300 -120|spring|plats|flat 160|wasp|pit 140|flat 120|spikes|flat 120|slope 460 200|gust|loop",
      "flat 160|loop2|flat 160|crab|wasp|hill 300 70|pit 150|flat 140|spring|plats|flat 160|spikes|flat 140",
      "flat 140|crab|slope 400 160|loop|flat 200|wasp|wasp|pit 120|flat 200|rings 10|gust|loop|flat 300"] },
    { name: "Act 4 · Seven Sisters", boss: "Admiral Gusty", bc: ["#b03ae8", "#ffe23a"], secs: [
      "flat 300|rings 6|hill 240 60|hill 240 80|flat 120|wasp|pit 120|flat 140|spikes|flat 120|gust|slope 360 120|loop|flat 200",
      "flat 140|spring|plats|flat 160|crab|crab|pit 140|flat 120|spikes|flat 140|wasp|slope 300 -110|rings 8|loop2|flat 200",
      "flat 160|gust|hill 300 90|flat 120|wasp|wasp|pit 150|flat 140|spring|plats|flat 180|spikes|flat 120|crab|loop|flat 260"] }
  ];
  var L;
  function buildAct(i) {
    var hs = [], y = 300, o = { hs: hs, rings: [], foes: [], springs: [], spikes: [], loops: [], gusts: [], plats: [], posts: [], goal: 0, seed: i, arena: null, boss: null };
    function push(n, f) { for (var k = 0; k < n; k++) hs.push(f(k / n)); }
    function x() { return hs.length * COL; }
    var cmds = [];
    ACTS[i].secs.forEach(function (sec, k) { cmds = cmds.concat(sec.split("|")); cmds.push("flat 200"); cmds.push("post"); if (k < 2) cmds.push(k ? "rings 6" : "rings 8"); });
    cmds.push("boss"); cmds.push("goal");
    cmds.forEach(function (c) {
      var p = c.split(" "), a = +p[1] || 0, b = +p[2] || 0, n = Math.round(a / COL), y0 = y;
      if (p[0] === "flat") push(n, function () { return y; });
      else if (p[0] === "hill") push(n, function (t) { return y0 - b * Math.sin(Math.PI * t); });
      else if (p[0] === "slope") { push(n, function (t) { return y0 + b * (1 - Math.cos(Math.PI * t)) / 2; }); y = y0 + b; }
      else if (p[0] === "pit") { push(n, function () { return null; }); }
      else if (p[0] === "rings") { for (var r = 0; r < a; r++) o.rings.push({ x: x() - a * 18 + r * 18 - 20, y: y - 22 }); }
      else if (p[0] === "loop" || p[0] === "loop2") { push(Math.round(80 / COL), function () { return y; }); o.loops.push({ x: x(), y: y, r: 52 }); push(Math.round(100 / COL), function () { return y; }); for (var q = 0; q < 8; q++) { var an = q / 8 * Math.PI * 2; o.rings.push({ x: x() - 100 + Math.sin(an) * 40, y: y - 52 + Math.cos(an) * 40 }); } }
      else if (p[0] === "crab") { o.foes.push({ k: "crab", x: x() - 60, y: y, hx: x() - 60, t: Math.random() * 3, alive: true }); }
      else if (p[0] === "wasp") { o.foes.push({ k: "wasp", x: x() - 80, y: y - 46, hx: x() - 80, hy: y - 46, t: Math.random() * 3, alive: true }); }
      else if (p[0] === "spring") { push(Math.round(60 / COL), function () { return y; }); o.springs.push({ x: x() - 30, y: y }); }
      else if (p[0] === "plats") { var bx = x(); for (var s = 0; s < 3; s++) { o.plats.push({ x: bx + 20 + s * 110, y: y - 150 + s * 30, w: 70 }); for (var rr = 0; rr < 3; rr++) o.rings.push({ x: bx + 35 + s * 110 + rr * 18, y: y - 168 + s * 30 }); } push(Math.round(340 / COL), function () { return y; }); }
      else if (p[0] === "spikes") { push(Math.round(120 / COL), function () { return y; }); o.spikes.push({ x: x() - 80, w: 40, y: y }); }
      else if (p[0] === "gust") { push(Math.round(60 / COL), function () { return y; }); o.gusts.push({ x: x() - 40, y: y }); }
      else if (p[0] === "post") { push(Math.round(60 / COL), function () { return y; }); o.posts.push({ x: x() - 30, y: y }); }
      else if (p[0] === "boss") { var ax = x(); push(Math.round(720 / COL), function () { return y; }); o.arena = [ax + 20, x() - 20]; o.boss = { x: ax + 480, y: y - 80, gy: y, hx: ax + 360, hp: 3 + i, max: 3 + i, t: 0, inv: 0, dive: 0, name: ACTS[i].boss, bc: ACTS[i].bc, alive: true, seen: false }; }
      else if (p[0] === "goal") { push(Math.round(160 / COL), function () { return y; }); o.goal = x() - 120; push(Math.round(500 / COL), function () { return y; }); }
    });
    o.w = hs.length * COL;
    o.gy = function (px) { var i0 = Math.floor(px / COL); if (i0 < 0) return hs[0]; if (i0 >= hs.length - 1) return hs[hs.length - 1]; var a0 = hs[i0], a1 = hs[i0 + 1]; if (a0 == null || a1 == null) return a0 == null ? null : a0; return a0 + (a1 - a0) * (px / COL - i0); };
    o.bottom = Math.max.apply(null, hs.filter(function (v) { return v != null; })) + 180; return o;
  }

  // ---------- sound ----------
  var S = {
    ring: function () { A.tone({ f: 1568, dur: 0.06, type: "square", gain: 0.06 }); A.tone({ f: 2093, dur: 0.12, type: "square", gain: 0.06, delay: 0.05 }); },
    jump: function () { A.tone({ f: 280, f2: 760, dur: 0.12, type: "square", gain: 0.09 }); },
    spring: function () { A.tone({ f: 200, f2: 1200, dur: 0.25, type: "triangle", gain: 0.2 }); },
    roll: function () { A.noise({ dur: 0.12, gain: 0.08, freq: 1200, filter: "bandpass" }); },
    charge: function (n) { A.tone({ f: 300 + n * 120, f2: 600 + n * 160, dur: 0.1, type: "sawtooth", gain: 0.07 }); },
    pop: function () { A.noise({ dur: 0.15, gain: 0.22, freq: 800, filter: "bandpass" }); A.tone({ f: 600, f2: 200, dur: 0.12, type: "square", gain: 0.08 }); },
    scatter: function () { for (var i = 0; i < 5; i++) A.tone({ f: 1800 - i * 200, dur: 0.06, type: "square", gain: 0.06, delay: i * 0.04 }); },
    hurt: function () { A.tone({ f: 500, f2: 100, dur: 0.4, type: "sawtooth", gain: 0.12 }); },
    boss: function () { [196, 0, 196, 233, 0, 262, 294].forEach(function (f, i) { if (f) A.tone({ f: f, dur: 0.12, type: "sawtooth", gain: 0.09, delay: i * 0.1 }); }); },
    gust: function () { A.noise({ dur: 0.35, gain: 0.12, freq: 3000, filter: "highpass" }); },
    clear: function () { [784, 988, 1175, 1568, 1175, 1568, 2093].forEach(function (f, i) { A.tone({ f: f, dur: 0.14, type: "square", gain: 0.09, delay: i * 0.09 }); }); }
  };
  var SONG = { bpm: 150, order: [0, 0, 1, 1], parts: [[
    { wave: "square", gain: 0.045, pat: "G5 . B5 D6 . B5 G5 . A5 . C6 E6 . C6 A5 . B5 . D6 G6 . D6 B5 . C6 . A5 F#5 . A5 D6 ." },
    { wave: "triangle", gain: 0.2, pat: "G2 G3 . G2 D3 . G2 . A2 A3 . A2 E3 . A2 . B2 B3 . B2 F#3 . B2 . D3 D2 . D3 A2 . D3 ." },
    { wave: "drum", pat: "k . h . s . h k k . h . s . h . k . h . s . h k k . h k s . o ." }], [
    { wave: "square", gain: 0.045, pat: "E6 . D6 . B5 . G5 . A5 . B5 . C6 . D6 . E6 . G6 . F#6 . D6 . E6 - - - . . . ." },
    { wave: "triangle", gain: 0.2, pat: "C3 C2 . C3 G2 . C3 . D3 D2 . D3 A2 . D3 . E3 E2 . E3 B2 . E3 . C3 C2 . D3 D2 . D3 ." },
    { wave: "drum", pat: "k . h . s . h k k . h . s . h . k . h . s . h k k k s . s s o ." }]] };

  // ---------- state ----------
  var bossT = 0, irisT = 0, cpX = 0, hp = 3, act = 0, mode = "title", hero, cam = { x: 0, y: 0 }, loose = [], parts = [], score = 0, rings = 0, lives = 3, tm = 0, won = 0, dead = 0, actScore0 = 0;
  function newHero() { return { x: 60, y: L.gy(60), gs: 0, vx: 0, vy: 0, ground: true, plat: null, roll: false, spin: false, face: 1, charge: 0, loop: null, loopCd: 0, inv: 0, ph: 0, ang: 0, jumpHeld: false }; }
  function hud() { ui.setStat("rings", String(rings)); ui.setStat("score", FF.n(score)); }
  function loadAct(i, cpx) { irisT = 1; bossT = 0; act = i; L = buildAct(i); hero = newHero(); if (cpx) { hero.x = cpx; hero.y = L.gy(cpx); L.posts.forEach(function (p) { if (p.x <= cpx) p.on = 1; }); } loose = []; parts = []; won = 0; dead = 0; rings = 0; hp = 3; if (!cpx) { tm = 0; cpX = 0; } actScore0 = score; cam.x = 0; cam.y = hero.y - H * 0.6; ui.setCourse(ACTS[i].name); hud(); }
  function puff(x, y, n, c, sp) { for (var i = 0; i < n; i++) { var a = Math.random() * 6.28, v = (sp || 60) * (0.4 + Math.random() * 0.6); parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: 0.5, c: c }); } }

  // ---------- update ----------
  function hurt() {
    var h = hero; if (h.inv > 0 || dead || won) return;
    hp--; if (hp <= 0) return die();
    var n = Math.min(rings, 5); for (var i = 0; i < n; i++) { var a = -Math.PI / 2 + (i - n / 2) * 0.5; loose.push({ x: h.x, y: h.y - 10, vx: Math.cos(a) * 120, vy: Math.sin(a) * 200, life: 3 }); }
    rings -= n; h.inv = 1.6; S.scatter(); h.ground = false; h.plat = null; h.loop = null; h.vy = -260; h.vx = -h.face * 120; h.spin = false; hud();
  }
  function die(why) { if (dead) return; (game.deaths = game.deaths || []).push([why || "hit", Math.round(hero.x)]); dead = 1.6; lives--; S.hurt(); A.stopSong(); hero.loop = null; hero.ground = false; hero.vy = -320; hero.vx = 0; }
  function update(dt) {
    var h = hero;
    if (won) { won -= dt; h.gs *= 0.97; h.x += h.gs * dt; if (L.gy(h.x) != null) h.y = L.gy(h.x); stepParts(dt); if (won <= 0) actClear(); return; }
    if (dead) { dead -= dt; h.vy += 900 * dt; h.y += h.vy * dt; if (dead <= 0) { if (lives <= 0) return gameOver(); var keep = score, keepT = tm; loadAct(act, cpX); score = keep; tm = keepT; A.playSong(SONG); } return; }
    tm += dt; if (h.inv > 0) h.inv -= dt; if (h.loopCd > 0) h.loopCd -= dt;
    var dir = (ui.down("L") ? -1 : 0) + (ui.down("R") ? 1 : 0), jump = ui.hit("J"), down = ui.down("D");
    if (h.loop) {
      var lp = h.loop; h.loop.ph += h.gs / lp.r * dt; h.gs = Math.max(260, h.gs - 40 * dt);
      var ph = lp.ph; h.x = lp.x + Math.sin(ph) * lp.r; h.y = lp.y - lp.r + Math.cos(ph) * lp.r; h.ang = -ph; h.ph += h.gs * dt * 0.1;
      if (ph >= Math.PI * 2) { h.loop = null; h.x = lp.x + 2; h.y = lp.y; h.ang = 0; h.loopCd = 0.4; }
    } else if (h.ground) {
      var gyf = h.plat ? function () { return h.plat.y; } : L.gy;
      var y1 = gyf(h.x - 4), y2 = gyf(h.x + 4);
      if (y1 == null || y2 == null) { y1 = y2 = h.y; }
      var a = Math.atan2(y2 - y1, 8); h.ang = a;
      if (down && Math.abs(h.gs) > 40 && !h.roll) { h.roll = true; S.roll(); }
      if (h.roll) { h.gs += 700 * Math.sin(a) * dt; h.gs -= Math.sign(h.gs) * 50 * dt; if (Math.abs(h.gs) < 30) h.roll = false; if (dir && Math.sign(dir) !== Math.sign(h.gs)) h.gs += dir * 200 * dt; }
      else {
        h.gs += 480 * Math.sin(a) * dt;
        if (dir) { if (Math.sign(dir) !== Math.sign(h.gs) && h.gs !== 0) h.gs += dir * 1100 * dt; else if (Math.abs(h.gs) < 270) h.gs += dir * 340 * dt; h.face = dir; }
        else h.gs -= Math.sign(h.gs) * Math.min(Math.abs(h.gs), 320 * dt);
      }
      h.gs = clamp(h.gs, -620, 620);
      if (jump) { h.ground = false; h.plat = null; h.vx = h.gs * Math.cos(a); h.vy = h.gs * Math.sin(a) - 370; h.spin = true; h.roll = false; h.jumpHeld = true; S.jump(); }
      else {
        var nx = h.x + h.gs * Math.cos(a) * dt;
        if (h.plat) { if (nx < h.plat.x || nx > h.plat.x + h.plat.w) { h.ground = false; h.vx = h.gs; h.vy = 0; h.plat = null; } h.x = nx; h.y = h.plat ? h.plat.y : h.y; }
        else {
          var ny = L.gy(nx);
          if (ny == null) { h.ground = false; h.vx = h.gs * Math.cos(a); h.vy = h.gs * Math.sin(a); h.x = nx; }
          else { h.x = nx; h.y = ny; }
        }
        if (Math.abs(h.gs) > 8) h.face = h.gs > 0 ? 1 : -1;
        h.ph += Math.abs(h.gs) * dt * 0.09;
        // loops: enter with speed
        L.loops.forEach(function (lp) { if (!h.loop && h.loopCd <= 0 && h.gs > 280 && Math.abs(h.x - lp.x) < Math.abs(h.gs) * dt + 1 && h.x >= lp.x) { h.loop = lp; lp.ph = 0; h.x = lp.x; } });
      }
    } else {
      if (dir) { h.vx += dir * 300 * dt; h.face = dir; }
      if (!ui.down("J") && h.jumpHeld && h.vy < -170) h.vy = -170;
      if (!ui.down("J")) h.jumpHeld = false;
      h.vy = Math.min(700, h.vy + 900 * dt); h.vx = clamp(h.vx, -620, 620);
      var px = h.x, py = h.y; h.x += h.vx * dt; h.y += h.vy * dt; h.ang *= 0.9;
      var gy = L.gy(h.x);
      if (h.vy >= 0) {
        var landed = false;
        L.plats.forEach(function (p) { if (!landed && h.x > p.x && h.x < p.x + p.w && py <= p.y && h.y >= p.y) { landed = true; h.y = p.y; h.plat = p; } });
        if (!landed && gy != null && h.y >= gy && py <= gy + 12) { landed = true; h.y = gy; }
        if (landed) { h.ground = true; h.gs = h.vx; if (!down) h.roll = false; h.spin = false; }
      }
      if (gy != null && h.y > gy + 12 && h.vy > 0 && L.gy(h.x) != null && py <= gy) { h.y = gy; h.ground = true; h.gs = h.vx; h.spin = false; }
      if (h.y > L.bottom) die("fall");
    }
    if (h.x < 8) { h.x = 8; h.gs = Math.max(0, h.gs); h.vx = Math.max(0, h.vx); }
    var spinning = h.spin || h.roll || h.loop;
    // springs, gusts, spikes
    L.springs.forEach(function (s) { if (Math.abs(h.x - s.x) < 10 && Math.abs(h.y - s.y) < 8 && !s.cd) { h.ground = false; h.plat = null; h.vy = -660; h.vx = h.ground ? h.gs : (h.vx || h.gs); h.spin = false; h.roll = false; s.t = 0.3; S.spring(); } });
    L.springs.forEach(function (s) { if (s.t > 0) s.t -= dt; });
    L.gusts.forEach(function (gu) { if (h.ground && Math.abs(h.x - gu.x) < 12) { h.gs = Math.max(h.gs, 480); if (!gu.cd || gu.cd < tm) { gu.cd = tm + 0.5; S.gust(); } } });
    L.spikes.forEach(function (sp) { if (h.x > sp.x && h.x < sp.x + sp.w && h.y > sp.y - 8 && h.y <= sp.y + 2) hurt(); });
    // rings
    L.rings.forEach(function (r) { if (!r.got && Math.abs(r.x - h.x) < 11 && Math.abs(r.y - (h.y - 9)) < 13) { r.got = 1; rings++; score += 10; S.ring(); hud(); } });
    loose.forEach(function (r) { r.life -= dt; r.vy += 500 * dt; r.x += r.vx * dt; r.y += r.vy * dt; var gy2 = L.gy(r.x); if (gy2 != null && r.y > gy2) { r.y = gy2; r.vy = -Math.abs(r.vy) * 0.6; } if (h.inv < 1.2 && Math.abs(r.x - h.x) < 11 && Math.abs(r.y - (h.y - 9)) < 13) { r.life = 0; rings++; S.ring(); hud(); } });
    loose = loose.filter(function (r) { return r.life > 0; });
    // foes
    L.foes.forEach(function (f) {
      if (!f.alive) return; f.t += dt;
      if (f.k === "crab") { f.x = f.hx + Math.sin(f.t * 0.8) * 40; var fy = L.gy(f.x); f.y = fy == null ? f.y : fy; }
      else { f.x = f.hx + Math.sin(f.t * 0.9) * 50; f.y = f.hy + Math.sin(f.t * 3) * 10; }
      if (Math.abs(f.x - h.x) < 13 && Math.abs((f.y - 6) - (h.y - 9)) < 15) {
        if (spinning) { f.alive = false; score += 100; S.pop(); puff(f.x, f.y - 6, 12, "#fff", 80); if (!h.ground && !h.loop) h.vy = Math.min(h.vy, -280); hud(); }
        else hurt();
      }
    });
    L.posts.forEach(function (p) { if (!p.on && h.x > p.x) { p.on = 1; cpX = p.x; S.ring(); } });
    // boss: a giant original kite-creature that sweeps the arena and dives; bop it while curled in a jump
    var B = L.boss;
    if (B && B.alive) {
      if (!B.seen && h.x > L.arena[0] + 30) { B.seen = true; bossT = 2.2; S.boss(); }
      if (B.seen) {
        if (h.x < L.arena[0]) { h.x = L.arena[0]; h.gs = Math.max(0, h.gs); h.vx = Math.max(0, h.vx); }
        if (h.x > L.arena[1]) { h.x = L.arena[1]; h.gs = Math.min(0, h.gs); h.vx = Math.min(0, h.vx); }
        B.t += dt; if (B.inv > 0) B.inv -= dt; var sp = 0.9 + act * 0.15;
        if (B.dive > 0) { B.dive -= dt; var dt0 = 1.8 - B.dive, k = dt0 < 0.5 ? dt0 / 0.5 : dt0 < 1.3 ? 1 : Math.max(0, (1.8 - dt0) / 0.5); B.rest = dt0 >= 0.5 && dt0 < 1.3; if (dt0 < 0.5) B.x += (B.tx - B.x) * Math.min(1, dt * 4); B.y = B.gy - 82 + k * 66; if (B.dive <= 0) { B.hx = clamp(B.x - Math.sin(B.t * sp) * 150, L.arena[0] + 170, L.arena[1] - 170); B.rest = false; } }
        else { B.x = B.hx + Math.sin(B.t * sp) * 150; B.y = B.gy - 82 + Math.sin(B.t * sp * 2.3) * 10; if (B.t % (3.4 - act * 0.35) < dt) { B.dive = 1.8; B.tx = clamp(h.x, L.arena[0] + 30, L.arena[1] - 30); S.gust(); } }
        if (Math.abs(B.x - h.x) < 28 && Math.abs((B.y) - (h.y - 9)) < 22 && B.inv <= 0) {
          if (spinning) { B.hp--; B.inv = 1.1; S.pop(); puff(B.x, B.y, 18, B.bc[0], 120); h.vy = -330; h.ground = false; h.vx = (h.x < B.x ? -1 : 1) * 160; B.dive = 0; score += 200; hud(); if (B.hp <= 0) { B.alive = false; score += 3000; hud(); puff(B.x, B.y, 40, "#ffffff", 180); puff(B.x, B.y, 30, B.bc[1], 140); S.clear(); } }
          else if (B.dive > 0) hurt();
        }
      }
    }
    if (h.x >= L.goal && !won && !(L.boss && L.boss.alive)) { won = 2.2; S.clear(); A.stopSong(); }
    stepParts(dt);
    var tx = h.x - W * 0.38 + clamp(h.gs || h.vx, -300, 300) * 0.25, ty = h.y - H * 0.58;
    cam.x += (tx - cam.x) * Math.min(1, dt * 6); cam.y += (ty - cam.y) * Math.min(1, dt * 5);
    cam.x = clamp(cam.x, 0, L.w - W);
  }
  function stepParts(dt) { parts.forEach(function (p) { p.life -= dt; p.vy += 300 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }); parts = parts.filter(function (p) { return p.life > 0; }); }

  // ---------- render ----------
  var CLOUDS = []; for (var ci = 0; ci < 9; ci++) CLOUDS.push([ci * 97 % 400, 14 + (ci * 37) % 50, 20 + (ci * 13) % 24]);
  var HUTS = ["#ff5a7a", "#3ab0ff", "#ffd23a", "#7ae05a", "#c87aff", "#ff9a3a"];
  function render(c, tt) {
    if (!W) sizeLo(); if (!L) loadAct(0);
    var gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#0a6ae8"); gr.addColorStop(0.35, "#1e8cff"); gr.addColorStop(0.62, "#8fd4ff"); gr.addColorStop(1, "#e8f8ff"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    var sunx = W * 0.82 - cam.x * 0.01 + 9; FXP.glow(g, sunx, 27, 90, "#fff4c0", 0.55); g.fillStyle = "#fff7b0"; g.beginPath(); g.arc(sunx, 27, 10, 0, 7); g.fill(); g.fillStyle = "#ffffff"; g.beginPath(); g.arc(sunx - 3, 24, 4, 0, 7); g.fill();
    CLOUDS.forEach(function (cl, ci) { var far = ci % 2, x = ((cl[0] - cam.x * (far ? 0.05 : 0.1) - tt * (far ? 2 : 5)) % (W + 80) + W + 80) % (W + 80) - 50; FXP.cloud(g, x, cl[1] + (far ? 0 : 10), cl[2] / (far ? 6 : 4.5), far ? "rgba(255,255,255,0.75)" : "#ffffff", "rgba(110,160,230,0.45)"); });
    var sea = H * 0.42 - clamp(cam.y - 180, -60, 60) * 0.1; var sg = g.createLinearGradient(0, sea, 0, sea + 40); sg.addColorStop(0, "#3a9aff"); sg.addColorStop(1, "#0a4ab8"); g.fillStyle = sg; g.fillRect(0, sea, W, H); for (var s = 0; s < W; s += 9) { var sk = Math.sin(tt * 3 + s) > 0.6; R((s - cam.x * 0.15 + tt * 6) % W, sea + 3 + (s % 5), sk ? 5 : 3, 1, sk ? "#ffffff" : "#8ad8ff"); }
    // distant chalk cliffs over the sea
    for (var cx0 = 0; cx0 < W; cx0 += 2) { var cwx = cx0 + cam.x * 0.12; var ch0 = 18 + 10 * Math.sin(cwx * 0.02) + 5 * Math.sin(cwx * 0.057); if (Math.sin(cwx * 0.006) < -0.2) continue; R(cx0, sea - ch0 + 2, 2, ch0, (Math.floor(cwx / 2) % 7 === 0) ? "#cfd6e4" : "#f4f6fb"); R(cx0, sea - ch0, 2, 3, "#3ac85a"); }
    // far chalk cliffs and downs
    var dg = g.createLinearGradient(0, sea - 40, 0, sea); dg.addColorStop(0, "#3ab84a"); dg.addColorStop(1, "#1a7a2a"); g.fillStyle = dg; for (var x = 0; x < W; x += 2) { var wx = x + cam.x * 0.25; var hh = 22 + 12 * Math.sin(wx * 0.012) + 6 * Math.sin(wx * 0.031); g.fillRect(x, sea - hh, 2, hh); }
    g.fillStyle = "#5ae05a"; for (var x2 = 0; x2 < W; x2 += 2) { var wx2 = x2 + cam.x * 0.25; var hh2 = 22 + 12 * Math.sin(wx2 * 0.012) + 6 * Math.sin(wx2 * 0.031); g.fillRect(x2, sea - hh2 - 3, 2, 4); }
    R(0, sea + 13 - cam.y * 0.03, W, 4, "#ffe8a8");
    for (var b = 0; b < 12; b++) { var bx = ((b * 70 - cam.x * 0.45) % (W + 70) + W + 70) % (W + 70) - 30, by = sea + 14 - cam.y * 0.03; R(bx, by - 10, 12, 10, HUTS[b % 6]); R(bx - 1, by - 13, 14, 3, "#ffffff"); R(bx + 4, by - 6, 4, 6, "#ffffff"); }
    // loops (behind)
    L.loops.forEach(function (lp) { var cx = lp.x - cam.x, cy = lp.y - lp.r - cam.y; if (cx < -80 || cx > W + 80) return; g.lineWidth = 7; g.strokeStyle = "#f2eedc"; g.beginPath(); g.arc(cx, cy, lp.r + 4, 0, 7); g.stroke(); g.lineWidth = 3; g.strokeStyle = "#3ac83a"; g.beginPath(); g.arc(cx, cy, lp.r + 1, 0, 7); g.stroke(); });
    // ground columns
    var i0 = Math.floor(cam.x / COL) - 1, i1 = Math.ceil((cam.x + W) / COL) + 1;
    for (var i = i0; i <= i1; i++) {
      var gy = L.hs[i]; if (gy == null) continue;
      var sx = i * COL - cam.x, sy = gy - cam.y;
      R(sx, sy, COL, H - sy + 2, "#f2eedc");
      for (var k = 0; k < 5; k++) { var yy = sy + 14 + k * 18 + Math.round(4 * Math.sin((i * COL) * 0.02 + k)); if (yy < H) R(sx, yy, COL, 3, k % 2 ? "#a8743a" : "#d8c8a0"); }
      if ((i * 13) % 17 === 0) R(sx + 1, sy + 20 + (i % 30), 2, 2, "#5a6a7a");
      R(sx, sy + 6, COL, 2, "#8a5a24");
      R(sx, sy + 30, COL, H, "rgba(120,90,40,0.10)"); R(sx, sy + 70, COL, H, "rgba(90,60,30,0.12)");
      R(sx, sy, COL, 6, "#1fb84a"); R(sx, sy, COL, 2, "#8af06a"); R(sx, sy - 1, COL, 1, "#0d5a24"); R(sx, sy + 8, COL, 2, "rgba(0,0,0,0.12)");
      var pv = L.hs[i - 1], nv = L.hs[i + 1]; if (pv == null) R(sx, sy, 1, H - sy, "#0d5a24"); if (nv == null) R(sx + COL - 1, sy, 1, H - sy, "#0d5a24");
      if (i % 11 === 0) { R(sx + 1, sy - 3, 1, 3, "#2ab02e"); R(sx, sy - 4, 3, 2, i % 22 ? "#ffe23a" : "#ff5ab0"); }
    }
    L.plats.forEach(function (p) { var sx = p.x - cam.x, sy = p.y - cam.y; if (sx > W || sx + p.w < 0) return; R(sx, sy, p.w, 10, "#f2eedc"); R(sx, sy + 6, p.w, 2, "#a8743a"); R(sx, sy, p.w, 4, "#36c83a"); R(sx, sy, p.w, 1, "#8af06a"); R(sx + 4, sy + 10, p.w - 8, 3, "#6a3a10"); });
    L.spikes.forEach(function (sp) { for (var k2 = 0; k2 < sp.w; k2 += 6) { var sx = sp.x + k2 - cam.x, sy = sp.y - cam.y; R(sx + 2, sy - 8, 2, 8, "#c8d0e0"); R(sx + 1, sy - 4, 4, 4, "#8a94a8"); } });
    L.springs.forEach(function (sp) { var sx = sp.x - cam.x, sy = sp.y - cam.y, dip = sp.t > 0 ? 3 : 0; R(sx - 10, sy - 7, 2, 7, "#1a8a3a"); R(sx + 8, sy - 7, 2, 7, "#1a8a3a"); R(sx - 10, sy - 8 + dip, 20, 2, "#2a6ae8"); R(sx - 9, sy - 9, 1, 1, "#ffffff"); R(sx + 8, sy - 9, 1, 1, "#ffffff"); });
    L.gusts.forEach(function (gu) { var sx = gu.x - cam.x, sy = gu.y - cam.y; for (var k3 = 0; k3 < 3; k3++) { var o = (tt * 40 + k3 * 8) % 24; R(sx - 12 + o, sy - 10 + k3 * 3, 6, 1, "#ffffff"); } R(sx - 10, sy - 2, 20, 2, "#3ab0ff"); });
    if (L.goal) { var gx = L.goal - cam.x, gyy = L.gy(L.goal) - cam.y; R(gx - 30, gyy - 44, 3, 44, "#ffffff"); R(gx + 28, gyy - 44, 3, 44, "#ffffff"); for (var bn = 0; bn < 10; bn++) { R(gx - 27 + bn * 6, gyy - 42 + Math.round(Math.sin(bn / 9 * Math.PI) * 4), 4, 4, ["#ff3a5a", "#2a6ae8", "#1fb84a", "#ffe23a"][bn % 4]); } var fy2 = won ? Math.max(0, 30 - (2.2 - won) * 30) : 30; R(gx + 31, gyy - 44 + fy2, 10, 7, "#ff3a5a"); R(gx + 31, gyy - 41 + fy2, 10, 1, "#ffffff"); }
    function ring(x, y) { var c2 = ["#5af0c8", "#7ac8ff", "#a8ff8a"][Math.floor(Math.abs(x * 0.37)) % 3], bob = Math.round(Math.sin(tt * 3 + x * 0.05)); y += bob; R(x - 1, y - 5, 2, 2, c2); R(x - 2, y - 3, 4, 3, c2); R(x - 3, y, 6, 3, c2); R(x - 1, y - 2, 1, 2, "#ffffff"); R(x - 2, y + 2, 4, 1, "rgba(0,60,90,0.5)"); }
    L.rings.forEach(function (r) { if (!r.got && r.x - cam.x > -10 && r.x - cam.x < W + 10) ring(r.x - cam.x, r.y - cam.y); });
    loose.forEach(function (r) { if (r.life > 1 || Math.floor(tt * 12) % 2) ring(r.x - cam.x, r.y - cam.y); });
    var g0 = g; g = FXP.layer(W, H);
    L.foes.forEach(function (f) { if (!f.alive) return; var sx = f.x - cam.x, sy = f.y - cam.y; if (sx < -20 || sx > W + 20) return;
      if (f.k === "crab") { var st = Math.floor(f.t * 6) % 2; R(sx - 7, sy - 4 - st, 2, 4 + st, "#8a5a24"); R(sx + 5, sy - 4 - (1 - st), 2, 4 + (1 - st), "#8a5a24"); for (var dc = 0; dc < 4; dc++) R(sx - 8 + dc * 4, sy - 16, 4, 11, dc % 2 ? "#ffffff" : "#ff3a5a"); R(sx - 8, sy - 17, 16, 1, "#8a5a24"); R(sx - 4, sy - 13, 2, 2, "#111"); R(sx + 2, sy - 13, 2, 2, "#111"); R(sx - 3, sy - 9, 6, 1, "#111"); }
      else { g.fillStyle = "#b03ae8"; g.beginPath(); g.moveTo(sx, sy - 20); g.lineTo(sx + 9, sy - 10); g.lineTo(sx, sy); g.lineTo(sx - 9, sy - 10); g.fill(); R(sx - 1, sy - 19, 2, 18, "#ffe23a"); R(sx - 8, sy - 11, 16, 2, "#ffe23a"); R(sx - 4, sy - 8, 8, 2, "#fff"); for (var tk = 0; tk < 4; tk++) R(sx - 4 + tk * 2, sy - 6, 1, 2, "#fff"); R(sx - 4, sy - 13, 2, 2, "#111"); R(sx + 2, sy - 13, 2, 2, "#111"); for (var tl = 0; tl < 4; tl++) R(sx - 1 + Math.sin(tt * 6 + tl) * 2, sy + tl * 4, 2, 2, tl % 2 ? "#ff3a5a" : "#2a6ae8"); } });
    L.posts.forEach(function (p) { var px = p.x - cam.x, py = p.y - cam.y; if (px < -10 || px > W + 10) return; R(px - 1, py - 30, 3, 30, "#ffffff"); R(px - 4, py - 36, 9, 7, p.on ? "#1fb84a" : "#2a6ae8"); R(px - 2, py - 34, 5, 3, "#fff6a0"); });
    drawHero(tt); drawBoss(tt);
    g = g0; FXP.flush(g, "#0a2440");
    if (L.boss && L.boss.alive && L.boss.seen) { var bb = L.boss; FXP.glow(g, bb.x - cam.x, bb.y - cam.y, 40, bb.bc[1], 0.18); }
    parts.forEach(function (p) { R(p.x - cam.x, p.y - cam.y, 2, 2, p.c); });
    if (mode !== "title") { var t2 = Math.floor(tm), ss = t2 % 60; g.fillStyle = "rgba(0,40,120,0.5)"; g.fillRect(3, 3, 60, 10); g.fillStyle = "#fff"; g.font = "8px monospace"; g.fillText("TIME " + Math.floor(t2 / 60) + ":" + (ss < 10 ? "0" : "") + ss, 6, 11); for (var lv = 0; lv < 3; lv++) { var hc = lv < hp ? "#ff3a5a" : "rgba(0,40,120,0.5)"; R(70 + lv * 8, 5, 3, 3, hc); R(73 + lv * 8, 5, 3, 3, hc); R(71 + lv * 8, 7, 4, 3, hc); } g.fillStyle = "#fff"; g.fillText("x" + lives, W - 18, 11); }
    FXP.ambient(g, W, H, cam, tt, "drift", "rgba(255,255,255,0.8)", 18);
    FXP.vignette(g, W, H, 0.32);
    if (L.boss && L.boss.seen && L.boss.alive) { var bw = 90, bx2 = W / 2 - bw / 2; R(bx2 - 1, H - 13, bw + 2, 7, "#0a2440"); R(bx2, H - 12, bw * L.boss.hp / L.boss.max, 5, L.boss.bc[0]); R(bx2, H - 12, bw * L.boss.hp / L.boss.max, 1, "#ffffff"); if (bossT > 0) FXP.banner(g, L.boss.name, W / 2, H * 0.38, 16, L.boss.bc[1] === "#ffffff" ? "#8ad8ff" : L.boss.bc[1]); }
    if (bossT > 0) bossT -= 1 / 60; if (irisT > 0) { FXP.iris(g, W, H, irisT, hero ? hero.x - cam.x : W / 2, hero ? hero.y - cam.y - 10 : H / 2); irisT -= 1 / 40; }
    c.drawImage(lo, 0, 0, W * PX, H * PX);
    
  }
  function drawBoss(tt) {
    var B = L.boss; if (!B || !B.alive) return; if (B.inv > 0 && Math.floor(tt * 14) % 2) return;
    var sx = Math.round(B.x - cam.x), sy = Math.round(B.y - cam.y); if (sx < -60 || sx > W + 60) return;
    var c1 = B.bc[0], c2 = B.bc[1], flap = Math.sin(tt * 8) * 3;
    // tail of bows
    for (var k = 0; k < 7; k++) { var tx = sx - 4 - k * 6 + Math.sin(tt * 5 + k) * 2, ty = sy + 16 + k * 4 + Math.cos(tt * 4 + k) * 3; R(tx, ty, 4, 2, k % 2 ? c1 : c2); R(tx + 1, ty - 1, 2, 4, k % 2 ? c1 : c2); }
    // diamond body with wing panels
    g.fillStyle = c1; g.beginPath(); g.moveTo(sx, sy - 20); g.lineTo(sx + 22, sy - 2 + flap); g.lineTo(sx, sy + 18); g.lineTo(sx - 22, sy - 2 + flap); g.closePath(); g.fill();
    g.fillStyle = c2; g.beginPath(); g.moveTo(sx, sy - 20); g.lineTo(sx + 22, sy - 2 + flap); g.lineTo(sx, sy - 2); g.closePath(); g.fill(); g.beginPath(); g.moveTo(sx, sy + 18); g.lineTo(sx - 22, sy - 2 + flap); g.lineTo(sx, sy - 2); g.closePath(); g.fill();
    R(sx - 1, sy - 19, 2, 36, "#5a3a1a"); R(sx - 20, sy - 3 + flap * 0.5, 40, 2, "#5a3a1a");
    // stern face
    R(sx - 9, sy - 8, 6, 6, "#ffffff"); R(sx + 3, sy - 8, 6, 6, "#ffffff"); var ex = Math.round(clamp((hero.x - B.x) / 60, -1, 1) * 2); R(sx - 7 + ex, sy - 6, 2, 3, "#111"); R(sx + 5 + ex, sy - 6, 2, 3, "#111");
    R(sx - 10, sy - 11, 7, 2, "#111"); R(sx + 3, sy - 11, 7, 2, "#111"); R(sx - 5, sy + 3, 10, 2, "#111"); R(sx - 3, sy + 5, 6, 1, "#ff5a7a");
    if (B.rest) { for (var st2 = 0; st2 < 3; st2++) { var an = tt * 5 + st2 * 2.1; R(sx + Math.cos(an) * 14, sy - 26 + Math.sin(an) * 3, 2, 2, "#fff7b0"); } }
  }
  function drawHero(tt) {
    var h = hero; if (!h || mode === "title") return; if (h.inv > 0 && Math.floor(tt * 16) % 2 && !dead) return;
    var sx = h.x - cam.x, sy = h.y - cam.y;
    g.save(); g.translate(Math.round(sx), Math.round(sy)); g.rotate(h.ground || h.loop ? h.ang : 0);
    var f = h.face, ph = h.ph; g.scale(f, 1);
    var BODY = "#b8906a", DARK = "#8a6448", BELLY = "#f4e8d4", SCARF = "#14a85a";
    if (h.roll) {
      g.fillStyle = BODY; g.fillRect(-6, -8, 12, 7); g.fillStyle = BELLY; g.fillRect(-2, -5, 6, 3); g.fillStyle = DARK; g.fillRect(-6, -2, 12, 2);
      g.fillStyle = BODY; g.fillRect(3, -12, 7, 6); g.fillStyle = "#111"; g.fillRect(7, -10, 1, 1); g.fillStyle = BODY; g.fillRect(-4, -11, 8, 2); g.fillStyle = DARK; g.fillRect(-5, -10, 7, 2);
      g.fillStyle = SCARF; g.fillRect(1, -7, 4, 2); g.fillRect(-9, -9 + (Math.sin(tt * 20) > 0 ? 1 : 0), 6, 2);
    } else if (h.spin) {
      g.fillStyle = DARK; g.fillRect(-5, -6, 3, 6); g.fillStyle = BODY; g.fillRect(-1, -5, 9, 3); g.fillStyle = BELLY; g.fillRect(6, -5, 3, 3);
      g.fillStyle = BODY; g.fillRect(-4, -14, 8, 9); g.fillStyle = BELLY; g.fillRect(0, -12, 3, 6); g.fillStyle = SCARF; g.fillRect(-4, -14, 9, 2); g.fillRect(-10, -16, 6, 2);
      g.fillStyle = BODY; g.fillRect(-1, -20, 8, 7); g.fillStyle = "#111"; g.fillRect(4, -18, 1, 2); g.fillStyle = DARK; g.fillRect(-4, -27, 3, 8); g.fillRect(-1, -26, 3, 7);
      g.fillStyle = BODY; g.fillRect(4, -12, 5, 2);
    } else {
      var run = Math.abs(h.gs) > 20 || !h.ground, lg = run ? Math.sin(ph * 2) * 4 : 0, fast = Math.abs(h.gs) > 330;
      g.fillStyle = DARK; g.fillRect(-2 + lg, -5, 3, 5); g.fillRect(-1 - lg, -5, 3, 5); g.fillStyle = BELLY; g.fillRect(-1 + lg, -1, 5, 2); g.fillRect(-lg, -1, 5, 2);
      g.fillStyle = BODY; g.fillRect(-4, -13, 8, 9); g.fillStyle = BELLY; g.fillRect(0, -11, 3, 6);
      g.fillStyle = SCARF; g.fillRect(-4, -13, 9, 2); var fl = Math.sin(tt * 18) > 0 ? 1 : 0; g.fillRect(-9 - (fast ? 3 : 0), -13 + fl, 5 + (fast ? 3 : 0), 2);
      g.fillStyle = BODY; g.fillRect(-1, -19, 8, 7); g.fillStyle = "#111"; g.fillRect(4, -17, 1, 2); g.fillStyle = "#e8a0a8"; g.fillRect(6, -15, 2, 1); g.fillStyle = BELLY; g.fillRect(5, -14, 2, 1);
      var ear = run ? -0.9 : -0.15; g.save(); g.translate(1, -19); g.rotate(ear); g.fillStyle = BODY; g.fillRect(-1, -9, 3, 9); g.fillStyle = "#111"; g.fillRect(-1, -9, 3, 2); g.translate(3, 0); g.fillStyle = DARK; g.fillRect(-1, -8, 3, 8); g.fillStyle = "#111"; g.fillRect(-1, -8, 3, 2); g.restore();
      g.fillStyle = BELLY; g.fillRect(-6, -9, 2, 2);
    }
    g.restore();
  }

  // ---------- flow ----------
  function actClear() {
    ui.stop(); mode = "clear";
    var tb = Math.max(0, Math.round((120 - tm) / 2)) * 100, rb = rings * 50; score += tb + rb; hud();
    var b = save.best[act]; if (!b || tm < b) save.best[act] = tm; if (act + 2 > save.open) save.open = Math.min(ACTS.length, act + 2);
    if (score > save.hi) save.hi = score; ui.persist();
    var last = act + 1 >= ACTS.length;
    ui.menu({ kicker: ACTS[act].name, title: last ? "Downs conquered!" : "Act clear", stats: '<b class="ff-score-xl">' + FF.n(score) + "</b><span>TIME " + FF.fmtTime(tm) + " · BONUS " + FF.n(tb) + "</span><span>SEA-GLASS " + rings + " · BONUS " + FF.n(rb) + "</span>",
      buttons: last ? [{ label: "Menu", act: toTitle }] : [{ label: "Next act", act: function () { mode = "play"; loadAct(act + 1); ui.go(); A.playSong(SONG); } }, { label: "Menu", small: true, act: toTitle }] });
    if (last) ui.runEnded();
  }
  function gameOver() {
    ui.stop(); mode = "over"; A.stopSong(); ui.runEnded();
    var hi = score > save.hi; if (hi) save.hi = score; ui.persist();
    ui.menu({ title: "Game over", stats: '<b class="ff-score-xl">' + FF.n(score) + "</b><span>" + (hi ? "NEW HIGH SCORE" : "HIGH SCORE " + FF.n(save.hi)) + "</span>", buttons: [{ label: "Try " + ACTS[act].name.split(" · ")[0] + " again", act: function () { play(act); } }, { label: "Menu", act: toTitle }] });
  }
  function play(i) { mode = "play"; score = 0; lives = 3; cpX = 0; loadAct(i); ui.go(); A.playSong(SONG); }
  function toTitle() {
    ui.stop(); mode = "title"; loadAct(0); A.playSong(SONG); ui.setCourse("Chalk Downs");
    ui.menu({ title: "LOOPWICK", body: "Fenn the hare, the chalk downs and a very long way down to the sea.",
      stats: "<span>HIGH SCORE " + (save.hi ? FF.n(save.hi) : "-") + "</span>" + ACTS.map(function (a, i) { return save.best[i] ? "<span>" + a.name.split(" · ")[0].toUpperCase() + " " + FF.fmtTime(save.best[i]) + "</span>" : ""; }).join(""),
      buttons: [{ label: "Play", act: function () { play(0); } }], row: ACTS.map(function (a, i) { return { label: "Act " + (i + 1), disabled: i >= save.open, act: function () { play(i); } }; }), app: true,
      help: ["◀ ▶ run: you build speed slowly and slopes do the rest. A jump is a flying kick: land on creatures to knock them out.", "Hold Tuck (or ▼) while running to crouch low: less drag, more speed down hills, and you bowl creatures over.", "Hit loops fast to go round. Three hearts per life: a knock costs a heart and spills some sea-glass, which you can grab back."], fine: "A Forest Forge game" });
  }
  var game = { toTitle: toTitle, onResize: sizeLo, update: function (dt) { if (mode === "play") update(dt); }, render: render,
    idle: function (dt) { if (mode === "title" && L) { cam.x += dt * 60; if (cam.x > L.w - W) cam.x = 0; cam.y = L.gy(cam.x + W / 2) - H * 0.6 || cam.y; } },
    onBack: function () { if (mode === "title") return "exit"; toTitle(); return "menu"; } };
  ui.onAdsRemoved = function () { if (mode === "title") toTitle(); };
  game.qa = { toBoss: function () { hero.x = L.arena[0] + 40; hero.y = L.gy(hero.x); hero.gs = 0; }, play: play, state: function () { return { mode: mode, act: act, x: hero.x, y: hero.y, gs: hero.gs, ground: hero.ground, loop: !!hero.loop, rings: rings, lives: lives, score: score, goal: L.goal, boss: L.boss && { x: L.boss.x, y: L.boss.y, hp: L.boss.hp, alive: L.boss.alive, seen: L.boss.seen, dive: L.boss.dive, rest: !!L.boss.rest }, dead: dead, won: won, tm: tm }; }, L: function () { return L; }, inv: function () { hero.inv = 1e9; }, lives: function (n) { lives = n; } };
  ui.start(game);
})();
