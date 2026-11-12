/* polish.js (Forest Forge): shared graphics polish for the platform games.
 * Richer parallax skies, shaded/outlined tiles, sprite outline layer, lights, ambient particles,
 * vignette and iris transitions. All drawn in code. Load after platform.js (optional). */
(function () {
  function hx(c) { if (c && c.slice(0, 3) === "rgb") return c.match(/[\d.]+/g).slice(0, 3).map(Number); if (!c || c[0] !== "#") return [128, 128, 128]; if (c.length === 4) c = "#" + c[1] + c[1] + c[2] + c[2] + c[3] + c[3]; var n = parseInt(c.slice(1, 7), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function rgb(a, al) { return al == null ? "rgb(" + (a[0] | 0) + "," + (a[1] | 0) + "," + (a[2] | 0) + ")" : "rgba(" + (a[0] | 0) + "," + (a[1] | 0) + "," + (a[2] | 0) + "," + al + ")"; }
  function mix(c1, c2, k) { var a = hx(c1), b = hx(c2); return rgb([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]); }
  function shade(c, k) { return k < 0 ? mix(c, "#000000", -k) : mix(c, "#ffffff", k); }
  function toHex(c) { if (c[0] === "#") return c; var m = c.match(/\d+/g); return "#" + m.slice(0, 3).map(function (v) { return ("0" + (+v).toString(16)).slice(-2); }).join(""); }
  function hash(x, y, s) { var n = (x * 374761393 + y * 668265263 + (s || 0) * 1442695041) >>> 0; n = (n ^ (n >> 13)) * 1274126177 >>> 0; return (n ^ (n >> 16)) / 4294967296; }
  var cache = {};
  function canvas(key, w, h) { var c = cache[key]; if (!c || c.width !== w || c.height !== h) { c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").imageSmoothingEnabled = false; cache[key] = c; } return c; }

  // ---------- skies and parallax ----------
  function cloud(g, x, y, s, col, shadow) {
    var puffs = [[0, 0, 1], [0.9, -0.35, 0.8], [1.8, 0, 0.9], [-0.8, 0.15, 0.7], [2.6, 0.2, 0.6]];
    g.fillStyle = shadow; puffs.forEach(function (p) { g.beginPath(); g.arc(x + p[0] * s, y + p[1] * s + s * 0.25, p[2] * s, 0, 7); g.fill(); });
    g.fillStyle = col; puffs.forEach(function (p) { g.beginPath(); g.arc(x + p[0] * s, y + p[1] * s, p[2] * s, 0, 7); g.fill(); });
  }
  function ridge(g, W, H, cam, col, par, base, amp, freq, seed, rim) {
    var y0 = base - cam.y * par * 0.3, gr = g.createLinearGradient(0, y0 - amp, 0, H); gr.addColorStop(0, col); gr.addColorStop(1, shade(toHex(col), -0.35)); g.fillStyle = gr;
    var top = [];
    for (var x = 0; x <= W; x += 2) { var wx = x + cam.x * par; var hh = amp * (0.55 + 0.3 * Math.sin(wx * freq + seed) + 0.15 * Math.sin(wx * freq * 2.9 + seed * 2) + 0.08 * Math.sin(wx * freq * 7.3)); top.push(Math.round(y0 - hh)); g.fillRect(x, Math.round(y0 - hh), 2, H); }
    if (rim) { g.fillStyle = rim; for (var i = 0; i < top.length; i++) g.fillRect(i * 2, top[i], 2, 1); }
  }
  function drawBack(g, th, cam, W, H, t) {
    var s0 = th.sky[0], s1 = th.sky[1], gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, shade(s0, -0.12)); gr.addColorStop(0.45, s0); gr.addColorStop(0.85, s1); gr.addColorStop(1, shade(s1, 0.25));
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    if (th.stars) for (var s = 0; s < 70; s++) { var tw = 0.5 + 0.5 * Math.sin(t * 2 + s * 1.7); g.fillStyle = "rgba(255,255,240," + (0.25 + tw * 0.6).toFixed(2) + ")"; var sx = ((s * 71 - cam.x * 0.04) % W + W) % W, sy = (s * 37 + s * s) % (H * 0.6); g.fillRect(sx, sy, 1, 1); if (s % 9 === 0 && tw > 0.8) { g.fillRect(sx - 1, sy, 3, 1); g.fillRect(sx, sy - 1, 1, 3); } }
    var sunX = W * 0.76 - cam.x * 0.02, sunY = H * 0.2;
    var glow = g.createRadialGradient(sunX, sunY, 2, sunX, sunY, H * 0.55); glow.addColorStop(0, "rgba(255,250,220,0.55)"); glow.addColorStop(0.25, "rgba(255,240,200,0.18)"); glow.addColorStop(1, "rgba(255,240,200,0)"); g.fillStyle = glow; g.fillRect(0, 0, W, H);
    if (th.sun) { g.fillStyle = th.sun; g.beginPath(); g.arc(sunX, sunY, 11, 0, 7); g.fill(); g.fillStyle = "rgba(255,255,255,0.6)"; g.beginPath(); g.arc(sunX - 3, sunY - 3, 4, 0, 7); g.fill(); }
    if (!th.noClouds) for (var cl = 0; cl < 2; cl++) { var par = cl ? 0.12 : 0.05, sc = cl ? 9 : 6, n = cl ? 4 : 6;
      for (var k = 0; k < n; k++) { var span = W + 160, cx = ((k * 197 + cl * 61 - cam.x * par + t * (cl ? 6 : 3)) % span + span) % span - 80, cy = H * (0.12 + 0.1 * cl) + (k % 3) * 9 - cam.y * par * 0.2;
        cloud(g, cx, cy, sc, th.stars ? "rgba(200,190,255,0.22)" : "rgba(255,255,255,0.85)", th.stars ? "rgba(0,0,0,0)" : mix(s1, "#000000", 0.08).replace("rgb", "rgba").replace(")", ",0.35)")); } }
    var far = th.far || mix(s0, s1, 0.6), near = th.near || far;
    ridge(g, W, H, cam, mix(far, s1, 0.55), 0.08, H * 0.6, 34, 0.009, 1.3, null);
    ridge(g, W, H, cam, far, 0.18, H * 0.66, 28, 0.014, 2.1, mix(far, "#ffffff", 0.3));
    ridge(g, W, H, cam, mix(far, near, 0.5), 0.28, H * 0.74, 22, 0.022, 3.7, mix(mix(far, near, 0.5), "#ffffff", 0.25));
    if (th.near) ridge(g, W, H, cam, near, 0.42, H * 0.84, 18, 0.03, 5.2, mix(near, "#ffffff", 0.3));
    var mist = g.createLinearGradient(0, H * 0.6, 0, H); mist.addColorStop(0, "rgba(255,255,255,0)"); mist.addColorStop(1, "rgba(255,255,255,0.10)"); g.fillStyle = mist; g.fillRect(0, H * 0.6, W, H * 0.4);
    if (th.trees) { for (var tr = 0; tr < 14; tr++) { var tx = ((tr * 61 - cam.x * 0.55) % (W + 80) + W + 80) % (W + 80) - 40, ty = H * 0.8 - cam.y * 0.2; g.fillStyle = shade(th.trees, -0.3); g.fillRect(tx + 6, ty - 4, 3, 30); g.fillStyle = th.trees; g.beginPath(); g.arc(tx + 7, ty - 14, 9, 0, 7); g.fill(); g.fillStyle = shade(th.trees, 0.2); g.beginPath(); g.arc(tx + 4, ty - 17, 4, 0, 7); g.fill(); } }
  }

  // ---------- tiles: original look + bevel, outline, ambient occlusion, swaying grass ----------
  var baseTiles = window.PF && PF.drawTiles;
  function drawTiles(g, L, th, cam, W, H, t) {
    if (baseTiles) baseTiles(g, L, th, cam, W, H, t);
    var TS = PF.TS, x0 = Math.floor(cam.x / TS), x1 = Math.ceil((cam.x + W) / TS), y0 = Math.floor(cam.y / TS), y1 = Math.ceil((cam.y + H) / TS);
    var solid = function (c) { return c === "#" || c === "d" || c === "B" || c === "K" || c === "I"; };
    var line = th.outline || "rgba(10,8,30,0.55)", hi = "rgba(255,255,255,0.16)", lo = "rgba(0,0,0,0.18)", grass = th.top || "#7ad83a";
    for (var ty = y0; ty <= y1; ty++) for (var tx = x0; tx <= x1; tx++) {
      if (ty >= L.h || tx < 0 || tx >= L.w) continue;
      var c = L.get(tx, ty), sx = Math.round(tx * TS - cam.x), sy = Math.round(ty * TS - cam.y);
      if (solid(c)) {
        var up = L.get(tx, ty - 1), dn = L.get(tx, ty + 1), lf = L.get(tx - 1, ty), rt = L.get(tx + 1, ty);
        g.fillStyle = lo; g.fillRect(sx, sy + TS - 2, TS, 2); g.fillRect(sx + TS - 1, sy, 1, TS);
        g.fillStyle = hi; if (!solid(lf)) g.fillRect(sx + 1, sy, 1, TS);
        g.fillStyle = line; if (!solid(up)) g.fillRect(sx, sy - 1, TS, 1); if (!solid(lf)) g.fillRect(sx - 1, sy, 1, TS); if (!solid(rt)) g.fillRect(sx + TS, sy, 1, TS); if (!solid(dn) && dn !== undefined) g.fillRect(sx, sy + TS, TS, 1);
        if (c === "#" && (up === " " || up === undefined)) {
          g.fillStyle = "rgba(0,0,0,0.22)"; g.fillRect(sx, sy + 5, TS, 2);
          g.fillStyle = grass; for (var b = 0; b < 3; b++) { var bh = hash(tx, b, 7); if (bh < 0.55) continue; var sw = Math.round(Math.sin(t * 2.2 + tx * 0.7 + b) * 1); g.fillRect(sx + 2 + b * 5 + sw, sy - 2 - Math.round(bh * 2), 1, 2 + Math.round(bh * 2)); }
          g.fillStyle = "rgba(255,255,255,0.28)"; g.fillRect(sx, sy, TS, 1);
        }
      } else if (c === "=") { g.fillStyle = line; g.fillRect(sx, sy - 1, TS, 1); g.fillRect(sx, sy + 5, TS, 1); g.fillStyle = "rgba(255,255,255,0.3)"; g.fillRect(sx, sy, TS, 1); g.fillStyle = "rgba(0,0,0,0.18)"; g.fillRect(sx, sy + 6, TS, 2); }
      else if (c === "^") { g.fillStyle = "rgba(255,255,255,0.5)"; for (var s2 = 0; s2 < 4; s2++) g.fillRect(sx + s2 * 4 + 1, sy + 7 + (s2 % 2) * 2, 1, 1); }
    }
  }

  // ---------- sprite outline layer: draw sprites into the layer, then flush with a dark outline + drop shadow ----------
  function layer(W, H) { var c = canvas("layer", W, H), x = c.getContext("2d"); x.clearRect(0, 0, W, H); return x; }
  function flush(g, col, shadow) {
    var c = cache.layer; if (!c) return; var W = c.width, H = c.height, s = canvas("sil", W, H), x = s.getContext("2d");
    x.clearRect(0, 0, W, H); x.globalCompositeOperation = "source-over"; x.drawImage(c, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = col || "#140c28"; x.fillRect(0, 0, W, H); x.globalCompositeOperation = "source-over";
    if (shadow !== false) { g.globalAlpha = 0.28; g.drawImage(s, 1, 2); g.globalAlpha = 1; }
    g.drawImage(s, -1, 0); g.drawImage(s, 1, 0); g.drawImage(s, 0, -1); g.drawImage(s, 0, 1); g.drawImage(c, 0, 0);
    // rim light: a 1px light edge from the top-left
    x.clearRect(0, 0, W, H); x.drawImage(c, 0, 0); x.globalCompositeOperation = "destination-out"; x.drawImage(c, 1, 1); x.globalCompositeOperation = "source-in"; x.fillStyle = "rgba(255,255,255,0.35)"; x.fillRect(0, 0, W, H); x.globalCompositeOperation = "source-over"; g.drawImage(s, 0, 0);
  }

  // ---------- light, particles, vignette, transitions ----------
  function glow(g, x, y, r, col, a) { var gr = g.createRadialGradient(x, y, 0, x, y, r), c = hx(col); gr.addColorStop(0, rgb(c, a == null ? 0.5 : a)); gr.addColorStop(1, rgb(c, 0)); g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore(); }
  function ambient(g, W, H, cam, t, kind, col, n) {
    n = n || 26; g.fillStyle = col || "rgba(255,255,255,0.7)";
    for (var i = 0; i < n; i++) { var r1 = hash(i, 1, 3), r2 = hash(i, 2, 5), sp = 6 + r2 * 14, par = 0.3 + r1 * 0.5, x, y, sz = r1 > 0.8 ? 2 : 1;
      if (kind === "rise") { x = ((r1 * W * 3 - cam.x * par + Math.sin(t + i) * 6) % W + W) % W; y = ((r2 * H * 2 - t * sp - cam.y * par) % H + H) % H; }
      else if (kind === "snow" || kind === "fall") { x = ((r1 * W * 3 - cam.x * par + Math.sin(t * 0.8 + i) * 10) % W + W) % W; y = ((r2 * H * 2 + t * sp - cam.y * par) % H + H) % H; }
      else { x = ((r1 * W * 3 - cam.x * par + t * sp) % W + W) % W; y = ((r2 * H * 1.3 + Math.sin(t * 0.7 + i * 2) * 8 - cam.y * par) % H + H) % H; }
      g.globalAlpha = 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(t * 3 + i)); g.fillRect(Math.round(x), Math.round(y), sz, sz); }
    g.globalAlpha = 1;
  }
  function vignette(g, W, H, a) { var c = canvas("vig" + (a || 0.45), W, H); if (!c.done) { var x = c.getContext("2d"), gr = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75); gr.addColorStop(0, "rgba(0,0,10,0)"); gr.addColorStop(1, "rgba(0,0,20," + (a || 0.45) + ")"); x.fillStyle = gr; x.fillRect(0, 0, W, H); c.done = 1; } g.drawImage(c, 0, 0); }
  function iris(g, W, H, k, cx, cy) { if (k <= 0) return; if (k >= 1) { g.fillStyle = "#0a0614"; g.fillRect(0, 0, W, H); return; } var r = Math.hypot(W, H) * (1 - k); g.save(); g.fillStyle = "#0a0614"; g.beginPath(); g.rect(0, 0, W, H); g.arc(cx == null ? W / 2 : cx, cy == null ? H / 2 : cy, Math.max(0, r), 0, 7, true); g.fill("evenodd"); g.restore(); }
  function shadow(g, x, y, w) { g.fillStyle = "rgba(0,0,20,0.25)"; g.beginPath(); g.ellipse(x, y, w / 2, Math.max(1.5, w / 6), 0, 0, 7); g.fill(); }
  function burst(list, x, y, n, cols, sp, life) { for (var i = 0; i < n; i++) { var a = Math.random() * 6.283, v = (0.3 + Math.random() * 0.7) * (sp || 80); list.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: (life || 0.6) * (0.6 + Math.random() * 0.6), t: 0, c: cols[i % cols.length] }); } }
  function stepBurst(list, dt) { for (var i = list.length - 1; i >= 0; i--) { var p = list[i]; p.t += dt; p.vy += 220 * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.t > p.life) list.splice(i, 1); } }
  function drawBurst(g, list, cam) { list.forEach(function (p) { var k = 1 - p.t / p.life; g.globalAlpha = Math.max(0, k); g.fillStyle = p.c; var s = k > 0.5 ? 2 : 1; g.fillRect(Math.round(p.x - cam.x), Math.round(p.y - cam.y), s, s); }); g.globalAlpha = 1; }
  // bold title text with outline + drop shadow, for in-canvas banners
  function banner(g, text, x, y, size, fill, edge) { g.save(); g.font = "bold " + size + "px 'Trebuchet MS', Verdana, sans-serif"; g.textAlign = "center"; g.lineJoin = "round"; g.lineWidth = Math.max(2, size / 5); g.strokeStyle = "rgba(0,0,20,0.5)"; g.strokeText(text, x + 1, y + 2); g.strokeStyle = edge || "#1a0e30"; g.strokeText(text, x, y); var gr = g.createLinearGradient(0, y - size, 0, y); gr.addColorStop(0, "#ffffff"); gr.addColorStop(1, fill || "#ffd23a"); g.fillStyle = gr; g.fillText(text, x, y); g.restore(); }

  window.FXP = { mix: mix, shade: shade, drawBack: drawBack, drawTiles: drawTiles, layer: layer, flush: flush, glow: glow, ambient: ambient, vignette: vignette, iris: iris, shadow: shadow, burst: burst, stepBurst: stepBurst, drawBurst: drawBurst, banner: banner, cloud: cloud, ridge: ridge, hash: hash };
  if (window.PF) { PF.drawBackFlat = PF.drawBack; PF.drawTilesFlat = PF.drawTiles; PF.drawBack = drawBack; PF.drawTiles = drawTiles; }
})();
