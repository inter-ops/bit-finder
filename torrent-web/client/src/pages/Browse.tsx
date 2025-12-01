import { useState, useRef } from "preact/hooks";
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
  onNavigateToDownloads?: () => void;
}

export default function Browse({ onNavigateToDownloads }: BrowseProps) {
  const [searchResults, setSearchResults] = useState<TMDBResult[]>([]);
  const [selectedContent, setSelectedContent] = useState<TMDBResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Store the last search query to restore results when going back
  const lastSearchQuery = useRef<string>("");

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;

    setLoading(true);
    setSelectedContent(null);
    lastSearchQuery.current = query;

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
    // Don't clear search results - keep them for when user goes back
  };

  const handleBack = () => {
    setSelectedContent(null);
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
