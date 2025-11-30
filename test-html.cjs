const TorrentProvider = require("./node_modules/torrent-search-api/lib/TorrentProvider");

// Create a simple provider instance to test HTML scraping
const provider = new TorrentProvider({
  name: "Test",
  baseUrl: "https://rargb.to",
  searchUrl: "/search/?search={query}",
  categories: { All: "" },
  defaultCategory: "All",
  resultsPerPageCount: 25,
  itemsSelector: "table.lista2t tr.lista2",
  itemSelectors: {},
  enableCloudFareBypass: false
});

async function fetchHtml() {
  const url = "https://rargb.to/search/?search=harry";
  console.log("Fetching:", url);

  try {
    const html = await provider.request(url);

    // Find just the first result row
    const firstRowMatch = html.match(/<tr class="lista2"[^>]*>[\s\S]*?<\/tr>/);
    if (firstRowMatch) {
      console.log("\nFirst row HTML:");
      console.log(firstRowMatch[0]);

      // Extract all td elements
      const tds = firstRowMatch[0].match(/<td[^>]*>[\s\S]*?<\/td>/g);
      if (tds) {
        console.log("\n\nAll TD elements:");
        tds.forEach((td, i) => {
          console.log(`\nColumn ${i + 1}:`);
          console.log(td.substring(0, 200) + (td.length > 200 ? "..." : ""));
        });
      }
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

fetchHtml();
