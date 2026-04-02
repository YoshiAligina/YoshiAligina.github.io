/* ────────────────────────────────────────────
   Editorial Stamps — Pretext-style text reflow
   Canvas-based measurement, zero DOM reads for layout
   ──────────────────────────────────────────── */

(async () => {
'use strict';

/* ── Config ─────────────────────────────── */
const C = {
  parallax:  { intensity: 10, smooth: 0.06 },
  drag:      { friction: 0.92, threshold: 5, minV: 0.12 },
  magnetic:  { radius: 170, maxTilt: 1.8, smooth: 0.08 },
  reflow:    { padding: 14 }, // px margin around stamps when carving text
};

/* ── Helpers ─────────────────────────────── */
const lerp  = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

/* ── Mouse ───────────────────────────────── */
const mouse  = { x: innerWidth / 2, y: innerHeight / 2 };
const smooth = { x: mouse.x, y: mouse.y };
document.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
document.addEventListener('touchmove', e => {
  mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY;
}, { passive: true });

/* ── Stamp state ─────────────────────────── */
const allStamps = [...document.querySelectorAll('.stamp')];
const states = new Map();
let activeDrag = null;

function wrapper(stamp) { return stamp.closest('.stamp-link') || stamp; }

function readBaseRot(el) {
  const r = getComputedStyle(el).rotate;
  if (r && r !== 'none') return parseFloat(r);
  const t = getComputedStyle(el).transform;
  if (t && t !== 'none') {
    const m = t.match(/matrix\(([^)]+)\)/);
    if (m) { const v = m[1].split(',').map(Number); return Math.atan2(v[1], v[0]) * 180 / Math.PI; }
  }
  return 0;
}

/* ══════════════════════════════════════════
   PRETEXT-STYLE TEXT ENGINE
   Canvas-based measurement, slot-carving reflow
   ══════════════════════════════════════════ */

const _cvs = document.createElement('canvas');
const _ctx = _cvs.getContext('2d');

/* Prepare: cache font metrics (like pretext.prepare()) */
function prepare(font) {
  _ctx.font = font;
  const spaceW = _ctx.measureText('\u00A0').width;
  return { font, spaceW };
}

/* Measure a word's width (like pretext.layout() for single words) */
function measureWord(ptx, text) {
  _ctx.font = ptx.font;
  return _ctx.measureText(text).width;
}

/* Extract words from statement HTML, preserving accent info */
function extractWords(el) {
  const words = [];
  const paragraphs = el.querySelectorAll('p');
  paragraphs.forEach((p, pi) => {
    if (pi > 0) words.push({ text: '', accent: false, width: 0, isBreak: true });
    [...p.childNodes].forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent.trim().split(/\s+/).filter(Boolean).forEach(t => {
          words.push({ text: t, accent: false });
        });
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        words.push({ text: node.textContent, accent: true });
      }
    });
  });
  return words;
}

/* Carve available horizontal slots on a line, subtracting obstacles */
function carveSlots(lineLeft, lineRight, lineTop, lineBot, obstacles) {
  let slots = [{ left: lineLeft, right: lineRight }];
  for (const obs of obstacles) {
    if (obs.bottom <= lineTop || obs.top >= lineBot) continue;
    const next = [];
    for (const s of slots) {
      if (obs.right <= s.left || obs.left >= s.right) { next.push(s); continue; }
      if (s.left < obs.left) next.push({ left: s.left, right: obs.left });
      if (obs.right < s.right) next.push({ left: obs.right, right: s.right });
    }
    slots = next;
  }
  return slots.filter(s => (s.right - s.left) > 30);
}

