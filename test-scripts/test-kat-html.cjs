const util = require('util');
const request = util.promisify(require('request'));

async function fetchHtml() {
  const url = 'https://katcr.to/usearch/inception/';
  console.log('Fetching:', url);
  
  try {
    const response = await request({
      url,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    
    const html = response.body;
    
    // Look for table structure
    console.log('\n=== Looking for table structure ===');
    
    // Find the results table
    const tableMatch = html.match(/<table[^>]*>[\s\S]*?<\/table>/);
    if (tableMatch) {
      console.log('Found table');
      
      // Extract first few rows
      const rowMatches = tableMatch[0].match(/<tr[^>]*>[\s\S]*?<\/tr>/g);
      if (rowMatches && rowMatches.length > 1) {
        console.log(`\nFound ${rowMatches.length} rows`);
        console.log('\nFirst data row (row 2):');
        console.log(rowMatches[1].substring(0, 800));
        
        if (rowMatches.length > 2) {
          console.log('\nSecond data row (row 3):');
          console.log(rowMatches[2].substring(0, 800));
        }
      }
    } else {
      console.log('No table found');
    }
    
    // Look for specific patterns
    console.log('\n\n=== Looking for specific patterns ===');
    if (html.includes('torrents_table')) {
      console.log('✓ Found "torrents_table" class');
    }
    if (html.includes('data-title')) {
      console.log('✓ Found "data-title" attributes');
    }
    if (html.includes('torrentname')) {
      console.log('✓ Found "torrentname" class');
    }
    if (html.includes('class="odd"') || html.includes('class="even"')) {
      console.log('✓ Found odd/even row classes');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

fetchHtml();

