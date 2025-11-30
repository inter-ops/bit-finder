// eslint-disable-next-line @typescript-eslint/no-var-requires
const TorrentSearchApi = require("torrent-search-api");

// Enable Rarbg
TorrentSearchApi.enableProvider("Rarbg");

async function testRarbg() {
  console.log("Testing Rarbg provider with different categories...\n");

  // Test 1: All category
  console.log("=== Test 1: All category (Harry Potter) ===");
  const allResults = await TorrentSearchApi.search("Harry Potter", "All", 3);
  console.log(`Found ${allResults.length} results`);
  if (allResults.length > 0) {
    console.log("\nFirst result details:");
    console.log(JSON.stringify(allResults[0], null, 2));
  }

  // Test 2: Movies category
  console.log("\n\n=== Test 2: Movies category (Inception) ===");
  const movieResults = await TorrentSearchApi.search("Inception", "Movies", 3);
  console.log(`Found ${movieResults.length} results`);
  if (movieResults.length > 0) {
    console.log("\nFirst result details:");
    console.log(JSON.stringify(movieResults[0], null, 2));
  }

  // Test 3: TV category
  console.log("\n\n=== Test 3: TV category (Breaking Bad) ===");
  const tvResults = await TorrentSearchApi.search("Breaking Bad", "TV", 3);
  console.log(`Found ${tvResults.length} results`);
  if (tvResults.length > 0) {
    console.log("\nFirst result details:");
    console.log(JSON.stringify(tvResults[0], null, 2));
  }

  // Test 4: Music category
  console.log("\n\n=== Test 4: Music category (Beatles) ===");
  const musicResults = await TorrentSearchApi.search("Beatles", "Music", 3);
  console.log(`Found ${musicResults.length} results`);
  if (musicResults.length > 0) {
    console.log("\nFirst result details:");
    console.log(JSON.stringify(musicResults[0], null, 2));
  }

  // Test 5: Games category
  console.log("\n\n=== Test 5: Games category (GTA) ===");
  const gameResults = await TorrentSearchApi.search("GTA", "Games", 3);
  console.log(`Found ${gameResults.length} results`);
  if (gameResults.length > 0) {
    console.log("\nFirst result details:");
    console.log(JSON.stringify(gameResults[0], null, 2));
  }

  // Test 6: Get magnet link
  console.log("\n\n=== Test 6: Get magnet link ===");
  if (allResults.length > 0) {
    console.log("Getting magnet link for first result...");
    try {
      const magnet = await TorrentSearchApi.getMagnet(allResults[0]);
      console.log("Magnet link:", magnet);
      console.log(
        'Magnet starts with "magnet:?xt=urn:btih:":',
        magnet && magnet.startsWith("magnet:?xt=urn:btih:")
      );
    } catch (error) {
      console.error("Error getting magnet:", error.message);
    }
  }

  // Verify all fields exist
  console.log("\n\n=== Field Validation ===");
  const testResult = allResults[0];
  const requiredFields = ["title", "time", "size", "seeds", "peers", "desc", "provider"];
  const missingFields = requiredFields.filter(
    (field) => !testResult[field] && testResult[field] !== 0
  );

  if (missingFields.length === 0) {
    console.log("✓ All required fields are present!");
    console.log("  - title:", testResult.title ? "✓" : "✗");
    console.log("  - time:", testResult.time ? "✓" : "✗");
    console.log("  - size:", testResult.size ? "✓" : "✗");
    console.log("  - seeds:", testResult.seeds !== undefined ? "✓" : "✗");
    console.log("  - peers:", testResult.peers !== undefined ? "✓" : "✗");
    console.log("  - desc:", testResult.desc ? "✓" : "✗");
    console.log("  - provider:", testResult.provider ? "✓" : "✗");
  } else {
    console.log("✗ Missing fields:", missingFields.join(", "));
  }
}

testRarbg().catch(console.error);
