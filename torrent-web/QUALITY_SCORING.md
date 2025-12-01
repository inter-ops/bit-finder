# Torrent Quality Scoring System

This document outlines a comprehensive quality scoring system for prioritizing torrent results based on multiple quality factors. This system is not currently implemented but provides a framework for future optimization.

## Overview

The quality scoring system assigns points (0-100) to each torrent based on various quality indicators extracted from the title. Torrents are then sorted by their total quality score, with optional weighting for seeds.

## Scoring Categories

### Resolution (0-30 points)

Resolution is the primary indicator of video quality:

- **8K/4320p**: 30 points - Ultra high definition
- **4K/2160p/UHD**: 25 points - High definition, excellent quality
- **1080p**: 20 points - Full HD, great quality
- **720p**: 12 points - HD, good quality
- **480p**: 6 points - SD, acceptable quality
- **360p or lower**: 2 points - Low quality

### Video Codec (0-15 points)

Video codec affects compression efficiency and quality:

- **AV1**: 15 points - Best compression, future-proof
- **H.265/HEVC/x265**: 12 points - Excellent compression, modern
- **H.264/x264/AVC**: 10 points - Good compression, widely compatible
- **XviD**: 5 points - Older codec, acceptable
- **DivX**: 5 points - Older codec, acceptable
- **Unknown**: 0 points

### Source Quality (0-20 points)

Source type indicates the origin and potential quality:

- **Remux/BluRay Remux**: 20 points - Lossless from Blu-ray
- **BluRay/BDRip/BRRip**: 18 points - High quality source
- **WEB-DL**: 16 points - Direct web download, excellent quality
- **WEBRip**: 12 points - Captured web stream, good quality
- **HDTV**: 8 points - TV broadcast, acceptable quality
- **DVDRip**: 6 points - DVD source, lower quality
- **CAM/Telesync**: 0 points - Theater recording, poor quality

### Audio Codec (0-15 points)

Audio quality enhances the viewing experience:

- **Dolby Atmos**: 15 points - Premium 3D audio
- **TrueHD**: 13 points - Lossless audio
- **DTS-HD MA**: 12 points - High definition audio
- **DTS-X**: 11 points - 3D audio
- **DTS**: 8 points - Good audio quality
- **AC3/Dolby Digital**: 6 points - Standard digital audio
- **AAC**: 4 points - Compressed digital audio
- **MP3**: 2 points - Basic audio
- **Unknown**: 0 points

### HDR Support (0-10 points)

High Dynamic Range provides enhanced visual quality:

- **Dolby Vision**: 10 points - Premium HDR with dynamic metadata
- **HDR10+**: 8 points - Enhanced HDR with dynamic metadata
- **HDR10**: 6 points - Standard HDR
- **No HDR**: 0 points

### Seeds Bonus (0-10 points)

While quality is prioritized, seed count indicates availability:

- **Seeds > 100**: +10 points - Excellent availability
- **Seeds > 50**: +8 points - Very good availability
- **Seeds > 20**: +5 points - Good availability
- **Seeds > 10**: +3 points - Acceptable availability
- **Seeds > 5**: +2 points - Minimal availability
- **Seeds ≤ 5**: +0 points - Poor availability

Note: Seeds use logarithmic scaling to prevent overwhelming quality factors.

## Implementation Strategy

### Basic Implementation

