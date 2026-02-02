/**
 * Client for the 1337x Python API server
 * Fetches torrents from 1337x.to via the Python server that handles Cloudflare bypass
 */

const API_URL = process.env.LEET_API_URL || "http://localhost:8000";

export interface Torrent1337x {
  title: string;
  seeds: number;
  peers: number;
  size: string;
  time: string;
  desc: string; // URL to detail page (used to get magnet)
  provider: "1337x";
}

interface SearchResponse {
  torrents: Torrent1337x[];
  error?: string;
}

interface MagnetResponse {
  magnet: string;
  title?: string;
}

export interface WarmupStatus {
  status: "idle" | "warming_up" | "ready" | "error";
  message: string;
  attempt?: number;
  maxAttempts?: number;
  cookiesValid?: boolean;
}

interface APIStatusResponse {
  valid: boolean;
  age_seconds?: number;
  ttl_remaining?: number;
  is_fetching?: boolean;
}

/**
 * Check if the 1337x API server is available
 */
export async function isAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/`, {
      signal: AbortSignal.timeout(5_000) // 5s timeout for first request
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Search 1337x.to for torrents
 */
export async function search(query: string, limit = 50): Promise<Torrent1337x[]> {
  try {
    const url = `${API_URL}/api/search?query=${encodeURIComponent(query)}&limit=${limit}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(45_000) // 45s timeout for first request (may need to fetch cookies)
    });

    if (!response.ok) {
      console.error(`[1337x] Search failed: ${response.status}`);
      return [];
    }

    const data: SearchResponse = await response.json();

    if (data.error) {
      console.error(`[1337x] Search error: ${data.error}`);
      return [];
    }

    return data.torrents || [];
  } catch (error) {
    console.error("[1337x] Search error:", error);
    return [];
  }
}

/**
 * Get magnet link for a 1337x torrent
 */
