/* Tickmites (Forest Forge). Brass clockwork mites march through a clock tower.
 * Spend a tool on one mite — Brace, Bore, Ratchet, Fuse or Vent — and get
 * enough of them to the winding arbor. Not a folk of little walkers in coats. */
(function () {
  "use strict";
  (function applyChrome(css) {
    var s = document.createElement("style"); s.id = "ff-palette"; s.textContent = css;
    document.head.appendChild(s);
    var m = document.querySelector('meta[name="theme-color"]');
    var bg = /--bg:([^;}]+)/.exec(css); if (m && bg) m.setAttribute("content", bg[1].trim());
  })(`:root{--bg:#2a1a10;--water:#1e140c;--amber:#f0d8a0;--amber-hi:#f0c060;--amber-soft:#f8e8c0;--amber-line:#c88840;--ember:#e07030;--btn:#3a2414;--lamp:#fff4d8;--glow-line:rgba(220,160,70,.4);--glow-fill:rgba(220,160,70,.1)}.ff-host{background:radial-gradient(ellipse at 50% 20%, #4a2e18 0%, transparent 55%), var(--bg)}.ff-hud{background:linear-gradient(#3a2414,#1e140c);border-bottom-color:rgba(200,136,64,.4)}` + (window.FFX ? FFX.menuChrome() : ""));

  var TS = 20;
  var ui = FF.create({
    id: "tickmites", title: "Tickmites", course: "The tower", wide: true, view: { w: 640, h: 360, flex: true },
    stats: [{ id: "in", label: "Home", value: "0" }, { id: "time", label: "Spring", value: "-" }],
    pads: {
      left: [
        { id: "BRACE", label: "Brace", keys: ["Digit1", "KeyQ"] },
        { id: "BORE", label: "Bore", keys: ["Digit2", "KeyW"] },
        { id: "RATCH", label: "Ratchet", keys: ["Digit3", "KeyE"] }
      ],
      right: [
        { id: "FUSE", label: "Fuse", keys: ["Digit4", "KeyR"] },
        { id: "VENT", label: "Vent", keys: ["Digit5", "KeyT"] }
      ]
    }
  });
  var A = ui.audio, save = ui.save;
  save.open = save.open || 1;
  var S = {
    pick: function () { A.tone({ f: 700, dur: 0.04, type: "square", gain: 0.04 }); },
    tool: function () { A.tone({ f: 420, f2: 640, dur: 0.08, type: "triangle", gain: 0.06 }); },
    home: function () { [523, 659, 784].forEach(function (f, i) { A.tone({ f: f, dur: 0.07, type: "triangle", gain: 0.06, delay: i * 0.06 }); }); },
    lose: function () { [300, 200, 140].forEach(function (f, i) { A.tone({ f: f, dur: 0.12, type: "square", gain: 0.07, delay: i * 0.1 }); }); },
    win: function () { [392, 523, 659, 784, 1047].forEach(function (f, i) { A.tone({ f: f, dur: 0.09, type: "triangle", gain: 0.08, delay: i * 0.08 }); }); }
  };
  var SONG = { bpm: 100, order: [0, 0, 1], parts: [[
    { wave: "square", gain: 0.03, pat: "E4 . . E4 G4 . B4 . A4 . G4 . E4 . D4 . E4 ." },
    { wave: "triangle", gain: 0.03, pat: "E2 . . . B2 . . . A2 . . . E2 . . . D2 . . . A2 . . . E2 . . . B2 ." }
  ], [
    { wave: "square", gain: 0.03, pat: "A3 . . A3 C4 . E4 . D4 . C4 . A3 . G3 . A3 ." },
    { wave: "triangle", gain: 0.03, pat: "A2 . . . E2 . . . G2 . . . D2 . . . A2 . . . E2 . . . A2 . . . E2 ." }
  ]] };

  var TOOLS = ["BRACE", "BORE", "RATCH", "FUSE", "VENT"];
  var LEVELS = [
    { name: "Winding lobby", need: 4, out: 6, time: 45, tools: { BRACE: 2, BORE: 0, RATCH: 0, FUSE: 1, VENT: 0 },
      map: [
        "################################",
        "#S                            E#",
        "#                              #",
        "################################"
      ] },
    { name: "The gap", need: 4, out: 6, time: 50, tools: { BRACE: 0, BORE: 0, RATCH: 0, FUSE: 3, VENT: 0 },
      map: [
        "################################",
        "#S              #             E#",
        "#              #               #",
        "########      ###      #########",
        "################################"
      ] },
    { name: "Through the plate", need: 4, out: 6, time: 50, tools: { BRACE: 0, BORE: 4, RATCH: 0, FUSE: 0, VENT: 0 },
      map: [
        "################################",
        "#S          ##########        E#",
        "#           ##########         #",
        "################################"
      ] },
    { name: "Up the ratchet", need: 4, out: 6, time: 55, tools: { BRACE: 1, BORE: 0, RATCH: 4, FUSE: 0, VENT: 0 },
      map: [
        "################################",
        "#                    ##########E#",
        "#                    ###########",
        "#S                   ###########",
        "################################"
      ] },
    { name: "Two floors", need: 5, out: 8, time: 60, tools: { BRACE: 1, BORE: 0, RATCH: 0, FUSE: 0, VENT: 4 },
      map: [
        "################################",
        "#S                             #",
        "#                              #",
        "################################",
        "#                             E#",
        "#                              #",
        "################################"
      ] },
    { name: "Brace turn", need: 5, out: 8, time: 60, tools: { BRACE: 3, BORE: 0, RATCH: 0, FUSE: 2, VENT: 0 },
      map: [
        "################################",
        "#S          #                 E#",
        "#           #                  #",
        "#########   ##############  ####",
        "################################"
      ] },
    { name: "Escapement", need: 5, out: 8, time: 70, tools: { BRACE: 2, BORE: 2, RATCH: 2, FUSE: 2, VENT: 1 },
      map: [
        "########################################",
        "#S        ####            #           #",
        "#         ####            #           #",
        "######    ####   #####    #   #########",
        "#                    #    #          E#",
        "#                    #                #",
        "########################################"
      ] },
    { name: "Mainspring loft", need: 6, out: 10, time: 80, tools: { BRACE: 3, BORE: 3, RATCH: 3, FUSE: 3, VENT: 2 },
      map: [
        "########################################",
        "#                    #####            E#",
        "#                    #####             #",
        "#S    ####                ####         #",
        "#     ####    ####        ####   ####  #",
        "#             ####               ####  #",
        "########################################"
      ] },
    { name: "Long lobby", need: 5, out: 8, time: 50, tools: { BRACE: 2, BORE: 0, RATCH: 0, FUSE: 0, VENT: 0 },
      map: [
        "################################",
        "#S                            E#",
        "#                              #",
        "################################"
      ] },
    { name: "Second gap", need: 4, out: 6, time: 55, tools: { BRACE: 0, BORE: 0, RATCH: 0, FUSE: 4, VENT: 0 },
      map: [
        "################################",
        "#S         #                  E#",
        "#          #                   #",
        "##########   ##       ##########",
        "################################"
      ] },
    { name: "Two plates", need: 4, out: 6, time: 55, tools: { BRACE: 0, BORE: 6, RATCH: 0, FUSE: 0, VENT: 0 },
      map: [
        "################################",
        "#S      ######    ######      E#",
        "#       ######    ######       #",
        "################################"
      ] },
    { name: "Clock stair", need: 5, out: 8, time: 65, tools: { BRACE: 1, BORE: 0, RATCH: 6, FUSE: 0, VENT: 0 },
      map: [
        "################################",
        "#                    ######   E#",
        "#                    ###########",
        "#                    ###########",
        "#S                   ###########",
        "################################"
      ] },
    { name: "Lower hall", need: 5, out: 8, time: 65, tools: { BRACE: 1, BORE: 0, RATCH: 0, FUSE: 0, VENT: 5 },
      map: [
        "################################",
        "#S              #              #",
        "#               #              #",
        "################################",
        "#                             E#",
        "#                              #",
        "################################"
      ] },
    { name: "Turn and gap", need: 5, out: 8, time: 65, tools: { BRACE: 4, BORE: 0, RATCH: 0, FUSE: 3, VENT: 0 },
      map: [
        "################################",
        "#S      #                     E#",
        "#       #                      #",
        "######  ######   ####    #######",
        "################################"
      ] },
    { name: "Gear hall", need: 6, out: 10, time: 80, tools: { BRACE: 2, BORE: 3, RATCH: 3, FUSE: 2, VENT: 1 },
      map: [
        "########################################",
        "#S         ####          #            #",
        "#          ####          #            #",
        "#####      ####   ####   #    #########",
        "#                   #    #           E#",
        "#                   #                 #",
        "########################################"
      ] },
    { name: "Great arbor", need: 7, out: 12, time: 90, tools: { BRACE: 3, BORE: 4, RATCH: 4, FUSE: 3, VENT: 3 },
      map: [
        "########################################",
        "#                     #####           E#",
        "#                     #####            #",
        "#S     ####                ####        #",
        "#      ####    ####        ####  ####  #",
        "#              ####              ####  #",
        "########################################"
      ] }
  ];

  var mode = "title", li = 0, grid, mites, spawns, tools, sel, stock, time, need, home, lost, over, won, spawnI, spawnT, W, H, ox, oy;

  function parse(lv) {
    var m = lv.map, w = 0, h = m.length;
    m.forEach(function (r) { if (r.length > w) w = r.length; });
    var g = [], spawn = [], exit = [];
    for (var y = 0; y < h; y++) {
      var row = [];
      for (var x = 0; x < w; x++) {
        var ch = m[y][x] || " ";
        if (ch === "S") { spawn.push({ x: x, y: y }); ch = " "; }
        if (ch === "E") { exit.push({ x: x, y: y }); ch = "e"; }
        row.push(ch);
      }
      g.push(row);
    }
    // exits are tall so mites that drop a row still find the arbor
    exit.forEach(function (e) {
      [-1, 1].forEach(function (dy) {
        if (g[e.y + dy] && g[e.y + dy][e.x] === " ") g[e.y + dy][e.x] = "e";
      });
    });
    return { g: g, w: w, h: h, spawn: spawn, exit: exit };
  }
  function solid(x, y) {
    if (y < 0 || x < 0 || x >= W || y >= H) return true;
    var ch = grid[y][x];
    return ch === "#" || ch === "b";
  }
  function floorAt(x, y) { return solid(x, y + 1); }
  function hud() {
    ui.setStat("in", home + "/" + need);
    ui.setStat("time", Math.ceil(Math.max(0, time)) + "s");
  }
  function spawnMite() {
    if (spawnI >= spawns.length * 20 && mites.filter(function (m) { return m.st === "walk" || m.st === "job"; }).length + (LEVELS[li].out - spawnI) <= 0) return;
    if (spawnI >= LEVELS[li].out) return;
    var s = spawns[spawnI % spawns.length];
    mites.push({ x: s.x + 0.2, y: s.y, dir: 1, st: "walk", job: null, jobT: 0, id: spawnI++ });
  }
  function assign(tool) {
    if (!sel || stock[tool] <= 0) return;
    var m = mites[sel]; if (!m || m.st === "home" || m.st === "lost" || m.st === "done") return;
    stock[tool]--; m.job = tool; m.jobT = 0; m.st = "job"; S.tool(); hud(); paintStock();
  }
  function stepMite(m, dt) {
    if (m.st === "home" || m.st === "lost" || m.st === "done") return;
    var tx = Math.floor(m.x + 0.5), ty = Math.round(m.y);
    // exit (this tile or a neighbour, so a mite at the arbor mouth counts)
    var atE = false;
    for (var dy = -1; dy <= 1 && !atE; dy++) for (var dx = -1; dx <= 1; dx++) {
      if (grid[ty + dy] && grid[ty + dy][tx + dx] === "e") atE = true;
    }
    if (atE) {
      if (window.FFX) { var Lh = layout(); FFX.burst(Lh.ox + m.x * Lh.s + Lh.s / 2, Lh.oy + m.y * Lh.s + Lh.s / 2, "#e8c050", 12, { spd: 90, r: 2.4, kind: "spark", g: 40 }); FFX.kick(0.25, "#ffe8a0"); }
      m.st = "home"; home++; S.home(); hud(); if (home >= need) winLevel(); return;
    }
    if (m.st === "job") {
      if (m.job === "BRACE") { m.st = "brace"; grid[ty] && (grid[ty][tx] = "b"); return; }
      if (m.job === "BORE") {
        m.jobT += dt;
        var fx = tx + m.dir, fy = ty;
        if (grid[fy] && grid[fy][fx] === "#") { grid[fy][fx] = " "; }
        m.x += m.dir * 2.2 * dt;
        if (m.jobT > 1.1) { m.st = "walk"; m.job = null; }
        return;
      }
      if (m.job === "RATCH") {
        // climb if wall ahead
        var fx = Math.floor(m.x + 0.5 + m.dir * 0.6);
        if (solid(fx, ty) && !solid(tx, ty - 1)) { m.y -= 2.4 * dt; m.jobT += dt; if (m.jobT > 1.2) { m.st = "walk"; m.job = null; } }
        else { m.st = "walk"; m.job = null; }
        return;
      }
      if (m.job === "FUSE") {
        var placed = 0;
        for (var i = 1; i <= 3; i++) {
          var fx = tx + m.dir * i, fy = ty + 1;
          if (grid[fy] && grid[fy][fx] === " ") { grid[fy][fx] = "#"; placed++; }
        }
        m.st = "walk"; m.job = null;
        return;
      }
      if (m.job === "VENT") {
        if (grid[ty + 1] && grid[ty + 1][tx] === "#") grid[ty + 1][tx] = " ";
        m.st = "walk"; m.job = null;
        return;
      }
    }
    if (m.st === "brace") return;
    // gravity
    if (!floorAt(Math.floor(m.x + 0.5), Math.round(m.y))) {
      m.y += 3.2 * dt;
      if (m.y > H + 1) { m.st = "lost"; lost++; }
      return;
    } else m.y = Math.round(m.y);
    // walk
    var nx = m.x + m.dir * 2.2 * dt;
    var ntx = Math.floor(nx + 0.5 + m.dir * 0.2);
    if (solid(ntx, ty)) { m.dir *= -1; }
    else m.x = nx;
  }
  function winLevel() {
    if (won) return; won = true; ui.stop(); S.win();
    if (li + 2 > save.open) save.open = Math.min(LEVELS.length, li + 2);
    ui.persist(); ui.runEnded();
    ui.menu({
      title: "Arbor reached",
      body: home + " mites have wound " + LEVELS[li].name + ".",
      buttons: li + 1 < LEVELS.length
        ? [{ label: "Next room", act: function () { play(li + 1); } }, { label: "Menu", small: true, act: toTitle }]
        : [{ label: "Menu", act: toTitle }]
    });
  }
  function loseLevel(msg) {
    if (over || won) return; over = true; ui.stop(); S.lose(); ui.runEnded();
    ui.menu({
      title: "The spring ran down",
      body: msg,
      buttons: [{ label: "Try again", act: function () { play(li); } }, { label: "Menu", small: true, act: toTitle }]
    });
  }
  function play(i) {
    li = i; var lv = LEVELS[i], p = parse(lv);
    grid = p.g.map(function (r) { return r.slice(); }); W = p.w; H = p.h; spawns = p.spawn;
    mites = []; tools = lv.tools; stock = Object.assign({}, lv.tools); sel = null;
    time = lv.time; need = lv.need; home = 0; lost = 0; over = false; won = false; spawnI = 0; spawnT = 0;
    if (window.FFX) FFX.reset(); ui.setCourse((i + 1) + ". " + lv.name); hud(); paintStock(); mode = "play"; A.playSong(SONG); ui.go(); ui.showPads(true);
  }
  var TOOL_NAME = { BRACE: "Brace", BORE: "Bore", RATCH: "Ratchet", FUSE: "Fuse", VENT: "Vent" };
  function paintStock() {
    TOOLS.forEach(function (t) { ui.setPadLabel(t, TOOL_NAME[t] + "\n" + (stock ? stock[t] : 0)); });
  }
  function toTitle() {
    ui.stop(); mode = "title"; A.playSong(SONG); ui.showPads(false); ui.setCourse("The tower");
    var open = save.open || 1;
    ui.menu({
      title: "TICKMITES",
      body: "Clockwork mites march through the tower. Spend a tool on one of them and get enough to the winding arbor before the mainspring runs down.",
      stats: "<span>ROOMS " + open + "/" + LEVELS.length + "</span>",
      buttons: [{ label: "Play room " + open, act: function () { play(Math.min(open, LEVELS.length) - 1); } }],
      row: LEVELS.map(function (lv, i) { return { label: String(i + 1), act: function () { play(i); }, disabled: i >= open }; }),
      help: ["Tap a mite, then a tool. Brace holds, Bore drills, Ratchet climbs, Fuse bridges, Vent drops through a floor.", "1–5 on the keyboard also pick a tool."],
      fine: "Forest Forge · original work. Clock-tower mood only — not a crowd of coated walkers.",
      app: true
    });
  }
  function layout() {
    var s = Math.min((ui.VW - 20) / W, (ui.VH - 30) / H);
    return { s: s, ox: (ui.VW - W * s) / 2, oy: (ui.VH - H * s) / 2 + 4 };
  }
  function onPointer(type, x, y) {
    if (mode !== "play" || type !== "pointerdown") return;
    var L = layout();
    var tx = Math.floor((x - L.ox) / L.s), ty = Math.floor((y - L.oy) / L.s);
    var best = null, bd = 1e9;
    mites.forEach(function (m, i) {
      if (m.st === "home" || m.st === "lost") return;
      var d = Math.hypot(m.x - tx, m.y - ty);
      if (d < bd && d < 1.4) { bd = d; best = i; }
    });
    if (best != null) { sel = best; S.pick(); }
  }
  var idleT = 0;
  function update(dt) {
    idleT += dt;
    if (window.FFX) FFX.step(dt);
    if (mode !== "play" || over || won) return;
    TOOLS.forEach(function (t) { if (ui.hit(t)) assign(t); });
    time -= dt; hud();
    if (time <= 0) return loseLevel("The mainspring has run out.");
    spawnT += dt;
    if (spawnT > 0.9 && spawnI < LEVELS[li].out) { spawnT = 0; spawnMite(); }
    mites.forEach(function (m) { stepMite(m, dt); });
    var still = mites.filter(function (m) { return m.st !== "home" && m.st !== "lost"; }).length;
    var leftToSpawn = LEVELS[li].out - spawnI;
    if (home + still + leftToSpawn < need) loseLevel("Too many mites were lost to reach the arbor.");
  }
  function render(c) {
    var Wv = ui.VW, Hv = ui.VH;
    var sh = window.FFX ? FFX.offset() : { x: 0, y: 0 };
    c.save(); c.translate(sh.x, sh.y);
    if (window.FFX) FFX.sky(c, Wv, Hv, "#6a3c18", "#3a2210", "#140c06");
    else {
      var g = c.createLinearGradient(0, 0, 0, Hv);
      g.addColorStop(0, "#4a2c14"); g.addColorStop(1, "#1a1008");
      c.fillStyle = g; c.fillRect(0, 0, Wv, Hv);
    }
    // clock-tower window
    c.fillStyle = "rgba(80,140,180,.12)";
    c.beginPath(); c.arc(Wv * 0.8, 36, 40, 0, Math.PI * 2); c.fill();
    c.strokeStyle = "rgba(200,160,80,.25)"; c.lineWidth = 3; c.stroke();
    if (!grid) { if (window.FFX) { FFX.vignette(c, Wv, Hv, 0.35); FFX.draw(c); } c.restore(); return; }
    var L = layout(), s = L.s;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var ch = grid[y][x], px = L.ox + x * s, py = L.oy + y * s;
      if (ch === "#") {
        if (window.FFX) FFX.bevelRoundRect(c, px, py, s, s, 2, (x + y) % 2 ? "#6e4a28" : "#5a3c20", "#2a1808");
        else { c.fillStyle = (x + y) % 2 ? "#6a4a28" : "#5a3c20"; c.fillRect(px, py, s, s); }
        c.fillStyle = "#c8a060"; c.fillRect(px, py, s, 2);
      } else if (ch === "b") {
        if (window.FFX) FFX.bevelRoundRect(c, px + 2, py + 2, s - 4, s - 4, 3, "#d08030", "#7a4010");
        else { c.fillStyle = "#c87020"; c.fillRect(px + 2, py + 2, s - 4, s - 4); }
      } else if (ch === "e") {
        c.save(); c.shadowColor = "rgba(255,200,60,.7)"; c.shadowBlur = 12;
        if (window.FFX) FFX.bevelRoundRect(c, px + 2, py + 2, s - 4, s - 4, 3, "#e8c050", "#6a4a10");
        else { c.fillStyle = "#e8c050"; c.fillRect(px + 2, py + 2, s - 4, s - 4); }
        c.restore();
        c.fillStyle = "#6a4a10"; c.fillRect(px + s * 0.35, py + s * 0.2, s * 0.3, s * 0.6);
      } else {
        c.fillStyle = "rgba(40,24,10,.28)"; c.fillRect(px, py, s, s);
      }
    }
    mites.forEach(function (m, i) {
      if (m.st === "lost") return;
      var px = L.ox + m.x * s + s / 2, py = L.oy + m.y * s + s / 2;
      if (m.st === "home") c.globalAlpha = 0.4;
      if (window.FFX) FFX.bevelCircle(c, px, py, s * 0.38, "#d4b05a", "#6a4a18", "#fff0c0");
      else { c.beginPath(); c.arc(px, py, s * 0.38, 0, Math.PI * 2); c.fillStyle = "#c8a050"; c.fill(); c.strokeStyle = "#6a4a18"; c.lineWidth = 1.2; c.stroke(); }
      var rot = (m.x + idleT * (m.st === "walk" ? 8 : 2));
      for (var tt = 0; tt < 8; tt++) {
        var a = tt * Math.PI / 4 + rot;
        c.fillStyle = "#e8c878";
        c.fillRect(px + Math.cos(a) * s * 0.34 - 1.6, py + Math.sin(a) * s * 0.34 - 1.6, 3.2, 3.2);
      }
      c.fillStyle = "#2a1a08"; c.fillRect(px - 2 + m.dir * 3, py - 3, 2, 2); c.fillRect(px - 2 + m.dir * 6, py - 3, 2, 2);
      if (i === sel) { c.strokeStyle = "#fff0a0"; c.lineWidth = 2; c.shadowColor = "#fff0a0"; c.shadowBlur = 8; c.beginPath(); c.arc(px, py, s * 0.52, 0, Math.PI * 2); c.stroke(); c.shadowBlur = 0; }
      c.globalAlpha = 1;
    });
    c.fillStyle = "rgba(60,36,16,.55)";
    c.fillRect(0, 0, Wv, L.oy);
    c.fillRect(0, L.oy + H * s, Wv, Hv - (L.oy + H * s));
    if (window.FFX) { FFX.vignette(c, Wv, Hv, 0.32); FFX.draw(c); }
    c.restore();
  }
  var game = {
    toTitle: toTitle, update: update, render: render, onPointer: onPointer,
    onBack: function () { if (mode === "title") return "exit"; toTitle(); return "menu"; },
    play: play,
    qa: {
      play: play,
      winNow: function () { home = need; hud(); winLevel(); },
      state: function () { return { mode: mode, level: li + 1, home: home, need: need, time: time, over: over, won: won, mites: mites ? mites.length : 0,
        pos: mites && mites.map(function (m) { return { x: +m.x.toFixed(2), y: +m.y.toFixed(2), dir: m.dir, st: m.st, tx: Math.floor(m.x + 0.5), ty: Math.round(m.y) }; }),
        endRow: grid && [0,1,2,3].map(function (y) { return (grid[y]||[]).slice(28).join(""); })
      }; }
    }
  };
  ui.onAdsRemoved = function () { if (mode === "title") toTitle(); };
  ui.start(game);
})();
