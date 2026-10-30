# Homepage Instagram slideshow

The homepage displays a curated selection of real photos from
[@saltedfocaccia](https://www.instagram.com/saltedfocaccia/) immediately above the
footer. Each slide opens its original Instagram post. Reel entries use a still
image; videos do not load or autoplay on the storefront.

The selection was retrieved from the account’s public profile embed on October
30, 2026. Images live in `public/images/instagram/`, with source post links and
descriptive alt text in `src/data/instagram.ts`. Local images avoid expiring CDN
links, Instagram login requirements, and third-party embed scripts. No Instagram
credentials or tracking embeds are included.

To change the selection, add the bakery’s image to `public/images/instagram/`
and update `instagramPhotos` with its source post URL and alt text. Keep dated
menu announcements out of the selection so they do not imply current availability.

This slideshow does **not** automatically fetch new posts. Automatic updates
require an authorized account connection or an existing feed provider. That
connection is separate from the storefront’s order/payment integrations and must
keep access tokens on the server. Do not add a runtime profile scraper or expose
credentials through `NEXT_PUBLIC_*`.
