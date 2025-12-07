import { Hono } from "hono";
import { cors } from "hono/cors";
import { stream } from "hono/streaming";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { search, getMagnet } from "../../src/services/torrent.js";
import { parseTorrent } from "./torrentParser.js";
import * as leet from "./1337xClient.js";
import {
  addTorrent,
  getTorrents,
  getTorrent,
  pauseTorrent,
  resumeTorrent,
  removeTorrent,
  getFileByIndex,
  getVideoFile
} from "./webtorrent.js";

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

// Available providers for standard search (torrent-search-api)
const STANDARD_PROVIDERS = ["ThePirateBay", "TorrentProject", "Eztv", "Rarbg", "Yts"];

// Search torrents (combines results from torrent-search-api and 1337x)
app.get("/api/search", async (c) => {
  const { name, limit, providers } = c.req.query();

  if (!name) {
    return c.json({ error: "Name parameter is required" }, 400);
  }

  const resultLimit = limit ? parseInt(limit) : 50;
  const category = "all";

  // Parse providers filter
  const selectedProviders = providers ? providers.split(",").map((p) => p.trim()) : null;

  // Determine which sources to search
  const search1337x = !selectedProviders || selectedProviders.includes("1337x");
  const searchStandard =
    !selectedProviders || selectedProviders.some((p) => STANDARD_PROVIDERS.includes(p));

  try {
    // Build promises based on selected providers
    const promises: Promise<any>[] = [];

    if (searchStandard) {
      promises.push(
        search(name, category, resultLimit).catch((err) => {
          console.error("Standard search error:", err);
          return [];
        })
      );
    } else {
      promises.push(Promise.resolve([]));
    }

    if (search1337x) {
      promises.push(
        leet.search(name, resultLimit).catch((err) => {
          console.error("1337x search error:", err);
          return [];
        })
      );
    } else {
      promises.push(Promise.resolve([]));
    }

    const [standardResults, leetResults] = await Promise.all(promises);

    // Parse standard results and filter by selected providers if needed
    let parsedStandard = standardResults.map(parseTorrent).filter((t) => {
      if (t.raw?.id === 0 || t.raw?.id === "0") return false;
      if (!t.title || t.title === "Unknown") return false;
      if (t.size === "0 B") return false;
      return true;
    });

    // If specific providers are selected, filter standard results
    if (selectedProviders && selectedProviders.length > 0) {
      parsedStandard = parsedStandard.filter((t) => selectedProviders.includes(t.provider));
    }

    // Parse 1337x results (they're already in a similar format)
    const parsed1337x = leetResults.map((t) =>
      parseTorrent({
        title: t.title,
        seeds: t.seeds,
        peers: t.peers,
        size: t.size,
        time: t.time,
        desc: t.desc,
        provider: "1337x"
      })
    );

    // Combine all results
    const allResults = [...parsedStandard, ...parsed1337x];

    // Sort by seeds (highest first) - ensure numeric comparison
    allResults.sort((a, b) => {
      const seedsA = typeof a.seeds === "number" ? a.seeds : parseInt(String(a.seeds)) || 0;
      const seedsB = typeof b.seeds === "number" ? b.seeds : parseInt(String(b.seeds)) || 0;
      return seedsB - seedsA;
    });

    return c.json({ results: allResults });
  } catch (error) {
    console.error("Search error:", error);
    return c.json({ error: "Failed to search torrents" }, 500);
  }
});

// 1337x API warmup - preload Cloudflare cookies
app.post("/api/1337x/warmup", async (c) => {
  const data = await leet.warmup();
  return c.json(data);
});

// 1337x API status
app.get("/api/1337x/status", async (c) => {
  const data = await leet.getStatus();
  return c.json(data);
});

