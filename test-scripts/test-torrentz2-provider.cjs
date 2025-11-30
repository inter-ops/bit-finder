const TorrentSearchApi = require('torrent-search-api');

TorrentSearchApi.enableProvider('Torrentz2');

async function testTorrentz2() {
  console.log('Testing Torrentz2 provider...\n');
  
  try {
    console.log('=== Test 1: Search for "inception" ===');
    const results = await TorrentSearchApi.search('inception', 'All', 5);
    console.log(`Found ${results.length} results`);
    
    if (results.length > 0) {
      console.log('\nFirst 3 results:');
      results.slice(0, 3).forEach((r, i) => {
        console.log(`\n${i + 1}. ${r.title}`);
        console.log(`   Seeds: ${r.seeds}, Peers: ${r.peers}`);
        console.log(`   Size: ${r.size}`);
        console.log(`   Time: ${r.time}`);
        console.log(`   Hash: ${r.hash}`);
        console.log(`   Magnet: ${r.magnet ? r.magnet.substring(0, 50) + '...' : 'N/A'}`);
      });
      
      // Verify all fields
      console.log('\n\n=== Field Validation ===');
      const testResult = results[0];
      console.log('Available fields:', Object.keys(testResult));
      
      const requiredFields = ['title', 'seeds', 'peers', 'provider'];
      const missingFields = requiredFields.filter(field => !testResult[field] && testResult[field] !== 0);
      
      if (missingFields.length === 0) {
        console.log('✓ All required fields are present!');
      } else {
        console.log('✗ Missing fields:', missingFields.join(', '));
      }
    } else {
      console.log('✗ No results found - parsing may be broken');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testTorrentz2();

