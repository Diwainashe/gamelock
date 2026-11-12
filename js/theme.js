// Runs in <head> before first paint so there is no light/dark flash.
(() => {
  let t = 'dark';
  try { t = localStorage.getItem('gl-theme') || 'dark'; } catch { /* storage blocked: default */ }
  document.documentElement.dataset.theme = t === 'light' ? 'light' : 'dark';
})();
