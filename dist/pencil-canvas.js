(function () {
  'use strict';
  function setup() {
    let canvas = document.getElementById('paper');
    if (!canvas || canvas.dataset.pencilReady) return;
    // Replace the original canvas so the legacy mission handlers cannot
    // compete with this input path and swallow Pencil events.
    const cleanCanvas = canvas.cloneNode(false);
    canvas.replaceWith(cleanCanvas);
    canvas = cleanCanvas;
    canvas.dataset.pencilReady = 'true';
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    const pen = document.getElementById('pen');
    const eraser = document.getElementById('eraser');
    const clear = document.getElementById('clear');
    let mode = 'pen';
    let active = false;
    let activePointer = null;
    let pointerEventsSeen = false;
    let touchId = null;
    let moved = false;
    let last = null;
    let dpr = 1;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
    function point(event) {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }
    function drawDot(p) {
      ctx.save();
      ctx.fillStyle = mode === 'eraser' ? '#fff' : '#17263c';
      ctx.beginPath();
      ctx.arc(p.x, p.y, mode === 'eraser' ? 11 : 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    function drawSegment(from, to) {
      ctx.strokeStyle = mode === 'eraser' ? '#fff' : '#17263c';
      ctx.lineWidth = mode === 'eraser' ? 22 : 2.5;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }
    function finish(event) {
      if (!active) return;
      if (!moved && last) drawDot(last);
      active = false;
      activePointer = null;
      last = null;
      document.documentElement.classList.remove('pencil-writing');
      if (event && canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    }
    canvas.style.touchAction = 'none';
    canvas.style.overscrollBehavior = 'contain';
    canvas.style.userSelect = 'none';
    canvas.style.webkitUserSelect = 'none';
    canvas.style.webkitTouchCallout = 'none';
    canvas.addEventListener('pointerdown', function (event) {
      // A palm is reported as a touch contact. Apple Pencil input remains pen input.
      if (event.pointerType === 'touch') { event.preventDefault(); event.stopImmediatePropagation(); return; }
      pointerEventsSeen = true;
      if (event.type !== 'pointerrawupdate') event.preventDefault();
      event.stopImmediatePropagation();
      active = true;
      activePointer = event.pointerId;
      moved = false;
      last = point(event);
      // Paint immediately on contact so slow writing never feels delayed.
      drawDot(last);
      canvas.setPointerCapture(event.pointerId);
      document.documentElement.classList.add('pencil-writing');
    }, { capture: true, passive: false });
    function move(event) {
      if (!active || event.pointerId !== activePointer) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const events = typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : [event];
      events.forEach(function (sample) {
        const next = point(sample);
        if (Math.abs(next.x - last.x) + Math.abs(next.y - last.y) > 0.05) {
          drawSegment(last, next);
          moved = true;
          last = next;
        }
      });
    }
    // pointerrawupdate reduces latency on Apple Pencil; pointermove remains the fallback.
    canvas.addEventListener('pointerrawupdate', move, { capture: true, passive: false });
    canvas.addEventListener('pointermove', move, { capture: true, passive: false });
    ['pointerup', 'pointercancel'].forEach(function (name) {
      canvas.addEventListener(name, function (event) { event.preventDefault(); event.stopImmediatePropagation(); finish(event); }, { capture: true, passive: false });
    });
    function touchPoint(touch) {
      return point({ clientX: touch.clientX, clientY: touch.clientY });
    }
    function pencilTouch(touch) {
      const radius = Math.max(touch.radiusX || 0, touch.radiusY || 0);
      return radius === 0 || radius < 24 || touch.touchType === 'stylus';
    }
    canvas.addEventListener('touchstart', function (event) {
      if (pointerEventsSeen || !event.changedTouches.length) return;
      const touch = event.changedTouches[0];
      if (!pencilTouch(touch)) return;
      event.preventDefault();
      const p = touchPoint(touch);
      active = true;
      touchId = touch.identifier;
      moved = false;
      last = p;
      drawDot(last);
      document.documentElement.classList.add('pencil-writing');
    }, { passive: false });
    canvas.addEventListener('touchmove', function (event) {
      if (pointerEventsSeen || !active) return;
      const touch = Array.from(event.touches).find(function (item) { return item.identifier === touchId; });
      if (!touch) return;
      event.preventDefault();
      const next = touchPoint(touch);
      if (Math.abs(next.x - last.x) + Math.abs(next.y - last.y) > 0.05) {
        drawSegment(last, next);
        moved = true;
        last = next;
      }
    }, { passive: false });
    ['touchend', 'touchcancel'].forEach(function (name) {
      canvas.addEventListener(name, function (event) {
        if (pointerEventsSeen || !active) return;
        event.preventDefault();
        active = false;
        touchId = null;
        last = null;
        document.documentElement.classList.remove('pencil-writing');
      }, { passive: false });
    });
    if (pen) pen.onclick = function () { mode = 'pen'; pen.classList.add('active'); if (eraser) eraser.classList.remove('active'); };
    if (eraser) eraser.onclick = function () { mode = 'eraser'; eraser.classList.add('active'); if (pen) pen.classList.remove('active'); };
    if (clear) clear.onclick = function () { ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr); };
    resize();
    window.addEventListener('resize', resize, { passive: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, { once: true });
  else setup();
})();