/* Reflow text around obstacles (the editorial engine algorithm) */
function reflowText(ptx, words, containerW, lineH, obstacles) {
  const result = [];
  let y = 0;
  let wi = 0;
  const paraGap = lineH * 0.4;
  let maxIter = 200; // safety

  while (wi < words.length && maxIter-- > 0) {
    const w = words[wi];
    if (w.isBreak) { y += paraGap; wi++; continue; }

    const slots = carveSlots(0, containerW, y, y + lineH, obstacles);
    if (slots.length === 0) { y += lineH * 0.5; continue; }

    let placed = false;
    for (const slot of slots) {
      let x = slot.left;
      while (wi < words.length && !words[wi].isBreak) {
        const word = words[wi];
        const gap = (x > slot.left) ? ptx.spaceW : 0;
        if (x + gap + word.width > slot.right + 0.5) break;
        x += gap;
        result.push({ text: word.text, accent: word.accent, x, y });
        x += word.width;
        wi++;
        placed = true;
      }
    }
    if (!placed && wi < words.length && !words[wi].isBreak) {
      // Force-place one word to avoid infinite loop
      const slot = slots[0] || { left: 0 };
      result.push({ text: words[wi].text, accent: words[wi].accent, x: slot.left, y });
      wi++;
    }
    y += lineH;
  }
  return { positioned: result, height: y + lineH };
}

/* Render positioned words into DOM */
const wordPool = [];
function renderWords(container, positioned) {
  // Grow pool if needed
  while (wordPool.length < positioned.length) {
    const span = document.createElement('span');
    span.className = 'flow-word';
    container.appendChild(span);
    wordPool.push(span);
  }
  // Update visible words
  positioned.forEach((wp, i) => {
    const span = wordPool[i];
    if (span.textContent !== wp.text) span.textContent = wp.text;
    span.style.transform = `translate(${wp.x}px, ${wp.y}px)`;
    span.classList.toggle('accent', wp.accent);
    span.style.display = '';
  });
  // Hide extra
  for (let i = positioned.length; i < wordPool.length; i++) {
    wordPool[i].style.display = 'none';
  }
}

/* ══════════════════════════════════════════
   INIT & SYSTEMS
   ══════════════════════════════════════════ */

let ptx, textWords, statementEl;

async function init() {
  await document.fonts.ready;

  // Init stamp states
  allStamps.forEach(stamp => {
    const w = wrapper(stamp);
    const depth = parseFloat(w.dataset.depth || stamp.dataset.depth || '1');
    states.set(stamp, {
      w, depth, baseRot: readBaseRot(stamp),
      drag: { x: 0, y: 0 }, vel: { x: 0, y: 0 },
      isDragging: false, wasDragged: false,
      anchor: { x: 0, y: 0 }, startOff: { x: 0, y: 0 }, lastM: { x: 0, y: 0 },
      curTilt: { x: 0, y: 0 },
    });
  });

  // Text setup
  statementEl = document.getElementById('statement');
  const computedFont = getComputedStyle(statementEl).font;
  ptx = prepare(computedFont);

  // Extract and measure words
  textWords = extractWords(statementEl);
  textWords.forEach(w => { if (!w.isBreak) w.width = measureWord(ptx, w.text); });

  // Activate pretext mode (hides original <p> tags)
  statementEl.classList.add('pretext-active');

  // Kinetic text for h1
  setupH1();
  // Fade-in for subtitle + caption
  setupFades();
  // Drag system
  setupDrag();

  requestAnimationFrame(tick);
}

