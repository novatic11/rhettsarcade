'use strict';
// ---------- Research Center, Mission Control, Tracking Station ----------
const Research = (function () {
  let sel = 'start', view = { x: 30, y: 30, s: 1 }, pan = null, branch = 'main';
  const branchOf = t => t.branch || 'main';
  const CW = 210, RH = 104;
  function open() {
    $('#research').hidden = false;
    Sound.setMood('research');
    render();
    Tutorial.show('research');
  }
  function close() { $('#research').hidden = true; }
  function state(t) { if (Save.prog.tech[t.id]) return 'done'; if (t.req.every(r => Save.prog.tech[r])) return 'avail'; return 'locked'; }
  function render() {
    $('#rsScience').textContent = fmtNum(Save.prog.science, 1);
    $$('#rsTabs button').forEach(b => b.classList.toggle('on', b.dataset.branch === branch));
    const isOpen = TechById.isProgram && state(TechById.isProgram) !== 'locked';
    const tabIS = $('#rsTabs [data-branch=interstellar]'); if (tabIS) tabIS.classList.toggle('dim', !isOpen && !Save.prog.tech.isProgram);
    const techs = TECH.filter(t => branchOf(t) === branch);
    if (branchOf(TechById[sel]) !== branch) sel = techs[0].id;
    const canvas = $('#techCanvas'); canvas.innerHTML = '';
    const W = (Math.max(...techs.map(t => t.col)) + 1) * CW + 40, H = 7 * RH + 40;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', W); svg.setAttribute('height', H); svg.classList.add('tech-lines');
    for (const t of techs) for (const r of t.req) {
      const a = TechById[r];
      if (branchOf(a) !== branch) continue; // prerequisites in the other tab are listed in the detail panel
      const x1 = a.col * CW + 180, y1 = a.row * RH + 40, x2 = t.col * CW, y2 = t.row * RH + 40;
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', `M${x1},${y1} C${x1 + 20},${y1} ${x2 - 20},${y2} ${x2},${y2}`);
      p.setAttribute('class', Save.prog.tech[r] ? (Save.prog.tech[t.id] ? 'done' : 'ready') : 'off');
      svg.appendChild(p);
    }
    canvas.appendChild(svg);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    for (const t of techs) {
      const st = state(t);
      const n = el('div', `tnode ${st}${t.id === sel ? ' sel' : ''}${branch === 'interstellar' ? ' star' : ''}`);
      n.style.left = t.col * CW + 'px'; n.style.top = t.row * RH + 'px';
      const icons = t.parts.slice(0, 5).map(pid => { const c = Sprites.icon(pid, 26); return c; });
      n.innerHTML = `<div class="tn-h"><b>${esc(t.name)}</b><span>${st === 'done' ? '✓' : fmtInt(t.cost) + ' ⚗'}</span></div><div class="tn-icons"></div>`;
      icons.forEach(c => n.querySelector('.tn-icons').appendChild(c));
      if (t.parts.length > 5) n.querySelector('.tn-icons').appendChild(el('em', '', '+' + (t.parts.length - 5)));
      n.onclick = (e) => { e.stopPropagation(); sel = t.id; render(); Sound.fx.click(); };
      canvas.appendChild(n);
    }
    applyView();
    detail();
  }
  function applyView() { $('#techCanvas').style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.s})`; }
  function detail() {
    const t = TechById[sel]; const box = $('#techDetail');
    const st = state(t);
    const parts = t.parts.map(pid => { const p = PARTS[pid]; return `<div class="td-part"><canvas data-pid="${pid}"></canvas><div><b>${esc(p.name)}</b><small>${esc(p.desc || CATS.find(c => c[0] === p.cat)[2])}</small></div></div>`; }).join('');
    const reqName = r => TechById[r].name + (branchOf(TechById[r]) !== branchOf(t) ? (branchOf(TechById[r]) === 'main' ? ' (main tree)' : ' (Interstellar tab)') : '');
    box.innerHTML = `<h3>${esc(t.name)}</h3><p>${esc(t.desc)}</p>
      <div class="kv"><span>Cost</span><b>${fmtInt(t.cost)} science</b><span>Requires</span><b>${t.req.length ? t.req.map(reqName).join(', ') : '—'}</b></div>
      ${st === 'done' ? '<div class="pill good">Researched</div>' : st === 'avail' ? `<button id="tdBuy" class="primary" ${Save.prog.science < t.cost ? 'disabled' : ''}>Research for ${fmtInt(t.cost)} science</button>${Save.prog.science < t.cost ? `<p class="muted">You need ${fmtNum(t.cost - Save.prog.science, 1)} more science. Fly missions and run experiments in new places.</p>` : ''}` : `<p class="muted">Research ${t.req.filter(r => !Save.prog.tech[r]).map(reqName).join(' and ')} first.</p>`}
      <h4>Unlocks ${t.parts.length} part${t.parts.length === 1 ? '' : 's'}</h4>${parts}`;
    $$('canvas[data-pid]', box).forEach(c => { const ic = Sprites.icon(c.dataset.pid, 44); c.replaceWith(ic); });
    const b = $('#tdBuy'); if (b) b.onclick = () => {
      if (Save.prog.science < t.cost) return;
      Save.prog.science -= t.cost; Save.prog.tech[t.id] = true; Save.save();
      Sound.fx.success(); toast(`Researched ${esc(t.name)}`, 'good'); Game.checkMissions(Missions.newLog()); render();
    };
  }
  function bind() {
    $('#rsBack').onclick = () => Game.goto('center');
    $$('#rsTabs button').forEach(b => b.onclick = () => { if (branch === b.dataset.branch) return; branch = b.dataset.branch; view = { x: 30, y: 30, s: 1 }; render(); Sound.fx.click(); });
    const wrap = $('#techWrap');
    wrap.addEventListener('pointerdown', e => { pan = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }; });
    window.addEventListener('pointermove', e => { if (!pan) return; view.x = pan.vx + e.clientX - pan.x; view.y = pan.vy + e.clientY - pan.y; applyView(); });
    window.addEventListener('pointerup', () => pan = null);
    wrap.addEventListener('wheel', e => { e.preventDefault(); const r = wrap.getBoundingClientRect(); const mx = e.clientX - r.left, my = e.clientY - r.top; const ns = clamp(view.s * Math.pow(1.0012, -e.deltaY), 0.4, 1.6); view.x = mx - (mx - view.x) * ns / view.s; view.y = my - (my - view.y) * ns / view.s; view.s = ns; applyView(); }, { passive: false });
  }
  return { open, close, bind };
})();

const MissionControl = (function () {
  let sel = null;
  function open() { $('#mcontrol').hidden = false; Sound.setMood('center'); render(); Tutorial.show('missions'); }
  function close() { $('#mcontrol').hidden = true; }
  function render() {
    const P = Save.prog;
    const avail = Missions.available(P).filter(m => !P.missions.active[m.id]);
    const act = Object.keys(P.missions.active).map(id => MissionById[id]).filter(Boolean);
    const done = Object.keys(P.missions.done).map(id => MissionById[id]).filter(Boolean);
    if (!sel) sel = (act[0] || avail[0] || done[0] || MISSIONS[0]).id;
    const item = (m, cls) => `<button class="mitem ${cls}${m.id === sel ? ' sel' : ''}" data-m="${m.id}"><b>${esc(m.title)}</b><span>${m.reward} science</span></button>`;
    $('#mcList').innerHTML = `<h4>Active</h4>${act.map(m => item(m, 'act')).join('') || '<p class="muted">None. Accept a mission to track it in flight.</p>'}
      <h4>Available</h4>${avail.map(m => item(m, 'av')).join('') || '<p class="muted">Complete active missions to unlock more.</p>'}
      <h4>Completed (${done.length}/${MISSIONS.length})</h4>${done.map(m => item(m, 'dn')).join('')}`;
    $$('#mcList [data-m]').forEach(b => b.onclick = () => { sel = b.dataset.m; render(); Sound.fx.click(); });
    const m = MissionById[sel];
    const isAct = !!P.missions.active[m.id], isDone = !!P.missions.done[m.id];
    const st = P.missions.active[m.id];
    const hasRec = m.obj.some(o => o.t === 'recover');
    $('#mcDetail').innerHTML = `<h3>${esc(m.title)}</h3><div class="mc-reward">Reward: <b>${m.reward} science</b></div><p>${esc(m.brief)}</p>
      <h4>Objectives</h4><ul class="objs">${m.obj.map((o, i) => `<li class="${isDone || (st && st.done[i]) ? 'ok' : ''}">${isDone || (st && st.done[i]) ? '✓' : '○'} ${esc(o.text)}</li>`).join('')}</ul>
      ${hasRec ? '<p class="muted">All objectives must be met during a single flight that ends with recovery on Earth.</p>' : ''}
      ${m.tip ? `<div class="tip"><b>How to</b> ${esc(m.tip)}</div>` : ''}
      ${isDone ? '<div class="pill good">Completed</div>' : isAct ? '<button id="mcAbandon" class="ghost">Abandon</button>' : (Missions.available(P).includes(m) ? '<button id="mcAccept" class="primary">Accept mission</button>' : '<p class="muted">Locked: complete earlier missions first.</p>')}`;
    const a = $('#mcAccept'); if (a) a.onclick = () => { P.missions.active[m.id] = { done: m.obj.map(() => false) }; Save.save(); Sound.fx.success(); Game.checkMissions(Missions.newLog()); render(); };
    const ab = $('#mcAbandon'); if (ab) ab.onclick = () => { delete P.missions.active[m.id]; Save.save(); render(); };
    $('#mcScience').textContent = fmtNum(P.science, 1);
    const s = P.stats;
    $('#mcStats').innerHTML = `<div class="kv"><span>Launches</span><b>${s.launches}</b><span>Recovered</span><b>${s.recovered}</b><span>Lost</span><b>${s.lost}</b></div><div class="kv"><span>Total science earned</span><b>${fmtNum(P.totalScience || 0, 1)}</b><span>Tech researched</span><b>${Object.keys(P.tech).length}/${TECH.length}</b></div><div class="kv"><span>Astronauts</span><b>${P.crew.map(c => `${esc(c.name.split(' ')[0])}${c.status === 'flight' ? ' ✈' : ''}`).join(', ')}</b></div>`;
  }
  function bind() { $('#mcBack').onclick = () => Game.goto('center'); }
  return { open, close, bind, render };
})();

const Tracking = (function () {
  let active = false;
  const WARP = [1, 100, 10000, 1000000, 10000000, 1000000000, 10000000000];
  let w = 0;
  function open() {
    active = true;
    $('#tracking').hidden = false;
    Sound.setMood('space');
    MapView.enter('tracking', null);
    MapView.focus({ body: 'earth' });
    renderList();
    Tutorial.show('tracking');
  }
  function close() { active = false; $('#tracking').hidden = true; MapView.exit(); w = 0; }
  function renderList() {
    const box = $('#tsList');
    const vs = Game.vessels.filter(v => !v.dead && v.type !== 'debris');
    box.innerHTML = vs.length ? '' : '<p class="muted">No spacecraft in flight. Launch something from the Assembly Building.</p>';
    for (const v of vs) {
      const B = Bodies.byId[v.body];
      const row = el('div', 'ts-row', `<div><b>${esc(v.name)}</b><small>${v.type === 'flag' ? 'Flag' : v.type === 'eva' ? 'Astronaut' : v.landed ? (v.splashed ? 'Splashed on ' : 'Landed on ') + B.name : 'Orbiting ' + B.name}</small></div>`);
      const btns = el('div', 'ts-btns');
      if (v.type !== 'flag') { const f = el('button', 'primary', 'Fly'); f.onclick = () => Game.flyVessel(v.id); btns.appendChild(f); }
      const fo = el('button', '', 'Focus'); fo.onclick = () => MapView.focus({ vessel: v.id }); btns.appendChild(fo);
      if (v.landed && v.body === 'earth' && v.type === 'ship') { const r = el('button', '', 'Recover'); r.onclick = () => { Game.vessels.splice(Game.vessels.indexOf(v), 1); for (const p of v.parts) for (const n of p.crew || []) { const c = Save.prog.crew.find(c => c.name === n); if (c) c.status = 'ready'; } let sci = 0; for (const d of v.data || []) { const a = Science.value(Save.prog, d.subj, d.cap, 1); Science.bank(Save.prog, d.subj, a); sci += a; } v.log.recovered = true; Game.checkMissions(v.log, true); Game.persist(); toast(`Recovered ${esc(v.name)}: +${fmtNum(sci, 1)} science`, 'good'); renderList(); }; btns.appendChild(r); }
      const t = el('button', 'danger ghost', 'End'); t.title = 'Terminate this flight';
      t.onclick = () => Modal.open('End this flight?', `<p>${esc(v.name)} will be removed. Any crew aboard return to the space center.</p>`, [{ label: 'Cancel' }, { label: 'End flight', primary: true, fn: () => { for (const p of v.parts || []) for (const n of p.crew || []) { const c = Save.prog.crew.find(c => c.name === n); if (c) c.status = 'ready'; } if (v.type === 'eva') { const c = Save.prog.crew.find(c => c.name === v.crewName); if (c) c.status = 'ready'; } Game.vessels.splice(Game.vessels.indexOf(v), 1); Game.persist(); renderList(); } }]);
      btns.appendChild(t);
      row.appendChild(btns); box.appendChild(row);
    }
    const bl = $('#tsBodies'); bl.innerHTML = '';
    for (const b of Bodies.list) {
      if (b.type === 'moon' && !['moon'].includes(b.id) && b.R < 30000 && !['phobos', 'deimos'].includes(b.id)) { }
      const bt = el('button', 'tsb ' + b.type, `<i style="background:${b.color}"></i>${b.name}`);
      bt.onclick = () => { MapView.focus({ body: b.id }); MapView.showInfo(b); };
      bl.appendChild(bt);
    }
    updWarp();
  }
  function updWarp() { $$('#tsWarp button[data-w]').forEach(b => b.classList.toggle('on', +b.dataset.w === w)); }
  function update(dt) {
    if (!active) return;
    const sim = Math.min(dt, 0.1) * WARP[w];
    Game.time += sim;
    Bodies.update(Game.time);
    for (const v of Game.vessels) { if (v.dead) continue; Phys.rails(v, v.epoch != null ? v.epoch : Game.time, Game.time, null); v.epoch = Game.time; if (v.dead) { toast(esc(v.deathMsg || v.name + ' was lost'), 'bad'); } }
    for (let i = Game.vessels.length - 1; i >= 0; i--) if (Game.vessels[i].dead) { Game.vessels.splice(i, 1); renderList(); }
    MapView.update(dt, null);
    MapView.render();
    $('#tsTime').textContent = fmtUT(Game.time);
  }
  function bind() {
    $('#tsBack').onclick = () => Game.goto('center');
    $$('#tsWarp button[data-w]').forEach(b => b.onclick = () => { w = +b.dataset.w; updWarp(); });
  }
  return { open, close, update, bind, get active() { return active; } };
})();
