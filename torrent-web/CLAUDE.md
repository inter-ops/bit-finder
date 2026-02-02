# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Backend** (from `torrent-web/`):
```bash
bun run dev          # Start backend with tsx --watch on port 3000
```

**Frontend** (from `torrent-web/client/`):
```bash
bun run dev          # Vite dev server on port 5173 (proxies /api to :3000)
bun run build        # Production build to client/dist
```

Both servers must run simultaneously for development. The parent `bit-finder` package must be built first (`npm run build` in parent directory).

**1337x Python API** (from `torrent-web/`):
```bash
bun run dev:1337x    # FastAPI server on port 8000 (uses .venv/bin/python)
```
This server (`1337x-search/torrent_api.py`) handles Cloudflare bypass for 1337x using Botasaurus browser automation. Cookies are cached for 30 minutes in `cookie_cache.json`. Call `POST /api/warmup` to preload cookies. Dependencies are in `1337x-search/requirements.txt` (fastapi, uvicorn, botasaurus, beautifulsoup4).

## Architecture

This is a full-stack torrent search/download/streaming app. **Backend**: Hono (TypeScript) on Bun. **Frontend**: Preact + Wouter + Vite.

### Backend (`server/`)

- **`index.ts`** — Main Hono app with all API routes (~600 lines, monolithic). Handles CORS, static file serving in production, and all endpoint definitions.
- **`webtorrent.ts`** — Singleton WebTorrent client. Persists torrent state to a JSON file on disk and restores on startup. Downloads go to `~/Downloads` (or `DOWNLOAD_PATH` env).
- **`1337xClient.ts`** — Client for the external Python 1337x API server. Handles Cloudflare bypass warmup via SSE.
- **`torrentParser.ts`** — Regex-based metadata extraction from torrent titles (resolution, codec, source, HDR, release group, etc.). Returns `ParsedTorrent` with `TorrentMetadata`.

API routes are all in `index.ts`: search (`/api/search`), TMDB proxy (`/api/tmdb/*`), OMDB ratings (`/api/omdb`), download management (`/api/torrents/*`, `/api/download`), video streaming with range requests (`/api/stream/*`), and 1337x warmup (`/api/1337x/*`).

### Frontend (`client/src/`)

- **Preact** with JSX (not React — uses `@preact/preset-vite`)
- **Wouter** for routing — three pages: `/browse`, `/search`, `/downloads`
- State is URL-driven (query params for search terms, content IDs, media types) — no centralized store
- Downloads page polls `/api/torrents` every 2 seconds for live updates

**Key pages**:
- `Browse.tsx` — TMDB-based content discovery. Search → select → ContentDetail (shows torrents, ratings, streaming player)
- `Search.tsx` — Direct torrent search with filter panel (resolution, codec, source, provider, min seeds)
- `Downloads.tsx` — Active torrent management with real-time progress

### Data Flow

Search results from multiple providers (torrent-search-api + 1337x) are combined, parsed for metadata by `torrentParser.ts`, and enriched with download state before reaching the frontend. Magnet links are fetched on-demand via `POST /api/magnet`. Streaming uses HTTP range requests through WebTorrent.

## Environment Variables

- `PORT` — Server port (default 3000)
- `DOWNLOAD_PATH` — Download directory (default ~/Downloads)
- `LEET_API_URL` — 1337x Python API URL (default http://localhost:8000)
- `TMDB_TOKEN` and `OMDB_KEY` are hardcoded in server code
- `WG_INTERFACE` — WireGuard interface name (default `wg0`)
- `VPN_REQUIRED` — Set `false` to disable VPN enforcement (default `true`)
- `VPN_CHECK_INTERVAL` — VPN health check interval in ms (default `30000`)

## VPN (WireGuard) Integration

The server auto-connects to WireGuard on startup and enforces VPN for all torrent operations. A kill switch pauses all torrents if the VPN drops.

### Setup

1. Install WireGuard: `brew install wireguard-tools`
2. Place config at `/etc/wireguard/wg0.conf` (or your `WG_INTERFACE` name)
3. Add passwordless sudo for WireGuard commands in `/etc/sudoers.d/wireguard`:
   ```
   %staff ALL=(ALL) NOPASSWD: /usr/local/bin/wg, /usr/local/bin/wg-quick
   ```
4. Start the server — VPN connects automatically

### API Endpoints

- `GET /api/vpn/status` — Returns VPN connection status + public IP

VPN connect/disconnect is server-managed only (auto-connect on startup). No manual connect/disconnect API is exposed.

### Kill Switch Behavior

- VPN drops → all active torrents paused within `VPN_CHECK_INTERVAL` ms
- Adding/resuming torrents without VPN → 503 error
- VPN reconnects → logged, but torrents stay paused (manual resume for safety)
- Set `VPN_REQUIRED=false` to bypass all VPN enforcement

## Key Patterns

- The backend depends on the parent `bit-finder` package for `torrent-search-api` (`search`, `getMagnet` imports)
- Torrent metadata parsing is purely regex-based in `torrentParser.ts` — extend patterns there for new quality indicators
- No test framework is configured
- No linter is configured