/* ── Kinetic h1 letters ─── */
function setupH1() {
  const h1 = document.querySelector('.intro-header h1');
  if (!h1) return;
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

function setupFades() {
  const els = [document.querySelector('.intro-header p'), document.querySelector('.caption')].filter(Boolean);
  els.forEach((el, i) => {
    el.classList.add('text-fade');
    el.style.setProperty('--delay', `${500 + i * 140}ms`);
  });
}

/* ── Drag system ─── */
function setupDrag() {
  function onDown(stamp, x, y) {
    const s = states.get(stamp);
    if (!s) return;
    s.isDragging = true; s.wasDragged = false;
    s.anchor = { x, y }; s.startOff = { x: s.drag.x, y: s.drag.y };
    s.lastM = { x, y }; s.vel = { x: 0, y: 0 };
    activeDrag = stamp;
    s.w.style.zIndex = '20'; s.w.classList.add('stamp-grabbed');
  }
  function onMove(x, y) {
    if (!activeDrag) return;
    const s = states.get(activeDrag);
    const dx = x - s.anchor.x, dy = y - s.anchor.y;
    if (Math.hypot(dx, dy) > C.drag.threshold) s.wasDragged = true;
    s.vel.x = (x - s.lastM.x) * 0.5; s.vel.y = (y - s.lastM.y) * 0.5;
    s.lastM = { x, y };
    s.drag.x = s.startOff.x + dx; s.drag.y = s.startOff.y + dy;
  }
  function onUp() {
    if (!activeDrag) return;
    states.get(activeDrag).isDragging = false;
    states.get(activeDrag).w.classList.remove('stamp-grabbed');
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

/* ── Animation loop ─── */
function tick() {
  smooth.x = lerp(smooth.x, mouse.x, C.parallax.smooth);
  smooth.y = lerp(smooth.y, mouse.y, C.parallax.smooth);
  const cx = innerWidth / 2, cy = innerHeight / 2;

  // Update stamps (parallax, drag, magnetic)
  allStamps.forEach(stamp => {
    const s = states.get(stamp);
    const px = ((smooth.x - cx) / cx) * C.parallax.intensity * s.depth;
    const py = ((smooth.y - cy) / cy) * C.parallax.intensity * s.depth * 0.4;

    if (!s.isDragging) {
      if (Math.abs(s.vel.x) > C.drag.minV || Math.abs(s.vel.y) > C.drag.minV) {
        s.drag.x += s.vel.x; s.drag.y += s.vel.y;
        s.vel.x *= C.drag.friction; s.vel.y *= C.drag.friction;
      } else { s.vel.x = 0; s.vel.y = 0; }
    }

    const rect = s.w.getBoundingClientRect();
    const scx = rect.left + rect.width / 2, scy = rect.top + rect.height / 2;
    const d = Math.hypot(mouse.x - scx, mouse.y - scy);
    let tx = 0;
    if (d < C.magnetic.radius && !s.isDragging) {
      const str = Math.pow(1 - d / C.magnetic.radius, 2);
      tx = ((mouse.x - scx) / C.magnetic.radius) * C.magnetic.maxTilt * str;
    }
    s.curTilt.x = lerp(s.curTilt.x, tx, C.magnetic.smooth);

    s.w.style.translate = `${px + s.drag.x}px ${py + s.drag.y}px`;
    const rot = s.baseRot + s.curTilt.x;
    if (stamp !== s.w) stamp.style.rotate = `${rot}deg`;
    else s.w.style.rotate = `${rot}deg`;
  });

  // Reflow text around stamps
  if (statementEl) {
    const cRect = statementEl.getBoundingClientRect();
    const containerW = cRect.width;
    const fontSize = parseFloat(getComputedStyle(statementEl).fontSize);
    const lineH = fontSize * 1.2;
    const pad = C.reflow.padding;

    // Build obstacle list (stamp rects relative to statement container)
    const obstacles = [];
    allStamps.forEach(stamp => {
      const s = states.get(stamp);
      const r = s.w.getBoundingClientRect();
      const obs = {
        left:   r.left - cRect.left - pad,
        right:  r.right - cRect.left + pad,
        top:    r.top - cRect.top - pad,
        bottom: r.bottom - cRect.top + pad,
      };
      // Only include if overlapping the text area
      if (obs.bottom > 0 && obs.top < 600 && obs.right > 0 && obs.left < containerW) {
        obstacles.push(obs);
      }
    });

    const { positioned, height } = reflowText(ptx, textWords, containerW, lineH, obstacles);
    renderWords(statementEl, positioned);
    statementEl.style.minHeight = height + 'px';
  }

  requestAnimationFrame(tick);
}

/* ── Start ─── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();
