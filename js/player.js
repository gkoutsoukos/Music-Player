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

  const PARTICLE_COUNT = 1850;

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
      playlistList.innerHTML = `
        <div class="empty-state empty-state-stack">
          <button class="empty-load-btn" type="button">Load local audio files</button>
          <button class="empty-drive-btn" type="button">Load from Google Drive</button>
        </div>
      `;
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
      const shellBias = Math.random();
      const theta = Math.random() * Math.PI * 2;
      const radialBand = shellBias < 0.76
        ? 0.68 + Math.random() * 0.34
        : Math.pow(Math.random(), 0.65) * 0.86;

      const driftRadius = scale * (0.01 + Math.random() * 0.03);
      const scatter = Math.random() < 0.12 ? 1 : 0;

      particles.push({
        theta,
        radialBand,
        x: cx + (Math.random() - 0.5) * scale * 0.08,
        y: cy + (Math.random() - 0.5) * scale * 0.08,
        vx: (Math.random() - 0.5) * 0.20,
        vy: (Math.random() - 0.5) * 0.20,
        size: Math.random() < 0.022 ? 1.6 + Math.random() * 2.8 : 0.35 + Math.random() * 1.05,
        alpha: 0.18 + Math.random() * 0.72,
        phase: Math.random() * Math.PI * 2,
        phase2: Math.random() * Math.PI * 2,
        driftRadius,
        band: shellBias < 0.18 ? "bass" : shellBias < 0.62 ? "mid" : "high",
        shell: radialBand > 0.84,
        scatter,
        freedom: 0.6 + Math.random() * 1.4,
        cohesion: 0.009 + Math.random() * 0.010
      });
    }
  }

  function blobRadius(theta, scale, t, bass, mid, high, volume) {
    const phaseShift = t * (0.42 + bass * 0.55);
    const lowWave =
      Math.sin(theta * 2.0 + phaseShift) * (0.040 + bass * 0.095) +
      Math.sin(theta * 3.0 - phaseShift * 0.8) * (0.024 + mid * 0.045);

    const ripple =
      Math.sin(theta * 5.0 + t * 0.72) * (0.014 + high * 0.030) +
      Math.sin(theta * 7.0 - t * 0.58) * (0.010 + high * 0.018);

    // Slight egg-memory when calm, becoming rounder and more fluid when active.
    const eggMemory = 1 + 0.07 * Math.max(0, Math.sin(theta)) - 0.03 * Math.min(0, Math.sin(theta));
    const roundness = 0.88 + volume * 0.20 + bass * 0.10;

    return scale * 0.255 * eggMemory * roundness * (1 + lowWave + ripple);
  }

  function blobTarget(p, cx, cy, scale, t, bass, mid, high, volume) {
    const fluidTwist =
      Math.sin(t * 0.46 + p.phase) * 0.06 +
      Math.sin(t * 0.21 + p.phase2) * (0.04 + bass * 0.06);

    const theta = p.theta + fluidTwist;
    const surfaceR = blobRadius(theta, scale, t, bass, mid, high, volume);

    // Interior particles fill the volume, shell particles hug the changing skin.
    const interiorPull = p.shell ? 1 : (0.18 + p.radialBand * 0.82);

    const localBreath =
      1 +
      volume * 0.08 +
      (p.band === "bass" ? bass : p.band === "mid" ? mid : high) * 0.10;

    const radial = surfaceR * interiorPull * localBreath;

    // Organic asymmetry that moves through the form rather than staying static.
    const shearX = Math.sin(t * 0.38 + theta * 1.8 + p.phase) * scale * (0.006 + mid * 0.018);
    const shearY = Math.cos(t * 0.33 + theta * 1.5 + p.phase2) * scale * (0.004 + bass * 0.016);

    // Detached sparse particles breathe around the body.
    const scatterAmount = p.scatter ? scale * (0.020 + volume * 0.060 + high * 0.035) : 0;

    return {
      x: cx + Math.cos(theta) * radial + shearX + Math.cos(p.phase + t * 0.9) * scatterAmount,
      y: cy + Math.sin(theta) * radial * (1.08 + bass * 0.08) + shearY + Math.sin(p.phase2 + t * 0.8) * scatterAmount
    };
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
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const scale = Math.min(w, h);
    const playlistFactor = playlistOpen ? 0.36 : 1;

    // Core liquid glow.
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, scale * 0.48);
    glow.addColorStop(0, `rgba(255,255,255,${0.030 + volume * 0.11 + bass * 0.07 + lastPulse * 0.03})`);
    glow.addColorStop(0.26, `rgba(255,255,255,${0.020 + mid * 0.06})`);
    glow.addColorStop(0.54, `rgba(255,255,255,${0.010 + high * 0.03})`);
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    for (const p of particles) {
      const bandEnergy = p.band === "bass" ? bass : p.band === "mid" ? mid : high;
      const target = blobTarget(p, cx, cy, scale, t, bass, mid, high, volume);

      const dx = target.x - p.x;
      const dy = target.y - p.y;

      const curlX =
        Math.cos(t * (0.70 + bandEnergy * 0.30) + p.phase + p.y * 0.007) *
        (0.05 + bandEnergy * 0.20) * p.freedom;
      const curlY =
        Math.sin(t * (0.64 + bandEnergy * 0.26) + p.phase2 + p.x * 0.006) *
        (0.05 + bandEnergy * 0.18) * p.freedom;

      const swirlStrength = (0.0016 + volume * 0.012 + mid * 0.010) * p.freedom;
      const swirlX = -dy * swirlStrength;
      const swirlY = dx * swirlStrength;

      const spring = p.cohesion * (playlistOpen ? 0.62 : 1.0);
      p.vx += dx * spring + curlX + swirlX;
      p.vy += dy * spring + curlY + swirlY;

      const damping = playlistOpen ? 0.90 : 0.935;
      p.vx *= damping;
      p.vy *= damping;

      p.x += p.vx;
      p.y += p.vy;

      const activeAlpha =
        (p.alpha * (0.36 + bandEnergy * 1.55 + (p.shell ? 0.10 : 0) + (p.scatter ? 0.08 : 0))) *
        playlistFactor;
      const size =
        p.size *
        (1 + volume * 0.18 + bandEnergy * 1.65 + (p.shell ? high * 0.35 : bass * 0.22));

      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.95, activeAlpha)})`;
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();

      if (p.shell && (bass + mid + high) > 0.16) {
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,255,255,${Math.min(0.12, 0.03 + bandEnergy * 0.10)})`;
        ctx.arc(p.x, p.y, size * 3.0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Dynamic contour strokes so the form reads as a changing liquid body.
    ctx.save();
    ctx.globalAlpha = (0.11 + bass * 0.18 + mid * 0.12 + lastPulse * 0.08) * playlistFactor;
    ctx.strokeStyle = "rgba(255,255,255,0.92)";
    ctx.lineWidth = 0.75;

    for (let ring = 0; ring < 3; ring++) {
      const ringScale = 1 - ring * 0.055;
      ctx.beginPath();
      for (let i = 0; i <= 180; i++) {
        const a = (i / 180) * Math.PI * 2;
        const r =
          blobRadius(a, scale * ringScale, t + ring * 0.2, bass, mid, high, volume) *
          (1 - ring * 0.06);
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r * (1.07 + bass * 0.06);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function importAudioEntries(entries, autoplay = false) {
    tracks.forEach(track => {
      if (track.url && track.url.startsWith("blob:")) URL.revokeObjectURL(track.url);
    });

    tracks = entries.map(entry => {
      const meta = splitMetadata(entry.name || "Untitled Track");
      return {
        file: entry.file || null,
        driveFileId: entry.driveFileId || null,
        source: entry.source || "local",
        url: entry.url || URL.createObjectURL(entry.blob || entry.file),
        title: entry.title || meta.title,
        artist: entry.artist || meta.artist,
        duration: 0
      };
    });

    tracks.forEach((track) => {
      const temp = new Audio(track.url);
      temp.addEventListener("loadedmetadata", () => {
        track.duration = temp.duration;
        renderPlaylist();
      });
    });

    currentIndex = -1;
    renderPlaylist();
    if (tracks.length) loadTrack(0, autoplay);
  }

  window.ParticlePlayer = {
    loadBlobTracks(entries, autoplay = true) {
      importAudioEntries(entries, autoplay);
      togglePlaylist(false);
    },
    openLocalFilePicker() {
      fileInput.click();
    },
    openPlaylist() {
      togglePlaylist(true);
    }
  };

  fileInput.addEventListener("change", () => {
    const entries = Array.from(fileInput.files || [])
      .filter(file => file.type.startsWith("audio/"))
      .map(file => ({
        file,
        name: file.name,
        source: "local"
      }));

    importAudioEntries(entries, false);
    fileInput.value = "";
  });

  playBtn.addEventListener("click", playPause);
  nextBtn.addEventListener("click", nextTrack);
  prevBtn.addEventListener("click", prevTrack);

  audio.addEventListener("play", () => {
    playBtn.classList.add("is-playing");
  });

  audio.addEventListener("pause", () => {
    playBtn.classList.remove("is-playing");
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

    const emptyDrive = event.target.closest(".empty-drive-btn");
    if (emptyDrive) {
      if (window.GoogleDrivePlayer && typeof window.GoogleDrivePlayer.openPicker === "function") {
        window.GoogleDrivePlayer.openPicker();
      } else {
        alert("Google Drive is not ready yet. Check js/config.js and refresh the page.");
      }
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
