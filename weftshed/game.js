/* Weftshed (Forest Forge). A level-based yarn match on a loom. Swap neighbouring
 * loops of dyed wool so runs of three or more can be drawn through the shed.
 * Original weaving theme, dye palette, specials and goals — not a sweets game. */
(function () {
  "use strict";
  (function applyChrome(css) {
    var s = document.createElement("style"); s.id = "ff-palette"; s.textContent = css;
    document.head.appendChild(s);
    var m = document.querySelector('meta[name="theme-color"]');
    var bg = /--bg:([^;}]+)/.exec(css); if (m && bg) m.setAttribute("content", bg[1].trim());
  })(`:root{--bg:#5a3418;--water:#4a2c14;--amber:#f8ecd0;--amber-hi:#f0d48a;--amber-soft:#f6e8c8;--amber-line:#c47838;--ember:#c43a2a;--btn:#3a2414;--lamp:#fff6e0;--glow-line:rgba(220,140,60,.45);--glow-fill:rgba(220,140,60,.12)}.ff-host{background:radial-gradient(ellipse at 50% 30%, #8a5a28 0%, transparent 55%), var(--bg)}.ff-hud{background:linear-gradient(#6a3c18,#3a2410);border-bottom-color:rgba(196,120,56,.45)}.ff{border-left-color:rgba(196,120,56,.3);border-right-color:rgba(196,120,56,.3)}`);

  var COLS = 8, ROWS = 8;
  var YARN = ["#c43a2a", "#e0a01a", "#2a4a9a", "#3a8a48", "#f0e0c0", "#c45a28"];
  var YARN_DK = ["#8a2010", "#a87810", "#1a2c6a", "#246030", "#c8b898", "#8a3a14"];
  var YARN_NAME = ["madder", "weld", "woad", "moss", "flax", "rust"];
  var ui = FF.create({
    id: "weftshed", title: "Weftshed", course: "The loom", view: { w: 390, h: 720, flex: true },
    stats: [{ id: "goal", label: "Goal", value: "-" }, { id: "moves", label: "Moves", value: "-" }]
  });
  var A = ui.audio, save = ui.save;
  save.hi = save.hi || 0; save.open = save.open || 1; save.stars = save.stars || {};

  var S = {
    swap: function () { A.tone({ f: 480, f2: 560, dur: 0.05, type: "triangle", gain: 0.05 }); },
    match: function (n) { A.tone({ f: 520 + n * 40, dur: 0.07, type: "square", gain: 0.05 }); },
    drop: function () { A.tone({ f: 320, f2: 280, dur: 0.04, type: "sine", gain: 0.04 }); },
    special: function () { [660, 880, 1100].forEach(function (f, i) { A.tone({ f: f, dur: 0.06, type: "triangle", gain: 0.06, delay: i * 0.05 }); }); },
    win: function () { [392, 523, 659, 784, 1047].forEach(function (f, i) { A.tone({ f: f, dur: 0.1, type: "triangle", gain: 0.08, delay: i * 0.08 }); }); },
    fail: function () { [330, 247, 196].forEach(function (f, i) { A.tone({ f: f, dur: 0.14, type: "square", gain: 0.07, delay: i * 0.1 }); }); },
    bad: function () { A.tone({ f: 200, f2: 140, dur: 0.08, type: "square", gain: 0.05 }); }
  };
  var SONG = { bpm: 100, order: [0, 0, 1], parts: [[
    { wave: "triangle", gain: 0.04, pat: "E4 . G4 . B4 G4 E4 . D4 . F#4 . A4 F#4 D4 . C4 E4 G4 E4 B3 . E4 . G4 . F#4 E4 D4 ." },
    { wave: "sine", gain: 0.03, pat: "E3 . . . B2 . . . D3 . . . A2 . . . C3 . . . G2 . . . E3 . . . B2 . . ." }
  ], [
    { wave: "triangle", gain: 0.04, pat: "A4 . C5 . E5 C5 A4 . G4 . B4 . D5 B4 G4 . F4 A4 C5 A4 E4 . A4 . C5 . B4 A4 G4 ." },
    { wave: "sine", gain: 0.03, pat: "A2 . . . E3 . . . G2 . . . D3 . . . F2 . . . C3 . . . A2 . . . E3 . . ." }
  ]] };

  // 15 short looms, hand-set goals (not copied from any commercial level set)
  var LEVELS = [
    { name: "First shed", colors: 5, moves: 20, collect: { 0: 12 }, tangles: 0, boats: 0 },
    { name: "Weld gold", colors: 5, moves: 20, collect: { 1: 16 }, tangles: 0, boats: 0 },
    { name: "Two colours", colors: 5, moves: 22, collect: { 0: 12, 2: 12 }, tangles: 0, boats: 0 },
    { name: "A few knots", colors: 5, moves: 22, collect: {}, tangles: 8, boats: 0 },
    { name: "Moss and flax", colors: 6, moves: 22, collect: { 3: 14, 4: 10 }, tangles: 4, boats: 0 },
    { name: "Shuttle down", colors: 5, moves: 24, collect: {}, tangles: 0, boats: 2 },
    { name: "Rust knots", colors: 6, moves: 24, collect: { 5: 12 }, tangles: 8, boats: 0 },
    { name: "Tight shed", colors: 6, moves: 20, collect: { 1: 16, 2: 12 }, tangles: 6, boats: 0 },
    { name: "Three boats", colors: 6, moves: 26, collect: {}, tangles: 4, boats: 3 },
    { name: "Heavy warp", colors: 6, moves: 24, collect: { 0: 16, 3: 12 }, tangles: 10, boats: 0 },
    { name: "Mixed lift", colors: 6, moves: 24, collect: { 2: 14 }, tangles: 8, boats: 2 },
    { name: "All six dyes", colors: 6, moves: 26, collect: { 4: 12, 5: 12 }, tangles: 8, boats: 0 },
    { name: "Knot garden", colors: 6, moves: 22, collect: {}, tangles: 16, boats: 0 },
    { name: "Late shuttle", colors: 6, moves: 26, collect: { 1: 12 }, tangles: 6, boats: 3 },
    { name: "Closing the warp", colors: 6, moves: 24, collect: { 0: 10, 2: 10, 3: 10 }, tangles: 8, boats: 1 }
  ];

  var mode = "title", li = 0, grid, moves, need, got, boatsLeft, anim, sel, busy, score, cascade, rng;

  function cell(c, r) { return grid[r][c]; }
  function rndColor(n) { return 1 + Math.floor(rng() * n); }
  function makeCell(col, opt) {
    return { col: col, knot: (opt && opt.knot) || 0, boat: !!(opt && opt.boat), special: (opt && opt.special) || 0, fall: 0, pop: 0, born: 0 };
  }
  // special: 0 none, 1 shuttle-row, 2 shuttle-col, 3 bobbin, 4 heddle

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
  function anyMove(g, colors) {
    function sw(a, b) { var t = g[a[1]][a[0]]; g[a[1]][a[0]] = g[b[1]][b[0]]; g[b[1]][b[0]] = t; }
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var nbs = [];
      if (c + 1 < COLS) nbs.push([c + 1, r]);
      if (r + 1 < ROWS) nbs.push([c, r + 1]);
      for (var i = 0; i < nbs.length; i++) {
        sw([c, r], nbs[i]);
        var ok = hasLine(g, c, r) || hasLine(g, nbs[i][0], nbs[i][1]);
        sw([c, r], nbs[i]);
        if (ok) return true;
      }
    }
    return false;
  }
  function fillBoard(lv, seed) {
    rng = FF.rng(seed || (lv + 1) * 9973 + 17);
    var g, tries = 0;
    do {
      g = [];
      for (var r = 0; r < ROWS; r++) {
        var row = [];
        for (var c = 0; c < COLS; c++) {
          var col, guard = 0;
          do {
            col = rndColor(lv.colors);
            guard++;
          } while (guard < 12 && ((c >= 2 && row[c - 1].col === col && row[c - 2].col === col) || (r >= 2 && g[r - 1][c].col === col && g[r - 2][c].col === col)));
          row.push(makeCell(col));
        }
        g.push(row);
      }
      tries++;
    } while ((findMatches(g).length || !anyMove(g, lv.colors)) && tries < 40);
    // knots and boats
    var spots = [];
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) spots.push([c, r]);
    for (var i = spots.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t = spots[i]; spots[i] = spots[j]; spots[j] = t; }
    var k = 0;
    for (var n = 0; n < lv.tangles; n++) { var p = spots[k++]; g[p[1]][p[0]].knot = (n % 3 === 0) ? 2 : 1; }
    for (var n = 0; n < lv.boats; n++) { var p = spots[k++]; g[p[1]][p[0]].boat = true; }
    return g;
  }
  function reshuffle() {
    var lv = LEVELS[li], cells = [];
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) cells.push(grid[r][c]);
    var tries = 0;
    do {
      for (var i = cells.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = cells[i]; cells[i] = cells[j]; cells[j] = t; }
      var i2 = 0;
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) grid[r][c] = cells[i2++];
      tries++;
    } while ((findMatches(grid).length || !anyMove(grid, lv.colors)) && tries < 50);
    ui.toast("The warp is re-sleyed");
  }

  function goalText() {
    var parts = [];
    Object.keys(need.collect || {}).forEach(function (k) {
      var n = need.collect[k] - (got.collect[k] || 0);
      if (n > 0) parts.push(n + " " + YARN_NAME[k]);
    });
    if (need.tangles) { var left = 0; for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (grid[r][c].knot) left++; if (left) parts.push(left + " knots"); }
    if (need.boats) { if (boatsLeft > 0) parts.push(boatsLeft + " shuttle" + (boatsLeft > 1 ? "s" : "")); }
    return parts.length ? parts.join(" · ") : "Done";
  }
  function hud() {
    ui.setStat("goal", goalText());
    ui.setStat("moves", String(moves));
  }
  function goalsMet() {
    for (var k in need.collect) if ((got.collect[k] || 0) < need.collect[k]) return false;
    if (need.tangles) {
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (grid[r][c].knot) return false;
    }
    if (need.boats && boatsLeft > 0) return false;
    return true;
  }

  function specialAt(marks) {
    // detect 4 / 5 / L or T to stamp a special on the first cell of that run
    var by = {};
    marks.forEach(function (m) {
      var k = m[0] + "," + m[1];
      if (!by[k]) by[k] = { h: 0, v: 0, c: m[0], r: m[1] };
      if (m[3] === "h") by[k].h = Math.max(by[k].h, m[2]);
      else by[k].v = Math.max(by[k].v, m[2]);
    });
    var stamp = null, rank = 0;
    Object.keys(by).forEach(function (k) {
      var o = by[k], rnk = 0, sp = 0;
      if (o.h >= 3 && o.v >= 3) { rnk = 4; sp = 4; }
      else if (o.h >= 5 || o.v >= 5) { rnk = 3; sp = 3; }
      else if (o.h >= 4) { rnk = 2; sp = 1; }
      else if (o.v >= 4) { rnk = 2; sp = 2; }
      if (rnk > rank) { rank = rnk; stamp = { c: o.c, r: o.r, special: sp }; }
    });
    return stamp;
  }

  function fireSpecial(c, r, viaCol) {
    var sp = grid[r][c].special, list = [];
    if (sp === 1) for (var x = 0; x < COLS; x++) list.push([x, r]);
    else if (sp === 2) for (var y = 0; y < ROWS; y++) list.push([c, y]);
    else if (sp === 3) {
      var col = viaCol || grid[r][c].col;
      for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) if (grid[y][x].col === col) list.push([x, y]);
    } else if (sp === 4) {
      for (var y = r - 1; y <= r + 1; y++) for (var x = c - 1; x <= c + 1; x++) if (x >= 0 && y >= 0 && x < COLS && y < ROWS) list.push([x, y]);
    }
    return list;
  }

  function resolveMatches(extra) {
    var marks = findMatches(grid);
    if (extra && extra.length) marks = marks.concat(extra.map(function (p) { return [p[0], p[1], 3, "x"]; }));
    if (!marks.length) return false;
    var stamp = specialAt(marks);
    var hit = {};
    marks.forEach(function (m) { hit[m[0] + "," + m[1]] = m; });
    // fire specials sitting on a matched cell
    Object.keys(hit).forEach(function (k) {
      var p = k.split(","), c = +p[0], r = +p[1];
      if (grid[r][c].special) fireSpecial(c, r, grid[r][c].col).forEach(function (q) { hit[q[0] + "," + q[1]] = [q[0], q[1], 3, "s"]; });
    });
    var n = 0;
    Object.keys(hit).forEach(function (k) {
      var p = k.split(","), c = +p[0], r = +p[1], cell = grid[r][c];
      if (!cell.col && !cell.boat) return;
      if (cell.col) {
        got.collect[cell.col - 1] = (got.collect[cell.col - 1] || 0) + 1;
        score += 60 * (cascade + 1);
        n++;
      }
      if (cell.knot) cell.knot--;
      if (cell.knot > 0) { cell.pop = 0.2; return; }
      if (stamp && stamp.c === c && stamp.r === r) {
        cell.special = stamp.special; cell.pop = 0; return;
      }
      cell.col = 0; cell.special = 0; cell.pop = 0.22;
    });
    if (n) S.match(cascade);
    if (stamp) S.special();
    cascade++;
    hud();
    return true;
  }

  function gravityAndFill(lv) {
    var moved = false;
    for (var c = 0; c < COLS; c++) {
      var stack = [];
      for (var r = ROWS - 1; r >= 0; r--) if (grid[r][c].col || grid[r][c].boat || grid[r][c].knot) stack.push(grid[r][c]);
      for (var r = ROWS - 1; r >= 0; r--) {
        var src = stack[ROWS - 1 - r];
        if (src) {
          if (grid[r][c] !== src) { src.fall = (src.fall || 0) + 1; moved = true; }
          grid[r][c] = src;
        } else {
          grid[r][c] = makeCell(rndColor(lv.colors));
          grid[r][c].born = 1;
          moved = true;
        }
      }
    }
    // boats that reached the bottom
    for (var c = 0; c < COLS; c++) {
      if (grid[ROWS - 1][c].boat) {
        grid[ROWS - 1][c].boat = false;
        boatsLeft = Math.max(0, boatsLeft - 1);
        score += 400;
        S.special();
      }
    }
    return moved;
  }

  function afterSwap() {
    busy = true; cascade = 0;
    anim = { kind: "resolve", wait: 0.12 };
  }
  function tickAnim(dt) {
    if (!anim) return;
    anim.wait -= dt;
    if (anim.wait > 0) return;
    var lv = LEVELS[li];
    if (anim.kind === "resolve") {
      if (resolveMatches(anim.extra)) { anim.wait = 0.18; anim.kind = "fall"; return; }
      if (!anyMove(grid, lv.colors)) reshuffle();
      busy = false; anim = null;
      if (goalsMet()) return winLevel();
      if (moves <= 0) return failLevel();
      return;
    }
    if (anim.kind === "fall") {
      gravityAndFill(lv);
      anim.wait = 0.16; anim.kind = "resolve"; anim.extra = null;
    }
  }

  function trySwap(a, b) {
    if (busy) return;
    if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) !== 1) return;
    var ca = grid[a[1]][a[0]], cb = grid[b[1]][b[0]];
    // bobbin activated by swapping with a colour
    if (ca.special === 3 || cb.special === 3) {
      var bob = ca.special === 3 ? a : b, other = ca.special === 3 ? b : a;
      moves--; hud();
      anim = { kind: "resolve", wait: 0.08, extra: fireSpecial(bob[0], bob[1], grid[other[1]][other[0]].col).concat([bob]) };
      busy = true; S.special(); S.swap(); sel = null; return;
    }
    if (ca.special && cb.special) {
      moves--; hud();
      anim = { kind: "resolve", wait: 0.08, extra: fireSpecial(a[0], a[1]).concat(fireSpecial(b[0], b[1])) };
      busy = true; S.special(); sel = null; return;
    }
    // swap
    grid[a[1]][a[0]] = cb; grid[b[1]][b[0]] = ca;
    if (!hasLine(grid, a[0], a[1]) && !hasLine(grid, b[0], b[1]) && !ca.special && !cb.special) {
      grid[a[1]][a[0]] = ca; grid[b[1]][b[0]] = cb; S.bad(); sel = null; return;
    }
    // if a shuttle special was swapped, fire it
    var extra = [];
    if (cb.special === 1 || cb.special === 2 || cb.special === 4) extra = extra.concat(fireSpecial(a[0], a[1]));
    if (ca.special === 1 || ca.special === 2 || ca.special === 4) extra = extra.concat(fireSpecial(b[0], b[1]));
    moves--; hud(); S.swap(); sel = null;
    anim = { kind: "resolve", wait: 0.1, extra: extra.length ? extra : null };
    busy = true;
  }

  function winLevel() {
    ui.stop(); mode = "won"; S.win();
    var stars = moves >= 8 ? 3 : moves >= 3 ? 2 : 1;
    if ((save.stars[li] || 0) < stars) save.stars[li] = stars;
    if (li + 2 > save.open) save.open = Math.min(LEVELS.length, li + 2);
    if (score > save.hi) save.hi = score;
    ui.persist(); ui.runEnded();
    ui.menu({
      title: "Shed closed",
      body: LEVELS[li].name + " is finished. " + stars + " star" + (stars > 1 ? "s" : "") + " on the cloth.",
      stats: '<b class="ff-score-xl">' + FF.n(score) + "</b><span>" + moves + " moves left</span>",
      buttons: li + 1 < LEVELS.length
        ? [{ label: "Next loom", act: function () { play(li + 1); } }, { label: "Menu", small: true, act: toTitle }]
        : [{ label: "Menu", act: toTitle }]
    });
  }
  function failLevel() {
    ui.stop(); mode = "fail"; S.fail(); ui.runEnded();
    ui.menu({
      title: "Warp stuck",
      body: "No moves left, and the goal is still on the loom.",
      buttons: [{ label: "Try again", act: function () { play(li); } }, { label: "Menu", small: true, act: toTitle }]
    });
  }
  function play(i) {
    li = i; var lv = LEVELS[i];
    grid = fillBoard(lv, (save.seed || 1) * 100 + i);
    moves = lv.moves; score = 0; cascade = 0; sel = null; busy = false; anim = null;
    need = { collect: Object.assign({}, lv.collect), tangles: lv.tangles, boats: lv.boats };
    got = { collect: {} }; boatsLeft = lv.boats;
    ui.setCourse((i + 1) + ". " + lv.name);
    hud(); mode = "play"; A.playSong(SONG); ui.go(); ui.showPads(false);
  }
  function toTitle() {
    ui.stop(); mode = "title"; A.playSong(SONG); ui.showPads(false);
    ui.setCourse("The loom");
    var open = save.open || 1;
    ui.menu({
      title: "WEFTSHED",
      body: "Swap neighbouring yarns so three or more of a dye run together. Clear knots, drop shuttles, finish the cloth.",
      stats: "<span>HIGH SCORE " + (save.hi ? FF.n(save.hi) : "-") + "</span><span>LOOMS " + open + "/" + LEVELS.length + "</span>",
      buttons: [{ label: "Play loom " + open, act: function () { play(Math.min(open, LEVELS.length) - 1); } }],
      row: LEVELS.map(function (lv, i) {
        return { label: (i + 1) + ((save.stars[i] ? " " + "★".repeat(save.stars[i]) : "")), act: function () { play(i); }, disabled: i >= open };
      }),
      help: ["Swipe or tap two neighbours to swap.", "Four in a line makes a shuttle; five a bobbin; an L or T a heddle frame."],
      fine: "Forest Forge · original work. Weaving mood only — no sweets, no copied goals.",
      app: true
    });
  }

  function layout() {
    var pad = 16, top = 18, bot = 88;
    var size = Math.min((ui.VW - pad * 2) / COLS, (ui.VH - top - bot) / ROWS);
    var ox = (ui.VW - size * COLS) / 2, oy = top + (ui.VH - top - bot - size * ROWS) / 2 * 0.3;
    return { s: size, ox: ox, oy: oy };
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
    if (mode !== "play") return;
    if (anim) tickAnim(dt);
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var cell = grid[r][c];
      if (cell.pop > 0) cell.pop = Math.max(0, cell.pop - dt);
      if (cell.fall) cell.fall = Math.max(0, cell.fall - dt * 8);
      if (cell.born) cell.born = Math.max(0, cell.born - dt * 6);
    }
  }

  function drawYarn(c, x, y, s, col, knot, boat, special, pop) {
    var k = (col - 1) % YARN.length, cx = x + s / 2, cy = y + s / 2, rad = s * 0.38 * (pop ? 1 + pop : 1);
    c.beginPath(); c.arc(cx, cy, rad, 0, Math.PI * 2);
    c.fillStyle = YARN[k]; c.fill();
    c.strokeStyle = YARN_DK[k]; c.lineWidth = 2; c.stroke();
    // yarn wrap
    c.beginPath(); c.arc(cx, cy, rad * 0.62, 0, Math.PI * 2);
    c.strokeStyle = "rgba(255,255,240,.35)"; c.lineWidth = 2; c.stroke();
    c.beginPath(); c.strokeStyle = YARN_DK[k]; c.lineWidth = 1.4;
    c.moveTo(cx - rad * 0.2, cy - rad * 0.5); c.quadraticCurveTo(cx + rad * 0.4, cy, cx - rad * 0.15, cy + rad * 0.5); c.stroke();
    if (knot) {
      c.strokeStyle = "#3a2410"; c.lineWidth = 3;
      c.beginPath(); c.moveTo(cx - 6, cy - 6); c.lineTo(cx + 6, cy + 6); c.moveTo(cx + 6, cy - 6); c.lineTo(cx - 6, cy + 6); c.stroke();
      if (knot > 1) { c.beginPath(); c.arc(cx, cy, 8, 0, Math.PI * 2); c.stroke(); }
    }
    if (boat) {
      c.fillStyle = "#6a3a14";
      c.fillRect(cx - 8, cy - 4, 16, 7);
      c.fillStyle = "#d8c070";
      c.beginPath(); c.moveTo(cx, cy - 10); c.lineTo(cx + 6, cy - 3); c.lineTo(cx, cy - 3); c.fill();
    }
    if (special) {
      c.fillStyle = "#fff6d0"; c.font = "bold " + Math.floor(s * 0.32) + "px Georgia"; c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText(special === 3 ? "B" : special === 4 ? "H" : "S", cx, cy + 1);
    }
  }
  function render(c) {
    var W = ui.VW, H = ui.VH;
    var bg = c.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#8a5a30"); bg.addColorStop(1, "#3a2210");
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    // loom frame
    var L = layout();
    c.fillStyle = "#6a3e1c";
    c.fillRect(L.ox - 10, L.oy - 10, L.s * COLS + 20, L.s * ROWS + 20);
    c.fillStyle = "#c8a060";
    c.fillRect(L.ox - 10, L.oy - 14, L.s * COLS + 20, 8);
    c.fillRect(L.ox - 10, L.oy + L.s * ROWS + 6, L.s * COLS + 20, 8);
    if (!grid) return;
    for (var r = 0; r < ROWS; r++) for (var col = 0; col < COLS; col++) {
      var x = L.ox + col * L.s, y = L.oy + r * L.s, cell = grid[r][col];
      c.fillStyle = (r + col) % 2 ? "#d8c49a" : "#c8b078";
      c.fillRect(x + 1, y + 1, L.s - 2, L.s - 2);
      if (cell.col) {
        var fy = (cell.fall || 0) * L.s * -0.6;
        drawYarn(c, x, y + fy, L.s, cell.col, cell.knot, cell.boat, cell.special, cell.pop);
      } else if (cell.pop > 0) {
        c.globalAlpha = cell.pop * 4; c.fillStyle = "#fff4d0";
        c.beginPath(); c.arc(x + L.s / 2, y + L.s / 2, L.s * 0.3, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
      }
    }
    if (sel) {
      c.strokeStyle = "#fff4c0"; c.lineWidth = 3;
      c.strokeRect(L.ox + sel[0] * L.s + 2, L.oy + sel[1] * L.s + 2, L.s - 4, L.s - 4);
    }
  }

  var game = {
    toTitle: toTitle, update: update, render: render, onPointer: onPointer,
    onBack: function () { if (mode === "title") return "exit"; toTitle(); return "menu"; },
    play: play,
    qa: {
      play: play,
      winNow: function () { got.collect = Object.assign({}, need.collect); boatsLeft = 0; for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) grid[r][c].knot = 0; hud(); winLevel(); },
      autoSwap: function () {
        if (busy || mode !== "play") return false;
        for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
          var opts = []; if (c + 1 < COLS) opts.push([c + 1, r]); if (r + 1 < ROWS) opts.push([c, r + 1]);
          for (var i = 0; i < opts.length; i++) {
            var b = opts[i], ca = grid[r][c], cb = grid[b[1]][b[0]];
            grid[r][c] = cb; grid[b[1]][b[0]] = ca;
            var ok = hasLine(grid, c, r) || hasLine(grid, b[0], b[1]);
            grid[r][c] = ca; grid[b[1]][b[0]] = cb;
            if (ok) { trySwap([c, r], b); return true; }
          }
        }
        return false;
      },
      state: function () { return { mode: mode, level: li + 1, moves: moves, score: score, busy: busy, goal: goalText(), met: grid ? goalsMet() : false }; }
    }
  };
  ui.onAdsRemoved = function () { if (mode === "title") toTitle(); };
  ui.start(game);
})();
