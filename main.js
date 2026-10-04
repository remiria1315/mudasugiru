(function () {
  var root = document.documentElement;
  function toggle() {
    var d = root.getAttribute("data-theme");
    var cur =
      d ||
      (matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light");
    root.setAttribute("data-theme", cur === "dark" ? "light" : "dark");
    col();
  }
  document.getElementById("tg").onclick = toggle;

  var audioCtx = null;

  // --- 衝突音の制限設定 ---
  var MAX_SOUNDS_PER_SEC = 1500; // 1秒間に鳴らせる最大回数
  var SOUND_COOLDOWN_MS = 20; // 音が鳴る最短間隔（ミリ秒）
  var soundHistory = [];
  var lastSoundTime = 0;

  function initAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  }

  // ボール同士の衝突や壁反射時に再生する効果音関数（回数制限つき）
  function playBounceSound(speed) {
    if (!audioCtx) return;
    if (!params.audio) return;

    var now = performance.now();

    // 最短発音間隔のチェック
    if (now - lastSoundTime < SOUND_COOLDOWN_MS) return;

    // 1秒以上前の履歴を削除
    while (soundHistory.length > 0 && soundHistory[0] <= now - 1000) {
      soundHistory.shift();
    }

    // 秒間再生数の上限チェック
    if (soundHistory.length >= MAX_SOUNDS_PER_SEC) return;

    try {
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = "sine";
      var freq = 800 + Math.random() * 600;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      var vol = Math.min(0.2, Math.max(0.01, speed / 2000));
      gain.gain.setValueAtTime(vol, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        audioCtx.currentTime + 0.08,
      );
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);

      // 履歴と最終再生時刻を更新
      soundHistory.push(now);
      lastSoundTime = now;
    } catch (e) {}
  }

  var params = {
    count: 3000,
    drawLines: true,
    size: 2,
    minWidth: 0.5,
    maxWidth: 5.5,
    maxDist: 400,
    drag: 0.99,
    force: 1.8,
    swirl: 0.15,
    collision: false,
    audio: false,
    glow: 0,
  };

  var inputCount = document.getElementById("param-count");
  var btnRespawn = document.getElementById("btn-respawn");
  var inputDrawLines = document.getElementById("param-draw-lines");
  var inputSize = document.getElementById("param-size");
  var inputMinWidth = document.getElementById("param-min-width");
  var inputMaxWidth = document.getElementById("param-max-width");
  var inputMaxDist = document.getElementById("param-max-dist");
  var inputDrag = document.getElementById("param-drag");
  var inputForce = document.getElementById("param-force");
  var inputSwirl = document.getElementById("param-swirl");
  var inputCollision = document.getElementById("param-collision");
  var inputAudio = document.getElementById("param-audio");
  var inputGlow = document.getElementById("param-glow");

  var valCount = document.getElementById("val-count");
  var valSize = document.getElementById("val-size");
  var valMinWidth = document.getElementById("val-min-width");
  var valMaxWidth = document.getElementById("val-max-width");
  var valMaxDist = document.getElementById("val-max-dist");
  var valDrag = document.getElementById("val-drag");
  var valForce = document.getElementById("val-force");
  var valSwirl = document.getElementById("val-swirl");
  var valGlow = document.getElementById("val-glow");

  var debugOverlay = document.getElementById("debug-overlay");
  var dbgFps = document.getElementById("dbg-fps");
  var dbgCount = document.getElementById("dbg-count");
  var dbgSpeed = document.getElementById("dbg-speed");

  inputCount.addEventListener("input", function (e) {
    params.count = parseInt(e.target.value, 10);
    valCount.textContent = params.count;
  });
  btnRespawn.addEventListener("click", function () {
    initParticles();
  });
  inputDrawLines.addEventListener("change", function (e) {
    params.drawLines = e.target.checked;
  });
  inputSize.addEventListener("input", function (e) {
    params.size = parseFloat(e.target.value);
    valSize.textContent = params.size + "px";
  });
  inputMinWidth.addEventListener("input", function (e) {
    params.minWidth = parseFloat(e.target.value);
    valMinWidth.textContent = params.minWidth + "px";
  });
  inputMaxWidth.addEventListener("input", function (e) {
    params.maxWidth = parseFloat(e.target.value);
    valMaxWidth.textContent = params.maxWidth + "px";
  });
  inputMaxDist.addEventListener("input", function (e) {
    params.maxDist = parseFloat(e.target.value);
    valMaxDist.textContent = params.maxDist + "px";
  });
  inputDrag.addEventListener("input", function (e) {
    params.drag = parseFloat(e.target.value);
    valDrag.textContent = params.drag;
  });
  inputForce.addEventListener("input", function (e) {
    params.force = parseFloat(e.target.value);
    valForce.textContent = params.force;
  });
  inputSwirl.addEventListener("input", function (e) {
    params.swirl = parseFloat(e.target.value);
    valSwirl.textContent = params.swirl;
  });
  inputCollision.addEventListener("change", function (e) {
    params.collision = e.target.checked;
  });
  inputAudio.addEventListener("change", function (e) {
    params.audio = e.target.checked;
    if (params.audio) initAudio();
  });
  inputGlow.addEventListener("input", function (e) {
    params.glow = parseFloat(e.target.value);
    valGlow.textContent = params.glow + "px";
  });

  function rgbToHsv(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    var max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    var h,
      s,
      v = max;
    var d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max === min) {
      h = 0;
    } else {
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }
    return { h: h * 360, s: s * 100, v: v * 100 };
  }

  var cv = document.getElementById("bg"),
    cx = cv.getContext("2d"),
    W,
    H,
    P = [],
    E = [],
    m = { x: -999, y: -999 },
    rm = matchMedia("(prefers-reduced-motion:reduce)").matches,
    C = { a: "", b: "" },
    f = 0;
  var lastTime = 0;

  var frameCount = 0;
  var lastFpsUpdate = 0;
  var currentFps = 0;

  var currentThemeHsv = { h: 240, s: 56.8, v: 98 };

  var isShift = false;
  var isSpace = false;
  var isCtrl = false;
  var isMouseDown = false;

  function col() {
    var s = getComputedStyle(root);
    C.a = s.getPropertyValue("--a").trim();
    C.b = s.getPropertyValue("--b").trim();

    var d = root.getAttribute("data-theme");
    var isDark =
      d === "dark" || (!d && matchMedia("(prefers-color-scheme:dark)").matches);

    if (isDark) {
      currentThemeHsv = rgbToHsv(250, 136, 136);
    } else {
      currentThemeHsv = rgbToHsv(136, 136, 250);
    }

    for (var i = 0; i < P.length; i++) {
      P[i].baseH = (currentThemeHsv.h + (Math.random() * 20 - 10) + 360) % 360;
      P[i].baseS = Math.min(
        100,
        Math.max(0, currentThemeHsv.s + (Math.random() * 20 - 10)),
      );
      P[i].baseV = Math.min(
        100,
        Math.max(0, currentThemeHsv.v + (Math.random() * 10 - 5)),
      );
    }
  }

  function initParticles() {
    var n = params.count;
    P = [];
    for (var i = 0; i < n; i++) {
      P.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 30,
        vy: (Math.random() - 0.5) * 30,
        baseH: (currentThemeHsv.h + (Math.random() * 20 - 10) + 360) % 360,
        baseS: Math.min(
          100,
          Math.max(0, currentThemeHsv.s + (Math.random() * 20 - 10)),
        ),
        baseV: Math.min(
          100,
          Math.max(0, currentThemeHsv.v + (Math.random() * 10 - 5)),
        ),
      });
    }

    E = [];
    for (var i = 0; i < P.length - 1; i += 2) {
      E.push({ a: P[i], b: P[i + 1] });
    }
  }

  function size() {
    var r = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth;
    H = innerHeight;
    cv.width = W * r;
    cv.height = H * r;
    cx.setTransform(r, 0, 0, r, 0, 0);

    initParticles();
  }

  function draw(now) {
    if (f++ % 60 === 0) col();

    var currentTime = now || performance.now();
    if (!lastTime) lastTime = currentTime;
    var dt = Math.min((currentTime - lastTime) / 1000, 0.064);
    lastTime = currentTime;

    frameCount++;
    if (!lastFpsUpdate) lastFpsUpdate = currentTime;
    var isDebugVisible = !debugOverlay.classList.contains("ui-hidden");
    var totalSpeed = 0;

    if (currentTime - lastFpsUpdate >= 1000) {
      currentFps = Math.round(
        (frameCount * 1000) / (currentTime - lastFpsUpdate),
      );
      frameCount = 0;
      lastFpsUpdate = currentTime;
    }

    cx.clearRect(0, 0, W, H);

    var currentBaseDrag = isSpace ? 0.9 : params.drag;
    var drag = Math.pow(currentBaseDrag, dt * 60);

    // 強力モードの判定：クリック(isMouseDown)を除外し、CtrlキーかSpaceキーでのみ適用
    var isStrongForce = isCtrl || isSpace;
    var forceBase = isStrongForce ? params.force * 4 : params.force;

    var currentForce = (isShift ? -forceBase : forceBase) * dt;

    var pLen = P.length;
    var baseR = params.size;

    if (params.collision) {
      var minDist = baseR * 2;
      var minDistSq = minDist * minDist;
      for (var i = 0; i < pLen; i++) {
        for (var j = i + 1; j < pLen; j += 2) {
          var dx = P[j].x - P[i].x;
          var dy = P[j].y - P[i].y;
          var distSq = dx * dx + dy * dy;

          if (distSq < minDistSq && distSq > 0) {
            var dist = Math.sqrt(distSq);
            var overlap = (minDist - dist) * 0.5;
            var nx = dx / dist;
            var ny = dy / dist;

            P[i].x -= nx * overlap;
            P[i].y -= ny * overlap;
            P[j].x += nx * overlap;
            P[j].y += ny * overlap;

            P[i].vx -= nx * 0.5;
            P[i].vy -= ny * 0.5;
            P[j].vx += nx * 0.5;
            P[j].vy += ny * 0.5;

            // ボール同士の衝突時（速度差に基づいて発音制限ロジックへ引き渡し）
            var relSpeed =
              Math.hypot(P[i].vx - P[j].vx, P[i].vy - P[j].vy) * 60;
            if (relSpeed > 20) {
              playBounceSound(relSpeed);
            }
          }
        }
      }
    }

    cx.shadowBlur = params.glow;

    for (var i = 0; i < pLen; i++) {
      var p = P[i];
      var dx = m.x - p.x,
        dy = m.y - p.y;

      // ポインターが下りているとき（isMouseDown）のみマウスの力を加算
      if (isMouseDown && Math.abs(dx) < 180 && Math.abs(dy) < 180) {
        var d = Math.hypot(dx, dy);
        if (d < 180 && d > 0) {
          p.vx += (dx / d) * currentForce * 100;
          p.vy += (dy / d) * currentForce * 100;

          p.vx += (-dy / d) * currentForce * params.swirl * 100;
          p.vy += (dx / d) * currentForce * params.swirl * 100;
        }
      }

      p.vx *= drag;
      p.vy *= drag;
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;

      var hit = false;
      var curSpeed = Math.hypot(p.vx, p.vy) * 60;

      if (p.x < 0) {
        p.x = 0;
        p.vx *= -1;
        hit = true;
      }
      if (p.x > W) {
        p.x = W;
        p.vx *= -1;
        hit = true;
      }
      if (p.y < 0) {
        p.y = 0;
        p.vy *= -1;
        hit = true;
      }
      if (p.y > H) {
        p.y = H;
        p.vy *= -1;
        hit = true;
      }

      if (hit && curSpeed > 50) {
        playBounceSound(curSpeed);
      }

      var speedPx = curSpeed;
      if (isDebugVisible) totalSpeed += speedPx;

      var currentH = (p.baseH + speedPx / 16) % 360;
      var currentS = Math.min(100, p.baseS + speedPx / 64);
      var currentV = Math.min(100, p.baseV + speedPx / 128);
      var currentR = Math.max(0.1, baseR + speedPx / 512);

      var l = ((200 - currentS) * currentV) / 100;
      var hslS =
        l === 0 || l === 200
          ? 0
          : (currentS * currentV) / (l <= 100 ? l : 200 - l);
      var hslL = l / 2;

      var colorStr = "hsl(" + currentH + ", " + hslS + "%, " + hslL + "%)";

      cx.fillStyle = colorStr;
      cx.shadowColor = colorStr;

      cx.beginPath();
      cx.arc(p.x, p.y, currentR, 0, 6.283);
      cx.fill();
    }

    if (params.drawLines) {
      var maxDist = params.maxDist;
      var minW = params.minWidth;
      var maxW = params.maxWidth;
      var widthRange = maxW - minW;

      for (var i = 0; i < E.length; i++) {
        var e = E[i];
        var dx = e.a.x - e.b.x;
        var dy = e.a.y - e.b.y;
        var distSq = dx * dx + dy * dy;

        if (distSq < maxDist * maxDist) {
          var d = Math.sqrt(distSq);
          var ratio = 1 - d / maxDist;

          var hue = (1 - ratio) * 240;
          var strokeColor = "hsla(" + hue + ", 80%, 60%, " + ratio * 0.4 + ")";
          var glowColor = "hsl(" + hue + ", 80%, 60%)";
          var lineWidth = minW + ratio * widthRange;

          cx.strokeStyle = strokeColor;
          cx.shadowColor = glowColor;
          cx.shadowBlur = params.glow;
          cx.lineWidth = lineWidth;

          cx.beginPath();
          cx.moveTo(e.a.x, e.a.y);
          cx.lineTo(e.b.x, e.b.y);
          cx.stroke();
        }
      }
    }

    cx.shadowBlur = 0;

    if (isDebugVisible) {
      dbgFps.textContent = currentFps;
      dbgCount.textContent = pLen;
      dbgSpeed.textContent = (pLen > 0 ? totalSpeed / pLen : 0).toFixed(1);
    }

    if (!rm) requestAnimationFrame(draw);
  }

  col();
  size();
  draw();
  addEventListener("resize", size);

  function updatePointer(e) {
    if (e.type === "touchmove") {
      if (!e.target.closest(".ctrl-panel")) {
        e.preventDefault();
      }
    }

    var x = e.clientX || (e.touches && e.touches[0].clientX);
    var y = e.clientY || (e.touches && e.touches[0].clientY);
    if (x !== undefined && y !== undefined) {
      m.x = x;
      m.y = y;
      var h = document.getElementById("h"),
        nx = x / W - 0.5,
        ny = y / H - 0.5;
      if (h) {
        h.style.setProperty("--mx", nx * 2);
        h.style.setProperty("--my", ny * 2);
        h.style.setProperty("--rx", nx * 14 + "deg");
        h.style.setProperty("--ry", -ny * 14 + "deg");
      }
    }
  }

  addEventListener("pointermove", updatePointer);
  addEventListener("touchmove", updatePointer, { passive: false });

  var ctrlPanel = document.getElementById("ctrl-panel");
  var tgBtn = document.getElementById("tg");
  var mobileBtns = document.querySelectorAll(".circle-btn");

  function toggleUI() {
    ctrlPanel.classList.toggle("ui-hidden");
    tgBtn.classList.toggle("ui-hidden");
    mobileBtns.forEach(function (btn) {
      btn.classList.toggle("ui-hidden");
    });
  }

  addEventListener("keydown", function (e) {
    if (e.key === "Shift") isShift = true;
    if (e.key === "Control") isCtrl = true;
    if (e.code === "Space") {
      isSpace = true;
      e.preventDefault();
    }
    if (e.key === "Escape") {
      toggleUI();
    }
    if (e.key === "j" || e.key === "J") {
      debugOverlay.classList.toggle("ui-hidden");
    }
  });

  addEventListener("keyup", function (e) {
    if (e.key === "Shift") isShift = false;
    if (e.key === "Control") isCtrl = false;
    if (e.code === "Space") isSpace = false;
  });

  addEventListener("pointerdown", function (e) {
    initAudio();
    if (
      e.target.closest(".ctrl-panel") ||
      e.target.closest(".tg") ||
      e.target.closest(".circle-btn")
    )
      return;
    isMouseDown = true;
  });
  addEventListener("pointerup", function (e) {
    isMouseDown = false;
  });

  function bindTouchBtn(btnId, flagSetter) {
    var btn = document.getElementById(btnId);
    if (!btn) return;

    var active = function (e) {
      initAudio();
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      flagSetter(true);
      btn.classList.add("active");
    };
    var inactive = function (e) {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      flagSetter(false);
      btn.classList.remove("active");
    };

    btn.addEventListener("touchstart", active, { passive: false });
    btn.addEventListener("touchend", inactive, { passive: false });
    btn.addEventListener("mousedown", active);
    btn.addEventListener("mouseup", inactive);
    btn.addEventListener("mouseleave", inactive);
  }

  bindTouchBtn("mbtn-push", function (val) {
    isShift = val;
  });
  bindTouchBtn("mbtn-slow", function (val) {
    isSpace = val;
  });
  bindTouchBtn("mbtn-strong", function (val) {
    isCtrl = val;
  });

  document
    .getElementById("mbtn-toggle-ui")
    .addEventListener("click", function (e) {
      e.stopPropagation();
      toggleUI();
    });
})();