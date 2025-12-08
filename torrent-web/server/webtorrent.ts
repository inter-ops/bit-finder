import WebTorrent from "webtorrent";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// TODO: automatically connect to vpn with new ip so we never use same location or risk not being on vpn

// Configuration - resolve ~ to home directory
const rawDownloadPath = process.env.DOWNLOAD_PATH || "~/Downloads";
const DOWNLOAD_PATH = rawDownloadPath.startsWith("~")
  ? join(homedir(), rawDownloadPath.slice(1))
  : rawDownloadPath;
const STATE_FILE = join(DOWNLOAD_PATH, ".webtorrent-state.json");

// Ensure download directory exists
if (!existsSync(DOWNLOAD_PATH)) {
  mkdirSync(DOWNLOAD_PATH, { recursive: true });
}

console.log(`WebTorrent download path: ${DOWNLOAD_PATH}`);

// WebTorrent client instance - disable WebRTC (not needed for server-side)
const client = new WebTorrent({
  webSeeds: false
});

// State persistence
interface TorrentState {
  magnetURI: string;
  paused: boolean;
  addedAt: number;
  done: boolean;
  // Metadata for matching torrents across browsers
  metadata?: {
    title: string;
    provider?: string;
    size?: string;
  };
}

interface PersistedState {
  torrents: Record<string, TorrentState>;
}

