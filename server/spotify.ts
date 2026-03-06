import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import { db } from "./db";
import { appSettings } from "@shared/schema";
import { eq } from "drizzle-orm";

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
let tokensLoaded = false;

async function loadTokensFromDB() {
  if (tokensLoaded) return;
  try {
    const row = await db.select().from(appSettings).where(eq(appSettings.key, "spotify_tokens")).limit(1);
    if (row.length > 0) {
      const data = JSON.parse(row[0].value);
      storedAccessToken = data.access_token || null;
      storedRefreshToken = data.refresh_token || null;
      tokenExpiresAt = data.expires_at || 0;
      console.log("Spotify tokens loaded from database");
    }
  } catch (e) {
    console.log("Could not load Spotify tokens from database");
  }
  tokensLoaded = true;
}

async function saveTokensToDB() {
  try {
    const value = JSON.stringify({
      access_token: storedAccessToken,
      refresh_token: storedRefreshToken,
      expires_at: tokenExpiresAt,
    });
    await db.insert(appSettings)
      .values({ key: "spotify_tokens", value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value, updatedAt: new Date() },
      });
  } catch (e: any) {
    console.error("Failed to save Spotify tokens to DB:", e.message);
  }
}

async function loadTokens() {
  if (tokensLoaded) return;
  await loadTokensFromDB();
}

async function saveTokens() {
  await saveTokensToDB();
}

export async function initSpotifyTokens() {
  await loadTokens();
}

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
  await saveTokens();
  return data;
}

export async function getSpotifyAccessToken(): Promise<string> {
  return refreshAccessToken();
}

async function refreshAccessToken(): Promise<string> {
  await loadTokens();

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
  await saveTokens();
  return storedAccessToken!;
}

export async function isSpotifyConnected(): Promise<boolean> {
  await loadTokens();
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
