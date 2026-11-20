(() => {
  const standaloneGame = document.currentScript?.dataset.game;
  if (standaloneGame && window.top !== window) return;
  const toggle = document.querySelector('#online-toggle');
  const counter = document.querySelector('#online-count');
  const panel = document.querySelector('#online-games');
  const list = document.querySelector('#online-game-list');
  const note = document.querySelector('#online-note');

  let visitor;
  try {
    visitor = localStorage.getItem('rhetts-arcade-visitor');
    if (!/^[0-9a-f-]{36}$/i.test(visitor || '')) {
      visitor = crypto.randomUUID();
      localStorage.setItem('rhetts-arcade-visitor', visitor);
      visitor = localStorage.getItem('rhetts-arcade-visitor') || visitor;
    }
  } catch {
    visitor = crypto.randomUUID();
  }
  const endpoint = '/api/presence';
  const interval = 10000;
  const lifetime = 35000;
  const idleLimit = 5 * 60 * 1000;
  let lastActivity = Date.now();
  let session = null;
  let game = standaloneGame || null;
  let pending = null;
  let refreshAgain = false;
  let lastUpdate = 0;
  let pageActive = true;

  function render(data) {
    if (!counter) return;
    counter.textContent = data.online.toLocaleString() + ' online';
    list.replaceChildren(...data.games.map(entry => {
      const item = document.createElement('li');
      const title = document.createElement('span');
      const players = document.createElement('strong');
      title.textContent = entry.title;
      players.textContent = entry.players.toLocaleString() + (entry.players === 1 ? ' player' : ' players');
      item.append(title, players);
      return item;
    }));
    note.textContent = data.games.length ? '' : 'No games have active players.';
  }

  function report(sessionId, extra) {
    return JSON.stringify({ version: 2, session: sessionId, visitor, ...extra });
  }

  function leave(sessionId) {
    navigator.sendBeacon(endpoint, new Blob([report(sessionId, { leave: true })], {
      type: 'application/json',
    }));
  }

  function pause() {
    if (!session) return;
    const previous = session;
    session = null;
    lastUpdate = 0;
    leave(previous);
  }

  function eligible() {
    return pageActive && !document.hidden && !document.prerendering &&
      (game !== null || Date.now() - lastActivity < idleLimit);
  }

  async function refresh() {
    if (!eligible()) {
      pause();
      if (counter) {
        counter.textContent = 'Checking who’s online…';
        note.textContent = 'Checking active games…';
        list.replaceChildren();
      }
      return;
    }
    if (pending) {
      refreshAgain = true;
      return;
    }
    const sentSession = session ||= crypto.randomUUID();
    pending = sentSession;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: report(sentSession, { game }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error('Presence unavailable');
      const data = await response.json();
      if (session === sentSession && eligible()) {
        lastUpdate = Date.now();
        render(data);
      }
    } catch {
      if (counter && session === sentSession && Date.now() - lastUpdate > lifetime) {
        counter.textContent = 'Online count unavailable';
        note.textContent = 'Could not load active games.';
        list.replaceChildren();
      }
    } finally {
      // A heartbeat already in flight could arrive after the initial leave.
      if (session !== sentSession) leave(sentSession);
      pending = null;
      if (refreshAgain) {
        refreshAgain = false;
        refresh();
      }
    }
  }

  function setOpen(open) {
    toggle.setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
    if (open) refresh();
  }
  if (toggle) {
    toggle.onclick = () => setOpen(panel.hidden);
    document.addEventListener('click', event => {
      if (!panel.hidden && !event.target.closest('.arcade-presence')) setOpen(false);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !panel.hidden) {
        setOpen(false);
        toggle.focus();
      }
    });
    window.arcadeSetPresenceGame = id => {
      if (id === game) return;
      game = id;
      refresh();
    };
  }
  window.addEventListener('pagehide', () => {
    pageActive = false;
    pause();
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted) {
      pageActive = true;
      recordActivity();
    }
  });
  function recordActivity(event) {
    if (event && !event.isTrusted) return;
    lastActivity = Date.now();
    if (!session) refresh();
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
    else {
      lastActivity = Date.now();
      refresh();
    }
  });
  document.addEventListener('prerenderingchange', () => recordActivity(), { once: true });
  for (const event of ['pointerdown', 'keydown', 'wheel']) {
    document.addEventListener(event, recordActivity, { passive: true });
  }
  window.addEventListener('online', refresh);
  setInterval(refresh, interval);
  refresh();
})();
