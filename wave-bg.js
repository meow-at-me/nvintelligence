/*
  wave-bg.js — fixed Gerstner ocean wave background.
  Drop-in: add ONE line before </body> (after nv.js is fine):
      <script src="wave-bg.js"></script>

  It self-installs a fixed full-viewport <canvas> (z-index -2) plus a dark
  scrim (z-index -1) behind ALL page content. No other markup changes needed,
  because normal/positioned content paints above negative z-index layers.

  Requires Three.js. If window.THREE is absent it loads r128 from cdnjs.
  Honors prefers-reduced-motion and pauses when the tab is hidden.
*/
(function () {
  "use strict";

  // ---- config (tweak freely) ----------------------------------------------
  var CFG = {
    clearColor: 0x050510,   // deep backdrop; matches the dark editorial theme
    scrim: "linear-gradient(180deg, rgba(6,6,18,0.46) 0%, rgba(6,6,18,0.62) 48%, rgba(6,6,18,0.80) 100%)",
    density: 160,           // grid is density × density points (perf vs. detail)
    separation: 1.8,        // spacing between points (world units)
    pointSize: 0.62,
    fog: 0.0065,
    cameraY: 40,
    cameraR: 152,           // camera distance from centre
    sway: 0.22,             // gentle horizontal camera drift (radians)
    timeStep: 0.02,         // animation speed
    threeUrl: "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"
  };

  // wave components: large swell → medium → chop → ripple
  var WAVES = [
    { dx: 1.0,  dz: 0.40,  len: 130, amp: 6.5, steep: 0.55, omega: 0.50 },
    { dx: -0.7, dz: 0.80,  len: 60,  amp: 3.0, steep: 0.60, omega: 0.85 },
    { dx: 0.5,  dz: -0.9,  len: 32,  amp: 1.4, steep: 0.70, omega: 1.25 },
    { dx: 1.0,  dz: -0.25, len: 16,  amp: 0.6, steep: 0.80, omega: 1.80 }
  ];

  var DEEP = [0.04, 0.16, 0.42];   // trough colour
  var MID  = [0.10, 0.46, 0.85];   // mid colour
  var FOAM = [0.80, 0.94, 1.00];   // crest / foam colour
  // --------------------------------------------------------------------------

  function install() {
    if (document.getElementById("wave-bg")) return;

    var style = document.createElement("style");
    style.textContent =
      "#wave-bg{position:fixed;inset:0;width:100%;height:100%;z-index:-2;display:block;pointer-events:none}" +
      "#wave-scrim{position:fixed;inset:0;z-index:-1;pointer-events:none;background:" + CFG.scrim + "}";
    document.head.appendChild(style);

    var canvas = document.createElement("canvas");
    canvas.id = "wave-bg";
    var scrim = document.createElement("div");
    scrim.id = "wave-scrim";
    document.body.appendChild(canvas);
    document.body.appendChild(scrim);

    return canvas;
  }

  function init(canvas) {
    var W = function () { return window.innerWidth; };
    var H = function () { return window.innerHeight; };

    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(CFG.clearColor, CFG.fog);

    var camera = new THREE.PerspectiveCamera(70, W() / H(), 0.1, 4000);

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(CFG.clearColor, 1);
    renderer.setSize(W(), H(), false);

    var AX = CFG.density, AY = CFG.density, SEP = CFG.separation, N = AX * AY;
    var pos = new Float32Array(N * 3);
    var col = new Float32Array(N * 3);
    var baseX = new Float32Array(N);
    var baseZ = new Float32Array(N);

    var p = 0, c = 0;
    for (var ix = 0; ix < AX; ix++) {
      for (var iy = 0; iy < AY; iy++) {
        var x = ix * SEP - (AX * SEP / 2);
        var z = iy * SEP - (AY * SEP / 2);
        baseX[c] = x; baseZ[c] = z;
        pos[p] = x; pos[p + 1] = 0; pos[p + 2] = z;
        col[p] = DEEP[0]; col[p + 1] = DEEP[1]; col[p + 2] = DEEP[2];
        p += 3; c += 1;
      }
    }

    var nW = WAVES.length, wx = [], wz = [], wk = [], wa = [], wQ = [], wo = [], ampSum = 0;
    for (var w = 0; w < nW; w++) {
      var d = WAVES[w];
      var l = Math.sqrt(d.dx * d.dx + d.dz * d.dz);
      var k = (2 * Math.PI) / d.len;
      wx.push(d.dx / l); wz.push(d.dz / l);
      wk.push(k); wa.push(d.amp); wo.push(d.omega);
      wQ.push(d.steep / (k * d.amp * nW));
      ampSum += d.amp;
    }
    var invAmp = 1 / ampSum;

    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));

    var mat = new THREE.PointsMaterial({
      size: CFG.pointSize, vertexColors: true, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, sizeAttenuation: true, depthWrite: false
    });
    scene.add(new THREE.Points(geo, mat));

    var t = 0;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function smooth(a, b, x) { x = Math.max(0, Math.min(1, (x - a) / (b - a))); return x * x * (3 - 2 * x); }

    function frame() {
      var ang = Math.sin(t * 0.03) * CFG.sway;
      camera.position.set(Math.sin(ang) * CFG.cameraR, CFG.cameraY, Math.cos(ang) * CFG.cameraR);
      camera.lookAt(0, 3, 0);

      var P = geo.attributes.position.array;
      var C = geo.attributes.color.array;
      var i = 0;
      for (var n = 0; n < N; n++) {
        var x = baseX[n], z = baseZ[n], dx = x, dz = z, dy = 0;
        for (var w = 0; w < nW; w++) {
          var ph = wk[w] * (wx[w] * x + wz[w] * z) + wo[w] * t;
          var cs = Math.cos(ph), sn = Math.sin(ph), qa = wQ[w] * wa[w];
          dx += qa * wx[w] * cs; dz += qa * wz[w] * cs; dy += wa[w] * sn;
        }
        P[i] = dx; P[i + 1] = dy; P[i + 2] = dz;
        var hn = dy * invAmp * 0.5 + 0.5;
        var m1 = smooth(0.18, 0.62, hn), m2 = smooth(0.82, 1.0, hn);
        var r = DEEP[0] + (MID[0] - DEEP[0]) * m1; r = r + (FOAM[0] - r) * m2;
        var g = DEEP[1] + (MID[1] - DEEP[1]) * m1; g = g + (FOAM[1] - g) * m2;
        var b = DEEP[2] + (MID[2] - DEEP[2]) * m1; b = b + (FOAM[2] - b) * m2;
        C[i] = r; C[i + 1] = g; C[i + 2] = b;
        i += 3;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
      renderer.render(scene, camera);
    }

    var raf = null;
    function loop() { t += CFG.timeStep; frame(); raf = requestAnimationFrame(loop); }
    function resize() { renderer.setSize(W(), H(), false); camera.aspect = W() / H(); camera.updateProjectionMatrix(); }

    window.addEventListener("resize", resize);
    resize();

    if (reduce) { t = 8; frame(); } else { loop(); }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { if (raf) cancelAnimationFrame(raf); }
      else if (!reduce) { loop(); }
    });
  }

  function boot() {
    var canvas = install();
    if (!canvas) return;
    if (window.THREE) { init(canvas); return; }
    var s = document.createElement("script");
    s.src = CFG.threeUrl;
    s.onload = function () { init(canvas); };
    s.onerror = function () { console.warn("wave-bg: failed to load Three.js from " + CFG.threeUrl); };
    document.head.appendChild(s);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
