/* Hatchpair (Forest Forge). Rowan Kell, a joiner's apprentice, places a pair
 * of iron and copper hatch plates on flat surfaces. Step into one and you
 * leave through the other, speed kept. No gun, no oval doorways, no lab. */
(function () {
  "use strict";
  (function applyChrome(css) {
    var s = document.createElement("style"); s.id = "ff-palette"; s.textContent = css;
    document.head.appendChild(s);
    var m = document.querySelector('meta[name="theme-color"]');
    var bg = /--bg:([^;}]+)/.exec(css); if (m && bg) m.setAttribute("content", bg[1].trim());
  })(`:root{--bg:#6a5ad8;--sky1:#8af0d0;--sky2:#c08aff;--water:#5040b8;--amber:#ffffff;--amber-hi:#fff27a;--amber-soft:#ffffff;--amber-line:#ff8a3a;--ember:#3a2a98;--btn:#5a4ac8;--lamp:#fff6d8;--pop1:#8af0d0;--pop2:#ffe14a;--pop3:#ff9ad8;--glow-line:rgba(255,255,255,.55);--glow-fill:rgba(255,255,255,.14)}`);

  var TS = 20;
  var ui = FF.create({
    deco: ["square", "star", "circle"], 
    id: "hatchpair", title: "Hatchpair", course: "The attic", wide: true, view: { w: 640, h: 360, flex: true },
    stats: [{ id: "room", label: "Room", value: "1" }, { id: "hatches", label: "Hatches", value: "0" }],
    pads: {
      left: [{ id: "L", icon: "left", aria: "Left", keys: ["ArrowLeft", "KeyA"] }, { id: "R", icon: "right", aria: "Right", keys: ["ArrowRight", "KeyD"] }],
      right: [
        { id: "UP", icon: "up", aria: "Look up / jump", keys: ["ArrowUp", "KeyW"] },
        { id: "DN", icon: "down", aria: "Look down", keys: ["ArrowDown", "KeyS"] },
        { id: "J", label: "Jump", cls: "big", keys: ["Space", "KeyZ"] },
        { id: "H", label: "Hatch", keys: ["KeyX", "KeyF", "KeyC"] }
      ]
    }
  });
  var A = ui.audio, save = ui.save; save.open = save.open || 1;
  var S = {
    jump: function () { A.tone({ f: 280, f2: 420, dur: 0.08, type: "square", gain: 0.05 }); },
    land: function () { A.noise({ dur: 0.04, gain: 0.04, freq: 200, filter: "lowpass" }); },
    hatch: function () { A.tone({ f: 200, f2: 360, dur: 0.1, type: "triangle", gain: 0.06 }); },
    warp: function () { A.tone({ f: 180, f2: 520, dur: 0.12, type: "sine", gain: 0.07 }); },
    win: function () { [392, 494, 587, 784].forEach(function (f, i) { A.tone({ f: f, dur: 0.09, type: "triangle", gain: 0.08, delay: i * 0.08 }); }); },
    die: function () { [240, 180, 120].forEach(function (f, i) { A.tone({ f: f, dur: 0.12, type: "square", gain: 0.07, delay: i * 0.08 }); }); }
  };
  var SONG = { bpm: 104, order: [0, 0, 1], parts: [[
    { wave: "triangle", gain: 0.04, pat: "D3 . F3 . A3 F3 D3 . C3 . E3 . G3 E3 C3 . D3 F3 A3 F3 G3 . A3 ." },
    { wave: "sine", gain: 0.03, pat: "D2 . . . A2 . . . C2 . . . G2 . . . D2 . . . A2 . . . D2 . . . A2 ." }
  ], [
    { wave: "triangle", gain: 0.04, pat: "F3 . A3 . C4 A3 F3 . E3 . G3 . B3 G3 E3 . F3 A3 C4 A3 G3 . F3 ." },
    { wave: "sine", gain: 0.03, pat: "F2 . . . C3 . . . E2 . . . B2 . . . F2 . . . C3 . . . F2 . . . C3 ." }
  ]] };

  // maps: # wall, = floor, ^ spike, C crate, P player, X exit, B button, G gate, space empty
  var LEVELS = [
    { name: "First plates", blurb: "Put one hatch on the floor of the pit, the other on the far ledge, and drop in.",
      map: [
        "##############################",
        "#P                           #",
        "#                            #",
        "#######        ###############",
        "#            ^              X#",
        "#            ^               #",
        "##############################"
      ] },
    { name: "Up and over", blurb: "A floor hatch and a ceiling hatch will throw you up if you fall in with speed.",
      map: [
        "##############################",
        "#                           X#",
        "#                            #",
        "#P                           #",
        "#                            #",
        "##############################"
      ] },
    { name: "The crate", blurb: "Push the crate onto the plate to open the gate.",
      map: [
        "##############################",
        "#P        C            G    X#",
        "#                      G     #",
        "###########B##################",
        "##############################"
      ] },
    { name: "Through the wall", blurb: "A hatch on this side of the wall, and one on the other.",
      map: [
        "##############################",
        "#P            #             X#",
        "#             #              #",
        "##############################"
      ] },
    { name: "High shelf", blurb: "Drop into a floor hatch and come out of a wall hatch onto the shelf.",
      map: [
        "##############################",
        "#                    #####  X#",
        "#                    #####   #",
        "#P                           #",
        "#                            #",
        "##############################"
      ] },
    { name: "Two crates", blurb: "Both plates need a crate.",
      map: [
        "################################",
        "#P   C        C          G    X#",
        "#                        G     #",
        "########B########B##############",
        "################################"
      ] },
    { name: "Spike well", blurb: "Do not step in the well. Drop through a hatch instead.",
      map: [
        "##############################",
        "#P             ##############X#",
        "#              ###############",
        "#    ^^^^^^^                  #",
        "##############################"
      ] },
    { name: "The last attic", blurb: "A shelf, a crate, a gate, and a long drop. Pair the hatches carefully.",
      map: [
        "################################",
        "#                    #####    X#",
        "#                    #####     #",
        "#P     C                  G    #",
        "#                         G    #",
        "##########B#####################",
        "################################"
      ] },
    { name: "Long pit", blurb: "A wider drop. Floor hatch in the pit, far ledge hatch out.",
      map: [
        "################################",
        "#P                             #",
        "#                              #",
        "########          ##############",
        "#              ^              X#",
        "#              ^               #",
        "################################"
      ] },
    { name: "High catch", blurb: "Fall into a floor hatch and leave through a ceiling hatch onto the high ledge.",
      map: [
        "################################",
        "#                             X#",
        "#                              #",
        "#P                             #",
        "#                              #",
        "################################"
      ] },
    { name: "Crate bay", blurb: "Push the crate onto the plate. The gate hides the door.",
      map: [
        "################################",
        "#P     C              G       X#",
        "#                     G        #",
        "############B###################",
        "################################"
      ] },
    { name: "Thick wall", blurb: "A hatch this side, a hatch the other side of the chimney breast.",
      map: [
        "################################",
        "#P              ##            X#",
        "#               ##             #",
        "################################"
      ] },
    { name: "Cupboard", blurb: "Drop in and come out of a wall hatch onto the cupboard.",
      map: [
        "################################",
        "#                      ####   X#",
        "#                      ####    #",
        "#P                             #",
        "#                              #",
        "################################"
      ] },
    { name: "Twin plates", blurb: "Two crates, two plates, one gate.",
      map: [
        "################################",
        "#P  C         C          G    X#",
        "#                        G     #",
        "#######B#########B##############",
        "################################"
      ] },
    { name: "Nail well", blurb: "The well is nailed. Drop through a hatch, not into the points.",
      map: [
        "################################",
        "#P               #############X#",
        "#                ##############",
        "#     ^^^^^^^^                  #",
        "################################"
      ] },
    { name: "Joiner's end", blurb: "A high shelf, a crate, a gate and a drop. Pair the plates with care.",
      map: [
        "################################",
        "#                     ####    X#",
        "#                     ####     #",
        "#P    C                   G    #",
        "#                         G    #",
        "#########B######################",
        "################################"
      ] }
  ];

  var mode = "title", li = 0, grid, W, H, p, crates, hatches, which, buttons, gates, exit, dead, won, look, coyote, warpCD;

  function parse(lv) {
    var m = lv.map, w = 0, h = m.length;
    m.forEach(function (r) { if (r.length > w) w = r.length; });
    var g = [], crates0 = [], buttons0 = [], gates0 = [], start = { x: 2, y: 2 }, ex = { x: w - 3, y: 2 };
    for (var y = 0; y < h; y++) {
      var row = [];
      for (var x = 0; x < w; x++) {
        var ch = (m[y][x] || " ");
        if (ch === "P") { start = { x: x, y: y }; ch = " "; }
        if (ch === "X") { ex = { x: x, y: y }; ch = "x"; }
        if (ch === "C") { crates0.push({ x: x, y: y, vx: 0, vy: 0 }); ch = " "; }
        if (ch === "B") { buttons0.push({ x: x, y: y, on: false }); }
        if (ch === "G") { gates0.push({ x: x, y: y }); ch = "g"; }
        row.push(ch);
      }
      g.push(row);
    }
    return { g: g, w: w, h: h, start: start, exit: ex, crates: crates0, buttons: buttons0, gates: gates0 };
  }
  function solid(x, y, ignoreGates) {
    if (y < 0 || x < 0 || x >= W || y >= H) return true;
    var ch = grid[y][x];
    if (ch === "#" || ch === "=" || ch === "B") return true;
    if (ch === "g" && !ignoreGates && !gatesOpen()) return true;
    return false;
  }
  function gatesOpen() {
    if (!buttons.length) return true;
    return buttons.every(function (b) { return b.on; });
  }
  function rectHits(x, y, w, h, ignoreGates) {
    var x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.floor(x + w - 0.001), y1 = Math.floor(y + h - 0.001);
    for (var ty = y0; ty <= y1; ty++) for (var tx = x0; tx <= x1; tx++) if (solid(tx, ty, ignoreGates)) return true;
    return false;
  }
  function spikes(x, y, w, h) {
    var x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.floor(x + w - 0.001), y1 = Math.floor(y + h - 0.001);
    for (var ty = y0; ty <= y1; ty++) for (var tx = x0; tx <= x1; tx++) if (grid[ty] && grid[ty][tx] === "^") return true;
    return false;
  }

  var PW = 0.7, PH = 0.95;
  function moveBody(b, dt, isCrate) {
    b.vy += 22 * dt;
    if (b.vy > 18) b.vy = 18;
    var nx = b.x + b.vx * dt, ny = b.y + b.vy * dt;
    if (!rectHits(nx, b.y, b.w, b.h)) b.x = nx;
    else {
      // step up? no
      b.vx = 0;
    }
    var on = false;
    if (!rectHits(b.x, ny, b.w, b.h)) b.y = ny;
    else {
      if (b.vy > 0) { b.y = Math.floor(b.y + b.h) - b.h + 0.001; on = true; }
      else b.y = Math.floor(b.y) + 0.001;
      b.vy = 0;
    }
    b.on = on;
    return on;
  }
  var FACES = {
    N: { nx: 0, ny: -1 }, S: { nx: 0, ny: 1 }, E: { nx: 1, ny: 0 }, W: { nx: -1, ny: 0 }
  };
  function hatchPos(h) {
    var f = FACES[h.side];
    return { x: h.tx + 0.5 + f.nx * 0.5, y: h.ty + 0.5 + f.ny * 0.5, nx: f.nx, ny: f.ny };
  }
  function tryWarp(b) {
    if (warpCD > 0 || hatches[0] == null || hatches[1] == null) return false;
    for (var i = 0; i < 2; i++) {
      var h = hatches[i], hp = hatchPos(h);
      var cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      if (Math.hypot(cx - hp.x, cy - hp.y) > 0.7) continue;
      var incoming = b.vx * hp.nx + b.vy * hp.ny;
      if (incoming >= -0.4 && !b.on) continue; // must be moving into the plate (or standing in a floor hatch)
      if (h.side === "N" && b.on && Math.abs(b.vx) + Math.abs(b.vy) < 0.2) continue;
      var other = hatches[1 - i], op = hatchPos(other);
      // velocity: leave along the outward normal, keep speed
      var spd = Math.hypot(b.vx, b.vy) || 6;
      if (h.side === "N" && b.on) spd = Math.max(spd, 8);
      b.x = op.x - b.w / 2 + op.nx * 0.7;
      b.y = op.y - b.h / 2 + op.ny * 0.7;
      b.vx = op.nx * spd; b.vy = op.ny * spd;
      warpCD = 0.28; S.warp(); return true;
    }
    return false;
  }
  function placeHatch() {
    // ray from player centre in look / face direction
    var dirx = 0, diry = 0;
    if (look === "up") diry = -1;
    else if (look === "down") diry = 1;
    else dirx = p.face;
    var cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    var x = cx, y = cy, hit = null;
    for (var i = 0; i < 20; i++) {
      x += dirx * 0.2; y += diry * 0.2;
      var tx = Math.floor(x), ty = Math.floor(y);
      if (solid(tx, ty, true)) { hit = { tx: tx, ty: ty }; break; }
    }
    if (!hit) return;
    var side = diry < 0 ? "S" : diry > 0 ? "N" : dirx > 0 ? "W" : "E"; // face we hit is opposite our ray
    hatches[which] = { tx: hit.tx, ty: hit.ty, side: side };
    which = 1 - which;
    S.hatch(); ui.setStat("hatches", (hatches[0] ? 1 : 0) + (hatches[1] ? 1 : 0) + "/2");
  }
  function die() {
    if (dead || won) return; dead = true; S.die();
    setTimeout(function () { if (mode === "play") play(li); }, 700);
  }
  function winLevel() {
    if (won) return; won = true; ui.stop(); S.win();
    if (li + 2 > save.open) save.open = Math.min(LEVELS.length, li + 2);
    ui.persist(); ui.runEnded();
    ui.menu({
      title: "Room done",
      body: LEVELS[li].name + " is crossed.",
      buttons: li + 1 < LEVELS.length
        ? [{ label: "Next room", act: function () { play(li + 1); } }, { label: "Menu", small: true, act: toTitle }]
        : [{ label: "Menu", act: toTitle }]
    });
  }
  function play(i) {
    li = i; var p0 = parse(LEVELS[i]);
    grid = p0.g; W = p0.w; H = p0.h; exit = p0.exit; buttons = p0.buttons; gates = p0.gates;
    crates = p0.crates.map(function (c) { return { x: c.x + 0.1, y: c.y, w: 0.8, h: 0.8, vx: 0, vy: 0, on: false }; });
    p = { x: p0.start.x + 0.15, y: p0.start.y, w: PW, h: PH, vx: 0, vy: 0, face: 1, on: false };
    hatches = [null, null]; which = 0; dead = false; won = false; look = "side"; coyote = 0; warpCD = 0;
    ui.setCourse((i + 1) + ". " + LEVELS[i].name); ui.setStat("room", (i + 1) + "/" + LEVELS.length); ui.setStat("hatches", "0/2");
    mode = "play"; A.playSong(SONG); ui.go(); ui.showPads(true);
    ui.toast(LEVELS[i].blurb, 2200);
  }
  function toTitle() {
    ui.stop(); mode = "title"; A.playSong(SONG); ui.showPads(false); ui.setCourse("The attic");
    var open = save.open || 1;
    ui.menu({
      title: "HATCHPAIR",
      body: "Rowan Kell sets paired iron and copper hatch plates on walls, floors and ceilings. Step into one, leave through the other, and keep your speed.",
      stats: "<span>ROOMS " + open + "/" + LEVELS.length + "</span>",
      buttons: [{ label: "Play room " + open, act: function () { play(Math.min(open, LEVELS.length) - 1); } }],
      row: LEVELS.map(function (lv, i) { return { label: String(i + 1), act: function () { play(i); }, disabled: i >= open }; }),
      help: ["Move and jump as usual. Hatch places a plate on the surface you face. Hold up or down to aim at a ceiling or floor.", "Iron first, copper second. Placing again replaces that plate."],
      fine: "Forest Forge · original work. Workshop attic mood only — no gun, no oval doorways.",
      app: true
    });
  }
  var idleT = 0;
  function update(dt) {
    idleT += dt;
    if (window.FFX) FFX.step(dt);
    if (mode !== "play" || dead || won) return;
    look = ui.down("UP") ? "up" : ui.down("DN") ? "down" : "side";
    var ax = (ui.down("R") ? 1 : 0) - (ui.down("L") ? 1 : 0);
    if (ax) p.face = ax;
    p.vx = ax * 5.2;
    if (p.on) coyote = 0.1; else coyote -= dt;
    if (ui.hit("J") && coyote > 0) { p.vy = -8.6; p.on = false; coyote = 0; S.jump(); }
    if (ui.hit("H")) placeHatch();
    warpCD -= dt;
    moveBody(p, dt);
    tryWarp(p);
    if (spikes(p.x, p.y, p.w, p.h)) return die();
    // crates
    buttons.forEach(function (b) { b.on = false; });
    crates.forEach(function (cr) {
      // push
      if (p.x + p.w > cr.x && p.x < cr.x + cr.w && p.y + p.h > cr.y + 0.2 && p.y < cr.y + cr.h) {
        if (p.vx > 0 && p.x < cr.x) { cr.x += p.vx * dt; }
        if (p.vx < 0 && p.x > cr.x) { cr.x += p.vx * dt; }
      }
      cr.vx *= 0.6;
      moveBody(cr, dt, true);
      tryWarp(cr);
      // buttons: crate or player standing on a B tile
    });
    function pressers() { return [{ x: p.x + p.w / 2, y: p.y + p.h }].concat(crates.map(function (c) { return { x: c.x + c.w / 2, y: c.y + c.h }; })); }
    buttons.forEach(function (b) {
      b.on = pressers().some(function (q) { return Math.floor(q.x) === b.x && Math.floor(q.y - 0.05) === b.y; });
    });
    if (Math.floor(p.x + p.w / 2) === exit.x && Math.floor(p.y + p.h / 2) === exit.y) winLevel();
  }
  function layout() {
    var s = Math.min(ui.VW / W, ui.VH / H);
    return { s: s, ox: (ui.VW - W * s) / 2, oy: (ui.VH - H * s) / 2 };
  }
  function onPointer(type, x, y) {
    if (mode !== "play" || type !== "pointerdown") return;
    // tap upper third jumps, lower places hatch toward tap
    var L = layout();
    if (y < ui.VH * 0.28) { if (p.on || coyote > 0) { p.vy = -8.6; coyote = 0; S.jump(); } return; }
    var tx = Math.floor((x - L.ox) / L.s), ty = Math.floor((y - L.oy) / L.s);
    // set look toward tapped tile and place
    var cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    if (Math.abs(ty - cy) > Math.abs(tx - cx)) look = ty < cy ? "up" : "down";
    else { look = "side"; p.face = tx >= cx ? 1 : -1; }
    placeHatch();
  }
  function drawHatch(c, h, iron, L) {
    if (!h) return;
    var s = L.s, x = L.ox + h.tx * s, y = L.oy + h.ty * s, col = iron ? "#6a6e70" : "#b87333", hi = iron ? "#d0d4d8" : "#e0a060";
    var glow = iron ? "rgba(200,210,220,.55)" : "rgba(200,140,60,.55)";
    c.save(); c.shadowColor = glow; c.shadowBlur = 10;
    c.fillStyle = col;
    if (h.side === "N") c.fillRect(x + 2, y, s - 4, 6);
    if (h.side === "S") c.fillRect(x + 2, y + s - 6, s - 4, 6);
    if (h.side === "W") c.fillRect(x, y + 2, 6, s - 4);
    if (h.side === "E") c.fillRect(x + s - 6, y + 2, 6, s - 4);
    c.restore();
    c.fillStyle = hi;
    var hp = hatchPos(h);
    c.fillRect(L.ox + hp.x * s - 3, L.oy + hp.y * s - 3, 6, 6);
    // rivets
    c.fillStyle = "rgba(0,0,0,.35)";
    if (h.side === "N" || h.side === "S") { c.fillRect(x + 4, (h.side === "N" ? y : y + s - 6) + 2, 2, 2); c.fillRect(x + s - 8, (h.side === "N" ? y : y + s - 6) + 2, 2, 2); }
  }
  function render(c) {
    var Wv = ui.VW, Hv = ui.VH, L = layout(), s = L.s;
    var sh = window.FFX ? FFX.offset() : { x: 0, y: 0 };
    c.save(); c.translate(sh.x, sh.y);
    if (window.FFX) FFX.sky(c, Wv, Hv, "#c8fff0", "#a8c8ff", "#6a5ad8");
    else {
      var g = c.createLinearGradient(0, 0, 0, Hv);
      g.addColorStop(0, "#7aa0a8"); g.addColorStop(1, "#3a4a48");
      c.fillStyle = g; c.fillRect(0, 0, Wv, Hv);
    }
    // attic window
    c.fillStyle = "rgba(200,230,240,.2)"; c.beginPath(); c.arc(Wv * 0.18, 40, 36, 0, Math.PI * 2); c.fill();
    if (grid) {
      for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
        var ch = grid[y][x], px = L.ox + x * s, py = L.oy + y * s;
        if (ch === "#" || ch === "=") {
          if (window.FFX) FFX.bevelRoundRect(c, px, py, s, s, 2, (x + y) % 2 ? "#d0c09a" : "#b8a878", "#7a6840");
          else { c.fillStyle = (x + y) % 2 ? "#c8b890" : "#b8a878"; c.fillRect(px, py, s, s); c.strokeStyle = "#8a7850"; c.strokeRect(px, py, s, s); }
        } else if (ch === "^") {
          c.fillStyle = "#a03020";
          c.beginPath(); c.moveTo(px, py + s); c.lineTo(px + s / 2, py + 3); c.lineTo(px + s, py + s); c.fill();
          c.fillStyle = "rgba(255,200,200,.2)"; c.beginPath(); c.moveTo(px + s * 0.3, py + s * 0.55); c.lineTo(px + s / 2, py + 8); c.lineTo(px + s * 0.55, py + s * 0.55); c.fill();
        } else if (ch === "B") {
          if (window.FFX) FFX.bevelRoundRect(c, px, py, s, s, 2, "#6a6a6a", "#303030");
          else { c.fillStyle = "#6a6a6a"; c.fillRect(px, py, s, s); }
          var on = buttons.some(function (b) { return b.x === x && b.y === y && b.on; });
          c.fillStyle = on ? "#80d070" : "#d0a040"; c.fillRect(px + 4, py, s - 8, 6);
        } else if (ch === "g") {
          if (!gatesOpen()) {
            if (window.FFX) FFX.bevelRoundRect(c, px + 4, py, s - 8, s, 2, "#5a3040", "#2a1018");
            else { c.fillStyle = "#5a3040"; c.fillRect(px + 4, py, s - 8, s); }
          }
        } else if (ch === "x") {
          c.save(); c.shadowColor = "rgba(255,200,80,.6)"; c.shadowBlur = 12;
          if (window.FFX) FFX.bevelRoundRect(c, px + 3, py + 3, s - 6, s - 6, 3, "#e8c060", "#6a4a10");
          else { c.fillStyle = "#e8c060"; c.fillRect(px + 3, py + 3, s - 6, s - 6); }
          c.restore();
        } else {
          // plaster
          c.fillStyle = (x + y) % 2 ? "rgba(240,230,210,.08)" : "rgba(200,210,200,.05)";
          c.fillRect(px, py, s, s);
        }
      }
      drawHatch(c, hatches[0], true, L); drawHatch(c, hatches[1], false, L);
      crates.forEach(function (cr) {
        if (window.FFX) FFX.bevelRoundRect(c, L.ox + cr.x * s, L.oy + cr.y * s, cr.w * s, cr.h * s, 3, "#8a5a28", "#3a2410");
        else { c.fillStyle = "#8a5a28"; c.fillRect(L.ox + cr.x * s, L.oy + cr.y * s, cr.w * s, cr.h * s); c.strokeStyle = "#3a2410"; c.strokeRect(L.ox + cr.x * s, L.oy + cr.y * s, cr.w * s, cr.h * s); }
      });
      var px = L.ox + p.x * s, py = L.oy + p.y * s, pw = p.w * s, ph = p.h * s;
      // Rowan: coat, apron, hair — original joiner's apprentice
      c.fillStyle = "rgba(0,0,0,.2)"; c.beginPath(); c.ellipse(px + pw / 2, py + ph, pw * 0.4, 3, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#4a2c18"; c.fillRect(px + 2, py + 8, pw - 4, ph - 10);
      c.fillStyle = "#d8c8a0"; c.fillRect(px + 4, py + 14, pw - 8, ph * 0.42);
      c.fillStyle = "#e0c8a0"; c.beginPath(); c.arc(px + pw / 2, py + 7, 5, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#3a2410"; c.beginPath(); c.arc(px + pw / 2, py + 5, 5, Math.PI, 0); c.fill();
      c.fillStyle = "#2a1a10"; c.fillRect(px + pw / 2 + p.face * 2, py + 6, 2, 2);
    }
    if (window.FFX) { FFX.vignette(c, Wv, Hv, 0.28); FFX.draw(c); }
    c.restore();
  }
  var game = {
    toTitle: toTitle, update: update, render: render, onPointer: onPointer,
    onBack: function () { if (mode === "title") return "exit"; toTitle(); return "menu"; },
    play: play,
    qa: {
      play: play,
      winNow: function () { winLevel(); },
      place: function (i, tx, ty, side) { hatches[i] = { tx: tx, ty: ty, side: side }; },
      state: function () { return { mode: mode, level: li + 1, over: !!dead, won: won, x: p && p.x, y: p && p.y, hatches: hatches && hatches.filter(Boolean).length }; }
    }
  };
  ui.onAdsRemoved = function () { if (mode === "title") toTitle(); };
  ui.start(game);
})();
