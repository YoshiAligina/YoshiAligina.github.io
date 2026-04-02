/* ────────────────────────────────────────────
   Dynamic Stamps & Kinetic Text
   Yoshi Aligina Portfolio
   ──────────────────────────────────────────── */
(() => {
  'use strict';

  /* ── Config (all subtle) ─────────────────── */
  const C = {
    parallax:  { intensity: 10, smooth: 0.06 },
    drag:      { friction: 0.92, threshold: 5, minV: 0.12 },
    magnetic:  { radius: 170, maxTilt: 1.8, smooth: 0.08 },
    text:      { letterDelay: 55, wordDelay: 40 },
  };

  /* ── Helpers ────────────────────────────── */
  const lerp  = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
  const rand  = (lo, hi) => Math.random() * (hi - lo) + lo;
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  /* ── Mouse tracking ────────────────────── */
  const mouse  = { x: innerWidth / 2, y: innerHeight / 2 };
  const smooth = { x: mouse.x, y: mouse.y };

  document.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
  document.addEventListener('touchmove', e => {
    mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY;
  }, { passive: true });

  /* ── State ─────────────────────────────── */
  const allStamps = [...document.querySelectorAll('.stamp')];
  const states = new Map();
  let startTime = null;
  let activeDrag = null;

  function wrapper(stamp) {
    return stamp.closest('.stamp-link') || stamp;
  }

  /* Read CSS rotate value (returns degrees) */
  function readBaseRot(el) {
    const r = getComputedStyle(el).rotate;
    if (r && r !== 'none') return parseFloat(r);
    const t = getComputedStyle(el).transform;
    if (t && t !== 'none') {
      const m = t.match(/matrix\(([^)]+)\)/);
      if (m) {
        const v = m[1].split(',').map(Number);
        return Math.atan2(v[1], v[0]) * (180 / Math.PI);
      }
    }
    return 0;
  }

  /* ── Init ───────────────────────────────── */
  function init() {
    allStamps.forEach(stamp => {
      const w = wrapper(stamp);
      const depth = parseFloat(w.dataset.depth || stamp.dataset.depth || '1');
      const baseRot = readBaseRot(stamp);

      states.set(stamp, {
        w, depth, baseRot,
        // Drag
        drag: { x: 0, y: 0 },
        vel:  { x: 0, y: 0 },
        isDragging: false,
        wasDragged: false,
        anchor: { x: 0, y: 0 },
        startOff: { x: 0, y: 0 },
        lastM: { x: 0, y: 0 },
        // Magnetic
        curTilt: { x: 0, y: 0 },
      });
    });

    setupDrag();
    setupText();
    requestAnimationFrame(tick);
  }

  /* ── 1. Kinetic Text ───────────────────── */
  function setupText() {
    const h1 = document.querySelector('.intro-header h1');
    if (h1) {
      const text = h1.textContent;
      h1.textContent = '';
      h1.setAttribute('aria-label', text);
      [...text].forEach((ch, i) => {
        const span = document.createElement('span');
        span.className = 'letter';
        span.textContent = ch;
        span.style.setProperty('--i', i);
        h1.appendChild(span);
      });
    }

    const subtitle = document.querySelector('.intro-header p');
    const caption  = document.querySelector('.caption');
    const stmts    = [...document.querySelectorAll('.statement p')];

    [subtitle, caption, ...stmts].filter(Boolean).forEach((el, i) => {
      el.classList.add('text-fade');
      el.style.setProperty('--delay', `${550 + i * 140}ms`);
    });

    document.querySelectorAll('.statement span').forEach(span => {
      span.classList.add('accent-shimmer');
    });
  }

  /* ── 2. Drag System ────────────────────── */
  function setupDrag() {
    function onDown(stamp, x, y) {
      const s = states.get(stamp);
      if (!s) return;
      s.isDragging = true;
      s.wasDragged = false;
      s.anchor  = { x, y };
      s.startOff = { x: s.drag.x, y: s.drag.y };
      s.lastM = { x, y };
      s.vel = { x: 0, y: 0 };
      activeDrag = stamp;
      s.w.style.zIndex = '20';
      s.w.classList.add('stamp-grabbed');
    }

    function onMove(x, y) {
      if (!activeDrag) return;
      const s = states.get(activeDrag);
      const dx = x - s.anchor.x;
      const dy = y - s.anchor.y;
      if (Math.hypot(dx, dy) > C.drag.threshold) s.wasDragged = true;
      s.vel.x = (x - s.lastM.x) * 0.5;
      s.vel.y = (y - s.lastM.y) * 0.5;
      s.lastM = { x, y };
      s.drag.x = s.startOff.x + dx;
      s.drag.y = s.startOff.y + dy;
    }

    function onUp() {
      if (!activeDrag) return;
      const s = states.get(activeDrag);
      s.isDragging = false;
      s.w.classList.remove('stamp-grabbed');
      activeDrag = null;
    }

    allStamps.forEach(stamp => {
      const w = wrapper(stamp);
      w.addEventListener('mousedown', e => { e.preventDefault(); onDown(stamp, e.clientX, e.clientY); });
      w.addEventListener('touchstart', e => { onDown(stamp, e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    });

    document.addEventListener('mousemove', e => onMove(e.clientX, e.clientY));
    document.addEventListener('touchmove', e => {
      if (activeDrag) { e.preventDefault(); onMove(e.touches[0].clientX, e.touches[0].clientY); }
    }, { passive: false });
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchend', onUp);

    document.querySelectorAll('.stamp-link').forEach(link => {
      link.addEventListener('click', e => {
        const stamp = link.querySelector('.stamp');
        const s = states.get(stamp);
        if (s && s.wasDragged) { e.preventDefault(); s.wasDragged = false; }
      });
    });
  }

  /* ── Animation Loop ────────────────────── */
  function tick(time) {
    if (!startTime) startTime = time;
    const elapsed = time - startTime;

    smooth.x = lerp(smooth.x, mouse.x, C.parallax.smooth);
    smooth.y = lerp(smooth.y, mouse.y, C.parallax.smooth);
    const cx = innerWidth / 2;
    const cy = innerHeight / 2;

    allStamps.forEach((stamp, i) => {
      const s = states.get(stamp);

      /* ── Parallax ── */
      const px = ((smooth.x - cx) / cx) * C.parallax.intensity * s.depth;
      const py = ((smooth.y - cy) / cy) * C.parallax.intensity * s.depth * 0.4;

      /* ── Drag momentum ── */
      if (!s.isDragging) {
        if (Math.abs(s.vel.x) > C.drag.minV || Math.abs(s.vel.y) > C.drag.minV) {
          s.drag.x += s.vel.x;
          s.drag.y += s.vel.y;
          s.vel.x *= C.drag.friction;
          s.vel.y *= C.drag.friction;
        } else {
          s.vel.x = 0; s.vel.y = 0;
        }
      }

      /* ── Magnetic tilt ── */
      const rect = s.w.getBoundingClientRect();
      const scx = rect.left + rect.width / 2;
      const scy = rect.top + rect.height / 2;
      const d = Math.hypot(mouse.x - scx, mouse.y - scy);
      let tx = 0;
      if (d < C.magnetic.radius && !s.isDragging) {
        const strength = Math.pow(1 - d / C.magnetic.radius, 2);
        tx = ((mouse.x - scx) / C.magnetic.radius) * C.magnetic.maxTilt * strength;
      }
      s.curTilt.x = lerp(s.curTilt.x, tx, C.magnetic.smooth);

      /* ── Compose ── */
      const totalX = px + s.drag.x;
      const totalY = py + s.drag.y;
      const totalRot = s.baseRot + s.curTilt.x;

      s.w.style.translate = `${totalX}px ${totalY}px`;
      if (stamp !== s.w) {
        stamp.style.rotate = `${totalRot}deg`;
      } else {
        s.w.style.rotate = `${totalRot}deg`;
      }
    });

    requestAnimationFrame(tick);
  }

  /* ── Start ─────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
