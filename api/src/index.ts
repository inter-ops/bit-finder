import * as finder from "./finder";
import * as parser from "./parser";
import * as downloader from "./downloader";

export default { finder, parser, downloader };

finder.search("test", "TV").then(torrents => {
    console.log(torrents[0].title);
    return finder.getMagnet(torrents[0]);
})
    .then(magnet => console.log(magnet));
