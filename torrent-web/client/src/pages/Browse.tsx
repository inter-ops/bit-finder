import { useState, useRef, useEffect } from "preact/hooks";
import { ContentSearch } from "../components/ContentSearch";
import { ContentDetail } from "../components/ContentDetail";
import { Notification } from "../components/Notification";

export interface TMDBResult {
  id: number;
  media_type: "movie" | "tv";
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
}

export interface MovieDetail extends TMDBResult {
  runtime: number;
  genres: { id: number; name: string }[];
  trailer?: string;
}

export interface TVDetail extends TMDBResult {
  number_of_seasons: number;
  seasons: {
    id: number;
    season_number: number;
    name: string;
    episode_count: number;
    air_date: string;
    poster_path: string | null;
  }[];
  genres: { id: number; name: string }[];
  trailer?: string;
}

export interface Episode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  air_date: string;
  still_path: string | null;
  runtime: number;
}

export interface SeasonDetail {
  id: number;
  season_number: number;
  name: string;
  episodes: Episode[];
}

interface BrowseProps {
  onNavigateToDownloads?: (infoHash?: string) => void;
}

// Helper to get URL params
const getUrlParams = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    query: params.get('q') || '',
    contentId: params.get('id') ? parseInt(params.get('id')!) : null,
    mediaType: params.get('type') as 'movie' | 'tv' | null
  };
};

// Helper to update URL params
const updateUrl = (query?: string, content?: TMDBResult | null) => {
  const params = new URLSearchParams();
  
  if (query) {
    params.set('q', query);
  }
  
  if (content) {
    params.set('id', content.id.toString());
    params.set('type', content.media_type);
  }
  
  const newUrl = params.toString() 
    ? `${window.location.pathname}?${params.toString()}`
    : window.location.pathname;
    
  window.history.replaceState({}, '', newUrl);
};

export default function Browse({ onNavigateToDownloads }: BrowseProps) {
  const [searchResults, setSearchResults] = useState<TMDBResult[]>([]);
  const [selectedContent, setSelectedContent] = useState<TMDBResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Store the last search query to restore results when going back
  const lastSearchQuery = useRef<string>("");

  // Restore state from URL on initial load
  useEffect(() => {
    const { query, contentId, mediaType } = getUrlParams();
    
    if (query) {
      lastSearchQuery.current = query;
      handleSearch(query, false).then(() => {
        // If there's a content ID, find and select it after search completes
        if (contentId && mediaType) {
          // We'll try to find it in results or fetch it directly
          fetchAndSelectContent(contentId, mediaType);
        }
        setInitialLoadDone(true);
      });
    } else if (contentId && mediaType) {
      // Just have content ID, fetch it directly
      fetchAndSelectContent(contentId, mediaType);
      setInitialLoadDone(true);
    } else {
      setInitialLoadDone(true);
    }
  }, []);

  const fetchAndSelectContent = async (id: number, type: 'movie' | 'tv') => {
    try {
      const endpoint = type === 'tv' ? `/api/tmdb/tv/${id}` : `/api/tmdb/movie/${id}`;
      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (response.ok && data.id) {
        // Create a TMDBResult from the fetched data
        const content: TMDBResult = {
          id: data.id,
          media_type: type,
          title: data.title,
          name: data.name,
          poster_path: data.poster_path,
          backdrop_path: data.backdrop_path,
          overview: data.overview,
          vote_average: data.vote_average,
          release_date: data.release_date,
          first_air_date: data.first_air_date
        };
        setSelectedContent(content);
      }
    } catch (error) {
      console.error("Failed to fetch content:", error);
    }
  };

  const handleSearch = async (query: string, updateUrlState: boolean = true) => {
    if (!query.trim()) return;

    setLoading(true);
    setSelectedContent(null);
    lastSearchQuery.current = query;
    
    if (updateUrlState) {
      updateUrl(query, null);
    }

    try {
      const response = await fetch(`/api/tmdb/search?query=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (response.ok) {
        setSearchResults(data.results || []);
        if (!data.results || data.results.length === 0) {
          setNotification({ message: "No results found", type: "error" });
        }
      } else {
        setNotification({ message: data.error || "Search failed", type: "error" });
        setSearchResults([]);
      }
    } catch (error) {
      setNotification({ message: "Failed to search", type: "error" });
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectContent = (content: TMDBResult) => {
    setSelectedContent(content);
    updateUrl(lastSearchQuery.current, content);
    // Don't clear search results - keep them for when user goes back
  };

  const handleBack = () => {
    setSelectedContent(null);
    updateUrl(lastSearchQuery.current, null);
    // Search results are already preserved
  };

  return (
    <div class="browse-page">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {selectedContent ? (
        <ContentDetail
          content={selectedContent}
          onBack={handleBack}
          onNotify={(message, type) => setNotification({ message, type })}
          onNavigateToDownloads={onNavigateToDownloads}
        />
      ) : (
        <ContentSearch
          results={searchResults}
          loading={loading}
          onSearch={handleSearch}
          onSelect={handleSelectContent}
          initialQuery={lastSearchQuery.current}
        />
      )}
    </div>
  );
}
