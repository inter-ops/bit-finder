import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import DownloadCard from '../components/DownloadCard';
import '../styles/downloads.css';

interface TransmissionTorrent {
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
  seeders: number;
  leechers: number;
  addedDate: number;
}

export default function Downloads() {
  const [torrents, setTorrents] = useState<TransmissionTorrent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTorrents = async () => {
    try {
      const response = await fetch('/api/torrents');
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        setTorrents([]);
      } else {
        setTorrents(data.torrents || []);
        setError(null);
      }
    } catch (err) {
      setError('Failed to fetch torrents');
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

  const handlePause = async (id: number) => {
    try {
      await fetch(`/api/torrents/${id}/pause`, { method: 'POST' });
      fetchTorrents();
    } catch (err) {
      console.error('Failed to pause torrent:', err);
    }
  };

  const handleResume = async (id: number) => {
    try {
      await fetch(`/api/torrents/${id}/resume`, { method: 'POST' });
      fetchTorrents();
    } catch (err) {
      console.error('Failed to resume torrent:', err);
    }
  };

  const handleRemove = async (id: number) => {
    if (!confirm('Remove this torrent from the list? (Files will be kept)')) return;
    
    try {
      await fetch(`/api/torrents/${id}/remove`, { method: 'DELETE' });
      fetchTorrents();
    } catch (err) {
      console.error('Failed to remove torrent:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this torrent AND all downloaded files? This cannot be undone!')) return;
    
    try {
      await fetch(`/api/torrents/${id}/delete`, { method: 'DELETE' });
      fetchTorrents();
    } catch (err) {
      console.error('Failed to delete torrent:', err);
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
          {torrents.length} active torrent{torrents.length !== 1 ? 's' : ''}
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
              key={torrent.id}
              torrent={torrent}
              onPause={() => handlePause(torrent.id)}
              onResume={() => handleResume(torrent.id)}
              onRemove={() => handleRemove(torrent.id)}
              onDelete={() => handleDelete(torrent.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}