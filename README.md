# tvOS 1.0.0

A personal LG webOS launcher with a glass interface, app shortcuts, artwork and native IPTV playback. Target device: LG 86UN8100PTB, webOS 5.6.2 / Chromium 68, at 1920×1080.

## Current interface

- Home: rotating artwork, title and synopsis, provider badges, IMDb score when available, Home menu and fixed-width clock/avatar.
- Home dock: Apple TV, Netflix, Prime Video, Stremio and IPTV.
- IPTV top dock: the same first four apps plus a grey Settings gear tile, below the header and above the grid.
- Categories, alphabetically: Business, Entertainment, News, Sports and Travel.
- Current private channel lists: Business 2; News 10; Sports 1 (Sky Sports Cricket UK HD). Entertainment and Travel are empty.
- Channel and category tiles use a five-column grid. No tile is selected automatically on entry or Back. Channel logos come from playlist metadata or supplied local assets.
- Settings: Reduce Motion, Reduce Transparency and Artwork Rotation. There is no external-browser player flow.

Use the remote arrows and Enter to navigate. Back closes the in-app player or dialog, then returns one visited page. The app dock supports movement between the header, dock and grid.

## Version 1.0 deployment

Installed on LG Theatre on 27 October 2026. The owner confirmed that Home and IPTV display correctly and respond to the physical remote.

Validation passed for startup, dock layout, alphabetical categories, Settings, channel counts, no initial tile focus, dock/grid navigation and LG Back. Short native-player checks started and advanced Sky Sports Cricket UK HD, CNN HD and CNBC TV18 Prime. These were representative checks, not a guarantee that every provider stream remains available or delivers its labelled HD resolution.

The package is `dist/com.tvos.launcher_1.0.0_all.ipk`. It contains private stream addresses and is excluded from the public source ZIP. Hardware reports and screenshots are local under `dist/`.

## Artwork and ratings setup

On the TV, select Home → Settings → Artwork Rotation → New releases catalogue. Enter a TMDB API key or Read Access Token, choose a country, and Save. Add an OMDb key if desired. Keys stay in app-local storage; no key is bundled in source or the installer. The TV did not have a TMDB key configured during v1.0 validation.

Artwork rotates every 10 seconds with a gradual fade. The catalogue contains subscription releases from the last 90 days for Apple TV, Netflix and Prime Video in the selected region, across available TMDB discovery pages. Stremio is an app shortcut rather than a subscription provider filter.

TV IMDb scores use Cinemeta with optional OMDb fallback. Identity matching uses IMDb IDs, with a verified localized-title fallback for Madam Inspector / Birangana. Metadata services can lag or omit scores. The loopback Mac preview also supports an official IMDb daily dataset cache; that local cache is not a hosted TV service. See `RATINGS-NOTES.md`.

## Mac preview

Install development dependencies with `npm ci`, then run:

```sh
python3 tools/preview.py
```

Open `http://127.0.0.1:8765/?preview=1`. The server listens on loopback only. Private stream overrides are loaded from `~/.cache/tvos-imdb-preview/channel-streams.json`, grouped by category and channel name. Public `channels.js` contains metadata only.

## Category playlists

Each supplied category can have its own private `CategoryName.m3u`, beginning with `#EXTM3U` and `#PLAYLIST:CategoryName`. Each channel has an `#EXTINF` row with `tvg-id`, `tvg-name`, `tvg-logo` and `group-title`, followed by its stream URL.

The current workspace Sports playlist is `playlists/Sports.m3u`. Local logo references use `assets/logos/channels/filename.png` relative to the app root. The private build exporter prefers `CategoryName.m3u` in the supplied directory, falling back to `popular-category-iptv.m3u`; Entertainment uses the legacy `popular-general-iptv.m3u` filename.

M3U files, private installers, credentials and caches are excluded from Git and the source ZIP. See `playlists/README.md` and `GITHUB-UPLOAD.md`.

## Build and verification

```sh
npm ci
npm test
npm run build
```

The default build is metadata-only. To package the current private playlists:

```sh
TVOS_PLAYLIST_DIR="$HOME/Downloads/tvOS/channels" npm run package
```

The packager uses the isolated LG CLI under `~/.cache/tvos-webos-tools/` when present, or `ares-package` from PATH. The package verifier checks resources, embedded script/style hashes and private-file exclusions. Chromium 68 compatibility transforms and a canvas glass fallback are included. The development test suite contains 33 Node and 9 Python tests.

Development-only hardware checks use an `ares-inspect` loopback tunnel:

```sh
node tools/tv-smoke.mjs PORT
node tools/tv-release-check.mjs PORT
node tools/tv-motion-check.mjs PORT
node tools/tv-media-check.mjs PORT
```

The clean upload archive is `dist/tvOS-github-source.zip`; extract its contents for GitHub. Publishing source does not activate TMDB or host any API.

## Licence and assets

Original code: MIT (`LICENSE`). Poppins: SIL Open Font License (`assets/fonts/OFL.txt`). Third-party marks and supplied artwork retain their owners’ rights. See `SECURITY.md` and `GITHUB-UPLOAD.md` for data handling and publication details.
