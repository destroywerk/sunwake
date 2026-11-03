// Browser-only previews never schedule an alarm or request device permissions.
(() => {
  const phone = document.querySelector('.journey');
  if (!phone) return;
  const stagePhone = phone.querySelector('.story-stage .live-phone');
  const stageScreen = stagePhone.querySelector('.phone-screen');
  const panels = [...phone.querySelectorAll('[data-panel]')];
  const steps = [...document.querySelectorAll('[data-scene].story-step')];
  const values = { hour: 6, minute: 0, sleep: 7 };
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(pointer:fine)');
  let manualScene = null;
  let manualScroll = 0;
  let currentScene = 'alarms';
  let scrollFrame = 0;
  let heroPinStart = 0;
  let heroPinDistance = 1;
  const desktop = () => innerWidth > 760;
  // Reuse each interactive screen in its own inline phone on small screens.
  // Moving the existing nodes preserves wheel values, playback and event handlers.
  const mobileScreens = new Map(steps.map(step => {
    const frame = document.createElement('div');
    frame.className = 'live-phone mobile-phone';
    frame.dataset.scene = step.dataset.scene;
    const screen = document.createElement('div');
    screen.className = 'phone-screen';
    screen.append(stageScreen.querySelector('.phone-status').cloneNode(true));
    screen.append(stageScreen.querySelector('.phone-home').cloneNode(true));
    frame.append(screen);
    step.append(frame);
    return [step.dataset.scene, screen];
  }));
  const arrangePhones = () => {
    panels.forEach(panel => {
      const screen = desktop() ? stageScreen : mobileScreens.get(panel.dataset.panel);
      if (panel.parentElement !== screen) screen.insertBefore(panel, screen.querySelector('.phone-home'));
    });
    setScene(currentScene);
  };
  const hero = document.getElementById('hero');
  const heroCopy = hero.querySelector('.hero-copy');
  const scroller = phone.querySelector('.app-list-scroll');
  const measureStory = () => {
    arrangePhones();
    if (desktop()) {
      const padding = parseFloat(getComputedStyle(hero).paddingTop);
      const pinTop = Math.max(24, Math.min(160, innerHeight - heroCopy.offsetHeight - 24));
      heroPinDistance = Math.max(innerHeight * 0.85, (scroller.scrollHeight - scroller.clientHeight) * 1.6);
      hero.style.setProperty('--hero-pin-top', pinTop + 'px');
      hero.style.setProperty('--hero-copy-height', heroCopy.offsetHeight + 'px');
      hero.style.setProperty('--hero-list-distance', heroPinDistance + 'px');
      heroPinStart = Math.max(0, hero.getBoundingClientRect().top + scrollY + padding - pinTop);
      steps.slice(1).forEach(step => {
        const block = step.querySelector('.section-copy-block');
        const top = Math.max(48, Math.min(220, (innerHeight - block.offsetHeight) / 2));
        step.style.setProperty('--copy-rest-top', top + 'px');
        step.style.setProperty('--copy-block-height', block.offsetHeight + 'px');
        step.style.setProperty('--copy-hold-distance', Math.max(320, innerHeight * 0.5) + 'px');
      });
      // The final text and sticky phone must release at the same scroll position.
      const sleepStep = document.getElementById('sleep');
      const stage = phone.querySelector('.story-stage');
      const phoneRelease = phone.getBoundingClientRect().bottom + scrollY
        - stage.offsetHeight - parseFloat(getComputedStyle(stage).top);
      const sleepStart = sleepStep.getBoundingClientRect().top + scrollY;
      sleepStep.style.setProperty('--sleep-hold-distance', Math.max(0, phoneRelease - sleepStart) + 'px');
    } else {
      hero.style.removeProperty('--hero-copy-height');
      hero.style.removeProperty('--hero-list-distance');
    }
    requestStory();
  };
  const setScene = (scene, manual = false) => {
    if (manual) { manualScene = scene; manualScroll = window.scrollY; }
    currentScene = scene;
    stagePhone.dataset.scene = scene;
    panels.forEach(panel => {
      const active = !desktop() || panel.dataset.panel === scene;
      panel.inert = !active;
      panel.setAttribute('aria-hidden', String(!active));
    });
    if (desktop() && scene !== 'sounds') {
      const player = document.getElementById('tone-player');
      if (player && !player.paused) { player.pause(); player.dispatchEvent(new Event('ended')); }
    }
  };
  const updateStory = () => {
    scrollFrame = 0;
    if (!desktop()) return;
    if (manualScene && Math.abs(window.scrollY - manualScroll) > 80) manualScene = null;
    let scene = 'alarms';
    // Let the next heading move into view before changing the phone screen.
    const line = innerHeight * 0.68;
    steps.forEach(step => {
      const copy = step.querySelector('.section-copy-block') || heroCopy;
      if (copy.getBoundingClientRect().top <= line) scene = step.dataset.scene;
    });
    const focusedPanel = document.activeElement && document.activeElement.closest('[data-panel]');
    setScene(focusedPanel ? focusedPanel.dataset.panel : manualScene || scene);
    if (!manualScene) {
      const editor = document.getElementById('all-set');
      const mobile = innerWidth <= 760;
      const start = (mobile ? document.querySelector('.story-stage') : hero).getBoundingClientRect().top + scrollY;
      const end = editor.getBoundingClientRect().top + scrollY - line;
      const progress = Math.max(0, Math.min(1, desktop()
        ? (scrollY - heroPinStart) / heroPinDistance
        : (scrollY - start) / Math.max(1, end - start)));
      scroller.scrollTop = progress * (scroller.scrollHeight - scroller.clientHeight);
    }
  };
  const requestStory = () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateStory); };
  addEventListener('scroll', requestStory, { passive: true });
  addEventListener('resize', measureStory, { passive: true });
  const copyObserver = new ResizeObserver(measureStory);
  copyObserver.observe(heroCopy);
  document.querySelectorAll('.section-copy-block').forEach(block => copyObserver.observe(block));
  // A deliberate page gesture releases the focused demo; keyboard focus alone
  // must not swap the scene while a visitor is editing a wheel.
  addEventListener('wheel', () => {
    if (phone.contains(document.activeElement)) document.activeElement.blur();
    manualScene = null;
  }, { capture: true, passive: true });
  addEventListener('pointerdown', event => {
    if (!phone.contains(event.target) && phone.contains(document.activeElement)) document.activeElement.blur();
  }, { capture: true, passive: true });
  const openScene = scene => {
    if (desktop()) setScene(scene, true);
    else steps.find(step => step.dataset.scene === scene).scrollIntoView({ block: 'start', behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  };
  document.querySelectorAll('[data-open-editor]').forEach(button => button.addEventListener('click', () => openScene('editor')));
  document.querySelectorAll('[data-back-list]').forEach(button => button.addEventListener('click', () => openScene('alarms')));
  document.querySelector('[data-save-editor]').addEventListener('click', () => {
    const digits = phone.querySelector('.alarms-scene .demo-alarm .alarm-digits');
    digits.innerHTML = String(values.hour).padStart(2, '0') + '<span class="number-colon"><i></i><i></i></span>' + String(values.minute).padStart(2, '0');
    openScene('alarms');
  });
  document.querySelector('[data-open-sounds]').addEventListener('click', () => openScene('sounds'));
  document.querySelector('[data-back-editor]').addEventListener('click', () => openScene('editor'));
  document.querySelectorAll('button.app-switch').forEach(toggle => toggle.addEventListener('click', () => {
    const enabled = toggle.getAttribute('aria-checked') !== 'true';
    toggle.setAttribute('aria-checked', String(enabled));
    const card = toggle.closest('.demo-alarm');
    if (card) {
      card.classList.toggle('active', enabled); card.classList.toggle('inactive', !enabled);
      if (enabled && !card.classList.contains('predawn') && !card.classList.contains('daylight')) card.classList.add('dawn');
      card.querySelector('.alarm-countdown').textContent = enabled ? 'Tomorrow morning' : 'Off';
      const count = phone.querySelectorAll('.alarms-scene .demo-alarm.active').length;
      phone.querySelector('.alarms-scene .app-list-heading em').textContent = '• ' + count + ' alarm' + (count === 1 ? '' : 's') + ' on';
    }
  }));
  document.querySelectorAll('.app-days button').forEach(button => button.addEventListener('click', () => button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true'))));
  document.querySelectorAll('[data-wheel]').forEach(wheel => {
    const key = wheel.dataset.wheel;
    const count = key === 'minute' ? 60 : 24;
    const first = key === 'sleep' ? 1 : 0;
    const spacer = () => { const el = document.createElement('div'); el.className = 'wheel-spacer'; el.setAttribute('aria-hidden', 'true'); return el; };
    wheel.append(spacer());
    const rows = Array.from({ length: count }, (_, index) => {
      const row = document.createElement('div'); row.className = 'wheel-number';
      row.textContent = key === 'sleep' ? String(index + first) : String(index).padStart(2, '0');
      row.id = 'demo-' + key + '-' + index; row.setAttribute('role', 'option');
      wheel.append(row); return row;
    });
    wheel.append(spacer());
    const rowHeight = () => parseFloat(getComputedStyle(rows[0]).height);
    const select = index => {
      index = Math.max(0, Math.min(count - 1, index)); values[key] = index + first;
      rows.forEach((row, value) => row.setAttribute('aria-selected', String(value === index)));
      wheel.setAttribute('aria-activedescendant', rows[index].id);
      if (key === 'sleep') {
        phone.querySelector('.sleep-unit').textContent = values.sleep === 1 ? 'hour' : 'hours';
        phone.querySelector('[data-confirm-sleep]').setAttribute('aria-label', 'Set alarm in ' + values.sleep + (values.sleep === 1 ? ' hour' : ' hours'));
      } else document.getElementById('demo-time').textContent = 'Demo alarm ' + String(values.hour).padStart(2, '0') + ':' + String(values.minute).padStart(2, '0');
    };
    let programTarget = null;
    let settleTimer = 0;
    let measuredRowHeight = rowHeight();
    const goTo = (index, smooth = true) => {
      index = Math.max(0, Math.min(count - 1, index));
      const animated = smooth && !reducedMotion.matches;
      programTarget = index;
      wheel.scrollTo({ top: index * rowHeight(), behavior: animated ? 'smooth' : 'instant' }); select(index);
    };
    wheel.addEventListener('scroll', () => {
      // A responsive layout changes scroll offsets before ResizeObserver runs.
      // Preserve the chosen value until the wheel has been measured again.
      if (Math.abs(rowHeight() - measuredRowHeight) > 0.1) return;
      if (programTarget === null) select(Math.round(wheel.scrollTop / rowHeight()));
      clearTimeout(settleTimer);
      settleTimer = setTimeout(() => { programTarget = null; select(Math.round(wheel.scrollTop / rowHeight())); }, 140);
    }, { passive: true });
    // Desktop wheel gestures continue the page story. Number changes require an
    // intentional click/drag or keyboard action, never simply hovering.
    wheel.addEventListener('wheel', event => {
      if (!finePointer.matches || event.ctrlKey) return;
      event.preventDefault(); wheel.blur(); window.scrollBy({ top: event.deltaY, left: 0, behavior: 'instant' });
    }, { passive: false });
    wheel.addEventListener('focus', () => { if (desktop()) setScene(wheel.closest('[data-panel]').dataset.panel, true); });
    wheel.addEventListener('keydown', event => {
      let next; const index = programTarget === null ? values[key] - first : programTarget;
      if (event.key === 'ArrowDown') next = index + 1;
      if (event.key === 'ArrowUp') next = index - 1;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = count - 1;
      if (next !== undefined) { event.preventDefault(); goTo(next); }
    });
    let drag = null; let dragged = false;
    wheel.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      event.preventDefault(); programTarget = null; wheel.focus({ preventScroll: true });
      drag = { y: event.clientY, top: wheel.scrollTop, pointer: event.pointerId }; dragged = false;
      wheel.classList.add('dragging'); wheel.setPointerCapture(event.pointerId);
    });
    const endDrag = () => {
      if (!drag) return;
      const prior = drag; drag = null; wheel.classList.remove('dragging');
      if (wheel.hasPointerCapture(prior.pointer)) wheel.releasePointerCapture(prior.pointer);
      const tapOffset = dragged ? 0 : (prior.y - wheel.getBoundingClientRect().top - wheel.clientHeight / 2);
      goTo(Math.round((wheel.scrollTop + tapOffset) / rowHeight()));
    };
    wheel.addEventListener('pointermove', event => {
      if (!drag) return;
      if (!(event.buttons & 1)) { endDrag(); return; }
      if (Math.abs(event.clientY - drag.y) > 3) dragged = true;
      wheel.scrollTop = drag.top + drag.y - event.clientY;
    });
    wheel.addEventListener('pointerup', endDrag);
    wheel.addEventListener('pointercancel', endDrag);
    wheel.addEventListener('lostpointercapture', endDrag);
    rows.forEach((row, index) => row.addEventListener('click', event => { if (event.pointerType !== 'mouse') goTo(index); }));
    new ResizeObserver(() => {
      measuredRowHeight = rowHeight();
      const padding = Math.max(0, (wheel.clientHeight - rowHeight()) / 2);
      const offset = key === 'sleep' ? rowHeight() * 6 / 118.4 : 0;
      wheel.querySelectorAll('.wheel-spacer').forEach((el, i) => el.style.height = Math.max(0, padding + (i === 0 ? offset : -offset)) + 'px');
      goTo(values[key] - first, false);
    }).observe(wheel);
    goTo(values[key] - first, false);
  });
  phone.querySelector('[data-confirm-sleep]').addEventListener('click', () => {
    const now = new Date(); now.setSeconds(0, 0);
    const wake = new Date(now.getTime() + values.sleep * 3600000);
    const hours = String(wake.getHours()).padStart(2, '0'); const minutes = String(wake.getMinutes()).padStart(2, '0');
    const holder = phone.querySelector('.sleep-created');
    holder.innerHTML = '<article class="demo-alarm active dawn"><div class="alarm-top"><span class="alarm-countdown">In ' + values.sleep + 'h</span><button class="app-switch" type="button" role="switch" aria-checked="true" aria-label="Demo sleep alarm"><i></i></button></div><div class="alarm-digits">' + hours + '<span class="number-colon"><i></i><i></i></span>' + minutes + '</div><strong>Alarm</strong><span class="alarm-repeat">Once · System default</span></article>';
    holder.hidden = false; phone.querySelector('.sleep-scene').classList.add('has-alarm');
    phone.querySelector('.sleep-scene .app-list-heading em').textContent = '• 1 alarm on';
    document.getElementById('sleep-result').textContent = 'Preview alarm set for ' + hours + ':' + minutes + ', in ' + values.sleep + ' hours.';
    holder.querySelector('button').addEventListener('click', () => {
      holder.hidden = true; phone.querySelector('.sleep-scene').classList.remove('has-alarm');
      phone.querySelector('.sleep-scene .app-list-heading em').textContent = '• No alarms set';
      document.getElementById('sleep-result').textContent = 'Preview alarm turned off.';
    });
  });
  document.fonts.ready.then(measureStory);
  measureStory();
})();

