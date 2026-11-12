/* Wharf Games (Forest Forge). A waterside sports day for Renna Vale, dock runner.
 * Six one/two-button events, records on the device, and the Wharf Cup at the end
 * of each round. All art is drawn in code into a low-res buffer, all sound and
 * music is generated with Web Audio (see shell.js). */
(function () {
  "use strict";
  (function applyChrome(css) {
    var s = document.createElement("style"); s.id = "ff-palette"; s.textContent = css;
    document.head.appendChild(s);
    var m = document.querySelector('meta[name="theme-color"]');
    var bg = /--bg:([^;}]+)/.exec(css); if (m && bg) m.setAttribute("content", bg[1].trim());
  })(`:root{--bg:#06243c;--water:#07324c;--amber:#e8f4ff;--amber-hi:#fff4b8;--amber-soft:#d4ecff;--amber-line:#2c86d0;--ember:#e23c3c;--btn:#0a3a68;--lamp:#fff6c8;--glow-line:rgba(70,170,255,.35);--glow-fill:rgba(70,170,255,.08)}.ff-host{background:radial-gradient(ellipse at 50% 40%, #0a4c80 0%, transparent 60%), var(--bg)}.ff-hud{background:linear-gradient(#0a3868,#061e34);border-bottom-color:rgba(44,134,208,.35)}.ff{border-left-color:rgba(44,134,208,.28);border-right-color:rgba(44,134,208,.28)}.ff-icon-btn:active{background:#155a9a;box-shadow:0 0 16px rgba(70,170,255,.45)}.ff-course,.ff-stat b{text-shadow:0 0 12px rgba(70,170,255,.5)}.ff-shade{background:linear-gradient(180deg,rgba(0,0,0,.2),rgba(0,0,0,.52))!important}.ff-modal{text-shadow:0 2px 10px rgba(0,0,0,.7);animation:ffIn .35s ease}.ff-display{letter-spacing:.18em;filter:drop-shadow(0 0 16px var(--ember))}.ff-lede,.ff-stat-line,.ff-fine{text-shadow:0 1px 6px rgba(0,0,0,.7)}.ff-btns{background:rgba(0,0,0,.42);border:1px solid var(--glow-line);border-radius:16px;padding:14px 16px 16px;box-shadow:0 14px 40px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.1);backdrop-filter:blur(7px)}.ff-btn{box-shadow:0 4px 0 rgba(0,0,0,.35),0 0 18px var(--glow-fill);letter-spacing:.06em}.ff-btn:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,.35)}.ff-hud{box-shadow:0 10px 24px rgba(0,0,0,.28)}.ff-toast{backdrop-filter:blur(6px)}@keyframes ffIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`);
  var clamp = FF.clamp, lerp = FF.lerp;
  var ui = FF.create({
    id: "wharf-games", title: "Wharf Games", course: "Sports day", view: { w: 360, h: 640, flex: true },
    stats: [{ id: "pts", label: "Points" }, { id: "tries", label: "Tries", value: "3" }],
    pads: {
      left: [{ id: "L", label: "Run", cls: "big", aria: "Run (left)", keys: ["ArrowLeft", "KeyA", "KeyZ"] },
             { id: "R", label: "Run", cls: "big", aria: "Run (right)", keys: ["ArrowRight", "KeyD", "KeyX"] }],
      right: [{ id: "A", label: "Go", cls: "big", aria: "Action", keys: ["Space", "ArrowUp", "KeyW", "Enter"] }]
    }
  });
  var A = ui.audio, save = ui.save;
  save.rec = save.rec || {}; save.cup = save.cup || 0; save.rounds = save.rounds || 0;

  // ---------- low-res buffer: the whole scene is drawn at 1 px = 2 units ----------
  var PX = 2, lo = document.createElement("canvas"), g = lo.getContext("2d"), W = 180, H = 320;
  function sizeLo() { W = Math.ceil(ui.VW / PX); H = Math.ceil(ui.VH / PX); lo.width = W; lo.height = H; g.imageSmoothingEnabled = false; }
  function R(x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function line(x0, y0, x1, y1, c, th) {
    g.fillStyle = c; th = th || 2;
    var dx = x1 - x0, dy = y1 - y0, n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
    for (var i = 0; i <= n; i++) g.fillRect(Math.round(x0 + dx * i / n - th / 2), Math.round(y0 + dy * i / n - th / 2), th, th);
  }

  // ---------- people ----------
  var PAL = {
    renna: { hair: "#c4582a", skin: "#e9b58c", skinD: "#b98563", top: "#2f8a84", topD: "#1f5e5a", leg: "#2b3656", legD: "#1c2440", boot: "#1a120c" },
    gull: { hair: "#e8e0c8", skin: "#d8a27c", skinD: "#a87656", top: "#b23a32", topD: "#7a2622", leg: "#3a3a3a", legD: "#252525", boot: "#111" },
    marsh: { hair: "#2a1a10", skin: "#8a5a3c", skinD: "#6a4430", top: "#d8a23a", topD: "#9a7228", leg: "#4a3a2a", legD: "#33281c", boot: "#111" }
  };
  // pose angles in radians from straight down; positive points forward (to the right)
  function limb(x, y, a1, a2, l1, l2, c, th) {
    var kx = x + Math.sin(a1) * l1, ky = y + Math.cos(a1) * l1;
    line(x, y, kx, ky, c, th); var fx = kx + Math.sin(a2) * l2, fy = ky + Math.cos(a2) * l2;
    line(kx, ky, fx, fy, c, th); return [fx, fy];
  }
  function figure(x, y, p, pal, flip) {
    var s = flip ? -1 : 1, L = p.lean * s;
    var sx = x + Math.sin(L) * 8, sy = y - Math.cos(L) * 8;
    var f = function (a) { return a * s; };
    g.fillStyle = "rgba(0,0,0,0.28)"; g.beginPath(); g.ellipse(x, y + 12, 7, 2.2, 0, 0, 7); g.fill();
    var bf = limb(x, y, f(p.tb), f(p.sb), 6, 6, pal.legD, 2); R(bf[0] - 1 + s, bf[1] - 1, 3, 2, pal.boot);
    limb(sx, sy + 1, f(p.ab), f(p.fb), 4, 4, pal.skinD, 2);
    line(x, y, sx, sy, pal.top, 5);
    line(x - s, y, sx - s, sy + 1, pal.topD, 2);
    line(x + s * 0.4, y - 1, sx + s * 0.4, sy, "rgba(255,255,255,0.22)", 1);
    var hx = sx + Math.sin(L) * 3, hy = sy - Math.cos(L) * 3;
    R(hx - 3, hy - 5, 7, 7, pal.skinD);
    R(hx - 2, hy - 4, 5, 5, pal.skin);
    R(hx - 1, hy - 3, 2, 2, "rgba(255,255,255,0.3)");
    R(hx - 2 - s, hy - 6, 5, 3, pal.hair); R(flip ? hx + 2 : hx - 3, hy - 4, 2, 4, pal.hair);
    R(hx + s * 2, hy - 2, 1, 1, "#1a1010");
    var ff = limb(x, y, f(p.tf), f(p.sf), 6, 6, pal.leg, 2); R(ff[0] - 1 + s, ff[1] - 1, 3, 2, pal.boot);
    var hf = limb(sx, sy + 1, f(p.af), f(p.ff), 4, 4, pal.skin, 2);
    return { hand: hf, head: [hx, hy] };
  }
  function runPose(ph, speed) {
    var a = Math.min(1, 0.35 + speed / 10), s1 = Math.sin(ph), s2 = Math.sin(ph + Math.PI);
    return {
      lean: 0.12 + 0.22 * a,
      tf: 0.95 * a * s1, sf: 0.95 * a * s1 - (0.15 + 1.25 * a * Math.max(0, Math.cos(ph))),
      tb: 0.95 * a * s2, sb: 0.95 * a * s2 - (0.15 + 1.25 * a * Math.max(0, Math.cos(ph + Math.PI))),
      af: -0.9 * a * s1, ff: -0.9 * a * s1 + 1.5, ab: -0.9 * a * s2, fb: -0.9 * a * s2 + 1.5
    };
  }
  var STAND = { lean: 0, tf: 0.08, sf: 0.08, tb: -0.08, sb: -0.08, af: 0.15, ff: 0.4, ab: -0.1, fb: 0.2 };
  function runBob(ph, speed) { return -Math.abs(Math.sin(ph)) * Math.min(2, speed / 4); }

  // ---------- harbour scenery ----------
  var cranes = [], sheds = [], boats = [], clouds = [], gulls = [];
  (function () {
    var r = FF.rng(7);
    for (var i = 0; i < 12; i++) cranes.push({ x: i * 140 + r() * 60, h: 40 + r() * 30, b: 30 + r() * 20, hook: r() });
    for (var j = 0; j < 20; j++) sheds.push({ x: j * 70 + r() * 30, w: 40 + r() * 30, h: 14 + r() * 18, c: ["#2a6ec8", "#e2c43a", "#d43a32", "#2a9a4a"][j % 4] });
    for (var k = 0; k < 8; k++) boats.push({ x: k * 180 + r() * 80, w: 22 + r() * 16, h: 8 + r() * 5, hull: ["#d43a32", "#2a6ec8", "#e2c43a", "#1a3a58"][k % 4], cabin: ["#f4f0e0", "#2a3a48", "#c4582a"][k % 3], mast: r() > 0.45 });
    for (var c = 0; c < 7; c++) clouds.push({ x: c * 90 + r() * 40, y: 8 + r() * 22, w: 28 + r() * 24, h: 8 + r() * 6, s: 0.25 + r() * 0.2 });
    for (var g2 = 0; g2 < 5; g2++) gulls.push({ x: r() * 400, y: 16 + r() * 28, s: 0.6 + r() * 0.8, ph: r() * 6 });
  })();
  function softCirc(x, y, rad, c) { g.fillStyle = c; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill(); }
  function sky(top, bot, t) {
    t = t || 0;
    var gr = g.createLinearGradient(0, top, 0, bot);
    gr.addColorStop(0, "#1a5aaa"); gr.addColorStop(0.35, "#3a86d8"); gr.addColorStop(0.68, "#7ec8f2"); gr.addColorStop(1, "#d8f0ff");
    g.fillStyle = gr; g.fillRect(0, top, W, bot - top);
    var sx = W * 0.74, sy = bot - 28;
    var glow = g.createRadialGradient(sx, sy, 2, sx, sy, 30);
    glow.addColorStop(0, "rgba(255,246,192,0.95)"); glow.addColorStop(0.4, "rgba(255,220,120,0.4)"); glow.addColorStop(1, "rgba(255,200,80,0)");
    g.fillStyle = glow; g.fillRect(sx - 30, sy - 30, 60, 60);
    softCirc(sx, sy, 8, "#fff6c0"); softCirc(sx - 1, sy - 1, 4, "#fffef0");
    for (var i = 0; i < clouds.length; i++) {
      var cl = clouds[i], cx = ((cl.x - t * 6 * cl.s) % (W + 80) + W + 80) % (W + 80) - 40;
      g.globalAlpha = 0.82; g.fillStyle = "#ffffff";
      softCirc(cx, top + cl.y, cl.h * 0.7, "#fff"); softCirc(cx + cl.w * 0.35, top + cl.y - 2, cl.h * 0.85, "#fff");
      softCirc(cx + cl.w * 0.7, top + cl.y + 1, cl.h * 0.6, "#eef4ff"); g.globalAlpha = 1;
    }
  }
  function boatAt(x, y, b) {
    g.fillStyle = b.hull; g.beginPath(); g.moveTo(x, y); g.lineTo(x + b.w, y); g.lineTo(x + b.w - 3, y + b.h); g.lineTo(x + 4, y + b.h); g.closePath(); g.fill();
    R(x + 2, y + 1, b.w - 6, 1, "rgba(255,255,255,0.35)");
    if (b.mast) {
      R(x + b.w * 0.45, y - b.h * 1.6, 1, b.h * 1.6, "#2a2018");
      g.fillStyle = "#f4f0e0"; g.beginPath(); g.moveTo(x + b.w * 0.45 + 1, y - b.h * 1.55); g.lineTo(x + b.w * 0.45 + 1, y - 2); g.lineTo(x + b.w * 0.85, y - 4); g.closePath(); g.fill();
    } else {
      R(x + b.w * 0.25, y - b.h * 0.7, b.w * 0.4, b.h * 0.7, b.cabin);
      R(x + b.w * 0.32, y - b.h * 0.55, 3, 3, "#fff6c0");
    }
    g.globalAlpha = 0.25; R(x + 2, y + b.h + 1, b.w - 4, 2, b.hull); g.globalAlpha = 1;
  }
  function water(top, bot, t, camX) {
    camX = camX || 0;
    var wgr = g.createLinearGradient(0, top, 0, bot);
    wgr.addColorStop(0, "#3ab0c8"); wgr.addColorStop(0.4, "#1a88b0"); wgr.addColorStop(1, "#0a5a78");
    g.fillStyle = wgr; g.fillRect(0, top, W, bot - top);
    g.globalAlpha = 0.22; R(0, top, W, 4, "#d8f0ff"); g.globalAlpha = 1;
    var i, x;
    for (i = 0; i < (bot - top) / 3; i++) {
      var y = top + 1 + i * 3, off = ((t * 8 + i * 13 - camX * (0.4 + i * 0.05)) % 24 + 24) % 24;
      for (x = -24; x < W; x += 24) R(x + off, y, 8 + (i % 3) * 3, 1, i < 2 ? "#e89a52" : (i % 2 ? "#3ab0c8" : "#7ed0e0"));
    }
    for (i = 0; i < 8; i++) if (Math.sin(t * 5 + i * 2.1) > 0.35) R(((i * 47 + t * 10 - camX * 0.3) % W + W) % W, top + 4 + (i * 9) % Math.max(4, bot - top - 6), 2, 1, "#e8ffff");
  }
  function harbour(camX, horizon, quayY, t) {
    sky(0, horizon, t);
    var i, x;
    g.fillStyle = "#2a5a80";
    for (x = 0; x < W; x += 3) {
      var hx = x + camX * 0.04, hh = 10 + 8 * Math.sin(hx * 0.03) + 4 * Math.sin(hx * 0.07 + 1);
      R(x, horizon - hh, 3, hh, "#2a6088");
    }
    for (i = 0; i < cranes.length; i++) {
      var c = cranes[i]; x = ((c.x - camX * 0.15) % 1680 + 1680) % 1680 - 120;
      if (x < -60 || x > W + 60) continue;
      R(x, horizon - c.h, 3, c.h, "#3a5268"); R(x - 1, horizon - c.h, 5, 3, "#4a6a80");
      R(x - c.b * 0.3, horizon - c.h, c.b, 2, "#4a6a80");
      line(x + 1, horizon - c.h, x + c.b * 0.7, horizon - c.h + 8 + c.hook * 10, "#2a3a48", 1);
      R(x + c.b * 0.7 - 2, horizon - c.h + 8 + c.hook * 10, 4, 3, "#c4582a");
      R(x - c.b * 0.3, horizon - c.h - 1, 6, 4, "#2a3a48");
    }
    for (i = 0; i < sheds.length; i++) {
      var s = sheds[i]; x = ((s.x - camX * 0.35) % 1400 + 1400) % 1400 - 80;
      if (x < -80 || x > W + 10) continue;
      R(x, horizon - s.h, s.w, s.h, s.c);
      g.fillStyle = "#1a3048"; g.beginPath(); g.moveTo(x - 2, horizon - s.h); g.lineTo(x + s.w / 2, horizon - s.h - 5); g.lineTo(x + s.w + 2, horizon - s.h); g.fill();
      R(x, horizon - s.h, s.w, 1, "rgba(255,255,255,0.25)");
      for (var wx = 4; wx < s.w - 4; wx += 8) R(x + wx, horizon - s.h + 4, 3, 3, "#fff6c0");
      R(x + s.w * 0.4, horizon - 7, 5, 7, "#1a2030");
    }
    for (i = 0; i < boats.length; i++) {
      var b = boats[i]; x = ((b.x - camX * 0.22) % 1440 + 1440) % 1440 - 80;
      if (x < -40 || x > W + 10) continue;
      boatAt(x, horizon + 4 + Math.sin(t * 1.4 + i) * 1.2, b);
    }
    water(horizon, quayY, t, camX);
    R(0, quayY - 2, W, 2, "rgba(220,240,255,0.45)");
    for (x = ((-camX * 0.8) % 10 + 10) % 10 - 10; x < W; x += 10) R(x, quayY - 3, 4, 2, "rgba(255,255,255,0.35)");
    var qgr = g.createLinearGradient(0, quayY, 0, H);
    qgr.addColorStop(0, "#e8dcc0"); qgr.addColorStop(0.08, "#d2c4a4"); qgr.addColorStop(1, "#b8a07a");
    g.fillStyle = qgr; g.fillRect(0, quayY, W, H - quayY);
    R(0, quayY, W, 2, "#f0e8d0");
    var st = ((-camX) % 16 + 16) % 16;
    for (x = st - 16; x < W; x += 16) R(x, quayY + 3, 1, H - quayY, "#a89070");
    for (i = 0; i < 8; i++) R(0, quayY + 10 + i * 12, W, 1, "#a89070");
    g.globalAlpha = 0.15; g.fillStyle = "#6a88a0";
    for (i = 0; i < 5; i++) R(((i * 53 - camX) % (W + 40) + W + 40) % (W + 40) - 20, quayY + 16 + (i * 11) % 40, 18, 3, "#6a88a0");
    g.globalAlpha = 1;
    for (i = 0; i < gulls.length; i++) {
      var gu = gulls[i], gx = ((gu.x + t * 18 * gu.s - camX * 0.2) % (W + 40) + W + 40) % (W + 40) - 20;
      var gy = gu.y + Math.sin(t * 2 + gu.ph) * 4, flap = Math.sin(t * 8 + gu.ph) > 0;
      g.fillStyle = "#f4f0e8";
      R(gx - 4, gy + (flap ? 0 : 1), 3, 1, "#f4f0e8"); R(gx + 2, gy + (flap ? 0 : 1), 3, 1, "#f4f0e8"); R(gx, gy, 2, 2, "#fff");
    }
  }
  function bollard(x, y) {
    R(x - 3, y - 7, 6, 7, "#2a2a2e"); R(x - 2, y - 6, 2, 5, "rgba(255,255,255,0.18)");
    R(x - 4, y - 8, 8, 2, "#4a4a50"); R(x - 3, y - 8, 2, 1, "rgba(255,255,255,0.3)"); R(x - 4, y, 8, 2, "#1a1a1e");
  }
  function polish() {
    var vg = g.createRadialGradient(W / 2, H * 0.48, H * 0.2, W / 2, H * 0.5, H * 0.85);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(6,20,40,0.32)");
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
  }

  // ---------- sound ----------
  var S = {
    step: function () { if (A.sfxOk()) A.noise({ dur: 0.04, gain: 0.12, freq: 500, filter: "lowpass" }); },
    beep: function (hi) { A.tone({ f: hi ? 988 : 494, dur: hi ? 0.35 : 0.16, type: "square", gain: 0.16 }); },
    crowd: function (big) { A.noise({ dur: big ? 1.6 : 0.8, gain: big ? 0.28 : 0.16, freq: 900, filter: "bandpass", q: 0.4 }); },
    thud: function () { A.tone({ f: 140, f2: 50, dur: 0.18, type: "triangle", gain: 0.4 }); A.noise({ dur: 0.08, gain: 0.2, freq: 300, filter: "lowpass" }); },
    splash: function () { A.noise({ dur: 0.6, gain: 0.35, freq: 2500, f2: 300, filter: "lowpass" }); },
    clang: function (good) { A.tone({ f: good ? 1320 : 990, f2: good ? 880 : 600, dur: 0.12, type: "square", gain: 0.14 }); A.noise({ dur: 0.05, gain: 0.2, freq: 4000, filter: "highpass" }); },
    whoosh: function () { A.noise({ dur: 0.3, gain: 0.18, freq: 600, f2: 2400, filter: "bandpass" }); },
    fanfare: function () { [523, 659, 784, 1047].forEach(function (f, i) { A.tone({ f: f, dur: i === 3 ? 0.5 : 0.14, type: "square", gain: 0.14, delay: i * 0.13 }); }); },
    fail: function () { [392, 330, 262].forEach(function (f, i) { A.tone({ f: f, dur: 0.22, type: "triangle", gain: 0.2, delay: i * 0.18 }); }); },
    heave: function () { A.tone({ f: 180, f2: 320, dur: 0.15, type: "sawtooth", gain: 0.12 }); }
  };
  // original tunes (Forest Forge, generated)
  var SONG_TITLE = { bpm: 132, swing: 0.12, order: [0, 0, 1, 0], parts: [[
    { wave: "square", gain: 0.07, pat: "D5 - F#5 A5 - F#5 G5 - E5 C#5 - E5 D5 - - . A4 - D5 F#5 - D5 E5 - C#5 A4 - B4 D5 - - ." },
    { wave: "triangle", gain: 0.2, pat: "D3 . A2 . D3 . A2 . A2 . E3 . D3 . A2 . D3 . A2 . D3 . A2 . E3 . A2 . D3 . . ." },
    { wave: "drum", pat: "k . h . s . h . k . h k s . h . k . h . s . h . k . h k s . o ." }
  ], [
    { wave: "square", gain: 0.07, pat: "G5 - B5 D6 - B5 A5 - F#5 D5 - F#5 E5 - - . F#5 - A5 D6 - A5 G5 - E5 C#5 - E5 D5 - - ." },
    { wave: "triangle", gain: 0.2, pat: "G2 . D3 . G2 . D3 . D3 . A2 . D3 . A2 . D3 . A2 . D3 . A2 . E3 . A2 . D3 . . ." },
    { wave: "drum", pat: "k . h . s . h . k . h k s . h . k . h . s . h . k k h k s s o ." }
  ]] };
  var SONG_EVENT = { bpm: 150, order: [0, 1], parts: [[
    { wave: "square", gain: 0.06, pat: "A4 . A4 C5 . A4 E5 . D5 . C5 . B4 . G4 . A4 . A4 C5 . A4 E5 . G5 . E5 . D5 . E5 ." },
    { wave: "triangle", gain: 0.22, pat: "A2 . A3 . A2 . A3 . G2 . G3 . G2 . G3 . F2 . F3 . F2 . F3 . E2 . E3 . E2 . G#2 ." },
    { wave: "drum", pat: "k h s h k h s h k h s h k h s s k h s h k h s h k h s h k s s s" }
  ], [
    { wave: "square", gain: 0.06, pat: "C5 . C5 E5 . C5 G5 . F5 . E5 . D5 . B4 . C5 . E5 G5 . E5 A5 . G5 . E5 . D5 . B4 ." },
    { wave: "triangle", gain: 0.22, pat: "F2 . F3 . F2 . F3 . G2 . G3 . G2 . G3 . A2 . A3 . A2 . A3 . E2 . E3 . E2 . E3 ." },
    { wave: "drum", pat: "k h s h k h s h k h s h k h s s k h s h k h s h k k s h k s s o" }
  ]] };
  var SONG_CUP = { bpm: 108, order: [0], parts: [[
    { wave: "square", gain: 0.08, pat: "C5 - - E5 G5 - - - E5 - G5 - C6 - - - A5 - - G5 F5 - - E5 D5 - E5 - C5 - - -" },
    { wave: "triangle", gain: 0.22, pat: "C3 - G2 - C3 - G2 - A2 - E2 - A2 - E2 - F2 - C3 - F2 - C3 - G2 - D3 - G2 - B2 -" },
    { wave: "drum", pat: "k . . . s . . . k . . . s . . . k . . . s . . . k . k . s . s ." }
  ]] };

  // ---------- run state ----------
  var EVENTS, ev = null, evIndex = 0, round = 0, tries = 3, total = 0, mode = "title", practice = false, evPts = [];
  var ph = "ready", phT = 0, lastBeep = 0, flash = 0, floaters = [];
  function float(text, x, y, c) { floaters.push({ t: text, x: x, y: y, c: c || "#ffe3a0", life: 1.1 }); }

  function mash() { return { v: 0, last: null, ph: 0, taps: 0 }; }
  function mashTap(m, id, vmax) {
    var alt = m.last !== id; m.last = id; m.taps++;
    m.v += (alt ? 1.45 : 0.3) * Math.max(0, 1 - m.v / (vmax || 13));
    S.step();
  }
  function mashDecay(m, dt) { m.v = Math.max(0, m.v - m.v * 0.42 * dt - 0.5 * dt); }

  // ---------- events ----------
  // each: name, short, unit, better ("low"|"high"), qual(r), fmt(v), pts(v), action label, start(), update(dt), draw(t), hud()
  var D = {}; // dash
  var dash = {
    name: "Mooring Dash", short: "Dash", better: "low", action: "Go",
    intro: "100 metres down the quay. Tap the two Run pads one after the other, as fast as you can.",
    qual: function (r) { return Math.max(11.6, 15.4 - r * 0.7); },
    fmt: function (v) { return v.toFixed(2) + " s"; },
    pts: function (v) { return Math.max(0, Math.round((17 - v) * 170)); },
    start: function () {
      D = { m: mash(), x: 0, t: 0, done: false, riv: [{ x: 0, v: 0, top: 7.6 + round * 0.35 + Math.random() * 0.6, ph: 0, pal: PAL.gull }, { x: 0, v: 0, top: 7.2 + round * 0.35 + Math.random() * 0.8, ph: 1, pal: PAL.marsh }] };
    },
    press: function (id) { if (ph === "go" && (id === "L" || id === "R")) mashTap(D.m, id); },
    update: function (dt) {
      if (ph !== "go") return;
      D.t += dt; mashDecay(D.m, dt);
      D.x += D.m.v * dt; D.m.ph += D.m.v * dt * 1.15;
      D.riv.forEach(function (r) { if (r.x < 100) { r.v = lerp(r.v, r.top, dt * 0.9); r.x += r.v * dt; r.ph += r.v * dt * 1.15; } });
      if (D.x >= 100) finish(D.t);
    },
    draw: function (t) {
      var ppm = 7, cam = D.x * ppm - W * 0.3, hz = H * 0.28, qy = H * 0.42;
      harbour(cam, hz, qy, t);
      var i, lanes = [qy + 22, qy + 36, qy + 52];
      for (i = 0; i < 3; i++) R(0, lanes[i] + 2, W, 1, "#d8c8a8");
      for (var m = 0; m <= 110; m += 10) {
        var mx = m * ppm - cam; if (mx < -20 || mx > W + 20) continue;
        bollard(mx, qy + 2);
        if (m === 100) { for (i = 0; i < 18; i++) R(mx, qy + 10 + i * 3, 2, 3, i % 2 ? "#fff" : "#111"); }
        else R(mx, qy + 12, 1, 44, "rgba(255,255,255,0.25)");
      }
      var rs = D.riv;
      figure(rs[0].x * ppm - cam, lanes[0] - 12 + runBob(rs[0].ph, rs[0].v), rs[0].v > 0.3 ? runPose(rs[0].ph, rs[0].v) : STAND, rs[0].pal);
      figure(rs[1].x * ppm - cam, lanes[2] - 12 + runBob(rs[1].ph, rs[1].v), rs[1].v > 0.3 ? runPose(rs[1].ph, rs[1].v) : STAND, rs[1].pal);
      figure(D.x * ppm - cam, lanes[1] - 12 + runBob(D.m.ph, D.m.v), D.m.v > 0.3 ? runPose(D.m.ph, D.m.v) : STAND, PAL.renna);
    },
    hud: function () { speedBar(D.m.v / 11); bigTime(D.t); distLine(Math.min(100, D.x).toFixed(1) + " m"); }
  };

  var P = {}; // hawser pull
  var pull = {
    name: "Hawser Pull", short: "Pull", better: "low", action: "Heave",
    intro: "Tug the mooring line over your mark. Tap Run fast to pull, and hit Heave the moment their crew slips.",
    qual: function () { return 25; },
    fmt: function (v) { return v >= 25 ? "lost" : v.toFixed(2) + " s"; },
    pts: function (v) { return v >= 25 ? 0 : Math.round(500 + Math.max(0, 25 - v) * 45); },
    start: function () { P = { m: mash(), p: 0, t: 0, slip: 0, nextSlip: 2.2, str: 6.1 + round * 0.55, shake: 0 }; },
    press: function (id) {
      if (ph !== "go") return;
      if (id === "L" || id === "R") mashTap(P.m, id, 12);
      if (id === "A") {
        if (P.slip > 0) { P.p += 0.16; P.slip = 0; P.nextSlip = 1.8 + Math.random() * 2.2; S.heave(); float("HEAVE!", W * 0.5, H * 0.3); flash = 0.15; }
        else { P.p -= 0.04; float("too soon", W * 0.5, H * 0.3, "#ff8a6a"); }
      }
    },
    update: function (dt) {
      if (ph !== "go") return;
      P.t += dt; mashDecay(P.m, dt);
      var rival = P.str + Math.sin(P.t * 1.4) * 0.9 + P.t * 0.03;
      if (P.slip > 0) { P.slip -= dt; rival *= 0.35; if (P.slip <= 0) P.nextSlip = 1.6 + Math.random() * 2.4; }
      else { P.nextSlip -= dt; if (P.nextSlip <= 0) P.slip = Math.max(0.34, 0.55 - round * 0.04); }
      P.p += (P.m.v - rival) * 0.022 * dt;
      P.p = clamp(P.p, -1.05, 1.05);
      P.shake = Math.abs(P.m.v - rival) < 1.2 ? 1 : 0;
      if (P.p >= 1) finish(P.t); else if (P.p <= -1 || P.t >= 25) finish(25);
    },
    draw: function (t) {
      var hz = H * 0.28, qy = H * 0.42; harbour(0, hz, qy, t);
      var cx = W / 2 - P.p * 36, ry = qy + 30 + (P.shake ? Math.round(Math.sin(t * 40)) : 0);
      R(W / 2 - 1, qy + 8, 2, 50, "#f3e0b0"); R(W / 2 - 34 - 1, qy + 8, 1, 50, "#e86a3a"); R(W / 2 + 34, qy + 8, 1, 50, "#e86a3a");
      line(0, ry, W, ry, "#c8a46a", 2);
      R(cx - 2, ry - 6, 4, 6, "#e83a3a");
      var lean = 0.45 + P.m.v * 0.015;
      var pose = { lean: -lean, tf: 0.55, sf: 0.1, tb: 0.2, sb: -0.1, af: 1.4, ff: 1.5, ab: 1.3, fb: 1.5 };
      var rx = cx - 30, rv = P.m.v;
      figure(rx - 16 + Math.sin(t * 9) * (rv > 2 ? 1 : 0), ry + 10, pose, PAL.renna);
      var rp = { lean: P.slip > 0 ? 0.15 : 0.45, tf: 0.55, sf: 0.1, tb: 0.2, sb: -0.1, af: 1.4, ff: 1.5, ab: 1.3, fb: 1.5 };
      figure(cx + 44, ry + 10, rp, PAL.gull, true);
      figure(cx + 62, ry + 10, rp, PAL.marsh, true);
      if (P.slip > 0 && Math.floor(t * 12) % 2) { R(cx + 40, ry - 26, 6, 12, "#ffe36a"); R(cx + 40, ry - 12, 6, 4, "#ffe36a"); }
    },
    hud: function () { speedBar(P.m.v / 11); bigTime(P.t); distLine(P.slip > 0 ? "They slipped: HEAVE!" : "Pull!"); }
  };

  var T = {}; // crate toss
  var toss = {
    name: "Crate Toss", short: "Toss", better: "high", action: "Throw",
    intro: "Three throws of a rope crate onto the barge. Tap Run to wind up the swing, then hold Throw to raise the angle and let go near 45°.",
    qual: function (r) { return 22 + r * 3; },
    fmt: function (v) { return v.toFixed(2) + " m"; },
    pts: function (v) { return Math.round(v * 30); },
    start: function () { T = { m: mash(), go: 0, best: 0, n: 0, st: "spin", ang: 0, holding: false, cx: 0, cy: 0, vx: 0, vy: 0, spin: 0, marks: [], wait: 0, foul: "" }; },
    press: function (id) {
      if (ph !== "go") return;
      if (T.st === "spin" && (id === "L" || id === "R")) mashTap(T.m, id, 13);
      if (T.st === "spin" && id === "A" && T.m.taps > 0) { T.st = "aim"; T.holding = true; T.ang = 0; }
    },
    release: function (id) { if (T.st === "aim" && id === "A" && T.holding) throwCrate(); },
    update: function (dt) {
      if (ph !== "go") return;
      if (T.st === "spin") {
        T.go += dt; mashDecay(T.m, dt * 0.35); T.spin += (2 + T.m.v * 1.1) * dt;
        if (T.go > 6) { T.foul = "Too slow"; landed(0); }
      } else if (T.st === "aim") {
        T.spin += (2 + T.m.v * 1.1) * dt; T.ang += dt * 62;
        if (T.ang >= 88) { T.foul = "Foul: too steep"; landed(0); }
      } else if (T.st === "fly") {
        T.vy -= 9.81 * dt; T.cx += T.vx * dt; T.cy += T.vy * dt;
        if (T.cy <= 0) { T.cy = 0; var d = T.cx - 2; if (d < 6) { T.foul = "In the water"; S.splash(); landed(0); } else { S.thud(); landed(d); } }
      } else if (T.st === "land") {
        T.wait -= dt; if (T.wait <= 0) { if (T.n >= 3) finish(T.best); else { T.m = mash(); T.go = 0; T.st = "spin"; T.cx = 0; T.cy = 0; T.foul = ""; } }
      }
    },
    draw: function (t) {
      var ppm = 4, cam = T.st === "fly" || T.st === "land" ? Math.max(0, T.cx * ppm - W * 0.5) : 0;
      var hz = H * 0.28, qy = H * 0.46;
      sky(0, hz, t);
      water(hz, H, t, cam);
      // quay at left, barge from 6 m
      R(-cam, qy, 8 * ppm, H - qy, "#d2c4a4"); R(-cam, qy, 8 * ppm, 3, "#e8dcc0");
      var bx = 8 * ppm - cam; R(bx, qy + 6, 54 * ppm, 10, "#3a2a20"); R(bx, qy + 4, 54 * ppm, 3, "#6a5038"); R(bx + 54 * ppm, qy + 6, 6, 8, "#2a1e18");
      for (var m = 10; m <= 60; m += 5) { var mx = (m + 2) * ppm - cam; R(mx, qy + 2, 1, 4, "#f3e0b0"); if (m % 10 === 0) { g.fillStyle = "#f3e0b0"; g.font = "6px monospace"; g.fillText(m + "", mx - 4, qy + 24); } }
      var qm = (toss.qual(round) + 2) * ppm - cam; R(qm, qy - 4, 1, 10, "#e86a3a");
      T.marks.forEach(function (d) { R((d + 2) * ppm - cam - 1, qy + 1, 3, 3, "#ffe36a"); });
      var fx = 4 * ppm - cam, fy = qy - 12;
      var spinning = T.st === "spin" || T.st === "aim";
      var pose = spinning ? { lean: 0.1 * Math.sin(T.spin), tf: 0.3, sf: 0.1, tb: -0.3, sb: -0.1, af: 1.6 + Math.sin(T.spin) * 0.4, ff: 1.6, ab: 1.4, fb: 1.5 } : { lean: 0.3, tf: 0.5, sf: 0.2, tb: -0.4, sb: -0.3, af: 2.6, ff: 2.6, ab: -0.6, fb: 0 };
      var hand = figure(fx, fy, pose, PAL.renna, spinning && Math.cos(T.spin) < 0).hand;
      var crX, crY;
      if (spinning) { crX = fx + Math.cos(T.spin) * 14; crY = fy - 6 + Math.sin(T.spin) * 5; line(hand[0], hand[1], crX, crY, "#c8a46a", 1); }
      else { crX = (T.cx + 2) * ppm - cam; crY = qy + 2 - T.cy * ppm; }
      R(crX - 4, crY - 3, 8, 7, "#6a4422"); R(crX - 3, crY - 4, 6, 6, "#9a6a3a"); R(crX - 3, crY - 4, 6, 1, "#c89a5a"); R(crX - 1, crY - 4, 1, 6, "#6a4422"); R(crX - 2, crY - 3, 2, 1, "rgba(255,255,255,0.25)");
      if (T.st === "aim") { var a = T.ang * Math.PI / 180; line(fx + 4, fy - 8, fx + 4 + Math.cos(a) * 20, fy - 8 - Math.sin(a) * 20, "#ffe36a", 1); }
    },
    hud: function () {
      speedBar(T.m.v / 11);
      ui.text("Throw " + Math.min(3, T.n + (T.st === "land" ? 0 : 1)) + " of 3", ui.VW / 2, 74, 15, "#ffd38a", "center");
      if (T.st === "aim" || T.st === "fly" || T.st === "land") ui.text(Math.round(T.ang) + "°", ui.VW / 2, 98, 22, "#ffcf7a", "center", "#ff9a2a");
      if (T.foul) ui.text(T.foul, ui.VW / 2, ui.VH * 0.32, 20, "#ff8a6a", "center");
      else if (T.st === "land") ui.text(T.marks[T.marks.length - 1].toFixed(2) + " m", ui.VW / 2, ui.VH * 0.32, 24, "#ffe3a0", "center", "#ff9a2a");
      distLine("Best " + (T.best ? T.best.toFixed(2) + " m" : "-") + " · need " + toss.qual(round).toFixed(0) + " m");
    }
  };
  function throwCrate() {
    T.holding = false; var a = T.ang * Math.PI / 180, v = 6 + Math.min(1, T.m.v / 11.5) * 15.5;
    T.vx = Math.cos(a) * v; T.vy = Math.sin(a) * v; T.cx = 2; T.cy = 1.6; T.st = "fly"; S.whoosh();
  }
  function landed(d) {
    T.n++; T.st = "land"; T.wait = 1.6;
    if (d > 0) { T.marks.push(d); if (d > T.best) T.best = d; float(d.toFixed(2) + " m", W / 2, H * 0.3); S.crowd(d >= toss.qual(round)); }
    else { T.marks.push(0); S.fail(); }
  }

  var B = {}; // boom swing
  var boom = {
    name: "Boom Swing", short: "Boom", better: "high", action: "Drop",
    intro: "Five loads swing from the crane. Tap Drop to let each one go over the cross on the ship's deck.",
    qual: function (r) { return 240 + r * 30; },
    fmt: function (v) { return Math.round(v) + " pts"; },
    pts: function (v) { return Math.round(v * 2); },
    start: function () { B = { n: 0, score: 0, t: 0, st: "swing", lx: 0, ly: 0, vx: 0, vy: 0, last: [], wait: 0, deck: 0 }; },
    press: function (id) {
      if (ph !== "go" || id !== "A" || B.st !== "swing") return;
      var w = 1.4 + B.n * 0.35 + round * 0.2, amp = W * 0.34;
      B.st = "fall"; B.vx = Math.cos(B.t * w) * amp * w; B.vy = 0; S.whoosh();
    },
    update: function (dt) {
      if (ph !== "go") return;
      B.deck = Math.sin(ui.time * 1.3) * 3;
      var w = 1.4 + B.n * 0.35 + round * 0.2, amp = W * 0.34, top = H * 0.2;
      if (B.st === "swing") { B.t += dt; B.lx = W / 2 + Math.sin(B.t * w) * amp; B.ly = top + 46; if (B.t > 9) boom.press("A"); }
      else if (B.st === "fall") {
        B.vy += 260 * dt; B.lx += B.vx * dt * 0.12; B.ly += B.vy * dt;
        var deckY = H * 0.58 + B.deck;
        if (B.ly >= deckY - 5) {
          B.ly = deckY - 5; var tx = W / 2 + Math.sin(ui.time * 0.7) * 14 * (B.n % 2 ? 1 : -1) * 0.6, dx = Math.abs(B.lx - tx);
          var s = Math.max(0, Math.round(100 - dx * 4.2)); B.score += s; B.last.push(s); B.n++;
          float(s === 100 ? "BULLSEYE 100" : s + "", B.lx, deckY - 20, s >= 80 ? "#ffe36a" : s > 0 ? "#ffd38a" : "#ff8a6a");
          if (s > 0) { S.thud(); if (s >= 80) S.crowd(false); } else S.splash();
          B.st = "land"; B.wait = 1.1;
        }
      } else if (B.st === "land") { B.wait -= dt; if (B.wait <= 0) { if (B.n >= 5) finish(B.score); else { B.st = "swing"; B.t = Math.random() * 3; } } }
    },
    draw: function (t) {
      var hz = H * 0.36; sky(0, hz, t); water(hz, H, t, 0);
      var top = H * 0.2, deckY = H * 0.58 + B.deck;
      // ship
      R(W * 0.08, deckY, W * 0.84, 18, "#4a2a24"); R(W * 0.08, deckY, W * 0.84, 3, "#7a5a40"); R(W * 0.06, deckY + 18, W * 0.88, 6, "#2a1a16");
      R(W * 0.78, deckY - 20, 18, 20, "#d8d0c0"); R(W * 0.8, deckY - 16, 4, 4, "#3ab0c8"); R(W * 0.86, deckY - 16, 4, 4, "#3ab0c8");
      var tx = W / 2 + Math.sin(ui.time * 0.7) * 14 * (B.n % 2 ? 1 : -1) * 0.6;
      line(tx - 6, deckY - 3, tx + 6, deckY + 3, "#ffe36a", 2); line(tx - 6, deckY + 3, tx + 6, deckY - 3, "#ffe36a", 2);
      // crane
      R(4, top - 10, 6, H - top, "#c8782a"); R(0, top - 14, W, 4, "#c8782a");
      for (var k = 0; k < W; k += 8) line(k, top - 14, k + 4, top - 10, "#8a4a1a", 1);
      var hookX = B.st === "swing" ? B.lx : B.lx;
      if (B.st === "swing") { R(hookX - 4, top - 10, 8, 3, "#3a3a3a"); line(hookX, top - 8, B.lx, B.ly - 5, "#2a2a2a", 1); }
      R(B.lx - 7, B.ly - 5, 14, 10, ["#2f8a84", "#b23a32", "#d8a23a", "#4a6ab0", "#8a4ab0"][B.n % 5]); R(B.lx - 7, B.ly - 5, 14, 1, "rgba(255,255,255,0.4)"); R(B.lx - 1, B.ly - 5, 1, 10, "rgba(0,0,0,0.3)");
      figure(18, H * 0.64 + 34, { lean: 0, tf: 0.1, sf: 0.1, tb: -0.1, sb: -0.1, af: 2.6, ff: 2.8, ab: 0.2, fb: 0.4 }, PAL.renna);
    },
    hud: function () {
      ui.text("Load " + Math.min(5, B.n + 1) + " of 5", ui.VW / 2, 74, 15, "#ffd38a", "center");
      bigTime(null, Math.round(B.score) + "");
      distLine("Need " + boom.qual(round) + " · " + B.last.join("  "));
    }
  };

  var K = {}; // rivet hammer rhythm
  var BPM = 120, BEAT = 60 / BPM, TRAVEL = 1.25;
  var CHARTS = [
    // [beat, lane] lane 0 = Run pads (left), 1 = Rivet (right)
    [0, 0], [1, 1], [2, 0], [3, 1], [4, 0], [4.5, 0], [5, 1], [6, 0], [7, 1], [8, 0], [9, 0], [10, 1], [11, 1], [12, 0], [12.5, 1], [13, 0], [14, 1], [15, 1],
    [16, 0], [17, 1], [17.5, 1], [18, 0], [19, 1], [20, 0], [20.5, 0], [21, 0], [22, 1], [23, 1], [24, 0], [25, 1], [26, 0], [26.5, 1], [27, 0], [28, 1], [28.5, 0], [29, 1], [30, 0], [31, 1]
  ];
  var rivet = {
    name: "Rivet Hammer", short: "Rivet", better: "high", action: "Rivet",
    intro: "Hot rivets drop to the plate in time with the beat. Left lane: either Run pad. Right lane: the Rivet pad.",
    qual: function (r) { return 2300 + r * 300; },
    fmt: function (v) { return Math.round(v) + " pts"; },
    pts: function (v) { return Math.round(v / 3.6); },
    start: function () {
      var off = 4 * BEAT;
      K = { notes: CHARTS.map(function (c) { return { t: off + c[0] * BEAT, lane: c[1], hit: 0, judged: false }; }), score: 0, combo: 0, best: 0, t0: null, pt0: 0, nextBeat: 0, swing: [0, 0], judge: "", jt: 0, end: off + 33 * BEAT };
    },
    now: function () { return K.pt0 ? performance.now() / 1000 - K.pt0 : 0; },
    press: function (id) {
      if (ph !== "go") return;
      var lane = id === "A" ? 1 : 0, t = rivet.now(), best = null, bd = 9;
      K.swing[lane] = 0.12;
      K.notes.forEach(function (n) { if (!n.judged && n.lane === lane) { var d = Math.abs(n.t - t); if (d < bd) { bd = d; best = n; } } });
      if (best && bd <= 0.15) {
        best.judged = true; best.hit = bd <= 0.065 ? 2 : 1;
        K.combo++; K.best = Math.max(K.best, K.combo);
        K.score += (best.hit === 2 ? 100 : 60) + Math.min(10, K.combo) * 5;
        K.judge = best.hit === 2 ? "PERFECT" : "GOOD"; K.jt = 0.4; S.clang(best.hit === 2);
      } else { K.combo = 0; K.judge = "MISS"; K.jt = 0.3; A.tone({ f: 160, dur: 0.06, type: "square", gain: 0.1 }); }
    },
    update: function (dt) {
      if (ph !== "go") return;
      if (!K.pt0) { K.pt0 = performance.now() / 1000 + 0.05; K.t0 = 0; }
      var t = rivet.now();
      // schedule the beat ahead on the audio clock
      if (A.ctx) {
        while (K.nextBeat * BEAT < t + 0.25 && K.nextBeat * BEAT < K.end) {
          var at = A.ctx.currentTime + (K.nextBeat * BEAT - t), b = K.nextBeat;
          if (at < A.ctx.currentTime) at = A.ctx.currentTime;
          A.tone({ f: 150, f2: 45, dur: 0.14, type: "sine", gain: b < 4 ? 0.5 : 0.4, bus: A.mus }, at);
          if (b >= 4) {
            var bass = [110, 110, 98, 131][Math.floor((b - 4) / 4) % 4];
            A.tone({ f: bass, dur: BEAT * 0.45, type: "triangle", gain: 0.2, bus: A.mus }, at);
            A.tone({ f: bass * 2, dur: BEAT * 0.2, type: "triangle", gain: 0.12, bus: A.mus }, at + BEAT / 2);
            if (b % 2) A.noise({ dur: 0.1, gain: 0.22, freq: 1800, bus: A.mus }, at);
            A.noise({ dur: 0.025, gain: 0.08, freq: 8000, filter: "highpass", bus: A.mus }, at + BEAT / 2);
          } else A.tone({ f: 880, dur: 0.05, type: "square", gain: 0.08, bus: A.mus }, at);
          K.nextBeat++;
        }
      }
      K.notes.forEach(function (n) { if (!n.judged && t - n.t > 0.15) { n.judged = true; n.hit = -1; K.combo = 0; K.judge = "MISS"; K.jt = 0.3; } });
      K.swing[0] = Math.max(0, K.swing[0] - dt); K.swing[1] = Math.max(0, K.swing[1] - dt); K.jt -= dt;
      if (t > K.end + 0.4) finish(K.score);
    },
    draw: function (t) {
      R(0, 0, W, H, "#121a28");
      for (var y = 0; y < H; y += 20) R(0, y, W, 1, "#1a2438");
      var lineY = H * 0.62, lanes = [W * 0.32, W * 0.68];
      R(W * 0.12, lineY - 6, W * 0.76, 14, "#5a5a62"); R(W * 0.12, lineY - 6, W * 0.76, 2, "#8a8a94");
      for (var x = W * 0.14; x < W * 0.86; x += 10) R(x, lineY - 1, 3, 3, "#3a3a40");
      var now = ph === "go" ? rivet.now() : 0;
      lanes.forEach(function (lx, i) {
        R(lx - 9, 0, 18, lineY - 6, "rgba(255,170,80,0.05)");
        R(lx - 10, lineY - 3, 20, 2, i ? "#ffcf7a" : "#c98a35");
        var sw = K.swing[i] > 0;
        // hammer
        var hy = lineY - (sw ? 10 : 26);
        R(lx - 1, hy - 18, 3, 18, "#7a5a3a"); R(lx - 7, hy - 2, 14, 6, "#9a9aa4");
        if (sw) { R(lx - 12, lineY - 10, 24, 2, "#ffe36a"); }
      });
      K.notes.forEach(function (n) {
        if (n.hit > 0) return;
        var dtn = n.t - now; if (dtn > TRAVEL || dtn < -0.3) return;
        var y = lineY - (dtn / TRAVEL) * (lineY - 10), lx = lanes[n.lane];
        R(lx - 4, y - 4, 8, 6, n.hit < 0 ? "#5a3a2a" : "#ff8a2a"); R(lx - 2, y - 6, 4, 2, n.hit < 0 ? "#4a2a1a" : "#ffd06a");
      });
      lanes.forEach(function (lx, i) { if (K.swing[i] > 0.06) for (var k = 0; k < 6; k++) R(lx + Math.cos(k + i) * (14 - K.swing[i] * 40), lineY - 4 + Math.sin(k * 2.1) * 6, 2, 2, "#ffe36a"); });
    },
    hud: function () {
      bigTime(null, Math.round(K.score) + "");
      if (K.jt > 0) ui.text(K.judge, ui.VW / 2, ui.VH * 0.42, 22, K.judge === "MISS" ? "#ff8a6a" : "#ffe36a", "center", "#ff9a2a");
      distLine("Combo " + K.combo + " · need " + rivet.qual(round));
      ui.text("RUN", ui.VW * 0.32, ui.VH * 0.68, 12, "#c98a35", "center"); ui.text("RIVET", ui.VW * 0.68, ui.VH * 0.68, 12, "#c98a35", "center");
    }
  };

  var Q = {}; // sack and plank
  var plank = {
    name: "Sack and Plank", short: "Plank", better: "low", action: "Jump",
    intro: "110 metres over grain sacks on the boards. Tap Run to sprint and Jump to clear each sack.",
    qual: function (r) { return Math.max(13.8, 19.5 - r * 0.8); },
    fmt: function (v) { return v.toFixed(2) + " s"; },
    pts: function (v) { return Math.max(0, Math.round((22 - v) * 150)); },
    start: function () {
      var sacks = []; for (var i = 0; i < 9; i++) sacks.push({ x: 14 + i * 10.5, hit: false, fall: 0 });
      Q = { m: mash(), x: 0, t: 0, y: 0, vy: 0, stumble: 0, sacks: sacks, riv: { x: 0, v: 0, y: 0, vy: 0, top: 7.2 + round * 0.3, ph: 0 } };
    },
    press: function (id) {
      if (ph !== "go") return;
      if (id === "L" || id === "R") { if (Q.stumble <= 0) mashTap(Q.m, id, 12.5); }
      if (id === "A" && Q.y <= 0.01) { Q.vy = 5.2; A.tone({ f: 330, f2: 660, dur: 0.12, type: "square", gain: 0.1 }); }
    },
    update: function (dt) {
      if (ph !== "go") return;
      Q.t += dt; mashDecay(Q.m, dt);
      if (Q.stumble > 0) { Q.stumble -= dt; Q.m.v *= Math.pow(0.2, dt); }
      Q.x += Q.m.v * dt; Q.m.ph += Q.m.v * dt * 1.15;
      if (Q.y > 0 || Q.vy > 0) { Q.vy -= 13 * dt; Q.y = Math.max(0, Q.y + Q.vy * dt); if (Q.y === 0) Q.vy = 0; }
      Q.sacks.forEach(function (s) {
        if (!s.hit && Math.abs(Q.x - s.x) < 0.45 && Q.y < 0.55) { s.hit = true; Q.stumble = 0.45; Q.m.v *= 0.35; S.thud(); float("oof", W * 0.35, H * 0.4, "#ff8a6a"); }
        if (s.hit) s.fall = Math.min(1, s.fall + dt * 4);
      });
      var r = Q.riv; if (r.x < 110) { r.v = lerp(r.v, r.top, dt); r.x += r.v * dt; r.ph += r.v * dt * 1.15;
        var next = Q.sacks.filter(function (s) { return s.x > r.x; })[0]; if (next && next.x - r.x < 0.9 && r.y <= 0) r.vy = 5.2;
        if (r.y > 0 || r.vy > 0) { r.vy -= 13 * dt; r.y = Math.max(0, r.y + r.vy * dt); if (r.y === 0) r.vy = 0; } }
      if (Q.x >= 110) finish(Q.t);
    },
    draw: function (t) {
      var ppm = 7, cam = Q.x * ppm - W * 0.3, hz = H * 0.28, qy = H * 0.42;
      harbour(cam, hz, qy, t);
      var l1 = qy + 26, l2 = qy + 48;
      [l1, l2].forEach(function (ly) { R(0, ly, W, 5, "#9a7a52"); R(0, ly, W, 1, "#c8a472"); var o = ((-cam) % 12 + 12) % 12; for (var x = o - 12; x < W; x += 12) R(x, ly + 1, 1, 4, "#6a5236"); });
      for (var m = 0; m <= 110; m += 10) { var mx = m * ppm - cam; if (mx > -10 && mx < W + 10) { bollard(mx, qy + 2); if (m === 110) for (var i = 0; i < 14; i++) R(mx, qy + 8 + i * 3, 2, 3, i % 2 ? "#fff" : "#111"); } }
      Q.sacks.forEach(function (s) {
        var sx = s.x * ppm - cam; if (sx < -20 || sx > W + 20) return;
        [l1, l2].forEach(function (ly, k) {
          if (k === 1 && s.hit) { R(sx - 4, ly - 7, 8, 7, "#c8b088"); R(sx - 3, ly - 8, 6, 1, "#a89068"); return; }
          if (k === 1) { R(sx - 4, ly - 7, 8, 7, "#c8b088"); R(sx - 3, ly - 8, 6, 1, "#a89068"); R(sx - 1, ly - 6, 2, 1, "#8a6a4a"); }
          else { R(sx - 4, ly - 7, 8, 7, "#b8a078"); R(sx - 3, ly - 8, 6, 1, "#98805a"); }
        });
        if (s.hit) { R(sx + 3 + s.fall * 6, l2 - 3, 9, 4, "#c8b088"); }
      });
      var r = Q.riv;
      figure(r.x * ppm - cam, l1 - 12 - r.y * 9 + (r.y ? 0 : runBob(r.ph, r.v)), r.y > 0 ? { lean: 0.3, tf: 1.2, sf: 0.2, tb: -0.6, sb: -0.9, af: -0.6, ff: 0.6, ab: 1, fb: 1.6 } : runPose(r.ph, r.v), PAL.gull);
      var pose = Q.stumble > 0 ? { lean: 0.8, tf: 0.3, sf: 0.6, tb: -0.4, sb: -0.6, af: 1.6, ff: 1.8, ab: 1.4, fb: 1.6 } : Q.y > 0 ? { lean: 0.3, tf: 1.2, sf: 0.2, tb: -0.6, sb: -0.9, af: -0.6, ff: 0.6, ab: 1, fb: 1.6 } : Q.m.v > 0.3 ? runPose(Q.m.ph, Q.m.v) : STAND;
      figure(Q.x * ppm - cam, l2 - 12 - Q.y * 9 + (Q.y ? 0 : runBob(Q.m.ph, Q.m.v)), pose, PAL.renna);
    },
    hud: function () { speedBar(Q.m.v / 11); bigTime(Q.t); distLine(Math.min(110, Q.x).toFixed(1) + " m"); }
  };

  EVENTS = [dash, pull, toss, boom, rivet, plank];

  // ---------- canvas HUD bits (full resolution) ----------
  function speedBar(f) {
    var w = Math.min(220, ui.VW * 0.6), x = (ui.VW - w) / 2, y = ui.VH - 156;
    var c = ui.ctx; c.fillStyle = "rgba(5,5,5,0.6)"; c.fillRect(x - 4, y - 4, w + 8, 18);
    c.strokeStyle = "#c98a35"; c.lineWidth = 1; c.strokeRect(x - 4, y - 4, w + 8, 18);
    var n = 16, k = Math.round(clamp(f, 0, 1) * n);
    for (var i = 0; i < n; i++) { c.fillStyle = i < k ? (i > 12 ? "#ff5a2a" : i > 8 ? "#ffb040" : "#ffe08a") : "#2a1a08"; c.fillRect(x + i * (w / n) + 1, y, w / n - 2, 10); }
    ui.text("SPEED", x, y - 12, 10, "#c98a35");
  }
  function bigTime(t, s) { ui.text(s != null ? s : t.toFixed(2), ui.VW / 2, 44, 30, "#ffcf7a", "center", "#ff9a2a"); }
  function distLine(s) { ui.text(s, ui.VW / 2, ui.VH - 176, 14, "#ffd38a", "center"); }
  function evTitle() { ui.text(ev.name.toUpperCase(), ui.VW / 2, 16, 12, "#c98a35", "center"); }

  // ---------- flow ----------
  function rec(e) { return save.rec[e.short]; }
  function better(e, a, b) { return b == null || (e.better === "low" ? a < b : a > b); }
  function updateStats() { ui.setStat("pts", FF.n(total)); ui.setStat("tries", practice ? "-" : String(tries)); }
  function beginEvent(i) {
    ev = EVENTS[i]; evIndex = i; ev.start(); ph = "ready"; phT = 0; lastBeep = 0; floaters = [];
    ui.setPadLabel("A", ev.action);
    ui.padsOnly(ev === dash ? ["L", "R"] : ev === boom ? ["A"] : null);
    ui.setCourse((practice ? "Practice · " : "Round " + (round + 1) + " · ") + ev.name);
    A.stopSong();
    var q = ev.qual(round);
    ui.menu({
      kicker: practice ? "Practice" : "Event " + (i + 1) + " of 6 · Round " + (round + 1), title: ev.name, body: ev.intro,
      stats: (ev === pull ? "<span>WIN TO QUALIFY</span>" : "<span>QUALIFY " + ev.fmt(q).toUpperCase() + "</span>") + "<span>RECORD " + (rec(ev) != null ? ev.fmt(rec(ev)) : "-") + "</span>",
      buttons: [{ label: "Start", act: function () { ui.go(); } }, { label: "Menu", small: true, act: toTitle }], solid: false
    });
    updateStats();
  }
  function finish(v) {
    if (ph !== "go") return;
    ph = "done"; phT = 0; ev.result = v;
  }
  function showResult() {
    ui.stop();
    var v = ev.result, q = ev.qual(round), ok = ev === pull ? v < 25 : ev.better === "low" ? v <= q : v >= q;
    var pts = ok ? ev.pts(v) : 0, newRec = (ev !== pull || v < 25) && better(ev, v, rec(ev)) && (ev.better === "low" || v > 0);
    if (newRec) { save.rec[ev.short] = v; ui.persist(); }
    if (ok) { S.fanfare(); S.crowd(true); } else S.fail();
    var btns = [];
    if (practice) {
      btns = [{ label: "Again", act: function () { beginEvent(evIndex); } }, { label: "Menu", act: toTitle }];
    } else if (ok) {
      total += pts; evPts[evIndex] = pts; updateStats();
      btns = [{ label: evIndex < 5 ? "Next event" : "To the cup", act: function () { if (evIndex < 5) beginEvent(evIndex + 1); else cup(); } }];
    } else {
      tries--; updateStats();
      if (tries > 0) btns = [{ label: "Try again (" + tries + " left)", act: function () { beginEvent(evIndex); } }, { label: "Menu", small: true, act: toTitle }];
      else { gameOver(); return; }
    }
    ui.menu({
      kicker: ev.name, title: ok ? "Qualified" : (ev === pull ? "Pulled over" : "Not qualified"),
      stats: '<b class="ff-score-xl">' + ev.fmt(v) + "</b>" + (newRec ? "<span>NEW RECORD</span>" : "<span>RECORD " + (rec(ev) != null ? ev.fmt(rec(ev)) : "-") + "</span>") + (!practice && ok ? "<span>+" + FF.n(pts) + " POINTS</span>" : "") + (ev !== pull ? "<span>QUALIFY " + ev.fmt(q) + "</span>" : ""),
      buttons: btns, solid: false
    });
  }
  function gameOver() {
    ui.runEnded();
    var best = total > save.cup; if (best) { save.cup = total; ui.persist(); }
    mode = "over"; A.playSong(SONG_TITLE);
    ui.menu({ title: "Sports day over", body: "Out of tries in the " + ev.name + ".", stats: '<b class="ff-score-xl">' + FF.n(total) + "</b><span>" + (best ? "NEW BEST TOTAL" : "BEST " + FF.n(save.cup)) + "</span><span>ROUND " + (round + 1) + "</span>",
      buttons: [{ label: "Play again", act: newGames }, { label: "Menu", act: toTitle }] });
  }
  var pausedAt = 0, pausedPt = 0, cupRank = 1, rivalsTot = [];
  function cup() {
    mode = "cup"; ph = "cup"; ui.stop(); A.playSong(SONG_CUP);
    var r = FF.rng(round * 31 + 5);
    var base = 4200 + round * 900;
    rivalsTot = [{ n: "Gull Harrow", v: Math.round(base + r() * 1200) }, { n: "Tamsin Marsh", v: Math.round(base - 600 + r() * 1300) }];
    var all = rivalsTot.concat([{ n: "Renna Vale", v: total, me: 1 }]).sort(function (a, b) { return b.v - a.v; });
    cupRank = all.findIndex(function (x) { return x.me; }) + 1;
    save.rounds = Math.max(save.rounds, round + 1);
    var best = total > save.cup; if (best) save.cup = total;
    ui.persist();
    var medal = ["Gold", "Silver", "Bronze"][cupRank - 1];
    ui.menu({
      kicker: "Round " + (round + 1) + " · the Wharf Cup", title: medal + " cup",
      html: '<table class="ff-table">' + all.map(function (x, i) { return "<tr><td>" + (i + 1) + ". " + x.n + "</td><td>" + FF.n(x.v) + "</td></tr>"; }).join("") + "</table>",
      stats: best ? "<span>NEW BEST TOTAL</span>" : "<span>BEST " + FF.n(save.cup) + "</span>",
      buttons: [{ label: "Round " + (round + 2) + " (harder)", act: function () { round++; beginEvent(0); } }, { label: "Menu", act: toTitle }], solid: false
    });
    ui.runEnded();
  }
  function newGames() { practice = false; round = 0; tries = 3; total = 0; evPts = []; mode = "event"; beginEvent(0); }
  function practiceMenu() {
    ui.menu({ title: "Practice", body: "Pick an event. Records count, points don't.",
      buttons: EVENTS.map(function (e, i) { return { label: e.name, small: true, act: function () { practice = true; round = 0; total = 0; mode = "event"; beginEvent(i); } }; }).concat([{ label: "Back", act: toTitle }]) });
  }
  function records() {
    ui.menu({ title: "Records", html: '<table class="ff-table">' + EVENTS.map(function (e) { var v = rec(e); return "<tr><td>" + e.name + "</td><td>" + (v != null ? e.fmt(v) : "-") + "</td></tr>"; }).join("") +
      "<tr><td>Best total</td><td>" + (save.cup ? FF.n(save.cup) : "-") + "</td></tr><tr><td>Rounds cleared</td><td>" + save.rounds + "</td></tr></table>",
      buttons: [{ label: "Back", act: toTitle }] });
  }
  function toTitle() {
    ui.stop(); mode = "title"; ev = null; practice = false; A.playSong(SONG_TITLE);
    ui.setCourse("Sports day"); ui.setPadLabel("A", "Go"); ui.padsOnly(null); total = 0; tries = 3; updateStats();
    ui.menu({ title: "WHARF GAMES", body: "Renna Vale's waterside sports day", stats: "<span>BEST TOTAL " + (save.cup ? FF.n(save.cup) : "-") + "</span>",
      buttons: [{ label: "Play", act: newGames }, { label: "Practice", act: practiceMenu }, { label: "Records", small: true, act: records }], app: true,
      help: ["Run: tap the two Run pads one after the other (or ← →).", "Action: the right pad (or Space). It changes for each event.", "Six events. Make the qualifying mark or lose a try."],
      fine: "A Forest Forge game", solid: false });
  }
  ui.onAdsRemoved = function () { if (mode === "title") toTitle(); };

  var game = {
    toTitle: toTitle,
    onPause: function () { pausedAt = A.ctx ? A.ctx.currentTime : 0; pausedPt = performance.now() / 1000; },
    onResume: function () { if (ev === rivet && K.pt0) K.pt0 += performance.now() / 1000 - pausedPt; },
    onBack: function () { if (mode === "title") return "exit"; toTitle(); return "menu"; },
    onPress: function (id) { if (ev && ev.press) ev.press(id); },
    onRelease: function (id) { if (ev && ev.release) ev.release(id); },
    onResize: sizeLo,
    update: function (dt) {
      phT += dt;
      if (ph === "ready") {
        var n = Math.floor(phT / 0.6);
        if (n > lastBeep && n <= 3) { lastBeep = n; S.beep(n === 3); if (n === 3) { ph = "go"; phT = 0; if (ev === dash || ev === plank) S.crowd(false); if (ev !== rivet) A.playSong(SONG_EVENT); } }
        if (phT === dt) { S.beep(false); }
      } else if (ph === "go") ev.update(dt);
      else if (ph === "done") { if (phT > 1.3) { A.stopSong(); showResult(); } }
      floaters.forEach(function (f) { f.life -= dt; f.y -= dt * 14; });
      floaters = floaters.filter(function (f) { return f.life > 0; });
      flash = Math.max(0, flash - dt);
    },
    idle: function (dt) { if (mode === "title" || mode === "cup") phT += dt; },
    render: function (c, t) {
      if (!W) sizeLo();
      if (ev) ev.draw(t);
      else titleScene(t);
      if (flash > 0) R(0, 0, W, H, "rgba(255,240,200," + flash * 2 + ")");
      floaters.forEach(function (f) { g.fillStyle = f.c; g.font = "bold 8px monospace"; g.textAlign = "center"; g.fillText(f.t, f.x, f.y); g.textAlign = "left"; });
      polish();
      c.drawImage(lo, 0, 0, W * PX, H * PX);
      if (ev && !ui.menuOpen) {
        evTitle(); ev.hud();
        if (ph === "ready") { var n = Math.floor(phT / 0.6); ui.text(["Ready", "Set", "Set", "GO!"][Math.min(3, n)], ui.VW / 2, ui.VH * 0.24, 34, "#ffe3a0", "center", "#ff9a2a"); }
        if (ph === "go" && phT < 0.5 && ev.press) ui.text("GO!", ui.VW / 2, ui.VH * 0.24, 34, "#ffe3a0", "center", "#ff9a2a");
      }
    }
  };
  function titleScene(t) {
    var hz = H * 0.3, qy = H * 0.5;
    harbour(t * 20, hz, qy, t);
    var x = ((t * 40) % (W + 60)) - 30, ph2 = t * 12;
    figure(x, qy + 26 + runBob(ph2, 8), runPose(ph2, 8), PAL.renna);
  }
  // QA hooks (only with ?qa)
  game.qa = { begin: function (i) { practice = true; mode = "event"; beginEvent(i); ui.go(); }, ev: function () { return ev && ev.short; }, ph: function () { return ph; }, state: function () { return { D: D, P: P, T: T, B: B, K: K, Q: Q }; }, finish: finish };
  ui.start(game);
})();
