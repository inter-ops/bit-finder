import { Filters } from '../types';

interface FilterPanelProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  onClearFilters: () => void;
  onRemoveFilter: (type: keyof Filters, value: string | number) => void;
  totalResults: number;
  filteredResults: number;
}

const CATEGORIES = ['Movie', 'TV', 'Other'] as const;
const PROVIDERS = ['ThePirateBay', 'TorrentProject', 'Eztv', 'Rarbg', 'Yts'];
const RESOLUTIONS = ['8K', '4K', '1080p', '720p', '480p'];
const VIDEO_CODECS = ['AV1', 'H.265', 'H.264', 'XviD'];
const AUDIO_CODECS = ['Dolby Atmos', 'TrueHD', 'DTS-HD', 'DTS-X', 'DTS', 'AC3', 'AAC'];
const SOURCES = ['Remux', 'BluRay', 'WEB-DL', 'WEBRip', 'HDTV'];
const HDR_OPTIONS = ['Dolby Vision', 'HDR10+', 'HDR10'];

export function FilterPanel({ filters, onFilterChange, onClearFilters, onRemoveFilter, totalResults, filteredResults }: FilterPanelProps) {
  const toggleFilter = (category: keyof Filters, value: string) => {
    const current = filters[category] as string[];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    
    onFilterChange({ ...filters, [category]: updated });
  };

  const handleMinSeedsChange = (e: Event) => {
    const value = parseInt((e.target as HTMLInputElement).value) || 0;
    onFilterChange({ ...filters, minSeeds: value });
  };

  const isActive = (category: keyof Filters, value: string) => {
    return (filters[category] as string[]).includes(value);
  };

  const hasActiveFilters = () => {
    return filters.categories.length > 0 ||
           filters.providers.length > 0 ||
           filters.resolutions.length > 0 ||
           filters.videoCodecs.length > 0 ||
           filters.audioCodecs.length > 0 ||
           filters.sources.length > 0 ||
           filters.hdr.length > 0 ||
           filters.minSeeds > 0;
  };

  const getActiveFilters = () => {
    const active: Array<{ type: keyof Filters; value: string | number; label: string }> = [];
    
    filters.categories.forEach(v => active.push({ type: 'categories', value: v, label: v }));
    filters.providers.forEach(v => active.push({ type: 'providers', value: v, label: v }));
    filters.resolutions.forEach(v => active.push({ type: 'resolutions', value: v, label: v }));
    filters.videoCodecs.forEach(v => active.push({ type: 'videoCodecs', value: v, label: v }));
    filters.audioCodecs.forEach(v => active.push({ type: 'audioCodecs', value: v, label: v }));
    filters.sources.forEach(v => active.push({ type: 'sources', value: v, label: v }));
    filters.hdr.forEach(v => active.push({ type: 'hdr', value: v, label: v }));
    if (filters.minSeeds > 0) active.push({ type: 'minSeeds', value: filters.minSeeds, label: `Seeds ≥ ${filters.minSeeds}` });
    
    return active;
  };

  const activeFilters = getActiveFilters();

  return (
    <aside class="filter-panel">
      <div class="filter-header">
        <h3>Filters</h3>
        {hasActiveFilters() && (
          <button class="btn-clear" onClick={onClearFilters}>Clear All</button>
        )}
      </div>

      <div class="filter-results">
        Showing {filteredResults} of {totalResults} torrents
      </div>

      {activeFilters.length > 0 && (
        <div class="active-filters">
          <h4>Active Filters</h4>
          <div class="active-filter-tags">
            {activeFilters.map(({ type, value, label }) => (
              <button
                key={`${type}-${value}`}
                class="active-filter-tag"
                onClick={() => onRemoveFilter(type, value)}
                title="Click to remove"
              >
                {label} ✕
              </button>
            ))}
          </div>
        </div>
      )}

      <div class="filter-section">
        <h4>Category</h4>
        <div class="filter-options">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              class={`filter-btn ${isActive('categories', cat) ? 'active' : ''}`}
              onClick={() => toggleFilter('categories', cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div class="filter-section">
        <h4>Providers</h4>
        <div class="filter-options">
          {PROVIDERS.map(provider => (
            <button
              key={provider}
              class={`filter-btn ${isActive('providers', provider) ? 'active' : ''}`}
              onClick={() => toggleFilter('providers', provider)}
            >
              {provider}
            </button>
          ))}
        </div>
      </div>

      <div class="filter-section">
        <h4>Resolution</h4>
        <div class="filter-options">
          {RESOLUTIONS.map(res => (
            <button
              key={res}
              class={`filter-btn ${isActive('resolutions', res) ? 'active' : ''}`}
              onClick={() => toggleFilter('resolutions', res)}
            >
              {res}
            </button>
          ))}
        </div>
      </div>

      <div class="filter-section">
        <h4>Video Codec</h4>
        <div class="filter-options">
          {VIDEO_CODECS.map(codec => (
            <button
              key={codec}
              class={`filter-btn ${isActive('videoCodecs', codec) ? 'active' : ''}`}
              onClick={() => toggleFilter('videoCodecs', codec)}
            >
              {codec}
            </button>
          ))}
        </div>
      </div>

      <div class="filter-section">
        <h4>Audio</h4>
        <div class="filter-options">
          {AUDIO_CODECS.map(codec => (
            <button
              key={codec}
              class={`filter-btn ${isActive('audioCodecs', codec) ? 'active' : ''}`}
              onClick={() => toggleFilter('audioCodecs', codec)}
            >
              {codec}
            </button>
          ))}
        </div>
      </div>

      <div class="filter-section">
        <h4>Source</h4>
        <div class="filter-options">
          {SOURCES.map(source => (
            <button
              key={source}
              class={`filter-btn ${isActive('sources', source) ? 'active' : ''}`}
              onClick={() => toggleFilter('sources', source)}
            >
              {source}
            </button>
          ))}
        </div>
      </div>

      <div class="filter-section">
        <h4>HDR</h4>
        <div class="filter-options">
          {HDR_OPTIONS.map(hdr => (
            <button
              key={hdr}
              class={`filter-btn ${isActive('hdr', hdr) ? 'active' : ''}`}
              onClick={() => toggleFilter('hdr', hdr)}
            >
              {hdr}
            </button>
          ))}
        </div>
      </div>

      <div class="filter-section">
        <h4>Minimum Seeds</h4>
        <input
          type="number"
          class="filter-input"
          value={filters.minSeeds}
          onInput={handleMinSeedsChange}
          min="0"
          placeholder="0"
        />
      </div>
    </aside>
  );
}