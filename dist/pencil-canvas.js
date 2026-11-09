(function () {
  'use strict';
  function setup() {
    const canvas = document.getElementById('paper');
    if (!canvas || canvas.dataset.pencilReady) return;
    canvas.dataset.pencilReady = 'true';
    const ctx = canvas.getContext('2d', { alpha: false });
    const pen = document.getElementById('pen');
    const eraser = document.getElementById('eraser');
    const clear = document.getElementById('clear');
    let mode = 'pen';
    let active = false;
    let activePointer = null;
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
      event.preventDefault();
      event.stopImmediatePropagation();
      active = true;
      activePointer = event.pointerId;
      moved = false;
      last = point(event);
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
    if (pen) pen.onclick = function () { mode = 'pen'; pen.classList.add('active'); if (eraser) eraser.classList.remove('active'); };
    if (eraser) eraser.onclick = function () { mode = 'eraser'; eraser.classList.add('active'); if (pen) pen.classList.remove('active'); };
    if (clear) clear.onclick = function () { ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr); };
    resize();
    window.addEventListener('resize', resize, { passive: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, { once: true });
  else setup();
})();
