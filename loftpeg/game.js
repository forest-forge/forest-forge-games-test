/* Loftpeg (Forest Forge). A loft full of painted wooden pegs hanging from the
 * rafters. Toss a peg, bounce it off the walls, and stick it. Three or more of
 * a colour that touch will drop, and any cluster no longer hung from a rafter
 * falls with them. No bubbles, no dragons. */
(function () {
  "use strict";
  (function applyChrome(css) {
    var s = document.createElement("style"); s.id = "ff-palette"; s.textContent = css;
    document.head.appendChild(s);
    var m = document.querySelector('meta[name="theme-color"]');
    var bg = /--bg:([^;}]+)/.exec(css); if (m && bg) m.setAttribute("content", bg[1].trim());
  })(`:root{--bg:#2a7ae8;--sky1:#8ad8ff;--sky2:#ff8ac8;--water:#1a60c8;--amber:#ffffff;--amber-hi:#fff27a;--amber-soft:#ffffff;--amber-line:#ff4a8a;--ember:#1a3aa0;--btn:#2a68d0;--lamp:#fff6d8;--pop1:#ffe14a;--pop2:#ff6aa8;--pop3:#5af0b0;--glow-line:rgba(255,255,255,.55);--glow-fill:rgba(255,255,255,.14)}`);

  var COLS = 8, ROWS = 12, COLORS = 5;
  var PEG = ["#2a9aaa", "#e0a020", "#c43a28", "#4a7ad0", "#8a3a88"];
  var PEG_DK = ["#1a6a78", "#a87810", "#8a2010", "#2a4a98", "#5a2060"];
  var ui = FF.create({
    deco: ["circle", "star", "spark"], 
    id: "loftpeg", title: "Loftpeg", course: "The loft", view: { w: 390, h: 720, flex: true },
    stats: [{ id: "left", label: "Pegs", value: "-" }, { id: "shots", label: "Tosses", value: "0" }],
    pads: {
      left: [{ id: "L", icon: "left", aria: "Aim left", keys: ["ArrowLeft", "KeyA"] }, { id: "R", icon: "right", aria: "Aim right", keys: ["ArrowRight", "KeyD"] }],
      right: [{ id: "F", label: "Toss", cls: "big", aria: "Toss", keys: ["Space", "ArrowUp", "KeyW"] }]
    }
  });
  var A = ui.audio, save = ui.save;
  save.hi = save.hi || 0; save.open = save.open || 1;

  var S = {
    toss: function () { A.tone({ f: 300, f2: 520, dur: 0.08, type: "square", gain: 0.05 }); },
    stick: function () { A.noise({ dur: 0.06, gain: 0.06, freq: 400, filter: "lowpass" }); },
    pop: function () { A.tone({ f: 700, f2: 420, dur: 0.09, type: "triangle", gain: 0.07 }); },
    fall: function () { A.tone({ f: 240, f2: 140, dur: 0.12, type: "sine", gain: 0.05 }); },
    win: function () { [392, 523, 659, 784, 1047].forEach(function (f, i) { A.tone({ f: f, dur: 0.09, type: "triangle", gain: 0.08, delay: i * 0.08 }); }); },
    lose: function () { [330, 247, 185].forEach(function (f, i) { A.tone({ f: f, dur: 0.14, type: "square", gain: 0.07, delay: i * 0.1 }); }); }
  };
  var SONG = { bpm: 118, order: [0, 0, 1], parts: [[
    { wave: "square", gain: 0.035, pat: "G4 . B4 . D5 B4 G4 . A4 . C5 . E5 C5 A4 . G4 B4 D5 B4 F#4 . G4 ." },
    { wave: "triangle", gain: 0.03, pat: "G2 . . . D3 . . . C3 . . . G2 . . . D3 . . . A2 . . . G2 . . . D3 ." }
  ], [
    { wave: "square", gain: 0.035, pat: "E4 . G4 . B4 G4 E4 . F#4 . A4 . C#5 A4 F#4 . E4 G4 B4 G4 D4 . E4 ." },
    { wave: "triangle", gain: 0.03, pat: "E2 . . . B2 . . . A2 . . . E2 . . . B2 . . . F#2 . . . E2 . . . B2 ." }
  ]] };

  // 10 loft starting patterns: rows of colour indices 1-5, 0 empty. Even rows 8 cols, odd 7 (offset).
  function pattern(n, colors, density, seed) {
    var rng = FF.rng(seed), rows = [];
    var startRows = 4 + (n % 3);
    for (var r = 0; r < ROWS; r++) {
      var row = [], cols = (r % 2 ? COLS - 1 : COLS);
      for (var c = 0; c < cols; c++) {
        row.push(r < startRows && rng() < density ? 1 + Math.floor(rng() * colors) : 0);
      }
      rows.push(row);
    }
    // guarantee every used colour appears, and the ceiling row is fairly full
    for (var c = 0; c < COLS; c++) if (!rows[0][c]) rows[0][c] = 1 + (c % colors);
    return rows;
  }
  var LEVELS = [
    { name: "First rail", colors: 3, dens: 0.7, seed: 11, dropEvery: 8 },
    { name: "Mustard and teal", colors: 3, dens: 0.75, seed: 23, dropEvery: 8 },
    { name: "Four paints", colors: 4, dens: 0.75, seed: 37, dropEvery: 7 },
    { name: "Crowded eaves", colors: 4, dens: 0.85, seed: 41, dropEvery: 7 },
    { name: "The fifth tin", colors: 5, dens: 0.75, seed: 53, dropEvery: 7 },
    { name: "Low hatch", colors: 4, dens: 0.8, seed: 67, dropEvery: 6 },
    { name: "Patchwork", colors: 5, dens: 0.85, seed: 71, dropEvery: 6 },
    { name: "Tight loft", colors: 5, dens: 0.9, seed: 83, dropEvery: 6 },
    { name: "Rafter jam", colors: 5, dens: 0.9, seed: 97, dropEvery: 5 },
    { name: "Last beam", colors: 5, dens: 0.95, seed: 101, dropEvery: 5 },
    { name: "Dawn rail", colors: 3, dens: 0.8, seed: 107, dropEvery: 7 },
    { name: "Brick and plum", colors: 4, dens: 0.82, seed: 113, dropEvery: 7 },
    { name: "Slant eaves", colors: 4, dens: 0.88, seed: 127, dropEvery: 6 },
    { name: "Thick paint", colors: 5, dens: 0.85, seed: 131, dropEvery: 6 },
    { name: "Low window", colors: 5, dens: 0.88, seed: 139, dropEvery: 6 },
    { name: "Packed hatch", colors: 5, dens: 0.92, seed: 149, dropEvery: 5 },
    { name: "Old beam", colors: 5, dens: 0.9, seed: 151, dropEvery: 5 },
    { name: "Crowded eave", colors: 5, dens: 0.94, seed: 163, dropEvery: 5 },
    { name: "Narrow loft", colors: 5, dens: 0.95, seed: 167, dropEvery: 5 },
    { name: "Master rafter", colors: 5, dens: 0.97, seed: 173, dropEvery: 4 }
  ];

  var mode = "title", li = 0, grid, angle, shot, nextCol, curCol, shots, score, dropT, colors, over, won, falling;

  function colsIn(r) { return r % 2 ? COLS - 1 : COLS; }
  function nbs(c, r) {
    var odd = r % 2, list = [[c - 1, r], [c + 1, r]];
    // offset rows: odd rows are shifted right by half
    var a = odd ? c : c - 1, b = odd ? c + 1 : c;
    list.push([a, r - 1], [b, r - 1], [a, r + 1], [b, r + 1]);
    return list.filter(function (p) { return p[1] >= 0 && p[1] < ROWS && p[0] >= 0 && p[0] < colsIn(p[1]); });
  }
  function layout() {
    var top = 36, bot = 120, pad = 18;
    var w = ui.VW - pad * 2;
    var s = Math.min(w / (COLS + 0.5), (ui.VH - top - bot) / (ROWS * 0.86));
    return { s: s, ox: pad + s * 0.5, oy: top, w: w, pad: pad };
  }
  function cellPos(c, r, L) {
    return { x: L.ox + (c + (r % 2 ? 0.5 : 0)) * L.s, y: L.oy + r * L.s * 0.86 };
  }
  function nearestEmpty(x, y, L) {
    var best = null, bd = 1e9;
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < colsIn(r); c++) if (!grid[r][c]) {
      var p = cellPos(c, r, L), d = Math.hypot(p.x - x, p.y - y);
      if (d < bd) { bd = d; best = [c, r]; }
    }
    return best;
  }
  function countPegs() {
    var n = 0; for (var r = 0; r < ROWS; r++) for (var c = 0; c < colsIn(r); c++) if (grid[r][c]) n++;
    return n;
  }
  function hud() { ui.setStat("left", String(countPegs())); ui.setStat("shots", String(shots)); }

  function flood(c, r) {
    var col = grid[r][c], seen = {}, stack = [[c, r]], out = [];
    seen[c + "," + r] = 1;
    while (stack.length) {
      var p = stack.pop(); out.push(p);
      nbs(p[0], p[1]).forEach(function (q) {
        var k = q[0] + "," + q[1];
        if (!seen[k] && grid[q[1]][q[0]] === col) { seen[k] = 1; stack.push(q); }
      });
    }
    return out;
  }
  function hung() {
    var mark = {}, stack = [];
    for (var c = 0; c < colsIn(0); c++) if (grid[0][c]) { mark[c + ",0"] = 1; stack.push([c, 0]); }
    while (stack.length) {
      var p = stack.pop();
      nbs(p[0], p[1]).forEach(function (q) {
        var k = q[0] + "," + q[1];
        if (!mark[k] && grid[q[1]][q[0]]) { mark[k] = 1; stack.push(q); }
      });
    }
    return mark;
  }
  function resolve() {
    // find all colour groups of 3+ just after a stick — we only pop groups that include the new peg? Standard: any 3+ of the colour of the new peg, then floating.
    // Safer: pop every group of 3+ same colour (shouldn't happen except around the new peg).
    var seen = {}, popped = 0;
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < colsIn(r); c++) if (grid[r][c] && !seen[c + "," + r]) {
      var g = flood(c, r);
      g.forEach(function (p) { seen[p[0] + "," + p[1]] = 1; });
      if (g.length >= 3) {
        g.forEach(function (p) {
          if (window.FFX) {
            var Lx = layout(), q = cellPos(p[0], p[1], Lx);
            FFX.burst(q.x, q.y, PEG[(grid[p[1]][p[0]] - 1) % PEG.length], 10, { spd: 100, r: 2.6, kind: "spark", g: 180 });
          }
          grid[p[1]][p[0]] = 0;
        });
        popped += g.length;
      }
    }
    if (popped) { S.pop(); score += popped * 80; if (window.FFX) FFX.kick(0.35, "#ffe8b0"); }
    var hang = hung(), fell = 0;
    falling = [];
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < colsIn(r); c++) if (grid[r][c] && !hang[c + "," + r]) {
      var L = layout(), p = cellPos(c, r, L);
      falling.push({ x: p.x, y: p.y, col: grid[r][c], vy: 0 });
      grid[r][c] = 0; fell++;
    }
    if (fell) { S.fall(); score += fell * 40; }
    hud();
    if (countPegs() === 0) winLevel();
  }
  function addRail() {
    // shift down, new row at 0
    for (var r = ROWS - 1; r > 0; r--) {
      var next = [];
      for (var c = 0; c < colsIn(r); c++) {
        // after shift, odd/even parity changes! Shifting rows changes offset.
        // Simpler: insert a full even row at top and bump everything's row +1, accepting parity flip of colours.
        next[c] = (c < colsIn(r - 1)) ? grid[r - 1][c] : 0;
      }
      // When row parity flips, cols change (8 vs 7). Map by position.
      grid[r] = next;
    }
    // rebuild properly: take a snapshot of positions and re-snap? Too heavy.
    // Instead: push every existing peg one row down in the same visual x (adjust col for parity).
    // I'll rebuild from a list of pegs.
  }
  // rewrite addRail more carefully
  addRail = function () {
    var L = layout(), pegs = [];
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < colsIn(r); c++) if (grid[r][c]) {
      var p = cellPos(c, r, L);
      pegs.push({ x: p.x, y: p.y + L.s * 0.86, col: grid[r][c] });
    }
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < colsIn(r); c++) grid[r][c] = 0;
    // new ceiling row
    for (var c = 0; c < COLS; c++) grid[0][c] = 1 + Math.floor(Math.random() * colors);
    pegs.forEach(function (pg) {
      var slot = nearestEmpty(pg.x, pg.y, L);
      if (slot) grid[slot[1]][slot[0]] = pg.col;
    });
    // lose if anything occupies the danger rows
    for (var r = ROWS - 2; r < ROWS; r++) for (var c = 0; c < colsIn(r); c++) if (grid[r][c]) return loseLevel();
    hud();
  };

  function fire() {
    if (shot || over || won) return;
    var L = layout();
    var sx = ui.VW / 2, sy = ui.VH - 100;
    var spd = 520;
    shot = { x: sx, y: sy, vx: Math.sin(angle) * spd, vy: -Math.cos(angle) * spd, col: curCol };
    curCol = nextCol; nextCol = 1 + Math.floor(Math.random() * colors);
    shots++; dropT++; S.toss(); hud();
  }
  function attach(x, y) {
    var L = layout(), slot = nearestEmpty(x, y, L);
    if (!slot) return loseLevel();
    grid[slot[1]][slot[0]] = shot.col;
    shot = null; S.stick();
    resolve();
    if (over || won) return;
    if (dropT >= LEVELS[li].dropEvery) { dropT = 0; addRail(); }
    // lose if a peg is in the last two rows
    for (var r = ROWS - 2; r < ROWS; r++) for (var c = 0; c < colsIn(r); c++) if (grid[r][c]) return loseLevel();
  }
  function winLevel() {
    if (won) return; won = true; ui.stop(); S.win();
    if (li + 2 > save.open) save.open = Math.min(LEVELS.length, li + 2);
    if (score > save.hi) save.hi = score;
    ui.persist(); ui.runEnded();
    ui.menu({
      title: "Loft cleared",
      body: LEVELS[li].name + " is empty of pegs.",
      stats: '<b class="ff-score-xl">' + FF.n(score) + "</b><span>" + shots + " tosses</span>",
      buttons: li + 1 < LEVELS.length
        ? [{ label: "Next loft", act: function () { play(li + 1); } }, { label: "Menu", small: true, act: toTitle }]
        : [{ label: "Menu", act: toTitle }]
    });
  }
  function loseLevel() {
    if (over || won) return; over = true; ui.stop(); S.lose(); ui.runEnded();
    ui.menu({
      title: "The hatch is blocked",
      body: "Pegs have come down too far.",
      buttons: [{ label: "Try again", act: function () { play(li); } }, { label: "Menu", small: true, act: toTitle }]
    });
  }
  function play(i) {
    li = i; var lv = LEVELS[i]; colors = lv.colors;
    var rows = pattern(i, lv.colors, lv.dens, lv.seed);
    grid = rows.map(function (r) { return r.slice(); });
    // ensure odd rows length
    for (var r = 0; r < ROWS; r++) { while (grid[r].length < colsIn(r)) grid[r].push(0); grid[r] = grid[r].slice(0, colsIn(r)); }
    angle = 0; shot = null; falling = []; shots = 0; score = 0; dropT = 0; over = false; won = false;
    curCol = 1 + Math.floor(Math.random() * colors); nextCol = 1 + Math.floor(Math.random() * colors);
    if (window.FFX) FFX.reset(); ui.setCourse((i + 1) + ". " + lv.name); hud(); mode = "play"; A.playSong(SONG); ui.go(); ui.showPads(true);
  }
  function toTitle() {
    ui.stop(); mode = "title"; A.playSong(SONG); ui.showPads(false); ui.setCourse("The loft");
    var open = save.open || 1;
    ui.menu({
      title: "LOFTPEG",
      body: "Toss painted wooden pegs into the cluster under the rafters. Three of a colour drop; anything no longer hung from a beam falls too.",
      stats: "<span>HIGH SCORE " + (save.hi ? FF.n(save.hi) : "-") + "</span><span>LOFTS " + open + "/" + LEVELS.length + "</span>",
      buttons: [{ label: "Play loft " + open, act: function () { play(Math.min(open, LEVELS.length) - 1); } }],
      row: LEVELS.map(function (lv, i) { return { label: String(i + 1), act: function () { play(i); }, disabled: i >= open }; }),
      help: ["Aim with left and right or by dragging. Toss with the button or a tap."],
      fine: "Forest Forge · original work. Workshop loft mood only.",
      app: true
    });
  }
  function onPointer(type, x, y) {
    if (mode !== "play") return;
    var sx = ui.VW / 2, sy = ui.VH - 100;
    if (type === "pointerdown" || type === "pointermove") {
      angle = FF.clamp(Math.atan2(x - sx, sy - y), -1.2, 1.2);
    }
    if (type === "pointerup" && Math.hypot(x - sx, y - sy) < 40) fire();
  }
  var idleT = 0;
  function update(dt) {
    idleT += dt;
    if (window.FFX) FFX.step(dt);
    if (mode !== "play" || over || won) return;
    if (ui.down("L")) angle = Math.max(-1.2, angle - 2.2 * dt);
    if (ui.down("R")) angle = Math.min(1.2, angle + 2.2 * dt);
    if (ui.hit("F")) fire();
    if (shot) {
      shot.x += shot.vx * dt; shot.y += shot.vy * dt;
      var L = layout(), left = L.pad + 8, right = ui.VW - L.pad - 8, rad = L.s * 0.38;
      if (shot.x < left + rad) { shot.x = left + rad; shot.vx *= -1; }
      if (shot.x > right - rad) { shot.x = right - rad; shot.vx *= -1; }
      if (shot.y < L.oy + rad * 0.6) { attach(shot.x, L.oy); return; }
      // collide with pegs
      var hit = false;
      for (var r = 0; r < ROWS && !hit; r++) for (var c = 0; c < colsIn(r); c++) if (grid[r][c]) {
        var p = cellPos(c, r, L);
        if (Math.hypot(p.x - shot.x, p.y - shot.y) < L.s * 0.78) { attach(shot.x, shot.y); hit = true; break; }
      }
    }
    if (falling && falling.length) {
      falling.forEach(function (f) { f.vy += 900 * dt; f.y += f.vy * dt; });
      falling = falling.filter(function (f) { return f.y < ui.VH + 40; });
    }
  }
  function drawPeg(c, x, y, s, col) {
    var k = (col - 1) % PEG.length;
    c.fillStyle = "rgba(0,0,0,.2)";
    c.beginPath(); c.ellipse(x, y + s * 0.38, s * 0.32, s * 0.1, 0, 0, Math.PI * 2); c.fill();
    if (window.FFX) {
      FFX.bevelCircle(c, x, y, s * 0.42, "#6a4a28", "#3a2810", "#c8a060");
      FFX.bevelCircle(c, x, y, s * 0.32, PEG[k], PEG_DK[k], FFX.lighten(PEG[k], 0.35));
      c.save(); c.beginPath(); c.arc(x, y, s * 0.3, 0, Math.PI * 2); c.clip();
      c.strokeStyle = "rgba(40,20,8,.15)"; c.lineWidth = 1;
      for (var i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(x - s, y + i * s * 0.1); c.lineTo(x + s, y + i * s * 0.1 + 2); c.stroke(); }
      c.restore();
    } else {
      c.beginPath(); c.arc(x, y, s * 0.4, 0, Math.PI * 2); c.fillStyle = "#6a4a28"; c.fill();
      c.beginPath(); c.arc(x, y, s * 0.32, 0, Math.PI * 2); c.fillStyle = PEG[k]; c.fill();
      c.strokeStyle = PEG_DK[k]; c.lineWidth = 2; c.stroke();
      c.beginPath(); c.arc(x - s * 0.1, y - s * 0.1, s * 0.1, 0, Math.PI * 2); c.fillStyle = "rgba(255,255,240,.35)"; c.fill();
    }
  }
  function render(c) {
    var W = ui.VW, H = ui.VH, L = layout();
    var sh = window.FFX ? FFX.offset() : { x: 0, y: 0 };
    c.save(); c.translate(sh.x, sh.y);
    if (window.FFX) FFX.sky(c, W, H, "#bfe8ff", "#8ac8ff", "#ff9ad0");
    else {
      var g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#c8a060"); g.addColorStop(0.3, "#8a5a30"); g.addColorStop(1, "#3a2210");
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    }
    for (var i = 0; i < 9; i++) {
      var gy = c.createLinearGradient(0, 16 + i * 30, 0, 28 + i * 30);
      gy.addColorStop(0, "rgba(255,220,140,.16)"); gy.addColorStop(1, "rgba(80,50,20,.28)");
      c.fillStyle = gy; c.fillRect(0, 16 + i * 30, W, 12);
    }
    if (window.FFX) {
      FFX.bevelRoundRect(c, 0, 0, 14, H, 0, "#5a3a18", "#2a1808");
      FFX.bevelRoundRect(c, W - 14, 0, 14, H, 0, "#5a3a18", "#2a1808");
      FFX.bevelRoundRect(c, 8, L.oy - 20, W - 16, 18, 3, "#6a4a20", "#3a2410");
    } else {
      c.fillStyle = "#5a3a18"; c.fillRect(8, L.oy - 18, W - 16, 16);
      c.fillStyle = "#c8a060"; c.fillRect(8, L.oy - 18, W - 16, 4);
    }
    if (grid) {
      c.strokeStyle = "rgba(80,50,20,.45)"; c.lineWidth = 1.5;
      for (var col = 0; col < colsIn(0); col++) {
        var p0 = cellPos(col, 0, L);
        c.beginPath(); c.moveTo(p0.x, L.oy - 4); c.lineTo(p0.x, p0.y - L.s * 0.32); c.stroke();
      }
      for (var r = 0; r < ROWS; r++) for (var col = 0; col < colsIn(r); col++) if (grid[r][col]) {
        var p = cellPos(col, r, L); drawPeg(c, p.x, p.y, L.s, grid[r][col]);
      }
    }
    (falling || []).forEach(function (f) { drawPeg(c, f.x, f.y, L.s, f.col); });
    c.strokeStyle = "rgba(220,60,40,.55)"; c.setLineDash([6, 6]);
    var dy = L.oy + (ROWS - 2) * L.s * 0.86;
    c.beginPath(); c.moveTo(L.pad, dy); c.lineTo(W - L.pad, dy); c.stroke(); c.setLineDash([]);
    var sx = W / 2, sy = H - 100;
    if (window.FFX) FFX.bevelRoundRect(c, sx - 28, sy - 10, 56, 22, 8, "#6a4a24", "#3a2410");
    c.strokeStyle = "rgba(255,240,200,.7)"; c.lineWidth = 2;
    c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + Math.sin(angle) * 80, sy - Math.cos(angle) * 80); c.stroke();
    c.fillStyle = "rgba(255,240,200,.4)";
    for (var i = 1; i < 5; i++) {
      c.beginPath(); c.arc(sx + Math.sin(angle) * 18 * i, sy - Math.cos(angle) * 18 * i, 2, 0, Math.PI * 2); c.fill();
    }
    if (curCol) drawPeg(c, sx, sy, L.s, curCol);
    if (nextCol) {
      if (window.FFX) FFX.bevelRoundRect(c, W - 78, H - 168, 64, 70, 8, "#5a3a18", "#2a1808");
      ui.text("NEXT", W - 46, H - 150, 11, "#f0e0c0", "center"); drawPeg(c, W - 46, H - 118, L.s * 0.8, nextCol);
    }
    if (shot) drawPeg(c, shot.x, shot.y, L.s, shot.col);
    if (window.FFX) { FFX.vignette(c, W, H, 0.3); FFX.draw(c); }
    c.restore();
  }
  var game = {
    toTitle: toTitle, update: update, render: render, onPointer: onPointer,
    onBack: function () { if (mode === "title") return "exit"; toTitle(); return "menu"; },
    play: play,
    qa: {
      play: play,
      fire: fire,
      clearAll: function () { for (var r = 0; r < ROWS; r++) for (var c = 0; c < colsIn(r); c++) grid[r][c] = 0; hud(); winLevel(); },
      state: function () { return { mode: mode, level: li + 1, pegs: grid ? countPegs() : 0, shots: shots, over: over, won: won }; }
    }
  };
  ui.onAdsRemoved = function () { if (mode === "title") toTitle(); };
  ui.start(game);
})();
