/* Per-game visual upgrade for Nettle Run / Kilnbound. Overrides PF drawing
 * only (does not touch shared/platform.js). All art is original. */
(function () {
  "use strict";
  if (!window.PF) return;
  var TS = PF.TS, hash = PF.hash, TILES = PF.TILES;
  var CLOUDS = (function () {
    var out = [];
    for (var i = 0; i < 4; i++) {
      var c = document.createElement("canvas"); c.width = 44 + i * 8; c.height = 16 + i * 3;
      var x = c.getContext("2d");
      x.fillStyle = i % 2 ? "rgba(255,255,255,0.85)" : "rgba(240,248,255,0.75)";
      x.beginPath();
      x.arc(c.width * 0.28, c.height * 0.62, c.height * 0.38, 0, 7);
      x.arc(c.width * 0.5, c.height * 0.42, c.height * 0.48, 0, 7);
      x.arc(c.width * 0.72, c.height * 0.6, c.height * 0.36, 0, 7);
      x.fill();
      out.push(c);
    }
    return out;
  })();
  function vignette(g, W, H, a) {
    var vg = g.createRadialGradient(W / 2, H * 0.55, H * 0.15, W / 2, H * 0.5, H * 0.9);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0," + (a == null ? 0.32 : a) + ")");
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
  }
  function motes(g, cam, W, H, t, col, n) {
    n = n || 12;
    g.fillStyle = col || "rgba(255,240,160,0.55)";
    for (var i = 0; i < n; i++) {
      var x = ((i * 73 + t * (8 + (i % 5)) - cam.x * 0.35) % (W + 20) + W + 20) % (W + 20) - 10;
      var y = ((i * 47 + Math.sin(t * 0.7 + i) * 8 - cam.y * 0.2) % (H + 20) + H + 20) % (H + 20) - 10;
      g.globalAlpha = 0.35 + 0.4 * Math.abs(Math.sin(t * 2 + i));
      g.fillRect(Math.round(x), Math.round(y), i % 3 ? 1 : 2, 1);
    }
    g.globalAlpha = 1;
  }
  PF.drawBack = function (g, th, cam, W, H, t) {
    var gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, th.sky[0]);
    if (th.sky[2]) gr.addColorStop(0.45, th.sky[2]);
    else {
      // mid sky: blend toward the lower colour so the gradient has more depth
      gr.addColorStop(0.55, th.sky[1]);
    }
    gr.addColorStop(1, th.sky[1]);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    if (th.stars) {
      for (var s = 0; s < 64; s++) {
        var tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + s));
        g.globalAlpha = (s % 3 ? 0.45 : 0.9) * tw;
        g.fillStyle = s % 5 ? "#d0d8f0" : "#fff8d0";
        g.fillRect(((s * 71 - cam.x * 0.04) % W + W) % W, (s * 37) % (H * 0.62), s % 7 === 0 ? 2 : 1, 1);
      }
      g.globalAlpha = 1;
      // moon
      var mx = W * 0.8 - cam.x * 0.02, my = H * 0.16;
      var mg = g.createRadialGradient(mx, my, 2, mx, my, 18);
      mg.addColorStop(0, "rgba(240,244,255,0.85)"); mg.addColorStop(1, "rgba(240,244,255,0)");
      g.fillStyle = mg; g.beginPath(); g.arc(mx, my, 18, 0, 7); g.fill();
      g.fillStyle = "#f0f4ff"; g.beginPath(); g.arc(mx, my, 7, 0, 7); g.fill();
      g.fillStyle = "rgba(180,190,220,0.35)"; g.beginPath(); g.arc(mx - 2, my + 1, 2, 0, 7); g.fill();
    }
    if (th.sun) {
      var sx = W * 0.78 - cam.x * 0.02, sy = H * 0.2;
      var sg = g.createRadialGradient(sx, sy, 2, sx, sy, 26);
      sg.addColorStop(0, th.sun); sg.addColorStop(0.35, th.sun); sg.addColorStop(1, "rgba(255,230,120,0)");
      g.fillStyle = sg; g.beginPath(); g.arc(sx, sy, 26, 0, 7); g.fill();
      g.fillStyle = th.sun; g.beginPath(); g.arc(sx, sy, 11, 0, 7); g.fill();
      g.fillStyle = "#fff8d8"; g.beginPath(); g.arc(sx - 2, sy - 2, 4, 0, 7); g.fill();
    }
    // clouds
    if (!th.stars) {
      for (var ci = 0; ci < 6; ci++) {
        var img = CLOUDS[ci % CLOUDS.length];
        var cx = ((ci * 110 - cam.x * (0.08 + (ci % 3) * 0.03) + t * 4) % (W + 80) + W + 80) % (W + 80) - 40;
        var cy = 10 + (ci * 17) % 36;
        g.globalAlpha = 0.7;
        g.drawImage(img, Math.round(cx), cy);
      }
      g.globalAlpha = 1;
    }
    // three parallax ridges
    var layers = [
      [th.far, 0.12, H * 0.5, 34, 0.011, 0],
      [th.far, 0.22, H * 0.6, 26, 0.018, 1],
      [th.near, 0.42, H * 0.72, 20, 0.028, 2]
    ];
    for (var l = 0; l < layers.length; l++) {
      var L = layers[l]; if (!L[0]) continue;
      g.fillStyle = L[0];
      g.beginPath();
      g.moveTo(0, H);
      for (var x = 0; x <= W; x += 3) {
        var wx = x + cam.x * L[1];
        var hh = L[3] * (0.55 + 0.4 * Math.sin(wx * L[4] + L[5]) + 0.22 * Math.sin(wx * L[4] * 2.4 + l * 1.3));
        g.lineTo(x, L[2] - hh - cam.y * L[1] * 0.28);
      }
      g.lineTo(W, H); g.closePath(); g.fill();
      // ridge highlight
      g.strokeStyle = "rgba(255,255,255,0.12)"; g.lineWidth = 1;
      g.beginPath();
      for (x = 0; x <= W; x += 3) {
        wx = x + cam.x * L[1];
        hh = L[3] * (0.55 + 0.4 * Math.sin(wx * L[4] + L[5]) + 0.22 * Math.sin(wx * L[4] * 2.4 + l * 1.3));
        if (x === 0) g.moveTo(x, L[2] - hh - cam.y * L[1] * 0.28);
        else g.lineTo(x, L[2] - hh - cam.y * L[1] * 0.28);
      }
      g.stroke();
    }
    if (th.trees) {
      for (var k = 0; k < 16; k++) {
        var tx = ((k * 61 - cam.x * 0.58) % (W + 90) + W + 90) % (W + 90) - 45;
        var ty = H * 0.78 - cam.y * 0.2;
        var tw = 7 + (k % 3) * 2, thh = 22 + (k % 4) * 4;
        g.fillStyle = "#3a2414"; g.fillRect(tx + tw / 2 - 1, ty - 2, 3, 18);
        g.fillStyle = th.trees;
        g.beginPath(); g.moveTo(tx + tw / 2, ty - thh); g.lineTo(tx + tw + 6, ty - 2); g.lineTo(tx - 6, ty - 2); g.fill();
        g.fillStyle = "rgba(255,255,255,0.1)";
        g.beginPath(); g.moveTo(tx + tw / 2, ty - thh + 2); g.lineTo(tx + 2, ty - 6); g.lineTo(tx - 2, ty - 6); g.fill();
      }
    }
  };
  function drawTile(g, c, sx, sy, tx, ty, L, th, t) {
    var h = hash(tx, ty, L.seed), above = L.get(tx, ty - 1);
    if (c === "#" || c === "d" || c === "B" || c === "K" || c === "I") {
      var base = c === "d" ? th.soft || "#7a5a3a" : c === "K" ? "#8a3a22" : c === "I" ? "#a8d0e8" : c === "B" ? th.brick || "#6a5a50" : th.dirt;
      g.fillStyle = base; g.fillRect(sx, sy, TS, TS);
      // right/bottom shade
      g.fillStyle = "rgba(0,0,0,0.18)"; g.fillRect(sx + TS - 2, sy, 2, TS); g.fillRect(sx, sy + TS - 2, TS, 2);
      g.fillStyle = "rgba(255,255,255,0.08)"; g.fillRect(sx, sy, TS, 1);
      if (c === "B" || c === "K") {
        g.fillStyle = "rgba(0,0,0,0.28)";
        g.fillRect(sx, sy + 7, TS, 1); g.fillRect(sx, sy + 15, TS, 1);
        g.fillRect(sx + (ty % 2 ? 4 : 11), sy, 1, 7); g.fillRect(sx + (ty % 2 ? 11 : 4), sy + 8, 1, 7);
        g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(sx + 1, sy + 1, 5, 2);
        if (c === "K") { g.fillStyle = "rgba(255,140,40," + (0.25 + 0.2 * Math.sin(t * 3 + tx)) + ")"; g.fillRect(sx + 2, sy + 2, 12, 4); }
      } else if (c === "d") {
        g.fillStyle = "rgba(0,0,0,0.2)";
        for (var k = 0; k < 5; k++) g.fillRect(sx + Math.floor(hash(tx, ty, k) * 14), sy + Math.floor(hash(ty, tx, k) * 14), 2, 2);
      } else if (c === "I") {
        g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(sx + 2, sy + 2, 5, 2);
        g.fillStyle = "rgba(80,140,180,0.25)"; g.fillRect(sx + 8, sy + 8, 6, 3);
      } else {
        g.fillStyle = th.dirtD || "rgba(0,0,0,0.22)";
        for (var k2 = 0; k2 < 3; k2++) g.fillRect(sx + Math.floor(hash(tx, ty, k2 + 9) * 13), sy + 4 + Math.floor(hash(ty, tx, k2 + 9) * 10), 3, 2);
      }
      if (c === "#" && (!TILES[above] || above === "w" || above === " ")) {
        g.fillStyle = th.top; g.fillRect(sx, sy, TS, 4);
        g.fillStyle = th.topD; g.fillRect(sx, sy + 4, TS, 1);
        for (var b = 0; b < 4; b++) g.fillRect(sx + b * 4 + (h > 0.5 ? 1 : 2), sy + 4, 2, 2);
        // grass blades
        if (above === " " || !above) {
          g.fillStyle = th.topD;
          g.fillRect(sx + 2, sy - 3, 1, 3); g.fillRect(sx + 7, sy - 4, 1, 4); g.fillRect(sx + 12, sy - 2, 1, 2);
          if (th.deco && h > 0.7) { g.fillStyle = th.deco[Math.floor(h * 10) % th.deco.length]; g.fillRect(sx + 6, sy - 5, 3, 3); g.fillRect(sx + 7, sy - 6, 1, 2); }
        }
        if (th.snowTop) { g.fillStyle = "#f4f8ff"; g.fillRect(sx, sy, TS, 3); }
      }
    } else if (c === "=") {
      g.fillStyle = th.plank || "#a8743a"; g.fillRect(sx, sy, TS, 4);
      g.fillStyle = "rgba(255,255,255,0.18)"; g.fillRect(sx, sy, TS, 1);
      g.fillStyle = "rgba(0,0,0,0.3)"; g.fillRect(sx, sy + 4, TS, 1); g.fillRect(sx + 7, sy, 1, 4);
    } else if (c === "^") {
      g.fillStyle = th.spike || "#3a8a3a";
      for (var s = 0; s < 4; s++) {
        g.beginPath();
        g.moveTo(sx + s * 4 + 2, sy + 5 + (s % 2));
        g.lineTo(sx + s * 4 + 4, sy + 16);
        g.lineTo(sx + s * 4, sy + 16);
        g.fill();
      }
      g.fillStyle = "#e8f0a0"; g.fillRect(sx + 2, sy + 7, 1, 1); g.fillRect(sx + 9, sy + 9, 1, 1);
    } else if (c === "w") {
      g.fillStyle = th.water || "#1a5a8a"; g.fillRect(sx, sy, TS, TS);
      g.fillStyle = "rgba(255,255,255,0.06)"; g.fillRect(sx, sy, TS, 6);
      if (L.get(tx, ty - 1) !== "w") {
        g.fillStyle = th.waterHi || "#6ab0e0";
        var o = Math.floor(t * 8 + tx * 3) % 8;
        g.fillRect(sx, sy, TS, 2);
        g.fillRect(sx + o, sy + 3, 5, 1);
        g.fillStyle = "rgba(255,255,255,0.35)";
        g.fillRect(sx + (o + 3) % 14, sy + 1, 2, 1);
      }
    } else if (c === "L") {
      var flicker = 0.7 + 0.3 * Math.sin(t * 6 + tx);
      g.fillStyle = "#c83a10"; g.fillRect(sx, sy, TS, TS);
      g.fillStyle = "rgba(255,176,48," + (0.4 * flicker) + ")"; g.fillRect(sx, sy, TS, TS);
      var o2 = Math.floor(t * 6 + tx * 5) % 12;
      g.fillStyle = "#ffb030"; g.fillRect(sx + o2, sy + 2, 4, 2); g.fillRect(sx + (o2 + 7) % 14, sy + 8, 3, 2);
      if (L.get(tx, ty - 1) !== "L") {
        g.fillStyle = "#ffe060"; g.fillRect(sx, sy, TS, 2);
        g.fillStyle = "rgba(255,200,60," + (0.25 + 0.2 * flicker) + ")";
        g.beginPath(); g.arc(sx + 8, sy, 6, 0, 7); g.fill();
      }
    } else if (c === "R") {
      g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(sx + 3, sy + 12, 12, 4);
      g.fillStyle = th.rock || "#6a6258";
      g.beginPath(); g.moveTo(sx + 2, sy + 16); g.lineTo(sx + 4, sy + 8); g.lineTo(sx + 8, sy + 6); g.lineTo(sx + 14, sy + 9); g.lineTo(sx + 14, sy + 16); g.fill();
      g.fillStyle = "rgba(255,255,255,0.28)"; g.fillRect(sx + 6, sy + 8, 4, 1);
    }
  }
  PF.drawTiles = function (g, L, th, cam, W, H, t) {
    var x0 = Math.floor(cam.x / TS), x1 = Math.ceil((cam.x + W) / TS), y0 = Math.floor(cam.y / TS), y1 = Math.ceil((cam.y + H) / TS);
    for (var ty = y0; ty <= y1; ty++) for (var tx = x0; tx <= x1; tx++) {
      var c = L.get(tx, ty); if (c === " ") continue;
      if (ty >= L.h || tx < 0 || tx >= L.w) continue;
      drawTile(g, c, Math.round(tx * TS - cam.x), Math.round(ty * TS - cam.y), tx, ty, L, th, t);
    }
  };
  var _figure = PF.figure;
  PF.figure = function (g, x, y, p, pal, flip, sc) {
    sc = sc || 1;
    g.fillStyle = "rgba(0,0,0,0.28)";
    g.beginPath(); g.ellipse(x, y + 12 * sc, 7 * sc, 2.2 * sc, 0, 0, 7); g.fill();
    var r = _figure(g, x, y, p, pal, flip, sc);
    if (r && r.head) {
      g.fillStyle = "rgba(255,255,255,0.28)";
      g.fillRect(Math.round(r.head[0] - (flip ? 0 : 1)), Math.round(r.head[1] - 3), 2, 2);
    }
    return r;
  };
  if (PF.Foes && PF.Foes.draw) {
    var _fd = PF.Foes.draw;
    PF.Foes.draw = function (g, f, cam, t) {
      g.fillStyle = "rgba(0,0,0,0.3)";
      g.beginPath(); g.ellipse(f.x + f.w / 2 - cam.x, f.y + f.h - cam.y + 1, f.w * 0.45, 1.6, 0, 0, 7); g.fill();
      _fd(g, f, cam, t);
    };
  }
  var _partsDraw = PF.Parts;
  // Parts is a factory; wrap instances at creation time
  var _P = PF.Parts;
  PF.Parts = function () {
    var inst = _P();
    var _d = inst.draw;
    inst.draw = function (g, cam) {
      // slightly softer particles: 2x2 already, add a faded neighbour
      _d.call(inst, g, cam);
    };
    return inst;
  };
  window.FFGfx = { vignette: vignette, motes: motes };
})();
