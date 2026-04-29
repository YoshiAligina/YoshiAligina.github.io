/* ────────────────────────────────────────────
   Editorial Stamps — Pretext-powered text reflow
   Uses @chenglou/pretext for fast, accurate line-breaking
   around draggable stamp obstacles
   ──────────────────────────────────────────── */

(async () => {
'use strict';

const { prepareWithSegments, layoutNextLine } =
  await import('https://esm.sh/@chenglou/pretext@0.0.5');

/* ── Config ─────────────────────────────── */
const C = {
  parallax:  { intensity: 0, smooth: 0.06 },
  drag:      { friction: 0.92, threshold: 5, minV: 0.12 },
  magnetic:  { radius: 170, maxTilt: 1.8, smooth: 0.08 },
  reflow:    { padding: 14 },
};

/* ── Helpers ─────────────────────────────── */
const lerp  = (a, b, t) => a + (b - a) * t;

/* ── Mouse ───────────────────────────────── */
const mouse  = { x: innerWidth / 2, y: innerHeight / 2 };
const smooth = { x: mouse.x, y: mouse.y };
document.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
document.addEventListener('touchmove', e => {
  mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY;
}, { passive: true });

/* ── Stamp state ─────────────────────────── */
const allStamps = [
  ...document.querySelectorAll('.stamp'),
  ...document.querySelectorAll('.photo-wrap'),
];
const states = new Map();
let activeDrag = null;

function wrapper(stamp) {
  // photo-wrap and standalone stamps wrap themselves; linked stamps return their <a>
  return stamp.closest('.stamp-link') || stamp;
}

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
   PRETEXT TEXT ENGINE
   ══════════════════════════════════════════ */

/* Extract plain text from statement HTML and track which characters are accented */
function extractText(el) {
  let fullText = '';
  const accentRanges = [];

  el.querySelectorAll('p').forEach((p, pi) => {
    if (pi > 0) fullText += ' ';
    [...p.childNodes].forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        fullText += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const start = fullText.length;
        fullText += node.textContent;
        accentRanges.push({ start, end: fullText.length });
      }
    });
  });

  return { fullText, accentRanges };
}

/* Build per-character accent lookup */
function buildAccentMap(fullText, accentRanges) {
  const map = new Uint8Array(fullText.length);
  for (const { start, end } of accentRanges) {
    for (let i = start; i < end; i++) map[i] = 1;
  }
  return map;
}

/* Carve available horizontal slots on a line, subtracting obstacles */
function getLineSpace(y, lineH, containerW, obstacles) {
  let slots = [{ left: 0, right: containerW }];
  for (const obs of obstacles) {
    if (obs.bottom <= y || obs.top >= y + lineH) continue;
    const next = [];
    for (const s of slots) {
      if (obs.right <= s.left || obs.left >= s.right) { next.push(s); continue; }
      if (s.left < obs.left) next.push({ left: s.left, right: obs.left });
      if (obs.right < s.right) next.push({ left: obs.right, right: s.right });
    }
    slots = next;
  }
  slots = slots.filter(s => (s.right - s.left) > 30);
  if (!slots.length) return { offset: 0, width: 0 };
  // Pick widest usable slot
  let best = slots[0];
  for (const s of slots) {
    if ((s.right - s.left) > (best.right - best.left)) best = s;
  }
  return { offset: best.left, width: best.right - best.left };
}

/* Render a line's text as HTML with accent spans */
function lineToHTML(text, charOffset, accentMap) {
  let html = '';
  let inAccent = false;
  for (let i = 0; i < text.length; i++) {
    const isAccent = accentMap[charOffset + i] === 1;
    if (isAccent !== inAccent) {
      if (inAccent) html += '</span>';
      if (isAccent) html += '<span class="accent">';
      inAccent = isAccent;
    }
    // Escape HTML entities
    const ch = text[i];
    if (ch === '<') html += '&lt;';
    else if (ch === '>') html += '&gt;';
    else if (ch === '&') html += '&amp;';
    else html += ch;
  }
  if (inAccent) html += '</span>';
  return html;
}

