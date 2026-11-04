# Homepage Instagram slideshow

The homepage displays a curated selection of real photos from
[@saltedfocaccia](https://www.instagram.com/saltedfocaccia/) immediately above the
footer. Each slide opens its original Instagram post. Reel entries use a still
image; videos do not load or autoplay on the storefront.

The selection was retrieved from the account’s public profile embed on October
30, 2026. The original files remain in `public/images/instagram/` as migration input. Phase 2 imported them into Sanity; images, source post links, captions and alt text now live in Homepage → Instagram photos. The website reads Sanity assets, avoiding expiring Instagram CDN links, login requirements and third-party embed scripts. No Instagram
credentials or tracking embeds are included.

To change the selection, open `/studio` → Homepage → Instagram photos and upload an approved image, alt text and original-post URL. Keep dated
menu announcements out of the selection so they do not imply current availability.

This slideshow does **not** automatically fetch new posts. Automatic updates
require an authorized account connection or an existing feed provider. That
connection is separate from the storefront’s order/payment integrations and must
keep access tokens on the server. Do not add a runtime profile scraper or expose
credentials through `NEXT_PUBLIC_*`.
