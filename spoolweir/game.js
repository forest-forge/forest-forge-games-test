/* Spoolweir (Forest Forge). Wooden painted spools travel a mill leat toward
 * the weir. Fire a spool from the bank hopper and make a run of three or more
 * of a colour vanish. No frog, no temple spiral, no pit. */
(function () {
  "use strict";
  (function applyChrome(css) {
    var s = document.createElement("style"); s.id = "ff-palette"; s.textContent = css;
    document.head.appendChild(s);
    var m = document.querySelector('meta[name="theme-color"]');
    var bg = /--bg:([^;}]+)/.exec(css); if (m && bg) m.setAttribute("content", bg[1].trim());
  })(`:root{--bg:#1a4a3a;--water:#143c30;--amber:#e8f0d8;--amber-hi:#d8e878;--amber-soft:#eef4d8;--amber-line:#6aaa70;--ember:#e09040;--btn:#1a3a2c;--lamp:#f8ffe0;--glow-line:rgba(120,200,130,.4);--glow-fill:rgba(120,200,130,.1)}.ff-host{background:radial-gradient(ellipse at 50% 20%, #2a6a50 0%, transparent 55%), var(--bg)}.ff-hud{background:linear-gradient(#1a4a3a,#0e2a22);border-bottom-color:rgba(106,170,112,.4)}` + (window.FFX ? FFX.menuChrome() : ""));

  var COLS = ["#c43a28", "#e0a020", "#2a8a7a", "#f0e0c0", "#7a3a88"];
  var COLS_DK = ["#8a2010", "#a87810", "#1a5a4e", "#c0b090", "#4a2060"];
  var ui = FF.create({
    id: "spoolweir", title: "Spoolweir", course: "The leat", wide: true, view: { w: 640, h: 360, flex: true },
    stats: [{ id: "left", label: "Spools", value: "-" }, { id: "score", label: "Score", value: "0" }],
    pads: {
      left: [{ id: "L", icon: "left", aria: "Aim left", keys: ["ArrowLeft", "KeyA"] }, { id: "R", icon: "right", aria: "Aim right", keys: ["ArrowRight", "KeyD"] }],
      right: [{ id: "F", label: "Fire", cls: "big", aria: "Fire", keys: ["Space", "ArrowUp", "KeyW"] }]
    }
  });
  var A = ui.audio, save = ui.save; save.hi = save.hi || 0; save.open = save.open || 1;
  var S = {
    fire: function () { A.tone({ f: 360, f2: 520, dur: 0.07, type: "square", gain: 0.05 }); },
    pop: function () { A.tone({ f: 680, f2: 420, dur: 0.1, type: "triangle", gain: 0.07 }); },
    win: function () { [392, 523, 659, 784].forEach(function (f, i) { A.tone({ f: f, dur: 0.09, type: "triangle", gain: 0.08, delay: i * 0.08 }); }); },
    lose: function () { [280, 200, 140].forEach(function (f, i) { A.tone({ f: f, dur: 0.14, type: "square", gain: 0.07, delay: i * 0.1 }); }); }
  };
  var SONG = { bpm: 114, order: [0, 0, 1], parts: [[
    { wave: "triangle", gain: 0.04, pat: "G3 . B3 . D4 B3 G3 . A3 . C4 . E4 C4 A3 . G3 B3 D4 B3 F#3 . G3 ." },
    { wave: "sine", gain: 0.03, pat: "G2 . . . D3 . . . C3 . . . G2 . . . D3 . . . A2 . . . G2 . . . D3 ." }
  ], [
    { wave: "triangle", gain: 0.04, pat: "E3 . G3 . B3 G3 E3 . F#3 . A3 . C#4 A3 F#3 . E3 G3 B3 G3 D3 . E3 ." },
    { wave: "sine", gain: 0.03, pat: "E2 . . . B2 . . . A2 . . . E2 . . . B2 . . . F#2 . . . E2 . . . B2 ." }
  ]] };

  function bezier(pts) {
    // pts are waypoints; densify
    var out = [pts[0]];
    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i], b = pts[i + 1];
      var steps = Math.max(8, Math.hypot(b[0] - a[0], b[1] - a[1]) / 8);
      for (var s = 1; s <= steps; s++) out.push([a[0] + (b[0] - a[0]) * s / steps, a[1] + (b[1] - a[1]) * s / steps]);
    }
    return out;
  }
  function plen(path) {
    var L = [0];
    for (var i = 1; i < path.length; i++) L.push(L[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
    return L;
  }
  function atT(path, acc, t) {
    if (t <= 0) return { x: path[0][0], y: path[0][1], i: 0 };
    var tot = acc[acc.length - 1];
    if (t >= tot) { var p = path[path.length - 1]; return { x: p[0], y: p[1], i: path.length - 1 }; }
    var lo = 0, hi = acc.length - 1;
    while (lo < hi - 1) { var mid = (lo + hi) >> 1; if (acc[mid] < t) lo = mid; else hi = mid; }
    var u = (t - acc[lo]) / (acc[hi] - acc[lo] || 1);
    return { x: path[lo][0] + (path[hi][0] - path[lo][0]) * u, y: path[lo][1] + (path[hi][1] - path[lo][1]) * u, i: lo };
  }
  function closestT(path, acc, x, y) {
    var best = 0, bd = 1e9;
    for (var i = 0; i < path.length; i++) {
      var d = Math.hypot(path[i][0] - x, path[i][1] - y);
      if (d < bd) { bd = d; best = acc[i]; }
    }
    return { t: best, d: bd };
  }

  var COURSES = [
    { name: "Mill cut", colors: 3, n: 16, spd: 28, seed: 3, hop: [520, 260],
      pts: [[40, 80], [200, 80], [280, 180], [400, 180], [480, 80], [600, 80]] },
    { name: "The oxbow", colors: 3, n: 18, spd: 30, seed: 7, hop: [320, 300],
      pts: [[40, 200], [120, 80], [260, 80], [340, 200], [480, 200], [560, 80], [620, 80]] },
    { name: "Double bend", colors: 4, n: 20, spd: 32, seed: 11, hop: [80, 280],
      pts: [[60, 60], [300, 60], [300, 200], [540, 200], [540, 80], [620, 80]] },
    { name: "S-leat", colors: 4, n: 22, spd: 32, seed: 13, hop: [320, 40],
      pts: [[40, 300], [40, 80], [200, 80], [200, 260], [400, 260], [400, 80], [600, 80], [600, 300]] },
    { name: "Five paints", colors: 5, n: 22, spd: 34, seed: 17, hop: [560, 280],
      pts: [[40, 180], [160, 60], [280, 180], [400, 60], [520, 180], [620, 80]] },
    { name: "Tight cut", colors: 4, n: 24, spd: 36, seed: 19, hop: [120, 200],
      pts: [[40, 40], [200, 40], [200, 160], [400, 160], [400, 40], [580, 40], [580, 300], [40, 300]] },
    { name: "Long weir", colors: 5, n: 26, spd: 36, seed: 23, hop: [320, 180],
      pts: [[30, 40], [600, 40], [600, 160], [40, 160], [40, 280], [620, 280]] },
    { name: "The last fall", colors: 5, n: 28, spd: 38, seed: 29, hop: [80, 200],
      pts: [[40, 300], [140, 60], [280, 300], [400, 60], [520, 300], [620, 80]] },
    { name: "Meadow cut", colors: 3, n: 18, spd: 30, seed: 31, hop: [320, 280],
      pts: [[40, 100], [180, 60], [320, 140], [480, 60], [620, 120]] },
    { name: "Bank hook", colors: 4, n: 20, spd: 32, seed: 37, hop: [80, 200],
      pts: [[40, 60], [400, 60], [400, 220], [80, 220], [80, 320], [620, 320]] },
    { name: "Willow bend", colors: 4, n: 22, spd: 33, seed: 41, hop: [560, 200],
      pts: [[40, 80], [200, 200], [360, 80], [520, 200], [620, 80]] },
    { name: "Mill race", colors: 5, n: 22, spd: 34, seed: 43, hop: [320, 40],
      pts: [[40, 300], [40, 80], [240, 80], [240, 240], [480, 240], [480, 80], [620, 80]] },
    { name: "Low sluice", colors: 4, n: 24, spd: 35, seed: 47, hop: [160, 280],
      pts: [[40, 40], [300, 40], [300, 180], [540, 180], [540, 60], [620, 60]] },
    { name: "Deep leat", colors: 5, n: 26, spd: 36, seed: 53, hop: [500, 280],
      pts: [[40, 180], [140, 60], [280, 180], [420, 60], [560, 180], [620, 80]] },
    { name: "Crowded cut", colors: 5, n: 28, spd: 37, seed: 59, hop: [100, 180],
      pts: [[40, 40], [200, 40], [200, 160], [420, 160], [420, 40], [600, 40], [600, 300], [40, 300]] },
    { name: "Master weir", colors: 5, n: 30, spd: 38, seed: 61, hop: [320, 200],
      pts: [[30, 40], [600, 40], [600, 160], [40, 160], [40, 280], [620, 280]] }
  ];

  var mode = "title", li = 0, path, acc, chain, shot, angle, cur, nxt, colors, spd, hop, score, over, won, rad = 14, gapT;

  function roll(n) { return 1 + Math.floor(Math.random() * n); }
  function buildChain(lv) {
    var rng = FF.rng(lv.seed), arr = [], t = 40;
    for (var i = 0; i < lv.n; i++) {
      var col = 1 + Math.floor(rng() * lv.colors);
      // avoid starting with 3 already matched
      if (i >= 2 && arr[i - 1].col === col && arr[i - 2].col === col) col = 1 + (col % lv.colors);
      arr.push({ t: t, col: col });
      t += rad * 2.05;
    }
    return arr;
  }
  function hud() { ui.setStat("left", String(chain.length)); ui.setStat("score", FF.n(score)); }
  function resolve() {
    var changed = true, chainN = 0;
    while (changed) {
      changed = false;
      chain.sort(function (a, b) { return a.t - b.t; });
      var i = 0;
      while (i < chain.length) {
        var j = i;
        while (j < chain.length && chain[j].col === chain[i].col) j++;
        if (j - i >= 3) {
          var removed = chain.splice(i, j - i);
          if (window.FFX) {
            removed.forEach(function (s) {
              var p = atT(path, acc, s.t), v = toView([p.x, p.y]);
              FFX.burst(v[0], v[1], COLS[(s.col - 1) % COLS.length], 10, { spd: 110, r: 2.6, kind: "spark", g: 80 });
            });
            FFX.kick(0.3, "#c8f0e0");
          }
          score += removed.length * 80 * (chainN + 1);
          // close gap: later spools (higher t) slide back? In a weir-bound chain, the FRONT (higher t, nearer weir) should fall back toward the rear if a gap opens behind them? Classic Zuma: the group after the gap (closer to start, lower t) stays, the front group backs up if same color to connect, otherwise a gap remains until they meet... Standard: all after the pop (higher t) get their t reduced so they pack against the previous.
          var end = i > 0 ? chain[i - 1].t + rad * 2.05 : 20;
          for (var k = i; k < chain.length; k++) {
            // pack later ones? chain is sorted by t, items at index >= i have higher t (nearer weir). Pull them back.
          }
          // repack entire chain from the back (lowest t) keeping spacing, BUT only collapse the gap we made, don't pull the rear forward.
          // After splice, item i (if any) should sit at end+spacing if it's further; if there's a gap, front group moves back until spacing is tight OR until it would go past weir... they fall back (decrease t).
          if (i < chain.length) {
            var target = (i > 0 ? chain[i - 1].t + rad * 2.05 : chain[i].t);
            var delta = chain[i].t - target;
            if (delta > 1) for (var k = i; k < chain.length; k++) chain[k].t -= delta;
          }
          changed = true; chainN++; S.pop();
          break;
        }
        i = j;
      }
    }
    hud();
    if (chain.length === 0) winLevel();
  }
  function fire() {
    if (shot || over || won) return;
    var spdB = 420;
    shot = { x: hop[0], y: hop[1], vx: Math.cos(angle) * spdB, vy: Math.sin(angle) * spdB, col: cur };
    cur = nxt; nxt = roll(colors); S.fire();
  }
  function insertAt(t, col) {
    chain.push({ t: t, col: col });
    chain.sort(function (a, b) { return a.t - b.t; });
    // separate overlaps
    for (var i = 1; i < chain.length; i++) {
      if (chain[i].t < chain[i - 1].t + rad * 2.05) {
        var d = chain[i - 1].t + rad * 2.05 - chain[i].t;
        for (var k = i; k < chain.length; k++) chain[k].t += d;
      }
    }
    resolve();
  }
  function winLevel() {
    if (won) return; won = true; ui.stop(); S.win();
    if (li + 2 > save.open) save.open = Math.min(COURSES.length, li + 2);
    if (score > save.hi) save.hi = score; ui.persist(); ui.runEnded();
    ui.menu({
      title: "The leat is clear",
      body: COURSES[li].name + " is empty of spools.",
      stats: '<b class="ff-score-xl">' + FF.n(score) + "</b>",
      buttons: li + 1 < COURSES.length
        ? [{ label: "Next cut", act: function () { play(li + 1); } }, { label: "Menu", small: true, act: toTitle }]
        : [{ label: "Menu", act: toTitle }]
    });
  }
  function loseLevel() {
    if (over || won) return; over = true; ui.stop(); S.lose(); ui.runEnded();
    ui.menu({
      title: "Over the weir",
      body: "A spool has gone over the lip.",
      buttons: [{ label: "Try again", act: function () { play(li); } }, { label: "Menu", small: true, act: toTitle }]
    });
  }
  function play(i) {
    li = i; var lv = COURSES[i];
    path = bezier(lv.pts); acc = plen(path); chain = buildChain(lv); colors = lv.colors; spd = lv.spd; hop = lv.hop.slice();
    shot = null; cur = roll(colors); nxt = roll(colors); score = 0; over = false; won = false;
    var best = path[0], bd = 1e9;
    for (var pi = 0; pi < path.length; pi++) {
      var d = Math.hypot(path[pi][0] - hop[0], path[pi][1] - hop[1]);
      if (d < bd && d > 40) { bd = d; best = path[pi]; }
    }
    angle = Math.atan2(best[1] - hop[1], best[0] - hop[0]);
    if (window.FFX) FFX.reset(); ui.setCourse((li + 1) + ". " + lv.name); hud(); mode = "play"; A.playSong(SONG); ui.go(); ui.showPads(true);
  }
  function toTitle() {
    ui.stop(); mode = "title"; A.playSong(SONG); ui.showPads(false); ui.setCourse("The leat");
    var open = save.open || 1;
    ui.menu({
      title: "SPOOLWEIR",
      body: "Painted wooden spools travel the mill leat toward the weir. Fire from the hopper on the bank and break runs of three or more of a colour.",
      stats: "<span>HIGH SCORE " + (save.hi ? FF.n(save.hi) : "-") + "</span><span>CUTS " + open + "/" + COURSES.length + "</span>",
      buttons: [{ label: "Play cut " + open, act: function () { play(Math.min(open, COURSES.length) - 1); } }],
      row: COURSES.map(function (lv, i) { return { label: String(i + 1), act: function () { play(i); }, disabled: i >= open }; }),
      help: ["Aim with left and right or by dragging. Fire with the button or a tap."],
      fine: "Forest Forge · original work. Mill-leat mood only.",
      app: true
    });
  }
  function toView(p) {
    return [p[0] / 640 * ui.VW, p[1] / 360 * ui.VH];
  }
  function hopV() { return toView(hop); }
  function onPointer(type, x, y) {
    if (mode !== "play") return;
    var h = hopV();
    if (type === "pointerdown" || type === "pointermove") angle = Math.atan2(y - h[1], x - h[0]);
    if (type === "pointerup" && Math.hypot(x - h[0], y - h[1]) < 36) fire();
  }
  var idleT = 0;
  function update(dt) {
    idleT += dt;
    if (window.FFX) FFX.step(dt);
    if (mode !== "play" || over || won) return;
    if (ui.down("L")) angle -= 2.4 * dt;
    if (ui.down("R")) angle += 2.4 * dt;
    if (ui.hit("F")) fire();
    var tot = acc[acc.length - 1];
    // advance toward weir (increase t)
    var lead = 0;
    for (var i = 0; i < chain.length; i++) {
      chain[i].t += spd * dt;
      if (i > 0 && chain[i].t < chain[i - 1].t + rad * 2.05) chain[i].t = chain[i - 1].t + rad * 2.05;
      if (chain[i].t > lead) lead = chain[i].t;
    }
    if (lead >= tot - 6) return loseLevel();
    if (shot) {
      // shot in view pixels, path in 640x360
      var sx = shot.x / 640 * ui.VW, sy = shot.y / 360 * ui.VH; // wait shot is stored in 640 space if hop is 640
      shot.x += shot.vx * dt; shot.y += shot.vy * dt;
      var vx = shot.x / 640 * ui.VW, vy = shot.y / 360 * ui.VH;
      if (shot.x < -20 || shot.x > 660 || shot.y < -20 || shot.y > 380) shot = null;
      else {
        var c = closestT(path, acc, shot.x, shot.y);
        if (c.d < rad * 1.6) { insertAt(c.t, shot.col); shot = null; }
      }
    }
  }
  function drawSpool(c, x, y, col, sc) {
    sc = sc || 1; var k = (col - 1) % COLS.length, r = rad * sc;
    c.fillStyle = "rgba(0,0,0,.2)"; c.beginPath(); c.ellipse(x, y + r * 0.7, r * 0.7, r * 0.22, 0, 0, Math.PI * 2); c.fill();
    if (window.FFX) {
      FFX.bevelCircle(c, x, y, r, "#6a4a28", "#3a2410", "#c8a060");
      FFX.bevelCircle(c, x, y, r * 0.72, COLS[k], COLS_DK[k], FFX.lighten(COLS[k], 0.35));
      c.beginPath(); c.arc(x, y, r * 0.16, 0, Math.PI * 2); c.fillStyle = "#3a2410"; c.fill();
      c.beginPath(); c.arc(x - r * 0.06, y - r * 0.06, r * 0.07, 0, Math.PI * 2); c.fillStyle = "rgba(255,255,240,.3)"; c.fill();
    } else {
      c.fillStyle = "#6a4a28"; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      c.fillStyle = COLS[k]; c.beginPath(); c.arc(x, y, r * 0.72, 0, Math.PI * 2); c.fill();
      c.strokeStyle = COLS_DK[k]; c.lineWidth = 2; c.stroke();
      c.fillStyle = "#3a2410"; c.beginPath(); c.arc(x, y, r * 0.16, 0, Math.PI * 2); c.fill();
    }
  }
  function render(c) {
    var W = ui.VW, H = ui.VH;
    var sh = window.FFX ? FFX.offset() : { x: 0, y: 0 };
    c.save(); c.translate(sh.x, sh.y);
    if (window.FFX) FFX.sky(c, W, H, "#b8e0c8", "#8ec8a0", "#2a5a40");
    else {
      var g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#8ec8a0"); g.addColorStop(1, "#2a5a40");
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    }
    // far bank and reeds
    c.fillStyle = "#3a6a40";
    c.beginPath(); c.moveTo(0, H * 0.82);
    for (var i = 0; i <= 12; i++) c.lineTo(W * i / 12, H * 0.78 - (i % 3) * 10);
    c.lineTo(W, H); c.lineTo(0, H); c.fill();
    if (path) {
      c.lineCap = "round"; c.lineJoin = "round";
      c.strokeStyle = "#2a4a38"; c.lineWidth = rad * 3.1 * (W / 640);
      c.beginPath();
      path.forEach(function (p, i) { var v = toView(p); if (i) c.lineTo(v[0], v[1]); else c.moveTo(v[0], v[1]); });
      c.stroke();
      var water = c.createLinearGradient(0, 0, 0, H);
      water.addColorStop(0, "#7ec8d8"); water.addColorStop(1, "#3a7a88");
      c.strokeStyle = water; c.lineWidth = rad * 2.15 * (W / 640);
      c.beginPath();
      path.forEach(function (p, i) { var v = toView(p); if (i) c.lineTo(v[0], v[1]); else c.moveTo(v[0], v[1]); });
      c.stroke();
      // highlight streak on the water
      c.strokeStyle = "rgba(220,255,255,.28)"; c.lineWidth = rad * 0.45 * (W / 640);
      c.beginPath();
      path.forEach(function (p, i) { var v = toView(p); if (i) c.lineTo(v[0], v[1] - 3); else c.moveTo(v[0], v[1] - 3); });
      c.stroke();
      var end = toView(path[path.length - 1]);
      if (window.FFX) FFX.bevelRoundRect(c, end[0] - 12, end[1] - 18, 24, 36, 3, "#d0d8e0", "#6a7078");
      else { c.fillStyle = "#c8d0d8"; c.fillRect(end[0] - 10, end[1] - 16, 20, 32); }
      chain.forEach(function (s) { var p = atT(path, acc, s.t), v = toView([p.x, p.y]); drawSpool(c, v[0], v[1], s.col, W / 640); });
      var h = hopV();
      if (window.FFX) FFX.bevelRoundRect(c, h[0] - 18, h[1] - 12, 36, 26, 6, "#6a4a20", "#3a2410");
      else { c.fillStyle = "#5a3a18"; c.fillRect(h[0] - 16, h[1] - 10, 32, 22); }
      c.strokeStyle = "rgba(255,255,220,.7)"; c.lineWidth = 2;
      c.beginPath(); c.moveTo(h[0], h[1]); c.lineTo(h[0] + Math.cos(angle) * 50, h[1] + Math.sin(angle) * 50); c.stroke();
      c.fillStyle = "rgba(255,255,220,.4)";
      for (var i = 1; i < 5; i++) { c.beginPath(); c.arc(h[0] + Math.cos(angle) * 12 * i, h[1] + Math.sin(angle) * 12 * i, 2, 0, Math.PI * 2); c.fill(); }
      if (cur) drawSpool(c, h[0], h[1], cur, W / 640);
      if (nxt) drawSpool(c, h[0] + 36, h[1] + 18, nxt, 0.7 * W / 640);
      if (shot) { var v = toView([shot.x, shot.y]); drawSpool(c, v[0], v[1], shot.col, W / 640); }
    }
    if (window.FFX) { FFX.vignette(c, W, H, 0.28); FFX.draw(c); }
    c.restore();
  }
  var game = {
    toTitle: toTitle, update: update, render: render, onPointer: onPointer,
    onBack: function () { if (mode === "title") return "exit"; toTitle(); return "menu"; },
    play: play,
    qa: {
      play: play,
      clearAll: function () { chain = []; hud(); winLevel(); },
      fire: fire,
      state: function () { return { mode: mode, level: li + 1, n: chain ? chain.length : 0, score: score, over: over, won: won }; }
    }
  };
  ui.onAdsRemoved = function () { if (mode === "title") toTitle(); };
  ui.start(game);
})();