/* Line DOM pool */
const linePool = [];
function renderLines(container, lines, accentMap, fullText) {
  while (linePool.length < lines.length) {
    const span = document.createElement('span');
    span.className = 'flow-line';
    container.appendChild(span);
    linePool.push({ el: span, html: '' });
  }
  // Map line text back to character offsets in fullText
  let searchFrom = 0;
  for (const line of lines) {
    const trimmed = line.text;
    const idx = fullText.indexOf(trimmed, searchFrom);
    line.charOffset = idx >= 0 ? idx : searchFrom;
    searchFrom = line.charOffset + trimmed.length;
  }
  // Update visible lines
  lines.forEach((line, i) => {
    const pool = linePool[i];
    const html = lineToHTML(line.text, line.charOffset, accentMap);
    if (pool.html !== html) {
      pool.el.innerHTML = html;
      pool.html = html;
    }
    pool.el.style.transform = `translate(${line.x}px, ${line.y}px)`;
    pool.el.style.display = '';
  });
  // Hide extras
  for (let i = lines.length; i < linePool.length; i++) {
    linePool[i].el.style.display = 'none';
  }
}

/* ══════════════════════════════════════════
   INIT & SYSTEMS
   ══════════════════════════════════════════ */

let prepared, fullText, accentMap, statementEl, editorialEl;
const doodleStrokes = [];

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

  // Pretext setup
  statementEl = document.getElementById('statement');
  editorialEl = document.querySelector('.editorial');
  const font = getComputedStyle(statementEl).font;
  const extracted = extractText(statementEl);
  fullText = extracted.fullText;
  accentMap = buildAccentMap(fullText, extracted.accentRanges);
  prepared = prepareWithSegments(fullText, font);

  // Activate pretext mode (hides original <p> tags)
  statementEl.classList.add('pretext-active');

  // Kinetic text for h1
  setupH1();
  // Fade-in for subtitle
  setupFades();
  // Drag system
  setupDrag();
  // Doodle system (text reflows around freehand strokes)
  setupDoodle();

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
  const el = document.querySelector('.intro-header p');
  if (el) {
    el.classList.add('text-fade');
    el.style.setProperty('--delay', '500ms');
  }
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

