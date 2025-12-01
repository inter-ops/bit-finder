import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import {
  search,
  getMagnet,
  add,
  getTorrents,
  pauseTorrent,
  resumeTorrent,
  removeTorrent
} from "../../src/services/torrent.js";
import { parseTorrent } from "./torrentParser.js";

const app = new Hono();

// TMDB API configuration
const TMDB_TOKEN =
  "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI5MDNmNDFiNjU3ZDU2NjU5NDViMjUzNTcyZjM0MTViOCIsIm5iZiI6MTc2NDU1MjY3MC45MDUsInN1YiI6IjY5MmNlZmRlZDk2MmM3NmYxNTI4NjM5NiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.cjmgBEIgbrhW6rlGMIpUXfzAMJ3s7gOsGdFAMvgbWfI";
const TMDB_BASE = "https://api.themoviedb.org/3";

// OMDB API configuration (free tier - 1000 requests/day)
const OMDB_KEY = "35e2a20"; // Free API key
const OMDB_BASE = "https://www.omdbapi.com";

const tmdbFetch = async (endpoint: string) => {
  const res = await fetch(`${TMDB_BASE}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${TMDB_TOKEN}`,
      "Content-Type": "application/json"
    }
  });
  return res.json();
};

const omdbFetch = async (title: string, year?: number, type?: "movie" | "series") => {
  const params = new URLSearchParams({
    apikey: OMDB_KEY,
    t: title,
    ...(year && { y: year.toString() }),
    ...(type && { type })
  });
  const res = await fetch(`${OMDB_BASE}?${params}`);
  return res.json();
};

// Enable CORS for development
app.use("/*", cors());

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use("/*", serveStatic({ root: "./client/dist" }));
}

// Search torrents
app.get("/api/search", async (c) => {
  const { name, limit } = c.req.query();

  if (!name) {
    return c.json({ error: "Name parameter is required" }, 400);
  }

  const resultLimit = limit ? parseInt(limit) : 50;
  const category = "all";

  try {
    const results = await search(name, category, resultLimit);

    // Parse and enrich torrents with metadata, filtering out invalid ones
    const parsedResults = results.map(parseTorrent).filter((t) => {
      // Filter out invalid torrents (ThePirateBay returns id=0 when no results)
      if (t.raw?.id === 0 || t.raw?.id === "0") return false;
      // Filter out torrents with no title
      if (!t.title || t.title === "Unknown") return false;
      // Filter out torrents with invalid size
      if (t.size === "0 B") return false;
      return true;
    });

    // Sort by seeds (highest first)
    parsedResults.sort((a, b) => b.seeds - a.seeds);
    return c.json({ results: parsedResults });
  } catch (error) {
    console.error("Search error:", error);
    return c.json({ error: "Failed to search torrents" }, 500);
  }
});

// Get magnet link
app.post("/api/magnet", async (c) => {
  const torrent = await c.req.json();

  try {
    const magnet = await getMagnet(torrent);
    return c.json({ magnet });
  } catch (error) {
    console.error("Magnet error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to get magnet link";
    return c.json({ error: errorMessage }, 500);
  }
});

// Download torrent
app.post("/api/download", async (c) => {
  try {
    const { magnet } = await c.req.json();

    if (!magnet) {
      return c.json({ error: "Magnet parameter is required" }, 400);
    }

    await add(magnet);
    return c.json({ success: true, message: "Torrent added successfully" });
  } catch (error) {
    console.error("Download error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to add torrent";
    return c.json({ error: errorMessage }, 500);
  }
});

// Get all torrents
app.get("/api/torrents", async (c) => {
  try {
    const torrents = await getTorrents();
    return c.json({ torrents });
  } catch (error) {
    console.error("Get torrents error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to get torrents";
    return c.json({ error: errorMessage }, 500);
  }
});

// Pause torrent
app.post("/api/torrents/:id/pause", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    await pauseTorrent(id);
    return c.json({ success: true, message: "Torrent paused" });
  } catch (error) {
    console.error("Pause torrent error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to pause torrent";
    return c.json({ error: errorMessage }, 500);
  }
});

// Resume torrent
app.post("/api/torrents/:id/resume", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    await resumeTorrent(id);
    return c.json({ success: true, message: "Torrent resumed" });
  } catch (error) {
    console.error("Resume torrent error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to resume torrent";
    return c.json({ error: errorMessage }, 500);
  }
});

// Remove torrent (without deleting data)
app.delete("/api/torrents/:id/remove", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    await removeTorrent(id, false);
    return c.json({ success: true, message: "Torrent removed" });
  } catch (error) {
    console.error("Remove torrent error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to remove torrent";
    return c.json({ error: errorMessage }, 500);
  }
});

