(function () {
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-mozarf-kit-play]');
    if (!btn) return;
    var root = btn.closest('[data-mozarf-kit-samples]');
    if (!root) return;
    var jid = root.getAttribute('data-kit-json-id');
    var jsonEl = jid ? document.getElementById(jid) : null;
    if (!jsonEl) return;
    var idx = parseInt(btn.getAttribute('data-mozarf-kit-play'), 10);
    if (isNaN(idx) || !window.mozarfLoadAlbumAndPlay) return;
    try {
      var data = JSON.parse(jsonEl.textContent.trim());
      window.mozarfLoadAlbumAndPlay(data, idx);
    } catch (err) {}
  });
})();
