/**
 * Client for the 1337x Python API server
 * Fetches torrents from 1337x.to via the Python server that handles Cloudflare bypass
 */

const API_URL = process.env.LEET_API_URL || "http://localhost:8000";

export interface Torrent1337x {
  title: string;
  seeds: number;
  peers: number;
  size: string;
  time: string;
  desc: string; // URL to detail page (used to get magnet)
  provider: "1337x";
}

interface SearchResponse {
  torrents: Torrent1337x[];
  error?: string;
}

interface MagnetResponse {
  magnet: string;
  title?: string;
}

/**
 * Check if the 1337x API server is available
 */
export async function isAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/`, {
      signal: AbortSignal.timeout(2000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Search 1337x.to for torrents
 */
export async function search(query: string, limit = 50): Promise<Torrent1337x[]> {
  try {
    const url = `${API_URL}/api/search?query=${encodeURIComponent(query)}&limit=${limit}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(30000) // 30s timeout for first request (may need to fetch cookies)
    });

    if (!response.ok) {
      console.error(`[1337x] Search failed: ${response.status}`);
      return [];
    }

    const data: SearchResponse = await response.json();

    if (data.error) {
      console.error(`[1337x] Search error: ${data.error}`);
      return [];
    }

    return data.torrents || [];
  } catch (error) {
    console.error("[1337x] Search error:", error);
    return [];
  }
}

/**
 * Get magnet link for a 1337x torrent
 */
export async function getMagnet(torrentUrl: string): Promise<string | null> {
  try {
    const url = `${API_URL}/api/magnet?url=${encodeURIComponent(torrentUrl)}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      console.error(`[1337x] Magnet failed: ${response.status}`);
      return null;
    }

    const data: MagnetResponse = await response.json();
    return data.magnet || null;
  } catch (error) {
    console.error("[1337x] Magnet error:", error);
    return null;
  }
}
