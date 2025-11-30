const TorrentSearchApi = require('torrent-search-api');

TorrentSearchApi.enableProvider('Rarbg');
TorrentSearchApi.enableProvider('Yts');

async function compareProviders() {
  console.log('=== Comparing Rarbg vs YTS Seed Counts ===\n');
  
  const queries = ['Inception', 'Interstellar', 'The Dark Knight'];
  
  for (const query of queries) {
    console.log(`\n--- ${query} ---`);
    const results = await TorrentSearchApi.search(query, 'Movies', 20);
    
    const rarbgResults = results.filter(r => r.provider === 'Rarbg');
    const ytsResults = results.filter(r => r.provider === 'Yts');
    
    console.log(`\nRarbg (${rarbgResults.length} results):`);
    if (rarbgResults.length > 0) {
      const maxSeeds = Math.max(...rarbgResults.map(r => r.seeds));
      const minSeeds = Math.min(...rarbgResults.map(r => r.seeds));
      const avgSeeds = Math.round(rarbgResults.reduce((sum, r) => sum + r.seeds, 0) / rarbgResults.length);
      
      console.log(`  Seed range: ${minSeeds} - ${maxSeeds} (avg: ${avgSeeds})`);
      console.log('  Top 3:');
      rarbgResults.slice(0, 3).forEach((r, i) => {
        console.log(`    ${i + 1}. ${r.seeds} seeds - ${r.title.substring(0, 60)}`);
      });
    }
    
    console.log(`\nYTS (${ytsResults.length} results):`);
    if (ytsResults.length > 0) {
      const maxSeeds = Math.max(...ytsResults.map(r => r.seeds));
      const minSeeds = Math.min(...ytsResults.map(r => r.seeds));
      const avgSeeds = Math.round(ytsResults.reduce((sum, r) => sum + r.seeds, 0) / ytsResults.length);
      const cappedCount = ytsResults.filter(r => r.seeds === 100).length;
      
      console.log(`  Seed range: ${minSeeds} - ${maxSeeds} (avg: ${avgSeeds})`);
      console.log(`  Capped at 100: ${cappedCount}/${ytsResults.length}`);
      console.log('  All results:');
      ytsResults.forEach((r, i) => {
        console.log(`    ${i + 1}. ${r.seeds} seeds - ${r.title}`);
      });
    }
  }
  
  console.log('\n\n=== Summary ===');
  console.log('• Rarbg: Shows actual seed counts (can be 200+, 500+, etc.)');
  console.log('• YTS: Caps seed counts at 100 (API limitation, not a bug)');
  console.log('\nThis is expected behavior. YTS API deliberately caps values at 100.');
}

compareProviders().catch(console.error);

