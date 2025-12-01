import { h } from "preact";
import { useState, useEffect } from "preact/hooks";
import DownloadCard from "../components/DownloadCard";
import "../styles/downloads.css";

// WebTorrent torrent info interface
export interface WebTorrentInfo {
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
  magnetURI: string;
  files: FileInfo[];
}

interface FileInfo {
  name: string;
  path: string;
  size: number;
  downloaded: number;
  progress: number;
  index: number;
}

export default function Downloads() {
  const [torrents, setTorrents] = useState<WebTorrentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTorrents = async () => {
    try {
      const response = await fetch("/api/torrents");
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setTorrents([]);
      } else {
        setTorrents(data.torrents || []);
        setError(null);
      }
    } catch (err) {
      setError("Failed to fetch torrents");
      setTorrents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTorrents();

    // Auto-refresh every 2 seconds
    const interval = setInterval(fetchTorrents, 2000);

    return () => clearInterval(interval);
  }, []);

  const handlePause = async (infoHash: string) => {
    try {
      await fetch(`/api/torrents/${infoHash}/pause`, { method: "POST" });
      fetchTorrents();
    } catch (err) {
      console.error("Failed to pause torrent:", err);
    }
  };

  const handleResume = async (infoHash: string) => {
    try {
      await fetch(`/api/torrents/${infoHash}/resume`, { method: "POST" });
      fetchTorrents();
    } catch (err) {
      console.error("Failed to resume torrent:", err);
    }
  };

  const handleRemove = async (infoHash: string) => {
    if (!confirm("Remove this torrent from the list? (Files will be kept)")) return;

    try {
      await fetch(`/api/torrents/${infoHash}/remove`, { method: "DELETE" });
      fetchTorrents();
    } catch (err) {
      console.error("Failed to remove torrent:", err);
    }
  };

  const handleDelete = async (infoHash: string) => {
    if (!confirm("Delete this torrent AND all downloaded files? This cannot be undone!")) return;

    try {
      await fetch(`/api/torrents/${infoHash}/delete`, { method: "DELETE" });
      fetchTorrents();
    } catch (err) {
      console.error("Failed to delete torrent:", err);
    }
  };

  if (loading) {
    return (
      <div class="downloads-page">
        <div class="downloads-header">
          <h1>Downloads</h1>
        </div>
        <div class="downloads-loading">Loading torrents...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div class="downloads-page">
        <div class="downloads-header">
          <h1>Downloads</h1>
        </div>
        <div class="downloads-error">{error}</div>
      </div>
    );
  }

  return (
    <div class="downloads-page">
      <div class="downloads-header">
        <h1>Downloads</h1>
        <div class="downloads-stats">
          {torrents.length} active torrent{torrents.length !== 1 ? "s" : ""}
        </div>
      </div>

      {torrents.length === 0 ? (
        <div class="downloads-empty">
          <p>No active downloads</p>
          <p class="downloads-empty-hint">Torrents you download will appear here</p>
        </div>
      ) : (
        <div class="downloads-list">
          {torrents.map((torrent) => (
            <DownloadCard
              key={torrent.infoHash}
              torrent={torrent}
              onPause={() => handlePause(torrent.infoHash)}
              onResume={() => handleResume(torrent.infoHash)}
              onRemove={() => handleRemove(torrent.infoHash)}
              onDelete={() => handleDelete(torrent.infoHash)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
