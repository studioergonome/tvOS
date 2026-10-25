# Security notes

No software can promise zero vulnerabilities. This is a personal, sideloaded test app; review and real-device validation remain necessary before a public release.

## App boundary

- Scripts and fonts are bundled locally. There are no CDN scripts, remote HTML embeds, server listeners, analytics or root modifications in the TV app.
- The packaged Content Security Policy permits only scripts/styles with the exact build-generated SHA-256 hashes. This avoids the older engine’s file-origin mismatch without allowing remote scripts or unsafe-inline. Fonts and images allow local files; API connections remain restricted to TMDB and remote images to approved HTTPS logo origins. Text is rendered with DOM textContent, not injected HTML.
- Native video is permitted to request HTTP/HTTPS media and follow stream/CDN redirects. HTTP playlists are supported because the supplied catalogue includes them; those streams are not encrypted. Media endpoints receive normal viewer network information.
- Playlist import rejects executable/file schemes, URL user-info, obvious private IPs and local hostnames. DNS redirects/rebinding are not comprehensively controlled by the app, and native media follows broadcaster playlists. Use trusted playlists.
- Stream addresses stay in ignored private build output. The public catalogue exporter includes names, safe logo URLs and country codes only. API keys, device keys and passphrases must never be committed.
- TMDB credentials are stored in the TV app's local storage. This is not a hardware-backed secret vault. They are sent only to TMDB; Read Access Tokens use an Authorization header, v3 keys use TMDB's query parameter. Failure messages omit credentials.
- One native video element is used. Leaving playback clears the media source and releases the decoder. Timeout/retry handling is bounded by the provided alternatives.
- LG service calls request app launches only. Availability depends on LG permissions and firmware; failure is not reported as success.

## Build tooling

The app has no npm runtime dependencies. esbuild/PostCSS are build-only. LG's official CLI is installed separately and is not packaged or published with the app. The upstream CLI's dependency advisories must be assessed separately; its bundled/shrinkwrapped dependencies are not fixed by this repository. Do not run its development web server on an untrusted network.

Keep Node, the build tools and TV firmware maintained. Before publishing, run tests, review dependency audit results and inspect the staged app and Git diff for private data. Public disclosure of a private stream-bearing `.ipk` should be avoided.
