// Open the accordion item named in the URL hash (links like /help/#redeem).
(() => {
  const open = () => {
    const d = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (d && d.tagName === 'DETAILS') { d.open = true; d.scrollIntoView(); }
  };
  open();
  addEventListener('hashchange', open);
})();
