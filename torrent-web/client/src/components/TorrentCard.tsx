import { Torrent } from "../types";
import { formatRelativeTime } from "../utils/timeFormat";

interface TorrentCardProps {
  torrent: Torrent;
  onGetMagnet: () => void;
  onDownload: () => void;
  onBadgeClick: (type: string, value: string) => void;
  isDownloading?: boolean;
}

export function TorrentCard({
  torrent,
  onGetMagnet,
  onDownload,
  onBadgeClick,
  isDownloading = false
}: TorrentCardProps) {
  const { title, seeds, peers, size, provider, link, metadata, category } = torrent;

  const handleBadgeClick = (type: string, value: string) => {
    if (onBadgeClick) {
      onBadgeClick(type, value);
    }
  };

  return (
    <div class="torrent-card">
      <div class="torrent-header">
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            class="torrent-title"
            title={title}
          >
            {title}
          </a>
        ) : (
          <span class="torrent-title" title={title}>
            {title}
          </span>
        )}

        {/* Season/Episode info for TV shows */}
        {metadata.season && (
          <div class="episode-info">
            Season {metadata.season.replace(/^S0?/, "")}
            {metadata.episode && <> › Episode {metadata.episode.replace(/^E0?/, "")}</>}
          </div>
        )}

        {/* Quality badges - only useful quality info */}
        <div class="badges">
          {metadata.resolution && (
            <button
              class="badge badge-resolution badge-clickable"
              onClick={() => onBadgeClick("resolution", metadata.resolution!)}
              title="Click to filter by resolution"
            >
              {metadata.resolution}
            </button>
          )}
          {metadata.videoCodec && (
            <button
              class="badge badge-codec badge-clickable"
              onClick={() => handleBadgeClick("videoCodec", metadata.videoCodec!)}
              title="Filter by this codec"
            >
              {metadata.videoCodec}
            </button>
          )}
          {metadata.source && (
            <button
              class="badge badge-source badge-clickable"
              onClick={() => handleBadgeClick("source", metadata.source!)}
              title="Filter by this source"
            >
              {metadata.source}
            </button>
          )}
          {metadata.hdr && (
            <button
              class="badge badge-hdr badge-clickable"
              onClick={() => handleBadgeClick("hdr", metadata.hdr!)}
              title="Filter by this HDR type"
            >
              {metadata.hdr}
            </button>
          )}
          {metadata.audioCodec && (
            <button
              class="badge badge-audio badge-clickable"
              onClick={() => handleBadgeClick("audioCodec", metadata.audioCodec!)}
              title="Filter by this audio"
            >
              {metadata.audioCodec}
            </button>
          )}
        </div>

        <div class="torrent-stats">
          <span class="stat">
            <span class="stat-value seeds">
              {seeds === null || seeds === undefined
                ? "–"
                : metadata.isYTSCapped && seeds === 100
                ? "100+"
                : seeds}
            </span>{" "}
            seeds
          </span>
          <span class="stat">
            <span class="stat-value peers">
              {peers === null || peers === undefined
                ? "–"
                : metadata.isYTSCapped && peers === 100
                ? "100+"
                : peers}
            </span>{" "}
            peers
          </span>
          <span class="stat">{size}</span>
          <span class="stat">{provider}</span>
        </div>
      </div>

      <div class="torrent-footer">
        <div class="torrent-actions">
          <button class="btn btn-secondary" onClick={onGetMagnet}>
            Copy Magnet
          </button>
          <button
            class={`btn ${isDownloading ? "btn-downloading" : "btn-primary"}`}
            onClick={onDownload}
          >
            {isDownloading ? "↓ Downloading..." : "Download"}
          </button>
        </div>
        {torrent.time &&
          (() => {
            const { relative, full } = formatRelativeTime(torrent.time);
            return (
              <span class="torrent-time" title={full}>
                {relative}
              </span>
            );
          })()}
      </div>
    </div>
  );
}
