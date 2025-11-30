const TorrentSearchApi = require("torrent-search-api");

TorrentSearchApi.enableProvider("Yts");

async function testYts() {
  console.log("Testing YTS provider...\n");

  console.log('=== Test 1: Search for "Inception" ===');
  const results = await TorrentSearchApi.search("Inception", "All", 5);
  console.log(`Found ${results.length} results`);

  if (results.length > 0) {
    console.log("\nFirst 3 results:");
    results.slice(0, 3).forEach((r, i) => {
      console.log(`\n${i + 1}. ${r.title}`);
      console.log(`   Seeds: ${r.seeds}, Peers: ${r.peers}`);
      console.log(`   Size: ${r.size}`);
      console.log(`   Time: ${r.time}`);
      console.log(`   Provider: ${r.provider}`);
    });

    // Verify all fields
    console.log("\n\n=== Field Validation ===");
    const testResult = results[0];
    const requiredFields = ["title", "time", "size", "seeds", "peers", "desc", "provider"];
    const missingFields = requiredFields.filter(
      (field) => !testResult[field] && testResult[field] !== 0
    );

    if (missingFields.length === 0) {
      console.log("✓ All required fields are present!");
    } else {
      console.log("✗ Missing fields:", missingFields.join(", "));
    }
  } else {
    console.log("✗ No results found");
  }
}

testYts().catch(console.error);
