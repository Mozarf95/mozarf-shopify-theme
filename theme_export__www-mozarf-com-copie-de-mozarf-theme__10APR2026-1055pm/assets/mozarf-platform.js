    function tr(idx, title, timeM, priceTrack, priceLic) {
      return { n: (idx < 10 ? "0" : "") + idx + " — " + title, t: timeM, tb: priceTrack, lb: priceLic };
    }

    function euro(n) {
      return n.toFixed(2).replace(".", ",") + "\u00a0€";
    }

    function audioUrl(basename) {
      if (!basename) return "";
      return "audio/" + encodeURIComponent(basename);
    }

    function getItemPreviewUrl(item) {
      if (!item) return "";
      if (item.previewFile) return audioUrl(item.previewFile);
      var ts = item.tracks || [];
      for (var i = 0; i < ts.length; i++) {
        if (ts[i].audioFile) return audioUrl(ts[i].audioFile);
      }
      return "";
    }

    function getItemPreviewLabel(item) {
      if (!item) return "";
      return item.artist + " — " + item.title;
    }

    function fmtAudioTime(sec) {
      if (!isFinite(sec) || sec < 0) return "0:00";
      var m = Math.floor(sec / 60);
      var s = Math.floor(sec % 60);
      return m + ":" + (s < 10 ? "0" : "") + s;
    }

    function initBuckcampAudio() {
      var a = document.getElementById("buckcamp-audio");
      var dock = document.getElementById("audio-dock");
      var dockPlay = document.getElementById("audio-dock-play");
      var dockTitle = document.getElementById("audio-dock-title");
      var dockTime = document.getElementById("audio-dock-time");
      var dockSeek = document.getElementById("audio-dock-seek");
      if (!a || !dock) return;

      function resetInlineButtons() {
        document
          .querySelectorAll(".track-play.is-playing, .card-play.is-playing, .drop-preview-play.is-playing")
          .forEach(function (b) {
            b.classList.remove("is-playing");
            b.textContent = "▶";
          });
      }

      function updateDockPlayState() {
        if (!dockPlay) return;
        var playing = Boolean(a.src) && !a.paused && !a.ended;
        dockPlay.textContent = playing ? "❚❚" : "▶";
        dockPlay.setAttribute("aria-label", playing ? "Pause" : "Lecture");
      }

      function showDock(v) {
        dock.classList.toggle("hidden", !v);
        document.body.classList.toggle("has-audio-dock", v);
      }

      function playPreview(url, label, btn) {
        if (!url) return;
        var loaded = a.dataset.loadedUrl === url;
        if (loaded && !a.paused) {
          a.pause();
          resetInlineButtons();
          updateDockPlayState();
          return;
        }
        if (loaded && a.paused) {
          var pr = a.play();
          if (pr && pr.catch) pr.catch(function () {});
          if (btn) {
            btn.classList.add("is-playing");
            btn.textContent = "❚❚";
          }
          updateDockPlayState();
          return;
        }
        resetInlineButtons();
        a.src = url;
        a.dataset.loadedUrl = url;
        var pg = a.play();
        if (pg && pg.catch) {
          pg.catch(function () {
            alert(
              "Lecture impossible. Si tu ouvres index.html en file://, certains navigateurs bloquent l’audio : sers la page avec un petit serveur (ex. cd platform-preview && python3 -m http.server 8080)."
            );
          });
        }
        if (btn) {
          btn.classList.add("is-playing");
          btn.textContent = "❚❚";
        }
        if (dockTitle) dockTitle.textContent = label || "Préécoute";
        showDock(true);
        updateDockPlayState();
      }

      window.buckcampPlayPreview = playPreview;

      a.addEventListener("timeupdate", function () {
        if (!dockTime || !dockSeek) return;
        var dur = a.duration;
        var cur = a.currentTime;
        dockTime.textContent = fmtAudioTime(cur) + " / " + fmtAudioTime(isFinite(dur) ? dur : 0);
        if (isFinite(dur) && dur > 0) {
          dockSeek.value = String(Math.min(1000, Math.floor((cur / dur) * 1000)));
        }
      });

      a.addEventListener("loadedmetadata", function () {
        updateDockPlayState();
        if (!dockTime) return;
        var dur = a.duration;
        var cur = a.currentTime;
        dockTime.textContent = fmtAudioTime(cur) + " / " + fmtAudioTime(isFinite(dur) ? dur : 0);
      });

      a.addEventListener("ended", function () {
        resetInlineButtons();
        updateDockPlayState();
        if (dockSeek) dockSeek.value = "0";
      });

      a.addEventListener("pause", function () {
        resetInlineButtons();
        updateDockPlayState();
      });

      a.addEventListener("play", function () {
        updateDockPlayState();
      });

      if (dockSeek) {
        dockSeek.addEventListener("input", function () {
          var dur = a.duration;
          if (!isFinite(dur) || dur <= 0) return;
          var v = parseInt(dockSeek.value, 10) || 0;
          a.currentTime = (v / 1000) * dur;
        });
      }

      if (dockPlay) {
        dockPlay.addEventListener("click", function () {
          if (!a.src) return;
          if (a.paused) {
            var px = a.play();
            if (px && px.catch) px.catch(function () {});
          } else {
            a.pause();
          }
        });
      }
    }

    function buildTracks(names, times, tb, lb) {
      return names.map(function (name, i) {
        return tr(i + 1, name, times[i] || "2:30", tb, lb);
      });
    }

    var A1_NAMES = [
      "Warm up 140",
      "Stomp drill",
      "Circle groove A",
      "Circle groove B",
      "Elbow room",
      "Battle call",
      "Bridge tension",
      "Floor echo",
      "Speed kick",
      "Silent break",
      "Final round",
      "Outro sweat",
    ];
    var A1_TIMES = ["2:18", "2:34", "2:42", "2:31", "2:08", "2:55", "2:12", "2:47", "2:22", "3:01", "2:38", "2:51"];

    var A2_NAMES = [
      "Title round",
      "Counter round",
      "Elbow narrative",
      "Floor work",
      "Speed change",
      "Silent threat",
      "Chorus battle",
      "Final stance",
      "Victory lap",
      "Blood anthem",
      "Second wind",
      "King stance",
      "Underdog rise",
      "Champion cut",
      "Glory outro",
    ];
    var A2_TIMES = ["2:33", "2:18", "2:55", "2:40", "2:22", "3:08", "2:11", "2:49", "2:27", "3:02", "2:15", "2:51", "2:36", "2:44", "3:18"];

    var A3_NAMES = [
      "Blue hour",
      "Lobby",
      "Warm bodies",
      "First circle",
      "Elbow suite",
      "Bridge smoke",
      "Battle tide",
      "Silent room",
      "Peak sweat",
      "Cooldown",
      "Last stance",
      "Street echo",
      "Dawn cut",
      "Nightfall",
    ];
    var A3_TIMES = ["2:12", "2:45", "2:28", "2:51", "2:19", "3:05", "2:37", "2:08", "3:22", "2:33", "2:47", "2:14", "2:59", "2:41"];

    var GLORIA_NAMES = [
      "Imperi intro",
      "Outsiderz rise",
      "Ermont fog",
      "Tower pulse",
      "Illest anthem",
      "Indes shade",
      "Birth echo",
      "Fugue chase",
      "Krump TV cut",
      "Epps gate",
      "Urban bridge",
      "Gloria fin",
    ];
    var GLORIA_TIMES = ["2:22", "2:48", "2:15", "2:51", "2:33", "3:02", "2:27", "2:19", "2:44", "2:36", "2:58", "3:11"];

    var MAELSTROM_FILES = [
      "MOZARF - MAELSTRÖM - 01 SUPER VILAIN PARTY.mp3",
      "MOZARF - MAELSTRÖM - 02 MARCH SYMPHONYXXX.mp3",
      "MOZARF - MAELSTRÖM - 03 DECEPTION MUZIK.mp3",
      "MOZARF - MAELSTRÖM - 04 HYDRA GANG.mp3",
      "MOZARF - MAELSTRÖM - 05 FOCUS ON YOUR TARGET.mp3",
      "MOZARF - MAELSTRÖM - 06 ALPHA ZONA.mp3",
      "MOZARF - MAELSTRÖM - 07 HEALTH AND HOPE.mp3",
      "MOZARF - MAELSTRÖM - 08 CURIOUS THING.mp3",
      "MOZARF - MAELSTRÖM - 09 MEDIANT CYBER.mp3",
      "MOZARF - MAELSTRÖM - 10 PUSH.mp3",
    ];

    var MAELSTROM_TITLES = [
      "SUPER VILAIN PARTY",
      "MARCH SYMPHONYXXX",
      "DECEPTION MUZIK",
      "HYDRA GANG",
      "FOCUS ON YOUR TARGET",
      "ALPHA ZONA",
      "HEALTH AND HOPE",
      "CURIOUS THING",
      "MEDIANT CYBER",
      "PUSH",
    ];

    function buildMaelstromTracks() {
      return MAELSTROM_FILES.map(function (f, i) {
        var o = tr(i + 1, MAELSTROM_TITLES[i], "—", 3, 35);
        o.audioFile = f;
        return o;
      });
    }

    function gradientFromSeed(seed) {
      var g = [
        "linear-gradient(160deg, #1a1a1a 0%, #3a3a3a 50%, #0c0c0e 100%)",
        "linear-gradient(145deg, #1a0a12 0%, #4a2a30 50%, #0c0c0e 100%)",
        "linear-gradient(145deg, #1a0a0a 0%, #ff3d5c 40%, #2a1810 100%)",
        "linear-gradient(160deg, #0e1a12 0%, #e8ff4a 35%, #0c0c0e 100%)",
        "linear-gradient(135deg, #121820 0%, #4d8f82 50%, #ffc233 100%)",
        "linear-gradient(145deg, #2a1f08 0%, #ffc233 30%, #1a1510 100%)",
        "linear-gradient(125deg, #0c0c0e 0%, #ff3d5c 25%, #2a1040 90%)",
        "linear-gradient(220deg, #0a1628 0%, #4d8f82 40%, #0c0c0e 100%)",
      ];
      var h = 0;
      var s = String(seed);
      for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
      return g[h % g.length];
    }

    function mapShopifyProduct(p) {
      var price =
        typeof p.price_cents === "number"
          ? p.price_cents / 100
          : typeof p.price === "number"
            ? p.price
            : parseFloat(p.price) || 0;
      var lic = Math.round(price * 1.45 * 100) / 100;
      var tags = (p.tags || []).map(function (t) {
        return String(t).toLowerCase();
      });
      if (!tags.length) tags = ["album"];
      var pt = (p.product_type && String(p.product_type).toLowerCase()) || "";
      var isSingle = pt.indexOf("single") >= 0;
      var img = p.image || "";
      var desc = p.description_plain || p.description || "";
      if (desc.length > 520) desc = desc.slice(0, 517) + "…";
      var id = "shopify-" + String(p.id);
      var trackTitle = "01 — " + (p.title || "Release");
      return {
        id: id,
        shopifyId: p.id,
        handle: p.handle || "",
        type: isSingle ? "single" : "album",
        title: p.title || "Sans titre",
        artist: p.vendor || "MOZARF",
        price: price,
        priceFormatted: p.price_formatted || "",
        defaultTrackBuy: price,
        defaultLicenseBuy: lic,
        bpm: "—",
        key: "—",
        tags: tags,
        grad: gradientFromSeed(id),
        coverImage: img,
        desc: desc || "Release MOZARF.",
        license: "Conditions d’achat sur la boutique officielle.",
        released: p.published_at || "—",
        location: "—",
        supporters: 0,
        approxMinutes: null,
        formats: ["Téléchargement HD — WAV + MP3 320", "Streaming intégral"],
        credits: (p.title || "") + " — " + (p.vendor || "MOZARF"),
        about: desc,
        tracks: [{ n: trackTitle, t: "—", tb: price, lb: lic }],
        productUrl: p.url || "",
        fromShopify: true,
      };
    }

    /** Fenêtre drop homepage : mets à jour activeUntil (ISO) + albumId à chaque sortie (~7 jours). */
    var DROP_CAMPAIGN = {
      activeUntil: "2026-04-15T23:59:59",
      albumId: "gloria-imperi",
    };

    var DEMO_CATALOG = [
      {
        id: "gloria-imperi",
        type: "album",
        title: "Gloria Imperi",
        artist: "MOZARFMUZIK",
        price: 22,
        defaultTrackBuy: 2.75,
        defaultLicenseBuy: 32,
        bpm: "138–148",
        key: "—",
        tags: ["album", "krump", "cinéma"],
        grad: "linear-gradient(160deg, #1a1a1a 0%, #3a3a3a 50%, #0c0c0e 100%)",
        coverImage: "assets/gloria-imperi-cover.png",
        desc: "Album maquette BUCKCAMP — esthétique monochrome, tension cinématographique et énergie krump. Pochette officielle intégrée.",
        license: "Album numérique + licences par piste. 92 % au beatmaker après frais (objectif plateforme).",
        released: "8 avril 2026",
        location: "Paris, France",
        supporters: 428,
        approxMinutes: 33,
        formats: ["Sans DRM", "MP3 320 kbps", "FLAC", "WAV"],
        credits:
          "MOZARFMUZIK — Gloria Imperi\nProduction & direction artistique : Mozarf\nBUCKCAMP preview — artwork fourni par l’artiste",
        about:
          "Suite à la fenêtre « drop » sur l’accueil, cette fiche concentre tout le parcours d’achat type Bandcamp : release complète, piste par piste, licences, formats et partage.",
        tracks: buildTracks(GLORIA_NAMES, GLORIA_TIMES, 2.75, 32),
      },
      {
        id: "maelstrom",
        type: "album",
        title: "MAELSTROM",
        artist: "MOZARFMUZIK",
        price: 28,
        defaultTrackBuy: 3,
        defaultLicenseBuy: 35,
        bpm: "var.",
        key: "—",
        tags: ["album", "krump"],
        grad: "linear-gradient(145deg, #1a0a12 0%, #4a2a30 50%, #0c0c0e 100%)",
        desc: "10 titres — fichiers MP3 dans le dossier audio/. Préécoute réelle sur chaque piste et depuis la grille.",
        license: "Maquette BUCKCAMP — licences commerciales à définir.",
        released: "2025",
        location: "Paris, France",
        supporters: 0,
        approxMinutes: 38,
        formats: ["MP3 320 kbps", "Sans DRM"],
        credits: "MOZARFMUZIK — MAELSTROM\nAudio local : platform-preview/audio/",
        about: "Cet album est relié aux fichiers MP3 que tu as ajoutés. Tu peux remplacer les noms dans le script si tu changes de pack.",
        previewFile: MAELSTROM_FILES[0],
        tracks: buildMaelstromTracks(),
      },
      {
        id: "s1",
        type: "single",
        title: "IRON STOMP",
        artist: "CYPH K",
        price: 15,
        licensePrice: 48,
        bpm: 140,
        key: "Fm",
        tags: ["krump", "session"],
        grad: "linear-gradient(145deg, #1a0a0a 0%, #ff3d5c 40%, #2a1810 100%)",
        desc: "Kick lourd, silence tactique, drop pour battle. Single avec achat fichier + licence pro séparée.",
        license: "Achat standard = MP3 + WAV usage session / non commercial. Licence séparée = clip monétisé, pub, redistribution selon contrat.",
        released: "12 mars 2025",
        location: "Paris, France",
        supporters: 184,
        formats: ["Sans DRM", "MP3 320 kbps", "FLAC", "WAV"],
        credits:
          "Prod & mix : CYPH K\nMaster : maquette\nBPM : 140 · tonalité : Fm\nTous droits réservés — BUCKCAMP démo",
        about:
          "Pensé pour les rounds krump : respiration, impact, fin ouverte. La préécoute est factice sur cette maquette ; en prod chaque piste aura son flux audio.",
        tracks: [tr(1, "IRON STOMP", "2:47", 15, 48)],
      },
      {
        id: "s2",
        type: "single",
        title: "GLITCH KNEE",
        artist: "RAW SECTION",
        price: 12,
        licensePrice: 42,
        bpm: 145,
        key: "Dm",
        tags: ["krump", "expé"],
        grad: "linear-gradient(160deg, #0e1a12 0%, #e8ff4a 35%, #0c0c0e 100%)",
        desc: "Texture glitch + gros 808. Deux boutons par ligne : fichier seul vs licence commerciale.",
        license: "Fichier = usage perso / battle. Licence = droits étendus (à définir avec juriste).",
        released: "2 avril 2025",
        location: "Lyon, France",
        supporters: 96,
        formats: ["Sans DRM", "MP3 320 kbps", "FLAC"],
        credits: "RAW SECTION — expérimental session kit",
        about: "Single orienté texture ; la fiche reprend la logique Bandcamp : pochette, crédits, partage, liste de morceaux avec actions.",
        tracks: [tr(1, "GLITCH KNEE", "3:12", 12, 42)],
      },
      {
        id: "s3",
        type: "single",
        title: "HALL OF SWEAT",
        artist: "MOZARF",
        price: 18,
        licensePrice: 55,
        bpm: 138,
        key: "Gm",
        tags: ["krump", "anthem"],
        grad: "linear-gradient(135deg, #121820 0%, #4d8f82 50%, #ffc233 100%)",
        desc: "Ambiance salle, montée progressive. Même structure d’achat que les albums : piste à la carte.",
        license: "WAV + stems (fictif en maquette). Licence pro pour usages commerciaux.",
        released: "28 févr. 2025",
        location: "Bruxelles, Belgique",
        supporters: 241,
        formats: ["Sans DRM", "MP3 320 kbps", "FLAC", "WAV"],
        credits: "Mozarf — anthem live session energy",
        about: "Exemple de single producteur avec métadonnées type Bandcamp et double CTA par piste.",
        tracks: [tr(1, "HALL OF SWEAT", "2:58", 18, 55)],
      },
      {
        id: "a1",
        type: "album",
        title: "SESSION DÉBUTANT VOL.1",
        artist: "BEAT COLLECTIF",
        price: 35,
        defaultTrackBuy: 2.5,
        defaultLicenseBuy: 22,
        bpm: 140,
        key: "—",
        tags: ["pack", "débutant"],
        grad: "linear-gradient(145deg, #2a1f08 0%, #ffc233 30%, #1a1510 100%)",
        desc: "12 morceaux pour entrer dans le son krump : progressions, breaks, finales. Album complet ou achat à l’unité.",
        license: "Album : licence bundle session. Par piste : achat fichier ou licence commerciale indépendante.",
        released: "15 janv. 2025",
        location: "France",
        supporters: 512,
        approxMinutes: 31,
        formats: ["Sans DRM", "MP3 320 kbps", "FLAC", "WAV (bundle album)"],
        credits:
          "Collectif BUCKCAMP démo\n12 titres · BPM centrés 140\nArtwork : placeholder dégradé\nRemerciements : toutes les sessions test.",
        about:
          "Volume débutant : boucles stables, transitions lisibles, idéal pour apprendre les structures de round. Cette maquette montre une fiche complète façon Bandcamp : colonne d’achat, formats, partage, crédits, et piste par piste.",
        tracks: buildTracks(A1_NAMES, A1_TIMES, 2.5, 22),
      },
      {
        id: "a2",
        type: "album",
        title: "EXPERT — CHAMPIONSHIP KIT",
        artist: "CYPH K",
        price: 55,
        defaultTrackBuy: 3.5,
        defaultLicenseBuy: 35,
        bpm: "140–150",
        key: "—",
        tags: ["pack", "expert", "hot"],
        grad: "linear-gradient(125deg, #0c0c0e 0%, #ff3d5c 25%, #2a1040 90%)",
        desc: "15 morceaux, variations de BPM et de tension pour battles avancés. Prix piste / licence plus élevés.",
        license: "Extended & broadcast (texte à valider juridiquement). 92 % reversés au vendeur cible BUCKCAMP.",
        released: "3 avril 2025",
        location: "Paris, France",
        supporters: 1203,
        approxMinutes: 48,
        formats: ["Sans DRM", "MP3 320 kbps", "FLAC", "WAV", "Stems (option fictive)"],
        credits:
          "CYPH K — Championship Kit\n15 titres · BPM 140–150\nConçu pour finales et showcases\nBUCKCAMP maquette UI",
        about:
          "Kit expert : plus de variations, silences agressifs, sections pour elbow et footwork. L’interface reprend l’esprit place de marché + la clarté d’une fiche album Bandcamp.",
        tracks: buildTracks(A2_NAMES, A2_TIMES, 3.5, 35),
      },
      {
        id: "s4",
        type: "single",
        title: "CONCRETE SOUL",
        artist: "RAW SECTION",
        price: 15,
        licensePrice: 45,
        bpm: 142,
        key: "Am",
        tags: ["krump", "minimal"],
        grad: "linear-gradient(180deg, #1c1c1c 0%, #666 45%, #e8ff4a 100%)",
        desc: "Minimal, gros espace pour le corps. Double achat sur la même ligne.",
        license: "Lease standard (fictif) — détails au checkout réel.",
        released: "20 mars 2025",
        location: "Marseille, France",
        supporters: 67,
        formats: ["Sans DRM", "MP3 320 kbps", "FLAC"],
        credits: "RAW SECTION — minimal krump toolkit",
        about: "Une seule piste, deux boutons : fichier ou licence.",
        tracks: [tr(1, "CONCRETE SOUL", "3:05", 15, 45)],
      },
      {
        id: "a3",
        type: "album",
        title: "NIGHT SESSIONS",
        artist: "MOZARF",
        price: 42,
        defaultTrackBuy: 3,
        defaultLicenseBuy: 26,
        bpm: 144,
        key: "—",
        tags: ["album", "story"],
        grad: "linear-gradient(220deg, #0a1628 0%, #4d8f82 40%, #0c0c0e 100%)",
        desc: "14 morceaux, arc d’une soirée session jusqu’au matin. Narratif + achats granulaires.",
        license: "Album bundle + licences par titre pour usages commerciaux ciblés.",
        released: "8 avril 2025",
        location: "Europe",
        supporters: 389,
        approxMinutes: 38,
        formats: ["Sans DRM", "MP3 320 kbps", "FLAC", "WAV"],
        credits:
          "Mozarf — Night Sessions\n14 titres · histoire en une nuit de session\nBUCKCAMP preview",
        about:
          "De l’entrée salle au premier jour : progression nocturne. Chaque morceau est achetable seul avec sa propre licence.",
        tracks: buildTracks(A3_NAMES, A3_TIMES, 3, 26),
      },
    ];

    var CATALOG = window.__MOZARF_SHOPIFY_PRODUCTS__ && window.__MOZARF_SHOPIFY_PRODUCTS__.length
      ? window.__MOZARF_SHOPIFY_PRODUCTS__.map(mapShopifyProduct)
      : DEMO_CATALOG;

    (function () {
      var dropHandle = window.__MOZARF_DROP_HANDLE__;
      if (dropHandle && typeof DROP_CAMPAIGN !== "undefined") {
        var matchP = (window.__MOZARF_SHOPIFY_PRODUCTS__ || []).filter(function (p) {
          return p.handle === dropHandle;
        })[0];
        if (matchP) {
          DROP_CAMPAIGN.albumId = "shopify-" + String(matchP.id);
        }
      }

      var el = document.getElementById("stat-item-count");
      if (el) el.textContent = String(CATALOG.length);
    })();

    function esc(s) {
      var d = document.createElement("div");
      d.textContent = s;
      return d.innerHTML;
    }

    function renderCard(item) {
      var typeLabel = item.type === "album" ? "Album" : "Single";
      var tags = item.tags
        .map(function (t) {
          return '<span class="tag' + (t === "expert" || t === "hot" ? " hot" : "") + '">' + esc(t) + "</span>";
        })
        .join("");
      var trackLine =
        item.type === "album"
          ? '<p class="card-tracks-count">' + item.tracks.length + " titres · achat à l’unité</p>"
          : "";
      var artClass = "card-art" + (item.coverImage ? " card-art--photo" : "");
      var safeUrl = item.coverImage ? String(item.coverImage).replace(/[^a-zA-Z0-9\-_./]/g, "") : "";
      var artStyle = item.coverImage
        ? "background-color:#0a0a0a;background-image:linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.45)), url(" +
          safeUrl +
          ");background-size:contain;background-repeat:no-repeat;background-position:center;--grad:" +
          item.grad
        : "--grad:" + item.grad;
      return (
        '<article class="card" data-id="' +
        esc(item.id) +
        '">' +
        '<div class="' +
        artClass +
        '" style="' +
        artStyle +
        '">' +
        '<span class="card-type">' +
        typeLabel +
        "</span>" +
        (function () {
          var pv = getItemPreviewUrl(item);
          var playAttrs =
            pv !== ""
              ? ' data-preview-url="' + pv + '" data-preview-label="' + esc(getItemPreviewLabel(item)) + '"'
              : "";
          return '<button type="button" class="card-play" aria-label="Préécouter"' + playAttrs + ">▶</button>";
        })() +
        "</div>" +
        '<div class="card-body">' +
        '<h3 class="card-title">' +
        esc(item.title) +
        "</h3>" +
        '<p class="card-artist">' +
        esc(item.artist) +
        "</p>" +
        trackLine +
        '<div class="card-meta">' +
        tags +
        '<span class="tag">' +
        esc(String(item.bpm)) +
        " BPM</span>" +
        "</div>" +
        '<div class="card-price">' +
        esc(item.priceFormatted ? item.priceFormatted : euro(item.price)) +
        ' <small>TTC</small></div>' +
        "</div></article>"
      );
    }

    function filterCatalog(filter) {
      if (filter === "all") return CATALOG;
      return CATALOG.filter(function (x) {
        return x.type === filter;
      });
    }

    function renderGrid(filter) {
      var grid = document.getElementById("catalog-grid");
      var items = filterCatalog(filter);
      grid.innerHTML = items.map(renderCard).join("");
      grid.querySelectorAll(".card").forEach(function (el) {
        el.addEventListener("click", function (e) {
          var cp = e.target.closest(".card-play");
          if (cp) {
            e.stopPropagation();
            var url = cp.getAttribute("data-preview-url");
            if (url && window.buckcampPlayPreview) {
              window.buckcampPlayPreview(url, cp.getAttribute("data-preview-label") || "", cp);
            }
            return;
          }
          openDetail(el.getAttribute("data-id"));
        });
      });
    }

    function trackPriceBuy(tr, item) {
      if (tr.tb != null) return tr.tb;
      if (item.defaultTrackBuy != null) return item.defaultTrackBuy;
      return item.price;
    }

    function trackPriceLic(tr, item) {
      if (tr.lb != null) return tr.lb;
      if (item.defaultLicenseBuy != null) return item.defaultLicenseBuy;
      return item.licensePrice != null ? item.licensePrice : 32;
    }

    function buildDetailHTML(item) {
      var typeLabel = item.type === "album" ? "Album" : "Single";
      var totalTracks = item.tracks.length;
      var approx = item.approxMinutes ? " · ~" + item.approxMinutes + " min" : "";
      var tracksHtml = item.tracks
        .map(function (tr) {
          var buyP = euro(trackPriceBuy(tr, item));
          var licP = euro(trackPriceLic(tr, item));
          var buyMsg = "Acheter la piste : " + tr.n + " (" + buyP + " TTC)";
          var licMsg = "Acheter la licence : " + tr.n + " (" + licP + ") — contrat PDF en production.";
          var au = tr.audioFile ? audioUrl(tr.audioFile) : "";
          var audAttr =
            au !== ""
              ? ' data-preview-url="' + au + '" data-preview-label="' + esc(item.title + " — " + tr.n) + '"'
              : "";
          return (
            '<div class="track-row">' +
            '<div class="track-row-main">' +
            '<button type="button" class="track-play" aria-label="Préécouter"' +
            audAttr +
            ">▶</button>" +
            '<span class="track-name">' +
            esc(tr.n) +
            '</span><span class="track-time">' +
            esc(tr.t) +
            "</span></div>" +
            '<div class="track-row-actions">' +
            (item.productUrl
              ? '<a class="btn-track-buy" href="' + esc(item.productUrl) + '">Acheter · ' + buyP + "</a>"
              : '<button type="button" class="btn-track-buy" data-demo-buy="' +
                esc(buyMsg) +
                '">Acheter · ' +
                buyP +
                "</button>") +
            (item.productUrl
              ? '<a class="btn-track-lic" href="' + esc(item.productUrl) + '">Page produit · ' + licP + "</a>"
              : '<button type="button" class="btn-track-lic" data-demo-buy="' +
                esc(licMsg) +
                '">Licence · ' +
                licP +
                "</button>") +
            "</div></div>"
          );
        })
        .join("");

      var formats = item.formats || ["Sans DRM", "MP3 320 kbps", "FLAC"];
      var formatsHtml = formats.map(function (f) {
        return "<li>" + esc(f) + "</li>";
      }).join("");

      var albumBuyMsg = "Acheter la release : " + item.title + " (" + euro(item.price) + " TTC, maquette)";
      var wishMsg = "Liste de souhaits (démo) : " + item.title;
      var packLicMsg =
        "Pack licences album : " +
        item.title +
        " — devis / contrat global (fictif). En prod : somme ou négociation par catalogue.";

      var others = CATALOG.filter(function (x) {
        return x.artist === item.artist && x.id !== item.id;
      }).slice(0, 4);
      var moreHtml = others
        .map(function (x) {
          return (
            '<div class="bc-more-card" data-more-id="' +
            esc(x.id) +
            '" role="button" tabindex="0"><div class="bc-more-art" style="background:' +
            x.grad +
            '"></div><p>' +
            esc(x.title) +
            "</p></div>"
          );
        })
        .join("");

      var moreSection =
        moreHtml.length > 0
          ? '<section class="bc-section"><h4>Plus de ' +
            esc(item.artist) +
            '</h4><div class="bc-more-grid">' +
            moreHtml +
            "</div></section>"
          : "";

      var coverSafe = item.coverImage ? String(item.coverImage).replace(/[^a-zA-Z0-9\-_./]/g, "") : "";
      var sideArt = item.coverImage
        ? '<div class="bc-side-art bc-side-art--img"><img src="' +
          coverSafe +
          '" alt="' +
          esc(item.title + " — pochette") +
          '" /></div>'
        : '<div class="bc-side-art" style="background:' + item.grad + '"></div>';

      var firstAud = null;
      for (var ti = 0; ti < item.tracks.length; ti++) {
        if (item.tracks[ti].audioFile) {
          firstAud = item.tracks[ti];
          break;
        }
      }
      var playAllBtn = firstAud
        ? '<button type="button" class="btn btn-ghost" data-preview-url="' +
          audioUrl(firstAud.audioFile) +
          '" data-preview-label="' +
          esc(item.title + " — " + firstAud.n) +
          '">▶ Préécouter (1re piste)</button>'
        : item.productUrl
        ? '<a class="btn btn-ghost" href="' + esc(item.productUrl) + '">▶ Écouter / acheter sur la boutique</a>'
        : '<button type="button" class="btn btn-ghost" data-demo-buy="' +
          esc("Aucun fichier audio lié à cette release dans audio/.") +
          '">▶ Préécouter tout</button>';

      return (
        '<div class="bc-grid">' +
        '<aside class="bc-aside">' +
        sideArt +
        '<div class="bc-side-panel">' +
        '<div class="detail-price">' +
        esc(item.priceFormatted ? item.priceFormatted : euro(item.price)) +
        "</div>" +
        '<p class="bc-price-hint">Release numérique — objectif 92&nbsp;% pour le beatmaker après frais (BUCKCAMP).</p>' +
        '<div class="bc-side-actions">' +
        (item.productUrl
          ? '<a class="btn btn-hot" href="' + esc(item.productUrl) + '">Acheter la release</a>'
          : '<button type="button" class="btn btn-hot" data-demo-buy="' +
            esc(albumBuyMsg) +
            '">Acheter la release</button>') +
        (item.productUrl
          ? '<a class="btn btn-accent" href="' + esc(item.productUrl) + '">Options & formats (Shopify)</a>'
          : '<button type="button" class="btn btn-accent" data-demo-buy="' +
            esc(packLicMsg) +
            '">Pack licences (album)</button>') +
        (item.productUrl
          ? '<a class="btn btn-ghost" href="' + esc(item.productUrl) + '">♥ Fiche produit</a>'
          : '<button type="button" class="btn btn-ghost" data-demo-buy="' +
            esc(wishMsg) +
            '">♥ Liste de souhaits</button>') +
        playAllBtn +
        "</div>" +
        '<div class="bc-divider"></div>' +
        '<div class="bc-share">' +
        "<span>Partager</span>" +
        '<button type="button" class="btn-micro" data-demo-buy="' +
        esc("Lien public copié (fictif) : " + item.title) +
        '">Copier lien</button>' +
        '<button type="button" class="btn-micro" data-demo-buy="' +
        esc("Code embed — iframe player à générer en prod.") +
        '">Embed</button></div>' +
        "<ul class=\"bc-formats\">" +
        formatsHtml +
        "</ul>" +
        '<dl class="bc-meta-grid">' +
        "<dt>Sortie</dt><dd>" +
        esc(item.released || "—") +
        "</dd>" +
        "<dt>Lieu</dt><dd>" +
        esc(item.location || "—") +
        "</dd>" +
        "<dt>Contient</dt><dd>" +
        totalTracks +
        " morceau" +
        (totalTracks > 1 ? "x" : "") +
        approx +
        "</dd></dl>" +
        (item.fromShopify
          ? ""
          : '<p class="bc-fans">' +
            (item.supporters != null ? item.supporters : 0) +
            " soutiens sur cette release (démo)</p>") +
        "</div></aside>" +
        '<div class="bc-body">' +
        '<p class="detail-type">' +
        esc(typeLabel) +
        " · " +
        esc(String(item.bpm)) +
        " BPM · tonalité " +
        esc(item.key) +
        "</p>" +
        "<h1>" +
        esc(item.title) +
        "</h1>" +
        '<p class="detail-artist">par <a href="#">' +
        esc(item.artist) +
        "</a></p>" +
        '<div class="bc-tags-row">' +
        item.tags
          .map(function (t) {
            return '<span class="tag">' + esc(t) + "</span>";
          })
          .join("") +
        "</div>" +
        '<p class="bc-lead">' +
        esc(item.desc) +
        "</p>" +
        '<p class="detail-license" style="margin-bottom:1rem"><strong>Licence (release) :</strong> ' +
        esc(item.license) +
        "</p>" +
        '<div class="tracklist-bc">' +
        '<div class="tracklist-bc-top"><h3>Écoute &amp; achat par morceau</h3><p>' +
        totalTracks +
        " titres — chaque ligne : <strong>Acheter</strong> (fichier) ou <strong>Licence</strong> (usage commercial selon contrat).</p></div>" +
        tracksHtml +
        "</div>" +
        '<section class="bc-section"><h4>À propos</h4><p>' +
        esc(item.about || item.desc) +
        "</p></section>" +
        '<section class="bc-section"><h4>Crédits &amp; fiche technique</h4>' +
        '<pre class="bc-credits-pre">' +
        esc(item.credits || "—") +
        "</pre></section>" +
        moreSection +
        "</div></div>"
      );
    }

    function openDetail(id) {
      var item = CATALOG.filter(function (x) {
        return x.id === id;
      })[0];
      if (!item) return;
      document.getElementById("detail-root").innerHTML = buildDetailHTML(item);
      showView("detail");
      window.scrollTo(0, 0);
    }

    document.getElementById("detail-root").addEventListener("click", function (e) {
      var prev = e.target.closest("[data-preview-url]");
      if (prev && prev.getAttribute("data-preview-url")) {
        e.preventDefault();
        e.stopPropagation();
        if (window.buckcampPlayPreview) {
          window.buckcampPlayPreview(
            prev.getAttribute("data-preview-url"),
            prev.getAttribute("data-preview-label") || "",
            prev
          );
        }
        return;
      }
      var demo = e.target.closest("[data-demo-buy]");
      if (demo) {
        e.preventDefault();
        var msg = demo.getAttribute("data-demo-buy") || "";
        alert("BUCKCAMP (démo)\n\n" + msg + "\n\n→ Checkout, panier et compte utilisateur à brancher (ex. Stripe + API).");
        return;
      }
      var more = e.target.closest(".bc-more-card");
      if (more) {
        var mid = more.getAttribute("data-more-id");
        if (mid) openDetail(mid);
      }
    });

    document.getElementById("detail-root").addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var more = e.target.closest(".bc-more-card");
      if (more) {
        e.preventDefault();
        var mid = more.getAttribute("data-more-id");
        if (mid) openDetail(mid);
      }
    });

    var STORAGE_KEY = "buckcamp_demo_session";

    function showView(name) {
      document.getElementById("view-home").classList.toggle("is-active", name === "home");
      document.getElementById("view-detail").classList.toggle("is-active", name === "detail");
      document.getElementById("view-login").classList.toggle("is-active", name === "login");
    }

    function goHome() {
      showView("home");
      window.scrollTo(0, 0);
    }

    function getSession() {
      try {
        var raw = sessionStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    }

    function setSession(email) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ email: email, at: Date.now() }));
    }

    function clearSession() {
      sessionStorage.removeItem(STORAGE_KEY);
    }

    function updateAuthHeader() {
      if (window.__MOZARF_SHOPIFY_STORE__) return;
      var s = getSession();
      var pill = document.getElementById("user-pill");
      var btnIn = document.getElementById("btn-connexion");
      var btnOut = document.getElementById("btn-logout");
      if (s && s.email) {
        if (pill) {
          pill.textContent = s.email.split("@")[0] || "connecté";
          pill.classList.remove("hidden");
        }
        if (btnIn && btnIn.tagName === "BUTTON") btnIn.classList.add("hidden");
        if (btnOut && btnOut.tagName === "BUTTON") btnOut.classList.remove("hidden");
      } else {
        if (pill) pill.classList.add("hidden");
        if (btnIn && btnIn.tagName === "BUTTON") btnIn.classList.remove("hidden");
        if (btnOut && btnOut.tagName === "BUTTON") btnOut.classList.add("hidden");
      }
    }

    function resetLoginFormUI() {
      var form = document.getElementById("login-form");
      var ok = document.getElementById("login-success");
      var load = document.getElementById("login-loading");
      ok.classList.remove("is-visible");
      load.classList.remove("is-visible");
      form.classList.remove("auth-form-disabled");
      document.querySelectorAll("#steps-list li").forEach(function (li, i) {
        li.classList.toggle("is-next", i === 0);
      });
    }

    function applyLoggedStepsState() {
      document.querySelectorAll("#steps-list li").forEach(function (li, i) {
        li.classList.toggle("is-next", i === 1);
      });
    }

    var btnBack = document.getElementById("btn-back");
    if (btnBack) btnBack.addEventListener("click", goHome);
    var btnBackLogin = document.getElementById("btn-back-login");
    if (btnBackLogin) btnBackLogin.addEventListener("click", goHome);
    var logoHome = document.getElementById("logo-home");
    if (logoHome) {
      logoHome.addEventListener("click", function (e) {
        e.preventDefault();
        goHome();
      });
    }

    function openLoginView() {
      resetLoginFormUI();
      if (getSession()) {
        document.getElementById("login-success").classList.add("is-visible");
        applyLoggedStepsState();
      }
      showView("login");
      window.scrollTo(0, 0);
    }

    var btnConnexion = document.getElementById("btn-connexion");
    if (btnConnexion && btnConnexion.tagName === "BUTTON") btnConnexion.addEventListener("click", openLoginView);
    var userPill = document.getElementById("user-pill");
    if (userPill && userPill.tagName === "SPAN") userPill.addEventListener("click", openLoginView);

    var btnLogout = document.getElementById("btn-logout");
    if (btnLogout && btnLogout.tagName === "BUTTON") {
      btnLogout.addEventListener("click", function () {
        clearSession();
        updateAuthHeader();
        resetLoginFormUI();
        goHome();
      });
    }

    var loginForm = document.getElementById("login-form");
    if (loginForm) loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = document.getElementById("login-email").value.trim() || "demo@buckcamp.local";
      var form = document.getElementById("login-form");
      var load = document.getElementById("login-loading");
      var ok = document.getElementById("login-success");
      load.classList.add("is-visible");
      form.classList.add("auth-form-disabled");
      setTimeout(function () {
        load.classList.remove("is-visible");
        setSession(email);
        updateAuthHeader();
        ok.classList.add("is-visible");
        applyLoggedStepsState();
        form.classList.remove("auth-form-disabled");
      }, 900);
    });

    var linkSignup = document.getElementById("link-signup");
    if (linkSignup) {
      linkSignup.addEventListener("click", function (e) {
        var href = linkSignup.getAttribute("href");
        if (href && href !== "#" && href.indexOf("javascript:") !== 0) return;
        e.preventDefault();
        var sl = document.getElementById("steps-list");
        if (sl) sl.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }

    updateAuthHeader();

    document.querySelectorAll(".chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        document.querySelectorAll(".chip").forEach(function (c) {
          c.classList.remove("is-on");
        });
        chip.classList.add("is-on");
        renderGrid(chip.getAttribute("data-filter"));
      });
    });

    var searchInput = document.getElementById("search-input");
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        var q = this.value.trim().toLowerCase();
        var grid = document.getElementById("catalog-grid");
        if (!q) {
          var active = document.querySelector(".chip.is-on");
          renderGrid(active ? active.getAttribute("data-filter") : "all");
          return;
        }
        var filtered = CATALOG.filter(function (item) {
          var blob = (item.title + " " + item.artist + " " + item.tags.join(" ")).toLowerCase();
          return blob.indexOf(q) >= 0;
        });
        grid.innerHTML = filtered.map(renderCard).join("");
        grid.querySelectorAll(".card").forEach(function (el) {
          el.addEventListener("click", function (e) {
            var cp = e.target.closest(".card-play");
            if (cp) {
              e.stopPropagation();
              var url = cp.getAttribute("data-preview-url");
              if (url && window.buckcampPlayPreview) {
                window.buckcampPlayPreview(url, cp.getAttribute("data-preview-label") || "", cp);
              }
              return;
            }
            openDetail(el.getAttribute("data-id"));
          });
        });
      });
    }

    function initDropCampaign() {
      var root = document.getElementById("mozarf-platform-root");
      if (root && root.getAttribute("data-skip-drop-campaign") === "true") return;

      var until = window.__MOZARF_DROP_ACTIVE_UNTIL__ || DROP_CAMPAIGN.activeUntil;
      var end = new Date(until);
      var dropEl = document.getElementById("drop-hero");
      var stdEl = document.getElementById("standard-hero");
      var pageBg = document.getElementById("drop-page-bg-root");
      if (!dropEl || !stdEl) return;

      function onDropScroll() {
        if (!pageBg || pageBg.classList.contains("hidden")) return;
        var y = window.scrollY;
        var bg = document.getElementById("drop-parallax-bg");
        var ground = document.getElementById("drop-parallax-ground");
        var frame = document.getElementById("drop-cover-frame");
        if (bg) {
          bg.style.transform = "translate3d(0," + (y * 0.12).toFixed(2) + "px, 0)";
        }
        if (ground) {
          ground.style.transform = "translate3d(0," + (y * 0.28).toFixed(2) + "px, 0)";
        }
        if (frame) {
          var ty = y * 0.36;
          var rx = Math.min(10, y * 0.032);
          frame.style.transform =
            "perspective(1100px) translate3d(0," +
            ty.toFixed(2) +
            "px, 0) rotateX(" +
            rx.toFixed(2) +
            "deg)";
        }
        var h = dropEl.offsetHeight || 640;
        var fadeStart = h * 0.35;
        var fadeEnd = h + 80;
        if (y <= fadeStart) {
          pageBg.style.opacity = "1";
          pageBg.classList.remove("is-faded");
        } else if (y >= fadeEnd) {
          pageBg.style.opacity = "0";
          pageBg.classList.add("is-faded");
        } else {
          var t = (y - fadeStart) / (fadeEnd - fadeStart);
          pageBg.style.opacity = (1 - t).toFixed(3);
          pageBg.classList.toggle("is-faded", t > 0.95);
        }
      }

      if (Date.now() < end.getTime()) {
        dropEl.classList.remove("hidden");
        stdEl.classList.add("hidden");
        if (pageBg) {
          pageBg.classList.remove("hidden");
          pageBg.style.opacity = "1";
          pageBg.classList.remove("is-faded");
        }
        var aid = DROP_CAMPAIGN.albumId;
        function goAlbum() {
          openDetail(aid);
        }
        var bBuy = document.getElementById("drop-btn-buy");
        var bPrev = document.getElementById("drop-btn-preview");
        var bPlay = document.getElementById("drop-btn-play-fake");
        if (bBuy) bBuy.addEventListener("click", goAlbum);
        if (bPrev) bPrev.addEventListener("click", goAlbum);
        var dropItem = CATALOG.filter(function (x) {
          return x.id === aid;
        })[0];
        var dropPrevUrl = dropItem ? getItemPreviewUrl(dropItem) : "";
        var dropPrevLabel = dropItem ? getItemPreviewLabel(dropItem) : "";
        if (!dropPrevUrl && MAELSTROM_FILES[0]) {
          dropPrevUrl = audioUrl(MAELSTROM_FILES[0]);
          dropPrevLabel = "MOZARFMUZIK — " + MAELSTROM_TITLES[0];
        }
        if (bPlay && dropPrevUrl) {
          bPlay.setAttribute("data-preview-url", dropPrevUrl);
          bPlay.setAttribute("data-preview-label", dropPrevLabel);
        }
        if (bPlay) {
          bPlay.addEventListener("click", function (e) {
            var url = bPlay.getAttribute("data-preview-url");
            if (url && window.buckcampPlayPreview) {
              e.preventDefault();
              e.stopPropagation();
              window.buckcampPlayPreview(url, bPlay.getAttribute("data-preview-label") || "", bPlay);
              return;
            }
            goAlbum();
          });
        }
        window.addEventListener("scroll", onDropScroll, { passive: true });
        window.addEventListener("resize", onDropScroll, { passive: true });
        onDropScroll();
      } else {
        dropEl.classList.add("hidden");
        stdEl.classList.remove("hidden");
        if (pageBg) pageBg.classList.add("hidden");
      }
    }

    initBuckcampAudio();
    renderGrid("all");
    initDropCampaign();
