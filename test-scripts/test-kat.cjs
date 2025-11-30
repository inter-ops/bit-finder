const util = require('util');
const request = util.promisify(require('request'));

async function testKAT() {
  const domains = [
    'kickasstorrents.cr',
    'katcr.to',
    'kickasstorrents.to',
    'kat.cr',
    'kickass.sx'
  ];
  
  for (const domain of domains) {
    console.log(`\n=== Testing ${domain} ===`);
    const url = `https://${domain}/usearch/inception`;
    console.log(`URL: ${url}`);
    
    try {
      const response = await request({
        url,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        timeout: 15000,
        followRedirect: true
      });
      
      console.log(`✓ ${domain} responded (Status: ${response.statusCode})`);
      
      // Check if we got some results
      if (response.body.includes('torrent') && response.body.includes('seed')) {
        console.log('  Page contains torrent-related content');
        
        // Look for common KAT HTML patterns
        if (response.body.includes('firstr') || response.body.includes('odd') || 
            response.body.includes('data-title') || response.body.includes('torrentname')) {
          console.log('  ✓ Found expected HTML structure');
        }
      } else if (response.statusCode === 200) {
        console.log('  ✗ Page loaded but does not seem to contain search results');
      }
    } catch (error) {
      console.log(`✗ ${domain} failed: ${error.message}`);
    }
  }
}

testKAT();