function loadState(): PersistedState {
  try {
    if (existsSync(STATE_FILE)) {
      console.log("Loading existing WebTorrent state from:", STATE_FILE);
      const data = readFileSync(STATE_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Failed to load WebTorrent state:", error);
  }

  console.log("No WebTorrent state file found, creating new state");
  return { torrents: {} };
}

// Store metadata for each torrent (by infoHash)
const torrentMetadata: Record<string, { title: string; provider?: string; size?: string }> = {};

function saveState() {
  try {
    const state: PersistedState = { torrents: {} };

    client.torrents.forEach((torrent) => {
      state.torrents[torrent.infoHash] = {
        magnetURI: torrent.magnetURI,
        paused: torrent.paused,
        addedAt: Date.now(),
        done: torrent.done,
        metadata: torrentMetadata[torrent.infoHash]
      };
    });

    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error("Failed to save WebTorrent state:", error);
  }
}

// Restore torrents on startup
async function restoreTorrents() {
  const state = loadState();

  console.log(`Restoring ${Object.keys(state.torrents).length} torrents...`);

  for (const [infoHash, torrentState] of Object.entries(state.torrents)) {
    try {
      // Restore metadata if available
      if (torrentState.metadata) {
        torrentMetadata[infoHash] = torrentState.metadata;
      }

      // If torrent was complete, pause it after adding to prevent re-verification/seeding
      const shouldPause = torrentState.paused || torrentState.done;
      await addTorrent(torrentState.magnetURI, {
        paused: shouldPause,
        wasComplete: torrentState.done
      });
    } catch (error) {
      console.error(`Failed to restore torrent:`, error);
    }
  }
}

// Initialize - restore torrents after a delay to let the server start
setTimeout(() => {
  restoreTorrents();
}, 1000);

// Torrent info type for API responses
export interface TorrentInfo {
  infoHash: string;
  name: string;
  progress: number;
  downloadSpeed: number;
  uploadSpeed: number;
  numPeers: number;
  downloaded: number;
  uploaded: number;
  totalSize: number;
  timeRemaining: number;
  paused: boolean;
  done: boolean;
  files: FileInfo[];
  magnetURI: string;
}

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  downloaded: number;
  progress: number;
  index: number;
}

function formatTorrentInfo(torrent: WebTorrent.Torrent): TorrentInfo {
  // Handle case where files haven't loaded yet (during metadata fetch)
  const files = torrent.files || [];

  return {
    infoHash: torrent.infoHash,
    name: torrent.name || "Loading...",
    progress: torrent.progress || 0,
    downloadSpeed: torrent.downloadSpeed || 0,
    uploadSpeed: torrent.uploadSpeed || 0,
    numPeers: torrent.numPeers || 0,
    downloaded: torrent.downloaded || 0,
    uploaded: torrent.uploaded || 0,
    totalSize: torrent.length || 0,
    timeRemaining: torrent.timeRemaining || Infinity,
    paused: torrent.paused || false,
    done: torrent.done || false,
    magnetURI: torrent.magnetURI,
    files: files.map((file, index) => ({
      name: file.name,
      path: file.path,
      size: file.length,
      downloaded: file.downloaded,
      progress: file.progress,
      index
    }))
  };
}

// Add a torrent
export async function addTorrent(
  magnetURI: string,
  options: {
    paused?: boolean;
    wasComplete?: boolean;
    metadata?: { title: string; provider?: string; size?: string };
  } = {}
): Promise<TorrentInfo> {
  console.log("Adding torrent");

  // Check if already added
  const existing = await client.get(magnetURI);
  if (existing) {
    console.log("Torrent already added:", existing);
    // Update metadata if provided
    if (options.metadata) {
      torrentMetadata[existing.infoHash] = options.metadata;
      saveState();
    }
    return formatTorrentInfo(existing);
  }

  return new Promise((resolve, reject) => {
    const torrent = client.add(magnetURI, {
      path: DOWNLOAD_PATH,
      // Enable sequential download for streaming
      strategy: "sequential"
    });

    torrent.on("ready", () => {
      console.log(`Torrent ready: ${torrent.name}`);

      // Store metadata if provided
      if (options.metadata) {
        torrentMetadata[torrent.infoHash] = options.metadata;
      } else {
        // Store name as fallback metadata
        torrentMetadata[torrent.infoHash] = { title: torrent.name || "Unknown" };
      }

      // If should be paused (either explicitly or was complete), pause it
      if (options.paused || options.wasComplete) {
        torrent.pause();
        if (options.wasComplete) {
          console.log(`Torrent was complete, keeping paused: ${torrent.name}`);
        }
      }

      // Prioritize first and last pieces for streaming
      if (torrent.files.length > 0) {
        const mainFile = torrent.files.reduce((a, b) => (a.length > b.length ? a : b));
        // Select the main file for download
        mainFile.select();
      }

      saveState();
      resolve(formatTorrentInfo(torrent));
    });

    torrent.on("error", (err: Error | string) => {
      const message = typeof err === "string" ? err : err.message;
      console.error(`Torrent error: ${message}`);
      reject(err);
    });

    torrent.on("done", () => {
      console.log(`Torrent complete: ${torrent.name}`);
      // Auto-pause to stop uploading when download is complete
      torrent.pause();
      console.log(`Torrent auto-paused after completion: ${torrent.name}`);
      saveState();
    });

    // Timeout for metadata
    setTimeout(() => {
      if (!torrent.ready) {
        reject(new Error("Timeout waiting for torrent metadata"));
      }
    }, 60000);
  });
}

// Get all torrents
export function getTorrents(): TorrentInfo[] {
  return client.torrents.map(formatTorrentInfo);
}

// Get a specific torrent by infoHash
export function getTorrent(infoHash: string): TorrentInfo | null {
  const torrent = client.torrents.find((t) => t.infoHash === infoHash);
  return torrent ? formatTorrentInfo(torrent) : null;
}

// Get raw torrent for streaming
export function getRawTorrent(infoHash: string): WebTorrent.Torrent | null {
  return client.torrents.find((t) => t.infoHash === infoHash) || null;
}

// Pause a torrent
export function pauseTorrent(infoHash: string): boolean {
  const torrent = client.torrents.find((t) => t.infoHash === infoHash);
  if (torrent) {
    torrent.pause();
    saveState();
    return true;
  }
  return false;
}

// Resume a torrent
export function resumeTorrent(infoHash: string): boolean {
  const torrent = client.torrents.find((t) => t.infoHash === infoHash);
  if (torrent) {
    torrent.resume();
    saveState();
    return true;
  }
  return false;
}

// Remove a torrent
export function removeTorrent(infoHash: string, deleteFiles = false): Promise<boolean> {
  return new Promise((resolve) => {
    const torrent = client.torrents.find((t) => t.infoHash === infoHash);
    if (torrent) {
      client.remove(torrent, { destroyStore: deleteFiles }, (err: Error | string | undefined) => {
        if (err) {
          const message = typeof err === "string" ? err : err.message;
          console.error(`Failed to remove torrent: ${message}`);
          resolve(false);
        } else {
          saveState();
          resolve(true);
        }
      });
    } else {
      resolve(false);
    }
  });
}

// Get video file from torrent (largest video file)
export function getVideoFile(infoHash: string): WebTorrent.TorrentFile | null {
  const torrent = getRawTorrent(infoHash);
  if (!torrent) return null;

  const videoExtensions = [".mp4", ".mkv", ".avi", ".webm", ".mov", ".m4v"];

  // Find largest video file
  const videoFiles = torrent.files.filter((file) =>
    videoExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
  );

  if (videoFiles.length === 0) return null;

  return videoFiles.reduce((a, b) => (a.length > b.length ? a : b));
}

// Get file by index
export function getFileByIndex(infoHash: string, fileIndex: number): WebTorrent.TorrentFile | null {
  const torrent = getRawTorrent(infoHash);
  if (!torrent || fileIndex < 0 || fileIndex >= torrent.files.length) {
    return null;
  }
  return torrent.files[fileIndex];
}

/**
 * Match a torrent by metadata (title, provider, size)
 * Returns the matching TorrentInfo if found
 */
export function findTorrentByMetadata(metadata: {
  title: string;
  provider?: string;
  size?: string;
}): TorrentInfo | null {
  // Try to find by exact title match first
  for (const torrent of client.torrents) {
    const storedMetadata = torrentMetadata[torrent.infoHash];
    if (!storedMetadata) continue;

    // Exact title match
    if (storedMetadata.title === metadata.title) {
      // If provider is specified, check it matches
      if (metadata.provider && storedMetadata.provider !== metadata.provider) {
        continue;
      }
      // If size is specified, check it matches
      if (metadata.size && storedMetadata.size !== metadata.size) {
        continue;
      }
      return formatTorrentInfo(torrent);
    }

    // Fallback: check if torrent name contains the search title
    const torrentName = torrent.name || "";
    if (torrentName.includes(metadata.title) || metadata.title.includes(torrentName)) {
      if (metadata.provider && storedMetadata.provider !== metadata.provider) {
        continue;
      }
      return formatTorrentInfo(torrent);
    }
  }

  return null;
}

/**
 * Get download state for multiple torrents by metadata
 */
export function getDownloadStatesForTorrents(
  torrents: Array<{ title: string; provider?: string; size?: string }>
): Record<string, TorrentInfo> {
  const states: Record<string, string> = {}; // title -> infoHash
  const result: Record<string, TorrentInfo> = {};

  for (const torrent of torrents) {
    const match = findTorrentByMetadata(torrent);
    if (match) {
      // Use title as key for matching
      states[torrent.title] = match.infoHash;
      result[torrent.title] = match;
    }
  }

  return result;
}

// Export client for advanced usage
export { client };
