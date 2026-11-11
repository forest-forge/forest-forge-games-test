/* Downcut (Forest Forge). Pike the quarry runner, chased down the haul road by a
 * runaway skip. Three lanes, jump, slide, smash crates. Pseudo-3D, drawn in code
 * into a low-res buffer; all sound and music generated with Web Audio (shell.js). */
(function () {
  "use strict";
  var clamp = FF.clamp, lerp = FF.lerp;
  var ui = FF.create({
    id: "downcut", title: "Downcut", course: "Haul road", view: { w: 360, h: 640, flex: true },
    stats: [{ id: "peb", label: "Pebbles" }, { id: "crate", label: "Crates", value: "0/0" }, { id: "lives", label: "Lives", value: "3" }],
    pads: {
      left: [{ id: "L", icon: "left", aria: "Left lane", keys: ["ArrowLeft", "KeyA"] }, { id: "R", icon: "right", aria: "Right lane", keys: ["ArrowRight", "KeyD"] }],
      right: [{ id: "S", icon: "down", aria: "Slide", keys: ["ArrowDown", "KeyS"] }, { id: "J", icon: "up", aria: "Jump", keys: ["ArrowUp", "KeyW", "Space"] }]
    }
  });
  var A = ui.audio, save = ui.save;
  save.unlocked = save.unlocked || 1; save.best = save.best || {}; save.padsOn = save.padsOn == null ? true : save.padsOn;

  var PX = 2, lo = document.createElement("canvas"), g = lo.getContext("2d"), W = 180, H = 320;
  function sizeLo() { W = Math.ceil(ui.VW / PX); H = Math.ceil(ui.VH / PX); lo.width = W; lo.height = H; }
  function R(x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); }
  function poly(pts, c) { g.fillStyle = c; g.beginPath(); g.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); }

  // ---------- tracks ----------
  var THEMES = [
    { name: "Chalk Pit", sky: ["#5a7aa0", "#e8c89a"], cliff: "#b8b0a0", wallA: "#d8d0bc", wallB: "#c4bca6", roadA: "#a89c84", roadB: "#9c907a", line: "#f4f0e4", fog: "#e8dcc0" },
    { name: "Slate Steps", sky: ["#2a3448", "#8a96a8"], cliff: "#3a4250", wallA: "#4a5262", wallB: "#424a58", roadA: "#5c6068", roadB: "#54585f", line: "#c8ccd4", fog: "#8a96a8" },
    { name: "Red Sandstone", sky: ["#3a2244", "#f09858"], cliff: "#7a3828", wallA: "#b05a3a", wallB: "#a04e32", roadA: "#8a5a44", roadB: "#80523e", line: "#f4d0a8", fog: "#e89868" },
    { name: "Lamp Shift", sky: ["#05070c", "#1a1e2a"], cliff: "#14161c", wallA: "#2a2622", wallB: "#24201c", roadA: "#3a342c", roadB: "#332e27", line: "#ffcf7a", fog: "#0e0f14", night: 1 },
    { name: "Granite Rain", sky: ["#3a4048", "#7a828a"], cliff: "#4a4a50", wallA: "#6a6a70", wallB: "#606066", roadA: "#55575c", roadB: "#4e5055", line: "#d0d4d8", fog: "#7a828a", rain: 1 },
    { name: "Ironstone", sky: ["#402818", "#c87838"], cliff: "#5a3020", wallA: "#7a4a2a", wallB: "#6e4226", roadA: "#6a4a34", roadB: "#62442f", line: "#f0c890", fog: "#c08048" },
    { name: "Limestone Frost", sky: ["#8aa8c8", "#e8f0f8"], cliff: "#c8d0d8", wallA: "#e0e4e8", wallB: "#d4d8dc", roadA: "#b8bcc0", roadB: "#aeb2b6", line: "#ffffff", fog: "#e8f0f8", snow: 1 },
    { name: "Deep Cut", sky: ["#0a0606", "#2a1810"], cliff: "#1a100a", wallA: "#3a2618", wallB: "#322014", roadA: "#4a3424", roadB: "#422e20", line: "#ff9a2a", fog: "#1a0e08", night: 1 }
  ];
  // Track 1 is hand-built. Each string is one row (left, middle, right lane), 7 m apart.
  // . empty  p pebbles  c crate  h hard-hat crate  i iron crate (jump it)  r rock (jump)
  // b low beam (slide)  g pit (jump)  w spoil heap (change lane)  K checkpoint  F finish
  var TRACK1 = [
    "...", "...", "p..", "p..", "p..", "...", ".c.", "...", "..c", "...", "c.c", "...", ".p.", ".p.", ".r.", "...", "r..", "...", "..r", "...",
    ".pp", ".c.", "...", "bbb", "...", ".p.", "c.c", "...", ".h.", "...", "rr.", "...", ".rr", "...", "pcp", "...", "w..", "...", "..w", "...",
    "K", "...", "i..", "...", "..i", "...", ".g.", "...", "g.g", "...", "ppp", "...", "bbb", "...", "rcr", "...", ".w.", ".p.", "w.w", "...",
    "ccc", "...", "b.b", "...", ".i.", "...", "ggg", "...", "p.p", "c.c", "...", "wbw", "...", "...",
    "K", "...", "r.r", ".c.", "...", "g..", ".g.", "..g", "...", "bcb", "...", "iii", "...", "ppp", "w.c", "...", "c.w", "...", "ggg", "...", "bbb", "...",
    ".h.", "rgr", "...", "w.w", ".b.", "...", "ccc", "ccc", "...", "pppp".slice(0, 3), "...", "...", "F"
  ];
  var CHUNKS = [
    [["p..", "p..", "p.."], [".c.", "...", "c.c"], ["r..", "...", "..r"], ["bbb", "..."], ["ccc", "..."], ["..p", ".p.", "p.."], [".r.", "...", "r.r"], [".h.", "..."], ["c.c", ".p."]],
    [["g..", "...", "..g"], [".g.", "c.c"], ["i.i", "...", ".i."], ["w.w", "..."], ["rbr", "..."], ["ggg", "..."], ["bcb", "..."], ["w..", "...", ".w.", "...", "..w"], ["pgp", "..."], ["iii", "..."]],
    [["ggg", "...", "bbb"], ["w.w", "...", "ww.", "...", ".ww"], ["iri", "..."], ["g.g", "...", "bgb"], ["rrr", "...", "ggg"], ["wcw", "c.c", "..."], ["gbg", "..."]]
  ];
  function buildTrack(n) {
    if (n === 0) return TRACK1.slice();
    var r = FF.rng(n * 977 + 13), rows = ["...", "...", "p..", "p..", "...", ".c."], len = 96 + n * 6, k = 0;
    while (rows.length < len) {
      var d = rows.length / len, tier = r() < 0.25 + n * 0.05 + d * 0.3 ? (r() < 0.25 + n * 0.06 ? 2 : 1) : 0;
      var ch = CHUNKS[tier][Math.floor(r() * CHUNKS[tier].length)];
      rows = rows.concat(ch);
      if (tier === 2 || r() < 0.35) rows.push("...");
      if (k === 0 && rows.length > len / 3) { rows.push("...", "K", "..."); k = 1; }
      else if (k === 1 && rows.length > len * 2 / 3) { rows.push("...", "K", "..."); k = 2; }
    }
    return rows.concat(["...", ".h.", "...", "ccc", "...", "...", "F"]);
  }
  var TRACKS = THEMES.map(function (t, i) { return { theme: t, rows: buildTrack(i) }; });

  // ---------- sound ----------
  var S = {
    step: function () { A.noise({ dur: 0.03, gain: 0.07, freq: 600, filter: "lowpass" }); },
    jump: function () { A.tone({ f: 300, f2: 620, dur: 0.12, type: "square", gain: 0.12 }); },
    slide: function () { A.noise({ dur: 0.25, gain: 0.16, freq: 900, f2: 400, filter: "bandpass" }); },
    lane: function () { A.tone({ f: 520, f2: 440, dur: 0.05, type: "triangle", gain: 0.08 }); },
    crate: function () { A.noise({ dur: 0.12, gain: 0.3, freq: 700, filter: "bandpass", q: 1.2 }); A.tone({ f: 220, f2: 90, dur: 0.1, type: "square", gain: 0.12 }); },
    bounce: function () { A.tone({ f: 400, f2: 900, dur: 0.12, type: "square", gain: 0.12 }); },
    peb: function (k) { if (A.sfxOk()) A.tone({ f: 1046 + (k % 5) * 130, dur: 0.07, type: "square", gain: 0.07 }); },
    hit: function () { A.tone({ f: 120, f2: 40, dur: 0.3, type: "sawtooth", gain: 0.25 }); A.noise({ dur: 0.2, gain: 0.3, freq: 400, filter: "lowpass" }); },
    hat: function () { [784, 988, 1175].forEach(function (f, i) { A.tone({ f: f, dur: 0.1, type: "square", gain: 0.1, delay: i * 0.07 }); }); },
    clang: function () { A.tone({ f: 600, f2: 300, dur: 0.15, type: "square", gain: 0.14 }); A.noise({ dur: 0.08, gain: 0.2, freq: 3000, filter: "highpass" }); },
    fall: function () { A.tone({ f: 700, f2: 80, dur: 0.8, type: "triangle", gain: 0.2 }); },
    crush: function () { A.noise({ dur: 0.7, gain: 0.5, freq: 300, filter: "lowpass" }); A.tone({ f: 80, f2: 30, dur: 0.6, type: "sawtooth", gain: 0.3 }); },
    check: function () { [523, 784].forEach(function (f, i) { A.tone({ f: f, dur: 0.14, type: "square", gain: 0.12, delay: i * 0.1 }); }); },
    win: function () { [523, 659, 784, 1047, 784, 1047].forEach(function (f, i) { A.tone({ f: f, dur: 0.16, type: "square", gain: 0.12, delay: i * 0.11 }); }); },
    rumble: function (v) { A.noise({ dur: 0.25, gain: v, freq: 120, filter: "lowpass", rate: 0.5 }); }
  };
  var SONG_RUN = { bpm: 168, order: [0, 0, 1, 1], parts: [[
    { wave: "square", gain: 0.055, pat: "E5 . E5 G5 . E5 D5 . E5 . B4 . D5 . E5 . E5 . E5 G5 . A5 G5 . E5 . D5 . B4 . D5 ." },
    { wave: "triangle", gain: 0.22, pat: "E2 E3 E2 E3 E2 E3 E2 E3 C2 C3 C2 C3 D2 D3 D2 D3 E2 E3 E2 E3 E2 E3 E2 E3 C2 C3 C2 C3 B1 B2 D2 D3" },
    { wave: "drum", pat: "k h s h k k s h k h s h k k s s k h s h k k s h k h s h k s s s" }
  ], [
    { wave: "square", gain: 0.055, pat: "A5 . G5 . E5 . G5 A5 . B5 . A5 G5 . E5 . C5 . D5 . E5 . G5 . E5 . D5 . B4 . . ." },
    { wave: "triangle", gain: 0.22, pat: "A1 A2 A1 A2 A1 A2 A1 A2 G1 G2 G1 G2 G1 G2 G1 G2 C2 C3 C2 C3 C2 C3 C2 C3 B1 B2 B1 B2 B1 B2 D2 D3" },
    { wave: "drum", pat: "k h s h k k s h k h s h k k s s k h s h k k s h k k s k s s s o" }
  ]] };
  var SONG_TITLE = { bpm: 96, order: [0], parts: [[
    { wave: "square", gain: 0.06, pat: "E4 - G4 - B4 - - A4 G4 - - - E4 - - - D4 - F#4 - A4 - - G4 F#4 - - - D4 - - -" },
    { wave: "triangle", gain: 0.22, pat: "E2 - - - B2 - - - E2 - - - B2 - - - D2 - - - A2 - - - D2 - - - A2 - - -" },
    { wave: "drum", pat: "k . h . s . h . k . h . s . h h k . h . s . h . k . k . s . h ." }
  ]] };

  // ---------- run state ----------
  var LANE = 1.7, HC = 3.4, ZP = 3.0, F = 106;
  var mode = "title", track = 0, rows = [], th = THEMES[0];
  var pz = 0, v = 0, vTop = 13, lane = 1, px = 0, jy = 0, vy = 0, slide = 0, hat = 0, stumble = 0, skipD = 10, skipV = 11.6;
  var lives = 3, peb = 0, crates = 0, totalCrates = 0, t = 0, cpIndex = 0, cpZ = 0, cpPeb = 0, cpCrates = 0, sinceCp = [];
  var dying = 0, dieKind = "", finished = false, parts = [], stepPh = 0, lastStep = 0, rainDrops = [], shake = 0, rumbleT = 0, banner = "", bannerT = 0;
  function rowZ(i) { return 30 + i * 7; }
  function loadTrack(n) {
    track = n; th = TRACKS[n].theme; rows = [];
    totalCrates = 0;
    TRACKS[n].rows.forEach(function (s, i) {
      var row = { z: rowZ(i), s: s, k: [s[0], s[1], s[2]], done: false, took: [0, 0, 0] };
      if (s === "K") row.cp = true; if (s === "F") row.fin = true;
      if (!row.cp && !row.fin) for (var l = 0; l < 3; l++) if ("chi".indexOf(row.k[l]) >= 0 && row.k[l] !== "i") totalCrates++;
      rows.push(row);
    });
    skipV = 11.5 + n * 0.12;
    peb = 0; crates = 0; lives = 3; cpZ = 0; cpIndex = 0; cpPeb = 0; cpCrates = 0; sinceCp = []; t = 0;
    respawn(true);
  }
  function respawn(fresh) {
    pz = cpZ; v = fresh ? 0 : 6; lane = 1; px = 0; jy = 0; vy = 0; slide = 0; stumble = 0; skipD = 8; dying = 0; finished = false; parts = [];
    if (!fresh) {
      sinceCp.forEach(function (o) { o.row.k[o.l] = o.was; o.row.took[o.l] = 0; });
      peb = cpPeb; crates = cpCrates;
    }
    sinceCp = [];
    rows.forEach(function (r) { if (r.z > pz) r.done = false; });
    hudStats();
  }
  function hudStats() { ui.setStat("peb", peb); ui.setStat("crate", crates + "/" + totalCrates); ui.setStat("lives", lives); }

  function laneAt() { return clamp(Math.round(px / LANE) + 1, 0, 2); }
  function take(row, l, nk) { sinceCp.push({ row: row, l: l, was: row.k[l] }); row.k[l] = nk; }
  function burst(kind, n, col) {
    for (var i = 0; i < n; i++) parts.push({ x: px + (Math.random() - 0.5) * 0.6, y: 0.5 + Math.random() * 0.5, z: pz + 0.5 + Math.random(), vx: (Math.random() - 0.5) * 5, vy: 3 + Math.random() * 5, vz: v * 0.6 + Math.random() * 3, life: 0.8 + Math.random() * 0.4, c: col, k: kind });
  }
  function hurt(kind) {
    if (stumble > 0 || dying) return;
    if (hat > 0) { hat = 0; S.clang(); burst("bit", 8, "#ffd040"); banner = "Hard hat saved you"; bannerT = 1.2; stumble = 0.25; return; }
    S.hit(); stumble = 0.7; v = 4; shake = 0.35; burst("dust", 10, th.wallA);
  }
  function die(kind) {
    if (dying) return;
    dying = 1.2; dieKind = kind;
    if (kind === "fall") S.fall(); else { S.crush(); shake = 0.6; }
  }
  function cross(row) {
    row.done = true;
    if (row.cp) { cpZ = row.z + 1; cpPeb = peb; cpCrates = crates; sinceCp = []; S.check(); banner = "Checkpoint"; bannerT = 1.2; return; }
    if (row.fin) { finished = true; return; }
    var l = laneAt();
    // pebbles in any lane are collected only in your lane
    var k = row.k[l];
    if (k === "p" && jy < 1.6) { take(row, l, "."); peb += 3; for (var q = 0; q < 3; q++) S.peb(peb + q); hudStats(); }
    else if (k === "c" || k === "h") {
      var good = slide > 0 || (jy > 0.15 && vy < 0);
      take(row, l, "."); crates++; S.crate(); burst("plank", 9, "#a8743a");
      if (k === "h") { hat = 1; S.hat(); banner = "Hard hat!"; bannerT = 1.1; } else { peb += 5; }
      if (jy > 0.15 && vy < 0) { vy = 7; S.bounce(); }
      else if (!good) { v *= 0.6; }
      hudStats();
    } else if (k === "i") { if (jy < 0.95) { if (jy > 0.5 && vy < 0) { vy = 7.5; S.bounce(); } else hurt("iron"); } }
    else if (k === "r") { if (jy < 0.55) hurt("rock"); }
    else if (k === "b") { if (slide <= 0) hurt("beam"); }
    else if (k === "w") { hurt("heap"); }
    else if (k === "g") { if (jy < 0.08) die("fall"); }
  }

  // ---------- input ----------
  function doLeft() { if (lane > 0) { lane--; S.lane(); } }
  function doRight() { if (lane < 2) { lane++; S.lane(); } }
  function doJump() { if (jy <= 0.001 && !dying) { vy = 8.2; slide = 0; S.jump(); } }
  function doSlide() { if (dying) return; if (jy > 0.05) { vy = Math.min(vy, -9); } slide = 0.62; S.slide(); }
  var sw = null;
  var game = {
    toTitle: toTitle,
    onResize: sizeLo,
    onBack: function () { if (mode === "title") return "exit"; toTitle(); return "menu"; },
    onPress: function (id) { if (id === "L") doLeft(); else if (id === "R") doRight(); else if (id === "J") doJump(); else if (id === "S") doSlide(); },
    onPointer: function (type, x, y, id) {
      if (!ui.playing) return;
      if (type === "pointerdown") sw = { x: x, y: y, id: id, used: false, t: performance.now() };
      else if (type === "pointermove" && sw && sw.id === id && !sw.used) {
        var dx = x - sw.x, dy = y - sw.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) > 26) {
          sw.used = true;
          if (Math.abs(dx) > Math.abs(dy)) (dx < 0 ? doLeft : doRight)(); else (dy < 0 ? doJump : doSlide)();
        }
      } else if (type === "pointerup" && sw && sw.id === id) {
        if (!sw.used && performance.now() - sw.t < 300) doJump();
        sw = null;
      }
    },
    update: function (dt) {
      t += dt;
      if (dying) {
        dying -= dt; if (dieKind === "fall") jy -= dt * 6;
        if (dying <= 0) {
          lives--; hudStats();
          if (lives <= 0) { gameOver(); return; }
          respawn(false); banner = "Go again"; bannerT = 1;
        }
        tickParts(dt); return;
      }
      if (finished) { winTrack(); return; }
      // speed
      if (stumble > 0) stumble -= dt;
      v = Math.min(vTop, v + (stumble > 0 ? 4 : 9) * dt);
      pz += v * dt;
      // lane
      var tx = (lane - 1) * LANE; px = lerp(px, tx, Math.min(1, dt * 16));
      // jump
      if (jy > 0 || vy > 0) { vy -= 24 * dt; jy += vy * dt; if (jy <= 0) { jy = 0; vy = 0; S.step(); } }
      if (slide > 0) slide -= dt;
      // footsteps
      stepPh += v * dt * 1.6;
      if (jy === 0 && slide <= 0 && Math.floor(stepPh / Math.PI) !== lastStep) { lastStep = Math.floor(stepPh / Math.PI); if (A.sfxOk()) S.step(); }
      // rows
      for (var i = 0; i < rows.length; i++) { var r = rows[i]; if (!r.done && r.z <= pz + ZP - ZP) { if (r.z <= pz) cross(r); } if (r.z > pz + 2) break; }
      // the skip
      if (t > 1.2) skipD += (v - skipV) * dt;
      skipD = Math.min(skipD, 9);
      if (skipD <= 0.2) die("skip");
      rumbleT -= dt; if (rumbleT <= 0) { rumbleT = 0.28; S.rumble(clamp(0.35 - skipD * 0.03, 0.04, 0.35)); }
      shake = Math.max(0, shake - dt);
      bannerT -= dt;
      tickParts(dt);
    },
    idle: function (dt) { if (mode === "title") { pz += 8 * dt; t += dt; } },
    render: render
  };
  function tickParts(dt) {
    parts.forEach(function (p) { p.life -= dt; p.vy -= 14 * dt; p.x += p.vx * dt; p.y = Math.max(0, p.y + p.vy * dt); p.z += p.vz * dt; });
    parts = parts.filter(function (p) { return p.life > 0; });
  }

  // ---------- drawing ----------
  var hz = 120;
  function curv(z) { return 0.010 * Math.sin(z / 90) + 0.007 * Math.sin(z / 37 + 1); }
  var C0 = 0;
  function proj(xw, yw, z) { // z relative to camera
    var s = F / z, shift = C0 * z * z * 0.9;
    return { x: W / 2 + (xw + shift - px * 0.35) * s, y: hz + (HC - yw) * s - (HC * 0) , s: s };
  }
  function render(c, now) {
    if (!W) sizeLo();
    hz = Math.round(H * 0.36);
    var camZ = pz - ZP, sh = shake > 0 && !ui.reduceMotion ? (Math.random() - 0.5) * shake * 8 : 0;
    C0 = curv(camZ);
    g.save(); g.translate(Math.round(sh), Math.round(sh * 0.5));
    // sky
    var gr = g.createLinearGradient(0, 0, 0, hz); gr.addColorStop(0, th.sky[0]); gr.addColorStop(1, th.sky[1]);
    g.fillStyle = gr; g.fillRect(-4, -4, W + 8, hz + 6);
    if (th.night) for (var s = 0; s < 30; s++) R((s * 53 + 7) % W, (s * 29) % (hz - 10), 1, 1, s % 3 ? "#6a7088" : "#c8d0e8");
    // far cliffs (parallax with curve)
    var cs = -C0 * 1800;
    for (var x = -8; x < W + 8; x += 4) {
      var hh = 18 + 10 * Math.sin((x - cs) * 0.05) + 6 * Math.sin((x - cs) * 0.13 + 2);
      R(x, hz - hh, 4, hh + 1, th.cliff);
    }
    // ground rows
    for (var y = hz + 1; y < H + 4; y++) {
      var z = F * HC / (y - hz), wz = camZ + z, scl = F / z, shift = C0 * z * z * 0.9;
      var cx = W / 2 + (shift - px * 0.35) * scl, half = (1.5 * LANE + 0.5) * scl;
      var band = Math.floor(wz / 2.2) % 2 === 0;
      var fogK = clamp((z - 25) / 45, 0, 1);
      g.fillStyle = band ? th.roadB : th.roadA; g.globalAlpha = 0.8; g.fillRect(-4, y, W + 8, 1); g.globalAlpha = 1;
      g.fillStyle = band ? th.roadA : th.roadB; g.fillRect(cx - half, y, half * 2, 1);
      // edge kerbs and lane lines
      var kw = Math.max(1, 0.25 * scl);
      g.fillStyle = Math.floor(wz / 1.1) % 2 ? "#e8e0d0" : "#a03a2a"; g.fillRect(cx - half - kw, y, kw, 1); g.fillRect(cx + half, y, kw, 1);
      if (Math.floor(wz / 1.6) % 2 === 0) { var lw = Math.max(1, 0.1 * scl); g.fillStyle = th.line; g.fillRect(cx - LANE / 2 * scl - lw / 2, y, lw, 1); g.fillRect(cx + LANE / 2 * scl - lw / 2, y, lw, 1); }
      if (fogK > 0) { g.globalAlpha = fogK * 0.85; g.fillStyle = th.fog; g.fillRect(-4, y, W + 8, 1); g.globalAlpha = 1; }
    }
    // quarry walls: faces between depth slices, far to near
    var segs = [];
    for (var zz = 64; zz >= 1; zz -= 2) segs.push(zz);
    var off = (camZ % 2 + 2) % 2;
    for (var si = 0; si < segs.length - 1; si++) {
      var za = segs[si] - off, zb = segs[si + 1] - off; if (zb < 0.9) zb = 0.9; if (za <= zb) continue;
      var sa = F / za, sb = F / zb, ca = W / 2 + (C0 * za * za * 0.9 - px * 0.35) * sa, cb = W / 2 + (C0 * zb * zb * 0.9 - px * 0.35) * sb;
      var ga = hz + HC * sa, gb = hz + HC * sb, wdist = 1.5 * LANE + 1.6, wh = 7;
      var stripe = Math.floor((camZ + za) / 2) % 2 === 0;
      var colL = stripe ? th.wallA : th.wallB, colR = stripe ? th.wallB : th.wallA;
      var lxa = ca - wdist * sa, lxb = cb - wdist * sb, rxa = ca + wdist * sa, rxb = cb + wdist * sb;
      poly([-6, ga - wh * sa, lxa, ga - wh * sa, lxa, ga, lxb, gb, lxb, gb - wh * sb, -6, gb - wh * sb, -6, H + 6, -6, ga], colL);
      poly([lxa, ga, lxa, ga - wh * sa, lxb, gb - wh * sb, lxb, gb], colL);
      poly([W + 6, ga - wh * sa, rxa, ga - wh * sa, rxa, ga, rxb, gb, rxb, gb - wh * sb, W + 6, gb - wh * sb, W + 6, H + 6, W + 6, ga], colR);
      // strata lines on the faces
      g.fillStyle = "rgba(0,0,0,0.14)";
      for (var b = 1; b < 4; b++) { var ha = ga - wh * sa * b / 4, hb = gb - wh * sb * b / 4; poly([lxa, ha, lxb, hb, lxb, hb + Math.max(1, sb * 0.12), lxa, ha + Math.max(1, sa * 0.12)], "rgba(0,0,0,0.14)"); poly([rxa, ha, rxb, hb, rxb, hb + Math.max(1, sb * 0.12), rxa, ha + Math.max(1, sa * 0.12)], "rgba(0,0,0,0.14)"); }
      // lamps on posts every 14 m
      if (Math.floor((camZ + zb) / 2) % 7 === 0 && zb > 1.5) {
        var lx = cb - (wdist - 0.4) * sb, rx = cb + (wdist - 0.4) * sb;
        R(lx, gb - 3.2 * sb, Math.max(1, 0.12 * sb), 3.2 * sb, "#2a2620"); R(lx - 0.15 * sb, gb - 3.3 * sb, 0.4 * sb, 0.2 * sb, th.night ? "#ffd080" : "#8a8070");
        R(rx, gb - 3.2 * sb, Math.max(1, 0.12 * sb), 3.2 * sb, "#2a2620"); R(rx - 0.25 * sb, gb - 3.3 * sb, 0.4 * sb, 0.2 * sb, th.night ? "#ffd080" : "#8a8070");
      }
      if (za > 30) { g.globalAlpha = clamp((za - 30) / 40, 0, 0.8); poly([-6, ga - wh * sa, W + 6, ga - wh * sa, W + 6, gb, -6, gb], th.fog); g.globalAlpha = 1; }
    }
    // objects far to near
    var list = [];
    for (var i = 0; mode !== "title" && i < rows.length; i++) { var r = rows[i], dz = r.z - camZ; if (dz < 0.6) continue; if (dz > 70) break; list.push(r); }
    for (var j = list.length - 1; j >= 0; j--) drawRow(list[j], list[j].z - camZ);
    // side props: lamps / posts every 14 m
    // (drawn with rows for depth, simple)
    // particles
    parts.forEach(function (p) { var dz = p.z - camZ; if (dz < 0.5) return; var q = proj(p.x, p.y, dz); var sz = Math.max(1, q.s * (p.k === "plank" ? 0.22 : 0.12)); R(q.x - sz / 2, q.y - sz / 2, sz * (p.k === "plank" ? 2 : 1), sz, p.c); });
    // Pike
    drawPike(now);
    // the skip
    drawSkip(now);
    if (th.rain) for (var d = 0; d < 50; d++) { var rx = (d * 37 + now * 60 * (d % 3 + 2)) % (W + 20) - 10, ry = (d * 71 + now * 260) % H; R(rx, ry, 1, 4, "rgba(200,210,230,0.5)"); }
    if (th.snow) for (var e = 0; e < 40; e++) { var sx2 = (e * 41 + Math.sin(now + e) * 10) % W, sy2 = (e * 67 + now * 40) % H; R(sx2, sy2, 1, 1, "#fff"); }
    if (th.night) { var vg = g.createRadialGradient(W / 2, H * 0.72, 10, W / 2, H * 0.6, W * 0.9); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.55)"); g.fillStyle = vg; g.fillRect(-4, -4, W + 8, H + 8); }
    if (dying && dieKind === "skip") { g.globalAlpha = clamp(1.2 - dying, 0, 1); R(-4, -4, W + 8, H + 8, "#000"); g.globalAlpha = 1; }
    g.restore();
    c.drawImage(lo, 0, 0, W * PX, H * PX);
    // HUD text
    if (mode === "run" && !ui.menuOpen) {
      var prog = clamp(pz / rows[rows.length - 1].z, 0, 1), bw = ui.VW * 0.7, bx = (ui.VW - bw) / 2;
      c.fillStyle = "rgba(5,5,5,0.55)"; c.fillRect(bx - 2, 10, bw + 4, 8); c.fillStyle = "#ffcf7a"; c.fillRect(bx, 12, bw * prog, 4);
      rows.forEach(function (r) { if (r.cp) { c.fillStyle = "#ff9a2a"; c.fillRect(bx + bw * r.z / rows[rows.length - 1].z - 1, 8, 2, 12); } });
      ui.text(th.name.toUpperCase() + " · " + FF.fmtTime(t), ui.VW / 2, 32, 12, "#ffd38a", "center");
      if (skipD < 4.5 && !dying && Math.floor(now * 6) % 2) ui.text("SKIP!", ui.VW / 2, ui.VH * 0.5, 30, "#ff6a3a", "center", "#ff2a00");
      if (bannerT > 0) ui.text(banner, ui.VW / 2, ui.VH * 0.2, 22, "#ffe3a0", "center", "#ff9a2a");
      if (hat) ui.text("HARD HAT", 14, 32, 11, "#ffd040", "left");
    }
  }
  function crateBox(x, y, s, kind) {
    var w = s * 0.95, h = s * 0.95, l = x - w / 2, tp = y - h;
    if (kind === "i") { R(l, tp, w, h, "#6a6e76"); R(l, tp, w, Math.max(1, h * 0.12), "#9aa0aa"); R(l + w * 0.1, tp + h * 0.2, Math.max(1, w * 0.08), Math.max(1, w * 0.08), "#3a3e44"); R(l + w * 0.82, tp + h * 0.2, Math.max(1, w * 0.08), Math.max(1, w * 0.08), "#3a3e44"); R(l + w * 0.1, tp + h * 0.75, Math.max(1, w * 0.08), Math.max(1, w * 0.08), "#3a3e44"); R(l + w * 0.82, tp + h * 0.75, Math.max(1, w * 0.08), Math.max(1, w * 0.08), "#3a3e44"); return; }
    R(l, tp, w, h, kind === "h" ? "#d8a020" : "#a8743a");
    R(l, tp, w, Math.max(1, h * 0.1), kind === "h" ? "#ffd050" : "#d0a060");
    var b = Math.max(1, w * 0.1);
    R(l, tp, b, h, "#6a4420"); R(l + w - b, tp, b, h, "#6a4420"); R(l, tp + h - b, w, b, "#6a4420");
    if (kind === "h") { R(x - w * 0.25, tp + h * 0.35, w * 0.5, h * 0.25, "#fff2a0"); R(x - w * 0.32, tp + h * 0.55, w * 0.64, Math.max(1, h * 0.08), "#fff2a0"); }
    else { for (var k = 0; k < 6; k++) R(l + w * (0.15 + k * 0.12), tp + h * (0.15 + k * 0.12), b, b, "#6a4420"); }
  }
  function drawRow(r, dz) {
    var s = F / dz, shift = C0 * dz * dz * 0.9, base = W / 2 + (shift - px * 0.35) * s, gy = hz + HC * s;
    var fogA = clamp((dz - 30) / 40, 0, 0.85);
    if (r.cp || r.fin) {
      var hw = (1.5 * LANE + 0.6) * s, top = gy - 2.6 * s;
      R(base - hw, top, Math.max(1, 0.2 * s), gy - top, "#3a2a1a"); R(base + hw - 0.2 * s, top, Math.max(1, 0.2 * s), gy - top, "#3a2a1a");
      if (r.fin) { for (var q = 0; q < 12; q++) R(base - hw + q * hw / 6, top, hw / 6, 0.45 * s, q % 2 ? "#111" : "#f4f4f4"); }
      else { R(base - hw, top, hw * 2, 0.35 * s, "#ff9a2a"); }
      return;
    }
    for (var l = 0; l < 3; l++) {
      var k = r.k[l]; if (k === ".") continue;
      var x = base + (l - 1) * LANE * s;
      if (k === "c" || k === "h" || k === "i") crateBox(x, gy, s, k);
      else if (k === "r") { R(x - 0.55 * s, gy - 0.45 * s, 1.1 * s, 0.45 * s, "#6a6258"); R(x - 0.4 * s, gy - 0.62 * s, 0.75 * s, 0.25 * s, "#7e766a"); R(x - 0.3 * s, gy - 0.6 * s, 0.25 * s, 0.1 * s, "#9a9284"); }
      else if (k === "b") { R(x - 0.85 * s, gy - 1.35 * s, 1.7 * s, 0.32 * s, "#7a4e2a"); R(x - 0.85 * s, gy - 1.35 * s, 1.7 * s, Math.max(1, 0.07 * s), "#a8743a"); R(x - 0.8 * s, gy - 1.05 * s, Math.max(1, 0.12 * s), 1.05 * s, "#5a3a1e"); R(x + 0.68 * s, gy - 1.05 * s, Math.max(1, 0.12 * s), 1.05 * s, "#5a3a1e"); for (var st = 0; st < 4; st++) R(x - 0.8 * s + st * 0.42 * s, gy - 1.35 * s, 0.21 * s, 0.32 * s, st % 2 ? "#e8c040" : "#2a2a2a"); }
      else if (k === "w") { poly([x - 0.85 * s, gy, x - 0.4 * s, gy - 1.5 * s, x + 0.45 * s, gy - 1.6 * s, x + 0.85 * s, gy], "#5a4a3a"); poly([x - 0.4 * s, gy - 1.5 * s, x + 0.45 * s, gy - 1.6 * s, x + 0.2 * s, gy - 0.9 * s], "#6e5c48"); }
      else if (k === "g") {
        var z2 = dz + 2.4; if (z2 < 0.7) continue; var s2 = F / z2, sh2 = C0 * z2 * z2 * 0.9, b2 = W / 2 + (sh2 - px * 0.35) * s2, gy2 = hz + HC * s2;
        var x2 = b2 + (l - 1) * LANE * s2;
        poly([x - 0.85 * s, gy, x + 0.85 * s, gy, x2 + 0.85 * s2, gy2, x2 - 0.85 * s2, gy2], "#0a0604");
        R(x - 0.85 * s, gy - Math.max(1, 0.06 * s), 1.7 * s, Math.max(1, 0.08 * s), "#2a1a10");
      }
      else if (k === "p") { for (var p = 0; p < 3; p++) { var bob = Math.sin(ui.time * 6 + p + r.z) * 0.12; var py = gy - (0.5 + p * 0.0 + bob) * s, pxx = x + (p - 1) * 0.35 * s; R(pxx - 0.11 * s, py - 0.11 * s, 0.22 * s, 0.22 * s, "#ffb040"); R(pxx - 0.05 * s, py - 0.09 * s, 0.08 * s, 0.06 * s, "#fff0b0"); } }
    }
    if (fogA > 0) { /* fog is approximated by the ground fog; objects stay readable */ }
  }
  function drawPike(now) {
    var s = F / ZP, gy = hz + HC * s, x = W / 2 + (px - px * 0.35) * s + C0 * ZP * ZP * 0.9 * s;
    if (dying && dieKind === "fall") { gy += (1.2 - dying) * 40; }
    // shadow
    var shw = (0.5 - Math.min(0.3, jy * 0.15)) * s;
    g.fillStyle = "rgba(0,0,0,0.35)"; g.beginPath(); g.ellipse(x, gy, shw, shw * 0.25, 0, 0, Math.PI * 2); g.fill();
    var y = gy - jy * s, run = Math.sin(stepPh), u = s / 30;
    var skin = "#d8a070", vest = "#ff7a1a", strip = "#e8f0e0", trou = "#2a3a5a", boot = "#2a1a0e", hair = "#3a2414";
    if (stumble > 0) y += Math.sin(now * 40) * u;
    if (slide > 0 && jy === 0) {
      // sliding: low and wide, feet forward (away from camera)
      R(x - 10 * u, y - 10 * u, 20 * u, 6 * u, trou); R(x - 9 * u, y - 16 * u, 18 * u, 8 * u, vest); R(x - 9 * u, y - 13 * u, 18 * u, 2 * u, strip);
      R(x - 5 * u, y - 23 * u, 10 * u, 8 * u, hat ? "#ffd040" : hair); R(x - 12 * u, y - 13 * u, 4 * u, 6 * u, skin); R(x + 8 * u, y - 13 * u, 4 * u, 6 * u, skin);
      R(x - 14 * u, y - 4 * u, 28 * u, 3 * u, "rgba(220,200,170,0.6)");
      return;
    }
    var air = jy > 0.05, l1 = air ? -6 : run * 5, l2 = air ? -4 : -run * 5;
    // legs (seen from behind: lifting leg goes up and shortens)
    R(x - 6 * u, y - 16 * u + Math.max(0, -l1) * u * 0.0, 5 * u, 14 * u - Math.max(0, l1) * u, trou); R(x - 6 * u, y - 3 * u - Math.max(0, l1) * u, 5 * u, 3 * u, boot);
    R(x + 1 * u, y - 16 * u, 5 * u, 14 * u - Math.max(0, l2) * u, trou); R(x + 1 * u, y - 3 * u - Math.max(0, l2) * u, 5 * u, 3 * u, boot);
    // torso
    R(x - 8 * u, y - 31 * u, 16 * u, 16 * u, vest); R(x - 8 * u, y - 24 * u, 16 * u, 2 * u, strip); R(x - 1 * u, y - 31 * u, 2 * u, 16 * u, strip);
    // arms swing opposite
    var a1 = air ? -8 : -run * 4, a2 = air ? -8 : run * 4;
    R(x - 12 * u, y - 30 * u + a1 * u, 4 * u, 11 * u, skin); R(x + 8 * u, y - 30 * u + a2 * u, 4 * u, 11 * u, skin);
    // head
    R(x - 5 * u, y - 40 * u, 10 * u, 9 * u, hair); R(x - 6 * u, y - 36 * u, 2 * u, 3 * u, skin); R(x + 4 * u, y - 36 * u, 2 * u, 3 * u, skin);
    if (hat) { R(x - 6 * u, y - 43 * u, 12 * u, 5 * u, "#ffd040"); R(x - 8 * u, y - 39 * u, 16 * u, 2 * u, "#e8b020"); }
  }
  function drawSkip(now) {
    if (mode !== "run") return;
    var danger = clamp(1 - skipD / 9, 0, 1);
    if (dying && dieKind === "skip") danger = 1 + (1.2 - dying) * 0.6;
    var top = lerp(H * 0.86, H * 0.5, Math.min(1, danger)), w = W * 1.0, x = W / 2 + Math.sin(now * 7) * 3;
    if (top > H) return;
    var wob = Math.sin(now * 13) * 2;
    poly([x - w * 0.5, top + wob, x + w * 0.5, top - wob, x + w * 0.42, H + 10, x - w * 0.42, H + 10], "#d08a1a");
    R(x - w * 0.5, top - 3, w, 5, "#f0b030");
    R(x - w * 0.46, top + 10, w * 0.92, 3, "#9a5a10");
    R(x - w * 0.46, top + 24, w * 0.92, 3, "#9a5a10");
    for (var k = 0; k < 5; k++) R(x - w * 0.4 + k * w * 0.2, top + 4, 4, 4, "#6a4010");
    // rubble spilling over the lip
    for (var j = 0; j < 7; j++) R(x - w * 0.4 + j * w * 0.13 + Math.sin(now * 9 + j) * 2, top - 6 - Math.abs(Math.sin(now * 8 + j * 2)) * 5, 6, 5, j % 2 ? "#7a6a58" : "#5a4a3a");
    for (var sp = 0; sp < 6; sp++) R(x - w * 0.44 + Math.random() * w * 0.88, H - 4 - Math.random() * 10, 2, 2, Math.random() < 0.5 ? "#ffe080" : "#ff9a2a");
  }

  // ---------- flow ----------
  function startTrack(n) {
    mode = "run"; loadTrack(n);
    ui.setCourse("Track " + (n + 1));
    ui.padsOnly(save.padsOn ? null : []);
    A.playSong(SONG_RUN);
    ui.go(); banner = "RUN!"; bannerT = 1.2;
  }
  function winTrack() {
    ui.stop(); mode = "done"; A.stopSong(); S.win();
    var par = rows[rows.length - 1].z / 11.5, bonus = Math.max(0, Math.round((par - t) * 20)) * 10;
    var all = crates >= totalCrates, score = peb * 10 + crates * 50 + bonus + (all ? 1000 : 0);
    var b = save.best[track] || {}, nb = !b.score || score > b.score;
    if (nb) b.score = score; if (!b.time || t < b.time) b.time = t; if (all) b.gem = 1; b.crates = Math.max(b.crates || 0, crates);
    save.best[track] = b; if (track + 2 > save.unlocked) save.unlocked = Math.min(TRACKS.length, track + 2); ui.persist();
    ui.runEnded();
    ui.menu({ kicker: "Track " + (track + 1) + " · " + th.name, title: "Out of the cut",
      stats: '<b class="ff-score-xl">' + FF.n(score) + "</b><span>" + (nb ? "NEW BEST" : "BEST " + FF.n(b.score)) + "</span><span>TIME " + FF.fmtTime(t) + "</span><span>CRATES " + crates + "/" + totalCrates + (all ? " · ALL CRATES +1,000" : "") + "</span><span>PEBBLES " + peb + " · TIME BONUS " + FF.n(bonus) + "</span>",
      buttons: (track + 1 < TRACKS.length ? [{ label: "Next track", act: function () { startTrack(track + 1); } }] : []).concat([{ label: "Run it again", act: function () { startTrack(track); } }, { label: "Menu", act: toTitle }]) });
  }
  function gameOver() {
    ui.stop(); mode = "over"; A.stopSong(); ui.runEnded();
    ui.menu({ kicker: "Track " + (track + 1) + " · " + th.name, title: dieKind === "fall" ? "Down the pit" : "Flattened",
      body: "Out of lives " + Math.round(pz) + " m down the haul road.", stats: "<span>CRATES " + crates + "/" + totalCrates + "</span><span>PEBBLES " + peb + "</span>",
      buttons: [{ label: "Try again", act: function () { startTrack(track); } }, { label: "Menu", act: toTitle }] });
  }
  function trackList() {
    ui.menu({ title: "Tracks", html: '<table class="ff-table">' + TRACKS.map(function (tr, i) { var b = save.best[i]; return "<tr><td>" + (i + 1) + ". " + tr.theme.name + (b && b.gem ? " ◆" : "") + "</td><td>" + (i < save.unlocked ? (b ? FF.n(b.score) : "new") : "locked") + "</td></tr>"; }).join("") + "</table>",
      row: TRACKS.map(function (tr, i) { return { label: String(i + 1), disabled: i >= save.unlocked, act: function () { startTrack(i); } }; }),
      buttons: [{ label: "Back", small: true, act: toTitle }] });
  }
  function toTitle() {
    ui.stop(); mode = "title"; A.playSong(SONG_TITLE); loadTrack(Math.min(save.unlocked - 1, TRACKS.length - 1)); pz = 0;
    ui.setCourse("Haul road"); ui.padsOnly(null);
    var next = Math.min(save.unlocked, TRACKS.length) - 1;
    ui.menu({ title: "DOWNCUT", body: "Pike runs the haul road. The skip's coming.",
      stats: "<span>TRACKS OPEN " + save.unlocked + "/" + TRACKS.length + "</span>",
      buttons: [{ label: next ? "Play track " + (next + 1) : "Play", act: function () { startTrack(next); } }, { label: "Tracks", act: trackList },
        { label: "Touch pads: " + (save.padsOn ? "on" : "off (swipe only)"), small: true, act: function () { save.padsOn = !save.padsOn; ui.persist(); toTitle(); } }], app: true,
      help: ["Swipe left/right to change lane, up (or tap) to jump, down to slide.", "Or use the pads, or arrow keys and Space.", "Smash crates by jumping on them or sliding into them. Hard-hat crates save you from one knock."],
      fine: "A Forest Forge game" });
  }
  ui.onAdsRemoved = function () { if (mode === "title") toTitle(); };
  game.qa = { start: startTrack, state: function () { return { pz: pz, v: v, lane: lane, jy: jy, skipD: skipD, lives: lives, crates: crates, total: totalCrates, mode: mode, dying: dying }; }, rows: function () { return rows; }, jump: doJump, slide: doSlide, left: doLeft, right: doRight };
  ui.start(game);
})();
