(() => {
  const { h, money, face, gcard, catalog, platforms, onCurrency, api } = GL;
  const view = document.getElementById('view');
  const sku = new URLSearchParams(location.search).get('sku');
  const f = { email: '', phone: '', method: 'ecocash', region: false, busy: false };
  let plat, item, els = {};

  const digits = () => f.phone.replace(/\D/g, '').replace(/^0/, '');
  const valid = () => /\S+@\S+\.\S+/.test(f.email) && (f.method !== 'ecocash' || digits().length === 9) && (!plat.needsRegion || f.region);
  const eco = () => f.method === 'ecocash';

  function sync() {
    els.pay.disabled = !valid() || f.busy;
    els.pay.textContent = f.busy ? (eco() ? 'Sending prompt...' : 'Opening Paynow...') : `Pay ${money(item.priceCents)}`;
    els.ecoField.classList.toggle('hidden', !eco());
  }

  async function submit(e) {
    e.preventDefault();
    if (!valid() || f.busy) return;
    f.busy = true; els.err.textContent = ''; sync();
    try {
      const body = { sku: item.sku, email: f.email.trim(), method: f.method, regionConfirmed: plat.needsRegion ? f.region : undefined };
      if (eco()) body.phone = '+263' + digits();
      const { token } = await api('/api/orders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      location.href = `/order.html?t=${encodeURIComponent(token)}`;
    } catch (ex) { els.err.textContent = ex.message; f.busy = false; sync(); }
  }

  function build() {
    document.getElementById('back').href = `/product.html?p=${plat.id}&v=${item.sku}`;
    const mini = gcard(plat, '', false); mini.classList.add('mini'); mini.replaceChildren();
    const email = h('input', { id: 'email', type: 'email', autocomplete: 'email', placeholder: 'you@example.com', required: true,
      oninput: e => { f.email = e.target.value; sync(); } });
    const phone = h('input', { id: 'phone', type: 'tel', inputmode: 'tel', autocomplete: 'tel-national', placeholder: '77 123 4567',
      oninput: e => { f.phone = e.target.value; sync(); } });
    const method = (k, label, sub) => h('label', { class: 'opt' },
      h('input', { type: 'radio', name: 'method', value: k, checked: f.method === k, onchange: () => { f.method = k; sync(); } }),
      h('b', { text: label }), h('small', { text: sub }));
    els.err = h('p', { class: 'error', role: 'alert' });
    els.pay = h('button', { class: 'btn', type: 'submit', disabled: true });
    els.ecoField = h('label', { class: 'field' }, h('span', { text: 'EcoCash number' }),
      h('div', { class: 'phone' }, h('span', { text: '+263' }), phone),
      h('small', { text: "You'll approve the payment with your EcoCash PIN." }));
    els.total = h('b'); els.sub = h('small');

    const regionBox = plat.needsRegion ? h('label', { class: 'chk' },
      h('input', { type: 'checkbox', onchange: e => { f.region = e.target.checked; sync(); } }),
      h('span', {}, h('b', { text: plat.platform === 'psn' ? 'My PSN account is set to South Africa' : `My account region is ${plat.region}` }),
        h('small', {}, 'Not sure? ', h('a', { href: '/help/#region', text: 'Check your region' })))) : null;

    const form = h('form', { class: 'form', novalidate: true, onsubmit: submit },
      h('h2', { text: 'Checkout' }),
      h('label', { class: 'field' }, h('span', { text: 'Email' }), email, h('small', { text: 'We send your code and order link here.' })),
      h('fieldset', { class: 'methods' }, h('legend', { class: 'fieldset-label', text: 'Pay with' }),
        method('ecocash', 'EcoCash', 'Prompt on your phone'), method('card', 'Visa / Mastercard', 'Paynow secure page')),
      els.ecoField, regionBox,
      h('div', { class: 'turnstile', 'aria-hidden': 'true', text: 'Turnstile widget (live mode)' }),
      els.pay, els.err,
      h('p', { class: 'fine', text: 'Codes are digital and non-refundable once delivered. Payments processed by Paynow.' }));

    const summary = h('aside', { class: 'summary', 'aria-label': 'Order summary' },
      h('div', { class: 'who' }, mini, h('div', {}, h('b', { text: item.name }), els.sub)),
      h('div', { class: 'tot' }, h('span', { class: 'muted', text: 'Total' }), els.total),
      h('small', { class: 'muted', text: 'Price locked for 15 minutes.' }));

    view.replaceChildren(form, summary);
    paint();
  }
  function paint() { els.total.textContent = money(item.priceCents); els.sub.textContent = `${face(item.faceValue, item.faceCurrency)} · ${item.region}`; sync(); }

  catalog().then(d => {
    item = d.products.find(p => p.sku === sku);
    if (!item) { view.replaceChildren(h('p', { class: 'muted' }, 'Card not found. ', h('a', { href: '/', text: 'Back to the store' }))); return; }
    plat = platforms(d.products).find(p => p.id === item.platform);
    build(); onCurrency(paint);
  }).catch(() => { view.replaceChildren(h('p', { class: 'muted', text: 'Could not load checkout. Please refresh.' })); });
})();
