const TorrentProvider = require('./node_modules/torrent-search-api/lib/TorrentProvider');

const provider = new TorrentProvider({
  name: 'Test',
  baseUrl: 'https://torrentz2.nz',
  searchUrl: '/search?q={query}',
  categories: { All: '' },
  defaultCategory: 'All',
  enableCloudFareBypass: true
});

async function fetchHtml() {
  const url = 'https://torrentz2.nz/search?q=inception';
  console.log('Fetching:', url);
  
  try {
    const html = await provider.request(url);
    
    // Find the results section
    console.log('\n=== Looking for results structure ===');
    
    // Check if there's a results div
    const resultsMatch = html.match(/<div[^>]*class="?results"?[^>]*>([\s\S]*?)<\/div>/);
    if (resultsMatch) {
      console.log('\nFound results div');
      const resultsContent = resultsMatch[1];
      
      // Extract first few dl elements
      const dlMatches = resultsContent.match(/<dl[^>]*>[\s\S]*?<\/dl>/g);
      if (dlMatches) {
        console.log(`\nFound ${dlMatches.length} <dl> elements`);
        console.log('\nFirst <dl> element:');
        console.log(dlMatches[0]);
        
        // Parse the first result more carefully
        const firstDl = dlMatches[0];
        console.log('\n=== Analyzing first result ===');
        
        // Title (in dt > a)
        const titleMatch = firstDl.match(/<dt><a[^>]*>([^<]+)<\/a><\/dt>/);
        if (titleMatch) console.log('Title:', titleMatch[1]);
        
        // Spans in dd
        const spanMatches = firstDl.match(/<span[^>]*>([^<]+)<\/span>/g);
        if (spanMatches) {
          console.log('\nSpans found:');
          spanMatches.forEach((span, i) => {
            const text = span.match(/>([^<]+)</)[1];
            console.log(`  Span ${i + 1}:`, text);
          });
        }
      } else {
        console.log('No <dl> elements found');
      }
    } else {
      console.log('No results div found');
      
      // Try looking for dl elements directly
      const dlMatches = html.match(/<dl[^>]*>[\s\S]*?<\/dl>/g);
      if (dlMatches && dlMatches.length > 0) {
        console.log(`\nFound ${dlMatches.length} <dl> elements at root level`);
        console.log('\nFirst <dl> element:');
        console.log(dlMatches[0].substring(0, 500));
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

fetchHtml();

