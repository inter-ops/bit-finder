import config from "./config";
import rarbgApi from "rarbg-api";
import { Client, ImdbError } from "imdb-api";
import TorrentSearchApi, { Torrent } from "torrent-search-api";

const imdbApi = new Client({ apiKey: config.omdb.apiKey });

// too many providers slows search significantly, using current best

TorrentSearchApi.enableProvider("1337x");
TorrentSearchApi.enableProvider("Rarbg");
// TorrentSearchApi.enableProvider('Yts');
//TorrentSearchApi.enableProvider('Eztv');

export const search = async (name: string, type: "Movies" | "TV", n = 15) => {
  const torrents = await TorrentSearchApi.search(name, type, n);
  //const torrentHtmlDetail = await TorrentSearchApi.getTorrentDetails(torrent);

  return torrents;
};

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

export const searchTorrents = async ({ imdbId, name }: { imdbId?: string; name?: string }) => {
  // NOTE: specific episode id dont seem to work
  const torrents = await (imdbId
    ? rarbgApi.search(imdbId, { limit: 25, sort: "seeders" }, "imdb")
    : rarbgApi.search(name, { limit: 25, sort: "seeders" }));

  return torrents;
};
