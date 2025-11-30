const TorrentSearchApi = require("torrent-search-api");

TorrentSearchApi.enableProvider("Rarbg");
TorrentSearchApi.enableProvider("Yts");
TorrentSearchApi.enableProvider("Eztv");

async function testPeersField() {
  console.log("=== Testing Peers Field Across Providers ===\n");

  const results = await TorrentSearchApi.search("The Office", "All", 20);

  // Group by provider
  const rarbg = results.find((r) => r.provider === "Rarbg");
  const yts = results.find((r) => r.provider === "Yts");
  const eztv = results.find((r) => r.provider === "Eztv");

  if (rarbg) {
    console.log("Rarbg result:");
    console.log(`  Title: ${rarbg.title}`);
    console.log(`  Peers: ${rarbg.peers} (type: ${typeof rarbg.peers})`);
    console.log(`  Expected: number`);
    console.log(`  ✓ ${typeof rarbg.peers === "number" ? "PASS" : "FAIL"}`);
  }

  if (yts) {
    console.log("\nYTS result:");
    console.log(`  Title: ${yts.title}`);
    console.log(`  Peers: ${yts.peers} (type: ${typeof yts.peers})`);
    console.log(`  Expected: number`);
    console.log(`  ✓ ${typeof yts.peers === "number" ? "PASS" : "FAIL"}`);
  }

  if (eztv) {
    console.log("\nEZTV result:");
    console.log(`  Title: ${eztv.title}`);
    console.log(`  Peers: ${eztv.peers} (type: ${typeof eztv.peers})`);
    console.log(`  Expected: null (not undefined)`);
    console.log(`  ✓ ${eztv.peers === null ? "PASS" : "FAIL"}`);

    if (eztv.peers === undefined) {
      console.log("  ✗ ERROR: peers is undefined, should be null");
    }
  }

  console.log("\n=== Summary ===");
  console.log("• Rarbg: peers is a number (actual count)");
  console.log("• YTS: peers is a number (may be capped at 100)");
  console.log("• EZTV: peers is explicitly null (not provided by source)");
}

testPeersField().catch(console.error);
