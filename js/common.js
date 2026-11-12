// Shared helpers: DOM builder, money formatting, header controls, API, card art. No inline styles (CSP).
(() => {
  const store = {
    get: (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
  };

  /** Tiny element builder. Text goes in via textContent only, so nothing is ever parsed as HTML. */
  function h(tag, props = {}, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) n.append(c);
    return n;
  }

  let zwgRate = null;
  const state = { cur: store.get('gl-cur', 'USD') === 'ZWG' ? 'ZWG' : 'USD' };
  const money = cents => state.cur === 'ZWG' && zwgRate
    ? 'ZWG ' + ((cents / 100) * zwgRate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '$' + (cents / 100).toFixed(2);
  const face = (v, cur) => (cur === 'ZAR' ? 'R' : '$') + v;

  // Brand colours per platform, as plain RGB (older Android WebViews lack oklch/color-mix).
  const ART = {
    psn: { a: '#3b6cff', b: '#9a4dff', edge: '111,141,255' },
    xbox: { a: '#2fcf5a', b: '#17b4d6', edge: '88,224,127' },
    steam: { a: '#4a90c8', b: '#8a6fe0', edge: '120,170,215' },
    nintendo: { a: '#ff4d5a', b: '#d9b43a', edge: '255,110,120' },
  };
  function art(node, platform) {
    const c = ART[platform] || ART.psn;
    node.style.setProperty('--art-a', c.a);
    node.style.setProperty('--art-b', c.b);
    node.style.setProperty('--art-edge', c.edge);
    return node;
  }
  function gcard(p, big, large = false) {
    const card = h('div', { class: 'gcard' + (large ? ' lg' : '') },
      h('div', { class: 'gcard-in' },
        h('div', { class: 'gcard-top' }, h('span', { text: p.platformName }), h('b', { text: p.regionShort })),
        h('div', { class: 'gcard-num', text: big })),
      h('i', { class: 'shine' }));
    return art(card, p.platform);
  }
  /** Hover tilt, pointer devices only, skipped for reduced motion. */
  function tilt(card) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    card.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      card.style.transform = `perspective(900px) rotateX(${(-y * 10).toFixed(2)}deg) rotateY(${(x * 12).toFixed(2)}deg) translateY(-4px)`;
    });
    card.addEventListener('pointerleave', () => { card.style.transform = 'none'; });
  }

  let catalogP;
  function catalog() {
    catalogP ??= GL_API('/api/catalog').then(d => { zwgRate = d.zwgPerUsd; return d; });
    return catalogP;
  }
  /** Group flat product rows into platforms, preserving catalogue order. */
  function platforms(products) {
    const m = new Map();
    for (const p of products) {
      if (!m.has(p.platform)) m.set(p.platform, { id: p.platform, platformName: p.platformName, name: p.name, region: p.region, regionShort: p.regionShort, needsRegion: p.needsRegion, platform: p.platform, items: [] });
      m.get(p.platform).items.push(p);
    }
    return [...m.values()];
  }

  const listeners = [];
  const onCurrency = fn => listeners.push(fn);

  function wireHeader() {
    document.querySelectorAll('[data-cur]').forEach(b => {
      const sync = () => b.setAttribute('aria-pressed', String(b.dataset.cur === state.cur));
      sync();
      b.addEventListener('click', () => {
        state.cur = b.dataset.cur; store.set('gl-cur', state.cur);
        document.querySelectorAll('[data-cur]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.cur === state.cur)));
        listeners.forEach(fn => fn());
      });
    });
    const t = document.getElementById('theme');
    t?.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      document.documentElement.dataset.theme = next; store.set('gl-theme', next);
    });
  }

  window.GL = { h, money, face, gcard, tilt, catalog, platforms, onCurrency, api: GL_API, state };
  document.addEventListener('DOMContentLoaded', wireHeader);
})();
