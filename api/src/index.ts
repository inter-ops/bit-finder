import * as finder from "./finder";
import * as parser from "./parser";
import * as downloader from "./downloader";

export default { finder, parser, downloader };

const searchTerm = process.argv[2]
const type = (process.argv[3] ?? "Movies") as "Movies" | "TV" 

/**
 * TODO: cli
 * bit-finder -m "movie name" -t "type"
 * 
 * show a list of results, enter a number to chose one.
 * then give the option to download directly, or copy the magnet link
 */

finder.search(searchTerm, type).then(torrents => {
    console.log(torrents[0].title);
    return finder.getMagnet(torrents[0]);
})
    .then(magnet => console.log(magnet));
