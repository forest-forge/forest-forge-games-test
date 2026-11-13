/* Forest Forge platform engine (Nettle Run, Kilnbound). Plain JS, no build step.
 * Tile maps from strings, AABB-vs-tile physics with one-way platforms, slopes-free
 * classic feel (coyote time, jump buffer, variable jump), a follow camera,
 * themed tile drawing into a low-res buffer, pixel bitmaps, a limb-figure
 * renderer for the heroes, particles. Game rules live in each game.js. */
(function () {
  "use strict";
  var TS = 16;
  // tile flags: games may extend PF.TILES before building levels
  var TILES = {
    "#": { solid: 1 }, "=": { oneway: 1 }, "^": { hurt: 1 }, "w": { water: 1 }, "R": { solid: 0, rock: 1 },
    "d": { solid: 1, dig: 1 }, "L": { lava: 1 }, "K": { solid: 1, kiln: 1 }, "I": { solid: 1, ice: 1 }, "B": { solid: 1, brick: 1 }
  };
  function Level(rows, opts) {
    opts = opts || {};
    var h = rows.length, w = 0, i;
    for (i = 0; i < h; i++) w = Math.max(w, rows[i].length);
    var grid = [], ents = [];
    for (var y = 0; y < h; y++) {
      var row = [];
      for (var x = 0; x < w; x++) {
        var c = rows[y][x] || " ";
        if (TILES[c]) row.push(c);
        else { row.push(" "); if (c !== " " && c !== ".") ents.push({ ch: c, tx: x, ty: y, x: x * TS, y: y * TS }); }
      }
      grid.push(row);
    }
    var L = { w: w, h: h, pw: w * TS, ph: h * TS, grid: grid, ents: ents, theme: opts.theme, seed: opts.seed || 1 };
    L.get = function (tx, ty) { if (tx < 0 || tx >= w) return opts.wallEdges === false ? " " : "#"; if (ty < 0) return " "; if (ty >= h) return opts.pit === false ? "#" : " "; return grid[ty][tx]; };
    L.set = function (tx, ty, c) { if (tx >= 0 && tx < w && ty >= 0 && ty < h) grid[ty][tx] = c; };
    L.flag = function (tx, ty, f) { var t = TILES[L.get(tx, ty)]; return !!(t && t[f]); };
    L.solid = function (tx, ty) { return L.flag(tx, ty, "solid") && !(L.passable && L.passable(L.get(tx, ty))); };
    return L;
  }
  function overlapTiles(L, b, fn) {
    var x0 = Math.floor(b.x / TS), x1 = Math.floor((b.x + b.w - 0.01) / TS), y0 = Math.floor(b.y / TS), y1 = Math.floor((b.y + b.h - 0.01) / TS);
    for (var ty = y0; ty <= y1; ty++) for (var tx = x0; tx <= x1; tx++) fn(L.get(tx, ty), tx, ty);
  }
  // move a body {x,y,w,h,vx,vy}; returns {ground, wallL, wallR, ceil}
  function move(L, b, dt) {
    var res = { ground: false, wallL: false, wallR: false, ceil: false, tileX: null };
    var dx = b.vx * dt, dy = b.vy * dt, steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 6) || 1;
    for (var s = 0; s < steps; s++) {
      // x
      b.x += dx / steps;
      var x0 = Math.floor(b.y / TS), x1 = Math.floor((b.y + b.h - 0.01) / TS);
      if (dx > 0) { var tx = Math.floor((b.x + b.w) / TS); for (var ty = x0; ty <= x1; ty++) if (L.solid(tx, ty)) { b.x = tx * TS - b.w; b.vx = 0; res.wallR = true; res.tileX = [tx, ty]; break; } }
      else if (dx < 0) { var tx2 = Math.floor(b.x / TS); for (var ty2 = x0; ty2 <= x1; ty2++) if (L.solid(tx2, ty2)) { b.x = (tx2 + 1) * TS; b.vx = 0; res.wallL = true; res.tileX = [tx2, ty2]; break; } }
      // y
      var prevBottom = b.y + b.h;
      b.y += dy / steps;
      var c0 = Math.floor(b.x / TS), c1 = Math.floor((b.x + b.w - 0.01) / TS);
      if (dy > 0) {
        var ty3 = Math.floor((b.y + b.h) / TS);
        for (var tx3 = c0; tx3 <= c1; tx3++) {
          var one = L.flag(tx3, ty3, "oneway") && prevBottom <= ty3 * TS + 0.5 && !b.dropThrough;
          if (L.solid(tx3, ty3) || one) { b.y = ty3 * TS - b.h; b.vy = 0; res.ground = true; res.groundTile = L.get(tx3, ty3); break; }
        }
      } else if (dy < 0) {
        var ty4 = Math.floor(b.y / TS);
        for (var tx4 = c0; tx4 <= c1; tx4++) if (L.solid(tx4, ty4)) { b.y = (ty4 + 1) * TS; b.vy = 0; res.ceil = true; res.ceilTile = [tx4, ty4]; break; }
      }
    }
    // standing check (for when vy is 0)
    if (!res.ground && b.vy >= 0) {
      var by = Math.floor((b.y + b.h + 0.5) / TS);
      for (var tx5 = Math.floor(b.x / TS); tx5 <= Math.floor((b.x + b.w - 0.01) / TS); tx5++) if (L.solid(tx5, by) || (L.flag(tx5, by, "oneway") && Math.abs(b.y + b.h - by * TS) < 0.6 && !b.dropThrough)) { res.ground = true; res.groundTile = L.get(tx5, by); }
    }
    return res;
  }
  function touching(L, b, flag) { var hit = false; overlapTiles(L, b, function (c) { var t = TILES[c]; if (t && t[flag]) hit = true; }); return hit; }
  function aabb(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

  // ---------- camera ----------
  function Camera() { return { x: 0, y: 0, look: 0 }; }
  function follow(cam, L, b, W, H, dt, opts) {
    opts = opts || {};
    cam.look += ((b.vx > 20 ? 1 : b.vx < -20 ? -1 : 0) * W * 0.12 - cam.look) * Math.min(1, dt * 2);
    var tx = b.x + b.w / 2 - W / 2 + cam.look, ty = b.y + b.h / 2 - H * 0.55;
    if (opts.forwardOnly) tx = Math.max(tx, cam.x);
    cam.x += (tx - cam.x) * Math.min(1, dt * 8); cam.y += (ty - cam.y) * Math.min(1, dt * 5);
    cam.x = Math.max(0, Math.min(L.pw - W, cam.x)); cam.y = Math.max(0, Math.min(L.ph - H, cam.y));
    if (L.pw < W) cam.x = (L.pw - W) / 2; if (L.ph < H) cam.y = L.ph - H;
  }

  // ---------- drawing ----------
  function bmp(rows, pal, scale) {
    var h = rows.length, w = 0; for (var k = 0; k < h; k++) w = Math.max(w, rows[k].length);
    var c = document.createElement("canvas"); c.width = w; c.height = h; var x = c.getContext("2d");
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) { var ch = rows[j][i]; if (ch && ch !== "." && ch !== " " && pal[ch]) { x.fillStyle = pal[ch]; x.fillRect(i, j, 1, 1); } }
    try { c._hd = scale2x(scale2x(c)); } catch (e) {}
    return c;
  }
  // Scale2x (EPX) pixel-art smoothing: rounds stair-step diagonals without inventing colours. Applied twice -> 4x.
  function scale2x(src) {
    var w = src.width, h = src.height, S = new Uint32Array(src.getContext("2d").getImageData(0, 0, w, h).data.buffer.slice(0));
    var out = document.createElement("canvas"); out.width = w * 2; out.height = h * 2;
    var ox = out.getContext("2d"), id = ox.createImageData(w * 2, h * 2), D = new Uint32Array(id.data.buffer), W2 = w * 2;
    function P(x, y) { return x < 0 || y < 0 || x >= w || y >= h ? 0 : S[y * w + x]; }
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var E = S[y * w + x], B = P(x, y - 1), Dd = P(x - 1, y), F = P(x + 1, y), Hh = P(x, y + 1), e0 = E, e1 = E, e2 = E, e3 = E;
      if (B !== Hh && Dd !== F) { if (Dd === B) e0 = Dd; if (B === F) e1 = F; if (Dd === Hh) e2 = Dd; if (Hh === F) e3 = F; }
      var o = y * 2 * W2 + x * 2; D[o] = e0; D[o + 1] = e1; D[o + W2] = e2; D[o + W2 + 1] = e3;
    }
    ox.putImageData(id, 0, 0); return out;
  }
  // canvases carrying a smoothed _hd twin are drawn from the twin when the target is scaled up (hi-res buffers)
  (function () {
    var P = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype; if (!P || P._hdPatched) return; P._hdPatched = 1;
    var DI = P.drawImage;
    P.drawImage = function (img, a, b, c, d, e, f, g, h) {
      var hd = img && img._hd; if (!hd) return DI.apply(this, arguments);
      var m = this.getTransform(); if (Math.abs(m.a) + Math.abs(m.b) < 1.5) return DI.apply(this, arguments);
      var k = hd.width / img.width, n = arguments.length;
      if (n === 3) return DI.call(this, hd, a, b, img.width, img.height);
      if (n === 5) return DI.call(this, hd, a, b, c, d);
      return DI.call(this, hd, a * k, b * k, c * k, d * k, e, f, g, h);
    };
  })();
  function flipped(img) { var c = document.createElement("canvas"); c.width = img.width; c.height = img.height; var x = c.getContext("2d"); x.translate(img.width, 0); x.scale(-1, 1); x.drawImage(img, 0, 0); if (img._hd) c._hd = flipped(img._hd); return c; }
  function hash(x, y, s) { var n = (x * 374761393 + y * 668265263 + (s || 0) * 1442695041) >>> 0; n = (n ^ (n >> 13)) * 1274126177 >>> 0; return (n ^ (n >> 16)) / 4294967296; }
  // theme: {sky:[top,bot], far, near, dirt, dirtD, top, topD, plank, water, waterHi, spike, rock, deco:[colors]}
  function drawBack(g, th, cam, W, H, t) {
    var gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, th.sky[0]); gr.addColorStop(1, th.sky[1]);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    if (th.stars) for (var s = 0; s < 40; s++) { g.fillStyle = s % 3 ? "#5a6080" : "#d0d8f0"; g.fillRect(((s * 71 - cam.x * 0.05) % W + W) % W, (s * 37) % (H * 0.6), 1, 1); }
    if (th.sun) { g.fillStyle = th.sun; g.beginPath(); g.arc(W * 0.78 - cam.x * 0.02, H * 0.22, 12, 0, 7); g.fill(); }
    var layers = [[th.far, 0.18, H * 0.55, 26, 0.013], [th.near, 0.4, H * 0.7, 18, 0.03]];
    for (var l = 0; l < layers.length; l++) {
      var L = layers[l]; if (!L[0]) continue; g.fillStyle = L[0];
      for (var x = 0; x < W; x += 2) { var wx = x + cam.x * L[1]; var hh = L[3] * (0.6 + 0.4 * Math.sin(wx * L[4]) + 0.25 * Math.sin(wx * L[4] * 2.7 + l)); g.fillRect(x, L[2] - hh - cam.y * L[1] * 0.3, 2, H); }
    }
    if (th.trees) { g.fillStyle = th.trees; for (var k = 0; k < 14; k++) { var tx = ((k * 61 - cam.x * 0.55) % (W + 80) + W + 80) % (W + 80) - 40, ty = H * 0.78 - cam.y * 0.2; g.fillRect(tx + 6, ty - 4, 3, 30); g.fillRect(tx, ty - 20, 15, 18); g.fillRect(tx + 3, ty - 26, 9, 8); } }
  }
  function drawTiles(g, L, th, cam, W, H, t) {
    var x0 = Math.floor(cam.x / TS), x1 = Math.ceil((cam.x + W) / TS), y0 = Math.floor(cam.y / TS), y1 = Math.ceil((cam.y + H) / TS);
    for (var ty = y0; ty <= y1; ty++) for (var tx = x0; tx <= x1; tx++) {
      var c = L.get(tx, ty); if (c === " ") continue;
      if (ty >= L.h || tx < 0 || tx >= L.w) continue;
      var sx = Math.round(tx * TS - cam.x), sy = Math.round(ty * TS - cam.y);
      drawTile(g, c, sx, sy, tx, ty, L, th, t);
    }
  }
  function drawTile(g, c, sx, sy, tx, ty, L, th, t) {
    var h = hash(tx, ty, L.seed), above = L.get(tx, ty - 1);
    if (c === "#" || c === "d" || c === "B" || c === "K" || c === "I") {
      var base = c === "d" ? th.soft || "#7a5a3a" : c === "K" ? "#8a3a22" : c === "I" ? "#a8d0e8" : c === "B" ? th.brick || "#6a5a50" : th.dirt;
      g.fillStyle = base; g.fillRect(sx, sy, TS, TS);
      g.fillStyle = c === "#" ? th.dirtD : "rgba(0,0,0,0.22)";
      if (c === "B" || c === "K") { g.fillRect(sx, sy + 7, TS, 1); g.fillRect(sx, sy + 15, TS, 1); g.fillRect(sx + (ty % 2 ? 4 : 11), sy, 1, 7); g.fillRect(sx + (ty % 2 ? 11 : 4), sy + 8, 1, 7); if (c === "K") { g.fillStyle = "rgba(255,140,40," + (0.2 + 0.15 * Math.sin(t * 3 + tx)) + ")"; g.fillRect(sx + 2, sy + 2, 12, 4); } }
      else if (c === "d") { for (var k = 0; k < 5; k++) g.fillRect(sx + Math.floor(hash(tx, ty, k) * 14), sy + Math.floor(hash(ty, tx, k) * 14), 2, 2); }
      else { for (var k2 = 0; k2 < 3; k2++) g.fillRect(sx + Math.floor(hash(tx, ty, k2 + 9) * 13), sy + 4 + Math.floor(hash(ty, tx, k2 + 9) * 10), 3, 2); }
      if (c === "#" && !TILES[above] || c === "#" && above === "w") {
        g.fillStyle = th.top; g.fillRect(sx, sy, TS, 4); g.fillStyle = th.topD; g.fillRect(sx, sy + 4, TS, 1);
        for (var b = 0; b < 4; b++) g.fillRect(sx + b * 4 + (h > 0.5 ? 1 : 2), sy + 4, 2, 2);
        if (th.deco && h > 0.72 && above === " ") { g.fillStyle = th.deco[Math.floor(h * 10) % th.deco.length]; g.fillRect(sx + 6, sy - 3, 3, 3); g.fillStyle = th.topD; g.fillRect(sx + 7, sy, 1, 1); }
        if (th.snowTop) { g.fillStyle = "#f4f8ff"; g.fillRect(sx, sy, TS, 3); }
      }
    } else if (c === "=") {
      g.fillStyle = th.plank || "#a8743a"; g.fillRect(sx, sy, TS, 4); g.fillStyle = "rgba(0,0,0,0.3)"; g.fillRect(sx, sy + 4, TS, 1); g.fillRect(sx + 7, sy, 1, 4);
    } else if (c === "^") {
      g.fillStyle = th.spike || "#3a8a3a";
      for (var s = 0; s < 4; s++) { g.fillRect(sx + s * 4 + 1, sy + 9, 2, 7); g.fillRect(sx + s * 4, sy + 12, 4, 4); g.fillRect(sx + s * 4 + 1, sy + 6 + (s % 2) * 2, 1, 3); }
      g.fillStyle = "#e8f0a0"; g.fillRect(sx + 2, sy + 7, 1, 1); g.fillRect(sx + 9, sy + 9, 1, 1);
    } else if (c === "w") {
      g.fillStyle = th.water || "#1a5a8a"; g.fillRect(sx, sy, TS, TS);
      if (L.get(tx, ty - 1) !== "w") { g.fillStyle = th.waterHi || "#6ab0e0"; var o = Math.floor(t * 8 + tx * 3) % 8; g.fillRect(sx, sy, TS, 2); g.fillRect(sx + o, sy + 3, 4, 1); }
    } else if (c === "L") {
      g.fillStyle = "#c83a10"; g.fillRect(sx, sy, TS, TS); g.fillStyle = "#ffb030"; var o2 = Math.floor(t * 6 + tx * 5) % 12; g.fillRect(sx + o2, sy + 2, 4, 2); g.fillRect(sx + (o2 + 7) % 14, sy + 8, 3, 2);
      if (L.get(tx, ty - 1) !== "L") { g.fillStyle = "#ffe060"; g.fillRect(sx, sy, TS, 2); }
    } else if (c === "R") {
      g.fillStyle = th.rock || "#6a6258"; g.fillRect(sx + 2, sy + 9, 12, 7); g.fillRect(sx + 4, sy + 7, 8, 2); g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(sx + 5, sy + 8, 4, 1);
    }
  }
  // limb figure (hero) at hip x,y in px; pose angles from straight down, +forward
  function hiRes(g) { var m = g.getTransform(); return Math.abs(m.a) + Math.abs(m.b) > 1.5; }
  function line(g, x0, y0, x1, y1, c, th) {
    if (hiRes(g)) { g.strokeStyle = c; g.lineWidth = th; g.lineCap = "round"; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); return; }
    g.fillStyle = c; var dx = x1 - x0, dy = y1 - y0, n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)))); for (var i = 0; i <= n; i++) g.fillRect(Math.round(x0 + dx * i / n - th / 2), Math.round(y0 + dy * i / n - th / 2), th, th); }
  function limb(g, x, y, a1, a2, l1, l2, c) { var kx = x + Math.sin(a1) * l1, ky = y + Math.cos(a1) * l1; line(g, x, y, kx, ky, c, 2); var fx = kx + Math.sin(a2) * l2, fy = ky + Math.cos(a2) * l2; line(g, kx, ky, fx, fy, c, 2); return [fx, fy]; }
  function figure(g, x, y, p, pal, flip, sc) {
    sc = sc || 1; var s = flip ? -1 : 1, Lr = p.lean * s, f = function (a) { return a * s; };
    var T = 6 * sc, LG = 4.5 * sc, AR = 3.5 * sc;
    var sx = x + Math.sin(Lr) * T, sy = y - Math.cos(Lr) * T;
    var HR = hiRes(g);
    function boot(pt) { g.fillStyle = pal.boot; if (HR) { g.beginPath(); g.ellipse(pt[0] + s * 0.8, pt[1], 2, 1.25, 0, 0, 7); g.fill(); } else g.fillRect(Math.round(pt[0] - 1 + s), Math.round(pt[1] - 1), 3, 2); }
    var bf = limb(g, x, y, f(p.tb), f(p.sb), LG, LG, pal.legD); boot(bf);
    limb(g, sx, sy + 1, f(p.ab), f(p.fb), AR, AR, pal.skinD);
    line(g, x, y, sx, sy, pal.top, 3 * sc > 3 ? 4 : 3);
    var hx = sx + Math.sin(Lr) * 3, hy = sy - Math.cos(Lr) * 3;
    if (HR) {
      var cx = hx + 0.5, cy = hy - 1.5;
      g.fillStyle = pal.skin; g.beginPath(); g.ellipse(cx, cy, 2.7, 2.9, 0, 0, 7); g.fill();
      g.fillStyle = pal.hair; g.beginPath(); g.ellipse(cx - s * 0.5, cy - 1.3, 2.9, 1.9, 0, Math.PI, 0); g.fill(); g.beginPath(); g.ellipse(cx - s * 2, cy - 0.3, 1.3, 2.1, 0, 0, 7); g.fill();
      if (pal.band) { g.strokeStyle = pal.band; g.lineWidth = 0.9; g.beginPath(); g.ellipse(cx, cy - 0.4, 2.8, 2.4, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); }
      g.fillStyle = "rgba(255,255,255,0.35)"; g.beginPath(); g.arc(cx + s * 0.9, cy - 0.2, 0.9, 0, 7); g.fill();
      g.fillStyle = "#1a1010"; g.beginPath(); g.arc(cx + s * 1.6, cy - 0.3, 0.6, 0, 7); g.fill();
    } else {
      g.fillStyle = pal.skin; g.fillRect(Math.round(hx - 2), Math.round(hy - 4), 5, 5);
      g.fillStyle = pal.hair; g.fillRect(Math.round(hx - 2 - s), Math.round(hy - 5), 5, 2); g.fillRect(Math.round(flip ? hx + 2 : hx - 3), Math.round(hy - 4), 2, 3);
      if (pal.band) { g.fillStyle = pal.band; g.fillRect(Math.round(hx - 2), Math.round(hy - 4), 5, 1); }
      g.fillStyle = "#1a1010"; g.fillRect(Math.round(hx + s * 2), Math.round(hy - 2), 1, 1);
    }
    var ff = limb(g, x, y, f(p.tf), f(p.sf), LG, LG, pal.leg); boot(ff);
    var hf = limb(g, sx, sy + 1, f(p.af), f(p.ff), AR, AR, pal.skin);
    return { hand: hf, head: [hx, hy] };
  }
  function runPose(ph, k) {
    var a = Math.min(1, k), s1 = Math.sin(ph), s2 = Math.sin(ph + Math.PI);
    return { lean: 0.1 + 0.15 * a, tf: 0.85 * a * s1, sf: 0.85 * a * s1 - (0.1 + 1.1 * a * Math.max(0, Math.cos(ph))), tb: 0.85 * a * s2, sb: 0.85 * a * s2 - (0.1 + 1.1 * a * Math.max(0, Math.cos(ph + Math.PI))), af: -0.8 * a * s1, ff: -0.8 * a * s1 + 1.4, ab: -0.8 * a * s2, fb: -0.8 * a * s2 + 1.4 };
  }
  var POSE = {
    stand: { lean: 0, tf: 0.08, sf: 0.08, tb: -0.08, sb: -0.08, af: 0.15, ff: 0.35, ab: -0.1, fb: 0.15 },
    jump: { lean: 0.15, tf: 1.0, sf: 0.1, tb: -0.4, sb: -0.9, af: -1.2, ff: -0.8, ab: 0.9, fb: 1.6 },
    fall: { lean: 0.05, tf: 0.5, sf: 0.2, tb: -0.3, sb: -0.5, af: -2.2, ff: -2.4, ab: 2.2, fb: 2.6 },
    throw: { lean: 0.25, tf: 0.5, sf: 0.2, tb: -0.5, sb: -0.4, af: 2.0, ff: 1.6, ab: -0.6, fb: 0 },
    hurt: { lean: -0.5, tf: 0.6, sf: 0.9, tb: 0.2, sb: 0.4, af: -2.4, ff: -2.6, ab: -2.0, fb: -2.2 },
    crouch: { lean: 0.5, tf: 1.4, sf: -0.4, tb: 1.0, sb: -0.6, af: 0.9, ff: 1.5, ab: 0.6, fb: 1.4 }
  };
  // particles
  function Parts() { var list = []; return {
    add: function (x, y, n, c, sp, life, grav) { for (var i = 0; i < n; i++) { var a = Math.random() * Math.PI * 2, v = (sp || 60) * (0.4 + Math.random() * 0.6); list.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (sp || 60) * 0.3, life: (life || 0.5) * (0.6 + Math.random() * 0.6), c: c, g: grav == null ? 300 : grav }); } },
    step: function (dt) { for (var i = list.length - 1; i >= 0; i--) { var p = list[i]; p.life -= dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.life <= 0) list.splice(i, 1); } },
    draw: function (g, cam) { var hr = hiRes(g); for (var i = 0; i < list.length; i++) { var p = list[i]; g.fillStyle = p.c; if (hr) { g.globalAlpha = Math.min(1, p.life * 4); g.beginPath(); g.arc(p.x - cam.x + 1, p.y - cam.y + 1, 1.2, 0, 7); g.fill(); } else g.fillRect(Math.round(p.x - cam.x), Math.round(p.y - cam.y), 2, 2); } g.globalAlpha = 1; },
    clear: function () { list.length = 0; }
  }; }
  window.PF = { TS: TS, TILES: TILES, Level: Level, move: move, touching: touching, overlapTiles: overlapTiles, aabb: aabb, Camera: Camera, follow: follow, bmp: bmp, flipped: flipped, hash: hash, drawBack: drawBack, drawTiles: drawTiles, figure: figure, runPose: runPose, POSE: POSE, Parts: Parts, line: line, scale2x: scale2x, hiRes: hiRes };
})();

