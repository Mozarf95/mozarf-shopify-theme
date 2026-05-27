// MOZARF — Lecteur sticky : prev/next, progression, volume, mode page album
(function () {
  const bar = document.getElementById('mozarf-bar');
  if (!bar) return;

  function normalizeCoverUrl(u) {
    if (!u || typeof u !== 'string') return '';
    if (u.indexOf('//') === 0) return 'https:' + u;
    return u;
  }

  function normalizeTrack(t) {
    if (!t || typeof t !== 'object') return null;
    var src = t.src;
    if (src && typeof src === 'object' && src.error) src = '';
    if (typeof src !== 'string' || !src.trim()) {
      src = t.preview_url;
      if (src && typeof src === 'object' && src.error) src = '';
      src = typeof src === 'string' ? src.trim() : '';
    } else {
      src = String(src).trim();
    }
    var productUrl = t.productUrl || t.url || '';
    if (productUrl && typeof productUrl === 'object' && productUrl.error) productUrl = '';
    productUrl = String(productUrl || '').trim();
    var title = (t.title != null ? String(t.title) : '—').trim() || '—';
    return { title: title, src: src, url: productUrl, productUrl: productUrl };
  }

  function normalizeTracks(tracks) {
    if (!Array.isArray(tracks)) return [];
    var out = [];
    tracks.forEach(function (t) {
      var n = normalizeTrack(t);
      if (n) out.push(n);
    });
    return out;
  }

  function formatTime(s) {
    if (!isFinite(s) || s < 0) return '0:00';
    var m = Math.floor(s / 60);
    var sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  const cover = document.getElementById('mozarf-bar__cover');
  const titleEl = document.getElementById('mozarf-bar__title');
  const artistEl = document.getElementById('mozarf-bar__artist');
  const btnPlay = document.getElementById('mozarf-bar__play');
  const btnPrev = document.getElementById('mozarf-bar__prev');
  const btnNext = document.getElementById('mozarf-bar__next');
  const btnClose = document.getElementById('mozarf-bar__close');
  const btnTracklist = document.getElementById('mozarf-bar__tracklist');
  const tracklist = document.getElementById('mozarf-tracklist');
  const tracklistUl = document.getElementById('mozarf-tracklist__list');
  const audio = document.getElementById('mozarf-bar__audio');
  const progressEl = document.getElementById('mozarf-bar__progress');
  const progressFill = document.getElementById('mozarf-bar__progress-fill');
  const timeCur = document.getElementById('mozarf-bar__time-cur');
  const timeDur = document.getElementById('mozarf-bar__time-dur');
  const volInput = document.getElementById('mozarf-bar__volume');

  let tracks = [];
  let currentIndex = 0;
  let isPlaying = false;
  let albumPageMode = false;
  let albumTitle = '';

  const btnBuy = document.createElement('a');
  btnBuy.id = 'mozarf-bar__buy';
  btnBuy.textContent = 'Acheter';
  btnBuy.target = '_self';
  btnBuy.rel = '';
  btnBuy.style.cssText =
    'display:none;margin-left:10px;padding:6px 12px;background:#fff;color:#111;border-radius:20px;font-weight:700;font-size:11px;text-decoration:none;text-transform:uppercase;';
  if (titleEl && titleEl.parentNode) titleEl.parentNode.insertBefore(btnBuy, titleEl.nextSibling);

  function setProgressFromEvent(clientX) {
    if (!progressEl || !audio.duration || !isFinite(audio.duration)) return;
    var r = progressEl.getBoundingClientRect();
    var ratio = (clientX - r.left) / r.width;
    ratio = Math.max(0, Math.min(1, ratio));
    audio.currentTime = ratio * audio.duration;
  }

  function updateProgressUI() {
    if (!audio.duration || !isFinite(audio.duration)) {
      if (progressFill) progressFill.style.width = '0%';
      if (timeCur) timeCur.textContent = '0:00';
      if (timeDur) timeDur.textContent = '0:00';
      return;
    }
    var p = (audio.currentTime / audio.duration) * 100;
    if (progressFill) progressFill.style.width = p + '%';
    if (timeCur) timeCur.textContent = formatTime(audio.currentTime);
    if (timeDur) timeDur.textContent = formatTime(audio.duration);
    if (progressEl) progressEl.setAttribute('aria-valuenow', String(Math.round(p)));
  }

  if (volInput && audio) {
    audio.volume = parseFloat(volInput.value) || 1;
    volInput.addEventListener('input', function () {
      audio.volume = parseFloat(volInput.value) || 0;
    });
  }

  if (progressEl) {
    progressEl.addEventListener('click', function (e) {
      setProgressFromEvent(e.clientX);
    });
    progressEl.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      var step = audio.duration ? audio.duration * 0.05 : 5;
      if (e.key === 'ArrowLeft') audio.currentTime = Math.max(0, audio.currentTime - step);
      else audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + step);
    });
  }

  audio.addEventListener('timeupdate', updateProgressUI);
  audio.addEventListener('loadedmetadata', updateProgressUI);
  audio.addEventListener('play', function () {
    isPlaying = true;
    syncPlayIcon();
  });
  audio.addEventListener('pause', function () {
    isPlaying = false;
    syncPlayIcon();
  });

  function syncPlayIcon() {
    var playing = !audio.paused && audio.currentSrc;
    btnPlay.innerHTML = playing
      ? '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
      : '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7L8 5z"/></svg>';
  }

  function renderTracklist() {
    tracklistUl.innerHTML = '';
    tracks.forEach(function (track, index) {
      var li = document.createElement('li');
      li.textContent = index + 1 + '. ' + track.title;
      li.dataset.index = index;
      li.addEventListener('click', function () {
        loadTrack(index, { play: true });
        tracklist.classList.remove('mozarf-tracklist--visible');
      });
      tracklistUl.appendChild(li);
    });
  }

  function updateTracklistActive() {
    tracklistUl.querySelectorAll('li').forEach(function (li, i) {
      li.classList.toggle('active', i === currentIndex);
    });
  }

  function showBar() {
    bar.classList.add('mozarf-bar--visible');
    document.body.classList.add('mozarf-player-bar-open');
  }

  function loadTrack(index, opts) {
    opts = opts || {};
    var play = opts.play !== false;
    if (!tracks[index]) return;
    currentIndex = index;
    var tr = tracks[index];
    titleEl.textContent = tr.title;

    var buyHref = tr.productUrl || tr.url;
    if (buyHref) {
      btnBuy.href = buyHref;
      btnBuy.style.display = 'inline-block';
    } else {
      btnBuy.style.display = 'none';
    }

    if (tr.src) {
      if (audio.src !== tr.src) audio.src = tr.src;
      if (play) {
        audio.play().catch(function () {});
      } else {
        audio.pause();
      }
    } else {
      audio.pause();
      audio.removeAttribute('src');
    }

    updateTracklistActive();
    syncPlayIcon();
    updateProgressUI();
  }

  function loadAlbum(data, opts) {
    opts = opts || {};
    var skipAutoPlay = opts.skipAutoPlay === true;
    tracks = normalizeTracks(data.tracks || []);
    albumTitle = data.title || '—';
    artistEl.textContent = data.artist || 'MOZARF';
    var c = normalizeCoverUrl(data.cover || data.featured_image || '');
    cover.src = c || '';
    cover.style.display = c ? 'block' : 'none';
    showBar();
    renderTracklist();

    var firstPlayable = -1;
    for (var i = 0; i < tracks.length; i++) {
      if (tracks[i].src) {
        firstPlayable = i;
        break;
      }
    }

    if (skipAutoPlay) {
      titleEl.textContent = albumTitle;
      currentIndex = 0;
      audio.pause();
      audio.removeAttribute('src');
      if (tracks.length) {
        var tr0 = tracks[0];
        var bh = tr0.productUrl || tr0.url;
        if (bh) {
          btnBuy.href = bh;
          btnBuy.style.display = 'inline-block';
        } else {
          btnBuy.style.display = 'none';
        }
      } else {
        btnBuy.style.display = 'none';
      }
      updateTracklistActive();
      syncPlayIcon();
      updateProgressUI();
      return;
    }

    if (firstPlayable >= 0) loadTrack(firstPlayable, { play: true });
    else if (tracks.length) loadTrack(0, { play: false });
    else {
      titleEl.textContent = albumTitle;
      syncPlayIcon();
    }
  }

  btnPlay.addEventListener('click', function () {
    if (!tracks.length) return;
    var tr = tracks[currentIndex];
    if (!tr || !tr.src) return;
    if (audio.paused) audio.play().catch(function () {});
    else audio.pause();
  });

  btnPrev.addEventListener('click', function () {
    if (currentIndex > 0) loadTrack(currentIndex - 1, { play: true });
  });

  btnNext.addEventListener('click', function () {
    if (currentIndex < tracks.length - 1) loadTrack(currentIndex + 1, { play: true });
  });

  btnTracklist.addEventListener('click', function () {
    tracklist.classList.toggle('mozarf-tracklist--visible');
  });

  btnClose.addEventListener('click', function () {
    if (albumPageMode) return;
    bar.classList.remove('mozarf-bar--visible');
    tracklist.classList.remove('mozarf-tracklist--visible');
    document.body.classList.remove('mozarf-player-bar-open');
    audio.pause();
    isPlaying = false;
    syncPlayIcon();
  });

  audio.addEventListener('ended', function () {
    if (currentIndex < tracks.length - 1) loadTrack(currentIndex + 1, { play: true });
    else syncPlayIcon();
  });

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.mozarf-js-open-player');
    if (!btn) return;
    var card = btn.closest('[data-mozarf-album]');
    if (!card) return;
    var raw = card.getAttribute('data-mozarf-album');
    if (!raw) return;
    try {
      loadAlbum(JSON.parse(raw));
      tracklist.classList.add('mozarf-tracklist--visible');
    } catch (err) {}
  });

  window.mozarfLoadAlbum = loadAlbum;
  window.mozarfLoadAlbumAndPlay = function (data, index) {
    loadAlbum(data, { skipAutoPlay: true });
    var idx = typeof index === 'number' && index >= 0 ? index : 0;
    loadTrack(idx, { play: true });
  };

  /** Page produit album : barre toujours visible, pas d’auto-play */
  window.mozarfAlbumPageBootstrap = function (data) {
    albumPageMode = true;
    bar.classList.add('mozarf-bar--album-page');
    btnClose.style.display = 'none';
    loadAlbum(data, { skipAutoPlay: true });
  };

  document.addEventListener('DOMContentLoaded', function () {
    var el = document.getElementById('mozarf-album-page-playlist');
    if (!el || !el.textContent) return;
    try {
      window.mozarfAlbumPageBootstrap(JSON.parse(el.textContent.trim()));
    } catch (e) {}
  });
})();
