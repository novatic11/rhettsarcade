'use strict';
// ---------- 2D part sprites for the blueprint and catalogue ----------
// Each part is drawn once into an offscreen canvas (side view, shaded) and then
// dragged around like an image. Stack parts are centred on their axis; surface
// parts are drawn pointing right from their mount point.
const Sprites = (function () {
  const PX = 90; // pixels per metre in the cached sprite
  const cache = {};
  function shade(g, x0, x1, y0, y1, base, dark) {
    const gr = g.createLinearGradient(x0, 0, x1, 0);
    const c = new THREE.Color(base), d = new THREE.Color(dark || base).multiplyScalar(dark ? 1 : 0.45);
    const hi = c.clone().lerp(new THREE.Color(1, 1, 1), 0.35);
    gr.addColorStop(0, '#' + d.getHexString()); gr.addColorStop(0.32, '#' + hi.getHexString()); gr.addColorStop(0.55, '#' + c.getHexString()); gr.addColorStop(1, '#' + d.getHexString());
    return gr;
  }
  function outline(g) { g.lineWidth = 1.2 / PX; g.strokeStyle = 'rgba(8,20,40,0.85)'; g.stroke(); }
  function trap(g, rt, rb, y0, y1) { g.beginPath(); g.moveTo(-rb, y0); g.lineTo(rb, y0); g.lineTo(rt, y1); g.lineTo(-rt, y1); g.closePath(); }
  function bands(g, r, y0, y1, n, col) { g.fillStyle = col; for (let i = 1; i < n; i++) { const y = y0 + (y1 - y0) * i / n; g.fillRect(-r, y - 0.012, 2 * r, 0.024); } }
  function draw(g, p) {
    const h = p.h, r = p.r, rb = p.rb, H = h / 2;
    // y axis: +up. We flip when blitting.
    switch (p.type) {
      case 'probe':
        if (p.id === 'probe_pebble') {
          g.beginPath(); g.arc(0, 0, r * 0.95, 0, Math.PI * 2); g.fillStyle = shade(g, -r, r, 0, 0, '#c3c7cc'); g.fill(); outline(g);
          g.strokeStyle = '#cfd3d8'; g.lineWidth = 0.012; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * r * 0.5, r * 0.5); g.lineTo(s * r * 1.6, r * 1.3); g.stroke(); }
        } else { g.beginPath(); g.rect(-r, -H, 2 * r, h); g.fillStyle = shade(g, -r, r, 0, 0, p.id === 'probe_ring' ? '#8c939b' : '#d8a83c'); g.fill(); outline(g); g.fillStyle = '#d4d6d2'; g.fillRect(-r, H - h * 0.15, 2 * r, h * 0.15); g.fillRect(-r, -H, 2 * r, h * 0.15); g.fillStyle = '#55ff99'; g.fillRect(r * 0.6, H - 0.04, 0.05, 0.04); }
        break;
      case 'pod': case 'cabin':
        trap(g, r, rb, -H, H); g.fillStyle = shade(g, -rb, rb, 0, 0, '#d4d6d2'); g.fill(); outline(g);
        g.fillStyle = '#1c2733'; for (let i = 0; i < (p.crew > 2 ? 3 : p.crew || 1); i++) { g.beginPath(); g.arc((i - ((p.crew > 2 ? 3 : p.crew || 1) - 1) / 2) * r * 0.55, h * 0.12, Math.min(0.1, r * 0.22), 0, Math.PI * 2); g.fill(); }
        g.fillStyle = '#2a2d32'; g.fillRect(-rb, -H, 2 * rb, 0.06);
        break;
      case 'tank':
        if (p.surf) { g.beginPath(); g.ellipse(p.w / 2, 0, p.w / 2, h / 2, 0, 0, Math.PI * 2); g.fillStyle = shade(g, 0, p.w, 0, 0, p.res && p.res.MP ? '#d4d6d2' : '#ecece7'); g.fill(); outline(g); break; }
        if (p.shape === 'sphere') { g.beginPath(); g.arc(0, 0, r * 0.95, 0, Math.PI * 2); g.fillStyle = shade(g, -r, r, 0, 0, '#c3c7cc'); g.fill(); outline(g); break; }
        g.beginPath(); g.roundRect ? g.roundRect(-r, -H, 2 * r, h, p.shape === 'xenon' ? r * 0.4 : 0.02) : g.rect(-r, -H, 2 * r, h);
        g.fillStyle = shade(g, -r, r, 0, 0, p.foam ? '#d8742c' : p.foil || p.shape === 'cryo' ? '#d8a83c' : p.shape === 'trap' ? '#2a2d32' : p.shape === 'xenon' ? '#c3c7cc' : '#ecece7'); g.fill(); outline(g);
        if (!p.foam && !p.foil && !p.shape) { g.fillStyle = p.stripe || '#2b5ea8'; g.fillRect(-r, H - h * 0.1, 2 * r, Math.min(0.08, h * 0.04)); bands(g, r, -H, H, Math.max(2, Math.round(h * 1.5)), 'rgba(0,0,0,0.1)'); }
        if (p.shape === 'trap') { g.fillStyle = '#ff5ccf'; g.fillRect(-r, -0.03, 2 * r, 0.06); }
        break;
      case 'engine': {
        if (p.surf) { g.fillStyle = '#2a2d32'; g.fillRect(0, -h * 0.3, 0.07, h * 0.6); trap(g, 0.03, 0.09, -H, -H + h * 0.55); g.translate(0.13, 0); g.fillStyle = shade(g, -0.09, 0.09, 0, 0, '#3c3632'); g.fill(); outline(g); g.translate(-0.13, 0); break; }
        const mount = ['eng_ntr', 'eng_fusion', 'eng_am'].includes(p.id) ? h * 0.55 : p.id === 'eng_ion' ? h * 0.6 : h * 0.32;
        trap(g, r, r * 0.78, H - mount * 0.5, H); g.fillStyle = shade(g, -r, r, 0, 0, '#2a2d32'); g.fill(); outline(g);
        trap(g, r * 0.6, r * 0.45, H - mount, H - mount * 0.5); g.fillStyle = shade(g, -r, r, 0, 0, '#8c939b'); g.fill(); outline(g);
        if (p.id === 'eng_ntr') { g.fillStyle = '#e5e7ea'; g.fillRect(-r, H - mount * 0.9, r * 0.25, mount * 0.8); g.fillRect(r * 0.75, H - mount * 0.9, r * 0.25, mount * 0.8); }
        if (p.id === 'eng_fusion' || p.id === 'eng_am') { g.fillStyle = '#c3c7cc'; for (let i = 0; i < 3; i++) g.fillRect(-r * 0.9, H - mount * (0.25 + i * 0.25), r * 1.8, 0.2); }
        const cl = p.eng.cluster || 1, throat = r * (cl > 1 ? 0.13 : 0.25), exit = r * (cl > 1 ? 0.42 : p.eng.vac ? 0.95 : 0.8);
        const xs = cl > 1 ? [-r * 0.48, r * 0.48] : [0];
        for (const x of xs) {
          g.save(); g.translate(x, 0);
          g.beginPath(); g.moveTo(-throat, H - mount); g.quadraticCurveTo(-exit * 0.95, H - mount - (h - mount) * 0.4, -exit, -H); g.lineTo(exit, -H); g.quadraticCurveTo(exit * 0.95, H - mount - (h - mount) * 0.4, throat, H - mount); g.closePath();
          g.fillStyle = p.id === 'eng_ion' ? '#2a2d32' : shade(g, -exit, exit, 0, 0, '#4a423c'); g.fill(); outline(g);
          if (p.id === 'eng_ion') { g.fillStyle = '#5ab8ff'; g.fillRect(-exit * 0.9, -H, exit * 1.8, 0.03); }
          g.restore();
        }
        break;
      }
      case 'srb':
        g.beginPath(); g.rect(-r, -H + h * 0.08, 2 * r, h * 0.92); g.fillStyle = shade(g, -r, r, 0, 0, '#f0efe9'); g.fill(); outline(g);
        g.fillStyle = '#1d1d1d'; for (let i = 0; i < 2; i++) g.fillRect(-r + i * r, H - h * 0.1, r * 0.5, h * 0.1);
        g.fillStyle = '#b23a2a'; g.fillRect(-r, H - h * 0.16, 2 * r, 0.04);
        trap(g, r * 0.3, r * 0.62, -H, -H + h * 0.08); g.fillStyle = '#3c3632'; g.fill(); outline(g);
        break;
      case 'decoupler': case 'dock': case 'wheel': case 'battery': case 'fairing': case 'struct': case 'reactor': {
        if (p.surf) { g.fillStyle = shade(g, 0, p.w, 0, 0, '#2a2d32'); g.fillRect(0, -H, p.w, h); g.fillStyle = '#3ad17a'; g.fillRect(0, H - h * 0.3, p.w, h * 0.12); break; }
        g.beginPath(); g.rect(-r, -H, 2 * r, h);
        const col = { decoupler: '#2a2a2a', dock: '#8c939b', wheel: '#2a2d32', battery: '#2a2d32', fairing: '#2a2d32', struct: '#55595f', reactor: '#d4d6d2' }[p.type];
        g.fillStyle = shade(g, -r, r, 0, 0, col); g.fill(); outline(g);
        if (p.type === 'decoupler' || p.type === 'reactor') { g.save(); g.beginPath(); g.rect(-r, p.type === 'reactor' ? H * 0.3 : -H, 2 * r, p.type === 'reactor' ? h * 0.15 : h); g.clip(); g.fillStyle = '#f2c230'; for (let x = -r - h; x < r + h; x += 0.16) { g.beginPath(); g.moveTo(x, -H); g.lineTo(x + 0.08, -H); g.lineTo(x + 0.08 + h, H); g.lineTo(x + h, H); g.fill(); } g.restore(); }
        if (p.type === 'dock') { g.fillStyle = '#d4d6d2'; trap(g, r * 0.5, r * 0.8, 0, H); g.fill(); }
        if (p.type === 'fairing') { g.strokeStyle = 'rgba(255,255,255,0.5)'; g.setLineDash([0.06, 0.05]); g.lineWidth = 0.02; g.beginPath(); g.moveTo(-r, H); g.lineTo(-r * 1.05, H + 0.6); g.moveTo(r, H); g.lineTo(r * 1.05, H + 0.6); g.stroke(); g.setLineDash([]); }
        break;
      }
      case 'rdecoupler':
        g.fillStyle = '#2a2a2a'; g.fillRect(0, -H, p.w, h); g.fillStyle = '#f2c230'; for (let y = -H; y < H; y += 0.12) g.fillRect(0, y, p.w, 0.05);
        g.beginPath(); g.rect(0, -H, p.w, h); outline(g);
        break;
      case 'adapter': trap(g, r, rb, -H, H); g.fillStyle = shade(g, -rb, rb, 0, 0, '#ecece7'); g.fill(); outline(g); break;
      case 'nose': {
        g.beginPath(); g.moveTo(-rb, -H);
        for (let i = 0; i <= 16; i++) { const t = i / 16; g.lineTo(-rb * Math.cos(t * Math.PI / 2 * 0.96), -H + h * Math.sin(t * Math.PI / 2)); }
        for (let i = 16; i >= 0; i--) { const t = i / 16; g.lineTo(rb * Math.cos(t * Math.PI / 2 * 0.96), -H + h * Math.sin(t * Math.PI / 2)); }
        g.closePath(); g.fillStyle = shade(g, -rb, rb, 0, 0, '#ecece7'); g.fill(); outline(g); break;
      }
      case 'fin':
        g.beginPath(); g.moveTo(0, -H); g.lineTo(p.w, -H - h * 0.05); g.lineTo(p.w, -H + h * 0.3); g.lineTo(0, H); g.closePath();
        g.fillStyle = p.ctrl ? '#8c939b' : '#ecece7'; g.fill(); outline(g);
        g.fillStyle = '#2a2d32'; g.fillRect(0, -H + h * 0.05, p.w, h * 0.05);
        break;
      case 'rcs': g.fillStyle = '#d4d6d2'; g.fillRect(0, -H, 0.12, h); g.fillStyle = '#2a2d32'; g.fillRect(0.12, H - 0.06, 0.06, 0.04); g.fillRect(0.12, -H + 0.02, 0.06, 0.04); g.beginPath(); g.rect(0, -H, 0.12, h); outline(g); break;
      case 'solar': g.fillStyle = '#2a2d32'; g.fillRect(0, -h * 0.2, 0.08, h * 0.4); g.fillStyle = '#1b3a8a'; g.fillRect(0.08, -H, p.deploy ? 0.08 : 0.04, h); g.strokeStyle = '#9fb4e0'; g.lineWidth = 0.01; g.strokeRect(0.08, -H, p.deploy ? 0.08 : 0.04, h); break;
      case 'radiator': g.fillStyle = '#e5e7ea'; g.fillRect(0, -H, Math.max(0.06, p.w), h); g.beginPath(); g.rect(0, -H, Math.max(0.06, p.w), h); outline(g); break;
      case 'rtg': case 'fuelcell': g.fillStyle = shade(g, 0, p.w, 0, 0, p.type === 'rtg' ? '#2a2d32' : '#d4d6d2'); g.fillRect(0, -H, p.w, h); if (p.type === 'rtg') { g.fillStyle = '#55595f'; for (let y = -H + 0.05; y < H; y += 0.1) g.fillRect(0, y, p.w, 0.03); } break;
      case 'antenna':
        if (p.id === 'ant_whip') { g.fillStyle = '#2a2d32'; g.fillRect(0, -H, 0.06, 0.08); g.strokeStyle = '#c3c7cc'; g.lineWidth = 0.02; g.beginPath(); g.moveTo(0.03, -H); g.lineTo(0.03, H); g.stroke(); }
        else { g.fillStyle = '#8c939b'; g.fillRect(0, -0.06, 0.12, 0.12); g.beginPath(); g.moveTo(0.12, -h / 2); g.quadraticCurveTo(0.12 + p.w * 0.45, 0, 0.12, h / 2); g.lineTo(0.15, h / 2); g.quadraticCurveTo(0.15 + p.w * 0.5, 0, 0.15, -h / 2); g.closePath(); g.fillStyle = '#e9e9e4'; g.fill(); outline(g); }
        break;
      case 'science': {
        if (!p.surf) { g.beginPath(); g.rect(-r, -H, 2 * r, h); g.fillStyle = shade(g, -r, r, 0, 0, '#d4d6d2'); g.fill(); outline(g); g.strokeStyle = '#8c939b'; g.lineWidth = 0.02; g.strokeRect(-r * 0.7, -H * 0.7, r * 1.4, h * 0.7); break; }
        const w = Math.min(p.w, 0.2);
        g.fillStyle = shade(g, 0, w, 0, 0, '#d4d6d2'); g.fillRect(0, -h * 0.3, w, h * 0.6); g.beginPath(); g.rect(0, -h * 0.3, w, h * 0.6); outline(g);
        g.fillStyle = '#2a2d32';
        const ex = p.exp;
        if (ex === 'photo' || ex === 'spec') g.fillRect(w, -0.05, p.w - w, 0.1);
        if (ex === 'mag') { g.fillRect(w, -0.01, p.w - w, 0.02); g.beginPath(); g.arc(p.w, 0, 0.04, 0, 7); g.fill(); }
        if (ex === 'drill') g.fillRect(w * 0.8, -H, 0.04, h * 0.6);
        if (ex === 'temp' || ex === 'rad') g.fillRect(w * 0.5, -H, 0.02, h);
        break;
      }
      case 'chute':
        if (p.surf) { g.fillStyle = shade(g, 0, 0.24, 0, 0, '#d0582a'); g.fillRect(0, -H, 0.24, h); g.beginPath(); g.rect(0, -H, 0.24, h); outline(g); break; }
        trap(g, r * 0.7, rb, -H, H * 0.7); g.fillStyle = shade(g, -rb, rb, 0, 0, '#d0582a'); g.fill(); outline(g);
        g.fillStyle = '#2a2d32'; g.fillRect(-r * 0.6, H * 0.7, r * 1.2, h * 0.15);
        break;
      case 'shield':
        g.beginPath(); g.moveTo(-r, H); g.lineTo(r, H); g.lineTo(r, -H + 0.04); g.quadraticCurveTo(0, -H - 0.08, -r, -H + 0.04); g.closePath();
        g.fillStyle = shade(g, -r, r, 0, 0, '#6b4a2f'); g.fill(); outline(g); break;
      case 'leg':
        g.fillStyle = '#8c939b'; g.fillRect(0, h * 0.1, 0.08, h * 0.35);
        g.strokeStyle = '#c3c7cc'; g.lineWidth = 0.05; g.beginPath(); g.moveTo(0.05, h * 0.4); g.lineTo(h * 0.35, -H); g.stroke();
        g.fillStyle = '#2a2d32'; g.fillRect(h * 0.35 - 0.12, -H - 0.02, 0.24, 0.05);
        break;
      default: g.fillStyle = '#888'; g.fillRect(-r, -H, 2 * r, h);
    }
  }
  function extent(p) {
    if (p.surf) { const w = p.type === 'leg' ? p.h * 0.5 : Math.max(p.w || 0.2, 0.2); return { x0: -0.05, x1: w + 0.1, y0: -p.h / 2 - 0.1, y1: p.h / 2 + 0.1 }; }
    const r = Math.max(p.r, p.rb) + (p.id === 'probe_pebble' ? 0.25 : 0.05);
    return { x0: -r, x1: r, y0: -p.h / 2 - 0.08, y1: p.h / 2 + (p.id === 'probe_pebble' ? 0.3 : p.type === 'fairing' ? 0.6 : 0.05) };
  }
  function get(pid) {
    if (cache[pid]) return cache[pid];
    const p = PARTS[pid];
    const e = extent(p);
    const k = Math.min(PX, 900 / Math.max(e.x1 - e.x0, e.y1 - e.y0));
    const W = Math.ceil((e.x1 - e.x0) * k) + 2, H = Math.ceil((e.y1 - e.y0) * k) + 2;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.translate(1 - e.x0 * k, 1 + e.y1 * k); g.scale(k, -k);
    draw(g, p);
    // mirrored copy for the left side
    const m = document.createElement('canvas'); m.width = W; m.height = H;
    const mg = m.getContext('2d'); mg.translate(W, 0); mg.scale(-1, 1); mg.drawImage(c, 0, 0);
    return (cache[pid] = { c, m, k, e, W, H });
  }
  // icon for the catalogue (fits a square)
  function icon(pid, size) {
    const s = get(pid);
    const c = document.createElement('canvas'); c.width = size; c.height = size;
    const g = c.getContext('2d');
    const sc = Math.min((size - 6) / s.W, (size - 6) / s.H);
    g.drawImage(s.c, (size - s.W * sc) / 2, (size - s.H * sc) / 2, s.W * sc, s.H * sc);
    return c;
  }
  return { get, icon };
})();
