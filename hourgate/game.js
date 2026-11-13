/* Hourgate (Forest Forge). Edda Thorne, a clockmaker's apprentice, must cross Hourgate Keep
 * and reach the great clock before the hour runs out: weighty running, ledge grabs, traps,
 * loose floors, plates and gates, and sword duels with clockwork Wardens.
 * Flip-screen rooms of 10x3 cells. Original game: all art drawn in code, all sound generated. */
(function () {
  "use strict";
  var clamp = FF.clamp, CW = 32, CH = 56, RC = 10, RR = 3, LIMIT = 15 * 60;
  var ui = FF.create({
    id: "hourgate", title: "Hourgate", course: "The Undercroft", wide: true, view: { w: 640, h: 360, flex: true },
    stats: [{ id: "time", label: "Time", value: "15:00" }, { id: "score", label: "Score", value: "0" }],
    pads: { left: [{ id: "L", icon: "left", aria: "Left", keys: ["ArrowLeft", "KeyA"] }, { id: "R", icon: "right", aria: "Right", keys: ["ArrowRight", "KeyD"] }],
      right: [{ id: "S", label: "Sword", aria: "Sword", keys: ["KeyX", "KeyK", "ShiftLeft"] }, { id: "J", icon: "up", cls: "big", aria: "Jump, climb, parry", keys: ["Space", "ArrowUp", "KeyW", "KeyZ"] }] }
  });
  var A = ui.audio, save = ui.save; save.hi = save.hi || 0; save.best = save.best || 0; save.reached = save.reached || 0;
  var PX = 2, lo = document.createElement("canvas"), g = lo.getContext("2d"), W = 320, H = 180, Q = 1;
  function sizeLo() { W = Math.ceil(ui.VW / PX); H = Math.ceil(ui.VH / PX); Q = FF.hdq ? FF.hdq(ui, PX) : 1; lo.width = Math.round(W * Q); lo.height = Math.round(H * Q); g.setTransform(Q, 0, 0, Q, 0, 0); g.imageSmoothingEnabled = false; g.hdQ = Q; }
  function R(x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }

  // ---------- levels: cells. _ floor, . open, # block, ^ spikes, x chopper, ~ loose, g gate, p plate, h potion, E exit, S start, G warden, C captain ----------
  var LEVELS = [
    { name: "The Undercroft", wall: "#d8a868", wallD: "#a87038", back: "#3a2a5a", backD: "#2a1a44", torch: 1, guardHp: 3, parry: 0.25,
      rows: ["#S____~_..____.###############", "##############___^_p__g_G__.##", "####.________G_h__x__.._~___##", "####______.##########..#######", "##########__^__p_g__G__.######", "#######################__h_E_#"] },
    { name: "Sandstone Galleries", wall: "#f0c070", wallD: "#c08838", back: "#1a3a8a", backD: "#102a6a", torch: 1, guardHp: 4, parry: 0.35,
      rows: ["##############################", "##.______h___G_____..______E_##".slice(0, 30), "##_____~~____G___.____x____.##", "#####_.____h_x__^__G___..___##", "######___^__~_..__G_g__p_h__.#", "#S_____~__..____G___x___^____#"] },
    { name: "The Blue Hall", wall: "#e8b878", wallD: "#b07840", back: "#0a1a6a", backD: "#06104a", torch: 1, guardHp: 5, parry: 0.45,
      rows: ["####################", "#S____^__~~__..___.#", "#._G___x__h__^^g_p_#", "#__..___G___~_.#####", "###..#########__h_.#", "###..#E___C________#"] }
  ];
  function isFloor(ch) { return ch !== "." && ch !== "#" && ch !== undefined; }
  var lv, cells, LWc, LHc, li = 0;
  function cell(r, c) { if (r < 0 || c < 0 || c >= LWc) return "#"; if (r >= LHc) return "."; return cells[r][c]; }
  function floorY(r) { return (r + 1) * CH - 6; }

  // ---------- sound ----------
  var S = {
    step: function () { A.noise({ dur: 0.03, gain: 0.03, freq: 500, filter: "lowpass" }); },
    jump: function () { A.noise({ dur: 0.06, gain: 0.05, freq: 900, filter: "bandpass" }); },
    land: function () { A.noise({ dur: 0.08, gain: 0.08, freq: 300, filter: "lowpass" }); },
    grab: function () { A.tone({ f: 220, dur: 0.05, type: "triangle", gain: 0.06 }); },
    clang: function () { A.tone({ f: 1500, f2: 1300, dur: 0.12, type: "square", gain: 0.05 }); A.tone({ f: 2200, dur: 0.08, type: "triangle", gain: 0.05 }); },
    swish: function () { A.noise({ dur: 0.1, gain: 0.06, freq: 2500, filter: "bandpass" }); },
    hit: function () { A.tone({ f: 300, f2: 120, dur: 0.14, type: "sawtooth", gain: 0.08 }); },
    hurt: function () { A.tone({ f: 260, f2: 90, dur: 0.25, type: "square", gain: 0.09 }); },
    crumble: function () { A.noise({ dur: 0.3, gain: 0.1, freq: 400, filter: "lowpass" }); },
    gate: function () { for (var i = 0; i < 6; i++) A.tone({ f: 180 + i * 10, dur: 0.05, type: "square", gain: 0.03, delay: i * 0.06 }); },
    drink: function () { [523, 659, 784].forEach(function (f, i) { A.tone({ f: f, dur: 0.1, type: "triangle", gain: 0.08, delay: i * 0.08 }); }); },
    chop: function () { A.noise({ dur: 0.07, gain: 0.07, freq: 3000, filter: "highpass" }); },
    die: function () { [392, 330, 262, 196].forEach(function (f, i) { A.tone({ f: f, dur: 0.25, type: "triangle", gain: 0.1, delay: i * 0.22 }); }); },
    chime: function () { [784, 659, 523, 392].forEach(function (f, i) { A.tone({ f: f, dur: 0.6, type: "sine", gain: 0.1, delay: i * 0.35 }); }); }
  };
  var SONG = { bpm: 96, order: [0, 1], parts: [[
    { wave: "triangle", gain: 0.1, pat: "D5 . . F5 E5 . D5 . C#5 . D5 . A4 . . . Bb4 . . D5 C5 . Bb4 . A4 . . . . . . ." },
    { wave: "triangle", gain: 0.15, pat: "D3 . A3 . D3 . A3 . D3 . A3 . D3 . A3 . Bb2 . F3 . Bb2 . F3 . A2 . E3 . A2 . C#3 ." },
    { wave: "drum", pat: "k . . . h . . . s . . . h . . . k . . k h . . . s . . . h . h ." }], [
    { wave: "triangle", gain: 0.1, pat: "F5 . . A5 G5 . F5 . E5 . F5 . D5 . . . G5 . . F5 E5 . D5 . C#5 . . . A4 . . ." },
    { wave: "triangle", gain: 0.15, pat: "F2 . C3 . F2 . C3 . D3 . A3 . D3 . A3 . G2 . D3 . G2 . D3 . A2 . E3 . A2 . E3 ." },
    { wave: "drum", pat: "k . . . h . . . s . . . h . . . k . . k h . . . s . . . h h s ." }]] };

  // ---------- state ----------
  var mode = "title", hero, guards = [], gates = {}, loose = {}, debris = [], parts = PF.Parts(), clock = LIMIT, score = 0, camR = 0, camC = 0, flash = 0, msg = "", msgT = 0, qaGod = false;
  function newHero(r, c) { return { x: c * CW + CW / 2, y: floorY(r), vx: 0, vy: 0, face: 1, st: "stand", t: 0, hp: 3, max: 3, fallFrom: floorY(r), atk: 0, parry: 0, inv: 0, hang: null, ph: 0, dead: 0 }; }
  var irisT = 0;
  function load(i, keepHp) { irisT = 1;
    li = i; lv = LEVELS[i]; cells = lv.rows.map(function (r) { return r.split(""); }); LHc = cells.length; LWc = cells[0].length;
    guards = []; gates = {}; loose = {}; debris = []; parts.clear(); var hp = hero ? hero.hp : 3, mx = hero ? hero.max : 3;
    for (var r = 0; r < LHc; r++) for (var c = 0; c < LWc; c++) { var ch = cells[r][c];
      if (ch === "S") hero = newHero(r, c);
      if (ch === "G" || ch === "C") guards.push({ x: c * CW + CW / 2, r: r, y: floorY(r), face: -1, hp: ch === "C" ? 6 : lv.guardHp, max: ch === "C" ? 6 : lv.guardHp, st: "idle", t: 0, cap: ch === "C", home: c * CW + CW / 2, dead: 0 });
      if (ch === "g") gates[r + "," + c] = { open: 0, timer: 0 }; }
    if (keepHp) { hero.hp = hp; hero.max = mx; }
    ui.setCourse(lv.name); say(lv.name); hud();
  }
  function say(t) { msg = t; msgT = 2.5; }
  function hud() { var s = Math.max(0, Math.ceil(clock)); ui.setStat("time", Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0")); ui.setStat("score", FF.n(score)); }
  function rowOf(y) { return Math.round((y + 6) / CH) - 1; }
  function colOf(x) { return Math.floor(x / CW); }
  function gateClosed(r, c) { var gt = gates[r + "," + c]; return gt && gt.open < 0.8; }
  function blocked(r, c, fromC) { var ch = cell(r, c); if (ch === "#") return true; return false; }
  function standable(r, c) { var ch = cell(r, c); if (ch === "." && cell(r + 1, c) === "#") return true; return isFloor(ch) && !(loose[r + "," + c] && loose[r + "," + c].gone); }
  function hurt(n, why) { var h = hero; if (h.dead || qaGod) return; h.hp -= n; flash = 0.3; S.hurt(); if (h.hp <= 0) kill(why); }
  function kill(why) { var h = hero; if (h.dead) return; if (qaGod) { h.hp = Math.max(1, h.hp); return; } h.hp = 0; h.dead = 2.2; h.st = "dead"; S.die(); game.deaths = (game.deaths || []).concat([[li, why, colOf(h.x), rowOf(h.y)]]); }

  // ---------- hero ----------
  function update(dt) {
    var h = hero; clock -= dt; if (clock <= 0) { clock = 0; return timeUp(); }
    if (Math.floor(clock * 4) !== Math.floor((clock + dt) * 4)) hud();
    flash = Math.max(0, flash - dt); msgT -= dt;
    if (h.dead) { h.dead -= dt; parts.step(dt); if (h.dead <= 0) { var keep = Math.max(3, h.max); load(li); hero.max = keep; hero.hp = keep; } return; }
    var dir = (ui.down("L") ? -1 : 0) + (ui.down("R") ? 1 : 0), jump = ui.hit("J"), sword = ui.hit("S");
    var r = rowOf(h.y), c = colOf(h.x);
    // nearest live warden on this row
    var foe = null; guards.forEach(function (gd) { if (!gd.dead && gd.r === r && Math.abs(gd.x - h.x) < 110 && (!foe || Math.abs(gd.x - h.x) < Math.abs(foe.x - h.x))) foe = gd; });
    h.t += dt; h.atk = Math.max(0, h.atk - dt); h.parry = Math.max(0, h.parry - dt); h.inv = Math.max(0, h.inv - dt);
    if (h.st === "hang") {
      var e = h.hang; h.x = e.x - h.face * 7; h.y = floorY(e.r) + 32;
      if (jump || (dir === h.face && h.t > 0.25)) { h.st = "climb"; h.t = 0; }
      else if (dir === -h.face) { h.st = "air"; h.vy = 0; h.vx = 0; h.fallFrom = h.y - 32; }
    } else if (h.st === "climb") {
      if (h.t > 0.45) { h.st = "stand"; h.x = h.hang.x + h.face * 9; h.y = floorY(h.hang.r); h.vx = 0; h.fallFrom = h.y; }
    } else if (h.st === "air") {
      h.vy = Math.min(520, h.vy + 900 * dt); var nx = h.x + h.vx * dt, ny = h.y + h.vy * dt;
      // walls
      var bodyR = Math.ceil((h.y + 6) / CH) - 1; if (cell(bodyR, colOf(nx + Math.sign(h.vx) * 5)) === "#" || gateBlock(bodyR, h.x, nx)) { nx = h.x; h.vx = 0; }
      // grab a ledge: hands pass a floor edge in front
      if (h.vy > -80 && h.canGrab) { var handY = ny - 30, er = rowOf(handY + 8); for (var rr = er; rr <= er + 1; rr++) { var fy = floorY(rr); if (handY > fy - 6 && handY < fy + 14) { var ec = colOf(nx + h.face * 18), bc = colOf(nx); if (ec !== bc && standable(rr, ec) && !standable(rr, bc) && cell(rr, bc) !== "#") { var ex = h.face > 0 ? ec * CW : (ec + 1) * CW; if (Math.abs(ex - nx) < 20) { h.st = "hang"; h.hang = { x: ex, r: rr }; h.t = 0; h.vx = h.vy = 0; S.grab(); break; } } } } }
      if (h.st === "air") { // landing
        var lr = rowOf(ny); var fy2 = floorY(lr);
        if (h.vy > 0 && h.y <= fy2 + 1 && ny >= fy2 && standable(lr, colOf(nx))) { ny = fy2; land(h, lr, colOf(nx)); }
        h.x = nx; h.y = ny; if (h.y > LHc * CH + 40) kill("fall"); }
    } else {
      // ground: weighty run, skid on turn, fight stance near a warden
      if (!standable(r, c)) { h.st = "air"; h.vy = 0; h.canGrab = false; h.fallFrom = h.y; return finish(dt); }
      var fight = !!foe; h.fight = fight;
      if (fight) { h.face = foe.x > h.x ? 1 : -1; h.vx = dir * 40;
        if (sword && h.atk <= 0) { h.atk = 0.35; h.hitDone = 0; S.swish(); }
        if (jump) { h.parry = 0.3; }
        if (h.atk > 0 && h.atk < 0.22 && !h.hitDone) { h.hitDone = 1; if (Math.abs(foe.x - h.x) < 44) strikeGuard(foe); }
        if (Math.abs(foe.x - h.x) < 18) h.vx = -h.face * 30;
      } else {
        if (dir) { if (dir !== h.face && Math.abs(h.vx) > 50) { h.vx -= Math.sign(h.vx) * 420 * dt; } else { h.face = dir; h.vx = clamp(h.vx + dir * 300 * dt, -100, 100); } }
        else h.vx = Math.abs(h.vx) < 300 * dt ? 0 : h.vx - Math.sign(h.vx) * 300 * dt;
        if (jump) {
          if (Math.abs(h.vx) > 35) { h.st = "air"; h.vx = h.face * 150; h.vy = -250; h.canGrab = true; h.fallFrom = h.y; S.jump(); }
          else { h.st = "air"; h.vx = 0; h.vy = -275; h.canGrab = true; h.fallFrom = h.y; S.jump(); h.face = dir || h.face; }
          return finish(dt);
        }
      }
      var nx2 = h.x + h.vx * dt;
      if (cell(r, colOf(nx2 + Math.sign(h.vx) * 5)) === "#" || gateBlock(r, h.x, nx2)) { nx2 = h.x; h.vx = 0; }
      h.x = nx2; h.ph += Math.abs(h.vx) * dt * 0.12; if (Math.abs(h.vx) > 60 && Math.floor(h.ph) !== Math.floor(h.ph - Math.abs(h.vx) * dt * 0.12)) S.step();
      var c2 = colOf(h.x), ch = cell(r, c2);
      if (ch === "^" && Math.abs(h.vx) > 50) { kill("spikes"); }
      if (ch === "x" && chopperShut(r, c2) && Math.abs(h.x - (c2 * CW + 16)) < 8) { hurt(2, "chopper"); h.x -= h.face * 12; }
      if (ch === "~") stepLoose(r, c2);
      if (ch === "p") pressPlate(r, c2);
      if (ch === "h") { cells[r][c2] = "_"; h.max = Math.min(5, h.max + (h.hp >= h.max ? 1 : 0)); h.hp = h.max; S.drink(); score += 100; hud(); say("Restoring draught"); }
      if (ch === "E" && jump === false && ui.down("J") === false && exitOpen() && Math.abs(h.x - (c2 * CW + 16)) < 10) { levelDone(); return; }
    }
    finish(dt);
  }
  function finish(dt) {
    var h = hero;
    // gates and loose floors
    for (var k in gates) { var gt = gates[k]; if (gt.timer > 0) { gt.timer -= dt; gt.open = Math.min(1, gt.open + dt * 1.2); } else gt.open = Math.max(0, gt.open - dt * 0.35); }
    for (var k2 in loose) { var lf = loose[k2]; if (!lf.gone && lf.t > 0) { lf.t += dt; if (lf.t > 0.55) { lf.gone = 1; S.crumble(); var p = k2.split(","), rr = +p[0], cc = +p[1]; cells[rr][cc] = "."; debris.push({ x: cc * CW, y: floorY(rr), vy: 0, c: cc }); } } }
    debris.forEach(function (d) { if (d.done) return; d.vy += 900 * dt; d.y += d.vy * dt; var r2 = rowOf(d.y); if (standable(r2, d.c) && d.y >= floorY(r2) && d.y - d.vy * dt < floorY(r2)) { d.y = floorY(r2); d.done = 1; S.land(); } if (d.y > LHc * CH + 50) d.done = 1; });
    guards.forEach(function (gd) { stepGuard(gd, dt); });
    parts.step(dt);
    // flip-screen camera
    var nr = Math.floor(clamp(rowOf(h.y - 10), 0, LHc - 1) / RR), nc = Math.floor(clamp(colOf(h.x), 0, LWc - 1) / RC); camR = nr; camC = nc;
  }
  function gateBlock(r, x0, x1) { var c0 = colOf(Math.min(x0, x1)), c1 = colOf(Math.max(x0, x1) + 6); for (var c = c0 - 1; c <= c1 + 1; c++) if (cell(r, c) === "g" && gateClosed(r, c)) { var gx = c * CW + 16; if ((x0 < gx - 4 && x1 >= gx - 4) || (x0 > gx + 4 && x1 <= gx + 4)) return true; } return false; }
  function land(h, r, c) { var drop = floorY(r) - h.fallFrom; h.st = "stand"; h.vy = 0; h.vx *= 0.3; h.fallFrom = floorY(r); S.land(); parts.add(h.x, floorY(r), 6, "#e8c890", 50, 0.4);
    if (drop > CH * 2.5) kill("fall"); else if (drop > CH * 1.5) { hurt(1, "fall"); say("Oof"); }
    var ch = cell(r, c); if (ch === "^") kill("spikes"); if (ch === "~") stepLoose(r, c); }
  function stepLoose(r, c) { var k = r + "," + c; if (!loose[k]) loose[k] = { t: 0 }; if (!loose[k].t) loose[k].t = 0.001; }
  function pressPlate(r, c) { var best = null, bd = 1e9; for (var k in gates) { var p = k.split(","), d = Math.abs(+p[0] - r) * 30 + Math.abs(+p[1] - c); if (d < bd) { bd = d; best = gates[k]; } } if (best) { if (best.timer <= 0) S.gate(); best.timer = 9; } }
  function chopperShut(r, c) { var t = (ui.time + c * 0.37) % 1.8; return t < 0.35; }
  function exitOpen() { return li < 2 || guards.every(function (gd) { return !gd.cap || gd.dead; }); }

  // ---------- wardens ----------
  function strikeGuard(gd) { if (gd.st === "parry" || (gd.st !== "wind" && Math.random() < lv.parry * (gd.cap ? 1.3 : 1))) { gd.st = "parry"; gd.t = 0; S.clang(); parts.add(gd.x - gd.face * 8, gd.y - 26, 5, "#ffffff", 60, 0.3); return; }
    gd.hp--; gd.st = "hurt"; gd.t = 0; gd.x += hero.face * 8; S.hit(); parts.add(gd.x, gd.y - 22, 8, "#ffd23a", 70, 0.4); if (gd.hp <= 0) { gd.dead = 1; gd.st = "down"; score += gd.cap ? 2000 : 500; hud(); say(gd.cap ? "The Warden-Captain winds down" : "Warden down"); } }
  function stepGuard(gd, dt) {
    if (gd.dead) return; var h = hero; gd.t += dt; var same = !h.dead && rowOf(h.y) === gd.r && h.st !== "hang" && h.st !== "climb", dx = h.x - gd.x, ad = Math.abs(dx);
    if (same && ad < 130) gd.face = dx > 0 ? 1 : -1;
    if (gd.st === "hurt" || gd.st === "parry") { if (gd.t > 0.4) { gd.st = "guard"; gd.t = 0; } return; }
    if (gd.st === "wind") { if (gd.t > (gd.cap ? 0.38 : 0.5)) { gd.st = "strike"; gd.t = 0; S.swish();
        if (same && ad < 46) { if (h.parry > 0) { S.clang(); gd.st = "hurt"; gd.t = -0.3; parts.add(gd.x + gd.face * 10, gd.y - 26, 6, "#ffffff", 60, 0.3); } else { hurt(1, "warden"); h.x += gd.face * 10; } } } return; }
    if (gd.st === "strike") { if (gd.t > 0.3) { gd.st = "guard"; gd.t = 0; } return; }
    if (!same || ad > 130) { gd.st = "idle"; return; }
    gd.st = "guard";
    var want = ad > 34 ? gd.face * 32 : ad < 24 ? -gd.face * 20 : 0, nx = gd.x + want * dt; var cc = colOf(nx + gd.face * 6);
    if (standable(gd.r, cc) && cell(gd.r, cc) !== "^" && !gateBlock(gd.r, gd.x, nx)) gd.x = nx;
    if (ad < 46 && gd.t > (gd.cap ? 0.6 : 0.9) && Math.random() < dt * 3) { gd.st = "wind"; gd.t = 0; }
  }

  // ---------- render ----------
  function render(c, tt) {
    if (!W) sizeLo(); if (!lv) load(0);
    var ox = camC * RC * CW - Math.floor((W - RC * CW) / 2), oy = camR * RR * CH - Math.floor((H - RR * CH) / 2);
    R(0, 0, W, H, "#06040e"); var lights = [];
    for (var r = camR * RR - 1; r <= camR * RR + RR; r++) for (var c2 = camC * RC - 1; c2 <= camC * RC + RC; c2++) {
      var ch = cell(r, c2), x = c2 * CW - ox, y = r * CH - oy, fy = floorY(r) - oy;
      if (r < 0 || r >= LHc || c2 < 0 || c2 >= LWc) continue;
      if (ch === "#") { R(x, y - 6, CW, CH, lv.wall); R(x, y - 6, CW, 2, FXP.shade(lv.wall, 0.2)); R(x + CW - 2, y - 6, 2, CH, FXP.shade(lv.wall, -0.25)); for (var b = 0; b < 4; b++) { R(x, y - 6 + b * 14, CW, 1, lv.wallD); R(x + ((b % 2) ? 8 : 22), y - 6 + b * 14, 1, 14, lv.wallD); } continue; }
      var bgg = g.createLinearGradient(0, y - 6, 0, y - 6 + CH); bgg.addColorStop(0, FXP.shade(lv.back, -0.25)); bgg.addColorStop(1, FXP.shade(lv.back, 0.06)); g.fillStyle = bgg; g.fillRect(x, y - 6, CW, CH); if ((c2 * 5 + r * 11) % 9 === 0) { R(x + 6, y + 8, 20, 22, FXP.shade(lv.back, -0.35)); R(x + 8, y + 10, 16, 18, FXP.shade(lv.back, -0.15)); R(x + 15, y + 10, 2, 18, FXP.shade(lv.back, -0.35)); R(x + 8, y + 18, 16, 2, FXP.shade(lv.back, -0.35)); } for (var bk = 0; bk < 4; bk++) { R(x, y - 6 + bk * 14, CW, 1, lv.backD); R(x + ((bk + r) % 2 ? 6 : 20), y - 6 + bk * 14, 1, 14, lv.backD); }
      if (lv.torch && (c2 * 7 + r * 3) % 5 === 0 && isFloor(ch)) { var fl = Math.sin(tt * 13 + c2) * 1.5; R(x + 14, y + 16, 4, 8, "#6a4a2a"); R(x + 13, y + 9 + fl, 6, 7, "#ff8a1a"); R(x + 14, y + 11 + fl, 4, 4, "#ffd23a"); lights.push([x + 16, y + 13 + fl]); }
      if (isFloor(ch) && !(loose[r + "," + c2] && loose[r + "," + c2].gone)) {
        var sh = ch === "~" && loose[r + "," + c2] && loose[r + "," + c2].t > 0 ? (Math.random() * 2 - 1) : 0;
        R(x, fy + sh, CW, 6, lv.wall); R(x, fy + sh, CW, 1, "#fff0c8"); R(x, fy + 1 + sh, CW, 1, FXP.shade(lv.wall, 0.25)); R(x, fy + 5 + sh, CW, 1, lv.wallD); R(x, fy + 6 + sh, CW, 3, "rgba(0,0,0,0.25)");
        if (ch === "~") { R(x + 3, fy + 2 + sh, CW - 6, 1, lv.wallD); R(x + 10, fy + 1 + sh, 1, 4, lv.wallD); }
        if (ch === "^") { var up = Math.abs(hero.x - (c2 * CW + 16)) < 48 && rowOf(hero.y) === r; for (var s = 0; s < 4; s++) R(x + 3 + s * 7, fy - (up ? 8 : 3), 2, up ? 8 : 3, "#e8e8f0"); }
        if (ch === "x") { var shut = chopperShut(r, c2); R(x + 4, fy - 46, 3, 46, "#7a5a3a"); R(x + 25, fy - 46, 3, 46, "#7a5a3a"); if (shut) { R(x + 7, fy - 40, 18, 3, "#e8e8f0"); R(x + 7, fy - 26, 18, 3, "#e8e8f0"); } else { R(x + 7, fy - 46, 4, 6, "#e8e8f0"); R(x + 21, fy - 46, 4, 6, "#e8e8f0"); } }
        if (ch === "p") { var pr = gatesPressed(); R(x + 8, fy - (pr ? 1 : 2), 16, 2, "#c8a050"); }
        if (ch === "g") { var gt = gates[r + "," + c2], gh = 46 * (1 - (gt ? gt.open : 0)); for (var q = 0; q < 4; q++) R(x + 10 + q * 4, fy - 46, 1, gh, "#a8b8d8"); R(x + 9, fy - 46 + gh - 2, 15, 3, "#a8b8d8"); R(x + 8, fy - 48, 17, 3, lv.wall); }
        if (ch === "h") { R(x + 13, fy - 10, 6, 9, "#ff3a6a"); R(x + 14, fy - 13, 4, 3, "#e8e8f0"); R(x + 14, fy - 8, 2, 3, "#ffb0c8"); }
        if (ch === "E") { var open = exitOpen(); R(x + 4, fy - 46, 24, 46, "#2a1a10"); R(x + 2, fy - 50, 28, 5, "#ffd890"); R(x + 2, fy - 46, 3, 46, "#ffd890"); R(x + 27, fy - 46, 3, 46, "#ffd890"); if (open) { g.fillStyle = "rgba(255,220,140," + (0.25 + 0.15 * Math.sin(tt * 4)) + ")"; g.fillRect(x + 5, fy - 45, 22, 45); } R(x + 11, fy - 44, 10, 10, "#ffd890"); R(x + 15, fy - 42, 1, 5, "#2a1a10"); R(x + 15, fy - 38, 4, 1, "#2a1a10"); }
      }
    }
    g.globalCompositeOperation = "lighter"; lights.forEach(function (l) { FXP.glow(g, l[0], l[1], 40 + Math.sin(tt * 9 + l[0]) * 3, "#ff9a3a", 0.22); }); g.globalCompositeOperation = "source-over";
    debris.forEach(function (d) { R(d.x - ox + 2, d.y - oy - (d.done ? 3 : 0), CW - 4, 3, lv.wallD); });
    var g0 = g; g = FXP.layer(W, H);
    guards.forEach(function (gd) { if (Math.floor(gd.r / RR) === camR && Math.floor(colOf(gd.x) / RC) === camC) drawGuard(gd, gd.x - ox, gd.y - oy, tt); });
    if (!(hero.dead && Math.floor(tt * 10) % 2)) drawEdda(hero.x - ox, hero.y - oy, tt);
    g = g0; FXP.flush(g, "#0a0610");
    parts.draw(g, { x: ox, y: oy });
    FXP.ambient(g, W, H, { x: ox, y: oy }, tt, lv.torch ? "rise" : "drift", lv.torch ? "rgba(255,190,90,0.8)" : "rgba(220,230,255,0.6)", 18); FXP.vignette(g, W, H, 0.5);
    if (flash > 0) R(0, 0, W, H, "rgba(255,40,40," + flash + ")");
    // HUD strip: hearts and level name
    for (var i = 0; i < hero.max; i++) { var hx = 4 + i * 9; R(hx, H - 10, 7, 6, i < hero.hp ? "#ff3a6a" : "#3a2a3a"); R(hx + 1, H - 11, 2, 1, i < hero.hp ? "#ff3a6a" : "#3a2a3a"); R(hx + 4, H - 11, 2, 1, i < hero.hp ? "#ff3a6a" : "#3a2a3a"); }
    var foe = guards.filter(function (gd) { return !gd.dead && gd.r === rowOf(hero.y) && Math.abs(gd.x - hero.x) < 110; })[0];
    if (foe) for (var j = 0; j < foe.max; j++) R(W - 10 - j * 8, H - 10, 6, 6, j < foe.hp ? "#7ac8ff" : "#2a2a3a");
    if (msgT > 0) { g.font = "bold 9px serif"; g.textAlign = "center"; g.fillStyle = "rgba(0,0,0,0.5)"; var tw = g.measureText(msg).width; g.fillRect(W / 2 - tw / 2 - 6, 6, tw + 12, 14); g.fillStyle = "#ffe0a0"; g.fillText(msg, W / 2, 16); }
    if (irisT > 0) { FXP.iris(g, W, H, irisT, hero.x - ox, hero.y - oy - 20); irisT -= 1 / 30; }
    c.imageSmoothingEnabled = Q > 1; c.drawImage(lo, 0, 0, W * PX, H * PX); c.imageSmoothingEnabled = false;
  }
  function gatesPressed() { for (var k in gates) if (gates[k].timer > 0) return true; return false; }
  var EPAL = { skin: "#f0c8a0", skinD: "#d8a880", hair: "#8a2a1a", top: "#2a6ad8", leg: "#3a3a5a", legD: "#2a2a44", boot: "#5a3a1a", band: "#ffd23a" };
  var WPAL = { skin: "#c8a050", skinD: "#a88030", hair: "#6a4a1a", top: "#b88a2a", leg: "#8a6a2a", legD: "#6a4a1a", boot: "#3a2a10" };
  var CPAL = { skin: "#d8d8e8", skinD: "#a8a8c8", hair: "#3a3a6a", top: "#4a4ab8", leg: "#6a6a9a", legD: "#4a4a7a", boot: "#1a1a3a", band: "#ffd23a" };
  function drawEdda(x, y, tt) {
    var h = hero, flip = h.face < 0, pose, sc = 1.55, hipY = y - 14;
    if (h.st === "hang") { pose = { lean: 0, tf: 0.1, sf: 0.1, tb: -0.1, sb: -0.1, af: Math.PI * 0.95, ff: Math.PI, ab: Math.PI * 0.95, fb: Math.PI }; hipY = y - 14; }
    else if (h.st === "climb") { var k = Math.min(1, h.t / 0.45); pose = { lean: 0.6 * (1 - k), tf: 1.4 - k, sf: -0.4, tb: 0.6, sb: -0.6, af: Math.PI * (0.95 - 0.6 * k), ff: Math.PI * (1 - 0.6 * k), ab: 2, fb: 2.4 }; hipY = y - 14 - 30 * k; }
    else if (h.st === "air") pose = h.vy < 0 && Math.abs(h.vx) < 10 ? { lean: 0, tf: 0.2, sf: 0, tb: -0.2, sb: -0.3, af: Math.PI * 0.9, ff: Math.PI, ab: Math.PI * 0.85, fb: Math.PI } : PF.runPose(1.2, 1);
    else if (h.st === "dead") { R(x - 14, y - 4, 26, 4, EPAL.top); R(x + (flip ? -18 : 12), y - 6, 6, 5, EPAL.skin); return; }
    else if (h.fight) pose = h.atk > 0 ? { lean: 0.3, tf: 0.7, sf: 0.3, tb: -0.6, sb: -0.3, af: h.atk > 0.2 ? 2.6 : 1.4, ff: h.atk > 0.2 ? 2.8 : 1.5, ab: -0.6, fb: -0.2 } : h.parry > 0 ? { lean: -0.1, tf: 0.3, sf: 0.2, tb: -0.4, sb: -0.2, af: 2.6, ff: 3.1, ab: -0.4, fb: 0 } : { lean: 0.05, tf: 0.4, sf: 0.2, tb: -0.4, sb: -0.3, af: 1.3, ff: 1.9, ab: -0.4, fb: 0.1 };
    else pose = Math.abs(h.vx) > 5 ? PF.runPose(h.ph * 2.2, Math.abs(h.vx) / 100) : PF.figure && { lean: 0, tf: 0.08, sf: 0.08, tb: -0.08, sb: -0.08, af: 0.15, ff: 0.35, ab: -0.1, fb: 0.15 };
    var res = PF.figure(g, x, hipY, pose, EPAL, flip, sc);
    if (h.fight || h.atk > 0) { var hx = res.hand[0], hy = res.hand[1], a = h.atk > 0.2 ? -0.9 : h.atk > 0 ? 0 : h.parry > 0 ? -1.4 : -0.3; PF.line(g, hx, hy, hx + Math.cos(a) * 16 * (flip ? -1 : 1), hy + Math.sin(a) * 16, "#e8f0ff", 1); }
  }
  function drawGuard(gd, x, y, tt) {
    var flip = gd.face < 0, pal = gd.cap ? CPAL : WPAL;
    if (gd.dead) { R(x - 14, y - 4, 26, 4, pal.top); R(x - 4, y - 7, 8, 3, pal.skin); return; }
    var pose = gd.st === "wind" ? { lean: -0.2, tf: 0.4, sf: 0.2, tb: -0.4, sb: -0.3, af: 2.9, ff: 3.2, ab: -0.4, fb: 0 } : gd.st === "strike" ? { lean: 0.35, tf: 0.8, sf: 0.3, tb: -0.6, sb: -0.3, af: 1.4, ff: 1.5, ab: -0.6, fb: -0.2 } : gd.st === "hurt" ? { lean: -0.4, tf: 0.5, sf: 0.8, tb: 0.1, sb: 0.3, af: -1.5, ff: -1.7, ab: -1.2, fb: -1.4 } : gd.st === "parry" ? { lean: -0.1, tf: 0.3, sf: 0.2, tb: -0.4, sb: -0.2, af: 2.6, ff: 3.1, ab: -0.4, fb: 0 } : { lean: 0.05, tf: 0.4, sf: 0.2, tb: -0.4, sb: -0.3, af: 1.3, ff: 1.9, ab: -0.4, fb: 0.1 };
    var res = PF.figure(g, x, y - 14, pose, pal, flip, gd.cap ? 1.75 : 1.6);
    // clockwork key on the back and a round face plate
    var bx = res.head[0] - (flip ? -6 : 6), by = res.head[1] + 8; R(bx - 1, by, 3, 2, "#ffd23a"); R(bx - 2, by - 2, 1, 6, "#ffd23a"); R(bx + 2, by - 2, 1, 6, "#ffd23a");
    R(res.head[0] - 2, res.head[1] - 3, 5, 5, gd.cap ? "#ffd23a" : "#e8d8a0"); R(res.head[0], res.head[1] - 2, 1, 2, "#2a1a10");
    var hx = res.hand[0], hy = res.hand[1], a = gd.st === "wind" ? -1.5 : gd.st === "strike" ? 0.1 : gd.st === "parry" ? -1.4 : -0.4; PF.line(g, hx, hy, hx + Math.cos(a) * 16 * (flip ? -1 : 1), hy + Math.sin(a) * 16, "#c8d8ff", 1);
    if (gd.st === "wind") R(x - 1, y - 52, 3, 3, Math.floor(tt * 16) % 2 ? "#ffffff" : "#ff5a3a");
  }

  // ---------- flow ----------
  function levelDone() {
    ui.stop(); mode = "clear"; A.stopSong(); var last = li >= LEVELS.length - 1; score += 1000; if (li + 1 > save.reached) save.reached = Math.min(LEVELS.length - 1, li + 1);
    if (last) { score += Math.floor(clock) * 10; S.chime(); ui.runEnded(); var used = LIMIT - clock; if (!save.best || used < save.best) save.best = used; }
    if (score > save.hi) save.hi = score; ui.persist(); hud();
    ui.menu({ kicker: lv.name, title: last ? "The hour is kept" : "Through the door", body: last ? "Edda reaches the great clock with " + FF.fmtTime(clock) + " to spare and sets the Keep's hour right." : "The great clock is still ticking. Next: " + LEVELS[li + 1].name + ".",
      stats: '<b class="ff-score-xl">' + FF.n(score) + "</b><span>TIME LEFT " + FF.fmtTime(clock) + "</span>", buttons: last ? [{ label: "Menu", act: toTitle }] : [{ label: "Onward", act: function () { mode = "play"; load(li + 1, true); ui.go(); A.playSong(SONG); } }] });
  }
  function timeUp() { ui.stop(); mode = "over"; A.stopSong(); S.chime(); ui.runEnded(); var hi = score > save.hi; if (hi) save.hi = score; ui.persist();
    ui.menu({ title: "The hour strikes", body: "The great clock chimes before Edda reaches it.", stats: '<b class="ff-score-xl">' + FF.n(score) + "</b><span>" + (hi ? "NEW HIGH SCORE" : "HIGH SCORE " + FF.n(save.hi)) + "</span>", buttons: [{ label: "Try again", act: function () { play(0); } }, { label: "Menu", small: true, act: toTitle }] }); }
  function play(i) { mode = "play"; clock = LIMIT; score = 0; hero = null; load(i); ui.go(); A.playSong(SONG); }
  function toTitle() { ui.stop(); mode = "title"; hero = null; load(0); A.playSong(SONG);
    ui.menu({ title: "HOURGATE", body: "Fifteen minutes. One keep. Reach the great clock before the hour strikes.", stats: "<span>HIGH SCORE " + (save.hi ? FF.n(save.hi) : "-") + "</span><span>BEST TIME " + (save.best ? FF.fmtTime(save.best) : "-") + "</span>",
      buttons: [{ label: "Begin", act: function () { play(0); } }].concat(save.reached ? [{ label: "Practise " + LEVELS[save.reached].name, small: true, act: function () { play(save.reached); } }] : []), app: true,
      help: ["◀ ▶ run (Edda takes a moment to get going and to stop). Jump while running leaps up to two gaps; Jump while standing reaches up to grab the ledge above. Hanging: Jump climbs, the other way lets go.", "Spikes get you if you run or land on them, so leap them. Choppers snap shut every few seconds. Cracked floors give way. Step on a plate to lift the nearest gate for a few seconds.", "Near a Warden you draw your sword: Sword strikes, Jump parries. Watch for the flash when a Warden winds up, parry it, then strike back. Draughts heal you; a draught at full health adds a heart.", "The clock never stops. Falling two floors hurts; three is the end."],
      fine: "An original Forest Forge game." }); }
  var game = { toTitle: toTitle, onResize: sizeLo, update: function (dt) { if (mode === "play") update(dt); }, render: render, idle: function () {}, onBack: function () { if (mode === "play") { toTitle(); return true; } return false; } };
  ui.onAdsRemoved = function () { if (mode === "title") toTitle(); };
  game.qa = { play: play, god: function (v) { qaGod = v; }, levels: LEVELS, cells: function () { return cells; },
    state: function () { var h = hero; return { mode: mode, li: li, x: h.x, y: h.y, r: rowOf(h.y), c: colOf(h.x), st: h.st, vx: h.vx, hp: h.hp, dead: h.dead, fight: !!h.fight, face: h.face, clock: clock, score: score, guards: guards.map(function (gd) { return { x: gd.x, r: gd.r, st: gd.st, hp: gd.hp, dead: gd.dead, cap: gd.cap }; }), gatesOpen: Object.keys(gates).filter(function (k) { return gates[k].open > 0.8; }) }; },
    warp: function (r, c) { hero.x = c * CW + 16; hero.y = floorY(r); hero.st = "stand"; hero.vx = 0; hero.fallFrom = hero.y; } };
  ui.start(game);
})();
