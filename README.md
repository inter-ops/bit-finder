# Bit-Finder

[![Version](https://img.shields.io/npm/v/bit-finder.svg)](https://npmjs.org/package/bit-finder)
[![License](https://img.shields.io/npm/l/bit-finder.svg)](https://github.com/inter-ops/bit-finder/blob/master/package.json)
<!-- [![npm](https://img.shields.io/npm/dt/bit-findern)](https://www.npmjs.com/package/bit-finder) -->

A tollkit for searcing, downloading and streaming media using torrents, YouTube, and more.

# Features

- Search the multiple torrent indexes for the highest seeded Movies & TV shows
- Stream torrents directly to AppleTV, Chromecast and VLC (more coming!) using [webtorrent-cli](https://github.com/webtorrent/webtorrent-cli)
- Download torrent directly using [webtorrent-cli](https://github.com/webtorrent/webtorrent-cli)
- Copy torrent magnet links
- Download YouTube videos using [youtube-dl](https://github.com/ytdl-org/youtube-dl)
- Stream YouTube videos to AppleTV (more coming!) using [youtube-dl](https://github.com/ytdl-org/youtube-dl)

<i>Note: YouTube functionality is currently broken for certain videos.</i>

# Install

```bash
# npm
npm install -g bit-finder

# yarn
yarn global add bit-finder
```

# Usage


### General

```bash
bf --help
```

```bash
Commands:
  bf torrents  Search and download torrents

Options:
      --help         Show help                                         [boolean]
      --version      Show version number                               [boolean]
  -i, --interactive  Run in interactive mode                           [boolean]
```


### Torrents 

```bash
bf torrents --help
```

```
Search and download torrents

Commands:
  index.js torrents search      Search torrents
  index.js torrents stream      Stream a torrent's data inline
  index.js torrents download    Download a torrent in the current working
                                directory
  index.js torrents get-magnet  Copy a torrent's magnet URL

Options:
      --help         Show help                                         [boolean]
      --version      Show version number                               [boolean]
  -i, --interactive  Run in interactive mode                           [boolean]
```
