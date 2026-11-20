'use strict';
// ---------- Shared helpers: math, noise, formatting ----------
const V3 = THREE.Vector3, Q4 = THREE.Quaternion;
if (THREE.ColorManagement) THREE.ColorManagement.legacyMode = false; // hex colours are sRGB
const DEG = Math.PI / 180;
const G0 = 9.80665;
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// rotate vector about +Y by angle (same convention as three.js rotation.y)
function rotY(v, a, out) {
  const c = Math.cos(a), s = Math.sin(a), x = v.x, z = v.z;
  out = out || new V3();
  out.set(x * c + z * s, v.y, -x * s + z * c);
  return out;
}
function latLonToDir(lat, lon, out) {
  out = out || new V3();
  const cl = Math.cos(lat);
  return out.set(cl * Math.cos(lon), Math.sin(lat), -cl * Math.sin(lon));
}
function dirToLatLon(d) {
  const lat = Math.asin(clamp(d.y / d.length(), -1, 1));
  const lon = Math.atan2(-d.z, d.x);
  return { lat, lon };
}

// ---------- hashing ----------
function hash3i(x, y, z, s) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 2147483647) ^ Math.imul(s | 0, 144269);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function strHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------- 3D simplex noise (Gustavson) ----------
const Noise = (function () {
  const grad3 = new Float32Array([1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1]);
  const perm = new Uint8Array(512), permMod12 = new Uint8Array(512);
  const r = mulberry(1337), p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
  for (let i = 0; i < 512; i++) { perm[i] = p[i & 255]; permMod12[i] = perm[i] % 12; }
  const F3 = 1 / 3, G3 = 1 / 6;
  function n3(xin, yin, zin) {
    let n0, n1, n2, n3;
    const s = (xin + yin + zin) * F3;
    const i = Math.floor(xin + s), j = Math.floor(yin + s), k = Math.floor(zin + s);
    const t = (i + j + k) * G3;
    const x0 = xin - (i - t), y0 = yin - (j - t), z0 = zin - (k - t);
    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
      else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
    } else {
      if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
      else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
      else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    }
    const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3;
    const x3 = x0 - 1 + 3 * G3, y3 = y0 - 1 + 3 * G3, z3 = z0 - 1 + 3 * G3;
    const ii = i & 255, jj = j & 255, kk = k & 255;
    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 < 0) n0 = 0; else { const g = permMod12[ii + perm[jj + perm[kk]]] * 3; t0 *= t0; n0 = t0 * t0 * (grad3[g] * x0 + grad3[g + 1] * y0 + grad3[g + 2] * z0); }
    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 < 0) n1 = 0; else { const g = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3; t1 *= t1; n1 = t1 * t1 * (grad3[g] * x1 + grad3[g + 1] * y1 + grad3[g + 2] * z1); }
    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 < 0) n2 = 0; else { const g = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3; t2 *= t2; n2 = t2 * t2 * (grad3[g] * x2 + grad3[g + 1] * y2 + grad3[g + 2] * z2); }
    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 < 0) n3 = 0; else { const g = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3; t3 *= t3; n3 = t3 * t3 * (grad3[g] * x3 + grad3[g + 1] * y3 + grad3[g + 2] * z3); }
    return 32 * (n0 + n1 + n2 + n3);
  }
  function fbm(x, y, z, oct, lac, gain) {
    let a = 1, f = 1, s = 0, n = 0;
    for (let i = 0; i < oct; i++) { s += a * n3(x * f, y * f, z * f); n += a; a *= gain; f *= lac; }
    return s / n;
  }
  function ridged(x, y, z, oct) {
    let a = 1, f = 1, s = 0, n = 0;
    for (let i = 0; i < oct; i++) { const v = 1 - Math.abs(n3(x * f, y * f, z * f)); s += a * v * v; n += a; a *= 0.5; f *= 2.03; }
    return s / n;
  }
  // crater field: returns height contribution roughly in [-1, 0.35]
  function craters(x, y, z, seed, density) {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    let h = 0;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const cx = ix + dx, cy = iy + dy, cz = iz + dz;
      if (hash3i(cx, cy, cz, seed + 7) > density) continue;
      const fx = cx + hash3i(cx, cy, cz, seed), fy = cy + hash3i(cx, cy, cz, seed + 1), fz = cz + hash3i(cx, cy, cz, seed + 2);
      const rr = 0.18 + 0.32 * hash3i(cx, cy, cz, seed + 3);
      const ddx = x - fx, ddy = y - fy, ddz = z - fz;
      const d = Math.sqrt(ddx * ddx + ddy * ddy + ddz * ddz) / rr;
      if (d < 1) h += (d * d - 1) * 0.9 + 0.3 * d * d * d * d;
      else if (d < 1.45) { const q = (d - 1) / 0.45; h += 0.3 * (1 - q) * (1 - q); }
    }
    return h;
  }
  return { n3, fbm, ridged, craters };
})();

// ---------- formatting ----------
function fmtInt(n) { return Math.round(n).toLocaleString('en-US'); }
function fmtNum(n, d = 1) { return Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); }
function fmtDist(m) {
  const a = Math.abs(m);
  if (!isFinite(m)) return '∞';
  if (a < 10000) return fmtInt(m) + ' m';
  if (a < 1e9) return fmtInt(m / 1000) + ' km';
  return fmtNum(m / 1e9, 2) + ' M km';
}
function fmtSpeed(v) { return Math.abs(v) < 10000 ? fmtNum(v, 1) + ' m/s' : fmtNum(v / 1000, 2) + ' km/s'; }
function fmtTime(s, short) {
  if (!isFinite(s)) return '—';
  const neg = s < 0; s = Math.abs(s);
  const y = Math.floor(s / 31536000); s -= y * 31536000;
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  const parts = [];
  if (y) parts.push(y + 'y');
  if (d || y) parts.push(d + 'd');
  if (!y) { if (h || d) parts.push(h + 'h'); if (!d) { parts.push(m + 'm'); if (!h) parts.push(Math.floor(s) + 's'); } }
  return (neg ? '-' : '') + parts.slice(0, short ? 2 : 3).join(' ');
}
function fmtUT(t) {
  const y = Math.floor(t / 31536000) + 1, d = Math.floor((t % 31536000) / 86400) + 1;
  const h = Math.floor((t % 86400) / 3600), m = Math.floor((t % 3600) / 60), s = Math.floor(t % 60);
  return `Y${y} D${d} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
function fmtMass(t) { return t < 1 ? fmtInt(t * 1000) + ' kg' : fmtNum(t, 2) + ' t'; }

// ---------- toasts ----------
function toast(msg, kind, ms) {
  const box = $('#toasts'); if (!box) return;
  const t = el('div', 'toast ' + (kind || ''), msg);
  box.appendChild(t);
  setTimeout(() => t.classList.add('out'), ms || 4200);
  setTimeout(() => t.remove(), (ms || 4200) + 600);
  while (box.children.length > 4) box.firstChild.remove();
}