// Get magnet link
app.post("/api/magnet", async (c) => {
  const torrent = await c.req.json();

  try {
    let magnet: string | null = null;

    // Handle 1337x torrents differently - use the Python API
    if (torrent.provider === "1337x") {
      const torrentUrl = torrent.desc || torrent.link;
      if (!torrentUrl) {
        return c.json({ error: "Missing torrent URL" }, 400);
      }
      magnet = await leet.getMagnet(torrentUrl);
      if (!magnet) {
        return c.json({ error: "Failed to get magnet from 1337x" }, 500);
      }
    } else {
      // Standard providers - use torrent-search-api
      magnet = await getMagnet(torrent);
    }

    return c.json({ magnet });
  } catch (error) {
    console.error("Magnet error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to get magnet link";
    return c.json({ error: errorMessage }, 500);
  }
});

// Download torrent (add to WebTorrent)
app.post("/api/download", async (c) => {
  try {
    const { magnet } = await c.req.json();

    if (!magnet) {
      return c.json({ error: "Magnet parameter is required" }, 400);
    }

    const torrent = await addTorrent(magnet);
    return c.json({ success: true, message: "Torrent added successfully", torrent });
  } catch (error) {
    console.error("Download error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to add torrent";
    return c.json({ error: errorMessage }, 500);
  }
});

// Get all torrents
app.get("/api/torrents", async (c) => {
  try {
    const torrents = getTorrents();
    return c.json({ torrents });
  } catch (error) {
    console.error("Get torrents error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to get torrents";
    return c.json({ error: errorMessage }, 500);
  }
});

// Get single torrent
app.get("/api/torrents/:infoHash", async (c) => {
  try {
    const infoHash = c.req.param("infoHash");
    const torrent = getTorrent(infoHash);
    if (!torrent) {
      return c.json({ error: "Torrent not found" }, 404);
    }
    return c.json({ torrent });
  } catch (error) {
    console.error("Get torrent error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to get torrent";
    return c.json({ error: errorMessage }, 500);
  }
});

// Pause torrent
app.post("/api/torrents/:infoHash/pause", async (c) => {
  try {
    const infoHash = c.req.param("infoHash");
    const success = pauseTorrent(infoHash);
    if (!success) {
      return c.json({ error: "Torrent not found" }, 404);
    }
    return c.json({ success: true, message: "Torrent paused" });
  } catch (error) {
    console.error("Pause torrent error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to pause torrent";
    return c.json({ error: errorMessage }, 500);
  }
});

// Resume torrent
app.post("/api/torrents/:infoHash/resume", async (c) => {
  try {
    const infoHash = c.req.param("infoHash");
    const success = resumeTorrent(infoHash);
    if (!success) {
      return c.json({ error: "Torrent not found" }, 404);
    }
    return c.json({ success: true, message: "Torrent resumed" });
  } catch (error) {
    console.error("Resume torrent error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to resume torrent";
    return c.json({ error: errorMessage }, 500);
  }
});

// Remove torrent (without deleting data)
app.delete("/api/torrents/:infoHash/remove", async (c) => {
  try {
    const infoHash = c.req.param("infoHash");
    const success = await removeTorrent(infoHash, false);
    if (!success) {
      return c.json({ error: "Torrent not found" }, 404);
    }
    return c.json({ success: true, message: "Torrent removed" });
  } catch (error) {
    console.error("Remove torrent error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to remove torrent";
    return c.json({ error: errorMessage }, 500);
  }
});

// Delete torrent (with data)
app.delete("/api/torrents/:infoHash/delete", async (c) => {
  try {
    const infoHash = c.req.param("infoHash");
    const success = await removeTorrent(infoHash, true);
    if (!success) {
      return c.json({ error: "Torrent not found" }, 404);
    }
    return c.json({ success: true, message: "Torrent and data deleted" });
  } catch (error) {
    console.error("Delete torrent error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to delete torrent";
    return c.json({ error: errorMessage }, 500);
  }
});

// Stream video from torrent
app.get("/api/stream/:infoHash", async (c) => {
  const infoHash = c.req.param("infoHash");
  const fileIndexParam = c.req.query("file");

  // Get file - either by index or auto-select video
  let file;
  if (fileIndexParam !== undefined) {
    const fileIndex = parseInt(fileIndexParam);
    file = getFileByIndex(infoHash, fileIndex);
  } else {
    file = getVideoFile(infoHash);
  }

  if (!file) {
    return c.json({ error: "File not found" }, 404);
  }

  const fileSize = file.length;
  const range = c.req.header("range");

  // Determine content type
  const ext = file.name.toLowerCase().split(".").pop();
  const mimeTypes: Record<string, string> = {
    mp4: "video/mp4",
    mkv: "video/x-matroska",
    avi: "video/x-msvideo",
    webm: "video/webm",
    mov: "video/quicktime",
    m4v: "video/mp4"
  };
  const contentType = mimeTypes[ext || ""] || "application/octet-stream";

  // Handle Range request for seeking
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    c.status(206);
    c.header("Content-Range", `bytes ${start}-${end}/${fileSize}`);
    c.header("Accept-Ranges", "bytes");
    c.header("Content-Length", String(chunkSize));
    c.header("Content-Type", contentType);

    // Create read stream for the range
    const readStream = file.createReadStream({ start, end });

    return stream(c, async (stream) => {
      for await (const chunk of readStream) {
        await stream.write(chunk);
      }
    });
  }

  // No range - return full file
  c.header("Content-Length", String(fileSize));
  c.header("Content-Type", contentType);
  c.header("Accept-Ranges", "bytes");

  const readStream = file.createReadStream();

  return stream(c, async (stream) => {
    for await (const chunk of readStream) {
      await stream.write(chunk);
    }
  });
});

// Get stream info (for UI to show available files)
app.get("/api/stream/:infoHash/info", async (c) => {
  const infoHash = c.req.param("infoHash");
  const torrent = getTorrent(infoHash);

  if (!torrent) {
    return c.json({ error: "Torrent not found" }, 404);
  }

  // Find video files
  const videoExtensions = [".mp4", ".mkv", ".avi", ".webm", ".mov", ".m4v"];
  const videoFiles = torrent.files.filter((file) =>
    videoExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
  );

  return c.json({
    infoHash,
    name: torrent.name,
    progress: torrent.progress,
    videoFiles: videoFiles.map((f) => ({
      index: f.index,
      name: f.name,
      size: f.size,
      progress: f.progress,
      streamUrl: `/api/stream/${infoHash}?file=${f.index}`
    }))
  });
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
  app.use("/*", serveStatic({ root: "./client/dist" }));
}

const port = Number(process.env.PORT) || 3000;

// Start server with Node.js adapter
serve(
  {
    fetch: app.fetch,
    port
  },
  () => {
    console.log(`Server running on http://localhost:${port}`);
  }
);
