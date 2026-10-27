# tvOS — Mac design preview

A personal LG webOS launcher interface inspired by the supplied Apple tvOS references. This first mockup is for visual and interaction review before building an LG `.ipk`.

## Open on your Mac

From this folder, run:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open **http://127.0.0.1:8765**. Use a 16:9 browser window or press **F** for fullscreen.

- Mouse: hover and click tiles.
- Remote simulation: arrow keys, Enter to select, Escape to go back, H for Home.
- Home dock: Apple TV, Prime Video, Netflix, IPTV, Stremio.
- IPTV: eleven categories and their channel names, using five columns throughout. Labels show on hover or keyboard focus.
- Settings: working local appearance preferences, saved in the browser.
- HDMI, broadcast TV, streaming apps and channel playback remain mock controls. Simulation dialogs and toasts have been removed.

## Preview boundaries

This is not an installable TV build. It does not play streams, launch LG apps or switch physical inputs. It can call TMDB after you configure your own credential. Artwork uses a temporary The Studio promotional image from Apple TV Press for layout review; dynamic trending backgrounds load after TMDB setup. Country defaults provisionally to Australia. Stremio's tile symbol is a temporary approximation pending the final logo.

Channel display names and safe HTTPS tvg-logo URLs were extracted from the supplied local M3U files. Stream URLs and playlist credentials are deliberately absent. Logos load directly from playlist-specified hosts with no referrer; unavailable logos fall back to initials. Channel availability has not been verified. `tools/prepare_channels.py` regenerates `channels.js` from the user's original local files; it is not needed to run the preview.

## Security and privacy

No dependencies or analytics. Fonts and UI assets are local. Content Security Policy restricts API connections to api.themoviedb.org and remote images to image.tmdb.org plus the explicit logo-host allowlist generated from the supplied playlists, blocks embedded frames and external code. Appearance preferences and the TMDB configuration are saved in browser local storage. The credential is masked in the UI but local storage is not encrypted; anyone with access to this browser profile may inspect it. It is never written to project files or Git. V3 API keys are sent as TMDB query parameters; API Read Access Tokens use the Authorization header. Credentials are sent only to TMDB. Run the preview server bound to loopback as above. Production security and webOS compatibility require separate implementation and testing on the target LG model.

## References and attribution

