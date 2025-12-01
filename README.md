# Bit-Finder

[![Version](https://img.shields.io/npm/v/bit-finder.svg)](https://npmjs.org/package/bit-finder)
[![License](https://img.shields.io/npm/l/bit-finder.svg)](https://github.com/inter-ops/bit-finder/blob/master/package.json)

<!-- [![npm](https://img.shields.io/npm/dt/bit-findern)](https://www.npmjs.com/package/bit-finder) -->

A toolkit for searching, downloading and streaming media using torrents, YouTube, and more.

# Features

- Search multiple torrent indexes for highest seeded Movies & TV shows
- Stream torrents directly to AppleTV, Chromecast and VLC
- Download torrents
- Copy torrent magnet links
- Stream YouTube videos to AppleTV
- Download YouTube videos

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
  bf torrents search      Search torrents
  bf torrents stream      Stream a torrent's data inline
  bf torrents download    Download a torrent in the current working
                          directory
  bf torrents get-magnet  Copy a torrent's magnet URL

Options:
      --help         Show help                                         [boolean]
      --version      Show version number                               [boolean]
  -i, --interactive  Run in interactive mode                           [boolean]
```
