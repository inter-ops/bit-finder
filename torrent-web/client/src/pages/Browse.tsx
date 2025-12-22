import { useState, useRef, useEffect, useCallback } from "preact/hooks";
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

// Helper to build URL with params
const buildUrl = (query?: string, content?: TMDBResult | null) => {
  const params = new URLSearchParams();
  const basePath = window.location.pathname.startsWith('/browse') ? '/browse' : '/';
  
  if (query) {
    params.set('q', query);
  }
  
  if (content) {
    params.set('id', content.id.toString());
    params.set('type', content.media_type);
  }
  
  return params.toString() ? `${basePath}?${params.toString()}` : basePath;
};

export default function Browse({ onNavigateToDownloads }: BrowseProps) {
  // Parse URL params immediately for initial state
  const initialParams = getUrlParams();
  
  const [searchResults, setSearchResults] = useState<TMDBResult[]>([]);
  // Initialize selectedContent to a "loading" placeholder if we have an ID in URL
  const [selectedContent, setSelectedContent] = useState<TMDBResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  
  // Track if we're loading content from URL (to show loading state instead of search)
  const [loadingFromUrl, setLoadingFromUrl] = useState(
    !!(initialParams.contentId && initialParams.mediaType)
  );

  const lastSearchQuery = useRef<string>(initialParams.query);

  // Fetch content by ID
  const fetchAndSelectContent = useCallback(async (id: number, type: 'movie' | 'tv') => {
    try {
      const endpoint = type === 'tv' ? `/api/tmdb/tv/${id}` : `/api/tmdb/movie/${id}`;
      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (response.ok && data.id) {
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
        return content;
      }
    } catch (error) {
      console.error("Failed to fetch content:", error);
    }
    return null;
  }, []);

  // Restore state from URL on initial load
  useEffect(() => {
    const { query, contentId, mediaType } = initialParams;
    
    const loadInitialState = async () => {
      // If we have a content ID, fetch it first (before showing search results)
      if (contentId && mediaType) {
        await fetchAndSelectContent(contentId, mediaType);
        
        // Load search results in background (without clearing selection)
        if (query) {
          lastSearchQuery.current = query;
          await handleSearch(query, false, false); // Don't clear selection
        }
      } else if (query) {
        // Just search, no content to show
        lastSearchQuery.current = query;
        await handleSearch(query, false, true);
      }
      
      setLoadingFromUrl(false);
    };

    loadInitialState();
  }, []); // Only run on mount

  // Listen for browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const { query, contentId, mediaType } = getUrlParams();
      
      if (contentId && mediaType) {
        // Try to find in existing results first
        const existingContent = searchResults.find(
          r => r.id === contentId && r.media_type === mediaType
        );
        if (existingContent) {
          setSelectedContent(existingContent);
        } else {
          fetchAndSelectContent(contentId, mediaType);
        }
      } else {
        setSelectedContent(null);
      }
      
      // Update search query if changed
      if (query && query !== lastSearchQuery.current) {
        lastSearchQuery.current = query;
        handleSearch(query, false);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [searchResults, fetchAndSelectContent]);

  const handleSearch = async (query: string, pushHistory: boolean = true, clearSelection: boolean = true) => {
    if (!query.trim()) return;

    setLoading(true);
    if (clearSelection) {
      setSelectedContent(null);
    }
    lastSearchQuery.current = query;
    
    if (pushHistory) {
      const newUrl = buildUrl(query, null);
      window.history.pushState({ query }, "", newUrl);
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
    const newUrl = buildUrl(lastSearchQuery.current, content);
    window.history.pushState({ query: lastSearchQuery.current, content: { id: content.id, type: content.media_type } }, "", newUrl);
  };

  const handleBack = () => {
    // Use browser back if we have history, otherwise just clear selection
    if (window.history.state?.content) {
      window.history.back();
    } else {
      setSelectedContent(null);
      const newUrl = buildUrl(lastSearchQuery.current, null);
      window.history.replaceState({ query: lastSearchQuery.current }, "", newUrl);
    }
  };

  // Show nothing while loading content from URL to prevent flash
  if (loadingFromUrl) {
    return (
      <div class="browse-page">
        <div class="loading-placeholder">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

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
