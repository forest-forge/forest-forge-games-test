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
    for (var x = 0; x <= W + 2; x += 2) { var wx = x + cam.x * par; var hh = amp * (0.55 + 0.3 * Math.sin(wx * freq + seed) + 0.15 * Math.sin(wx * freq * 2.9 + seed * 2) + 0.08 * Math.sin(wx * freq * 7.3)); top.push(y0 - hh); }
    g.beginPath(); g.moveTo(0, H + 1); for (var i = 0; i < top.length; i++) g.lineTo(i * 2, top[i]); g.lineTo(W + 2, H + 1); g.closePath(); g.fill();
    if (rim) { g.strokeStyle = rim; g.lineWidth = 1; g.lineJoin = "round"; g.beginPath(); for (var j = 0; j < top.length; j++) j ? g.lineTo(j * 2, top[j] + 0.5) : g.moveTo(0, top[0] + 0.5); g.stroke(); }
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

  // ---------- hi-res helpers ----------
  function Q() { return (window.FF && FF.hdq && FF.hdq.last) || 1; }
  function hdCanvas(key, W, H) { var q = Q(), c = canvas(key, Math.round(W * q), Math.round(H * q)), x = c.getContext("2d"); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = "source-over"; x.globalAlpha = 1; x.clearRect(0, 0, c.width, c.height); x.setTransform(c.width / W, 0, 0, c.height / H, 0, 0); x.imageSmoothingEnabled = false; c.lw = W; c.lh = H; return x; }
  // ---------- soft tiles: draw tiles into a hi-res layer, round every convex corner, add a curved edge line ----------
  // inside the tile layer small details (specks, studs, cracks) are drawn as rounded pebbles; full-width strips stay square so tiles join
  function tileFill(a, b, w, h) { if (w < 0) { a += w; w = -w; } if (h < 0) { b += h; h = -h; } if (w >= 8 || h >= 8 || !this.roundRect || this.noRound) return this._fr(a, b, w, h); var rr = Math.min(w, h) * 0.45; if (rr < 0.3) return this._fr(a, b, w, h); this.beginPath(); this.roundRect(a, b, w, h, rr); this.fill(); }
  function tileLayer(W, H, opts) { var x = hdCanvas("tiles", W, H); if (!x._fr) { x._fr = x.fillRect; x.fillRect = tileFill; } x.noRound = Q() <= 1 || !!(opts && opts.square); return x; }
  function cornerPath(x, sx, sy, TS, r, k) {
    var P = Math.PI;
    if (k === 0) { x.moveTo(sx - 1.2, sy - 1.2); x.lineTo(sx + r, sy - 1.2); x.lineTo(sx + r, sy); x.arc(sx + r, sy + r, r, -P / 2, P, true); x.lineTo(sx - 1.2, sy + r); }
    else if (k === 1) { var ex = sx + TS; x.moveTo(ex + 1.2, sy - 1.2); x.lineTo(ex + 1.2, sy + r); x.lineTo(ex, sy + r); x.arc(ex - r, sy + r, r, 0, -P / 2, true); x.lineTo(ex - r, sy - 1.2); }
    else if (k === 2) { var ey = sy + TS; x.moveTo(sx - 1.2, ey + 1.2); x.lineTo(sx - 1.2, ey - r); x.lineTo(sx, ey - r); x.arc(sx + r, ey - r, r, P, P / 2, true); x.lineTo(sx + r, ey + 1.2); }
    else { var ex2 = sx + TS, ey2 = sy + TS; x.moveTo(ex2 + 1.2, ey2 + 1.2); x.lineTo(ex2 - r, ey2 + 1.2); x.lineTo(ex2 - r, ey2); x.arc(ex2 - r, ey2 - r, r, P / 2, 0, true); x.lineTo(ex2 + 1.2, ey2 - r); }
    x.closePath();
  }
  function cornerArc(x, sx, sy, TS, r, k) {
    var P = Math.PI, rr = r + 0.5;
    if (k === 0) { x.moveTo(sx + r, sy - 0.5); x.arc(sx + r, sy + r, rr, -P / 2, P, true); }
    else if (k === 1) { x.moveTo(sx + TS + 0.5, sy + r); x.arc(sx + TS - r, sy + r, rr, 0, -P / 2, true); }
    else if (k === 2) { x.moveTo(sx - 0.5, sy + TS - r); x.arc(sx + r, sy + TS - r, rr, P, P / 2, true); }
    else { x.moveTo(sx + TS - r, sy + TS + 0.5); x.arc(sx + TS - r, sy + TS - r, rr, P / 2, 0, true); }
  }
  // solidAt(tx, ty) -> bool; opts {r: corner radius (px), line: edge colour, shadow: drop-shadow alpha}
  function tileFlush(g, solidAt, cam, TS, opts) {
    var c = cache.tiles; if (!c) return; opts = opts || {};
    var x = c.getContext("2d"), W = c.lw, H = c.lh, r = opts.r == null ? 4 : opts.r, line = opts.line || "rgba(10,8,30,0.55)";
    var x0 = Math.floor(cam.x / TS) - 1, x1 = Math.ceil((cam.x + W) / TS) + 1, y0 = Math.floor(cam.y / TS) - 1, y1 = Math.ceil((cam.y + H) / TS) + 1, list = [];
    if (r > 0) {
      for (var ty = y0; ty <= y1; ty++) for (var tx = x0; tx <= x1; tx++) {
        if (!solidAt(tx, ty)) continue;
        var up = solidAt(tx, ty - 1), dn = solidAt(tx, ty + 1), lf = solidAt(tx - 1, ty), rt = solidAt(tx + 1, ty), sx = Math.round(tx * TS - cam.x), sy = Math.round(ty * TS - cam.y);
        if (!up && !lf) list.push(sx, sy, 0); if (!up && !rt) list.push(sx, sy, 1); if (!opts.topOnly) { if (!dn && !lf) list.push(sx, sy, 2); if (!dn && !rt) list.push(sx, sy, 3); }
      }
      if (list.length) {
        x.save(); x.globalCompositeOperation = "destination-out"; x.beginPath(); for (var i = 0; i < list.length; i += 3) cornerPath(x, list[i], list[i + 1], TS, r, list[i + 2]); x.fill(); x.restore();
        x.save(); x.strokeStyle = line; x.lineWidth = 1; x.beginPath(); for (var j = 0; j < list.length; j += 3) cornerArc(x, list[j], list[j + 1], TS, r, list[j + 2]); x.stroke(); x.restore();
      }
    }
    g.save(); g.imageSmoothingEnabled = true;
    if (opts.shadow && Q() <= 1) { var s = canvas("tilesil", c.width, c.height), sx2 = s.getContext("2d"); sx2.setTransform(1, 0, 0, 1, 0, 0); sx2.globalCompositeOperation = "source-over"; sx2.clearRect(0, 0, s.width, s.height); sx2.drawImage(c, 0, 0); sx2.globalCompositeOperation = "source-in"; sx2.fillStyle = "#000010"; sx2.fillRect(0, 0, s.width, s.height); g.globalAlpha = opts.shadow; g.drawImage(s, 1, 2, W, H); g.globalAlpha = 1; }
    g.drawImage(c, 0, 0, W, H); g.restore();
  }
  // ---------- tiles: original look + bevel, outline, ambient occlusion, scalloped grass lip, swaying blades, rounded corners ----------
  var baseTiles = window.PF && PF.drawTiles;
  function isSolidCh(c) { return c === "#" || c === "d" || c === "B" || c === "K" || c === "I"; }
  function drawTiles(g0, L, th, cam, W, H, t) {
    var g = tileLayer(W, H);
    if (baseTiles) baseTiles(g, L, th, cam, W, H, t);
    var TS = PF.TS, x0 = Math.floor(cam.x / TS), x1 = Math.ceil((cam.x + W) / TS), y0 = Math.floor(cam.y / TS), y1 = Math.ceil((cam.y + H) / TS);
    var solid = isSolidCh;
    var line = th.outline || "rgba(10,8,30,0.55)", hi = "rgba(255,255,255,0.16)", lo = "rgba(0,0,0,0.18)", grass = th.top || "#7ad83a", grassD = th.topD || shade(toHex(grass), -0.3);
    g.lineCap = "round";
    for (var ty = y0; ty <= y1; ty++) for (var tx = x0; tx <= x1; tx++) {
      if (ty >= L.h || tx < 0 || tx >= L.w) continue;
      var c = L.get(tx, ty), sx = Math.round(tx * TS - cam.x), sy = Math.round(ty * TS - cam.y);
      if (solid(c)) {
        var up = L.get(tx, ty - 1), dn = L.get(tx, ty + 1), lf = L.get(tx - 1, ty), rt = L.get(tx + 1, ty);
        // depth shading: smoothly darker the further below the surface (continuous across tiles, no banding)
        var dep = 0; while (dep < 5 && solid(L.get(tx, ty - dep - 1))) dep++;
        if (dep > 0) { var k0 = Math.min(1, (dep - 1) / 4) * 0.3, k1 = Math.min(1, dep / 4) * 0.3, sh = g.createLinearGradient(0, sy, 0, sy + TS); sh.addColorStop(0, "rgba(10,0,30," + k0.toFixed(3) + ")"); sh.addColorStop(1, "rgba(10,0,30," + k1.toFixed(3) + ")"); g.fillStyle = sh; g._fr(sx, sy, TS, TS); }
        else { var sh2 = g.createLinearGradient(0, sy, 0, sy + TS); sh2.addColorStop(0, "rgba(255,255,255,0.10)"); sh2.addColorStop(1, "rgba(10,0,30,0)"); g.fillStyle = sh2; g._fr(sx, sy, TS, TS); }
        g.fillStyle = hi; if (!solid(lf)) g.fillRect(sx + 1, sy, 1, TS);
        g.fillStyle = lo; if (!solid(rt)) g.fillRect(sx + TS - 2, sy, 2, TS); if (!solid(dn)) g.fillRect(sx, sy + TS - 2, TS, 2);
        g.fillStyle = line; if (!solid(up)) g.fillRect(sx, sy - 1, TS, 1); if (!solid(lf)) g.fillRect(sx - 1, sy, 1, TS); if (!solid(rt)) g.fillRect(sx + TS, sy, 1, TS); if (!solid(dn) && dn !== undefined) g.fillRect(sx, sy + TS, TS, 1);
        if (c === "#" && (up === " " || up === undefined || up === "w")) {
          // scalloped grass lip hanging over the dirt
          g.fillStyle = grassD; g.beginPath(); for (var b0 = 0; b0 < 4; b0++) { g.moveTo(sx + b0 * 4 + 4.4, sy + 4); g.arc(sx + b0 * 4 + 2, sy + 4, 2.4, 0, Math.PI); } g.fill();
          g.fillStyle = grass; g.fillRect(sx, sy, TS, 4.2); g.beginPath(); for (var b1 = 0; b1 < 4; b1++) { g.moveTo(sx + b1 * 4 + 4, sy + 3.6); g.arc(sx + b1 * 4 + 2, sy + 3.6, 2, 0, Math.PI); } g.fill();
          g.fillStyle = "rgba(255,255,255,0.32)"; g.fillRect(sx, sy, TS, 0.8);
          g.strokeStyle = grass; g.lineWidth = 0.8; g.beginPath();
          for (var b = 0; b < 4; b++) { var bh = hash(tx, b, 7); if (bh < 0.45) continue; var sw = Math.sin(t * 2.2 + tx * 0.7 + b) * 1.2, bx = sx + 2 + b * 4; g.moveTo(bx, sy + 0.5); g.quadraticCurveTo(bx + sw * 0.4, sy - 1.5 - bh, bx + sw, sy - 2 - bh * 2.5); }
          g.stroke();
        }
      } else if (c === "=") { g.fillStyle = line; g.fillRect(sx, sy - 1, TS, 1); g.fillRect(sx, sy + 5, TS, 1); g.fillStyle = "rgba(255,255,255,0.3)"; g.fillRect(sx, sy, TS, 1); g.fillStyle = "rgba(0,0,0,0.18)"; g.fillRect(sx, sy + 6, TS, 2); }
      else if (c === "^") { g.fillStyle = "rgba(255,255,255,0.5)"; for (var s2 = 0; s2 < 4; s2++) { g.beginPath(); g.arc(sx + s2 * 4 + 1.5, sy + 7.5 + (s2 % 2) * 2, 0.6, 0, 7); g.fill(); } }
    }
    tileFlush(g0, function (tx, ty) { return ty >= 0 && ty < L.h && tx >= 0 && tx < L.w && isSolidCh(L.get(tx, ty)); }, cam, TS, { r: th.round == null ? 4 : th.round, line: line, shadow: 0.22 });
  }

  // ---------- sprite outline layer: draw sprites into the (hi-res) layer, then flush with a smooth outline, drop shadow,
  // bottom shade and top rim light. Inside the layer, fillRect draws rounded rects (radius opts.round, default 1.1 px),
  // so code-drawn pixel sprites come out as soft rounded shapes instead of hard squares. ----------
  // dirty boxes (device px) so the flush only processes the parts of the layer that hold sprites
  function addBox(x, x0, y0, x1, y1) {
    var m = x.getTransform(), pts = [m.a * x0 + m.c * y0 + m.e, m.b * x0 + m.d * y0 + m.f, m.a * x1 + m.c * y0 + m.e, m.b * x1 + m.d * y0 + m.f, m.a * x0 + m.c * y1 + m.e, m.b * x0 + m.d * y1 + m.f, m.a * x1 + m.c * y1 + m.e, m.b * x1 + m.d * y1 + m.f];
    var bx0 = Math.min(pts[0], pts[2], pts[4], pts[6]), bx1 = Math.max(pts[0], pts[2], pts[4], pts[6]), by0 = Math.min(pts[1], pts[3], pts[5], pts[7]), by1 = Math.max(pts[1], pts[3], pts[5], pts[7]);
    var B = x.boxes, n = B.length, last = n ? B[n - 1] : null, pad = x.pad;
    bx0 -= pad; by0 -= pad; bx1 += pad; by1 += pad;
    if (last && bx0 < last[2] && bx1 > last[0] && by0 < last[3] && by1 > last[1]) { last[0] = Math.min(last[0], bx0); last[1] = Math.min(last[1], by0); last[2] = Math.max(last[2], bx1); last[3] = Math.max(last[3], by1); }
    else if (n > 400) { x.full = true; } else B.push([bx0, by0, bx1, by1]);
  }
  function mergeBoxes(B, W, H) {
    var changed = true;
    while (changed) { changed = false;
      for (var i = 0; i < B.length; i++) for (var j = i + 1; j < B.length; j++) { var a = B[i], b = B[j];
        if (a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1]) { a[0] = Math.min(a[0], b[0]); a[1] = Math.min(a[1], b[1]); a[2] = Math.max(a[2], b[2]); a[3] = Math.max(a[3], b[3]); B.splice(j, 1); j--; changed = true; } } }
    var out = []; B.forEach(function (b) { var x0 = Math.max(0, Math.floor(b[0])), y0 = Math.max(0, Math.floor(b[1])), x1 = Math.min(W, Math.ceil(b[2])), y1 = Math.min(H, Math.ceil(b[3])); if (x1 > x0 && y1 > y0) out.push([x0, y0, x1 - x0, y1 - y0]); });
    return out;
  }
  // translucent dark fills inside the sprite layer are drop shadows: draw them as soft ellipses on an "under" layer
  // so they are not outlined like solid sprite parts
  var SH_RE = /^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/;
  function isShadow(fs) { if (typeof fs !== "string" || fs.charCodeAt(0) !== 114) return false; var m = SH_RE.exec(fs); return !!m && +m[1] < 70 && +m[2] < 70 && +m[3] < 90 && +m[4] < 0.45; }
  function roundFill(a, b, w, h) {
    if (w < 0) { a += w; w = -w; } if (h < 0) { b += h; h = -h; }
    addBox(this, a, b, a + w, b + h);
    if (this.under && isShadow(this.fillStyle)) { var u = this.under; u.setTransform(this.getTransform()); u.fillStyle = this.fillStyle; u.beginPath(); u.ellipse(a + w / 2, b + h / 2, w / 2 + 0.3, h / 2 + 0.3, 0, 0, 7); u.fill(); return; }
    var r = this.round; if (!r) return this._fr(a, b, w, h);
    var rr = Math.min(r, Math.min(w, h) * 0.5); if (rr < 0.25 || !this.roundRect) return this._fr(a, b, w, h);
    this.beginPath(); this.roundRect(a, b, w, h, rr); this.fill();
  }
  function track(x) {
    x._fr = x.fillRect; x.fillRect = roundFill;
    var di = x.drawImage; x.drawImage = function (img, a, b, c, d, e, f, gg, h) { var n = arguments.length; if (n === 3) addBox(x, a, b, a + img.width, b + img.height); else if (n === 5) addBox(x, a, b, a + c, b + d); else addBox(x, e, f, e + gg, f + h); return di.apply(x, arguments); };
    function pt(name, xi, yi, ri) { var f = x[name]; x[name] = function () { var A = arguments, r = ri == null ? 0 : Math.abs(A[ri]) || 0, r2 = name === "ellipse" ? Math.abs(A[3]) || 0 : r; addBox(x, A[xi] - r, A[yi] - r2, A[xi] + r, A[yi] + r2); return f.apply(x, A); }; }
    pt("moveTo", 0, 1); pt("lineTo", 0, 1); pt("arc", 0, 1, 2); pt("ellipse", 0, 1, 2); pt("quadraticCurveTo", 2, 3); pt("bezierCurveTo", 4, 5); pt("arcTo", 0, 1, 4);
    var rc = x.rect; x.rect = function (a, b, w, h) { addBox(x, a, b, a + w, b + h); return rc.apply(x, arguments); };
    var ft = x.fillText; x.fillText = function (t, a, b) { var w = x.measureText(t).width, sz = parseFloat((/(\d+(\.\d+)?)px/.exec(x.font) || [0, 10])[1]); addBox(x, a - w, b - sz, a + w, b + sz); return ft.apply(x, arguments); };
  }
  function layer(W, H, opts) { var x = hdCanvas("layer", W, H); if (!x._fr) track(x); x.under = Q() > 1 ? hdCanvas("under", W, H) : null; x.boxes = []; x.full = false; x.pad = 3 * Q(); x.round = opts && opts.round != null ? opts.round : (Q() > 1 ? 1.1 : 0); return x; }
  // scratch canvases bucketed by power-of-two size: Chrome copies the whole source canvas when a modified canvas is drawn,
  // so a small sprite box must use a small scratch canvas
  function pow2(n) { var p = 32; while (p < n) p *= 2; return p; }
  function scratch(key, w, h) { var bw = pow2(w), bh = pow2(h), k = key + bw + "x" + bh, c = cache[k]; if (!c) { c = document.createElement("canvas"); c.width = bw; c.height = bh; cache[k] = c; } return c; }
  // opts.props: soft prop mode for background scenery (no outline; vertical light-to-dark shading, faint top edge light)
  function flush(g, col, shadow, opts) {
    var c = cache.layer; if (!c) return; var lx = c.getContext("2d"), W = c.lw || c.width, H = c.lh || c.height, q = c.width / W;
    var boxes = lx.full ? [[0, 0, c.width, c.height]] : mergeBoxes(lx.boxes, c.width, c.height); if (!boxes.length) return;
    var bx, by, bw, bh, ri = Math.max(1, Math.round(q * 0.6)), A, B, a, x;
    function sil(fill, off) { x.globalCompositeOperation = "source-over"; x.clearRect(0, 0, bw + 2, bh + 2); x.drawImage(A, 0, 0); if (off) { x.globalCompositeOperation = "destination-out"; x.drawImage(A, off[0], off[1]); } x.globalCompositeOperation = "source-in"; x.fillStyle = fill; x.fillRect(0, 0, bw, bh); x.globalCompositeOperation = "source-over"; }
    function put(src, ox, oy) { g.drawImage(src, 0, 0, bw, bh, bx / q + ox, by / q + oy, bw / q, bh / q); }
    g.save(); g.imageSmoothingEnabled = q > 1;
    var o = q > 1 ? 0.75 : 1, d = o * 0.7071, offs = q > 1 ? [[o, 0], [-o, 0], [0, o], [0, -o], [d, d], [d, -d], [-d, d], [-d, -d]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (var k = 0; k < boxes.length; k++) {
      bx = boxes[k][0]; by = boxes[k][1]; bw = boxes[k][2]; bh = boxes[k][3];
      A = scratch("flushA", bw, bh); B = scratch("flushB", bw, bh); a = A.getContext("2d"); x = B.getContext("2d");
      a.clearRect(0, 0, bw + 2, bh + 2); a.drawImage(c, bx, by, bw, bh, 0, 0, bw, bh);
      if (opts && opts.props) {
        var gr = a.createLinearGradient(0, -by + (opts.top || 0) * q, 0, -by + (opts.bottom || H) * q); gr.addColorStop(0, "rgba(255,255,255," + (opts.light == null ? 0.2 : opts.light) + ")"); gr.addColorStop(1, "rgba(20,0,50," + (opts.dark == null ? 0.12 : opts.dark) + ")");
        a.globalCompositeOperation = "source-atop"; a.fillStyle = gr; a.fillRect(0, 0, bw, bh); a.globalCompositeOperation = "source-over";
        if (col) { sil(col); g.globalAlpha = 0.5; put(B, 0, 1); g.globalAlpha = 1; }
        put(A, 0, 0); sil("rgba(255,255,255,0.28)", [0, ri]); put(B, 0, 0); continue;
      }
      if (lx.under) g.drawImage(lx.under.canvas, bx, by, bw, bh, bx / q, by / q, bw / q, bh / q);
      sil(col || "#140c28");
      if (shadow !== false) { g.globalAlpha = 0.28; put(B, q > 1 ? 0.8 : 1, q > 1 ? 1.6 : 2); g.globalAlpha = 1; }
      for (var i = 0; i < offs.length; i++) put(B, offs[i][0], offs[i][1]);
      put(A, 0, 0);
      if (q > 1) { sil("rgba(20,0,40,0.26)", [-q, -q]); put(B, 0, 0); }
      sil("rgba(255,255,255,0.35)", [ri, ri]); put(B, 0, 0);
    }
    g.restore();
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
  function vignette(g, W, H, a) { var c = canvas("vig" + (a || 0.45), W, H); if (!c.done) { var x = c.getContext("2d"), gr = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75); gr.addColorStop(0, "rgba(0,0,10,0)"); gr.addColorStop(1, "rgba(0,0,20," + (a || 0.45) + ")"); x.fillStyle = gr; x.fillRect(0, 0, W, H); c.done = 1; } g.save(); g.imageSmoothingEnabled = true; g.drawImage(c, 0, 0, W, H); g.restore(); }
  function iris(g, W, H, k, cx, cy) { if (k <= 0) return; if (k >= 1) { g.fillStyle = "#0a0614"; g.fillRect(0, 0, W, H); return; } var r = Math.hypot(W, H) * (1 - k); g.save(); g.fillStyle = "#0a0614"; g.beginPath(); g.rect(0, 0, W, H); g.arc(cx == null ? W / 2 : cx, cy == null ? H / 2 : cy, Math.max(0, r), 0, 7, true); g.fill("evenodd"); g.restore(); }
  function shadow(g, x, y, w) { g.fillStyle = "rgba(0,0,20,0.25)"; g.beginPath(); g.ellipse(x, y, w / 2, Math.max(1.5, w / 6), 0, 0, 7); g.fill(); }
  function burst(list, x, y, n, cols, sp, life) { for (var i = 0; i < n; i++) { var a = Math.random() * 6.283, v = (0.3 + Math.random() * 0.7) * (sp || 80); list.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: (life || 0.6) * (0.6 + Math.random() * 0.6), t: 0, c: cols[i % cols.length] }); } }
  function stepBurst(list, dt) { for (var i = list.length - 1; i >= 0; i--) { var p = list[i]; p.t += dt; p.vy += 220 * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.t > p.life) list.splice(i, 1); } }
  function drawBurst(g, list, cam) { list.forEach(function (p) { var k = 1 - p.t / p.life; g.globalAlpha = Math.max(0, k); g.fillStyle = p.c; var s = k > 0.5 ? 2 : 1; g.fillRect(Math.round(p.x - cam.x), Math.round(p.y - cam.y), s, s); }); g.globalAlpha = 1; }
  // bold title text with outline + drop shadow, for in-canvas banners
  function banner(g, text, x, y, size, fill, edge) { g.save(); g.font = "bold " + size + "px 'Trebuchet MS', Verdana, sans-serif"; g.textAlign = "center"; g.lineJoin = "round"; g.lineWidth = Math.max(2, size / 5); g.strokeStyle = "rgba(0,0,20,0.5)"; g.strokeText(text, x + 1, y + 2); g.strokeStyle = edge || "#1a0e30"; g.strokeText(text, x, y); var gr = g.createLinearGradient(0, y - size, 0, y); gr.addColorStop(0, "#ffffff"); gr.addColorStop(1, fill || "#ffd23a"); g.fillStyle = gr; g.fillText(text, x, y); g.restore(); }

  window.FXP = { Q: Q, hdCanvas: hdCanvas, tileLayer: tileLayer, tileFlush: tileFlush, mix: mix, shade: shade, drawBack: drawBack, drawTiles: drawTiles, layer: layer, flush: flush, glow: glow, ambient: ambient, vignette: vignette, iris: iris, shadow: shadow, burst: burst, stepBurst: stepBurst, drawBurst: drawBurst, banner: banner, cloud: cloud, ridge: ridge, hash: hash };
  if (window.PF) { PF.drawBackFlat = PF.drawBack; PF.drawTilesFlat = PF.drawTiles; PF.drawBack = drawBack; PF.drawTiles = drawTiles; }
})();
