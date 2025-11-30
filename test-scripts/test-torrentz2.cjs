const util = require('util');
const request = util.promisify(require('request'));

async function testTorrentz2() {
  const domains = ['torrentz2.nz', 'torrentz2.eu', 'torrentz.eu', 'torrentz2.me'];
  
  for (const domain of domains) {
    console.log(`\n=== Testing ${domain} ===`);
    const url = `https://${domain}/search?q=inception`;
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
      if (response.body.includes('results') || response.body.includes('torrent')) {
        console.log('  Page contains torrent-related content');
        
        // Extract a small sample
        const bodySnippet = response.body.substring(0, 500);
        if (bodySnippet.includes('<dl>') || bodySnippet.includes('results')) {
          console.log('  Found expected HTML structure');
        }
      } else {
        console.log('  ✗ Page does not seem to contain search results');
      }
    } catch (error) {
      console.log(`✗ ${domain} failed: ${error.message}`);
    }
  }
}

testTorrentz2();

