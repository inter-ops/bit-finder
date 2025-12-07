"""Test magnet link scraping from 1337x.to"""
from botasaurus.browser import browser, Driver
from botasaurus.soupify import soupify

@browser
def get_magnet(driver: Driver, url: str):
    """Get magnet link from 1337x torrent detail page"""
    print(f"Navigating to: {url}")
    driver.google_get(url, bypass_cloudflare=True)
    
    # Get the page HTML
    html = driver.page_html
    soup = soupify(html)
    
    # Save HTML for debugging
    with open("output/magnet_page.html", "w") as f:
        f.write(html)
    print("Saved HTML to output/magnet_page.html")
    
    # Find the magnet link
    magnet_link = soup.select_one('a[href^="magnet:"]')
    
    if magnet_link:
        magnet = magnet_link.get("href", "")
        print(f"\nFound magnet: {magnet[:100]}...")
        return {"magnet": magnet}
    else:
        print("No magnet link found!")
        # Try to find any links with 'magnet' in them
        all_links = soup.select("a")
        print(f"Total links on page: {len(all_links)}")
        for link in all_links[:20]:
            href = link.get("href", "")
            if "magnet" in href.lower():
                print(f"  Found related: {href[:80]}...")
        return {"magnet": None}


if __name__ == "__main__":
    url = "https://1337x.to/torrent/6468223/South-Park-S27E03-1080p-x265-ELiTE/"
    result = get_magnet(url)
    print(f"\nResult: {result}")