export async function getMagnet(torrentUrl: string): Promise<string | null> {
  try {
    const url = `${API_URL}/api/magnet?url=${encodeURIComponent(torrentUrl)}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      console.error(`[1337x] Magnet failed: ${response.status}`);
      return null;
    }

    const data: MagnetResponse = await response.json();
    return data.magnet || null;
  } catch (error) {
    console.error("[1337x] Magnet error:", error);
    return null;
  }
}

/**
 * Helper to wait for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get 1337x API status
 */
export async function getStatus(): Promise<APIStatusResponse & { message?: string }> {
  try {
    const response = await fetch(`${API_URL}/api/status`, {
      signal: AbortSignal.timeout(5_000) // 5s timeout for first request
    });
    return await response.json();
  } catch (error) {
    console.error("[1337x] Status error:", error);
    return { valid: false, message: "1337x API not available" };
  }
}

/**
 * Trigger warmup on the Python API (non-blocking)
 */
async function triggerWarmup(): Promise<{
  status: string;
  cookies_valid: boolean;
  message: string;
}> {
  const response = await fetch(`${API_URL}/api/warmup`, {
    method: "POST",
    signal: AbortSignal.timeout(10_000) // Short timeout - just triggers the warmup
  });
  return await response.json();
}

/**
 * Wait for cookies to become valid by polling the status endpoint
 */
async function waitForCookies(timeoutMs = 60_000): Promise<boolean> {
  const pollInterval = 2000; // Check every 2 seconds
  const maxAttempts = Math.ceil(timeoutMs / pollInterval);

  for (let i = 0; i < maxAttempts; i++) {
    const status = await getStatus();

    if (status.valid) {
      console.log("[1337x] Cookies are now valid");
      return true;
    }

    if (!status.is_fetching && !status.valid) {
      // Not fetching and not valid means fetch failed
      console.log("[1337x] Cookie fetch completed but cookies are invalid");
      return false;
    }

    // Still fetching, wait and try again
    await sleep(pollInterval);
  }

  console.log("[1337x] Timed out waiting for cookies");
  return false;
}

// Singleton to prevent concurrent warmup requests
let activeWarmup: Promise<WarmupStatus> | null = null;

/**
 * Warmup the 1337x API with retry logic
 * Attempts to get valid Cloudflare cookies up to maxAttempts times
 * Deduplicates concurrent calls — if a warmup is already in progress, returns the same promise
 */
export async function warmupWithRetry(
  maxAttempts = 3,
  onStatusUpdate?: (status: WarmupStatus) => void
): Promise<WarmupStatus> {
  // If a warmup is already in progress, wait for it
  if (activeWarmup) {
    console.log("[1337x] Warmup already in progress, reusing existing");
    return activeWarmup;
  }

  activeWarmup = doWarmupWithRetry(maxAttempts, onStatusUpdate).finally(() => {
    activeWarmup = null;
  });

  return activeWarmup;
}

/**
 * Check if a warmup is currently in progress
 */
export function isWarmupInProgress(): boolean {
  return activeWarmup !== null;
}

async function doWarmupWithRetry(
  maxAttempts: number,
  onStatusUpdate?: (status: WarmupStatus) => void
): Promise<WarmupStatus> {
  // First check if we already have valid cookies
  try {
    const initialStatus = await getStatus();
    if (initialStatus.valid) {
      const result: WarmupStatus = {
        status: "ready",
        message: "1337x is ready",
        cookiesValid: true
      };
      onStatusUpdate?.(result);
      return result;
    }
  } catch {
    // API might not be available, continue with warmup attempts
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      onStatusUpdate?.({
        status: "warming_up",
        message: `Bypassing Cloudflare bot protection for 1337x...`,
        attempt,
        maxAttempts,
        cookiesValid: false
      });

      console.log(`[1337x] Warmup attempt ${attempt}/${maxAttempts}`);

      // Trigger the warmup
      const warmupResult = await triggerWarmup();

      if (warmupResult.cookies_valid) {
        // Cookies are already valid
        const result: WarmupStatus = {
          status: "ready",
          message: "Successfully bypassed Cloudflare bot protection, 1337x enabled",
          cookiesValid: true
        };
        onStatusUpdate?.(result);
        return result;
      }

      // Wait for the background cookie fetch to complete
      const success = await waitForCookies(60_000);

      if (success) {
        const result: WarmupStatus = {
          status: "ready",
          message: "Successfully bypassed Cloudflare bot protection, 1337x enabled",
          cookiesValid: true
        };
        onStatusUpdate?.(result);
        return result;
      }

      // Failed this attempt
      if (attempt < maxAttempts) {
        console.log(`[1337x] Attempt ${attempt} failed, retrying...`);
        onStatusUpdate?.({
          status: "warming_up",
          message: `Cloudflare bypass failed, retrying (${attempt}/${maxAttempts})...`,
          attempt,
          maxAttempts,
          cookiesValid: false
        });
        // Small delay before retry
        await sleep(1000);
      }
    } catch (error) {
      console.error(`[1337x] Warmup attempt ${attempt} error:`, error);

      if (attempt < maxAttempts) {
        onStatusUpdate?.({
          status: "warming_up",
          message: `Connection error, retrying (${attempt}/${maxAttempts})...`,
          attempt,
          maxAttempts,
          cookiesValid: false
        });
        await sleep(1000);
      }
    }
  }

  // All attempts failed
  const result: WarmupStatus = {
    status: "error",
    message: "Failed to bypass Cloudflare after multiple attempts",
    attempt: maxAttempts,
    maxAttempts,
    cookiesValid: false
  };
  onStatusUpdate?.(result);
  return result;
}

/**
 * Legacy warmup function for backward compatibility
 */
export async function warmup(): Promise<{ status: string; message?: string }> {
  const result = await warmupWithRetry(1);
  return { status: result.status, message: result.message };
}
