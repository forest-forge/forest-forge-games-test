/* Brassjack (Forest Forge). Jack, a wind-up clockwork fox, chases four runaway town
 * machines through their own stages. Beat one and you take its trick. Pick the order
 * on the stage board. Built on platform.js. Original game: all art drawn in code,
 * all sound generated (shell.js). */
(function () {
  "use strict";
  var clamp = FF.clamp, TS = PF.TS;
  var ui = FF.create({
    id: "brassjack", title: "Brassjack", course: "Stage board", wide: true, view: { w: 640, h: 360, flex: true },
    stats: [{ id: "score", label: "Score", value: "0" }, { id: "wpn", label: "Trick", value: "Pea" }],
    pads: {
      left: [{ id: "L", icon: "left", aria: "Left", keys: ["ArrowLeft", "KeyA"] }, { id: "R", icon: "right", aria: "Right", keys: ["ArrowRight", "KeyD"] }],
      right: [{ id: "W", label: "Trick", aria: "Change trick", keys: ["KeyC", "KeyQ", "Tab"] }, { id: "B", label: "Fire", aria: "Fire", keys: ["KeyX", "KeyK", "ShiftLeft"] }, { id: "J", icon: "up", cls: "big", aria: "Jump", keys: ["Space", "ArrowUp", "KeyW", "KeyZ"] }]
    }
  });
  var A = ui.audio, save = ui.save; save.hi = save.hi || 0; save.beat = save.beat || {};
  var PX = 2, lo = document.createElement("canvas"), g = lo.getContext("2d"), W = 320, H = 180;
  function sizeLo() { W = Math.ceil(ui.VW / PX); H = Math.ceil(ui.VH / PX); lo.width = W; lo.height = H; g.imageSmoothingEnabled = false; }
  function R(x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }

  // ---------- stages from segments ----------
  var HT = 14;
  function compose(segs) {
    var cols = [], ents = [];
    function col(h, top, extra) { var c = []; for (var y = 0; y < HT; y++) c.push(y >= HT - h ? "#" : " "); if (top) c[HT - h - 1] = top; if (extra) for (var k in extra) c[k] = extra[k]; cols.push(c); }
    var hNow = 3;
    segs.split(" ").forEach(function (s) {
      var p = s.split(":"), t = p[0], n = +p[1] || 1, a = +p[2] || 0, i;
      if (t === "g") { hNow = a || hNow; for (i = 0; i < n; i++) col(hNow); }
      else if (t === "pit") for (i = 0; i < n; i++) col(0);
      else if (t === "spk") for (i = 0; i < n; i++) col(1, "^");
      else if (t === "plat") for (i = 0; i < n; i++) { var ex = {}; if (i % 4 !== 3) ex[HT - hNow - (a || 3)] = "="; col(0, null, ex); }
      else if (t === "ceil") for (i = 0; i < n; i++) { var ex2 = {}; for (var y = 0; y < (a || 4); y++) ex2[y] = "#"; col(hNow, null, ex2); }
      else if (t === "door") { cols.push(cols.length ? cols[cols.length - 1].slice() : []); ents.push({ ch: "D", tx: cols.length - 1, ty: HT - hNow - 1 }); }
      else ents.push({ ch: t, tx: cols.length - 1 - (a || 0), ty: HT - hNow - 1 - (+p[1] || 0) });
    });
    // boss arena
    var aw = 22, top = HT - 3; for (var i2 = 0; i2 < aw; i2++) { var c = []; for (var y2 = 0; y2 < HT; y2++) c.push(y2 >= top + 0 || y2 === 0 || i2 === aw - 1 ? "#" : " "); if (i2 === 5 || i2 === 16) c[top - 4] = "="; cols.push(c); }
    ents.push({ ch: "X", tx: cols.length - 5, ty: top - 1 });
    var rows = []; for (var y3 = 0; y3 < HT; y3++) { var r = ""; for (var x = 0; x < cols.length; x++) r += cols[x][y3]; rows.push(r); }
    ents.forEach(function (e) { rows[e.ty] = rows[e.ty].substring(0, e.tx) + e.ch + rows[e.ty].substring(e.tx + 1); });
    return { rows: rows, arena: cols.length - aw };
  }
  var STAGES = [
    { id: "kate", name: "Kettle Works", boss: "Kettle Kate", wpn: "steam", weak: "hail", th: { sky: ["#e8f4ff", "#ffffff"], far: "#bfe0ff", near: "#ff6a6a", dirt: "#e8eef8", dirtD: "#b8c8e0", top: "#ff3a4a", topD: "#c81a2a", plank: "#3ac8ff", spike: "#3a5aa8", deco: null }, bg: "#9ad8ff",
      segs: "g:14:3 w:0:3 g:6 pit:3 g:10 t:0:2 g:6:5 m:0:2 g:8:3 spk:4 g:6 f:3:2 plat:8:3 g:10:3 K:0:4 m:0:1 g:8 t:0:2 g:6:5 pit:3 g:8:3 w:0:3 g:6 f:3:2 g:4 door" },
    { id: "percy", name: "Pylon Fields", boss: "Pylon Percy", wpn: "spark", weak: "thorn", th: { sky: ["#0a1a6a", "#2a6ae8"], stars: 1, far: "#1a2a8a", near: "#14207a", dirt: "#ffd23a", dirtD: "#d8a81a", top: "#3affff", topD: "#1ac8d8", plank: "#ffffff", spike: "#3affff" }, bg: "#2a6ae8",
      segs: "g:12:3 f:4:2 g:6 pit:3 g:8 m:0:2 g:6:6 t:0:2 g:6:3 spk:6 g:8 f:4:2 g:6 plat:12:3 g:8:3 K:0:4 w:0:2 g:8 pit:3 g:6:5 t:0:2 g:6:3 m:0:3 spk:4 g:8 f:4:2 g:4 door" },
    { id: "hal", name: "Weathercock Heights", boss: "Hailstone Hal", wpn: "hail", weak: "spark", th: { sky: ["#3aa8ff", "#e8f8ff"], sun: "#fffbd0", far: "#ffffff", near: "#c8e8ff", dirt: "#7ac8ff", dirtD: "#4a98e0", top: "#ffffff", topD: "#d8f0ff", plank: "#ffffff", spike: "#2a5ad8" }, bg: "#3aa8ff",
      segs: "g:10:3 f:4:2 g:4 plat:12:3 g:6:5 m:0:2 g:4 plat:8:3 g:6:7 t:0:2 g:4:5 pit:3 g:6:3 K:0:4 w:0:2 g:6 plat:12:3 g:6:6 f:4:2 g:4 pit:3 g:6:4 m:0:2 g:6:3 spk:4 g:6 door" },
    { id: "bess", name: "Hedge Maze", boss: "Bramble Bess", wpn: "thorn", weak: "steam", th: { sky: ["#ff5ad8", "#ffd0f4"], far: "#ff8ae8", near: "#3ad84a", dirt: "#1aa83a", dirtD: "#0e7a2a", top: "#7aff5a", topD: "#3ad83a", plank: "#ff5ad8", spike: "#ff2a8a", deco: ["#ff2a8a", "#ffffff"] }, bg: "#ff8ae8",
      segs: "g:10:3 w:0:3 g:6 ceil:8:7 m:0:2 g:6 pit:3 g:8 t:0:2 spk:5 g:6 f:3:2 ceil:10:6 w:0:4 g:6:5 K:0:4 g:6:3 pit:3 g:6 m:0:2 plat:8:3 g:6:3 ceil:8:7 t:0:3 g:6 spk:4 g:6 f:3:2 g:4 door" },
    { id: "reg", name: "Clock Tower", boss: "The Grand Regulator", wpn: null, weak: null, th: { sky: ["#2a0a5a", "#5a2aa8"], stars: 1, far: "#3a1a7a", near: "#2a0e5a", dirt: "#8a5ad8", dirtD: "#6a3ab0", top: "#ffd23a", topD: "#d8a81a", plank: "#ffd23a", spike: "#ffd23a" }, bg: "#5a2aa8",
      segs: "g:10:3 m:0:2 g:6 pit:3 g:6 t:0:2 g:6:5 f:3:2 spk:5 g:6:3 w:0:3 g:6 plat:12:3 g:6:3 K:0:4 m:0:2 g:6:6 t:0:2 g:6:3 pit:3 g:6 f:3:2 spk:5 g:8 door" }
  ];
  var WPN = {
    pea: { name: "Pea", col: "#ffe23a", cost: 0 }, steam: { name: "Steam", col: "#ffffff", cost: 2 }, spark: { name: "Spark", col: "#3affff", cost: 2 },
    hail: { name: "Hail", col: "#bfe8ff", cost: 1 }, thorn: { name: "Thorn", col: "#ff5ad8", cost: 2 }
  };

  // ---------- sound ----------
  var S = {
    shot: function () { A.tone({ f: 880, f2: 660, dur: 0.05, type: "square", gain: 0.06 }); },
    big: function () { A.noise({ dur: 0.15, gain: 0.14, freq: 1500, filter: "bandpass" }); A.tone({ f: 300, f2: 900, dur: 0.12, type: "sawtooth", gain: 0.06 }); },
    jump: function () { A.tone({ f: 330, f2: 520, dur: 0.07, type: "square", gain: 0.06 }); },
    land: function () { A.noise({ dur: 0.04, gain: 0.06, freq: 600, filter: "lowpass" }); },
    hit: function () { A.tone({ f: 200, f2: 90, dur: 0.08, type: "square", gain: 0.12 }); },
    pop: function () { A.noise({ dur: 0.2, gain: 0.2, freq: 700, filter: "bandpass" }); },
    hurt: function () { [700, 500, 700, 500].forEach(function (f, i) { A.tone({ f: f, dur: 0.05, type: "square", gain: 0.08, delay: i * 0.05 }); }); },
    pick: function () { A.tone({ f: 1046, dur: 0.05, type: "square", gain: 0.07 }); A.tone({ f: 1568, dur: 0.07, type: "square", gain: 0.07, delay: 0.05 }); },
    boss: function () { [130, 0, 130, 0, 196].forEach(function (f, i) { if (f) A.tone({ f: f, dur: 0.12, type: "sawtooth", gain: 0.1, delay: i * 0.12 }); }); },
    die: function () { for (var i = 0; i < 8; i++) A.tone({ f: 1200 - i * 120, dur: 0.06, type: "square", gain: 0.08, delay: i * 0.06 }); },
    win: function () { [523, 659, 784, 1047, 0, 784, 1047, 1319].forEach(function (f, i) { if (f) A.tone({ f: f, dur: 0.14, type: "square", gain: 0.09, delay: i * 0.11 }); }); }
  };
  var SONG = { bpm: 152, order: [0, 0, 1], parts: [[
    { wave: "square", gain: 0.045, pat: "A4 . C5 E5 A5 . G5 E5 F5 . E5 D5 E5 . . . A4 . C5 E5 A5 . B5 C6 B5 . G5 . E5 . . ." },
    { wave: "triangle", gain: 0.2, pat: "A2 A2 A3 A2 A2 A3 A2 A3 F2 F2 F3 F2 G2 G2 G3 G2 A2 A2 A3 A2 A2 A3 A2 A3 E2 E2 E3 E2 E2 E3 G#2 G#3" },
    { wave: "drum", pat: "k . h k s . h . k . h k s . h h k . h k s . h . k . h k s s o ." }], [
    { wave: "square", gain: 0.045, pat: "D5 . F5 . A5 . G5 F5 E5 . G5 . C6 . B5 A5 B5 . G5 . E5 . F5 G5 A5 - - - . . . ." },
    { wave: "triangle", gain: 0.2, pat: "D2 D2 D3 D2 D2 D3 D2 D3 C2 C2 C3 C2 C2 C3 C2 C3 G2 G2 G3 G2 G2 G3 G2 G3 A2 A2 A3 A2 E2 E3 A2 A3" },
    { wave: "drum", pat: "k . h k s . h . k . h k s . h h k . h k s . h . k k s . s s o ." }]] };
  var BOSS_SONG = { bpm: 170, order: [0], parts: [[
    { wave: "square", gain: 0.05, pat: "E5 . E5 G5 . E5 D5 . C5 . D5 E5 . . B4 . E5 . E5 G5 . A5 B5 . C6 . B5 A5 G5 . F#5 ." },
    { wave: "sawtooth", gain: 0.04, pat: "E2 E3 E2 E3 E2 E3 E2 E3 C2 C3 C2 C3 C2 C3 C2 C3 A1 A2 A1 A2 A1 A2 A1 A2 B1 B2 B1 B2 B1 B2 D#2 D#3" },
    { wave: "drum", pat: "k h s h k k s h k h s h k k s s k h s h k k s h k h s h k s s o" }]] };

  // ---------- state ----------
  var irisT = 0;
  var L, st = 0, mode = "title", cam = PF.Camera(), parts = PF.Parts(), hero, foes = [], items = [], shots = [], eshots = [], drops = [], boss = null, arenaX = 0, locked = false, hp = 28, ammo = {}, wpn = "pea", score = 0, lives = 3, cp = null, won = 0, dead = 0, tm = 0;
  function owned() { return ["pea"].concat(STAGES.slice(0, 4).filter(function (s) { return save.beat[s.id]; }).map(function (s) { return s.wpn; })); }
  function hud() { ui.setStat("score", FF.n(score)); ui.setStat("wpn", WPN[wpn].name); }
  function load(i, keep) { irisT = 1;
    st = i; var s = STAGES[i], c = compose(s.segs); arenaX = c.arena * TS; L = PF.Level(c.rows, { theme: s.th, seed: i + 9 });
    foes = []; items = []; shots = []; eshots = []; drops = []; boss = null; locked = false; parts.clear(); won = 0; dead = 0; if (!keep) { cp = null; tm = 0; }
    L.ents.forEach(function (e) {
      if ("mtfw".indexOf(e.ch) >= 0) foes.push({ k: e.ch, x: e.x + 2, y: e.y + TS - 12, w: 12, h: 12, vx: 0, vy: 0, hx: e.x, hy: e.y, t: Math.random() * 2, hp: e.ch === "t" ? 3 : e.ch === "w" ? 2 : 1, alive: true, dir: -1 });
      else if (e.ch === "X") items.push({ k: "X", x: e.x, y: e.y });
      else items.push({ k: e.ch, x: e.x, y: e.y, w: 16, h: 16 });
    });
    var sp = cp || { x: 2 * TS, y: 9 * TS };
    hero = { x: sp.x, y: sp.y, w: 10, h: 16, vx: 0, vy: 0, face: 1, ground: false, coyote: 0, buffer: 0, inv: 0, ph: 0, fireT: 0, kb: 0 };
    hp = 28; cam.x = hero.x - W / 3; PF.follow(cam, L, hero, W, H, 1); ui.setCourse(s.name); hud();
  }

  // ---------- bosses ----------
  function makeBoss() { var s = STAGES[st], it = items.filter(function (i) { return i.k === "X"; })[0]; return { id: s.id, name: s.boss, x: it.x - 4, y: it.y - 8, w: 22, h: 24, vx: 0, vy: 0, hp: 28, t: 0, act: 1.5, inv: 0, face: -1, ground: false, phase: 0 }; }
  function eshoot(x, y, vx, vy, k, grav) { eshots.push({ x: x, y: y, w: k === "steam" ? 12 : 6, h: k === "steam" ? 10 : 6, vx: vx, vy: vy, k: k, grav: grav || 0, life: 5 }); }
  function stepBoss(b, dt) {
    var h = hero, dx = h.x - b.x; b.t += dt; b.act -= dt; if (b.inv > 0) b.inv -= dt; b.face = dx < 0 ? -1 : 1;
    var id = b.id === "reg" ? ["kate", "percy", "hal", "bess"][Math.floor(b.t / 6) % 4] : b.id;
    if (b.dash > 0) { b.dash -= dt; } else if (b.ground) b.vx *= 0.85;
    if (b.act <= 0) {
      var rage = b.hp < 14 ? 0.7 : 1;
      if (id === "kate") { if (b.phase++ % 2) { b.vy = -340; b.vx = b.face * 90; } else for (var i = 0; i < 2; i++) eshoot(b.x + 11, b.y + 10 + i * 6, b.face * (70 + i * 40), 0, "steam"); b.act = 1.3 * rage; }
      else if (id === "percy") { eshoot(h.x + 2, L.ph - HT * TS + TS, 0, 0, "warn"); b.vx = (Math.random() < 0.5 ? -1 : 1) * 80; b.act = 1.1 * rage; }
      else if (id === "hal") { b.vy = -420; b.vx = clamp(dx, -120, 120); for (var j = -1; j <= 1; j++) eshoot(b.x + 11, b.y, j * 70 + b.face * 40, -200, "hail", 600); b.act = 1.6 * rage; }
      else { if (b.phase++ % 2) { b.dash = 0.8; b.vx = b.face * 230; } else { eshoot(b.x + 11, b.y + 12, b.face * 200, 0, "thorn"); } b.act = 1.4 * rage; }
    }
    b.vy = Math.min(420, b.vy + 900 * dt); var r = PF.move(L, b, dt); b.ground = r.ground; if (r.wallL || r.wallR) { b.vx = -b.vx; b.dash = 0; }
    if (PF.aabb(h, b)) hurt(4, b.x + b.w / 2);
  }
  function hitBoss(b, w) { if (b.inv > 0) return false; var s = STAGES[st], d = w === s.weak ? 4 : w === "pea" ? 1 : w === "steam" ? 2 : 1; if (b.id === "reg") d = w === "pea" ? 1 : 2; b.hp -= d; b.inv = d >= 4 ? 0.6 : 0.25; S.hit(); parts.add(b.x + 11, b.y + 12, 6, "#fff", 70); if (b.hp <= 0) bossDown(b); return true; }
  function bossDown(b) { boss = null; eshots = []; score += 5000; hud(); S.win(); A.stopSong(); for (var i = 0; i < 4; i++) parts.add(b.x + 11, b.y + 12, 20, ["#ffe23a", "#3affff", "#ff5ad8", "#fff"][i], 60 + i * 40, 1.2); won = 2.4; }

  // ---------- update ----------
  function hurt(n, fx) { var h = hero; if (h.inv > 0 || dead || won) return; hp -= n; h.inv = 1.2; h.kb = 0.3; h.vx = (h.x + 5 < fx ? -1 : 1) * 70; h.vy = -150; S.hurt(); if (hp <= 0) die(); }
  function die() { if (dead) return; hp = 0; dead = 2; lives--; S.die(); A.stopSong(); for (var i = 0; i < 2; i++) parts.add(hero.x + 5, hero.y + 8, 24, i ? "#3affff" : "#ffe23a", 90 + i * 60, 1.4, 0); }
  function fire() {
    var h = hero, w = WPN[wpn], mx = h.x + 5 + h.face * 10, my = h.y + 7;
    if (w.cost && (ammo[wpn] || 0) < w.cost) { S.hit(); return; }
    if (wpn === "pea") { if (shots.filter(function (s) { return s.w === "pea"; }).length >= 3) return; shots.push({ w: "pea", x: mx, y: my, vx: h.face * 260, vy: 0, life: 1.2, dmg: 1 }); S.shot(); }
    else { ammo[wpn] -= w.cost; S.big();
      if (wpn === "steam") shots.push({ w: "steam", x: mx, y: my - 4, vx: h.face * 70, vy: 0, life: 0.9, dmg: 3, big: 1, pierce: 1 });
      if (wpn === "spark") { shots.push({ w: "spark", x: mx, y: my, vx: h.face * 160, vy: -160, life: 1, dmg: 2 }); shots.push({ w: "spark", x: mx, y: my, vx: h.face * 160, vy: 160, life: 1, dmg: 2 }); }
      if (wpn === "hail") for (var i = -1; i <= 1; i++) shots.push({ w: "hail", x: mx, y: my, vx: h.face * 220, vy: i * 70, life: 0.9, dmg: 1 });
      if (wpn === "thorn") shots.push({ w: "thorn", x: mx, y: my, vx: h.face * 240, vy: 0, life: 1.6, dmg: 2, pierce: 1, boom: 1, t: 0 });
    }
    h.fireT = 0.2;
  }
  function update(dt) {
    tm += dt; var h = hero;
    if (won) { won -= dt; parts.step(dt); if (won <= 0) stageClear(); return; }
    if (dead) { dead -= dt; parts.step(dt); if (dead <= 0) { if (lives <= 0) return gameOver(); load(st, true); A.playSong(SONG); } return; }
    if (h.inv > 0) h.inv -= dt; if (h.kb > 0) h.kb -= dt;
    var dir = (ui.down("L") ? -1 : 0) + (ui.down("R") ? 1 : 0);
    if (ui.hit("W")) { var o = owned(), k = o.indexOf(wpn); wpn = o[(k + 1) % o.length]; S.pick(); hud(); }
    if (h.kb <= 0) { h.vx = dir * 100; if (dir) h.face = dir; }
    if (ui.hit("J")) h.buffer = 0.1; h.buffer -= dt; h.coyote -= dt;
    if (h.buffer > 0 && h.coyote > 0) { h.vy = -350; h.buffer = 0; h.coyote = 0; S.jump(); }
    if (!ui.down("J") && h.vy < -100) h.vy = -100;
    h.vy = Math.min(400, h.vy + 900 * dt);
    var wasG = h.ground, r = PF.move(L, h, dt); if (r.ground) { h.ground = true; h.coyote = 0.08; if (!wasG) S.land(); } else h.ground = false;
    h.ph += Math.abs(h.vx) * dt * 0.15; h.fireT -= dt;
    if (ui.hit("B")) fire();
    if (h.y > L.ph + 10) return die();
    if (PF.touching(L, { x: h.x + 1, y: h.y + 4, w: h.w - 2, h: h.h - 4 }, "hurt")) hurt(10, h.x + 5 - h.face * 4);
    // boss door / arena
    if (!locked && h.x > arenaX + TS * 1.5) { locked = true; for (var y = 0; y < HT - 3; y++) L.set(Math.floor(arenaX / TS), y, "#"); boss = makeBoss(); S.boss(); A.playSong(BOSS_SONG); cp = { x: arenaX - TS * 2, y: (HT - 5) * TS }; }
    if (boss) stepBoss(boss, dt);
    // shots
    shots.forEach(function (s) {
      s.life -= dt; if (s.boom) { s.t += dt; if (s.t > 0.45) { var dx = h.x + 5 - s.x, dy = h.y + 7 - s.y, d = Math.hypot(dx, dy) || 1; s.vx = dx / d * 260; s.vy = dy / d * 260; if (d < 10) s.life = 0; } }
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (!s.big && !s.boom && L.solid(Math.floor(s.x / TS), Math.floor(s.y / TS))) s.life = 0;
      var box = { x: s.x - (s.big ? 8 : 3), y: s.y - (s.big ? 8 : 3), w: s.big ? 16 : 6, h: s.big ? 16 : 6 };
      foes.forEach(function (f) { if (s.life > 0 && f.alive && PF.aabb(box, f) && !(s.hit && s.hit.indexOf(f) >= 0)) { f.hp -= s.dmg; S.hit(); if (s.pierce) (s.hit = s.hit || []).push(f); else s.life = 0; if (f.hp <= 0) { f.alive = false; score += 200; S.pop(); parts.add(f.x + 6, f.y + 6, 10, "#fff", 70); hud(); if (Math.random() < 0.4) drops.push({ k: Math.random() < 0.6 ? "h" : "e", x: f.x + 3, y: f.y, w: 8, h: 8, vy: -120, life: 8 }); } } });
      if (boss && s.life > 0 && PF.aabb(box, boss) && !(s.hit && s.hit.indexOf(boss) >= 0)) { if (hitBoss(boss, s.w) || true) { if (s.pierce) (s.hit = s.hit || []).push(boss); else s.life = 0; } }
    });
    shots = shots.filter(function (s) { return s.life > 0 && Math.abs(s.x - h.x) < W; });
    eshots.forEach(function (s) {
      s.life -= dt;
      if (s.k === "warn") { if (s.life < 4.2) { s.k = "bolt"; s.vy = 340; s.w = 8; s.h = 12; } return; }
      s.vy += s.grav * dt; s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.k !== "steam" && L.solid(Math.floor((s.x + 3) / TS), Math.floor((s.y + 3) / TS))) s.life = 0;
      if (PF.aabb(h, s)) { hurt(s.k === "bolt" ? 5 : s.k === "steam" ? 4 : 3, s.x); if (s.k !== "steam") s.life = 0; }
    });
    eshots = eshots.filter(function (s) { return s.life > 0; });
    // foes
    foes.forEach(function (f) {
      if (!f.alive || Math.abs(f.x - h.x) > W) return; f.t += dt; var dx = h.x - f.x;
      if (f.k === "m") { f.vy = Math.min(400, f.vy + 900 * dt); var rr = PF.move(L, f, dt); if (rr.ground) { f.vx = 0; if (f.t > 1.2) { f.t = 0; f.vy = -280; f.vx = (dx < 0 ? -1 : 1) * 60; } } }
      else if (f.k === "w") { f.vy = Math.min(400, f.vy + 900 * dt); f.vx = (dx < 0 ? -1 : 1) * 30; PF.move(L, f, dt); }
      else if (f.k === "t") { f.open = Math.sin(f.t * 1.5) > 0; if (f.open && f.t % 1.4 < dt) { var d = Math.hypot(dx, h.y - f.y) || 1; eshoot(f.x + 4, f.y + 2, dx / d * 110, (h.y - f.y) / d * 110, "pellet"); } }
      else if (f.k === "f") { f.x = f.hx + Math.sin(f.t * 1.4) * 40; f.y = f.hy + Math.sin(f.t * 2.8) * 16; }
      if (PF.aabb(h, f)) hurt(3, f.x + 6);
    });
    drops.forEach(function (d) { d.life -= dt; d.vy = Math.min(300, d.vy + 600 * dt); PF.move(L, d, dt); if (PF.aabb(h, d)) { d.life = 0; S.pick(); if (d.k === "h") hp = Math.min(28, hp + 6); else { var ws = owned().filter(function (w) { return w !== "pea"; }); var tw = wpn !== "pea" ? wpn : ws[0]; if (tw) ammo[tw] = Math.min(28, (ammo[tw] || 0) + 8); } } });
    drops = drops.filter(function (d) { return d.life > 0; });
    items.forEach(function (it) { if (it.k === "K" && !it.got && Math.abs(h.x - it.x) < 12) { it.got = 1; cp = { x: it.x, y: it.y - 4 }; S.pick(); } });
    parts.step(dt); PF.follow(cam, L, h, W, H, dt);
  }

  // ---------- render ----------
  function render(c, tt) {
    if (!W) sizeLo(); if (!L) load(0);
    var s = STAGES[st]; PF.drawBack(g, s.th, cam, W, H, tt);
    // stage back details: bold shapes per stage
    for (var k = 0; k < 8; k++) { var bx = ((k * 90 - cam.x * 0.4) % (W + 90) + W + 90) % (W + 90) - 45, by = H * 0.75 - cam.y * 0.2;
      if (s.id === "kate") { R(bx, by - 50, 30, 50, "#ffffff"); R(bx + 4, by - 44, 8, 8, "#3ac8ff"); R(bx + 18, by - 44, 8, 8, "#3ac8ff"); R(bx + 22, by - 64, 6, 16, "#ff3a4a"); R(bx + 21, by - 70 - (tt * 10 + k * 5) % 12, 8, 6, "rgba(255,255,255,0.8)"); }
      else if (s.id === "percy") { R(bx + 12, by - 70, 3, 70, "#ffd23a"); R(bx, by - 62, 28, 2, "#ffd23a"); R(bx + 4, by - 50, 20, 2, "#ffd23a"); R(bx + 6, by - 70, 2, 70, "#ffd23a"); R(bx + 20, by - 70, 2, 70, "#ffd23a"); if (Math.floor(tt * 3 + k) % 5 === 0) R(bx + 27, by - 62, 60, 1, "#3affff"); }
      else if (s.id === "hal") { R(bx, by - 20, 40, 8, "#ffffff"); R(bx + 8, by - 26, 24, 8, "#ffffff"); R(bx + 18, by - 80, 2, 40, "#2a5ad8"); R(bx + 10, by - 82, 18, 4, "#ffd23a"); }
      else if (s.id === "bess") { R(bx, by - 40, 36, 40, "#1aa83a"); R(bx + 6, by - 46, 24, 8, "#3ad84a"); R(bx + 10, by - 30, 4, 4, "#ff2a8a"); R(bx + 22, by - 20, 4, 4, "#ffffff"); }
      else { R(bx + 10, by - 90, 20, 90, "#3a1a7a"); R(bx + 12, by - 84, 16, 16, "#ffd23a"); R(bx + 19, by - 82, 2, 7, "#2a0a5a"); R(bx + 19, by - 77, 6, 2, "#2a0a5a"); } }
    PF.drawTiles(g, L, s.th, cam, W, H, tt);
    items.forEach(function (it) { if (it.k === "K") { var x = it.x - cam.x, y = it.y - cam.y; R(x + 7, y - 4, 2, 20, "#ffffff"); R(x + 9, y - 4, 7, 5, it.got ? "#3affff" : "#ff3a4a"); } });
    var ax = arenaX - cam.x; if (!locked && ax > -20 && ax < W + 20) { R(ax, 0, 16, (HT - 3) * TS - cam.y, "#3a3a6a"); for (var dy = 0; dy < (HT - 3) * TS - cam.y; dy += 8) R(ax + 2, dy, 12, 4, "#6a6ad8"); }
    var g0 = g; g = FXP.layer(W, H);
    foes.forEach(function (f) { if (!f.alive) return; var x = Math.round(f.x - cam.x), y = Math.round(f.y - cam.y); if (x < -20 || x > W + 20) return;
      if (f.k === "m") { R(x + 1, y + 2, 10, 8, "#ff6a2a"); R(x + 3, y, 6, 3, "#ffd23a"); R(x + 4, y + 4, 2, 2, "#111"); R(x + 7, y + 4, 2, 2, "#111"); R(x, y + 10, 4, 2, "#333"); R(x + 8, y + 10, 4, 2, "#333"); }
      else if (f.k === "w") { R(x + 1, y, 10, 10, "#8a8ab0"); R(x + 2, y + 2, 8, 3, "#3affff"); R(x + 2, y + 10, 3, 2, "#333"); R(x + 7, y + 10, 3, 2, "#333"); }
      else if (f.k === "t") { R(x, y + 6, 12, 6, "#2a5ad8"); R(x + 2, y + (f.open ? 1 : 4), 8, 5, f.open ? "#ff3a4a" : "#5a8aff"); if (f.open) R(x + 5, y + 2, 2, 2, "#fff"); }
      else { R(x, y + 3, 12, 5, "#ff5ad8"); R(x + 3, y, 6, 4, "#ffffff"); R(x + (Math.floor(tt * 16) % 2 ? 0 : 8), y - 2, 4, 2, "#ffffff"); R(x + 5, y + 4, 2, 2, "#111"); } });
    if (boss) drawBoss(boss, tt);
    shots.forEach(function (sh) { var x = sh.x - cam.x, y = sh.y - cam.y, col = WPN[sh.w].col; if (sh.big) { R(x - 8, y - 6, 16, 12, "rgba(255,255,255,0.85)"); R(x - 5, y - 9, 10, 6, "rgba(255,255,255,0.7)"); } else if (sh.w === "thorn") { var a2 = tt * 20; R(x - 4, y - 1, 8, 2, col); R(x - 1, y - 4, 2, 8, col); R(x - 3 + Math.cos(a2) * 2, y - 3 + Math.sin(a2) * 2, 2, 2, "#fff"); } else { R(x - 2, y - 2, 4, 4, col); R(x - 1, y - 1, 2, 2, "#fff"); } });
    eshots.forEach(function (sh) { var x = sh.x - cam.x, y = sh.y - cam.y; if (sh.k === "warn") { if (Math.floor(tt * 12) % 2) R(x, 0, 4, H, "rgba(58,255,255,0.25)"); } else if (sh.k === "steam") { R(x, y, 12, 10, "rgba(255,255,255,0.8)"); R(x + 2, y - 3, 8, 4, "rgba(255,255,255,0.6)"); } else if (sh.k === "bolt") { R(x, y, 8, 12, "#3affff"); R(x + 3, y, 2, 12, "#fff"); } else R(x, y, 6, 6, sh.k === "thorn" ? "#ff2a8a" : sh.k === "hail" ? "#e8f8ff" : "#ff3a4a"); });
    drops.forEach(function (d) { if (d.life < 2 && Math.floor(tt * 10) % 2) return; var x = d.x - cam.x, y = d.y - cam.y; if (d.k === "h") { R(x, y + 2, 8, 6, "#ff3a4a"); R(x + 2, y, 4, 2, "#ffffff"); } else { R(x + 2, y, 4, 8, "#3affff"); R(x + 1, y + 4, 6, 4, "#3affff"); } });
    if (hero && mode === "play" && !dead && (hero.inv <= 0 || Math.floor(tt * 16) % 2)) drawJack(tt);
    g = g0; FXP.flush(g, "#0a1030");
    parts.draw(g, cam);
    FXP.ambient(g, W, H, cam, tt, "drift", "rgba(200,240,255,0.8)", 20); FXP.vignette(g, W, H, 0.35);
    if (irisT > 0) { FXP.iris(g, W, H, irisT, hero ? hero.x - cam.x : W / 2, hero ? hero.y - cam.y : H / 2); irisT -= 1 / 40; }
    if (mode === "play") { bar(4, 4, hp, "#ffe23a"); if (wpn !== "pea") bar(12, 4, ammo[wpn] || 0, WPN[wpn].col); if (boss) bar(W - 10, 4, Math.max(0, boss.hp), "#ff3a4a"); g.fillStyle = "#fff"; g.font = "8px monospace"; g.fillText("x" + lives, 4, 70); }
    c.drawImage(lo, 0, 0, W * PX, H * PX);
  }
  function bar(x, y, v, col) { R(x, y, 6, 58, "#111"); for (var i = 0; i < 28; i++) R(x + 1, y + 56 - i * 2, 4, 1, i < v ? col : "#333"); }
  function drawJack(tt) {
    var h = hero, x = Math.round(h.x - cam.x), y = Math.round(h.y - cam.y), f = h.face < 0, run = h.ground && Math.abs(h.vx) > 5, lg = run ? Math.round(Math.sin(h.ph * 2) * 2) : 0, air = !h.ground;
    function r(dx, dy, w, hh, c2) { R(f ? x + 10 - dx - w : x + dx, y + dy, w, hh, c2); }
    var key = Math.floor(tt * 6) % 2; r(-3, 6, 3, 1, "#c8a040"); r(-4, 4 + key, 2, 4 - key, "#ffd23a");
    r(-5, 9, 5, 3, "#ff8a2a"); r(-7, 8, 3, 2, "#ffffff");
    r(1 + lg, air ? 11 : 12, 3, air ? 3 : 4, "#8a5a1a"); r(6 - lg, 12, 3, 4, "#8a5a1a"); r(1 + lg, 15, 3, 1, "#ffffff");
    r(1, 6, 8, 7, "#d8a83a"); r(3, 8, 4, 4, "#fff0c0"); r(4, 9, 2, 2, "#8a5a1a");
    r(2, 0, 7, 7, "#ff8a2a"); r(6, 3, 4, 3, "#ffffff"); r(9, 3, 1, 1, "#111"); r(6, 2, 1, 1, "#111"); r(2, -3, 2, 3, "#ff8a2a"); r(6, -3, 2, 3, "#ff8a2a"); r(3, -2, 1, 1, "#fff"); r(7, -2, 1, 1, "#fff");
    var arm = h.fireT > 0; r(arm ? 8 : 5, arm ? 7 : 8, arm ? 4 : 3, 3, "#ff8a2a"); if (arm) r(11, 6, 4, 4, "#8a5a1a");
  }
  function drawBoss(b, tt) {
    var x = Math.round(b.x - cam.x), y = Math.round(b.y - cam.y), fl = b.inv > 0 && Math.floor(tt * 20) % 2, F = b.face > 0;
    function r(dx, dy, w, hh, c2) { R(F ? x + dx : x + 22 - dx - w, y + dy, w, hh, fl ? "#ffffff" : c2); }
    var id = b.id === "reg" ? ["kate", "percy", "hal", "bess"][Math.floor(b.t / 6) % 4] : b.id;
    if (b.id === "reg") { r(-4, -6, 30, 32, "#5a2aa8"); r(2, 0, 18, 18, "#ffd23a"); r(10, 2, 2, 8, "#2a0a5a"); r(10, 9, 7, 2, "#2a0a5a"); r(0, 24, 6, 4, "#3a1a7a"); r(16, 24, 6, 4, "#3a1a7a"); r(-2, -10, 4, 4, ["#ffffff", "#3affff", "#bfe8ff", "#ff5ad8"][["kate", "percy", "hal", "bess"].indexOf(id)]); return; }
    if (id === "kate") { r(2, 6, 18, 14, "#ffffff"); r(4, 2, 14, 5, "#ff3a4a"); r(9, -1, 4, 3, "#ff3a4a"); r(19, 8, 6, 3, "#c8d8e8"); r(-3, 8, 5, 8, "#ff3a4a"); r(12, 10, 3, 3, "#111"); r(6, 10, 3, 3, "#111"); r(4, 20, 4, 4, "#333"); r(14, 20, 4, 4, "#333"); }
    else if (id === "percy") { r(8, -6, 6, 30, "#ffd23a"); r(0, 0, 22, 3, "#ffd23a"); r(3, 8, 16, 3, "#ffd23a"); r(2, 14, 18, 10, "#2a5ad8"); r(6, 17, 3, 3, "#3affff"); r(13, 17, 3, 3, "#3affff"); if (Math.floor(tt * 10) % 2) { r(-2, 1, 3, 1, "#3affff"); r(21, 1, 3, 1, "#3affff"); } }
    else if (id === "hal") { r(10, -8, 2, 10, "#2a5ad8"); r(4, -10, 14, 3, "#ffd23a"); r(2, 2, 18, 18, "#bfe8ff"); r(4, 4, 14, 3, "#ffffff"); r(7, 9, 3, 3, "#2a5ad8"); r(13, 9, 3, 3, "#2a5ad8"); r(5, 20, 4, 4, "#2a5ad8"); r(13, 20, 4, 4, "#2a5ad8"); }
    else { r(0, 4, 22, 16, "#1aa83a"); for (var i = 0; i < 5; i++) r(i * 5, 2 + (i % 2) * 2, 3, 3, "#ff2a8a"); r(14, 8, 3, 3, "#ffffff"); r(18, 12, 8, 3, "#c8c8d8"); r(20, 11, 1, 1, "#fff"); r(3, 20, 5, 4, "#333"); r(14, 20, 5, 4, "#333"); }
  }

  // ---------- flow ----------
  function stageClear() {
    ui.stop(); mode = "clear"; var s = STAGES[st], first = !save.beat[s.id]; save.beat[s.id] = 1; if (s.wpn) ammo[s.wpn] = 28; if (score > save.hi) save.hi = score; ui.persist();
    if (s.id === "reg") { ui.runEnded(); return ui.menu({ kicker: "The Clock Tower", title: "Town wound down", body: "The Grand Regulator stops at midnight and the town's machines sleep. Jack winds himself up for tomorrow.", stats: '<b class="ff-score-xl">' + FF.n(score) + "</b>", buttons: [{ label: "Stage board", act: board }] }); }
    ui.menu({ kicker: s.name + " cleared", title: first ? "New trick: " + WPN[s.wpn].name : "Cleared again", body: first ? "Change tricks with the Trick button. " + WPN[s.wpn].name + " is " + ({ steam: "a slow, heavy cloud that goes through things", spark: "two bolts, up and down", hail: "a three-way spread", thorn: "a thorn that flies out and comes back" })[s.wpn] + "." : "", stats: '<b class="ff-score-xl">' + FF.n(score) + "</b><span>TIME " + FF.fmtTime(tm) + "</span>", buttons: [{ label: "Stage board", act: board }] });
  }
  function gameOver() { ui.stop(); mode = "over"; A.stopSong(); ui.runEnded(); var hi = score > save.hi; if (hi) save.hi = score; ui.persist();
    ui.menu({ title: "Wound down", body: "Out of spring.", stats: '<b class="ff-score-xl">' + FF.n(score) + "</b><span>" + (hi ? "NEW HIGH SCORE" : "HIGH SCORE " + FF.n(save.hi)) + "</span>", buttons: [{ label: "Stage board", act: board }, { label: "Menu", small: true, act: toTitle }] }); }
  function go(i) { mode = "play"; if (lives <= 0) { lives = 3; score = 0; } wpn = "pea"; owned().forEach(function (w) { if (w !== "pea") ammo[w] = 28; }); load(i); ui.go(); A.playSong(SONG); }
  function board() { ui.stop(); mode = "title"; A.playSong(SONG); var all = STAGES.slice(0, 4).every(function (s) { return save.beat[s.id]; });
    ui.menu({ kicker: "Stage board", title: "Pick a machine", body: "Each one you beat gives Jack its trick. Every machine has a trick it hates.",
      html: '<table class="ff-table">' + STAGES.map(function (s, i) { return "<tr><td>" + s.boss + "</td><td>" + s.name + "</td><td>" + (save.beat[s.id] ? "beaten" : i === 4 && !all ? "locked" : "") + "</td></tr>"; }).join("") + "</table>",
      row: STAGES.map(function (s, i) { return { label: i < 4 ? s.boss.split(" ").pop() : "Tower", disabled: i === 4 && !all, act: function () { go(i); } }; }), buttons: [{ label: "Menu", small: true, act: toTitle }] }); }
  function toTitle() { ui.stop(); mode = "title"; if (!L) load(0); lives = 3; score = 0; A.playSong(SONG); ui.setCourse("Stage board");
    ui.menu({ title: "BRASSJACK", body: "Four runaway town machines, one clockwork fox.", stats: "<span>HIGH SCORE " + (save.hi ? FF.n(save.hi) : "-") + "</span><span>TRICKS " + owned().length + "/5</span>",
      buttons: [{ label: "Play", act: board }], app: true, help: ["◀ ▶ run, Jump (hold for higher), Fire shoots. Trick switches between the tricks you have won.", "Beat a machine to take its trick. Each machine takes 4x damage from one trick: work out which.", "Health and trick refills drop from beaten critters. Signposts are restart points."], fine: "A Forest Forge game" }); }
  var game = { toTitle: toTitle, onResize: sizeLo, update: function (dt) { if (mode === "play") update(dt); }, render: render, idle: function (dt) { if (mode === "title" && L) { cam.x += dt * 30; if (cam.x > L.pw - W) cam.x = 0; } }, onBack: function () { if (mode === "title") return "exit"; toTitle(); return "menu"; } };
  ui.onAdsRemoved = function () { if (mode === "title") toTitle(); };
  game.qa = { go: go, state: function () { return { mode: mode, st: st, x: hero.x, y: hero.y, tx: Math.floor((hero.x + 5) / TS), ty: Math.floor((hero.y + 15) / TS), ground: hero.ground, hp: hp, lives: lives, boss: boss && { hp: boss.hp, x: boss.x, y: boss.y }, locked: locked, won: won, dead: dead, wpn: wpn, pw: L.pw, beat: Object.keys(save.beat) }; }, L: function () { return L; }, foes: function () { return foes; }, lives: function (n) { lives = n; }, hp: function (n) { hp = n; }, inv: function () { hero.inv = 1e9; }, wpn: function (w) { wpn = w; ammo[w] = 28; } };
  ui.start(game);
})();
