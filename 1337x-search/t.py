from botasaurus.browser import browser, Driver
from botasaurus.request import request, Request
from botasaurus.soupify import soupify


# Cloudflare js challenge
@browser
def scrape_heading_task_js_challenge(driver: Driver, data):
    driver.google_get("https://1337x.to/search/south+park+s27e03/1/", bypass_cloudflare=True)
    # driver.prompt()

        # Retrieve the heading element's text
    heading = driver.get_text("h1")

    # Save the data as a JSON file in output/scrape_heading_task.json
    return {
        "heading": heading
    }

# Initiate the web scraping task
scrape_heading_task_js_challenge()