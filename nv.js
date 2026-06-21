/* Nouvelle Vague — shared behaviour (dark-editorial-scroll)
   - per-section IntersectionObserver: rise-in / drift-out / reset-replay
   - 2px scroll progress bar (requestAnimationFrame)
   - mobile menu toggle
   - current year in footer */
(function () {
  "use strict";

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- section scroll motion ---- */
  var sections = document.querySelectorAll("[data-sec]");
  if (reduced || !("IntersectionObserver" in window)) {
    sections.forEach(function (s) { s.classList.add("in"); s.classList.remove("out"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var s = e.target;
        if (e.isIntersecting) {
          s.classList.add("in"); s.classList.remove("out");        /* enter: rise + fade */
        } else if (e.boundingClientRect.top < 0) {
          s.classList.add("out"); s.classList.remove("in");        /* left past top: drift up */
        } else {
          s.classList.remove("in"); s.classList.remove("out");     /* left below: reset, replay */
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -10% 0px" });
    sections.forEach(function (s) { io.observe(s); });
  }

  /* ---- 2px scroll progress bar ---- */
  var bar = document.getElementById("progress");
  if (bar) {
    var ticking = false;
    var paint = function () {
      var doc = document.documentElement;
      var max = doc.scrollHeight - doc.clientHeight;
      var p = max > 0 ? (window.scrollY || doc.scrollTop) / max : 0;
      bar.style.width = (p * 100).toFixed(3) + "%";
      ticking = false;
    };
    var onScroll = function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(paint); }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    paint();
  }

  /* ---- mobile menu ---- */
  var toggle = document.querySelector(".menu-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var open = document.body.classList.toggle("menu-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    document.querySelectorAll(".topnav a").forEach(function (a) {
      a.addEventListener("click", function () {
        document.body.classList.remove("menu-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---- current year ---- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
