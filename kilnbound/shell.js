/* Forest Forge arcade shell (2026 games). Plain JS, no build step.
 * Same conventions as Rock N Split / Scaffold Scramble / Knockwall:
 *  - storage that never throws (Android WebView can deny localStorage)
 *  - app bridge: postMessage to the Expo WebView shell (runEnded, removeAdsTapped,
 *    restoreTapped, privacyChoices, openPrivacyPolicy, back) and adsRemoved back
 *  - window.KW_back for the Android back button: pause, then menu, then exit
 *  - sound + pause buttons in the HUD, plain dark full-screen menus
 *  - Web Audio only: every sound and tune is generated here (no audio files)
 */
(function () {
  "use strict";
  // original simple shapes for the floating title decorations (24x24, currentColor)
  var HL = '<circle cx="9" cy="8" r="2.4" fill="#fff" opacity=".55"/>';
  var DECO = {
    star: '<path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 16.9 5.9 20.4l1.5-6.8L2.2 9l6.9-.7z"/>',
    spark: '<path d="M12 0C13 8 16 11 24 12 16 13 13 16 12 24 11 16 8 13 0 12 8 11 11 8 12 0z"/>',
    circle: '<circle cx="12" cy="12" r="9"/>' + HL,
    ring: '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="3.5"/>',
    leaf: '<path d="M3 21C3 10 10 3 21 3c0 11-7 18-18 18z"/><path d="M5 19L16 8" stroke="#fff" stroke-width="1.4" opacity=".55"/>',
    flower: '<circle cx="12" cy="5.5" r="4.5"/><circle cx="18.2" cy="10" r="4.5"/><circle cx="15.8" cy="17.3" r="4.5"/><circle cx="8.2" cy="17.3" r="4.5"/><circle cx="5.8" cy="10" r="4.5"/><circle cx="12" cy="12" r="3.6" fill="#fff" opacity=".85"/>',
    flag: '<path d="M3 4h18L12 21z"/><path d="M6 6h12" stroke="#fff" stroke-width="1.5" opacity=".5"/>',
    gear: '<circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" stroke-width="5" stroke-dasharray="3.2 3.24"/><circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="2.6" fill="#fff" opacity=".6"/>',
    hex: '<path d="M12 2l8.7 5v10L12 22l-8.7-5V7z"/><path d="M12 5l5.8 3.4" stroke="#fff" stroke-width="1.6" opacity=".5"/>',
    diamond: '<path d="M12 2l9 10-9 10-9-10z"/><path d="M12 5l-5 7" stroke="#fff" stroke-width="1.6" opacity=".5"/>',
    moth: '<ellipse cx="7" cy="10" rx="5.5" ry="7.5" transform="rotate(-25 7 10)"/><ellipse cx="17" cy="10" rx="5.5" ry="7.5" transform="rotate(25 17 10)"/><ellipse cx="8" cy="18" rx="3" ry="4" transform="rotate(30 8 18)"/><ellipse cx="16" cy="18" rx="3" ry="4" transform="rotate(-30 16 18)"/><rect x="11" y="6" width="2" height="15" rx="1" fill="#fff" opacity=".7"/>',
    drop: '<path d="M12 2S5 11 5 15a7 7 0 0 0 14 0c0-4-7-13-7-13z"/><circle cx="9.5" cy="15" r="2" fill="#fff" opacity=".55"/>',
    cloud: '<path d="M7 19a5 5 0 0 1-.6-10A6.5 6.5 0 0 1 18.4 9.6 4.7 4.7 0 0 1 17.5 19z"/>',
    square: '<rect x="3" y="3" width="18" height="18" rx="5"/><rect x="6" y="6" width="5" height="3" rx="1.5" fill="#fff" opacity=".55"/>',
    triangle: '<path d="M12 3l10 18H2z"/>',
    bolt: '<path d="M13.5 1L4 14h7l-1.5 9L20 10h-7z"/>',
    heart: '<path d="M12 21s-8.5-5.4-8.5-11.2A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8.5 2.8C20.5 15.6 12 21 12 21z"/>',
    letter: '<rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M3 6.5l9 7 9-7" fill="none" stroke="#fff" stroke-width="1.8" opacity=".75"/>'
  };
  var ICON = {
    sound: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
    mute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 15l7-7 7 7"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9l7 7 7-7"/></svg>'
  };

  // ---------- storage that never throws ----------
  function makeStore() {
    try {
      var ls = window.localStorage, p = "__ff_t";
      ls.setItem(p, "1"); ls.removeItem(p);
      return {
        getItem: function (k) { try { return ls.getItem(k); } catch (e) { return null; } },
        setItem: function (k, v) { try { ls.setItem(k, v); } catch (e) {} },
        removeItem: function (k) { try { ls.removeItem(k); } catch (e) {} }
      };
    } catch (e) {
      var m = {};
      return {
        getItem: function (k) { return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null; },
        setItem: function (k, v) { m[k] = String(v); },
        removeItem: function (k) { delete m[k]; }
      };
    }
  }
  var store = makeStore();

  // ---------- app bridge ----------
  function inApp() { return !!(window.ReactNativeWebView && window.ReactNativeWebView.postMessage); }
  function post(type, extra) {
    if (!inApp()) return;
    var msg = { type: type };
    if (extra) for (var k in extra) msg[k] = extra[k];
    try { window.ReactNativeWebView.postMessage(JSON.stringify(msg)); } catch (e) {}
  }

  // ---------- audio ----------
  var NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function noteFreq(tok) {
    var m = /^([A-G])([#b]?)(-?\d)$/.exec(tok);
    if (!m) return 0;
    var n = NOTE[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + (parseInt(m[3], 10) + 1) * 12;
    return 440 * Math.pow(2, (n - 69) / 12);
  }
  function makeAudio(getMuted) {
    var A = { ctx: null, master: null, sfx: null, mus: null, nbuf: null, gate: 0, song: null, songPos: 0, nextT: 0, timer: 0 };
    A.unlock = function () {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!A.ctx) {
        try { A.ctx = new AC({ latencyHint: "interactive" }); } catch (e) { return; }
        A.master = A.ctx.createGain(); A.sfx = A.ctx.createGain(); A.mus = A.ctx.createGain();
        A.sfx.gain.value = 0.8; A.mus.gain.value = 0.42; A.master.gain.value = getMuted() ? 0 : 1;
        A.sfx.connect(A.master); A.mus.connect(A.master); A.master.connect(A.ctx.destination);
        A.nbuf = A.ctx.createBuffer(1, Math.floor(A.ctx.sampleRate * 0.5), A.ctx.sampleRate);
        var d = A.nbuf.getChannelData(0);
        for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        A.timer = setInterval(A.pump, 40);
      }
      if (A.ctx.state === "suspended") A.ctx.resume();
    };
    A.setMuted = function (m) { if (A.ctx) A.master.gain.setTargetAtTime(m ? 0 : 1, A.ctx.currentTime, 0.02); };
    function env(g, t, a, dur, peak) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    }
    // tone({f, f2, dur, type, gain, delay, bus})
    A.tone = function (o, at) {
      if (!A.ctx || getMuted()) return;
      var t = (at || A.ctx.currentTime) + (o.delay || 0);
      var osc = A.ctx.createOscillator(), g = A.ctx.createGain();
      osc.type = o.type || "square";
      osc.frequency.setValueAtTime(o.f, t);
      if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t + (o.dur || 0.1));
      env(g, t, o.a || 0.006, o.dur || 0.1, o.gain == null ? 0.2 : o.gain);
      osc.connect(g); g.connect(o.bus || A.sfx);
      osc.start(t); osc.stop(t + (o.dur || 0.1) + 0.05);
      osc.onended = function () { osc.disconnect(); g.disconnect(); };
    };
    // noise({dur, gain, freq, filter, q, f2, delay})
    A.noise = function (o, at) {
      if (!A.ctx || getMuted()) return;
      var t = (at || A.ctx.currentTime) + (o.delay || 0);
      var src = A.ctx.createBufferSource(); src.buffer = A.nbuf;
      src.playbackRate.value = o.rate || 1;
      var f = A.ctx.createBiquadFilter(); f.type = o.filter || "bandpass";
      f.frequency.setValueAtTime(o.freq || 1200, t);
      if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + (o.dur || 0.1));
      f.Q.value = o.q || 0.8;
      var g = A.ctx.createGain(); env(g, t, 0.003, o.dur || 0.1, o.gain == null ? 0.25 : o.gain);
      src.connect(f); f.connect(g); g.connect(o.bus || A.sfx);
      src.start(t, Math.random() * 0.3); src.stop(t + (o.dur || 0.1) + 0.05);
      src.onended = function () { src.disconnect(); f.disconnect(); g.disconnect(); };
    };
    A.sfxOk = function () {
      if (!A.ctx || getMuted()) return false;
      if (A.ctx.currentTime < A.gate) return false;
      A.gate = A.ctx.currentTime + 0.02; return true;
    };
    // ---- tracker music: song = {bpm, swing, parts:[{ch:[{wave,gain,oct,pat}]}], order:[0,0,1]} ----
    // pat: whitespace tokens, one per 16th. "C4" note, "-" hold, "." rest.
    // Drum channel (wave "drum"): k kick, s snare, h hat, o open hat, "." rest.
    function parse(song) {
      if (song._p) return song._p;
      song._p = song.parts.map(function (p) {
        return p.map(function (c) { return { c: c, toks: c.pat.trim().split(/\s+/) }; });
      });
      return song._p;
    }
    A.playSong = function (song) {
      if (A.song === song) return;
      A.song = song; A.songPos = 0; A.orderPos = 0;
      if (A.ctx) A.nextT = A.ctx.currentTime + 0.08;
    };
    A.stopSong = function () { A.song = null; };
    function drum(tok, t) {
      if (tok === "k") { A.tone({ f: 150, f2: 40, dur: 0.16, type: "sine", gain: 0.7, bus: A.mus }, t); }
      else if (tok === "s") { A.noise({ dur: 0.12, gain: 0.35, freq: 1800, filter: "bandpass", q: 0.6, bus: A.mus }, t); A.tone({ f: 220, f2: 120, dur: 0.06, type: "triangle", gain: 0.2, bus: A.mus }, t); }
      else if (tok === "h") { A.noise({ dur: 0.03, gain: 0.12, freq: 8000, filter: "highpass", bus: A.mus }, t); }
      else if (tok === "o") { A.noise({ dur: 0.12, gain: 0.1, freq: 7000, filter: "highpass", bus: A.mus }, t); }
    }
    A.pump = function () {
      if (!A.ctx || !A.song || document.hidden) return;
      var song = A.song, parts = parse(song), step = 60 / song.bpm / 4;
      var now = A.ctx.currentTime;
      if (A.nextT < now - 0.2) A.nextT = now + 0.05;
      while (A.nextT < now + 0.18) {
        var order = song.order || [0];
        var part = parts[order[A.orderPos % order.length]];
        var len = part[0].toks.length;
        if (!getMuted()) {
          for (var i = 0; i < part.length; i++) {
            var ch = part[i], tok = ch.toks[A.songPos % ch.toks.length];
            if (!tok || tok === "." || tok === "-") continue;
            if (ch.c.wave === "drum") { drum(tok, A.nextT); continue; }
            var hold = 1, j = A.songPos + 1;
            while (j < ch.toks.length && ch.toks[j] === "-") { hold++; j++; }
            var f = noteFreq(tok);
            if (f) A.tone({ f: f, dur: Math.max(0.05, step * hold * 0.92), type: ch.c.wave, gain: ch.c.gain || 0.12, a: 0.004, bus: A.mus }, A.nextT);
          }
        }
        A.nextT += step * (song.swing && A.songPos % 2 === 0 ? 1 + song.swing : song.swing && A.songPos % 2 ? 1 - song.swing : 1);
        A.songPos++;
        if (A.songPos >= len) { A.songPos = 0; A.orderPos++; }
      }
    };
    return A;
  }

  // ---------- the shell ----------
  function create(cfg) {
    var root = document.getElementById("app");
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var coarse = window.matchMedia && window.matchMedia("(any-pointer: coarse)").matches;
    var SAVE_KEY = cfg.id + "-v1";
    var NOADS_KEY = cfg.id + "_noads";
    var save = {};
    try { save = JSON.parse(store.getItem(SAVE_KEY) || "{}") || {}; } catch (e) { save = {}; }
    var muted = !!save.muted;

    var stats = (cfg.stats || []).map(function (s) {
      return '<div class="ff-stat"><span>' + s.label + '</span><b id="ff-st-' + s.id + '">' + (s.value == null ? "0" : s.value) + "</b></div>";
    }).join("");
    function padHtml(p) {
      return '<button type="button" class="ff-pad ' + (p.cls || "") + '" data-pad="' + p.id + '" aria-label="' + (p.aria || p.label || p.id) + '">' + (p.icon ? ICON[p.icon] : p.label) + "</button>";
    }
    var pads = cfg.pads || { left: [], right: [] };
    root.innerHTML =
      '<div class="ff' + (cfg.wide ? " wide" : "") + '">' +
      '<header class="ff-hud"><div class="ff-hud-title"><p class="ff-kicker" id="ff-kicker">' + cfg.title + '</p><p class="ff-course" id="ff-course">' + (cfg.course || "") + "</p></div>" +
      '<div class="ff-stats">' + stats + "</div>" +
      '<div class="ff-actions"><button type="button" class="ff-icon-btn" id="ff-sound"></button><button type="button" class="ff-icon-btn" id="ff-pause" aria-label="Pause">' + ICON.pause + "</button></div></header>" +
      '<div class="ff-stage" id="ff-stage"><canvas id="ff-canvas" aria-label="' + cfg.title + '"></canvas>' +
      '<div class="ff-pads"><div class="ff-pad-group">' + (pads.left || []).map(padHtml).join("") + '</div><div class="ff-pad-group">' + (pads.right || []).map(padHtml).join("") + "</div></div>" +
      '<p class="ff-toast" id="ff-toast" hidden></p>' +
      '<div class="ff-shade" id="ff-shade" hidden></div><div class="ff-modal" id="ff-modal" role="dialog" aria-modal="true" hidden></div>' +
      '<p class="sr" id="ff-status" aria-live="polite"></p></div></div>';

    var q = function (s) { return root.querySelector(s); };
    var shell = q(".ff"), stage = q("#ff-stage"), canvas = q("#ff-canvas");
    var ctx = canvas.getContext("2d", { alpha: false });
    var el = { kicker: q("#ff-kicker"), course: q("#ff-course"), sound: q("#ff-sound"), pause: q("#ff-pause"), modal: q("#ff-modal"), shade: q("#ff-shade"), toast: q("#ff-toast"), status: q("#ff-status") };

    var audio = makeAudio(function () { return muted; });
    var ui = {
      cfg: cfg, ctx: ctx, canvas: canvas, stage: stage, root: shell, audio: audio, save: save,
      reduceMotion: reduceMotion, coarse: coarse, VW: cfg.view.w, VH: cfg.view.h, scale: 1, ox: 0, oy: 0,
      playing: false, menuOpen: false, time: 0, inApp: inApp, post: post, store: store, icons: ICON
    };
    ui.persist = function () { save.muted = muted; store.setItem(SAVE_KEY, JSON.stringify(save)); };
    ui.adsOff = function () { return store.getItem(NOADS_KEY) === "1"; };
    ui.runEnded = function () { if (inApp() && !ui.adsOff()) post("runEnded"); };

    function paintSound() {
      el.sound.innerHTML = muted ? ICON.mute : ICON.sound;
      el.sound.setAttribute("aria-label", muted ? "Sound off" : "Sound on");
      el.sound.setAttribute("aria-pressed", muted ? "false" : "true");
    }
    paintSound();
    ui.setMuted = function (m) { muted = m; audio.setMuted(m); ui.persist(); paintSound(); };
    ui.isMuted = function () { return muted; };
    ui.setStat = function (id, v) { var n = q("#ff-st-" + id); if (n && n.textContent !== String(v)) n.textContent = v; };
    ui.setCourse = function (t) { if (el.course.textContent !== t) el.course.textContent = t; };
    ui.setKicker = function (t) { if (el.kicker.textContent !== t) el.kicker.textContent = t; };
    ui.say = function (t) { el.status.textContent = t; };
    var toastT = 0;
    ui.toast = function (t, ms) {
      el.toast.textContent = t; el.toast.hidden = false; el.toast.style.opacity = "1";
      clearTimeout(toastT);
      toastT = setTimeout(function () { el.toast.style.opacity = "0"; toastT = setTimeout(function () { el.toast.hidden = true; }, 260); }, ms || 1400);
    };
    ui.showPads = function (on) { q(".ff-pads").style.visibility = on ? "visible" : "hidden"; };
    ui.padsOnly = function (ids) {
      var all = root.querySelectorAll("[data-pad]");
      for (var i = 0; i < all.length; i++) all[i].hidden = ids ? ids.indexOf(all[i].getAttribute("data-pad")) < 0 : false;
    };
    ui.setPadLabel = function (id, label) { var b = q('[data-pad="' + id + '"]'); if (b) b.innerHTML = label; };

    // ---------- title logo + floating decorations (shapes and colours set per game: cfg.deco, --pop1..3) ----------
    function isLogo(t) { var a = String(t).replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").trim().toLowerCase(); return a === String(cfg.title).toLowerCase() && !/[<&]/.test(t); }
    function logoHtml(t) {
      var i = 0;
      return '<p class="ff-display ff-logo" aria-label="' + t + '">' + t.split("").map(function (ch) {
        return ch === " " ? '<span class="sp" aria-hidden="true"></span>' : '<span aria-hidden="true" style="--i:' + (i++) + '">' + ch + "</span>";
      }).join("") + "</p>";
    }
    var deco = document.createElement("div"); deco.className = "ff-deco"; deco.hidden = true; deco.setAttribute("aria-hidden", "true");
    stage.insertBefore(deco, el.modal);
    function showDeco(on) {
      if (on && !deco.firstChild) {
        var shapes = (cfg.deco && cfg.deco.length ? cfg.deco : ["star", "circle", "spark"]), h = "", n = 14;
        for (var k = 0; k < n; k++) {
          var sh = DECO[shapes[k % shapes.length]] || DECO.star, r = function (a, b) { return (a + Math.random() * (b - a)).toFixed(2); };
          h += '<i style="left:' + r(-2, 96) + "%;--s:" + r(14, 34) + "px;--c:var(--pop" + (k % 3 + 1) + ");--d:" + r(7, 13) + "s;--w:-" + r(0, 12) + "s;--r:" + r(-300, 300) + "deg;--sw:" + r(1.8, 3.4) + 's"><svg viewBox="0 0 24 24" fill="currentColor">' + sh + "</svg></i>";
        }
        deco.innerHTML = h;
      }
      deco.hidden = !on;
    }
    ui.setDeco = function (list) { cfg.deco = list; deco.innerHTML = ""; if (!deco.hidden) showDeco(true); };

    // ---------- menus ----------
    // ui.menu({kicker,title,body,stats,html,buttons:[{label,act,small,disabled}],help,fine,app,solid})
    var menuActs = [];
    ui.menu = function (o) {
      ui.menuOpen = true; ui.pausedMenu = false;
      shell.classList.add("ff-menu-open");
      var h = "";
      if (o.kicker) h += '<p class="ff-kicker">' + o.kicker + "</p>";
      if (o.title) h += isLogo(o.title) ? logoHtml(o.title) : '<p class="ff-display">' + o.title + "</p>";
      if (o.body) h += '<p class="ff-lede">' + o.body + "</p>";
      if (o.stats) h += '<p class="ff-stat-line">' + o.stats + "</p>";
      if (o.html) h += o.html;
      menuActs = [];
      h += '<div class="ff-btns">';
      (o.buttons || []).forEach(function (b, i) {
        menuActs[i] = b.act;
        h += '<button type="button" class="ff-btn' + (b.small ? " small" : "") + '" data-mi="' + i + '"' + (b.disabled ? " disabled" : "") + ">" + b.label + "</button>";
      });
      if (o.row && o.row.length) {
        h += '<div class="ff-row">';
        o.row.forEach(function (b) { var i = menuActs.length; menuActs[i] = b.act; h += '<button type="button" class="ff-btn small" data-mi="' + i + '"' + (b.disabled ? " disabled" : "") + ">" + b.label + "</button>"; });
        h += "</div>";
      }
      if (o.app && inApp()) {
        var add = function (label, fn) { var i = menuActs.length; menuActs[i] = fn; h += '<button type="button" class="ff-btn small" data-mi="' + i + '">' + label + "</button>"; };
        if (!ui.adsOff()) { add("Remove ads (99p)", function () { post("removeAdsTapped"); }); add("Restore purchase", function () { post("restoreTapped"); }); }
        add("Privacy and ad choices", function () { post("privacyChoices"); });
        add("Privacy policy", function () { post("openPrivacyPolicy"); });
      }
      h += "</div>";
      if (o.help && o.help.length) h += '<ul class="ff-help">' + o.help.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul>";
      if (o.fine) h += '<p class="ff-fine">' + o.fine + "</p>";
      el.modal.innerHTML = '<div class="ff-card">' + h + "</div>";
      el.modal.hidden = false; el.shade.hidden = false; showDeco(true);
      el.shade.classList.toggle("is-solid", !!o.solid);
      el.pause.hidden = !!o.hidePause;
      var first = el.modal.querySelector("[data-mi]:not([disabled])");
      if (first && !coarse) try { first.focus({ preventScroll: true }); } catch (e) {}
    };
    ui.closeMenu = function () {
      ui.menuOpen = false; ui.pausedMenu = false;
      shell.classList.remove("ff-menu-open");
      el.modal.hidden = true; el.shade.hidden = true; el.modal.innerHTML = ""; el.pause.hidden = false; showDeco(false);
    };
    el.modal.addEventListener("click", function (e) {
      var b = e.target.closest("[data-mi]");
      if (!b || b.disabled) return;
      audio.unlock();
      var fn = menuActs[+b.getAttribute("data-mi")];
      if (fn) fn();
    });
    window.addEventListener("message", onMsg); document.addEventListener("message", onMsg);
    function onMsg(ev) {
      var d = ev.data;
      if (typeof d === "string") { try { d = JSON.parse(d); } catch (e) { return; } }
      if (d && d.type === "adsRemoved") { store.setItem(NOADS_KEY, "1"); if (ui.onAdsRemoved) ui.onAdsRemoved(); }
    }

    // ---------- pause ----------
    ui.pause = function () {
      if (!ui.playing) return;
      ui.playing = false;
      held = {}; padHeld = {};
      var p = root.querySelectorAll(".ff-pad.on"); for (var i = 0; i < p.length; i++) p[i].classList.remove("on");
      if (ui.game.onPause) ui.game.onPause();
      pauseMenu();
    };
    // games may add settings to the pause menu with game.pauseButtons() -> [{label, act, small}]; call ui.refreshPause() after a toggle
    function pauseMenu() {
      var extra = ui.game.pauseButtons ? ui.game.pauseButtons() || [] : [];
      ui.menu({ title: "Paused", buttons: [{ label: "Resume", act: ui.resume }].concat(extra, [{ label: "Menu", act: function () { ui.game.toTitle(); } }]), solid: true });
      ui.pausedMenu = true;
    }
    ui.refreshPause = function () { if (!ui.playing) pauseMenu(); };
    ui.resume = function () { ui.closeMenu(); ui.playing = true; last = performance.now(); acc = 0; if (ui.game.onResume) ui.game.onResume(); };
    el.pause.addEventListener("click", function () { audio.unlock(); if (ui.playing) ui.pause(); else if (ui.menuOpen && ui.pausedMenu) ui.resume(); });
    el.sound.addEventListener("click", function () { audio.unlock(); ui.setMuted(!muted); });
    window.KW_back = function () {
      if (ui.playing) { ui.pause(); return "paused"; }
      if (ui.pausedMenu) { ui.game.toTitle(); return "menu"; }
      if (ui.game && ui.game.onBack) return ui.game.onBack();
      return "exit";
    };
    document.addEventListener("visibilitychange", function () {
      if (document.hidden && ui.playing) ui.pause();
      if (!document.hidden && audio.ctx && audio.ctx.state === "suspended" && !muted) audio.ctx.resume();
    });

    // ---------- input ----------
    var held = {}, padHeld = {}, hits = {}, keymap = {};
    [].concat(pads.left || [], pads.right || [], cfg.keys || []).forEach(function (p) { (p.keys || []).forEach(function (k) { keymap[k] = p.id; }); });
    ui.down = function (id) { return !!(held[id] || padHeld[id]); };
    ui.hit = function (id) { if (hits[id]) { hits[id] = 0; return true; } return false; };
    ui.clearHits = function () { hits = {}; };
    function press(id) { if (!held[id] && !padHeld[id]) hits[id] = 1; if (ui.game && ui.game.onPress && ui.playing) ui.game.onPress(id); }
    window.addEventListener("keydown", function (e) {
      if (e.code === "KeyM") { audio.unlock(); ui.setMuted(!muted); return; }
      if (e.code === "Escape" || e.code === "KeyP") { if (ui.playing) ui.pause(); else if (ui.menuOpen && ui.pausedMenu) ui.resume(); return; }
      var id = keymap[e.code];
      if (!id) return;
      e.preventDefault();
      audio.unlock();
      if (e.repeat) return;
      press(id); held[id] = 1;
    });
    window.addEventListener("keyup", function (e) { var id = keymap[e.code]; if (id) { held[id] = 0; if (ui.game && ui.game.onRelease && ui.playing) ui.game.onRelease(id); } });
    window.addEventListener("blur", function () { held = {}; padHeld = {}; });
    var padBtns = root.querySelectorAll("[data-pad]");
    for (var pi = 0; pi < padBtns.length; pi++) (function (b) {
      var id = b.getAttribute("data-pad"), pid = null;
      b.addEventListener("pointerdown", function (e) {
        e.preventDefault(); audio.unlock();
        pid = e.pointerId; try { b.setPointerCapture(pid); } catch (x) {}
        press(id); padHeld[id] = 1; b.classList.add("on");
      });
      var up = function (e) { if (e.pointerId !== pid) return; pid = null; padHeld[id] = 0; b.classList.remove("on"); if (ui.game && ui.game.onRelease && ui.playing) ui.game.onRelease(id); };
      b.addEventListener("pointerup", up); b.addEventListener("pointercancel", up); b.addEventListener("lostpointercapture", up);
      b.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    })(padBtns[pi]);
    // canvas pointers in virtual coordinates: game.onPointer(type, x, y, id)
    function vpt(e) { var r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left - ui.ox) / ui.scale, y: (e.clientY - r.top - ui.oy) / ui.scale }; }
    ["pointerdown", "pointermove", "pointerup", "pointercancel"].forEach(function (t) {
      canvas.addEventListener(t, function (e) {
        if (t === "pointerdown") { audio.unlock(); try { canvas.setPointerCapture(e.pointerId); } catch (x) {} }
        if (!ui.game || !ui.game.onPointer) return;
        var p = vpt(e);
        ui.game.onPointer(t === "pointercancel" ? "pointerup" : t, p.x, p.y, e.pointerId, e);
      });
    });
    canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });

    // ---------- sizing ----------
    var cw = 0, ch = 0, dpr = 1;
    function fitViewport() {
      var vv = window.visualViewport;
      var h = Math.round(Math.min(vv ? vv.height : 1e9, window.innerHeight || 1e9, document.documentElement.clientHeight || 1e9));
      if (h > 0 && h < 1e9) document.documentElement.style.setProperty("--app-h", h + "px");
    }
    function resize() {
      fitViewport();
      var r = stage.getBoundingClientRect();
      cw = Math.max(1, r.width); ch = Math.max(1, r.height);
      dpr = Math.min(window.devicePixelRatio || 1, cfg.maxDpr || 2);
      canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
      var bw = cfg.view.w, bh = cfg.view.h;
      var s = Math.min(cw / bw, ch / bh);
      if (cfg.view.flex) { ui.VW = cw / s; ui.VH = ch / s; ui.ox = 0; ui.oy = 0; }
      else { ui.VW = bw; ui.VH = bh; ui.ox = (cw - bw * s) / 2; ui.oy = (ch - bh * s) / 2; }
      ui.scale = s; ui.dpr = dpr; ui.cw = cw; ui.ch = ch;
      ctx.imageSmoothingEnabled = false;
      if (ui.game && ui.game.onResize) ui.game.onResize();
    }
    ui.resize = resize;
    window.addEventListener("resize", resize);
    if (window.visualViewport) window.visualViewport.addEventListener("resize", resize);
    ui.beginFrame = function () {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = cfg.letterbox || "#000"; ctx.fillRect(0, 0, cw, ch);
      ctx.setTransform(ui.scale * dpr, 0, 0, ui.scale * dpr, ui.ox * dpr, ui.oy * dpr);
    };
    ui.text = function (s, x, y, size, color, align, glow) {
      ctx.font = (cfg.fontWeight || "bold ") + size + "px " + (cfg.font || "Fredoka, 'Baloo 2', ui-rounded, system-ui, sans-serif");
      ctx.textAlign = align || "left"; ctx.textBaseline = "middle";
      if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 8; }
      ctx.fillStyle = color || "#ffcf7a"; ctx.fillText(s, x, y);
      if (glow) ctx.shadowBlur = 0;
    };

    // ---------- loop ----------
    var STEP = 1 / 60, acc = 0, last = performance.now(), fpsN = 0, fpsT = 0;
    ui.fps = 60;
    function frame(now) {
      var dt = Math.min(0.1, (now - last) / 1000); last = now;
      fpsN++; fpsT += dt; if (fpsT >= 1) { ui.fps = fpsN / fpsT; fpsN = 0; fpsT = 0; }
      if (ui.playing) {
        acc += dt; var g = 0;
        while (acc >= STEP && g < 6) { ui.time += STEP; ui.game.update(STEP); acc -= STEP; g++; }
        if (g >= 6) acc = 0;
      } else { acc = 0; if (ui.game.idle) ui.game.idle(dt); }
      ui.beginFrame();
      ui.game.render(ctx, now / 1000);
      requestAnimationFrame(frame);
    }
    ui.start = function (game) {
      ui.game = game;
      resize();
      if (/[?&]qa\b/.test(location.search)) { window.__ff = ui; window.__game = game; }
      game.toTitle();
      requestAnimationFrame(function (t) { last = t; frame(t); });
    };
    ui.go = function () { ui.closeMenu(); ui.playing = true; last = performance.now(); acc = 0; hits = {}; };
    ui.stop = function () { ui.playing = false; };
    return ui;
  }

  // ---------- helpers ----------
  function rng(seed) { var s = seed >>> 0 || 1; return function () { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function fmtTime(s) { var m = Math.floor(s / 60), r = s - m * 60; return (m ? m + ":" + (r < 10 ? "0" : "") : "") + r.toFixed(2); }
  function n(x) { return Math.round(x).toLocaleString("en-GB"); }
  // hi-res render scale for games that draw into a low-res buffer (logical px -> device px), capped by a pixel budget.
  // ?hdq=1 forces the old chunky look; ?hdq=N sets the cap.
  function hdq(ui, px) {
    var m = /[?&]hdq=([\d.]+)/.exec(location.search), cap = m ? +m[1] : 3;
    var q = Math.max(1, Math.min(cap, px * (ui.scale || 1) * (ui.dpr || 1)));
    var w = ui.VW / px, h = ui.VH / px, budget = 1.2e6;
    if (w * h * q * q > budget) q = Math.sqrt(budget / (w * h));
    q = Math.max(1, Math.floor(q * 2) / 2); hdq.last = q; return q;
  }
  window.FF = { hdq: hdq, create: create, store: store, inApp: inApp, post: post, rng: rng, clamp: clamp, lerp: lerp, fmtTime: fmtTime, n: n, noteFreq: noteFreq };
})();
