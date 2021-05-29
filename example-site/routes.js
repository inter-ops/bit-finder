"use strict";
import { Router } from "express";
const router = Router();
// const {downloader, parser, finder} = require("bit-finder-api") // TODO: link to bit-finder/api
import { addTorrent } from "../dist/downloader";
// const parser = require("../src/parser")
import { search, getMagnet } from "../dist/finder";

// this is hacky but works for our purpose
let cachedTorrents = [];

router.get("/", function (req, res) {
  res.render("index", { title: "Bit-Finder" });
});

router.get("/torrents", async (req, res, next) => {
  try {
    const { name } = req.query;
    if (!name || name === "") return res.render("torrents", {});

    cachedTorrents = await search(name);

    if (cachedTorrents.length === 0) console.log("No torrents found");

    let torrentIdx = 0;
    let htmlResults = `
      <h3>Torrents:</h3>
      <table>
        <tr><th>Title</th><th>Seeds</th><th>Peers</th><th>Size</th><th>Provider</th><th>Download</th></tr>
        ${cachedTorrents.map((torrent) => {
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
          `;
        })}
      </table>
    `;
    return res.render("torrents", { htmlResults });
  } catch (err) {
    return next(err);
  }
});

router.post("/api/torrents", async (req, res, next) => {
  try {
    const { torrentIdx } = req.body;
    const chosenTorrent = cachedTorrents?.[torrentIdx];

    let htmlResults;
    if (!chosenTorrent) {
      htmlResults = `<h3>Error - Torrent not found</h3>`;
    } else {
      console.log(`Chosen torrent at index ${torrentIdx}`, chosenTorrent);
      const magnet = await getMagnet(chosenTorrent);
      await addTorrent(magnet);
      htmlResults = `<br/><h1>Success!</h1><br/><h3>Torrent ${chosenTorrent.title} added successfully</h3>`;
    }

    htmlResults += `<br/>Go back to search again<br/><button type="button" onclick="javascript:history.back()">Back</button>`;

    // ensure memory leaks dont happen, if user clicks back they could select an index
    // from an old list and get the wrong torrent. This will ensure they reload.
    cachedTorrents = [];
    return res.render("torrents", { htmlResults });
  } catch (err) {
    return next(err);
  }
});

export default router;
