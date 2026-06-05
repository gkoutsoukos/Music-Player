// Google Drive helper layer
// This file is intentionally minimal for now.
// The credentials are loaded from js/config.js.
//
// Next implementation step:
// - initialize Google Identity Services
// - allow the user to sign in
// - open Google Picker or list user-selected Drive files
// - pass selected audio file URLs/blobs into the player

window.GoogleDriveConfig = {
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

window.GoogleDriveState = {
  isConfigured() {
    return Boolean(
      window.GoogleDriveConfig.clientId &&
      window.GoogleDriveConfig.apiKey &&
      !window.GoogleDriveConfig.clientId.startsWith("xxxxxxxx") &&
      window.GoogleDriveConfig.apiKey !== "xxxxxxxx"
    );
  }
};
