(() => {
  const { h, money, face, api, state } = GL;
  const root = document.getElementById('order');
  const token = new URLSearchParams(location.search).get('t');
  const POOL = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let timer = null, shownCode = null, scramble = null;

  const TEXT = o => {
    const eco = o.method === 'ecocash';
    return {
      created: null,
      awaiting_payment: [eco ? 'Check your phone and enter your PIN' : 'Finish paying on the Paynow page',
        eco ? `We sent an EcoCash prompt to ${o.phoneHint}. This page updates on its own, so you can close it and reopen the link later.`
          : 'Complete the card payment in the Paynow window. This page updates when it goes through.'],
      paid: ['Payment received, getting your code', 'This usually takes a few seconds.'],
      fulfilling: ['Payment received, getting your code', 'This usually takes a few seconds.'],
      fulfilment_unknown: ['We are on it', 'Your payment is safe. Your code is taking longer than usual. Keep this page and quote your reference if you contact us.'],
      complete: ['Here is your code', 'Redeem it on your console or the app.'],
      expired: ['This order expired', 'No payment arrived within 15 minutes. If you did pay, your code will still appear on this page.'],
      failed: ['Something went wrong', `Your reference is ${o.reference}. Quote it when you contact us and we will send your code or refund you.`],
    };
  };
  TEXT.fallback = ['Loading your order...', ''];

  const stepIdx = s => ({ created: 0, awaiting_payment: 0, paid: 1, fulfilling: 1, fulfilment_unknown: 1, complete: 3 })[s];

  /** Brief "decoding" reveal for the code; skipped for reduced motion. */
  function reveal(el, target) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = target; return; }
    let i = 0; clearInterval(scramble);
    scramble = setInterval(() => {
      i += 0.4;
      el.textContent = [...target].map((ch, k) => ch === '-' ? '-' : k < i ? ch : POOL[Math.floor(Math.random() * POOL.length)]).join('');
      if (i >= target.length) { clearInterval(scramble); el.textContent = target; }
    }, 40);
  }

  function render(o) {
    const [title, sub] = TEXT(o)[o.status] || TEXT.fallback;
    const kids = [];
    kids.push(h('div', { class: 'ref' }, h('span', { text: `Order ${o.reference}` }), h('span', { text: `${o.product} · ${face(o.faceValue, o.faceCurrency)}` })));

    const pending = ['created', 'awaiting_payment', 'paid', 'fulfilling', 'fulfilment_unknown'].includes(o.status);
    if (['created', 'awaiting_payment', 'paid', 'fulfilling'].includes(o.status)) {
      kids.push(h('div', { class: 'pulse', 'aria-hidden': 'true' }, h('i'), h('i'), h('div', { class: 'phone-ico' })));
    }
    kids.push(h('div', { class: 'stack' }, h('h2', { text: title }), h('p', { class: 'lead', text: sub })));

    if (pending || o.status === 'complete') {
      const idx = stepIdx(o.status), eco = o.method === 'ecocash';
      const labels = [eco ? 'Approve on phone' : 'Pay on Paynow', 'Payment received', 'Code delivered'];
      kids.push(h('div', {},
        h('div', { class: `bar w${Math.min(idx, 3) === 3 ? 2 : idx}` }, h('i')),
        h('ol', { class: 'stepper', 'aria-label': 'Progress' }, labels.map((l, i) =>
          h('li', { class: i < idx ? 'done' : i === idx ? 'on' : '', 'aria-current': i === idx ? 'step' : null }, l)))));
    }

    if (o.status === 'complete' && o.code) {
      const code = h('code', { 'aria-label': 'Your code', text: shownCode === o.code ? o.code : '' });
      const copy = h('button', { class: 'btn sm', type: 'button', text: 'Copy', onclick: async () => {
        try { await navigator.clipboard.writeText(o.code); copy.textContent = 'Copied'; } catch { copy.textContent = 'Select to copy'; }
        setTimeout(() => { copy.textContent = 'Copy'; }, 1600);
      } });
      kids.push(h('div', { class: 'stack' }, h('div', { class: 'codebox' }, code, copy),
        h('div', { class: 'row' }, h('a', { href: 'help/#redeem', text: 'How to redeem' }))));
      if (shownCode !== o.code) { shownCode = o.code; reveal(code, o.code); }
    }

    if (['expired', 'failed'].includes(o.status)) {
      kids.push(h('div', { class: 'btns' },
        h('a', { class: 'btn', href: './', text: o.status === 'expired' ? 'Start a new order' : 'Back to store' }),
        h('a', { class: 'btn ghost', href: 'help/', text: 'Get help' })));
    }

    if (o.demo && o.status === 'awaiting_payment') {
      kids.push(h('div', { class: 'demo-box' },
        h('span', {}, `Demo control. On the live site this step happens ${o.method === 'ecocash' ? 'on your phone when you enter your EcoCash PIN' : 'on the Paynow page'}.`),
        h('div', { class: 'btns' },
          h('button', { class: 'btn sm', type: 'button', text: 'Simulate: approve payment', onclick: () => mockPay('paid') }),
          h('button', { class: 'btn sm ghost', type: 'button', text: 'Simulate: cancel', onclick: () => mockPay('cancel') }))));
    }
    root.replaceChildren(...kids);
  }

  async function poll() {
    try {
      const o = await api(`/api/orders/${encodeURIComponent(token)}`, { cache: 'no-store' });
      render(o);
      if (['complete', 'failed'].includes(o.status)) return; // terminal: stop polling
    } catch (e) {
      if (e.status === 404) { root.replaceChildren(h('h2', { text: 'Order not found' }), h('p', { class: 'lead', text: 'Check the link you opened.' }), h('a', { class: 'btn', href: './', text: 'Back to store' })); return; }
      /* transient network error: keep polling */
    }
    timer = setTimeout(poll, 4000);
  }

  async function mockPay(outcome) {
    root.querySelectorAll('.demo-box button').forEach(b => { b.disabled = true; });
    try { await api(`/api/orders/${encodeURIComponent(token)}/mock-pay`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ outcome }) }); } catch { /* poll will show the truth */ }
    clearTimeout(timer); poll();
  }

  if (!token) root.replaceChildren(h('h2', { text: 'No order specified' }), h('a', { class: 'btn', href: './', text: 'Back to store' }));
  else poll();
})();
