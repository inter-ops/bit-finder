"""Simple test - exact same as t.py but with detail URL"""
from botasaurus.browser import browser, Driver

@browser
def scrape_detail_page(driver: Driver, data):
    driver.google_get("https://1337x.to/torrent/6468223/South-Park-S27E03-1080p-x265-ELiTE/", bypass_cloudflare=True)
    
    heading = driver.get_text("h1")
    html = driver.page_html
    
    print(f"Title: {heading}")
    print(f"HTML length: {len(html)}")
    print(f"Has magnet: {'magnet:' in html}")
    
    return {"heading": heading, "has_magnet": "magnet:" in html}

scrape_detail_page()
