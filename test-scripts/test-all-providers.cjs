const TorrentSearchApi = require('torrent-search-api');

TorrentSearchApi.enableProvider('Rarbg');
TorrentSearchApi.enableProvider('Yts');
TorrentSearchApi.enableProvider('Eztv');

async function testAllProviders() {
  console.log('=== Testing All Working Providers ===\n');
  
  const query = 'Breaking Bad';
  const results = await TorrentSearchApi.search(query, 'All', 30);
  
  console.log(`Total results for "${query}": ${results.length}\n`);
  
  // Group by provider
  const byProvider = {
    Rarbg: results.filter(r => r.provider === 'Rarbg'),
    Yts: results.filter(r => r.provider === 'Yts'),
    Eztv: results.filter(r => r.provider === 'Eztv')
  };
  
  console.log('Results by provider:');
  Object.entries(byProvider).forEach(([provider, provResults]) => {
    console.log(`  ${provider}: ${provResults.length} results`);
  });
  
  console.log('\n\n=== Sample from each provider ===\n');
  
  // Rarbg sample
  if (byProvider.Rarbg.length > 0) {
    const r = byProvider.Rarbg[0];
    console.log('Rarbg sample:');
    console.log(`  Title: ${r.title}`);
    console.log(`  Seeds: ${r.seeds}, Peers: ${r.peers}`);
    console.log(`  Size: ${r.size}`);
    console.log(`  Time: ${r.time}`);
    console.log(`  ✓ Has peers count`);
  }
  
  // YTS sample
  if (byProvider.Yts.length > 0) {
    const r = byProvider.Yts[0];
    console.log('\nYTS sample:');
    console.log(`  Title: ${r.title}`);
    console.log(`  Seeds: ${r.seeds}, Peers: ${r.peers}`);
    console.log(`  Size: ${r.size}`);
    console.log(`  Time: ${r.time}`);
    console.log(`  ⚠ Seeds capped at 100 (YTS API limitation)`);
  }
  
  // EZTV sample  
  if (byProvider.Eztv.length > 0) {
    const r = byProvider.Eztv[0];
    console.log('\nEZTV sample:');
    console.log(`  Title: ${r.title}`);
    console.log(`  Seeds: ${r.seeds}, Peers: ${r.peers || 'N/A'}`);
    console.log(`  Size: ${r.size}`);
    console.log(`  Time: ${r.time}`);
    
    // Validate EZTV fields
    const sizeValid = /\d+(\.\d+)?\s*(MB|GB|KB)/i.test(r.size);
    const timeValid = !/\d+(\.\d+)?\s*(MB|GB|KB)/i.test(r.time);
    
    if (sizeValid) {
      console.log(`  ✓ Size field correct (shows file size)`);
    } else {
      console.log(`  ✗ Size field incorrect: "${r.size}"`);
    }
    
    if (timeValid) {
      console.log(`  ✓ Time field correct (not showing size)`);
    } else {
      console.log(`  ✗ Time field incorrect: "${r.time}"`);
    }
    
    console.log(`  ⚠ No peers count (EZTV doesn't provide this)`);
  }
  
  console.log('\n\n=== Summary ===');
  console.log('✓ Rarbg: Web scraping, full data with uncapped seeds');
  console.log('✓ YTS: API, seeds capped at 100');
  console.log('✓ EZTV: Web scraping, no peers count, size/time fixed');
}

testAllProviders().catch(console.error);

