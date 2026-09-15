/**
 * Arcade layer for Chocolate Doom WASM (Cloudflare doom-wasm / silentspacemarine).
 *
 * Input: do not dispatch browser KeyboardEvents. Chrome leaves keyCode=0 on
 * synthetic KeyboardEvent, so SDL never sees WASD/use/strafe. Feed Emscripten
 * JSEvents handlers directly (emscripten#3614) with a plain object that has
 * writable keyCode/which. Hold-pump keydown while a control is down so a
 * missed tic cannot drop movement. Move stick sends WASD + arrows so both the
 * shipped default.cfg and vanilla Chocolate Doom bindings walk.
 *
 * Score source (honest): this build only exports Emscripten _main / HEAP — no
 * documented kill-count API and no score lines on stdout. We read live
 * Chocolate Doom BSS from Module.HEAP32:
 *   totalkills, totalitems, totalsecret  (E1M1 HMP shareware = 6 / 37 / 3)
 *   players[0].killcount, itemcount, secretcount
 *   players[0].playerstate (PST_DEAD = 1)
 *   gamestate (GS_INTERMISSION = 1)
 * Values are not invented. HUD shows "—" until the HEAP hook locks.
 */
(function (global) {
  "use strict";

  var E1M1_HMP = { kills: 6, items: 37, secrets: 3, level: 1, name: "E1M1" };

  var KEYS = {
    w: { key: "w", code: "KeyW", keyCode: 87 },
    a: { key: "a", code: "KeyA", keyCode: 65 },
    s: { key: "s", code: "KeyS", keyCode: 83 },
    d: { key: "d", code: "KeyD", keyCode: 68 },
    left: { key: "ArrowLeft", code: "ArrowLeft", keyCode: 37 },
    up: { key: "ArrowUp", code: "ArrowUp", keyCode: 38 },
    right: { key: "ArrowRight", code: "ArrowRight", keyCode: 39 },
    down: { key: "ArrowDown", code: "ArrowDown", keyCode: 40 },
    ctrl: { key: "Control", code: "ControlLeft", keyCode: 17, location: 1 },
    space: { key: " ", code: "Space", keyCode: 32 },
    shift: { key: "Shift", code: "ShiftLeft", keyCode: 16, location: 1 },
    alt: { key: "Alt", code: "AltLeft", keyCode: 18, location: 1 },
  };

  function uuid() {
    if (global.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "run-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function $(id) {
    return document.getElementById(id);
  }

  function showTouchControls() {
    var w = window.innerWidth || 800;
    try {
      if (window.matchMedia("(any-pointer: fine)").matches && w >= 760) return false;
      if (window.matchMedia("(pointer: coarse)").matches) return true;
    } catch (e) { /* ignore */ }
    return w < 760;
  }

  function post(payload) {
    payload.runId = Arcade.runId;
    payload.level = E1M1_HMP.level;
    payload.levelName = E1M1_HMP.name;
    payload.skill = 3;
    payload.skillName = "Hurt Me Plenty";
    payload.source = "chocolate-doom-heap";
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(payload, "*");
      }
    } catch (e) { /* ignore */ }
  }

  function noop() {}

  function makeKeyEvent(type, def, repeat) {
    return {
      type: type,
      key: def.key,
      code: def.code,
      location: def.location || 0,
      ctrlKey: def === KEYS.ctrl,
      shiftKey: def === KEYS.shift,
      altKey: def === KEYS.alt,
      metaKey: false,
      repeat: !!repeat,
      charCode: 0,
      keyCode: def.keyCode,
      which: def.keyCode,
      char: "",
      locale: "",
      preventDefault: noop,
      stopPropagation: noop,
    };
  }

  function canvasPoint() {
    var canvas = document.getElementById("canvas");
    if (!canvas) return { x: 0, y: 0, canvas: null };
    var r = canvas.getBoundingClientRect();
    return {
      x: r.left + r.width / 2,
      y: r.top + r.height / 2,
      canvas: canvas,
    };
  }

  function makeMouseEvent(type, extra) {
    var pt = canvasPoint();
    extra = extra || {};
    return {
      type: type,
      screenX: pt.x,
      screenY: pt.y,
      clientX: pt.x,
      clientY: pt.y,
      ctrlKey: !!extra.ctrlKey,
      shiftKey: false,
      altKey: false,
      metaKey: false,
      button: extra.button || 0,
      buttons: extra.buttons || 0,
      movementX: extra.movementX || 0,
      movementY: extra.movementY || 0,
      preventDefault: noop,
      stopPropagation: noop,
    };
  }

  /**
   * Established Emscripten SDL path: call JSEvents handlers directly.
   * Dispatching a DOM KeyboardEvent does not set keyCode in Chromium.
   */
  function sdlSend(type, ev) {
    var handlers = typeof JSEvents !== "undefined" && JSEvents.eventHandlers;
    if (!handlers || !handlers.length) return 0;
    var n = 0;
    var i, h;
    for (i = 0; i < handlers.length; i++) {
      h = handlers[i];
      if (!h || h.eventTypeString !== type || !h.handlerFunc) continue;
      try {
        if (typeof JSEvents.inEventHandler === "number") {
          JSEvents.inEventHandler++;
          JSEvents.currentEventHandler = h;
        }
        h.handlerFunc(ev);
        n++;
      } catch (err) {
        /* ignore a single bad handler */
      } finally {
        if (typeof JSEvents.inEventHandler === "number" && JSEvents.inEventHandler > 0) {
          JSEvents.inEventHandler--;
        }
      }
    }
    return n;
  }

  function dispatchKey(type, def) {
    var ev = makeKeyEvent(type, def, false);
    if (sdlSend(type, ev)) return;
    var canvas = document.getElementById("canvas");
    var fallback = document.createEvent("Event");
    fallback.initEvent(type, true, true);
    fallback.key = def.key;
    fallback.code = def.code;
    fallback.location = def.location || 0;
    fallback.ctrlKey = def === KEYS.ctrl;
    fallback.shiftKey = def === KEYS.shift;
    fallback.altKey = def === KEYS.alt;
    fallback.metaKey = false;
    fallback.repeat = false;
    fallback.charCode = 0;
    fallback.keyCode = def.keyCode;
    fallback.which = def.keyCode;
    fallback.char = "";
    fallback.locale = "";
    window.dispatchEvent(fallback);
    document.dispatchEvent(fallback);
    if (canvas) canvas.dispatchEvent(fallback);
  }

  function dispatchMouseButton(down) {
    var type = down ? "mousedown" : "mouseup";
    var ev = makeMouseEvent(type, { button: 0, buttons: down ? 1 : 0 });
    if (sdlSend(type, ev)) return;
    var canvas = document.getElementById("canvas");
    if (!canvas) return;
    canvas.dispatchEvent(
      new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        view: window,
        button: 0,
        buttons: down ? 1 : 0,
        clientX: ev.clientX,
        clientY: ev.clientY,
      })
    );
  }

  function dispatchMouseMove(dx) {
    if (!dx) return;
    sdlSend("mousemove", makeMouseEvent("mousemove", { movementX: dx, movementY: 0, buttons: 0 }));
  }

  var held = Object.create(null);
  var holdPump = null;

  function anyHeld() {
    var name;
    for (name in held) {
      if (held[name]) return true;
    }
    return false;
  }

  function pumpHeldKeys() {
    var name;
    for (name in held) {
      if (!held[name]) continue;
      dispatchKey("keydown", KEYS[name]);
    }
  }

  function startHoldPump() {
    if (holdPump) return;
    holdPump = setInterval(function () {
      if (!anyHeld()) {
        clearInterval(holdPump);
        holdPump = null;
        return;
      }
      pumpHeldKeys();
    }, 32);
  }

  function holdKey(name, on) {
    var def = KEYS[name];
    if (!def) return;
    if (on) {
      if (held[name]) return;
      held[name] = true;
      dispatchKey("keydown", def);
      if (name === "ctrl") dispatchMouseButton(true);
      startHoldPump();
    } else {
      if (!held[name]) return;
      held[name] = false;
      dispatchKey("keyup", def);
      if (name === "ctrl") dispatchMouseButton(false);
    }
    if (name === "w") holdKey("up", on);
    if (name === "s") holdKey("down", on);
  }

  function releaseAllKeys() {
    Object.keys(held).forEach(function (name) {
      if (held[name]) holdKey(name, false);
    });
  }

  /* —— HEAP stats —— */

  function heap32() {
    var M = global.Module;
    if (!M) return null;
    return M.HEAP32 || null;
  }

  function findTotals(h) {
    var k = E1M1_HMP.kills;
    var it = E1M1_HMP.items;
    var s = E1M1_HMP.secrets;
    var n = Math.min(h.length, (3 * 1024 * 1024) >> 2);
    var i;
    for (i = 8; i < n - 4; i++) {
      if (h[i] === k && h[i + 1] === it && h[i + 2] === s && h[i - 3] === 0 && h[i - 2] === 0) {
        return i;
      }
    }
    for (i = 8; i < n - 4; i++) {
      if (h[i] === k && h[i + 1] === it && h[i + 2] === s) return i;
    }
    return -1;
  }

  function findSkillMap(h) {
    var n = Math.min(h.length, (3 * 1024 * 1024) >> 2);
    for (var i = 2; i < n - 4; i++) {
      if (h[i] === 2 && h[i + 1] === 0 && h[i + 2] === 1 && h[i + 3] === 1) {
        return i;
      }
    }
    return -1;
  }

  var KILL_OFFSETS = [212, 192, 216, 188, 220, 208, 200, 180, 176, 228, 232];

  function looksLikeHeapPtr(p, byteLen) {
    return p > 4096 && p < byteLen && (p & 3) === 0;
  }

  function readStatsAt(h, baseBytes, killOff) {
    var byteLen = h.length * 4;
    var base = baseBytes >> 2;
    if (base < 0 || base + 80 >= h.length) return null;
    var mo = h[base];
    var pst = h[base + 1];
    if (!looksLikeHeapPtr(mo, byteLen)) return null;
    if (pst < 0 || pst > 2) return null;
    var ki = (baseBytes + killOff) >> 2;
    var kills = h[ki];
    var items = h[ki + 1];
    var secrets = h[ki + 2];
    if (kills < 0 || kills > E1M1_HMP.kills) return null;
    if (items < 0 || items > E1M1_HMP.items) return null;
    if (secrets < 0 || secrets > E1M1_HMP.secrets) return null;
    return { kills: kills, items: items, secrets: secrets, playerstate: pst, mo: mo, killOff: killOff };
  }

  var PLAYER_SIZES = [288, 292, 296, 300, 304, 308, 312, 316, 320, 324, 328, 272, 280, 256, 336, 352];
  var TURBO_SIZES = [16, 4, 8, 20, 32];

  function isPlayerBase(h, baseBytes) {
    var i = baseBytes >> 2;
    if (i < 0 || i + 54 >= h.length) return false;
    var byteLen = h.length * 4;
    if (!looksLikeHeapPtr(h[i], byteLen)) return false;
    var pst = h[i + 1];
    if (pst < 0 || pst > 2) return false;
    if (h[i + 45] !== 200 || h[i + 46] !== 50 || h[i + 47] !== 300 || h[i + 48] !== 50) return false;
    return true;
  }

  function findPlayer(h, totalsIdx) {
    var totalsBytes = totalsIdx * 4;
    var t, s, base, st;
    for (t = 0; t < TURBO_SIZES.length; t++) {
      for (s = 0; s < PLAYER_SIZES.length; s++) {
        base = totalsBytes - 12 - TURBO_SIZES[t] - 4 * PLAYER_SIZES[s];
        if (base < 0 || (base & 3) !== 0) continue;
        if (!isPlayerBase(h, base)) continue;
        st = readStatsAt(h, base, 212);
        if (!st) continue;
        st.base = base;
        st.playerSize = PLAYER_SIZES[s];
        return st;
      }
    }
    var addr;
    for (addr = Math.max(0, totalsBytes - 4096); addr < totalsBytes - 200; addr += 4) {
      if (!isPlayerBase(h, addr)) continue;
      st = readStatsAt(h, addr, 212);
      if (!st) continue;
      st.base = addr;
      st.playerSize = 0;
      return st;
    }
    return null;
  }

  var Arcade = {
    runId: uuid(),
    locked: false,
    ended: false,
    endReason: null,
    totalsIdx: -1,
    skillIdx: -1,
    playerBase: -1,
    killOff: -1,
    snapshot: { kills: null, items: null, secrets: null, level: E1M1_HMP.level },
    peak: { kills: 0, items: 0, secrets: 0 },
  };

  function paintHud(stats, statusText) {
    var set = function (id, val) {
      var el = $(id);
      if (!el) return;
      el.textContent = val == null ? "—" : String(val);
    };
    set("statKills", stats.kills);
    set("statItems", stats.items);
    set("statSecrets", stats.secrets);
    set("statLevel", E1M1_HMP.name);
    var status = $("statStatus");
    if (status && statusText) status.textContent = statusText;
  }

  function lockOn(h) {
    if (Arcade.totalsIdx < 0) Arcade.totalsIdx = findTotals(h);
    if (Arcade.skillIdx < 0) Arcade.skillIdx = findSkillMap(h);
    if (Arcade.totalsIdx < 0) return false;
    var p = findPlayer(h, Arcade.totalsIdx);
    if (!p) return false;
    Arcade.playerBase = p.base;
    Arcade.killOff = p.killOff;
    Arcade.locked = true;
    console.info(
      "[arcade] HEAP hook locked",
      "totals@" + (Arcade.totalsIdx * 4),
      "player@" + p.base,
      "killcount+" + p.killOff,
      "sizeof~" + p.playerSize,
      "skillMap@" + (Arcade.skillIdx >= 0 ? Arcade.skillIdx * 4 : "n/a")
    );
    return true;
  }

  function pollStats() {
    if (Arcade.ended) return;
    var h = heap32();
    if (!h) return;

    if (!Arcade.locked) {
      lockOn(h);
      if (!Arcade.locked) {
        paintHud({ kills: null, items: null, secrets: null }, "syncing game memory…");
        return;
      }
    }

    var st = readStatsAt(h, Arcade.playerBase, Arcade.killOff);
    if (!st) {
      Arcade.locked = false;
      Arcade.playerBase = -1;
      return;
    }

    if (st.kills + st.items + st.secrets === 0 && Arcade.peak.kills + Arcade.peak.items + Arcade.peak.secrets > 0) {
      finishRun("restarted", Arcade.peak);
      return;
    }

    Arcade.snapshot = {
      kills: st.kills,
      items: st.items,
      secrets: st.secrets,
      level: E1M1_HMP.level,
    };
    if (st.kills >= Arcade.peak.kills) Arcade.peak.kills = st.kills;
    if (st.items >= Arcade.peak.items) Arcade.peak.items = st.items;
    if (st.secrets >= Arcade.peak.secrets) Arcade.peak.secrets = st.secrets;

    var gamestate = 0;
    if (Arcade.skillIdx > 0) gamestate = h[Arcade.skillIdx - 1];

    var status = "E1M1 · Hurt Me Plenty";
    paintHud(Arcade.snapshot, status);
    post({
      type: "doom-run-stats",
      kills: st.kills,
      items: st.items,
      secrets: st.secrets,
      level: E1M1_HMP.level,
      playerstate: st.playerstate,
      gamestate: gamestate,
    });

    if (st.playerstate === 1) {
      finishRun("dead", Arcade.snapshot);
      return;
    }
    if (gamestate === 1) {
      finishRun("completed", Arcade.snapshot);
    }
  }

  function finishRun(reason, stats) {
    if (Arcade.ended) return;
    Arcade.ended = true;
    Arcade.endReason = reason;
    var out = {
      kills: stats.kills | 0,
      items: stats.items | 0,
      secrets: stats.secrets | 0,
      level: E1M1_HMP.level,
    };
    paintHud(out, reason === "completed" ? "level complete" : reason === "dead" ? "down" : "run ended");
    showResult(out, reason);
    post({
      type: "doom-run-result",
      kills: out.kills,
      items: out.items,
      secrets: out.secrets,
      level: out.level,
      ended: reason,
    });
  }

  function showResult(stats, reason) {
    var overlay = $("runResult");
    if (!overlay) return;
    var title = $("resultTitle");
    if (title) {
      title.textContent = reason === "completed" ? "E1M1 CLEARED" : reason === "dead" ? "YOU DIED" : "RUN ENDED";
    }
    var rk = $("resultKills");
    var ri = $("resultItems");
    var rs = $("resultSecrets");
    if (rk) rk.textContent = String(stats.kills);
    if (ri) ri.textContent = String(stats.items);
    if (rs) rs.textContent = String(stats.secrets);
    overlay.hidden = false;
  }

  /* —— Pointer lock / mouse —— */

  function setupPointerLock(canvas) {
    var hint = $("captureHint");
    function locked() {
      return document.pointerLockElement === canvas;
    }
    function sync() {
      if (hint) hint.hidden = locked() || showTouchControls();
      document.documentElement.classList.toggle("pointer-locked", locked());
    }
    function capture() {
      canvas.focus();
      if (!locked() && canvas.requestPointerLock) {
        try { canvas.requestPointerLock(); } catch (e) { /* ignore */ }
      }
    }
    canvas.addEventListener("click", capture);
    if (hint) {
      hint.addEventListener("click", function (ev) {
        ev.preventDefault();
        capture();
      });
    }
    canvas.addEventListener("pointerdown", function (e) {
      if (!e.isTrusted) return;
      if (e.target !== canvas) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      holdKey("ctrl", true);
    });
    canvas.addEventListener("pointerup", function () {
      holdKey("ctrl", false);
    });
    canvas.addEventListener("pointercancel", function () {
      holdKey("ctrl", false);
    });
    document.addEventListener("pointerlockchange", sync);
    sync();
  }

  /* —— Keyboard: WASD + arrows both walk even if cfg is vanilla —— */

  function setupKeyboard() {
    function mapMove(e, on) {
      if (e.code === "KeyW" || e.code === "ArrowUp") {
        holdKey("w", on);
        holdKey("up", on);
      }
      if (e.code === "KeyS" || e.code === "ArrowDown") {
        holdKey("s", on);
        holdKey("down", on);
      }
      if (e.code === "KeyA") holdKey("a", on);
      if (e.code === "KeyD") holdKey("d", on);
    }
    window.addEventListener("keydown", function (e) {
      if (!e.isTrusted) return;
      mapMove(e, true);
      if (
        e.code === "ArrowUp" ||
        e.code === "ArrowDown" ||
        e.code === "ArrowLeft" ||
        e.code === "ArrowRight" ||
        e.code === "Space"
      ) {
        e.preventDefault();
      }
    });
    window.addEventListener("keyup", function (e) {
      if (!e.isTrusted) return;
      mapMove(e, false);
    });
    window.addEventListener("blur", releaseAllKeys);
  }

  /* —— On-screen sticks —— */

  function stickHandler(el, onVec) {
    if (!el) return;
    var pid = null;
    function vecFrom(ev) {
      var r = el.getBoundingClientRect();
      var x = (ev.clientX - r.left) / r.width * 2 - 1;
      var y = (ev.clientY - r.top) / r.height * 2 - 1;
      if (x < -1) x = -1; if (x > 1) x = 1;
      if (y < -1) y = -1; if (y > 1) y = 1;
      var knob = el.querySelector(".knob");
      if (knob) {
        knob.style.transform = "translate(" + (x * 28) + "px," + (y * 28) + "px)";
      }
      onVec(x, y);
    }
    function end() {
      pid = null;
      var knob = el.querySelector(".knob");
      if (knob) knob.style.transform = "translate(0,0)";
      onVec(0, 0);
    }
    el.addEventListener("pointerdown", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      pid = ev.pointerId;
      el.setPointerCapture(pid);
      vecFrom(ev);
    });
    el.addEventListener("pointermove", function (ev) {
      if (pid == null || ev.pointerId !== pid) return;
      ev.preventDefault();
      vecFrom(ev);
    });
    ["pointerup", "pointercancel"].forEach(function (type) {
      el.addEventListener(type, function (ev) {
        if (pid == null || ev.pointerId !== pid) return;
        ev.preventDefault();
        end();
      });
    });
  }

  function holdBtn(el, keyName) {
    if (!el) return;
    var pid = null;
    function down(ev) {
      ev.preventDefault();
      ev.stopPropagation();
      pid = ev.pointerId;
      try {
        el.setPointerCapture(pid);
      } catch (err) { /* ignore */ }
      el.classList.add("down");
      holdKey(keyName, true);
    }
    function up(ev) {
      if (pid == null || ev.pointerId !== pid) return;
      ev.preventDefault();
      pid = null;
      el.classList.remove("down");
      holdKey(keyName, false);
    }
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  }

  function setupTouch() {
    var layer = $("touchControls");
    if (!layer) return;
    function apply() {
      var show = showTouchControls();
      layer.hidden = !show;
      document.documentElement.classList.toggle("touch-on", show);
      post({ type: "doom-touch-ui", on: show });
      return show;
    }
    apply();
    window.addEventListener("resize", apply);
    try {
      window.matchMedia("(pointer: coarse)").addEventListener("change", apply);
      window.matchMedia("(any-pointer: fine)").addEventListener("change", apply);
    } catch (e) { /* ignore */ }

    stickHandler($("stickMove"), function (x, y) {
      var dead = 0.28;
      var fwd = y < -dead;
      var back = y > dead;
      var sl = x < -dead;
      var sr = x > dead;
      holdKey("w", fwd);
      holdKey("up", fwd);
      holdKey("s", back);
      holdKey("down", back);
      holdKey("a", sl);
      holdKey("d", sr);
      holdKey("shift", Math.hypot(x, y) > 0.72);
    });
    stickHandler($("stickLook"), function (x) {
      var dead = 0.28;
      holdKey("left", x < -dead);
      holdKey("right", x > dead);
      var turn = 0;
      if (x < -dead) turn = Math.round((x + dead) * 18);
      else if (x > dead) turn = Math.round((x - dead) * 18);
      dispatchMouseMove(turn);
    });
    holdBtn($("btnFire"), "ctrl");
    holdBtn($("btnUse"), "space");
    holdBtn($("btnStrafe"), "alt");
  }

  function boot(opts) {
    Arcade.runId = uuid();
    var canvas = opts.canvas;
    try { canvas.focus(); } catch (e) { /* ignore */ }
    setupPointerLock(canvas);
    setupKeyboard();
    setupTouch();
    paintHud({ kills: null, items: null, secrets: null }, "loading E1M1…");
    var restart = $("btnRestart");
    if (restart) {
      restart.addEventListener("click", function () {
        location.reload();
      });
    }
    var iv = setInterval(pollStats, 100);
    Arcade._iv = iv;
    post({ type: "doom-run-ready", kills: null, items: null, secrets: null, level: E1M1_HMP.level });
  }

  global.DoomArcade = {
    boot: boot,
    args: [
      "-iwad", "doom1.wad",
      "-window", "-nogui", "-nomusic",
      "-noload",
      "-config", "/default.cfg",
      "-extraconfig", "/chocolate-doom.cfg",
      "-skill", "3",
      "-warp", "1", "1",
    ],
  };
})(window);
