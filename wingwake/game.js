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
  })(`:root{--bg:#4a2aa8;--sky1:#ff9ac8;--sky2:#5a3ad8;--water:#34208a;--amber:#ffffff;--amber-hi:#ffd84a;--amber-soft:#ffffff;--amber-line:#ff5a9a;--ember:#2a1478;--btn:#4228a0;--lamp:#fff6d8;--pop1:#ffd84a;--pop2:#ff8ac0;--pop3:#ffffff;--glow-line:rgba(255,255,255,.55);--glow-fill:rgba(255,255,255,.14)}`);

  var COLS = 8, ROWS = 8, COLORS = 6, colorN = 6, grove = -1, goalScore = 0, idleT = 0;
  var GROVES = [
    { name: "First hedge", colors: 4, time: 50, goal: 1200 },
    { name: "Coral dusk", colors: 5, time: 55, goal: 1800 },
    { name: "Leaf lanterns", colors: 5, time: 55, goal: 2200 },
    { name: "Violet ride", colors: 6, time: 60, goal: 2600 },
    { name: "Cream flight", colors: 6, time: 60, goal: 3000 },
    { name: "Long hedge", colors: 6, time: 70, goal: 3800 },
    { name: "Deep dusk", colors: 6, time: 65, goal: 4200 },
    { name: "Last lantern", colors: 6, time: 75, goal: 5200 }
  ];
  var WING = ["#ff6a6a", "#f0c03a", "#3cbcb0", "#a05ae0", "#f8f0d8", "#6ac04a"];
  var WING_DK = ["#c03838", "#c09018", "#217870", "#6a38a0", "#c8c0a0", "#3a8030"];
  var ui = FF.create({
    deco: ["moth", "star", "spark"], 
    id: "wingwake", title: "Wingwake", course: "Dusk board", view: { w: 390, h: 720, flex: true },
    stats: [{ id: "score", label: "Score", value: "0" }, { id: "mult", label: "Lift", value: "x1" }]
  });
  var A = ui.audio, save = ui.save;
  save.hi = save.hi || 0; save.hiDusk = save.hiDusk || 0; save.grove = save.grove || 0;

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
          do { col = 1 + Math.floor(Math.random() * colorN); guard++; }
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
      if (window.FFX && cell.col) {
        var Lx = layout();
        FFX.burst(Lx.ox + c * Lx.s + Lx.s / 2, Lx.oy + r * Lx.s + Lx.s / 2, WING[(cell.col - 1) % WING.length], 9, { spd: 80, r: 2.2, kind: "fluff", g: 10, lift: 90 });
      }
      score += 50 * mult; n++; cell.col = 0; cell.special = 0; cell.pop = 0.25;
    });
    if (n) { S.lift(cascade); if (stamp) S.breeze(); cascade++; if (cascade > 1) mult = Math.min(8, cascade); if (window.FFX) FFX.kick(0.22 + cascade * 0.06, "#ffe0c0"); }
    if (grove >= 0 && score >= goalScore) { hud(); wonGrove(); }
    hud(); return true;
  }
  function gravity() {
    for (var c = 0; c < COLS; c++) {
      var stack = [];
      for (var r = ROWS - 1; r >= 0; r--) if (grid[r][c].col) stack.push(grid[r][c]);
      for (var r = ROWS - 1; r >= 0; r--) {
        var src = stack[ROWS - 1 - r];
        if (src) { if (grid[r][c] !== src) src.fall = (src.fall || 0) + 1; grid[r][c] = src; }
        else { grid[r][c] = make(1 + Math.floor(Math.random() * colorN)); grid[r][c].fall = 2; }
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
    var btns = [{ label: "Again", act: function () { if (grove >= 0) playGrove(grove); else play(timed); } }, { label: "Menu", small: true, act: toTitle }];
    ui.menu({
      title: timed ? "Dusk ends" : "Board at rest",
      body: msg,
      stats: '<b class="ff-score-xl">' + FF.n(score) + "</b><span>" + (hi ? "NEW HIGH SCORE" : "HIGH SCORE " + FF.n(best)) + "</span>",
      buttons: btns
    });
  }
  function wonGrove() {
    if (over) return;
    over = true; ui.stop(); S.over(); // will play win-ish via tones already; keep simple
    if (score > save.hiDusk) save.hiDusk = score;
    save.grove = Math.max(save.grove || 0, grove + 1);
    ui.persist(); ui.runEnded();
    var btns = [];
    if (grove + 1 < GROVES.length) btns.push({ label: "Next hedge", act: function () { playGrove(grove + 1); } });
    btns.push({ label: "Again", act: function () { playGrove(grove); } }, { label: "Menu", small: true, act: toTitle });
    ui.menu({
      title: GROVES[grove].name + " lifted",
      body: "The moths took the hedge in time.",
      stats: '<b class="ff-score-xl">' + FF.n(score) + "</b><span>goal " + FF.n(goalScore) + "</span>",
      buttons: btns
    });
  }
  function play(dusk) {
    grove = -1; goalScore = 0; colorN = COLORS;
    if (window.FFX) FFX.reset();
    timed = !!dusk; grid = fillFresh(); score = 0; mult = 1; timeLeft = 60; sel = null; busy = false; anim = null; cascade = 0; hintT = 0; hint = null; over = false;
    ui.setCourse(timed ? "Dusk flight" : "Open board"); hud(); mode = "play"; A.playSong(SONG); ui.go(); ui.showPads(false);
  }
  function playGrove(i) {
    grove = i; var gv = GROVES[i]; colorN = gv.colors; goalScore = gv.goal;
    if (window.FFX) FFX.reset();
    timed = true; grid = fillFresh(); score = 0; mult = 1; timeLeft = gv.time; sel = null; busy = false; anim = null; cascade = 0; hintT = 0; hint = null; over = false;
    ui.setCourse((i + 1) + ". " + gv.name); hud(); mode = "play"; A.playSong(SONG); ui.go(); ui.showPads(false);
  }
  function toTitle() {
    ui.stop(); mode = "title"; A.playSong(SONG); ui.showPads(false); ui.setCourse("Dusk board");
    if (window.FFX) FFX.reset();
    save.grove = save.grove || 0;
    ui.menu({
      title: "WINGWAKE",
      body: "Swap neighbouring moths so a run of the same wings can lift into the dusk. Keep a cascade going to raise the lift.",
      stats: "<span>OPEN BOARD " + (save.hi ? FF.n(save.hi) : "-") + "</span><span>DUSK FLIGHT " + (save.hiDusk ? FF.n(save.hiDusk) : "-") + "</span>",
      buttons: [
        { label: "Open board", act: function () { play(false); } },
        { label: "Dusk flight (60s)", act: function () { play(true); } },
        { label: save.grove ? "Hedges · " + Math.min(save.grove + 1, GROVES.length) + "/" + GROVES.length : "Hedges", act: function () { playGrove(Math.min(save.grove || 0, GROVES.length - 1)); } }
      ],
      help: ["Swipe or tap two neighbours.", "Four in a line wakes a breeze; five wakes a lantern moth.", "A hint shimmers if you wait.", "Hedges are eight short dusk flights with a score to beat before the light goes."],
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
    idleT += dt;
    if (window.FFX) FFX.step(dt);
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
    var flap = Math.sin((x + y + performance.now() * 0.004) * 0.8) * 0.14;
    function wing(side) {
      c.save(); c.scale(side, 1); c.rotate(flap);
      c.beginPath(); c.ellipse(sc * 0.45, 0, sc * 0.55, sc * 0.72, 0.2, 0, Math.PI * 2);
      var g = c.createRadialGradient(sc * 0.25, -sc * 0.2, sc * 0.05, sc * 0.45, 0, sc * 0.7);
      g.addColorStop(0, window.FFX ? FFX.lighten(WING[k], 0.4) : "#fff");
      g.addColorStop(0.45, WING[k]);
      g.addColorStop(1, WING_DK[k]);
      c.fillStyle = g; c.fill(); c.strokeStyle = WING_DK[k]; c.lineWidth = 1.4; c.stroke();
      // original marks: pale crescent + two small speckles
      c.beginPath(); c.ellipse(sc * 0.42, -sc * 0.18, sc * 0.2, sc * 0.12, 0.5, 0, Math.PI * 2);
      c.fillStyle = "rgba(255,255,240,.35)"; c.fill();
      c.fillStyle = "rgba(20,10,20,.22)";
      c.beginPath(); c.arc(sc * 0.55, sc * 0.18, sc * 0.07, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(sc * 0.38, sc * 0.28, sc * 0.05, 0, Math.PI * 2); c.fill();
      c.restore();
    }
    // soft shadow
    c.fillStyle = "rgba(0,0,0,.18)"; c.beginPath(); c.ellipse(0, sc * 0.55, sc * 0.55, sc * 0.16, 0, 0, Math.PI * 2); c.fill();
    wing(-1); wing(1);
    // body
    var bg = c.createLinearGradient(0, -sc * 0.3, 0, sc * 0.3);
    bg.addColorStop(0, window.FFX ? FFX.lighten(WING_DK[k], 0.2) : WING_DK[k]);
    bg.addColorStop(1, WING_DK[k]);
    c.fillStyle = bg; c.beginPath(); c.ellipse(0, 0, sc * 0.13, sc * 0.3, 0, 0, Math.PI * 2); c.fill();
    // antennae
    c.strokeStyle = WING_DK[k]; c.lineWidth = 1.1; c.lineCap = "round";
    c.beginPath(); c.moveTo(0, -sc * 0.22); c.quadraticCurveTo(-sc * 0.12, -sc * 0.5, -sc * 0.22, -sc * 0.62); c.stroke();
    c.beginPath(); c.moveTo(0, -sc * 0.22); c.quadraticCurveTo(sc * 0.12, -sc * 0.5, sc * 0.22, -sc * 0.62); c.stroke();
    if (sp) {
      c.shadowColor = "rgba(255,240,160,.8)"; c.shadowBlur = 10;
      c.fillStyle = "#fff6c8"; c.font = "bold " + Math.floor(s * 0.28) + "px Georgia"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(sp === 2 ? "L" : "B", 0, 0);
      c.shadowBlur = 0;
    }
    c.restore();
  }
  function render(c) {
    var W = ui.VW, H = ui.VH;
    var sh = window.FFX ? FFX.offset() : { x: 0, y: 0 };
    c.save(); c.translate(sh.x, sh.y);
    if (window.FFX) FFX.sky(c, W, H, "#141848", "#8a3a60", "#f08a4a");
    else {
      var g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#1a2060"); g.addColorStop(0.45, "#8a3a60"); g.addColorStop(1, "#f08a4a");
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    }
    // moon
    c.beginPath(); c.arc(W * 0.82, H * 0.14, 28, 0, Math.PI * 2);
    c.fillStyle = "#f8e8c0"; c.fill();
    c.beginPath(); c.arc(W * 0.82 + 8, H * 0.12, 22, 0, Math.PI * 2);
    c.fillStyle = "#8a3a60"; c.fill(); // sky-coloured bite, a waxing sliver
    // stars
    for (var i = 0; i < 28; i++) {
      var tw = 0.45 + 0.55 * Math.abs(Math.sin(idleT * 1.4 + i));
      c.globalAlpha = tw; c.fillStyle = "#fff4d0";
      c.beginPath(); c.arc((i * 73 + 20) % W, 8 + (i * 47 + 10) % (H * 0.42), i % 4 === 0 ? 1.8 : 1.1, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;
    // hedge silhouette
    c.fillStyle = "#1a1028";
    c.beginPath(); c.moveTo(0, H);
    for (var i = 0; i <= 10; i++) c.quadraticCurveTo(W * (i + 0.3) / 10, H * 0.72 - (i % 3) * 16, W * (i + 1) / 10, H * 0.78);
    c.lineTo(W, H); c.closePath(); c.fill();
    var L = layout();
    if (grid) {
      for (var r = 0; r < ROWS; r++) for (var col = 0; col < COLS; col++) {
        var x = L.ox + col * L.s, y = L.oy + r * L.s, cell = grid[r][col];
        c.fillStyle = "rgba(16,12,36," + (0.32 + ((r + col) % 2) * 0.1) + ")";
        if (window.FFX) { FFX.roundRect(c, x + 3, y + 3, L.s - 6, L.s - 6, 12); c.fill(); }
        else { c.beginPath(); c.roundRect(x + 3, y + 3, L.s - 6, L.s - 6, 10); c.fill(); }
        if (cell.col) moth(c, x, y + (cell.fall || 0) * L.s * -0.5, L.s, cell.col, cell.special, cell.pop);
      }
    }
    if (sel) { c.strokeStyle = "#ffe0a0"; c.lineWidth = 3; c.shadowColor = "#ffe0a0"; c.shadowBlur = 8; c.strokeRect(L.ox + sel[0] * L.s + 4, L.oy + sel[1] * L.s + 4, L.s - 8, L.s - 8); c.shadowBlur = 0; }
    if (hint && !sel && !busy) {
      var a = hint, tw = 0.5 + 0.5 * Math.sin(performance.now() / 200);
      c.globalAlpha = 0.35 + 0.35 * tw; c.strokeStyle = "#fff4c0"; c.lineWidth = 2;
      c.strokeRect(L.ox + a[0] * L.s + 6, L.oy + a[1] * L.s + 6, L.s - 12, L.s - 12);
      c.strokeRect(L.ox + a[2] * L.s + 6, L.oy + a[3] * L.s + 6, L.s - 12, L.s - 12);
      c.globalAlpha = 1;
    }
    if (grove >= 0 && mode === "play") {
      ui.text("GOAL " + FF.n(goalScore), W / 2, ui.VH - 18, 12, "#ffe0c0", "center");
    }
    if (window.FFX) { FFX.vignette(c, W, H, 0.34); FFX.draw(c); }
    c.restore();
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
      playGrove: playGrove,
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
