/* Kilnbound (Forest Forge). Tamsin Vey is cursed by the Kiln Heart into a
 * walking clay figure. Beat each keeper to win a new form (crow glide, eel swim,
 * badger dig), change form at shrines, spend coins at the Ashcombe night market,
 * and break the Kiln Heart. Interconnected areas, built on platform.js.
 * All art drawn in code, all sound generated (shell.js). */
(function () {
  "use strict";
  (function applyChrome(css) {
    var s = document.createElement("style"); s.id = "ff-palette"; s.textContent = css;
    document.head.appendChild(s);
    var m = document.querySelector('meta[name="theme-color"]');
    var bg = /--bg:([^;}]+)/.exec(css); if (m && bg) m.setAttribute("content", bg[1].trim());
  })(`:root{--bg:#4a2ab8;--sky1:#ff9a4a;--sky2:#7a3aff;--water:#2a1a78;--amber:#ffffff;--amber-hi:#ffe27a;--amber-soft:#ffffff;--amber-line:#14b8a0;--ember:#6a1aa0;--btn:#3a2098;--lamp:#fff6d8;--pop1:#ffb03a;--pop2:#4af0d8;--pop3:#ff7ae0;--glow-line:rgba(255,255,255,.55);--glow-fill:rgba(255,255,255,.14)}`);
  var clamp = FF.clamp, TS = PF.TS;
  var ui = FF.create({
    deco: ["spark", "drop", "diamond"], 
    id: "kilnbound", title: "Kilnbound", course: "Ashcombe", wide: true, view: { w: 640, h: 360, flex: true },
    stats: [{ id: "coins", label: "Coins", value: "0" }, { id: "form", label: "Form", value: "Clay" }],
    pads: {
      left: [{ id: "L", icon: "left", aria: "Left", keys: ["ArrowLeft", "KeyA"] }, { id: "R", icon: "right", aria: "Right", keys: ["ArrowRight", "KeyD"] }],
      right: [{ id: "A", label: "Act", aria: "Attack or use", keys: ["KeyX", "KeyK", "ShiftLeft", "Enter"] }, { id: "J", icon: "up", cls: "big", aria: "Jump", keys: ["Space", "ArrowUp", "KeyW", "KeyZ", "KeyJ"] }]
    }
  });
  var A = ui.audio, save = ui.save;
  function freshSave() { save.started = 0; save.forms = ["clay"]; save.form = "clay"; save.boss = {}; save.chests = {}; save.coins = 0; save.maxH = 3; save.ward = 0; save.edge = 0; save.stones = 0; save.spawn = { area: "town", x: 5, y: 13 }; save.cleared = 0; }
  if (!save.forms) freshSave();

  var PX = 2, lo = document.createElement("canvas"), g = lo.getContext("2d"), W = 320, H = 180, Q = 1;
  function sizeLo() { W = Math.ceil(ui.VW / PX); H = Math.ceil(ui.VH / PX); Q = FF.hdq ? FF.hdq(ui, PX) : 1; lo.width = Math.round(W * Q); lo.height = Math.round(H * Q); g.setTransform(Q, 0, 0, Q, 0, 0); g.imageSmoothingEnabled = false; g.hdQ = Q; }

  // ---------- forms ----------
  var FORMS = {
    clay: { name: "Clay", long: "Kiln-walker", w: 10, h: 20, speed: 85, jump: 310, range: 14, note: "Wades through lava, punches through brick." },
    crow: { name: "Crow", long: "Crow", w: 10, h: 10, speed: 92, jump: 300, range: 11, note: "Flap twice in the air, hold Jump to glide." },
    eel: { name: "Eel", long: "Eel", w: 16, h: 8, speed: 45, jump: 190, range: 12, note: "Swims anywhere underwater. Slow on land." },
    badger: { name: "Badger", long: "Badger", w: 14, h: 10, speed: 100, jump: 290, range: 12, note: "Act digs soft earth ahead or below." }
  };
  var FORM_ORDER = ["clay", "crow", "eel", "badger"];

  // ---------- areas ----------
  function Map(w, h) {
    var gr = []; for (var y = 0; y < h; y++) { var row = []; for (var x = 0; x < w; x++) row.push(" "); gr.push(row); }
    return { w: w, h: h, r: function (x0, y0, x1, y1, c) { for (var y = Math.max(0, y0); y <= Math.min(h - 1, y1); y++) for (var x = Math.max(0, x0); x <= Math.min(w - 1, x1); x++) gr[y][x] = c; }, p: function (x, y, c) { if (x >= 0 && x < w && y >= 0 && y < h) gr[y][x] = c; }, rows: function () { return gr.map(function (r) { return r.join(""); }); } };
  }
  var THEMES = {
    town: { sky: ["#1a1048", "#6a40c0"], stars: 1, far: "#2a1860", near: "#3a2080", dirt: "#4a3a62", dirtD: "#3a2a50", top: "#2ab8a8", topD: "#1a8a80", plank: "#c4a050", water: "#1a3a7a", waterHi: "#7ab0ff", soft: "#5a3a70", spike: "#2ab8a8", rock: "#6a5a80" },
    kiln: { sky: ["#201038", "#8a3060"], far: "#4a1860", near: "#3a1048", dirt: "#5a3060", dirtD: "#3a1848", top: "#c49040", topD: "#8a6828", plank: "#c4a050", brick: "#7a4a90", soft: "#5a3a70", spike: "#2ab8a8", backY: 2, back: "#2a0c30" },
    cliffs: { sky: ["#3a70d0", "#8ad8f0"], sun: "#ffe27a", far: "#5a48a0", near: "#3a80a0", dirt: "#6a6a80", dirtD: "#4a4a68", top: "#2ab8a8", topD: "#1a8a80", plank: "#c4a050", soft: "#5a3a70" },
    mere: { sky: ["#0a3048", "#1a6878"], far: "#0e4860", near: "#0a3850", dirt: "#1a5a62", dirtD: "#0e444c", top: "#2ab8a8", topD: "#1a8a80", water: "rgba(20,160,180,0.45)", waterHi: "rgba(160,255,240,0.55)", plank: "#c4a050", soft: "#2a4a50" },
    sett: { sky: ["#1a1440", "#3a2870"], stars: 1, far: "#2a2060", near: "#1a1848", trees: "#1a3860", dirt: "#3a3a5a", dirtD: "#2a2a48", top: "#2ab8a8", topD: "#1a8a80", soft: "#5a3a70", spike: "#2ab8a8", backY: 5, back: "#180c28" },
    heart: { sky: ["#280848", "#8040b0"], far: "#4a1868", near: "#3a1050", dirt: "#5a2460", dirtD: "#3a1448", top: "#e0b040", topD: "#b08828", plank: "#c4a050", brick: "#7a4a90", backY: 1, back: "#200830" }
  };
  // door chars: [target area, target door char, needs boss of this area]; chars without an entry are arrival points only
  var DOORS = {
    town: { 1: ["kiln", "1"], 2: ["cliffs", "2"], 3: ["mere", "3"], 4: ["sett", "4"] },
    kiln: { 1: ["town", "1"], 7: ["town", "7", 1] },
    cliffs: { 2: ["town", "2"], 6: ["town", "6", 1] },
    mere: { 3: ["town", "3"], 8: ["town", "8", 1] },
    sett: { 4: ["town", "4"], 5: ["heart", "5"] },
    heart: { 5: ["sett", "5"] }
  };
  var AREAS = {
    town: { name: "Ashcombe", song: "town", build: function () {
      var m = Map(72, 16);
      m.r(0, 14, 71, 15, "#");
      m.p(1, 13, "1"); m.p(5, 13, "S"); m.p(12, 13, "M"); m.p(9, 13, "7"); m.p(18, 13, "6"); m.p(21, 13, "8");
      m.p(3, 11, "l"); m.p(16, 11, "l"); m.p(28, 11, "l"); m.p(40, 11, "l");
      m.r(24, 14, 26, 15, "w"); m.p(25, 15, "3");
      m.p(30, 12, "$"); m.p(32, 12, "$"); m.p(34, 12, "$");
      m.p(37, 13, "s"); m.p(41, 10, "q");
      m.r(44, 11, 46, 11, "="); m.r(47, 8, 49, 8, "="); m.r(50, 6, 52, 9, "#");
      m.p(51, 5, "$");
      m.r(59, 9, 60, 13, "d"); m.r(59, 8, 64, 8, "#"); m.r(65, 6, 71, 15, "#");
      m.p(68, 5, "2"); m.p(63, 13, "4"); m.p(55, 13, "T"); m.p(62, 7, "$");
      return m;
    } },
    kiln: { name: "Cinder Kiln", song: "field", boss: "warden", build: function () {
      var m = Map(96, 18);
      m.r(0, 0, 95, 1, "K"); m.r(0, 16, 95, 17, "#"); m.r(0, 2, 1, 15, "K");
      m.p(94, 15, "1"); m.p(90, 15, "S"); m.p(84, 10, "z"); m.p(86, 13, "$"); m.p(80, 13, "$");
      m.r(70, 16, 77, 16, "L"); m.p(72, 13, "$"); m.p(75, 13, "$");
      m.r(64, 9, 65, 15, "B"); m.r(64, 2, 65, 8, "K");
      m.p(61, 15, "k"); m.r(52, 13, 58, 15, "#"); m.p(55, 12, "h");
      m.r(46, 11, 49, 11, "="); m.p(47, 10, "$"); m.p(48, 10, "$");
      m.r(34, 16, 45, 16, "L"); m.r(39, 14, 40, 15, "K"); m.p(40, 7, "z"); m.p(36, 13, "$"); m.p(43, 13, "$");
      m.r(28, 9, 29, 15, "B"); m.r(28, 2, 29, 8, "K"); m.p(31, 15, "T");
      m.r(30, 11, 33, 11, "="); m.p(31, 10, "Y");
      m.r(24, 10, 25, 15, "B"); m.r(24, 2, 25, 9, "K");
      m.p(12, 14, "X"); m.p(3, 15, "7"); m.r(5, 12, 7, 12, "="); m.r(17, 12, 19, 12, "=");
      return m;
    } },
    cliffs: { name: "Rookery Cliffs", song: "field", boss: "rook", build: function () {
      var m = Map(104, 22);
      m.r(0, 8, 9, 21, "#"); m.p(1, 7, "2"); m.p(5, 7, "S");
      m.r(18, 10, 22, 21, "#"); m.p(26, 11, "q"); m.p(19, 9, "$"); m.p(21, 9, "$");
      m.r(31, 7, 34, 21, "#"); m.r(38, 3, 40, 3, "="); m.p(39, 2, "Y"); m.p(32, 6, "$");
      m.r(44, 11, 48, 21, "#"); m.p(46, 5, "z"); m.p(45, 10, "$"); m.p(47, 10, "s");
      m.r(57, 9, 59, 21, "#"); m.p(58, 8, "$"); m.r(62, 13, 63, 13, "=");
      m.r(67, 16, 103, 21, "#"); m.p(86, 9, "X"); m.p(101, 15, "6"); m.p(70, 15, "T");
      m.r(76, 12, 79, 12, "="); m.r(92, 12, 95, 12, "=");
      return m;
    } },
    mere: { name: "Ashmere", song: "water", boss: "pike", build: function () {
      var m = Map(84, 26);
      m.r(0, 2, 83, 24, "w"); m.r(0, 0, 83, 1, "#"); m.r(0, 25, 83, 25, "#");
      m.p(2, 3, "3");
      m.r(10, 2, 12, 18, "#"); m.r(22, 8, 24, 24, "#"); m.r(34, 2, 36, 17, "#"); m.r(46, 9, 48, 24, "#");
      m.r(26, 2, 32, 4, " "); m.r(26, 5, 26, 6, "#"); m.r(32, 5, 32, 6, "#"); m.p(29, 4, "Y");
      m.r(14, 21, 20, 24, "#"); m.r(38, 20, 44, 24, "#");
      m.p(6, 14, "p"); m.p(17, 10, "p"); m.p(29, 18, "p"); m.p(41, 6, "p");
      m.p(5, 20, "$"); m.p(16, 18, "$"); m.p(28, 12, "$"); m.p(40, 12, "$"); m.p(17, 20, "T");
      m.r(70, 20, 83, 24, "#"); m.p(66, 12, "X"); m.p(81, 19, "8");
      return m;
    } },
    sett: { name: "Sett Woods", song: "field", build: function () {
      var m = Map(60, 30);
      m.r(0, 5, 59, 29, "d"); m.r(0, 26, 59, 29, "#");
      m.p(1, 4, "4"); m.p(4, 4, "S"); m.p(12, 4, "$"); m.p(20, 4, "k"); m.p(30, 4, "$");
      m.r(0, 10, 50, 10, "#"); m.r(3, 8, 47, 9, " "); m.p(20, 9, "s"); m.p(35, 9, "h"); m.p(42, 9, "$"); m.p(10, 9, "$");
      m.r(10, 17, 59, 17, "#"); m.r(13, 15, 58, 16, " "); m.p(30, 16, "h"); m.p(45, 16, "k"); m.p(24, 16, "$");
      m.r(54, 12, 57, 13, " "); m.r(53, 11, 58, 11, "#"); m.p(55, 13, "Y");
      m.r(0, 23, 50, 23, "#"); m.r(0, 21, 45, 22, " "); m.p(20, 22, "s"); m.p(10, 21, "z"); m.p(33, 22, "h"); m.p(5, 22, "T");
      m.r(30, 24, 58, 25, " "); m.p(57, 25, "5"); m.p(40, 25, "T"); m.p(35, 25, "$"); m.p(45, 25, "$");
      return m;
    } },
    heart: { name: "Kiln Heart", song: "boss", boss: "heart", build: function () {
      var m = Map(48, 18);
      m.r(0, 0, 47, 0, "K"); m.r(0, 15, 47, 17, "#"); m.r(12, 15, 40, 15, "L");
      m.p(2, 14, "5"); m.p(6, 14, "S");
      m.r(14, 11, 18, 11, "="); m.r(32, 11, 36, 11, "="); m.r(23, 8, 25, 8, "=");
      m.p(26, 5, "X");
      return m;
    } }
  };

  // ---------- art ----------
  var bmp = PF.bmp;
  function two(a, pal) { var A1 = bmp(a, pal); return [A1, PF.flipped(A1)]; }
  var CROW = [two(["...........", "aa.......bb", ".aaa....bbbe", "..aaaaaabcbe", "...aaaaaaaa.", "....aaaaa...", ".....d.d...."], { a: "#24243a", b: "#34344a", c: "#ffe060", e: "#e0a030", d: "#c8a040" }),
    two(["...........", "........bb.", "........bbbe", ".aaaaaaabcbe", "aaaaaaaaaaa.", "..aaaaaaa...", ".....d.d...."], { a: "#24243a", b: "#34344a", c: "#ffe060", e: "#e0a030", d: "#c8a040" })];
  var COIN = bmp([".aa.", "abba", "abba", ".aa."], { a: "#c88a10", b: "#ffe060" });
  var HEART = bmp([".a.a.", "aaaaa", "aaaaa", ".aaa.", "..a.."], { a: "#e83a3a" });
  var HEART_H = bmp([".a...", "aaa..", "aaa..", ".aa..", "..a.."], { a: "#e83a3a" });
  var HEART_E = bmp([".a.a.", "a.a.a", "a...a", ".a.a.", "..a.."], { a: "#5a2a2a" });
  var CHEST = bmp(["aaaaaaaaaa", "abbbbbbbba", "aaaacaaaaa", "abbbcbbbba", "abbbbbbbba", "aaaaaaaaaa"], { a: "#5a3a1a", b: "#a8703a", c: "#ffe060" });
  var CHEST_Y = bmp(["aaaaaaaaaa", "abbbbbbbba", "aaaacaaaaa", "abbbcbbbba", "abbbbbbbba", "aaaaaaaaaa"], { a: "#5a1a2a", b: "#c83a5a", c: "#ffe060" });
  var CLAY = { hair: "#3a1a0a", skin: "#c8683a", skinD: "#9a4a2a", top: "#7a3a1e", leg: "#9a4a2a", legD: "#6a2a14", boot: "#3a1a0a", band: "#ffb030" };

  // ---------- sound ----------
  var S = {
    jump: function () { A.tone({ f: 300, f2: 620, dur: 0.1, type: "square", gain: 0.09 }); },
    flap: function () { A.noise({ dur: 0.08, gain: 0.12, freq: 1400, filter: "bandpass" }); },
    swing: function () { if (A.sfxOk()) A.noise({ dur: 0.07, gain: 0.1, freq: 2600, filter: "highpass" }); },
    hit: function () { A.tone({ f: 220, f2: 80, dur: 0.1, type: "square", gain: 0.14 }); },
    pop: function () { A.noise({ dur: 0.12, gain: 0.2, freq: 900, filter: "bandpass" }); },
    coin: function () { A.tone({ f: 1320, dur: 0.05, type: "square", gain: 0.07 }); A.tone({ f: 1760, dur: 0.07, type: "square", gain: 0.07, delay: 0.05 }); },
    hurt: function () { A.tone({ f: 400, f2: 120, dur: 0.22, type: "sawtooth", gain: 0.12 }); },
    dig: function () { A.noise({ dur: 0.1, gain: 0.16, freq: 400, filter: "lowpass" }); },
    brick: function () { A.noise({ dur: 0.18, gain: 0.22, freq: 600, filter: "bandpass" }); },
    item: function () { [660, 880, 1100, 1320].forEach(function (f, i) { A.tone({ f: f, dur: 0.09, type: "square", gain: 0.1, delay: i * 0.07 }); }); },
    door: function () { [392, 523].forEach(function (f, i) { A.tone({ f: f, dur: 0.1, type: "triangle", gain: 0.16, delay: i * 0.08 }); }); },
    shrine: function () { [523, 659, 784, 1047].forEach(function (f, i) { A.tone({ f: f, dur: 0.2, type: "triangle", gain: 0.14, delay: i * 0.1 }); }); },
    boss: function () { [196, 185, 175, 165].forEach(function (f, i) { A.tone({ f: f, dur: 0.18, type: "sawtooth", gain: 0.1, delay: i * 0.15 }); }); },
    win: function () { [523, 659, 784, 1047, 784, 1047, 1319].forEach(function (f, i) { A.tone({ f: f, dur: 0.18, type: "square", gain: 0.1, delay: i * 0.12 }); }); }
  };
  var SONGS = {
    town: { bpm: 112, swing: 0.12, order: [0, 1], parts: [[
      { wave: "square", gain: 0.045, pat: "D5 . F5 A5 . F5 G5 . E5 . C5 D5 . . A4 . D5 . F5 A5 . C6 B5 . A5 . G5 E5 . . . ." },
      { wave: "triangle", gain: 0.2, pat: "D3 . A3 . D3 . A3 . C3 . G3 . C3 . G3 . D3 . A3 . D3 . A3 . A2 . E3 . A2 . C3 ." },
      { wave: "drum", pat: "k . . h s . h . k . k h s . h . k . . h s . h . k . k h s . o ." }], [
      { wave: "square", gain: 0.045, pat: "F5 . A5 C6 . A5 G5 . F5 . E5 D5 . . C5 . A4 . C5 D5 . F5 E5 . C5 . A4 G4 A4 . . ." },
      { wave: "triangle", gain: 0.2, pat: "A#2 . F3 . A#2 . F3 . C3 . G3 . C3 . G3 . A2 . E3 . A2 . E3 . D3 . A3 . D3 . . ." },
      { wave: "drum", pat: "k . . h s . h . k . k h s . h . k . . h s . h . k k s . s s o ." }]] },
    field: { bpm: 138, order: [0, 0, 1], parts: [[
      { wave: "square", gain: 0.045, pat: "E5 . G5 . B5 . A5 G5 . E5 . D5 E5 . . . E5 . G5 . B5 . D6 C6 . B5 . A5 B5 . . ." },
      { wave: "triangle", gain: 0.2, pat: "E2 E3 E2 E3 E2 E3 E2 E3 C2 C3 C2 C3 D2 D3 D2 D3 E2 E3 E2 E3 E2 E3 E2 E3 C2 C3 C2 C3 B1 B2 B1 B2" },
      { wave: "drum", pat: "k . h . s . h k k . h . s . h . k . h . s . h k k . h . s . o ." }], [
      { wave: "square", gain: 0.045, pat: "C6 . B5 . A5 . G5 . A5 . B5 . E5 . . . C6 . B5 . A5 . G5 . F#5 . G5 . B5 . . ." },
      { wave: "triangle", gain: 0.2, pat: "A1 A2 A1 A2 A1 A2 A1 A2 E2 E3 E2 E3 E2 E3 E2 E3 A1 A2 A1 A2 A1 A2 A1 A2 B1 B2 B1 B2 B1 B2 B1 B2" },
      { wave: "drum", pat: "k . h . s . h k k . h . s . h . k . h . s . h k k k s . s s o ." }]] },
    water: { bpm: 96, order: [0], parts: [[
      { wave: "triangle", gain: 0.13, pat: "A4 - - C5 E5 - D5 - C5 - B4 - G4 - - - A4 - - C5 E5 - G5 - F5 - E5 - D5 - - -" },
      { wave: "square", gain: 0.025, pat: "A2 . E3 . A3 . E3 . F2 . C3 . F3 . C3 . D2 . A2 . D3 . A2 . E2 . B2 . E3 . B2 ." },
      { wave: "drum", pat: "k . . . h . . . s . . . h . . . k . . . h . . . s . . . h . h ." }]] },
    boss: { bpm: 160, order: [0], parts: [[
      { wave: "square", gain: 0.05, pat: "E5 E5 . E5 F5 . E5 . D#5 D#5 . D#5 E5 . D#5 . D5 D5 . D5 D#5 . D5 . C#5 . D5 . D#5 . E5 ." },
      { wave: "sawtooth", gain: 0.05, pat: "E2 E2 E3 E2 E2 E3 E2 E3 D#2 D#2 D#3 D#2 D#2 D#3 D#2 D#3 D2 D2 D3 D2 D2 D3 D2 D3 C#2 C#3 D2 D3 D#2 D#3 E2 E3" },
      { wave: "drum", pat: "k h s h k k s h k h s h k k s s k h s h k k s h k h s h k s s o" }]] }
  };

  // ---------- state ----------
  var L, area = "town", cam = PF.Camera(), parts = PF.Parts(), mode = "title", t = 0;
  var hero, foes = [], items = [], doors = [], coinsLoose = [], shots = [], boss = null, hp = 6, lastSafe = null, doorLock = true, banner = "", bannerT = 0, prompt = null, swing = null;

  function maxHp() { return save.maxH * 2; }
  function hud() { ui.setStat("coins", FF.n(save.coins)); ui.setStat("form", FORMS[save.form].name); }
  function say(s, d) { banner = s; bannerT = d || 1.6; }

  function newHero(x, y) { var f = FORMS[save.form]; return { x: x, y: y, w: f.w, h: f.h, vx: 0, vy: 0, face: 1, ground: false, coyote: 0, buffer: 0, flaps: 0, inv: 0, ph: 0, atk: 0, atkCd: 0, wet: false }; }
  function enterArea(name, at, fromShrine) {
    area = name; var def = AREAS[name], m = def.build();
    L = PF.Level(m.rows(), { theme: THEMES[name], seed: name.length * 7 });
    foes = []; items = []; doors = []; coinsLoose = []; shots = []; boss = null; parts.clear(); swing = null;
    var spawn = null;
    L.ents.forEach(function (e) {
      var f = PF.Foes.make(e.ch, e.x, e.y);
      if (f) { foes.push(f); return; }
      if (/[0-9]/.test(e.ch)) { var d = { ch: e.ch, tx: e.tx, ty: e.ty, x: e.x, y: e.y - TS, w: TS, h: TS * 2, link: DOORS[name][e.ch] || null }; doors.push(d); if (!fromShrine && at === e.ch) spawn = { x: e.x + TS / 2, y: e.y + TS }; return; }
      if (e.ch === "X") { if (!save.boss[name]) boss = makeBoss(def.boss, e.x, e.y); return; }
      var key = name + ":" + e.tx + "," + e.ty;
      if ((e.ch === "T" || e.ch === "Y") && save.chests[key]) return;
      var it = { k: e.ch, x: e.x + 3, y: e.y + 3, w: 10, h: 10, tx: e.tx, ty: e.ty, key: key };
      if (e.ch === "S" || e.ch === "M") { it.x = e.x - 6; it.y = e.y - 8; it.w = 28; it.h = 24; }
      items.push(it);
    });
    if (fromShrine) spawn = { x: at.x * TS + TS / 2, y: at.y * TS + TS };
    if (!spawn) spawn = { x: 3 * TS, y: 5 * TS };
    var f = FORMS[save.form];
    hero = newHero(spawn.x - f.w / 2, spawn.y - f.h);
    lastSafe = { x: hero.x, y: hero.y }; doorLock = true;
    cam.x = hero.x - W / 2; cam.y = hero.y - H / 2; PF.follow(cam, L, hero, W, H, 1);
    ui.setCourse(def.name);
    playAreaSong();
    hud();
  }
  function playAreaSong() { if (mode !== "play") return; A.playSong(SONGS[boss && boss.active ? "boss" : AREAS[area].song]); }

  // ---------- bosses ----------
  var BOSS = {
    warden: { name: "The Slag Warden", hp: 10, w: 24, h: 28, prize: "crow" },
    rook: { name: "The Rook Mother", hp: 12, w: 26, h: 16, prize: "eel" },
    pike: { name: "The Mere Pike", hp: 12, w: 34, h: 12, prize: "badger" },
    heart: { name: "The Kiln Heart", hp: 16, w: 28, h: 28, prize: null }
  };
  function makeBoss(kind, x, y) { var d = BOSS[kind]; return { kind: kind, name: d.name, hp: d.hp, max: d.hp, w: d.w, h: d.h, x: x, y: y + TS - d.h, hx: x, hy: y, vx: 0, vy: 0, t: 0, act: 0, inv: 0, dir: -1, active: false, dash: 0 }; }
  function shoot(x, y, vx, vy, grav, c) { shots.push({ x: x, y: y, w: 6, h: 6, vx: vx, vy: vy, grav: grav || 0, c: c || "#ffb030", life: 4 }); }
  function stepBoss(b, dt) {
    var h = hero, dx = h.x + h.w / 2 - (b.x + b.w / 2), dy = h.y + h.h / 2 - (b.y + b.h / 2);
    if (!b.active) { if (Math.abs(dx) < 170 && Math.abs(dy) < 120) { b.active = true; S.boss(); say(b.name, 2); playAreaSong(); } else return; }
    b.t += dt; b.act -= dt; if (b.inv > 0) b.inv -= dt;
    if (b.kind === "warden") {
      b.vy = Math.min(420, b.vy + 900 * dt);
      if (b.act <= 0) {
        b.act = 2.2 - (1 - b.hp / b.max) * 0.8;
        if (Math.random() < 0.5) { b.vy = -330; b.vx = clamp(dx * 1.1, -130, 130); }
        else for (var i = 0; i < 3; i++) shoot(b.x + b.w / 2, b.y + 6, (dx < 0 ? -1 : 1) * (60 + i * 45), -260 + i * 20, 650, "#ff8a20");
      }
      var r = PF.move(L, b, dt);
      if (r.ground) b.vx = (dx < 0 ? -1 : 1) * 30;
      b.dir = dx < 0 ? -1 : 1;
    } else if (b.kind === "rook") {
      if (b.dash > 0) { b.dash -= dt; b.x += b.vx * dt; b.y += b.vy * dt; if (b.dash <= 0) { b.vx = 0; b.vy = 0; } }
      else {
        var tx = b.hx + Math.sin(b.t * 0.9) * 110, ty = b.hy - 10 + Math.sin(b.t * 2.1) * 12;
        b.x += (tx - b.x) * Math.min(1, dt * 2); b.y += (ty - b.y) * Math.min(1, dt * 2);
        if (b.act <= 0) {
          b.act = 2.6 - (1 - b.hp / b.max) * 0.9;
          if (Math.random() < 0.55) { b.dash = 0.9; b.vx = dx / 0.9; b.vy = dy / 0.9 + 10; }
          else for (var k = -1; k <= 1; k++) shoot(b.x + b.w / 2, b.y + b.h, k * 50, 90, 60, "#c8c8e0");
        }
        if (b.dash <= 0 && b.y > b.hy + 6) b.y += (b.hy - b.y) * dt;
      }
      b.dir = dx < 0 ? -1 : 1;
    } else if (b.kind === "pike") {
      if (b.dash > 0) { b.dash -= dt; } else { b.vx += ((dx < 0 ? -1 : 1) * 30 - b.vx) * dt * 2; b.vy += (clamp(dy, -30, 30) - b.vy) * dt * 2; }
      if (b.act <= 0) { b.act = 2.3 - (1 - b.hp / b.max) * 0.8; b.dash = 0.6; var d = Math.hypot(dx, dy) || 1; b.vx = dx / d * 210; b.vy = dy / d * 210; }
      var r2 = PF.move(L, b, dt); if (r2.wallL || r2.wallR) b.vx = -b.vx * 0.5;
      if (!PF.touching(L, b, "water")) b.vy += 600 * dt;
      b.dir = b.vx < 0 ? -1 : 1;
    } else if (b.kind === "heart") {
      var s = 1 + (1 - b.hp / b.max) * 0.6;
      b.x = b.hx - b.w / 2 + 8 + Math.sin(b.t * 0.7 * s) * 150; b.y = b.hy + Math.sin(b.t * 1.4 * s) * 30 + (Math.sin(b.t * 0.35) > 0.6 ? 70 : 0);
      if (b.act <= 0) { b.act = 2.1 - (1 - b.hp / b.max) * 0.8; var n = b.hp < b.max / 2 ? 8 : 6; for (var j = 0; j < n; j++) { var a = j / n * Math.PI * 2 + b.t; shoot(b.x + b.w / 2, b.y + b.h / 2, Math.cos(a) * 85, Math.sin(a) * 85, 0, "#ffd040"); } }
      b.dir = dx < 0 ? -1 : 1;
    }
    if (PF.aabb(h, b)) hurt(2, b.x + b.w / 2);
  }
  function hitBoss(b, dmg) {
    if (b.inv > 0) return; b.hp -= dmg; b.inv = 0.3; S.hit(); parts.add(b.x + b.w / 2, b.y + b.h / 2, 10, "#ffe0a0", 90);
    if (b.hp <= 0) bossDown(b);
  }
  function bossDown(b) {
    var d = BOSS[b.kind]; boss = null; shots = []; save.boss[area] = 1; S.win();
    parts.add(b.x + b.w / 2, b.y + b.h / 2, 40, "#ffb030", 140, 1.2);
    for (var i = 0; i < 8; i++) coinsLoose.push({ x: b.x + b.w / 2, y: b.y, w: 6, h: 6, vx: (Math.random() - 0.5) * 160, vy: -200 - Math.random() * 100, v: 10, life: 12 });
    if (d.prize && save.forms.indexOf(d.prize) < 0) save.forms.push(d.prize);
    ui.persist(); A.stopSong();
    if (b.kind === "heart") { save.cleared = 1; ui.persist(); setTimeout(ending, 1200); return; }
    var f = FORMS[d.prize];
    setTimeout(function () {
      if (mode !== "play") return; ui.stop();
      ui.menu({ kicker: d.name + " is broken", title: f.long + " form!", body: f.note + " Change form at any shrine. The way out of this keep has opened.", buttons: [{ label: "Carry on", act: function () { ui.go(); playAreaSong(); } }] });
    }, 900);
  }
  function drawBoss(b, tt) {
    var x = Math.round(b.x - cam.x), y = Math.round(b.y - cam.y), fl = b.inv > 0 && Math.floor(tt * 20) % 2;
    if (b.kind === "warden") {
      g.fillStyle = fl ? "#fff" : "#5a2a18"; g.fillRect(x + 2, y + 8, 20, 14); g.fillRect(x + 4, y + 22, 6, 6); g.fillRect(x + 14, y + 22, 6, 6);
      g.fillStyle = fl ? "#fff" : "#7a3a20"; g.fillRect(x + 5, y, 14, 10); g.fillRect(x - 2, y + 9, 5, 10); g.fillRect(x + 21, y + 9, 5, 10);
      g.fillStyle = "#ff8a20"; g.fillRect(x + 7 + (b.dir > 0 ? 2 : 0), y + 4, 3, 2); g.fillRect(x + 13 + (b.dir > 0 ? 2 : 0), y + 4, 3, 2);
      g.fillStyle = "rgba(255,140,40," + (0.4 + 0.3 * Math.sin(tt * 8)) + ")"; g.fillRect(x + 8, y + 12, 8, 6);
    } else if (b.kind === "rook") {
      var up = Math.sin(tt * 12) > 0;
      g.fillStyle = fl ? "#fff" : "#1e1e2e"; g.fillRect(x + 6, y + 5, 16, 8); g.fillRect(x + (b.dir > 0 ? 20 : 0), y + 2, 6, 7);
      g.fillRect(x + 4, y + (up ? -4 : 9), 18, 5); g.fillRect(x + (b.dir > 0 ? 0 : 22), y + 7, 5, 4);
      g.fillStyle = "#e8b030"; g.fillRect(x + (b.dir > 0 ? 26 : -3), y + 5, 3, 2); g.fillStyle = "#ff3a3a"; g.fillRect(x + (b.dir > 0 ? 23 : 2), y + 4, 1, 1);
    } else if (b.kind === "pike") {
      g.fillStyle = fl ? "#fff" : "#3a6a3a"; g.fillRect(x + 4, y + 2, 26, 9); g.fillRect(x + (b.dir > 0 ? 0 : 28), y, 6, 12);
      g.fillStyle = fl ? "#fff" : "#9ac06a"; g.fillRect(x + 6, y + 8, 22, 3);
      g.fillStyle = "#ffe060"; g.fillRect(x + (b.dir > 0 ? 26 : 6), y + 4, 2, 2);
      g.fillStyle = "#fff"; for (var i = 0; i < 3; i++) g.fillRect(x + (b.dir > 0 ? 29 + i : 1 + i), y + 8, 1, 2);
    } else {
      var pul = Math.sin(tt * 5) * 2;
      g.fillStyle = fl ? "#fff" : "#7a2a14"; g.fillRect(x + 2 - pul, y + 4 - pul, 24 + pul * 2, 20 + pul * 2); g.fillRect(x + 6, y, 16, 28);
      g.fillStyle = "#ff8a20"; g.fillRect(x + 8, y + 8, 12, 12); g.fillStyle = "#ffe060"; g.fillRect(x + 11, y + 11, 6, 6);
      g.fillStyle = "#3a1208"; g.fillRect(x + 2, y + 13, 24, 1); g.fillRect(x + 13, y + 2, 1, 24);
    }
  }

  // ---------- damage ----------
  function hurt(n, fromX) {
    if (hero.inv > 0 || mode !== "play") return;
    if (save.ward) n = Math.max(1, n - 1);
    hp -= n; hero.inv = 1.1; S.hurt(); parts.add(hero.x + hero.w / 2, hero.y + hero.h / 2, 8, "#ff5a5a", 70);
    if (fromX != null) { hero.vx = (hero.x + hero.w / 2 < fromX ? -1 : 1) * 140; hero.vy = -170; }
    if (hp <= 0) fall();
  }
  function popBack(why) { hurt(2); if (hp <= 0) return; hero.x = lastSafe.x; hero.y = lastSafe.y; hero.vx = 0; hero.vy = 0; hero.inv = 1.2; if (why) say(why, 1.2); }
  function fall() {
    mode = "down"; ui.stop(); A.stopSong();
    var lost = Math.floor(save.coins / 2); save.coins -= lost; ui.persist(); hud();
    ui.menu({ title: "Tamsin falls", body: "The shrine draws her back." + (lost ? " " + lost + " coins spilled on the way." : ""), buttons: [{ label: "Back to the shrine", act: respawn }, { label: "Menu", small: true, act: toTitle }] });
  }
  function respawn() { mode = "play"; hp = maxHp(); enterArea(save.spawn.area, save.spawn, true); ui.go(); playAreaSong(); }

  // ---------- update ----------
  function inBox(a, b) { return PF.aabb(a, b); }
  function update(dt) {
    t += dt; bannerT -= dt;
    var h = hero, F = FORMS[save.form];
    var dir = (ui.down("L") ? -1 : 0) + (ui.down("R") ? 1 : 0);
    var wet = PF.touching(L, { x: h.x + 1, y: h.y + 2, w: h.w - 2, h: h.h - 2 }, "water");
    var lava = PF.touching(L, { x: h.x + 1, y: h.y + 4, w: h.w - 2, h: h.h - 4 }, "lava");
    var speed = F.speed;
    if (save.form === "clay" && lava) speed *= 0.6;
    if (save.form === "eel" && wet) {
      h.vx += clamp(dir * 95 - h.vx, -500 * dt, 500 * dt);
      h.vy += clamp((ui.down("J") ? -95 : 45) - h.vy, -500 * dt, 500 * dt);
      if (dir) h.face = dir;
      if (ui.hit("J")) h.buffer = 0;
    } else {
      var acc = h.ground ? 900 : 650;
      if (dir) { h.vx += dir * acc * dt; h.vx = clamp(h.vx, -speed * (save.form === "crow" && !h.ground ? 1.3 : 1), speed * (save.form === "crow" && !h.ground ? 1.3 : 1)); h.face = dir; }
      else { var fr = (h.ground ? 1100 : 280) * dt; h.vx = Math.abs(h.vx) <= fr ? 0 : h.vx - Math.sign(h.vx) * fr; }
      if (ui.hit("J")) h.buffer = 0.12;
      h.buffer -= dt; h.coyote -= dt;
      if (h.buffer > 0 && h.coyote > 0) { h.vy = -F.jump; h.buffer = 0; h.coyote = 0; S.jump(); }
      else if (h.buffer > 0 && save.form === "crow" && !h.ground && h.flaps > 0) { h.vy = -220; h.flaps--; h.buffer = 0; S.flap(); parts.add(h.x + 5, h.y + 6, 3, "#4a4a6a", 30, 0.3, 50); }
      if (!ui.down("J") && h.vy < -120) h.vy = -120;
      h.vy = Math.min(420, h.vy + 900 * dt);
      if (save.form === "crow" && ui.down("J") && h.vy > 45) h.vy = 45;
    }
    var r = PF.move(L, h, dt);
    if (r.ground) { h.ground = true; h.coyote = 0.09; h.flaps = 2; } else h.ground = false;
    h.ph += Math.abs(h.vx) * dt * 0.14;
    if (h.inv > 0) h.inv -= dt;
    // safe spot: both feet on firm ground, no hazards (eels are safe in water)
    var feetY = Math.floor((h.y + h.h + 1) / TS);
    if ((h.ground && L.solid(Math.floor(h.x / TS), feetY) && L.solid(Math.floor((h.x + h.w - 0.01) / TS), feetY) && !wet && !lava) || (save.form === "eel" && wet && !PF.touching(L, { x: h.x - 8, y: h.y - 8, w: h.w + 16, h: h.h + 16 }, "solid") && h.inv <= 0)) lastSafe = { x: h.x, y: h.y };
    // hazards
    if (wet && save.form !== "eel") return popBack(save.form === "crow" ? "Crows can't swim" : "Too deep");
    if (lava && save.form !== "clay") return popBack("Only clay can wade lava");
    if (PF.touching(L, { x: h.x + 1, y: h.y + 4, w: h.w - 2, h: h.h - 4 }, "hurt")) hurt(1, h.x + h.w / 2 + h.face * 4);
    if (h.y > L.ph + 10) return popBack();
    // act: use a shrine / market, else attack
    prompt = null;
    items.forEach(function (it) { if ((it.k === "S" || it.k === "M") && inBox(h, it)) prompt = it; });
    h.atkCd -= dt; if (h.atk > 0) h.atk -= dt;
    if (ui.hit("A")) {
      if (prompt && h.ground) { if (prompt.k === "S") return shrineMenu(prompt); return marketMenu(); }
      if (h.atkCd <= 0) { h.atk = 0.16; h.atkCd = 0.3; swing = { hitBoss: false }; S.swing(); actTiles(); }
    }
    if (h.atk > 0 && swing) {
      var hb = attackBox();
      foes.forEach(function (f) { if (f.alive && inBox(hb, f)) killFoe(f); });
      if (boss && !swing.hitBoss && inBox(hb, boss)) { swing.hitBoss = true; hitBoss(boss, save.edge ? 2 : 1); }
    }
    // foes
    foes.forEach(function (f) {
      if (!f.alive || Math.abs(f.x - h.x) > W * 1.2) return;
      PF.Foes.step(f, L, dt, h);
      if (f.alive && inBox(h, f)) hurt(2, f.x + f.w / 2);
    });
    // boss + shots
    if (boss) stepBoss(boss, dt);
    shots.forEach(function (s) {
      s.vy += s.grav * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      if (L.solid(Math.floor((s.x + 3) / TS), Math.floor((s.y + 3) / TS)) || s.life <= 0) { s.dead = true; parts.add(s.x + 3, s.y + 3, 3, s.c, 40, 0.3); }
      else if (inBox(h, s)) { s.dead = true; hurt(1, s.x); }
    });
    shots = shots.filter(function (s) { return !s.dead; });
    // loose coins
    coinsLoose.forEach(function (c) {
      c.vy = Math.min(300, c.vy + 600 * dt); var rr = PF.move(L, c, dt); if (rr.ground) { c.vy = -c.vy * 0.3; c.vx *= 0.8; } c.life -= dt;
      if (inBox(h, c)) { c.got = 1; save.coins += c.v; S.coin(); hud(); }
    });
    coinsLoose = coinsLoose.filter(function (c) { return !c.got && c.life > 0; });
    // items
    items.forEach(function (it) {
      if (it.got || !inBox(h, it)) return;
      if (it.k === "$") { it.got = 1; save.coins += 5; S.coin(); hud(); }
      else if (it.k === "T") { it.got = 1; save.chests[it.key] = 1; save.coins += 40; S.item(); say("Chest: 40 coins"); ui.persist(); hud(); }
      else if (it.k === "Y") { it.got = 1; save.chests[it.key] = 1; save.maxH = Math.min(10, save.maxH + 1); hp = maxHp(); S.item(); say("Heart vessel! +1 heart", 2); ui.persist(); }
    });
    // doors
    var onDoor = null; doors.forEach(function (d) { if (inBox({ x: h.x + 2, y: h.y, w: h.w - 4, h: h.h }, { x: d.x + 3, y: d.y + 2, w: 10, h: 30 })) onDoor = d; });
    if (!onDoor) doorLock = false;
    else if (!doorLock && onDoor.link) {
      if (onDoor.link[2] && !save.boss[area]) { if (bannerT < 0) say("Sealed until the keeper falls", 1); }
      else { S.door(); enterArea(onDoor.link[0], onDoor.link[1]); return; }
    }
    parts.step(dt);
    PF.follow(cam, L, h, W, H, dt);
  }
  function attackBox() { var h = hero, rg = FORMS[save.form].range, hh = Math.max(12, h.h); return { x: h.face > 0 ? h.x + h.w - 2 : h.x - rg + 2, y: h.y + h.h - hh, w: rg, h: hh }; }
  function actTiles() {
    var h = hero, hb = attackBox(), done = false;
    if (save.form === "clay") PF.overlapTiles(L, hb, function (c, tx, ty) { if (c === "B") { L.set(tx, ty, " "); done = true; parts.add(tx * TS + 8, ty * TS + 8, 8, "#9a5a3a", 80); } });
    if (save.form === "badger") {
      PF.overlapTiles(L, { x: hb.x, y: h.y, w: hb.w, h: h.h }, function (c, tx, ty) { if (c === "d") { L.set(tx, ty, " "); done = true; parts.add(tx * TS + 8, ty * TS + 8, 8, "#7a5a3a", 70); } });
      if (!done) {
        var fy = Math.floor((h.y + h.h + 1) / TS), cx = Math.floor((h.x + h.w / 2) / TS);
        if (L.get(cx, fy) === "d") { L.set(cx, fy, " "); h.x = cx * TS + (TS - h.w) / 2; done = true; parts.add(cx * TS + 8, fy * TS + 4, 8, "#7a5a3a", 70); }
      }
    }
    if (done) { if (save.form === "clay") S.brick(); else S.dig(); }
  }
  function killFoe(f) {
    f.alive = false; S.pop(); parts.add(f.x + f.w / 2, f.y + f.h / 2, 10, "#fff0b0", 70);
    coinsLoose.push({ x: f.x + f.w / 2 - 3, y: f.y - 2, w: 6, h: 6, vx: (Math.random() - 0.5) * 60, vy: -160, v: Math.random() < 0.2 ? 10 : 5, life: 8 });
  }

  // ---------- shrine + market ----------
  function shrineMenu(it) {
    ui.stop(); S.shrine();
    hp = maxHp(); save.spawn = { area: area, x: it.tx, y: it.ty }; ui.persist();
    ui.menu({ kicker: AREAS[area].name + " shrine", title: "Change form", body: "Hearts restored. This shrine is your rest point.",
      html: '<table class="ff-table">' + FORM_ORDER.map(function (k) { var f = FORMS[k], has = save.forms.indexOf(k) >= 0; return "<tr><td>" + (has ? f.long : "???") + "</td><td>" + (has ? f.note : "Break a keeper to learn it") + "</td></tr>"; }).join("") + "</table>",
      row: FORM_ORDER.map(function (k) { return { label: FORMS[k].name + (save.form === k ? " ✓" : ""), disabled: save.forms.indexOf(k) < 0, act: function () { setForm(k); ui.go(); } }; }),
      buttons: [{ label: "Done", act: function () { ui.go(); } }] });
  }
  function setForm(k) {
    var h = hero, f = FORMS[k], bx = h.x + h.w / 2, by = h.y + h.h;
    save.form = k; h.w = f.w; h.h = f.h; h.x = bx - f.w / 2; h.y = by - f.h; ui.persist(); hud();
    parts.add(bx, by - 8, 16, "#ffd080", 80);
  }
  var WARES = [
    { id: "stone", name: "Hearthstone", note: "+1 heart (up to 3)", price: function () { return 120 + save.stones * 100; }, ok: function () { return save.stones < 3; }, buy: function () { save.stones++; save.maxH++; hp = maxHp(); } },
    { id: "ward", name: "Glaze ward", note: "Every knock costs half a heart less", price: function () { return 260; }, ok: function () { return !save.ward; }, buy: function () { save.ward = 1; } },
    { id: "edge", name: "Ember edge", note: "Double damage to keepers", price: function () { return 200; }, ok: function () { return !save.edge; }, buy: function () { save.edge = 1; } },
    { id: "tonic", name: "Nettle tonic", note: "Hearts back to full", price: function () { return 20; }, ok: function () { return hp < maxHp(); }, buy: function () { hp = maxHp(); } }
  ];
  function marketMenu(msg) {
    ui.stop();
    ui.menu({ kicker: "Ashcombe night market", title: "Old Moss's stall", body: msg || "Coins: " + FF.n(save.coins),
      html: '<table class="ff-table">' + WARES.map(function (w) { return "<tr><td>" + w.name + "</td><td>" + w.note + "</td><td>" + (w.ok() ? w.price() + "c" : "—") + "</td></tr>"; }).join("") + "</table>",
      row: WARES.map(function (w) { return { label: w.name.split(" ").pop(), disabled: !w.ok() || save.coins < w.price(), act: function () { save.coins -= w.price(); w.buy(); S.item(); ui.persist(); hud(); marketMenu("Bought " + w.name + ". Coins: " + FF.n(save.coins)); } }; }),
      buttons: [{ label: "Leave", act: function () { ui.go(); } }] });
  }

  // ---------- render ----------
  function render(c, tt) {
    if (!W) sizeLo();
    if (!L) enterArea("town", "1");
    var th = L.theme;
    PF.drawBack(g, th, cam, W, H, tt);
    if (th.backY != null) { var by = Math.round(th.backY * TS - cam.y); g.fillStyle = th.back; g.fillRect(0, Math.max(0, by), W, H); }
    if (area === "town") drawTown(tt);
    doors.forEach(function (d) { drawDoor(d, tt); });
    PF.drawTiles(g, L, th, cam, W, H, tt);
    var g0 = g; if (window.FXP) g = FXP.layer(W, H);
    items.forEach(function (it) { if (!it.got) drawItem(it, tt); });
    coinsLoose.forEach(function (cn) { if (cn.life > 2 || Math.floor(tt * 10) % 2) g.drawImage(COIN, Math.round(cn.x - cam.x), Math.round(cn.y - cam.y)); });
    foes.forEach(function (f) {
      if (!f.alive || Math.abs(f.x - cam.x - W / 2) > W) return;
      if (f.kind === "p" && !f.jump) { g.drawImage(PF.Foes.ART.p[Math.floor(tt * 4) % 2 + (f.dir > 0 ? 2 : 0)], Math.round(f.x - cam.x), Math.round(f.y - cam.y)); return; }
      PF.Foes.draw(g, f, cam, tt);
    });
    if (boss) drawBoss(boss, tt);
    shots.forEach(function (s) { g.fillStyle = s.c; g.fillRect(Math.round(s.x - cam.x), Math.round(s.y - cam.y), 6, 6); g.fillStyle = "#fff"; g.fillRect(Math.round(s.x - cam.x) + 2, Math.round(s.y - cam.y) + 2, 2, 2); });
    if (hero && mode !== "title" && (hero.inv <= 0 || Math.floor(tt * 14) % 2)) drawHero(tt);
    if (window.FXP) { g = g0; FXP.flush(g, "#140c28"); }
    parts.draw(g, cam);
    if (window.FFGfx) FFGfx.motes(g, cam, W, H, tt, area === "kiln" || area === "heart" ? "rgba(255,160,60,0.65)" : "rgba(180,160,255,0.55)", 14);
    if (mode !== "title" && hero) drawHud(tt);
    if (window.FFGfx) FFGfx.vignette(g, W, H, 0.4);
    c.imageSmoothingEnabled = Q > 1; c.drawImage(lo, 0, 0, W * PX, H * PX); c.imageSmoothingEnabled = false;
    if (mode === "play" && !ui.menuOpen) {
      if (bannerT > 0) ui.text(banner, ui.VW / 2, ui.VH * 0.22, 20, "#ffe3a0", "center", "#ff9a2a");
      else if (prompt) ui.text(prompt.k === "S" ? "Act: shrine" : "Act: night market", ui.VW / 2, ui.VH * 0.22, 16, "#ffe3a0", "center", "#ff9a2a");
    }
  }
  function drawTown(tt) {
    for (var i = 0; i < 9; i++) {
      var x = Math.round(i * 96 + 30 - cam.x * 0.85), y = Math.round(14 * TS - cam.y * 0.85 - cam.y * 0.15);
      if (x < -70 || x > W + 16) continue;
      g.fillStyle = "rgba(0,0,0,0.28)"; g.fillRect(x + 4, y - 6, 40, 6);
      g.fillStyle = i % 2 ? "#241828" : "#2a1e2a"; g.fillRect(x, y - 44, 44, 44);
      g.fillStyle = "#4a2a48"; g.beginPath(); g.moveTo(x - 5, y - 44); g.lineTo(x + 22, y - 64); g.lineTo(x + 49, y - 44); g.fill();
      g.fillStyle = "#2a1430"; g.beginPath(); g.moveTo(x - 2, y - 44); g.lineTo(x + 22, y - 60); g.lineTo(x + 46, y - 44); g.fill();
      var glow = 0.55 + 0.45 * Math.abs(Math.sin(tt * 2 + i));
      g.fillStyle = "rgba(255,192,96," + (0.15 * glow) + ")"; g.fillRect(x + 5, y - 36, 13, 12); g.fillRect(x + 25, y - 36, 13, 12);
      g.fillStyle = (i * 7 + Math.floor(tt)) % 5 ? "#ffc060" : "#e89a40"; g.fillRect(x + 8, y - 34, 7, 8); g.fillRect(x + 28, y - 34, 7, 8);
      g.fillStyle = "rgba(255,255,200,0.35)"; g.fillRect(x + 9, y - 33, 3, 2);
      // awning / stall in front of some houses
      if (i % 2 === 0) {
        g.fillStyle = i % 4 ? "#7a2a3a" : "#2a6a7a"; g.fillRect(x + 4, y - 18, 36, 5);
        for (var st = 0; st < 5; st++) { g.fillStyle = st % 2 ? "#e8d8a0" : "#c83a3a"; g.fillRect(x + 4 + st * 7, y - 18, 7, 5); }
        g.fillStyle = "#3a2a1a"; g.fillRect(x + 6, y - 13, 2, 13); g.fillRect(x + 36, y - 13, 2, 13);
      }
      // chimney smoke
      g.fillStyle = "#3a2a38"; g.fillRect(x + 34, y - 70, 4, 8);
      g.globalAlpha = 0.25; g.fillStyle = "#c8c0d8"; g.beginPath(); g.arc(x + 36 + Math.sin(tt + i) * 2, y - 76 - (tt * 8 + i * 5) % 10, 3, 0, 7); g.fill(); g.globalAlpha = 1;
    }
  }
  function drawDoor(d, tt) {
    if (!d.link) return;
    var x = Math.round(d.x - cam.x), y = Math.round(d.y - cam.y);
    if (L.get(d.tx, d.ty) === "w" || area === "mere") { g.fillStyle = "#0a1418"; g.fillRect(x + 1, y + 18, 14, 14); g.fillStyle = "#4a6a6a"; for (var k = 0; k < 4; k++) g.fillRect(x + 2 + k * 4, y + 18, 1, 14); return; }
    g.fillStyle = "#4a3a2a"; g.fillRect(x, y + 4, 16, 28); g.fillStyle = "#0e0806"; g.fillRect(x + 3, y + 8, 10, 24); g.fillRect(x + 5, y + 6, 6, 2);
    if (d.link[2] && !save.boss[area]) { g.fillStyle = "#8a8a90"; g.fillRect(x + 3, y + 14, 10, 2); g.fillRect(x + 3, y + 22, 10, 2); g.fillStyle = "#ffd040"; g.fillRect(x + 7, y + 17, 3, 4); }
    else { g.fillStyle = "rgba(255,200,120," + (0.15 + 0.1 * Math.sin(tt * 3)) + ")"; g.fillRect(x + 3, y + 8, 10, 24); }
  }
  function drawItem(it, tt) {
    var x = Math.round(it.x - cam.x), y = Math.round(it.y - cam.y);
    if (it.k === "$") g.drawImage(COIN, x + 3, y + 3 + Math.round(Math.sin(tt * 4 + it.x) * 1.5));
    else if (it.k === "T") g.drawImage(CHEST, x, y + 4);
    else if (it.k === "Y") g.drawImage(CHEST_Y, x, y + 4);
    else if (it.k === "l") { g.fillStyle = "#3a2a1a"; g.fillRect(x + 4, y - 2, 1, 22); g.fillStyle = "rgba(255,180,60," + (0.25 + 0.1 * Math.sin(tt * 5 + it.x)) + ")"; g.fillRect(x - 2, y - 6, 13, 13); g.fillStyle = "#ffcf60"; g.fillRect(x + 2, y - 2, 5, 5); }
    else if (it.k === "S") {
      var sx = x + 8, sy = y + 24;
      g.fillStyle = "#6a5a6a"; g.fillRect(sx - 2, sy - 20, 16, 20); g.fillStyle = "#8a7a8a"; g.fillRect(sx - 4, sy - 22, 20, 3); g.fillRect(sx - 4, sy - 2, 20, 2);
      g.fillStyle = "rgba(140,220,255," + (0.5 + 0.3 * Math.sin(tt * 3)) + ")"; g.fillRect(sx + 3, sy - 16, 6, 8); g.fillRect(sx + 5, sy - 18, 2, 12);
    } else if (it.k === "M") {
      var mx = x - 6, my = y + 24;
      g.fillStyle = "#5a3a1a"; g.fillRect(mx, my - 26, 2, 26); g.fillRect(mx + 38, my - 26, 2, 26); g.fillStyle = "#6a4a2a"; g.fillRect(mx, my - 10, 40, 10);
      for (var s = 0; s < 5; s++) { g.fillStyle = s % 2 ? "#e8d8a0" : "#c83a3a"; g.fillRect(mx - 2 + s * 9, my - 30, 9, 6); }
      g.fillStyle = "#ffcf60"; g.fillRect(mx + 6, my - 14, 4, 4); g.fillStyle = "#e83a3a"; g.fillRect(mx + 16, my - 14, 4, 4); g.fillStyle = "#7ad04a"; g.fillRect(mx + 26, my - 14, 4, 4);
      g.fillStyle = "#c8a080"; g.fillRect(mx + 18, my - 22, 5, 5); g.fillStyle = "#4a6a3a"; g.fillRect(mx + 16, my - 17, 9, 6);
    }
  }
  function drawHero(tt) {
    var h = hero, fl = h.face < 0, x = Math.round(h.x - cam.x), y = Math.round(h.y - cam.y);
    if (save.form === "clay") {
      var pose = !h.ground ? (h.vy < 0 ? PF.POSE.jump : PF.POSE.fall) : Math.abs(h.vx) > 8 ? PF.runPose(h.ph, Math.abs(h.vx) / 85) : PF.POSE.stand;
      if (h.atk > 0) pose = PF.POSE.throw;
      var fig = PF.figure(g, Math.round(h.x + h.w / 2 - cam.x), Math.round(h.y + h.h - 9 - cam.y), pose, CLAY, fl);
      if (h.atk > 0) { g.fillStyle = "#ffcf7a"; g.fillRect(Math.round(fig.hand[0]) - 2, Math.round(fig.hand[1]) - 2, 4, 4); }
    } else if (save.form === "crow") {
      var frame = h.ground ? (Math.abs(h.vx) > 8 ? Math.floor(h.ph) % 2 : 0) : (ui.down("J") && h.vy > 0 ? 0 : Math.floor(tt * 10) % 2);
      g.drawImage(CROW[frame][fl ? 1 : 0], x - 1, y + 3);
      if (h.atk > 0) { g.fillStyle = "#e0a030"; g.fillRect(fl ? x - 4 : x + 12, y + 6, 4, 2); }
    } else if (save.form === "eel") {
      for (var i = 9; i >= 0; i--) { var ex = h.x + h.w / 2 + (fl ? 1 : -1) * (i * 1.8 - 7), ey = h.y + 4 + Math.sin(tt * 8 - i * 0.7) * (i * 0.25); g.fillStyle = i % 3 ? "#3a6a5a" : "#5a8a6a"; g.fillRect(Math.round(ex - cam.x) - 1, Math.round(ey - cam.y) - 1, 3, i === 0 ? 4 : 3); }
      var hx = Math.round(h.x + h.w / 2 + (fl ? -8 : 8) - cam.x), hy = Math.round(h.y + 3 - cam.y);
      g.fillStyle = "#4a7a6a"; g.fillRect(hx - 2, hy - 1, 5, 4); g.fillStyle = "#ffe060"; g.fillRect(fl ? hx - 1 : hx + 1, hy, 1, 1);
      if (h.atk > 0) { g.fillStyle = "#fff"; g.fillRect(fl ? hx - 4 : hx + 3, hy + 1, 2, 2); }
    } else {
      var leg = h.ground && Math.abs(h.vx) > 8 ? Math.floor(h.ph * 1.5) % 2 : 0;
      g.fillStyle = "#3a3a3e"; g.fillRect(x, y + 3, 12, 5); g.fillStyle = "#5a5a60"; g.fillRect(x + 1, y + 2, 10, 2);
      g.fillStyle = "#1e1e20"; g.fillRect(x + 1 + leg, y + 8, 2, 2); g.fillRect(x + 8 - leg, y + 8, 2, 2);
      var hdx = fl ? x - 3 : x + 10; g.fillStyle = "#f0f0f0"; g.fillRect(hdx, y + 2, 7, 5); g.fillStyle = "#1e1e20"; g.fillRect(hdx + (fl ? 0 : 1), y + 4, 6, 1); g.fillRect(fl ? hdx : hdx + 6, y + 5, 1, 1);
      if (h.atk > 0) { g.fillStyle = "#e8d8b0"; for (var cl = 0; cl < 3; cl++) g.fillRect(fl ? x - 6 : x + 17, y + 2 + cl * 2, 3, 1); }
    }
  }
  function drawHud(tt) {
    var n = save.maxH;
    g.fillStyle = "rgba(5,5,5,0.62)"; g.fillRect(2, 2, n * 7 + 6, 11); g.strokeStyle = "rgba(200,160,255,0.35)"; g.strokeRect(2, 2, n * 7 + 6, 11);
    for (var i = 0; i < n; i++) { var v = hp - i * 2; g.drawImage(HEART_E, 5 + i * 7, 5); if (v >= 2) g.drawImage(HEART, 5 + i * 7, 5); else if (v === 1) g.drawImage(HEART_H, 5 + i * 7, 5); }
    if (boss && boss.active) {
      var bw = Math.min(160, W - 40), bx = Math.round((W - bw) / 2);
      g.fillStyle = "rgba(5,5,5,0.6)"; g.fillRect(bx - 2, H - 12, bw + 4, 8); g.fillStyle = "#4a1a10"; g.fillRect(bx, H - 10, bw, 4);
      g.fillStyle = "#ff8a20"; g.fillRect(bx, H - 10, Math.round(bw * boss.hp / boss.max), 4);
    }
  }

  // ---------- flow ----------
  function play() { mode = "play"; save.started = 1; hp = maxHp(); ui.persist(); enterArea(save.spawn.area, save.spawn, true); ui.go(); playAreaSong(); }
  function newGame() {
    freshSave(); ui.persist(); ui.stop(); A.stopSong();
    ui.menu({ kicker: "The night of the firing", title: "Kilnbound", body: "Tamsin Vey went down to the old kiln after dark and woke the Kiln Heart. By morning she was walking clay. Break the keepers of Ashcombe, learn their shapes, and put the Heart out.",
      buttons: [{ label: "Begin", act: play }] });
  }
  function ending() {
    mode = "end"; ui.stop(); A.stopSong(); S.win(); ui.runEnded();
    ui.menu({ kicker: "The Kiln Heart is cold", title: "Tamsin walks home", body: "The clay cracks away at sunrise. Ashcombe's night market packs up for the morning, and Old Moss saves her a melon.",
      stats: "<span>FORMS " + save.forms.length + "/4</span><span>HEARTS " + save.maxH + "</span><span>COINS " + FF.n(save.coins) + "</span>",
      buttons: [{ label: "Keep exploring", act: function () { mode = "play"; respawn(); } }, { label: "Menu", small: true, act: toTitle }] });
  }
  function toTitle() {
    ui.stop(); mode = "title"; enterArea("town", "1"); A.playSong(SONGS.town); ui.setCourse("Ashcombe");
    var btns = save.started ? [{ label: "Continue", act: play }, { label: "New game", small: true, act: function () { ui.menu({ title: "Start again?", body: "This wipes forms, coins and upgrades.", buttons: [{ label: "Yes, start again", act: newGame }, { label: "Back", small: true, act: toTitle }] }); } }] : [{ label: "Play", act: newGame }];
    ui.menu({ title: "KILNBOUND", body: "A cursed clay walker, four shapes, one burning heart.",
      stats: "<span>FORMS " + save.forms.length + "/4</span><span>KEEPERS " + Object.keys(save.boss).length + "/4</span>" + (save.cleared ? "<span>CLEARED</span>" : ""),
      buttons: btns, app: true,
      help: ["◀ ▶ move, Jump (hold for higher), Act attacks, digs, or uses shrines and the market.", "Clay wades lava and breaks brick. Crow flaps twice and glides while you hold Jump. Eel swims. Badger digs soft earth.", "Change form and rest at shrines. Spend coins at the night market in Ashcombe."],
      fine: "A Forest Forge game", solid: false });
  }
  var game = {
    toTitle: toTitle, onResize: sizeLo, update: function (dt) { if (mode === "play") update(dt); }, render: render,
    idle: function (dt) { if (mode === "title" && L) { cam.x += dt * 25; if (cam.x > L.pw - W) cam.x = 0; } },
    onBack: function () { if (mode === "title") return "exit"; toTitle(); return "menu"; }
  };
  ui.onAdsRemoved = function () { if (mode === "title") toTitle(); };
  game.qa = {
    state: function () { return { mode: mode, area: area, x: hero && hero.x, y: hero && hero.y, tx: hero && Math.floor((hero.x + hero.w / 2) / TS), ty: hero && Math.floor((hero.y + hero.h - 1) / TS), ground: hero && hero.ground, hp: hp, form: save.form, forms: save.forms.slice(), coins: save.coins, boss: boss && { kind: boss.kind, hp: boss.hp, x: boss.x, y: boss.y, active: boss.active }, beaten: Object.keys(save.boss) }; },
    newGame: function () { freshSave(); play(); }, go: function (a, d) { enterArea(a, d); }, form: function (k) { if (save.forms.indexOf(k) < 0) save.forms.push(k); setForm(k); },
    at: function (tx, ty) { hero.x = tx * TS + (TS - hero.w) / 2; hero.y = (ty + 1) * TS - hero.h; hero.vx = 0; hero.vy = 0; }, hp: function (n) { hp = n; }, inv: function () { hero.inv = 1e9; }, level: function () { return L; }, coins: function (n) { save.coins = n; hud(); }, items: function () { return items; }, foes: function () { return foes; }, boss: function () { return boss; }, close: function () { ui.go(); }
  };
  ui.start(game);
})();