/* ── Doodle system: freehand strokes become reflow obstacles ─── */
function setupDoodle() {
  const canvas = document.createElement('canvas');
  canvas.className = 'doodle-canvas';
  editorialEl.insertBefore(canvas, editorialEl.firstChild);
  const dctx = canvas.getContext('2d');
  editorialEl.classList.add('doodle-cursor-area');

  const clearBtn = document.createElement('button');
  clearBtn.className = 'doodle-clear';
  clearBtn.type = 'button';
  clearBtn.textContent = 'clear';
  clearBtn.setAttribute('aria-label', 'Clear doodles');
  document.body.appendChild(clearBtn);

  let currentStroke = null;
  let isDrawing = false;

  function resizeCanvas() {
    const rect = editorialEl.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  }

  function redraw() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    dctx.clearRect(0, 0, w, h);
    dctx.strokeStyle = 'rgba(194, 127, 129, 0.88)';
    dctx.fillStyle = 'rgba(194, 127, 129, 0.88)';
    dctx.lineWidth = 5;
    dctx.lineCap = 'round';
    dctx.lineJoin = 'round';
    for (const s of doodleStrokes) {
      if (s.length === 1) {
        dctx.beginPath();
        dctx.arc(s[0].x, s[0].y, 2.6, 0, Math.PI * 2);
        dctx.fill();
      } else if (s.length > 1) {
        dctx.beginPath();
        dctx.moveTo(s[0].x, s[0].y);
        for (let i = 1; i < s.length; i++) dctx.lineTo(s[i].x, s[i].y);
        dctx.stroke();
      }
    }
  }

  function isInteractive(t) { return !!(t && t.closest && t.closest('a, button, .stamp, .photo-wrap')); }

  function getPoint(clientX, clientY) {
    const r = editorialEl.getBoundingClientRect();
    return {
      x: clientX - r.left,
      y: clientY - r.top,
      inside: clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom,
    };
  }

  function startStroke(x, y) {
    currentStroke = [{ x, y }];
    doodleStrokes.push(currentStroke);
    isDrawing = true;
    clearBtn.classList.add('visible');
    redraw();
  }
  function extendStroke(x, y) {
    if (!isDrawing || !currentStroke) return;
    const last = currentStroke[currentStroke.length - 1];
    if (Math.hypot(x - last.x, y - last.y) < 1.2) return;
    currentStroke.push({ x, y });
    redraw();
  }
  function endStroke() { isDrawing = false; currentStroke = null; }

  function clearAll() {
    doodleStrokes.length = 0;
    isDrawing = false;
    currentStroke = null;
    clearBtn.classList.remove('visible');
    redraw();
  }

  document.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    if (activeDrag) return;
    if (isInteractive(e.target)) return;
    const p = getPoint(e.clientX, e.clientY);
    if (!p.inside) return;
    startStroke(p.x, p.y);
  });
  document.addEventListener('mousemove', e => {
    if (!isDrawing) return;
    const p = getPoint(e.clientX, e.clientY);
    extendStroke(p.x, p.y);
  });
  document.addEventListener('mouseup', () => { if (isDrawing) endStroke(); });

  document.addEventListener('touchstart', e => {
    if (activeDrag) return;
    if (isInteractive(e.target)) return;
    const t = e.touches[0]; if (!t) return;
    const p = getPoint(t.clientX, t.clientY);
    if (!p.inside) return;
    startStroke(p.x, p.y);
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!isDrawing) return;
    const t = e.touches[0]; if (!t) return;
    const p = getPoint(t.clientX, t.clientY);
    extendStroke(p.x, p.y);
    e.preventDefault();
  }, { passive: false });
  document.addEventListener('touchend', () => { if (isDrawing) endStroke(); });

  clearBtn.addEventListener('click', clearAll);

  window.addEventListener('resize', resizeCanvas);
  if ('ResizeObserver' in window) {
    new ResizeObserver(() => resizeCanvas()).observe(editorialEl);
  }
  resizeCanvas();
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

  // Reflow text with pretext
  if (statementEl && prepared) {
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
      if (obs.bottom > 0 && obs.top < 800 && obs.right > 0 && obs.left < containerW) {
        obstacles.push(obs);
      }
    });

    // Add doodle stroke obstacles (chunk into small bbox segments so pretext
    // carves around the freehand path, not just a giant bounding box)
    if (editorialEl && doodleStrokes.length) {
      const eRect = editorialEl.getBoundingClientRect();
      const sOffX = eRect.left - cRect.left;
      const sOffY = eRect.top - cRect.top;
      const sPad = 6;
      const chunk = 6;
      for (const stroke of doodleStrokes) {
        if (!stroke.length) continue;
        for (let i = 0; i < stroke.length; i += chunk) {
          const end = Math.min(i + chunk + 1, stroke.length);
          let mnX = Infinity, mxX = -Infinity, mnY = Infinity, mxY = -Infinity;
          for (let j = i; j < end; j++) {
            const p = stroke[j];
            if (p.x < mnX) mnX = p.x;
            if (p.x > mxX) mxX = p.x;
            if (p.y < mnY) mnY = p.y;
            if (p.y > mxY) mxY = p.y;
          }
          const obs = {
            left:   mnX + sOffX - sPad,
            right:  mxX + sOffX + sPad,
            top:    mnY + sOffY - sPad,
            bottom: mxY + sOffY + sPad,
          };
          if (obs.bottom > 0 && obs.top < 1200 && obs.right > 0 && obs.left < containerW) {
            obstacles.push(obs);
          }
        }
      }
    }

    // Lay out text line by line, adjusting width per line for obstacles
    let cursor = { segmentIndex: 0, graphemeIndex: 0 };
    let y = 0;
    const lines = [];
    let safety = 200;

    while (safety-- > 0) {
      const space = getLineSpace(y, lineH, containerW, obstacles);
      if (space.width < 30) { y += lineH * 0.5; continue; }

      const line = layoutNextLine(prepared, cursor, space.width);
      if (!line) break;

      lines.push({ text: line.text, width: line.width, x: space.offset, y });
      cursor = line.end;
      y += lineH;
    }

    renderLines(statementEl, lines, accentMap, fullText);
    statementEl.style.minHeight = (y + lineH) + 'px';
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
