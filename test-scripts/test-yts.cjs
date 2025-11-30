const util = require("util");
const request = util.promisify(require("request"));

async function testYtsApi() {
  const domains = ["yts.mx", "yts.lt", "yts.gg"];

  for (const domain of domains) {
    console.log(`\n=== Testing ${domain} ===`);
    const url = `https://${domain}/api/v2/list_movies.json?query_term=inception&sort=seeds&order=desc&limit=3`;
    console.log(`URL: ${url}`);

    try {
      const response = await request({
        url,
        headers: { "User-Agent": "curl/7.37.0" },
        timeout: 10000
      });

      const data = JSON.parse(response.body);

      if (data.status === "ok" && data.data.movies) {
        console.log(`✓ ${domain} works!`);
        console.log(`Found ${data.data.movies.length} movies`);

        if (data.data.movies.length > 0) {
          const movie = data.data.movies[0];
          console.log("\nFirst movie:");
          console.log(`  Title: ${movie.title}`);
          console.log(`  Year: ${movie.year}`);

          if (movie.torrents) {
            console.log(`  Torrents: ${movie.torrents.length}`);
            movie.torrents.forEach((t) => {
              console.log(`    - ${t.quality}: ${t.seeds} seeds, ${t.peers} peers, ${t.size}`);
            });
          }
        }

        // Test succeeded, no need to try other domains
        break;
      } else {
        console.log(`✗ ${domain} returned unexpected data`);
      }
    } catch (error) {
      console.log(`✗ ${domain} failed: ${error.message}`);
    }
  }
}

testYtsApi();
