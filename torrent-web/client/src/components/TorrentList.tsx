import { TorrentCard } from './TorrentCard';
import { Torrent } from '../types';

interface TorrentListProps {
  torrents: Torrent[];
  loading: boolean;
  onGetMagnet: (torrent: Torrent) => void;
  onDownload: (torrent: Torrent) => void;
  onBadgeClick?: (type: string, value: string) => void;
}

export function TorrentList({ torrents, loading, onGetMagnet, onDownload, onBadgeClick }: TorrentListProps) {
  if (loading) {
    return (
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Searching...</p>
      </div>
    );
  }

  if (torrents.length === 0) {
    return (
      <div class="empty-state">
        <p>No results. Search for something above.</p>
      </div>
    );
  }

  return (
    <div class="torrent-list">
      {torrents.map((torrent, index) => (
        <TorrentCard
          key={index}
          torrent={torrent}
          onGetMagnet={() => onGetMagnet(torrent)}
          onDownload={() => onDownload(torrent)}
          onBadgeClick={onBadgeClick}
        />
      ))}
    </div>
  );
}