from botasaurus.browser import browser, Driver
from botasaurus.soupify import soupify
import json
import sys

@browser
def scrape_1337x_search(driver: Driver, query: str):
    """
    Scrape 1337x.to search results for a given query.
    Returns the HTML content for analysis.
    """
    # Format search URL
    search_query = query.replace(" ", "+")
    url = f"https://1337x.to/search/{search_query}/1/"
    
    print(f"Navigating to: {url}")
    driver.google_get(url, bypass_cloudflare=True)
    
    # Get the page HTML
    html = driver.page_html
    
    # Parse with BeautifulSoup
    soup = soupify(html)
    
    # Find the search results table
    table = soup.select_one("table.table-list")
    
    if not table:
        print("No results table found")
        print("Page title:", soup.title.string if soup.title else "No title")
        # Save raw HTML for debugging
        with open("output/1337x_debug.html", "w") as f:
            f.write(html)
        return {"error": "No results table found", "torrents": []}
    
    # Find all torrent rows
    rows = table.select("tbody tr")
    print(f"Found {len(rows)} results")
    
    torrents = []
    
    for row in rows:
        try:
            # Name column - contains link with title
            name_col = row.select_one("td.name")
            if not name_col:
                continue
                
            # Get the second link (first is category icon)
            links = name_col.select("a")
            title_link = links[1] if len(links) > 1 else links[0] if links else None
            
            if not title_link:
                continue
            
            title = title_link.get_text(strip=True)
            desc = "https://1337x.to" + title_link.get("href", "")
            
            # Seeds column
            seeds_col = row.select_one("td.seeds")
            seeds = int(seeds_col.get_text(strip=True)) if seeds_col else 0
            
            # Leechers column
            leechers_col = row.select_one("td.leeches")
            peers = int(leechers_col.get_text(strip=True)) if leechers_col else 0
            
            # Time column
            time_col = row.select("td.coll-date")
            time_col = time_col[0] if time_col else row.select("td")[3] if len(row.select("td")) > 3 else None
            time = time_col.get_text(strip=True) if time_col else ""
            
            # Size column
            size_col = row.select("td.size")
            if size_col:
                size_col = size_col[0]
            else:
                # Fallback - size is usually 4th column
                cols = row.select("td")
                size_col = cols[4] if len(cols) > 4 else None
            
            # Size text might have extra content, clean it
            if size_col:
                size_text = size_col.get_text(strip=True)
                # Remove any trailing numbers that might be seeders count
                import re
                size_match = re.match(r'([\d.]+\s*[KMGT]?i?B)', size_text, re.IGNORECASE)
                size = size_match.group(1) if size_match else size_text
            else:
                size = "Unknown"
            
            torrent = {
                "title": title,
                "seeds": seeds,
                "peers": peers,
                "size": size,
                "time": time,
                "desc": desc,
                "provider": "1337x"
            }
            
            torrents.append(torrent)
            
        except Exception as e:
            print(f"Error parsing row: {e}")
            continue
    
    return {"torrents": torrents}


def search_1337x(query: str):
    """Main function to search 1337x.to"""
    result = scrape_1337x_search(query)
    return result


if __name__ == "__main__":
    # Test with a search query
    query = sys.argv[1] if len(sys.argv) > 1 else "south park s27e03"
    
    print(f"Searching 1337x.to for: {query}")
    result = search_1337x(query)
    
    # Pretty print the results
    print("\n" + "="*60)
    print(f"Found {len(result.get('torrents', []))} torrents:")
    print("="*60 + "\n")
    
    for i, torrent in enumerate(result.get("torrents", [])[:10], 1):
        print(f"{i}. {torrent['title']}")
        print(f"   Seeds: {torrent['seeds']} | Peers: {torrent['peers']} | Size: {torrent['size']}")
        print(f"   Time: {torrent['time']}")
        print(f"   Link: {torrent['desc']}")
        print()
    
    # Save full results to JSON
    with open("output/1337x_results.json", "w") as f:
        json.dump(result, f, indent=2)
    
    print(f"Full results saved to output/1337x_results.json")

