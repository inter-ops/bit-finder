import { useState, useEffect, useMemo, useRef } from "preact/hooks";
import { TMDBResult, MovieDetail, TVDetail, SeasonDetail } from "../pages/Browse";
import { TorrentList } from "./TorrentList";
import { Torrent, Filters } from "../types";
import { WebTorrentInfo } from "../pages/Downloads";

interface ContentDetailProps {
  content: TMDBResult;
  onBack: () => void;
  onNotify: (message: string, type: "success" | "error") => void;
  onNavigateToDownloads?: (infoHash?: string) => void;
}

const TMDB_IMG = "https://image.tmdb.org/t/p";

const RESOLUTIONS = ["8K", "4K", "1080p", "720p", "480p"];
const VIDEO_CODECS = ["AV1", "H.265", "H.264", "XviD"];
const AUDIO_CODECS = ["Dolby Atmos", "TrueHD", "DTS-HD", "DTS-X", "DTS", "AC3", "AAC"];
const SOURCES = ["BluRay", "WEB-DL", "WEBRip", "HDTV"];
const HDR_OPTIONS = ["Dolby Vision", "HDR10+", "HDR10"];
const PROVIDERS = ["1337x", "ThePirateBay", "Rarbg", "Yts", "Eztv", "TorrentProject"];

const defaultFilters: Filters = {
  categories: [],
  providers: [],
  resolutions: [],
  videoCodecs: [],
  audioCodecs: [],
  sources: [],
  hdr: [],
  minSeeds: 0
};

interface OmdbRatings {
  rottenTomatoes?: string;
  imdb?: string;
  metacritic?: string;
  rottenTomatoesUrl?: string;
}

