(function (window, document) {
  "use strict";

  function formatTime(sec) {
    if (!isFinite(sec) || sec < 0) return "0:00";
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function escapeHtml(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function normalizeCoverUrl(u) {
    if (!u || typeof u !== "string") return "";
    if (u.indexOf("//") === 0) return "https:" + u;
    return u;
  }

  function normalizeTrack(t) {
    if (!t || typeof t !== "object") return null;
    var src = t.src;
    if (src && typeof src === "object" && src.error) src = "";
    if (typeof src !== "string") src = String(src || "").trim();

    var productUrl = t.productUrl || t.url || "";
    if (productUrl && typeof productUrl === "object" && productUrl.error) {
      productUrl = "";
    }
    productUrl = String(productUrl || "").trim();

    var title = (t.title != null ? String(t.title) : "—").trim() || "—";
    var previewOnly = !!t.previewOnly || !src;

    return {
      title: title,
      src: src,
      productUrl: productUrl,
      previewOnly: previewOnly,
    };
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

  function initMozarfRelease(root) {
    if (!root) return;

    var cfgEl = root.querySelector("[data-mozarf-config]");
    if (!cfgEl) return;

    var audio = root.querySelector(".mozarf-audio");
    var playerBar = root.querySelector(".mozarf-player-bar");
    var tracklistEl = root.querySelector(".mozarf-tracklist");
    var playerTitle = root.querySelector(".mozarf-player-title");
    var playerArtist = root.querySelector(".mozarf-player-artist");
    var playerThumb = root.querySelector(".mozarf-player-thumb");
    var scrubTrack = root.querySelector(".mozarf-scrub");
    var scrubFill = root.querySelector(".mozarf-scrub-fill");
    var timeCurrent = root.querySelector(".mozarf-time-current");
    var timeTotal = root.querySelector(".mozarf-time-total");
    var volRange = root.querySelector(".mozarf-vol-range");
    var btnToggle = root.querySelector(".mozarf-js-toggle-play");
    var btnPrev = root.querySelector(".mozarf-js-prev");
    var btnNext = root.querySelector(".mozarf-js-next");
    var btnMute = root.querySelector(".mozarf-js-mute");
    var btnPlayAll = root.querySelector(".mozarf-js-play-all");

    if (!audio || !playerBar || !tracklistEl || !scrubTrack || !scrubFill) return;

    if (root.getAttribute("data-mozarf-bound") === "true") {
      if (typeof root._mozarfReloadFromScript === "function") {
        root._mozarfReloadFromScript();
      }
      return;
    }

    var state = {
      artist: "",
      cover: "",
      tracks: [],
      currentIndex: -1,
    };
    var isDraggingScrub = false;

    function readCfgFromScript() {
      var text = cfgEl.textContent.trim();
      if (!text) return null;
      try {
        return JSON.parse(text);
      } catch (e) {
        return null;
      }
    }

    function persistCfgToScript() {
      cfgEl.textContent = JSON.stringify({
        artist: state.artist,
        cover: state.cover,
        tracks: state.tracks,
      });
    }

    function applyCfgObject(cfg) {
      if (!cfg) return;
      state.artist = cfg.artist || "";
      state.cover = normalizeCoverUrl(cfg.cover || "");
      state.tracks = normalizeTracks(cfg.tracks);
      state.currentIndex = -1;
      audio.pause();
      audio.src = "";
      persistCfgToScript();
    }

    function updateHeroFromAlbum(album) {
      if (!album) return;
      var titleEl = root.querySelector(".hero__meta .title");
      var artistEl = root.querySelector(".hero__meta .artist");
      var heroImg = root.querySelector(".hero__art img");
      if (titleEl && album.title) titleEl.textContent = album.title;
      if (artistEl && album.artist) artistEl.textContent = album.artist;
      if (heroImg && album.cover) {
        heroImg.src = normalizeCoverUrl(album.cover);
        heroImg.alt = album.title || "";
      }
    }

    function applyAlbumFromCard(album) {
      if (!album || typeof album !== "object") return;
      state.artist = album.artist || "";
      state.cover = normalizeCoverUrl(album.cover || "");
      state.tracks = normalizeTracks(album.tracks);
      state.currentIndex = -1;
      audio.pause();
      audio.src = "";
      persistCfgToScript();
      updateHeroFromAlbum(album);
      if (playerArtist) playerArtist.textContent = state.artist;
      if (playerThumb && state.cover) {
        playerThumb.src = state.cover;
        playerThumb.alt = album.title || "";
      }
      buildTracklist();
      playerBar.classList.add("is-paused");
      highlightRow(-1);
      updateScrub();
    }

    root._mozarfReloadFromScript = function () {
      var c = readCfgFromScript();
      if (c) applyCfgObject(c);
      if (playerArtist) playerArtist.textContent = state.artist;
      if (playerThumb && state.cover) {
        playerThumb.src = state.cover;
        playerThumb.removeAttribute("alt");
      }
      buildTracklist();
      playerBar.classList.add("is-paused");
      highlightRow(-1);
      updateScrub();
    };

    root._mozarfApplyAlbum = applyAlbumFromCard;

    function showPlayer() {
      playerBar.classList.add("is-visible");
      playerBar.setAttribute("aria-hidden", "false");
    }

    function setBarPlaying(playing) {
      playerBar.classList.toggle("is-paused", !playing);
    }

    function highlightRow(index) {
      tracklistEl.querySelectorAll(".track-row").forEach(function (row, i) {
        row.classList.toggle("is-active", i === index);
      });
    }

    function loadTrack(index) {
      if (index < 0 || index >= state.tracks.length) return;
      var t = state.tracks[index];
      if (t.previewOnly) return;

      state.currentIndex = index;
      audio.src = t.src;
      if (playerTitle) playerTitle.textContent = t.title;
      if (playerArtist) playerArtist.textContent = state.artist;
      if (playerThumb && state.cover) {
        playerThumb.src = state.cover;
        playerThumb.alt = t.title;
      }
      highlightRow(index);
      showPlayer();
      setBarPlaying(false);
    }

    function playIndex(index) {
      if (index < 0 || index >= state.tracks.length) return;
      if (state.tracks[index].previewOnly) return;

      if (state.currentIndex !== index) {
        loadTrack(index);
        audio.play().catch(function () {});
      } else {
        audio.play().catch(function () {});
      }
    }

    function togglePlay() {
      if (state.currentIndex < 0 && state.tracks.length) {
        var first = state.tracks.findIndex(function (t) {
          return !t.previewOnly;
        });
        if (first >= 0) playIndex(first);
        return;
      }
      if (audio.paused) {
        audio.play().catch(function () {});
      } else {
        audio.pause();
      }
    }

    function nextTrack() {
      for (var i = state.currentIndex + 1; i < state.tracks.length; i++) {
        if (!state.tracks[i].previewOnly) {
          loadTrack(i);
          audio.play().catch(function () {});
          return;
        }
      }
    }

    function prevTrack() {
      if (audio.currentTime > 2.5) {
        audio.currentTime = 0;
        return;
      }
      for (var i = state.currentIndex - 1; i >= 0; i--) {
        if (!state.tracks[i].previewOnly) {
          loadTrack(i);
          audio.play().catch(function () {});
          return;
        }
      }
    }

    function buildTracklist() {
      tracklistEl.innerHTML = "";
      state.tracks.forEach(function (t, i) {
        var li = document.createElement("li");
        li.className = "track-row" + (t.previewOnly ? " is-locked" : "");
        var buyUrl = t.productUrl || "";
        li.innerHTML =
          '<span class="track-num">' +
          (i + 1) +
          '</span><span class="track-name">' +
          escapeHtml(t.title) +
          '</span><span class="track-dur" data-dur></span>' +
          (buyUrl
            ? '<a class="track-buy" href="' +
              String(buyUrl).replace(/"/g, "") +
              '" target="_blank" rel="noopener" onclick="event.stopPropagation()">Acheter</a>'
            : "") +
          '<button type="button" class="track-play" aria-label="Lire ' +
          escapeHtml(t.title) +
          '"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7L8 5z"/></svg></button>';

        var btn = li.querySelector(".track-play");
        var durEl = li.querySelector("[data-dur]");

        if (t.previewOnly) {
          btn.disabled = true;
          btn.setAttribute("aria-label", "Débloqué après achat");
          durEl.textContent = "—";
        } else {
          btn.addEventListener("click", function () {
            if (state.currentIndex === i && !audio.paused) {
              audio.pause();
            } else {
              playIndex(i);
            }
          });
          preloadDuration(t.src, function (sec) {
            durEl.textContent = formatTime(sec);
          });
        }
        tracklistEl.appendChild(li);
      });
    }

    function preloadDuration(src, cb) {
      if (!src) {
        cb(0);
        return;
      }
      var a = document.createElement("audio");
      a.preload = "metadata";
      a.addEventListener("loadedmetadata", function () {
        cb(a.duration || 0);
        a.src = "";
      });
      a.addEventListener("error", function () {
        cb(0);
      });
      a.src = src;
    }

    function updateScrub() {
      var d = audio.duration;
      var p = audio.currentTime;
      if (!isFinite(d) || d <= 0) {
        scrubFill.style.width = "0%";
        if (timeTotal) timeTotal.textContent = "0:00";
      } else {
        scrubFill.style.width = (p / d) * 100 + "%";
        if (timeTotal) timeTotal.textContent = formatTime(d);
      }
      if (timeCurrent) timeCurrent.textContent = formatTime(p);
      var pct = isFinite(d) && d > 0 ? Math.round((p / d) * 100) : 0;
      scrubTrack.setAttribute("aria-valuenow", String(pct));
    }

    function seekFromClientX(clientX) {
      var rect = scrubTrack.getBoundingClientRect();
      var ratio = (clientX - rect.left) / rect.width;
      ratio = Math.max(0, Math.min(1, ratio));
      if (isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = ratio * audio.duration;
      }
    }

    var cfg0 = readCfgFromScript();
    if (cfg0) applyCfgObject(cfg0);

    root.setAttribute("data-mozarf-bound", "true");

    audio.addEventListener("play", function () {
      setBarPlaying(true);
    });
    audio.addEventListener("pause", function () {
      setBarPlaying(false);
    });
    audio.addEventListener("timeupdate", function () {
      if (!isDraggingScrub) updateScrub();
    });
    audio.addEventListener("loadedmetadata", updateScrub);
    audio.addEventListener("ended", function () {
      nextTrack();
    });

    if (btnToggle) btnToggle.addEventListener("click", togglePlay);
    if (btnPrev) btnPrev.addEventListener("click", prevTrack);
    if (btnNext) btnNext.addEventListener("click", nextTrack);

    if (btnPlayAll) {
      btnPlayAll.addEventListener("click", function () {
        var first = state.tracks.findIndex(function (t) {
          return !t.previewOnly;
        });
        if (first >= 0) playIndex(first);
      });
    }

    if (volRange) {
      var savedVol = localStorage.getItem("mozarf-vol");
      if (savedVol != null) {
        var v0 = parseFloat(savedVol);
        if (!isNaN(v0)) {
          volRange.value = String(v0);
          audio.volume = v0;
        }
      }
      volRange.addEventListener("input", function () {
        var v = parseFloat(volRange.value);
        audio.volume = v;
        audio.muted = v === 0;
        localStorage.setItem("mozarf-vol", String(v));
      });
    }

    if (btnMute) {
      btnMute.addEventListener("click", function () {
        audio.muted = !audio.muted;
      });
    }
    audio.addEventListener("volumechange", function () {
      if (volRange) volRange.value = String(audio.muted ? 0 : audio.volume);
    });

    scrubTrack.addEventListener("click", function (e) {
      seekFromClientX(e.clientX);
    });

    scrubTrack.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      var step =
        isFinite(audio.duration) && audio.duration > 0 ? audio.duration * 0.05 : 5;
      if (e.key === "ArrowLeft") {
        audio.currentTime = Math.max(0, audio.currentTime - step);
      } else {
        audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + step);
      }
    });

    var pointerDown = function (e) {
      isDraggingScrub = true;
      seekFromClientX(e.clientX);
    };
    scrubTrack.addEventListener("pointerdown", pointerDown);
    window.addEventListener("pointermove", scMove);
    window.addEventListener("pointerup", scUp);

    function scMove(e) {
      if (isDraggingScrub) seekFromClientX(e.clientX);
    }
    function scUp() {
      if (isDraggingScrub) {
        isDraggingScrub = false;
        updateScrub();
      }
    }

    buildTracklist();
    playerBar.classList.add("is-paused");
    root.setAttribute("data-mozarf-initialized", "true");
  }

  function boot() {
    document.querySelectorAll("[data-mozarf-root]").forEach(initMozarfRelease);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.MozarfReleaseInit = initMozarfRelease;
})(window, document);

document.addEventListener("click", function (e) {
  var btn = e.target.closest(".mozarf-js-open-player");
  if (!btn) return;

  var wrap = btn.closest("[data-mozarf-album]");
  var raw = wrap && wrap.getAttribute("data-mozarf-album");
  var player =
    document.querySelector(".mozarf-release-player") ||
    document.querySelector("[data-mozarf-root]");

  if (player && raw) {
    try {
      var album = JSON.parse(raw);
      if (typeof player._mozarfApplyAlbum === "function") {
        player._mozarfApplyAlbum(album);
      }
    } catch (err) {
      /* ignore invalid JSON */
    }
  }

  if (player) {
    player.classList.add("mozarf-player--active");
    player.scrollIntoView({ behavior: "smooth", block: "end" });
  }
});
