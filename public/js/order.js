(() => {
  const token = new URLSearchParams(location.search).get('t');
  const box = document.getElementById('state');
  const demo = document.getElementById('demo');
  let timer = null;

  const el = (tag, text, cls) => { const n = document.createElement(tag); n.textContent = text; if (cls) n.className = cls; return n; };
  const money = c => `$${(c / 100).toFixed(2)}`;

  function render(o) {
    const kids = [];
    const ref = el('p', `Reference: ${o.reference}`, 'lead');
    switch (o.status) {
      case 'created':
      case 'awaiting_payment':
        kids.push(el('h2', 'Check your phone and enter your PIN'),
          el('p', `Approve the EcoCash request for ${money(o.amountCents)}. This page updates on its own.`));
        break;
      case 'paid':
      case 'fulfilling':
        kids.push(el('h2', 'Payment received, getting your code'), el('p', 'This usually takes a few seconds.'));
        break;
      case 'fulfilment_unknown':
        kids.push(el('h2', 'We are on it'),
          el('p', 'Your payment is safe. Your code is taking longer than usual. Keep this page and quote your reference if you contact us.'));
        break;
      case 'complete': {
        kids.push(el('h2', 'Here is your code'), el('p', `${o.product}. Redeem it on a South African PSN account.`));
        const code = el('div', o.code || '', 'code');
        const copy = el('button', 'Copy code', 'btn');
        copy.type = 'button';
        copy.addEventListener('click', async () => {
          try { await navigator.clipboard.writeText(o.code); copy.textContent = 'Copied'; }
          catch { copy.textContent = 'Select and copy manually'; }
        });
        const help = el('a', 'How to redeem', 'btn secondary'); help.href = '/help/#redeem';
        const row = el('div', '', 'row'); row.append(copy, help);
        kids.push(code, row);
        break;
      }
      case 'expired':
        kids.push(el('h2', 'This order expired'),
          el('p', 'We did not receive payment in time. If you did pay, it will still be processed. Otherwise you can start again.'));
        break;
      default:
        kids.push(el('h2', 'Something went wrong'), el('p', 'Your order could not be completed. Quote your reference when you contact us.'));
    }
    kids.push(ref);
    if (['expired', 'failed'].includes(o.status)) {
      const again = el('a', 'Start a new order', 'btn'); again.href = '/'; kids.push(again);
    }
    box.replaceChildren(...kids);
    demo.classList.toggle('hidden', !(o.demo && o.status === 'awaiting_payment'));
  }

  async function poll() {
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(token)}`, { cache: 'no-store' });
      if (res.status === 404) { box.replaceChildren(el('h2', 'Order not found'), el('p', 'Check the link you opened.')); return; }
      const o = await res.json();
      render(o);
      if (['complete', 'failed'].includes(o.status)) return; // terminal: stop polling
    } catch { /* transient network error: keep polling */ }
    timer = setTimeout(poll, 4000);
  }

  async function mockPay(outcome) {
    document.querySelectorAll('#demo button').forEach(b => { b.disabled = true; });
    await fetch(`/api/orders/${encodeURIComponent(token)}/mock-pay`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ outcome }),
    });
    clearTimeout(timer); poll();
  }

  if (!token) { box.replaceChildren(el('h2', 'No order specified'), el('a', 'Back to store', 'btn')); box.lastChild.href = '/'; }
  else {
    document.getElementById('approve').addEventListener('click', () => mockPay('paid'));
    document.getElementById('cancel').addEventListener('click', () => mockPay('cancel'));
    poll();
  }
})();
