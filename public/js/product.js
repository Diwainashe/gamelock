(() => {
  const { h, money, face, gcard, tilt, catalog, platforms, onCurrency } = GL;
  const view = document.getElementById('view');
  const q = new URLSearchParams(location.search);
  let plat, selected;

  function render() {
    const p = plat, it = selected;
    const card = gcard(p, face(it.faceValue, it.faceCurrency), true);
    tilt(card);
    const note = h('div', { class: 'note' },
      h('b', { text: p.needsRegion ? `Only works on accounts set to ${p.region}.` : 'Works on any Steam account.' }),
      p.needsRegion ? h('span', { class: 'muted' }, 'A code for the wrong region will not redeem. ',
        h('a', { href: '/help/#region', text: 'Check my account region' })) : null);

    view.replaceChildren(
      card,
      h('div', { class: 'stack' },
        h('div', { class: 'stack' },
          h('h2', { text: p.name }),
          h('div', { class: 'muted', text: `Region: ${p.region} · Digital code` })),
        h('fieldset', { class: 'denoms' },
          h('legend', { text: 'Choose a value' }),
          p.items.map(x => h('button', {
            type: 'button', class: 'opt', 'aria-pressed': String(x.sku === it.sku),
            onclick: () => { selected = x; history.replaceState(null, '', `?p=${p.id}&v=${x.sku}`); render(); document.querySelector(`[aria-pressed=true]`)?.focus(); },
          }, h('b', { text: face(x.faceValue, x.faceCurrency) }), h('small', { text: money(x.priceCents) })))),
        note,
        h('div', { class: 'pay-row' },
          h('div', { class: 'price' }, h('small', { text: 'You pay' }), h('b', { text: money(it.priceCents) })),
          h('a', { class: 'btn', href: `/checkout.html?sku=${encodeURIComponent(it.sku)}`, text: 'Continue' }))));
  }

  catalog().then(d => {
    plat = platforms(d.products).find(p => p.id === q.get('p'));
    if (!plat) { view.replaceChildren(h('p', { class: 'muted' }, 'Card not found. ', h('a', { href: '/', text: 'Back to the store' }))); return; }
    document.title = `${plat.platformName} gift card - GameLock`;
    selected = plat.items.find(x => x.sku === q.get('v')) || plat.items[Math.min(1, plat.items.length - 1)];
    render(); onCurrency(render);
  }).catch(() => { view.replaceChildren(h('p', { class: 'muted', text: 'Could not load this card. Please refresh.' })); });
})();