```typescript
function calculateQualityScore(torrent: ParsedTorrent): number {
  let score = 0;
  
  // Resolution scoring
  const resolutionScores = {
    '8K': 30, '4K': 25, '2160p': 25,
    '1080p': 20, '720p': 12, '480p': 6, '360p': 2
  };
  score += resolutionScores[torrent.metadata.resolution] || 0;
  
  // Video codec scoring
  const codecScores = {
    'AV1': 15, 'H.265': 12, 'H.264': 10, 'XviD': 5, 'DivX': 5
  };
  score += codecScores[torrent.metadata.videoCodec] || 0;
  
  // Source quality scoring
  const sourceScores = {
    'Remux': 20, 'BluRay': 18, 'WEB-DL': 16,
    'WEBRip': 12, 'HDTV': 8, 'DVDRip': 6, 'CAM': 0
  };
  score += sourceScores[torrent.metadata.source] || 0;
  
  // Audio scoring
  const audioScores = {
    'Dolby Atmos': 15, 'TrueHD': 13, 'DTS-HD': 12,
    'DTS-X': 11, 'DTS': 8, 'AC3': 6, 'AAC': 4, 'MP3': 2
  };
  score += audioScores[torrent.metadata.audioCodec] || 0;
  
  // HDR scoring
  const hdrScores = {
    'Dolby Vision': 10, 'HDR10+': 8, 'HDR10': 6
  };
  score += hdrScores[torrent.metadata.hdr] || 0;
  
  // Seeds bonus (logarithmic)
  if (torrent.seeds > 100) score += 10;
  else if (torrent.seeds > 50) score += 8;
  else if (torrent.seeds > 20) score += 5;
  else if (torrent.seeds > 10) score += 3;
  else if (torrent.seeds > 5) score += 2;
  
  return score;
}
```

### Sort Modes

**1. Best Quality (Default)**
```typescript
torrents.sort((a, b) => {
  const scoreA = calculateQualityScore(a);
  const scoreB = calculateQualityScore(b);
  return scoreB - scoreA;
});
```

**2. Most Seeds**
```typescript
torrents.sort((a, b) => {
  if (b.seeds !== a.seeds) return b.seeds - a.seeds;
  return calculateQualityScore(b) - calculateQualityScore(a);
});
```

**3. Balanced**
```typescript
torrents.sort((a, b) => {
  const scoreA = calculateQualityScore(a) * 0.6 + (a.seeds * 0.4);
  const scoreB = calculateQualityScore(b) * 0.6 + (b.seeds * 0.4);
  return scoreB - scoreA;
});
```

**4. Smallest Size**
```typescript
torrents.sort((a, b) => {
  const sizeA = parseSizeToBytes(a.size);
  const sizeB = parseSizeToBytes(b.size);
  if (sizeA !== sizeB) return sizeA - sizeB;
  return calculateQualityScore(b) - calculateQualityScore(a);
});
```

## Size Validation

To filter out fake torrents, implement size sanity checks:

```typescript
function isReasonableSize(torrent: ParsedTorrent): boolean {
  const sizeInGB = parseSizeToGB(torrent.size);
  const resolution = torrent.metadata.resolution;
  
  // Minimum expected sizes for movies (90 min avg)
  const minSizes = {
    '4K': 8,    // 4K shouldn't be < 8GB
    '1080p': 2, // 1080p shouldn't be < 2GB
    '720p': 0.8 // 720p shouldn't be < 800MB
  };
  
  // Maximum reasonable sizes
  const maxSizes = {
    '4K': 100,   // Remux can be large
    '1080p': 50,
    '720p': 20
  };
  
  const min = minSizes[resolution] || 0;
  const max = maxSizes[resolution] || 200;
  
  return sizeInGB >= min && sizeInGB <= max;
}
```

## Future Enhancements

### User Preferences
- Allow users to customize scoring weights
- Save preferred codecs/sources
- Create quality profiles (e.g., "Best Quality", "Balanced", "Space Efficient")

### Machine Learning
- Learn from user selections over time
- Adjust weights based on download patterns
- Detect new quality indicators in titles

### Advanced Filtering
- Multi-audio track detection
- Batch/season pack detection
- Release group reputation scoring
- Age-based scoring (newer = better for ongoing series)

## Current Implementation Status

**Currently Implemented:**
- Metadata parsing from titles
- Manual filtering by quality attributes
- Seed-based sorting (default)
- Badge display for quality indicators

**Not Yet Implemented:**
- Automated quality scoring
- Multiple sort modes
- Size validation
- Smart recommendations

This scoring system provides a foundation for implementing intelligent torrent ranking that prioritizes both quality and availability.