import * as finder from "./finder";
import * as parser from "./parser";
import * as downloader from "./downloader";

export default { finder, parser, downloader };

const searchTerm = process.argv[2]
const type = (process.argv[3] ?? "Movies") as "Movies" | "TV" 

finder.search(searchTerm, type).then(torrents => {
    console.log(torrents[0].title);
    return finder.getMagnet(torrents[0]);
})
    .then(magnet => console.log(magnet));
