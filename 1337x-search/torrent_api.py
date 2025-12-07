"""
FastAPI server for 1337x.to torrent searching.
Gets Cloudflare cookies once, then uses requests for everything.
Cookies auto-refresh after TTL expires.
"""
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from botasaurus.browser import browser, Driver
from botasaurus.soupify import soupify
import requests
import re
import time
import uvicorn

app = FastAPI(title="1337x Torrent API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cookie cache with TTL
COOKIE_TTL = 60 * 30  # 30 minutes

class CookieCache:
    def __init__(self):
        self.cookies: dict = {}
        self.user_agent: str = ""
        self.fetched_at: float = 0
    
    def is_expired(self) -> bool:
        return time.time() - self.fetched_at > COOKIE_TTL
    
    def needs_refresh(self) -> bool:
        return not self.cookies or self.is_expired()
    
    def update(self, cookies: dict, user_agent: str):
        self.cookies = cookies
        self.user_agent = user_agent
        self.fetched_at = time.time()
        print(f"[1337x] Cookies cached (TTL: {COOKIE_TTL}s)")

cache = CookieCache()


@browser
def _fetch_cookies(driver: Driver, data=None) -> dict:
    """Open browser, bypass Cloudflare, return cookies"""
    print("[1337x] Opening browser to get Cloudflare cookies...")
    driver.google_get("https://1337x.to/search/test/1/", bypass_cloudflare=True)
    
    cookies = {c["name"]: c["value"] for c in driver.get_cookies()}
    user_agent = driver.run_js("return navigator.userAgent")
    
    return {"cookies": cookies, "user_agent": user_agent}


def ensure_cookies():
    """Ensure we have valid cookies, refresh if needed"""
    if cache.needs_refresh():
        result = _fetch_cookies()
        cache.update(result["cookies"], result["user_agent"])


def fetch(url: str) -> str:
    """Fetch URL using cached cookies"""
    ensure_cookies()
    
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
        ensure_cookies()
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


# Endpoints
@app.get("/")
async def root():
    return {
        "status": "ok",
        "cookies_valid": not cache.needs_refresh(),
        "cookies_age_seconds": int(time.time() - cache.fetched_at) if cache.fetched_at else None
    }


@app.get("/api/search", response_model=SearchResponse)
async def search(query: str = Query(..., min_length=2), limit: int = Query(50)):
    """Search 1337x.to"""
    try:
        url = f"https://1337x.to/search/{query.replace(' ', '+')}/1/"
        html = fetch(url)
        torrents = parse_search(html)
        return SearchResponse(torrents=[Torrent(**t) for t in torrents[:limit]])
    except Exception as e:
        raise HTTPException(500, str(e))


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
        raise HTTPException(500, str(e))


if __name__ == "__main__":
    print(f"Starting 1337x API on http://localhost:8000")
    print(f"Cookie TTL: {COOKIE_TTL}s ({COOKIE_TTL//60} minutes)")
    uvicorn.run(app, host="0.0.0.0", port=8000)
