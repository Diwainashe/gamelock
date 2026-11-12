(() => {
  const { h, money, face, gcard, tilt, catalog, platforms, onCurrency } = GL;
  const grid = document.getElementById('grid');
  let plats = [];

  function render() {
    grid.replaceChildren(...plats.map((p, i) => {
      const first = p.items[0], min = Math.min(...p.items.map(x => x.priceCents));
      const card = gcard(p, face(first.faceValue, first.faceCurrency) + '+');
      tilt(card);
      return h('a', { class: 'pcard rise', href: `/product.html?p=${encodeURIComponent(p.id)}`, 'aria-label': `${p.platformName}, from ${money(min)}` },
        card,
        h('div', { class: 'meta' }, h('b', { text: p.platformName }), h('span', { text: `from ${money(min)}` })));
    }));
  }

  catalog().then(d => { plats = platforms(d.products); render(); onCurrency(render); })
    .catch(() => { grid.replaceChildren(h('p', { class: 'muted', text: 'Could not load cards. Please refresh.' })); });
})();
