import { h } from "preact";
import { useState } from "preact/hooks";
import { WebTorrentInfo } from "../pages/Downloads";

interface DownloadCardProps {
  torrent: WebTorrentInfo;
  onPause: () => void;
  onResume: () => void;
  onRemove: () => void;
  onDelete: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return "0 B/s";
  return `${formatBytes(bytesPerSecond)}/s`;
}

function formatETA(milliseconds: number): string {
  if (milliseconds < 0 || milliseconds === Infinity || !isFinite(milliseconds)) return "Unknown";
  if (milliseconds === 0) return "Done";

  const seconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

// Video file extensions
const VIDEO_EXTENSIONS = [".mp4", ".mkv", ".avi", ".webm", ".mov", ".m4v"];

export default function DownloadCard({
  torrent,
  onPause,
  onResume,
  onRemove,
  onDelete
}: DownloadCardProps) {
  const [showPlayer, setShowPlayer] = useState(false);
  const [selectedFile, setSelectedFile] = useState<number | null>(null);

  const isDownloading = !torrent.paused && !torrent.done;
  const isSeeding = torrent.done && !torrent.paused;
  const isStopped = torrent.paused;
  const progress = Math.round(torrent.progress * 100);

  // Find video files (handle undefined files array during metadata loading)
  const files = torrent.files || [];
  const videoFiles = files.filter((file) =>
    VIDEO_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))
  );

  // Can stream if there's a video file and some progress
  const canStream = videoFiles.length > 0 && torrent.progress > 0.01;

  const handleStream = (fileIndex?: number) => {
    if (videoFiles.length === 1) {
      setSelectedFile(videoFiles[0].index);
      setShowPlayer(true);
    } else if (fileIndex !== undefined) {
      setSelectedFile(fileIndex);
      setShowPlayer(true);
    }
  };

  const streamUrl =
    selectedFile !== null
      ? `/api/stream/${torrent.infoHash}?file=${selectedFile}`
      : `/api/stream/${torrent.infoHash}`;

  return (
    <div class="download-card">
      <div class="download-header">
        <div class="download-title">{torrent.name || "Loading..."}</div>
        <div
          class="download-status-badge"
          data-status={isSeeding ? "seeding" : isDownloading ? "downloading" : "stopped"}
        >
          {isSeeding
            ? "Seeding"
            : isDownloading
            ? "Downloading"
            : torrent.done
            ? "Complete"
            : "Paused"}
        </div>
      </div>

      <div class="download-progress-container">
        <div class="download-progress-bar">
          <div
            class="download-progress-fill"
            style={{ width: `${progress}%` }}
            data-status={isSeeding ? "seeding" : isDownloading ? "downloading" : "stopped"}
          />
        </div>
        <div class="download-progress-text">{progress}%</div>
      </div>

      <div class="download-stats">
        <div class="download-stat">
          <span class="stat-label">Download:</span>
          <span class="stat-value stat-download">{formatSpeed(torrent.downloadSpeed)}</span>
        </div>
        <div class="download-stat">
          <span class="stat-label">Upload:</span>
          <span class="stat-value stat-upload">{formatSpeed(torrent.uploadSpeed)}</span>
        </div>
        <div class="download-stat">
          <span class="stat-label">Peers:</span>
          <span class="stat-value">{torrent.numPeers}</span>
        </div>
        {!torrent.done && isDownloading && (
          <div class="download-stat">
            <span class="stat-label">ETA:</span>
            <span class="stat-value">{formatETA(torrent.timeRemaining)}</span>
          </div>
        )}
      </div>

      <div class="download-details">
        <div class="download-detail">
          <span class="detail-label">Size:</span>
          <span class="detail-value">{formatBytes(torrent.totalSize)}</span>
        </div>
        <div class="download-detail">
          <span class="detail-label">Downloaded:</span>
          <span class="detail-value">{formatBytes(torrent.downloaded)}</span>
        </div>
        <div class="download-detail">
          <span class="detail-label">Uploaded:</span>
          <span class="detail-value">{formatBytes(torrent.uploaded)}</span>
        </div>
        <div class="download-detail">
          <span class="detail-label">Files:</span>
          <span class="detail-value">{files.length}</span>
        </div>
      </div>

      <div class="download-actions">
        {canStream &&
          (videoFiles.length === 1 ? (
            <button class="btn btn-stream" onClick={() => handleStream()}>
              ▶ Stream
            </button>
          ) : (
            <div class="stream-dropdown">
              <button class="btn btn-stream">▶ Stream</button>
              <div class="stream-dropdown-content">
                {videoFiles.map((file) => (
                  <button
                    key={file.index}
                    class="stream-file-option"
                    onClick={() => handleStream(file.index)}
                  >
                    {file.name}
                    <span class="file-progress">({Math.round(file.progress * 100)}%)</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        {isStopped ? (
          <button class="btn btn-primary" onClick={onResume}>
            Resume
          </button>
        ) : (
          <button class="btn btn-secondary" onClick={onPause}>
            Pause
          </button>
        )}
        <button class="btn btn-remove" onClick={onRemove}>
          Remove
        </button>
        <button class="btn btn-delete" onClick={onDelete}>
          Delete
        </button>
      </div>

      {/* Video Player Modal */}
      {showPlayer && (
        <div class="video-modal" onClick={() => setShowPlayer(false)}>
          <div class="video-modal-content" onClick={(e) => e.stopPropagation()}>
            <button class="video-close" onClick={() => setShowPlayer(false)}>
              ✕
            </button>
            <video src={streamUrl} controls autoPlay class="video-player">
              Your browser does not support video playback.
            </video>
            <div class="video-info">
              <span class="video-title">{torrent.name}</span>
              <span class="video-progress">Buffer: {progress}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
