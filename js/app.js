const SAMPLE_TRACKS = [
      {
        title: "SoundHelix Song 1",
        artist: "SoundHelix",
        album: "Demo Library",
        trackNo: 1,
        year: "",
        genre: "Demo",
        durationText: "--:--",
        fileType: "MP3",
        url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        source: "DEMO",
        artUrl: null
      },
      {
        title: "SoundHelix Song 2",
        artist: "SoundHelix",
        album: "Demo Library",
        trackNo: 2,
        year: "",
        genre: "Demo",
        durationText: "--:--",
        fileType: "MP3",
        url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
        source: "DEMO",
        artUrl: null
      },
      {
        title: "SoundHelix Song 3",
        artist: "SoundHelix",
        album: "Demo Library",
        trackNo: 3,
        year: "",
        genre: "Demo",
        durationText: "--:--",
        fileType: "MP3",
        url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
        source: "DEMO",
        artUrl: null
      }
    ];

    const audio = document.getElementById("audio");
    const playerWindow = document.getElementById("playerWindow");
    const albumArt = document.getElementById("albumArt");
    const trackTitle = document.getElementById("trackTitle");
    const trackArtist = document.getElementById("trackArtist");
    const trackAlbum = document.getElementById("trackAlbum");
    const trackFormat = document.getElementById("trackFormat");
    const trackInfo = document.getElementById("trackInfo");
    const statusEl = document.getElementById("status");
    const currentTimeEl = document.getElementById("currentTime");
    const durationEl = document.getElementById("duration");
    const progress = document.getElementById("progress");
    const progressWrap = document.getElementById("progressWrap");
    const playlistEl = document.getElementById("playlist");
    const search = document.getElementById("search");
    const localFiles = document.getElementById("localFiles");
    const localFolder = document.getElementById("localFolder");
    const demoBtn = document.getElementById("demoBtn");
    const sortBtn = document.getElementById("sortBtn");
    const rescanBtn = document.getElementById("rescanBtn");
    const libraryMode = document.getElementById("libraryMode");
    const trackCount = document.getElementById("trackCount");
    const artCount = document.getElementById("artCount");
    const sortMode = document.getElementById("sortMode");
    const engineMode = document.getElementById("engineMode");
    const engineStatus = document.getElementById("engineStatus");
    const volume = document.getElementById("volume");
    const volumeVal = document.getElementById("volumeVal");
    const preamp = document.getElementById("preamp");
    const preampVal = document.getElementById("preampVal");
    const eqPanel = document.getElementById("eqPanel");

    const buttons = {
      prev: document.getElementById("prevBtn"),
      playPause: document.getElementById("playPauseBtn"),
      stop: document.getElementById("stopBtn"),
      next: document.getElementById("nextBtn"),
      shuffle: document.getElementById("shuffleBtn"),
      repeat: document.getElementById("repeatBtn")
    };

    let objectUrls = [];
    let artUrls = [];
    let tracks = SAMPLE_TRACKS.map(t => ({ ...t }));
    let filteredTracks = [...tracks];
    let currentIndex = 0;
    let isShuffle = false;
    let isRepeat = false;
    let currentSort = "album";

    // Audio engine objects
    let audioCtx = null;
    let mediaSource = null;
    let masterGain = null;
    let preampGain = null;
    let limiter = null;
    let eqFilters = [];
    let engineReady = false;

    const EQ_FREQUENCIES = [60, 170, 1000, 3000, 10000];

    function formatTime(seconds) {
      if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }

    function cleanupObjectUrls() {
      objectUrls.forEach(url => URL.revokeObjectURL(url));
      artUrls.forEach(url => URL.revokeObjectURL(url));
      objectUrls = [];
      artUrls = [];
    }

    function isSupportedAudioFile(file) {
      const name = file.name.toLowerCase();
      return file.type.startsWith("audio/") || /\.(mp3|m4a|aac|wav|flac|ogg|alac)$/i.test(name);
    }

    function prettyTitleFromFileName(name) {
      return name
        .replace(/\.[^/.]+$/, "")
        .replace(/^\d+\s*[-._ ]+/, "")
        .replace(/[_-]+/g, " ")
        .trim();
    }

    function getExtension(fileName) {
      const ext = fileName.split(".").pop();
      return ext ? ext.toUpperCase() : "AUDIO";
    }

    function getAlbumFromPath(file) {
      const path = file.webkitRelativePath || "";
      if (!path.includes("/")) return "Local Files";
      const parts = path.split("/");
      return parts.length >= 2 ? parts[parts.length - 2] : "Local Files";
    }

    function getArtistFromPath(file) {
      const path = file.webkitRelativePath || "";
      const parts = path.split("/");
      if (parts.length >= 3) return parts[parts.length - 3];
      return "Local Device";
    }

    function inferTrackNo(fileName) {
      const match = fileName.match(/^(\d{1,3})[\s._-]/);
      return match ? Number(match[1]) : 9999;
    }

    function parseTrackNumber(raw) {
      if (!raw && raw !== 0) return 9999;
      if (typeof raw === "number") return raw;
      const match = String(raw).match(/\d+/);
      return match ? Number(match[0]) : 9999;
    }

    function imageDataToObjectUrl(picture) {
      if (!picture || !picture.data || !picture.format) return null;
      const byteArray = new Uint8Array(picture.data);
      const blob = new Blob([byteArray], { type: picture.format });
      const url = URL.createObjectURL(blob);
      artUrls.push(url);
      return url;
    }

    function readTags(file) {
      return new Promise(resolve => {
        if (!window.jsmediatags) {
          resolve({});
          return;
        }

        window.jsmediatags.read(file, {
          onSuccess: tag => {
            const tags = tag.tags || {};
            const artUrl = tags.picture ? imageDataToObjectUrl(tags.picture) : null;
            resolve({
              title: tags.title || "",
              artist: tags.artist || "",
              album: tags.album || "",
              trackNo: parseTrackNumber(tags.track),
              year: tags.year || "",
              genre: Array.isArray(tags.genre) ? tags.genre.join(", ") : (tags.genre || ""),
              artUrl,
              hasTags: true
            });
          },
          onError: () => resolve({})
        });
      });
    }

    function probeDuration(url) {
      return new Promise(resolve => {
        const probe = document.createElement("audio");
        probe.preload = "metadata";
        probe.src = url;
        probe.onloadedmetadata = () => resolve(probe.duration);
        probe.onerror = () => resolve(NaN);
      });
    }

    async function buildLocalTracks(fileList) {
      const files = Array.from(fileList)
        .filter(isSupportedAudioFile)
        .sort((a, b) => {
          const pathA = a.webkitRelativePath || a.name;
          const pathB = b.webkitRelativePath || b.name;
          return pathA.localeCompare(pathB, undefined, { numeric: true, sensitivity: "base" });
        });

      cleanupObjectUrls();

      const built = [];
      for (const file of files) {
        const url = URL.createObjectURL(file);
        objectUrls.push(url);

        const fallback = {
          title: prettyTitleFromFileName(file.name),
          artist: getArtistFromPath(file),
          album: getAlbumFromPath(file),
          trackNo: inferTrackNo(file.name),
          year: "",
          genre: "",
          durationText: "--:--",
          durationSeconds: NaN,
          url,
          source: "LOCAL",
          fileName: file.name,
          fileType: getExtension(file.name),
          artUrl: null,
          size: file.size
        };

        built.push(fallback);
      }

      // Render quickly first, then progressively fill metadata.
      return built;
    }

    async function enrichMetadata(localTracks, fileList) {
      const files = Array.from(fileList).filter(isSupportedAudioFile)
        .sort((a, b) => {
          const pathA = a.webkitRelativePath || a.name;
          const pathB = b.webkitRelativePath || b.name;
          return pathA.localeCompare(pathB, undefined, { numeric: true, sensitivity: "base" });
        });

      statusEl.textContent = "READING TAGS";

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const track = localTracks[i];
        try {
          const [tags, seconds] = await Promise.all([
            readTags(file),
            probeDuration(track.url)
          ]);

          track.title = tags.title || track.title;
          track.artist = tags.artist || track.artist;
          track.album = tags.album || track.album;
          track.trackNo = Number.isFinite(tags.trackNo) ? tags.trackNo : track.trackNo;
          track.year = tags.year || track.year;
          track.genre = tags.genre || track.genre;
          track.artUrl = tags.artUrl || track.artUrl;
          track.hasTags = Boolean(tags.hasTags);
          track.durationSeconds = seconds;
          track.durationText = formatTime(seconds);

          if (i === currentIndex && tracks === localTracks) {
            updateNowPlaying(track);
          }

          if (i % 5 === 0 || i === files.length - 1) {
            renderPlaylist();
            updateStats();
          }
        } catch (err) {
          console.warn("Metadata error:", file.name, err);
        }
      }

      applySort();
      statusEl.textContent = "READY";
    }

    async function loadLocalLibrary(fileList) {
      const localTracks = await buildLocalTracks(fileList);

      if (!localTracks.length) {
        statusEl.textContent = "NO AUDIO";
        alert("No supported audio files were found. Try MP3, M4A, AAC, WAV, FLAC, or OGG files.");
        return;
      }

      audio.pause();
      tracks = localTracks;
      filteredTracks = [...tracks];
      currentIndex = 0;
      search.value = "";
      libraryMode.textContent = "LOCAL";
      statusEl.textContent = `${localTracks.length} FILES`;
      loadTrack(0, false);
      renderPlaylist();
      updateStats();

      enrichMetadata(localTracks, fileList);
    }

    function loadDemoLibrary() {
      audio.pause();
      cleanupObjectUrls();
      tracks = SAMPLE_TRACKS.map(t => ({ ...t }));
      filteredTracks = [...tracks];
      currentIndex = 0;
      search.value = "";
      libraryMode.textContent = "DEMO";
      statusEl.textContent = "DEMO";
      loadTrack(0, false);
      renderPlaylist();
      updateStats();
    }

    function compareText(a, b) {
      return String(a || "").localeCompare(String(b || ""), undefined, { numeric: true, sensitivity: "base" });
    }

    function applySort() {
      if (currentSort === "album") {
        tracks.sort((a, b) =>
          compareText(a.artist, b.artist) ||
          compareText(a.album, b.album) ||
          ((a.trackNo || 9999) - (b.trackNo || 9999)) ||
          compareText(a.title, b.title)
        );
      } else {
        tracks.sort((a, b) => compareText(a.title, b.title));
      }

      const currentTrack = filteredTracks[currentIndex];
      filterTracks(false);
      if (currentTrack) {
        const newIndex = filteredTracks.findIndex(t => t.url === currentTrack.url);
        currentIndex = newIndex >= 0 ? newIndex : 0;
      }
      renderPlaylist();
      updateStats();
    }

    function filterTracks(keepCurrent = true) {
      const q = search.value.trim().toLowerCase();
      const currentTrack = filteredTracks[currentIndex];

      filteredTracks = tracks.filter(track => {
        const haystack = `${track.title} ${track.artist} ${track.album} ${track.genre || ""}`.toLowerCase();
        return haystack.includes(q);
      });

      if (!keepCurrent || !currentTrack) {
        currentIndex = 0;
      } else {
        const found = filteredTracks.findIndex(t => t.url === currentTrack.url);
        currentIndex = found >= 0 ? found : 0;
      }
    }

    function updateStats() {
      trackCount.textContent = String(tracks.length);
      artCount.textContent = String(tracks.filter(t => t.artUrl).length);
      sortMode.textContent = currentSort.toUpperCase();
    }

    function renderPlaylist() {
      playlistEl.innerHTML = "";

      if (!filteredTracks.length) {
        playlistEl.innerHTML = `<div class="small-note" style="padding:14px;">No tracks found.</div>`;
        return;
      }

      filteredTracks.forEach((track, index) => {
        const item = document.createElement("div");
        item.className = "song" + (index === currentIndex ? " active" : "");
        item.innerHTML = `
          <div class="song-no">${String(index + 1).padStart(2, "0")}</div>
          <div>
            <div class="song-title">${escapeHtml(track.title)}<span class="source-tag">${escapeHtml(track.source || "")}</span></div>
            <div class="song-subtitle">${escapeHtml(track.artist)} · ${escapeHtml(track.album)}</div>
          </div>
          <div class="song-duration">${escapeHtml(track.durationText || "--:--")}</div>
        `;
        item.addEventListener("click", () => {
          currentIndex = index;
          loadTrack(index, true);
        });
        playlistEl.appendChild(item);
      });
    }

    function escapeHtml(str) {
      return String(str || "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[char]));
    }

    function setAlbumArt(track) {
      albumArt.innerHTML = "";
      if (track.artUrl) {
        const img = document.createElement("img");
        img.src = track.artUrl;
        img.alt = `${track.album || "Album"} artwork`;
        albumArt.appendChild(img);
      } else {
        const fallback = document.createElement("div");
        fallback.className = "fallback-art";
        fallback.innerHTML = "DRIVE<br>AMP";
        albumArt.appendChild(fallback);
      }
    }

    function updateNowPlaying(track) {
      trackTitle.textContent = track.title || "Unknown Title";
      trackArtist.textContent = track.artist || "Unknown Artist";
      trackAlbum.textContent = `Album: ${track.album || "—"}`;
      trackFormat.textContent = `Format: ${track.fileType || "—"}`;
      trackInfo.textContent = `${track.year ? track.year + " · " : ""}${track.genre || track.source || "LOCAL"}`;
      durationEl.textContent = track.durationText || formatTime(audio.duration);
      setAlbumArt(track);
    }

    function loadTrack(index, autoplay = false) {
      if (!filteredTracks.length) return;

      currentIndex = ((index % filteredTracks.length) + filteredTracks.length) % filteredTracks.length;
      const track = filteredTracks[currentIndex];

      audio.src = track.url;
      updateNowPlaying(track);
      renderPlaylist();
      statusEl.textContent = "LOADED";

      if (autoplay) {
        play();
      }
    }

    async function initAudioEngine() {
      if (engineReady) return;

      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        mediaSource = audioCtx.createMediaElementSource(audio);

        preampGain = audioCtx.createGain();
        masterGain = audioCtx.createGain();

        eqFilters = EQ_FREQUENCIES.map(freq => {
          const filter = audioCtx.createBiquadFilter();
          filter.type = "peaking";
          filter.frequency.value = freq;
          filter.Q.value = 1.1;
          filter.gain.value = 0;
          return filter;
        });

        limiter = audioCtx.createDynamicsCompressor();
        limiter.threshold.value = -1.0;
        limiter.knee.value = 0;
        limiter.ratio.value = 20;
        limiter.attack.value = 0.002;
        limiter.release.value = 0.08;

        mediaSource.connect(preampGain);
        rebuildAudioGraph();

        engineReady = true;
        updateAudioValues();
      } catch (err) {
        console.warn(err);
        engineStatus.textContent = "Audio engine fallback: standard browser audio output.";
      }
    }

    function disconnectNode(node) {
      try { node.disconnect(); } catch (err) {}
    }

    function rebuildAudioGraph() {
      if (!audioCtx || !preampGain || !masterGain) return;

      disconnectNode(preampGain);
      eqFilters.forEach(disconnectNode);
      disconnectNode(masterGain);
      disconnectNode(limiter);

      const mode = engineMode.value;

      if (mode === "purist") {
        preampGain.connect(masterGain);
        masterGain.connect(audioCtx.destination);
        engineStatus.textContent = "PURIST: Web Audio route active, EQ/limiter bypassed.";
      }

      if (mode === "hifi") {
        preampGain.connect(limiter);
        limiter.connect(masterGain);
        masterGain.connect(audioCtx.destination);
        engineStatus.textContent = "HI-FI: clean gain route with safety limiter.";
      }

      if (mode === "eq") {
        preampGain.connect(eqFilters[0]);
        for (let i = 0; i < eqFilters.length - 1; i++) {
          eqFilters[i].connect(eqFilters[i + 1]);
        }
        eqFilters[eqFilters.length - 1].connect(masterGain);
        masterGain.connect(audioCtx.destination);
        engineStatus.textContent = "WINAMP EQ: 5-band EQ active. Keep preamp conservative.";
      }

      eqPanel.style.opacity = mode === "eq" ? "1" : "0.46";
      updateAudioValues();
    }

    function dbToGain(db) {
      return Math.pow(10, db / 20);
    }

    function updateAudioValues() {
      const vol = Number(volume.value) / 100;
      const preampDb = Number(preamp.value);
      volumeVal.textContent = `${volume.value}%`;
      preampVal.textContent = `${preampDb} dB`;

      audio.volume = engineReady ? 1 : vol;

      if (masterGain) masterGain.gain.value = vol;
      if (preampGain) preampGain.gain.value = dbToGain(preampDb);
    }

    async function play() {
      if (!audio.src && filteredTracks.length) {
        loadTrack(currentIndex, false);
      }

      await initAudioEngine();

      if (audioCtx && audioCtx.state === "suspended") {
        await audioCtx.resume();
      }

      try {
        await audio.play();
        statusEl.textContent = "PLAYING";
        playerWindow.classList.add("playing");
        updatePlayPauseButton();
      } catch (err) {
        console.warn(err);
        statusEl.textContent = "PLAY BLOCKED";
      }
    }

    function updatePlayPauseButton() {
      buttons.playPause.textContent = audio.paused ? "PLAY" : "PAUSE";
      buttons.playPause.classList.toggle("active", !audio.paused);
    }

    function pause() {
      audio.pause();
      statusEl.textContent = "PAUSED";
      playerWindow.classList.remove("playing");
      updatePlayPauseButton();
    }

    function stop() {
      audio.pause();
      audio.currentTime = 0;
      statusEl.textContent = "STOPPED";
      playerWindow.classList.remove("playing");
      updatePlayPauseButton();
    }

    function nextTrack() {
      if (!filteredTracks.length) return;
      if (isShuffle) {
        currentIndex = Math.floor(Math.random() * filteredTracks.length);
      } else {
        currentIndex = (currentIndex + 1) % filteredTracks.length;
      }
      loadTrack(currentIndex, true);
    }

    function prevTrack() {
      if (!filteredTracks.length) return;
      currentIndex = (currentIndex - 1 + filteredTracks.length) % filteredTracks.length;
      loadTrack(currentIndex, true);
    }

    buttons.playPause.addEventListener("click", () => {
      audio.paused ? play() : pause();
    });
    buttons.stop.addEventListener("click", stop);
    buttons.next.addEventListener("click", nextTrack);
    buttons.prev.addEventListener("click", prevTrack);

    buttons.shuffle.addEventListener("click", () => {
      isShuffle = !isShuffle;
      buttons.shuffle.classList.toggle("active", isShuffle);
    });

    buttons.repeat.addEventListener("click", () => {
      isRepeat = !isRepeat;
      buttons.repeat.classList.toggle("active", isRepeat);
    });

    audio.addEventListener("timeupdate", () => {
      currentTimeEl.textContent = formatTime(audio.currentTime);
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        durationEl.textContent = formatTime(audio.duration);
        progress.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
      }
    });

    audio.addEventListener("loadedmetadata", () => {
      durationEl.textContent = formatTime(audio.duration);
      const track = filteredTracks[currentIndex];
      if (track && (!Number.isFinite(track.durationSeconds) || !track.durationSeconds)) {
        track.durationSeconds = audio.duration;
        track.durationText = formatTime(audio.duration);
        renderPlaylist();
      }
    });

    audio.addEventListener("play", updatePlayPauseButton);
    audio.addEventListener("pause", updatePlayPauseButton);

    audio.addEventListener("ended", () => {
      if (isRepeat) {
        audio.currentTime = 0;
        play();
      } else {
        nextTrack();
      }
    });

    progressWrap.addEventListener("click", event => {
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
      const rect = progressWrap.getBoundingClientRect();
      const pct = (event.clientX - rect.left) / rect.width;
      audio.currentTime = Math.max(0, Math.min(audio.duration, pct * audio.duration));
    });

    search.addEventListener("input", () => {
      filterTracks();
      renderPlaylist();
    });

    localFiles.addEventListener("change", event => {
      loadLocalLibrary(event.target.files);
      event.target.value = "";
    });

    localFolder.addEventListener("change", event => {
      loadLocalLibrary(event.target.files);
      event.target.value = "";
    });

    demoBtn.addEventListener("click", loadDemoLibrary);

    sortBtn.addEventListener("click", () => {
      currentSort = currentSort === "album" ? "title" : "album";
      applySort();
    });

    rescanBtn.addEventListener("click", () => {
      statusEl.textContent = "GDRIVE NEXT";
      alert("Google Drive folder scanning will be added in the next phase. For now, use ADD FILES or ADD FOLDER for local playback.");
    });

    engineMode.addEventListener("change", () => {
      rebuildAudioGraph();
    });

    volume.addEventListener("input", updateAudioValues);
    preamp.addEventListener("input", updateAudioValues);

    document.querySelectorAll("[data-eq]").forEach(input => {
      input.addEventListener("input", event => {
        const index = Number(event.target.dataset.eq);
        const value = Number(event.target.value);
        if (eqFilters[index]) eqFilters[index].gain.value = value;
        const label = document.getElementById(`eq${index}`);
        if (label) label.textContent = String(value);
      });
    });

    document.addEventListener("keydown", event => {
      if (event.target.tagName === "INPUT" || event.target.tagName === "SELECT") return;

      if (event.code === "Space") {
        event.preventDefault();
        audio.paused ? play() : pause();
      }

      if (event.code === "ArrowRight") nextTrack();
      if (event.code === "ArrowLeft") prevTrack();
    });

    // Initial state
    loadDemoLibrary();
    updateAudioValues();
    rebuildAudioGraph();
