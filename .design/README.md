# Profile motion identity

An original Swiss editorial composition for Ahmad Nur Hidayat: Archivo Black typography, Space Mono annotations, and restrained monochrome motion. The palette is #0A0A0A, #FFFFFF and #8A8A8A, with intermediate grayscale shades for antialiasing and authentic screenshots. The Orbital Infinity Motion hero uses the requested solid #080808 background.

The hero combines a projected 3D wireframe torus, three orbital tracks and particles, and a receding perspective grid sharing the same vanishing point. All layers are rendered into one GIF. Its 16-second background loop contains two unchanged eight-second typewriter cycles; the previous headline font sizes and caption remain unchanged. The motion-free SVG shows the complete headline.

## Files and rebuilds

`assets/motion/` contains a separate GIF and an outlined, motion-free SVG for every section. Each also has a mobile composition. The first GIF frame contains all essential information; no section starts blank.

```sh
npm ci
npm run build
```

Node.js 22 is used locally and in GitHub Actions. All fonts, logos and original project imagery needed for rendering are vendored. Building requires no network requests. Generated previews are ignored by Git.

To refresh the authentic GitHub contribution calendar:

```sh
# Supply an existing GitHub token through GH_TOKEN or GITHUB_TOKEN.
npm run refresh:activity
npm run build:activity
```

The workflow in `.github/workflows/activity.yml` refreshes only the activity data and its four visual assets, daily at 01:17 UTC / 08:17 WIB, and can also be run manually. GitHub schedules can be delayed. API failures fail the job before replacing the checked-in data. The counter and cells come from the same validated GraphQL response. The moving locator never changes a contribution value. Private contribution visibility follows GitHub's account policy; no private repository names are requested or published.

## GitHub rendering and accessibility

- GIF is the primary format: no JavaScript, CSS animation, remote card service or iframe is needed in the README.
- The hero is 320 frames / 16 seconds at 20 fps; other sections retain their 160-frame / eight-second loops. Smooth periodic functions avoid an abrupt last-to-first transition.
- Delta frames and a grayscale palette keep the animation small while retaining sharp text.
- `<picture>` selects mobile layouts below 900 px and motion-free SVGs for `prefers-reduced-motion: reduce`.
- Every asset has descriptive alt text and SVG titles. Essential copy remains visible throughout the loop.
- A separate [motion-free edition](STATIC.md) is available for readers whose client does not honor media queries or whose GitHub animation setting differs from their system preference.
- The fixed near-black canvases keep the same contrast in both GitHub light and dark themes.
- Each featured project is a separate ordinary hyperlink. The real LinkedIn and portfolio URLs are sourced from the owner's public portfolio and GitHub profile.

GitHub documents its GIF autoplay and system reduced-motion controls in [Managing accessibility settings](https://docs.github.com/en/account-and-profile/how-tos/account-settings/managing-accessibility-settings).

## Sources and credits

- Original layout, lettering choreography, geometric mark and renderer created for this profile.
- [Archivo Black](https://github.com/google/fonts/tree/main/ofl/archivoblack) and [Space Mono](https://github.com/google/fonts/tree/main/ofl/spacemono): SIL Open Font License. License copies are in `vendor/`. Text is converted to outlines so viewers do not need installed fonts.
- [Simple Icons](https://github.com/simple-icons/simple-icons), version 16.36.0: CC0 icon collection. The original brand silhouettes are used in monochrome. See `vendor/SIMPLE-ICONS-LICENSE.md` and `vendor/icon-sources.json` for individual sources. Brand names and marks belong to their respective owners; their appearance identifies the tools used, without implying endorsement.
- SIMAUL screenshots: the owner's [portfolio repository](https://github.com/AhmadNurHidayat-23/my-portfolio/tree/3c8d9ae41da85e454cbb7c4535cdd18ac087a963/public/images/projects), `simaul.webp` and `simaul-mobile.webp`, at commit `3c8d9ae41da85e454cbb7c4535cdd18ac087a963`. Originals are preserved in `vendor/`. The render uses grayscale and framing only; the application UI is not reconstructed or invented.
- Task Board: an explicitly typographic motion study, because its repository supplies no project screenshots. It is not presented as an application screenshot.
- Activity: GitHub GraphQL `contributionsCollection.contributionCalendar`, with the exact response and retrieval timestamp in `data/activity.json`.

Only this profile repository is changed. Existing historical assets are retained and are not loaded by the redesigned README.
