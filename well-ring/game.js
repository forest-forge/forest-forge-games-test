/* Well Ring (Forest Forge). Oriel Flint rides a lantern pod round the wall of a
 * very deep well, shooting at what climbs out of the dark. Waves, formations,
 * dives, a lantern-catch bonus every fourth landing, depth counter.
 * Drawn in code into a low-res buffer; sound and music generated (shell.js). */
(function () {
  "use strict";
  (function applyChrome(css) {
    var s = document.createElement("style"); s.id = "ff-palette"; s.textContent = css;
    document.head.appendChild(s);
    var m = document.querySelector('meta[name="theme-color"]');
    var bg = /--bg:([^;}]+)/.exec(css); if (m && bg) m.setAttribute("content", bg[1].trim());
  })(`:root{--bg:#030614;--water:#05081c;--amber:#d8f0ff;--amber-hi:#a8f0ff;--amber-soft:#e8e0ff;--amber-line:#3ad0f0;--ember:#d45cff;--btn:#10183a;--lamp:#f0f8ff;--glow-line:rgba(80,220,255,.4);--glow-fill:rgba(80,220,255,.1)}.ff-host{background:radial-gradient(ellipse at 50% 40%, #142060 0%, transparent 60%), var(--bg)}.ff-hud{background:linear-gradient(#10183a,#050814);border-bottom-color:rgba(58,208,240,.35)}.ff{border-left-color:rgba(58,208,240,.28);border-right-color:rgba(58,208,240,.28)}.ff-icon-btn:active{background:#1a2870;box-shadow:0 0 16px rgba(80,220,255,.5)}.ff-course,.ff-stat b{text-shadow:0 0 12px rgba(80,220,255,.55)}.ff-shade{background:linear-gradient(180deg,rgba(0,0,0,.2),rgba(0,0,0,.52))!important}.ff-modal{text-shadow:0 2px 10px rgba(0,0,0,.7);animation:ffIn .35s ease}.ff-display{letter-spacing:.18em;filter:drop-shadow(0 0 16px var(--ember))}.ff-lede,.ff-stat-line,.ff-fine{text-shadow:0 1px 6px rgba(0,0,0,.7)}.ff-btns{background:rgba(0,0,0,.42);border:1px solid var(--glow-line);border-radius:16px;padding:14px 16px 16px;box-shadow:0 14px 40px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.1);backdrop-filter:blur(7px)}.ff-btn{box-shadow:0 4px 0 rgba(0,0,0,.35),0 0 18px var(--glow-fill);letter-spacing:.06em}.ff-btn:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,.35)}.ff-hud{box-shadow:0 10px 24px rgba(0,0,0,.28)}.ff-toast{backdrop-filter:blur(6px)}@keyframes ffIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`);
  var clamp = FF.clamp, lerp = FF.lerp, TAU = Math.PI * 2;
  var ui = FF.create({
    id: "well-ring", title: "Well Ring", course: "The well", view: { w: 360, h: 640, flex: true },
    stats: [{ id: "score", label: "Score" }, { id: "depth", label: "Depth", value: "0 m" }, { id: "lives", label: "Pods", value: "3" }],
    pads: { left: [{ id: "L", icon: "left", aria: "Round to the left", keys: ["ArrowLeft", "KeyA"] }], right: [{ id: "F", label: "Fire", cls: "big", aria: "Fire", keys: ["Space", "ArrowUp", "KeyW"] }, { id: "R", icon: "right", aria: "Round to the right", keys: ["ArrowRight", "KeyD"] }] }
  });
  var A = ui.audio, save = ui.save;
  save.hi = save.hi || 0; save.deep = save.deep || 0; save.fire = save.fire || "auto"; save.ctl = save.ctl || "drag"; if (save.lines == null) save.lines = true;

  var PX = 2, lo = document.createElement("canvas"), g = lo.getContext("2d"), W = 180, H = 320, CX = 90, CY = 160, RR = 80, Q = 1;
  function sizeLo() { W = Math.ceil(ui.VW / PX); H = Math.ceil(ui.VH / PX); Q = FF.hdq ? FF.hdq(ui, PX) : 1; lo.width = Math.round(W * Q); lo.height = Math.round(H * Q); g.setTransform(Q, 0, 0, Q, 0, 0); g.imageSmoothingEnabled = false; CX = W / 2; CY = Math.min(H * 0.46, H / 2); RR = Math.min(W * 0.46, H * 0.36); }
  function R(x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function bmp(rows, pal) { var h = rows.length, w = rows[0].length, c = document.createElement("canvas"); c.width = w; c.height = h; var x = c.getContext("2d"); for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) { var ch = rows[j][i]; if (ch !== "." && pal[ch]) { x.fillStyle = pal[ch]; x.fillRect(i, j, 1, 1); } } return c; }
  // enemy pixel art (original)
  var ART = {
    bat: [bmp(["a.........a", "aa.......aa", "aaa.bbb.aaa", ".aaabcbaaa.", "..aabbbaa..", "...a...a..."], { a: "#6a40e0", b: "#c89aff", c: "#ff5ac8" }),
          bmp(["...........", "...........", "aaa.bbb.aaa", "aaaabcbaaaa", "a.aabbbaa.a", "...a...a..."], { a: "#6a40e0", b: "#c89aff", c: "#ff5ac8" })],
    moth: [bmp(["aa.....aa", "aaa.b.aaa", "aaabbbaaa", ".aabcbaa.", "..abbba..", "...b.b..."], { a: "#f0d050", b: "#7a50d0", c: "#fff8c8" }),
           bmp([".a.....a.", "aaa.b.aaa", ".aabbbaa.", "..abcba..", "..abbba..", "...b.b..."], { a: "#f0d050", b: "#7a50d0", c: "#fff8c8" })],
    imp: [bmp(["..a.a..", ".abbba.", "abcbcba", "abbbbba", ".bdddb.", ".b...b."], { a: "#2ad0a0", b: "#18a878", c: "#e8ff6a", d: "#0a4840" }),
          bmp(["..a.a..", ".abbba.", "abcbcba", "abbbbba", ".bdddb.", "b.....b"], { a: "#2ad0a0", b: "#18a878", c: "#e8ff6a", d: "#0a4840" })],
    wisp: [bmp(["..aaa..", ".abbba.", "abbcbba", "abbbbba", ".abbba.", "..a.a.."], { a: "#3ad0ff", b: "#b0f0ff", c: "#ffffff" }),
           bmp(["..aaa..", ".abbba.", "abbbbba", "abbcbba", ".abbba.", ".a...a."], { a: "#3ad0ff", b: "#b0f0ff", c: "#ffffff" })],
    lantern: [bmp(["..aa..", ".abba.", "abccba", "abccba", ".abba.", "..dd.."], { a: "#8a5a1a", b: "#ffb040", c: "#fff0b0", d: "#5a3a10" })]
  };
  var POD = bmp([
    "......aa......",
    ".....abba.....",
    "....abccba....",
    "...aabccbaa...",
    "..aaabccbaaa..",
    ".aaaddddddaaa.",
    "aa.d.eeee.d.aa",
    "a...eeeeee...a",
    "....eeeeee....",
    ".....eeee.....",
    "......ee......"
  ], { a: "#2a6ab8", b: "#8ae8ff", c: "#f0ffff", d: "#1a3060", e: "#d45cff" });

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
  // ---------- warp: on a cleared wave the pod dives down the middle of the well ----------
  // Runs inside the existing 2.6 s landing gap (wave timing and the bonus-wave cycle are unchanged):
  // 0.35-1.95 s dive (pod shrinks to the centre, well zooms in, streaks rush past), flash at 1.95 s, then the new depth eases in.
  var LAND = 2.6, WARP_DIVE0 = 0.35, WARP_FLASH = 1.95;
  function warpK() {
    if (landT <= 0 || mode !== "play") return { on: false, e: 0, dive: 0, de: 0, z: 1, flash: 0, arrive: -1, streak: 0 };
    var e = LAND - landT, dive = clamp((e - WARP_DIVE0) / (WARP_FLASH - WARP_DIVE0), 0, 1), de = dive * dive * dive, z = 1 + 1.9 * de, arrive = -1;
    if (e >= WARP_FLASH) { arrive = clamp((e - WARP_FLASH) / (LAND - WARP_FLASH), 0, 1); var ea = 1 - Math.pow(1 - arrive, 3); z = 0.55 + 0.45 * ea; de = 0; }
    var flash = Math.max(0, 1 - Math.abs(e - WARP_FLASH) / 0.2);
    var streak = arrive >= 0 ? Math.max(0, 1 - arrive * 1.6) : clamp(dive * 1.4, 0, 1);
    return { on: true, e: e, dive: dive, de: de, z: z, flash: flash, arrive: arrive, streak: streak };
  }
  function hash1(n) { n = (Math.imul(n, 374761393) + 668265263) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }
  var STREAK_COLS = ["#bff8ff", "#ffffff", "#ff8ae8", "#8ae8ff", "#ffe08a", "#9aff9a"];
  function drawWarpStreaks(k, t) {
    if (k.streak <= 0) return;
    var n = 90, maxR = Math.hypot(W, H) * 0.6;
    g.save(); g.lineCap = "round"; g.globalCompositeOperation = "lighter";
    for (var i = 0; i < n; i++) {
      var a = hash1(i) * TAU, sp = 0.6 + hash1(i + 999) * 0.9, ph = (hash1(i + 77) + k.e * sp * (0.6 + 2.6 * k.streak)) % 1;
      var r0 = ph * ph * maxR, len = (8 + 70 * k.streak) * (0.3 + ph);
      var x0 = CX + Math.cos(a) * r0, y0 = CY + Math.sin(a) * r0, x1 = CX + Math.cos(a) * (r0 + len), y1 = CY + Math.sin(a) * (r0 + len);
      g.globalAlpha = k.streak * (0.25 + 0.75 * ph); g.strokeStyle = STREAK_COLS[i % STREAK_COLS.length]; g.lineWidth = 0.6 + ph * 1.8;
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    }
    g.restore(); g.globalAlpha = 1;
  }
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
    var wk = warpK(), ringSp = landT > 0 ? 1.4 + 5 * wk.de : 0.18;
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
      if (landT > 0) wantFire = false;
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
        depth += 30; save.deep = Math.max(save.deep, depth); ui.persist(); hud(); landT = LAND; pel = []; S.land();
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
    R(0, 0, W, H, "#030614");
    // stars around the shaft
    for (var s = 0; s < 40; s++) {
      g.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(t * 2 + s));
      R((s * 47 + 11) % W, (s * 31 + 5) % H, s % 6 ? 1 : 2, 1, s % 4 ? "#8aa0d0" : "#e8f0ff");
    }
    g.globalAlpha = 1;
    var wk = warpK();
    g.save(); if (wk.z !== 1) { g.translate(CX, CY); g.scale(wk.z, wk.z); g.translate(-CX, -CY); }
    // depth glow + caustic pulse (grows as the pod dives)
    var pulse = 0.85 + 0.15 * Math.sin(t * 2.2);
    var gr = g.createRadialGradient(CX, CY, 0, CX, CY, RR * 0.5 * (1 + 1.5 * wk.de));
    gr.addColorStop(0, "rgba(160,255,255," + (0.95 * pulse) + ")"); gr.addColorStop(0.18, "rgba(40,80,200,0.85)"); gr.addColorStop(0.55, "rgba(20,20,80,0.4)"); gr.addColorStop(1, "rgba(3,6,20,0)");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (var i = 0; i < rings.length; i++) {
      var r = rings[i].r; if (r < 0.04) continue;
      var rad = r * RR * 1.0, k = clamp(r, 0, 1) * (r > 1 ? clamp(1.6 - r, 0, 0.6) / 0.6 : 1);
      var hue = i % 4; var rr = hue === 0 ? 80 + 80 * k : hue === 1 ? 180 + 50 * k : hue === 2 ? 40 + 40 * k : 220 + 20 * k, gg = hue === 0 ? 200 + 40 * k : hue === 1 ? 80 + 40 * k : hue === 2 ? 220 + 20 * k : 80 + 40 * k, bb = hue === 0 ? 255 : hue === 1 ? 255 : hue === 2 ? 140 : 200;
      g.strokeStyle = "rgba(" + Math.round(rr) + "," + Math.round(gg) + "," + Math.round(bb) + "," + (0.22 + 0.6 * k) + ")";
      g.lineWidth = Math.max(1.5, r * 3.4); g.beginPath(); g.arc(CX, CY, rad, 0, TAU); g.stroke();
      var n = 14, off = i * 0.37 + t * 0.05;
      if (save.lines) for (var j = 0; j < n; j++) { var a = off + j / n * TAU, p1 = { x: CX + Math.cos(a) * rad, y: CY + Math.sin(a) * rad }; R(p1.x, p1.y, Math.max(1, r * 2), Math.max(1, r * 2), "rgba(180,240,255,0.75)"); }
    }
    // mossy brick rim around the well
    g.save();
    g.beginPath(); g.rect(-W, -H, W * 3, H * 3); g.arc(CX, CY, RR + 1, 0, TAU, true); g.clip("evenodd");
    g.fillStyle = "#12182c"; g.fillRect(-W, -H, W * 3, H * 3);
    for (var br = 0; br < 28; br++) {
      var ba = br / 28 * TAU, bx = CX + Math.cos(ba) * (RR + 8), by = CY + Math.sin(ba) * (RR + 8);
      g.fillStyle = br % 3 ? "#2a3458" : "#1a2440";
      g.fillRect(bx - 6, by - 5, 12, 10);
      g.fillStyle = "rgba(80,200,120,0.18)"; g.fillRect(bx - 3, by - 6, 5, 3);
    }
    g.restore();
    // lanterns on the rim
    for (var ln = 0; ln < 6; ln++) {
      var la = ln / 6 * TAU + t * 0.02, lp = polar(la, 1.08);
      g.fillStyle = "rgba(255,220,120,0.18)"; g.beginPath(); g.arc(lp.x, lp.y, 8, 0, TAU); g.fill();
      R(lp.x - 1, lp.y - 3, 2, 5, "#2a2a30"); R(lp.x - 2, lp.y - 5, 4, 3, "#ffe08a");
    }
    // player ring track
    g.strokeStyle = "rgba(80,220,255,0.7)"; g.lineWidth = 2; g.beginPath(); g.arc(CX, CY, RR, 0, TAU); g.stroke();
    g.strokeStyle = "rgba(200,255,255,0.25)"; g.lineWidth = 1; g.beginPath(); g.arc(CX, CY, RR + 3, 0, TAU); g.stroke();
    // foes
    var fr = Math.floor(t * 6) % 2;
    foes.forEach(function (f) {
      var p = polar(f.a, f.r), s = scaleAt(f.r) * (f.kind === "imp" ? 1.2 : 1), art = ART[f.kind][f.lantern ? 0 : fr];
      var w = art.width * s, h = art.height * s;
      g.globalAlpha = 0.22; g.fillStyle = "#a8f0ff"; g.beginPath(); g.arc(p.x, p.y, Math.max(3, w * 0.55), 0, TAU); g.fill(); g.globalAlpha = 1;
      g.drawImage(art, Math.round(p.x - w / 2), Math.round(p.y - h / 2), Math.round(w), Math.round(h));
      if (f.lantern) { g.globalAlpha = 0.35; g.fillStyle = "#ffb040"; g.beginPath(); g.arc(p.x, p.y, 6 * s, 0, TAU); g.fill(); g.globalAlpha = 1; }
    });
    // items
    items.forEach(function (it) { var p = polar(it.a, it.r), s = scaleAt(it.r); R(p.x - 3 * s, p.y - 3 * s, 6 * s, 6 * s, it.kind === "twin" ? "#4ae0a0" : "#ff6a3a"); R(p.x - 1.5 * s, p.y - 1.5 * s, 3 * s, 3 * s, "#fff"); });
    // shots
    shots.forEach(function (s) { var p = polar(s.a, s.r), sz = Math.max(1, 2.5 * scaleAt(s.r)); var q = polar(s.a, s.r + 0.07); g.strokeStyle = "rgba(255,244,192,0.45)"; g.lineWidth = Math.max(1, sz * 0.5); g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(q.x, q.y); g.stroke(); R(p.x - sz / 2, p.y - sz / 2, sz, sz, "#fff4c0"); R(q.x - sz / 3, q.y - sz / 3, sz * 0.66, sz * 0.66, "#ff9a2a"); });
    // pellets
    pel.forEach(function (p) { var q = polar(p.a, p.r), sz = Math.max(1, 2.5 * scaleAt(p.r)); R(q.x - sz / 2, q.y - sz / 2, sz, sz, Math.floor(t * 20) % 2 ? "#ff4a6a" : "#ffe0e0"); });
    g.restore();
    // pod (screen space, so it visibly travels down the middle during the warp)
    if (deadT <= 0 && (inv <= 0 || wk.on || Math.floor(t * 12) % 2) && mode !== "title") {
      var pd = wk.dive * wk.dive * (3 - 2 * wk.dive), podR = 1 - 0.96 * pd + (wk.on && wk.e < WARP_DIVE0 ? 0.04 * Math.sin(wk.e / WARP_DIVE0 * Math.PI) : 0), podS = 1 - 0.78 * pd;
      if (wk.arrive >= 0) { podR = 1; podS = 1; }
      var me = polar(pa, podR);
      g.globalAlpha = 0.28; g.fillStyle = "#8af0ff"; g.beginPath(); g.arc(me.x, me.y, 10 * podS, 0, TAU); g.fill(); g.globalAlpha = 1;
      g.save(); g.translate(me.x, me.y); g.rotate(pa + Math.PI / 2); if (podS !== 1) g.scale(podS, podS);
      if (pd > 0.02 && wk.arrive < 0) { g.globalAlpha = Math.min(1, pd * 2); g.fillStyle = "rgba(160,255,255,0.6)"; g.beginPath(); g.moveTo(-5, 4); g.lineTo(0, 10 + 30 * pd); g.lineTo(5, 4); g.fill(); g.globalAlpha = 1; }
      g.drawImage(POD, -10, -8, 20, 16); if (twin > 0) { R(-11, -2, 3, 5, "#4ae0a0"); R(8, -2, 3, 5, "#4ae0a0"); }
      g.restore();
      if (!wk.on) { g.globalAlpha = 0.12; g.fillStyle = "#8af0ff"; g.beginPath(); g.moveTo(me.x, me.y); var b1 = polar(pa - 0.16, 0.28), b2 = polar(pa + 0.16, 0.28); g.lineTo(b1.x, b1.y); g.lineTo(b2.x, b2.y); g.fill(); g.globalAlpha = 1; }
    }
    if (mode === "title") { var tp = polar(t * 0.8, 1); g.globalAlpha = 0.28; g.fillStyle = "#8af0ff"; g.beginPath(); g.arc(tp.x, tp.y, 10, 0, TAU); g.fill(); g.globalAlpha = 1; g.save(); g.translate(tp.x, tp.y); g.rotate(t * 0.8 + Math.PI / 2); g.drawImage(POD, -10, -8, 20, 16); g.restore(); }
    fx.forEach(function (p) { R(p.x, p.y, 2, 2, p.c); g.globalAlpha = 0.35; R(p.x - 1, p.y - 1, 4, 4, p.c); g.globalAlpha = 1; });
    if (wk.on) {
      drawWarpStreaks(wk, t);
      if (wk.flash > 0) { var fg = g.createRadialGradient(CX, CY, 0, CX, CY, Math.hypot(W, H) * (0.3 + 0.7 * wk.flash)); fg.addColorStop(0, "rgba(255,255,255," + (0.95 * wk.flash) + ")"); fg.addColorStop(0.5, "rgba(190,250,255," + (0.7 * wk.flash) + ")"); fg.addColorStop(1, "rgba(120,200,255," + (0.25 * wk.flash) + ")"); g.fillStyle = fg; g.fillRect(0, 0, W, H); }
    }
    if (flare > 0) { g.globalAlpha = flare * 2; R(0, 0, W, H, "#fff8e0"); g.globalAlpha = 1; }
    var vg = g.createRadialGradient(CX, CY, RR * 0.3, CX, CY, RR * 1.35);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(3,6,20,0.45)");
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    c.imageSmoothingEnabled = Q > 1; c.drawImage(lo, 0, 0, W * PX, H * PX); c.imageSmoothingEnabled = false;
    if (mode === "play" && !ui.menuOpen) {
      if (bannerT > 0) ui.text(banner, ui.VW / 2, CY * PX - RR * PX - 18 > 20 ? CY * PX - RR * PX - 14 : 30, 17, "#ffe3a0", "center", "#ff9a2a");
      if (twin > 0) ui.text("TWIN " + Math.ceil(twin), 10, 18, 11, "#4ae0a0");
      ui.text("WAVE " + wave, ui.VW - 10, 18, 11, "#8ae8ff", "right");
    }
  }

  // ---------- input ----------
  var pid = null;
  function aim(x, y) { var lx = x / PX - CX, ly = y / PX - CY; if (lx * lx + ly * ly > 64) target = Math.atan2(ly, lx); }
  var game = {
    toTitle: toTitle, onResize: sizeLo, update: update, render: render,
    pauseButtons: function () { return [{ label: "Depth lines: " + (save.lines ? "on" : "off"), small: true, act: function () { save.lines = !save.lines; ui.persist(); ui.refreshPause(); } }]; },
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
        { label: "Firing: " + (save.fire === "auto" ? "automatic" : "hold to fire"), small: true, act: function () { save.fire = save.fire === "auto" ? "hold" : "auto"; ui.persist(); toTitle(); } },
        { label: "Depth lines: " + (save.lines ? "on" : "off"), small: true, act: function () { save.lines = !save.lines; ui.persist(); toTitle(); } }], app: true,
      help: ["Touch or drag anywhere: the pod runs round the ring to that side.", "Shots fly down into the well. Divers come right up to the ring, so keep moving.", "Every fourth landing: catch all 24 lanterns for 10,000. Green = twin lamps, red = flare."],
      fine: "A Forest Forge game", solid: false });
  }
  ui.onAdsRemoved = function () { if (mode === "title") toTitle(); };
  game.qa = { start: newGame, state: function () { return { mode: mode, wave: wave, depth: depth, lives: lives, score: score, foes: foes.length, pa: pa, deadT: deadT }; }, foes: function () { return foes; }, aimAt: function (a) { target = a; }, god: function () { inv = 1e9; }, clearWave: function () { foes = []; spawnQ = []; waveT = 2; }, warp: function () { return warpK(); }, landT: function () { return landT; }, lines: function (v) { if (v != null) { save.lines = !!v; ui.persist(); } return save.lines; } };
  ui.start(game);
})();
