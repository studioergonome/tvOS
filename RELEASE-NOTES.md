# Version 1.0.0 — 27 October 2026

Installed and verified on LG 86UN8100PTB / webOS 5.6.2. The owner confirmed Home/IPTV rendering and physical remote response.

The release includes the approved Home layout and logos, the IPTV top dock with Settings, five alphabetically sorted categories, current private channel lists, local channel logos, 10-second artwork fades and the existing webOS compatibility/glass fallback. Playback remains in the app.

42 automated development tests passed. TV checks passed for layout, dock/grid movement, Settings, category counts, initial focus and Back. Representative native playback checks passed for Sports, News and Business. The four streaming apps were detected as installed. The brief Settings frame sample measured a median of 16.7 ms and a 95th percentile of 33.3 ms; this is not a sustained frame-rate guarantee.

Artwork requires a TMDB credential in TV Settings; none was configured during deployment. Provider streams and ratings remain dependent on their upstream services.

The private installer, playback addresses and hardware reports remain outside the GitHub source archive.
