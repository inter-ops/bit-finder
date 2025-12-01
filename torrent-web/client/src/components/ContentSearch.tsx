import { useState, useEffect } from 'preact/hooks';
import { TMDBResult } from '../pages/Browse';

interface ContentSearchProps {
  results: TMDBResult[];
  loading: boolean;
  onSearch: (query: string) => void;
  onSelect: (content: TMDBResult) => void;
  initialQuery?: string;
}

const TMDB_IMG = 'https://image.tmdb.org/t/p';

export function ContentSearch({ results, loading, onSearch, onSelect, initialQuery = '' }: ContentSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  
  // Sync query with initialQuery when returning from detail view
  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    onSearch(query);
  };

  const getTitle = (item: TMDBResult) => item.title || item.name || 'Unknown';
  const getYear = (item: TMDBResult) => {
    const date = item.release_date || item.first_air_date;
    return date ? new Date(date).getFullYear() : null;
  };

  return (
    <div class="content-search">
      <form class="search-form" onSubmit={handleSubmit}>
        <input
          type="text"
          class="search-input"
          placeholder="Search movies and TV shows..."
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
          disabled={loading}
        />
        <button type="submit" class="btn btn-primary" disabled={loading || !query.trim()}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {loading && (
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Searching...</p>
        </div>
      )}

      {!loading && results.length === 0 && (
        <div class="empty-state">
          <p>Search for a movie or TV show to find torrents</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div class="content-grid">
          {results.map((item) => (
            <button
              key={`${item.media_type}-${item.id}`}
              class="content-card"
              onClick={() => onSelect(item)}
            >
              {item.poster_path ? (
                <img
                  src={`${TMDB_IMG}/w342${item.poster_path}`}
                  alt={getTitle(item)}
                  class="content-poster"
                  loading="lazy"
                />
              ) : (
                <div class="content-poster content-poster-placeholder">
                  <span>No Image</span>
                </div>
              )}
              <div class="content-info">
                <h3 class="content-title">{getTitle(item)}</h3>
                <div class="content-meta">
                  <span class="content-type">{item.media_type === 'tv' ? 'TV Show' : 'Movie'}</span>
                  {getYear(item) && <span class="content-year">{getYear(item)}</span>}
                  {item.vote_average > 0 && (
                    <span class="content-rating">★ {item.vote_average.toFixed(1)}</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

