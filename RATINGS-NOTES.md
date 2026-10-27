# IMDb ratings source assessment

Checked on 26 October 2026 using the same IMDb ID, `tt39631280`, for Gajab Raat:

| Source | Result |
| --- | --- |
| IMDb official daily `title.ratings.tsv.gz` | Rating 6.0; 828 votes |
| OMDb using the saved local key | Matching IMDb ID; older title “Ghooskhor Pandat”; `imdbRating: N/A` |

The OMDb credential works: a separate known-title lookup returned The Matrix's score. The Gajab Raat result demonstrates stale/incomplete metadata in OMDb, not an absent IMDb rating. Scores and vote counts can change after this check.

OMDb is a separate, community-maintained service, not IMDb's live ratings API. It remains useful for titles it covers, but this example makes it unsuitable as the only dependable source for a catalogue centred on new releases. Missing OMDb scores must be described as unavailable *from OMDb*, never as proof a title is unrated on IMDb.

For a future ratings-source change, consider IMDb's official daily ratings dataset, filtered and cached by a small backend that returns only the requested IMDb IDs. Do not download and parse the entire bulk file on every TV launch. Review the source's usage terms before implementing distribution. This is a recommendation; no backend or new data source has been installed or configured.

Sources: [OMDb](https://www.omdbapi.com/), [IMDb dataset documentation](https://data.imdb.com/non-commercial-datasets/), [official ratings download](https://datasets.imdbws.com/title.ratings.tsv.gz), [user-supplied IMDb title](https://www.imdb.com/title/tt39631280/).

The audit used the credential inside the local app; it was neither displayed nor copied into source files. Temporary audit UI/code has been removed.

## Cinemeta added in 0.2.8

The user requested Stremio’s metadata approach. Cinemeta is now primary, with optional OMDb fallback. A live check of the documented `v3-cinemeta.strem.io` endpoint returned The Matrix’s score (8.7), but returned an empty score for `tt39631280`, also under the old title. It therefore improves the source options without guaranteeing complete or live IMDb coverage. No bulk-dataset backend has been added.

Browser verification also passed: the Cinemeta-only request returned The Matrix’s 8.7 score in Safari without an OMDb key. The app is still dependent on the metadata services’ coverage and update schedules.

## BTS: The Return verification

On 26 October 2026, the exact ID `tt39578551` returned an empty `imdbRating` from Cinemeta. The official daily dataset contained score 7.8 and 930 votes. A local, indexed official-dataset fallback is now available in the Mac preview. It applies to all IDs in the dataset, rather than hardcoding the BTS example. It is not yet a hosted TV data source.

## Catalogue audit and startup fix (0.2.10)

236 titles checked; 212 official scores and 212 matching display results; zero mismatches/errors; 19 unresolved identities and five mapped titles without scores in the snapshot. Fading Grandeur (`tt39387986`) verified at 5.7. The local official cache is now the first Mac lookup, with strict identity resolution and third-party fallback. The report is in ignored `dist/ratings-audit.json`. Temporary pause/title parameters no longer affect rotation.

## Regional identity and snapshot freshness (0.2.11)

Madam Inspector (TMDB TV 339010) is linked to IMDb tt37626694, whose [Hindi page](https://www.imdb.com/hi/title/tt37626694/) names Madam Inspector and identifies Birangana as its original title. This verified identity fallback handles the different localized release year; it does not hardcode ratings or replace an existing TMDB external ID. Other ambiguous matches remain unresolved.

The supplied Final Table link is exactly tt49692512. A forced dataset download on 26 October 2026 still returned 9.2 with 11 votes, whereas the user observed 8.2 on the live page. The source is a daily snapshot, not a live website feed. The preview's rating tooltip and Artwork Rotation status state the source and local snapshot refresh time. Refresh time is the download time, not proof IMDb revised that individual score then. No manually supplied score is substituted. The official dataset lookup remains Mac-only; the TV uses Cinemeta and optional OMDb.
