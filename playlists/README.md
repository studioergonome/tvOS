# Category playlists

Each category uses its own private M3U file, named for the category, for example `Sports.m3u` or `News.m3u`. Start with `#EXTM3U` and `#PLAYLIST:CategoryName`, then one `#EXTINF` row containing `tvg-id`, `tvg-name`, `tvg-logo` and `group-title`, followed by its stream URL.

Local `tvg-logo` paths such as `assets/logos/channels/sky-sports-cricket.png` refer to the app’s asset directory. These are app-relative references consumed by the importer, not standalone filesystem paths for other media players. Keep original channel names and IDs supplied by the user.

M3U files contain playback URLs and are excluded from Git and the GitHub source archive. `Sports.m3u` currently contains only Sky Sports Cricket UK HD. Future links can be added to their matching category files. The build exporter prefers `CategoryName.m3u` and falls back to the older `popular-category-iptv.m3u` names.
