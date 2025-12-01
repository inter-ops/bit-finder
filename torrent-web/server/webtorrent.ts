import WebTorrent from "webtorrent";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

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
}

interface PersistedState {
  torrents: Record<string, TorrentState>;
}

function loadState(): PersistedState {
  try {
    if (existsSync(STATE_FILE)) {
      const data = readFileSync(STATE_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Failed to load WebTorrent state:", error);
  }
  return { torrents: {} };
}

function saveState() {
  try {
    const state: PersistedState = { torrents: {} };

    client.torrents.forEach((torrent) => {
      state.torrents[torrent.infoHash] = {
        magnetURI: torrent.magnetURI,
        paused: torrent.paused,
        addedAt: Date.now()
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
  const magnetURIs = Object.values(state.torrents);

  console.log(`Restoring ${magnetURIs.length} torrents...`);

  for (const torrentState of magnetURIs) {
    try {
      await addTorrent(torrentState.magnetURI, { paused: torrentState.paused });
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
  options: { paused?: boolean } = {}
): Promise<TorrentInfo> {
  return new Promise((resolve, reject) => {
    // Check if already added
    const existing = client.get(magnetURI);
    if (existing) {
      resolve(formatTorrentInfo(existing));
      return;
    }

    const torrent = client.add(magnetURI, {
      path: DOWNLOAD_PATH,
      // Enable sequential download for streaming
      strategy: "sequential"
    });

    torrent.on("ready", () => {
      console.log(`Torrent ready: ${torrent.name}`);

      // If should be paused, pause it
      if (options.paused) {
        torrent.pause();
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

    torrent.on("error", (err) => {
      console.error(`Torrent error: ${err.message}`);
      reject(err);
    });

    torrent.on("done", () => {
      console.log(`Torrent complete: ${torrent.name}`);
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
      client.remove(torrent, { destroyStore: deleteFiles }, (err) => {
        if (err) {
          console.error(`Failed to remove torrent: ${err.message}`);
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

// Export client for advanced usage
export { client };