- Functional reference: [Free My TV fork](https://github.com/simbasjungles/free-my-tv), MIT. No source copied into this standalone mockup.
- IPTV reference reviewed: [Android TV Makeover](https://github.com/kulwantnagi/android-tv-makeover), MIT. Its Android/Flutter implementation cannot run directly on webOS; no source copied.
- Poppins: Indian Type Foundry, SIL Open Font License; included in `assets/fonts/OFL.txt`.
- Supplied artwork, avatar and brand logos remain the property of their respective owners. Artwork is a temporary private review reference and must be replaced with appropriately licensed/API-provided images before public distribution. Apple, Netflix, Prime Video and Stremio are not affiliated with this project.

## Before public GitHub upload

Replace/remove the reference artwork and confirm rights to supplied personal assets and logos. Reference imagery is excluded by `.gitignore`. Do not publish API keys, developer credentials or private playlists. Git upload and the final LG build are subsequent steps after design review.

Preview artwork source: https://www.apple.com/tv-pr/originals/the-studio/ (Apple TV Press). Artwork is excluded from Git.

## Design revision 02

Removed page branding and preview footers. Header order is Live TV, HDMI Inputs, Settings, Clock/Avatar. HDMI now uses the Settings two-column layout. Settings has a centered muted heading and fits within the TV frame. Home has no automatic tile focus, hover captions or white tile/dock outlines; IPTV retains hover/focus captions. Glass surfaces use a light frosted treatment based on the supplied reference.

Final Apple TV, Prime Video, Netflix and Stremio tile artwork must come from the installed LG applications. Current Mac assets are placeholders until those TV assets are available; retrieval support must be checked on the target TV.

## Design revision 03

Applied the user-supplied Liquid Glass CSS tokens to floating controls, dock and menus: 40px backdrop blur, 210% saturation, darkened inset edges and illuminated focus highlights. Tiles and settings rows grow to 1.08 on hover/focus with deeper shadows. This is a CSS approximation, not native SwiftUI refraction. Settings and HDMI rows share the header profile's right margin; focused rows grow leftward to retain alignment. Reduced motion and reduced transparency preferences remain supported. Home still opens without a focused tile or hover captions. LG hardware performance validation remains pending.

## Design revision 04

Removed continuous tile focus rings in favour of isolated top-left and bottom-right shine. Lightened the dock scrim/tint, reduced backdrop blur to 6px (3.6px for bubbles), and set saturation to 180%. Settings/HDMI row growth is now 1.5%; shortcut bubbles grow 2.5%. The requested clear-glass revision restores transparency once if an older preview saved Reduce Transparency; subsequent preference changes persist.

Compared with [materials.json](https://github.com/seunghan91/ios27-design-system/blob/main/packages/tokens/src/materials.json) and the repository's React material styles. Those are independent web approximations for iOS/iPadOS rather than an official tvOS rendering specification. Original CSS implementation, tuned to the user's TV references.

## Artwork setup (revision 05)

Settings → Artwork Rotation → Trending catalogue. Enter a TMDB v3 API key or API Read Access Token, choose the country and Save. The app checks authentication before saving. Return Home: backgrounds crossfade every 30 seconds. Trending candidates are checked against subscription availability in the chosen country for Apple TV, Netflix and Amazon Prime Video. Up to three movies and three shows are selected from the first three weekly trending pages; fewer may be available. Stremio remains a shortcut and is not a TMDB subscription provider. The catalogue refreshes hourly while the page is visible. Failures appear inline under Artwork Rotation; no notification popups are shown. Existing artwork remains if a refresh fails.

TMDB integration reference: https://developer.themoviedb.org/docs/authentication-application

Validation: `node --test tests/artwork.test.mjs` covers credential handling, image URL validation, regional provider filtering, result counts/order and authentication errors with mocked responses. The settings/dialog flow, inline empty-key error and IPTV navigation were verified in Safari. Live authenticated artwork loading still requires the user's own TMDB credential. The current modern browser implementation needs compatibility work and testing before the LG build.

## Typography revision 06

Poppins hierarchy uses logical points on a 1920×1080 design canvas, scaled with the TV stage: 76pt medium page titles, 48pt medium section headers and page-navigation labels, 38pt regular ordinary labels, 32pt values, and 20–24pt descriptions. Focused row labels use Poppins Bold with a slight text lift. Uploaded chevron PNGs replace text glyphs. Right chevrons appear only for new-page navigation (Artwork Rotation), not toggles, HDMI selection or the catalogue dialog. Back pills use 32×32 icon boxes and 28pt medium text, with 10% focus growth and a small icon shift; reduced motion suppresses movement. Home's approved title/dock typography is unchanged.

## Visual revision 07

Reduced Settings hierarchy to 56pt page titles, 24pt section headers, 34pt navigation labels, 32pt standard labels, 29pt values and 22pt descriptions; focused labels use Semibold. Home typography is unchanged. IPTV categories repeat four bright hues (blue, green, pink, purple). Both IPTV grids share Home's five-column tile width, aspect ratio, corner radius and horizontal gap. Channel cards use a neutral grey gradient, playlist logos and hover/focus captions; LIVE TV badges are removed. Missing logo files fall back to initials. The Home icon circle is dark neutral grey. Focus transitions use a shared 380ms easing curve with reduced-motion support. LG hardware animation performance remains unverified.

## Layout and LG navigation revision 08

HDMI rows now use the shared Settings row builder and typography. Settings displays the supplied settings icon at the same 8cqw size as HDMI. The back chevron is reduced to a 25-point box; the Home icon backing is a contrasting translucent grey. Shared title line height and descender padding prevent cropped letters. Settings and HDMI were visually checked in Safari.

`navigation.mjs` records visited pages: remote Back (LG keycode 461), Escape and Backspace pop exactly one page; the credential dialog closes first. Home resets the stack. The draft `webos/appinfo.json` disables webOS automatic Back history so it does not compete with app navigation; the final package must copy this manifest into its root. At root, Back delegates to the platform.

`tv.mjs` wires app launches, broadcast TV and HDMI via LG's application manager service. Installed app metadata is used to resolve app IDs; Apple TV, Prime Video and Netflix have known-ID probes if app-list permission is denied. Stremio requires discovery on the actual TV. No fake success is reported when the platform denies a request. Errors display inline without a popup. TV integration is implemented but UNVERIFIED on LG hardware; app-list permissions, privileged input launches and model-specific compatibility must be tested. IPTV channel playback remains unimplemented in this preview.

References: https://webostv.developer.lge.com/develop/guides/back-button and https://webostv.developer.lge.com/develop/references/application-manager

Checks: `node --test tests/*.test.mjs` passes eight tests, covering catalogue processing, visited-page history and mocked LG service calls/failures.

## Header and country filtering revision 09

The Clock/Avatar capsule has a fixed width and shares its height with the circular header controls and back capsule. Tabular clock digits prevent time changes from shifting the layout. The Home icon backing matches the avatar circle diameter, with a smaller house icon for breathing room.

Artwork Rotation exposes only Trending catalogue as an interactive row; Country, rotation interval and catalogue information are read-only. Country can still be changed in the catalogue credential dialog.

IPTV categories and channels open without an automatically focused first tile. Channel pages include a Choose Country dropdown beside Categories, independently filtering the current category. Country metadata comes from explicit playlist `tvg-country` tags or country suffixes in `tvg-id`; this represents playlist metadata rather than verified geographic availability. Entries without country metadata can be selected as Unspecified. Returning the selector to Choose Country shows all countries. The importer retains names, approved logo URLs and country codes without exporting stream URLs.

Validation: nine tests pass with `node --test tests/*.test.mjs`, including country filtering and multi-country/unspecified entries. The updated channel header, grey logo cards and filtered country results were visually checked in Safari. LG hardware verification remains pending.

## Icon and selector revision 10

IPTV categories now use the eleven supplied PNG symbols, rendered white while preserving transparency and aspect ratio. Channel and TMDB country selectors use the supplied up/down chevron asset instead of the browser arrow. The header country control shares back-capsule typography and chevron dimensions, with explicit space around its text and trailing icon. Header shortcut controls retain their hover colour/highlight with no scale growth. Category artwork was visually checked in Safari; JavaScript syntax validation passes.

## App identity

The supplied app logo is preserved at `assets/branding/app-logo-1024.png` and referenced by the draft webOS manifest. Generate and validate LG-required icon export sizes during final packaging; the supplied 1024px master remains unchanged.