export function ContentDetail({
  content,
  onBack,
  onNotify,
  onNavigateToDownloads
}: ContentDetailProps) {
  const [details, setDetails] = useState<MovieDetail | TVDetail | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [seasonDetails, setSeasonDetails] = useState<SeasonDetail | null>(null);
  const [torrents, setTorrents] = useState<Torrent[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [loadingSeason, setLoadingSeason] = useState(false);
  const [loadingTorrents, setLoadingTorrents] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [omdbRatings, setOmdbRatings] = useState<OmdbRatings | null>(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [downloadingTorrents, setDownloadingTorrents] = useState<Set<string>>(new Set());
  const [activeTorrents, setActiveTorrents] = useState<WebTorrentInfo[]>([]);
  // Map of torrent raw ID -> infoHash (populated when we download)
  const [torrentInfoHashMap, setTorrentInfoHashMap] = useState<Record<string, string>>(() => {
    // Load from localStorage on init
    try {
      const saved = localStorage.getItem('torrent-infohash-map');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [streamingTorrent, setStreamingTorrent] = useState<{infoHash: string; fileIndex?: number} | null>(null);
  const [streamReady, setStreamReady] = useState<Record<string, boolean>>({});
  const videoRef = useRef<HTMLVideoElement>(null);
  const [savedPlaybackTime, setSavedPlaybackTime] = useState<Record<string, number>>({});

  const isTV = content.media_type === "tv";
  const title = content.title || content.name || "Unknown";
  const year =
    content.release_date || content.first_air_date
      ? new Date((content.release_date || content.first_air_date)!).getFullYear()
      : null;

  // Fetch active torrents to check downloading/streaming state
  useEffect(() => {
    const fetchActiveTorrents = async () => {
      try {
        const response = await fetch("/api/torrents");
        const data = await response.json();
        if (data.torrents) {
          setActiveTorrents(data.torrents);
          // Check stream readiness for active torrents
          const readyMap: Record<string, boolean> = {};
          for (const torrent of data.torrents) {
            // Stream is ready if we have at least 1% downloaded and there's a video file
            const hasVideoFile = torrent.files?.some((f: any) => 
              ['.mp4', '.mkv', '.avi', '.webm', '.mov', '.m4v'].some(ext => 
                f.name.toLowerCase().endsWith(ext)
              )
            );
            readyMap[torrent.infoHash] = hasVideoFile && torrent.progress > 0.01;
          }
          setStreamReady(readyMap);
        }
      } catch (error) {
        console.error("Failed to fetch active torrents:", error);
      }
    };

    fetchActiveTorrents();
    const interval = setInterval(fetchActiveTorrents, 2000);
    return () => clearInterval(interval);
  }, []);

  // Load saved playback times from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('torrent-playback-times');
    if (saved) {
      try {
        setSavedPlaybackTime(JSON.parse(saved));
      } catch {}
    }
  }, []);

  // Fetch details on mount and auto-search torrents for movies
  useEffect(() => {
    const fetchDetails = async () => {
      setLoadingDetails(true);
      try {
        const endpoint = isTV ? `/api/tmdb/tv/${content.id}` : `/api/tmdb/movie/${content.id}`;
        const response = await fetch(endpoint);
        const data = await response.json();
        setDetails(data);

        // Auto-search torrents for movies
        if (!isTV) {
          const movieTitle = content.title || content.name || "Unknown";
          const movieYear = content.release_date
            ? new Date(content.release_date).getFullYear()
            : null;
          const query = movieYear ? `${movieTitle} ${movieYear}` : movieTitle;
          searchTorrents(query);
        }

        // Fetch OMDB ratings (includes Rotten Tomatoes)
        const omdbTitle = content.title || content.name || "";
        const omdbYear =
          content.release_date || content.first_air_date
            ? new Date((content.release_date || content.first_air_date)!).getFullYear()
            : undefined;
        const omdbType = isTV ? "series" : "movie";

        try {
          const omdbRes = await fetch(
            `/api/omdb?title=${encodeURIComponent(omdbTitle)}${
              omdbYear ? `&year=${omdbYear}` : ""
            }&type=${omdbType}`
          );
          if (omdbRes.ok) {
            const omdbData = await omdbRes.json();
            setOmdbRatings({
              rottenTomatoes: omdbData.ratings?.rottenTomatoes,
              imdb: omdbData.ratings?.imdb,
              metacritic: omdbData.ratings?.metacritic,
              rottenTomatoesUrl: omdbData.rottenTomatoesUrl
            });
          }
        } catch {
          // OMDB fetch failed silently - ratings just won't show
        }
      } catch (error) {
        onNotify("Failed to load details", "error");
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
        onNotify("Failed to load season", "error");
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
    setFilters(defaultFilters);

    try {
      const response = await fetch(`/api/search?name=${encodeURIComponent(query)}&limit=50`);
      const data = await response.json();
      if (response.ok) {
        setTorrents(data.results || []);
        if (!data.results || data.results.length === 0) {
          onNotify("No torrents found", "error");
        }
      } else {
        onNotify(data.error || "Search failed", "error");
      }
    } catch (error) {
      onNotify("Failed to search torrents", "error");
    } finally {
      setLoadingTorrents(false);
    }
  };

  const handleSearchSeason = (seasonNum: number) => {
    const seasonStr = seasonNum.toString().padStart(2, "0");
    searchTorrents(`${title} S${seasonStr} complete`);
  };

  const handleSearchEpisode = (seasonNum: number, episodeNum: number) => {
    const seasonStr = seasonNum.toString().padStart(2, "0");
    const episodeStr = episodeNum.toString().padStart(2, "0");
    searchTorrents(`${title} S${seasonStr}E${episodeStr}`);
  };

  const handleGetMagnet = async (torrent: Torrent) => {
    try {
      const response = await fetch("/api/magnet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(torrent.raw)
      });
      const data = await response.json();
      if (response.ok) {
        await navigator.clipboard.writeText(data.magnet);
        onNotify("Magnet link copied!", "success");
      } else {
        onNotify(data.error || "Failed to get magnet", "error");
      }
    } catch (error) {
      onNotify("Failed to get magnet link", "error");
    }
  };

  // Check if a torrent is already downloading - by info hash or title
  const isAlreadyDownloading = (torrent: Torrent): WebTorrentInfo | undefined => {
    const torrentId = torrent.raw?.id || torrent.title;
    const searchTitle = torrent.title;
    
    // First check if we have a stored info hash mapping for this torrent
    const storedInfoHash = torrentInfoHashMap[torrentId];
    if (storedInfoHash) {
      const match = activeTorrents.find(t => t.infoHash === storedInfoHash);
      if (match) return match;
    }
    
    // Fallback: title matching
    // - Exact match, OR
    // - Search title is contained in download name (e.g., YTS adds "[5.1] [YTS.MX]" suffix)
    return activeTorrents.find(t => {
      const downloadName = t.name || '';
      return downloadName === searchTitle || downloadName.startsWith(searchTitle);
    });
  };

  // Get the download state for a torrent
  const getTorrentDownloadState = (torrent: Torrent): { 
    isDownloading: boolean; 
    isComplete: boolean;
    isPaused: boolean;
    progress: number;
    infoHash?: string;
  } => {
    const torrentId = torrent.raw?.id || torrent.title;
    const activeTorrent = isAlreadyDownloading(torrent);
    
    if (activeTorrent) {
      return {
        isDownloading: !activeTorrent.done && !activeTorrent.paused,
        isComplete: activeTorrent.done,
        isPaused: activeTorrent.paused && !activeTorrent.done,
        progress: Math.round(activeTorrent.progress * 100),
        infoHash: activeTorrent.infoHash
      };
    }
    
    // Just clicked in this session but not yet in active torrents
    if (downloadingTorrents.has(torrentId)) {
      return { isDownloading: true, isComplete: false, isPaused: false, progress: 0 };
    }
    
    return { isDownloading: false, isComplete: false, isPaused: false, progress: 0 };
  };

  // Check if a torrent is downloading (either clicked in this session or already in active downloads)
  const isTorrentDownloading = (torrent: Torrent): boolean => {
    const state = getTorrentDownloadState(torrent);
    return state.isDownloading || state.isComplete;
  };

  // Pause a downloading torrent
  const handlePauseTorrent = async (torrent: Torrent) => {
    const state = getTorrentDownloadState(torrent);
    if (state.infoHash) {
      try {
        await fetch(`/api/torrents/${state.infoHash}/pause`, { method: 'POST' });
        onNotify("Torrent paused", "success");
      } catch (error) {
        onNotify("Failed to pause torrent", "error");
      }
    }
  };

  // Resume a paused torrent
  const handleResumeTorrent = async (torrent: Torrent) => {
    const state = getTorrentDownloadState(torrent);
    if (state.infoHash) {
      try {
        await fetch(`/api/torrents/${state.infoHash}/resume`, { method: 'POST' });
        onNotify("Torrent resumed", "success");
      } catch (error) {
        onNotify("Failed to resume torrent", "error");
      }
    }
  };

  const handleDownload = async (torrent: Torrent) => {
    // Generate a unique ID for this torrent
    const torrentId = torrent.raw?.id || torrent.title;

    // If already downloading, navigate to downloads page
    if (downloadingTorrents.has(torrentId)) {
      onNavigateToDownloads?.();
      return;
    }

    try {
      const magnetResponse = await fetch("/api/magnet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(torrent.raw)
      });
      const magnetData = await magnetResponse.json();
      if (!magnetResponse.ok) {
        onNotify(magnetData.error || "Failed to get magnet", "error");
        return;
      }

      const downloadResponse = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ magnet: magnetData.magnet })
      });
      const downloadData = await downloadResponse.json();
      if (downloadResponse.ok) {
        // Mark as downloading
        setDownloadingTorrents((prev) => new Set(prev).add(torrentId));
        
        // Store the info hash mapping for robust matching (using infoHash from server response)
        const infoHash = downloadData.torrent?.infoHash;
        if (infoHash) {
          const newMap = { ...torrentInfoHashMap, [torrentId]: infoHash };
          setTorrentInfoHashMap(newMap);
          localStorage.setItem('torrent-infohash-map', JSON.stringify(newMap));
        }
        
        onNotify("Torrent added!", "success");
      } else {
        onNotify(downloadData.error || "Failed to add torrent", "error");
      }
    } catch (error) {
      onNotify("Failed to download torrent", "error");
    }
  };

  const handleStream = (torrent: Torrent) => {
    const activeTorrent = isAlreadyDownloading(torrent);
    if (activeTorrent && streamReady[activeTorrent.infoHash]) {
      // Find video file
      const videoFiles = activeTorrent.files?.filter(f => 
        ['.mp4', '.mkv', '.avi', '.webm', '.mov', '.m4v'].some(ext => 
          f.name.toLowerCase().endsWith(ext)
        )
      ) || [];
      
      if (videoFiles.length > 0) {
        setStreamingTorrent({ 
          infoHash: activeTorrent.infoHash, 
          fileIndex: videoFiles[0].index 
        });
      }
    }
  };

  const handleCloseStream = (confirmed: boolean = false) => {
    if (!confirmed && streamingTorrent) {
      if (!window.confirm("Are you sure you want to close the video? Your playback position will be saved.")) {
        return;
      }
    }
    
    // Save current playback time
    if (videoRef.current && streamingTorrent) {
      const newSaved = {
        ...savedPlaybackTime,
        [streamingTorrent.infoHash]: videoRef.current.currentTime
      };
      setSavedPlaybackTime(newSaved);
      localStorage.setItem('torrent-playback-times', JSON.stringify(newSaved));
    }
    
    setStreamingTorrent(null);
  };

  // Handle video loaded - restore playback position
  const handleVideoLoaded = () => {
    if (videoRef.current && streamingTorrent) {
      const savedTime = savedPlaybackTime[streamingTorrent.infoHash];
      if (savedTime && savedTime > 0) {
        videoRef.current.currentTime = savedTime;
      }
    }
  };

  // Get stream state for a torrent
  const getStreamState = (torrent: Torrent): 'ready' | 'waiting' | 'unavailable' => {
    const activeTorrent = isAlreadyDownloading(torrent);
    if (!activeTorrent) return 'unavailable';
    if (streamReady[activeTorrent.infoHash]) return 'ready';
    return 'waiting';
  };

  const handleBadgeClick = (type: string, value: string) => {
    const filterMap: Record<string, keyof Filters> = {
      resolution: "resolutions",
      videoCodec: "videoCodecs",
      audioCodec: "audioCodecs",
      source: "sources",
      hdr: "hdr"
    };
    const filterKey = filterMap[type];
    if (filterKey) {
      const current = filters[filterKey] as string[];
      if (!current.includes(value)) {
        setFilters({ ...filters, [filterKey]: [...current, value] });
      }
    }
  };

  const toggleFilter = (category: keyof Filters, value: string) => {
    const current = filters[category] as string[];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setFilters({ ...filters, [category]: updated });
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
  };

  const hasActiveFilters =
    filters.providers.length > 0 ||
    filters.resolutions.length > 0 ||
    filters.videoCodecs.length > 0 ||
    filters.audioCodecs.length > 0 ||
    filters.sources.length > 0 ||
    filters.hdr.length > 0;

  // Filter torrents
  const filteredTorrents = useMemo(() => {
    return torrents.filter((torrent) => {
      if (
        filters.providers.length > 0 &&
        !filters.providers.includes(torrent.provider || "")
      ) {
        return false;
      }
      if (
        filters.resolutions.length > 0 &&
        !filters.resolutions.includes(torrent.metadata.resolution || "")
      ) {
        return false;
      }
      if (
        filters.videoCodecs.length > 0 &&
        !filters.videoCodecs.includes(torrent.metadata.videoCodec || "")
      ) {
        return false;
      }
      if (
        filters.audioCodecs.length > 0 &&
        !filters.audioCodecs.includes(torrent.metadata.audioCodec || "")
      ) {
        return false;
      }
      if (filters.sources.length > 0 && !filters.sources.includes(torrent.metadata.source || "")) {
        return false;
      }
      if (filters.hdr.length > 0 && !filters.hdr.includes(torrent.metadata.hdr || "")) {
        return false;
      }
      return true;
    });
  }, [torrents, filters]);

  const handleOpenTrailer = () => {
    if (details?.trailer) {
      setShowTrailer(true);
    }
  };

  const handleCloseTrailer = () => {
    setShowTrailer(false);
  };

  const handleOpenRottenTomatoes = () => {
    // Generate RT slug from title (lowercase, spaces to underscores, remove special chars)
    const slug = title
      .toLowerCase()
      .replace(/['']/g, "") // Remove apostrophes
      .replace(/[^a-z0-9\s]/g, "") // Remove special chars
      .replace(/\s+/g, "_") // Spaces to underscores
      .replace(/_+/g, "_") // Multiple underscores to single
      .replace(/^_|_$/g, ""); // Trim underscores

    const rtUrl = isTV
      ? `https://www.rottentomatoes.com/tv/${slug}`
      : `https://www.rottentomatoes.com/m/${slug}`;

    window.open(rtUrl, "_blank");
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
          <div class="content-hero">
            {content.backdrop_path && (
              <div
                class="content-backdrop"
                style={{ backgroundImage: `url(${TMDB_IMG}/w1280${content.backdrop_path})` }}
              />
            )}
            <div class="content-hero-inner">
              {content.poster_path && (
                <img
                  src={`${TMDB_IMG}/w342${content.poster_path}`}
                  alt={title}
                  class="content-detail-poster"
                />
              )}
              <div class="content-hero-info">
                <div class="content-header-row">
                  <div class="content-header-text">
                    <h1 class="content-detail-title">{title}</h1>
                    <div class="content-detail-meta">
                      {year && <span class="meta-item">{year}</span>}
                      {details && "runtime" in details && details.runtime > 0 && (
                        <>
                          <span class="meta-sep">•</span>
                          <span class="meta-item">{details.runtime} min</span>
                        </>
                      )}
                      {isTV && tvDetails?.number_of_seasons && (
                        <>
                          <span class="meta-sep">•</span>
                          <span class="meta-item">
                            {tvDetails.number_of_seasons} season
                            {tvDetails.number_of_seasons > 1 ? "s" : ""}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {details?.trailer && (
                    <button class="btn btn-trailer" onClick={handleOpenTrailer}>
                      ▶ Trailer
                    </button>
                  )}
                </div>

                <div class="content-ratings">
                  {omdbRatings?.rottenTomatoes && (
                    <button
                      class="rating-item clickable"
                      onClick={handleOpenRottenTomatoes}
                      title="View on Rotten Tomatoes"
                    >
                      <span class="rating-icon">🍅</span>
                      <span class="rating-value rt">{omdbRatings.rottenTomatoes}</span>
                      <span class="rating-label">Critics</span>
                    </button>
                  )}
                  {omdbRatings?.imdb && (
                    <span class="rating-item">
                      <span class="rating-icon">⭐</span>
                      <span class="rating-value">{omdbRatings.imdb}</span>
                      <span class="rating-label">IMDb</span>
                    </span>
                  )}
                </div>

                {details?.genres && (
                  <div class="content-genres">
                    {details.genres.map((g) => (
                      <span key={g.id} class="genre-tag">
                        {g.name}
                      </span>
                    ))}
                  </div>
                )}

                {content.overview && <p class="content-overview">{content.overview}</p>}
              </div>
            </div>
          </div>

          {/* TV: Season/Episode selector */}
          {isTV && tvDetails?.seasons && (
            <div class="seasons-section">
              <h2>Seasons</h2>
              <div class="seasons-list">
                {tvDetails.seasons
                  .filter((s) => s.season_number > 0)
                  .map((season) => (
                    <div key={season.id} class="season-item">
                      <button
                        class={`season-header ${
                          selectedSeason === season.season_number ? "active" : ""
                        }`}
                        onClick={() =>
                          setSelectedSeason(
                            selectedSeason === season.season_number ? null : season.season_number
                          )
                        }
                      >
                        <span class="season-name">Season {season.season_number}</span>
                        <span class="season-episodes">{season.episode_count} episodes</span>
                        <span class="season-expand">
                          {selectedSeason === season.season_number ? "▼" : "▶"}
                        </span>
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
                              {seasonDetails.episodes.map((ep) => (
                                <button
                                  key={ep.id}
                                  class="episode-item"
                                  onClick={() =>
                                    handleSearchEpisode(season.season_number, ep.episode_number)
                                  }
                                >
                                  <span class="episode-number">E{ep.episode_number}</span>
                                  <span class="episode-name">{ep.name}</span>
                                  {ep.air_date && (
                                    <span class="episode-date">
                                      {new Date(ep.air_date).toLocaleDateString()}
                                    </span>
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
              <div class="torrents-header">
                <h2>
                  Torrents
                  {searchQuery && <span class="search-query-label">for "{searchQuery}"</span>}
                </h2>
                {torrents.length > 0 && (
                  <span class="torrent-count">
                    {filteredTorrents.length === torrents.length
                      ? `${torrents.length} results`
                      : `${filteredTorrents.length} of ${torrents.length}`}
                  </span>
                )}
              </div>

              {/* Inline filters */}
              {torrents.length > 0 && (
                <div class="inline-filters">
                  <div class="filter-group">
                    <span class="filter-label">Resolution:</span>
                    <div class="filter-chips">
                      {RESOLUTIONS.map((res) => (
                        <button
                          key={res}
                          class={`filter-chip ${filters.resolutions.includes(res) ? "active" : ""}`}
                          onClick={() => toggleFilter("resolutions", res)}
                        >
                          {res}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div class="filter-group">
                    <span class="filter-label">Provider:</span>
                    <div class="filter-chips">
                      {PROVIDERS.map((provider) => (
                        <button
                          key={provider}
                          class={`filter-chip ${filters.providers.includes(provider) ? "active" : ""}`}
                          onClick={() => toggleFilter("providers", provider)}
                        >
                          {provider}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div class="filter-group">
                    <span class="filter-label">Video:</span>
                    <div class="filter-chips">
                      {VIDEO_CODECS.map((codec) => (
                        <button
                          key={codec}
                          class={`filter-chip ${
                            filters.videoCodecs.includes(codec) ? "active" : ""
                          }`}
                          onClick={() => toggleFilter("videoCodecs", codec)}
                        >
                          {codec}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div class="filter-group">
                    <span class="filter-label">Audio:</span>
                    <div class="filter-chips">
                      {AUDIO_CODECS.map((codec) => (
                        <button
                          key={codec}
                          class={`filter-chip ${
                            filters.audioCodecs.includes(codec) ? "active" : ""
                          }`}
                          onClick={() => toggleFilter("audioCodecs", codec)}
                        >
                          {codec}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div class="filter-group">
                    <span class="filter-label">Source:</span>
                    <div class="filter-chips">
                      {SOURCES.map((src) => (
                        <button
                          key={src}
                          class={`filter-chip ${filters.sources.includes(src) ? "active" : ""}`}
                          onClick={() => toggleFilter("sources", src)}
                        >
                          {src}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div class="filter-group">
                    <span class="filter-label">HDR:</span>
                    <div class="filter-chips">
                      {HDR_OPTIONS.map((hdr) => (
                        <button
                          key={hdr}
                          class={`filter-chip ${filters.hdr.includes(hdr) ? "active" : ""}`}
                          onClick={() => toggleFilter("hdr", hdr)}
                        >
                          {hdr}
                        </button>
                      ))}
                    </div>
                  </div>

                  {hasActiveFilters && (
                    <button class="btn-clear-inline" onClick={clearFilters}>
                      Clear filters
                    </button>
                  )}
                </div>
              )}

              <TorrentList
                torrents={filteredTorrents}
                loading={loadingTorrents}
                onGetMagnet={handleGetMagnet}
                onDownload={handleDownload}
                onBadgeClick={handleBadgeClick}
                downloadingTorrents={downloadingTorrents}
                onStream={handleStream}
                getStreamState={getStreamState}
                isTorrentDownloading={isTorrentDownloading}
                getTorrentDownloadState={getTorrentDownloadState}
                onPauseTorrent={handlePauseTorrent}
                onResumeTorrent={handleResumeTorrent}
                onNavigateToDownloads={onNavigateToDownloads}
              />
            </div>
          )}
        </>
      )}

      {/* Trailer Modal */}
      {showTrailer && details?.trailer && (
        <div class="trailer-modal" onClick={handleCloseTrailer}>
          <div class="trailer-modal-content" onClick={(e) => e.stopPropagation()}>
            <button class="trailer-close" onClick={handleCloseTrailer}>
              ✕
            </button>
            <iframe
              src={`https://www.youtube.com/embed/${details.trailer}?autoplay=1&rel=0`}
              title={`${title} Trailer`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Video Streaming Modal */}
      {streamingTorrent && (
        <div class="video-modal" onClick={() => handleCloseStream(false)}>
          <div class="video-modal-content" onClick={(e) => e.stopPropagation()}>
            <button class="video-close" onClick={() => handleCloseStream(false)}>
              ✕
            </button>
            <video 
              ref={videoRef}
              src={`/api/stream/${streamingTorrent.infoHash}${streamingTorrent.fileIndex !== undefined ? `?file=${streamingTorrent.fileIndex}` : ''}`}
              controls 
              autoPlay 
              class="video-player"
              onLoadedData={handleVideoLoaded}
            >
              Your browser does not support video playback.
            </video>
            <div class="video-info">
              <span class="video-title">{title}</span>
              <span class="video-progress">
                Buffer: {Math.round((activeTorrents.find(t => t.infoHash === streamingTorrent.infoHash)?.progress || 0) * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
