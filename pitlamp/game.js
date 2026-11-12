/* Pitlamp (Forest Forge). Davy, a walking safety lamp, works down through 20 single-screen
 * caverns: take every flashing key, reach the lift cage, and mind the air. Rooms come from
 * core.js (seeded designer + route solver). All art drawn in code, all sound generated. */
(function () {
  "use strict";
  var P = window.PLC, T = P.T, COLS = P.COLS, ROWS = P.ROWS;
  var ui = FF.create({
    id: "pitlamp", title: "Pitlamp", course: "Room 1", wide: true, view: { w: 640, h: 360, flex: true },
    stats: [{ id: "score", label: "Score", value: "0" }, { id: "room", label: "Room", value: "1/20" }],
    pads: { left: [{ id: "L", icon: "left", aria: "Left", keys: ["ArrowLeft", "KeyA", "KeyO"] }, { id: "R", icon: "right", aria: "Right", keys: ["ArrowRight", "KeyD", "KeyP"] }],
      right: [{ id: "J", icon: "up", cls: "big", aria: "Jump", keys: ["Space", "ArrowUp", "KeyW", "KeyZ"] }] }
  });
  var A = ui.audio, save = ui.save; save.hi = save.hi || 0; save.reach = save.reach || 0;
  var PX = 2, lo = document.createElement("canvas"), g = lo.getContext("2d"), W = 320, H = 180, OX = 32, OY = 6;
  function sizeLo() { W = Math.ceil(ui.VW / PX); H = Math.ceil(ui.VH / PX); lo.width = W; lo.height = H; g.imageSmoothingEnabled = false; OX = Math.floor((W - 256) / 2); OY = Math.max(0, Math.floor((H - 164) / 2)); }
  function R(x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  var BR = ["#ff3a3a", "#3aff4a", "#4a6aff", "#ff4aff", "#3affff", "#ffff4a", "#ffffff"];
  function pal(i) { return { floor: BR[i % 5], wall: BR[(i + 2) % 6], haz: BR[(i + 1) % 6 === i % 5 ? 5 : (i + 1) % 6], conv: BR[(i + 3) % 6], bar: BR[(i + 4) % 7] }; }

  // ---------- sound ----------
  var S = {
    jump: function () { A.tone({ f: 300, f2: 700, dur: 0.12, type: "square", gain: 0.05 }); },
    key: function () { [1568, 2093, 2637].forEach(function (f, i) { A.tone({ f: f, dur: 0.05, type: "square", gain: 0.06, delay: i * 0.045 }); }); },
    crumble: function () { A.noise({ dur: 0.05, gain: 0.05, freq: 400, filter: "lowpass" }); },
    die: function () { for (var i = 0; i < 12; i++) A.tone({ f: 1400 - i * 100, dur: 0.04, type: "square", gain: 0.07, delay: i * 0.04 }); },
    open: function () { [523, 784, 1047].forEach(function (f, i) { A.tone({ f: f, dur: 0.1, type: "square", gain: 0.07, delay: i * 0.08 }); }); },
    tick: function () { A.tone({ f: 1800 + Math.random() * 400, dur: 0.015, type: "square", gain: 0.03 }); },
    win: function () { [392, 523, 659, 784, 1047, 784, 1047, 1319].forEach(function (f, i) { A.tone({ f: f, dur: 0.1, type: "square", gain: 0.08, delay: i * 0.09 }); }); }
  };
  var SONG = { bpm: 150, order: [0, 0, 1, 0], parts: [[
    { wave: "square", gain: 0.04, pat: "E5 G5 B5 G5 A5 . E5 . D5 F#5 A5 F#5 G5 . D5 . C5 E5 G5 E5 F#5 . B4 . E5 . G5 . F#5 E5 D#5 ." },
    { wave: "square", gain: 0.025, pat: "E3 . E3 . E3 . E3 . D3 . D3 . D3 . D3 . C3 . C3 . C3 . C3 . B2 . B2 . B2 . D#3 ." }], [
    { wave: "square", gain: 0.04, pat: "C6 . B5 . A5 G5 A5 . B5 . A5 . G5 F#5 G5 . A5 . G5 . F#5 E5 F#5 . G5 . F#5 . E5 . . ." },
    { wave: "square", gain: 0.025, pat: "A2 . A3 . A2 . A3 . G2 . G3 . G2 . G3 . F#2 . F#3 . B2 . B3 . E3 . E3 . E2 . . ." }]] };

  // ---------- state ----------
  var mode = "title", ri = 0, rm, s, keysLeft, air, airMax, crumble, guards, lives = 3, score = 0, frame = 0, dying = 0, done = 0, acc = 0, nextLife = 10000, qaIn = null, qaNoGuards = false, qaRoutes = null;
  function load(i) {
    ri = i; var src = P.room(i); rm = { i: i, name: src.name, g: src.g.map(function (r) { return r.slice(); }), exit: src.exit, keys: src.keys };
    s = { x: 8, y: 120, m: 0 }; if (qaRoutes) { qaIn = qaRoutes[i]; qaNoGuards = false; } keysLeft = src.keys.length; air = airMax = src.air; crumble = {}; frame = 0; dying = 0; done = 0;
    guards = src.guards.map(function (gd) { return gd.vert ? { vert: 1, x: gd.x, y: gd.y0, y0: gd.y0, y1: gd.y1, sp: gd.sp, dir: 1, kind: gd.kind } : { x: gd.x0, y: gd.y, x0: gd.x0, x1: gd.x1, sp: gd.sp, dir: 1, kind: gd.kind }; });
    ui.setCourse((i + 1) + ". " + src.name); hud();
  }
  function hud() { ui.setStat("score", FF.n(score)); ui.setStat("room", (ri + 1) + "/20"); }
  function addScore(n) { score += n; if (score >= nextLife) { lives++; nextLife += 10000; S.open(); } hud(); }
  function die(why) { if (dying) return; dying = 1.4; S.die(); game.lastDeath = [ri + 1, why, s.x, s.y]; }
  function boxHit(ax, ay, bx, by) { return ax + 1 < bx + 7 && ax + 6 > bx + 1 && ay - 15 < by && ay - 1 > by - 15; }
  function frameStep() {
    frame++;
    if (done) { if (air > 0) { var t = Math.min(air, 24); air -= t; addScore(Math.ceil(t / 6)); if (frame % 3 === 0) S.tick(); } else if ((done -= 1 / 60) <= 0) nextRoom(); return; }
    if (dying) { if ((dying -= 1 / 60) <= 0) { lives--; if (lives <= 0) return gameOver(); load(ri); } return; }
    var inp = qaIn ? P.INPUTS[qaIn[frame - 1] || 0] : { dx: (ui.down("R") ? 1 : 0) - (ui.down("L") ? 1 : 0), jump: ui.down("J") };
    var wasM = s.m, n = P.step(rm, s, inp); if (n.dead) return die(n.dead); s = n; if (wasM === 0 && s.m === 1) S.jump();
    // crumbling floor under feet
    if (s.m === 0) [s.x, s.x + P.HW - 1].forEach(function (px) { var tx = Math.floor(px / T), ty = s.y / T; if (rm.g[ty] && rm.g[ty][tx] === "~") { var k = tx + "," + ty; crumble[k] = (crumble[k] || 0) + 1; if (crumble[k] % 8 === 0) S.crumble(); if (crumble[k] > 40) rm.g[ty][tx] = " "; } });
    P.overlaps(rm, s.x, s.y, "k").forEach(function (c) { rm.g[c[1]][c[0]] = " "; keysLeft--; addScore(100); S.key(); if (!keysLeft) S.open(); });
    if (P.overlaps(rm, s.x, s.y, "*", 1).length) return die("hazard");
    if (!qaNoGuards) for (var i = 0; i < guards.length; i++) { var gd = guards[i]; if (gd.vert) { gd.y += gd.sp * gd.dir; if (gd.y > gd.y1 || gd.y < gd.y0) gd.dir *= -1; } else { gd.x += gd.sp * gd.dir; if (gd.x > gd.x1 || gd.x < gd.x0) gd.dir *= -1; } if (boxHit(s.x, s.y, gd.x, gd.y)) return die("guardian"); }
    if (!keysLeft && P.inExit(rm, s)) { done = 1; S.win(); return; }
    if (--air <= 0) return die("air");
  }
  function nextRoom() { if (ri + 1 > save.reach) save.reach = Math.min(19, ri + 1); if (score > save.hi) save.hi = score; ui.persist(); if (ri >= 19) return finish(); load(ri + 1); }
  function update(dt) { acc += dt; var n = 0; while (acc >= 1 / 60 - 1e-6 && n < 4) { acc -= 1 / 60; n++; if (mode === "play") frameStep(); } }

  // ---------- render ----------
  function render(c, tt) {
    if (!W) sizeLo(); if (!rm) load(0);
    R(0, 0, W, H, "#000000"); var p = pal(ri), fl = Math.floor(tt * 8);
    for (var ty = 0; ty < ROWS; ty++) for (var tx = 0; tx < COLS; tx++) {
      var ch = rm.g[ty][tx], x = OX + tx * T, y = OY + ty * T;
      if (ch === "W") { R(x, y, 8, 8, p.wall); R(x, y + 3, 8, 1, "#000"); R(x + (ty % 2 ? 2 : 6), y, 1, 3, "#000"); R(x + (ty % 2 ? 5 : 1), y + 4, 1, 4, "#000"); }
      else if (ch === "=") { R(x, y, 8, 3, p.floor); R(x + 1, y + 3, 2, 2, p.floor); R(x + 5, y + 3, 2, 1, p.floor); }
      else if (ch === "~") { var cr = crumble[tx + "," + ty] || 0, hh = Math.max(1, 4 - Math.floor(cr / 11)); R(x, y + (4 - hh), 8, hh, p.floor); for (var q = 0; q < 4; q++) R(x + q * 2 + (cr % 2), y + 4, 1, 1 + (q % 2), p.floor); }
      else if (ch === "<" || ch === ">") { R(x, y, 8, 4, p.conv); var o = ((ch === ">" ? fl : -fl) % 4 + 4) % 4; R(x + o, y + 1, 2, 2, "#000"); R(x + (o + 4) % 8, y + 1, 2, 2, "#000"); }
      else if (ch === "*") drawHaz(x, y, p.haz, ri % 4, fl);
      else if (ch === "k") { var kc = BR[(fl + tx) % 7]; R(x + 1, y + 1, 4, 4, kc); R(x + 2, y + 2, 2, 2, "#000"); R(x + 5, y + 2, 3, 2, kc); R(x + 6, y + 4, 1, 2, kc); }
    }
    // lift cage exit
    var ex = OX + rm.exit[0] * T, ey = OY + rm.exit[1] * T, open = !keysLeft, ec = open ? BR[fl % 7] : "#c8c8c8";
    R(ex, ey, 16, 2, ec); R(ex, ey + 14, 16, 2, ec); for (var b = 0; b < 4; b++) R(ex + b * 5, ey, 1, 16, ec); R(ex + 6, ey - 4, 4, 4, ec); R(ex + 7, ey - 8, 2, 4, "#888");
    if (open) R(ex + 2, ey + 3, 12, 10, "rgba(255,255,160,0.25)");
    guards.forEach(function (gd) { drawGuard(OX + gd.x, OY + gd.y - 16, gd.kind, gd.dir, fl, p); });
    if (!dying || Math.floor(tt * 16) % 2) drawDavy(OX + s.x, OY + s.y - 16, fl, s);
    // HUD
    var hy = OY + 129; g.font = "bold 8px monospace"; g.textAlign = "left"; var tag = "ROOM " + (ri + 1) + "  " + rm.name.toUpperCase(); var tw = g.measureText(tag).width + 8; R(OX, hy, tw, 10, p.bar); g.fillStyle = "#000"; g.fillText(tag, OX + 4, hy + 8);
    var segs = 16, lit = Math.ceil(segs * air / airMax); g.fillStyle = "#ffffff"; g.textAlign = "right"; g.fillText("AIR", OX + 256 - segs * 6 - 4, hy + 8); for (var sg = 0; sg < segs; sg++) R(OX + 256 - segs * 6 + sg * 6, hy + 1, 5, 8, sg < lit ? (lit <= 4 ? (Math.floor(tt * 6) % 2 ? "#ff3a3a" : "#000") : "#3affff") : "#222");
    hy -= 6;
    for (var l = 0; l < Math.min(8, lives - 1); l++) drawDavy(OX + l * 10, hy + 20, 0, { m: 0 }, true);
    c.drawImage(lo, 0, 0, W * PX, H * PX);
  }
  function drawHaz(x, y, c, k, fl) {
    if (k === 0) { R(x + 3, y + 3, 2, 5, "#3aff4a"); R(x + 1, y + 1, 2, 3, c); R(x + 5, y + 1, 2, 3, c); R(x + 3, y, 2, 2, c); }
    else if (k === 1) { var bb = fl % 4 < 2 ? 0 : 1; R(x + 2, y + 1 + bb, 4, 1, c); R(x + 1, y + 2 + bb, 6, 4, c); R(x + 2, y + 6 + bb, 4, 1, c); R(x + 2, y + 3 + bb, 1, 1, "#fff"); R(x + 3, y + 7, 2, 1, c); }
    else if (k === 2) { for (var i = 0; i < 4; i++) R(x + i * 2, y + (i % 2 ? 2 : 0), 1, 8 - (i % 2 ? 2 : 0), c); R(x, y + 7, 8, 1, c); }
    else { R(x + 2, y + 2, 4, 6, c); R(x + 1, y + 4, 6, 2, c); R(x + 3, y, 2, 2, "#fff"); }
  }
  function drawDavy(x, y, fl, st, small) {
    var walk = st.m === 0 && (ui.down("L") || ui.down("R")) && !small, leg = walk ? fl % 2 : 0;
    R(x + 1, y, 5, 2, "#ffcf3a"); R(x + 3, y - 1, 1, 1, "#ffcf3a"); R(x, y + 2, 7, 1, "#ffcf3a");
    R(x + 1, y + 3, 5, 7, "#bfefff"); R(x + 1, y + 3, 1, 7, "#ffffff"); R(x + 3, y + 5 + (fl % 3 === 0 ? 1 : 0), 2, 4, "#ff8a1a"); R(x + 3, y + 6, 1, 2, "#ffff4a");
    R(x, y + 10, 7, 2, "#ffcf3a"); R(x + 2, y + 6, 1, 1, "#000"); R(x + 4, y + 6, 1, 1, "#000");
    R(x + 1 + leg, y + 12, 1, 4, "#ffffff"); R(x + 5 - leg, y + 12, 1, 4, "#ffffff"); R(x + leg, y + 15, 2, 1, "#ffffff"); R(x + 5 - leg, y + 15, 2, 1, "#ffffff");
  }
  function drawGuard(x, y, k, dir, fl, p) {
    var f = fl % 2, c = BR[(k + 1) % 7 === 2 ? 6 : (k + 1) % 7];
    if (k === 0) { R(x, y + 6, 8, 5, "#ffcf3a"); R(x + 1, y + 4, 6, 2, "#ffcf3a"); for (var i = 0; i < 4; i++) R(x + 1 + i * 2, y + 3, 1, 1, "#ff8a1a"); R(x + 2, y + 8, 1, 1, "#000"); R(x + 5, y + 8, 1, 1, "#000"); R(x + 1 + f, y + 11, 1, 5, "#fff"); R(x + 6 - f, y + 11, 1, 5, "#fff"); }
    else if (k === 1) { R(x + 1, y + 5, 6, 7, "#ffffff"); R(x + 3, y + 3, 2, 2, "#ffffff"); R(dir > 0 ? x + 7 : x - 1, y + 6, 2, 2, "#ffffff"); R(x + 2, y + 7, 1, 1, "#000"); R(x + 5, y + 7, 1, 1, "#000"); R(x + 2 + f, y + 12, 1, 4, c); R(x + 5 - f, y + 12, 1, 4, c); if (f) R(x + 3, y, 1, 2, "#bfefff"); }
    else if (k === 2) { R(x + 1, y + 6 + f, 6, 5, "#c8c8e8"); R(dir > 0 ? x + 5 : x, y + 3 + f, 3, 4, "#a8a8d8"); R(dir > 0 ? x + 7 : x - 1, y + 5 + f, 2, 1, "#ffcf3a"); R(dir > 0 ? x + 6 : x + 1, y + 4 + f, 1, 1, "#000"); R(x + 3, y + 7 + f, 3, 1, "#3affff"); R(x + 2, y + 11, 1, 5, "#ff8a1a"); R(x + 5, y + 11, 1, 5, "#ff8a1a"); }
    else if (k === 3) { var hop = f * 2; R(x + 2, y + 2 - hop, 4, 10, "#3aff4a"); R(x + 2, y + 10 - hop, 6, 4, "#3aff4a"); R(x + 2, y + 2 - hop, 4, 1, "#1ac83a"); R(x + 3, y + 5 - hop, 1, 1, "#000"); R(x + 5, y + 5 - hop, 1, 1, "#000"); }
    else if (k === 4) { R(x, y + 6, 8, 6, "#ff4aff"); R(x + 2, y + 4, 4, 2, "#ff4aff"); R(x + 3, y + 3, 2, 1, "#ffff4a"); R(dir > 0 ? x + 7 : x - 1, y + 7, 2, 2, "#ff4aff"); R(x + 2, y + 8, 1, 1, "#000"); R(x + 5, y + 8, 1, 1, "#000"); R(x + 1 + f, y + 12, 1, 4, "#fff"); R(x + 6 - f, y + 12, 1, 4, "#fff"); }
    else { R(x + 1, y + 2, 2, 8, "#ffff4a"); R(x + 3, y + 4, 4, 2, "#ffff4a"); R(x + 5, y + 2 + f, 3, 6 - f * 2, "#ffff4a"); R(x + 1, y + 1, 2, 1, "#fff"); R(x + 2, y + 5, 1, 1, "#000"); R(x + 2, y + 10, 1, 6, "#ff3a3a"); R(x + 5, y + 10, 1, 6, "#ff3a3a"); }
  }

  // ---------- flow ----------
  function play(i) { mode = "play"; lives = 3; score = 0; nextLife = 10000; load(i); ui.go(); A.playSong(SONG); }
  function gameOver() { ui.stop(); mode = "over"; A.stopSong(); ui.runEnded(); var hi = score > save.hi; if (hi) save.hi = score; ui.persist();
    ui.menu({ kicker: (ri + 1) + ". " + rm.name, title: "Lamp out", body: "Davy reached room " + (ri + 1) + " of 20.", stats: '<b class="ff-score-xl">' + FF.n(score) + "</b><span>" + (hi ? "NEW HIGH SCORE" : "HIGH SCORE " + FF.n(save.hi)) + "</span>", buttons: [{ label: "Try room " + (ri + 1) + " again", act: function () { play(ri); } }, { label: "Menu", small: true, act: toTitle }] }); }
  function finish() { ui.stop(); mode = "over"; ui.runEnded(); var hi = score > save.hi; if (hi) save.hi = score; save.done = 1; ui.persist();
    ui.menu({ kicker: "Up to Daylight", title: "Out of the pit!", body: "Davy steps out into the dawn and puts his flame out for a well-earned rest.", stats: '<b class="ff-score-xl">' + FF.n(score) + "</b><span>" + (hi ? "NEW HIGH SCORE" : "HIGH SCORE " + FF.n(save.hi)) + "</span>", buttons: [{ label: "Play again", act: function () { play(0); } }, { label: "Menu", small: true, act: toTitle }] }); }
  function toTitle() { ui.stop(); mode = "title"; load(0); A.playSong(SONG);
    ui.menu({ title: "PITLAMP", body: "Twenty caverns. Every key, then the lift cage, before the air runs out.", stats: "<span>HIGH SCORE " + (save.hi ? FF.n(save.hi) : "-") + "</span><span>BEST ROOM " + (save.reach + 1) + "/20</span>",
      buttons: [{ label: "Play from room 1", act: function () { play(0); } }].concat(save.reach > 0 ? [{ label: "Practise room " + (save.reach + 1), small: true, act: function () { play(save.reach); } }] : []), app: true,
      help: ["◀ ▶ walk, Jump jumps (hold a direction to jump that way). You can jump up through floors but not through brick walls.", "Take every flashing key, then walk into the lift cage. Conveyors carry you, crumbly floors give way, and falling too far is fatal.", "Air runs down in every room; what is left becomes points. An extra lamp every 10,000."],
      fine: "An original Forest Forge game." }); }
  var game = { toTitle: toTitle, onResize: sizeLo, update: function (dt) { if (mode === "play") update(dt); }, render: render, idle: function () {}, onBack: function () { if (mode === "play") { toTitle(); return true; } return false; } };
  ui.onAdsRemoved = function () { if (mode === "title") toTitle(); };
  game.qa = { play: play, state: function () { return { mode: mode, ri: ri, x: s.x, y: s.y, m: s.m, keys: keysLeft, air: air, lives: lives, score: score, done: done, dying: dying }; }, replay: function (frames, noGuards) { qaIn = frames; qaNoGuards = !!noGuards; frame = 0; }, clear: function () { qaIn = null; qaNoGuards = false; qaRoutes = null; }, autoplay: function (rs) { qaRoutes = rs; }, lives: function (n) { lives = n; } };
  ui.start(game);
})();
