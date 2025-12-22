import { useState, useCallback, useRef } from "preact/hooks";
import { Router, Route, useLocation, Redirect, Switch } from "wouter";
import { CloudflareStatus } from "./components/CloudflareStatus";
import Browse from "./pages/Browse";
import Search from "./pages/Search";
import Downloads from "./pages/Downloads";

// Helper to get full URL (path + search)
const getFullUrl = () => window.location.pathname + window.location.search;

// Main App with routing
export function App() {
  const [location, setLocation] = useLocation();
  const [browseKey, setBrowseKey] = useState(0);
  const [highlightedTorrent, setHighlightedTorrent] = useState<string | null>(null);
  
  // Store browse URL when navigating away
  const savedBrowseUrl = useRef<string | null>(null);
  
  // Track which tab we're on (use pathname from window to include search params context)
  const currentPath = window.location.pathname;
  const isOnBrowse = currentPath === '/browse' || currentPath === '/';
  const isOnSearch = currentPath === '/search';
  const isOnDownloads = currentPath === '/downloads';

  // Handle tab navigation with state preservation
  const handleTabClick = useCallback((targetTab: 'browse' | 'search' | 'downloads') => {
    const targetPath = targetTab === 'browse' ? '/browse' : targetTab === 'search' ? '/search' : '/downloads';
    
    // If clicking on same tab, reset it
    if ((targetTab === 'browse' && isOnBrowse)) {
      setBrowseKey(k => k + 1);
      savedBrowseUrl.current = null;
      setLocation('/browse');
      return;
    }
    if ((targetTab === 'search' && isOnSearch) || (targetTab === 'downloads' && isOnDownloads)) {
      setLocation(targetPath);
      return;
    }
    
    // Save current browse URL (including search params) when leaving browse
    if (isOnBrowse) {
      savedBrowseUrl.current = getFullUrl();
    }
    
    // Restore browse URL when returning to browse
    if (targetTab === 'browse' && savedBrowseUrl.current) {
      setLocation(savedBrowseUrl.current);
      return;
    }
    
    setLocation(targetPath);
  }, [isOnBrowse, isOnSearch, isOnDownloads, setLocation]);

  // Navigate to downloads with optional highlight
  const handleNavigateToDownloads = useCallback((infoHash?: string) => {
    if (infoHash) {
      setHighlightedTorrent(infoHash);
      setTimeout(() => setHighlightedTorrent(null), 5000);
    }
    // Save browse URL (including search params) if on browse
    if (isOnBrowse) {
      savedBrowseUrl.current = getFullUrl();
    }
    setLocation('/downloads');
  }, [isOnBrowse, setLocation]);

  return (
    <div class="app">
      <CloudflareStatus onReady={() => console.log("[1337x] Ready")} />
      <header class="header">
        <div class="container">
          <div class="header-row">
            <h1>Torrent Finder</h1>
            <nav class="tabs">
              <button
                class={`tab ${isOnBrowse ? 'active' : ''}`}
                onClick={() => handleTabClick('browse')}
              >
                Browse Movies and TV Shows
              </button>
              <button
                class={`tab ${isOnSearch ? 'active' : ''}`}
                onClick={() => handleTabClick('search')}
              >
                Direct Torrent Search
              </button>
              <button
                class={`tab ${isOnDownloads ? 'active' : ''}`}
                onClick={() => handleTabClick('downloads')}
              >
                Downloads
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main class="main">
        <div class="container">
          <Switch>
            <Route path="/">
              <Redirect to="/browse" />
            </Route>
            
            <Route path="/browse">
              {() => (
                <div key={browseKey}>
                  <Browse onNavigateToDownloads={handleNavigateToDownloads} />
                </div>
              )}
            </Route>
            
            <Route path="/search">
              <Search />
            </Route>
            
            <Route path="/downloads">
              <Downloads highlightedInfoHash={highlightedTorrent} />
            </Route>
          </Switch>
        </div>
      </main>
    </div>
  );
}

// Wrap in Router
export default function AppWithRouter() {
  return (
    <Router>
      <App />
    </Router>
  );
}
