import { useState, useEffect } from "preact/hooks";
import { SearchBar } from "../components/SearchBar";
import { TorrentList } from "../components/TorrentList";
import { FilterPanel } from "../components/FilterPanel";
import { Notification } from "../components/Notification";
import { Torrent, Filters } from "../types";
import { isWarmupActive, waitForWarmup } from "../components/CloudflareStatus";

const DEFAULT_FILTERS: Filters = {
  categories: [],
  providers: [],
  resolutions: [],
  videoCodecs: [],
  audioCodecs: [],
  sources: [],
  hdr: [],
  minSeeds: 0
};

export default function Search() {
  const [allTorrents, setAllTorrents] = useState<Torrent[]>([]);
  const [filteredTorrents, setFilteredTorrents] = useState<Torrent[]>([]);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(false);
  const [lastQuery, setLastQuery] = useState<string>("");
  const [lastLimit, setLastLimit] = useState<number>(50);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Apply filters whenever torrents or filters change
  useEffect(() => {
    let result = [...allTorrents];

    if (filters.categories.length > 0) {
      result = result.filter((t) => filters.categories.includes(t.category));
    }

    if (filters.providers.length > 0) {
      result = result.filter((t) => filters.providers.includes(t.provider));
    }

    if (filters.resolutions.length > 0) {
      result = result.filter(
        (t) => t.metadata.resolution && filters.resolutions.includes(t.metadata.resolution)
      );
    }

    if (filters.videoCodecs.length > 0) {
      result = result.filter(
        (t) => t.metadata.videoCodec && filters.videoCodecs.includes(t.metadata.videoCodec)
      );
    }

    if (filters.audioCodecs.length > 0) {
      result = result.filter(
        (t) => t.metadata.audioCodec && filters.audioCodecs.includes(t.metadata.audioCodec)
      );
    }

    if (filters.sources.length > 0) {
      result = result.filter(
        (t) => t.metadata.source && filters.sources.includes(t.metadata.source)
      );
    }

    if (filters.hdr.length > 0) {
      result = result.filter((t) => t.metadata.hdr && filters.hdr.includes(t.metadata.hdr));
    }

    if (filters.minSeeds > 0) {
      result = result.filter((t) => t.seeds >= filters.minSeeds);
    }

    setFilteredTorrents(result);
  }, [allTorrents, filters]);

  const [waitingForWarmup, setWaitingForWarmup] = useState(false);

  const handleSearch = async (query: string, limit: number = 50) => {
    if (!query.trim()) return;

    setLoading(true);
    setNotification(null);
    setLastQuery(query);
    setLastLimit(limit);

    // Wait for 1337x warmup if it's in progress
    if (isWarmupActive()) {
      setWaitingForWarmup(true);
      await waitForWarmup(60000);
      setWaitingForWarmup(false);
    }

    try {
      let url = `/api/search?name=${encodeURIComponent(query)}&limit=${limit}`;

      if (filters.providers.length > 0) {
        url += `&providers=${filters.providers.join(",")}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        setAllTorrents(data.results || []);
        if (!data.results || data.results.length === 0) {
          setNotification({ message: "No torrents found", type: "error" });
        }
      } else {
        setNotification({ message: data.error || "Search failed", type: "error" });
        setAllTorrents([]);
      }
    } catch (error) {
      setNotification({ message: "Failed to search torrents", type: "error" });
      setAllTorrents([]);
    } finally {
      setLoading(false);
    }
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
        setNotification({ message: "Magnet link copied to clipboard!", type: "success" });
      } else {
        setNotification({ message: data.error || "Failed to get magnet", type: "error" });
      }
    } catch (error) {
      setNotification({ message: "Failed to get magnet link", type: "error" });
    }
  };

  const handleDownload = async (torrent: Torrent) => {
    try {
      const magnetResponse = await fetch("/api/magnet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(torrent.raw)
      });

      const magnetData = await magnetResponse.json();

      if (!magnetResponse.ok) {
        setNotification({ message: magnetData.error || "Failed to get magnet", type: "error" });
        return;
      }

      const downloadResponse = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ magnet: magnetData.magnet })
      });

      const downloadData = await downloadResponse.json();

      if (downloadResponse.ok) {
        setNotification({ message: "Torrent added to downloads!", type: "success" });
      } else {
        setNotification({
          message: downloadData.error || "Failed to add torrent",
          type: "error"
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to download torrent";
      setNotification({ message: errorMessage, type: "error" });
    }
  };

  const handleFilterChange = (newFilters: Filters) => {
    const providersChanged =
      newFilters.providers.length !== filters.providers.length ||
      !newFilters.providers.every((p, i) => p === filters.providers[i]);

    setFilters(newFilters);

    if (providersChanged && lastQuery) {
      handleSearch(lastQuery, lastLimit);
    }
  };

  const handleClearFilters = () => {
    const hadProviders = filters.providers.length > 0;
    setFilters(DEFAULT_FILTERS);

    if (hadProviders && lastQuery) {
      handleSearch(lastQuery, lastLimit);
    }
  };

  const handleBadgeClick = (type: string, value: string) => {
    setFilters((prev) => {
      const key =
        type === "resolution"
          ? "resolutions"
          : type === "videoCodec"
          ? "videoCodecs"
          : type === "audioCodec"
          ? "audioCodecs"
          : type === "source"
          ? "sources"
          : type === "category"
          ? "categories"
          : "hdr";

      const currentValues = prev[key as keyof Filters] as string[];
      const newValues = currentValues.includes(value)
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value];

      return {
        ...prev,
        [key]: newValues
      };
    });
  };

  const handleRemoveFilter = (type: keyof Filters, value: string | number) => {
    setFilters((prev) => {
      if (type === "minSeeds") {
        return { ...prev, minSeeds: 0 };
      }

      const currentValues = prev[type] as string[];
      return {
        ...prev,
        [type]: currentValues.filter((v) => v !== value)
      };
    });
  };

  return (
    <>
      <SearchBar onSearch={handleSearch} loading={loading} />

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {waitingForWarmup && (
        <div class="warmup-notice">
          <div class="spinner" style={{ width: '16px', height: '16px' }}></div>
          <span>Waiting for 1337x Cloudflare bypass...</span>
        </div>
      )}

      {allTorrents.length > 0 ? (
        <div class="content-wrapper">
          <FilterPanel
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
            onRemoveFilter={handleRemoveFilter}
            totalResults={allTorrents.length}
            filteredResults={filteredTorrents.length}
          />
          <TorrentList
            torrents={filteredTorrents}
            loading={loading}
            onGetMagnet={handleGetMagnet}
            onDownload={handleDownload}
            onBadgeClick={handleBadgeClick}
          />
        </div>
      ) : (
        <TorrentList
          torrents={filteredTorrents}
          loading={loading}
          onGetMagnet={handleGetMagnet}
          onDownload={handleDownload}
          onBadgeClick={handleBadgeClick}
        />
      )}
    </>
  );
}