// Brighten the bottom glow on approach and with additional overscroll pressure.
(() => {
  const closing = document.querySelector('.closing');
  if (!closing) return;
  let pull = 0;
  let frame = 0;
  let previous = 0;
  const remaining = () => Math.max(0, document.documentElement.scrollHeight - innerHeight - scrollY);
  const paint = () => {
    closing.style.setProperty('--footer-progress', Math.max(0, 1 - remaining() / (innerHeight * 0.8)));
    closing.style.setProperty('--footer-pull', pull);
  };
  const settle = time => {
    const dt = previous ? Math.min(50, time - previous) : 16.67;
    previous = time;
    pull *= Math.pow(0.94, dt / 16.67);
    if (pull < 0.005) pull = 0;
    paint();
    frame = pull ? requestAnimationFrame(settle) : 0;
    if (!frame) previous = 0;
  };
  const nudge = amount => {
    if (remaining() > 2 || amount <= 0) return;
    pull = Math.min(1, pull + amount / 400);
    paint();
    if (!frame) frame = requestAnimationFrame(settle);
  };
  addEventListener('scroll', () => {
    const beyond = scrollY - (document.documentElement.scrollHeight - innerHeight);
    if (beyond > 0) pull = Math.min(1, beyond / 100);
    paint();
  }, { passive: true });
  addEventListener('wheel', event => { if (!event.ctrlKey) nudge(event.deltaY); }, { passive: true });
  let lastY = null;
  addEventListener('touchstart', event => { lastY = event.touches[0]?.clientY ?? null; }, { passive: true });
  addEventListener('touchmove', event => {
    const y = event.touches[0]?.clientY;
    if (lastY !== null && y !== undefined) nudge(lastY - y);
    lastY = y ?? null;
  }, { passive: true });
  addEventListener('touchend', () => { lastY = null; }, { passive: true });
  addEventListener('resize', paint, { passive: true });
  paint();
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
    player.src = './' + row.dataset.tone + '.m4a?v=3';
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
