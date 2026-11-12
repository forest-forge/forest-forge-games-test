/* Wingwake (Forest Forge). An endless dusk board of moths. Swap two neighbours
 * so three or more of a wing pattern can lift off. Score attack and a timed
 * dusk flight — not jewels, and not a level-goal sweets game. */
(function () {
  "use strict";
  (function applyChrome(css) {
    var s = document.createElement("style"); s.id = "ff-palette"; s.textContent = css;
    document.head.appendChild(s);
    var m = document.querySelector('meta[name="theme-color"]');
    var bg = /--bg:([^;}]+)/.exec(css); if (m && bg) m.setAttribute("content", bg[1].trim());
  })(`:root{--bg:#1a2850;--water:#141e42;--amber:#f8e8c8;--amber-hi:#ffd18a;--amber-soft:#ffe8c8;--amber-line:#e08a6a;--ember:#ff6a8a;--btn:#24305a;--lamp:#fff0d0;--glow-line:rgba(255,160,140,.4);--glow-fill:rgba(255,160,140,.1)}.ff-host{background:radial-gradient(ellipse at 50% 20%, #3a4a88 0%, transparent 55%), var(--bg)}.ff-hud{background:linear-gradient(#24305a,#121830);border-bottom-color:rgba(224,138,106,.4)}.ff{border-left-color:rgba(224,138,106,.3);border-right-color:rgba(224,138,106,.3)}`);

  var COLS = 8, ROWS = 8, COLORS = 6;
  var WING = ["#ff6a6a", "#f0c03a", "#3cbcb0", "#a05ae0", "#f8f0d8", "#6ac04a"];
  var WING_DK = ["#c03838", "#c09018", "#217870", "#6a38a0", "#c8c0a0", "#3a8030"];
  var ui = FF.create({
    id: "wingwake", title: "Wingwake", course: "Dusk board", view: { w: 390, h: 720, flex: true },
    stats: [{ id: "score", label: "Score", value: "0" }, { id: "mult", label: "Lift", value: "x1" }]
  });
  var A = ui.audio, save = ui.save;
  save.hi = save.hi || 0; save.hiDusk = save.hiDusk || 0;

  var S = {
    swap: function () { A.tone({ f: 640, f2: 720, dur: 0.05, type: "sine", gain: 0.05 }); },
    lift: function (n) { A.tone({ f: 480 + n * 60, f2: 720 + n * 40, dur: 0.1, type: "triangle", gain: 0.06 }); },
    breeze: function () { A.noise({ dur: 0.12, gain: 0.05, freq: 900, f2: 400, filter: "bandpass" }); },
    over: function () { [392, 330, 262, 196].forEach(function (f, i) { A.tone({ f: f, dur: 0.14, type: "sine", gain: 0.07, delay: i * 0.11 }); }); },
    bad: function () { A.tone({ f: 180, f2: 120, dur: 0.08, type: "triangle", gain: 0.05 }); }
  };
  var SONG = { bpm: 96, order: [0, 0, 1], parts: [[
    { wave: "sine", gain: 0.045, pat: "A3 . C4 . E4 . A4 . G4 . E4 . C4 . A3 . F3 . A3 . C4 . E4 . D4 . B3 ." },
    { wave: "triangle", gain: 0.025, pat: "A2 . . E3 . . A2 . . F2 . . C3 . . G2 . . D3 . . A2 . . E3 . ." }
  ], [
    { wave: "sine", gain: 0.045, pat: "B3 . D4 . F#4 . B4 . A4 . F#4 . D4 . B3 . G3 . B3 . D4 . F#4 . E4 . C#4 ." },
    { wave: "triangle", gain: 0.025, pat: "B2 . . F#3 . . B2 . . G2 . . D3 . . A2 . . E3 . . B2 . . F#3 . ." }
  ]] };

  var mode = "title", timed = false, grid, score, mult, timeLeft, sel, busy, anim, cascade, hintT, hint, over;

  function make(col, sp) { return { col: col, special: sp || 0, pop: 0, fall: 0 }; }
  function hasLine(g, c, r) {
    var col = g[r][c].col; if (!col) return false;
    var h = 1, v = 1, i;
    for (i = c - 1; i >= 0 && g[r][i].col === col; i--) h++;
    for (i = c + 1; i < COLS && g[r][i].col === col; i++) h++;
    for (i = r - 1; i >= 0 && g[i][c].col === col; i--) v++;
    for (i = r + 1; i < ROWS && g[i][c].col === col; i++) v++;
    return h >= 3 || v >= 3;
  }
  function findMatches(g) {
    var mark = [];
    for (var r = 0; r < ROWS; r++) {
      var c = 0;
      while (c < COLS) {
        var col = g[r][c].col, n = 1;
        while (c + n < COLS && g[r][c + n].col === col && col) n++;
        if (col && n >= 3) for (var k = 0; k < n; k++) mark.push([c + k, r, n, "h"]);
        c += n;
      }
    }
    for (var c2 = 0; c2 < COLS; c2++) {
      var r2 = 0;
      while (r2 < ROWS) {
        var col2 = g[r2][c2].col, n2 = 1;
        while (r2 + n2 < ROWS && g[r2 + n2][c2].col === col2 && col2) n2++;
        if (col2 && n2 >= 3) for (var k2 = 0; k2 < n2; k2++) mark.push([c2, r2 + k2, n2, "v"]);
        r2 += n2;
      }
    }
    return mark;
  }
  function anyMove(g) {
    function sw(a, b) { var t = g[a[1]][a[0]]; g[a[1]][a[0]] = g[b[1]][b[0]]; g[b[1]][b[0]] = t; }
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var nbs = []; if (c + 1 < COLS) nbs.push([c + 1, r]); if (r + 1 < ROWS) nbs.push([c, r + 1]);
      for (var i = 0; i < nbs.length; i++) {
        sw([c, r], nbs[i]);
        var ok = hasLine(g, c, r) || hasLine(g, nbs[i][0], nbs[i][1]);
        sw([c, r], nbs[i]);
        if (ok) return [c, r, nbs[i][0], nbs[i][1]];
      }
    }
    return null;
  }
  function fillFresh() {
    var g, tries = 0;
    do {
      g = [];
      for (var r = 0; r < ROWS; r++) {
        var row = [];
        for (var c = 0; c < COLS; c++) {
          var col, guard = 0;
          do { col = 1 + Math.floor(Math.random() * COLORS); guard++; }
          while (guard < 12 && ((c >= 2 && row[c - 1].col === col && row[c - 2].col === col) || (r >= 2 && g[r - 1][c].col === col && g[r - 2][c].col === col)));
          row.push(make(col));
        }
        g.push(row);
      }
      tries++;
    } while ((findMatches(g).length || !anyMove(g)) && tries < 40);
    return g;
  }
  function hud() {
    ui.setStat("score", FF.n(score));
    ui.setStat("mult", timed ? Math.ceil(timeLeft) + "s" : "x" + mult);
  }
  function stampFrom(marks) {
    var by = {};
    marks.forEach(function (m) {
      var k = m[0] + "," + m[1];
      if (!by[k]) by[k] = { h: 0, v: 0, c: m[0], r: m[1] };
      if (m[3] === "h") by[k].h = Math.max(by[k].h, m[2]); else if (m[3] === "v") by[k].v = Math.max(by[k].v, m[2]);
    });
    var stamp = null, rank = 0;
    Object.keys(by).forEach(function (k) {
      var o = by[k], rnk = 0, sp = 0;
      if (o.h >= 5 || o.v >= 5) { rnk = 3; sp = 2; } // lantern
      else if (o.h >= 4) { rnk = 2; sp = 1; } // breeze row
      else if (o.v >= 4) { rnk = 2; sp = 3; } // breeze col
      if (rnk > rank) { rank = rnk; stamp = { c: o.c, r: o.r, special: sp }; }
    });
    return stamp;
  }
  function fire(c, r, viaCol) {
    var sp = grid[r][c].special, list = [];
    if (sp === 1) for (var x = 0; x < COLS; x++) list.push([x, r]);
    else if (sp === 3) for (var y = 0; y < ROWS; y++) list.push([c, y]);
    else if (sp === 2) {
      var col = viaCol || grid[r][c].col;
      for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) if (grid[y][x].col === col) list.push([x, y]);
    }
    return list;
  }
  function resolve(extra) {
    var marks = findMatches(grid);
    if (extra && extra.length) marks = marks.concat(extra.map(function (p) { return [p[0], p[1], 3, "x"]; }));
    if (!marks.length) return false;
    var stamp = stampFrom(marks), hit = {};
    marks.forEach(function (m) { hit[m[0] + "," + m[1]] = 1; });
    Object.keys(hit).forEach(function (k) {
      var p = k.split(","), c = +p[0], r = +p[1];
      if (grid[r][c].special) fire(c, r, grid[r][c].col).forEach(function (q) { hit[q[0] + "," + q[1]] = 1; });
    });
    var n = 0;
    Object.keys(hit).forEach(function (k) {
      var p = k.split(","), c = +p[0], r = +p[1], cell = grid[r][c];
      if (!cell.col) return;
      if (stamp && stamp.c === c && stamp.r === r) { cell.special = stamp.special; return; }
      score += 50 * mult; n++; cell.col = 0; cell.special = 0; cell.pop = 0.25;
    });
    if (n) { S.lift(cascade); if (stamp) S.breeze(); cascade++; if (cascade > 1) mult = Math.min(8, cascade); }
    hud(); return true;
  }
  function gravity() {
    for (var c = 0; c < COLS; c++) {
      var stack = [];
      for (var r = ROWS - 1; r >= 0; r--) if (grid[r][c].col) stack.push(grid[r][c]);
      for (var r = ROWS - 1; r >= 0; r--) {
        var src = stack[ROWS - 1 - r];
        if (src) { if (grid[r][c] !== src) src.fall = (src.fall || 0) + 1; grid[r][c] = src; }
        else { grid[r][c] = make(1 + Math.floor(Math.random() * COLORS)); grid[r][c].fall = 2; }
      }
    }
  }
  function endIfStuck() {
    if (timed) return; // timed: keep going (board always refill); if no moves, reshuffle
    if (!anyMove(grid)) endRun("The moths have settled. No more lifts on this board.");
  }
  function reshuffle() {
    var cells = [];
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) cells.push(grid[r][c]);
    var tries = 0;
    do {
      for (var i = cells.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = cells[i]; cells[i] = cells[j]; cells[j] = t; }
      var k = 0; for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) grid[r][c] = cells[k++];
      tries++;
    } while ((findMatches(grid).length || !anyMove(grid)) && tries < 40);
  }
  function tickAnim(dt) {
    if (!anim) return;
    anim.wait -= dt; if (anim.wait > 0) return;
    if (anim.kind === "resolve") {
      if (resolve(anim.extra)) { anim.wait = 0.16; anim.kind = "fall"; return; }
      cascade = 0; mult = 1; hud(); busy = false; anim = null; hintT = 0; hint = null;
      if (!anyMove(grid)) { if (timed) reshuffle(); else endIfStuck(); }
      return;
    }
    if (anim.kind === "fall") { gravity(); anim.wait = 0.14; anim.kind = "resolve"; anim.extra = null; }
  }
  function trySwap(a, b) {
    if (busy || over) return;
    if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) !== 1) return;
    var ca = grid[a[1]][a[0]], cb = grid[b[1]][b[0]];
    if (ca.special === 2 || cb.special === 2) {
      var lantern = ca.special === 2 ? a : b, other = ca.special === 2 ? b : a;
      anim = { kind: "resolve", wait: 0.08, extra: fire(lantern[0], lantern[1], grid[other[1]][other[0]].col).concat([lantern]) };
      busy = true; S.breeze(); sel = null; hint = null; return;
    }
    grid[a[1]][a[0]] = cb; grid[b[1]][b[0]] = ca;
    if (!hasLine(grid, a[0], a[1]) && !hasLine(grid, b[0], b[1]) && !ca.special && !cb.special) {
      grid[a[1]][a[0]] = ca; grid[b[1]][b[0]] = cb; S.bad(); sel = null; return;
    }
    var extra = [];
    if (cb.special) extra = extra.concat(fire(a[0], a[1]));
    if (ca.special) extra = extra.concat(fire(b[0], b[1]));
    S.swap(); sel = null; hint = null; hintT = 0;
    anim = { kind: "resolve", wait: 0.08, extra: extra.length ? extra : null }; busy = true;
  }
  function endRun(msg) {
    if (over) return;
    over = true; ui.stop(); S.over();
    var best = timed ? save.hiDusk : save.hi;
    var hi = score > best;
    if (timed) { if (hi) save.hiDusk = score; } else if (hi) save.hi = score;
    ui.persist(); ui.runEnded();
    ui.menu({
      title: timed ? "Dusk ends" : "Board at rest",
      body: msg,
      stats: '<b class="ff-score-xl">' + FF.n(score) + "</b><span>" + (hi ? "NEW HIGH SCORE" : "HIGH SCORE " + FF.n(best)) + "</span>",
      buttons: [{ label: "Again", act: function () { play(timed); } }, { label: "Menu", small: true, act: toTitle }]
    });
  }
  function play(dusk) {
    timed = !!dusk; grid = fillFresh(); score = 0; mult = 1; timeLeft = 60; sel = null; busy = false; anim = null; cascade = 0; hintT = 0; hint = null; over = false;
    ui.setCourse(timed ? "Dusk flight" : "Open board"); hud(); mode = "play"; A.playSong(SONG); ui.go(); ui.showPads(false);
  }
  function toTitle() {
    ui.stop(); mode = "title"; A.playSong(SONG); ui.showPads(false); ui.setCourse("Dusk board");
    ui.menu({
      title: "WINGWAKE",
      body: "Swap neighbouring moths so a run of the same wings can lift into the dusk. Keep a cascade going to raise the lift.",
      stats: "<span>OPEN BOARD " + (save.hi ? FF.n(save.hi) : "-") + "</span><span>DUSK FLIGHT " + (save.hiDusk ? FF.n(save.hiDusk) : "-") + "</span>",
      buttons: [{ label: "Open board", act: function () { play(false); } }, { label: "Dusk flight (60s)", act: function () { play(true); } }],
      help: ["Swipe or tap two neighbours.", "Four in a line wakes a breeze; five wakes a lantern moth.", "A hint shimmers if you wait."],
      fine: "Forest Forge · original work. Dusk-moth mood only — not jewels.",
      app: true
    });
  }
  function layout() {
    var pad = 16, top = 16, bot = 40;
    var size = Math.min((ui.VW - pad * 2) / COLS, (ui.VH - top - bot) / ROWS);
    return { s: size, ox: (ui.VW - size * COLS) / 2, oy: top };
  }
  function cellAt(x, y) {
    var L = layout();
    var c = Math.floor((x - L.ox) / L.s), r = Math.floor((y - L.oy) / L.s);
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return null;
    return [c, r];
  }
  var drag = null;
  function onPointer(type, x, y) {
    if (mode !== "play") return;
    if (type === "pointerdown") { drag = cellAt(x, y); return; }
    if (type === "pointermove" && drag) {
      var p = cellAt(x, y);
      if (p && (p[0] !== drag[0] || p[1] !== drag[1])) { trySwap(drag, p); drag = null; }
      return;
    }
    if (type === "pointerup") {
      var p = cellAt(x, y);
      if (p && drag && p[0] === drag[0] && p[1] === drag[1]) {
        if (sel && sel[0] === p[0] && sel[1] === p[1]) sel = null;
        else if (sel) trySwap(sel, p);
        else sel = p;
      }
      drag = null;
    }
  }
  function update(dt) {
    if (mode !== "play" || over) return;
    if (timed) { timeLeft -= dt; if (timeLeft <= 0) { timeLeft = 0; hud(); return endRun("The light goes, and the moths take to the hedges."); } hud(); }
    if (anim) tickAnim(dt);
    else {
      hintT += dt;
      if (hintT > 6 && !hint) hint = anyMove(grid);
    }
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var cell = grid[r][c];
      if (cell.pop > 0) cell.pop = Math.max(0, cell.pop - dt);
      if (cell.fall) cell.fall = Math.max(0, cell.fall - dt * 8);
    }
  }
  function moth(c, x, y, s, col, sp, pop) {
    var k = (col - 1) % WING.length, cx = x + s / 2, cy = y + s / 2, sc = s * (0.42 + (pop || 0));
    c.save(); c.translate(cx, cy);
    var flap = Math.sin((x + y + performance.now() * 0.004) * 0.8) * 0.12;
    function wing(side) {
      c.save(); c.scale(side, 1); c.rotate(flap);
      c.beginPath(); c.ellipse(sc * 0.45, 0, sc * 0.55, sc * 0.72, 0.2, 0, Math.PI * 2);
      c.fillStyle = WING[k]; c.fill(); c.strokeStyle = WING_DK[k]; c.lineWidth = 1.4; c.stroke();
      c.beginPath(); c.ellipse(sc * 0.4, -sc * 0.15, sc * 0.22, sc * 0.28, 0.3, 0, Math.PI * 2);
      c.fillStyle = "rgba(255,255,240,.28)"; c.fill();
      c.restore();
    }
    wing(-1); wing(1);
    c.fillStyle = WING_DK[k]; c.beginPath(); c.ellipse(0, 0, sc * 0.12, sc * 0.28, 0, 0, Math.PI * 2); c.fill();
    if (sp) { c.fillStyle = "#fff6c8"; c.font = "bold " + Math.floor(s * 0.28) + "px Georgia"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(sp === 2 ? "L" : "B", 0, 0); }
    c.restore();
  }
  function render(c) {
    var W = ui.VW, H = ui.VH;
    var g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#1a2060"); g.addColorStop(0.45, "#8a3a60"); g.addColorStop(1, "#f08a4a");
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // a couple of original stars / lamps, not a jewel board
    c.fillStyle = "rgba(255,240,200,.8)";
    for (var i = 0; i < 18; i++) c.fillRect((i * 73 + 20) % W, (i * 47 + 10) % (H * 0.45), 2, 2);
    var L = layout();
    if (!grid) return;
    for (var r = 0; r < ROWS; r++) for (var col = 0; col < COLS; col++) {
      var x = L.ox + col * L.s, y = L.oy + r * L.s, cell = grid[r][col];
      c.fillStyle = "rgba(20,16,40," + (0.22 + ((r + col) % 2) * 0.08) + ")";
      c.beginPath(); c.roundRect(x + 3, y + 3, L.s - 6, L.s - 6, 10); c.fill();
      if (cell.col) moth(c, x, y + (cell.fall || 0) * L.s * -0.5, L.s, cell.col, cell.special, cell.pop);
    }
    if (sel) { c.strokeStyle = "#ffe0a0"; c.lineWidth = 3; c.strokeRect(L.ox + sel[0] * L.s + 4, L.oy + sel[1] * L.s + 4, L.s - 8, L.s - 8); }
    if (hint && !sel && !busy) {
      var a = hint, tw = 0.5 + 0.5 * Math.sin(performance.now() / 200);
      c.globalAlpha = 0.35 + 0.35 * tw; c.strokeStyle = "#fff4c0"; c.lineWidth = 2;
      c.strokeRect(L.ox + a[0] * L.s + 6, L.oy + a[1] * L.s + 6, L.s - 12, L.s - 12);
      c.strokeRect(L.ox + a[2] * L.s + 6, L.oy + a[3] * L.s + 6, L.s - 12, L.s - 12);
      c.globalAlpha = 1;
    }
  }
  // roundRect fallback
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); };
  }
  var game = {
    toTitle: toTitle, update: update, render: render, onPointer: onPointer,
    onBack: function () { if (mode === "title") return "exit"; toTitle(); return "menu"; },
    play: play,
    qa: {
      play: play,
      autoSwap: function () {
        if (busy || mode !== "play") return false;
        var m = anyMove(grid); if (!m) return false;
        trySwap([m[0], m[1]], [m[2], m[3]]); return true;
      },
      state: function () { return { mode: mode, score: score, timed: timed, timeLeft: timeLeft, busy: busy, over: over, moves: !!grid && !!anyMove(grid) }; }
    }
  };
  ui.onAdsRemoved = function () { if (mode === "title") toTitle(); };
  ui.start(game);
})();
