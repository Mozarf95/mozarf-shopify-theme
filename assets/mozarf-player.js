(function () {
  var DEFAULT_PREVIEW_SEC = 20;

  var root = document.getElementById("mozarf-player");
  if (!root) return;

  var audio = document.getElementById("mozarf-player-audio");
  var closeBtn = document.getElementById("mozarf-player-close");
  var queueBtn = document.getElementById("mozarf-player-queue");
  var drawerCloseBtn = document.getElementById("mozarf-player-drawer-close");
  var playBtn = document.getElementById("mozarf-player-play");
  var prevBtn = document.getElementById("mozarf-player-prev");
  var nextBtn = document.getElementById("mozarf-player-next");
  var seek = document.getElementById("mozarf-player-seek");
  var volume = document.getElementById("mozarf-player-volume");
  var cur = document.getElementById("mozarf-player-time-cur");
  var dur = document.getElementById("mozarf-player-time-dur");
  var title = document.getElementById("mozarf-player-album-title");
  var artist = document.getElementById("mozarf-player-album-artist");
  var metaTitle = document.getElementById("mozarf-player-meta-title");
  var metaArtist = document.getElementById("mozarf-player-meta-artist");
  var cover = document.getElementById("mozarf-player-cover");
  var coverLink = document.getElementById("mozarf-player-cover-link");
  var tracklist = document.getElementById("mozarf-player-tracklist");

  var state = {
    albumTitle: "MOZARF",
    albumArtist: "MOZARF",
    albumCover: "",
    albumUrl: "",
    tracks: [],
    index: -1,
    previewSec: DEFAULT_PREVIEW_SEC,
  };

  function getEventElementTarget(event) {
    if (!event) return null;
    var t = event.target;
    if (!t) return null;
    if (t.nodeType === 1) return t;
    return t.parentElement || null;
  }

  function closestFromEvent(event, selector) {
    var el = getEventElementTarget(event);
    if (!el) return null;
    if (typeof el.closest === "function") return el.closest(selector);
    while (el && el.nodeType === 1) {
      if (el.matches && el.matches(selector)) return el;
      el = el.parentElement;
    }
    return null;
  }

  function text(v) {
    if (v == null) return "";
    if (typeof v === "string") return v.trim();
    if (typeof v === "object") {
      if (typeof v.value === "string") return v.value.trim();
      if (typeof v.url === "string") return v.url.trim();
    }
    return String(v).trim();
  }

  function toAbs(u) {
    var t = text(u);
    if (!t) return "";
    if (t.indexOf("//") === 0) return "https:" + t;
    return t;
  }

  function pickTrackSrc(track) {
    var keys = ["src", "preview_url", "preview_link", "audio_url", "audio", "mp3", "file_url", "url"];
    for (var i = 0; i < keys.length; i++) {
      var v = track && track[keys[i]];
      var s = toAbs(v);
      if (s) return s;
    }
    return "";
  }

  function pickTrackTitle(track, idx) {
    var keys = ["title", "name", "track_name"];
    for (var i = 0; i < keys.length; i++) {
      var s = text(track && track[keys[i]]);
      if (s) return s;
    }
    return "Piste " + String(idx + 1);
  }

  function pickTrackUrl(track, fallback) {
    var keys = ["productUrl", "product_url", "url", "buy_url"];
    for (var i = 0; i < keys.length; i++) {
      var s = text(track && track[keys[i]]);
      if (s) return s;
    }
    return text(fallback);
  }

  function normalizeAlbum(raw, ctx) {
    var data = raw || {};
    var core = data;

    if (data.album) {
      core = data.album;
      if (typeof core === "string") {
        try {
          core = JSON.parse(core);
        } catch (e) {
          core = {};
        }
      }
    }

    var fallbackProductUrl = text(data.product_url || data.productPageUrl || (ctx && ctx.productUrl));
    var rawTracks = Array.isArray(core.tracks) ? core.tracks : Array.isArray(data.tracks) ? data.tracks : [];
    var tracks = [];
    for (var i = 0; i < rawTracks.length; i++) {
      var tr = rawTracks[i] || {};
      tracks.push({
        title: pickTrackTitle(tr, i),
        src: pickTrackSrc(tr),
        productUrl: pickTrackUrl(tr, fallbackProductUrl),
      });
    }

    var ps = data.preview_seconds || core.preview_seconds;
    return {
      title: text(data.product_title || core.title || (ctx && ctx.title) || "MOZARF"),
      artist: text(core.artist || data.vendor || (ctx && ctx.artist) || "MOZARF"),
      cover: toAbs(core.featured_image || core.cover || data.cover_shopify || (ctx && ctx.cover)),
      albumUrl: text(data.product_url || data.productPageUrl || core.product_url || (ctx && ctx.productUrl) || ""),
      tracks: tracks,
      previewSec: typeof ps === "number" ? ps : undefined,
    };
  }

  function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return "0:00";
    var m = Math.floor(seconds / 60);
    var s = Math.floor(seconds % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function openPlayer() {
    root.classList.add("is-active");
    root.setAttribute("aria-hidden", "false");
    document.body.classList.add("mozarf-sp-active");
  }

  function closePlayer() {
    root.classList.remove("is-active");
    root.classList.remove("is-expanded");
    root.setAttribute("aria-hidden", "true");
    document.body.classList.remove("mozarf-sp-active");
  }

  function expandDrawer(on) {
    root.classList.toggle("is-expanded", !!on);
  }

  function updateHeader() {
    if (title) title.textContent = state.albumTitle || "MOZARF";
    if (artist) artist.textContent = state.albumArtist || "MOZARF";
    var curTrack = state.tracks && state.index >= 0 ? state.tracks[state.index] : null;
    if (metaTitle) metaTitle.textContent = (curTrack && curTrack.title) ? curTrack.title : (state.albumTitle || "—");
    if (metaArtist) metaArtist.textContent = state.albumArtist || "MOZARF";
    if (state.albumCover) {
      cover.src = state.albumCover;
      cover.style.visibility = "visible";
    } else {
      cover.removeAttribute("src");
      cover.style.visibility = "hidden";
    }

    if (coverLink) {
      var href = state.albumUrl || "";
      if (href) {
        coverLink.href = href;
        coverLink.style.pointerEvents = "auto";
        coverLink.setAttribute("aria-disabled", "false");
      } else {
        coverLink.href = "#";
        coverLink.style.pointerEvents = "none";
        coverLink.setAttribute("aria-disabled", "true");
      }
    }
  }

  function updateButtons() {
    var hasTracks = state.tracks.length > 0;
    var current = state.tracks[state.index];
    playBtn.disabled = !current || !current.src;
    prevBtn.disabled = !hasTracks || state.index <= 0;
    nextBtn.disabled = !hasTracks || state.index >= state.tracks.length - 1;
    var playing = !!(audio && !audio.paused && (audio.currentSrc || audio.src));
    var iPlay = playBtn ? playBtn.querySelector(".mozarf-sp__icon-play") : null;
    var iPause = playBtn ? playBtn.querySelector(".mozarf-sp__icon-pause") : null;
    if (iPlay && iPause) {
      iPlay.style.display = playing ? "none" : "inline-flex";
      iPause.style.display = playing ? "inline-flex" : "none";
    }
  }

  function renderTracks() {
    if (!tracklist) return;
    tracklist.innerHTML = "";
    for (var i = 0; i < state.tracks.length; i++) {
      var tr = state.tracks[i];
      var isActive = i === state.index;
      var isPlaying = isActive && audio && !audio.paused && (audio.currentSrc || audio.src);
      var li = document.createElement("li");
      li.className = "mozarf-player-track" + (isActive ? " is-active" : "");

      var num = document.createElement("span");
      num.className = "mozarf-player-track-index";
      num.textContent = isPlaying ? "||" : String(i + 1);

      var button = document.createElement("button");
      button.type = "button";
      button.className = "mozarf-player-track-btn";
      button.textContent = tr.title;
      button.disabled = !tr.src;
      button.setAttribute("data-track-index", String(i));
      button.setAttribute("aria-label", (isPlaying ? "Pause " : "Play ") + tr.title);

      var buy = document.createElement("a");
      buy.className = "mozarf-player-track-buy";
      if (tr.productUrl) {
        buy.href = tr.productUrl;
        buy.textContent = "Achat";
      } else {
        buy.href = "#";
        buy.textContent = "N/A";
        buy.classList.add("is-disabled");
      }

      li.appendChild(num);
      li.appendChild(button);
      li.appendChild(buy);
      tracklist.appendChild(li);
    }
  }

  function syncNowPlayingUI() {
    updateHeader();
    updateButtons();
    renderTracks();
  }

  function showPreviewGate() {
    var gate = document.getElementById("mozarf-sp-preview-gate");
    if (!gate) return;
    var link = gate.querySelector(".mozarf-sp-gate__buy");
    if (link && state.albumUrl) link.href = state.albumUrl;
    gate.removeAttribute("hidden");
    updateButtons();
  }

  function hidePreviewGate() {
    var gate = document.getElementById("mozarf-sp-preview-gate");
    if (gate) gate.setAttribute("hidden", "");
  }

  function playTrack(index, autoplay) {
    if (index < 0 || index >= state.tracks.length) return;
    hidePreviewGate();
    state.index = index;
    var tr = state.tracks[index];
    syncNowPlayingUI();

    if (!tr || !tr.src) return;
    if (audio.src !== tr.src) audio.src = tr.src;
    if (autoplay) {
      openPlayer();
      audio.play().catch(function () {});
    }
  }

  function loadAlbum(raw, options) {
    var opts = options || {};
    var normalized = normalizeAlbum(raw, opts.context || {});
    state.albumTitle = normalized.title;
    state.albumArtist = normalized.artist;
    state.albumCover = normalized.cover;
    state.albumUrl = normalized.albumUrl || "";
    state.tracks = normalized.tracks;
    state.index = state.tracks.length ? 0 : -1;
    state.previewSec = typeof normalized.previewSec === "number" ? normalized.previewSec : DEFAULT_PREVIEW_SEC;

    updateHeader();
    renderTracks();
    updateButtons();

    if (opts.autoplay) {
      var startIndex = typeof opts.index === "number" ? opts.index : 0;
      for (var i = startIndex; i < state.tracks.length; i++) {
        if (state.tracks[i].src) {
          playTrack(i, true);
          return;
        }
      }
      openPlayer();
    }
  }

  function loadPlaylistFromAlbumPage(index) {
    var el = document.getElementById("mozarf-album-page-playlist");
    if (!el || !el.textContent) return false;
    try {
      var payload = JSON.parse(el.textContent.trim());
      loadAlbum(payload, { autoplay: true, index: index });
      return true;
    } catch (e) {
      return false;
    }
  }

  if (volume) {
    audio.volume = parseFloat(volume.value) || 1;
    volume.addEventListener("input", function () {
      audio.volume = parseFloat(volume.value) || 0;
    });
  }

  if (seek) {
    seek.addEventListener("input", function () {
      if (!audio.duration || !isFinite(audio.duration)) return;
      audio.currentTime = (parseFloat(seek.value) / 1000) * audio.duration;
    });
  }

  if (audio) {
    audio.addEventListener("loadedmetadata", function () {
      dur.textContent = formatTime(audio.duration);
      syncNowPlayingUI();
    });
    audio.addEventListener("timeupdate", function () {
      if (state.previewSec > 0 && isFinite(audio.currentTime) && audio.currentTime >= state.previewSec) {
        audio.pause();
        audio.currentTime = 0;
        showPreviewGate();
        return;
      }
      if (audio.duration && isFinite(audio.duration)) {
        seek.value = String(Math.round((audio.currentTime / audio.duration) * 1000));
      } else {
        seek.value = "0";
      }
      cur.textContent = formatTime(audio.currentTime);
      dur.textContent = formatTime(audio.duration);
      updateButtons();
    });
    audio.addEventListener("play", syncNowPlayingUI);
    audio.addEventListener("pause", syncNowPlayingUI);
    audio.addEventListener("ended", function () {
      if (state.index >= 0 && state.index < state.tracks.length - 1) playTrack(state.index + 1, true);
      else syncNowPlayingUI();
    });
  }

  playBtn.addEventListener("click", function () {
    if (playBtn.disabled) return;
    if (audio.paused) audio.play().catch(function () {});
    else audio.pause();
  });

  prevBtn.addEventListener("click", function () {
    if (prevBtn.disabled) return;
    playTrack(state.index - 1, true);
  });

  nextBtn.addEventListener("click", function () {
    if (nextBtn.disabled) return;
    playTrack(state.index + 1, true);
  });

  closeBtn.addEventListener("click", function () {
    audio.pause();
    closePlayer();
  });

  if (queueBtn) {
    queueBtn.addEventListener("click", function () {
      openPlayer();
      expandDrawer(!root.classList.contains("is-expanded"));
    });
  }
  if (drawerCloseBtn) {
    drawerCloseBtn.addEventListener("click", function () {
      expandDrawer(false);
    });
  }

  if (tracklist) {
    tracklist.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-track-index]");
      if (!btn) return;
      var idx = parseInt(btn.getAttribute("data-track-index"), 10);
      if (isNaN(idx)) return;
      if (idx === state.index && audio && (audio.currentSrc || audio.src)) {
        if (audio.paused) audio.play().catch(function () {});
        else audio.pause();
        return;
      }
      playTrack(idx, true);
    });
  }

  document.addEventListener("click", function (event) {
    var bsPlay = closestFromEvent(event, "[data-mozarf-bs-play]");
    if (bsPlay && !bsPlay.disabled) {
      event.preventDefault();
      var idx = parseInt(bsPlay.getAttribute("data-mozarf-bs-play"), 10);
      if (isNaN(idx)) idx = 0;
      if (loadPlaylistFromAlbumPage(idx)) return;
    }

    var openBtn = closestFromEvent(event, "[data-mozarf-open-album], .mozarf-js-open-player");
    if (!openBtn) return;
    event.preventDefault();

    var payload = null;
    var jsonId = openBtn.getAttribute("data-album-json-id");
    if (jsonId) {
      var jsonEl = document.getElementById(jsonId);
      if (jsonEl && jsonEl.textContent) {
        try {
          payload = JSON.parse(jsonEl.textContent.trim());
        } catch (e) {}
      }
    }

    if (!payload) {
      var card = openBtn.closest("[data-mozarf-album]");
      if (card) {
        var raw = card.getAttribute("data-mozarf-album");
        if (raw) {
          try {
            payload = JSON.parse(raw);
          } catch (e2) {}
        }
      }
    }

    if (!payload && document.getElementById("mozarf-album-page-playlist")) {
      loadPlaylistFromAlbumPage(0);
      return;
    }

    if (payload) loadAlbum(payload, { autoplay: true });
  });

  window.mozarfLoadAlbum = function (data) {
    loadAlbum(data, { autoplay: false });
    openPlayer();
  };

  window.mozarfLoadAlbumAndPlay = function (data, index) {
    loadAlbum(data, { autoplay: true, index: typeof index === "number" ? index : 0 });
  };

  window.mozarfAlbumPageBootstrap = function (data) {
    loadAlbum(data, { autoplay: false });
  };

  window.mozarfUnwrapAlbumInlinePayload = function (payload) {
    return normalizeAlbum(payload, {});
  };

  window.mozarfOpenAlbumInStickyPlayer = function (rawData, btn) {
    var context = {};
    var card = btn ? btn.closest("[data-mozarf-card-root], .mozarf-mp-album-card") : null;
    if (card) {
      var img = card.querySelector("img");
      var link = card.querySelector('a[href*="/products/"]');
      context.cover = img ? (img.currentSrc || img.src || "") : "";
      context.title = card.getAttribute("data-album-title") || "";
      context.artist = card.getAttribute("data-vendor") || "";
      context.productUrl = link ? link.href : "";
    }
    loadAlbum(rawData, { autoplay: true, context: context });
  };

  var replayGateBtn = document.getElementById("mozarf-sp-gate-replay");
  if (replayGateBtn) {
    replayGateBtn.addEventListener("click", function () {
      hidePreviewGate();
    });
  }

  function initialBootstrap() {
    var isProduct = /\/products\//.test(String(window.location && window.location.pathname ? window.location.pathname : ""));
    if (isProduct) {
      var ok = loadPlaylistFromAlbumPage(0);
      if (ok) {
        openPlayer();
      }
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialBootstrap);
  else initialBootstrap();

  // Persist playback across navigation (best-effort)
  var STORAGE_KEY = "mozarf_sp_state_v1";
  var lastSaveAt = 0;

  function safeJsonParse(s) {
    try {
      return JSON.parse(s);
    } catch (e) {
      return null;
    }
  }

  function saveState() {
    if (!audio) return;
    if (!state || !Array.isArray(state.tracks) || !state.tracks.length) return;
    var now = Date.now();
    if (now - lastSaveAt < 1200) return;
    lastSaveAt = now;
    var payload = {
      at: now,
      albumTitle: state.albumTitle || "",
      albumArtist: state.albumArtist || "",
      albumCover: state.albumCover || "",
      albumUrl: state.albumUrl || "",
      index: state.index,
      paused: audio.paused,
      currentTime: isFinite(audio.currentTime) ? audio.currentTime : 0,
      src: audio.currentSrc || audio.src || "",
      tracks: state.tracks,
    };
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {}
  }

  function restoreState() {
    var raw = null;
    try {
      raw = sessionStorage.getItem(STORAGE_KEY);
    } catch (e) {}
    if (!raw) return;
    var parsed = safeJsonParse(raw);
    if (!parsed || !parsed.at) return;
    if (Date.now() - parsed.at > 1000 * 60 * 30) return;
    if (!parsed.tracks || !Array.isArray(parsed.tracks) || !parsed.tracks.length) return;

    state.albumTitle = parsed.albumTitle || state.albumTitle;
    state.albumArtist = parsed.albumArtist || state.albumArtist;
    state.albumCover = parsed.albumCover || state.albumCover;
    state.albumUrl = parsed.albumUrl || state.albumUrl;
    state.tracks = parsed.tracks;
    state.index = typeof parsed.index === "number" ? parsed.index : 0;
    updateHeader();
    renderTracks();
    updateButtons();

    if (parsed.src) {
      audio.src = parsed.src;
      var t = typeof parsed.currentTime === "number" ? parsed.currentTime : 0;
      try {
        audio.currentTime = t;
      } catch (e) {}
      if (!parsed.paused) {
        openPlayer();
        audio.play().catch(function () {});
      }
    }
  }

  audio.addEventListener("timeupdate", saveState);
  audio.addEventListener("play", saveState);
  audio.addEventListener("pause", saveState);
  window.addEventListener("beforeunload", saveState);

  restoreState();
})();
