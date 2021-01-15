"use strict";
import config from "./config"
import rarbgApi from 'rarbg-api'
import { Client } from 'imdb-api'
const imdbApi = new Client({ apiKey: config.omdb.apiKey });

import TorrentSearchApi from 'torrent-search-api'


// too many providers slows search significantly, using current best

TorrentSearchApi.enableProvider('1337x');
TorrentSearchApi.enableProvider('Rarbg');
//TorrentSearchApi.enableProvider('Yts');
//TorrentSearchApi.enableProvider('Eztv');


export const search = async (name: string, type: 'Movies' | 'TV') => {
  const torrents = await TorrentSearchApi.search(name, type, 15);
  //const torrentHtmlDetail = await TorrentSearchApi.getTorrentDetails(torrent);

  return torrents
}

export const getMagnet = async (torrent: TorrentSearchApi.Torrent) => {
  const magnet = await TorrentSearchApi.getMagnet(torrent);
  return magnet;
}


// following functions are not currently used but could be useful in the future

export const searchTorrents = async ({ imdbId, name }: { imdbId?: string, name?: string }) => {
  // NOTE: specific episode id dont seem to work

  const torrents = await imdbId ?
    rarbgApi.search(imdbId, { limit: 25, sort: "seeders" }, "imdb") :
    rarbgApi.search(name, { limit: 25, sort: "seeders" })

  return torrents;
}

export const searchImdb = async ({ name, first = false }: { name: string, first?: boolean }) => {
  const { results } = await imdbApi.search({ name });

  // TODO: get all movie info - can do synchronously while torrents are searched
  /*
    if (first) {
      const info = await imdbApi.get({ id: results[0].imdbid })
    }
  */

  return first ? results[0] : results;
}
