# GitHub upload and TMDB setup

The source code is suitable for a project repository. The complete working directory also contains private/generated material that must stay local.

## What to publish

Publish the source files, README, LICENSE, SECURITY notes, tests, tools, webOS manifest, package files, public channel metadata and bundled UI/font assets. The font licence and third-party asset rights notices must remain included.

Exclude `dist/`, `node_modules/`, `assets/reference/`, playlists (`*.m3u`, `*.m3u8`), installers (`*.ipk`), credentials, `.env*`, device keys and private configuration. These exclusions are already in `.gitignore`.

Git honours `.gitignore` for untracked files. GitHub's browser uploader does not use it to filter a folder you manually drag in. Use the extracted contents of the clean source ZIP, or publish through Git with the exclusions checked. Do not upload the whole working directory.

The clean source ZIP is `dist/tvOS-github-source.zip`. It contains source files rather than the private stream-bearing installer. Extract it before uploading; uploading the ZIP itself would only put an archive in the repository.

## What TMDB needs

A repository describes the project; it does not host or activate the API. Apply for a developer API key through your TMDB account, then on the TV use Settings → Artwork Rotation → New releases catalogue, enter the key or Read Access Token, choose the country and Save. No rebuild is needed. Never commit the key.

Suggested project description:

> A personal, non-commercial LG webOS app that uses TMDB metadata, regional streaming-provider availability and background artwork to display newly released movies and TV shows. TMDB is used for information and artwork, not for video streaming.

Live TMDB artwork loading has been verified with the locally saved credential; the saved OMDb key has also passed a live known-title connection check. Individual new releases may not have OMDb scores yet. Before publicly releasing an app that displays TMDB content, add an approved TMDB logo alongside the existing notice in its Credits area. The current source contains the notice; the official logo is still pending.

Official references: [API setup](https://developer.themoviedb.org/docs/getting-started), [application authentication](https://developer.themoviedb.org/docs/authentication-application), [attribution requirements](https://developer.themoviedb.org/docs/faq).
