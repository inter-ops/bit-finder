const TorrentSearchApi = require('torrent-search-api');

TorrentSearchApi.enableProvider('Eztv');

async function testEztv() {
  console.log('Testing EZTV provider...\n');
  
  try {
    console.log('=== Test 1: Search for "Breaking Bad" ===');
    const results = await TorrentSearchApi.search('Breaking Bad', 'All', 5);
    console.log(`Found ${results.length} results`);
    
    if (results.length > 0) {
      console.log('\nFirst 5 results:');
      results.forEach((r, i) => {
        console.log(`\n${i + 1}. ${r.title}`);
        console.log(`   Seeds: ${r.seeds}, Peers: ${r.peers}`);
        console.log(`   Size: ${r.size}`);
        console.log(`   Time: ${r.time}`);
        console.log(`   Provider: ${r.provider}`);
      });
      
      // Check if size looks like a timestamp
      console.log('\n\n=== Field Analysis ===');
      const testResult = results[0];
      
      console.log(`Size field: "${testResult.size}"`);
      console.log(`Time field: "${testResult.time}"`);
      
      // Check if size looks like a date/time
      const sizeIsTimestamp = /\d{1,2}:\d{2}|\d{1,2}\/\d{1,2}|\d{4}-\d{2}-\d{2}|ago|hour|min|day/.test(testResult.size || '');
      const timeIsSize = /MB|GB|KB|bytes/i.test(testResult.time || '');
      
      if (sizeIsTimestamp) {
        console.log('✗ ERROR: Size field contains timestamp-like data!');
      } else {
        console.log('✓ Size field looks correct');
      }
      
      if (timeIsSize) {
        console.log('✗ ERROR: Time field contains size-like data!');
      } else {
        console.log('✓ Time field looks correct');
      }
    } else {
      console.log('✗ No results found');
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

testEztv();

