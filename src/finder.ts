import config from "./config";
import { Client, ImdbError } from "imdb-api";
import TorrentSearchApi, { Torrent } from "torrent-search-api";

const imdbApi = new Client({ apiKey: config.omdb.apiKey });

// too many providers slows search significantly, using current best
TorrentSearchApi.enableProvider("1337x");
TorrentSearchApi.enableProvider("Rarbg");
TorrentSearchApi.enableProvider("Yts");

export const search = async (name: string, type: "Movies" | "TV", n = 15) => {
  const torrents = await TorrentSearchApi.search(name, type, n);
  return torrents;
};

/**
 *
 * @param torrent TorrentSearchApi["Torrent"]
 */
export const getMagnet = async (torrent: Torrent) => {
  const magnet = await TorrentSearchApi.getMagnet(torrent);
  return magnet;
};

export const searchImdb = async ({ name, first = false }: { name: string; first?: boolean }) => {
  try {
    const { results } = await imdbApi.search({ name });
    // console.log('results: ', results);

    // TODO: get all movie info - can do synchronously while torrents are searched
    // if (first) {
    //   const info = await imdbApi.get({ id: results[0].imdbid })
    //   console.log('info: ', info)
    // }

    return first ? results[0] : results;
  } catch (err) {
    if (err instanceof ImdbError) {
      if (err.message.includes("Too many results") || err.message.includes("Movie not found"))
        return [];
      throw err;
    }
  }
};

export const getImdbResult = async (imdbId: string) => {
  return await imdbApi.get({ id: imdbId });
};
