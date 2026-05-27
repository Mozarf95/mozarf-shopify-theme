// MOZARF — Lecteur sticky global (HTML5 Audio), style BeatStars
(function () {
  var bar = document.getElementById('mozarf-bar');
  var sticky = document.getElementById('mozarf-sticky-player');
  if (!bar) return;

  function normalizeCoverUrl(u) {
    if (!u || typeof u !== 'string') return '';
    if (u.indexOf('//') === 0) return 'https:' + u;
    return u;
  }

  function pickAudioUrl(t) {
    if (!t || typeof t !== 'object') return '';
    var keys = [
      'src',
      'preview_url',
      'audio_url',
      'stream_url',
      'audio',
      'mp3',
      'preview_mp3',
      'file_url',
      'url',
    ];
    for (var i = 0; i < keys.length; i++) {
      var v = t[keys[i]];
      if (v && typeof v === 'object') {
        if (v.error) continue;
        if (typeof v.url === 'string') v = v.url;
        else if (typeof v.src === 'string') v = v.src;
        else continue;
      }
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    var f = t.file;
    if (f && typeof f === 'object' && !f.error && typeof f.url === 'string' && f.url.trim()) return f.url.trim();
    return '';
  }

  function normalizeTrack(t) {
    if (!t || typeof t !== 'object') return null;
    var src = pickAudioUrl(t);
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

  function enrichAlbumData(data, ctx) {
    ctx = ctx || {};
    if (!data || typeof data !== 'object') {
      return { title: '—', artist: 'MOZARF', tracks: [], cover: '', featured_image: '' };
    }
    var base = String(data.productPageUrl || data.product_url || ctx.productUrl || '').trim();
    var rawTracks = Array.isArray(data.tracks) ? data.tracks : [];
    var mapped = rawTracks.map(function (t) {
      var o = Object.assign({}, t);
      var pu = String(o.productUrl || o.url || '').trim();
      if (!pu && base && o.purchase && typeof o.purchase === 'object') {
        var p = o.purchase;
        var vid = p.mp3_variant_id || p.wav_variant_id || p.stems_variant_id || p.license_variant_id;
        if (vid) pu = base + (base.indexOf('?') >= 0 ? '&' : '?') + 'variant=' + String(vid);
      }
      if (!pu && base) pu = base;
      if (pu) {
        o.productUrl = pu;
        o.url = pu;
      }
      return o;
    });
    var fallback = String(data.fallback_preview_url || data.audio_preview_url || '').trim();
    if (fallback && mapped.length === 1) {
      mapped = mapped.map(function (o) {
        if (!pickAudioUrl(o)) o.preview_url = o.preview_url || fallback;
        return o;
      });
    }
    return {
      title: data.title || ctx.title || '—',
      artist: data.artist || ctx.artist || 'MOZARF',
      cover: data.featured_image || data.cover || ctx.cover || '',
      featured_image: data.featured_image || data.cover || ctx.cover || '',
      tracks: mapped,
      fallback_preview_url: fallback,
    };
  }

  function formatTime(s) {
    if (!isFinite(s) || s < 0) return '0:00';
    var m = Math.floor(s / 60);
    var sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  var cover = document.getElementById('mozarf-bar__cover');
  var titleEl = document.getElementById('mozarf-bar__title');
  var artistEl = document.getElementById('mozarf-bar__artist');
  var btnPlay = document.getElementById('mozarf-bar__play');
  var btnPrev = document.getElementById('mozarf-bar__prev');
  var btnNext = document.getElementById('mozarf-bar__next');
  var btnClose = document.getElementById('mozarf-bar__close');
  var btnTracklist = document.getElementById('mozarf-bar__tracklist');
  var tracklist = document.getElementById('mozarf-tracklist');
  var tracklistUl = document.getElementById('mozarf-tracklist__list');
  var audio = document.getElementById('mozarf-bar__audio');
  var progressEl = document.getElementById('mozarf-bar__progress');
  var progressFill = document.getElementById('mozarf-bar__progress-fill');
  var timeCur = document.getElementById('mozarf-bar__time-cur');
  var timeDur = document.getElementById('mozarf-bar__time-dur');
  var volInput = document.getElementById('mozarf-bar__volume');

  var tracks = [];
  var currentIndex = 0;
  var albumPageMode = false;
  var albumTitle = '';

  function showPlayerUI() {
    document.body.classList.add('mozarf-sticky-player-active');
    if (sticky) {
      sticky.classList.add('is-active');
      sticky.setAttribute('aria-hidden', 'false');
    } else if (bar) {
      bar.classList.add('mozarf-bar--slide-active');
      bar.setAttribute('aria-hidden', 'false');
    }
  }

  function hidePlayerUI() {
    document.body.classList.remove('mozarf-sticky-player-active');
    if (sticky) {
      sticky.classList.remove('is-active');
      sticky.setAttribute('aria-hidden', 'true');
    } else if (bar) {
      bar.classList.remove('mozarf-bar--slide-active');
      bar.setAttribute('aria-hidden', 'true');
    }
    if (tracklist) tracklist.classList.remove('mozarf-tracklist--visible');
  }

  var btnBuy = document.createElement('a');
  btnBuy.id = 'mozarf-bar__buy';
  btnBuy.textContent = 'Acheter';
  btnBuy.target = '_self';
  btnBuy.rel = '';
  btnBuy.className = 'mozarf-bar__buy-link';
  btnBuy.style.cssText =
    'display:none;margin-left:8px;padding:6px 12px;background:#f5c518;color:#111;border-radius:20px;font-weight:700;font-size:11px;text-decoration:none;text-transform:uppercase;transition:filter .2s;';
  if (titleEl && titleEl.parentNode) titleEl.parentNode.insertBefore(btnBuy, titleEl.nextSibling);

  function setProgressFromEvent(clientX) {
    if (!progressEl || !audio.duration || !isFinite(audio.duration)) return;
    if (progressEl.classList.contains('mozarf-player__seek--disabled')) return;
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

  function refreshControlsState() {
    if (!btnPlay) return;
    var tr = tracks[currentIndex];
    var canPlay = !!(tr && tr.src);
    var hasList = tracks.length > 0;
    btnPlay.disabled = !canPlay;
    btnPrev.disabled = !hasList || currentIndex <= 0;
    btnNext.disabled = !hasList || currentIndex >= tracks.length - 1;
    var canSeek = !!(audio && audio.duration && isFinite(audio.duration) && canPlay);
    if (progressEl) {
      progressEl.classList.toggle('mozarf-player__seek--disabled', !canSeek);
      progressEl.setAttribute('aria-disabled', canSeek ? 'false' : 'true');
    }
    btnPlay.classList.toggle('mozarf-player__ctrl--disabled', !canPlay);
    btnPrev.classList.toggle('mozarf-player__ctrl--disabled', btnPrev.disabled);
    btnNext.classList.toggle('mozarf-player__ctrl--disabled', btnNext.disabled);
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
      if (!audio.duration || !isFinite(audio.duration)) return;
      var step = audio.duration * 0.05;
      if (e.key === 'ArrowLeft') audio.currentTime = Math.max(0, audio.currentTime - step);
      else audio.currentTime = Math.min(audio.duration, audio.currentTime + step);
    });
  }

  if (audio) {
    audio.addEventListener('timeupdate', function () {
      updateProgressUI();
      refreshControlsState();
    });
    audio.addEventListener('loadedmetadata', function () {
      updateProgressUI();
      refreshControlsState();
    });
    audio.addEventListener('play', syncPlayIcon);
    audio.addEventListener('pause', syncPlayIcon);
  }

  function syncPlayIcon() {
    if (!btnPlay || !audio) return;
    var playing = !audio.paused && audio.currentSrc;
    btnPlay.innerHTML = playing
      ? '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
      : '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7L8 5z"/></svg>';
  }

  function renderTracklist() {
    if (!tracklistUl) return;
    tracklistUl.innerHTML = '';
    tracks.forEach(function (track, index) {
      var li = document.createElement('li');
      li.textContent = index + 1 + '. ' + track.title;
      li.dataset.index = index;
      li.addEventListener('click', function () {
        loadTrack(index, { play: true });
        if (tracklist) tracklist.classList.remove('mozarf-tracklist--visible');
      });
      tracklistUl.appendChild(li);
    });
  }

  function updateTracklistActive() {
    if (!tracklistUl) return;
    tracklistUl.querySelectorAll('li').forEach(function (li, i) {
      li.classList.toggle('active', i === currentIndex);
    });
  }

  function loadTrack(index, opts) {
    opts = opts || {};
    var play = opts.play !== false;
    if (!tracks[index]) return;
    currentIndex = index;
    var tr = tracks[index];
    if (titleEl) titleEl.textContent = tr.title;

    var buyHref = tr.productUrl || tr.url;
    if (buyHref) {
      btnBuy.href = buyHref;
      btnBuy.style.display = 'inline-block';
    } else {
      btnBuy.style.display = 'none';
    }

    if (tr.src && audio) {
      if (audio.src !== tr.src) audio.src = tr.src;
      if (play) {
        showPlayerUI();
        audio.play().catch(function () {});
      } else {
        audio.pause();
      }
    } else if (audio) {
      audio.pause();
      audio.removeAttribute('src');
    }

    updateTracklistActive();
    syncPlayIcon();
    updateProgressUI();
    refreshControlsState();
  }

  function loadAlbum(rawData, opts) {
    opts = opts || {};
    var skipAutoPlay = opts.skipAutoPlay === true;
    var data = enrichAlbumData(rawData, opts.enrichContext || {});
    tracks = normalizeTracks(data.tracks || []);
    albumTitle = data.title || '—';
    if (artistEl) artistEl.textContent = data.artist || 'MOZARF';
    var c = normalizeCoverUrl(data.cover || data.featured_image || '');
    if (cover) {
      cover.src = c || '';
      cover.style.display = c ? 'block' : 'none';
    }
    renderTracklist();

    var firstPlayable = -1;
    for (var i = 0; i < tracks.length; i++) {
      if (tracks[i].src) {
        firstPlayable = i;
        break;
      }
    }

    if (skipAutoPlay) {
      if (titleEl) titleEl.textContent = albumTitle;
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
      refreshControlsState();
      return;
    }

    if (firstPlayable >= 0) loadTrack(firstPlayable, { play: true });
    else if (tracks.length) loadTrack(0, { play: false });
    else {
      if (titleEl) titleEl.textContent = albumTitle;
      syncPlayIcon();
      refreshControlsState();
    }
  }

  if (btnPlay) btnPlay.addEventListener('click', function () {
    if (!audio || !tracks.length || btnPlay.disabled) return;
    var tr = tracks[currentIndex];
    if (!tr || !tr.src) return;
    if (audio.paused) {
      showPlayerUI();
      audio.play().catch(function () {});
    } else audio.pause();
  });

  if (btnPrev) btnPrev.addEventListener('click', function () {
    if (btnPrev.disabled) return;
    if (currentIndex > 0) loadTrack(currentIndex - 1, { play: true });
  });

  if (btnNext) btnNext.addEventListener('click', function () {
    if (btnNext.disabled) return;
    if (currentIndex < tracks.length - 1) loadTrack(currentIndex + 1, { play: true });
  });

  if (btnTracklist && tracklist) {
    btnTracklist.addEventListener('click', function () {
      tracklist.classList.toggle('mozarf-tracklist--visible');
    });
  }

  if (btnClose) {
    btnClose.addEventListener('click', function () {
      if (audio) audio.pause();
      hidePlayerUI();
    });
  }

  if (audio) audio.addEventListener('ended', function () {
    if (currentIndex < tracks.length - 1) loadTrack(currentIndex + 1, { play: true });
    else syncPlayIcon();
  });

  document.addEventListener('click', function (e) {
    var bs = e.target.closest('[data-mozarf-bs-play]');
    if (bs && !bs.disabled) {
      var idxBs = parseInt(bs.getAttribute('data-mozarf-bs-play'), 10);
      var playlistEl = document.getElementById('mozarf-album-page-playlist');
      if (!isNaN(idxBs) && playlistEl && playlistEl.textContent) {
        try {
          var plData = JSON.parse(playlistEl.textContent.trim());
          if (typeof window.mozarfLoadAlbumAndPlay === 'function') {
            window.mozarfLoadAlbumAndPlay(plData, idxBs);
          }
        } catch (errBs) {}
      }
    }
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
      if (tracklist) tracklist.classList.add('mozarf-tracklist--visible');
    } catch (err) {}
  });

  window.mozarfLoadAlbum = loadAlbum;
  window.mozarfLoadAlbumAndPlay = function (data, index) {
    loadAlbum(data, { skipAutoPlay: true });
    var idx = typeof index === 'number' && index >= 0 ? index : 0;
    loadTrack(idx, { play: true });
  };

  window.mozarfOpenAlbumInStickyPlayer = function (rawData, btn) {
    var card = btn ? btn.closest('.mozarf-mp-album-card') : null;
    if (!card && btn) card = btn.closest('[data-mozarf-card-root]');
    var link = card ? card.querySelector('a[href*="/products/"]') : null;
    var productUrl = link ? link.href : '';
    if (!productUrl && rawData && rawData.product_url) productUrl = String(rawData.product_url);
    if (!productUrl && typeof window.location !== 'undefined' && /\/products\//.test(window.location.pathname)) {
      productUrl = window.location.origin + window.location.pathname;
    }
    var img = card ? card.querySelector('img') : null;
    var coverU = '';
    try {
      if (img && img.currentSrc) coverU = img.currentSrc;
      else if (img && img.src) coverU = img.src;
    } catch (e) {}
    var ctx = {
      productUrl: productUrl,
      cover: coverU,
      title: card && card.dataset.albumTitle ? card.dataset.albumTitle : '',
      artist: card && card.dataset.vendor ? card.dataset.vendor : '',
    };
    var data = enrichAlbumData(rawData, ctx);
    var idx = 0;
    for (var i = 0; i < (data.tracks || []).length; i++) {
      var t = data.tracks[i];
      if (pickAudioUrl(t)) {
        idx = i;
        break;
      }
    }
    window.mozarfLoadAlbumAndPlay(data, idx);
  };

  window.mozarfAlbumPageBootstrap = function (data) {
    albumPageMode = true;
    bar.classList.add('mozarf-bar--album-page');
    loadAlbum(data, { skipAutoPlay: true });
  };

  document.addEventListener('DOMContentLoaded', function () {
    var el = document.getElementById('mozarf-album-page-playlist');
    if (el && el.textContent) {
      try {
        window.mozarfAlbumPageBootstrap(JSON.parse(el.textContent.trim()));
      } catch (e) {}
    } else {
      syncPlayIcon();
      refreshControlsState();
    }
  });
})();
