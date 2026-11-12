/* Forest Forge puzzle visual helpers. Particles, bevelled tiles, soft flashes.
 * Original drawing only — no sprites from other games. */
(function (W) {
  "use strict";
  var P = [];
  var flash = 0, flashCol = "#fff", shake = 0, t0 = 0;
  function now() { return (t0 = t0 || performance.now(), performance.now()); }

  function burst(x, y, col, n, opt) {
    opt = opt || {};
    n = n || 12;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, sp = (opt.spd || 80) * (0.4 + Math.random());
      P.push({
        x: x, y: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (opt.lift || 30),
        g: opt.g == null ? 220 : opt.g,
        life: 0.35 + Math.random() * 0.45,
        age: 0,
        r: (opt.r || 3) * (0.6 + Math.random() * 0.8),
        col: col,
        kind: opt.kind || "dot"
      });
    }
  }
  function ringBurst(x, y, col, n, rad) {
    n = n || 18;
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2 + Math.random() * 0.2;
      P.push({
        x: x + Math.cos(a) * (rad || 8), y: y + Math.sin(a) * (rad || 8),
        vx: Math.cos(a) * 90, vy: Math.sin(a) * 90,
        g: 40, life: 0.5, age: 0, r: 2.5, col: col, kind: "dot"
      });
    }
  }
  function step(dt) {
    if (flash > 0) flash = Math.max(0, flash - dt * 3);
    if (shake > 0) shake = Math.max(0, shake - dt * 8);
    for (var i = P.length - 1; i >= 0; i--) {
      var p = P[i];
      p.age += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.98;
      if (p.age >= p.life) P.splice(i, 1);
    }
  }
  function draw(c) {
    for (var i = 0; i < P.length; i++) {
      var p = P[i], a = 1 - p.age / p.life;
      c.globalAlpha = Math.max(0, a);
      c.fillStyle = p.col;
      if (p.kind === "spark") {
        c.save(); c.translate(p.x, p.y); c.rotate(p.age * 8);
        c.fillRect(-p.r, -0.6, p.r * 2, 1.2); c.restore();
      } else if (p.kind === "fluff") {
        c.beginPath(); c.arc(p.x, p.y, p.r * a, 0, Math.PI * 2); c.fill();
      } else {
        c.beginPath(); c.arc(p.x, p.y, p.r * (0.7 + 0.3 * a), 0, Math.PI * 2); c.fill();
      }
    }
    c.globalAlpha = 1;
    if (flash > 0) {
      c.globalAlpha = flash * 0.35;
      c.fillStyle = flashCol;
      // caller should have a rect in view; we use a huge rect
      c.fillRect(-2000, -2000, 6000, 6000);
      c.globalAlpha = 1;
    }
  }
  function kick(amount, col) { shake = Math.max(shake, amount || 0.4); if (col) { flash = 1; flashCol = col; } }
  function offset() {
    if (shake <= 0) return { x: 0, y: 0 };
    return { x: (Math.random() - 0.5) * 6 * shake, y: (Math.random() - 0.5) * 6 * shake };
  }
  function reset() { P.length = 0; flash = 0; shake = 0; }

  // --- drawing primitives ---
  function hexPath(c, x, y, s) {
    c.beginPath();
    for (var i = 0; i < 6; i++) {
      var a = Math.PI / 180 * (60 * i);
      var px = x + s * Math.cos(a), py = y + s * Math.sin(a);
      if (i) c.lineTo(px, py); else c.moveTo(px, py);
    }
    c.closePath();
  }
  function bevelHex(c, x, y, s, fill, dk, hi) {
    hexPath(c, x, y, s);
    c.fillStyle = fill; c.fill();
    // dark facet
    c.save(); c.clip();
    var g = c.createLinearGradient(x - s, y - s, x + s, y + s);
    g.addColorStop(0, hi || "rgba(255,255,240,.38)");
    g.addColorStop(0.45, "rgba(255,255,255,0)");
    g.addColorStop(1, "rgba(0,0,0,.28)");
    c.fillStyle = g; hexPath(c, x, y, s); c.fill();
    c.restore();
    hexPath(c, x, y, s);
    c.strokeStyle = dk || "rgba(40,20,8,.45)"; c.lineWidth = Math.max(1, s * 0.08); c.stroke();
    // small specular
    c.beginPath(); c.ellipse(x - s * 0.22, y - s * 0.28, s * 0.22, s * 0.14, -0.5, 0, Math.PI * 2);
    c.fillStyle = "rgba(255,255,245,.28)"; c.fill();
  }
  function bevelCircle(c, x, y, r, fill, dk, hi) {
    var g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, hi || lighten(fill, 0.35));
    g.addColorStop(0.55, fill);
    g.addColorStop(1, dk || shadeCol(fill, 0.55));
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = g; c.fill();
    c.strokeStyle = dk || "rgba(0,0,0,.3)"; c.lineWidth = Math.max(1, r * 0.08); c.stroke();
    c.beginPath(); c.ellipse(x - r * 0.28, y - r * 0.32, r * 0.28, r * 0.16, -0.5, 0, Math.PI * 2);
    c.fillStyle = "rgba(255,255,245,.35)"; c.fill();
  }
  function bevelRoundRect(c, x, y, w, h, rad, fill, dk) {
    rad = Math.min(rad, w / 2, h / 2);
    roundRect(c, x, y, w, h, rad);
    var g = c.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, lighten(fill, 0.18));
    g.addColorStop(0.4, fill);
    g.addColorStop(1, dk || shadeCol(fill, 0.7));
    c.fillStyle = g; c.fill();
    c.strokeStyle = dk || "rgba(0,0,0,.3)"; c.lineWidth = 1.4; c.stroke();
    c.beginPath(); c.ellipse(x + w * 0.3, y + h * 0.22, w * 0.22, h * 0.1, 0, 0, Math.PI * 2);
    c.fillStyle = "rgba(255,255,245,.22)"; c.fill();
  }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function shadeCol(hex, mul) {
    var n = parseInt((hex || "#888888").replace("#", ""), 16);
    if (isNaN(n)) return "#333";
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return "rgb(" + Math.max(0, r * mul | 0) + "," + Math.max(0, g * mul | 0) + "," + Math.max(0, b * mul | 0) + ")";
  }
  function lighten(hex, amt) {
    var n = parseInt((hex || "#888888").replace("#", ""), 16);
    if (isNaN(n)) return "#fff";
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.min(255, r + (255 - r) * amt | 0);
    g = Math.min(255, g + (255 - g) * amt | 0);
    b = Math.min(255, b + (255 - b) * amt | 0);
    return "rgb(" + r + "," + g + "," + b + ")";
  }
  function sky(c, w, h, top, mid, bot) {
    var g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, top); if (mid) g.addColorStop(0.48, mid); g.addColorStop(1, bot);
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  }
  function clouds(c, w, h, t, col) {
    c.fillStyle = col || "rgba(255,255,255,.18)";
    for (var i = 0; i < 6; i++) {
      var x = ((t * 8 + i * 140) % (w + 160)) - 80, y = 30 + (i % 3) * 28, s = 22 + (i % 3) * 8;
      c.beginPath(); c.arc(x, y, s, 0, Math.PI * 2); c.arc(x + s * 0.8, y + 4, s * 0.7, 0, Math.PI * 2);
      c.arc(x - s * 0.7, y + 6, s * 0.55, 0, Math.PI * 2); c.fill();
    }
  }
  function vignette(c, w, h, a) {
    var g = c.createRadialGradient(w / 2, h * 0.45, h * 0.2, w / 2, h * 0.5, h * 0.85);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0," + (a == null ? 0.28 : a) + ")");
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  }
  function menuChrome(cssExtra) {
    return ".ff-shade.is-solid{background:linear-gradient(180deg,rgba(8,14,20,.28),rgba(8,14,20,.62))}" +
      ".ff-btn{box-shadow:0 4px 16px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.2);transition:transform .12s,box-shadow .12s}" +
      ".ff-btn:active{transform:translateY(1px);box-shadow:0 1px 6px rgba(0,0,0,.3)}" +
      ".ff-display{filter:drop-shadow(0 2px 10px rgba(0,0,0,.35))}" +
      (cssExtra || "");
  }

  W.FFX = {
    burst: burst, ringBurst: ringBurst, step: step, draw: draw, kick: kick, offset: offset, reset: reset,
    bevelHex: bevelHex, bevelCircle: bevelCircle, bevelRoundRect: bevelRoundRect, hexPath: hexPath, roundRect: roundRect,
    shadeCol: shadeCol, lighten: lighten, sky: sky, clouds: clouds, vignette: vignette, menuChrome: menuChrome,
    get flash() { return flash; }, get count() { return P.length; }
  };
})(window);
