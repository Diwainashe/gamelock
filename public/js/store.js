(() => {
  const $ = id => document.getElementById(id);
  const money = c => `$${(c / 100).toFixed(2)}`;
  let selected = null;

  async function loadCatalog() {
    const grid = $('grid');
    try {
      const res = await fetch('/api/catalog');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      grid.replaceChildren(...data.products.map(p => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'card'; b.setAttribute('aria-pressed', 'false');
        b.innerHTML = '<div class="face"></div><div class="price"></div>';
        b.children[0].textContent = `R${p.faceZar}`;
        b.children[1].textContent = `${money(p.priceCents)} - ZA PSN card`;
        b.addEventListener('click', () => select(p, b));
        return b;
      }));
    } catch (e) {
      grid.textContent = 'Could not load cards. Please refresh.';
    }
  }

  function select(p, btn) {
    selected = p;
    document.querySelectorAll('.card').forEach(c => c.setAttribute('aria-pressed', String(c === btn)));
    $('summary').textContent = `${p.name} - ${money(p.priceCents)}`;
    $('checkout').classList.remove('hidden');
    $('email').focus();
  }

  $('checkout').addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('error'), btn = $('submit');
    err.textContent = '';
    if (!selected) { err.textContent = 'Choose a card first.'; return; }
    btn.disabled = true; // prevents duplicate orders while in flight
    try {
      const res = await fetch('/api/orders', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sku: selected.sku, email: $('email').value, phone: $('phone').value,
          regionConfirmed: $('region').checked ? true : false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      location.href = `/order.html?t=${encodeURIComponent(data.token)}`;
    } catch (ex) {
      err.textContent = ex.message;
      btn.disabled = false;
    }
  });

  loadCatalog();
})();
