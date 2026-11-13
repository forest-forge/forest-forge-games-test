/* Dawn Mail (Forest Forge). Sable Quinn races her roadster through the last hour
 * of night to get the post in before sunrise. Pseudo-3D road, forks at the end of
 * every stage (four rows of stages, four finishes), traffic, time extensions.
 * Drawn in code into a low-res buffer; sound and music generated (shell.js). */
(function () {
  "use strict";
  (function applyChrome(css) {
    var s = document.createElement("style"); s.id = "ff-palette"; s.textContent = css;
    document.head.appendChild(s);
    var m = document.querySelector('meta[name="theme-color"]');
    var bg = /--bg:([^;}]+)/.exec(css); if (m && bg) m.setAttribute("content", bg[1].trim());
  })(`:root{--bg:#6a3ab8;--sky1:#ffb07a;--sky2:#a05aff;--water:#4a2a98;--amber:#ffffff;--amber-hi:#fff0a0;--amber-soft:#ffffff;--amber-line:#ff5a7a;--ember:#b0284a;--btn:#5a2aa8;--lamp:#fff6d8;--pop1:#ffd27a;--pop2:#ff7aa8;--pop3:#ffffff;--glow-line:rgba(255,255,255,.55);--glow-fill:rgba(255,255,255,.14)}`);
  var clamp = FF.clamp, lerp = FF.lerp;
  var ui = FF.create({
    deco: ["letter", "star", "spark"], 
    id: "dawn-mail", title: "Dawn Mail", course: "The post run", wide: true, view: { w: 640, h: 360, flex: true },
    stats: [{ id: "time", label: "Time", value: "60" }, { id: "mph", label: "MPH", value: "0" }, { id: "score", label: "Score" }],
    pads: {
      left: [{ id: "L", icon: "left", aria: "Steer left", keys: ["ArrowLeft", "KeyA"] }, { id: "R", icon: "right", aria: "Steer right", keys: ["ArrowRight", "KeyD"] }],
      right: [{ id: "B", label: "Brake", aria: "Brake", keys: ["ArrowDown", "KeyS", "Space"] }]
    },
    keys: [{ id: "G", keys: ["ArrowUp", "KeyW"] }]
  });
  var A = ui.audio, save = ui.save;
  save.best = save.best || {}; save.ends = save.ends || {}; save.steer = save.steer || "drag"; save.hi = save.hi || 0;

  var PX = 2, lo = document.createElement("canvas"), g = lo.getContext("2d"), W = 320, H = 180;
  function sizeLo() { W = Math.ceil(ui.VW / PX); H = Math.ceil(ui.VH / PX); lo.width = W; lo.height = H; g.imageSmoothingEnabled = false; }
  function R(x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function quad(x1, y1, w1, x2, y2, w2, c) { g.fillStyle = c; g.beginPath(); g.moveTo(x1 - w1, y1); g.lineTo(x2 - w2, y2); g.lineTo(x2 + w2, y2); g.lineTo(x1 + w1, y1); g.closePath(); g.fill(); }

  // ---------- sprites (pixel art drawn once in code) ----------
  function sprite(w, h, fn) { var c = document.createElement("canvas"); c.width = w; c.height = h; var x = c.getContext("2d"); fn(x, function (a, b, cw, ch, col) { x.fillStyle = col; x.fillRect(a, b, cw, ch); }); return c; }
  var SP = {
    pine: sprite(22, 44, function (x, r) {
      r(9, 32, 4, 12, "#2a1810"); r(10, 32, 1, 12, "#5a3a20");
      for (var i = 0; i < 6; i++) { r(10 - i * 2 - 1, 2 + i * 5, 4 + i * 4 + 2, 6, i % 2 ? "#146828" : "#1e8a38"); r(10 - i * 2, 3 + i * 5, 3, 2, "rgba(180,255,160,0.25)"); }
      r(10, 0, 3, 5, "#3aba50");
    }),
    oak: sprite(32, 36, function (x, r) {
      r(14, 22, 5, 14, "#3a2210"); r(15, 22, 2, 14, "#6a4030");
      r(2, 8, 28, 16, "#1e7a30"); r(5, 3, 22, 8, "#2a9a40"); r(8, 0, 16, 6, "#3aaa44");
      r(0, 12, 8, 8, "#186c28"); r(24, 12, 8, 8, "#186c28"); r(10, 8, 6, 4, "#68c858");
    }),
    rock: sprite(26, 16, function (x, r) {
      r(3, 7, 20, 9, "#3a3834"); r(2, 5, 22, 10, "#5a5650"); r(6, 2, 14, 6, "#6e6a62"); r(8, 3, 6, 2, "#9a968c"); r(4, 14, 18, 2, "rgba(0,0,0,0.25)");
    }),
    hut: sprite(18, 22, function (x, r) {
      r(2, 8, 14, 14, "#c43a2e"); r(2, 8, 14, 2, "#fff"); r(0, 3, 18, 6, "#f4f0e0"); r(1, 3, 16, 1, "#fff"); r(7, 13, 4, 9, "#3a1810"); r(4, 11, 3, 3, "#ffd070"); r(11, 11, 3, 3, "#ffd070");
    }),
    hutB: sprite(18, 22, function (x, r) {
      r(2, 8, 14, 14, "#2a68c8"); r(2, 8, 14, 2, "#fff"); r(0, 3, 18, 6, "#f4f0e0"); r(1, 3, 16, 1, "#fff"); r(7, 13, 4, 9, "#1a2a5a"); r(4, 11, 3, 3, "#ffe8a0"); r(11, 11, 3, 3, "#ffe8a0");
    }),
    lamp: sprite(10, 44, function (x, r) {
      r(4, 10, 2, 34, "#2a2a2e"); r(3, 10, 1, 34, "#4a4a50"); r(1, 2, 8, 8, "#3a3a40"); r(2, 3, 6, 5, "#ffe08a"); r(3, 4, 4, 3, "#fff6c8");
    }),
    house: sprite(38, 34, function (x, r) {
      r(3, 14, 32, 20, "#8a6a4a"); r(3, 14, 32, 2, "rgba(255,255,255,0.15)"); r(0, 5, 38, 10, "#5a2a22"); r(1, 5, 36, 2, "#7a3a30");
      r(7, 18, 6, 6, "#ffd070"); r(25, 18, 6, 6, "#ffd070"); r(16, 24, 6, 10, "#3a2012"); r(29, 0, 4, 8, "#4a3a30");
    }),
    pole: sprite(6, 30, function (x, r) { for (var i = 0; i < 6; i++) r(2, i * 5, 2, 5, i % 2 ? "#e83a2a" : "#f4f4f4"); r(1, 0, 4, 1, "#fff"); }),
    sheep: sprite(16, 12, function (x, r) {
      r(3, 3, 10, 6, "#e8e4d8"); r(2, 4, 12, 5, "#f0ece0"); r(11, 2, 5, 5, "#2a2a2a"); r(13, 3, 2, 2, "#fff"); r(3, 9, 2, 3, "#2a2a2a"); r(10, 9, 2, 3, "#2a2a2a");
    }),
    light: sprite(16, 60, function (x, r) {
      for (var i = 0; i < 8; i++) r(4 + i * 0.25, 12 + i * 6, 8 - i * 0.5, 6, i % 2 ? "#e83a2a" : "#f4f4f4");
      r(3, 4, 10, 9, "#2a2a2e"); r(4, 6, 8, 5, "#ffe8a0"); r(5, 7, 4, 3, "#fff8d0"); r(2, 58, 12, 2, "#3a3a3a");
    }),
    mill: sprite(30, 46, function (x, r) {
      r(9, 18, 12, 28, "#a89070"); r(10, 18, 3, 28, "rgba(255,255,255,0.12)"); r(7, 14, 16, 6, "#5a3a2a"); r(13, 32, 4, 8, "#3a2a1a");
      for (var i = 0; i < 4; i++) { var a = i * Math.PI / 2 + 0.4; for (var k = 2; k < 15; k++) r(15 + Math.cos(a) * k, 14 + Math.sin(a) * k, 2, 2, k < 6 ? "#fff8e8" : "#e8e0c8"); }
    }),
    sign: sprite(26, 22, function (x, r) { r(12, 10, 2, 12, "#3a3a3a"); r(0, 0, 26, 11, "#1a5a2a"); r(1, 1, 24, 9, "#2a7a3a"); r(2, 2, 22, 1, "rgba(255,255,255,0.2)"); }),
    bag: sprite(12, 12, function (x, r) { r(2, 3, 8, 9, "#c8a46a"); r(3, 4, 3, 2, "rgba(255,255,255,0.25)"); r(3, 1, 6, 3, "#8a6a3a"); r(4, 6, 4, 2, "#e82a2a"); }),
    office: sprite(62, 42, function (x, r) {
      r(2, 12, 58, 30, "#a83a2a"); r(2, 12, 58, 2, "rgba(255,255,255,0.15)"); r(0, 5, 62, 8, "#4a2a22");
      for (var i = 0; i < 5; i++) { r(7 + i * 11, 18, 6, 8, "#ffd070"); r(8 + i * 11, 19, 2, 2, "#fff8c0"); }
      r(25, 30, 12, 12, "#3a2012"); r(19, 0, 24, 7, "#e8d070"); r(20, 0, 22, 2, "#fff3a0");
    }),
    van: sprite(30, 22, function (x, r) {
      r(1, 3, 28, 14, "#e8e4d8"); r(2, 4, 8, 4, "rgba(255,255,255,0.3)"); r(4, 5, 22, 6, "#5a6a7a"); r(1, 17, 28, 2, "#3a3a3a");
      r(2, 18, 6, 4, "#111"); r(22, 18, 6, 4, "#111"); r(3, 19, 3, 1, "#666"); r(23, 19, 3, 1, "#666");
      r(2, 13, 3, 2, "#ff3a2a"); r(25, 13, 3, 2, "#ff3a2a");
    }),
    tractor: sprite(26, 24, function (x, r) {
      r(5, 5, 16, 10, "#2a8a3a"); r(6, 6, 6, 3, "rgba(255,255,255,0.2)"); r(7, 1, 12, 6, "#3aa04a");
      r(0, 11, 8, 13, "#111"); r(18, 11, 8, 13, "#111"); r(2, 14, 4, 3, "#444"); r(20, 14, 4, 3, "#444"); r(9, 15, 8, 4, "#ffd040");
    }),
    cart: sprite(24, 20, function (x, r) {
      r(2, 3, 20, 10, "#8a5a2a"); r(2, 3, 20, 2, "#c08a4a"); r(3, 5, 6, 2, "rgba(255,255,255,0.15)");
      r(1, 12, 7, 8, "#2a1a0e"); r(16, 12, 7, 8, "#2a1a0e"); r(10, 9, 4, 3, "#ff3a2a");
    }),
    bus: sprite(32, 28, function (x, r) {
      r(1, 2, 30, 21, "#d8a020"); r(2, 3, 10, 4, "rgba(255,255,255,0.2)"); r(3, 4, 26, 8, "#3a4a5a"); r(1, 23, 30, 2, "#3a3a3a");
      r(2, 24, 6, 4, "#111"); r(24, 24, 6, 4, "#111"); r(2, 19, 3, 2, "#ff3a2a"); r(27, 19, 3, 2, "#ff3a2a");
    })
  };
    // Sable's roadster from behind (3 frames: left, straight, right)
  function carSprite(lean) {
    return sprite(56, 30, function (x, r) {
      var o = lean * 2;
      r(4, 15, 48, 10, "#6a1014");
      r(4, 14, 48, 10, "#d02028"); r(2, 18, 52, 6, "#b01820"); r(6 + o, 8, 44, 8, "#e83840");
      r(8 + o, 9, 12, 3, "rgba(255,200,180,0.28)");
      r(10 + o, 4, 36, 6, "#e8d8b0"); r(12 + o, 5, 10, 2, "rgba(255,255,255,0.35)");
      r(20 + o, 0, 14, 6, "#1a1210"); r(30 + o, 1, 10, 3, "#f0a020"); r(38 + o * 2, 2, 8, 2, "#f0a020");
      r(6, 20, 8, 3, "#ff4a2a"); r(42, 20, 8, 3, "#ff4a2a"); r(24, 20, 8, 3, "#f0e8d0");
      r(2, 22, 10, 8, "#111"); r(44, 22, 10, 8, "#111"); r(4, 24, 6, 2, "#666"); r(46, 24, 6, 2, "#666");
      r(3, 23, 3, 2, "#ffe8a0"); r(50, 23, 3, 2, "#ff6a2a");
    });
  }
  var CAR = [carSprite(-1), carSprite(0), carSprite(1)];

  // ---------- stages ----------
  // Each stage: palette, roadside sprites, traffic, layout seed. Pyramid of forks.
  var STAGES = {
    harbour: { name: "Harbour Road", grass: ["#2a8a3a", "#247c34"], rumble: ["#c8c8c8", "#a02a2a"], road: ["#3a3a40", "#36363c"], lane: "#d8d8d0", side: ["lamp", "house", "lamp", "hut"], traffic: ["van", "bus", "cart"], hills: "#1a4a6a", next: ["coast", "forest"], label: ["COAST", "FOREST"] },
    coast: { name: "Coast Road", grass: ["#e0c490", "#d4b67c"], rumble: ["#f4f4f4", "#3a6ab0"], road: ["#4a4a4e", "#46464a"], lane: "#f4f0e0", side: ["hut", "hutB", "rock", "sign"], traffic: ["van", "cart"], hills: "#2a6a8a", sea: 1, next: ["cliff", "pass"], label: ["CLIFF TOP", "HIGH PASS"] },
    forest: { name: "Forest Road", grass: ["#1a8a3a", "#167c32"], rumble: ["#e8e0c8", "#5a3a1a"], road: ["#3e3a36", "#3a3632"], lane: "#e8e0c8", side: ["pine", "pine", "oak", "pine"], traffic: ["tractor", "cart", "van"], hills: "#146028", next: ["pass", "mill"], label: ["HIGH PASS", "MILL VALLEY"] },
    cliff: { name: "Cliff Top", grass: ["#4aaa40", "#409636"], rumble: ["#f4f4f4", "#c02a2a"], road: ["#4a4844", "#454340"], lane: "#fff", side: ["rock", "sign", "sheep", "rock"], traffic: ["van", "bus"], hills: "#3a78a8", sea: 1, next: ["light", "saltby"], label: ["LIGHTHOUSE", "SALTBY"] },
    pass: { name: "High Pass", grass: ["#8a8a80", "#7e7e74"], rumble: ["#f4f4f4", "#e83a2a"], road: ["#3a3a3c", "#363638"], lane: "#ffd040", side: ["pole", "rock", "sheep", "pole"], traffic: ["tractor", "van"], hills: "#5a6070", snow: 1, next: ["saltby", "moorhead"], label: ["SALTBY", "MOORHEAD"] },
    mill: { name: "Mill Valley", grass: ["#4a7a2a", "#447024"], rumble: ["#f0e8d0", "#8a5a2a"], road: ["#4a4038", "#453c34"], lane: "#f0e8d0", side: ["oak", "mill", "sheep", "oak"], traffic: ["cart", "tractor"], hills: "#2a4a2a", next: ["moorhead", "kings"], label: ["MOORHEAD", "KINGSFERRY"] },
    light: { name: "Lighthouse Point", grass: ["#c8b080", "#bca474"], rumble: ["#fff", "#c02a2a"], road: ["#4a4a4e", "#46464a"], lane: "#fff", side: ["rock", "hut", "light", "rock"], traffic: ["van"], hills: "#2a4a6a", sea: 1, end: "Lighthouse Point" },
    saltby: { name: "Saltby Quay", grass: ["#3a4a3a", "#344234"], rumble: ["#fff", "#3a6ab0"], road: ["#3a3a40", "#36363c"], lane: "#fff", side: ["house", "lamp", "hutB", "lamp"], traffic: ["van", "bus", "cart"], hills: "#2a3a5a", sea: 1, end: "Saltby Quay" },
    moorhead: { name: "Moorhead", grass: ["#6a5a3a", "#605234"], rumble: ["#fff", "#6a3a8a"], road: ["#3e3a36", "#3a3632"], lane: "#e8e0c8", side: ["rock", "sheep", "house", "pole"], traffic: ["tractor", "van"], hills: "#4a3a4a", end: "Moorhead" },
    kings: { name: "Kingsferry", grass: ["#2e5a2a", "#2a5226"], rumble: ["#fff", "#c08a20"], road: ["#3a3a40", "#36363c"], lane: "#fff", side: ["house", "lamp", "oak", "house"], traffic: ["bus", "van", "cart"], hills: "#24402a", end: "Kingsferry" }
  };
  var SEG = 200, RW = 2000, LANES = 3, CAM_H = 1000, DEPTH = 1 / Math.tan((100 / 2) * Math.PI / 180), DRAW = 130;
  var MAXV = SEG / (1 / 60) * 0.95, ACCEL = MAXV / 5, BRAKE = -MAXV, DECEL = -MAXV / 5, OFF_DECEL = -MAXV / 2, OFF_LIMIT = MAXV / 4, CENTRI = 0.22;
  var STAGE_SEGS = 2300, FORK = 160, FORK_PICK = 28, FORK_W = 2.6 * RW;

  var segs = [], cars = [], stage, stageKey, stageRow = 0, chosen = 0, forkA = -1, forkNext = -1, picked = false, pathKeys = [];
  var pos = 0, pX = 0, speed = 0, timeLeft = 60, elapsed = 0, score = 0, bags = 0, skyOff = 0, hillOff = 0, mode = "title", bump = 0, steer = 0, banner = "", bannerT = 0, endName = "", finished = false;
  function seg(i) { return segs[i % segs.length]; }
  function lastY() { return segs.length ? segs[segs.length - 1].p2.y : 0; }
  function addSeg(curve, y, st) {
    var n = segs.length;
    segs.push({ i: n, p1: { x: 0, y: lastY(), z: n * SEG }, p2: { x: 0, y: y, z: (n + 1) * SEG }, curve: curve, st: st, sprites: [], cars: [], off: 0, fk: 0, clip: 0 });
  }
  function ease(a, b, t) { return a + (b - a) * ((-Math.cos(t * Math.PI) / 2) + 0.5); }
  function addRoad(enter, hold, leave, curve, height, st) {
    var y0 = lastY(), y1 = y0 + height * SEG, tot = enter + hold + leave, n;
    for (n = 0; n < enter; n++) addSeg(ease(0, curve, n / enter), ease(y0, y1, n / tot), st);
    for (n = 0; n < hold; n++) addSeg(curve, ease(y0, y1, (enter + n) / tot), st);
    for (n = 0; n < leave; n++) addSeg(ease(curve, 0, n / leave), ease(y0, y1, (enter + hold + n) / tot), st);
  }
  function buildStage(key, row) {
    var st = STAGES[key], r = FF.rng(key.length * 131 + row * 17 + key.charCodeAt(0)), start = segs.length;
    var harder = 1 + row * 0.25;
    addRoad(20, 30, 20, 0, 0, st);
    while (segs.length - start < STAGE_SEGS) {
      var k = r(), len = 25 + Math.floor(r() * 40);
      var curve = (r() < 0.5 ? -1 : 1) * Math.min(4.6, (1.2 + r() * 3.2) * Math.min(1.35, harder)) * (r() < 0.2 ? 0 : 1);
      var hill = (r() - 0.5) * (st.snow ? 80 : st.sea ? 40 : 55);
      if (k < 0.15) addRoad(10, 20, 10, 0, hill * 0.6, st);
      else if (k < 0.35) { addRoad(len / 2, len / 2, len / 2, curve, 0, st); addRoad(len / 2, len / 2, len / 2, -curve, hill * 0.4, st); }
      else addRoad(len, len, len, curve, hill, st);
    }
    var end = segs.length;
    // roadside sprites
    for (var i = start + 10; i < end; i += 3 + Math.floor(r() * 4)) {
      var s = segs[i], src = st.side[Math.floor(r() * st.side.length)], side = r() < 0.5 ? -1 : 1;
      s.sprites.push({ src: src, off: side * (1.25 + r() * 1.8) });
      if (r() < 0.4) s.sprites.push({ src: st.side[Math.floor(r() * st.side.length)], off: -side * (1.3 + r() * 2.5) });
    }
    // mail bags
    for (var b = start + 120; b < end - 40; b += 140 + Math.floor(r() * 120)) segs[b].sprites.push({ src: "bag", off: (r() - 0.5) * 1.4, bag: 1 });
    // traffic
    var nCars = Math.round(18 * harder);
    for (var c = 0; c < nCars; c++) {
      var z = (start + 80 + Math.floor(r() * (end - start - 120))) * SEG;
      var type = st.traffic[Math.floor(r() * st.traffic.length)];
      cars.push({ z: z, off: (Math.floor(r() * 3) - 1) * 0.6 + (r() - 0.5) * 0.15, v: MAXV * (type === "tractor" || type === "cart" ? 0.22 : 0.38 + r() * 0.15), src: type, stEnd: end * SEG });
    }
    if (st.end) {
      // finish: the sorting office on the right, chequered line
      for (var f = 0; f < 40; f++) addSeg(0, lastY(), st);
      segs[end + 6].finish = true; segs[end + 6].sprites.push({ src: "office", off: 1.9 }); segs[end + 6].sprites.push({ src: "sign", off: -1.5 });
      return -1;
    }
    // checkpoint arch at the end of the stage, then the fork
    segs[end - 2].check = true;
    segs[end - 30].sprites.push({ src: "sign", off: -1.4, label: st.label[0] }); segs[end - 30].sprites.push({ src: "sign", off: 1.4, label: st.label[1] });
    var fs = segs.length;
    for (var q = 0; q < FORK; q++) { addSeg(0, lastY(), st); var sg = segs[segs.length - 1]; sg.fk = ease(0, FORK_W, Math.min(1, q / 90)); sg.forkQ = q; if (q > 8 && q % 4 === 0) sg.sprites.push({ src: st.side[q % st.side.length], off: 0, median: 1 }); }
    return fs;
  }
  function curStageAt(i) { return seg(i).st; }

  // ---------- sound ----------
  var eng = null;
  function engine(on) {
    if (!A.ctx) return;
    if (on && !eng) {
      var o = A.ctx.createOscillator(), o2 = A.ctx.createOscillator(), gg = A.ctx.createGain(), f = A.ctx.createBiquadFilter();
      o.type = "sawtooth"; o2.type = "square"; f.type = "lowpass"; f.frequency.value = 600; gg.gain.value = 0;
      o.connect(f); o2.connect(f); f.connect(gg); gg.connect(A.sfx); o.start(); o2.start();
      eng = { o: o, o2: o2, g: gg, f: f };
    }
    if (!on && eng) { eng.g.gain.setTargetAtTime(0, A.ctx.currentTime, 0.05); var e = eng; setTimeout(function () { try { e.o.stop(); e.o2.stop(); } catch (x) {} }, 300); eng = null; }
  }
  function engineTick() {
    if (!eng) return;
    var p = speed / MAXV, t = A.ctx.currentTime;
    eng.o.frequency.setTargetAtTime(40 + p * 110, t, 0.05); eng.o2.frequency.setTargetAtTime(20 + p * 55, t, 0.05);
    eng.g.gain.setTargetAtTime(ui.isMuted() ? 0 : 0.05 + p * 0.05, t, 0.08); eng.f.frequency.setTargetAtTime(300 + p * 900, t, 0.05);
  }
  var S = {
    bump: function () { A.noise({ dur: 0.25, gain: 0.4, freq: 300, filter: "lowpass" }); A.tone({ f: 90, f2: 40, dur: 0.2, type: "square", gain: 0.2 }); },
    skid: function () { if (A.sfxOk()) A.noise({ dur: 0.12, gain: 0.08, freq: 2500, filter: "bandpass", q: 3 }); },
    bag: function () { [880, 1175, 1568].forEach(function (f, i) { A.tone({ f: f, dur: 0.08, type: "square", gain: 0.1, delay: i * 0.06 }); }); },
    check: function () { [659, 784, 988, 1319].forEach(function (f, i) { A.tone({ f: f, dur: 0.12, type: "square", gain: 0.12, delay: i * 0.09 }); }); },
    tick: function () { A.tone({ f: 1400, dur: 0.04, type: "square", gain: 0.06 }); },
    win: function () { [523, 659, 784, 1047, 988, 1047, 1319].forEach(function (f, i) { A.tone({ f: f, dur: 0.18, type: "square", gain: 0.12, delay: i * 0.14 }); }); },
    lose: function () { [392, 349, 311, 262].forEach(function (f, i) { A.tone({ f: f, dur: 0.3, type: "triangle", gain: 0.2, delay: i * 0.25 }); }); }
  };
  // three original driving tunes (picked on the title screen, like a car radio)
  var SONGS = [
    { name: "Early Bird", bpm: 140, order: [0, 0, 1, 0], parts: [[
      { wave: "square", gain: 0.05, pat: "G4 . B4 . D5 . G5 - F#5 . D5 . B4 . A4 . G4 . B4 . D5 . E5 - D5 . B4 . G4 . A4 - - ." },
      { wave: "triangle", gain: 0.2, pat: "G2 . G3 . G2 . G3 . D2 . D3 . D2 . D3 . E2 . E3 . E2 . E3 . C2 . C3 . D2 . D3 ." },
      { wave: "drum", pat: "k . h . s . h . k k h . s . h . k . h . s . h . k k h . s . o ." }], [
      { wave: "square", gain: 0.05, pat: "E5 . D5 . C5 . B4 . A4 . B4 . C5 - - . D5 . E5 . F#5 . G5 . A5 . G5 . F#5 . D5 - - ." },
      { wave: "triangle", gain: 0.2, pat: "C2 . C3 . C2 . C3 . A1 . A2 . A1 . A2 . D2 . D3 . D2 . D3 . D2 . D3 . F#2 . A2 ." },
      { wave: "drum", pat: "k . h . s . h . k k h . s . h . k . h . s . h . k k s . s s o ." }]] },
    { name: "Coast Wind", bpm: 124, swing: 0.1, order: [0, 1], parts: [[
      { wave: "square", gain: 0.05, pat: "A4 - C5 - E5 - A5 - G5 - E5 - D5 - C5 - D5 - E5 - G5 - E5 - D5 - B4 - G4 - B4 -" },
      { wave: "triangle", gain: 0.2, pat: "A2 - A2 E3 A2 - A2 E3 F2 - F2 C3 F2 - F2 C3 G2 - G2 D3 G2 - G2 D3 E2 - E2 B2 E2 - G#2 B2" },
      { wave: "drum", pat: "k . h h s . h . k . h k s . h h k . h h s . h . k k h . s . h h" }], [
      { wave: "square", gain: 0.05, pat: "C5 - E5 - G5 - C6 - B5 - G5 - E5 - D5 - C5 - D5 - E5 - D5 - C5 - A4 - B4 - G#4 -" },
      { wave: "triangle", gain: 0.2, pat: "F2 - F2 C3 F2 - F2 C3 C2 - C2 G2 C2 - C2 G2 D2 - D2 A2 D2 - D2 A2 E2 - E2 B2 E2 - E2 B2" },
      { wave: "drum", pat: "k . h h s . h . k . h k s . h h k . h h s . h . k k s . s s o ." }]] },
    { name: "Last Stars", bpm: 112, order: [0], parts: [[
      { wave: "triangle", gain: 0.14, pat: "E5 - - B4 - - G5 - F#5 - E5 - D5 - B4 - C5 - - G4 - - E5 - D5 - C5 - B4 - - -" },
      { wave: "square", gain: 0.03, pat: "E3 B3 E4 B3 E3 B3 E4 B3 D3 A3 D4 A3 D3 A3 D4 A3 C3 G3 C4 G3 C3 G3 C4 G3 B2 F#3 B3 F#3 B2 F#3 B3 F#3" },
      { wave: "drum", pat: "k . . . s . . h k . k . s . . h k . . . s . . h k . k . s . h h" }]] }
  ];
  var songIx = save.song == null ? 0 : save.song;

  // ---------- run ----------
  function newRun() {
    segs = []; cars = []; pathKeys = ["harbour"]; stageRow = 0; stageKey = "harbour";
    forkA = buildStage("harbour", 0); picked = false;
    pos = 0; pX = 0; speed = 0; timeLeft = 58; elapsed = 0; score = 0; bags = 0; skyOff = 0; hillOff = 0; bump = 0; finished = false; endName = "";
    mode = "run"; banner = STAGES.harbour.name; bannerT = 2;
    ui.setCourse(STAGES.harbour.name);
    A.playSong(SONGS[songIx]); engine(true);
    ui.go();
  }
  function pickBranch(side) {
    var key = STAGES[stageKey].next[side];
    chosen = side; stageRow++; stageKey = key; pathKeys.push(key);
    var from = segs.length; forkNext = buildStage(key, stageRow); picked = true;
    var shift = (side ? 1 : -1) * FORK_W;
    for (var i = from; i < segs.length; i++) segs[i].off = shift;
    cars.forEach(function (c) { if (c.z >= from * SEG) c.off2 = shift; });
  }
  function rebase() {
    var shift = (chosen ? 1 : -1) * FORK_W;
    pX -= shift / RW;
    for (var i = 0; i < segs.length; i++) { segs[i].off -= shift; }
    cars.forEach(function (c) { if (c.off2) c.off2 -= shift; });
    forkA = forkNext; picked = false;
    timeLeft += 46 + stageRow * 2; banner = "+" + (46 + stageRow * 2) + " s · " + STAGES[stageKey].name; bannerT = 2.2; S.check();
    ui.setCourse(STAGES[stageKey].name);
  }
  function roadCentreAt(s) { return s.off; }
  function update(dt) {
    var si = Math.floor(pos / SEG), s = seg(si), pct = (pos % SEG) / SEG;
    elapsed += dt;
    var prevT = Math.ceil(timeLeft); timeLeft -= dt; if (Math.ceil(timeLeft) !== prevT && timeLeft < 10 && timeLeft > 0) S.tick();
    // steering
    var st = 0;
    if (ui.down("L")) st -= 1; if (ui.down("R")) st += 1;
    if (st === 0) st = steer;
    var dx = dt * 2.6 * (speed / MAXV);
    pX += st * dx;
    pX -= dx * (speed / MAXV) * s.curve * CENTRI;
    // throttle (always on unless braking)
    if (ui.down("B")) speed += BRAKE * dt; else speed += ACCEL * dt;
    // on road? (fork: two roads)
    var wx = pX * RW, onRoad;
    if (s.fk > 0) onRoad = Math.abs(wx - s.off + s.fk) < RW * 1.05 || Math.abs(wx - s.off - s.fk) < RW * 1.05;
    else onRoad = Math.abs(wx - s.off) < RW * 1.05;
    if (!onRoad) {
      if (speed > OFF_LIMIT) speed += OFF_DECEL * dt;
      // roadside sprites
      for (var k = 0; k < s.sprites.length; k++) {
        var sp = s.sprites[k]; if (sp.bag) continue;
        var sx = sp.median ? s.off : s.off + sp.off * RW;
        if (sp.median && (s.fk < RW * 1.1)) continue;
        if (Math.abs(wx - sx) < 0.45 * RW) { speed = Math.min(speed, MAXV / 5); pos = Math.max(0, pos - SEG * 0.3); if (bump <= 0) { S.bump(); bump = 0.4; } }
      }
      if (speed > OFF_LIMIT * 0.8) S.skid();
    }
    // bags
    s.sprites.forEach(function (sp) { if (sp.bag && !sp.got && Math.abs(wx - (s.off + sp.off * RW)) < 0.35 * RW) { sp.got = true; bags++; score += 500; S.bag(); banner = "Mail bag +500"; bannerT = 1; } });
    // traffic
    var here = pos;
    cars = cars.filter(function (c) { return c.z < c.stEnd; });
    cars.forEach(function (c) {
      c.z += c.v * dt;
      var d = c.z - here;
      if (d > 0 && d < SEG * 0.9 && speed > c.v) {
        var cx = (c.off2 || 0) + c.off * RW;
        if (Math.abs(wx - cx) < RW * 0.42) { speed = Math.max(c.v * 0.8, speed * 0.45); c.z = here + SEG * 3; pX += (wx > cx ? 0.25 : -0.25); S.bump(); bump = 0.4; ui.toast("Bump!", 600); }
      }
    });
    bump -= dt;
    speed = clamp(speed, 0, MAXV);
    pX = clamp(pX, -3 - (s.fk || 0) / RW + (s.off / RW), 3 + (s.fk || 0) / RW + (s.off / RW));
    pos += speed * dt;
    score += speed * dt * 0.01;
    skyOff += dt * 0.0008 * s.curve * (speed / MAXV);
    hillOff += dt * 0.0016 * s.curve * (speed / MAXV);
    // fork decision and rebase
    if (s.forkQ != null && s.forkQ >= FORK_PICK && !picked && forkA >= 0) pickBranch(wx > s.off ? 1 : 0);
    if (picked && forkA >= 0 && si >= forkA + FORK) rebase();
    if (s.check && !s.checked) { s.checked = true; }
    if (s.finish && !finished) { finished = true; win(); return; }
    if (timeLeft <= 0) { timeLeft = 0; lose(); return; }
    bannerT -= dt;
    ui.setStat("time", Math.ceil(timeLeft)); ui.setStat("mph", Math.round(speed / MAXV * 152)); ui.setStat("score", FF.n(score));
    engineTick();
  }
  function win() {
    ui.stop(); engine(false); A.stopSong(); S.win(); mode = "done";
    endName = STAGES[stageKey].end;
    var bonus = Math.round(timeLeft) * 300, total = Math.round(score + bonus);
    var b = save.best[stageKey], nb = !b || elapsed < b;
    if (nb) save.best[stageKey] = elapsed;
    save.ends[stageKey] = 1; var hi = total > save.hi; if (hi) save.hi = total; ui.persist();
    ui.runEnded();
    ui.menu({ kicker: pathKeys.map(function (k) { return STAGES[k].name; }).join(" → "), title: "Post's in!",
      body: "Sable reached " + endName + " before sunrise.",
      stats: '<b class="ff-score-xl">' + FF.n(total) + "</b><span>" + (hi ? "NEW HIGH SCORE" : "HIGH SCORE " + FF.n(save.hi)) + "</span><span>TIME " + FF.fmtTime(elapsed) + (nb ? " · BEST TO " + endName.toUpperCase() : "") + "</span><span>MAIL BAGS " + bags + " · TIME BONUS " + FF.n(bonus) + "</span><span>FINISHES FOUND " + Object.keys(save.ends).length + "/4</span>",
      buttons: [{ label: "Drive again", act: newRun }, { label: "Menu", act: toTitle }] });
  }
  function lose() {
    ui.stop(); engine(false); A.stopSong(); S.lose(); mode = "over"; ui.runEnded();
    var hi = score > save.hi; if (hi) { save.hi = Math.round(score); ui.persist(); }
    ui.menu({ title: "Sunrise", body: "The sun's up and the post is late. " + STAGES[stageKey].name + ", " + (pos / SEG / 300).toFixed(1) + " miles in.",
      stats: '<b class="ff-score-xl">' + FF.n(score) + "</b><span>" + (hi ? "NEW HIGH SCORE" : "HIGH SCORE " + FF.n(save.hi)) + "</span>",
      buttons: [{ label: "Drive again", act: newRun }, { label: "Menu", act: toTitle }] });
  }

  // ---------- render ----------
  function dawnK() { return clamp(elapsed / 200, 0, 1); }
  function mix(a, b, t) {
    var pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    var r = Math.round(lerp(pa >> 16, pb >> 16, t)), gg = Math.round(lerp((pa >> 8) & 255, (pb >> 8) & 255, t)), bb = Math.round(lerp(pa & 255, pb & 255, t));
    return "rgb(" + r + "," + gg + "," + bb + ")";
  }
  function project(p, cx, cy, cz, off) {
    var X = p.x + off - cx, Y = p.y - cy, Z = p.z - cz;
    p.sc = DEPTH / Z; p.sx = Math.round(W / 2 + p.sc * X * W / 2); p.sy = Math.round(H / 2 - p.sc * Y * H / 2); p.sw = Math.round(p.sc * RW * W / 2); p.Z = Z;
  }
  function drawSeg(p1x, p1y, p1w, p2x, p2y, p2w, s, alt, lanes) {
    var r1 = p1w / Math.max(6, 2 * LANES), r2 = p2w / Math.max(6, 2 * LANES), st = s.st;
    quad(p1x, p1y, p1w + r1, p2x, p2y, p2w + r2, st.rumble[alt]);
    quad(p1x, p1y, p1w, p2x, p2y, p2w, st.road[alt]);
    if (lanes && alt === 0) { var l1 = p1w / 40, l2 = p2w / 40, lw1 = p1w * 2 / LANES, lw2 = p2w * 2 / LANES; for (var l = 1; l < LANES; l++) quad(p1x - p1w + lw1 * l, p1y, l1, p2x - p2w + lw2 * l, p2y, l2, st.lane); }
  }
  function sky(t) {
    var k = dawnK(), st = stage || STAGES.harbour;
    var top = mix("#08122a", "#4aa0e8", k), mid = mix("#1a1440", "#ff7a6a", k), bot = mix("#3a1838", "#ffc8d8", k);
    var gr = g.createLinearGradient(0, 0, 0, H * 0.62); gr.addColorStop(0, top); gr.addColorStop(0.45, mid); gr.addColorStop(1, bot);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    if (k < 0.75) {
      g.globalAlpha = 1 - k / 0.75;
      for (var i = 0; i < 70; i++) R(((i * 97 + skyOff * W * 3) % W + W) % W, (i * 37) % (H * 0.45), i % 8 ? 1 : 2, 1, i % 4 ? "#8a90b0" : "#fff");
      g.globalAlpha = 1;
    }
    var sy = lerp(H * 0.62, H * 0.18, k), sx = ((W * 0.62 + ((skyOff * W * 2) % W)) % W + W) % W;
    if (k > 0.02) {
      var rad = 14 + k * 6;
      var glow = g.createRadialGradient(sx, sy, 2, sx, sy, rad * 2.4);
      glow.addColorStop(0, mix("#ff7040", "#ffe9a0", k)); glow.addColorStop(0.35, mix("#ff7040", "#ffe9a0", k)); glow.addColorStop(1, "rgba(255,120,60,0)");
      g.globalAlpha = Math.min(1, k * 3); g.fillStyle = glow; g.beginPath(); g.arc(sx, sy, rad * 2.4, 0, 7); g.fill();
      g.fillStyle = mix("#ff8040", "#fff4c0", k); g.beginPath(); g.arc(sx, sy, rad, 0, 7); g.fill();
      g.fillStyle = "#fff8e0"; g.beginPath(); g.arc(sx - 3, sy - 3, rad * 0.35, 0, 7); g.fill(); g.globalAlpha = 1;
    }
    if (k < 0.55) {
      for (var ci = 0; ci < 5; ci++) {
        var cx = ((ci * 90 + skyOff * W * 8) % (W + 60)) - 30, cy = 10 + (ci * 13) % 24;
        g.globalAlpha = 0.25 + 0.35 * k; g.fillStyle = mix("#3a2a58", "#fff0e8", k);
        g.beginPath(); g.arc(cx, cy, 7, 0, 7); g.arc(cx + 10, cy - 3, 8, 0, 7); g.arc(cx + 20, cy + 1, 6, 0, 7); g.fill();
      }
      g.globalAlpha = 1;
    }
    var hc = st.hills;
    for (var layer = 0; layer < 2; layer++) {
      var par = layer ? 6 : 3, y0 = H * (layer ? 0.52 : 0.48), amp = layer ? 16 : 22;
      for (var x = 0; x < W; x += 2) {
        var hx = x + hillOff * W * par, h1 = amp * 0.6 + 10 * Math.sin(hx * (0.016 + layer * 0.006)) + 6 * Math.sin(hx * 0.051 + 1 + layer);
        R(x, y0 - h1 + 6, 2, h1 + 50, mix(hc, mix("#000000", "#ffffff", 0.28), k * (0.25 + layer * 0.15)));
      }
    }
    if (st.sea) {
      var sea = mix("#0a1a30", "#3cb8c8", k);
      R(0, H * 0.52, W, 10, sea);
      for (var w = 0; w < 8; w++) R(((w * 40 + t * 20) % W), H * 0.53 + (w % 3), 10, 1, "rgba(255,255,255,0.25)");
    }
  }
  function render(c, t) {
    if (!W) sizeLo();
    var base = seg(Math.floor(pos / SEG)), bp = (pos % SEG) / SEG;
    stage = base.st;
    sky(t);
    var playerY = lerp(base.p1.y, base.p2.y, bp), camY = playerY + CAM_H;
    var camX = pX * RW, x = 0, dx = -(base.curve * bp), maxy = H, i, n;
    var vis = [];
    for (n = 0; n < DRAW; n++) {
      i = base.i + n; if (i >= segs.length) break;
      var s = segs[i], loop = 0;
      s.p1c = s.p1c || {}; s.p2c = s.p2c || {};
      s.p1c.x = 0; s.p1c.y = s.p1.y; s.p1c.z = s.p1.z; s.p2c.x = 0; s.p2c.y = s.p2.y; s.p2c.z = s.p2.z;
      project(s.p1c, camX - x, camY, pos - (n === 0 ? 0 : 0), s.off);
      project(s.p2c, camX - x - dx, camY, pos, s.off);
      s.fogN = n / DRAW;
      x += dx; dx += s.curve;
      s.clip = maxy;
      if (s.p1c.Z <= DEPTH || s.p2c.sy >= s.p1c.sy || s.p2c.sy >= maxy) { vis.push(s); continue; }
      var alt = Math.floor(i / 3) % 2, st = s.st, gc = st.grass[alt];
      R(0, s.p2c.sy, W, s.p1c.sy - s.p2c.sy + 1, gc);
      if (s.fk > 0) {
        var f1 = s.fk * s.p1c.sc * W / 2, f2 = s.fk * s.p2c.sc * W / 2;
        drawSeg(s.p1c.sx - f1, s.p1c.sy, s.p1c.sw, s.p2c.sx - f2, s.p2c.sy, s.p2c.sw, s, alt, true); drawSeg(s.p1c.sx + f1, s.p1c.sy, s.p1c.sw, s.p2c.sx + f2, s.p2c.sy, s.p2c.sw, s, alt, true);
      } else {
        drawSeg(s.p1c.sx, s.p1c.sy, s.p1c.sw, s.p2c.sx, s.p2c.sy, s.p2c.sw, s, alt, true);
      }
      if (s.check || s.finish) { var hw = s.p1c.sw * 1.2; for (var q = 0; q < 10; q++) R(s.p1c.sx - hw + q * hw / 5, s.p1c.sy - 2, hw / 5, 3, q % 2 ? "#111" : "#f4f4f4"); }
      // fog towards the horizon
      if (s.fogN > 0.55) { g.globalAlpha = (s.fogN - 0.55) * 1.6; R(0, s.p2c.sy, W, s.p1c.sy - s.p2c.sy + 1, mix("#1a2040", "#ffd0c0", dawnK())); g.globalAlpha = 1; }
      maxy = s.p2c.sy;
      vis.push(s);
    }
    // sprites and cars back to front
    for (n = vis.length - 1; n >= 0; n--) {
      var sg = vis[n];
      if (sg.p1c.Z <= DEPTH) continue;
      for (var k = 0; k < sg.sprites.length; k++) {
        var sp = sg.sprites[k]; if (sp.got) continue;
        var sx = sg.p1c.sx + sg.p1c.sc * sp.off * RW * W / 2;
        if (sp.median) { if (sg.fk < RW * 1.1) continue; sx = sg.p1c.sx; }
        drawSprite(SP[sp.src], sx, sg.p1c.sy, sg.p1c.sc, sp.off < 0 ? -1 : 0, sg.clip, sp.label);
      }
      for (var cI = 0; cI < cars.length; cI++) {
        var cr = cars[cI], cs = Math.floor(cr.z / SEG);
        if (cs !== sg.i) continue;
        var cp = (cr.z % SEG) / SEG, sc = lerp(sg.p1c.sc, sg.p2c.sc, cp), cx2 = lerp(sg.p1c.sx, sg.p2c.sx, cp), cy2 = lerp(sg.p1c.sy, sg.p2c.sy, cp);
        var offPx = ((cr.off2 || 0) - sg.off + cr.off * RW) * sc * W / 2;
        drawSprite(SP[cr.src], cx2 + offPx, cy2, sc, -0.5, sg.clip, null, 0.9);
      }
    }
    // the roadster
    var lean = (ui.down("L") || steer < -0.3) ? 0 : (ui.down("R") || steer > 0.3) ? 2 : 1;
    if (mode !== "run") lean = 1;
    var bounce = speed > 0 && mode === "run" ? (Math.floor(t * 18) % 2) * (speed / MAXV > 0.3 ? 1 : 0) : 0;
    var cw = Math.round(W * 0.2), ch = Math.round(cw * 30 / 56);
    var cy = Math.round(H - ch - 4 - bounce - (bump > 0 ? 2 : 0));
    g.fillStyle = "rgba(0,0,0,0.28)"; g.beginPath(); g.ellipse(W / 2, H - 6, cw * 0.42, 4, 0, 0, 7); g.fill();
    g.drawImage(CAR[lean], Math.round(W / 2 - cw / 2), cy, cw, ch);
    if (dawnK() < 0.35) {
      g.globalAlpha = 0.2 * (1 - dawnK() / 0.35);
      g.fillStyle = "#ffe8a0"; g.beginPath(); g.moveTo(W / 2 - 8, cy + ch * 0.7); g.lineTo(W / 2 - 40, H); g.lineTo(W / 2 + 24, H); g.lineTo(W / 2 + 4, cy + ch * 0.7); g.fill();
      g.globalAlpha = 1;
    }
    var vg = g.createRadialGradient(W / 2, H * 0.7, 20, W / 2, H * 0.5, W * 0.8);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(20,10,20,0.28)");
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    c.drawImage(lo, 0, 0, W * PX, H * PX);
    if (mode === "run" && !ui.menuOpen) {
      if (bannerT > 0) ui.text(banner, ui.VW / 2, ui.VH * 0.22, 22, "#ffe3a0", "center", "#ff9a2a");
      if (timeLeft < 10) ui.text(Math.ceil(timeLeft) + "", ui.VW / 2, ui.VH * 0.12, 34, "#ff6a3a", "center", "#ff2a00");
      if (base.forkQ != null && !picked && base.forkQ < FORK_PICK) ui.text("◀ " + STAGES[stageKey].label[0] + "     " + STAGES[stageKey].label[1] + " ▶", ui.VW / 2, ui.VH * 0.32, 16, "#ffd38a", "center");
    }
  }
  function drawSprite(img, x, y, sc, ox, clip, label, sz) {
    var k = (sz || 1) * sc * W / 2 * 60;
    var w = img.width * k, h = img.height * k;
    if (w < 1 || h < 1 || w > W * 3) return;
    var dx = x + w * (ox || 0) - (ox === -0.5 ? 0 : 0), dy = y - h;
    if (ox === 0) dx = x; else if (ox === -1) dx = x - w; else dx = x - w / 2;
    var cut = clip ? Math.max(0, dy + h - clip) : 0;
    if (cut >= h) return;
    g.drawImage(img, 0, 0, img.width, img.height - img.height * cut / h, Math.round(dx), Math.round(dy), Math.round(w), Math.round(h - cut));
    if (label && w > 18) { g.fillStyle = "#fff"; g.font = "bold " + Math.max(5, Math.round(h * 0.3)) + "px monospace"; g.textAlign = "center"; g.fillText(label, dx + w / 2, dy + h * 0.38); g.textAlign = "left"; }
  }

  // ---------- input: drag steering and tilt ----------
  var drag = null;
  var game = {
    toTitle: toTitle, onResize: sizeLo,
    onPause: function () { engine(false); }, onResume: function () { engine(true); },
    onBack: function () { if (mode === "title") return "exit"; toTitle(); return "menu"; },
    onPointer: function (type, x, y, id) {
      if (save.steer !== "drag") return;
      if (type === "pointerdown") drag = { x: x, id: id };
      else if (type === "pointermove" && drag && drag.id === id) steer = clamp((x - drag.x) / 70, -1, 1);
      else if (type === "pointerup" && drag && drag.id === id) { drag = null; steer = 0; }
    },
    update: update,
    idle: function (dt) { if (mode === "title") { pos += MAXV * 0.35 * dt; if (pos > (segs.length - DRAW - 2) * SEG) pos = 0; elapsed = 20 + Math.sin(ui.time) * 0; } },
    render: render
  };
  window.addEventListener("deviceorientation", function (e) {
    if (save.steer !== "tilt" || e.gamma == null) return;
    var ang = (screen.orientation && screen.orientation.angle) || window.orientation || 0, v;
    if (ang === 90) v = e.beta; else if (ang === 270 || ang === -90) v = -e.beta; else v = e.gamma;
    steer = clamp(v / 22, -1, 1);
  });
  function steerLabel() { return save.steer === "tilt" ? "Steering: tilt" : save.steer === "pads" ? "Steering: pads" : "Steering: drag"; }
  function toTitle() {
    ui.stop(); engine(false); mode = "title";
    segs = []; cars = []; forkA = buildStage("harbour", 0); picked = false; pos = 0; pX = 0; speed = 0; elapsed = 25; stageKey = "harbour";
    A.playSong(SONGS[songIx]); ui.setCourse("The post run");
    ui.padsOnly(save.steer === "pads" ? null : ["B"]);
    ui.menu({ title: "DAWN MAIL", body: "Sable Quinn has the post. The sun's coming.",
      stats: "<span>HIGH SCORE " + (save.hi ? FF.n(save.hi) : "-") + "</span><span>FINISHES FOUND " + Object.keys(save.ends).length + "/4</span>",
      buttons: [{ label: "Drive", act: newRun }, { label: steerLabel(), small: true, act: function () { save.steer = save.steer === "drag" ? "tilt" : save.steer === "tilt" ? "pads" : "drag"; ui.persist(); if (save.steer === "tilt" && window.DeviceOrientationEvent && DeviceOrientationEvent.requestPermission) DeviceOrientationEvent.requestPermission().catch(function () {}); toTitle(); } },
        { label: "Radio: " + SONGS[songIx].name, small: true, act: function () { songIx = (songIx + 1) % SONGS.length; save.song = songIx; ui.persist(); A.stopSong(); toTitle(); } }], app: true,
      help: ["Drag left or right anywhere to steer (or tilt, or the pads). It accelerates by itself; hold Brake for the bends.", "At each fork keep left or right to pick your road. Checkpoints add time.", "Four finishes to find. Grab mail bags for points."],
      fine: "A Forest Forge game", solid: false });
  }
  ui.onAdsRemoved = function () { if (mode === "title") toTitle(); };
  game.qa = { cars: function () { return cars; }, run: newRun, state: function () { var s = seg(Math.floor(pos / SEG)); return { pos: pos, si: s.i, pX: pX, speed: speed, MAXV: MAXV, curve: s.curve, off: s.off, fk: s.fk, forkQ: s.forkQ, picked: picked, stage: stageKey, row: stageRow, time: timeLeft, mode: mode, path: pathKeys.slice(), n: segs.length }; }, steer: function (v) { steer = v; }, warp: function (dz) { pos += dz; } };
  ui.start(game);
})();
