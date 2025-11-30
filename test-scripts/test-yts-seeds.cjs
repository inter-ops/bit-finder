const util = require('util');
const request = util.promisify(require('request'));
const TorrentSearchApi = require('torrent-search-api');

async function testYtsRawApi() {
  console.log('=== Testing YTS API directly ===\n');
  
  const queries = ['Inception', 'Interstellar', 'The Matrix'];
  
  for (const query of queries) {
    console.log(`\n--- Testing: "${query}" ---`);
    const url = `https://yts.lt/api/v2/list_movies.json?query_term=${query}&sort=seeds&order=desc&limit=10`;
    
    try {
      const response = await request({
        url,
        headers: { 'User-Agent': 'curl/7.37.0' }
      });
      
      const data = JSON.parse(response.body);
      
      if (data.status === 'ok' && data.data.movies) {
        const movie = data.data.movies[0];
        console.log(`Movie: ${movie.title} (${movie.year})`);
        
        if (movie.torrents) {
          console.log('\nTorrents:');
          movie.torrents.forEach(t => {
            console.log(`  ${t.quality}: ${t.seeds} seeds, ${t.peers} peers (size: ${t.size})`);
            console.log(`    Hash: ${t.hash}`);
          });
        }
      }
    } catch (error) {
      console.error('Error:', error.message);
    }
  }
}

async function testYtsProvider() {
  console.log('\n\n=== Testing YTS Provider ===\n');
  
  TorrentSearchApi.enableProvider('Yts');
  
  const queries = ['Inception', 'Interstellar', 'The Matrix'];
  
  for (const query of queries) {
    console.log(`\n--- Testing: "${query}" ---`);
    const results = await TorrentSearchApi.search(query, 'Movies', 10);
    
    console.log(`Found ${results.length} results`);
    
    if (results.length > 0) {
      results.forEach((r, i) => {
        console.log(`\n${i + 1}. ${r.title}`);
        console.log(`   Seeds: ${r.seeds}, Peers: ${r.peers}`);
        console.log(`   Size: ${r.size}`);
      });
    }
  }
}

async function testMultipleMovies() {
  console.log('\n\n=== Testing Multiple Popular Movies ===\n');
  
  const url = 'https://yts.lt/api/v2/list_movies.json?sort=seeds&order=desc&limit=20';
  
  try {
    const response = await request({
      url,
      headers: { 'User-Agent': 'curl/7.37.0' }
    });
    
    const data = JSON.parse(response.body);
    
    if (data.status === 'ok' && data.data.movies) {
      console.log('Top 20 movies by seeds:\n');
      
      const torrentsWithSeeds = [];
      
      data.data.movies.forEach(movie => {
        if (movie.torrents) {
          movie.torrents.forEach(t => {
            torrentsWithSeeds.push({
              title: `${movie.title} (${movie.year}) - ${t.quality}`,
              seeds: t.seeds,
              peers: t.peers
            });
          });
        }
      });
      
      // Sort by seeds
      torrentsWithSeeds.sort((a, b) => b.seeds - a.seeds);
      
      torrentsWithSeeds.slice(0, 15).forEach((t, i) => {
        console.log(`${i + 1}. ${t.title}`);
        console.log(`   Seeds: ${t.seeds}, Peers: ${t.peers}`);
      });
      
      // Check if all are capped at 100
      const seedCounts = torrentsWithSeeds.map(t => t.seeds);
      const allHundred = seedCounts.every(s => s === 100);
      const anyAboveHundred = seedCounts.some(s => s > 100);
      const anyBelowHundred = seedCounts.some(s => s < 100 && s > 0);
      
      console.log('\n=== Analysis ===');
      console.log(`Total torrents checked: ${seedCounts.length}`);
      console.log(`All exactly 100: ${allHundred}`);
      console.log(`Any above 100: ${anyAboveHundred}`);
      console.log(`Any below 100: ${anyBelowHundred}`);
      console.log(`Unique seed counts: ${[...new Set(seedCounts)].sort((a, b) => b - a).join(', ')}`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function runAllTests() {
  await testYtsRawApi();
  await testYtsProvider();
  await testMultipleMovies();
}

runAllTests();

