/* Nettle Run (Forest Forge). Wren Ashby runs the nettle hills: eat to keep the
 * stamina bar up, throw flints, ride the hill-cart. Ten short stages built on the
 * shared Forest Forge platform engine (platform.js), which Kilnbound also uses.
 * All art drawn in code, all sound generated (shell.js). */
(function () {
  "use strict";
  var clamp = FF.clamp, TS = PF.TS;
  var ui = FF.create({
    id: "nettle-run", title: "Nettle Run", course: "The hills", wide: true, view: { w: 640, h: 360, flex: true },
    stats: [{ id: "score", label: "Score" }, { id: "lives", label: "Lives", value: "3" }],
    pads: {
      left: [{ id: "L", icon: "left", aria: "Left", keys: ["ArrowLeft", "KeyA"] }, { id: "R", icon: "right", aria: "Right", keys: ["ArrowRight", "KeyD"] }],
      right: [{ id: "T", label: "Flint", aria: "Throw", keys: ["KeyX", "KeyK", "ShiftLeft"] }, { id: "J", icon: "up", cls: "big", aria: "Jump", keys: ["Space", "ArrowUp", "KeyW", "KeyZ", "KeyJ"] }]
    }
  });
  var A = ui.audio, save = ui.save;
  save.open = save.open || 1; save.best = save.best || {}; save.hi = save.hi || 0;

  var PX = 2, lo = document.createElement("canvas"), g = lo.getContext("2d"), W = 320, H = 180;
  function sizeLo() { W = Math.ceil(ui.VW / PX); H = Math.ceil(ui.VH / PX); lo.width = W; lo.height = H; g.imageSmoothingEnabled = false; }

  // ---------- stages from hand-made segments ----------
  // g: one char per column: ground height in tiles from the bottom (0 = pit), w = water.
  // o: rows (from the top, 12 rows) with pickups / creatures / props:
  // o apple  b berries  m melon  c hill-cart  f flint pouch  C signpost (checkpoint)  G goal
  // s snail  k frog  q bee  z bat  h hedgehog  p fish  R rock  ^ nettles  = plank
  var SEG = {
    start: ["2222222222", {}],
    meadow: ["2222222222222222", { 6: "   o    o    o  " }],
    fruitrow: ["22222222222222", { 8: "  b b b b b b  " }],
    snail: ["22222222222222", { 9: "        s     ", 7: "  o        o  " }],
    snail2: ["2222222222222222", { 9: "    s       s   ", 6: "       m        " }],
    pit: ["222222000222222", { 6: "      o o      " }],
    pit2: ["22222000022222", { 5: "     b  b     " }],
    steps: ["2222334455443322", { 3: "       oo       " }],
    ledge: ["22223333333322222", { 6: "     o  k  o     " }],
    plats: ["2222000000000222", { 8: "     ===  ===    ", 6: "      o    o     " }],
    nettles: ["2222222222222222", { 9: "    ^^     ^^   ", 7: "     o     o    " }],
    rocks: ["22222222222222", { 9: "   R      R    ", 7: "        b     " }],
    frog: ["222222222222222", { 9: "         k     ", 6: "    o          " }],
    bees: ["2222222222222222", { 6: "      q       q ", 8: "  b      b      " }],
    hog: ["22222222222222", { 9: "         h    ", 6: "   o   o      " }],
    water: ["22222www22222", { 9: "      p     ", 6: "    o  o    " }],
    water2: ["2222www3333www22222", { 9: "     p      p      ", 4: "        m          " }],
    cart: ["22222222222222", { 9: "   c          " }],
    flint: ["2222222222", { 8: "    f     " }],
    check: ["22222222", { 9: "    C   " }],
    high: ["2222000333000444000222", { 4: "            o    o    ", 6: "      o               " }],
    bats: ["2222222222222222", { 4: "    z      z    ", 8: "  o      o      " }],
    hill: ["22233444555555444332222", { 3: "         m           ", 8: "   o                " }],
    mixed: ["22222222200022222222", { 9: "  R   ^^      s      ", 6: "      o   o      o   " }],
    gauntlet: ["222222222222222222222", { 9: "   s   ^^  h    ^^   ", 5: "    o   q    o   q   " }],
    goal: ["2222222222222222", { 9: "        G       " }]
  };
  var STAGES = [
    { name: "Nettle Bank", th: "meadow", segs: ["start", "flint", "meadow", "snail", "fruitrow", "pit", "steps", "snail2", "rocks", "check", "plats", "frog", "nettles", "cart", "meadow", "pit2", "bees", "goal"] },
    { name: "Clover Rise", th: "meadow", segs: ["start", "flint", "fruitrow", "ledge", "snail", "pit", "bees", "rocks", "steps", "check", "nettles", "frog", "high", "cart", "snail2", "hill", "pit2", "goal"] },
    { name: "Bramble Lane", th: "meadow", segs: ["start", "flint", "snail", "nettles", "hog", "pit", "fruitrow", "mixed", "check", "bees", "plats", "rocks", "frog", "cart", "steps", "hog", "goal"] },
    { name: "Oak Hollow", th: "woods", segs: ["start", "flint", "meadow", "bats", "snail", "pit2", "hog", "check", "ledge", "plats", "frog", "bats", "cart", "high", "nettles", "goal"] },
    { name: "Fern Deep", th: "woods", segs: ["start", "flint", "bats", "rocks", "high", "frog", "fruitrow", "check", "gauntlet", "pit", "bees", "cart", "hill", "hog", "bats", "goal"] },
    { name: "Reed Marsh", th: "marsh", segs: ["start", "flint", "water", "snail", "fruitrow", "water2", "frog", "check", "pit2", "nettles", "water", "cart", "bees", "water2", "goal"] },
    { name: "Heron Flats", th: "marsh", segs: ["start", "flint", "water2", "hog", "plats", "check", "water", "mixed", "frog", "fruitrow", "cart", "water2", "gauntlet", "goal"] },
    { name: "Heather Top", th: "hills", segs: ["start", "flint", "hill", "rocks", "high", "check", "steps", "gauntlet", "fruitrow", "cart", "pit2", "high", "hog", "goal"] },
    { name: "Long Ridge", th: "hills", segs: ["start", "flint", "mixed", "plats", "bats", "check", "hill", "gauntlet", "fruitrow", "water", "cart", "high", "bees", "pit", "goal"] },
    { name: "Moon Common", th: "night", segs: ["start", "flint", "bats", "gauntlet", "fruitrow", "check", "high", "water2", "mixed", "cart", "bats", "plats", "gauntlet", "hill", "goal"] }
  ];
  var THEMES = {
    meadow: { sky: ["#5a8ad0", "#cfe6f0"], sun: "#fff4c0", far: "#8ab0c8", near: "#6a9a5a", trees: "#3a6a3a", dirt: "#8a5a32", dirtD: "#6a4424", top: "#5ab03a", topD: "#3a8a2a", deco: ["#f05a8a", "#f0e05a", "#fff"], plank: "#b07a40", water: "#2a6aa8", waterHi: "#8ad0f0", spike: "#2e7a2e", rock: "#7a7268" },
    woods: { sky: ["#3a5a4a", "#a8c8a0"], far: "#3a5a3a", near: "#2a4a2a", trees: "#1a3a1a", dirt: "#6a4a2a", dirtD: "#4a321c", top: "#3a8a2a", topD: "#2a6a1e", deco: ["#e8d070", "#c8e0a0"], plank: "#8a5a2a", water: "#1a4a5a", waterHi: "#6aa0a0", spike: "#2a6a2a", rock: "#5a5a50" },
    marsh: { sky: ["#6a8a9a", "#e0e0c8"], sun: "#fff8d8", far: "#8a9a8a", near: "#7a8a5a", dirt: "#6a5a3a", dirtD: "#4a4028", top: "#8a9a3a", topD: "#6a7a2a", deco: ["#e8e0a0"], plank: "#9a7a4a", water: "#2a5a6a", waterHi: "#a8d0c8", spike: "#4a7a3a", rock: "#6a6a5a" },
    hills: { sky: ["#4a3a6a", "#f0a868"], sun: "#ffd890", far: "#6a4a6a", near: "#7a4a5a", trees: "#3a2a3a", dirt: "#7a5040", dirtD: "#5a3a30", top: "#a85aa0", topD: "#7a3a7a", deco: ["#f0c0f0", "#fff"], plank: "#9a6a3a", water: "#3a4a8a", waterHi: "#a8a8e0", spike: "#4a6a3a", rock: "#7a6a68" },
    night: { sky: ["#05081a", "#2a2a4a"], stars: 1, far: "#1a1a30", near: "#14182a", trees: "#0a0e18", dirt: "#3a2e2a", dirtD: "#2a201e", top: "#2a5a3a", topD: "#1a3a2a", deco: ["#a0c8ff"], plank: "#6a4a2a", water: "#1a2a4a", waterHi: "#5a7ab0", spike: "#2a4a2a", rock: "#4a4a50" }
  };
  function buildStage(si) {
    var st = STAGES[si], rows = []; for (var r = 0; r < 12; r++) rows.push("");
    st.segs.forEach(function (name) {
      var s = SEG[name], gs = s[0], ov = s[1], w = gs.length;
      for (var x = 0; x < w; x++) {
        var c = gs[x], hgt = c === "w" ? 0 : +c;
        for (var y = 0; y < 12; y++) {
          var ch = " ";
          if (c === "w") ch = y >= 10 ? "w" : " ";
          else if (y >= 12 - hgt) ch = "#";
          var o = ov[y] && ov[y][x]; if (o && o !== " ") ch = o;
          rows[y] += ch;
        }
      }
    });
    return PF.Level(rows, { theme: THEMES[st.th], seed: si + 3 });
  }

  // ---------- art ----------
  var bmp = PF.bmp;
  var ITEM = {
    o: bmp(["...d..", "..d...", ".aaaa.", "abaaaa", "aaaaaa", "aaaaaa", ".aaaa."], { a: "#e83a2a", b: "#ffb0a0", d: "#4a8a2a" }),
    b: bmp([".d.d.", "a.a.a", "aaaaa", ".aaa."], { a: "#7a3ab0", d: "#3a8a2a" }),
    m: bmp(["..aaaa..", ".abababa", "abababab", "abababab", ".abababa", "..aaaa.."], { a: "#2a8a2a", b: "#6ad04a" }),
    f: bmp(["..aa..", ".abba.", "abbbba", "abccba", ".aaaa."], { a: "#5a3a1a", b: "#a8805a", c: "#e8e8f0" }),
    c: bmp([".aaaaaaaaaa.", "abbbbbbbbbba", "aaaaaaaaaaaa", ".cc......cc.", ".cc......cc."], { a: "#8a4a1a", b: "#c87a3a", c: "#2a2a2a" }),
    C: bmp(["aaaaaaa", "abbbbba", "aaaaaaa", "...c...", "...c...", "...c...", "...c...", "...c..."], { a: "#6a4a2a", b: "#f0e0a0", c: "#5a3a1a" }),
    G: bmp(["...aa...", "..abba..", ".abbbba.", "abbbbbba", "...cc...", "...cc...", "...cc...", "...cc...", "...cc...", "...cc...", "..cccc.."], { a: "#c8a020", b: "#ffe060", c: "#6a4a2a" })
  };
  var PAL = { hair: "#3a2414", skin: "#e8b48a", skinD: "#b88460", top: "#3a8a4a", leg: "#6a4a2a", legD: "#4a321c", boot: "#2a1a0e", band: "#e83a2a" };

  // ---------- sound ----------
  var S = {
    jump: function () { A.tone({ f: 330, f2: 700, dur: 0.1, type: "square", gain: 0.1 }); },
    eat: function () { A.tone({ f: 880, f2: 1320, dur: 0.08, type: "square", gain: 0.09 }); },
    stomp: function () { A.tone({ f: 500, f2: 120, dur: 0.12, type: "square", gain: 0.14 }); },
    throw: function () { if (A.sfxOk()) A.noise({ dur: 0.08, gain: 0.12, freq: 2000, filter: "bandpass" }); },
    pop: function () { A.noise({ dur: 0.12, gain: 0.2, freq: 900, filter: "bandpass" }); },
    hurt: function () { [523, 392, 262, 196].forEach(function (f, i) { A.tone({ f: f, dur: 0.14, type: "square", gain: 0.12, delay: i * 0.1 }); }); },
    trip: function () { A.tone({ f: 200, f2: 90, dur: 0.15, type: "triangle", gain: 0.2 }); },
    item: function () { [660, 880, 1100].forEach(function (f, i) { A.tone({ f: f, dur: 0.08, type: "square", gain: 0.1, delay: i * 0.06 }); }); },
    check: function () { [523, 659, 784].forEach(function (f, i) { A.tone({ f: f, dur: 0.12, type: "triangle", gain: 0.18, delay: i * 0.09 }); }); },
    clear: function () { [523, 587, 659, 784, 880, 1047].forEach(function (f, i) { A.tone({ f: f, dur: 0.16, type: "square", gain: 0.11, delay: i * 0.11 }); }); },
    low: function () { A.tone({ f: 1200, dur: 0.05, type: "square", gain: 0.05 }); }
  };
  var SONG = { bpm: 150, order: [0, 0, 1, 0], parts: [[
    { wave: "square", gain: 0.05, pat: "C5 . E5 G5 . E5 C5 . D5 . F5 A5 . F5 D5 . E5 . G5 C6 . G5 E5 . D5 . B4 G4 . B4 D5 ." },
    { wave: "triangle", gain: 0.2, pat: "C3 . G2 . C3 . G2 . D3 . A2 . D3 . A2 . C3 . G2 . C3 . G2 . G2 . D3 . G2 . B2 ." },
    { wave: "drum", pat: "k . h . s . h . k . h k s . h . k . h . s . h . k . h k s . o ." }], [
    { wave: "square", gain: 0.05, pat: "A4 . C5 E5 . C5 A4 . F4 . A4 C5 . A4 F4 . G4 . B4 D5 . B4 G4 . C5 - - . . . . ." },
    { wave: "triangle", gain: 0.2, pat: "A2 . E3 . A2 . E3 . F2 . C3 . F2 . C3 . G2 . D3 . G2 . D3 . C3 . G2 . C3 . . ." },
    { wave: "drum", pat: "k . h . s . h . k . h k s . h . k . h . s . h . k k s . s s o ." }]] };
  var SONG_NIGHT = { bpm: 120, order: [0], parts: [[
    { wave: "triangle", gain: 0.14, pat: "A4 - C5 - E5 - D5 C5 B4 - G4 - A4 - - - F4 - A4 - C5 - B4 A4 G#4 - E4 - A4 - - -" },
    { wave: "square", gain: 0.03, pat: "A2 E3 A3 E3 A2 E3 A3 E3 G2 D3 G3 D3 G2 D3 G3 D3 F2 C3 F3 C3 F2 C3 F3 C3 E2 B2 E3 B2 E2 B2 G#2 B2" },
    { wave: "drum", pat: "k . h . s . h . k . h . s . h h k . h . s . h . k k h . s . h h" }]] };
  var SONG_TITLE = { bpm: 100, swing: 0.1, order: [0], parts: [[
    { wave: "square", gain: 0.05, pat: "G4 - B4 - D5 - G5 - E5 - D5 - B4 - - - C5 - E5 - D5 - B4 - A4 - G4 - - -" },
    { wave: "triangle", gain: 0.2, pat: "G2 - D3 - G2 - D3 - C3 - G2 - C3 - G2 - A2 - E3 - D3 - A2 - D3 - - -" }]] };

  // ---------- state ----------
  var L, cam = PF.Camera(), parts = PF.Parts(), stageI = 0, mode = "title";
  var hero, foes = [], items = [], flints = [], score = 0, lives = 3, food = 1, hasFlint = false, cart = false, cp = null, t = 0, banner = "", bannerT = 0, dead = 0, won = 0, lowBeep = 0, stageStartScore = 0;
  function newHero(x, y) { return { x: x, y: y, w: 8, h: 18, vx: 0, vy: 0, face: 1, ground: false, coyote: 0, buffer: 0, inv: 0, ph: 0, throwT: 0, trip: 0 }; }
  function loadStage(i, keepScore) {
    stageI = i; L = buildStage(i); foes = []; items = []; flints = []; parts.clear(); cp = null; hasFlint = false; cart = false; food = 1; won = 0; dead = 0;
    L.ents.forEach(function (e) {
      var f = PF.Foes.make(e.ch, e.x, e.y);
      if (f) { foes.push(f); return; }
      if (ITEM[e.ch]) items.push({ k: e.ch, x: e.x + 4, y: e.y + 4, w: 8, h: 8, tx: e.x, ty: e.y });
    });
    hero = newHero(2 * TS, 8 * TS); cam.x = 0; cam.y = L.ph - H;
    if (!keepScore) score = 0;
    stageStartScore = score;
    ui.setCourse("Stage " + (i + 1) + " · " + STAGES[i].name);
    banner = STAGES[i].name; bannerT = 2;
    A.playSong(STAGES[i].th === "night" ? SONG_NIGHT : SONG);
    hud();
  }
  function hud() { ui.setStat("score", FF.n(score)); ui.setStat("lives", lives); }
  function respawn() {
    var at = cp || { x: 2 * TS, y: 8 * TS };
    hero = newHero(at.x, at.y - 4); hero.inv = 1.5; food = 1; cart = false; dead = 0; flints = [];
    // creatures behind the checkpoint come back
    foes.forEach(function (f) { if (!f.alive && f.hx > at.x + 120) { var n = PF.Foes.make(f.kind, f.hx - (TS - f.w) / 2, f.hy); if (n) { Object.assign(f, n); } } });
    cam.x = Math.max(0, at.x - W * 0.3);
  }
  function hurt(kind) {
    if (hero.inv > 0 || dead) return;
    if (cart) { cart = false; hero.inv = 1.2; S.trip(); parts.add(hero.x + 4, hero.y + 16, 14, "#c87a3a", 80); banner = "The cart's gone"; bannerT = 1; return; }
    die(kind);
  }
  function die(kind) {
    if (dead) return;
    dead = 1.6; lives--; (game.deaths = game.deaths || []).push([kind, Math.round(hero.x / TS), stageI]); hud(); S.hurt(); A.stopSong(); hero.vy = -260; hero.vx = 0; hero.dieKind = kind;
  }

  // ---------- update ----------
  function update(dt) {
    t += dt; bannerT -= dt;
    if (won) { won -= dt; if (won <= 0) stageClear(); parts.step(dt); return; }
    if (dead) {
      dead -= dt; hero.vy += 900 * dt; hero.y += hero.vy * dt; parts.step(dt);
      if (dead <= 0) { if (lives <= 0) return gameOver(); respawn(); A.playSong(STAGES[stageI].th === "night" ? SONG_NIGHT : SONG); }
      return;
    }
    var h = hero;
    // stamina
    food -= dt / 42;
    if (food < 0.25) { lowBeep -= dt; if (lowBeep <= 0) { lowBeep = 0.5; S.low(); } }
    if (food <= 0) { food = 0; die("hunger"); return; }
    // input
    var dir = (ui.down("L") ? -1 : 0) + (ui.down("R") ? 1 : 0);
    var maxV = cart ? 165 : 108, acc = h.ground ? 900 : 620;
    if (h.trip > 0) { h.trip -= dt; dir = 0; }
    if (cart) { var want = dir > 0 ? 165 : dir < 0 ? 70 : 115; h.vx += clamp(want - h.vx, -acc * dt, acc * dt); h.face = 1; }
    else if (dir) { h.vx += dir * acc * dt; h.vx = clamp(h.vx, -maxV, maxV); h.face = dir; }
    else { var fr = (h.ground ? 1100 : 300) * dt; h.vx = Math.abs(h.vx) <= fr ? 0 : h.vx - Math.sign(h.vx) * fr; }
    // jump with coyote time and buffer
    if (ui.hit("J")) h.buffer = 0.12;
    h.buffer -= dt; h.coyote -= dt;
    if (h.buffer > 0 && h.coyote > 0) { h.vy = cart ? -350 : -330; h.buffer = 0; h.coyote = 0; S.jump(); }
    if (!ui.down("J") && h.vy < -120) h.vy = -120;
    h.vy = Math.min(420, h.vy + 900 * dt);
    var r = PF.move(L, h, dt);
    if (r.ground) { if (!h.ground && h.vy >= 0) parts.add(h.x + 4, h.y + h.h, 3, "#d8c8a0", 30, 0.2, 0); h.ground = true; h.coyote = 0.09; } else h.ground = false;
    h.ph += Math.abs(h.vx) * dt * 0.14;
    if (h.inv > 0) h.inv -= dt;
    // throw
    h.throwT -= dt;
    if (ui.hit("T")) {
      if (!hasFlint) { if (bannerT < 0) { banner = "Find a flint pouch first"; bannerT = 1; } }
      else if (flints.length < 2 && h.throwT <= 0) { h.throwT = 0.25; flints.push({ x: h.x + 4 + h.face * 6, y: h.y + 6, w: 5, h: 5, vx: h.face * 230 + h.vx * 0.4, vy: -110, spin: 0 }); S.throw(); }
    }
    // hazards
    if (PF.touching(L, { x: h.x + 1, y: h.y + 4, w: h.w - 2, h: h.h - 4 }, "hurt")) hurt("nettles");
    if (PF.touching(L, { x: h.x, y: h.y + 6, w: h.w, h: h.h - 6 }, "water")) die("water");
    if (h.y > L.ph + 20) die("fall");
    if (PF.touching(L, { x: h.x + 2, y: h.y + h.h - 6, w: h.w - 4, h: 6 }, "rock") && h.trip <= 0 && h.ground) {
      h.trip = 0.45; h.vx *= 0.2; food = Math.max(0.01, food - 0.12); S.trip(); parts.add(h.x + 4, h.y + 14, 6, "#9a9284", 50);
      PF.overlapTiles(L, { x: h.x + 2, y: h.y + h.h - 6, w: h.w - 4, h: 6 }, function (c, tx, ty) { if (c === "R") L.set(tx, ty, " "); });
      if (cart) hurt("rock");
    }
    // flints
    flints.forEach(function (f) {
      f.vy += 500 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.spin += dt * 20;
      if (L.solid(Math.floor((f.x + 2) / TS), Math.floor((f.y + 2) / TS)) || f.y > L.ph || Math.abs(f.x - h.x) > W) f.dead = true;
      // flints break rocks too
      if (L.get(Math.floor((f.x + 2) / TS), Math.floor((f.y + 2) / TS)) === "R") { L.set(Math.floor((f.x + 2) / TS), Math.floor((f.y + 2) / TS), " "); f.dead = true; S.pop(); parts.add(f.x, f.y, 8, "#9a9284", 60); score += 50; }
    });
    // creatures
    foes.forEach(function (f) {
      if (!f.alive) return;
      if (Math.abs(f.x - h.x) > W * 1.2) return;
      PF.Foes.step(f, L, dt, h);
      flints.forEach(function (s) { if (!s.dead && PF.aabb(s, f)) { s.dead = true; kill(f, 100); } });
      if (!f.alive) return;
      if (PF.Foes.ART[f.kind] && PF.aabb({ x: h.x, y: h.y, w: h.w, h: h.h }, f)) {
        if (f.kind === "p" && !f.jump) return;
        var stomp = h.vy > 60 && h.y + h.h - f.y < 8 && !f.spiky;
        if (stomp) { kill(f, 200); h.vy = ui.down("J") ? -300 : -200; S.stomp(); }
        else hurt(f.kind);
      }
    });
    flints = flints.filter(function (f) { return !f.dead; });
    // items
    items.forEach(function (it) {
      if (it.got || !PF.aabb(h, it)) return;
      if (it.k === "o") { it.got = 1; food = Math.min(1, food + 0.14); score += 50; S.eat(); }
      else if (it.k === "b") { it.got = 1; food = Math.min(1, food + 0.07); score += 30; S.eat(); }
      else if (it.k === "m") { it.got = 1; food = Math.min(1, food + 0.35); score += 500; S.eat(); banner = "Melon! +500"; bannerT = 1; }
      else if (it.k === "f") { it.got = 1; hasFlint = true; S.item(); banner = "Flints: tap Flint to throw"; bannerT = 1.6; }
      else if (it.k === "c") { it.got = 1; cart = true; S.item(); banner = "Hill-cart! Hold right to fly"; bannerT = 1.6; }
      else if (it.k === "C" && (!cp || cp.x < it.x)) { cp = { x: it.x, y: it.y - 8 }; S.check(); banner = "Checkpoint"; bannerT = 1; }
      else if (it.k === "G" && !won) { won = 1.6; S.clear(); A.stopSong(); h.vx = 0; }
      if (it.got) hud();
    });
    parts.step(dt);
    PF.follow(cam, L, h, W, H, dt, { forwardOnly: false });
  }
  function kill(f, pts) { f.alive = false; score += pts; parts.add(f.x + f.w / 2, f.y + f.h / 2, 10, "#fff0b0", 70); S.pop(); hud(); }

  // ---------- render ----------
  function render(c, tt) {
    if (!W) sizeLo();
    if (!L) { loadStage(0); }
    var th = L.theme;
    PF.drawBack(g, th, cam, W, H, tt);
    PF.drawTiles(g, L, th, cam, W, H, tt);
    items.forEach(function (it) {
      if (it.got) return; var img = ITEM[it.k], bob = it.k === "C" || it.k === "G" ? 0 : Math.round(Math.sin(tt * 4 + it.x) * 1.5);
      var ox = it.k === "C" || it.k === "G" ? it.tx + (TS - img.width) / 2 : it.x + 4 - img.width / 2, oy = it.k === "C" || it.k === "G" ? it.ty + TS - img.height : it.y + 4 - img.height / 2 + bob;
      g.drawImage(img, Math.round(ox - cam.x), Math.round(oy - cam.y));
    });
    foes.forEach(function (f) { if (f.alive && Math.abs(f.x - cam.x - W / 2) < W) PF.Foes.draw(g, f, cam, tt); });
    flints.forEach(function (f) { g.fillStyle = "#d8d8e0"; g.fillRect(Math.round(f.x - cam.x), Math.round(f.y - cam.y), 4, 4); g.fillStyle = "#6a6a70"; g.fillRect(Math.round(f.x - cam.x + (Math.floor(f.spin) % 2) * 2), Math.round(f.y - cam.y + 1), 2, 2); });
    if (hero && mode !== "title" && (hero.inv <= 0 || Math.floor(tt * 14) % 2)) drawHero(tt);
    parts.draw(g, cam);
    if (mode !== "title" && hero) drawHud(tt);
    c.drawImage(lo, 0, 0, W * PX, H * PX);
    if (mode === "play" && !ui.menuOpen && bannerT > 0) ui.text(banner, ui.VW / 2, ui.VH * 0.22, 20, "#ffe3a0", "center", "#ff9a2a");
  }
  function drawHero(tt) {
    var h = hero, hx = h.x + h.w / 2 - cam.x, hy = h.y + h.h - 9 - cam.y, pose;
    if (dead) pose = PF.POSE.hurt;
    else if (h.trip > 0) pose = PF.POSE.crouch;
    else if (h.throwT > 0.1) pose = PF.POSE.throw;
    else if (cart) pose = { lean: 0.2, tf: 0.6, sf: -0.1, tb: -0.3, sb: -0.6, af: 1.0, ff: 1.6, ab: -0.4, fb: 0.4 };
    else if (!h.ground) pose = h.vy < 0 ? PF.POSE.jump : PF.POSE.fall;
    else if (Math.abs(h.vx) > 8) pose = PF.runPose(h.ph, Math.abs(h.vx) / 108);
    else pose = PF.POSE.stand;
    if (cart) { hy -= 4; g.drawImage(ITEM.c, Math.round(hx - 6), Math.round(h.y + h.h - 5 - cam.y)); }
    PF.figure(g, Math.round(hx), Math.round(hy), pose, PAL, h.face < 0);
  }
  function drawHud(tt) {
    // stamina bar: little apples
    g.fillStyle = "rgba(5,5,5,0.55)"; g.fillRect(4, 4, 86, 9);
    var n = 16, k = Math.ceil(food * n);
    for (var i = 0; i < n; i++) { g.fillStyle = i < k ? (food < 0.25 && Math.floor(tt * 6) % 2 ? "#fff" : i < 4 ? "#e83a2a" : i < 9 ? "#f0a030" : "#7ad04a") : "#2a1a08"; g.fillRect(6 + i * 5, 6, 4, 5); }
    if (hasFlint) g.drawImage(ITEM.f, 94, 5);
    if (cart) g.drawImage(ITEM.c, 102, 6);
  }

  // ---------- flow ----------
  function stageClear() {
    ui.stop(); mode = "clear";
    var bonus = Math.round(food * 16) * 200; score += bonus; hud();
    var stScore = score - stageStartScore, b = save.best[stageI] || 0, nb = stScore > b;
    if (nb) save.best[stageI] = stScore; if (stageI + 2 > save.open) save.open = Math.min(STAGES.length, stageI + 2);
    if (score > save.hi) save.hi = score; ui.persist();
    var last = stageI + 1 >= STAGES.length;
    ui.menu({ kicker: "Stage " + (stageI + 1) + " · " + STAGES[stageI].name, title: last ? "All the hills run!" : "Stage clear",
      stats: '<b class="ff-score-xl">' + FF.n(score) + "</b><span>STAMINA BONUS " + FF.n(bonus) + "</span><span>" + (nb ? "STAGE BEST " + FF.n(stScore) : "STAGE BEST " + FF.n(b)) + "</span>",
      buttons: last ? [{ label: "Menu", act: toTitle }] : [{ label: "Stage " + (stageI + 2), act: function () { mode = "play"; loadStage(stageI + 1, true); ui.go(); } }, { label: "Menu", small: true, act: toTitle }] });
    if (last) ui.runEnded();
  }
  function gameOver() {
    ui.stop(); mode = "over"; ui.runEnded(); A.stopSong();
    var hi = score > save.hi; if (hi) save.hi = score; ui.persist();
    var why = { hunger: "Wren ran out of puff.", water: "Into the water.", fall: "Down the hole.", nettles: "Stung by the nettles." }[hero.dieKind] || "Caught by the locals.";
    ui.menu({ title: "Game over", body: why, stats: '<b class="ff-score-xl">' + FF.n(score) + "</b><span>" + (hi ? "NEW HIGH SCORE" : "HIGH SCORE " + FF.n(save.hi)) + "</span>",
      buttons: [{ label: "Try stage " + (stageI + 1) + " again", act: function () { play(stageI); } }, { label: "Menu", act: toTitle }] });
  }
  function play(i) { mode = "play"; lives = 3; loadStage(i, false); ui.go(); }
  function stageList() {
    ui.menu({ title: "Stages", html: '<table class="ff-table">' + STAGES.map(function (s, i) { return "<tr><td>" + (i + 1) + ". " + s.name + "</td><td>" + (i < save.open ? (save.best[i] ? FF.n(save.best[i]) : "open") : "locked") + "</td></tr>"; }).join("") + "</table>",
      row: STAGES.map(function (s, i) { return { label: String(i + 1), disabled: i >= save.open, act: function () { play(i); } }; }), buttons: [{ label: "Back", small: true, act: toTitle }] });
  }
  function toTitle() {
    ui.stop(); mode = "title"; loadStage(0); A.playSong(SONG_TITLE); ui.setCourse("The hills");
    var next = Math.min(save.open, STAGES.length) - 1;
    ui.menu({ title: "NETTLE RUN", body: "Wren Ashby, ten hills and an empty stomach.",
      stats: "<span>HIGH SCORE " + (save.hi ? FF.n(save.hi) : "-") + "</span><span>STAGES OPEN " + save.open + "/" + STAGES.length + "</span>",
      buttons: [{ label: next ? "Play stage " + (next + 1) : "Play", act: function () { play(next); } }, { label: "Stages", act: stageList }], app: true,
      help: ["◀ ▶ run, Jump (hold for higher), Flint throws once you've found the pouch.", "The apple bar at the top drains: eat fruit to keep going. Rocks trip you and cost stamina.", "Ride the hill-cart: faster, higher, and it takes one knock for you."],
      fine: "A Forest Forge game" });
  }
  var game = {
    toTitle: toTitle, onResize: sizeLo, update: update, render: render,
    idle: function (dt) { if (mode === "title" && L) { cam.x += dt * 30; if (cam.x > L.pw - W) cam.x = 0; } },
    onBack: function () { if (mode === "title") return "exit"; toTitle(); return "menu"; }
  };
  ui.onAdsRemoved = function () { if (mode === "title") toTitle(); };
  game.qa = { play: play, state: function () { return { mode: mode, x: hero && hero.x, y: hero && hero.y, vx: hero && hero.vx, ground: hero && hero.ground, food: food, lives: lives, stage: stageI, score: score, dead: dead, won: won, pw: L.pw }; }, level: function () { return L; }, foes: function () { return foes; }, warp: function (x) { hero.x = x; hero.y = 0; }, feed: function () { food = 1; }, inv: function () { hero.inv = 1e9; }, lives: function (n) { lives = n; } };
  ui.start(game);
})();
