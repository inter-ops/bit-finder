import { h } from 'preact';

interface DownloadCardProps {
  torrent: {
    id: number;
    name: string;
    status: number;
    percentDone: number;
    rateDownload: number;
    rateUpload: number;
    uploadRatio: number;
    eta: number;
    totalSize: number;
    uploadedEver: number;
    downloadedEver: number;
    peersConnected: number;
    peersGettingFromUs: number;
    peersSendingToUs: number;
    addedDate: number;
  };
  onPause: () => void;
  onResume: () => void;
  onRemove: () => void;
  onDelete: () => void;
}

const STATUS_LABELS: Record<number, string> = {
  0: 'Stopped',
  1: 'Checking files',
  2: 'Checking files',
  3: 'Downloading',
  4: 'Downloading',
  5: 'Seeding',
  6: 'Seeding',
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return '0 B/s';
  return `${formatBytes(bytesPerSecond)}/s`;
}

function formatETA(seconds: number): string {
  if (seconds < 0 || seconds === Infinity) return 'Unknown';
  if (seconds === 0) return 'Done';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

export default function DownloadCard({ torrent, onPause, onResume, onRemove, onDelete }: DownloadCardProps) {
  const isActive = torrent.status === 3 || torrent.status === 4; // Downloading
  const isSeeding = torrent.status === 5 || torrent.status === 6; // Seeding
  const isStopped = torrent.status === 0;
  const progress = Math.round(torrent.percentDone * 100);
  
  return (
    <div class="download-card">
      <div class="download-header">
        <div class="download-title">{torrent.name}</div>
        <div class="download-status-badge" data-status={isSeeding ? 'seeding' : isActive ? 'downloading' : 'stopped'}>
          {STATUS_LABELS[torrent.status] || 'Unknown'}
        </div>
      </div>

      <div class="download-progress-container">
        <div class="download-progress-bar">
          <div 
            class="download-progress-fill" 
            style={{ width: `${progress}%` }}
            data-status={isSeeding ? 'seeding' : isActive ? 'downloading' : 'stopped'}
          />
        </div>
        <div class="download-progress-text">{progress}%</div>
      </div>

      <div class="download-stats">
        <div class="download-stat">
          <span class="stat-label">Download:</span>
          <span class="stat-value stat-download">{formatSpeed(torrent.rateDownload)}</span>
        </div>
        <div class="download-stat">
          <span class="stat-label">Upload:</span>
          <span class="stat-value stat-upload">{formatSpeed(torrent.rateUpload)}</span>
        </div>
        <div class="download-stat">
          <span class="stat-label">Peers:</span>
          <span class="stat-value">
            <span class="stat-download">{torrent.peersSendingToUs}</span>
            {' / '}
            <span class="stat-upload">{torrent.peersGettingFromUs}</span>
            {' / '}
            {torrent.peersConnected}
          </span>
        </div>
        <div class="download-stat">
          <span class="stat-label">Ratio:</span>
          <span class="stat-value">{torrent.uploadRatio.toFixed(2)}</span>
        </div>
      </div>

      <div class="download-details">
        <div class="download-detail">
          <span class="detail-label">Size:</span>
          <span class="detail-value">{formatBytes(torrent.totalSize)}</span>
        </div>
        <div class="download-detail">
          <span class="detail-label">Downloaded:</span>
          <span class="detail-value">{formatBytes(torrent.downloadedEver)}</span>
        </div>
        <div class="download-detail">
          <span class="detail-label">Uploaded:</span>
          <span class="detail-value">{formatBytes(torrent.uploadedEver)}</span>
        </div>
        {isActive && (
          <div class="download-detail">
            <span class="detail-label">ETA:</span>
            <span class="detail-value">{formatETA(torrent.eta)}</span>
          </div>
        )}
      </div>

      <div class="download-actions">
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
          Delete Data
        </button>
      </div>
    </div>
  );
}