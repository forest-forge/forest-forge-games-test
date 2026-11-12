/* Slugboot (Forest Forge). A wellington boot that woke up cross. Armed with a garden hose
 * and a bootlace whip, Slugboot squelches through three daft stages to three daft bosses.
 * Built on platform.js. Original game: all art drawn in code, all sound generated. */
(function () {
  "use strict";
  var clamp = FF.clamp, TS = PF.TS, HT = 14;
  var ui = FF.create({
    id: "slugboot", title: "Slugboot", course: "Allotment Ruckus", wide: true, view: { w: 640, h: 360, flex: true },
    stats: [{ id: "score", label: "Score", value: "0" }, { id: "lives", label: "Boots", value: "3" }],
    pads: { left: [{ id: "L", icon: "left", aria: "Left", keys: ["ArrowLeft", "KeyA"] }, { id: "R", icon: "right", aria: "Right", keys: ["ArrowRight", "KeyD"] }],
      right: [{ id: "W", label: "Whip", aria: "Bootlace whip", keys: ["KeyC", "KeyQ"] }, { id: "B", label: "Hose", aria: "Hose", keys: ["KeyX", "KeyK", "ShiftLeft"] }, { id: "J", icon: "up", cls: "big", aria: "Jump", keys: ["Space", "ArrowUp", "KeyW", "KeyZ"] }] }
  });
  var A = ui.audio, save = ui.save; save.hi = save.hi || 0; save.open = save.open || 1;
  var PX = 2, lo = document.createElement("canvas"), g = lo.getContext("2d"), W = 320, H = 180;
  function sizeLo() { W = Math.ceil(ui.VW / PX); H = Math.ceil(ui.VH / PX); lo.width = W; lo.height = H; g.imageSmoothingEnabled = false; }
  function R(x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }

  // ---------- stages from segments (same composer idea as Brassjack) ----------
  function compose(segs) {
    var cols = [], ents = [], hNow = 3;
    function col(h, top, extra) { var c = []; for (var y = 0; y < HT; y++) c.push(y >= HT - h ? "#" : " "); if (top) c[HT - h - 1] = top; if (extra) for (var k in extra) c[k] = extra[k]; cols.push(c); }
    segs.split(" ").forEach(function (s) {
      var p = s.split(":"), t = p[0], n = +p[1] || 1, a = +p[2] || 0, i;
      if (t === "g") { hNow = a || hNow; for (i = 0; i < n; i++) col(hNow); }
      else if (t === "pit") for (i = 0; i < n; i++) col(0);
      else if (t === "spk") for (i = 0; i < n; i++) col(1, "^");
      else if (t === "plat") for (i = 0; i < n; i++) { var ex = {}; if (i % 4 !== 3) ex[HT - hNow - (a || 3)] = "="; col(0, null, ex); }
      else if (t === "swing") { for (i = 0; i < n; i++) { col(0); if (i % 5 === 2) ents.push({ ch: "o", tx: cols.length - 1, ty: HT - hNow - 6 }); } }
      else if (t === "door") { cols.push(cols.length ? cols[cols.length - 1].slice() : []); }
      else ents.push({ ch: t, tx: cols.length - 1 - (a || 0), ty: HT - hNow - 1 - (+p[1] || 0) });
    });
    var aw = 22, top = HT - 3; for (var i2 = 0; i2 < aw; i2++) { var c = []; for (var y2 = 0; y2 < HT; y2++) c.push(y2 >= top || y2 === 0 || i2 === aw - 1 ? "#" : " "); if (i2 === 5 || i2 === 16) c[top - 4] = "="; cols.push(c); }
    ents.push({ ch: "X", tx: cols.length - 6, ty: top - 1 });
    var rows = []; for (var y3 = 0; y3 < HT; y3++) { var r = ""; for (var x = 0; x < cols.length; x++) r += cols[x][y3]; rows.push(r); }
    ents.forEach(function (e) { rows[e.ty] = rows[e.ty].substring(0, e.tx) + e.ch + rows[e.ty].substring(e.tx + 1); });
    return { rows: rows, arena: cols.length - aw };
  }
  var STAGES = [
    { id: "marrow", name: "Allotment Ruckus", boss: "The Prize Marrow", th: { sky: ["#6a1ac8", "#c85aff"], far: "#9a3ae8", near: "#3ad81a", dirt: "#7a3a1a", dirtD: "#5a2a0a", top: "#b8ff1a", topD: "#7ad80a", plank: "#ffe21a", spike: "#ffe21a", stars: 1 },
      segs: "g:12:3 m:0:3 g:6 j:2:2 pit:3 g:8 c:0:2 g:6:5 j:2:3 m:0:2 g:6:3 swing:10 g:8:3 K:0:4 spk:3 g:6 b:3:2 plat:8:3 g:8:3 m:0:3 h:0:5 g:6:5 c:0:2 pit:3 g:6:3 j:2:2 swing:10 g:8 b:3:3 g:6 door" },
    { id: "tub", name: "Sewer Regatta", boss: "Admiral Bathbottom", th: { sky: ["#1a0a3a", "#5a1a8a"], far: "#3a1a6a", near: "#2a0e5a", dirt: "#3ad81a", dirtD: "#1aa80a", top: "#e8ff1a", topD: "#b8d80a", plank: "#ff3ad8", spike: "#e8ff1a", stars: 1 },
      segs: "g:10:3 c:0:2 g:6 swing:10 g:6:4 m:0:2 j:2:2 g:6:3 pit:3 g:6 b:3:2 plat:12:3 g:6:3 K:0:4 c:0:2 g:6:5 swing:15 g:6:3 m:0:3 h:0:5 spk:4 g:8 b:3:2 pit:3 g:6:4 c:0:2 g:6 door" },
    { id: "hoover", name: "Front Room Frenzy", boss: "Nan's Hoover", th: { sky: ["#ffe21a", "#fff6a8"], far: "#ff9ae8", near: "#c83ad8", dirt: "#8a1ac8", dirtD: "#6a0aa8", top: "#3aff6a", topD: "#1ad84a", plank: "#3aff6a", spike: "#ff2a6a" },
      segs: "g:10:3 m:0:2 g:6 b:3:2 pit:3 g:6:5 c:0:2 swing:10 g:6:3 j:2:2 spk:4 g:6 m:0:3 plat:12:3 g:6:3 K:0:4 b:3:2 g:6:6 c:0:2 swing:15 g:6:3 h:0:5 m:0:2 pit:3 g:6 j:2:2 spk:4 g:8 door" }
  ];

  // ---------- sound ----------
  var S = {
    hose: function () { A.noise({ dur: 0.05, gain: 0.05, freq: 2400, filter: "bandpass" }); },
    whip: function () { A.noise({ dur: 0.06, gain: 0.1, freq: 3500, filter: "highpass" }); A.tone({ f: 1800, f2: 600, dur: 0.06, type: "square", gain: 0.04 }); },
    jump: function () { A.tone({ f: 200, f2: 520, dur: 0.12, type: "square", gain: 0.06 }); A.tone({ f: 90, dur: 0.06, type: "sine", gain: 0.12 }); },
    squelch: function () { A.noise({ dur: 0.12, gain: 0.1, freq: 500, filter: "lowpass" }); A.tone({ f: 140, f2: 70, dur: 0.1, type: "sine", gain: 0.1 }); },
    honk: function () { A.tone({ f: 330, f2: 300, dur: 0.18, type: "sawtooth", gain: 0.08 }); A.tone({ f: 415, f2: 380, dur: 0.18, type: "sawtooth", gain: 0.05 }); },
    pop: function () { A.tone({ f: 700, f2: 1500, dur: 0.08, type: "square", gain: 0.06 }); A.noise({ dur: 0.1, gain: 0.08, freq: 1200, filter: "bandpass" }); },
    hurt: function () { A.tone({ f: 900, f2: 200, dur: 0.22, type: "square", gain: 0.08 }); },
    sweet: function () { A.tone({ f: 1046, dur: 0.05, type: "square", gain: 0.05 }); A.tone({ f: 1568, dur: 0.06, type: "square", gain: 0.05, delay: 0.05 }); },
    die: function () { A.tone({ f: 600, f2: 60, dur: 0.9, type: "sawtooth", gain: 0.1 }); A.noise({ dur: 0.3, gain: 0.08, freq: 200, filter: "lowpass", delay: 0.8 }); },
    boss: function () { [196, 0, 196, 0, 233, 196, 175].forEach(function (f, i) { if (f) A.tone({ f: f, dur: 0.12, type: "sawtooth", gain: 0.08, delay: i * 0.11 }); }); },
    bonk: function () { A.tone({ f: 120, f2: 60, dur: 0.15, type: "square", gain: 0.12 }); },
    win: function () { [523, 659, 784, 1047, 784, 1047, 1319, 1568].forEach(function (f, i) { A.tone({ f: f, dur: 0.1, type: "square", gain: 0.07, delay: i * 0.08 }); }); }
  };
  var SONG = { bpm: 160, order: [0, 0, 1, 0], parts: [[
    { wave: "square", gain: 0.045, pat: "C5 . C5 D#5 . C5 G4 . A#4 . C5 . . G4 F4 . G4 . G4 A#4 . G4 D#4 . F4 . G4 . C4 . . ." },
    { wave: "sawtooth", gain: 0.03, pat: "C3 C3 . C3 D#3 . C3 . A#2 A#2 . A#2 G2 . A#2 . G#2 G#2 . G#2 A#2 . G#2 . G2 G2 . G2 B2 . G2 ." },
    { wave: "drum", pat: "k . s k . k s . k . s k . k s h k . s k . k s . k k s k s s s o" }], [
    { wave: "square", gain: 0.045, pat: "D#5 . F5 . G5 . D#5 . F5 . D5 . A#4 . . . C5 . D#5 . F5 G5 F5 D#5 D5 . C5 . . . . ." },
    { wave: "sawtooth", gain: 0.03, pat: "G#2 G#2 . G#2 C3 . G#2 . A#2 A#2 . A#2 D3 . A#2 . C3 C3 . C3 D#3 . C3 . G2 G2 . G2 B2 . D3 ." },
    { wave: "drum", pat: "k . s k . k s . k . s k . k s h k . s k . k s . k k s s s s o o" }]] };
  var BOSS_SONG = { bpm: 176, order: [0], parts: [[
    { wave: "square", gain: 0.05, pat: "C5 C5 . C5 C#5 . C5 . G4 . G4 . F#4 . G4 . C5 C5 . C5 D#5 . D5 . C5 . A#4 . G4 . . ." },
    { wave: "sawtooth", gain: 0.035, pat: "C2 C3 C2 C3 C2 C3 C2 C3 C#2 C#3 C#2 C#3 C2 C3 C2 C3 C2 C3 C2 C3 D#2 D#3 D#2 D#3 G1 G2 G1 G2 G1 G2 B1 B2" },
    { wave: "drum", pat: "k h s h k h s h k h s h k h s s k h s h k h s h k k s h k s s o" }]] };

  // ---------- state ----------
  var L, st = 0, mode = "title", cam = PF.Camera(), parts = PF.Parts(), hero, foes = [], items = [], shots = [], eshots = [], hooks = [], boss = null, arenaX = 0, locked = false, hp = 5, score = 0, lives = 3, cp = null, won = 0, dead = 0, tm = 0, whip = null, god = false;
  function hud() { ui.setStat("score", FF.n(score)); ui.setStat("lives", String(Math.max(0, lives))); }
  function load(i, keep) {
    st = i; var s = STAGES[i], c = compose(s.segs); arenaX = c.arena * TS; L = PF.Level(c.rows, { theme: s.th, seed: i + 17 });
    foes = []; items = []; shots = []; eshots = []; hooks = []; boss = null; locked = false; parts.clear(); won = 0; dead = 0; whip = null; if (!keep) { cp = null; tm = 0; }
    L.ents.forEach(function (e) {
      if (e.ch === "m" || e.ch === "c" || e.ch === "b") foes.push({ k: e.ch, x: e.x + 2, y: e.y + TS - 12, w: 12, h: 12, vx: 0, vy: 0, hx: e.x, hy: e.y, t: Math.random() * 2, hp: e.ch === "m" ? 2 : 1, alive: true, dir: -1 });
      else if (e.ch === "o") hooks.push({ x: e.x + 8, y: e.y + 8 });
      else items.push({ k: e.ch, x: e.x, y: e.y, w: 16, h: 16 });
    });
    var sp = cp || { x: 2 * TS, y: 9 * TS };
    hero = { x: sp.x, y: sp.y, w: 10, h: 14, vx: 0, vy: 0, face: 1, ground: false, coyote: 0, buffer: 0, inv: 0, ph: 0, fireT: 0, kb: 0, swing: null };
    hp = 5; cam.x = hero.x - W / 3; PF.follow(cam, L, hero, W, H, 1); ui.setCourse(s.name); hud();
  }

  // ---------- bosses ----------
  function makeBoss() { var s = STAGES[st], it = items.filter(function (i) { return i.k === "X"; })[0];
    if (s.id === "tub") return { id: "tub", name: s.boss, x: it.x - 30, y: (HT - 9) * TS, w: 34, h: 20, vx: 60, vy: 0, hp: 30, t: 0, act: 1.5, inv: 0, face: -1, fly: 1, phase: 0 };
    if (s.id === "hoover") return { id: "hoover", name: s.boss, x: it.x - 10, y: it.y - 16, w: 26, h: 32, vx: 0, vy: 0, hp: 34, t: 0, act: 2, inv: 0, face: -1, phase: 0 };
    return { id: "marrow", name: s.boss, x: it.x - 14, y: it.y - 4, w: 30, h: 20, vx: 0, vy: 0, hp: 26, t: 0, act: 1.2, inv: 0, face: -1, phase: 0, open: 0 }; }
  function eshoot(x, y, vx, vy, k, grav) { eshots.push({ x: x, y: y, w: 8, h: 8, vx: vx, vy: vy, k: k, grav: grav || 0, life: 6, bounce: k === "duck" ? 3 : 0 }); }
  function stepBoss(b, dt) {
    var h = hero, dx = h.x - (b.x + b.w / 2); b.t += dt; b.act -= dt; if (b.inv > 0) b.inv -= dt; var rage = b.hp < 13 ? 0.7 : 1;
    if (b.id === "marrow") {
      if (b.open > 0) { b.open -= dt; b.vx *= 0.9; if (b.open <= 0) b.act = 0.6; }
      else if (b.act <= 0) { b.phase++; if (b.phase % 3 === 0) { b.open = 2.2; b.vx = 0; for (var i = 0; i < 3; i++) eshoot(b.x + b.w / 2, b.y + 4, (i - 1) * 60 + (dx > 0 ? 40 : -40), -220, "seed", 500); S.honk(); } else { b.vx = (dx > 0 ? 1 : -1) * 170 / rage; b.vy = -160; b.act = 1.4 * rage; } }
      b.vy = Math.min(420, b.vy + 900 * dt); var r = PF.move(L, b, dt); if (r.wallL || r.wallR) { b.vx = -b.vx * 0.8; S.bonk(); }
    } else if (b.id === "tub") {
      b.x += b.vx * dt; var ax = arenaX + TS * 2, bx2 = arenaX + 18 * TS - b.w; if (b.x < ax) { b.x = ax; b.vx = Math.abs(b.vx); } if (b.x > bx2) { b.x = bx2; b.vx = -Math.abs(b.vx); }
      var low = Math.sin(b.t * 0.9) > 0.6; b.y += ((low ? (HT - 6) * TS : (HT - 9) * TS) - b.y) * Math.min(1, dt * 2);
      if (b.act <= 0) { eshoot(b.x + b.w / 2, b.y + b.h, b.vx * 0.4, 0, "duck", 700); S.honk(); b.act = 1.3 * rage; }
    } else {
      b.face = dx > 0 ? 1 : -1; var suck = b.phase % 2 === 0 && b.act > 0.3;
      if (suck && Math.abs(dx) < 180 && h.ground) h.x -= b.face * 38 * dt;
      if (b.act <= 0) { b.phase++; if (b.phase % 3 === 2) { b.vx = b.face * 200; b.dash = 0.9; } else { for (var j = 0; j < 2; j++) foes.push({ k: "d", x: b.x + b.w / 2 + b.face * 14, y: b.y + b.h - 10, w: 10, h: 10, vx: b.face * (60 + j * 30), vy: -120, t: 0, hp: 1, alive: true, dir: b.face }); } b.act = 2 * rage; }
      if (b.dash > 0) b.dash -= dt; else b.vx *= 0.85;
      b.vy = Math.min(420, b.vy + 900 * dt); var r2 = PF.move(L, b, dt); if (r2.wallL || r2.wallR) { b.vx = 0; b.dash = 0; S.bonk(); }
    }
    if (PF.aabb(h, b)) hurt(1, b.x + b.w / 2);
  }
  function hitBoss(b, dmg) { if (b.inv > 0) return false; var d = dmg; if (b.id === "marrow" && b.open > 0) d *= 2; if (b.id === "hoover" && b.face === (hero.x > b.x ? -1 : 1)) d *= 2; b.hp -= d; b.inv = 0.18; S.squelch(); parts.add(b.x + b.w / 2, b.y + 8, 6, "#e8ff1a", 70); if (b.hp <= 0) bossDown(b); return true; }
  function bossDown(b) { boss = null; eshots = []; foes.forEach(function (f) { if (f.k === "d") f.alive = false; }); score += 5000; hud(); S.win(); A.stopSong(); for (var i = 0; i < 4; i++) parts.add(b.x + b.w / 2, b.y + 10, 20, ["#e8ff1a", "#3aff6a", "#ff3ad8", "#fff"][i], 60 + i * 40, 1.2); won = 2.6; }

  // ---------- update ----------
  function hurt(n, fx) { var h = hero; if (h.inv > 0 || dead || won || god) return; hp -= n; h.inv = 1.3; h.kb = 0.3; h.swing = null; h.vx = (h.x + 5 < fx ? -1 : 1) * 90; h.vy = -180; S.hurt(); if (hp <= 0) die(); }
  function die() { if (dead) return; hp = 0; dead = 2.2; lives--; S.die(); A.stopSong(); hud(); game.deaths = (game.deaths || []).concat([[st, Math.round(hero.x / TS)]]); }
  function fire() { var h = hero; if (shots.length >= 5) return; var up = !h.ground && !h.swing; shots.push({ x: h.x + 5 + h.face * 8, y: h.y + 5, vx: h.face * (up ? 200 : 280), vy: up ? -160 : 0, life: 0.9 }); S.hose(); h.fireT = 0.12; }
  function update(dt) {
    tm += dt; var h = hero;
    if (won) { won -= dt; parts.step(dt); if (won <= 0) stageClear(); return; }
    if (dead) { dead -= dt; parts.step(dt); if (dead <= 0) { if (lives <= 0) return gameOver(); load(st, true); A.playSong(SONG); } return; }
    if (h.inv > 0) h.inv -= dt; if (h.kb > 0) h.kb -= dt; h.fireT -= dt;
    var dir = (ui.down("L") ? -1 : 0) + (ui.down("R") ? 1 : 0), jumpHit = ui.hit("J");
    if (ui.hit("B")) fire();
    if (ui.hit("W") && !whip) { whip = { t: 0, face: h.face }; S.whip(); }
    if (whip) { whip.t += dt; if (whip.t > 0.25) whip = null; }
    if (h.swing) {
      var sw = h.swing; sw.om += (-(900 / sw.len) * Math.sin(sw.th) + dir * 2.4) * dt; sw.om *= 0.997; sw.th = clamp(sw.th + sw.om * dt, -1.35, 1.35);
      h.x = sw.hk.x + Math.sin(sw.th) * sw.len - h.w / 2; h.y = sw.hk.y + Math.cos(sw.th) * sw.len - 4; if (dir) h.face = dir;
      if (jumpHit) { h.vx = Math.cos(sw.th) * sw.om * sw.len + h.face * 50; h.vy = -Math.sin(sw.th) * sw.om * sw.len - 250; h.swing = null; h.launch = 1; S.jump(); }
    } else {
      if (h.kb <= 0) { var tgt = dir * 110; if (h.launch && !h.ground) { if (dir) h.vx += (tgt - h.vx) * Math.min(1, dt * 2); } else h.vx = tgt; if (dir) h.face = dir; }
      if (jumpHit) h.buffer = 0.1; h.buffer -= dt; h.coyote -= dt;
      if (h.buffer > 0 && h.coyote > 0) { h.vy = -345; h.buffer = 0; h.coyote = 0; S.jump(); }
      if (!ui.down("J") && h.vy < -110 && !h.launch) h.vy = -110;
      h.vy = Math.min(420, h.vy + 900 * dt);
      var r = PF.move(L, h, dt); if (r.ground) { if (!h.ground) S.squelch(); h.ground = true; h.coyote = 0.08; h.launch = 0; } else h.ground = false;
      h.ph += Math.abs(h.vx) * dt * 0.15;
      // whip latches onto a hook within reach (up and in front)
      if (whip && whip.t < 0.2) hooks.forEach(function (hk) { var dx = hk.x - (h.x + 5), dy = hk.y - (h.y + 4); if (!h.swing && Math.hypot(dx, dy) < 62 && dy < 8 && dx * h.face > -12) { var len = clamp(Math.hypot(dx, dy), 30, 60); h.swing = { hk: hk, len: len, th: Math.atan2(-dx, -dy) * -1, om: h.vx / len }; h.swing.th = Math.atan2((h.x + 5) - hk.x, (h.y + 4) - hk.y); h.vy = 0; whip = null; S.whip(); } });
    }
    if (h.y > L.ph + 10) return die();
    if (PF.touching(L, { x: h.x + 1, y: h.y + 4, w: h.w - 2, h: h.h - 4 }, "hurt")) { if (god) { h.vy = -300; } else { hurt(2, h.x + 5 - h.face * 4); h.vy = -300; } }
    if (!locked && h.x > arenaX + TS * 1.5) { locked = true; for (var y = 0; y < HT - 3; y++) L.set(Math.floor(arenaX / TS), y, "#"); boss = makeBoss(); S.boss(); A.playSong(BOSS_SONG); cp = { x: arenaX - TS * 2, y: (HT - 5) * TS }; }
    if (boss) stepBoss(boss, dt);
    // whip hits
    if (whip && whip.t < 0.2) { var wb = { x: whip.face > 0 ? h.x + h.w : h.x - 40, y: h.y - 2, w: 40, h: 12 }; foes.forEach(function (f) { if (f.alive && PF.aabb(wb, f)) { f.hp -= 2; if (f.hp <= 0) killFoe(f); } }); if (boss && PF.aabb(wb, boss)) hitBoss(boss, 2); }
    shots.forEach(function (s) { s.life -= dt; s.vy += 300 * dt; s.x += s.vx * dt; s.y += s.vy * dt; if (L.solid(Math.floor(s.x / TS), Math.floor(s.y / TS))) s.life = 0;
      var box = { x: s.x - 2, y: s.y - 2, w: 5, h: 5 }; foes.forEach(function (f) { if (s.life > 0 && f.alive && PF.aabb(box, f)) { f.hp--; s.life = 0; S.pop(); if (f.hp <= 0) killFoe(f); } }); if (s.life > 0 && boss && PF.aabb(box, boss) && hitBoss(boss, 1)) s.life = 0; });
    shots = shots.filter(function (s) { return s.life > 0; });
    eshots.forEach(function (s) { s.life -= dt; s.vy += s.grav * dt; s.x += s.vx * dt; s.y += s.vy * dt; if (s.bounce && s.vy > 0 && L.solid(Math.floor(s.x / TS), Math.floor((s.y + 8) / TS))) { s.vy = -260; s.bounce--; s.vx = s.vx || (hero.x > s.x ? 60 : -60); } if (PF.aabb(h, s)) { hurt(1, s.x); s.life = 0; } });
    eshots = eshots.filter(function (s) { return s.life > 0 && (s.bounce > 0 || s.y < L.ph); });
    foes.forEach(function (f) { if (!f.alive) return; f.t += dt; var dx = h.x - f.x;
      if (f.k === "m") { f.vx = (Math.abs(dx) < 150 ? Math.sign(dx) : f.dir) * 30; f.vy = Math.min(400, f.vy + 900 * dt); var rr = PF.move(L, f, dt); if (rr.wallL || rr.wallR) f.dir = -f.dir; }
      else if (f.k === "c") { f.vy = Math.min(400, f.vy + 900 * dt); var r3 = PF.move(L, f, dt); if (r3.ground) { f.vx = 0; if (f.t > 0.9) { f.t = 0; f.vy = -260; f.vx = Math.sign(dx || 1) * 70; } } }
      else if (f.k === "b") { f.x += Math.sign(dx) * 40 * dt; f.y = f.hy - 8 + Math.sin(f.t * 3) * 14 + (Math.abs(dx) < 50 ? 18 : 0); }
      else if (f.k === "d") { f.vx = f.dir * 50; f.vy = Math.min(400, f.vy + 900 * dt); var r4 = PF.move(L, f, dt); if (r4.wallL || r4.wallR) f.dir = -f.dir; if (f.t > 9) f.alive = false; }
      if (PF.aabb({ x: h.x + 1, y: h.y + 2, w: h.w - 2, h: h.h - 2 }, f)) { if (h.vy > 60 && h.y + h.h - 4 < f.y + 4) { killFoe(f); h.vy = -260; } else hurt(1, f.x + 6); } });
    items.forEach(function (it) { if (it.got || it.k === "X") return; if (PF.aabb(h, { x: it.x + 3, y: it.y + 3, w: 10, h: 10 })) {
      if (it.k === "j") { it.got = 1; score += 100; S.sweet(); hud(); } else if (it.k === "h") { it.got = 1; hp = Math.min(5, hp + 2); S.sweet(); } else if (it.k === "K") { it.got = 1; cp = { x: it.x, y: it.y - 8 }; S.sweet(); } } });
    if (L.ents && !L._jx) { L._jx = 1; }
    cam.x += 0; PF.follow(cam, L, h, W, H, dt); parts.step(dt);
  }
  function killFoe(f) { f.alive = false; score += f.k === "m" ? 200 : 100; S.pop(); parts.add(f.x + 6, f.y + 6, 10, ["#e8ff1a", "#ff3ad8", "#3aff6a"][Math.floor(Math.random() * 3)], 80); hud(); }

  // ---------- render ----------
  function render(c, tt) {
    if (!W) sizeLo(); if (!L) load(0);
    var s = STAGES[st]; PF.drawBack(g, s.th, cam, W, H, tt);
    for (var k = 0; k < 7; k++) { var bx = ((k * 70 - cam.x * 0.35) % (W + 70) + W + 70) % (W + 70) - 35, by = H * 0.78 - cam.y * 0.2;
      if (s.id === "marrow") { R(bx, by - 30, 26, 30, "#ff3ad8"); R(bx - 3, by - 34, 32, 5, "#ffe21a"); R(bx + 9, by - 22, 8, 12, "#6a1ac8"); R(bx + 30, by - 12, 14, 12, "#3ad81a"); R(bx + 33, by - 16, 8, 4, "#b8ff1a"); }
      else if (s.id === "tub") { R(bx, by - 46, 10, 46, "#3a1a6a"); R(bx - 6, by - 50, 22, 6, "#5a2a8a"); R(bx + 22, by - 20, 30, 6, "#3ad81a"); R(bx + 24, by - 24, 4, 4, "#e8ff1a"); }
      else { R(bx, by - 50, 24, 50, "#ff9ae8"); R(bx + 4, by - 44, 16, 14, "#ffffff"); R(bx + 10, by - 44, 2, 14, "#c83ad8"); R(bx + 4, by - 38, 16, 2, "#c83ad8"); R(bx + 28, by - 18, 14, 18, "#3aff6a"); } }
    PF.drawTiles(g, L, s.th, cam, W, H, tt);
    hooks.forEach(function (hk) { var x = hk.x - cam.x, y = hk.y - cam.y; R(x - 1, y - 12, 2, 10, "#c8c8d8"); R(x - 4, y - 3, 8, 3, "#ffe21a"); R(x - 4, y, 2, 3, "#ffe21a"); R(x + 2, y, 2, 3, "#ffe21a"); });
    items.forEach(function (it) { if (it.got) return; var x = it.x - cam.x, y = it.y - cam.y; if (x < -20 || x > W + 20) return;
      if (it.k === "j") { var cc = ["#ff3ad8", "#3aff6a", "#ffe21a"][Math.floor(it.x / 16) % 3]; R(x + 5, y + 4, 6, 8, cc); R(x + 4, y + 6, 8, 3, cc); R(x + 6, y + 5, 2, 2, "#ffffff"); }
      else if (it.k === "h") { R(x + 2, y + 6, 12, 8, "#ffe0a0"); R(x + 2, y + 9, 12, 2, "#ff3a6a"); R(x + 2, y + 6, 12, 1, "#c88a3a"); }
      else if (it.k === "K") { R(x + 2, y - 8, 12, 2, "#ffffff"); R(x + 4, y - 6, 2, 22, "#c8c8d8"); R(x + 10, y - 6, 2, 22, "#c8c8d8"); R(x + 5, y - 2, 6, 7, it.got ? "#3aff6a" : "#ff3ad8"); } });
    var ax = arenaX - cam.x; if (!locked && ax > -20 && ax < W + 20) { R(ax, 0, 16, (HT - 3) * TS - cam.y, "#5a1a8a"); for (var dy = 0; dy < (HT - 3) * TS - cam.y; dy += 10) R(ax + 3, dy + 2, 10, 5, "#e8ff1a"); }
    foes.forEach(function (f) { if (!f.alive) return; var x = Math.round(f.x - cam.x), y = Math.round(f.y - cam.y); if (x < -20 || x > W + 20) return; var w2 = Math.floor(tt * 8) % 2;
      if (f.k === "m") { R(x + 2, y - 6, 8, 6, "#ff2a3a"); R(x + 4, y - 9, 4, 3, "#ff2a3a"); R(x + 1, y, 10, 4, "#ffe0b0"); R(x + 2, y + 2, 8, 4, "#ffffff"); R(x + 1, y + 6, 10, 4, "#3a6aff"); R(x + 3, y + 1, 2, 1, "#111"); R(x + 7, y + 1, 2, 1, "#111"); R(x + 2 + w2, y + 10, 3, 2, "#5a2a0a"); R(x + 7 - w2, y + 10, 3, 2, "#5a2a0a"); }
      else if (f.k === "c") { R(x, y + 2, 12, 4, "#ffffff"); R(x, y + 6 + (w2 ? 2 : 0), 12, 4, "#ffffff"); R(x, y + 5, 12, 1, "#ff6a8a"); R(x - 1, y + 3, 2, 6, "#ff6a8a"); R(x + 11, y + 3, 2, 6, "#ff6a8a"); }
      else if (f.k === "b") { R(x + 1, y + 3, 10, 6, "#2a2a3a"); R(x + (f.x < hero.x ? 9 : -1), y + 2, 4, 4, "#2a2a3a"); R(x + (f.x < hero.x ? 12 : -3), y + 3, 2, 2, "#ffe21a"); R(x + 2, y + (w2 ? 0 : 6), 8, 2, "#4a4a5a"); R(x + (f.x < hero.x ? 10 : 0), y + 3, 1, 1, "#fff"); }
      else { R(x, y + 2, 10, 8, "#c8c8d8"); R(x + 2, y, 6, 3, "#c8c8d8"); R(x + 2, y + 4, 2, 2, "#111"); R(x + 6, y + 4, 2, 2, "#111"); R(x + 1 + w2, y + 10, 2, 1, "#888"); R(x + 7 - w2, y + 10, 2, 1, "#888"); } });
    if (boss) drawBoss(boss, tt);
    shots.forEach(function (sh) { var x = sh.x - cam.x, y = sh.y - cam.y; R(x - 2, y - 2, 5, 4, "#7ae8ff"); R(x - 1, y - 1, 2, 2, "#ffffff"); });
    eshots.forEach(function (sh) { var x = sh.x - cam.x, y = sh.y - cam.y; if (sh.k === "duck") { R(x, y + 3, 8, 5, "#ffe21a"); R(x + 4, y, 4, 4, "#ffe21a"); R(x + 8, y + 1, 2, 2, "#ff8a1a"); R(x + 5, y + 1, 1, 1, "#111"); } else { R(x + 2, y, 4, 7, "#fff0a8"); R(x + 3, y + 1, 2, 2, "#c8a050"); } });
    if (hero && mode === "play" && !(dead && Math.floor(tt * 10) % 2) && (hero.inv <= 0 || Math.floor(tt * 16) % 2)) drawBoot(tt);
    parts.draw(g, cam);
    if (mode === "play") { for (var i = 0; i < 5; i++) R(4 + i * 7, 4, 5, 6, i < hp ? "#3aff6a" : "rgba(0,0,0,0.35)"); if (boss) { R(W - 64, 4, 60, 6, "rgba(0,0,0,0.4)"); R(W - 63, 5, 58 * Math.max(0, boss.hp) / (boss.id === "tub" ? 30 : boss.id === "hoover" ? 34 : 26), 4, "#ff3ad8"); g.font = "bold 7px sans-serif"; g.textAlign = "right"; g.fillStyle = "#fff"; g.fillText(boss.name, W - 4, 18); } }
    c.drawImage(lo, 0, 0, W * PX, H * PX);
  }
  function drawBoot(tt) {
    var h = hero, x = Math.round(h.x - cam.x), y = Math.round(h.y - cam.y), F = h.face > 0, sq = h.ground ? 0 : 1, step = h.ground && h.vx ? Math.floor(h.ph) % 2 : 0;
    function r(dx, dy, w, hh, col) { R(F ? x + dx : x + h.w - dx - w, y + dy, w, hh, col); }
    r(1, 0 - sq, 7, 11 + sq, "#3ad81a"); r(1, 0 - sq, 7, 2, "#b8ff1a"); r(1, 10, 11, 4, "#3ad81a"); r(1, 13, 12, 1, "#1a6a0a"); r(2 + step, 13, 3, 1, "#0a3a0a");
    r(3, 3, 3, 3, "#ffffff"); r(6, 3, 3, 3, "#ffffff"); r(4 + (F ? 1 : 0), 4, 1, 1, "#111"); r(7 + (F ? 1 : 0), 4, 1, 1, "#111"); r(4, 8, 4, 1, "#1a6a0a");
    r(0, 5, 2, 1, "#ff3ad8"); r(-1, 6, 2, 1, "#ff3ad8");
    // hose nozzle
    r(9, 6, 4, 2, "#ffe21a"); if (h.fireT > 0) r(13, 6, 2, 2, "#7ae8ff");
    // whip lace
    if (whip) { var len = 40 * Math.min(1, whip.t / 0.08); for (var i = 0; i < len; i += 2) r(10 + i, 4 - Math.sin(i / 6) * 2, 2, 1, "#ffffff"); }
    if (h.swing) { var hk = h.swing.hk; PF.line(g, x + 5, y + 4, hk.x - cam.x, hk.y - cam.y, "#ffffff", 1); }
  }
  function drawBoss(b, tt) {
    var x = Math.round(b.x - cam.x), y = Math.round(b.y - cam.y), fl = b.inv > 0 && Math.floor(tt * 20) % 2;
    if (b.id === "marrow") { R(x, y + 2, b.w, b.h - 2, fl ? "#fff" : "#3ad81a"); for (var i = 0; i < 4; i++) R(x + 3 + i * 7, y + 3, 2, b.h - 4, "#b8ff1a"); R(x + b.w - 4, y + 6, 6, 4, "#7a5a1a"); R(x + 4, y + 4, 22, 2, "#1a8a0a");
      if (b.open > 0) { R(x + 7, y + 7, 6, 6, "#ffffff"); R(x + 17, y + 7, 6, 6, "#ffffff"); R(x + 9, y + 9, 2, 2, "#111"); R(x + 19, y + 9, 2, 2, "#111"); R(x + 10, y + 14, 10, 4, "#6a0a2a"); } else { R(x + 7, y + 9, 6, 2, "#1a6a0a"); R(x + 17, y + 9, 6, 2, "#1a6a0a"); }
      R(x + 10, y - 4, 10, 6, "#ffe21a"); R(x + 13, y - 2, 4, 2, "#ff2a3a"); }
    else if (b.id === "tub") { R(x, y + 6, b.w, 12, fl ? "#fff" : "#ffffff"); R(x + 2, y + 18, 4, 4, "#ffe21a"); R(x + b.w - 6, y + 18, 4, 4, "#ffe21a"); R(x - 2, y + 6, b.w + 4, 3, "#c8c8d8"); R(x + 12, y - 8, 10, 12, "#ff2a3a"); R(x + 13, y - 2, 8, 6, "#ffe0b0"); R(x + 13, y + 2, 8, 4, "#ffffff"); R(x + 10, y - 10, 14, 4, "#1a1a6a"); R(x + 16, y - 13, 3, 3, "#ffe21a"); R(x + 15, y - 1, 1, 1, "#111"); R(x + 19, y - 1, 1, 1, "#111"); for (var b2 = 0; b2 < 3; b2++) R(x + 4 + b2 * 9, y + 3 + Math.sin(tt * 6 + b2) * 2, 4, 4, "rgba(200,240,255,0.8)"); }
    else { var F = b.face > 0; function r(dx, dy, w, hh, col) { R(F ? x + dx : x + b.w - dx - w, y + dy, w, hh, col); }
      r(4, 0, 14, 26, fl ? "#fff" : "#c83ad8"); r(2, 22, 22, 10, "#8a1ac8"); r(0, 28, 6, 4, "#2a2a3a"); r(20, 28, 6, 4, "#2a2a3a"); r(6, 2, 10, 4, "#ff9ae8"); r(16, 4, 4, 20, "#e8e8f0"); r(18, 22, 10, 6, "#e8e8f0"); r(-6, 6, 10, 14, "#ffe21a"); r(-5, 8, 8, 1, "#c8b81a"); r(7, 9, 3, 3, "#ffffff"); r(12, 9, 3, 3, "#ffffff"); r(8, 10, 1, 1, "#111"); r(13, 10, 1, 1, "#111");
      if (b.phase % 2 === 0 && b.act > 0.3) for (var q = 0; q < 4; q++) { var px = (F ? x + b.w + 6 : x - 6) + (F ? 1 : -1) * ((tt * 120 + q * 30) % 120); R(px, y + 26 + Math.sin(tt * 9 + q) * 3, 3, 1, "rgba(255,255,255,0.6)"); } }
  }

  // ---------- flow ----------
  function stageClear() { ui.stop(); mode = "clear"; var last = st + 1 >= STAGES.length; if (last) ui.runEnded(); if (st + 2 > save.open) save.open = Math.min(STAGES.length, st + 2); if (score > save.hi) save.hi = score; ui.persist();
    var quip = ["The Prize Marrow is disqualified from the village show.", "Admiral Bathbottom pulls the plug and sails off down the drain.", "Nan's Hoover gives one last wheeze and coughs up a lost earring."][st];
    ui.menu({ kicker: STAGES[st].name, title: last ? "Boot-iful!" : "Squelched it", body: quip, stats: '<b class="ff-score-xl">' + FF.n(score) + "</b><span>TIME " + FF.fmtTime(tm) + "</span>",
      buttons: last ? [{ label: "Menu", act: toTitle }] : [{ label: "Next stage", act: function () { mode = "play"; load(st + 1); ui.go(); A.playSong(SONG); } }, { label: "Menu", small: true, act: toTitle }] }); }
  function gameOver() { ui.stop(); mode = "over"; A.stopSong(); ui.runEnded(); var hi = score > save.hi; if (hi) save.hi = score; ui.persist();
    ui.menu({ title: "Boots off", body: "Slugboot has squelched his last squelch. For now.", stats: '<b class="ff-score-xl">' + FF.n(score) + "</b><span>" + (hi ? "NEW HIGH SCORE" : "HIGH SCORE " + FF.n(save.hi)) + "</span>", buttons: [{ label: "Try " + STAGES[st].name + " again", act: function () { play(st); } }, { label: "Menu", small: true, act: toTitle }] }); }
  function play(i) { mode = "play"; lives = 3; score = 0; load(i); ui.go(); A.playSong(SONG); }
  function toTitle() { ui.stop(); mode = "title"; load(0); A.playSong(SONG);
    ui.menu({ title: "SLUGBOOT", body: "One cross welly. A garden hose. A bootlace whip. Three very silly bosses.", stats: "<span>HIGH SCORE " + (save.hi ? FF.n(save.hi) : "-") + "</span><span>STAGES " + save.open + "/3</span>",
      buttons: [{ label: "Play", act: function () { play(Math.min(save.open, STAGES.length) - 1); } }], row: STAGES.map(function (s, i) { return { label: String(i + 1), disabled: i >= save.open, act: function () { play(i); } }; }), app: true,
      help: ["◀ ▶ squelch, Jump (hold for higher). Hose squirts water (it arcs upward if you fire mid-air). Whip cracks your bootlace.", "Crack the whip near a hook and you swing from it; Jump lets go. Land on small pests to squash them.", "Bosses: the Marrow is soft when it opens its eyes; hit the Hoover from behind; the Admiral comes low now and then."],
      fine: "An original Forest Forge game." }); }
  var game = { toTitle: toTitle, onResize: sizeLo, update: function (dt) { if (mode === "play") update(dt); }, render: render, idle: function (dt) { if (mode === "title" && L) { cam.x += dt * 30; if (cam.x > L.pw - W) cam.x = 0; } }, onBack: function () { if (mode === "play") { toTitle(); return true; } return false; } };
  ui.onAdsRemoved = function () { if (mode === "title") toTitle(); };
  game.qa = { play: play, god: function (v) { god = v; }, lives: function (n) { lives = n; }, L: function () { return L; }, hooks: function () { return hooks; },
    state: function () { return { mode: mode, st: st, x: hero.x, y: hero.y, tx: Math.floor((hero.x + 5) / TS), ty: Math.floor((hero.y + 13) / TS), ground: hero.ground, swing: !!hero.swing, th: hero.swing ? hero.swing.th : 0, om: hero.swing ? hero.swing.om : 0, hp: hp, lives: lives, won: won, dead: dead, pw: L.pw, arena: arenaX, boss: boss && { hp: boss.hp, x: boss.x, y: boss.y, w: boss.w, id: boss.id, open: boss.open, face: boss.face } }; } };
  ui.start(game);
})();
