import { h } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
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
  metadata?: { title: string; provider?: string; size?: string };
}

interface FileInfo {
  name: string;
  path: string;
  size: number;
  downloaded: number;
  progress: number;
  index: number;
}

interface DownloadsProps {
  highlightedInfoHash?: string | null;
}

function formatSpeed(bytesPerSecond: number): string {
  if (!bytesPerSecond || bytesPerSecond <= 0 || !isFinite(bytesPerSecond)) return "0 B/s";
  const k = 1024;
  const sizes = ["B/s", "KB/s", "MB/s", "GB/s"];
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
  return `${(bytesPerSecond / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function Downloads({ highlightedInfoHash }: DownloadsProps) {
  const [torrents, setTorrents] = useState<WebTorrentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const highlightedRef = useRef<HTMLDivElement>(null);
  
  // Scroll to highlighted torrent when it appears
  useEffect(() => {
    if (highlightedInfoHash && highlightedRef.current) {
      highlightedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedInfoHash, torrents]);

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

  // Calculate stats
  const downloadingCount = torrents.filter(t => !t.done && !t.paused).length;
  const completedCount = torrents.filter(t => t.done).length;
  const totalDownloadSpeed = torrents.reduce((sum, t) => sum + t.downloadSpeed, 0);

  return (
    <div class="downloads-page">
      <div class="downloads-header">
        <h1>Downloads</h1>
        <div class="downloads-stats">
          {downloadingCount > 0 && (
            <span class="stat-downloading">
              {downloadingCount} downloading
            </span>
          )}
          {downloadingCount > 0 && completedCount > 0 && <span class="stat-sep">•</span>}
          {completedCount > 0 && (
            <span class="stat-completed">
              {completedCount} completed
            </span>
          )}
          {totalDownloadSpeed > 0 && (
            <>
              <span class="stat-sep">•</span>
              <span class="stat-speed">↓ {formatSpeed(totalDownloadSpeed)}</span>
            </>
          )}
          {torrents.length === 0 && <span>No torrents</span>}
        </div>
      </div>

      {torrents.length === 0 ? (
        <div class="downloads-empty">
          <p>No active downloads</p>
          <p class="downloads-empty-hint">Torrents you download will appear here</p>
        </div>
      ) : (
        <div class="downloads-list">
          {torrents.map((torrent) => {
            const isHighlighted = highlightedInfoHash === torrent.infoHash;
            return (
              <div key={torrent.infoHash} ref={isHighlighted ? highlightedRef : undefined}>
                <DownloadCard
                  torrent={torrent}
                  onPause={() => handlePause(torrent.infoHash)}
                  onResume={() => handleResume(torrent.infoHash)}
                  onRemove={() => handleRemove(torrent.infoHash)}
                  onDelete={() => handleDelete(torrent.infoHash)}
                  isHighlighted={isHighlighted}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
