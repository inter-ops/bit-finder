"""
Test: Extract Cloudflare cookies after browser bypass, then use them with requests
"""
from botasaurus.browser import browser, Driver
import requests
import json
import time

@browser
def get_cf_cookies(driver: Driver, data):
    """Bypass Cloudflare and extract cookies"""
    print("Opening browser and bypassing Cloudflare...")
    driver.google_get("https://1337x.to/search/test/1/", bypass_cloudflare=True)
    
    cookies = driver.get_cookies()
    user_agent = driver.run_js("return navigator.userAgent")
    
    print(f"Got cf_clearance cookie")
    print(f"User Agent: {user_agent[:50]}...")
    
    return {
        "cookies": cookies,
        "user_agent": user_agent
    }


def fetch_with_cookies(cookies_data: dict, url: str):
    """Fetch a page using the extracted cookies"""
    cookies = {c["name"]: c["value"] for c in cookies_data["cookies"]}
    headers = {
        "User-Agent": cookies_data["user_agent"],
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
    }
    
    response = requests.get(url, cookies=cookies, headers=headers, timeout=30)
    return response


if __name__ == "__main__":
    # Get fresh cookies
    print("="*60)
    print("Step 1: Getting fresh CF cookies via browser")
    print("="*60)
    cookies_data = get_cf_cookies()
    
    # Save cookies
    with open("output/cf_cookies.json", "w") as f:
        json.dump(cookies_data, f, indent=2)
    
    # Test requests
    print("\n" + "="*60)
    print("Step 2: Testing requests with extracted cookies")
    print("="*60)
    
    # Test search page
    print("\nSearch page:")
    url = "https://1337x.to/search/south+park/1/"
    response = fetch_with_cookies(cookies_data, url)
    print(f"  Status: {response.status_code}")
    print(f"  Length: {len(response.text)}")
    
    # Check what we got
    if "table-list" in response.text:
        print("  ✅ Got actual search results!")
    elif "cloudflare" in response.text.lower():
        print("  ❌ Got Cloudflare page")
    else:
        print(f"  ❓ Unknown - Title: {response.text[response.text.find('<title>'):response.text.find('</title>')+8]}")
    
    # Save for inspection
    with open("output/search_response.html", "w") as f:
        f.write(response.text)
    print("  Saved to output/search_response.html")
    
    # Test detail page
    print("\nDetail page:")
    url = "https://1337x.to/torrent/6468223/South-Park-S27E03-1080p-x265-ELiTE/"
    response = fetch_with_cookies(cookies_data, url)
    print(f"  Status: {response.status_code}")
    print(f"  Has magnet: {'magnet:' in response.text}")
    if "magnet:" in response.text:
        print("  ✅ Got actual detail page!")
