const util = require('util');
const request = util.promisify(require('request'));

async function fetchHtml() {
  const url = 'https://eztv.re/search/breaking%20bad';
  console.log('Fetching:', url);
  
  try {
    const response = await request({
      url,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    
    const html = response.body;
    
    console.log('\n=== Looking for table structure ===');
    
    // Find rows with forum_header_border class
    const rowMatches = html.match(/<tr[^>]*class="forum_header_border"[^>]*>[\s\S]*?<\/tr>/g);
    
    if (rowMatches && rowMatches.length > 0) {
      console.log(`\nFound ${rowMatches.length} rows`);
      console.log('\nFirst row HTML:');
      console.log(rowMatches[0]);
      
      // Extract all td elements from first row
      const tdMatches = rowMatches[0].match(/<td[^>]*>[\s\S]*?<\/td>/g);
      if (tdMatches) {
        console.log('\n\n=== All TD elements in first row ===');
        tdMatches.forEach((td, i) => {
          console.log(`\nColumn ${i + 1}:`);
          console.log(td.substring(0, 300));
        });
      }
    } else {
      console.log('No rows with forum_header_border class found');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

fetchHtml();

