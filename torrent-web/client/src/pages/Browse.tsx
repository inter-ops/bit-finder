import { useState, useRef, useEffect, useCallback } from "preact/hooks";
import { useLocation, useSearch } from "wouter";
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

// Helper to parse search params
function useQueryParams() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const idParam = params.get('id');
  return {
    query: params.get('q') || '',
    contentId: idParam ? parseInt(idParam, 10) : null,
    mediaType: params.get('type') as 'movie' | 'tv' | null
  };
}

// Helper to build URL with params
function buildBrowseUrl(query?: string, content?: { id: number; media_type: string } | null): string {
  const params = new URLSearchParams();
  
  if (query) {
    params.set('q', query);
  }
  
  if (content) {
    params.set('id', content.id.toString());
    params.set('type', content.media_type);
  }
  
  return params.toString() ? `/browse?${params.toString()}` : '/browse';
}

export default function Browse({ onNavigateToDownloads }: BrowseProps) {
  const [, setLocation] = useLocation();
  const { query: urlQuery, contentId, mediaType } = useQueryParams();
  
  const [searchResults, setSearchResults] = useState<TMDBResult[]>([]);
  const [selectedContent, setSelectedContent] = useState<TMDBResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  
  // Track if initial load is done
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const lastSearchQuery = useRef<string>(urlQuery);

  // Fetch content by ID
  const fetchContentById = useCallback(async (id: number, type: 'movie' | 'tv'): Promise<TMDBResult | null> => {
    try {
      const endpoint = type === 'tv' ? `/api/tmdb/tv/${id}` : `/api/tmdb/movie/${id}`;
      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (response.ok && data.id) {
        return {
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
      }
    } catch (error) {
      console.error("Failed to fetch content:", error);
    }
    return null;
  }, []);

  // Search API call
  const searchContent = useCallback(async (query: string): Promise<TMDBResult[]> => {
    try {
      const response = await fetch(`/api/tmdb/search?query=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (response.ok) {
        return data.results || [];
      } else {
        setNotification({ message: data.error || "Search failed", type: "error" });
      }
    } catch (error) {
      setNotification({ message: "Failed to search", type: "error" });
    }
    return [];
  }, []);

  // Initial load - restore state from URL
  useEffect(() => {
    const loadFromUrl = async () => {
      // If we have a content ID in URL, fetch and display it
      if (contentId && mediaType) {
        const content = await fetchContentById(contentId, mediaType);
        if (content) {
          setSelectedContent(content);
        }
        
        // Also load search results in background if we have a query
        if (urlQuery) {
          lastSearchQuery.current = urlQuery;
          const results = await searchContent(urlQuery);
          setSearchResults(results);
        }
      } else if (urlQuery) {
        // Just a search query, no content selected
        lastSearchQuery.current = urlQuery;
        setLoading(true);
        const results = await searchContent(urlQuery);
        setSearchResults(results);
        setLoading(false);
        
        if (results.length === 0) {
          setNotification({ message: "No results found", type: "error" });
        }
      }
      
      setInitialLoadDone(true);
    };

    loadFromUrl();
  }, []); // Only on mount

  // Sync with URL changes (back/forward navigation)
  useEffect(() => {
    if (!initialLoadDone) return;

    const syncWithUrl = async () => {
      // Handle content selection changes
      if (contentId && mediaType) {
        // Check if we already have this content selected
        if (selectedContent?.id !== contentId) {
          // Try to find in existing results first
          const existing = searchResults.find(r => r.id === contentId && r.media_type === mediaType);
          if (existing) {
            setSelectedContent(existing);
          } else {
            const content = await fetchContentById(contentId, mediaType);
            if (content) setSelectedContent(content);
          }
        }
      } else {
        // No content ID in URL, clear selection
        setSelectedContent(null);
      }

      // Handle search query changes
      if (urlQuery && urlQuery !== lastSearchQuery.current) {
        lastSearchQuery.current = urlQuery;
        setLoading(true);
        const results = await searchContent(urlQuery);
        setSearchResults(results);
        setLoading(false);
      }
    };

    syncWithUrl();
  }, [urlQuery, contentId, mediaType, initialLoadDone, searchResults, selectedContent, fetchContentById, searchContent]);

  // Handle search from UI
  const handleSearch = async (query: string) => {
    if (!query.trim()) return;

    setLoading(true);
    setSelectedContent(null);
    lastSearchQuery.current = query;
    
    // Update URL
    setLocation(buildBrowseUrl(query, null));

    const results = await searchContent(query);
    setSearchResults(results);
    setLoading(false);
    
    if (results.length === 0) {
      setNotification({ message: "No results found", type: "error" });
    }
  };

  // Handle content selection from UI
  const handleSelectContent = (content: TMDBResult) => {
    setSelectedContent(content);
    setLocation(buildBrowseUrl(lastSearchQuery.current, content));
  };

  // Handle back navigation
  const handleBack = () => {
    setSelectedContent(null);
    setLocation(buildBrowseUrl(lastSearchQuery.current, null));
  };

  // Show loading state while initializing from URL
  if (!initialLoadDone && (contentId || urlQuery)) {
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
