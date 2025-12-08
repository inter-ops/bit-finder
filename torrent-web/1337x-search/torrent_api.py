"""
FastAPI server for 1337x.to torrent searching.
Gets Cloudflare cookies once, caches to file, reuses for requests.
Includes warmup endpoint for preloading cookies on app start.
"""
from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from botasaurus.browser import browser, Driver
from botasaurus.soupify import soupify
import requests
import re
import time
import json
import os
import threading
import traceback
import uvicorn
from datetime import datetime

app = FastAPI(title="1337x Torrent API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constants
COOKIE_TTL = 60 * 30  # 30 minutes
COOKIE_CACHE_FILE = os.path.join(os.path.dirname(__file__), "cookie_cache.json")
ERROR_LOG_DIR = os.path.join(os.path.dirname(__file__), "error-logs")

# Ensure error log directory exists
os.makedirs(ERROR_LOG_DIR, exist_ok=True)


def log_error(message: str, exception: Optional[Exception] = None):
    """Log errors to file"""
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    log_file = os.path.join(ERROR_LOG_DIR, f"error_{timestamp}.log")
    with open(log_file, "w") as f:
        f.write(f"Timestamp: {timestamp}\n")
        f.write(f"Message: {message}\n")
        if exception:
            f.write(f"Exception: {str(exception)}\n")
            f.write(f"Traceback:\n{traceback.format_exc()}\n")
    print(f"[1337x] Error logged to {log_file}")


class CookieCache:
    def __init__(self):
        self.cookies: dict = {}
        self.user_agent: str = ""
        self.fetched_at: float = 0
        self._lock = threading.Lock()
        self._is_fetching = False
        self._load_from_file()
    
    def _load_from_file(self):
        """Load cached cookies from file if available and not expired"""
        try:
            if os.path.exists(COOKIE_CACHE_FILE):
                with open(COOKIE_CACHE_FILE, "r") as f:
                    data = json.load(f)
                    # Check if cached data is still valid
                    if time.time() - data.get("fetched_at", 0) < COOKIE_TTL:
                        self.cookies = data.get("cookies", {})
                        self.user_agent = data.get("user_agent", "")
                        self.fetched_at = data.get("fetched_at", 0)
                        print(f"[1337x] Loaded cookies from cache file (age: {int(time.time() - self.fetched_at)}s)")
                        return True
                    else:
                        print("[1337x] Cached cookies expired")
        except Exception as e:
            print(f"[1337x] Failed to load cookie cache: {e}")
        return False
    
    def _save_to_file(self):
        """Save cookies to file for persistence"""
        try:
            with open(COOKIE_CACHE_FILE, "w") as f:
                json.dump({
                    "cookies": self.cookies,
                    "user_agent": self.user_agent,
                    "fetched_at": self.fetched_at
                }, f)
            print(f"[1337x] Cookies saved to cache file")
        except Exception as e:
            print(f"[1337x] Failed to save cookie cache: {e}")
    
    def is_expired(self) -> bool:
        return time.time() - self.fetched_at > COOKIE_TTL
    
    def needs_refresh(self) -> bool:
        return not self.cookies or self.is_expired()
    
    def update(self, cookies: dict, user_agent: str):
        self.cookies = cookies
        self.user_agent = user_agent
        self.fetched_at = time.time()
        self._save_to_file()
        print(f"[1337x] Cookies cached (TTL: {COOKIE_TTL}s)")
    
    def get_status(self) -> dict:
        return {
            "valid": not self.needs_refresh(),
            "age_seconds": int(time.time() - self.fetched_at) if self.fetched_at else None,
            "ttl_remaining": max(0, int(COOKIE_TTL - (time.time() - self.fetched_at))) if self.fetched_at else 0,
            "is_fetching": self._is_fetching
        }


cache = CookieCache()


@browser(
    block_images=True,
    output=None,
    close_on_crash=True,
)
def _fetch_cookies_browser(driver: Driver, data=None) -> dict:
    """Open browser, bypass Cloudflare, return cookies"""
    print("[1337x] Opening browser to get Cloudflare cookies...")
    try:
        driver.google_get("https://1337x.to/search/test/1/", bypass_cloudflare=True)
        
        cookies = {c["name"]: c["value"] for c in driver.get_cookies()}
        user_agent = driver.run_js("return navigator.userAgent")
        
        print(f"[1337x] Got cookies: {list(cookies.keys())}")
        return {"cookies": cookies, "user_agent": user_agent}
    except Exception as e:
        print(f"[1337x] Browser error: {e}")
        raise


def fetch_cookies_safe() -> bool:
    """Safely fetch cookies with lock to prevent concurrent fetches"""
    with cache._lock:
        # Double-check after acquiring lock
        if not cache.needs_refresh():
            print("[1337x] Cookies already valid (checked after lock)")
            return True
        
        # Check if already fetching
        if cache._is_fetching:
            print("[1337x] Cookie fetch already in progress, waiting...")
            return False
        
        cache._is_fetching = True
    
    try:
        result = _fetch_cookies_browser()
        if result and isinstance(result, dict) and "cookies" in result and "user_agent" in result:
            cache.update(result["cookies"], result["user_agent"])
            return True
        else:
            raise Exception("Invalid result from browser function")
    except Exception as e:
        log_error("Failed to fetch cookies", e)
        print(f"[1337x] Cookie fetch failed: {e}")
        cache.cookies = {}
        cache.user_agent = ""
        cache.fetched_at = 0
        return False
    finally:
        with cache._lock:
            cache._is_fetching = False


def ensure_cookies() -> bool:
    """Ensure we have valid cookies, refresh if needed"""
    if not cache.needs_refresh():
        return True
    return fetch_cookies_safe()


def fetch(url: str) -> str:
    """Fetch URL using cached cookies"""
    if not ensure_cookies():
        raise Exception("Failed to get Cloudflare cookies")
    
    response = requests.get(
        url,
        cookies=cache.cookies,
        headers={"User-Agent": cache.user_agent},
        timeout=30
    )
    
    # If blocked, force refresh and retry once
    if response.status_code == 403 or "challenge" in response.text.lower():
        print("[1337x] Blocked - forcing cookie refresh")
        cache.fetched_at = 0  # Force refresh
        if not ensure_cookies():
            raise Exception("Failed to refresh cookies after block")
        
        response = requests.get(
            url,
            cookies=cache.cookies,
            headers={"User-Agent": cache.user_agent},
            timeout=30
        )
    
    return response.text


def parse_search(html: str) -> list[dict]:
    """Parse search results HTML"""
    soup = soupify(html)
    table = soup.select_one("table.table-list")
    if not table:
        return []
    
    torrents = []
    for row in table.select("tbody tr"):
        try:
            name_col = row.select_one("td.name")
            if not name_col:
                continue
            
            links = name_col.select("a")
            link = links[1] if len(links) > 1 else links[0] if links else None
            if not link:
                continue
            
            seeds = row.select_one("td.seeds")
            leeches = row.select_one("td.leeches")
            size_col = row.select_one("td.size") or (row.select("td")[4] if len(row.select("td")) > 4 else None)
            time_col = row.select_one("td.coll-date") or (row.select("td")[3] if len(row.select("td")) > 3 else None)
            
            size_text = size_col.get_text(strip=True) if size_col else "Unknown"
            size_match = re.match(r'([\d.]+\s*[KMGT]?i?B)', size_text, re.I)
            
            torrents.append({
                "title": link.get_text(strip=True),
                "seeds": int(seeds.get_text(strip=True)) if seeds else 0,
                "peers": int(leeches.get_text(strip=True)) if leeches else 0,
                "size": size_match.group(1) if size_match else size_text,
                "time": time_col.get_text(strip=True) if time_col else "",
                "desc": "https://1337x.to" + link.get("href", ""),
                "provider": "1337x"
            })
        except:
            continue
    
    return torrents


def parse_magnet(html: str) -> tuple[Optional[str], Optional[str]]:
    """Parse magnet link from detail page"""
    soup = soupify(html)
    magnet = soup.select_one('a[href^="magnet:"]')
    title = soup.select_one("h1")
    return (
        magnet.get("href") if magnet else None,
        title.get_text(strip=True) if title else None
    )


# Models
class Torrent(BaseModel):
    title: str
    seeds: int
    peers: int
    size: str
    time: str
    desc: str
    provider: str = "1337x"

class SearchResponse(BaseModel):
    torrents: list[Torrent]
    error: Optional[str] = None

class MagnetResponse(BaseModel):
    magnet: str
    title: Optional[str] = None

class WarmupResponse(BaseModel):
    status: str
    cookies_valid: bool
    message: str


# Endpoints
@app.get("/")
async def root():
    status = cache.get_status()
    return {
        "status": "ok",
        "cookies": status
    }


@app.post("/api/warmup", response_model=WarmupResponse)
async def warmup(background_tasks: BackgroundTasks, force: bool = False):
    """
    Warmup endpoint - preload Cloudflare cookies.
    Call this on app startup to ensure cookies are ready.
    """
    status = cache.get_status()
    
    # If already fetching, just return status
    if status["is_fetching"]:
        return WarmupResponse(
            status="in_progress",
            cookies_valid=status["valid"],
            message="Cookie fetch already in progress"
        )
    
    # If cookies are valid and not forcing, return early
    if status["valid"] and not force:
        return WarmupResponse(
            status="ready",
            cookies_valid=True,
            message=f"Cookies already valid (TTL remaining: {status['ttl_remaining']}s)"
        )
    
    # Start cookie fetch in background
    def fetch_in_background():
        fetch_cookies_safe()
    
    background_tasks.add_task(fetch_in_background)
    
    return WarmupResponse(
        status="warming_up",
        cookies_valid=False,
        message="Cookie fetch started in background"
    )


@app.get("/api/status")
async def status():
    """Get detailed cookie status"""
    return cache.get_status()


@app.get("/api/search", response_model=SearchResponse)
async def search(query: str = Query(..., min_length=2), limit: int = Query(50)):
    """Search 1337x.to"""
    try:
        # Ensure cookies are available before attempting search
        if not ensure_cookies():
            print(f"[1337x] Search failed: Could not get Cloudflare cookies")
            return SearchResponse(torrents=[], error="Failed to bypass Cloudflare. Please try again later.")
        
        url = f"https://1337x.to/search/{query.replace(' ', '+')}/1/"
        html = fetch(url)
        torrents = parse_search(html)
        return SearchResponse(torrents=[Torrent(**t) for t in torrents[:limit]])
    except Exception as e:
        log_error(f"Search failed for query: {query}", e)
        error_msg = str(e)
        # Return empty results instead of 500 error - 1337x is optional
        return SearchResponse(torrents=[], error=f"Search failed: {error_msg}")


@app.get("/api/magnet", response_model=MagnetResponse)
async def magnet(url: str = Query(...)):
    """Get magnet from detail page"""
    if not url.startswith("https://1337x.to/"):
        raise HTTPException(400, "Invalid URL")
    try:
        html = fetch(url)
        mag, title = parse_magnet(html)
        if not mag:
            raise HTTPException(404, "Magnet not found")
        return MagnetResponse(magnet=mag, title=title)
    except HTTPException:
        raise
    except Exception as e:
        log_error(f"Magnet fetch failed for URL: {url}", e)
        raise HTTPException(500, str(e))


if __name__ == "__main__":
    print(f"Starting 1337x API on http://localhost:8000")
    print(f"Cookie TTL: {COOKIE_TTL}s ({COOKIE_TTL//60} minutes)")
    print(f"Cookie cache file: {COOKIE_CACHE_FILE}")
    print(f"Error logs: {ERROR_LOG_DIR}")
    uvicorn.run(app, host="0.0.0.0", port=8000)
