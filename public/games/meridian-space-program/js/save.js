'use strict';
// ---------- Persistent program state (localStorage) ----------
const CREW_NAMES = ['Ada Okonkwo', 'Rui Tanaka', 'Sol Marín', 'Ilse Varga', 'Kofi Mensah', 'Noor Haddad', 'Mateo Silva', 'Lin Zhao'];
const Save = {
  KEY: 'meridian_space_program_v1',
  QKEY: 'meridian_space_program_quick_v1',
  PREFKEY: 'meridian_space_program_settings_v1',
  prog: null,
  newProgram() {
    return {
      version: 1, science: 0, totalScience: 0, time: 0,
      tech: { start: true },
      missions: { active: {}, done: {} },
      subjects: {},
      designs: {},
      vessels: [],
      activeVessel: null,
      crew: CREW_NAMES.map(n => ({ name: n, status: 'ready', flights: 0, evas: 0 })),
      flags: [],
      tutorial: {},
      settings: { quality: 'auto', sfx: 0.8, music: 0.45, hints: true, sens: 1 },
      lastDesign: null,
      stats: { launches: 0, recovered: 0, lost: 0 },
      nextVesselId: 1,
    };
  },
  load() {
    let p = null;
    try { const s = localStorage.getItem(this.KEY); if (s) p = JSON.parse(s); } catch (e) { p = null; }
    const def = this.newProgram();
    if (!p || p.version !== 1) { try { const prefs=JSON.parse(localStorage.getItem(this.PREFKEY)||'null'); if(prefs&&typeof prefs==='object') for(const k in def.settings) if(prefs[k]!==undefined)def.settings[k]=prefs[k]; } catch {} }
    if (!p || p.version !== 1) p = def;
    for (const k in def) if (p[k] === undefined) p[k] = def[k];
    for (const k in def.settings) if (p.settings[k] === undefined) p.settings[k] = def.settings[k];
    this.prog = p;
    return p;
  },
  save() {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.prog)); try {localStorage.setItem(this.PREFKEY,JSON.stringify(this.prog.settings));} catch {} return true; }
    catch (e) { toast('Could not save: browser storage is full or blocked.', 'bad'); return false; }
  },
  reset() { this.prog = this.newProgram(); this.save(); },
  quickSave(snapshot) { try { localStorage.setItem(this.QKEY, JSON.stringify(snapshot)); return true; } catch (e) { return false; } },
  quickLoad() { try { const s = localStorage.getItem(this.QKEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } },
  hasTech(id) { return !!this.prog.tech[id]; },
  partUnlocked(pid) { const p = PARTS[pid]; return p && this.hasTech(p.tech); },
  freeCrew(n) { return this.prog.crew.filter(c => c.status === 'ready').slice(0, n); },
};
