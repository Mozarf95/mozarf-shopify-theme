(function () {
  const audio = new Audio();
  let currentId = null;
  let playlist = [];

  const player     = document.getElementById('audio-player');
  const btnPlay    = document.getElementById('player-play');
  const iconPlay   = document.getElementById('icon-play');
  const iconPause  = document.getElementById('icon-pause');
  const btnPrev    = document.getElementById('player-prev');
  const btnNext    = document.getElementById('player-next');
  const bar        = document.getElementById('player-bar');
  const progress   = document.getElementById('player-progress');
  const timeCur    = document.getElementById('player-current');
  const timeDur    = document.getElementById('player-duration');
  const artwork    = document.getElementById('player-artwork');
  const titleEl    = document.getElementById('player-title');
  const vendorEl   = document.getElementById('player-vendor');
  const buyBtn     = document.getElementById('player-buy');
  const volInput   = document.getElementById('player-volume');

  // Build playlist from cards
  function buildPlaylist() {
    playlist = Array.from(document.querySelectorAll('.product-card[data-product-id]'))
      .filter(c => c.dataset.audio)
      .map(c => ({
        id:     c.dataset.productId,
        audio:  c.dataset.audio,
        title:  c.dataset.title,
        vendor: c.dataset.vendor,
        image:  c.dataset.image,
        url:    c.dataset.productUrl || c.querySelector('a.product-card__overlay-link')?.href || '#'
      }));
  }

  function formatTime(s) {
    if (isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }

  function setPlayingState(playing) {
    iconPlay.style.display  = playing ? 'none' : 'block';
    iconPause.style.display = playing ? 'block' : 'none';
  }

  function loadTrack(item) {
    currentId = item.id;
    audio.src = item.audio;
    audio.volume = parseFloat(volInput.value);
    titleEl.textContent  = item.title;
    vendorEl.textContent = item.vendor;
    artwork.src          = item.image;
    buyBtn.href          = item.url;
    player.classList.add('is-visible');
    player.removeAttribute('aria-hidden');

    // Update card states
    document.querySelectorAll('.product-card').forEach(c => {
      c.classList.toggle('product-card--active', c.dataset.productId === item.id);
    });
    document.querySelectorAll('.product-card__play-btn').forEach(b => {
      b.classList.toggle('is-playing', b.dataset.productId === item.id);
    });
  }

  function playTrack(item) {
    loadTrack(item);
    audio.play().then(() => setPlayingState(true)).catch(() => {});
  }

  function togglePlay() {
    if (!currentId) return;
    if (audio.paused) {
      audio.play().then(() => setPlayingState(true));
    } else {
      audio.pause();
      setPlayingState(false);
    }
  }

  function navigate(dir) {
    const idx = playlist.findIndex(p => p.id === currentId);
    const next = playlist[idx + dir];
    if (next) playTrack(next);
  }

  // Events
  btnPlay.addEventListener('click', togglePlay);
  btnPrev.addEventListener('click', () => navigate(-1));
  btnNext.addEventListener('click', () => navigate(1));

  audio.addEventListener('timeupdate', () => {
    const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    bar.style.width    = pct + '%';
    timeCur.textContent = formatTime(audio.currentTime);
    timeDur.textContent = formatTime(audio.duration);
  });

  audio.addEventListener('ended', () => navigate(1));

  progress.addEventListener('click', (e) => {
    const rect = progress.getBoundingClientRect();
    const pct  = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * audio.duration;
  });

  volInput.addEventListener('input', () => {
    audio.volume = parseFloat(volInput.value);
  });

  // Card play buttons
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.product-card__play-btn');
    if (!btn) return;
    e.preventDefault();
    const card = btn.closest('.product-card');
    const id   = card.dataset.productId;

    if (currentId === id) {
      togglePlay();
    } else {
      const item = playlist.find(p => p.id === id);
      if (item) playTrack(item);
    }
  });

  // Init
  buildPlaylist();
})();
