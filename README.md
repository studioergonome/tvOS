# tvOS

A personal LG webOS app with a media-artwork Home screen, five app shortcuts, an IPTV catalogue and TV remote navigation. The original Mac mockup is preserved in the project root. The TV build targets **LG 86UN8100PTB, webOS 5.6.2 (Chromium 68)**.

## Current state

- A corrected development package starts on the target TV. The earlier blank screen was caused by packaged-file CSP handling; the build now embeds scripts/styles with exact SHA-256 hashes.
- Native video playback implemented with alternate-source fallback, timeout handling, Play/Pause and Back to the selected channel. ABC News was confirmed playing on the target TV; individual channel availability varies.
- 3,931 channel entries from the supplied local playlists. Country filtering follows playlist metadata.
- Apple TV, Prime Video, Netflix and Stremio dock launches have been checked on the TV. Stremio resolves to `io.strem.tv` through the public per-app query, without requiring app enumeration. Broadcast/HDMI IDs are present; physical input switching still needs a user check.
- Live TMDB loading requires an API credential entered in Settings on the TV.
- Visual fidelity, remote operation and stream decoding require hardware checks. This is a test build, not a production-certified release.

## Preview on the Mac

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/`. This preview contains channel metadata but no stream addresses. The artwork reference is local-only and excluded from Git. The packaged app uses a neutral local background until TMDB artwork loads.

## Build

Requires Node.js 22+, Python 3 and macOS `sips` for exporting the supplied logo. Install the [official LG webOS CLI](https://webostv.developer.lge.com/develop/tools/cli-installation) separately. The CLI is a development tool and is never included in the TV package.

```sh
npm ci
npm test
npm run package
```

This creates a metadata-only `dist/com.tvos.launcher_0.2.3_all.ipk`. To include your local playlists for playback:

```sh
TVOS_PLAYLIST_DIR='~/Downloads/tvOS/channels' npm run package
```

Expected files are `popular-news-iptv.m3u`, `popular-sports-iptv.m3u`, and the same pattern for the other categories; Entertainment uses `popular-general-iptv.m3u`. The stream-bearing export is written only inside ignored `dist/`. No playlist or credential is committed. Do not publicly upload a private package containing provider URLs.

`TVOS_ARES_PACKAGE` can point to a specific `ares-package` executable. On this Mac, the build also recognises the isolated tool installation in `~/.cache/tvos-webos-tools`.

The build bundles scripts as a classic local script, transpiles syntax for Chromium 68, supplies small compatibility shims, expands modern CSS selectors, converts layout units and exports 80px/130px LG launcher icons from the unchanged 1024px master. webOS 5.x uses small artwork-sampling canvases with diffusion, translucent tint and diagonal edge highlights. The scrolling channel header samples only the few rows behind it and fades smoothly. Modern browsers keep the native backdrop filter. This follows the lightweight gradient/canvas approach used by the functional reference; native optical refraction is approximated.

## Install and test

Enable Developer Mode on the TV and configure it with the LG CLI, then:

```sh
ares-install -d 'LG Theatre' dist/com.tvos.launcher_0.2.3_all.ipk
ares-launch -d 'LG Theatre' com.tvos.launcher
```

The package installs as **tvOS**, ID `com.tvos.launcher`, beside existing apps. It does not replace the LG system launcher or change the remote's Home button. Developer Mode apps depend on the TV's Developer Mode session remaining valid.

Test Home → IPTV → category → Country → channel, Play/Pause and Back. Test Settings/Artwork Rotation, HDMI, broadcast TV and each streaming-app shortcut. Remote Back closes the player/dialog before returning one visited page; Back on Home delegates to LG. Existing installed-app logos still need to be obtained from the TV through permitted metadata/access, or supplied as exported assets; placeholders are not claimed to be the LG originals.

## Artwork

Settings → Artwork Rotation → Trending catalogue. Enter a TMDB API key or Read Access Token, choose a country and Save. Country is read-only on the Artwork Rotation overview. Credentials remain in app-local storage, not project files. Up to three trending movies and three shows available through Netflix, Apple TV or Prime Video in the selected country rotate every 30 seconds. The list refreshes hourly. Stremio is an app shortcut, not a subscription-availability provider.

## Security and rights

See [SECURITY.md](SECURITY.md). App code is MIT; supplied artwork/logos and Poppins retain their own rights. Fonts include their licence. The development reference photo is excluded from the distributable. Network availability, codec support, geographic restrictions and broadcaster permissions can prevent individual streams playing.

The UI's earlier revisions are recorded in [DESIGN-HISTORY.md](DESIGN-HISTORY.md).

References: [LG engine versions](https://webostv.developer.lge.com/develop/specifications/web-api-and-web-engine), [app resources](https://webostv.developer.lge.com/develop/getting-started/app-resources), [streaming support](https://webostv.developer.lge.com/develop/specifications/streaming-protocol-drm).

## Current icon and name

The app is named **tvOS**, ID `com.tvos.launcher`. The supplied `tvOS icon.png` is preserved as the master in `assets/branding/app-logo-1024.png`; the build exports LG launcher sizes.

## Device checks

The corrected package has been inspected on the actual 86UN8100PTB at 1920×1080. Automated keyboard checks pass for all five Home dock entries, opening IPTV, its eleven categories, opening News, filtering 773 news channels to 11 Australian entries, and the LG Back event returning one page. Initial category/channel focus remains empty. This does not replace a physical-remote usability check.

`node tools/tv-smoke.mjs <local-inspector-port> [screenshot.png]` repeats these development checks through the local tunnel produced by `ares-inspect`. It reads only this app’s runtime and never reads credential storage. The package command also verifies resources and every embedded-code CSP hash inside the generated archive.

Validation: 19 automated unit/parser tests pass, the actual package passes resource/CSP integrity checks, and the project dependency audit reports zero known vulnerabilities. This is not a guarantee of zero security flaws.

## Responsiveness and controls

Channel pages render only a small window of rows while preserving the complete scrollbar range. Remote navigation uses row/column indices instead of measuring every channel on each key. Removed rows release image observers, country options are reused, and the clock updates its text only when needed. Glass samples are reused, stationary surfaces are not redrawn during scrolling, and the frosted header refresh is throttled; full-size blur passes are avoided on webOS 5.x. Video playback pauses background glass work.

On the target TV, the full 773-channel News test improved from about 1,714ms to 122ms for a grid redraw, and from 215ms to 21ms average arrow-key processing in a synchronous stress test. These are measured handler/redraw times, not a guaranteed frame rate or network playback latency.

The three shortcut icons have zero measured offset from their circle centres. Both country controls use one local glass menu with the supplied chevron, kept inside the control. The Home fallback has no title; a configured TMDB title appears only with its artwork.

## Publishing the source

See [GITHUB-UPLOAD.md](GITHUB-UPLOAD.md) for upload exclusions and TMDB setup. A GitHub upload does not activate the API; the TV app connects directly to TMDB using the credential entered in Settings. The Mac preview falls back to the bundled neutral background when the private reference image is absent. Official TMDB logo attribution remains pending before a public app release.
