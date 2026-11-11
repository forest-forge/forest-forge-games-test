/* Well Ring (Forest Forge). Oriel Flint rides a lantern pod round the wall of a
 * very deep well, shooting at what climbs out of the dark. Waves, formations,
 * dives, a lantern-catch bonus every fourth landing, depth counter.
 * Drawn in code into a low-res buffer; sound and music generated (shell.js). */
(function () {
  "use strict";
  var clamp = FF.clamp, lerp = FF.lerp, TAU = Math.PI * 2;
  var ui = FF.create({
    id: "well-ring", title: "Well Ring", course: "The well", view: { w: 360, h: 640, flex: true },
    stats: [{ id: "score", label: "Score" }, { id: "depth", label: "Depth", value: "0 m" }, { id: "lives", label: "Pods", value: "3" }],
    pads: { left: [{ id: "L", icon: "left", aria: "Round to the left", keys: ["ArrowLeft", "KeyA"] }], right: [{ id: "F", label: "Fire", cls: "big", aria: "Fire", keys: ["Space", "ArrowUp", "KeyW"] }, { id: "R", icon: "right", aria: "Round to the right", keys: ["ArrowRight", "KeyD"] }] }
  });
  var A = ui.audio, save = ui.save;
  save.hi = save.hi || 0; save.deep = save.deep || 0; save.fire = save.fire || "auto"; save.ctl = save.ctl || "drag";

  var PX = 2, lo = document.createElement("canvas"), g = lo.getContext("2d"), W = 180, H = 320, CX = 90, CY = 160, RR = 80;
  function sizeLo() { W = Math.ceil(ui.VW / PX); H = Math.ceil(ui.VH / PX); lo.width = W; lo.height = H; CX = W / 2; CY = Math.min(H * 0.46, H / 2); RR = Math.min(W * 0.46, H * 0.36); }
  function R(x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function bmp(rows, pal) { var h = rows.length, w = rows[0].length, c = document.createElement("canvas"); c.width = w; c.height = h; var x = c.getContext("2d"); for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) { var ch = rows[j][i]; if (ch !== "." && pal[ch]) { x.fillStyle = pal[ch]; x.fillRect(i, j, 1, 1); } } return c; }
  // enemy pixel art (original)
  var ART = {
    bat: [bmp(["a.........a", "aa.......aa", "aaa.bbb.aaa", ".aaabcbaaa.", "..aabbbaa..", "...a...a..."], { a: "#7a5aa8", b: "#a88ad8", c: "#ff4a4a" }),
          bmp(["...........", "...........", "aaa.bbb.aaa", "aaaabcbaaaa", "a.aabbbaa.a", "...a...a..."], { a: "#7a5aa8", b: "#a88ad8", c: "#ff4a4a" })],
    moth: [bmp(["aa.....aa", "aaa.b.aaa", "aaabbbaaa", ".aabcbaa.", "..abbba..", "...b.b..."], { a: "#d8b060", b: "#8a6a3a", c: "#fff0a0" }),
           bmp([".a.....a.", "aaa.b.aaa", ".aabbbaa.", "..abcba..", "..abbba..", "...b.b..."], { a: "#d8b060", b: "#8a6a3a", c: "#fff0a0" })],
    imp: [bmp(["..a.a..", ".abbba.", "abcbcba", "abbbbba", ".bdddb.", ".b...b."], { a: "#3aa08a", b: "#2a7a6a", c: "#ffe060", d: "#1a4a40" }),
          bmp(["..a.a..", ".abbba.", "abcbcba", "abbbbba", ".bdddb.", "b.....b"], { a: "#3aa08a", b: "#2a7a6a", c: "#ffe060", d: "#1a4a40" })],
    wisp: [bmp(["..aaa..", ".abbba.", "abbcbba", "abbbbba", ".abbba.", "..a.a.."], { a: "#4a8ae8", b: "#9ad0ff", c: "#ffffff" }),
           bmp(["..aaa..", ".abbba.", "abbbbba", "abbcbba", ".abbba.", ".a...a."], { a: "#4a8ae8", b: "#9ad0ff", c: "#ffffff" })],
    lantern: [bmp(["..aa..", ".abba.", "abccba", "abccba", ".abba.", "..dd.."], { a: "#8a5a1a", b: "#ffb040", c: "#fff0b0", d: "#5a3a10" })]
  };
  var POD = bmp(["....aa....", "...abba...", "..abccba..", ".aabccbaa.", "aaddddddaa", "a.d.ee.d.a", "...eeee...", "....ee...."], { a: "#c98a35", b: "#ffcf7a", c: "#fff4c0", d: "#6a4a20", e: "#ff9a2a" });

  // ---------- sound ----------
  var S = {
    shot: function () { if (A.sfxOk()) A.tone({ f: 1400, f2: 500, dur: 0.07, type: "square", gain: 0.06 }); },
    pop: function () { A.noise({ dur: 0.15, gain: 0.25, freq: 1200, f2: 300, filter: "bandpass" }); A.tone({ f: 600, f2: 150, dur: 0.12, type: "square", gain: 0.08 }); },
    boom: function () { A.noise({ dur: 0.9, gain: 0.5, freq: 600, f2: 80, filter: "lowpass" }); A.tone({ f: 200, f2: 30, dur: 0.8, type: "sawtooth", gain: 0.25 }); },
    zap: function () { if (A.sfxOk()) A.tone({ f: 300, f2: 900, dur: 0.1, type: "triangle", gain: 0.05 }); },
    power: function () { [660, 880, 1100, 1320].forEach(function (f, i) { A.tone({ f: f, dur: 0.08, type: "square", gain: 0.09, delay: i * 0.05 }); }); },
    land: function () { [392, 523, 659, 784, 1047].forEach(function (f, i) { A.tone({ f: f, dur: 0.14, type: "triangle", gain: 0.16, delay: i * 0.1 }); }); },
    dive: function () { A.tone({ f: 900, f2: 300, dur: 0.4, type: "triangle", gain: 0.05 }); }
  };
  var SONG = { bpm: 138, order: [0, 0, 1, 2], parts: [[
    { wave: "square", gain: 0.05, pat: "D5 A4 F5 A4 E5 A4 G5 A4 F5 A4 D5 A4 E5 A4 C#5 A4 D5 A4 F5 A4 A5 A4 G5 A4 F5 A4 E5 A4 D5 - - ." },
    { wave: "triangle", gain: 0.2, pat: "D2 . D3 . D2 . D3 . A1 . A2 . A1 . A2 . Bb1 . Bb2 . Bb1 . Bb2 . A1 . A2 . A1 . C#3 ." },
    { wave: "drum", pat: "k . h . s . h k k . h . s . h . k . h . s . h k k . h . s s s ." }], [
    { wave: "square", gain: 0.05, pat: "Bb4 F4 D5 F4 C5 F4 Eb5 F4 D5 F4 Bb4 F4 C5 F4 A4 F4 G4 D4 Bb4 D4 A4 D4 C5 D4 Bb4 D4 G4 D4 A4 - - ." },
    { wave: "triangle", gain: 0.2, pat: "Bb1 . Bb2 . Bb1 . Bb2 . F1 . F2 . F1 . F2 . G1 . G2 . G1 . G2 . A1 . A2 . A1 . A2 ." },
    { wave: "drum", pat: "k . h . s . h k k . h . s . h . k . h . s . h k k k s . s s o ." }], [
    { wave: "square", gain: 0.05, pat: "A5 - G5 - F5 - E5 - F5 - E5 - D5 - C#5 - D5 - E5 - F5 - G5 - A5 - - - A4 - - -" },
    { wave: "triangle", gain: 0.2, pat: "D2 D3 D2 D3 C2 C3 C2 C3 Bb1 Bb2 Bb1 Bb2 A1 A2 A1 A2 D2 D3 D2 D3 E2 E3 E2 E3 A1 A2 A1 A2 A1 A2 C#2 C#3" },
    { wave: "drum", pat: "k h s h k h s h k h s h k h s s k h s h k h s h k k s k s s s o" }]] };
  var SONG_TITLE = { bpm: 84, order: [0], parts: [[
    { wave: "triangle", gain: 0.16, pat: "D5 - - - A4 - - - F5 - - E5 D5 - - - C5 - - - G4 - - - E5 - - D5 C#5 - - -" },
    { wave: "square", gain: 0.025, pat: "D3 A3 D4 A3 D3 A3 D4 A3 Bb2 F3 Bb3 F3 Bb2 F3 Bb3 F3 C3 G3 C4 G3 C3 G3 C4 G3 A2 E3 A3 E3 A2 C#3 E3 A3" }]] };

  // ---------- state ----------
  var mode = "title", score = 0, lives = 3, wave = 0, depth = 0, nextLife = 30000;
  var pa = Math.PI / 2, pav = 0, target = null, firing = false, fireT = 0, twin = 0, inv = 0, deadT = 0, flare = 0;
  var shots = [], foes = [], pel = [], fx = [], items = [], rings = [], spawnQ = [], waveT = 0, landT = 0, bonus = false, banner = "", bannerT = 0, diveT = 0, formRot = 0, caught = 0;
  for (var i0 = 0; i0 < 14; i0++) rings.push({ r: Math.pow(i0 / 14, 2) });
  function polar(a, r) { var rr = r * RR; return { x: CX + Math.cos(a) * rr, y: CY + Math.sin(a) * rr }; }
  function scaleAt(r) { return 0.35 + 1.3 * Math.min(r, 1.1); }
  function hud() { ui.setStat("score", FF.n(score)); ui.setStat("depth", depth + " m"); ui.setStat("lives", lives); }
  function addScore(n) { score += n; if (score >= nextLife) { nextLife += 40000; lives++; S.power(); banner = "Extra pod"; bannerT = 1.2; } hud(); }

  // ---------- waves ----------
  var KINDS = ["bat", "moth", "imp", "wisp"];
  function startWave() {
    wave++; foes = []; pel = []; spawnQ = []; waveT = 0; formRot = 0; caught = 0;
    bonus = wave % 4 === 0;
    var k = KINDS[(wave - 1) % 4], k2 = KINDS[wave % 4], n = 0;
    if (bonus) {
      for (var b = 0; b < 24; b++) spawnQ.push({ t: 0.6 + b * 0.28, kind: "lantern", path: b % 2 ? 1 : -1, slot: b, lantern: true });
      banner = "Landing " + depth + " m: catch the lanterns"; bannerT = 2.2;
      return;
    }
    var groups = Math.min(5, 3 + Math.floor(wave / 5)), per = 8;
    for (var gI = 0; gI < groups; gI++) {
      var pathKind = gI % 3;
      for (var j = 0; j < per; j++) spawnQ.push({ t: 0.8 + gI * 2.6 + j * 0.16, kind: gI % 2 ? k2 : k, path: pathKind, dir: gI % 2 ? -1 : 1, slot: n++ });
    }
    banner = "Depth " + depth + " m"; bannerT = 1.6;
  }
  function slotPos(slot, total) {
    var ring = slot % 2, idx = Math.floor(slot / 2), cnt = Math.ceil(total / 2);
    return { a: formRot + idx / cnt * TAU + ring * (Math.PI / cnt), r: ring ? 0.3 : 0.48 };
  }
  function spawn(q) {
    var f = { kind: q.kind, slot: q.slot, t: 0, st: "enter", path: q.path, dir: q.dir || 1, a0: Math.random() * TAU, a: 0, r: 0.02, hp: q.kind === "imp" ? 2 : 1, lantern: !!q.lantern, fireT: 1 + Math.random() * 3 };
    if (f.lantern) { f.a0 = (q.slot * 0.7) % TAU; }
    foes.push(f);
  }
  function stepFoe(f, dt, total) {
    f.t += dt;
    if (f.lantern) {
      // spiral out slowly to the player's ring and away
      f.a = f.a0 + f.path * f.t * 1.4; f.r = Math.min(1.3, 0.02 + f.t * 0.24);
      if (f.r >= 1.25) f.gone = true;
      return;
    }
    var sp = slotPos(f.slot, total);
    if (f.st === "enter") {
      var u = Math.min(1, f.t / 2.2);
      if (f.path === 0) { f.a = f.a0 + f.dir * u * TAU * 1.1; f.r = 0.02 + Math.sin(u * Math.PI) * 0.75 + u * 0.1; }
      else if (f.path === 1) { f.a = f.a0 + f.dir * u * 3; f.r = 0.02 + u * 0.85 * (1 - u * 0.4); }
      else { f.a = f.a0 + Math.sin(u * 6) * 0.6 * f.dir; f.r = 0.02 + Math.sin(u * Math.PI * 0.5) * 0.92 - u * u * 0.3; }
      if (u >= 1) { f.st = "join"; f.t = 0; f.fa = f.a; f.fr = f.r; }
    } else if (f.st === "join") {
      var v = Math.min(1, f.t / 0.9), da = ((sp.a - f.fa) % TAU + TAU * 1.5) % TAU - Math.PI;
      f.a = f.fa + da * v; f.r = lerp(f.fr, sp.r, v); if (v >= 1) { f.st = "form"; f.t = 0; }
    } else if (f.st === "form") {
      f.a = sp.a; f.r = sp.r + Math.sin(ui.time * 2 + f.slot) * 0.02;
    } else if (f.st === "dive") {
      var w = f.t / 2.4;
      f.a = f.da + Math.sin(w * Math.PI) * 1.2 * f.dir + (f.ta - f.da) * Math.min(1, w * 1.5);
      f.r = sp.r + Math.sin(Math.min(1, w) * Math.PI) * (1.02 - sp.r);
      f.fireT -= dt;
      if (f.r > 0.55 && f.fireT <= 0) { f.fireT = 0.7; fireAt(f); }
      if (w >= 1) { f.st = "form"; f.t = 0; }
    }
    if (f.st !== "dive" && f.st !== "enter" && f.r < 0.6) { f.fireT -= dt * (0.3 + wave * 0.03); if (f.fireT <= 0) { f.fireT = 2 + Math.random() * 4; if (Math.random() < (wave < 3 ? 0.15 : 0.3 + wave * 0.02)) fireAt(f); } }
  }
  function fireAt(f) { pel.push({ a: f.a + (Math.random() - 0.5) * 0.2, r: f.r, v: 0.32 + wave * 0.012 }); S.zap(); }

  // ---------- update ----------
  function update(dt) {
    // descending wall rings
    var ringSp = landT > 0 ? 1.4 : 0.18;
    rings.forEach(function (r) { r.r += dt * ringSp * (0.12 + r.r * 0.9); if (r.r > 1.6) r.r -= 1.6; });
    bannerT -= dt;
    if (deadT > 0) { deadT -= dt; if (deadT <= 0) { if (lives <= 0) return over(); inv = 2.2; pel = []; } }
    if (inv > 0) inv -= dt;
    // movement
    var alive = deadT <= 0;
    if (alive) {
      var keyDir = (ui.down("L") ? -1 : 0) + (ui.down("R") ? 1 : 0);
      if (keyDir) { pav = keyDir * 4.2; pa += pav * dt; target = null; }
      else if (target != null) { var d = ((target - pa) % TAU + TAU * 1.5) % TAU - Math.PI; var stp = clamp(d, -7 * dt, 7 * dt); pa += stp; }
      pa = (pa % TAU + TAU) % TAU;
      // fire
      fireT -= dt;
      var wantFire = save.fire === "auto" ? true : (firing || ui.down("F"));
      if (ui.down("F")) wantFire = true;
      if (wantFire && fireT <= 0 && shots.length < (twin ? 8 : 5)) {
        fireT = 0.16;
        if (twin) { shots.push({ a: pa - 0.05, r: 0.94 }); shots.push({ a: pa + 0.05, r: 0.94 }); } else shots.push({ a: pa, r: 0.94 });
        S.shot();
      }
    }
    if (twin > 0) twin -= dt;
    shots.forEach(function (s) { s.r -= dt * (0.9 + s.r * 1.2); if (s.r < 0.05) s.dead = true; });
    // spawning
    waveT += dt;
    if (landT > 0) { landT -= dt; if (landT <= 0) startWave(); }
    else {
      while (spawnQ.length && spawnQ[0].t <= waveT) spawn(spawnQ.shift());
      var total = foes.filter(function (f) { return !f.lantern; }).length + spawnQ.length;
      if (!bonus) {
        diveT -= dt;
        var formed = foes.filter(function (f) { return f.st === "form"; });
        if (diveT <= 0 && formed.length && alive) {
          diveT = Math.max(0.7, 2.6 - wave * 0.12);
          var n = Math.min(formed.length, 1 + Math.floor(wave / 4));
          for (var k = 0; k < n; k++) { var f = formed[Math.floor(Math.random() * formed.length)]; if (f.st !== "form") continue; f.st = "dive"; f.t = 0; f.da = f.a; f.ta = pa + (Math.random() - 0.5); f.dir = Math.random() < 0.5 ? -1 : 1; f.fireT = 0.2; S.dive(); }
        }
        formRot += dt * 0.18;
      }
      foes.forEach(function (f) { stepFoe(f, dt, Math.max(total, 8)); });
      // hits
      shots.forEach(function (s) {
        if (s.dead) return;
        var sp = polar(s.a, s.r);
        for (var i = 0; i < foes.length; i++) {
          var f = foes[i]; if (f.dead || f.gone) continue;
          var fp = polar(f.a, f.r), rad = 5 * scaleAt(f.r) + 1.5;
          if (Math.abs(fp.x - sp.x) < rad && Math.abs(fp.y - sp.y) < rad) {
            s.dead = true; f.hp--;
            if (f.hp <= 0) {
              f.dead = true; S.pop(); boomFx(fp.x, fp.y, f.lantern ? "#ffd060" : "#ffb070", 10);
              if (f.lantern) { caught++; addScore(300); }
              else { addScore(f.st === "dive" ? 300 : f.st === "form" ? 100 : 150); if (Math.random() < 0.05) items.push({ a: f.a, r: f.r, kind: Math.random() < 0.6 ? "twin" : "flare" }); }
            } else { A.tone({ f: 800, dur: 0.04, type: "square", gain: 0.06 }); }
            break;
          }
        }
      });
      foes = foes.filter(function (f) { return !f.dead && !f.gone; });
      shots = shots.filter(function (s) { return !s.dead; });
      // enemy pellets and dives against the pod
      pel.forEach(function (p) { p.r += dt * p.v * (0.5 + p.r); if (p.r > 1.15) p.dead = true; });
      if (alive && inv <= 0) {
        var me = polar(pa, 1);
        pel.forEach(function (p) { if (p.dead) return; var q = polar(p.a, p.r); if (Math.abs(q.x - me.x) < 4.5 && Math.abs(q.y - me.y) < 4.5) { p.dead = true; die(); } });
        foes.forEach(function (f) { if (f.lantern) return; var q = polar(f.a, f.r); if (f.r > 0.85 && Math.abs(q.x - me.x) < 6 && Math.abs(q.y - me.y) < 6) { f.dead = true; boomFx(q.x, q.y, "#ffb070", 8); die(); } });
      }
      pel = pel.filter(function (p) { return !p.dead; });
      // items drift outward to the ring
      items.forEach(function (it) { it.r += dt * 0.35; if (it.r > 1.1) it.dead = true; if (alive && it.r > 0.9 && it.r < 1.05) { var d = Math.abs(((it.a - pa) % TAU + TAU * 1.5) % TAU - Math.PI); if (d < 0.25) { it.dead = true; S.power(); if (it.kind === "twin") { twin = 14; banner = "Twin lamps"; } else { flareAll(); banner = "Flare!"; } bannerT = 1.2; } } });
      items = items.filter(function (it) { return !it.dead; });
      // wave end
      if (!spawnQ.length && !foes.length && landT <= 0 && waveT > 1.5) {
        if (bonus) { var b = caught === 24 ? 10000 : caught * 100; addScore(b); banner = caught + "/24 lanterns" + (caught === 24 ? ": perfect 10,000" : ""); bannerT = 2.4; }
        depth += 30; save.deep = Math.max(save.deep, depth); ui.persist(); hud(); landT = 2.6; S.land();
        if (!bonus) { banner = "Down to " + depth + " m"; bannerT = 2; }
      }
    }
    fx.forEach(function (p) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; });
    fx = fx.filter(function (p) { return p.life > 0; });
    if (flare > 0) flare -= dt;
  }
  function flareAll() { flare = 0.4; foes.forEach(function (f) { if (!f.lantern) { var q = polar(f.a, f.r); boomFx(q.x, q.y, "#fff0b0", 6); f.dead = true; addScore(100); } }); pel = []; S.boom(); }
  function boomFx(x, y, c, n) { for (var i = 0; i < n; i++) { var a = Math.random() * TAU, s = 20 + Math.random() * 50; fx.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.3 + Math.random() * 0.4, c: c }); } }
  function die() { if (deadT > 0) return; lives--; hud(); var me = polar(pa, 1); boomFx(me.x, me.y, "#ffcf7a", 30); S.boom(); deadT = 1.6; twin = 0; }
  function over() {
    ui.stop(); mode = "over"; A.stopSong(); ui.runEnded();
    var hi = score > save.hi; if (hi) save.hi = score; ui.persist();
    ui.menu({ title: "Lamp's out", body: "Oriel made it down to " + depth + " m.", stats: '<b class="ff-score-xl">' + FF.n(score) + "</b><span>" + (hi ? "NEW HIGH SCORE" : "HIGH SCORE " + FF.n(save.hi)) + "</span><span>DEEPEST " + save.deep + " m</span>",
      buttons: [{ label: "Go down again", act: newGame }, { label: "Menu", act: toTitle }] });
  }

  // ---------- render ----------
  function render(c, t) {
    if (!W) sizeLo();
    R(0, 0, W, H, "#050403");
    // the well: brick rings falling away towards the glow
    var gr = g.createRadialGradient(CX, CY, 0, CX, CY, RR * 0.35); gr.addColorStop(0, "#ffb040"); gr.addColorStop(0.25, "#5a2a08"); gr.addColorStop(1, "rgba(5,4,3,0)");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (var i = 0; i < rings.length; i++) {
      var r = rings[i].r; if (r < 0.04) continue;
      var rad = r * RR * 1.0, k = clamp(r, 0, 1) * (r > 1 ? clamp(1.6 - r, 0, 0.6) / 0.6 : 1);
      g.strokeStyle = "rgba(" + Math.round(120 + 80 * k) + "," + Math.round(70 + 40 * k) + "," + Math.round(30 + 10 * k) + "," + (0.15 + 0.5 * k) + ")";
      g.lineWidth = Math.max(1, r * 3); g.beginPath(); g.arc(CX, CY, rad, 0, TAU); g.stroke();
      // brick joints
      var n = 12, off = i * 0.37;
      for (var j = 0; j < n; j++) { var a = off + j / n * TAU, p1 = { x: CX + Math.cos(a) * rad, y: CY + Math.sin(a) * rad }; R(p1.x, p1.y, Math.max(1, r * 2), Math.max(1, r * 2), "rgba(40,24,10,0.8)"); }
    }
    // player ring track
    g.strokeStyle = "rgba(201,138,53,0.35)"; g.lineWidth = 1; g.beginPath(); g.arc(CX, CY, RR, 0, TAU); g.stroke();
    // foes
    var fr = Math.floor(t * 6) % 2;
    foes.forEach(function (f) {
      var p = polar(f.a, f.r), s = scaleAt(f.r) * (f.kind === "imp" ? 1.2 : 1), art = ART[f.kind][f.lantern ? 0 : fr];
      var w = art.width * s, h = art.height * s;
      g.drawImage(art, Math.round(p.x - w / 2), Math.round(p.y - h / 2), Math.round(w), Math.round(h));
      if (f.lantern) { g.globalAlpha = 0.25; g.fillStyle = "#ffb040"; g.beginPath(); g.arc(p.x, p.y, 5 * s, 0, TAU); g.fill(); g.globalAlpha = 1; }
    });
    // items
    items.forEach(function (it) { var p = polar(it.a, it.r), s = scaleAt(it.r); R(p.x - 3 * s, p.y - 3 * s, 6 * s, 6 * s, it.kind === "twin" ? "#4ae0a0" : "#ff6a3a"); R(p.x - 1.5 * s, p.y - 1.5 * s, 3 * s, 3 * s, "#fff"); });
    // shots
    shots.forEach(function (s) { var p = polar(s.a, s.r), sz = Math.max(1, 2.5 * scaleAt(s.r)); R(p.x - sz / 2, p.y - sz / 2, sz, sz, "#fff4c0"); var q = polar(s.a, s.r + 0.04); R(q.x - sz / 3, q.y - sz / 3, sz * 0.66, sz * 0.66, "#ff9a2a"); });
    // pellets
    pel.forEach(function (p) { var q = polar(p.a, p.r), sz = Math.max(1, 2.5 * scaleAt(p.r)); R(q.x - sz / 2, q.y - sz / 2, sz, sz, Math.floor(t * 20) % 2 ? "#ff4a6a" : "#ffe0e0"); });
    // pod
    if (deadT <= 0 && (inv <= 0 || Math.floor(t * 12) % 2) && mode !== "title") {
      var me = polar(pa, 1);
      g.save(); g.translate(Math.round(me.x), Math.round(me.y)); g.rotate(pa + Math.PI / 2);
      g.drawImage(POD, -8, -6, 16, 13); if (twin > 0) { R(-9, -2, 2, 4, "#4ae0a0"); R(7, -2, 2, 4, "#4ae0a0"); }
      g.restore();
      // lamp beam into the well
      g.globalAlpha = 0.07; g.fillStyle = "#ffe0a0"; g.beginPath(); g.moveTo(me.x, me.y); var b1 = polar(pa - 0.12, 0.35), b2 = polar(pa + 0.12, 0.35); g.lineTo(b1.x, b1.y); g.lineTo(b2.x, b2.y); g.fill(); g.globalAlpha = 1;
    }
    if (mode === "title") { var tp = polar(t * 0.8, 1); g.save(); g.translate(tp.x, tp.y); g.rotate(t * 0.8 + Math.PI / 2); g.drawImage(POD, -8, -6, 16, 13); g.restore(); }
    fx.forEach(function (p) { R(p.x, p.y, 1.5, 1.5, p.c); });
    if (flare > 0) { g.globalAlpha = flare * 2; R(0, 0, W, H, "#fff8e0"); g.globalAlpha = 1; }
    c.drawImage(lo, 0, 0, W * PX, H * PX);
    if (mode === "play" && !ui.menuOpen) {
      if (bannerT > 0) ui.text(banner, ui.VW / 2, CY * PX - RR * PX - 18 > 20 ? CY * PX - RR * PX - 14 : 30, 17, "#ffe3a0", "center", "#ff9a2a");
      if (twin > 0) ui.text("TWIN " + Math.ceil(twin), 10, 18, 11, "#4ae0a0");
      ui.text("WAVE " + wave, ui.VW - 10, 18, 11, "#c98a35", "right");
    }
  }

  // ---------- input ----------
  var pid = null;
  function aim(x, y) { var lx = x / PX - CX, ly = y / PX - CY; if (lx * lx + ly * ly > 64) target = Math.atan2(ly, lx); }
  var game = {
    toTitle: toTitle, onResize: sizeLo, update: update, render: render,
    idle: function (dt) { rings.forEach(function (r) { r.r += dt * 0.25 * (0.12 + r.r * 0.9); if (r.r > 1.6) r.r -= 1.6; }); },
    onBack: function () { if (mode === "title") return "exit"; toTitle(); return "menu"; },
    onPointer: function (type, x, y, id) {
      if (!ui.playing) return;
      if (type === "pointerdown") { pid = id; firing = true; if (save.ctl === "drag") aim(x, y); }
      else if (type === "pointermove" && id === pid && save.ctl === "drag") aim(x, y);
      else if (type === "pointerup" && id === pid) { pid = null; firing = false; }
    }
  };
  function newGame() {
    mode = "play"; score = 0; lives = 3; wave = 0; depth = 0; nextLife = 30000; pa = Math.PI / 2; target = null; shots = []; foes = []; pel = []; items = []; fx = []; twin = 0; inv = 1.5; deadT = 0; landT = 0;
    hud(); startWave(); ui.setCourse("The well"); ui.padsOnly(save.ctl === "pads" ? null : save.fire === "hold" ? ["F"] : []);
    A.playSong(SONG); ui.go();
  }
  function toTitle() {
    ui.stop(); mode = "title"; foes = []; pel = []; shots = []; items = []; A.playSong(SONG_TITLE); ui.padsOnly(null); ui.setCourse("The well");
    ui.menu({ title: "WELL RING", body: "Oriel Flint goes down the old well with a lamp and a lot of nerve.",
      stats: "<span>HIGH SCORE " + (save.hi ? FF.n(save.hi) : "-") + "</span><span>DEEPEST " + save.deep + " m</span>",
      buttons: [{ label: "Go down", act: newGame },
        { label: "Moving: " + (save.ctl === "drag" ? "touch the ring" : "pads"), small: true, act: function () { save.ctl = save.ctl === "drag" ? "pads" : "drag"; ui.persist(); toTitle(); } },
        { label: "Firing: " + (save.fire === "auto" ? "automatic" : "hold to fire"), small: true, act: function () { save.fire = save.fire === "auto" ? "hold" : "auto"; ui.persist(); toTitle(); } }], app: true,
      help: ["Touch or drag anywhere: the pod runs round the ring to that side.", "Shots fly down into the well. Divers come right up to the ring, so keep moving.", "Every fourth landing: catch all 24 lanterns for 10,000. Green = twin lamps, red = flare."],
      fine: "A Forest Forge game" });
  }
  ui.onAdsRemoved = function () { if (mode === "title") toTitle(); };
  game.qa = { start: newGame, state: function () { return { mode: mode, wave: wave, depth: depth, lives: lives, score: score, foes: foes.length, pa: pa, deadT: deadT }; }, foes: function () { return foes; }, aimAt: function (a) { target = a; }, god: function () { inv = 1e9; } };
  ui.start(game);
})();
