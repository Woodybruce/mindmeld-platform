import { SpotifyApi } from "@spotify/web-api-ts-sdk";

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "";
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "";
const SCOPES = [
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-private",
  "playlist-modify-public",
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-read-currently-playing",
  "user-read-recently-played",
  "user-top-read",
  "user-library-read",
  "user-library-modify",
  "streaming",
  "app-remote-control",
  "user-modify-playback-state",
];

let storedAccessToken: string | null = null;
let storedRefreshToken: string | null = null;
let tokenExpiresAt: number = 0;

export function getSpotifyAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: SPOTIFY_CLIENT_ID,
    scope: SCOPES.join(" "),
    redirect_uri: redirectUri,
    show_dialog: "true",
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function exchangeSpotifyCode(code: string, redirectUri: string) {
  const resp = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(SPOTIFY_CLIENT_ID + ":" + SPOTIFY_CLIENT_SECRET).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Spotify token exchange failed: ${resp.status} ${text}`);
  }

  const data = await resp.json();
  storedAccessToken = data.access_token;
  storedRefreshToken = data.refresh_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return data;
}

async function refreshAccessToken(): Promise<string> {
  if (!storedRefreshToken) {
    throw new Error("Spotify not connected — please authorize at /api/spotify/auth");
  }

  if (storedAccessToken && Date.now() < tokenExpiresAt) {
    return storedAccessToken;
  }

  const resp = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(SPOTIFY_CLIENT_ID + ":" + SPOTIFY_CLIENT_SECRET).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: storedRefreshToken,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Spotify token refresh failed: ${resp.status} ${text}`);
  }

  const data = await resp.json();
  storedAccessToken = data.access_token;
  if (data.refresh_token) {
    storedRefreshToken = data.refresh_token;
  }
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return storedAccessToken!;
}

export function isSpotifyConnected(): boolean {
  return !!storedRefreshToken;
}

export async function getUncachableSpotifyClient() {
  const accessToken = await refreshAccessToken();

  const spotify = SpotifyApi.withAccessToken(SPOTIFY_CLIENT_ID, {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: storedRefreshToken!,
  });

  return spotify;
}

export async function spotifyApiFetch(path: string, options: RequestInit = {}) {
  const accessToken = await refreshAccessToken();
  const resp = await fetch(`https://api.spotify.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Spotify API error ${resp.status}: ${text}`);
  }
  if (resp.status === 204) return null;
  return resp.json();
}

export function invalidateSpotifyCache() {
  storedAccessToken = null;
  tokenExpiresAt = 0;
}
