/* Funcionamento offline: só no site publicado. Use ?sw=off para desligar.
   Arquivo separado (em vez de script embutido na página) para valer com a CSP. */
(function () {
  if (!('serviceWorker' in navigator)) return;
  var off = /[?&]sw=off\b/.test(location.search);
  var prod = /(^|\.)mesafinanceira\.com\.br$/.test(location.hostname) && window.top === window.self;
  if (off || !prod) {
    navigator.serviceWorker.getRegistrations().then(function (rs) {
      rs.forEach(function (r) {
        if (/\/sw\.js$/.test((r.active || r.installing || r.waiting || {}).scriptURL || '')) r.unregister();
      });
    });
    return;
  }
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  });
})();