/* ---- shared creatures (Nettle Run, Kilnbound) ----
 * PF.Foes.make(ch, x, y) -> foe or null; PF.Foes.step(f, L, dt, hero); PF.Foes.draw(g, f, cam, t)
 * Kinds: s snail, k frog, q bee, z bat, h hedgehog (spiky), p leaping fish (spiky), g ghost moth (flies through walls) */
(function () {
  var bmp = PF.bmp, flipped = PF.flipped, TS = PF.TS;
  function two(a, b, pal) { var A = bmp(a, pal), B = bmp(b, pal); return [A, B, flipped(A), flipped(B)]; }
  var ART = {
    s: two(["....aaa...", "...abbba..", "..abbcbba.", "d.abcbbba.", "dddddddddd", ".dddddddd."], ["....aaa...", "...abbba..", "..abbcbba.", ".dabcbbba.", "dddddddddd", "dddddddddd"], { a: "#8a5a2a", b: "#c88a3a", c: "#6a3a1a", d: "#b8c880" }),
    k: two(["..aa..aa..", ".abba.abb.", ".aaaaaaaa.", "aaabbbbaaa", "a.aaaaaa.a", "aa......aa"], ["..aa..aa..", ".abba.abb.", "aaaaaaaaaa", "aaabbbbaaa", ".aaaaaaaa.", "a........a"], { a: "#3a9a3a", b: "#1a1a1a" }),
    q: two(["..cc.cc..", "...cccc..", ".aabaaba.", "aabaabaab", ".aabaaba.", "...d....."], ["...c.c...", "..cc.cc..", ".aabaaba.", "aabaabaab", ".aabaaba.", "....d...."], { a: "#e8c030", b: "#2a2a2a", c: "#d8f0ff", d: "#2a2a2a" }),
    z: two(["a........a", "aa..bb..aa", "aaabccbaaa", ".aabbbbaa.", "...a..a..."], ["..........", "....bb....", "aaabccbaaa", "aaabbbbaaa", "a..a..a..a"], { a: "#5a3a6a", b: "#7a5a8a", c: "#ff3a3a" }),
    h: two(["..a.a.a...", ".aaaaaaa..", "aabababaa.", "abababaaac", "aaaaaaaacc", ".d.d..d.d."], [".a.a.a....", "aaaaaaaa..", "abababaaa.", "aabababaac", "aaaaaaaacc", "d.d..d.d.."], { a: "#6a4a2a", b: "#a8805a", c: "#f0c8a0", d: "#3a2a1a" }),
    p: two(["...aa.....", "..abba....", ".abbbba.aa", "abcbbbbaa.", ".abbbba.aa", "..aaaa...."], ["...aa.....", "..abba....", ".abbbbaaa.", "abcbbbba..", ".abbbbaaa.", "..aaaa...."], { a: "#c83a3a", b: "#ff7a5a", c: "#1a1a1a" }),
    g: two(["..aaaa..", ".abccba.", "abbccbba", "abbbbbba", ".a.aa.a.", "a......a"], ["..aaaa..", ".abccba.", "abbccbba", "abbbbbba", "a.a..a.a", "........"], { a: "#8ab0d8", b: "#c8e0f8", c: "#2a2a4a" })
  };
  var SIZE = { s: [10, 6], k: [10, 6], q: [9, 6], z: [10, 5], h: [10, 6], p: [10, 6], g: [8, 6] };
  var SPIKY = { h: 1, p: 1 };
  function make(ch, x, y) {
    if (!ART[ch]) return null;
    var sz = SIZE[ch], f = { kind: ch, x: x + (TS - sz[0]) / 2, y: y + TS - sz[1], w: sz[0], h: sz[1], vx: 0, vy: 0, dir: -1, t: Math.random() * 3, hx: x, hy: y, alive: true, spiky: !!SPIKY[ch], fly: ch === "q" || ch === "z" || ch === "g" };
    if (ch === "s") f.vx = -14; if (ch === "h") f.vx = -24; if (ch === "p") { f.y = y; f.hy = y; }
    if (ch === "z") f.y = y; if (ch === "q" || ch === "g") f.y = y + 2;
    return f;
  }
  function step(f, L, dt, hero) {
    f.t += dt;
    var dx = hero.x - f.x, dy = hero.y - f.y;
    if (f.kind === "s" || f.kind === "h") {
      f.vy = Math.min(400, f.vy + 900 * dt);
      var r = PF.move(L, f, dt);
      if (r.wallL || r.wallR) { f.dir = -f.dir; }
      // turn at ledges
      var ahead = Math.floor((f.dir < 0 ? f.x - 1 : f.x + f.w + 1) / TS), below = Math.floor((f.y + f.h + 2) / TS);
      if (r.ground && !L.solid(ahead, below) && !L.flag(ahead, below, "oneway")) f.dir = -f.dir;
      f.vx = f.dir * (f.kind === "s" ? 14 : 26);
    } else if (f.kind === "k") {
      f.vy = Math.min(400, f.vy + 900 * dt);
      var r2 = PF.move(L, f, dt);
      if (r2.ground) { f.vx = 0; if (f.t > 1.4 && Math.abs(dx) < 140) { f.t = 0; f.dir = dx < 0 ? -1 : 1; f.vx = f.dir * 60; f.vy = -230; } }
    } else if (f.kind === "q") {
      f.x = f.hx + Math.sin(f.t * 1.3) * 34; f.y = f.hy + Math.sin(f.t * 4) * 6; f.dir = Math.cos(f.t * 1.3) < 0 ? -1 : 1;
    } else if (f.kind === "z") {
      if (!f.swoop && Math.abs(dx) < 80 && dy > 0) { f.swoop = 1; f.st = f.t; f.dir = dx < 0 ? -1 : 1; }
      if (f.swoop) { var u = f.t - f.st; f.x += f.dir * 70 * dt; f.y = f.hy + Math.sin(Math.min(Math.PI, u * 2.2)) * 50; if (u > 1.6) { f.swoop = 0; f.hy = f.y; } }
    } else if (f.kind === "p") {
      if (!f.jump && f.t > 2.2) { f.jump = 1; f.vy = -300; f.t = 0; }
      if (f.jump) { f.vy += 700 * dt; f.y += f.vy * dt; if (f.y >= f.hy && f.vy > 0) { f.y = f.hy; f.jump = 0; } }
    } else if (f.kind === "g") {
      var d = Math.hypot(dx, dy) || 1; f.x += dx / d * 22 * dt; f.y += dy / d * 22 * dt + Math.sin(f.t * 3) * 0.3; f.dir = dx < 0 ? -1 : 1;
    }
    if (f.kind !== "q" && f.kind !== "g" && f.kind !== "p" && f.kind !== "z" && f.vx) f.dir = f.vx < 0 ? -1 : 1;
    if (f.y > L.ph + 40) f.alive = false;
  }
  function draw(g, f, cam, t) {
    var a = ART[f.kind], fr = Math.floor(t * 6 + f.hx) % 2 + (f.dir > 0 ? 2 : 0);
    if (f.kind === "p" && !f.jump) return;
    g.drawImage(a[fr], Math.round(f.x - cam.x), Math.round(f.y - cam.y));
  }
  PF.Foes = { make: make, step: step, draw: draw, ART: ART };
})();
