/* Quoinring (Forest Forge). Masonry stones of two or three hexes settle
 * inward in a hexagonal silo. Completing a ring drops it and the outer
 * work slides in. Not a falling-tetromino well: no 4-block pieces, no
 * 10x20 grid, no line-clear across a rectangle. All art and sound original. */
(function () {
  "use strict";
  (function applyChrome(css) {
    var s = document.createElement("style"); s.id = "ff-palette"; s.textContent = css;
    document.head.appendChild(s);
    var m = document.querySelector('meta[name="theme-color"]');
    var bg = /--bg:([^;}]+)/.exec(css); if (m && bg) m.setAttribute("content", bg[1].trim());
  })(`:root{--bg:#0a98b8;--sky1:#6af0e0;--sky2:#ff8a6a;--water:#0a7898;--amber:#ffffff;--amber-hi:#ffe14a;--amber-soft:#ffffff;--amber-line:#ff5a4a;--ember:#085a7a;--btn:#0a88a8;--lamp:#fff6d8;--pop1:#ffd23a;--pop2:#ff7a6a;--pop3:#ffffff;--glow-line:rgba(255,255,255,.55);--glow-fill:rgba(255,255,255,.14)}`);

  var R = 4, N6 = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  var STONE = ["#ffd23a", "#ff5a4a", "#2ad0b0", "#ff9a2a", "#a86aff", "#ff8ad8"];
  var STONE_DK = ["#d8a010", "#c83028", "#109a80", "#d0700a", "#7a3ad8", "#d058a8"];
  var ui = FF.create({
    deco: ["hex", "diamond", "spark"], 
    
    
    id: "quoinring", title: "Quoinring", course: "The silo", view: { w: 390, h: 720, flex: true },
    stats: [{ id: "score", label: "Score", value: "0" }, { id: "rings", label: "Rings", value: "0" }],
    pads: {
      left: [
        { id: "L", icon: "left", aria: "Orbit left", keys: ["ArrowLeft", "KeyA"] },
        { id: "R", icon: "right", aria: "Orbit right", keys: ["ArrowRight", "KeyD"] }
      ],
      right: [
        { id: "ROT", label: "Turn", aria: "Turn stone", keys: ["ArrowUp", "KeyW", "KeyX"] },
        { id: "DROP", label: "Set", cls: "big", aria: "Set inward", keys: ["Space", "ArrowDown", "KeyS"] }
      ]
    }
  });
  var A = ui.audio, save = ui.save;
  save.hi = save.hi || 0; save.bestRings = save.bestRings || 0; save.chal = save.chal || 0; save.yard = save.yard || 0;

  var S = {
    move: function () { if (A.sfxOk()) A.tone({ f: 420, f2: 380, dur: 0.04, type: "triangle", gain: 0.05 }); },
    rot: function () { if (A.sfxOk()) A.tone({ f: 520, f2: 700, dur: 0.06, type: "square", gain: 0.04 }); },
    lock: function () { A.noise({ dur: 0.08, gain: 0.08, freq: 240, filter: "lowpass" }); A.tone({ f: 180, dur: 0.08, type: "sine", gain: 0.06 }); },
    ring: function (n) {
      [392, 523, 659, 784].slice(0, 2 + n).forEach(function (f, i) { A.tone({ f: f, dur: 0.1, type: "triangle", gain: 0.08, delay: i * 0.07 }); });
    },
    over: function () { [330, 262, 196, 147].forEach(function (f, i) { A.tone({ f: f, dur: 0.16, type: "square", gain: 0.07, delay: i * 0.12 }); }); },
    win: function () { [523, 659, 784, 1047, 784, 1319].forEach(function (f, i) { A.tone({ f: f, dur: 0.1, type: "triangle", gain: 0.08, delay: i * 0.09 }); }); }
  };
  var SONG = { bpm: 112, order: [0, 0, 1, 0], parts: [[
    { wave: "triangle", gain: 0.045, pat: "G3 . B3 . D4 . G4 . E4 . D4 . B3 . G3 . A3 . C4 . E4 . D4 . B3 . G3 ." },
    { wave: "sine", gain: 0.03, pat: "G2 . . . D3 . . . E3 . . . B2 . . . C3 . . . G2 . . . D3 . . . G2 . . ." },
    { wave: "drum", gain: 0.05, pat: "k . . s k . h s k . . s k . h ." }
  ], [
    { wave: "triangle", gain: 0.045, pat: "A3 . C4 . E4 . A4 . G4 . E4 . C4 . A3 . F3 . A3 . C4 . D4 . B3 . G3 ." },
    { wave: "sine", gain: 0.03, pat: "A2 . . . E3 . . . F3 . . . C3 . . . G2 . . . D3 . . . G2 . . . D3 . . ." },
    { wave: "drum", gain: 0.05, pat: "k h . s k . h s k h . s . k s ." }
  ]] };

  function hx(q, r) { return q + "," + r; }
  function dist(q, r) { return (Math.abs(q) + Math.abs(q + r) + Math.abs(r)) / 2; }
  function rotCW(q, r) { return [-r, q + r]; }
  function inBoard(q, r) { var d = dist(q, r); return d >= 1 && d <= R; }
  function toward(q, r) {
    if (q === 0 && r === 0) return [0, 0];
    var best = null, bd = dist(q, r);
    for (var i = 0; i < 6; i++) {
      var nq = q + N6[i][0], nr = r + N6[i][1], d = dist(nq, nr);
      if (d < bd) { bd = d; best = [nq, nr]; }
    }
    return best || [q, r];
  }
  // polyhexes of 2 or 3 only (no 4-cell tetrahexes / no tetrominoes)
  var SHAPES = [
    [[0, 0], [1, 0]],
    [[0, 0], [1, 0], [2, 0]],
    [[0, 0], [1, 0], [1, -1]],
    [[0, 0], [1, 0], [0, 1]],
    [[0, 0], [1, -1], [0, -1]]
  ];

  var mode = "title", challenge = false, yard = -1, board, cur, nxt, score, rings, combo, tick, interval, flash, over, won, bag, qaAuto = 0, idleT = 0, ringsThis = 0;
  var YARDS = [
    { name: "First cut", goal: 2, pre: [] },
    { name: "Inner course", goal: 3, pre: [[3, 2]] },
    { name: "Rim start", goal: 3, pre: [[4, 3]] },
    { name: "Two courses", goal: 4, pre: [[2, 2], [4, 4]] },
    { name: "Tight well", goal: 4, pre: [[2, 1], [3, 2]] },
    { name: "Packed yard", goal: 5, pre: [[3, 1], [4, 2]] },
    { name: "Cross grain", goal: 5, pre: [[1, 1], [3, 2], [4, 5]] },
    { name: "Deep silo", goal: 6, pre: [[2, 0], [4, 3]] },
    { name: "Split work", goal: 6, pre: [[1, 2], [2, 3], [4, 2]] },
    { name: "Long haul", goal: 7, pre: [[3, 1], [4, 1]] },
    { name: "Crowded rim", goal: 8, pre: [[2, 0], [3, 1], [4, 2]] },
    { name: "Master yard", goal: 10, pre: [[1, 1], [2, 1], [3, 2], [4, 3]] }
  ];
  function emptyBoard() {
    var b = {};
    for (var q = -R; q <= R; q++) for (var r = -R; r <= R; r++) if (inBoard(q, r)) b[hx(q, r)] = 0;
    return b;
  }
  function cellsOk(cells) {
    var seen = {};
    for (var i = 0; i < cells.length; i++) {
      var q = cells[i][0], r = cells[i][1], k = hx(q, r);
      if (!inBoard(q, r) || seen[k]) return false;
      if (board[k] && !occupiedByCur(q, r)) return false;
      seen[k] = 1;
    }
    return true;
  }
  function occupiedByCur(q, r) {
    if (!cur) return false;
    for (var i = 0; i < cur.cells.length; i++) if (cur.cells[i][0] === q && cur.cells[i][1] === r) return true;
    return false;
  }
  function applyCells(cells) {
    if (!cellsOk(cells)) return false;
    cur.cells = cells;
    return true;
  }
  function orbit(dir) {
    var cells = cur.cells.map(function (c) {
      var p = c;
      if (dir > 0) p = rotCW(c[0], c[1]);
      else { var t = rotCW(c[0], c[1]); t = rotCW(t[0], t[1]); t = rotCW(t[0], t[1]); t = rotCW(t[0], t[1]); t = rotCW(t[0], t[1]); p = t; }
      return p;
    });
    return applyCells(cells);
  }
  function rotatePiece() {
    var c = cur.cells, ax = c[0][0], ay = c[0][1];
    var cells = c.map(function (p) {
      var v = rotCW(p[0] - ax, p[1] - ay);
      return [ax + v[0], ay + v[1]];
    });
    return applyCells(cells);
  }
  function inward(cells) {
    return cells.map(function (c) { return toward(c[0], c[1]); });
  }
  function tryInward() {
    var next = inward(cur.cells);
    var same = next.every(function (p, i) { return p[0] === cur.cells[i][0] && p[1] === cur.cells[i][1]; });
    if (same) return false;
    return applyCells(next);
  }
  function hardDrop() {
    var n = 0;
    while (tryInward()) n++;
    return n;
  }
  function lockPiece() {
    cur.cells.forEach(function (c) { board[hx(c[0], c[1])] = cur.col; });
    S.lock();
    cur = null;
    resolve();
    if (over || won) return;
    spawn();
  }
  function resolve() {
    var chain = 0;
    while (true) {
      var cleared = [];
      for (var ring = 1; ring <= R; ring++) {
        var cells = [], full = true;
        for (var q = -R; q <= R; q++) for (var r = -R; r <= R; r++) if (dist(q, r) === ring) {
          cells.push([q, r]);
          if (!board[hx(q, r)]) full = false;
        }
        if (full) cleared = cleared.concat(cells);
      }
      if (!cleared.length) break;
      chain++;
      cleared.forEach(function (c) { board[hx(c[0], c[1])] = 0; });
      var add = 120 * cleared.length / 6 * chain;
      score += Math.round(add);
      rings += cleared.length / (/* approx unique rings */ 6) > 0 ? 1 : 0;
      // count unique rings properly
      S.ring(chain);
      flash = { cells: cleared, t: 0.28 };
      collapse();
      if (challenge && rings >= 10) { won = true; endRun(true); return; }
    }
    // recount rings in this resolve using a safer counter: we added per clear loop
    hud();
  }
  // fix rings counting: track per completed ring in resolve more carefully — rewrite below in collapse path
  function collapse() {
    var moved = true, guard = 0;
    while (moved && guard++ < 20) {
      moved = false;
      var items = [];
      Object.keys(board).forEach(function (k) {
        if (!board[k]) return;
        var p = k.split(","), q = +p[0], r = +p[1];
        items.push({ q: q, r: r, col: board[k], d: dist(q, r) });
      });
      items.sort(function (a, b) { return a.d - b.d; });
      var next = emptyBoard();
      items.forEach(function (it) {
        var t = toward(it.q, it.r);
        if (t[0] === it.q && t[1] === it.r) { next[hx(it.q, it.r)] = it.col; return; }
        if (!next[hx(t[0], t[1])] && inBoard(t[0], t[1])) { next[hx(t[0], t[1])] = it.col; moved = true; }
        else next[hx(it.q, it.r)] = it.col;
      });
      board = next;
    }
  }
  function makePiece(shape, col) {
    return { cells: shape.map(function (p) { return p.slice(); }), col: col };
  }
  function refillBag() {
    var list = [];
    for (var i = 0; i < SHAPES.length; i++) list.push(i);
    for (var i = list.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = list[i]; list[i] = list[j]; list[j] = t; }
    bag = bag.concat(list);
  }
  function roll() {
    if (!bag.length) refillBag();
    var sh = SHAPES[bag.shift()];
    var col = 1 + Math.floor(Math.random() * STONE.length);
    var p = makePiece(sh, col);
    // sit the piece out on the rim, then orbit until it fits
    p.cells = p.cells.map(function (c) { return [c[0] + R, c[1] - Math.floor(c[0] / 2)]; });
    return p;
  }
  function placeOnRim(p) {
    var tries = [];
    var cells = p.cells;
    for (var orb = 0; orb < 6; orb++) {
      var c1 = cells;
      for (var rt = 0; rt < 6; rt++) {
        tries.push(c1.map(function (x) { return x.slice(); }));
        var ax = c1[0][0], ay = c1[0][1];
        c1 = c1.map(function (pt) { var v = rotCW(pt[0] - ax, pt[1] - ay); return [ax + v[0], ay + v[1]]; });
      }
      cells = cells.map(function (pt) { return rotCW(pt[0], pt[1]); });
    }
    for (var i = 0; i < tries.length; i++) if (cellsOk(tries[i])) { p.cells = tries[i]; return true; }
    return false;
  }
  function spawn() {
    cur = nxt || roll();
    nxt = roll();
    if (!placeOnRim(cur)) { cur = null; over = true; endRun(false); }
  }
  // wrap resolve with accurate ring count
  var resolveInner = resolve;
  resolve = function () {
    var chain = 0;
    while (true) {
      var cleared = [], ringCount = 0;
      for (var ring = 1; ring <= R; ring++) {
        var cells = [], full = true;
        for (var q = -R; q <= R; q++) for (var r = -R; r <= R; r++) if (dist(q, r) === ring) {
          cells.push([q, r]);
          if (!board[hx(q, r)]) full = false;
        }
        if (full) { cleared = cleared.concat(cells); ringCount++; }
      }
      if (!cleared.length) break;
      chain++;
      var cols = cleared.map(function (c) { return board[hx(c[0], c[1])]; });
      cleared.forEach(function (c) { board[hx(c[0], c[1])] = 0; });
      rings += ringCount; ringsThis += ringCount;
      score += Math.round(180 * ringCount * ringCount * chain);
      S.ring(chain);
      flash = { cells: cleared.slice(), t: 0.45 };
      if (window.FFX) {
        var Lx = layoutHex();
        cleared.forEach(function (cell, i) {
          var p = pix(cell[0], cell[1], Lx);
          var col = STONE[((cols[i] || 1) - 1) % STONE.length];
          FFX.burst(p[0], p[1], "#fff3c0", 8, { spd: 110, r: 3, kind: "spark", g: 80 });
          FFX.burst(p[0], p[1], col, 6, { spd: 70, r: 2.4, g: 160 });
        });
        FFX.kick(0.5 + ringCount * 0.15, "#fff4d0");
      }
      collapse();
      var goalR = challenge ? 10 : (yard >= 0 ? YARDS[yard].goal : 0);
      if (goalR && rings >= goalR) { won = true; endRun(true); return; }
    }
    hud();
  };

  function hud() {
    ui.setStat("score", FF.n(score));
    var goalR = challenge ? 10 : (yard >= 0 ? YARDS[yard].goal : 0);
    ui.setStat("rings", goalR ? rings + "/" + goalR : String(rings));
  }
  function endRun(win) {
    ui.stop();
    if (score > save.hi) save.hi = score;
    if (rings > save.bestRings) save.bestRings = rings;
    if (win && challenge) { if (!save.chal || score > save.chal) save.chal = score; }
    if (win && yard >= 0) { save.yard = Math.max(save.yard || 0, yard + 1); }
    ui.persist();
    if (win) S.win(); else S.over();
    ui.runEnded();
    var title = win ? (yard >= 0 ? YARDS[yard].name + " set" : "Ten rings set") : "The silo is full";
    var body = win ? "The keystone took the last ring. A tidy bit of work." : "No room left on the rim for another stone.";
    var btns = [];
    if (win && yard >= 0 && yard + 1 < YARDS.length) {
      btns.push({ label: "Next yard", act: function () { playYard(yard + 1); } });
    }
    btns.push({ label: win ? "Again" : "Try again", act: function () { if (yard >= 0) playYard(yard); else play(challenge); } });
    btns.push({ label: "Menu", small: true, act: toTitle });
    ui.menu({ title: title, body: body,
      stats: '<b class="ff-score-xl">' + FF.n(score) + "</b><span>" + rings + " rings · best " + save.bestRings + "</span><span>HIGH SCORE " + FF.n(save.hi) + "</span>",
      buttons: btns
    });
  }
  function prefillYard(yd) {
    (yd.pre || []).forEach(function (pr) {
      var ring = pr[0], leave = pr[1], cells = [];
      for (var q = -R; q <= R; q++) for (var r = -R; r <= R; r++) if (dist(q, r) === ring) cells.push([q, r]);
      cells.forEach(function (p, i) { if (i >= leave) board[hx(p[0], p[1])] = 1 + (i % STONE.length); });
    });
  }
  function play(chal) {
    challenge = !!chal; yard = -1;
    if (window.FFX) FFX.reset();
    board = emptyBoard();
    bag = []; refillBag();
    score = 0; rings = 0; ringsThis = 0; combo = 0; tick = 0;
    interval = chal ? 0.75 : 0.9;
    flash = null; over = false; won = false; cur = null; nxt = roll();
    spawn();
    hud();
    ui.setCourse(challenge ? "Ten rings" : "Open silo");
    mode = "play";
    A.playSong(SONG);
    ui.go();
    ui.showPads(true);
  }
  function playYard(i) {
    challenge = false; yard = i;
    if (window.FFX) FFX.reset();
    board = emptyBoard();
    prefillYard(YARDS[i]);
    bag = []; refillBag();
    score = 0; rings = 0; ringsThis = 0; combo = 0; tick = 0;
    interval = Math.max(0.48, 0.85 - i * 0.03);
    flash = null; over = false; won = false; cur = null; nxt = roll();
    spawn();
    hud();
    ui.setCourse((i + 1) + ". " + YARDS[i].name);
    mode = "play";
    A.playSong(SONG);
    ui.go();
    ui.showPads(true);
  }
  function toTitle() {
    ui.stop(); mode = "title"; A.playSong(SONG);
    if (window.FFX) FFX.reset();
    board = emptyBoard();
    // a little dressed silo for the title backdrop
    qaFillRing(3, 8); qaFillRing(4, 6);
    ui.showPads(false);
    ui.setCourse("The silo");
    save.yard = save.yard || 0;
    var yardBtns = [
      { label: "Open silo", act: function () { play(false); } },
      { label: "Ten rings", act: function () { play(true); } },
      { label: save.yard ? "Yards · " + Math.min(save.yard + 1, YARDS.length) + "/" + YARDS.length : "Yards", act: function () { playYard(Math.min(save.yard || 0, YARDS.length - 1)); } }
    ];
    ui.menu({
      title: "QUOINRING",
      body: "Two- and three-stone hexes settle toward the keystone. Fill a whole ring and the work drops in. No four-block pieces, and no straight well.",
      stats: "<span>HIGH SCORE " + (save.hi ? FF.n(save.hi) : "-") + "</span><span>BEST RINGS " + (save.bestRings || "-") + "</span>",
      buttons: yardBtns,
      help: ["Left and right orbit the stone around the silo.", "Turn rotates it. Set drops it in to a rest.", "Swipe around or inward, or tap the stone to turn it.", "Yards are twelve staged silos with a ring goal on each."],
      fine: "Forest Forge · original work. Masonry mood only.",
      app: true
    });
  }

  function update(dt) {
    idleT += dt;
    if (window.FFX) FFX.step(dt);
    if (flash) { flash.t -= dt; if (flash.t <= 0) flash = null; }
    if (mode !== "play" || over || won) return;
    if (ui.hit("L")) { if (orbit(-1)) S.move(); }
    if (ui.hit("R")) { if (orbit(1)) S.move(); }
    if (ui.hit("ROT")) { if (rotatePiece()) S.rot(); }
    if (ui.hit("DROP")) { hardDrop(); lockPiece(); return; }
    if (ui.down("DROP") && !ui.hit("DROP")) { /* pads hold not used; space is hit */ }
    interval = Math.max(0.28, (challenge ? 0.75 : 0.9) - rings * 0.03);
    tick += dt;
    var step = ui.down("DROP") ? interval * 0.15 : interval;
    // DROP is also hard drop on hit; don't also soft-drop the same press
    if (tick >= interval) {
      tick = 0;
      if (!tryInward()) lockPiece();
    }
    if (qaAuto > 0 && cur && !over) {
      qaAuto--;
      hardDrop();
      if (cur) lockPiece();
    }
  }

  // pointer: tap piece to rotate, swipe around to orbit, swipe toward centre to drop
  var ptr = null;
  function hexAt(x, y) {
    var layout = layoutHex();
    var q = ((Math.sqrt(3) / 3 * (x - layout.cx) - 1 / 3 * (y - layout.cy)) / layout.s);
    var r = ((2 / 3 * (y - layout.cy)) / layout.s);
    return cubeRound(q, r);
  }
  function cubeRound(q, r) {
    var x = q, z = r, y = -q - r;
    var rx = Math.round(x), ry = Math.round(y), rz = Math.round(z);
    var dx = Math.abs(rx - x), dy = Math.abs(ry - y), dz = Math.abs(rz - z);
    if (dx > dy && dx > dz) rx = -ry - rz;
    else if (dy > dz) ry = -rx - rz;
    else rz = -rx - ry;
    return [rx, rz];
  }
  function layoutHex() {
    var s = Math.min(ui.VW, ui.VH * 0.72) / (2 * R + 3) / 1.15;
    return { s: s, cx: ui.VW / 2, cy: ui.VH * 0.42 };
  }
  function pix(q, r, L) {
    // pointy-top: easier vertical "inward" reading? Use flat-top
    var x = L.cx + L.s * (3 / 2 * q);
    var y = L.cy + L.s * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
    return [x, y];
  }
  function onPointer(type, x, y) {
    if (mode !== "play" || !cur) return;
    if (type === "pointerdown") { ptr = { x: x, y: y, used: 0 }; return; }
    if (!ptr) return;
    if (type === "pointermove") {
      var dx = x - ptr.x, dy = y - ptr.y;
      if (ptr.used) return;
      if (Math.hypot(dx, dy) < 28) return;
      var L = layoutHex();
      // inward if moving toward centre
      var vx = L.cx - ptr.x, vy = L.cy - ptr.y, cross = dx * vx + dy * vy;
      var tang = dx * (-vy) + dy * vx;
      if (cross > Math.abs(tang) && cross > 0) { hardDrop(); lockPiece(); ptr.used = 1; }
      else { if (orbit(tang > 0 ? 1 : -1)) S.move(); ptr.used = 1; }
      return;
    }
    if (type === "pointerup") {
      if (!ptr.used) { if (rotatePiece()) S.rot(); }
      ptr = null;
    }
  }

  function drawHex(c, x, y, s, fill, stroke, inset) {
    c.beginPath();
    for (var i = 0; i < 6; i++) {
      var a = Math.PI / 180 * (60 * i);
      var px = x + (s - (inset || 0)) * Math.cos(a), py = y + (s - (inset || 0)) * Math.sin(a);
      if (i) c.lineTo(px, py); else c.moveTo(px, py);
    }
    c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1.2; c.stroke(); }
  }
  function paintStone(c, x, y, s, col, ghost) {
    var fill = STONE[(col - 1) % STONE.length], dk = STONE_DK[(col - 1) % STONE_DK.length];
    if (ghost) { c.globalAlpha = 0.38; }
    if (window.FFX) {
      FFX.bevelHex(c, x, y, s, fill, dk, "rgba(255,255,240,.4)");
      // mason tool-mark
      c.save();
      FFX.hexPath(c, x, y, s * 0.92); c.clip();
      c.strokeStyle = "rgba(10,40,80,.12)"; c.lineWidth = 1;
      for (var i = -2; i < 3; i++) { c.beginPath(); c.moveTo(x - s, y + i * s * 0.28); c.lineTo(x + s, y + i * s * 0.28 + s * 0.08); c.stroke(); }
      c.restore();
    } else {
      drawHex(c, x, y, s, fill, dk, 0);
      drawHex(c, x - s * 0.08, y - s * 0.1, s * 0.55, "rgba(255,255,240,.25)", null, 0);
    }
    c.globalAlpha = 1;
  }
  function drawBackdrop(c, W, H, L) {
    if (window.FFX) {
      FFX.sky(c, W, H, "#8fd4f0", "#bff0e0", "#3ab8a8");
      FFX.clouds(c, W, H * 0.45, idleT, "rgba(255,255,255,.22)");
    } else {
      var g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#7ec8e8"); g.addColorStop(0.45, "#bff0e0"); g.addColorStop(1, "#3ab8a8");
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    }
    // distant hills, sea-glass greens
    c.fillStyle = "#4ad0a8";
    c.beginPath(); c.moveTo(0, H * 0.62); c.quadraticCurveTo(W * 0.25, H * 0.5, W * 0.5, H * 0.58); c.quadraticCurveTo(W * 0.75, H * 0.66, W, H * 0.52); c.lineTo(W, H); c.lineTo(0, H); c.fill();
    c.fillStyle = "#2aa8b0";
    c.beginPath(); c.moveTo(0, H * 0.78); c.quadraticCurveTo(W * 0.4, H * 0.68, W, H * 0.74); c.lineTo(W, H); c.lineTo(0, H); c.fill();
    // silo bowl with rim highlight
    var rad = L.s * (R + 1.7) * 1.55;
    var bg = c.createRadialGradient(L.cx - rad * 0.15, L.cy - rad * 0.2, rad * 0.2, L.cx, L.cy, rad);
    bg.addColorStop(0, "#2ac8d8"); bg.addColorStop(0.7, "#0a88b8"); bg.addColorStop(1, "#085a8a");
    c.beginPath(); c.arc(L.cx, L.cy, rad, 0, Math.PI * 2); c.fillStyle = bg; c.fill();
    c.beginPath(); c.arc(L.cx, L.cy, rad, 0, Math.PI * 2);
    c.strokeStyle = "#ffd23a"; c.lineWidth = 7; c.stroke();
    c.beginPath(); c.arc(L.cx, L.cy, rad - 5, 0, Math.PI * 2);
    c.strokeStyle = "#ff7a6a"; c.lineWidth = 3; c.stroke();
    // inner well
    var ir = L.s * (R + 1.15) * 1.5;
    var ig = c.createRadialGradient(L.cx, L.cy, ir * 0.2, L.cx, L.cy, ir);
    ig.addColorStop(0, "#1a6aa8"); ig.addColorStop(1, "#0a3a78");
    c.beginPath(); c.arc(L.cx, L.cy, ir, 0, Math.PI * 2); c.fillStyle = ig; c.fill();
  }
  function render(c) {
    var W = ui.VW, H = ui.VH, L = layoutHex();
    var sh = window.FFX ? FFX.offset() : { x: 0, y: 0 };
    c.save(); c.translate(sh.x, sh.y);
    drawBackdrop(c, W, H, L);

    function paintCell(q, r, col, ghost) {
      var p = pix(q, r, L);
      paintStone(c, p[0], p[1], L.s * 0.92, col, ghost);
    }
    // empty sockets with mortar depth
    for (var q = -R; q <= R; q++) for (var r = -R; r <= R; r++) if (inBoard(q, r)) {
      var p = pix(q, r, L);
      if (window.FFX) FFX.bevelHex(c, p[0], p[1], L.s * 0.92, "#2a7ac8", "#0a4a90", "rgba(160,230,255,.35)");
      else drawHex(c, p[0], p[1], L.s * 0.92, "#2a7ac8", "#0a4a90", 0);
    }
    // keystone — polished brass with glow
    var k = pix(0, 0, L);
    if (window.FFX) {
      c.save();
      c.shadowColor = "rgba(255,210,80,.55)"; c.shadowBlur = 18;
      FFX.bevelHex(c, k[0], k[1], L.s * 0.98, "#ffe14a", "#e08a10", "rgba(255,255,220,.65)");
      c.restore();
      FFX.bevelHex(c, k[0], k[1], L.s * 0.48, "#fff6c0", "#ffb020", "rgba(255,255,255,.7)");
    } else {
      drawHex(c, k[0], k[1], L.s * 0.95, "#ffe14a", "#e08a10", 0);
      drawHex(c, k[0], k[1], L.s * 0.5, "#fff6c0", "#ffb020", 0);
    }
    // locked stones
    Object.keys(board || {}).forEach(function (key) {
      if (!board[key]) return;
      var p = key.split(",");
      paintCell(+p[0], +p[1], board[key], false);
    });
    if (flash && flash.cells) {
      c.globalAlpha = Math.max(0, flash.t / 0.45);
      flash.cells.forEach(function (cell) {
        var p = pix(cell[0], cell[1], L);
        if (window.FFX) FFX.bevelHex(c, p[0], p[1], L.s * 1.05, "#fff8d0", "#fff", "rgba(255,255,255,.8)");
        else drawHex(c, p[0], p[1], L.s * 1.02, "#fff4c0", "#fff", 0);
      });
      c.globalAlpha = 1;
    }
    if (cur && mode === "play") {
      var gcells = cur.cells.map(function (x) { return x.slice(); }), safety = 0;
      while (safety++ < 12) {
        var nxtc = inward(gcells);
        var same = nxtc.every(function (p, i) { return p[0] === gcells[i][0] && p[1] === gcells[i][1]; });
        if (same) break;
        var ok = true, curset = {};
        gcells.forEach(function (p) { curset[hx(p[0], p[1])] = 1; });
        for (var i = 0; i < nxtc.length; i++) {
          if (!inBoard(nxtc[i][0], nxtc[i][1])) { ok = false; break; }
          var occupied = board[hx(nxtc[i][0], nxtc[i][1])];
          if (occupied && !curset[hx(nxtc[i][0], nxtc[i][1])]) { ok = false; break; }
        }
        if (!ok) break;
        gcells = nxtc;
      }
      gcells.forEach(function (p) { paintCell(p[0], p[1], cur.col, true); });
      cur.cells.forEach(function (p) { paintCell(p[0], p[1], cur.col, false); });
    }
    // next
    if (nxt && mode === "play") {
      var ns = L.s * 0.48, nx = W - 72, ny = 78;
      if (window.FFX) FFX.bevelRoundRect(c, nx - 36, 14, 72, 86, 10, "#0a88a8", "#085a7a");
      else { c.fillStyle = "#0a88a8"; c.fillRect(nx - 36, 14, 72, 86); }
      ui.text("NEXT", nx, 28, 11, "#ffffff", "center");
      nxt.cells.forEach(function (p) {
        var x = nx + ns * (3 / 2 * (p[0] - nxt.cells[0][0]));
        var y = ny + ns * (Math.sqrt(3) / 2 * (p[0] - nxt.cells[0][0]) + Math.sqrt(3) * (p[1] - nxt.cells[0][1]));
        paintStone(c, x, y, ns * 0.9, nxt.col, false);
      });
    }
    if (window.FFX) { FFX.vignette(c, W, H, 0.3); FFX.draw(c); }
    c.restore();
    if (mode === "title") {
      // banner plate under the HTML menu
    }
  }

  function qaFillRing(ring, leave) {
    var cells = [];
    for (var q = -R; q <= R; q++) for (var r = -R; r <= R; r++) if (dist(q, r) === ring) cells.push([q, r]);
    cells.forEach(function (p, i) { if (i !== (leave || 0)) board[hx(p[0], p[1])] = 1 + (i % STONE.length); });
    return cells[leave || 0];
  }

  var game = {
    toTitle: toTitle, update: update, render: render, onPointer: onPointer,
    onBack: function () { if (mode === "title") return "exit"; toTitle(); return "menu"; },
    play: play,
    qa: {
      play: play,
      playYard: playYard,
      fillRing: qaFillRing,
      hardDrop: function () { if (cur) { hardDrop(); lockPiece(); } },
      state: function () { return { mode: mode, score: score, rings: rings, over: over, won: won, hasCur: !!cur, cells: board ? Object.keys(board).filter(function (k) { return board[k]; }).length : 0 }; }
    }
  };
  ui.onAdsRemoved = function () { if (mode === "title") toTitle(); };
  ui.start(game);
})();
