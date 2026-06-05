// Google Drive Picker integration for the Particle Music Player.
//
// Requirements in Google Cloud Console:
// 1. Drive API enabled
// 2. Google Picker API enabled, if shown in your console
// 3. OAuth Client ID created for Web application
// 4. Authorized JavaScript origins include your GitHub Pages URL
// 5. API key restricted to your GitHub Pages origin and Google APIs used here

(function () {
  let tokenClient = null;
  let accessToken = null;
  let pickerReady = false;
  let gisReady = false;
  let gapiReady = false;

  const AUDIO_MIME_TYPES = [
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/aac",
    "audio/wav",
    "audio/x-wav",
    "audio/flac",
    "audio/ogg",
    "audio/webm"
  ].join(",");

  function getConfig() {
    return {
      clientId: window.GoogleDriveConfig?.clientId || "",
      apiKey: window.GoogleDriveConfig?.apiKey || "",
      scopes: window.GoogleDriveConfig?.scopes || "https://www.googleapis.com/auth/drive.file"
    };
  }

  function isConfigured() {
    const config = getConfig();
    return Boolean(
      config.clientId &&
      config.apiKey &&
      !config.clientId.startsWith("xxxxxxxx") &&
      config.apiKey !== "xxxxxxxx"
    );
  }

  function loadGapi() {
    if (!window.gapi) return;
    window.gapi.load("client:picker", async () => {
      try {
        await window.gapi.client.init({
          apiKey: getConfig().apiKey,
          discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"]
        });
        gapiReady = true;
        pickerReady = Boolean(window.google?.picker);
      } catch (error) {
        console.error("Google API initialization failed:", error);
      }
    });
  }

  function initGis() {
    if (!window.google?.accounts?.oauth2) return;

    const config = getConfig();
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: config.clientId,
      scope: config.scopes,
      callback: (response) => {
        if (response.error) {
          console.error("Google token error:", response);
          alert("Google sign-in failed. Check your OAuth setup.");
          return;
        }
        accessToken = response.access_token;
        createPicker();
      }
    });

    gisReady = true;
  }

  function waitForGoogleLibraries() {
    const started = Date.now();

    const timer = setInterval(() => {
      if (!gapiReady) loadGapi();
      if (!gisReady) initGis();

      if ((gapiReady && gisReady) || Date.now() - started > 10000) {
        clearInterval(timer);
      }
    }, 250);
  }

  function openPicker() {
    if (!isConfigured()) {
      alert("Google Drive is not configured. Add your real Client ID and API key in js/config.js.");
      return;
    }

    if (!gapiReady || !gisReady || !tokenClient) {
      waitForGoogleLibraries();
      alert("Google Drive is still loading. Try again in a moment.");
      return;
    }

    if (accessToken) {
      createPicker();
      return;
    }

    tokenClient.requestAccessToken({ prompt: "consent" });
  }

  function createPicker() {
    const config = getConfig();

    if (!window.google?.picker || !accessToken) {
      alert("Google Picker is not ready. Refresh the page and try again.");
      return;
    }

    const audioView = new google.picker.DocsView(google.picker.ViewId.DOCS)
      .setIncludeFolders(false)
      .setSelectFolderEnabled(false)
      .setMimeTypes(AUDIO_MIME_TYPES);

    const picker = new google.picker.PickerBuilder()
      .setAppId(config.clientId.split("-")[0])
      .setOAuthToken(accessToken)
      .setDeveloperKey(config.apiKey)
      .addView(audioView)
      .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
      .setCallback(handlePickerResponse)
      .build();

    picker.setVisible(true);
  }

  async function handlePickerResponse(data) {
    if (data.action !== google.picker.Action.PICKED) return;

    const docs = data.docs || [];
    if (!docs.length) return;

    try {
      const entries = [];

      for (const doc of docs) {
        const fileId = doc.id;
        const name = doc.name || doc.title || "Google Drive Track";

        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });

        if (!response.ok) {
          throw new Error(`Could not download ${name}: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();

        entries.push({
          blob,
          name,
          driveFileId: fileId,
          source: "google-drive"
        });
      }

      if (window.ParticlePlayer?.loadBlobTracks) {
        window.ParticlePlayer.loadBlobTracks(entries, true);
      } else {
        alert("Player is not ready to receive Google Drive tracks.");
      }
    } catch (error) {
      console.error(error);
      alert("Could not load one or more Google Drive audio files. Check Drive permissions and API setup.");
    }
  }

  window.GoogleDriveConfig = window.GoogleDriveConfig || {
    get clientId() {
      return typeof GOOGLE_CLIENT_ID !== "undefined" ? GOOGLE_CLIENT_ID : "";
    },
    get apiKey() {
      return typeof GOOGLE_API_KEY !== "undefined" ? GOOGLE_API_KEY : "";
    },
    get scopes() {
      return typeof GOOGLE_SCOPES !== "undefined" ? GOOGLE_SCOPES : "";
    }
  };

  window.GoogleDrivePlayer = {
    openPicker,
    isConfigured
  };

  waitForGoogleLibraries();
})();
