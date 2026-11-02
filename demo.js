// This is a browser-only illustration. It does not schedule alarms.
(() => {
  const wheels = document.querySelectorAll('[data-wheel]');
  const output = document.getElementById('demo-time');
  if (!output || !wheels.length) return;
  const values = { hour: 6, minute: 0 };
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  wheels.forEach(wheel => {
    const key = wheel.dataset.wheel;
    const count = key === 'hour' ? 24 : 60;
    const spacer = () => {
      const el = document.createElement('div');
      el.className = 'wheel-spacer';
      el.setAttribute('aria-hidden', 'true');
      return el;
    };
    wheel.append(spacer());
    const rows = Array.from({ length: count }, (_, value) => {
      const row = document.createElement('div');
      row.className = 'wheel-number';
      row.textContent = String(value).padStart(2, '0');
      row.id = 'demo-' + key + '-' + value;
      row.setAttribute('role', 'option');
      wheel.append(row);
      return row;
    });
    wheel.append(spacer());
    const rowHeight = () => parseFloat(getComputedStyle(rows[0]).height);
    const select = value => {
      values[key] = Math.max(0, Math.min(count - 1, value));
      rows.forEach((row, index) => row.setAttribute('aria-selected', String(index === values[key])));
      wheel.setAttribute('aria-activedescendant', rows[values[key]].id);
      output.textContent = 'Demo alarm ' + String(values.hour).padStart(2, '0') + ':' + String(values.minute).padStart(2, '0');
    };
    const goTo = (value, smooth = true) => {
      value = Math.max(0, Math.min(count - 1, value));
      wheel.scrollTo({ top: value * rowHeight(), behavior: smooth && !reducedMotion.matches ? 'smooth' : 'instant' });
      select(value);
    };
    wheel.addEventListener('scroll', () => select(Math.round(wheel.scrollTop / rowHeight())), { passive: true });
    wheel.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowDown') next = values[key] + 1;
      if (event.key === 'ArrowUp') next = values[key] - 1;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = count - 1;
      if (next !== undefined) { event.preventDefault(); goTo(next); }
    });
    rows.forEach((row, index) => row.addEventListener('click', () => goTo(index)));
    let drag = null;
    wheel.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'mouse') return;
      drag = { y: event.clientY, top: wheel.scrollTop };
      wheel.setPointerCapture(event.pointerId);
    });
    wheel.addEventListener('pointermove', event => {
      if (drag) wheel.scrollTop = drag.top + drag.y - event.clientY;
    });
    const endDrag = () => {
      if (!drag) return;
      drag = null;
      goTo(Math.round(wheel.scrollTop / rowHeight()));
    };
    wheel.addEventListener('pointerup', endDrag);
    wheel.addEventListener('pointercancel', endDrag);
    new ResizeObserver(() => {
      const padding = (wheel.clientHeight - rowHeight()) / 2;
      for (const el of wheel.querySelectorAll('.wheel-spacer')) el.style.height = padding + 'px';
      goTo(values[key], false);
    }).observe(wheel);
    goTo(values[key], false);
  });
})();

// Reuse one player; sound files load only after a visitor chooses a tone.
(() => {
  const player = document.getElementById('tone-player');
  const status = document.getElementById('tone-status');
  const rows = [...document.querySelectorAll('[data-tone]')];
  if (!player || !rows.length) return;
  let active = null;
  let revision = 0;
  const stop = () => {
    revision++;
    player.pause();
    active = null;
    rows.forEach(row => {
      if (row.dataset.tone !== 'default') {
        row.setAttribute('aria-pressed', 'false');
        row.setAttribute('aria-label', 'Play ' + row.firstElementChild.textContent);
      }
    });
  };
  rows.forEach(row => row.addEventListener('click', async () => {
    const wasPlaying = active === row;
    stop();
    const request = revision;
    rows.forEach(other => other.dataset.selected = String(other === row));
    const name = row.firstElementChild.textContent;
    if (row.dataset.tone === 'default') {
      status.textContent = 'The system default sound is chosen by iOS on your iPhone.';
      return;
    }
    if (wasPlaying) { status.textContent = name + ' stopped.'; return; }
    active = row;
    row.setAttribute('aria-pressed', 'true');
    row.setAttribute('aria-label', 'Stop ' + name);
    player.src = './' + row.dataset.tone + '.m4a';
    try {
      await player.play();
      if (revision === request) status.textContent = 'Playing ' + name + '.';
    } catch (error) {
      if (revision !== request) return;
      stop();
      status.textContent = 'Unable to play ' + name + '. Please try again.';
    }
  }));
  player.addEventListener('ended', () => { stop(); status.textContent = 'Preview finished.'; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('pagehide', stop);
})();
