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

// Enable CORS for development
app.use("/*", cors());

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use("/*", serveStatic({ root: "./client/dist" }));
}

// Search torrents
app.get("/api/search", async (c) => {
  const { name, limit, providers } = c.req.query();

  if (!name) {
    return c.json({ error: "Name parameter is required" }, 400);
  }

  const resultLimit = limit ? parseInt(limit) : 50;
  const category = "all";

  try {
    let results;
    if (providers) {
      // Use specific providers if specified
      const providerList = providers.split(",").map((p: string) => p.trim());
      results = await search(name, category, resultLimit, providerList);
    } else {
      // Use all providers by default
      results = await search(name, category, resultLimit);
    }

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
