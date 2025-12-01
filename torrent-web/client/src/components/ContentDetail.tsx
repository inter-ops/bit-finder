import { useState, useEffect } from 'preact/hooks';
import { TMDBResult, MovieDetail, TVDetail, SeasonDetail, Episode } from '../pages/Browse';
import { TorrentList } from './TorrentList';
import { Torrent } from '../types';

interface ContentDetailProps {
  content: TMDBResult;
  onBack: () => void;
  onNotify: (message: string, type: 'success' | 'error') => void;
}

const TMDB_IMG = 'https://image.tmdb.org/t/p';

export function ContentDetail({ content, onBack, onNotify }: ContentDetailProps) {
  const [details, setDetails] = useState<MovieDetail | TVDetail | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [seasonDetails, setSeasonDetails] = useState<SeasonDetail | null>(null);
  const [torrents, setTorrents] = useState<Torrent[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [loadingSeason, setLoadingSeason] = useState(false);
  const [loadingTorrents, setLoadingTorrents] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);

  const isTV = content.media_type === 'tv';
  const title = content.title || content.name || 'Unknown';
  const year = content.release_date || content.first_air_date
    ? new Date((content.release_date || content.first_air_date)!).getFullYear()
    : null;

  // Fetch details on mount
  useEffect(() => {
    const fetchDetails = async () => {
      setLoadingDetails(true);
      try {
        const endpoint = isTV ? `/api/tmdb/tv/${content.id}` : `/api/tmdb/movie/${content.id}`;
        const response = await fetch(endpoint);
        const data = await response.json();
        setDetails(data);
      } catch (error) {
        onNotify('Failed to load details', 'error');
      } finally {
        setLoadingDetails(false);
      }
    };
    fetchDetails();
  }, [content.id, isTV]);

  // Fetch season details when selected
  useEffect(() => {
    if (selectedSeason === null || !isTV) return;

    const fetchSeason = async () => {
      setLoadingSeason(true);
      setSeasonDetails(null);
      try {
        const response = await fetch(`/api/tmdb/tv/${content.id}/season/${selectedSeason}`);
        const data = await response.json();
        setSeasonDetails(data);
      } catch (error) {
        onNotify('Failed to load season', 'error');
      } finally {
        setLoadingSeason(false);
      }
    };
    fetchSeason();
  }, [selectedSeason, content.id, isTV]);

  const searchTorrents = async (query: string) => {
    setLoadingTorrents(true);
    setSearchQuery(query);
    setTorrents([]);

    try {
      const response = await fetch(`/api/search?name=${encodeURIComponent(query)}&limit=50`);
      const data = await response.json();
      if (response.ok) {
        setTorrents(data.results || []);
        if (!data.results || data.results.length === 0) {
          onNotify('No torrents found', 'error');
        }
      } else {
        onNotify(data.error || 'Search failed', 'error');
      }
    } catch (error) {
      onNotify('Failed to search torrents', 'error');
    } finally {
      setLoadingTorrents(false);
    }
  };

  const handleSearchMovie = () => {
    const query = year ? `${title} ${year}` : title;
    searchTorrents(query);
  };

  const handleSearchSeason = (seasonNum: number) => {
    const seasonStr = seasonNum.toString().padStart(2, '0');
    searchTorrents(`${title} S${seasonStr} complete`);
  };

  const handleSearchEpisode = (seasonNum: number, episodeNum: number) => {
    const seasonStr = seasonNum.toString().padStart(2, '0');
    const episodeStr = episodeNum.toString().padStart(2, '0');
    searchTorrents(`${title} S${seasonStr}E${episodeStr}`);
  };

  const handleGetMagnet = async (torrent: Torrent) => {
    try {
      const response = await fetch('/api/magnet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(torrent.raw),
      });
      const data = await response.json();
      if (response.ok) {
        await navigator.clipboard.writeText(data.magnet);
        onNotify('Magnet link copied!', 'success');
      } else {
        onNotify(data.error || 'Failed to get magnet', 'error');
      }
    } catch (error) {
      onNotify('Failed to get magnet link', 'error');
    }
  };

  const handleDownload = async (torrent: Torrent) => {
    try {
      const magnetResponse = await fetch('/api/magnet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(torrent.raw),
      });
      const magnetData = await magnetResponse.json();
      if (!magnetResponse.ok) {
        onNotify(magnetData.error || 'Failed to get magnet', 'error');
        return;
      }

      const downloadResponse = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ magnet: magnetData.magnet }),
      });
      const downloadData = await downloadResponse.json();
      if (downloadResponse.ok) {
        onNotify('Torrent added to downloads!', 'success');
      } else {
        onNotify(downloadData.error || 'Failed to add torrent', 'error');
      }
    } catch (error) {
      onNotify('Failed to download torrent', 'error');
    }
  };

  const tvDetails = details as TVDetail;

  return (
    <div class="content-detail">
      <button class="back-button" onClick={onBack}>
        ← Back to search
      </button>

      {loadingDetails ? (
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Loading...</p>
        </div>
      ) : (
        <>
          {/* Hero section */}
          <div class="content-hero" style={
            content.backdrop_path
              ? { backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(250,250,250,1)), url(${TMDB_IMG}/w1280${content.backdrop_path})` }
              : undefined
          }>
            <div class="content-hero-inner">
              {content.poster_path && (
                <img
                  src={`${TMDB_IMG}/w342${content.poster_path}`}
                  alt={title}
                  class="content-detail-poster"
                />
              )}
              <div class="content-hero-info">
                <h1 class="content-detail-title">{title}</h1>
                <div class="content-detail-meta">
                  {year && <span>{year}</span>}
                  {details && 'runtime' in details && details.runtime > 0 && (
                    <span>{details.runtime} min</span>
                  )}
                  {isTV && tvDetails?.number_of_seasons && (
                    <span>{tvDetails.number_of_seasons} season{tvDetails.number_of_seasons > 1 ? 's' : ''}</span>
                  )}
                  {content.vote_average > 0 && (
                    <span class="content-rating">★ {content.vote_average.toFixed(1)}</span>
                  )}
                </div>
                {details?.genres && (
                  <div class="content-genres">
                    {details.genres.map(g => (
                      <span key={g.id} class="genre-tag">{g.name}</span>
                    ))}
                  </div>
                )}
                {content.overview && (
                  <p class="content-overview">{content.overview}</p>
                )}

                {/* Movie: Search button */}
                {!isTV && (
                  <button class="btn btn-primary" onClick={handleSearchMovie}>
                    Find Torrents
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* TV: Season/Episode selector */}
          {isTV && tvDetails?.seasons && (
            <div class="seasons-section">
              <h2>Seasons</h2>
              <div class="seasons-list">
                {tvDetails.seasons
                  .filter(s => s.season_number > 0)
                  .map(season => (
                    <div key={season.id} class="season-item">
                      <button
                        class={`season-header ${selectedSeason === season.season_number ? 'active' : ''}`}
                        onClick={() => setSelectedSeason(
                          selectedSeason === season.season_number ? null : season.season_number
                        )}
                      >
                        <span class="season-name">Season {season.season_number}</span>
                        <span class="season-episodes">{season.episode_count} episodes</span>
                        <span class="season-expand">{selectedSeason === season.season_number ? '▼' : '▶'}</span>
                      </button>

                      {selectedSeason === season.season_number && (
                        <div class="season-content">
                          <button
                            class="btn btn-secondary season-complete-btn"
                            onClick={() => handleSearchSeason(season.season_number)}
                          >
                            Download Complete Season {season.season_number}
                          </button>

                          {loadingSeason ? (
                            <div class="loading-state">
                              <div class="spinner"></div>
                            </div>
                          ) : seasonDetails?.episodes ? (
                            <div class="episodes-list">
                              {seasonDetails.episodes.map(ep => (
                                <button
                                  key={ep.id}
                                  class="episode-item"
                                  onClick={() => handleSearchEpisode(season.season_number, ep.episode_number)}
                                >
                                  <span class="episode-number">E{ep.episode_number}</span>
                                  <span class="episode-name">{ep.name}</span>
                                  {ep.air_date && (
                                    <span class="episode-date">{new Date(ep.air_date).toLocaleDateString()}</span>
                                  )}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Torrent results */}
          {(searchQuery || loadingTorrents) && (
            <div class="torrents-section">
              <h2>
                Torrents
                {searchQuery && <span class="search-query-label">for "{searchQuery}"</span>}
              </h2>
              <TorrentList
                torrents={torrents}
                loading={loadingTorrents}
                onGetMagnet={handleGetMagnet}
                onDownload={handleDownload}
                onBadgeClick={() => {}}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

