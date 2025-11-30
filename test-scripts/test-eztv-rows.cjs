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
    
    // Find rows with forum_header_border class
    const rowMatches = html.match(/<tr[^>]*class="forum_header_border"[^>]*>[\s\S]*?<\/tr>/g);
    
    if (rowMatches && rowMatches.length > 0) {
      console.log(`Found ${rowMatches.length} rows\n`);
      
      // Check first 10 rows for column count
      for (let i = 0; i < Math.min(10, rowMatches.length); i++) {
        const row = rowMatches[i];
        const tdMatches = row.match(/<td[^>]*>[\s\S]*?<\/td>/g);
        
        console.log(`\nRow ${i + 1}: ${tdMatches ? tdMatches.length : 0} columns`);
        
        if (tdMatches) {
          // Show just the text content of each column
          tdMatches.forEach((td, j) => {
            // Extract text content
            let text = td.replace(/<[^>]*>/g, '').trim();
            // Limit to first 50 chars
            text = text.substring(0, 50).replace(/\s+/g, ' ');
            console.log(`  Col ${j + 1}: ${text || '[empty/button]'}`);
          });
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

fetchHtml();

