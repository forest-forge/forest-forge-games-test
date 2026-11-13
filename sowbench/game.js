/* Sowbench (Forest Forge). Seed cakes drop onto a potting tray. When three or
 * more of a seed touch — in any connected shape, not only a straight line —
 * they lift out, and so do any husks in the group. No pills, no viruses, no
 * bottle well, no four-in-a-row rule. */
(function () {
  "use strict";
  (function applyChrome(css) {
    var s = document.createElement("style"); s.id = "ff-palette"; s.textContent = css;
    document.head.appendChild(s);
    var m = document.querySelector('meta[name="theme-color"]');
    var bg = /--bg:([^;}]+)/.exec(css); if (m && bg) m.setAttribute("content", bg[1].trim());
  })(`:root{--bg:#3aa83a;--sky1:#c8f05a;--sky2:#3ac8a0;--water:#2a8a2a;--amber:#ffffff;--amber-hi:#ffe84a;--amber-soft:#ffffff;--amber-line:#ff5a3a;--ember:#1a6a1a;--btn:#2a982a;--lamp:#fff6d8;--pop1:#ffe14a;--pop2:#ff6a4a;--pop3:#ffffff;--glow-line:rgba(255,255,255,.55);--glow-fill:rgba(255,255,255,.14)}`);

  var COLS = 8, ROWS = 12;
  var SEED = ["#d45a2a", "#e0b02a", "#3a8a48", "#7a4a28"];
  var SEED_DK = ["#9a3010", "#a88010", "#246030", "#4a2c14"];
  var ui = FF.create({
    deco: ["leaf", "flower", "drop"], 
    id: "sowbench", title: "Sowbench", course: "The tray", view: { w: 390, h: 720, flex: true },
    stats: [{ id: "husk", label: "Husks", value: "-" }, { id: "score", label: "Score", value: "0" }],
    pads: {
      left: [{ id: "L", icon: "left", aria: "Left", keys: ["ArrowLeft", "KeyA"] }, { id: "R", icon: "right", aria: "Right", keys: ["ArrowRight", "KeyD"] }],
      right: [{ id: "ROT", label: "Turn", aria: "Turn", keys: ["ArrowUp", "KeyW", "KeyX"] }, { id: "DROP", label: "Drop", cls: "big", aria: "Drop", keys: ["ArrowDown", "KeyS", "Space"] }]
    }
  });
  var A = ui.audio, save = ui.save;
  save.hi = save.hi || 0; save.open = save.open || 1;
  var S = {
    move: function () { if (A.sfxOk()) A.tone({ f: 360, dur: 0.03, type: "triangle", gain: 0.04 }); },
    rot: function () { A.tone({ f: 500, f2: 640, dur: 0.05, type: "square", gain: 0.04 }); },
    lock: function () { A.noise({ dur: 0.05, gain: 0.05, freq: 220, filter: "lowpass" }); },
    clear: function () { A.tone({ f: 620, f2: 880, dur: 0.1, type: "triangle", gain: 0.07 }); },
    win: function () { [392, 523, 659, 784].forEach(function (f, i) { A.tone({ f: f, dur: 0.1, type: "triangle", gain: 0.08, delay: i * 0.08 }); }); },
    lose: function () { [262, 196, 147].forEach(function (f, i) { A.tone({ f: f, dur: 0.14, type: "square", gain: 0.07, delay: i * 0.1 }); }); }
  };
  var SONG = { bpm: 108, order: [0, 0, 1], parts: [[
    { wave: "triangle", gain: 0.04, pat: "C4 . E4 . G4 E4 C4 . D4 . F4 . A4 F4 D4 . E4 G4 C5 G4 B3 . C4 ." },
    { wave: "sine", gain: 0.03, pat: "C3 . . . G2 . . . F2 . . . C3 . . . G2 . . . D3 . . . C3 . . . G2 ." }
  ], [
    { wave: "triangle", gain: 0.04, pat: "A3 . C4 . E4 C4 A3 . B3 . D4 . F#4 D4 B3 . A3 C4 E4 C4 G3 . A3 ." },
    { wave: "sine", gain: 0.03, pat: "A2 . . . E2 . . . G2 . . . D3 . . . A2 . . . E2 . . . A2 . . . E2 ." }
  ]] };

  // pieces: list of [x,y,colorIndex relative] templates, colors assigned at spawn
  // 1-block, 2-block (domino), 3-block L (tromino). Never a 4-block.
  var SHAPES = [
    [[0, 0]],
    [[0, 0], [1, 0]],
    [[0, 0], [0, 1]],
    [[0, 0], [1, 0], [0, 1]],
    [[0, 0], [1, 0], [1, 1]]
  ];
  var LEVELS = [
    { name: "First tray", colors: 3, husks: 8, seed: 5 },
    { name: "Mustard row", colors: 3, husks: 10, seed: 11 },
    { name: "Clay and leaf", colors: 3, husks: 12, seed: 19 },
    { name: "Four seeds", colors: 4, husks: 12, seed: 29 },
    { name: "Crowded bench", colors: 3, husks: 16, seed: 31 },
    { name: "Deep tray", colors: 4, husks: 16, seed: 43 },
    { name: "Mixed sow", colors: 4, husks: 18, seed: 47 },
    { name: "Tight compost", colors: 4, husks: 20, seed: 59 },
    { name: "Late husks", colors: 4, husks: 22, seed: 61 },
    { name: "The last rake", colors: 4, husks: 24, seed: 73 },
    { name: "Spring tray", colors: 3, husks: 10, seed: 79 },
    { name: "Leaf and clay", colors: 3, husks: 14, seed: 83 },
    { name: "Four again", colors: 4, husks: 14, seed: 89 },
    { name: "Busy bench", colors: 3, husks: 18, seed: 97 },
    { name: "Deep compost", colors: 4, husks: 18, seed: 101 },
    { name: "Mixed rake", colors: 4, husks: 20, seed: 107 },
    { name: "Crowded soil", colors: 4, husks: 22, seed: 109 },
    { name: "Late sow", colors: 4, husks: 24, seed: 113 },
    { name: "Full tray", colors: 4, husks: 26, seed: 127 },
    { name: "Master bench", colors: 4, husks: 28, seed: 131 }
  ];

  var mode = "title", li = 0, grid, piece, nxt, tick, interval, score, colors, over, won, das;

  function emptyGrid() {
    var g = [];
    for (var r = 0; r < ROWS; r++) { var row = []; for (var c = 0; c < COLS; c++) row.push(0); g.push(row); }
    return g;
  }
  function huskCount() {
    var n = 0; for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (grid[r][c] < 0) n++;
    return n;
  }
  function hud() { ui.setStat("husk", String(huskCount())); ui.setStat("score", FF.n(score)); }
  function at(c, r) { if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return 99; return grid[r][c]; }
  function colorOf(v) { return Math.abs(v); } // husks stored as negative colour
  function pieceOk(p, dc, dr, rot) {
    var cells = cellsOf(p, dc, dr, rot);
    for (var i = 0; i < cells.length; i++) {
      var c = cells[i][0], r = cells[i][1];
      if (c < 0 || c >= COLS || r >= ROWS) return false;
      if (r >= 0 && grid[r][c]) return false;
    }
    return true;
  }
  function cellsOf(p, dc, dr, rot) {
    var sh = p.shape, rotn = (rot == null ? p.rot : rot);
    var out = [];
    for (var i = 0; i < sh.length; i++) {
      var x = sh[i][0], y = sh[i][1];
      for (var k = 0; k < rotn; k++) { var t = x; x = -y; y = t; }
      out.push([(dc == null ? p.c : dc) + x, (dr == null ? p.r : dr) + y, p.cols[i]]);
    }
    return out;
  }
  function roll(ncolors) {
    var sh = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    var cols = [];
    var base = 1 + Math.floor(Math.random() * ncolors);
    for (var i = 0; i < sh.length; i++) cols.push(Math.random() < 0.45 ? 1 + Math.floor(Math.random() * ncolors) : base);
    return { shape: sh, cols: cols, c: Math.floor(COLS / 2) - 1, r: 0, rot: 0 };
  }
  function spawn() {
    piece = nxt || roll(colors);
    nxt = roll(colors);
    piece.c = Math.floor(COLS / 2) - 1; piece.r = 0; piece.rot = 0;
    if (!pieceOk(piece)) { over = true; loseLevel(); }
  }
  function lock() {
    cellsOf(piece).forEach(function (cell) {
      if (cell[1] >= 0) grid[cell[1]][cell[0]] = cell[2];
    });
    S.lock(); piece = null;
    resolve();
    if (!over && !won) spawn();
  }
  function resolve() {
    var moved = true, chain = 0;
    while (moved) {
      moved = false;
      var seen = {}, clear = {};
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (grid[r][c] && !seen[c + "," + r]) {
        var col = colorOf(grid[r][c]), stack = [[c, r]], group = [];
        seen[c + "," + r] = 1;
        while (stack.length) {
          var p = stack.pop(); group.push(p);
          [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
            var nc = p[0] + d[0], nr = p[1] + d[1], k = nc + "," + nr;
            if (nc >= 0 && nr >= 0 && nc < COLS && nr < ROWS && !seen[k] && grid[nr][nc] && colorOf(grid[nr][nc]) === col) {
              seen[k] = 1; stack.push([nc, nr]);
            }
          });
        }
        if (group.length >= 3) group.forEach(function (p) { clear[p[0] + "," + p[1]] = 1; });
      }
      var n = Object.keys(clear).length;
      if (n) {
        Object.keys(clear).forEach(function (k) {
          var p = k.split(","), Lx = layout(), val = grid[+p[1]][+p[0]];
          if (window.FFX) FFX.burst(Lx.ox + (+p[0] + 0.5) * Lx.s, Lx.oy + (+p[1] + 0.5) * Lx.s, val < 0 ? "#8a6a40" : SEED[(Math.abs(val) - 1) % SEED.length], 8, { spd: 90, r: 2.4, kind: "fluff", g: 120 });
          grid[+p[1]][+p[0]] = 0;
        });
        chain++; score += n * 70 * chain; S.clear(); moved = true;
        if (window.FFX) FFX.kick(0.28, "#e8f0b0");
        // gravity
        for (var c = 0; c < COLS; c++) {
          var stack = [];
          for (var r = ROWS - 1; r >= 0; r--) if (grid[r][c]) stack.push(grid[r][c]);
          for (var r = ROWS - 1; r >= 0; r--) grid[r][c] = stack[ROWS - 1 - r] || 0;
        }
      }
    }
    hud();
    if (huskCount() === 0) winLevel();
  }
  function winLevel() {
    if (won) return; won = true; ui.stop(); S.win();
    if (li + 2 > save.open) save.open = Math.min(LEVELS.length, li + 2);
    if (score > save.hi) save.hi = score; ui.persist(); ui.runEnded();
    ui.menu({
      title: "Tray cleared",
      body: "Every husk is off " + LEVELS[li].name + ".",
      stats: '<b class="ff-score-xl">' + FF.n(score) + "</b>",
      buttons: li + 1 < LEVELS.length
        ? [{ label: "Next tray", act: function () { play(li + 1); } }, { label: "Menu", small: true, act: toTitle }]
        : [{ label: "Menu", act: toTitle }]
    });
  }
  function loseLevel() {
    ui.stop(); S.lose(); ui.runEnded();
    ui.menu({
      title: "The tray is full",
      body: "No room left to drop another cake.",
      buttons: [{ label: "Try again", act: function () { play(li); } }, { label: "Menu", small: true, act: toTitle }]
    });
  }
  function play(i) {
    li = i; var lv = LEVELS[i]; colors = lv.colors;
    grid = emptyGrid();
    var rng = FF.rng(lv.seed), placed = 0, guard = 0;
    while (placed < lv.husks && guard++ < 400) {
      var c = Math.floor(rng() * COLS), r = 4 + Math.floor(rng() * (ROWS - 4));
      if (!grid[r][c]) { grid[r][c] = -(1 + Math.floor(rng() * colors)); placed++; }
    }
    piece = null; nxt = roll(colors); tick = 0; interval = 0.7; score = 0; over = false; won = false; das = {};
    spawn(); ui.setCourse((i + 1) + ". " + lv.name); hud(); mode = "play"; A.playSong(SONG); ui.go(); ui.showPads(true);
  }
  function toTitle() {
    ui.stop(); mode = "title"; A.playSong(SONG); ui.showPads(false); ui.setCourse("The tray");
    var open = save.open || 1;
    ui.menu({
      title: "SOWBENCH",
      body: "Drop seed cakes on the potting tray. Three or more of a seed that touch — in any shape — come off, husks and all.",
      stats: "<span>HIGH SCORE " + (save.hi ? FF.n(save.hi) : "-") + "</span><span>TRAYS " + open + "/" + LEVELS.length + "</span>",
      buttons: [{ label: "Play tray " + open, act: function () { play(Math.min(open, LEVELS.length) - 1); } }],
      row: LEVELS.map(function (lv, i) { return { label: String(i + 1), act: function () { play(i); }, disabled: i >= open }; }),
      help: ["Left and right move, Turn rotates, Drop sets it down.", "Husks are the dried cases already on the tray."],
      fine: "Forest Forge · original work. Potting-bench mood only — not medicine.",
      app: true
    });
  }
  var idleT = 0;
  function update(dt) {
    idleT += dt;
    if (window.FFX) FFX.step(dt);
    if (mode !== "play" || over || won || !piece) return;
    function hold(id, fn, first, repeat) {
      if (ui.hit(id)) { fn(); das[id] = first; }
      else if (ui.down(id)) { das[id] = (das[id] || 0) - dt; if (das[id] <= 0) { fn(); das[id] = repeat; } }
      else das[id] = 0;
    }
    hold("L", function () { if (pieceOk(piece, piece.c - 1, piece.r)) { piece.c--; S.move(); } }, 0.16, 0.07);
    hold("R", function () { if (pieceOk(piece, piece.c + 1, piece.r)) { piece.c++; S.move(); } }, 0.16, 0.07);
    if (ui.hit("ROT")) { var nr = (piece.rot + 1) % 4; if (pieceOk(piece, piece.c, piece.r, nr)) { piece.rot = nr; S.rot(); } }
    var soft = ui.down("DROP");
    if (ui.hit("DROP") && !soft) { /* space is drop key, treated as hold too */ }
    tick += dt;
    var step = soft ? 0.04 : interval;
    if (tick >= step) {
      tick = 0;
      if (pieceOk(piece, piece.c, piece.r + 1)) piece.r++;
      else lock();
    }
    interval = Math.max(0.28, 0.7 - li * 0.03);
  }
  function layout() {
    var top = 20, bot = 110, pad = 28;
    var s = Math.min((ui.VW - pad * 2) / COLS, (ui.VH - top - bot) / ROWS);
    return { s: s, ox: (ui.VW - s * COLS) / 2, oy: top };
  }
  function onPointer(type, x, y) {
    if (mode !== "play" || !piece) return;
    var L = layout();
    if (type === "pointerdown") {
      if (y < L.oy + piece.r * L.s) { var nr = (piece.rot + 1) % 4; if (pieceOk(piece, piece.c, piece.r, nr)) { piece.rot = nr; S.rot(); } }
      else if (x < ui.VW / 2) { if (pieceOk(piece, piece.c - 1, piece.r)) { piece.c--; S.move(); } }
      else { if (pieceOk(piece, piece.c + 1, piece.r)) { piece.c++; S.move(); } }
    }
  }
  function drawCake(c, x, y, s, val) {
    var husk = val < 0, col = colorOf(val), k = (col - 1) % SEED.length;
    var pad = 2;
    if (window.FFX) {
      FFX.bevelRoundRect(c, x + pad, y + pad, s - pad * 2, s - pad * 2, 5, husk ? "#8a6a40" : SEED[k], husk ? "#5a4020" : SEED_DK[k]);
    } else {
      c.fillStyle = husk ? "#8a6a40" : SEED[k];
      c.fillRect(x + pad, y + pad, s - pad * 2, s - pad * 2);
      c.strokeStyle = husk ? "#5a4020" : SEED_DK[k]; c.lineWidth = 2;
      c.strokeRect(x + pad, y + pad, s - pad * 2, s - pad * 2);
    }
    var cx = x + s / 2, cy = y + s / 2;
    c.fillStyle = husk ? "#3a2a14" : "rgba(40,20,10,.45)";
    if (k === 0) { c.beginPath(); c.arc(cx, cy, s * 0.12, 0, Math.PI * 2); c.fill(); }
    else if (k === 1) { c.fillRect(cx - s * 0.18, cy - 2, s * 0.36, 4); }
    else if (k === 2) { c.beginPath(); c.moveTo(cx, cy + s * 0.16); c.quadraticCurveTo(cx - s * 0.2, cy, cx, cy - s * 0.18); c.quadraticCurveTo(cx + s * 0.2, cy, cx, cy + s * 0.16); c.fill(); }
    else { c.fillRect(cx - 2, cy - s * 0.16, 4, s * 0.32); }
    if (husk) {
      c.strokeStyle = "#3a2a14"; c.lineWidth = 2; c.beginPath();
      c.moveTo(x + 6, y + 6); c.lineTo(x + s - 6, y + s - 6); c.stroke();
    }
  }
  function render(c) {
    var W = ui.VW, H = ui.VH, L = layout();
    var sh = window.FFX ? FFX.offset() : { x: 0, y: 0 };
    c.save(); c.translate(sh.x, sh.y);
    if (window.FFX) FFX.sky(c, W, H, "#e8ff9a", "#b8e86a", "#3aa86a");
    else {
      var g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#b8d078"); g.addColorStop(1, "#5a6a30");
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    }
    // leaves
    c.fillStyle = "rgba(40,70,20,.18)";
    for (var i = 0; i < 8; i++) { c.beginPath(); c.ellipse((i * 97 + 20) % W, (i * 53 + 40) % H, 18, 8, i, 0, Math.PI * 2); c.fill(); }
    if (window.FFX) {
      FFX.bevelRoundRect(c, L.ox - 14, L.oy - 10, L.s * COLS + 28, L.s * ROWS + 20, 8, "#8a5a28", "#4a3010");
      FFX.bevelRoundRect(c, L.ox - 4, L.oy, L.s * COLS + 8, L.s * ROWS, 3, "#5a3a14", "#2a1808");
    } else {
      c.fillStyle = "#8a5a28"; c.fillRect(L.ox - 12, L.oy - 8, L.s * COLS + 24, L.s * ROWS + 16);
      c.fillStyle = "#5a3a14"; c.fillRect(L.ox - 4, L.oy, L.s * COLS + 8, L.s * ROWS);
    }
    if (grid) {
      for (var r = 0; r < ROWS; r++) for (var col = 0; col < COLS; col++) {
        var x = L.ox + col * L.s, y = L.oy + r * L.s;
        c.fillStyle = (r + col) % 2 ? "#c4a06a" : "#b89058";
        c.fillRect(x, y, L.s, L.s);
        if (grid[r][col]) drawCake(c, x, y, L.s, grid[r][col]);
      }
    }
    if (piece) cellsOf(piece).forEach(function (cell) {
      if (cell[1] >= 0) drawCake(c, L.ox + cell[0] * L.s, L.oy + cell[1] * L.s, L.s, cell[2]);
    });
    if (nxt) {
      var nx = L.ox, ny = L.oy + L.s * ROWS + 20;
      if (window.FFX) FFX.bevelRoundRect(c, nx - 6, ny - 14, 130, 44, 6, "#6a4a20", "#3a2810");
      ui.text("NEXT", nx, ny, 11, "#f0e8c8", "left");
      nxt.shape.forEach(function (p, i) {
        drawCake(c, nx + 50 + p[0] * 20, ny - 8 + p[1] * 20, 20, nxt.cols[i]);
      });
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
      clearHusks: function () { for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (grid[r][c] < 0) grid[r][c] = 0; hud(); winLevel(); },
      drop: function () { if (!piece) return; while (pieceOk(piece, piece.c, piece.r + 1)) piece.r++; lock(); },
      state: function () { return { mode: mode, level: li + 1, husks: grid ? huskCount() : 0, score: score, over: over, won: won }; }
    }
  };
  ui.onAdsRemoved = function () { if (mode === "title") toTitle(); };
  ui.start(game);
})();
