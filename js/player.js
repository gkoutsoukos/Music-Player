(() => {
  const audio = document.getElementById("audio");
  const canvas = document.getElementById("visualizerCanvas");
  const ctx = canvas.getContext("2d");
  const fileInput = document.getElementById("fileInput");
  const playBtn = document.getElementById("playBtn");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const progress = document.getElementById("progress");
  const currentTimeEl = document.getElementById("currentTime");
  const durationEl = document.getElementById("duration");
  const titleEl = document.getElementById("trackTitle");
  const metaEl = document.getElementById("trackMeta");
  const playlistPanel = document.getElementById("playlistPanel");
  const playlistList = document.getElementById("playlistList");
  const playlistCount = document.getElementById("playlistCount");
  const orbToggle = document.getElementById("orbToggle");
  const closePlaylist = document.getElementById("closePlaylist");

  let tracks = [];
  let currentIndex = -1;
  let audioContext;
  let analyser;
  let sourceNode;
  let freqData;
  let timeData;
  let particles = [];
  let lastPulse = 0;
  let playlistOpen = false;

  const PARTICLE_COUNT = 1550;

  function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function cleanTitle(filename) {
    return filename
      .replace(/\.[^/.]+$/, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function splitMetadata(filename) {
    const title = cleanTitle(filename);
    const parts = title.split(" - ");
    if (parts.length >= 2) {
      return {
        artist: parts[0].trim(),
        title: parts.slice(1).join(" - ").trim()
      };
    }
    return { artist: "Local File", title };
  }

  function setupAudioContext() {
    if (audioContext) return;
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.82;
    freqData = new Uint8Array(analyser.frequencyBinCount);
    timeData = new Uint8Array(analyser.fftSize);
    sourceNode = audioContext.createMediaElementSource(audio);
    sourceNode.connect(analyser);
    analyser.connect(audioContext.destination);
  }

  function loadTrack(index, autoplay = true) {
    if (!tracks[index]) return;
    currentIndex = index;
    const track = tracks[currentIndex];
    audio.src = track.url;
    titleEl.textContent = track.title;
    metaEl.textContent = track.artist;
    renderPlaylist();

    if (autoplay) {
      setupAudioContext();
      audioContext.resume();
      audio.play().catch(() => {});
    }
  }

  function playPause() {
    if (!tracks.length) {
      fileInput.click();
      return;
    }

    setupAudioContext();
    audioContext.resume();

    if (currentIndex < 0) loadTrack(0, false);

    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  }

  function nextTrack() {
    if (!tracks.length) return;
    const next = (currentIndex + 1) % tracks.length;
    loadTrack(next, true);
  }

  function prevTrack() {
    if (!tracks.length) return;
    const prev = (currentIndex - 1 + tracks.length) % tracks.length;
    loadTrack(prev, true);
  }

  function renderPlaylist() {
    playlistCount.textContent = `${tracks.length} ${tracks.length === 1 ? "track" : "tracks"}`;

    if (!tracks.length) {
      playlistList.innerHTML = `<button class="empty-state empty-load-btn" type="button">Load local audio files</button>`;
      return;
    }

    playlistList.innerHTML = tracks.map((track, index) => {
      const active = index === currentIndex ? " is-active" : "";
      return `
        <button class="track-row${active}" data-index="${index}">
          <span class="track-dot"></span>
          <span class="track-index">${String(index + 1).padStart(2, "0")}</span>
          <span>
            <span class="track-row-title">${escapeHtml(track.title)}</span>
            <span class="track-row-meta">${escapeHtml(track.artist)}</span>
          </span>
          <span class="track-row-duration">${track.duration ? formatTime(track.duration) : "—:—"}</span>
        </button>
      `;
    }).join("");
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));
  }

  function togglePlaylist(force) {
    playlistOpen = typeof force === "boolean" ? force : !playlistOpen;
    playlistPanel.classList.toggle("is-open", playlistOpen);
    playlistPanel.setAttribute("aria-hidden", String(!playlistOpen));
    orbToggle.setAttribute("aria-label", playlistOpen ? "Close playlist" : "Open playlist");
    lastPulse = 1.0;
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    createParticles();
  }

  function createParticles() {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const cx = w / 2;
    const cy = h / 2;
    const scale = Math.min(w, h);
    particles = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const band = Math.random();
      const angle = Math.random() * Math.PI * 2;

      // Egg geometry: slightly narrower top, heavier lower-right side.
      const yBias = Math.sin(angle);
      const eggFactor = 1 + 0.18 * Math.max(0, yBias) - 0.10 * Math.min(0, yBias);
      const rx = scale * (0.255 + Math.random() * 0.035) * eggFactor;
      const ry = scale * (0.330 + Math.random() * 0.045);

      // More points near shell; some interior particles.
      const r = band < 0.70
        ? 0.78 + Math.random() * 0.25
        : Math.pow(Math.random(), 0.55) * 0.88;

      // Asymmetric density areas.
      const clusterChoice = Math.random();
      let clusterBoost = 0;
      let clusterAngle = angle;

      if (clusterChoice > 0.84) {
        const clusters = [
          { a: Math.PI * 0.92, s: 0.28 },  // left-mid dense area
          { a: Math.PI * 1.62, s: 0.22 },  // lower-right bass weight
          { a: Math.PI * 0.30, s: 0.18 }   // upper-right sparkle
        ];
        const c = clusters[Math.floor(Math.random() * clusters.length)];
        clusterAngle = c.a + (Math.random() - 0.5) * c.s;
        clusterBoost = Math.random() * 0.26;
      }

      const x = cx + Math.cos(clusterAngle) * rx * (r + clusterBoost);
      const y = cy + Math.sin(clusterAngle) * ry * r + scale * 0.015;

      particles.push({
        baseX: x,
        baseY: y,
        x,
        y,
        angle,
        radius: r,
        size: Math.random() < 0.025 ? 1.7 + Math.random() * 2.6 : 0.35 + Math.random() * 1.05,
        alpha: 0.18 + Math.random() * 0.72,
        speed: 0.002 + Math.random() * 0.010,
        phase: Math.random() * Math.PI * 2,
        band: band < 0.18 ? "bass" : band < 0.62 ? "mid" : "high",
        cluster: clusterChoice > 0.84
      });
    }
  }

  function getBands() {
    let bass = 0.02;
    let mid = 0.02;
    let high = 0.02;
    let volume = 0.02;

    if (analyser && freqData) {
      analyser.getByteFrequencyData(freqData);
      analyser.getByteTimeDomainData(timeData);

      const bassBins = freqData.slice(1, 10);
      const midBins = freqData.slice(10, 88);
      const highBins = freqData.slice(88, 250);

      bass = avg(bassBins) / 255;
      mid = avg(midBins) / 255;
      high = avg(highBins) / 255;

      let sum = 0;
      for (let i = 0; i < timeData.length; i++) {
        const v = (timeData[i] - 128) / 128;
        sum += v * v;
      }
      volume = Math.sqrt(sum / timeData.length);
    }

    if (audio.paused) {
      bass *= 0.35;
      mid *= 0.30;
      high *= 0.28;
      volume *= 0.25;
    }

    return { bass, mid, high, volume };
  }

  function avg(arr) {
    if (!arr.length) return 0;
    let total = 0;
    for (let i = 0; i < arr.length; i++) total += arr[i];
    return total / arr.length;
  }

  function draw() {
    requestAnimationFrame(draw);

    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const t = performance.now() * 0.001;
    const { bass, mid, high, volume } = getBands();

    lastPulse *= 0.94;

    ctx.clearRect(0, 0, w, h);

    // Black fade layer keeps the void rich.
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;

    // Subtle ghost glow.
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.46);
    glow.addColorStop(0, `rgba(255,255,255,${0.020 + volume * 0.07 + lastPulse * 0.03})`);
    glow.addColorStop(0.35, `rgba(255,255,255,${0.013 + mid * 0.035})`);
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    const playlistFactor = playlistOpen ? 0.42 : 1;

    for (const p of particles) {
      const bandEnergy = p.band === "bass" ? bass : p.band === "mid" ? mid : high;
      const breathe = 1 + volume * 0.055 + bandEnergy * 0.105 + lastPulse * 0.10;

      const driftX = Math.cos(t * 0.75 + p.phase) * (2.2 + bandEnergy * 8);
      const driftY = Math.sin(t * 0.65 + p.phase * 1.13) * (1.7 + bandEnergy * 6);

      // When playlist is open, particles loosen and dim behind the list.
      const openSpread = playlistOpen ? 1.06 : 1;
      p.x = cx + (p.baseX - cx) * breathe * openSpread + driftX;
      p.y = cy + (p.baseY - cy) * breathe * openSpread + driftY;

      const activeAlpha = (p.alpha * (0.40 + bandEnergy * 1.55 + (p.cluster ? 0.26 : 0))) * playlistFactor;
      const size = p.size * (1 + bandEnergy * 1.9 + (p.cluster ? bass * 0.7 : 0));

      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.96, activeAlpha)})`;
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();

      // Bright clustered points get a soft halo.
      if (p.cluster && (bass + mid + high) > 0.22) {
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,255,255,${Math.min(0.16, bandEnergy * 0.22)})`;
        ctx.arc(p.x, p.y, size * 3.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Irregular shell highlights: enough to define the egg, not a perfect wireframe.
    ctx.save();
    ctx.globalAlpha = (0.20 + bass * 0.42 + lastPulse * 0.22) * playlistFactor;
    ctx.strokeStyle = "rgba(255,255,255,0.86)";
    ctx.lineWidth = 0.75;
    for (let k = 0; k < 5; k++) {
      ctx.beginPath();
      for (let i = 0; i <= 180; i++) {
        const a = (i / 180) * Math.PI * 2;
        const wobble = Math.sin(a * 5 + t * (0.7 + k * 0.08) + k) * 7;
        const rx = Math.min(w, h) * (0.245 + k * 0.004);
        const ry = Math.min(w, h) * (0.315 + k * 0.003);
        const x = cx + Math.cos(a) * (rx + wobble) * (1 + 0.10 * Math.max(0, Math.sin(a)));
        const y = cy + Math.sin(a) * (ry + wobble * 0.5) + Math.min(w,h) * 0.015;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  fileInput.addEventListener("change", () => {
    tracks.forEach(track => URL.revokeObjectURL(track.url));
    tracks = Array.from(fileInput.files || [])
      .filter(file => file.type.startsWith("audio/"))
      .map(file => {
        const meta = splitMetadata(file.name);
        return {
          file,
          url: URL.createObjectURL(file),
          title: meta.title,
          artist: meta.artist,
          duration: 0
        };
      });

    tracks.forEach((track, index) => {
      const temp = new Audio(track.url);
      temp.addEventListener("loadedmetadata", () => {
        track.duration = temp.duration;
        renderPlaylist();
      });
    });

    currentIndex = -1;
    renderPlaylist();
    if (tracks.length) loadTrack(0, false);
  });

  playBtn.addEventListener("click", playPause);
  nextBtn.addEventListener("click", nextTrack);
  prevBtn.addEventListener("click", prevTrack);

  audio.addEventListener("play", () => {
    playBtn.textContent = "❚❚";
  });

  audio.addEventListener("pause", () => {
    playBtn.textContent = "▶";
  });

  audio.addEventListener("ended", nextTrack);

  audio.addEventListener("timeupdate", () => {
    if (!Number.isFinite(audio.duration)) return;
    const fill = (audio.currentTime / audio.duration) * 100;
    progress.value = String(Math.round((audio.currentTime / audio.duration) * 1000));
    progress.style.setProperty("--progress-fill", `${fill}%`);
    currentTimeEl.textContent = formatTime(audio.currentTime);
    durationEl.textContent = formatTime(audio.duration);
  });

  progress.addEventListener("input", () => {
    if (!Number.isFinite(audio.duration)) return;
    audio.currentTime = (Number(progress.value) / 1000) * audio.duration;
  });

  playlistList.addEventListener("click", event => {
    const emptyLoad = event.target.closest(".empty-load-btn");
    if (emptyLoad) {
      fileInput.click();
      return;
    }

    const row = event.target.closest(".track-row");
    if (!row) return;
    const index = Number(row.dataset.index);
    loadTrack(index, true);
    togglePlaylist(false);
  });

  orbToggle.addEventListener("click", () => {
    togglePlaylist();
  });

  closePlaylist.addEventListener("click", () => {
    togglePlaylist(false);
  });

  window.addEventListener("keydown", event => {
    if (event.key === "Escape") togglePlaylist(false);
    if (event.code === "Space" && event.target === document.body) {
      event.preventDefault();
      playPause();
    }
  });

  window.addEventListener("resize", resizeCanvas);

  resizeCanvas();
  renderPlaylist();
  draw();
})();
