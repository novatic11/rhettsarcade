import { centralInputValue, centralReleaseLabel, centralReleaseTimes } from './release-clock.js';

async function releaseApi(body) {
  const response = await fetch('/api/playtest/releases', {
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
    ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {})
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Release scheduling is unavailable.');
  return data;
}
const make = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
};

export async function openReleaseScheduler(game, onChange) {
  const dialog = make('dialog', '', 'release-scheduler');
  dialog.setAttribute('aria-labelledby', 'release-scheduler-title');
  const title = make('h2', 'Release ' + game.title);
  title.id = 'release-scheduler-title';
  const close = make('button', 'Close', 'secondary-action');
  close.type = 'button';
  close.onclick = () => dialog.close();
  const header = make('header');
  header.append(title, close);
  const status = make('p', 'Loading release settings…', 'playtest-status');
  status.setAttribute('role', 'status');
  dialog.append(header, status);
  document.body.append(dialog);
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  dialog.showModal();
  try {
    const [feed, main] = await Promise.all([
      releaseApi(),
      fetch('/games.json', { signal: AbortSignal.timeout(10000) }).then(response => {
        if (!response.ok) throw new Error('Could not load the main collection.');
        return response.json();
      })
    ]);
    if (!dialog.open) return;
    const existing = feed.games.find(entry => entry.id === game.id);
    if (existing && !existing.upcoming) {
      status.textContent = 'Released ' + centralReleaseLabel(existing.releaseAt) + '.';
      return;
    }
    if (main.some(entry => entry.id === game.id)) {
      status.textContent = 'This game is already in the main collection.';
      return;
    }
    let position = existing ? main.findIndex(entry => entry.id === existing.beforeId) : main.length;
    if (position < 0) position = main.length;
    const form = make('form');
    const time = make('input');
    time.type = 'datetime-local';
    time.required = true;
    time.step = '60';
    const defaultTime = Math.ceil((feed.now + 60 * 60000) / (15 * 60000)) * 15 * 60000;
    time.value = centralInputValue(existing?.releaseAt ?? defaultTime);
    const timeLabel = make('label', 'Release date and time (Central Time)');
    timeLabel.append(time);
    const occurrence = make('select');
    const occurrenceLabel = make('label', 'Which time during the repeated hour?');
    occurrenceLabel.append(occurrence);
    const releasePreview = make('p', '', 'release-time-preview');
    function updateTime(preferred) {
      const times = centralReleaseTimes(time.value);
      occurrence.replaceChildren();
      for (const [index, timestamp] of times.entries()) {
        const option = make('option', centralReleaseLabel(timestamp));
        option.value = String(index);
        occurrence.append(option);
      }
      if (times.includes(preferred)) occurrence.value = String(times.indexOf(preferred));
      occurrenceLabel.hidden = times.length < 2;
      showSelectedTime();
    }
    function showSelectedTime() {
      const at = centralReleaseTimes(time.value)[Number(occurrence.value)];
      releasePreview.textContent = at ? 'Releases ' + centralReleaseLabel(at) + '.' : 'Choose a valid Central Time date and time.';
    }
    time.oninput = () => updateTime();
    occurrence.onchange = showSelectedTime;
    updateTime(existing?.releaseAt);
    const instruction = make('p', 'Drag the countdown card or its handle onto a tile to place it before that game. The released game will keep that spot in the default library order.');
    const layout = make('ol', '', 'release-layout');
    layout.setAttribute('aria-label', 'Main collection placement preview');
    const placement = make('p', '', 'release-time-preview');
    placement.setAttribute('aria-live', 'polite');
    const earlier = make('button', 'Move earlier', 'secondary-action');
    const later = make('button', 'Move later', 'secondary-action');
    const handle = make('button', 'Drag countdown card', 'secondary-action release-drag-handle');
    earlier.type = later.type = 'button';
    handle.type = 'button';
    const placementActions = make('div', '', 'release-actions');
    placementActions.append(handle, earlier, later);
    let dragging = false;
    let saving = false;
    function setPosition(index) {
      position = index;
      drawLayout();
    }
    function dropTarget(tile, index) {
      tile.ondragover = event => {
        if (!dragging || saving) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        tile.classList.add('release-drop-hover');
      };
      tile.ondragleave = () => tile.classList.remove('release-drop-hover');
      tile.ondrop = event => {
        if (!dragging || saving) return;
        event.preventDefault();
        dragging = false;
        setPosition(index);
      };
    }
    function dragSource(tile) {
      tile.draggable = !saving;
      tile.ondragstart = event => {
        dragging = true;
        event.dataTransfer.setData('text/plain', game.id);
        event.dataTransfer.effectAllowed = 'move';
      };
      tile.ondragend = () => {
        dragging = false;
        layout.querySelectorAll('.release-drop-hover').forEach(target => target.classList.remove('release-drop-hover'));
      };
    }
    function drawLayout() {
      const scrollTop = layout.scrollTop;
      const selected = make('li', game.title + ' · Countdown', 'release-layout-card release-layout-selected');
      selected.title = 'Drag this card to change its position';
      handle.disabled = saving;
      dragSource(handle);
      dragSource(selected);
      layout.replaceChildren();
      main.forEach((entry, index) => {
        if (position === index) layout.append(selected);
        const tile = make('li', entry.title, 'release-layout-card');
        dropTarget(tile, index);
        layout.append(tile);
      });
      if (position === main.length) layout.append(selected);
      else {
        const end = make('li', 'Drop at end', 'release-layout-card release-layout-end');
        dropTarget(end, main.length);
        layout.append(end);
      }
      earlier.disabled = saving || position === 0;
      later.disabled = saving || position === main.length;
      layout.scrollTop = scrollTop;
      placement.textContent = position === main.length ? 'Position: end of the collection.' : 'Position: before ' + main[position].title + '.';
    }
    earlier.onclick = () => setPosition(position - 1);
    later.onclick = () => setPosition(position + 1);
    drawLayout();
    const submit = make('button', existing ? 'Save countdown' : 'Schedule release', 'primary');
    submit.type = 'submit';
    const actions = make('div', '', 'release-actions');
    actions.append(submit);
    let cancel;
    if (existing) {
      cancel = make('button', 'Remove countdown', 'secondary-action');
      cancel.type = 'button';
      cancel.onclick = () => save({ action: 'cancel', gameId: game.id });
      actions.append(cancel);
    }
    async function save(body) {
      if (saving) return;
      saving = true;
      submit.disabled = time.disabled = occurrence.disabled = true;
      if (cancel) cancel.disabled = true;
      drawLayout();
      status.textContent = 'Saving…';
      try {
        await releaseApi(body);
        onChange();
        dialog.close();
      } catch (error) {
        status.textContent = error.message || 'Could not save the release.';
      } finally {
        saving = false;
        submit.disabled = time.disabled = occurrence.disabled = false;
        if (cancel) cancel.disabled = false;
        drawLayout();
      }
    }
    form.onsubmit = event => {
      event.preventDefault();
      save({
        action: 'schedule', gameId: game.id, localTime: time.value,
        occurrence: Number(occurrence.value), beforeId: main[position]?.id ?? null
      });
    };
    form.append(timeLabel, occurrenceLabel, releasePreview, make('h3', 'Countdown card position'), instruction, placementActions, placement, layout, actions, status);
    dialog.append(form);
    status.textContent = '';
  } catch (error) {
    status.textContent = error.message || 'Could not open the release scheduler.';
  }
}
