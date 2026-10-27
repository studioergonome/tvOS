# Security notes

No software can promise zero vulnerabilities. This is a personal, sideloaded test app; review and real-device validation remain necessary before a public release.

## App boundary

- Scripts and fonts are bundled locally. There are no CDN scripts, remote HTML embeds, server listeners, analytics or root modifications in the TV app.
- The packaged Content Security Policy permits only scripts/styles with the exact build-generated SHA-256 hashes. This avoids the older engine’s file-origin mismatch without allowing remote scripts or unsafe-inline. Fonts and images allow local files; API connections remain restricted to TMDB, OMDb and Cinemeta and remote images to approved HTTPS logo origins. Text is rendered with DOM textContent, not injected HTML.
- Native video is permitted to request HTTP/HTTPS media and follow stream/CDN redirects. HTTP playlists are supported because the supplied catalogue includes them; those streams are not encrypted. Media endpoints receive normal viewer network information.
- Playlist import rejects executable/file schemes, URL user-info, obvious private IPs and local hostnames. DNS redirects/rebinding are not comprehensively controlled by the app, and native media follows broadcaster playlists. Use trusted playlists.
- Stream addresses stay in ignored private build output. The public catalogue exporter includes names, safe logo URLs and country codes only. API keys, device keys and passphrases must never be committed.
- TMDB credentials are stored in the TV app's local storage. This is not a hardware-backed secret vault. They are sent only to TMDB; Read Access Tokens use an Authorization header, v3 keys use TMDB's query parameter. Failure messages omit credentials.
- One native video element is used. Leaving playback clears the media source and releases the decoder. Timeout/retry handling is bounded by the provided alternatives.
- LG service calls request app launches only. Availability depends on LG permissions and firmware; failure is not reported as success.

## Build tooling

The app has no npm runtime dependencies. esbuild/PostCSS are build-only. LG's official CLI is installed separately and is not packaged or published with the app. The upstream CLI's dependency advisories must be assessed separately; its bundled/shrinkwrapped dependencies are not fixed by this repository. Do not run its development web server on an untrusted network.

Keep Node, the build tools and TV firmware maintained. Before publishing, run tests, review dependency audit results and inspect the staged app and Git diff for private data. Public disclosure of a private stream-bearing `.ipk` should be avoided.

## Optional OMDb ratings

The OMDb key is entered locally alongside the TMDB configuration and stored in the same unencrypted app-local storage. Each key is sent only to its own HTTPS API origin. OMDb receives the requested IMDb ID; its returned rating is used only if the returned ID matches. If TMDB has no IMDb ID, a fallback requires the returned title, release year and media type to match. CSP permits `https://www.omdbapi.com` for these requests. No key is included in source, preview URLs, source archives or console logs. Ratings use a bounded 24-hour in-memory cache. Reloading the app clears that cache, and the user’s OMDb plan/request limits still apply.

## Cinemeta metadata

CSP adds only `https://v3-cinemeta.strem.io` for JSON fetches. The request contains a public IMDb ID and movie/series type, with no TMDB/OMDb key, cookies or referrer. Remote scripts and images from this service are not loaded. Responses must match the requested IMDb ID; only a numeric rating from 0 to 10 is displayed. Requests time out after six seconds. Missing results are cached for one hour, successful scores for 24 hours, with a 300-entry bound.

## Local official-ratings preview service

`tools/preview.py` binds only to 127.0.0.1. It validates Host and IMDb ID inputs, uses parameterized SQLite queries, and rejects private file paths including encoded dotfiles. The cache contains public IMDb ratings only, outside the project. The frontend permits same-origin connections for this preview endpoint. Its use is explicitly gated to HTTP localhost/127.0.0.1, with a five-second request timeout. TV builds do not call it. API keys stay in browser storage and are not sent to this service. This is not a remotely deployed backend.

The Mac-only audit-save endpoint accepts only bounded JSON from the exact same Origin/Host with a custom header, saves a whitelist of public metadata fields to a fixed ignored report path, and never accepts a caller-supplied filename. Audit reports do not contain credentials.
