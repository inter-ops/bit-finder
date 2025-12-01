import { useState } from 'preact/hooks';

interface SearchBarProps {
  onSearch: (query: string, limit: number) => void;
  loading: boolean;
}

export function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(50);

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    onSearch(query, limit);
  };

  return (
    <div class="search-container">
      <form class="search-form" onSubmit={handleSubmit}>
        <input
          type="text"
          class="search-input"
          placeholder="Search for torrents..."
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
          disabled={loading}
        />
        <select 
          class="search-select"
          value={limit}
          onChange={(e) => setLimit(parseInt((e.target as HTMLSelectElement).value))}
          disabled={loading}
        >
          <option value={25}>25 results</option>
          <option value={50}>50 results</option>
          <option value={100}>100 results</option>
          <option value={200}>200 results</option>
        </select>
        <button type="submit" class="btn btn-primary" disabled={loading || !query.trim()}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>
    </div>
  );
}