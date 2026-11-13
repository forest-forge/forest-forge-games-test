/* Chartwick (Forest Forge). Nedda Cray, a harbour chart-maker, works through
 * a set of original riddles and desk puzzles to find the village gong. No
 * professor, no top hat, no catchphrases, no painted-adventure trade dress. */
(function () {
  "use strict";
  (function applyChrome(css) {
    var s = document.createElement("style"); s.id = "ff-palette"; s.textContent = css;
    document.head.appendChild(s);
    var m = document.querySelector('meta[name="theme-color"]');
    var bg = /--bg:([^;}]+)/.exec(css); if (m && bg) m.setAttribute("content", bg[1].trim());
  })(`:root{--bg:#0a8ab0;--sky1:#7ae8ff;--sky2:#ffc87a;--water:#0a6a90;--amber:#ffffff;--amber-hi:#fff0a0;--amber-soft:#ffffff;--amber-line:#ff6a5a;--ember:#08507a;--btn:#0a7aa0;--lamp:#fff6d8;--pop1:#ff7a6a;--pop2:#ffe14a;--pop3:#ffffff;--glow-line:rgba(255,255,255,.55);--glow-fill:rgba(255,255,255,.14)}`);

  var ui = FF.create({
    deco: ["star", "spark", "circle"], 
    id: "chartwick", title: "Chartwick", course: "The harbour", view: { w: 390, h: 720, flex: true },
    stats: [{ id: "ch", label: "Chapter", value: "1/12" }, { id: "solved", label: "Solved", value: "0" }]
  });
  var A = ui.audio, save = ui.save; save.open = save.open || 1; save.solved = save.solved || 0;
  var S = {
    ok: function () { [523, 659, 784, 988].forEach(function (f, i) { A.tone({ f: f, dur: 0.09, type: "triangle", gain: 0.07, delay: i * 0.08 }); }); },
    bad: function () { A.tone({ f: 220, f2: 150, dur: 0.14, type: "sine", gain: 0.06 }); },
    click: function () { A.tone({ f: 600, dur: 0.03, type: "square", gain: 0.04 }); },
    done: function () { [392, 523, 659, 784, 1047, 1319].forEach(function (f, i) { A.tone({ f: f, dur: 0.1, type: "triangle", gain: 0.08, delay: i * 0.09 }); }); }
  };
  var SONG = { bpm: 86, order: [0, 0, 1], parts: [[
    { wave: "sine", gain: 0.04, pat: "D4 . F4 . A4 . D5 . C5 . A4 . F4 . D4 . G3 . B3 . D4 . G4 . F4 . A4 ." },
    { wave: "triangle", gain: 0.025, pat: "D3 . . . A2 . . . C3 . . . G2 . . . D3 . . . A2 . . . G2 . . . D3 ." }
  ], [
    { wave: "sine", gain: 0.04, pat: "F4 . A4 . C5 . F5 . E5 . C5 . A4 . F4 . Bb3 . D4 . F4 . Bb4 . A4 . C5 ." },
    { wave: "triangle", gain: 0.025, pat: "F2 . . . C3 . . . Eb2 . . . Bb2 . . . F2 . . . C3 . . . F2 . . . C3 ." }
  ]] };

  var CH = [
    { title: "The empty hook", story: "Nedda Cray keeps the harbour chart in a loft above Chartwick quay. This morning the harbour gong is gone from its hook, and Harbour-master Bryn wants it found before the evening tide." },
    { title: "Three boxes", story: "On the quay sit three fish boxes. One is lighter than the others, packed with cork floats by mistake. A simple beam-scale is to hand. Find the light box." },
    { title: "Driftwood", story: "A child has laid six sticks of driftwood into four triangles, then knocked two loose. Put two sticks back so there are four triangles again." },
    { title: "Three boats", story: "Three boats are tied on the inner wall: the Red, the Grey and the Green. Nia, Owen and Pat skippered them, carrying nets, coal and tiles — one cargo each. The clues are on the board." },
    { title: "The gong crate", story: "A crate marked with a gong has been left in the sail loft, boxed in by other chests. Slide it to the door." },
    { title: "Lamp walk", story: "Five harbour lamps must be lit in an order so that each newly lit lamp can see the last one along a clear line of the quay." },
    { title: "The punt", story: "Nedda has a small punt, room for herself and one bundle. She must get a loaf, a basket of eels and a lively quay dog to the far slip. The dog will eat the loaf if left alone with it; the eels will be nosed overboard if left alone with the dog. The loaf and the eels keep." },
    { title: "The loft number", story: "Bryn's last note is a short cipher. The gong, she writes, hangs behind the door whose number is the answer.", kind: "cipher" },
    { title: "Quay lanterns", story: "A second row of lanterns hangs by the sail loft. One was left unlit after the night watch. Which wick is dark?", kind: "lanterns" },
    { title: "The flour sacks", story: "Three flour sacks sit on the weigh-board. One is light, packed short by a sleepy miller. The beam-scale is still to hand.", kind: "weigh" },
    { title: "The chart chest", story: "Nedda's own chart-chest has been boxed in among the sail bags. Slide it to the loft door.", kind: "slide2" },
    { title: "The hook again", story: "A last scrap of paper is pinned to the hook. The gong, it says, was moved once more — behind a different door.", kind: "cipher2" }
  ];

  var mode = "title", ci = 0, phase = "story", st, hits, msg, busy;

  function hud() { ui.setStat("ch", (ci + 1) + "/" + CH.length); ui.setStat("solved", String(save.solved || 0)); }
  function startChapter(i) {
    ci = i; phase = "story"; st = null; msg = ""; busy = false;
    ui.setCourse((i + 1) + ". " + CH[i].title); hud();
    mode = "play"; A.playSong(SONG); ui.go(); ui.showPads(false);
  }
  function beginPuzzle() {
    phase = "puzzle"; msg = "";
    var k = (CH[ci] && CH[ci].kind) || ["lanterns","weigh","sticks","logic","slide","lamps","punt","cipher"][ci];
    if (k === "lanterns") st = makeLanterns();
    if (k === "weigh") st = makeWeigh();
    if (k === "sticks") st = makeSticks();
    if (k === "logic") st = makeLogic();
    if (k === "slide") st = makeSlide();
    if (k === "slide2") st = makeSlide2();
    if (k === "lamps") st = makeLamps();
    if (k === "punt") st = makePunt();
    if (k === "cipher") st = makeCipher();
    if (k === "cipher2") st = makeCipher2();
  }
  function solved() {
    S.ok(); phase = "done";
    if (ci + 2 > save.open) save.open = Math.min(CH.length, ci + 2);
    save.solved = Math.max(save.solved || 0, ci + 1); ui.persist(); hud();
    if (ci === CH.length - 1) {
      ui.stop(); S.done(); ui.runEnded();
      ui.menu({
        title: "The gong is home",
        body: "Nedda hangs the harbour gong back on its hook. Chartwick will sound the evening tide after all.",
        buttons: [{ label: "Menu", act: toTitle }]
      });
    }
  }
  function wrong() { S.bad(); msg = "Not that."; }

  function makeLanterns() {
    return { kind: "lanterns", dark: Math.floor(Math.random() * 3), labels: ["Left", "Middle", "Right"] };
  }
  function makeWeigh() {
    // light box is 0,1,or 2. First weighing is 0 vs 1.
    return { kind: "weigh", light: Math.floor(Math.random() * 3), step: 0, last: null };
  }
  function makeSticks() {
    // 6 sticks, 4 should form a large triangle divided into 4 small ones (midpoints connected).
    // Start with the outer triangle only (3 sticks) plus one loose — player places 3 internal? 
    // Simpler: a figure of 5 sticks (two triangles sharing a side + one stray). Player must place 2 stored sticks onto the midlines to make 4 triangles.
    // Interactive: a triangular board with 6 possible edges of a big triangle with midpoints (that's 9 segments actually).
    // Even simpler: 6 slots in a classic "star / 4 triangles" — show 4 placed, 2 in the tray, tap empty slots to place, tap placed (if from tray) to pick up.
    // Geometry: big triangle with all midpoints joined. Edges: 3 outer (each 2 half-edges) + 3 inner = 9 half-edges. Too many.
    // Classic: 6 matches already as a row of 2 triangles (4 matches form 2 triangles + wait).
    // 4 triangles with 6 sticks: a large triangle, midpoints connected (that's 6 sticks exactly!).
    // Start state: the 3 outer sticks plus nothing inside, 3 in tray? That's 3 to place. Brief said move 2...
    // "Put two sticks back so there are four triangles again." So 4 sticks are already placed (the outer triangle + 1 median?), 2 to place (the other 2 medians). 3 medians + 3 sides = 6 sticks, 4 small triangles.
    // If 1 median is already there: 4 sticks down, 2 to place. Yes.
    return { kind: "sticks", placed: { 0: 1, 1: 1, 2: 1, 3: 1, 4: 0, 5: 0 }, held: 2 };
  }
  function makeLogic() {
    // answer: Nia-Red-tiles, Owen-Grey-nets, Pat-Green-coal
    return { kind: "logic", pick: { Nia: [null, null], Owen: [null, null], Pat: [null, null] },
      boats: ["Red", "Grey", "Green"], cargos: ["nets", "coal", "tiles"],
      clues: [
        "Owen does not skipper the Green.",
        "The tiles went in the Red.",
        "Pat did not carry the nets.",
        "Nia skippered the Red.",
        "The coal was not in the Grey."
      ] };
  }
  function makeSlide() {
    // 4x4, G is gong, # wall, . empty, b box
    var rows = [
      "Gbb.",
      "b.#b",
      ".b..",
      "..#D"
    ];
    return { kind: "slide", g: rows.map(function (r) { return r.split(""); }), sel: null };
  }
  function makeLamps() {
    // 5 lamps at positions, visibility graph, Hamiltonian path starting at 0
    var nodes = [[40, 80], [220, 60], [320, 160], [80, 200], [200, 260]];
    // vis: 0-1, 0-3, 1-2, 1-4, 2-4, 3-4, 3-2 (not 0-2, not 0-4, not 1-3)
    var vis = { "0,1": 1, "1,0": 1, "0,3": 1, "3,0": 1, "1,2": 1, "2,1": 1, "1,4": 1, "4,1": 1, "2,4": 1, "4,2": 1, "3,4": 1, "4,3": 1, "2,3": 1, "3,2": 1 };
    return { kind: "lamps", nodes: nodes, vis: vis, lit: [] };
  }
  function makePunt() {
    // bank 0 start, 1 far. Items: loaf, eels, dog. Nedda with boat.
    return { kind: "punt", bank: { loaf: 0, eels: 0, dog: 0, nedda: 0 }, boat: 0, hold: null, steps: 0 };
  }
  function makeCipher() {
    // "THE GONG HANGS BEHIND DOOR NINE" with a +1 shift on vowels only or a simple number: door 9
    // Use: each word's letter count: THE(3) GONG(4) IS(2) IN(2) THE(3) LOFT(4) marked... 
    // Simpler: a short sum on the quay: doors numbered 4, 7, 9, 12. Clue: "the even doors are stores; the gong is one more than the years since the pier was mended, and the pier was mended eight years ago."
    return { kind: "cipher", doors: [4, 7, 9, 12], answer: 9, clue: "The even-numbered doors are only stores. The gong is behind a door one more than the years since the pier was mended. The pier was mended eight years ago." };
  }
  function makeSlide2() {
    var rows = [
      "bbG.",
      ".#b.",
      "b..b",
      ".#D."
    ];
    return { kind: "slide", g: rows.map(function (r) { return r.split(""); }), sel: null };
  }
  function makeCipher2() {
    return { kind: "cipher", doors: [5, 8, 11, 14], answer: 11, clue: "Store-rooms use even numbers. The gong is behind the door three more than the years the quay lamp has stood, and the lamp was put up eight years ago." };
  }

  function legalPunt(bank) {
    function side(s) {
      var dog = bank.dog === s, loaf = bank.loaf === s, eels = bank.eels === s, ned = bank.nedda === s;
      if (!ned && dog && loaf) return false;
      if (!ned && dog && eels) return false;
      return true;
    }
    return side(0) && side(1);
  }

  function toTitle() {
    ui.stop(); mode = "title"; A.playSong(SONG); ui.showPads(false); ui.setCourse("The harbour");
    var open = save.open || 1;
    ui.menu({
      title: "CHARTWICK",
      body: "Nedda Cray, who draws the harbour charts, is asked to find Chartwick's missing gong. Twelve short riddles and desk puzzles, told on the quay.",
      stats: "<span>CHAPTERS " + open + "/" + CH.length + "</span>",
      buttons: [{ label: "Begin at " + CH[Math.min(open, CH.length) - 1].title, act: function () { startChapter(Math.min(open, CH.length) - 1); } }],
      row: CH.map(function (ch, i) { return { label: String(i + 1), act: function () { startChapter(i); }, disabled: i >= open }; }),
      help: ["Read the short note, then work the puzzle on the page.", "Tap to choose, drag where the puzzle needs it."],
      fine: "Forest Forge · original work. A harbour-riddle mood only.",
      app: true
    });
  }

  var idleT = 0;
  function update(dt) { idleT += dt || 0.016; if (window.FFX) FFX.step(dt || 0.016); }
  var drag = null;
  function onPointer(type, x, y) {
    if (mode !== "play") return;
    if (phase === "story" && type === "pointerdown") { beginPuzzle(); return; }
    if (phase === "done" && type === "pointerdown") {
      if (ci < CH.length - 1) startChapter(ci + 1);
      return;
    }
    if (phase !== "puzzle" || !st) return;
    if (st.kind === "lanterns" && type === "pointerdown") {
      for (var i = 0; i < hits.length; i++) if (inside(x, y, hits[i])) {
        if (hits[i].v === st.dark) solved(); else wrong();
      }
    }
    if (st.kind === "weigh" && type === "pointerdown") {
      for (var i = 0; i < hits.length; i++) if (inside(x, y, hits[i])) {
        S.click();
        if (hits[i].act === "weigh") {
          if (st.step === 0) {
            st.last = st.light === 0 ? "left" : st.light === 1 ? "right" : "level";
            st.step = 1;
          }
        } else if (hits[i].act === "pick") {
          if (hits[i].v === st.light) solved(); else wrong();
        }
      }
    }
    if (st.kind === "sticks" && type === "pointerdown") {
      for (var i = 0; i < hits.length; i++) if (inside(x, y, hits[i])) {
        var k = hits[i].v;
        if (st.placed[k]) { if (k >= 3) { st.placed[k] = 0; st.held++; S.click(); } }
        else if (st.held > 0) { st.placed[k] = 1; st.held--; S.click(); }
        if (st.placed[3] && st.placed[4] && st.placed[5] && st.held === 0) solved();
      }
    }
    if (st.kind === "logic" && type === "pointerdown") {
      for (var i = 0; i < hits.length; i++) if (inside(x, y, hits[i])) {
        var h = hits[i]; st.pick[h.who][h.slot] = h.v; S.click();
        var p = st.pick;
        if (p.Nia[0] === "Red" && p.Nia[1] === "tiles" && p.Owen[0] === "Grey" && p.Owen[1] === "nets" && p.Pat[0] === "Green" && p.Pat[1] === "coal") solved();
      }
    }
    if (st.kind === "slide") {
      if (type === "pointerdown") {
        var L = slideLayout(), c = Math.floor((x - L.ox) / L.s), r = Math.floor((y - L.oy) / L.s);
        if (c >= 0 && r >= 0 && c < 4 && r < 4) st.sel = [c, r];
      }
      if (type === "pointerup" && st.sel) {
        var L = slideLayout(), c = Math.floor((x - L.ox) / L.s), r = Math.floor((y - L.oy) / L.s);
        slideTry(st.sel[0], st.sel[1], c, r); st.sel = null;
      }
    }
    if (st.kind === "lamps" && type === "pointerdown") {
      for (var i = 0; i < hits.length; i++) if (inside(x, y, hits[i])) {
        var n = hits[i].v;
        if (st.lit.indexOf(n) >= 0) continue;
        if (st.lit.length && !st.vis[st.lit[st.lit.length - 1] + "," + n]) { wrong(); return; }
        st.lit.push(n); S.click();
        if (st.lit.length === 5) solved();
      }
    }
    if (st.kind === "punt" && type === "pointerdown") {
      for (var i = 0; i < hits.length; i++) if (inside(x, y, hits[i])) {
        var act = hits[i].act; S.click();
        if (act === "take") {
          var it = hits[i].v;
          if (st.bank[it] !== st.boat || st.hold) return;
          st.hold = it; st.bank[it] = -1;
        } else if (act === "cross") {
          var next = { loaf: st.bank.loaf, eels: st.bank.eels, dog: st.bank.dog, nedda: 1 - st.boat };
          if (st.hold) next[st.hold] = -1;
          // temporary: items still on old banks stay; nedda moves. Check old bank without nedda and hold.
          var test = { loaf: st.bank.loaf, eels: st.bank.eels, dog: st.bank.dog, nedda: 1 - st.boat };
          // items in hold travel with her, not left on a bank
          if (!legalPunt(test)) { wrong(); return; }
          st.boat = 1 - st.boat; st.bank.nedda = st.boat; st.steps++;
        } else if (act === "drop") {
          if (!st.hold) return;
          st.bank[st.hold] = st.boat; st.hold = null;
          if (st.bank.loaf === 1 && st.bank.eels === 1 && st.bank.dog === 1 && st.boat === 1) solved();
        }
      }
    }
    if (st.kind === "cipher" && type === "pointerdown") {
      for (var i = 0; i < hits.length; i++) if (inside(x, y, hits[i])) {
        if (hits[i].v === st.answer) solved(); else wrong();
      }
    }
  }
  function inside(x, y, b) { return x >= b.x && y >= b.y && x <= b.x + b.w && y <= b.y + b.h; }
  function slideTry(c0, r0, c1, r1) {
    if (c1 < 0 || r1 < 0 || c1 >= 4 || r1 >= 4) return;
    var g = st.g, ch = g[r0][c0];
    if (ch !== "G" && ch !== "b") return;
    if (c0 !== c1 && r0 !== r1) return;
    var dc = Math.sign(c1 - c0), dr = Math.sign(r1 - r0);
    var c = c0, r = r0, lastC = c0, lastR = r0;
    while (c !== c1 || r !== r1) {
      c += dc; r += dr;
      if (g[r][c] !== ".") return;
      lastC = c; lastR = r;
    }
    g[r0][c0] = "."; g[lastR][lastC] = ch;
    S.click();
    // gong next to door D
    for (var r = 0; r < 4; r++) for (var c = 0; c < 4; c++) if (g[r][c] === "G") {
      if ((g[r][c + 1] === "D") || (g[r][c - 1] === "D") || (g[r + 1] && g[r + 1][c] === "D") || (g[r - 1] && g[r - 1][c] === "D")) solved();
    }
  }
  function slideLayout() { var s = Math.min(70, (ui.VW - 40) / 4); return { s: s, ox: (ui.VW - s * 4) / 2, oy: 200 }; }

  function render(c) {
    var W = ui.VW, H = ui.VH;
    var sh = window.FFX ? FFX.offset() : { x: 0, y: 0 };
    c.save(); c.translate(sh.x, sh.y);
    if (window.FFX) FFX.sky(c, W, H, "#8ec4e0", "#f0c070", "#1a4a6a");
    else {
      var g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#7eb0d0"); g.addColorStop(0.45, "#f0c070"); g.addColorStop(1, "#1a4a6a");
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    }
    // sun
    c.fillStyle = "#f8e0a0"; c.beginPath(); c.arc(W * 0.82, H * 0.18, 22, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#6a5a40"; c.fillRect(0, H * 0.78, W, H * 0.22);
    // plank lines
    c.strokeStyle = "rgba(30,20,10,.25)"; c.lineWidth = 1;
    for (var i = 0; i < 6; i++) { c.beginPath(); c.moveTo(0, H * 0.8 + i * 12); c.lineTo(W, H * 0.8 + i * 12); c.stroke(); }
    var wg = c.createLinearGradient(0, H * 0.7, 0, H * 0.78);
    wg.addColorStop(0, "#5aa0c8"); wg.addColorStop(1, "#2a6a88");
    c.fillStyle = wg; c.fillRect(0, H * 0.7, W, H * 0.08);
    hits = [];
    if (mode !== "play") { if (window.FFX) { FFX.vignette(c, W, H, 0.28); FFX.draw(c); } c.restore(); return; }
    if (phase === "story") {
      ui.text(CH[ci].title, W / 2, 80, 26, "#f0d080", "center");
      wrap(c, CH[ci].story, W / 2, 130, W - 48, 18, "#e8f0f8");
      ui.text("Tap to go on", W / 2, H * 0.64, 16, "#f0d080", "center");
      // Nedda: chart-cape, pencil in hair — not a top-hatted gentleman
      drawNedda(c, W / 2, H * 0.52);
      return;
    }
    if (phase === "done") {
      ui.text("That's the piece.", W / 2, 120, 26, "#f0d080", "center");
      wrap(c, ci === CH.length - 1 ? "The gong hangs on its hook again." : "Nedda pencils a note on the chart and goes on.", W / 2, 170, W - 48, 18, "#e8f0f8");
      ui.text("Tap to go on", W / 2, H * 0.62, 16, "#f0d080", "center");
      return;
    }
    ui.text(CH[ci].title, W / 2, 36, 20, "#f0d080", "center");
    if (msg) ui.text(msg, W / 2, 64, 14, "#e07060", "center");
    if (st && st.kind === "lanterns") {
      wrap(c, "Which lantern on the hook-row was left unlit last night? (Its wick is dark.)", W / 2, 80, W - 40, 16, "#e8f0f8");
      for (var i = 0; i < 3; i++) {
        var x = 70 + i * 90, y = 220;
        c.fillStyle = "#5a3a18"; c.fillRect(x + 20, y - 40, 6, 50);
        c.fillStyle = i === st.dark ? "#4a4030" : "#f0d060";
        c.beginPath(); c.ellipse(x + 23, y + 20, 18, 24, 0, 0, Math.PI * 2); c.fill();
        if (i !== st.dark) { c.fillStyle = "rgba(255,220,80,.35)"; c.beginPath(); c.arc(x + 23, y + 20, 30, 0, Math.PI * 2); c.fill(); }
        hits.push({ x: x, y: y - 40, w: 60, h: 120, v: i });
      }
    }
    if (st && st.kind === "weigh") {
      wrap(c, "Tap Weigh to compare the left box with the middle box, then tap the light one.", W / 2, 80, W - 40, 16, "#e8f0f8");
      ["Left", "Middle", "Right"].forEach(function (lab, i) {
        var x = 40 + i * 110, y = 180;
        c.fillStyle = "#8a6a30"; c.fillRect(x, y, 90, 70);
        ui.text(lab, x + 45, y + 35, 14, "#f0ead8", "center");
        hits.push({ x: x, y: y, w: 90, h: 70, act: "pick", v: i });
      });
      btn(c, 120, 300, 150, 48, "Weigh 1 against 2", "weigh");
      if (st.last) ui.text(st.last === "level" ? "The beam is level." : "The " + st.last + " pan goes up.", W / 2, 380, 16, "#f0d080", "center");
    }
    if (st && st.kind === "sticks") {
      wrap(c, "The three sides and one inner stick are down. Place the last two inner sticks so four small triangles appear.", W / 2, 70, W - 40, 15, "#e8f0f8");
      // triangle: sides 0,1,2, medians 3,4,5 (from midpoints)
      var cx = W / 2, cy = 280, s = 130;
      var A = [cx, cy - s], B = [cx - s, cy + s * 0.6], C = [cx + s, cy + s * 0.6];
      var M = [[(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], [(B[0] + C[0]) / 2, (B[1] + C[1]) / 2], [(C[0] + A[0]) / 2, (C[1] + A[1]) / 2]];
      var segs = [[A, B], [B, C], [C, A], [M[0], M[1]], [M[1], M[2]], [M[2], M[0]]];
      segs.forEach(function (sg, i) {
        c.strokeStyle = st.placed[i] ? "#c47a30" : "rgba(240,240,240,.25)";
        c.lineWidth = 8; c.lineCap = "round";
        c.beginPath(); c.moveTo(sg[0][0], sg[0][1]); c.lineTo(sg[1][0], sg[1][1]); c.stroke();
        var mx = (sg[0][0] + sg[1][0]) / 2, my = (sg[0][1] + sg[1][1]) / 2;
        hits.push({ x: mx - 28, y: my - 20, w: 56, h: 40, v: i });
      });
      ui.text("In hand: " + st.held, W / 2, 500, 16, "#f0ead8", "center");
    }
    if (st && st.kind === "logic") {
      wrap(c, st.clues.join("  "), W / 2, 70, W - 36, 14, "#e8f0f8");
      ["Nia", "Owen", "Pat"].forEach(function (who, yi) {
        ui.text(who, 40, 200 + yi * 120, 16, "#f0d080", "left");
        st.boats.forEach(function (b, i) {
          var x = 100 + i * 80, y = 180 + yi * 120;
          chip(c, x, y, 70, 32, b, st.pick[who][0] === b, { who: who, slot: 0, v: b });
        });
        st.cargos.forEach(function (b, i) {
          var x = 100 + i * 80, y = 218 + yi * 120;
          chip(c, x, y, 70, 32, b, st.pick[who][1] === b, { who: who, slot: 1, v: b });
        });
      });
    }
    if (st && st.kind === "slide") {
      wrap(c, "Slide the gong crate (brass) so it touches the door.", W / 2, 80, W - 40, 15, "#e8f0f8");
      var L = slideLayout();
      for (var r = 0; r < 4; r++) for (var col = 0; col < 4; col++) {
        var x = L.ox + col * L.s, y = L.oy + r * L.s, ch = st.g[r][col];
        c.fillStyle = "#2a4a5a"; c.fillRect(x + 2, y + 2, L.s - 4, L.s - 4);
        if (ch === "#") { c.fillStyle = "#6a5a40"; c.fillRect(x + 2, y + 2, L.s - 4, L.s - 4); }
        if (ch === "b") { c.fillStyle = "#8a5a28"; c.fillRect(x + 6, y + 6, L.s - 12, L.s - 12); }
        if (ch === "G") { c.fillStyle = "#e0b040"; c.fillRect(x + 6, y + 6, L.s - 12, L.s - 12); }
        if (ch === "D") { c.fillStyle = "#4a2a10"; c.fillRect(x + 10, y + 4, L.s - 20, L.s - 8); c.fillStyle = "#e0c060"; c.fillRect(x + L.s - 16, y + L.s / 2 - 4, 6, 8); }
      }
    }
    if (st && st.kind === "lamps") {
      wrap(c, "Light every lamp. Each new lamp must have a clear sight-line to the one you just lit. Start wherever you like.", W / 2, 70, W - 40, 15, "#e8f0f8");
      var ox = 20, oy = 150, sx = (W - 40) / 360, sy = 1;
      // sight lines
      c.strokeStyle = "rgba(200,230,255,.15)"; c.lineWidth = 2;
      Object.keys(st.vis).forEach(function (k) {
        var a = k.split(","); if (+a[0] > +a[1]) return;
        var p = st.nodes[+a[0]], q = st.nodes[+a[1]];
        c.beginPath(); c.moveTo(ox + p[0] * sx, oy + p[1] * sy); c.lineTo(ox + q[0] * sx, oy + q[1] * sy); c.stroke();
      });
      st.nodes.forEach(function (p, i) {
        var x = ox + p[0] * sx, y = oy + p[1] * sy, on = st.lit.indexOf(i) >= 0;
        c.fillStyle = on ? "#f0d060" : "#3a4a50";
        c.beginPath(); c.arc(x, y, 18, 0, Math.PI * 2); c.fill();
        if (on) ui.text(String(st.lit.indexOf(i) + 1), x, y, 14, "#2a1a08", "center");
        hits.push({ x: x - 22, y: y - 22, w: 44, h: 44, v: i });
      });
    }
    if (st && st.kind === "punt") {
      wrap(c, "Tap a bundle on Nedda's bank to take it, Cross to move the punt, Drop to set a bundle down.", W / 2, 70, W - 36, 15, "#e8f0f8");
      drawBank(c, 0, 20, 160, "This slip");
      drawBank(c, 1, 220, 160, "Far slip");
      btn(c, 120, 430, 140, 44, "Cross", "cross");
      if (st.hold) btn(c, 120, 485, 140, 44, "Drop " + st.hold, "drop");
      if (st.hold) ui.text("In the punt: " + st.hold, W / 2, 400, 14, "#f0d080", "center");
    }
    if (st && st.kind === "cipher") {
      wrap(c, st.clue, W / 2, 90, W - 40, 16, "#e8f0f8");
      st.doors.forEach(function (n, i) {
        var x = 30 + i * 85, y = 280;
        c.fillStyle = "#6a4a28"; c.fillRect(x, y, 70, 110);
        c.fillStyle = "#1a2a30"; c.fillRect(x + 12, y + 20, 46, 70);
        ui.text(String(n), x + 35, y + 55, 22, "#f0d080", "center");
        hits.push({ x: x, y: y, w: 70, h: 110, v: n });
      });
    }
    if (window.FFX) { FFX.vignette(c, W, H, 0.28); FFX.draw(c); }
    c.restore();
  }
  function drawBank(c, side, x, y, title) {
    c.fillStyle = "#5a4a30"; c.fillRect(x, y, 150, 200);
    ui.text(title, x + 75, y + 18, 14, "#f0ead8", "center");
    var items = ["loaf", "eels", "dog"], yy = y + 40;
    items.forEach(function (it) {
      if (st.bank[it] === side) {
        c.fillStyle = "#d8c8a0"; c.fillRect(x + 20, yy, 110, 36);
        ui.text(it, x + 75, yy + 18, 14, "#2a1a08", "center");
        if (st.boat === side) hits.push({ x: x + 20, y: yy, w: 110, h: 36, act: "take", v: it });
        yy += 44;
      }
    });
    if (st.boat === side) ui.text("punt is here", x + 75, y + 180, 12, "#f0d080", "center");
  }
  function btn(c, x, y, w, h, lab, act) {
    c.fillStyle = "#1e3a54"; c.strokeStyle = "#6aa8c8"; c.lineWidth = 2;
    c.fillRect(x, y, w, h); c.strokeRect(x, y, w, h);
    ui.text(lab, x + w / 2, y + h / 2, 14, "#e8f0f8", "center");
    hits.push({ x: x, y: y, w: w, h: h, act: act });
  }
  function chip(c, x, y, w, h, lab, on, meta) {
    c.fillStyle = on ? "#c88840" : "#1e3a54"; c.strokeStyle = "#6aa8c8"; c.lineWidth = 1.5;
    c.fillRect(x, y, w, h); c.strokeRect(x, y, w, h);
    ui.text(lab, x + w / 2, y + h / 2, 12, "#e8f0f8", "center");
    hits.push(Object.assign({ x: x, y: y, w: w, h: h }, meta));
  }
  function drawNedda(c, x, y) {
    c.fillStyle = "#3a5a48"; c.fillRect(x - 16, y, 32, 40); // cape
    c.fillStyle = "#e0c8a0"; c.beginPath(); c.arc(x, y - 8, 10, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#2a1a10"; c.fillRect(x + 6, y - 18, 3, 14); // pencil in hair
    c.fillStyle = "#c8a060"; c.fillRect(x - 12, y + 8, 24, 16); // chart under arm
  }
  function wrap(c, text, x, y, max, size, col) {
    var words = text.split(" "), line = "", ly = y;
    c.font = size + "px Georgia"; c.fillStyle = col; c.textAlign = "center"; c.textBaseline = "top";
    words.forEach(function (w) {
      var t = line ? line + " " + w : w;
      if (c.measureText(t).width > max) { c.fillText(line, x, ly); ly += size + 5; line = w; }
      else line = t;
    });
    if (line) c.fillText(line, x, ly);
  }

  var game = {
    toTitle: toTitle, update: update, render: render, onPointer: onPointer,
    onBack: function () { if (mode === "title") return "exit"; toTitle(); return "menu"; },
    startChapter: startChapter,
    qa: {
      start: startChapter,
      solve: function () { solved(); },
      state: function () { return { mode: mode, phase: phase, ch: ci + 1, kind: st && st.kind, open: save.open }; }
    }
  };
  ui.onAdsRemoved = function () { if (mode === "title") toTitle(); };
  ui.start(game);
})();
