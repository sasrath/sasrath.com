// Wafer light, wafer tilt, card spotlight and scroll reveals.
// All of it is optional: without this file the page renders complete and static.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const wafer = document.querySelector('.wafer');
  const hero = document.querySelector('.hero');

  // A light that bounces around inside the wafer like a ball on a round table.
  // It lives in the wafer's spinning group, so it also revolves with the wafer.
  if (wafer) {
    const beams = wafer.querySelectorAll('.beam');
    const C = 310, R = Number(wafer.dataset.r);
    let x = Number(beams[0].getAttribute('cx')) - C;
    let y = Number(beams[0].getAttribute('cy')) - C;
    let vx = 74, vy = 51; // viewBox units per second
    let raf = 0, last = 0, onScreen = true;

    const step = t => {
      const dt = Math.min((t - last) / 1000, 0.05);
      last = t;
      x += vx * dt;
      y += vy * dt;
      const d = Math.hypot(x, y);
      if (d > R) {
        // Reflect off the rim, with a small random kick so the path never repeats.
        const nx = x / d, ny = y / d, dot = vx * nx + vy * ny;
        vx -= 2 * dot * nx;
        vy -= 2 * dot * ny;
        const a = (Math.random() - 0.5) * 0.5, c = Math.cos(a), s = Math.sin(a);
        [vx, vy] = [vx * c - vy * s, vx * s + vy * c];
        x = nx * R;
        y = ny * R;
      }
      for (const b of beams) {
        b.setAttribute('cx', (C + x).toFixed(1));
        b.setAttribute('cy', (C + y).toFixed(1));
      }
      raf = requestAnimationFrame(step);
    };

    const sync = () => {
      const run = onScreen && !reduce.matches;
      wafer.classList.toggle('paused', !run);
      if (run && !raf) {
        last = performance.now();
        raf = requestAnimationFrame(step);
      } else if (!run && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };
    new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; sync(); }).observe(wafer);
    reduce.addEventListener('change', sync);

    // Tilt the wafer towards the pointer (mouse and trackpad only).
    if (hero) {
      hero.addEventListener('pointermove', e => {
        if (!fine.matches || reduce.matches) return;
        const r = hero.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        wafer.style.setProperty('--ry', `${(px * 16).toFixed(2)}deg`);
        wafer.style.setProperty('--rx', `${(-py * 12).toFixed(2)}deg`);
      });
      hero.addEventListener('pointerleave', () => {
        wafer.style.removeProperty('--rx');
        wafer.style.removeProperty('--ry');
      });
    }
  }

  // Soft spotlight that follows the pointer across cards.
  for (const el of document.querySelectorAll('.card, .edu li')) {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  }

  // Fade content in as it scrolls into view. Only items below the fold are hidden first,
  // so nothing already on screen flickers. Checked on scroll (not IntersectionObserver)
  // so a jump to the bottom still reveals everything it skipped past.
  if (!reduce.matches) {
    const items = document.querySelectorAll('main h2, .chips, .timeline li, .edu li, .card, .posts li, .domains, .more');
    let pending = [];
    for (const el of items) {
      if (el.getBoundingClientRect().top < innerHeight) continue;
      const i = [...el.parentElement.children].indexOf(el);
      el.style.setProperty('--d', `${Math.min(i, 5) * 70}ms`);
      el.classList.add('rv', 'pending');
      pending.push(el);
    }
    let queued = false;
    const check = () => {
      queued = false;
      const edge = innerHeight * 0.92;
      pending = pending.filter(el => {
        if (el.getBoundingClientRect().top > edge) return true;
        el.classList.remove('pending');
        return false;
      });
      if (!pending.length) removeEventListener('scroll', onScroll);
    };
    const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(check); } };
    if (pending.length) addEventListener('scroll', onScroll, { passive: true });
  }
})();
