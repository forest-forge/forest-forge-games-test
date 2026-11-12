/* Benchkeen (Forest Forge). A short morning warm-up at the bench: flash counts,
 * shop sums, path memory, tin colours and odd-tool spots. Your Keen index is a
 * practice score, not an age and not a test of health. */
(function () {
  "use strict";
  (function applyChrome(css) {
    var s = document.createElement("style"); s.id = "ff-palette"; s.textContent = css;
    document.head.appendChild(s);
    var m = document.querySelector('meta[name="theme-color"]');
    var bg = /--bg:([^;}]+)/.exec(css); if (m && bg) m.setAttribute("content", bg[1].trim());
  })(`:root{--bg:#2a2a28;--water:#1e1e1c;--amber:#f0ead8;--amber-hi:#f0d070;--amber-soft:#f6f0e0;--amber-line:#c8a050;--ember:#e0a040;--btn:#3a3a34;--lamp:#fff8e8;--glow-line:rgba(200,160,80,.4);--glow-fill:rgba(200,160,80,.1)}.ff-host{background:radial-gradient(ellipse at 50% 20%, #4a4a40 0%, transparent 55%), var(--bg)}.ff-hud{background:linear-gradient(#3a3a34,#1e1e1c);border-bottom-color:rgba(200,160,80,.4)}`);

  var ui = FF.create({
    id: "benchkeen", title: "Benchkeen", course: "The bench", view: { w: 390, h: 720, flex: true },
    stats: [{ id: "keen", label: "Keen", value: "-" }, { id: "round", label: "Set", value: "-" }]
  });
  var A = ui.audio, save = ui.save;
  save.best = save.best || 0; save.last = save.last || 0; save.day = save.day || "";
  var S = {
    ok: function () { [660, 880].forEach(function (f, i) { A.tone({ f: f, dur: 0.07, type: "triangle", gain: 0.07, delay: i * 0.06 }); }); },
    bad: function () { A.tone({ f: 200, f2: 140, dur: 0.12, type: "square", gain: 0.06 }); },
    tick: function () { A.tone({ f: 1400, dur: 0.02, type: "square", gain: 0.03 }); },
    done: function () { [392, 523, 659, 784, 1047].forEach(function (f, i) { A.tone({ f: f, dur: 0.1, type: "triangle", gain: 0.08, delay: i * 0.08 }); }); }
  };
  var SONG = { bpm: 92, order: [0], parts: [[
    { wave: "sine", gain: 0.035, pat: "C4 . E4 . G4 . E4 . D4 . F4 . A4 . F4 . E4 . G4 . C5 . G4 . C4 ." },
    { wave: "triangle", gain: 0.025, pat: "C3 . . . G2 . . . F2 . . . C3 . . . G2 . . . D3 . . . C3 . . . G2 ." }
  ]] };

  var EX = [
    { id: "bolts", name: "Bolt flash" },
    { id: "change", name: "Make the change" },
    { id: "keyway", name: "Keyway path" },
    { id: "tin", name: "Tin and label" },
    { id: "odd", name: "Odd tool" }
  ];
  var TINS = [
    { name: "RED", col: "#c43a2a" }, { name: "GOLD", col: "#e0a020" },
    { name: "TEAL", col: "#2a8a7a" }, { name: "BLUE", col: "#2a4a9a" },
    { name: "CREAM", col: "#f0e0c0" }, { name: "MOSS", col: "#3a8a40" }
  ];

  var mode = "title", set, si, rounds, score, keen, cur, phase, timer, picked, flash;

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }
  function dailySet() {
    var rng = FF.rng(todayKey().split("-").reduce(function (a, b) { return a * 31 + (+b); }, 7));
    var idx = [0, 1, 2, 3, 4];
    for (var i = idx.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
    return idx.slice(0, 3).map(function (i) { return EX[i].id; });
  }
  function hud() {
    ui.setStat("keen", keen ? String(keen) : "-");
    ui.setStat("round", set ? (si + 1) + "/" + set.length : "-");
  }
  function startSet(ids) {
    set = ids; si = 0; rounds = []; score = 0; keen = 70; phase = "intro";
    ui.setCourse(EX.filter(function (e) { return e.id === ids[0]; })[0].name);
    mode = "play"; A.playSong(SONG); ui.go(); ui.showPads(false); hud();
    beginEx();
  }
  function beginEx() {
    var id = set[si]; cur = { id: id, t0: 0, correct: 0, asked: 0, q: 0 };
    phase = "intro"; picked = null; timer = 0;
  }
  function nextQ() {
    cur.q++; cur.asked++;
    if (cur.id === "bolts") makeBolts();
    else if (cur.id === "change") makeChange();
    else if (cur.id === "keyway") makeKeyway();
    else if (cur.id === "tin") makeTin();
    else makeOdd();
    phase = "show"; timer = 0; picked = null;
  }
  function makeBolts() {
    var n = 5 + Math.floor(Math.random() * 8), items = [];
    var kinds = ["bolt", "nut", "washer"];
    var bolts = 0;
    for (var i = 0; i < n + 6; i++) {
      var k = kinds[Math.floor(Math.random() * 3)];
      if (i < n) { k = "bolt"; bolts++; }
      items.push({ k: k, x: 40 + (i % 5) * 62, y: 160 + Math.floor(i / 5) * 70, rot: Math.random() * 0.6 - 0.3 });
    }
    // shuffle positions already grid-like; shuffle types beyond first n already mixed
    cur.items = items; cur.answer = bolts; cur.choices = uniqChoices(bolts, 4, 3, 16);
    cur.showFor = 0.95;
  }
  function makeChange() {
    var metres = (1 + Math.floor(Math.random() * 8)) + (Math.random() < 0.5 ? 0.5 : 0);
    var rate = [2.4, 3.5, 4.2, 5, 6.75][Math.floor(Math.random() * 5)];
    var extras = Math.floor(Math.random() * 4);
    var extraP = [0.4, 0.8, 1.2][Math.floor(Math.random() * 3)];
    var total = Math.round((metres * rate + extras * extraP) * 100) / 100;
    cur.prompt = "A " + metres.toFixed(1) + " m bar at £" + rate.toFixed(2) + "/m" + (extras ? ", plus " + extras + " ferrule" + (extras > 1 ? "s" : "") + " at £" + extraP.toFixed(2) : "") + ". What does the customer owe?";
    cur.answer = total;
    cur.choices = uniqMoney(total);
    cur.showFor = 0;
    phase = "ask";
  }
  function makeKeyway() {
    var cells = [], n = 4 + Math.floor(Math.random() * 3), x = 1 + Math.floor(Math.random() * 3), y = 1 + Math.floor(Math.random() * 3);
    cells.push([x, y]);
    for (var i = 1; i < n; i++) {
      var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].sort(function () { return Math.random() - 0.5; });
      var ok = false;
      for (var d = 0; d < 4; d++) {
        var nx = x + dirs[d][0], ny = y + dirs[d][1];
        if (nx >= 0 && ny >= 0 && nx < 5 && ny < 5 && !cells.some(function (c) { return c[0] === nx && c[1] === ny; })) { x = nx; y = ny; cells.push([x, y]); ok = true; break; }
      }
      if (!ok) break;
    }
    cur.path = cells; cur.input = []; cur.showFor = 1.1 + cells.length * 0.28;
  }
  function makeTin() {
    var body = TINS[Math.floor(Math.random() * TINS.length)];
    var label = TINS[Math.floor(Math.random() * TINS.length)];
    cur.body = body; cur.label = label;
    cur.answer = body.name;
    cur.choices = shuffle([body, label].concat(TINS.filter(function (t) { return t.name !== body.name && t.name !== label.name; }).slice(0, 2))).slice(0, 4);
    if (cur.choices.every(function (t) { return t.name !== body.name; })) cur.choices[0] = body;
    cur.showFor = 0; phase = "ask";
  }
  function makeOdd() {
    var kinds = ["spanner", "hammer", "file", "caliper"];
    var main = kinds[Math.floor(Math.random() * kinds.length)];
    var oddK = kinds.filter(function (k) { return k !== main; })[Math.floor(Math.random() * 3)];
    var items = [];
    var oddI = Math.floor(Math.random() * 4);
    for (var i = 0; i < 4; i++) items.push({ k: i === oddI ? oddK : main, i: i });
    cur.items = items; cur.answer = oddI; cur.showFor = 0; phase = "ask";
  }
  function uniqChoices(ans, n, lo, hi) {
    var s = { [ans]: 1 }, out = [ans];
    while (out.length < n) { var v = lo + Math.floor(Math.random() * (hi - lo + 1)); if (!s[v]) { s[v] = 1; out.push(v); } }
    return shuffle(out);
  }
  function uniqMoney(ans) {
    var out = [ans], s = { [ans.toFixed(2)]: 1 };
    var deltas = [-1, 1, -0.5, 0.5, -2, 2, 0.8, -0.8, 1.2];
    for (var i = 0; i < deltas.length && out.length < 4; i++) {
      var v = Math.round((ans + deltas[i]) * 100) / 100; if (v > 0 && !s[v.toFixed(2)]) { s[v.toFixed(2)] = 1; out.push(v); }
    }
    return shuffle(out);
  }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  function mark(ok) {
    if (ok) { cur.correct++; score += 120; keen = FF.clamp(keen + 3, 40, 100); S.ok(); }
    else { keen = FF.clamp(keen - 4, 40, 100); S.bad(); }
    hud();
    phase = "result"; timer = 0; flash = ok;
  }
  function finishEx() {
    rounds.push({ id: cur.id, correct: cur.correct, asked: cur.asked });
    si++;
    if (si >= set.length) return finishSet();
    ui.setCourse(EX.filter(function (e) { return e.id === set[si]; })[0].name);
    beginEx();
  }
  function finishSet() {
    ui.stop(); S.done();
    if (keen > save.best) save.best = keen;
    save.last = keen; save.day = todayKey(); ui.persist(); ui.runEnded();
    var lines = rounds.map(function (r) {
      var n = EX.filter(function (e) { return e.id === r.id; })[0].name;
      return n + ": " + r.correct + "/" + r.asked;
    }).join(" · ");
    ui.menu({
      title: "Bench done",
      body: "Keen index " + keen + " — a practice score, not a measure of health.",
      stats: '<b class="ff-score-xl">' + keen + "</b><span>" + lines + "</span><span>BEST " + save.best + "</span>",
      buttons: [{ label: "Again", act: function () { startSet(set); } }, { label: "Menu", small: true, act: toTitle }]
    });
  }
  function playDaily() { startSet(dailySet()); }
  function toTitle() {
    ui.stop(); mode = "title"; A.playSong(SONG); ui.showPads(false); ui.setCourse("The bench");
    ui.menu({
      title: "BENCHKEEN",
      body: "Five short desk drills for a morning at the bench. Your Keen index goes up with clean, quick answers. It is a practice score, not an age, and not a test of health.",
      stats: "<span>BEST KEEN " + (save.best || "-") + "</span><span>LAST " + (save.last || "-") + "</span>",
      buttons: [{ label: "Today's three", act: playDaily }],
      row: EX.map(function (e) { return { label: e.name, act: function () { startPractice(e.id); } }; }),
      help: ["Today's three is a fresh mix each day.", "Tap answers on the board."],
      fine: "Forest Forge · original work. A bit of desk practice, not a test of health.",
      app: true
    });
  }
  function startPractice(id) { startSet([id]); }

  function update(dt) {
    if (mode !== "play") return;
    timer += dt;
    if (phase === "intro") {
      if (timer > 0.8) nextQ();
      return;
    }
    if (phase === "show") {
      if (timer >= (cur.showFor || 0)) { phase = "ask"; timer = 0; }
      return;
    }
    if (phase === "result") {
      if (timer > 0.7) {
        if (cur.asked >= (set.length === 1 ? 6 : 5)) finishEx();
        else nextQ();
      }
    }
  }

  var hitBoxes = [];
  function onPointer(type, x, y) {
    if (mode !== "play" || type !== "pointerdown" || phase !== "ask") return;
    for (var i = 0; i < hitBoxes.length; i++) {
      var b = hitBoxes[i];
      if (x >= b.x && y >= b.y && x <= b.x + b.w && y <= b.y + b.h) { picked = b.v; mark(same(b.v, cur.answer)); return; }
    }
    if (cur.id === "keyway") {
      var L = keyLayout();
      var c = Math.floor((x - L.ox) / L.s), r = Math.floor((y - L.oy) / L.s);
      if (c >= 0 && r >= 0 && c < 5 && r < 5) {
        var expect = cur.path[cur.input.length];
        if (expect && expect[0] === c && expect[1] === r) {
          cur.input.push([c, r]); S.tick();
          if (cur.input.length === cur.path.length) mark(true);
        } else mark(false);
      }
    }
  }
  function same(a, b) { return String(a) === String(b); }
  function keyLayout() {
    var s = Math.min(ui.VW - 40, 280) / 5;
    return { s: s, ox: (ui.VW - s * 5) / 2, oy: 180 };
  }

  function render(c) {
    var W = ui.VW, H = ui.VH;
    c.fillStyle = "#3a3a34"; c.fillRect(0, 0, W, H);
    c.fillStyle = "#6a5a38"; c.fillRect(0, H * 0.72, W, H * 0.28);
    c.fillStyle = "#c8b080"; c.fillRect(0, H * 0.72, W, 8);
    hitBoxes = [];
    if (mode !== "play" || !cur) return;
    var ex = EX.filter(function (e) { return e.id === cur.id; })[0];
    ui.text(ex.name, W / 2, 36, 22, "#f0d070", "center");
    if (phase === "intro") { ui.text("Ready", W / 2, 200, 28, "#f0ead8", "center"); return; }
    if (cur.id === "bolts") drawBolts(c);
    if (cur.id === "change") drawChange(c);
    if (cur.id === "keyway") drawKeyway(c);
    if (cur.id === "tin") drawTin(c);
    if (cur.id === "odd") drawOdd(c);
    if (phase === "result") {
      ui.text(flash ? "Clean" : "Not that one", W / 2, H * 0.68, 22, flash ? "#80d070" : "#e07060", "center");
    }
  }
  function drawBolts(c) {
    if (phase === "show" || (phase === "result" && flash)) {
      (cur.items || []).forEach(function (it) {
        c.save(); c.translate(it.x + 20, it.y + 20); c.rotate(it.rot);
        if (it.k === "bolt") {
          c.fillStyle = "#8a8a8a"; c.fillRect(-4, -16, 8, 28); c.fillStyle = "#6a6a6a"; c.fillRect(-8, -18, 16, 8);
        } else if (it.k === "nut") {
          c.fillStyle = "#7a7a7a"; c.beginPath(); for (var i = 0; i < 6; i++) { var a = i * Math.PI / 3; c.lineTo(Math.cos(a) * 12, Math.sin(a) * 12); } c.closePath(); c.fill();
          c.fillStyle = "#3a3a3a"; c.beginPath(); c.arc(0, 0, 5, 0, Math.PI * 2); c.fill();
        } else {
          c.strokeStyle = "#9a9a9a"; c.lineWidth = 5; c.beginPath(); c.arc(0, 0, 10, 0, Math.PI * 2); c.stroke();
        }
        c.restore();
      });
      ui.text("How many bolts?", ui.VW / 2, 130, 16, "#f0ead8", "center");
    } else if (phase === "ask") {
      ui.text("How many bolts were on the tray?", ui.VW / 2, 150, 16, "#f0ead8", "center");
      choices(c, cur.choices);
    }
  }
  function drawChange(c) {
    wrapText(c, cur.prompt, ui.VW / 2, 140, ui.VW - 40, 18, "#f0ead8");
    if (phase === "ask" || phase === "result") choices(c, cur.choices.map(function (v) { return "£" + Number(v).toFixed(2); }), cur.choices);
  }
  function drawKeyway(c) {
    var L = keyLayout();
    ui.text(phase === "show" ? "Watch the path" : "Trace it back", ui.VW / 2, 140, 16, "#f0ead8", "center");
    for (var r = 0; r < 5; r++) for (var col = 0; col < 5; col++) {
      var x = L.ox + col * L.s, y = L.oy + r * L.s;
      c.fillStyle = "#2a2a28"; c.fillRect(x + 3, y + 3, L.s - 6, L.s - 6);
      var step = -1;
      if (phase === "show") {
        var shown = Math.min(cur.path.length, Math.floor(timer / 0.28) + 1);
        for (var i = 0; i < shown; i++) if (cur.path[i][0] === col && cur.path[i][1] === r) step = i;
      } else {
        for (var i = 0; i < cur.input.length; i++) if (cur.input[i][0] === col && cur.input[i][1] === r) step = i;
      }
      if (step >= 0) { c.fillStyle = "#e0a040"; c.fillRect(x + 6, y + 6, L.s - 12, L.s - 12); ui.text(String(step + 1), x + L.s / 2, y + L.s / 2, 14, "#1a1a14", "center"); }
    }
  }
  function drawTin(c) {
    ui.text("Tap the colour of the tin, not the word on the label.", ui.VW / 2, 110, 14, "#f0ead8", "center");
    var cx = ui.VW / 2, cy = 230;
    c.fillStyle = cur.body.col; c.fillRect(cx - 40, cy - 50, 80, 90);
    c.fillStyle = "#3a3a34"; c.fillRect(cx - 30, cy - 18, 60, 32);
    c.fillStyle = "#f0ead8"; c.font = "14px Georgia"; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText(cur.label.name, cx, cy);
    if (phase === "ask" || phase === "result") {
      (cur.choices || []).forEach(function (t, i) {
        var x = 30 + (i % 2) * 170, y = 360 + Math.floor(i / 2) * 70;
        c.fillStyle = t.col; c.fillRect(x, y, 150, 58);
        c.strokeStyle = "#1a1a14"; c.strokeRect(x, y, 150, 58);
        hitBoxes.push({ x: x, y: y, w: 150, h: 58, v: t.name });
      });
    }
  }
  function drawOdd(c) {
    ui.text("Which tool does not belong?", ui.VW / 2, 120, 16, "#f0ead8", "center");
    (cur.items || []).forEach(function (it, i) {
      var x = 30 + (i % 2) * 170, y = 170 + Math.floor(i / 2) * 160;
      c.fillStyle = "#4a4a44"; c.fillRect(x, y, 150, 140);
      drawTool(c, x + 75, y + 70, it.k);
      hitBoxes.push({ x: x, y: y, w: 150, h: 140, v: it.i });
    });
  }
  function drawTool(c, x, y, k) {
    c.save(); c.translate(x, y); c.strokeStyle = "#d0d0d0"; c.fillStyle = "#d0d0d0"; c.lineWidth = 4; c.lineCap = "round";
    if (k === "spanner") { c.beginPath(); c.arc(-20, 0, 12, 0.4, Math.PI * 2 - 0.4); c.moveTo(-10, 0); c.lineTo(28, 0); c.stroke(); }
    else if (k === "hammer") { c.fillRect(-8, -28, 16, 18); c.fillRect(-3, -12, 6, 36); }
    else if (k === "file") { c.fillRect(-4, -30, 8, 50); c.fillRect(-10, 20, 20, 8); }
    else { c.beginPath(); c.arc(0, 0, 18, 0.2, Math.PI * 2 - 0.2); c.stroke(); c.beginPath(); c.moveTo(16, 4); c.lineTo(26, 10); c.stroke(); }
    c.restore();
  }
  function choices(c, labels, values) {
    values = values || labels;
    labels.forEach(function (lab, i) {
      var x = 30 + (i % 2) * 170, y = 340 + Math.floor(i / 2) * 70;
      c.fillStyle = "#3a3a34"; c.strokeStyle = "#c8a050"; c.lineWidth = 2;
      c.fillRect(x, y, 150, 58); c.strokeRect(x, y, 150, 58);
      ui.text(String(lab), x + 75, y + 29, 18, "#f0ead8", "center");
      hitBoxes.push({ x: x, y: y, w: 150, h: 58, v: values[i] });
    });
  }
  function wrapText(c, text, x, y, max, size, col) {
    var words = text.split(" "), line = "", ly = y;
    c.font = size + "px Georgia"; c.fillStyle = col; c.textAlign = "center"; c.textBaseline = "top";
    words.forEach(function (w) {
      var t = line ? line + " " + w : w;
      if (c.measureText(t).width > max) { c.fillText(line, x, ly); ly += size + 6; line = w; }
      else line = t;
    });
    if (line) c.fillText(line, x, ly);
  }

  var game = {
    toTitle: toTitle, update: update, render: render, onPointer: onPointer,
    onBack: function () { if (mode === "title") return "exit"; toTitle(); return "menu"; },
    playDaily: playDaily,
    qa: {
      start: function (id) { startSet([id || "bolts"]); },
      answer: function (v) { if (phase === "ask") { picked = v; mark(same(v, cur.answer)); } },
      finish: function () { keen = 88; finishSet(); },
      state: function () { return { mode: mode, phase: phase, id: cur && cur.id, asked: cur && cur.asked, correct: cur && cur.correct, keen: keen, answer: cur && cur.answer }; }
    }
  };
  ui.onAdsRemoved = function () { if (mode === "title") toTitle(); };
  ui.start(game);
})();
