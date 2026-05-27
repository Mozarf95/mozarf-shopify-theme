(function () {
  "use strict";

  var PREVIEW_SEC = 30;

  function qs(root, sel) {
    return (root || document).querySelector(sel);
  }

  function qsa(root, sel) {
    return [].slice.call((root || document).querySelectorAll(sel));
  }

  function formatTime(s) {
    if (!isFinite(s) || s < 0) return "0:00";
    var m = Math.floor(s / 60);
    var sec = Math.floor(s % 60);
    return m + ":" + (sec < 10 ? "0" : "") + sec;
  }

  function readAlbumJsonFromButton(btn) {
    var id = btn.getAttribute("data-album-json-id");
    if (id) {
      var el = document.getElementById(id);
      if (el && el.textContent) return el.textContent.trim();
    }
    var attr = btn.getAttribute("data-album-json");
    return attr ? attr.trim() : "";
  }

  function unwrapAlbumPayload(o) {
    if (!o || typeof o !== "object" || !o.album) return o;
    var core = o.album;
    if (typeof core === "string") {
      try {
        core = JSON.parse(core);
      } catch (e) {
        return o;
      }
    }
    return Object.assign({}, core, {
      productPageUrl: o.product_url,
      product_url: o.product_url,
      title: (core && core.title) || o.product_title,
      artist: o.vendor || (core && core.artist),
      featured_image: (core && core.featured_image) || o.cover_shopify,
      cover: (core && core.featured_image) || o.cover_shopify,
    });
  }

  function MozarfMarketplace(root) {
    this.root = root;
    this.modal = qs(root, ".mozarf-mp-modal");
    this.audio = this.modal ? qs(this.modal, ".mozarf-mp-modal__audio") : null;
    this.barFill = this.modal ? qs(this.modal, ".mozarf-mp-player__bar-fill") : null;
    this.timeEl = this.modal ? qs(this.modal, ".mozarf-mp-player__time") : null;
    this.mainPlay = this.modal ? qs(this.modal, ".mozarf-mp-player__main-toggle") : null;
    this.currentTrackIndex = -1;
    this.data = null;
    this.previewLimitSec = PREVIEW_SEC;

    var lim = root.getAttribute("data-preview-seconds");
    if (lim) {
      var n = parseInt(lim, 10);
      if (!isNaN(n) && n > 0) this.previewLimitSec = n;
    }

    this.bind();
  }

  MozarfMarketplace.prototype.isInline = function () {
    return this.modal && this.modal.classList.contains("mozarf-mp-modal--inline");
  };

  MozarfMarketplace.prototype.bind = function () {
    var self = this;

    qsa(this.root, "[data-mozarf-open-album]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var text = readAlbumJsonFromButton(btn);
        if (!text) return;
        try {
          var raw = JSON.parse(text);
          var data = unwrapAlbumPayload(raw);
          if (typeof window.mozarfOpenAlbumInStickyPlayer === "function") {
            window.mozarfOpenAlbumInStickyPlayer(data, btn);
            return;
          }
          self.open(data);
        } catch (err) {
          if (typeof console !== "undefined" && console.warn) {
            console.warn("Mozarf marketplace: JSON album invalide", err);
          }
        }
      });
    });

    if (this.modal && !this.isInline()) {
      var closeBtn = qs(this.modal, ".mozarf-mp-modal__close");
      if (closeBtn) {
        closeBtn.addEventListener("click", function () {
          self.close();
        });
      }
      var backdrop = this.modal.querySelector(".mozarf-mp-modal__backdrop");
      if (backdrop) {
        backdrop.addEventListener("click", function () {
          self.close();
        });
      }
    }

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && self.modal && self.modal.classList.contains("is-open") && !self.isInline()) {
        self.close();
      }
    });

    if (this.audio) {
      this.audio.addEventListener("timeupdate", function () {
        self.onTimeUpdate();
      });
      this.audio.addEventListener("ended", function () {
        self.setMainPlaying(false);
      });
    }

    if (this.mainPlay) {
      this.mainPlay.addEventListener("click", function () {
        self.toggleMain();
      });
    }

    var bar = this.modal ? qs(this.modal, ".mozarf-mp-player__bar") : null;
    if (bar) {
      bar.addEventListener("click", function (e) {
        if (!self.audio || !self.audio.duration) return;
        var r = bar.getBoundingClientRect();
        var ratio = (e.clientX - r.left) / r.width;
        self.audio.currentTime = Math.max(0, Math.min(1, ratio)) * self.audio.duration;
      });
    }
  };

  MozarfMarketplace.prototype.open = function (data) {
    if (!this.modal) return;
    this.data = data;
    this.modal.classList.add("is-open");
    if (!this.isInline()) {
      document.documentElement.style.overflow = "hidden";
    }

    var h = qs(this.modal, ".mozarf-mp-modal__h");
    if (h) h.textContent = data.title || "";
    var img = qs(this.modal, ".mozarf-mp-modal__art img");
    if (img && data.featured_image) {
      img.src = data.featured_image;
      img.alt = data.title || "";
    }

    var tracks = Array.isArray(data.tracks) ? data.tracks : [];
    var list = qs(this.modal, ".mozarf-mp-modal__tracklist");
    if (list) list.innerHTML = "";

    var self = this;
    tracks.forEach(function (track, index) {
      var row = document.createElement("div");
      row.className = "mozarf-mp-track";
      row.innerHTML =
        '<button type="button" class="mozarf-mp-track__play" data-idx="' +
        index +
        '" aria-label="Play">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></button>' +
        "<div><p class=\"mozarf-mp-track__title\"></p></div>" +
        '<div class="mozarf-mp-track__actions"></div>';
      row.querySelector(".mozarf-mp-track__title").textContent = track.title || "Track " + (index + 1);

      var actions = row.querySelector(".mozarf-mp-track__actions");
      var p = track.purchase || {};

      function addBtn(label, variantId, className) {
        if (!variantId) return;
        var b = document.createElement("button");
        b.type = "button";
        b.className = "mozarf-mp-btn" + (className ? " " + className : "");
        b.textContent = label;
        b.setAttribute("data-variant-id", String(variantId));
        b.addEventListener("click", function () {
          self.addToCart(variantId);
        });
        actions.appendChild(b);
      }

      addBtn("MP3", p.mp3_variant_id);
      addBtn("WAV", p.wav_variant_id);
      addBtn("Stems", p.stems_variant_id);
      addBtn("License", p.license_variant_id, "mozarf-mp-btn--primary");

      row.querySelector(".mozarf-mp-track__play").addEventListener("click", function () {
        self.playTrack(index);
      });

      if (list) list.appendChild(row);
    });

    var fullWrap = qs(this.modal, ".mozarf-mp-modal__full");
    if (fullWrap) {
      fullWrap.innerHTML = "";
      if (data.full_album_variant_id) {
        var fb = document.createElement("button");
        fb.type = "button";
        fb.className = "mozarf-mp-btn mozarf-mp-btn--primary";
        fb.textContent = data.full_album_label || "Full album";
        fb.addEventListener("click", function () {
          self.addToCart(data.full_album_variant_id);
        });
        fullWrap.appendChild(fb);
      }
    }

    var hintTracks = qs(this.modal, ".mozarf-mp-modal__hint--tracks");
    if (hintTracks) {
      hintTracks.style.display = tracks.length ? "none" : "block";
    }

    this.currentTrackIndex = -1;
    if (this.audio) {
      this.audio.pause();
      this.audio.src = "";
    }
    this.setMainPlaying(false);
    this.updateBar(0, 1);
    if (this.timeEl) this.timeEl.textContent = "0:00 / 0:00";
  };

  MozarfMarketplace.prototype.close = function () {
    if (!this.modal || this.isInline()) return;
    this.modal.classList.remove("is-open");
    document.documentElement.style.overflow = "";
    if (this.audio) {
      this.audio.pause();
      this.audio.src = "";
    }
    this.setMainPlaying(false);
  };

  MozarfMarketplace.prototype.playTrack = function (index) {
    if (!this.modal || !this.audio) return;
    var tracks = (this.data && this.data.tracks) || [];
    var t = tracks[index];
    if (!t || !t.preview_url) return;

    this.currentTrackIndex = index;
    this.audio.src = t.preview_url;
    this.audio.play().catch(function () {});

    qsa(this.modal, ".mozarf-mp-track__play").forEach(function (btn, i) {
      btn.classList.toggle("is-active", i === index);
    });
    this.setMainPlaying(true);
  };

  MozarfMarketplace.prototype.toggleMain = function () {
    if (!this.audio) return;
    if (!this.audio.src) {
      var tracks = (this.data && this.data.tracks) || [];
      if (tracks.length && tracks[0].preview_url) this.playTrack(0);
      return;
    }
    if (this.audio.paused) {
      this.audio.play().catch(function () {});
      this.setMainPlaying(true);
    } else {
      this.audio.pause();
      this.setMainPlaying(false);
    }
  };

  MozarfMarketplace.prototype.setMainPlaying = function (on) {
    if (!this.mainPlay) return;
    this.mainPlay.setAttribute("aria-label", on ? "Pause" : "Play");
    this.mainPlay.innerHTML = on
      ? '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
      : '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
  };

  MozarfMarketplace.prototype.onTimeUpdate = function () {
    if (!this.audio) return;
    var d = this.audio.duration;
    var c = this.audio.currentTime;
    if (this.previewLimitSec > 0 && c >= this.previewLimitSec) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.setMainPlaying(false);
      return;
    }
    if (this.timeEl) {
      var showD = isFinite(d) && d > 0 ? d : this.previewLimitSec;
      this.timeEl.textContent = formatTime(c) + " / " + formatTime(showD);
    }
    this.updateBar(c, isFinite(d) && d > 0 ? d : this.previewLimitSec || 1);
  };

  MozarfMarketplace.prototype.updateBar = function (cur, dur) {
    if (!this.barFill) return;
    var pct = dur > 0 ? (cur / dur) * 100 : 0;
    this.barFill.style.width = Math.min(100, pct) + "%";
  };

  MozarfMarketplace.prototype.addToCart = function (variantId) {
    var id = parseInt(String(variantId), 10);
    if (!id) return;
    fetch("/cart/add.js", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ id: id, quantity: 1 }] }),
    })
      .then(function (r) {
        if (!r.ok) throw new Error("cart");
        return r.json();
      })
      .then(function () {
        document.dispatchEvent(new CustomEvent("cart:refresh"));
        window.location.href = "/cart";
      })
      .catch(function () {
        window.location.href = "/cart/add?id=" + id + "&quantity=1";
      });
  };

  function boot() {
    qsa(document, "[data-mozarf-marketplace]").forEach(function (el) {
      var mp = new MozarfMarketplace(el);
      var inlineJson = qs(el, "script[data-mozarf-inline-album-json]");
      if (inlineJson && inlineJson.textContent) {
        try {
          var raw = JSON.parse(inlineJson.textContent.trim());
          var data = unwrapAlbumPayload(raw);
          if (typeof window.mozarfOpenAlbumInStickyPlayer === "function") {
            window.mozarfOpenAlbumInStickyPlayer(data, null);
          } else {
            mp.open(data);
          }
        } catch (e) {
          if (typeof console !== "undefined" && console.warn) {
            console.warn("Mozarf inline album JSON", e);
          }
        }
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