// Delete torrent (with data)
app.delete("/api/torrents/:id/delete", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    await removeTorrent(id, true);
    return c.json({ success: true, message: "Torrent and data deleted" });
  } catch (error) {
    console.error("Delete torrent error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to delete torrent";
    return c.json({ error: errorMessage }, 500);
  }
});

// TMDB Routes

// Search movies and TV shows
app.get("/api/tmdb/search", async (c) => {
  const { query } = c.req.query();
  if (!query) {
    return c.json({ error: "Query parameter is required" }, 400);
  }
  try {
    const data = await tmdbFetch(
      `/search/multi?query=${encodeURIComponent(query)}&include_adult=false`
    );
    // Filter to only movies and TV shows
    const results = (data.results || []).filter(
      (item: any) => item.media_type === "movie" || item.media_type === "tv"
    );
    return c.json({ results });
  } catch (error) {
    console.error("TMDB search error:", error);
    return c.json({ error: "Failed to search TMDB" }, 500);
  }
});

// Get movie details
app.get("/api/tmdb/movie/:id", async (c) => {
  const id = c.req.param("id");
  try {
    const [details, videos] = await Promise.all([
      tmdbFetch(`/movie/${id}`),
      tmdbFetch(`/movie/${id}/videos`)
    ]);
    // Find trailer
    const trailer = (videos.results || []).find(
      (v: any) => v.type === "Trailer" && v.site === "YouTube"
    );
    return c.json({ ...details, trailer: trailer?.key });
  } catch (error) {
    console.error("TMDB movie error:", error);
    return c.json({ error: "Failed to get movie details" }, 500);
  }
});

// Get TV show details with seasons
app.get("/api/tmdb/tv/:id", async (c) => {
  const id = c.req.param("id");
  try {
    const [details, videos] = await Promise.all([
      tmdbFetch(`/tv/${id}`),
      tmdbFetch(`/tv/${id}/videos`)
    ]);
    const trailer = (videos.results || []).find(
      (v: any) => v.type === "Trailer" && v.site === "YouTube"
    );
    return c.json({ ...details, trailer: trailer?.key });
  } catch (error) {
    console.error("TMDB TV error:", error);
    return c.json({ error: "Failed to get TV show details" }, 500);
  }
});

// Get TV season details with episodes
app.get("/api/tmdb/tv/:id/season/:season", async (c) => {
  const id = c.req.param("id");
  const season = c.req.param("season");
  try {
    const data = await tmdbFetch(`/tv/${id}/season/${season}`);
    return c.json(data);
  } catch (error) {
    console.error("TMDB season error:", error);
    return c.json({ error: "Failed to get season details" }, 500);
  }
});

// Get OMDB ratings (includes Rotten Tomatoes)
app.get("/api/omdb", async (c) => {
  const { title, year, type } = c.req.query();
  if (!title) {
    return c.json({ error: "Title parameter is required" }, 400);
  }
  try {
    const data = await omdbFetch(
      title,
      year ? parseInt(year) : undefined,
      type as "movie" | "series" | undefined
    );

    if (data.Response === "False") {
      return c.json({ error: data.Error || "Not found" }, 404);
    }

    // Extract Rotten Tomatoes ratings
    const ratings: Record<string, string> = {};
    if (data.Ratings) {
      for (const rating of data.Ratings) {
        if (rating.Source === "Rotten Tomatoes") {
          ratings.rottenTomatoes = rating.Value;
        } else if (rating.Source === "Internet Movie Database") {
          ratings.imdb = rating.Value;
        } else if (rating.Source === "Metacritic") {
          ratings.metacritic = rating.Value;
        }
      }
    }

    return c.json({
      title: data.Title,
      year: data.Year,
      imdbID: data.imdbID,
      ratings,
      rottenTomatoesUrl: data.imdbID
        ? `https://www.rottentomatoes.com/search?search=${encodeURIComponent(data.Title)}`
        : null
    });
  } catch (error) {
    console.error("OMDB error:", error);
    return c.json({ error: "Failed to get OMDB data" }, 500);
  }
});

// Serve static files from client/dist in production
const isDev = process.env.NODE_ENV !== "production";
if (!isDev) {
  app.get("*", serveStatic({ root: "./client/dist" }));
  app.get("*", serveStatic({ path: "./client/dist/index.html" }));
}

const port = process.env.PORT || 3000;
console.log(`Server running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch
};
