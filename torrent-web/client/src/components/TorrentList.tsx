import { TorrentCard } from "./TorrentCard";
import { Torrent } from "../types";

interface TorrentDownloadState {
  isDownloading: boolean;
  isComplete: boolean;
  isPaused: boolean;
  progress: number;
  infoHash?: string;
}

interface TorrentListProps {
  torrents: Torrent[];
  loading: boolean;
  onGetMagnet: (torrent: Torrent) => void;
  onDownload: (torrent: Torrent) => void;
  onBadgeClick?: (type: string, value: string) => void;
  downloadingTorrents?: Set<string>;
  onStream?: (torrent: Torrent) => void;
  getStreamState?: (torrent: Torrent) => 'ready' | 'waiting' | 'unavailable';
  isTorrentDownloading?: (torrent: Torrent) => boolean;
  getTorrentDownloadState?: (torrent: Torrent) => TorrentDownloadState;
  onPauseTorrent?: (torrent: Torrent) => void;
  onResumeTorrent?: (torrent: Torrent) => void;
  onNavigateToDownloads?: (infoHash?: string) => void;
}

export function TorrentList({
  torrents,
  loading,
  onGetMagnet,
  onDownload,
  onBadgeClick,
  downloadingTorrents,
  onStream,
  getStreamState,
  isTorrentDownloading,
  getTorrentDownloadState,
  onPauseTorrent,
  onResumeTorrent,
  onNavigateToDownloads
}: TorrentListProps) {
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
      {torrents.map((torrent, index) => {
        const torrentId = torrent.raw?.id || torrent.title;
        const downloadState = getTorrentDownloadState?.(torrent) || { 
          isDownloading: downloadingTorrents?.has(torrentId) || false, 
          isComplete: false, 
          isPaused: false,
          progress: 0 
        };
        const streamState = getStreamState?.(torrent) || 'unavailable';
        return (
          <TorrentCard
            key={index}
            torrent={torrent}
            onGetMagnet={() => onGetMagnet(torrent)}
            onDownload={() => onDownload(torrent)}
            onBadgeClick={onBadgeClick}
            downloadState={downloadState}
            onStream={onStream ? () => onStream(torrent) : undefined}
            streamState={streamState}
            onPause={onPauseTorrent ? () => onPauseTorrent(torrent) : undefined}
            onResume={onResumeTorrent ? () => onResumeTorrent(torrent) : undefined}
            onViewInDownloads={onNavigateToDownloads ? () => onNavigateToDownloads(downloadState.infoHash) : undefined}
          />
        );
      })}
    </div>
  );
}
