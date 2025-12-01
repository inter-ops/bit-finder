import { useState } from 'preact/hooks';
import { Torrent } from '../types';
import { formatRelativeTime } from '../utils/timeFormat';

interface TorrentCardProps {
  torrent: Torrent;
  onGetMagnet: () => void;
  onDownload: () => void;
  onBadgeClick: (type: string, value: string) => void;
}

export function TorrentCard({
  torrent,
  onGetMagnet,
  onDownload,
  onBadgeClick,
}: TorrentCardProps) {
  const { title, seeds, peers, size, provider, link, metadata, category } = torrent;
  const [expanded, setExpanded] = useState(false);
  
  // Check if title is long enough to potentially be truncated in display
  const isTruncated = title.length > 80;

  const handleBadgeClick = (type: string, value: string) => {
    if (onBadgeClick) {
      onBadgeClick(type, value);
    }
  };

  return (
    <div class="torrent-card">
      <div class="torrent-header">
        <div class="title-row">
          <h3 
            class={`torrent-title ${isTruncated ? 'clickable' : ''}`}
            onClick={() => isTruncated && setExpanded(!expanded)}
            title={isTruncated && !expanded ? title : undefined}
          >
            {expanded || !isTruncated ? title : title.substring(0, 80) + '...'}
            {isTruncated && (
              <span class="expand-icon">{expanded ? ' ▼' : ' ▶'}</span>
            )}
          </h3>
          {link && (
            <a 
              href={link} 
              target="_blank" 
              rel="noopener noreferrer" 
              class="source-link-inline"
              title="View on provider site"
            >
              ↗
            </a>
          )}
        </div>
        
        {/* Quality badges */}
        <div class="badges">
          {category && (
            <button
              class="badge badge-category badge-clickable"
              onClick={() => onBadgeClick('category', torrent.category)}
              title="Click to filter by category"
            >
              {torrent.category}
            </button>
          )}
          {metadata.resolution && (
            <button
              class="badge badge-resolution badge-clickable"
              onClick={() => onBadgeClick('resolution', metadata.resolution!)}
              title="Click to filter by resolution"
            >
              {metadata.resolution}
            </button>
          )}
          {metadata.videoCodec && (
            <button 
              class="badge badge-codec badge-clickable" 
              onClick={() => handleBadgeClick('videoCodec', metadata.videoCodec!)}
              title="Filter by this codec"
            >
              {metadata.videoCodec}
            </button>
          )}
          {metadata.audioCodec && (
            <button 
              class="badge badge-audio badge-clickable" 
              onClick={() => handleBadgeClick('audioCodec', metadata.audioCodec!)}
              title="Filter by this audio"
            >
              {metadata.audioCodec}
            </button>
          )}
          {metadata.source && (
            <button 
              class="badge badge-source badge-clickable" 
              onClick={() => handleBadgeClick('source', metadata.source!)}
              title="Filter by this source"
            >
              {metadata.source}
            </button>
          )}
          {metadata.hdr && (
            <button 
              class="badge badge-hdr badge-clickable" 
              onClick={() => handleBadgeClick('hdr', metadata.hdr!)}
              title="Filter by this HDR type"
            >
              {metadata.hdr}
            </button>
          )}
          {metadata.season && metadata.episode && (
            <span class="badge badge-tv">
              {metadata.season}{metadata.episode}
            </span>
          )}
          {metadata.audioChannels && (
            <span class="badge badge-channels">
              {metadata.audioChannels}
            </span>
          )}
          {metadata.bitDepth && (
            <span class="badge badge-depth">
              {metadata.bitDepth}
            </span>
          )}
          {metadata.releaseGroup && (
            <span class="badge badge-group">
              {metadata.releaseGroup}
            </span>
          )}
          {metadata.languages && metadata.languages.length > 0 && (
            <span class="badge badge-lang">
              {metadata.languages.join(', ')}
            </span>
          )}
          {metadata.subtitles && metadata.subtitles.length > 0 && (
            <span class="badge badge-subs">
              Subs: {metadata.subtitles.join(', ')}
            </span>
          )}
        </div>

        <div class="torrent-stats">
          <div class="stat">
            <span class="stat-label">Seeds:</span>
            <span class="stat-value seeds">
              {seeds === null || seeds === undefined ? 'Missing' : (metadata.isYTSCapped && seeds === 100 ? '100+' : seeds)}
            </span>
          </div>
          <div class="stat">
            <span class="stat-label">Peers:</span>
            <span class="stat-value peers">
              {peers === null || peers === undefined ? 'Missing' : (metadata.isYTSCapped && peers === 100 ? '100+' : peers)}
            </span>
          </div>
          <div class="stat">
            <span class="stat-label">Size:</span>
            <span class="stat-value">{size}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Provider:</span>
            <span class="stat-value">{provider}</span>
          </div>
          {torrent.time && (() => {
            const { relative, full } = formatRelativeTime(torrent.time);
            return (
              <div class="stat">
                <span class="stat-label">Uploaded:</span>
                <span class="stat-value" title={full}>{relative}</span>
              </div>
            );
          })()}
        </div>
      </div>

      <div class="torrent-actions">
        <button class="btn btn-secondary" onClick={onGetMagnet}>
          Copy Magnet
        </button>
        <button class="btn btn-primary" onClick={onDownload}>
          Download
        </button>
      </div>
    </div>
  );
}