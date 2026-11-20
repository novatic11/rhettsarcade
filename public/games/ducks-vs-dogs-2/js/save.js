/* Ducks vs. Dogs 2 — automatic save (own storage key, never touches the original game). */
(function (D) {
  'use strict';

  const PREF_KEY = 'ducks-vs-dogs-2-settings-v1';

  function defaults() {
    return {
      v: 2,
      coins: 0,
      owned: ['bread', 'puddle'],
      newDucks: {},            // duck ids not yet viewed in the loadout
      cleared: {},             // levelId -> { clears, obj: [bool, bool] }
      items: {},               // shop item id -> true
      upgrades: {},            // duckId -> 'A' | 'B'  (present = purchased)
      loadout: [],             // last chosen team (duck ids)
      settings: { music: 0.45, sfx: 0.8, muted: false, gfx: defaultGfx(), speed: 1 },
      endless: { best: 0, runs: 0, bestCoins: 0, arena: 1, byArena: {} },
      life: { wins: 0, kills: 0, qp: 0, snacks: 0, bonks: 0 },
      snacks: {},              // snack id -> count owned
      snackSel: [],            // snacks chosen for the next level
      starsSpent: 0,
      trophies: {},            // trophy id -> 'got' | 'claimed'
      updateNote: null,
      shopsSeen: {},           // shop id -> intro seen
      seenDogs: {},
      hat: 'none',
      tutDone: {},
      lastWorld: 1,
      finished: false
    };
  }

  function defaultGfx() {
    try {
      const ua = navigator.userAgent || '';
      const lowMem = navigator.deviceMemory && navigator.deviceMemory <= 4;
      if (/CrOS|Android|iPhone|iPad/i.test(ua) || lowMem) return 'low';
    } catch (e) { /* ignore */ }
    return 'high';
  }

  const S = {
    data: defaults(),
    storageOk: true,

    load() {
      try {
        const raw = localStorage.getItem(D.SAVE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const base = defaults();
          this.data = Object.assign(base, parsed);
          this.data.settings = Object.assign(defaults().settings, parsed.settings || {});
          this.data.endless = Object.assign(defaults().endless, parsed.endless || {});
          this.data.life = Object.assign(defaults().life, parsed.life || {});
        } else {
          const prefs = JSON.parse(localStorage.getItem(PREF_KEY) || 'null');
          if (prefs && typeof prefs === 'object' && !Array.isArray(prefs)) {
            this.data.settings = Object.assign(defaults().settings, prefs);
          }
        }
      } catch (e) {
        this.storageOk = false;
        this.data = defaults();
      }
      this.sanitize();
    },

    sanitize() {
      const d = this.data;
      d.owned = (d.owned || []).filter(id => D.DUCKS[id]);
      ['bread', 'puddle'].forEach(id => { if (!d.owned.includes(id)) d.owned.push(id); });
      d.loadout = (d.loadout || []).filter(id => d.owned.includes(id)).slice(0, this.capacity());
      if (!Number.isFinite(d.coins) || d.coins < 0) d.coins = 0;
      // expansion: levels you already beat now award new ducks
      const granted = [];
      Object.keys(d.cleared).forEach(id => { const l = D.LEVEL[id]; if (l && l.reward && l.reward.duck && this.isCleared(id) && this.grantDuck(l.reward.duck)) granted.push(l.reward.duck); });
      if (granted.length) d.updateNote = granted;
      d.v = 2;
      d.snackSel = (d.snackSel || []).filter(id => D.SNACKS && D.SNACKS[id] && (d.snacks[id] || 0) > 0).slice(0, this.snackSlots());
    },

    save() {
      try {
        localStorage.setItem(D.SAVE_KEY, JSON.stringify(this.data));
        try { localStorage.setItem(PREF_KEY, JSON.stringify(this.data.settings)); } catch (e) { /* optional preferences mirror */ }
        this.storageOk = true;
      }
      catch (e) { this.storageOk = false; }
    },

    reset() {
      const keepSettings = this.data.settings;
      this.data = defaults();
      this.data.settings = keepSettings;
      this.save();
    },

    // ---- queries
    owns(duckId) { return this.data.owned.includes(duckId); },
    hasItem(id) { return !!this.data.items[id]; },
    isCleared(id) { return !!(this.data.cleared[id] && this.data.cleared[id].clears > 0); },
    capacity() {
      let c = D.BASE_SLOTS;
      ['slot6', 'slot7', 'slot8'].forEach(s => { if (this.data.items[s]) c++; });
      return Math.max(D.BASE_SLOTS, Math.min(D.MAX_SLOTS, c)); // hard cap of 8
    },
    upgrade(duckId) { return this.data.upgrades[duckId] || null; },

    isUnlocked(levelId) {
      const l = D.LEVEL[levelId];
      if (!l) return false;
      if (l.bonus) return this.isCleared(l.after);
      const idx = D.CAMPAIGN.indexOf(levelId);
      if (idx <= 0) return true;
      return this.isCleared(D.CAMPAIGN[idx - 1]);
    },
    worldUnlocked(w) { return w === 1 || this.isCleared(w - 1 + '-8'); },
    shopUnlocked(shopId) { return this.isCleared(D.SHOPS[shopId].unlock); },
    endlessUnlocked() { return this.isCleared('2-8'); },
    rumbleUnlocked() { return this.isCleared('6-8'); },
    snackSlots() { return this.data.items && this.data.items.lunchbox ? 2 : 1; },
    starsEarned() { let n = 0; Object.values(this.data.cleared).forEach(r => (r.obj || []).forEach(o => { if (o) n++; })); return n; },
    stars() { return Math.max(0, this.starsEarned() - (this.data.starsSpent || 0)); },
    // award newly earned trophies; returns the list of new ones
    checkTrophies() {
      const out = [];
      (D.TROPHIES || []).forEach(t => { if (!this.data.trophies[t.id] && t.check(this)) { this.data.trophies[t.id] = 'got'; out.push(t); } });
      return out;
    },

    // ---- mutations
    addCoins(n) { this.data.coins = Math.max(0, Math.round(this.data.coins + n)); },
    grantDuck(id) {
      if (!D.DUCKS[id] || this.owns(id)) return false;
      this.data.owned.push(id);
      this.data.newDucks[id] = true;
      return true;
    }
  };

  D.Save = S;
})(window.DVD);
