const TorrentSearchApi = require('torrent-search-api');

TorrentSearchApi.enableProvider('Rarbg');
TorrentSearchApi.enableProvider('Yts');

async function testBothProviders() {
  console.log('Testing both Rarbg and YTS providers...\n');
  
  const results = await TorrentSearchApi.search('Inception', 'Movies', 20);
  console.log(`Total results: ${results.length}`);
  
  // Count results by provider
  const providerCounts = {};
  results.forEach(r => {
    providerCounts[r.provider] = (providerCounts[r.provider] || 0) + 1;
  });
  
  console.log('\nResults by provider:');
  Object.entries(providerCounts).forEach(([provider, count]) => {
    console.log(`  ${provider}: ${count} results`);
  });
  
  console.log('\n=== Sample results from each provider ===');
  
  const rarbgResult = results.find(r => r.provider === 'Rarbg');
  if (rarbgResult) {
    console.log('\nRarbg sample:');
    console.log(`  Title: ${rarbgResult.title}`);
    console.log(`  Seeds: ${rarbgResult.seeds}, Peers: ${rarbgResult.peers}`);
    console.log(`  Size: ${rarbgResult.size}`);
    console.log(`  Time: ${rarbgResult.time}`);
  }
  
  const ytsResult = results.find(r => r.provider === 'Yts');
  if (ytsResult) {
    console.log('\nYTS sample:');
    console.log(`  Title: ${ytsResult.title}`);
    console.log(`  Seeds: ${ytsResult.seeds}, Peers: ${ytsResult.peers}`);
    console.log(`  Size: ${ytsResult.size}`);
    console.log(`  Time: ${ytsResult.time}`);
  }
}

testBothProviders().catch(console.error);

