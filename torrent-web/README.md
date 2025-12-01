# Torrent Web

A modern torrent search and download web application built with Bun, Hono, and Preact.

## Features

- 🔍 Search torrents across multiple providers
- 📊 View torrent stats (seeds, peers, size)
- 🧲 Copy magnet links to clipboard
- ⬇️ Add torrents directly to Transmission
- 🎨 Clean, modern, responsive UI
- ⚡ Fast performance with Bun runtime

## Tech Stack

- **Runtime**: [Bun](https://bun.sh) - Fast all-in-one JavaScript runtime
- **Backend**: [Hono](https://hono.dev) - Lightweight web framework
- **Frontend**: [Preact](https://preactjs.com) - Fast 3kb React alternative
- **Build Tool**: [Vite](https://vitejs.dev) - Next generation frontend tooling
- **Styling**: Modern CSS with custom properties

## Prerequisites

- [Bun](https://bun.sh) installed on your system
- The parent `bit-finder` package must be built (`npm run build` in parent directory)
- (Optional) Transmission daemon for downloads

## Installation

1. Install dependencies in the root project:
```bash
cd torrent-web
bun install
```

2. Install client dependencies:
```bash
cd client
bun install
```

## Development

Run the development servers:

### Terminal 1 - Backend Server
```bash
cd torrent-web
bun run dev
```
The API will be available at `http://localhost:3000`

### Terminal 2 - Frontend Dev Server
```bash
cd torrent-web/client
bun run dev
```
The app will be available at `http://localhost:5173`

The frontend dev server proxies API requests to the backend automatically.

## Production Build

1. Build the client:
```bash
cd torrent-web/client
bun run build
```

2. Run the production server:
```bash
cd torrent-web
NODE_ENV=production bun run server/index.ts
```

The production server will serve the built frontend from `client/dist` at `http://localhost:3000`

## API Endpoints

- `GET /api/search?name=<query>` - Search for torrents
- `POST /api/magnet` - Get magnet link for a torrent
- `POST /api/download` - Add torrent to Transmission

## Project Structure

```
torrent-web/
├── server/
│   └── index.ts          # Hono API server
├── client/
│   ├── src/
│   │   ├── App.tsx       # Main app component
│   │   ├── main.tsx      # App entry point
│   │   ├── components/   # Preact components
│   │   │   ├── SearchBar.tsx
│   │   │   ├── TorrentList.tsx
│   │   │   ├── TorrentCard.tsx
│   │   │   └── Notification.tsx
│   │   └── styles/
│   │       └── main.css  # Global styles
│   ├── index.html        # HTML template
│   ├── vite.config.ts    # Vite configuration
│   └── package.json
├── package.json
└── README.md
```

## Features Explained

### Search
Enter a movie or TV show name and click "Search" to find available torrents.

### Copy Magnet
Click "Copy Magnet" on any torrent to copy its magnet link to your clipboard.

### Download
Click "Download" to add the torrent directly to your Transmission client (requires Transmission to be configured in the parent bit-finder package).

## Styling

The app features a modern dark theme with:
- Smooth animations and transitions
- Responsive design for mobile and desktop
- Clean, minimal interface
- Hover effects and visual feedback

## Notes

- This web app uses the torrent search and download functionality from the parent `bit-finder` package
- Make sure the parent package is built before running this application
- The download feature requires Transmission to be properly configured

## License

MIT