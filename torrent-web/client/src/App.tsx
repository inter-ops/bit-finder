import { useState, useEffect, useCallback } from "preact/hooks";
import { SearchBar } from "./components/SearchBar";
import { TorrentList } from "./components/TorrentList";
import { FilterPanel } from "./components/FilterPanel";
import { Notification } from "./components/Notification";
import { CloudflareStatus } from "./components/CloudflareStatus";
import Downloads from "./pages/Downloads";
import Browse from "./pages/Browse";
import { Torrent, Filters } from "./types";

type Tab = "browse" | "search" | "downloads";

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

// Helper to get tab from URL path
const getTabFromUrl = (): Tab => {
  const path = window.location.pathname;
  if (path === "/search" || path.startsWith("/search")) return "search";
  if (path === "/downloads" || path.startsWith("/downloads")) return "downloads";
  return "browse"; // Default to browse for "/" or "/browse"
};

// Helper to get base path for tab
const getPathForTab = (tab: Tab): string => {
  if (tab === "search") return "/search";
  if (tab === "downloads") return "/downloads";
  return "/browse";
};

export function App() {
  // Initialize tab from URL immediately to prevent flash
  const [activeTab, setActiveTab] = useState<Tab>(getTabFromUrl);
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
  const [highlightedTorrent, setHighlightedTorrent] = useState<string | null>(null);

  // Handle tab change with URL update
  const handleTabChange = useCallback((tab: Tab, pushHistory = true) => {
    setActiveTab(tab);
    
    // Build new URL preserving search params for browse tab
    const currentParams = new URLSearchParams(window.location.search);
    let newUrl = getPathForTab(tab);
    
    // Only preserve params for browse tab (query, id, type)
    if (tab === "browse" && currentParams.toString()) {
      // Clear params when switching to browse tab without specific content
      newUrl = "/browse";
    } else if (tab !== "browse") {
      // Clear browse-specific params for other tabs
      newUrl = getPathForTab(tab);
    }
    
    if (pushHistory) {
      window.history.pushState({ tab }, "", newUrl);
    } else {
      window.history.replaceState({ tab }, "", newUrl);
    }
  }, []);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const tab = getTabFromUrl();
      setActiveTab(tab);
    };

    window.addEventListener("popstate", handlePopState);
    
    // Set initial history state if not set
    if (!window.history.state?.tab) {
      const currentTab = getTabFromUrl();
      window.history.replaceState({ tab: currentTab }, "", window.location.href);
    }

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Handler to navigate to downloads with a highlighted torrent
  const handleNavigateToDownloads = useCallback((infoHash?: string) => {
    if (infoHash) {
      setHighlightedTorrent(infoHash);
      setTimeout(() => setHighlightedTorrent(null), 5000);
    }
    handleTabChange("downloads");
  }, [handleTabChange]);

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

  const handleSearch = async (query: string, limit: number = 50) => {
    if (!query.trim()) return;

    setLoading(true);
    setNotification(null);
    setLastQuery(query);
    setLastLimit(limit);

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
    <div class="app">
      <CloudflareStatus onReady={() => console.log("[1337x] Ready")} />
      <header class="header">
        <div class="container">
          <div class="header-row">
            <h1>Torrent Finder</h1>
            <nav class="tabs">
              <button
                class={`tab ${activeTab === "browse" ? "active" : ""}`}
                onClick={() => handleTabChange("browse")}
              >
                Browse Movies and TV Shows
              </button>
              <button
                class={`tab ${activeTab === "search" ? "active" : ""}`}
                onClick={() => handleTabChange("search")}
              >
                Direct Torrent Search
              </button>
              <button
                class={`tab ${activeTab === "downloads" ? "active" : ""}`}
                onClick={() => handleTabChange("downloads")}
              >
                Downloads
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main class="main">
        <div class="container">
          {activeTab === "browse" && (
            <Browse onNavigateToDownloads={handleNavigateToDownloads} />
          )}
          {activeTab === "search" && (
            <>
              <SearchBar onSearch={handleSearch} loading={loading} />

              {notification && (
                <Notification
                  message={notification.message}
                  type={notification.type}
                  onClose={() => setNotification(null)}
                />
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
          )}
          {activeTab === "downloads" && <Downloads highlightedInfoHash={highlightedTorrent} />}
        </div>
      </main>
    </div>
  );
}
