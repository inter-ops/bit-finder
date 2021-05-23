"use strict";
const express = require('express');
const router = express.Router();
// const {downloader, parser, finder} = require("bit-finder-api") // TODO: link to bit-finder/api
const downloader = require("../dist/downloader")
// const parser = require("../src/parser")
const finder = require("../dist/finder")

// this is hacky but works for our purpose
let cachedTorrents = [];

router.get('/', function(req, res, next) {
  res.render('index', { title: 'Bit-Finder' });
});

router.get("/torrents", async (req, res, next) => {
  try {
    const { name } = req.query;
    if (!name || name === "") return res.render('torrents', {});

    cachedTorrents = await finder.search(name)

    if (cachedTorrents.length === 0) console.log("No torrents found");

    let torrentIdx = 0;
    let htmlResults = `
      <h3>Torrents:</h3>
      <table>
        <tr><th>Title</th><th>Seeds</th><th>Peers</th><th>Size</th><th>Provider</th><th>Download</th></tr>
        ${cachedTorrents.map(torrent => {
          return `
            <tr>
              <td>${torrent.title}</td>
              <td>${torrent.seeds}</td>
              <td>${torrent.peers}</td>
              <td>${torrent.size}</td>
              <td>${torrent.provider}</td>
              <td>
                <form action="/api/torrents" method="post">
                  <button name="torrentIdx" value=${torrentIdx++}>Add</button>
                </form>
              </td>
            </tr>
          `
        })}
      </table>
    `
    return res.render('torrents', { htmlResults });
  }
  catch(err) {
    return next(err)
  }
})

router.post("/api/torrents", async (req, res, next) => {
  try {
    const { torrentIdx } = req.body;
    const chosenTorrent = cachedTorrents?.[torrentIdx]

    let htmlResults;
    if (!chosenTorrent) {
      // TODO: add button to go back to search page
      htmlResults = `Error!!!! Torrent not found. Please search again`
    }
    else {
      console.log(`Chosen torrent at index ${torrentIdx}`, chosenTorrent);
      const magnet = await finder.getMagnet(chosenTorrent)
      await downloader.addTorrent(magnet)
      htmlResults = `<br/><h1>Success!</h1><br/><h3>Torrent ${chosenTorrent.title} added successfully</h3>`
    }

    // ensure memory leaks dont happen, if user clicks back they could select an index
    // from an old list and get the wrong torrent. This will ensure they reload.
    cachedTorrents = [];
    return res.render('torrents', { htmlResults });
  }
  catch(err) {
    return next(err)
  }
})


module.exports = router;
